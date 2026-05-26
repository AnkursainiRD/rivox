import { useState, useEffect, useRef, useCallback } from "react";
import { resolveToolCard, NavigateCard } from "./AICards";

const CHAT_API = import.meta.env.DEV
  ? "http://localhost:3001/api/chat"
  : "https://rivox-cpbg.onrender.com/api/chat";

interface ToolCard {
  tool: string;
  data: unknown;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  cards?: ToolCard[];
  navigatedTo?: string;
}

// ── AI Sparkle Icon ──────────────────────────────────────────
function AISparkle({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" fill={color} />
      <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z" fill={color} opacity="0.65" />
    </svg>
  );
}

// ── Starter Chip ─────────────────────────────────────────────
function StarterChip({ label, hint, onClick }: { label: string; hint?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 px-3 py-2.5 bg-surface border border-border rounded-[10px] hover:border-accent/30 transition-colors text-left w-full group">
      <div className="w-[26px] h-[26px] rounded-[7px] bg-accent-soft flex items-center justify-center shrink-0">
        <AISparkle size={12} color="var(--color-accent)" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium text-ink" style={{ letterSpacing: "-0.005em" }}>{label}</div>
        {hint && <div className="text-[11px] text-muted mt-0.5">{hint}</div>}
      </div>
      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30 group-hover:text-accent transition-colors shrink-0" viewBox="0 0 24 24">
        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// SIDE RAIL — Right panel AI chat
// ═══════════════════════════════════════════════════════════════

export function AISideRail({ onClose, onNavigate, userName, orgId }: {
  onClose: () => void;
  onNavigate: (path: string) => void;
  userName: string;
  orgId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || streaming) return;

    const userMsg: ChatMessage = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const token = localStorage.getItem("rivox-token") || "";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const res = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: newMessages, orgId }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const toolNameMap: Record<string, string> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;

          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "tool-call-complete" || event.type === "tool-result") {
              console.log("[AI Stream]", event.type, event);
            }

            switch (event.type) {
              case "text-delta":
                if (event.text) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...updated[updated.length - 1], content: updated[updated.length - 1].content + event.text };
                    return updated;
                  });
                }
                break;

              case "tool-call-complete":
                // Store tool name mapped to its call ID
                if (event.toolCall) {
                  toolNameMap[event.toolCall.id] = event.toolCall.name;
                }
                break;

              case "tool-result": {
                const toolName = toolNameMap[event.toolCallId] || "";
                const result = event.result;

                if (result?.__action === "navigate" && result.path) {
                  onNavigate(result.path);
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    updated[updated.length - 1] = { ...last, navigatedTo: result.path };
                    return updated;
                  });
                } else if (toolName) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    const cards = [...(last.cards || []), { tool: toolName, data: result }];
                    updated[updated.length - 1] = { ...last, cards };
                    return updated;
                  });
                }
                break;
              }
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        // Only replace if assistant message is still empty
        if (last?.role === "assistant" && !last.content && !last.cards?.length) {
          updated[updated.length - 1] = { role: "assistant", content: err instanceof DOMException ? "Request timed out. Try again." : "Something went wrong. Try again." };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, orgId, onNavigate]);

  const hasMessages = messages.length > 0;

  return (
    <div className="w-full sm:w-[340px] xl:w-[400px] shrink-0 bg-surface border-l border-border flex flex-col h-full relative"
      style={{ boxShadow: "-4px 0 12px -4px rgba(0,0,0,0.04)" }}>

      {/* Header with gradient wash */}
      <div className="relative px-5 py-[18px] border-b border-border overflow-hidden shrink-0">
        {/* Ambient wash */}
        <div className="absolute w-[280px] h-[280px] -right-[100px] -top-[120px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(124,124,240,0.22) 0%, transparent 60%)" }} />

        <div className="flex items-center gap-3 relative">
          <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: "linear-gradient(135deg, #7c7cf0, #a5a5ff)" }}>
            <svg width="22" height="22" viewBox="0 0 96 96" fill="none">
              <circle cx="48" cy="40" r="13" fill="#fff"/>
              <path d="M40 50 L56 50 L59 74 L37 74 Z" fill="#fff"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-ink" style={{ letterSpacing: "-0.015em" }}>Rivox AI</span>
              <span className="inline-flex items-center gap-1 px-[7px] py-px text-[10px] font-semibold uppercase tracking-[0.06em] rounded" style={{ background: "#dcfce7", color: "#16a34a" }}>
                <span className="w-[5px] h-[5px] rounded-full bg-[#16a34a]" />
                Live
              </span>
            </div>
            <div className="text-[11.5px] text-muted mt-0.5">Powered by Rivox · scoped to your workspace</div>
          </div>
          <button onClick={() => setMessages([])} className="w-7 h-7 rounded-[7px] flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 transition-colors" title="Clear">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-[7px] flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>

      {/* Messages / Empty state */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!hasMessages ? (
          <div className="px-5 py-[22px]">
            {/* Greeting */}
            <div className="mb-[18px]">
              <div className="text-[22px] font-semibold text-ink mb-1" style={{ letterSpacing: "-0.025em" }}>
                Hi <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, color: "var(--color-accent)" }}>{userName}</span>.
              </div>
              <div className="text-[13px] text-muted leading-[1.55]" style={{ letterSpacing: "-0.005em" }}>
                I can see this page. Try one of these, or just ask.
              </div>
            </div>

            {/* Page starters */}
            <div className="text-[10.5px] font-semibold text-muted uppercase tracking-[0.08em] mb-2">For this page</div>
            <div className="flex flex-col gap-1.5 mb-[18px]">
              <StarterChip label="Show me all open bugs" hint="filter by status" onClick={() => sendMessage("Show me all open bugs")} />
              <StarterChip label="Which keys are over-shared?" hint="more than 5 people" onClick={() => sendMessage("Which keys are shared with more than 5 people?")} />
              <StarterChip label="Summarize today's activity" hint="audit log" onClick={() => sendMessage("Summarize today's activity")} />
            </div>

            {/* Workspace starters */}
            <div className="text-[10.5px] font-semibold text-muted uppercase tracking-[0.08em] mb-2">Across your workspace</div>
            <div className="flex flex-col gap-1.5">
              <StarterChip label="Show team members" onClick={() => sendMessage("Show me the team members")} />
              <StarterChip label="Create a new task" onClick={() => sendMessage("Create a task to review the dashboard design")} />
              <StarterChip label="Go to issues" onClick={() => sendMessage("Show me the issues page")} />
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap bg-accent text-white rounded-2xl rounded-br-md">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5 items-start">
                    <div className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0 mt-1"
                      style={{ background: "linear-gradient(135deg, #7c7cf0, #a5a5ff)" }}>
                      <svg width="14" height="14" viewBox="0 0 96 96" fill="none">
                        <circle cx="48" cy="40" r="13" fill="#fff"/>
                        <path d="M40 50 L56 50 L59 74 L37 74 Z" fill="#fff"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                      {/* Tool cards */}
                      {msg.cards?.map((card, j) => (
                        <div key={j}>{resolveToolCard(card.tool, card.data)}</div>
                      ))}
                      {/* Navigate pill */}
                      {msg.navigatedTo && <NavigateCard path={msg.navigatedTo} />}
                      {/* Text content */}
                      {(msg.content || (streaming && i === messages.length - 1 && !msg.content)) && (
                        <div className="text-[13px] leading-relaxed text-ink whitespace-pre-wrap" style={{ letterSpacing: "-0.005em", paddingTop: msg.cards?.length ? 0 : 4 }}>
                          {msg.content || (
                            <div className="flex items-center gap-1.5 py-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse" />
                              <div className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse" style={{ animationDelay: "0.2s" }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse" style={{ animationDelay: "0.4s" }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-[14px] pb-[14px] pt-3 border-t border-border">
        <div className="bg-surface-2/60 border border-border rounded-xl px-3 py-1 flex flex-col gap-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask Rivox AI…"
            rows={1}
            className="w-full bg-transparent text-[13.5px] text-ink outline-none resize-none placeholder:text-muted/40 py-2 max-h-[100px]"
            style={{ letterSpacing: "-0.005em" }}
          />
          <div className="flex items-center gap-1 pb-1.5">
            <button className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-muted hover:text-ink hover:bg-surface transition-colors">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
            </button>
            <button className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-[6px] text-[11px] text-muted font-medium hover:bg-surface-2 transition-colors">
              <span className="font-mono text-ink/60">/</span>
              commands
            </button>
            <div className="flex-1" />
            <span className="font-mono text-[10.5px] text-muted/30 mr-1">⏎</span>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming}
              className="w-[30px] h-[30px] rounded-lg bg-ink text-surface flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-opacity"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l14-7-7 14-2-5-5-2z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2.5 mt-2 text-[10.5px] text-muted/40" style={{ letterSpacing: "-0.005em" }}>
          <span className="inline-flex items-center gap-[5px]">
            <span className="w-[5px] h-[5px] rounded-full bg-[#10b981]" />
            No data leaves your workspace
          </span>
          <div className="flex-1" />
          <span>Shift+⏎ for new line</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMMAND PALETTE — ⌘J overlay
// ═══════════════════════════════════════════════════════════════

export function AICommandPalette({ onClose, onSend }: {
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = () => {
    if (!query.trim()) return;
    onSend(query.trim());
    onClose();
  };

  const starters = [
    { label: "Show keys shared with > 5 people", hint: "audit suggestion" },
    { label: "Rotate all prod keys now", hint: "needs confirmation" },
    { label: "Summarize this week's audit log", hint: "last 7 days" },
    { label: "Which keys can Eren see?", hint: "filter by user" },
  ];

  const recents = [
    { q: "What changed in #124 since yesterday?", ago: "2h ago" },
    { q: "Draft a comment thanking Sarah", ago: "Yesterday" },
  ];

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[8px]" onClick={onClose} />

      {/* Palette */}
      <div className="absolute top-[14%] left-1/2 -translate-x-1/2 w-[95vw] sm:w-[600px] bg-surface border border-border rounded-[18px] overflow-hidden"
        style={{ boxShadow: "0 32px 80px -8px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.08)" }}>

        {/* Input row */}
        <div className="flex items-center gap-3 px-[18px] py-4 border-b border-border">
          <div className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #7c7cf0, #a5a5ff)" }}>
            <AISparkle size={16} color="#fff" />
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="Ask Rivox anything or run a command…"
            className="flex-1 text-[17px] text-ink bg-transparent outline-none placeholder:text-muted/40"
            style={{ letterSpacing: "-0.015em" }}
          />
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent-soft text-accent rounded-full text-[11.5px] font-medium shrink-0" style={{ letterSpacing: "-0.005em" }}>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
            Search
          </span>
        </div>

        {/* Suggestions */}
        <div className="px-[18px] pt-[18px] pb-2">
          <div className="text-[11px] text-muted font-semibold uppercase tracking-[0.08em] mb-2.5">Suggested for this page</div>
          <div className="grid grid-cols-2 gap-2">
            {starters.map((s) => (
              <button key={s.label} onClick={() => { onSend(s.label); onClose(); }}
                className="flex items-center gap-2.5 px-3 py-2.5 bg-surface border border-border rounded-[10px] hover:border-accent/30 transition-colors text-left">
                <div className="w-[26px] h-[26px] rounded-[7px] bg-accent-soft flex items-center justify-center shrink-0">
                  <AISparkle size={11} color="var(--color-accent)" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-ink truncate">{s.label}</div>
                  {s.hint && <div className="text-[10.5px] text-muted mt-0.5">{s.hint}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent */}
        <div className="px-[18px] pt-3.5 pb-2">
          <div className="text-[11px] text-muted font-semibold uppercase tracking-[0.08em] mb-2">Recent</div>
          {recents.map((r, i) => (
            <button key={i} onClick={() => { onSend(r.q); onClose(); }}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[7px] hover:bg-surface-2 transition-colors text-left">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-muted/40 shrink-0" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" />
              </svg>
              <span className="flex-1 text-[13px] text-ink/70" style={{ letterSpacing: "-0.005em" }}>{r.q}</span>
              <span className="text-[11px] text-muted shrink-0">{r.ago}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-[14px] py-2.5 bg-surface-2/50 border-t border-border text-[11.5px] text-muted">
          <AISparkle size={12} color="var(--color-muted)" />
          <span>Powered by Claude · stays inside your workspace</span>
          <div className="flex-1" />
          <kbd className="font-mono text-[10.5px] px-1.5 py-0.5 bg-surface border border-border rounded text-ink/60 font-medium">↵</kbd>
          <span className="text-[11px]">to send</span>
          <span className="mx-1">·</span>
          <kbd className="font-mono text-[10.5px] px-1.5 py-0.5 bg-surface border border-border rounded text-ink/60 font-medium">esc</kbd>
        </div>
      </div>

      {/* Bottom hint pill */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-full text-[11.5px] text-muted font-medium"
        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
        <span>Press</span>
        <kbd className="font-mono text-[10.5px] px-1.5 py-0.5 bg-surface-2 border border-border rounded text-ink/60 font-semibold">⌘J</kbd>
        <span>anywhere</span>
      </div>
    </div>
  );
}
