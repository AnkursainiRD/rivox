// AICards.tsx — 22 generative UI cards matching the Rivox AI tool surface kit
import { useNavigate } from "react-router-dom";

// ── Design tokens ────────────────────────────────────────────

const COLORS = {
  status: { open: "#16a34a", in_progress: "#f59e0b", resolved: "#3b82f6", closed: "#71717a", wont_fix: "#71717a", inbox: "#71717a", pending: "#f59e0b", ongoing: "#3b82f6", in_review: "#8b5cf6", completed: "#16a34a", rejected: "#ef4444" },
  priority: { low: "#71717a", medium: "#f59e0b", high: "#ef4444", critical: "#dc2626", urgent: "#dc2626" },
  type: { bug: "#ef4444", feature: "#8b5cf6", improvement: "#3b82f6", task: "#f59e0b" },
  env: { prod: { bg: "#fce7f3", text: "#9d174d", dot: "#ef4444" }, staging: { bg: "#fef3c7", text: "#a16207", dot: "#f59e0b" }, dev: { bg: "#dcfce7", text: "#166534", dot: "#10b981" } },
  avatar: ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"],
  task: { yellow: "#fef3c7", blue: "#dbeafe", green: "#dcfce7", pink: "#fce7f3", purple: "#ede9fe" },
};

// ── Atoms ────────────────────────────────────────────────────

function Card({ icon, title, badge, badgeColor, children }: { icon?: React.ReactNode; title: string; badge?: string; badgeColor?: "green" | "amber" | "accent" | "indigo"; children: React.ReactNode }) {
  const bc: Record<string, string> = { green: "bg-[#dcfce7] text-[#16a34a]", amber: "bg-[#fef3c7] text-[#a16207]", accent: "bg-accent-soft text-accent", indigo: "bg-accent-soft text-accent" };
  return (
    <div className="bg-surface border border-border rounded-[14px] overflow-hidden" style={{ maxWidth: 380, boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 4px 16px -4px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-surface-2/50">
        {icon && <div className="w-[22px] h-[22px] rounded-[6px] bg-accent-soft text-accent flex items-center justify-center shrink-0">{icon}</div>}
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted/80">{title}</span>
        <div className="flex-1" />
        {badge && <span className={`text-[9.5px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded ${bc[badgeColor || "accent"]}`}>{badge}</span>}
      </div>
      <div className="px-3.5 py-3">{children}</div>
    </div>
  );
}

function Pill({ label, color }: { label: string; color?: string }) {
  const c = color || (COLORS.status as Record<string, string>)[label] || (COLORS.priority as Record<string, string>)[label] || (COLORS.type as Record<string, string>)[label] || "#71717a";
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] px-[6px] py-[1px] rounded" style={{ background: `${c}18`, color: c }}>{label.replace(/_/g, " ")}</span>;
}

function EnvPill({ env }: { env: string }) {
  const e = (COLORS.env as Record<string, { bg: string; text: string; dot: string }>)[env] || COLORS.env.dev;
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] px-[6px] py-[1px] rounded" style={{ background: e.bg, color: e.text }}><span className="w-[5px] h-[5px] rounded-full" style={{ background: e.dot }} />{env}</span>;
}

function Avatar({ name, index = 0, size = 26 }: { name: string; index?: number; size?: number }) {
  return <div className="rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ width: size, height: size, fontSize: size * 0.4, background: COLORS.avatar[index % COLORS.avatar.length] }}>{(name || "?").charAt(0).toUpperCase()}</div>;
}

function PersonPill({ name, handle, index = 0 }: { name: string; handle?: string; index?: number }) {
  return (
    <div className="inline-flex items-center gap-2 px-1.5 py-1 pr-2.5 bg-surface-2/60 border border-border rounded-full">
      <Avatar name={name} index={index} size={22} />
      <div className="leading-tight">
        <div className="text-[11.5px] font-semibold text-ink">{name}</div>
        {handle && <div className="text-[10px] text-muted font-mono">{handle}</div>}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[9.5px] font-semibold text-muted uppercase tracking-[0.08em] mb-1">{children}</div>;
}

function Buttons({ primary, secondary, onPrimary, onSecondary, destructive }: { primary: string; secondary?: string; onPrimary?: () => void; onSecondary?: () => void; destructive?: boolean }) {
  return (
    <div className="flex gap-2 mt-3">
      <button onClick={onPrimary} className={`flex-1 py-2 text-[12px] font-medium rounded-lg text-center transition-opacity hover:opacity-90 ${destructive ? "bg-red-600 text-white" : "bg-ink text-surface"}`}>{primary}</button>
      {secondary && <button onClick={onSecondary} className="py-2 px-3.5 text-[12px] font-medium text-ink/70 border border-border rounded-lg hover:bg-surface-2 transition-colors">{secondary}</button>}
    </div>
  );
}

function Warning({ text, amber }: { text: string; amber?: boolean }) {
  return (
    <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-[11px] leading-[1.5] mt-2 ${amber ? "bg-[#fffbeb] border border-[#fde68a] text-[#92400e]" : "bg-[#fef2f2] border border-[#fecaca] text-[#991b1b]"}`}>
      <span className="mt-0.5 shrink-0">{amber ? "⚡" : "⚠"}</span>
      <span>{text}</span>
    </div>
  );
}

function InfoBanner({ text, green }: { text: React.ReactNode; green?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] leading-[1.5] mt-2 ${green ? "bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534]" : "bg-surface-2/50 border border-border text-muted"}`}>
      {green && <span>+</span>}
      <span>{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1. list_issues
// ═══════════════════════════════════════════════════════════════
function IssuesListCard({ data }: { data: { id: string; number: number; title: string; status: string; priority: string; type: string }[] }) {
  const nav = useNavigate();
  if (!data?.length) return <Card title="No issues found"><p className="text-[12px] text-muted">Try a different filter.</p></Card>;
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" /></svg>} title={`Found ${data.length} issues`} badge="List">
      {data.slice(0, 5).map((iss) => (
        <button key={iss.id} onClick={() => nav(`/issues/${iss.id}`)} className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg hover:bg-surface-2 transition-colors text-left mb-0.5">
          <span className="font-mono text-[10px] text-muted bg-surface-2 px-1.5 py-0.5 rounded border border-border shrink-0">#{iss.number}</span>
          <span className="flex-1 text-[12px] font-medium text-ink truncate">{iss.title}</span>
          <Pill label={iss.priority} />
        </button>
      ))}
      {data.length > 5 && <p className="text-[10.5px] text-muted text-center mt-1">+{data.length - 5} more</p>}
      <Buttons primary="Open in Issues" secondary="Filter" onPrimary={() => nav("/issues")} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. create_issue
// ═══════════════════════════════════════════════════════════════
function IssueCreatedCard({ data }: { data: { id: string; title: string; created: boolean } }) {
  const nav = useNavigate();
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>} title="Create issue · preview">
      <div className="mb-2.5"><FieldLabel>Title</FieldLabel><div className="text-[13px] font-medium text-ink px-3 py-2 bg-surface-2/50 border border-border rounded-lg">{data.title}</div></div>
      <Buttons primary="Create issue" secondary="Edit" onPrimary={() => nav(`/issues/${data.id}`)} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3. get_issue
// ═══════════════════════════════════════════════════════════════
function IssueDetailCard({ data }: { data: { id?: string; number: number; title: string; status: string; priority: string; type: string; description?: string; reporter_name?: string; assignee_name?: string; due_date?: string; recent_comments?: { body: string; display_name: string }[]; error?: string } }) {
  const nav = useNavigate();
  if (data?.error) return <ErrorCard message={data.error} />;
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" /></svg>} title={`Issue #${data.number}`}>
      <div className="text-[13px] font-semibold text-ink mb-2" style={{ letterSpacing: "-0.01em" }}>{data.title}</div>
      <div className="flex flex-wrap gap-1 mb-2.5"><Pill label={data.type} /><Pill label={data.status} /><Pill label={data.priority} /></div>
      {data.description && <div className="text-[11.5px] text-ink/70 leading-[1.55] px-3 py-2 bg-surface-2/40 border-l-2 border-accent rounded-md mb-2.5">{data.description.slice(0, 160)}{data.description.length > 160 ? "…" : ""}</div>}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        <div className="px-2 py-1.5 bg-surface-2/40 border border-border rounded-lg"><div className="text-[9px] font-semibold text-muted uppercase tracking-wider">Reporter</div><div className="text-[11px] font-medium text-ink mt-0.5">{data.reporter_name || "—"}</div></div>
        <div className="px-2 py-1.5 bg-surface-2/40 border border-border rounded-lg"><div className="text-[9px] font-semibold text-muted uppercase tracking-wider">Assignee</div><div className="text-[11px] font-medium text-ink mt-0.5">{data.assignee_name || "—"}</div></div>
        <div className="px-2 py-1.5 bg-surface-2/40 border border-border rounded-lg"><div className="text-[9px] font-semibold text-muted uppercase tracking-wider">Due</div><div className="text-[11px] font-medium text-ink mt-0.5">{data.due_date || "—"}</div></div>
      </div>
      {data.recent_comments?.length ? (<div className="mb-2"><FieldLabel>Recent</FieldLabel>{data.recent_comments.slice(0, 2).map((c, i) => <div key={i} className="text-[11px] text-ink/70 px-2.5 py-1.5 bg-surface-2/30 rounded mb-0.5"><span className="font-medium text-ink">{c.display_name}:</span> {c.body.slice(0, 60)}</div>)}</div>) : null}
      <Buttons primary="Open full issue" onPrimary={() => nav(`/issues/${data.id}`)} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4. update_issue
// ═══════════════════════════════════════════════════════════════
function IssueUpdatedCard({ data }: { data: { number: number; title: string; changes: { status?: string; priority?: string; type?: string } } }) {
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>} title="Issue updated" badge="Status change">
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-2/40 border border-border rounded-lg mb-2">
        <span className="font-mono text-[10px] text-muted bg-surface px-1.5 py-0.5 rounded border border-border">#{data.number}</span>
        <span className="text-[12px] font-medium text-ink truncate flex-1">{data.title}</span>
      </div>
      {data.changes.status && <div className="flex items-center gap-2 text-[11.5px] text-muted"><Pill label={data.changes.status} /><span className="text-muted/40">applied</span></div>}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 5. add_comment
// ═══════════════════════════════════════════════════════════════
function CommentAddedCard({ data }: { data: { issueNumber: number; body: string } }) {
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" /></svg>} title="Add comment · preview">
      <div className="flex items-center gap-2 mb-2"><span className="font-mono text-[10px] text-muted bg-surface-2 px-1.5 py-0.5 rounded border border-border">#{data.issueNumber}</span></div>
      <div className="text-[12px] text-ink leading-[1.55] px-3 py-2.5 bg-surface-2/40 border border-border rounded-lg mb-1">{data.body}</div>
      <p className="text-[10px] text-muted italic">Draft generated from your context · review before posting</p>
      <Buttons primary="Post comment" secondary="Edit draft" />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 6. list_tasks
// ═══════════════════════════════════════════════════════════════
function TasksListCard({ data }: { data: { id: string; title: string; status: string; priority: string; scope: string; color: string }[] }) {
  const nav = useNavigate();
  if (!data?.length) return <Card title="No tasks found"><p className="text-[12px] text-muted">Your board is clear.</p></Card>;
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12h8" strokeLinecap="round" /></svg>} title={`${data.length} tasks for you`}>
      {data.slice(0, 5).map((t) => (
        <div key={t.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5" style={{ background: `${(COLORS.task as Record<string, string>)[t.color] || "#f5f5f5"}25` }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: (COLORS.status as Record<string, string>)[t.status] || "#71717a" }} />
          <span className="flex-1 text-[12px] font-medium text-ink truncate">{t.title}</span>
          <span className="text-[10px] text-muted capitalize">{t.status.replace(/_/g, " ")}</span>
        </div>
      ))}
      <Buttons primary="View board" secondary="Filter" onPrimary={() => nav("/sticky-board")} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 7. create_task
// ═══════════════════════════════════════════════════════════════
function TaskCreatedCard({ data }: { data: { id: string; title: string } }) {
  const nav = useNavigate();
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>} title="Create task · preview">
      <div className="mb-2"><FieldLabel>Task</FieldLabel><div className="text-[13px] font-medium text-ink px-3 py-2 bg-surface-2/50 border border-border rounded-lg">{data.title}</div></div>
      <Buttons primary="Add task" secondary="Edit" onPrimary={() => nav("/sticky-board")} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 8. update_task
// ═══════════════════════════════════════════════════════════════
function TaskUpdatedCard({ data }: { data: { title: string; changes: Record<string, string> } }) {
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>} title="Task updated" badge="Done" badgeColor="green">
      <div className="text-[12px] font-medium text-ink px-3 py-2 bg-surface-2/40 border border-border rounded-lg">{data.title}</div>
      {Object.entries(data.changes).filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex items-center gap-2 mt-1.5 text-[11px] text-muted"><span className="capitalize">{k}:</span><Pill label={v} /></div>)}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 9. delete_task
// ═══════════════════════════════════════════════════════════════
function TaskDeletedCard({ data }: { data: { title: string } }) {
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6" strokeLinecap="round" /></svg>} title="Delete task" badge="Destructive" badgeColor="amber">
      <div className="text-[12px] font-medium text-ink px-3 py-2 bg-surface-2/40 border border-border rounded-lg">{data.title}</div>
      <Warning text="Task and its sub-items will be removed. Cannot be undone." amber />
      <Buttons primary="Delete task" secondary="Cancel" destructive />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 10. list_api_keys
// ═══════════════════════════════════════════════════════════════
function KeysListCard({ data }: { data: { id: string; name: string; environment: string; is_active: boolean; fingerprint: string }[] }) {
  const nav = useNavigate();
  if (!data?.length) return <Card title="No keys found"><p className="text-[12px] text-muted">No API keys in this workspace.</p></Card>;
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.6 7.6a5.5 5.5 0 11-7.8 7.8 5.5 5.5 0 017.8-7.8z" strokeLinecap="round" /></svg>} title={`${data.length} API keys`}>
      {data.map((k) => (
        <div key={k.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-2 transition-colors mb-0.5">
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-ink truncate">{k.name}</div>
            <div className="font-mono text-[10px] text-muted mt-0.5">{k.fingerprint}</div>
          </div>
          <EnvPill env={k.environment} />
        </div>
      ))}
      <Buttons primary="Open API Keys" secondary="Create" onPrimary={() => nav("/")} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 11. create_api_key
// ═══════════════════════════════════════════════════════════════
function KeyCreatedCard({ data }: { data: { name: string; environment: string } }) {
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>} title="Create API key · preview">
      <div className="mb-2"><FieldLabel>Name</FieldLabel><div className="text-[13px] font-medium text-ink px-3 py-2 bg-surface-2/50 border border-border rounded-lg">{data.name}</div></div>
      <div className="mb-2"><FieldLabel>Environment</FieldLabel><EnvPill env={data.environment} /></div>
      <Buttons primary="Create key" secondary="Edit scope" />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 12. revoke_api_key
// ═══════════════════════════════════════════════════════════════
function KeyRevokedCard({ data }: { data: { name: string } }) {
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>} title="Revoke API key" badge="Destructive" badgeColor="amber">
      <div className="flex items-center gap-2.5 px-3 py-2 bg-surface-2/40 border border-border rounded-lg">
        <span className="text-[12px] font-medium text-ink">{data.name}</span>
      </div>
      <Warning text="Key stops working immediately. Users with access will lose it." amber />
      <Buttons primary="Revoke key" secondary="Cancel" destructive />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 13. list_groups
// ═══════════════════════════════════════════════════════════════
function GroupsListCard({ data }: { data: { id: string; name: string; description: string | null; color: string }[] }) {
  const nav = useNavigate();
  if (!data?.length) return <Card title="No groups"><p className="text-[12px] text-muted">No teams created yet.</p></Card>;
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" strokeLinecap="round" /></svg>} title={`${data.length} groups`}>
      {data.map((g) => (
        <div key={g.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: g.color || "#5b5bd6" }}>{g.name.charAt(0)}</div>
          <span className="text-[12px] font-semibold text-ink">{g.name}</span>
          {g.description && <span className="text-[10.5px] text-muted truncate flex-1">{g.description}</span>}
        </div>
      ))}
      <Buttons primary="View Team" secondary="New group" onPrimary={() => nav("/team")} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 14. get_group_members
// ═══════════════════════════════════════════════════════════════
function GroupMembersCard({ data }: { data: { id: string; display_name: string; username: string; email: string }[] }) {
  const nav = useNavigate();
  if (!data?.length) return <Card title="No members"><p className="text-[12px] text-muted">This group is empty.</p></Card>;
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /></svg>} title={`${data.length} members`}>
      {data.slice(0, 4).map((m, i) => (
        <div key={m.id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg mb-0.5">
          <Avatar name={m.display_name || m.username} index={i} size={24} />
          <span className="text-[12px] font-semibold text-ink">{m.display_name || m.username}</span>
          <span className="text-[10px] text-muted font-mono">@{m.username}</span>
        </div>
      ))}
      {data.length > 4 && <p className="text-[10.5px] text-muted ml-2">+ {data.length - 4} more</p>}
      <Buttons primary="Open group" secondary="Add member" onPrimary={() => nav("/team")} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 15. create_group
// ═══════════════════════════════════════════════════════════════
function GroupCreatedCard({ data }: { data: { name: string } }) {
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>} title="Create group · preview">
      <div className="mb-2"><FieldLabel>Name</FieldLabel><div className="text-[13px] font-medium text-ink px-3 py-2 bg-surface-2/50 border border-border rounded-lg">{data.name}</div></div>
      <Buttons primary="Create group" secondary="Edit" />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 16. add_member_to_group
// ═══════════════════════════════════════════════════════════════
function MemberAddedToGroupCard({ data }: { data: { user: string; group: string } }) {
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M20 8v6M23 11h-6" strokeLinecap="round" /></svg>} title="Add to group" badge="Indigo" badgeColor="indigo">
      <div className="mb-2"><FieldLabel>Person</FieldLabel><PersonPill name={data.user} /></div>
      <div className="mb-2"><FieldLabel>Group</FieldLabel><span className="text-[12px] font-semibold text-ink">{data.group}</span></div>
      <InfoBanner text={<><strong>{data.user}</strong> will inherit access to keys shared with {data.group}.</>} green />
      <Buttons primary={`Add to ${data.group}`} secondary="Cancel" />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 17. remove_member_from_group
// ═══════════════════════════════════════════════════════════════
function MemberRemovedFromGroupCard({ data }: { data: { user: string; group: string } }) {
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M20 11h-6" strokeLinecap="round" /></svg>} title="Remove from group" badge="Destructive" badgeColor="amber">
      <div className="mb-2"><FieldLabel>Person</FieldLabel><PersonPill name={data.user} /></div>
      <div className="mb-2"><FieldLabel>From</FieldLabel><span className="text-[12px] font-semibold text-ink">{data.group}</span></div>
      <Warning text={`Loses access to keys inherited from ${data.group}.`} amber />
      <Buttons primary="Remove" secondary="Cancel" destructive />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 18. list_members
// ═══════════════════════════════════════════════════════════════
function MembersListCard({ data }: { data: { id: string; display_name: string; username: string; email: string; role: string }[] }) {
  const nav = useNavigate();
  if (!data?.length) return <Card title="No members"><p className="text-[12px] text-muted">No members found.</p></Card>;
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /></svg>} title={`${data.length} members`}>
      {data.slice(0, 5).map((m, i) => (
        <div key={m.id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg mb-0.5">
          <Avatar name={m.display_name || m.username} index={i} size={24} />
          <span className="text-[12px] font-semibold text-ink">{m.display_name || m.username}</span>
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted/70 bg-surface-2 px-1.5 py-0.5 rounded ml-auto shrink-0">{m.role.replace(/_/g, " ")}</span>
        </div>
      ))}
      {data.length > 5 && <p className="text-[10.5px] text-muted ml-2">+ {data.length - 5} more members</p>}
      <Buttons primary="Open Team" secondary="Invite" onPrimary={() => nav("/team")} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 19. change_member_role
// ═══════════════════════════════════════════════════════════════
function RoleChangedCard({ data }: { data: { user: string; from: string; to: string } }) {
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" /></svg>} title="Change role" badge="Permission" badgeColor="indigo">
      <div className="mb-2"><FieldLabel>Person</FieldLabel><PersonPill name={data.user} /></div>
      <div className="flex items-center gap-3 mb-2">
        <div><FieldLabel>From</FieldLabel><Pill label={data.from} /></div>
        <span className="text-muted/40 mt-3">→</span>
        <div><FieldLabel>To</FieldLabel><Pill label={data.to} /></div>
      </div>
      <Buttons primary="Change role" secondary="Cancel" />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 20. list_notifications
// ═══════════════════════════════════════════════════════════════
function NotificationsCard({ data }: { data: { id: string; type: string; title: string; body: string; is_read: boolean; created_at: string }[] }) {
  const nav = useNavigate();
  const unread = data?.filter((n) => !n.is_read).length || 0;
  if (!data?.length) return <Card title="No notifications" badge="Done" badgeColor="green"><p className="text-[12px] text-muted">You're all caught up!</p></Card>;
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" /></svg>} title={`${unread} unread notification${unread !== 1 ? "s" : ""}`}>
      {data.slice(0, 4).map((n) => (
        <div key={n.id} className="flex items-start gap-2 px-2.5 py-2 rounded-lg mb-0.5">
          {!n.is_read && <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1" />}
          <span className={`flex-1 text-[11.5px] ${n.is_read ? "text-muted" : "text-ink"}`}>{n.title}</span>
        </div>
      ))}
      <Buttons primary="Open all" secondary="Mark all read" onPrimary={() => nav("/notifications")} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 21. mark_notifications_read
// ═══════════════════════════════════════════════════════════════
function NotificationsReadCard() {
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>} title="Marked as read" badge="Done" badgeColor="green">
      <p className="text-[12px] text-ink font-medium mb-1">Notifications cleared</p>
      <p className="text-[11px] text-muted">Inbox is now empty · last 7 days kept in archive</p>
      <InfoBanner text="Want me to summarize what changed while you were away?" />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// 22. search
// ═══════════════════════════════════════════════════════════════
function SearchResultsCard({ data }: { data: { issues: { id: string; number: number; title: string; status: string; type: string }[]; tasks: { id: string; title: string; status: string }[]; members: { id: string; display_name: string; username: string }[] } }) {
  const nav = useNavigate();
  const total = (data.issues?.length || 0) + (data.tasks?.length || 0) + (data.members?.length || 0);
  if (!total) return <ErrorCard message="No results found" />;
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>} title={`${total} results`}>
      {data.issues?.map((iss) => (
        <button key={iss.id} onClick={() => nav(`/issues/${iss.id}`)} className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-surface-2 transition-colors text-left mb-0.5">
          <span className="text-[11px] text-ink truncate flex-1">{iss.title}</span>
          <span className="text-[9.5px] text-muted bg-surface-2 px-1.5 py-0.5 rounded shrink-0 uppercase">Issue</span>
        </button>
      ))}
      {data.tasks?.map((t) => (
        <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 mb-0.5">
          <span className="text-[11px] text-ink truncate flex-1">{t.title}</span>
          <span className="text-[9.5px] text-muted bg-surface-2 px-1.5 py-0.5 rounded shrink-0 uppercase">Note</span>
        </div>
      ))}
      {data.members?.map((m, i) => (
        <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 mb-0.5">
          <Avatar name={m.display_name || m.username} index={i} size={18} />
          <span className="text-[11px] text-ink">{m.display_name}</span>
          <span className="text-[9.5px] text-muted font-mono">@{m.username}</span>
        </div>
      ))}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// Navigate pill
// ═══════════════════════════════════════════════════════════════
const pageNames: Record<string, string> = { "/": "API Keys", "/issues": "Issues", "/sticky-board": "Sticky Board", "/team": "Team", "/settings": "Settings", "/notifications": "Notifications", "/help": "Help" };

export function NavigateCard({ path }: { path: string }) {
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>} title="Open page">
      <div className="text-[13px] font-semibold text-ink">{pageNames[path] || path}</div>
      <div className="text-[10.5px] text-muted font-mono mt-0.5">{path}</div>
      <p className="text-[11px] text-muted italic mt-1.5">Taking you there now…</p>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// Activity
// ═══════════════════════════════════════════════════════════════
function ActivityCard({ data }: { data: { action: string; entity_type: string; details: string | null; created_at: string }[] }) {
  const nav = useNavigate();
  if (!data?.length) return <Card title="No activity"><p className="text-[12px] text-muted">Nothing happened recently.</p></Card>;
  return (
    <Card icon={<svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" /></svg>} title="Activity · last 24h">
      {data.slice(0, 5).map((a, i) => (
        <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 mb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          <span className="flex-1 text-[11.5px] text-ink">{a.action.replace(/_/g, " ")} · {a.entity_type}</span>
          <span className="text-[10px] text-muted shrink-0">{new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      ))}
      <Buttons primary="View full feed" secondary="Filter" onPrimary={() => nav("/notifications")} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// Error card
// ═══════════════════════════════════════════════════════════════
function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 rounded-[12px] bg-surface border border-border">
      <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
        <svg width="14" height="14" fill="none" stroke="var(--color-muted)" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
      </div>
      <div>
        <div className="text-[12.5px] font-medium text-ink">{message}</div>
        <div className="text-[10.5px] text-muted mt-0.5">Try a different query or check your spelling.</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RESOLVER — maps tool name + data to card
// ═══════════════════════════════════════════════════════════════

function hasError(d: unknown): d is { error: string } {
  return typeof d === "object" && d !== null && "error" in d;
}

export function resolveToolCard(toolName: string, data: unknown): React.ReactNode | null {
  if (hasError(data)) return <ErrorCard message={(data as { error: string }).error} />;

  switch (toolName) {
    case "list_issues": return <IssuesListCard data={data as never} />;
    case "create_issue": return <IssueCreatedCard data={data as never} />;
    case "get_issue": return <IssueDetailCard data={data as never} />;
    case "update_issue": return <IssueUpdatedCard data={data as never} />;
    case "add_comment": return <CommentAddedCard data={data as never} />;
    case "list_tasks": return <TasksListCard data={data as never} />;
    case "create_task": return <TaskCreatedCard data={data as never} />;
    case "update_task": return <TaskUpdatedCard data={data as never} />;
    case "delete_task": return <TaskDeletedCard data={data as never} />;
    case "list_api_keys": return <KeysListCard data={data as never} />;
    case "create_api_key": return <KeyCreatedCard data={data as never} />;
    case "revoke_api_key": return <KeyRevokedCard data={data as never} />;
    case "list_groups": return <GroupsListCard data={data as never} />;
    case "get_group_members": return <GroupMembersCard data={data as never} />;
    case "create_group": return <GroupCreatedCard data={data as never} />;
    case "add_member_to_group": return <MemberAddedToGroupCard data={data as never} />;
    case "remove_member_from_group": return <MemberRemovedFromGroupCard data={data as never} />;
    case "list_members": return <MembersListCard data={data as never} />;
    case "change_member_role": return <RoleChangedCard data={data as never} />;
    case "list_notifications": return <NotificationsCard data={data as never} />;
    case "mark_notifications_read": return <NotificationsReadCard />;
    case "search": return <SearchResultsCard data={data as never} />;
    case "get_activity": return <ActivityCard data={data as never} />;
    default: return null;
  }
}
