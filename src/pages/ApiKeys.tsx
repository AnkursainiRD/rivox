import { useState, useEffect, useCallback } from "react";
import {
  KeyRound, Copy, Share2, Plus, X, Eye, EyeOff, Pencil,
  Users, RotateCcw, Filter, ArrowLeft,
} from "lucide-react";
import { api } from "../lib/api";

interface ApiKey {
  id: string;
  name: string;
  fingerprint: string;
  environment: "prod" | "staging" | "dev";
  is_active: boolean;
  is_global: boolean;
  auto_rotate: boolean;
  last_used_at: string | null;
  created_by: string;
  created_at?: string;
  createdAt?: string;
  shared_user_count?: number;
  shared_group_count?: number;
  shared_total?: number;
  sharedUsers?: { id: string; username: string; avatar_url: string | null }[];
  sharedGroups?: { id: string; name: string }[];
}

const envColor = {
  prod: "bg-status-prod",
  staging: "bg-status-staging",
  dev: "bg-status-dev",
};

const envLabel: Record<string, string> = {
  dev: "dev",
  staging: "local",
  prod: "prod",
};

function CopyKeyButton({ keyId }: { keyId: string }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    setLoading(true);
    try {
      const { value } = await api.get<{ value: string }>(`/keys/${keyId}/value`);

      // Try Tauri clipboard first
      let copied = false;
      try {
        const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
        await writeText(value);
        copied = true;
      } catch {
        // Not in Tauri or plugin not available
      }

      // Fallback to browser clipboard
      if (!copied) {
        try {
          await navigator.clipboard.writeText(value);
          copied = true;
        } catch {
          // Fallback to execCommand
          const textarea = document.createElement("textarea");
          textarea.value = value;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          copied = true;
        }
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleCopy(); }}
      disabled={loading}
      className={`w-7 h-7 rounded-btn-sm border flex items-center justify-center transition-colors ${
        copied ? "border-status-dev bg-status-dev/10 text-status-dev" : "border-border bg-surface text-muted hover:text-ink"
      }`}
      title={copied ? "Copied!" : "Copy key value"}
    >
      {loading ? (
        <div className="w-3 h-3 border-2 border-muted/30 border-t-muted rounded-full animate-spin" />
      ) : copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      ) : (
        <Copy size={13} strokeWidth={1.6} />
      )}
    </button>
  );
}

export function ApiKeysPage({ orgId, userId }: { orgId?: string; userId?: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("create") === "true";
  });
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [shareKeyId, setShareKeyId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      const data = await api.get<ApiKey[]>(`/orgs/${orgId}/keys`);
      setKeys(data);
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  if (!orgId) {
    return <div className="flex items-center justify-center h-full"><p className="text-sm text-muted">No organization selected.</p></div>;
  }

  // Split view when a key is selected
  if (selectedKey) {
    return (
      <div className="flex flex-col h-full -mx-6 -mt-6 -mb-6">
        {editingKey && (
          <EditKeyModal apiKey={editingKey} orgId={orgId} onClose={() => setEditingKey(null)} onSaved={() => { setEditingKey(null); fetchKeys(); }} />
        )}
        {showCreate && (
          <CreateKeyModal orgId={orgId} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchKeys(); }} />
        )}

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border bg-surface">
          <div>
            <h1 className="text-xl font-semibold text-ink">API Keys</h1>
            <p className="mt-1 text-sm text-muted">Select a key to manage permissions and rotation.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSelectedKey(null); }}
              className="px-3 py-1.5 border border-border text-sm font-medium text-ink rounded-btn hover:bg-surface-2 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={13} strokeWidth={1.6} />
              Back to list
            </button>
            <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 bg-ink text-surface text-sm font-medium rounded-btn hover:opacity-90 transition-opacity flex items-center gap-1.5">
              <Plus size={14} strokeWidth={2} /> New key
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left: key list */}
          <div className="w-[260px] shrink-0 border-r border-border bg-surface flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[10.5px] font-semibold text-muted uppercase tracking-widest">All keys · {keys.length}</span>
              <span className="text-[11px] text-muted">↕ sort</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
              {keys.map((k) => {
                const sel = selectedKey?.id === k.id;
                return (
                  <button
                    key={k.id}
                    onClick={() => setSelectedKey(k)}
                    className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2.5 rounded-btn transition-colors ${
                      sel ? "bg-ink/5 border border-ink/15" : "border border-transparent hover:bg-surface-2"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-btn-sm flex items-center justify-center ${sel ? "bg-surface text-ink" : "bg-surface-2 text-muted"}`}>
                      <KeyRound size={13} strokeWidth={1.6} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink truncate">{k.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-[5px] h-[5px] rounded-full ${envColor[k.environment]}`} />
                        <span className="text-[10.5px] text-muted">{envLabel[k.environment] || k.environment}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: detail */}
          <div className="flex-1 overflow-y-auto p-6">
            <KeyDetailPane
              apiKey={selectedKey}
              userId={userId}
              orgId={orgId}
              onEdit={() => setEditingKey(selectedKey)}
              onRefresh={fetchKeys}
              onRevoke={async () => {
                await api.post(`/keys/${selectedKey.id}/revoke`, { reason: "Manual revoke" });
                setSelectedKey(null);
                fetchKeys();
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {showCreate && (
        <CreateKeyModal orgId={orgId} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchKeys(); }} />
      )}
      {editingKey && (
        <EditKeyModal apiKey={editingKey} orgId={orgId} onClose={() => setEditingKey(null)} onSaved={() => { setEditingKey(null); fetchKeys(); }} />
      )}

      {/* Page header */}
      <div className="flex items-start justify-between mb-6 -mx-6 -mt-6 px-6 pt-6 pb-5 bg-surface border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-ink">API Keys</h1>
          <p className="mt-1 text-sm text-muted">Manage secrets and who on the team can manage them.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 border border-border text-sm font-medium text-ink rounded-btn hover:bg-surface-2 transition-colors flex items-center gap-1.5">
            <Filter size={13} strokeWidth={1.6} />
            All environments
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 bg-ink text-surface text-sm font-medium rounded-btn hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus size={14} strokeWidth={2} />
            New key
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {[
          { label: "Total keys", value: String(keys.length), detail: "+1 this week" },
          { label: "In production", value: String(keys.filter((k) => k.environment === "prod").length), detail: "monitored", accent: true },
          { label: "Shared > 5 ppl", value: "2", detail: "review weekly" },
          { label: "Calls today", value: "14.2k", detail: "normal" },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-card px-3.5 py-3 shadow-card">
            <p className="text-[11px] text-muted font-medium">{s.label}</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <p className="text-[22px] font-semibold text-ink tracking-tight">{s.value}</p>
              <p className={`text-[11px] ${s.accent ? "text-accent" : "text-muted"}`}>{s.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <KeyRound size={32} className="text-muted mb-3" />
          <p className="text-sm font-medium text-ink mb-1">No API keys yet</p>
          <p className="text-xs text-muted mb-4">Create your first key to get started.</p>
          <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 bg-ink text-surface text-sm font-medium rounded-btn hover:opacity-90 transition-opacity flex items-center gap-1.5">
            <Plus size={14} strokeWidth={2} /> New key
          </button>
        </div>
      ) : (
        /* Table */
        <div className="bg-surface border border-border rounded-card shadow-card overflow-visible">
          {/* Header */}
          <div className="grid gap-0 px-4 py-2.5 border-b border-border bg-surface-2 text-[10.5px] font-semibold text-muted uppercase tracking-widest"
            style={{ gridTemplateColumns: "1.6fr 0.6fr 0.9fr 1.2fr 0.5fr" }}>
            <div>Key</div>
            <div>Env</div>
            <div>Last used</div>
            <div>Shared with</div>
            <div />
          </div>

          {/* Rows */}
          {keys.map((k, i) => {
            const isShareOpen = shareKeyId === k.id;
            return (
              <div key={k.id} className="relative">
                <div
                  onClick={() => setSelectedKey(k)}
                  className={`grid items-center px-4 py-3.5 transition-colors cursor-pointer ${
                    i < keys.length - 1 ? "border-b border-border" : ""
                  } ${isShareOpen ? "bg-accent-soft/30" : "hover:bg-surface-2"}`}
                  style={{ gridTemplateColumns: "1.6fr 0.6fr 0.9fr 1.2fr 0.5fr" }}
                >
                  {/* Key name + fingerprint */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-btn-sm bg-surface-2 flex items-center justify-center shrink-0">
                      <KeyRound size={13} strokeWidth={1.6} className="text-muted" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink truncate">{k.name}</p>
                      <p className="text-[11px] text-muted font-mono">{k.fingerprint}</p>
                    </div>
                  </div>

                  {/* Env chip */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-2 text-[11px] font-medium text-muted">
                      <span className={`w-1.5 h-1.5 rounded-full ${envColor[k.environment]}`} />
                      {envLabel[k.environment] || k.environment}
                    </span>
                  </div>

                  {/* Last used */}
                  <div className="text-[12px] text-muted">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                  </div>

                  {/* Shared with — avatar stack */}
                  <div className="flex items-center">
                    {k.is_global ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ink/5 border border-ink/10 text-[11px] font-medium text-ink">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        Global
                      </span>
                    ) : (k.shared_total || 0) > 0 ? (
                      <>
                        <div className="flex -space-x-2">
                          {(k.sharedUsers || []).slice(0, 3).map((u, idx) => {
                            const colors = ["from-indigo-400 to-purple-400", "from-emerald-400 to-teal-400", "from-rose-400 to-pink-400", "from-amber-400 to-orange-400"];
                            return u.avatar_url ? (
                              <img key={u.id} src={u.avatar_url} className="w-6 h-6 rounded-full ring-[2.5px] ring-surface object-cover" />
                            ) : (
                              <div key={u.id} className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors[idx % colors.length]} ring-[2.5px] ring-surface flex items-center justify-center text-white text-[9px] font-bold`}>
                                {u.username.slice(0, 2).toUpperCase()}
                              </div>
                            );
                          })}
                          {(k.sharedGroups || []).slice(0, 2).map((g, idx) => {
                            const colors = ["from-cyan-400 to-blue-400", "from-fuchsia-400 to-violet-400"];
                            return (
                              <div key={g.id} className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors[idx % colors.length]} ring-[2.5px] ring-surface flex items-center justify-center text-white text-[9px] font-bold`}>
                                {g.name[0]}
                              </div>
                            );
                          })}
                          {(k.shared_total || 0) > 5 && (
                            <div className="w-6 h-6 rounded-full bg-surface-2 ring-[2.5px] ring-surface flex items-center justify-center text-[9px] font-semibold text-muted">
                              +{(k.shared_total || 0) - 5}
                            </div>
                          )}
                        </div>
                        <span className="ml-2.5 text-[11.5px] text-muted">
                          {(k.shared_user_count || 0) + (k.shared_group_count || 0)} {(k.shared_user_count || 0) + (k.shared_group_count || 0) === 1 ? "shared" : "shared"}
                        </span>
                      </>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setShareKeyId(k.id); }}
                        className="flex items-center gap-1.5 text-[11.5px] text-muted/50 hover:text-accent transition-colors">
                        <Plus size={12} className="shrink-0" />
                        <span>Add people</span>
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <CopyKeyButton keyId={k.id} />
                    <button
                      onClick={() => setShareKeyId(isShareOpen ? null : k.id)}
                      className={`px-2.5 py-1 text-[12px] font-medium rounded-btn-sm transition-colors ${
                        isShareOpen
                          ? "bg-ink text-surface"
                          : "border border-border text-ink hover:bg-surface-2"
                      }`}
                    >
                      Share
                    </button>
                  </div>
                </div>

                {/* Inline share popover */}
                {isShareOpen && (
                  <SharePopover
                    apiKey={k}
                    orgId={orgId}
                    onClose={() => { setShareKeyId(null); fetchKeys(); }}
                    onChanged={fetchKeys}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Share Popover (anchored below the row) ── */

interface ShareDetail {
  creator?: { id: string; username: string; avatar_url: string | null };
  sharedUsers?: { id: string; username: string; display_name: string | null; avatar_url: string | null; ApiKeyUserAccess: { permission: string } }[];
  sharedGroups?: { id: string; name: string; ApiKeyGroupAccess: { permission: string } }[];
}

function SharePopover({ apiKey, onClose, orgId, onChanged }: { apiKey: ApiKey; onClose: () => void; orgId: string; onChanged?: () => void }) {
  const [inviteInput, setInviteInput] = useState("");
  const [invitePerm, setInvitePerm] = useState<"view" | "manage">("manage");
  const [detail, setDetail] = useState<ShareDetail | null>(null);
  const [searchResults, setSearchResults] = useState<{ type: "user" | "group"; id: string; name: string; email?: string; avatar_url?: string | null }[]>([]);
  const [showResults, setShowResults] = useState(false);

  const fetchDetail = useCallback(() => {
    api.get<ShareDetail>(`/keys/${apiKey.id}`).then(setDetail).catch(() => {});
  }, [apiKey.id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Search as user types
  useEffect(() => {
    if (!inviteInput.trim()) { setSearchResults([]); setShowResults(false); return; }
    const q = inviteInput.toLowerCase();
    const existingUserIds = new Set(detail?.sharedUsers?.map((u) => u.id) || []);
    const existingGroupIds = new Set(detail?.sharedGroups?.map((g) => g.id) || []);
    let cancelled = false;
    (async () => {
      try {
        const [members, groups] = await Promise.all([
          api.get<{ user: { id: string; username: string; display_name: string | null; email: string; avatar_url: string | null } }[]>(`/orgs/${orgId}/members`),
          api.get<{ id: string; name: string; member_count: number }[]>(`/orgs/${orgId}/groups`),
        ]);
        if (cancelled) return;
        const uResults = members.filter((m) => !existingUserIds.has(m.user.id) && ((m.user.display_name || "").toLowerCase().includes(q) || m.user.username.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)))
          .map((m) => ({ type: "user" as const, id: m.user.id, name: m.user.display_name || m.user.username, email: m.user.email, avatar_url: m.user.avatar_url }));
        const gResults = groups.filter((g) => !existingGroupIds.has(g.id) && g.name.toLowerCase().includes(q))
          .map((g) => ({ type: "group" as const, id: g.id, name: g.name, email: `${g.member_count} members`, avatar_url: null }));
        setSearchResults([...uResults, ...gResults].slice(0, 5));
        setShowResults(true);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [inviteInput, orgId, detail]);

  const invite = async (r: (typeof searchResults)[0]) => {
    if (r.type === "user") await api.post(`/keys/${apiKey.id}/share/user`, { user_id: r.id, permission: invitePerm });
    else await api.post(`/keys/${apiKey.id}/share/group`, { group_id: r.id, permission: invitePerm });
    setInviteInput("");
    setShowResults(false);
    fetchDetail();
    onChanged?.();
  };

  const toggleUserPermission = async (userId: string, current: string) => {
    const newPerm = current === "view" ? "manage" : "view";
    await api.post(`/keys/${apiKey.id}/share/user`, { user_id: userId, permission: newPerm });
    fetchDetail();
    onChanged?.();
  };

  const toggleGroupPermission = async (groupId: string, current: string) => {
    const newPerm = current === "view" ? "manage" : "view";
    await api.post(`/keys/${apiKey.id}/share/group`, { group_id: groupId, permission: newPerm });
    fetchDetail();
    onChanged?.();
  };

  const sharedUsers = detail?.sharedUsers || [];
  const sharedGroups = detail?.sharedGroups || [];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-4 top-full -mt-2 w-[380px] bg-surface border border-border rounded-xl z-50 overflow-hidden"
        style={{ boxShadow: "0 24px 60px -12px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)" }}>

        <div className="absolute -top-[6px] right-10 w-3 h-3 bg-surface border-l border-t border-border rotate-45" />

        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 size={13} strokeWidth={1.6} className="text-ink" />
            <span className="text-[13px] font-semibold text-ink">Share access · {apiKey.name}</span>
          </div>
          <p className="text-[11.5px] text-muted mt-1">Members can manage this key. Access is audit-logged.</p>
        </div>

        <div className="px-4 py-3 border-b border-border relative">
          <div className="flex items-center gap-1.5 border border-border rounded-btn bg-surface-2 p-1">
            <input type="text" value={inviteInput} onChange={(e) => setInviteInput(e.target.value)}
              onFocus={() => inviteInput.trim() && setShowResults(true)}
              placeholder="Search users or groups..."
              className="flex-1 px-2 py-1.5 text-[12px] bg-transparent text-ink placeholder:text-muted/40 outline-none" />
            <button type="button" onClick={() => setInvitePerm(invitePerm === "manage" ? "view" : "manage")}
              className="px-2 py-1.5 text-[11px] text-muted border-r border-border pr-2.5 hover:text-ink transition-colors shrink-0">
              can {invitePerm} ▾
            </button>
          </div>
          {showResults && searchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-full -mt-1 bg-surface border border-border rounded-lg shadow-popover z-10 overflow-hidden">
              {searchResults.map((r) => (
                <button key={r.id} onClick={() => invite(r)}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-surface-2 transition-colors">
                  {r.type === "group" ? (
                    <div className="w-6 h-6 rounded-btn-sm bg-accent-soft flex items-center justify-center text-accent"><Users size={12} strokeWidth={1.6} /></div>
                  ) : r.avatar_url ? (
                    <img src={r.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[9px] font-semibold">
                      {r.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-ink truncate">{r.name}</p>
                    <p className="text-[10px] text-muted truncate">{r.email}</p>
                  </div>
                  <span className="text-[10px] text-muted px-1.5 py-0.5 bg-surface-2 rounded">{r.type === "group" ? "Group" : "User"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-2 py-1.5">
          {/* Owner */}
          {detail?.creator && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-btn">
              {detail.creator.avatar_url ? (
                <img src={detail.creator.avatar_url} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[10px] font-semibold">
                  {detail.creator.username.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-ink">{detail.creator.username}</p>
                <p className="text-[11px] text-muted">Key owner</p>
              </div>
              <span className="text-[11.5px] text-muted">Owner</span>
            </div>
          )}

          {/* Shared users */}
          {sharedUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-2.5 px-2 py-2 rounded-btn hover:bg-surface-2 transition-colors">
              {u.avatar_url ? (
                <img src={u.avatar_url} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[10px] font-semibold">
                  {(u.display_name || u.username).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-ink">{u.display_name || u.username}</p>
                <p className="text-[11px] text-muted">{u.username}</p>
              </div>
              <button
                onClick={() => toggleUserPermission(u.id, u.ApiKeyUserAccess?.permission || "view")}
                className="text-[11.5px] text-ink px-2 py-0.5 rounded border border-border hover:bg-surface-2 transition-colors"
              >
                Can {u.ApiKeyUserAccess?.permission || "view"} ▾
              </button>
            </div>
          ))}

          {/* Shared groups */}
          {sharedGroups.length > 0 && <div className="h-px bg-border mx-2 my-1.5" />}
          {sharedGroups.map((g) => (
            <div key={g.id} className="flex items-center gap-2.5 px-2 py-2 rounded-btn hover:bg-surface-2 transition-colors">
              <div className="w-7 h-7 rounded-btn-sm bg-accent-soft flex items-center justify-center text-accent">
                <Users size={14} strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-ink">{g.name}</p>
                <p className="text-[11px] text-muted">Group members inherit access</p>
              </div>
              <button
                onClick={() => toggleGroupPermission(g.id, g.ApiKeyGroupAccess?.permission || "view")}
                className="text-[11.5px] text-ink px-2 py-0.5 rounded border border-border hover:bg-surface-2 transition-colors"
              >
                Can {g.ApiKeyGroupAccess?.permission || "view"} ▾
              </button>
            </div>
          ))}

          {sharedUsers.length === 0 && sharedGroups.length === 0 && !detail?.creator && (
            <p className="px-2 py-4 text-center text-[11.5px] text-muted">Loading...</p>
          )}
          {detail && sharedUsers.length === 0 && sharedGroups.length === 0 && (
            <p className="px-2 py-3 text-center text-[11.5px] text-muted">Not shared with anyone yet.</p>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border bg-surface-2">
          <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <RotateCcw size={12} strokeWidth={1.6} />
            Auto-rotate · {apiKey.auto_rotate ? "90 days" : "off"}
          </div>
          <div className="flex-1" />
          <button className="px-2.5 py-1 text-[11.5px] text-muted hover:text-ink transition-colors">Settings</button>
          <button onClick={onClose} className="px-3 py-1 bg-ink text-surface text-[11.5px] font-medium rounded-btn-sm hover:opacity-90 transition-opacity">Done</button>
        </div>
      </div>
    </>
  );
}

/* ── Create Key Modal ── */

const envMeta = {
  dev: { label: "Development", dot: "bg-status-dev", desc: "Local & testing" },
  staging: { label: "Local", dot: "bg-status-staging", desc: "Local machine" },
  prod: { label: "Production", dot: "bg-status-prod", desc: "Live environment" },
} as const;

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex-1 flex items-start gap-3 p-3.5 rounded-card border transition-all ${
        checked ? "border-ink bg-ink/10 ring-1 ring-ink/20" : "border-border bg-surface hover:bg-surface-2"
      }`}
    >
      <div className={`w-[34px] h-[20px] rounded-full flex items-center shrink-0 mt-0.5 transition-colors ${
        checked ? "bg-ink justify-end" : "bg-border justify-start"
      }`}>
        <div className="w-4 h-4 rounded-full bg-white shadow-sm mx-0.5" />
      </div>
      <div className="text-left">
        <p className="text-[13px] font-medium text-ink leading-tight">{label}</p>
        <p className="text-[11px] text-muted mt-0.5">{description}</p>
      </div>
    </button>
  );
}

function CreateKeyModal({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [environment, setEnvironment] = useState<"dev" | "staging" | "prod">("dev");
  const [isGlobal, setIsGlobal] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareInput, setShareInput] = useState("");
  const [shareRole, setShareRole] = useState<"view" | "manage">("manage");
  const [sharedWith, setSharedWith] = useState<{ type: "user" | "group"; id: string; name: string; email?: string; permission: "view" | "manage" }[]>([]);
  const [searchResults, setSearchResults] = useState<{ type: "user" | "group"; id: string; name: string; email?: string; avatar_url?: string | null }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Generate a safe fingerprint
  const [fingerprint, setFingerprint] = useState("");
  useEffect(() => {
    if (!value) { setFingerprint(""); return; }
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)).then((hash) => {
      const hex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      setFingerprint(`fp:${hex.slice(0, 16)}`);
    });
  }, [value]);

  // Search org members + groups as user types
  useEffect(() => {
    if (!shareInput.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    const q = shareInput.toLowerCase();
    let cancelled = false;
    (async () => {
      try {
        const [members, groups] = await Promise.all([
          api.get<{ user: { id: string; username: string; display_name: string | null; email: string; avatar_url: string | null } }[]>(`/orgs/${orgId}/members`),
          api.get<{ id: string; name: string; member_count: number }[]>(`/orgs/${orgId}/groups`),
        ]);
        if (cancelled) return;
        const alreadyIds = new Set(sharedWith.map((s) => s.id));
        const userResults = members
          .filter((m) =>
            !alreadyIds.has(m.user.id) &&
            ((m.user.display_name || "").toLowerCase().includes(q) ||
             m.user.username.toLowerCase().includes(q) ||
             m.user.email.toLowerCase().includes(q))
          )
          .map((m) => ({ type: "user" as const, id: m.user.id, name: m.user.display_name || m.user.username, email: m.user.email, avatar_url: m.user.avatar_url }));
        const groupResults = groups
          .filter((g) => !alreadyIds.has(g.id) && g.name.toLowerCase().includes(q))
          .map((g) => ({ type: "group" as const, id: g.id, name: g.name, email: `${g.member_count} members`, avatar_url: null }));
        setSearchResults([...userResults, ...groupResults].slice(0, 6));
        setShowDropdown(true);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [shareInput, orgId, sharedWith]);

  const addFromResult = (r: (typeof searchResults)[0]) => {
    setSharedWith((prev) => [...prev, { type: r.type, id: r.id, name: r.name, email: r.email || undefined, permission: shareRole }]);
    setShareInput("");
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const key = await api.post<{ id: string }>(`/orgs/${orgId}/keys`, {
        name: name.trim(), fingerprint, encrypted_value: value.trim(),
        environment, is_global: isGlobal, auto_rotate: autoRotate,
      });
      for (const s of sharedWith) {
        if (s.type === "user") await api.post(`/keys/${key.id}/share/user`, { user_id: s.id, permission: s.permission });
        else await api.post(`/keys/${key.id}/share/group`, { group_id: s.id, permission: s.permission });
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-md" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-[520px] bg-surface border border-border rounded-xl shadow-popover overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center">
              <KeyRound size={15} strokeWidth={1.6} className="text-surface" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-ink leading-tight">Create API Key</h3>
              <p className="text-[11px] text-muted">Store and manage a secret key</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 transition-colors">
            <X size={15} strokeWidth={1.6} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && <div className="px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />{error}</div>}

          <div>
            <label className="text-[13px] font-medium text-ink mb-2 block">Name <span className="text-muted font-normal">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. prod-openai, staging-stripe"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-surface-2 border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all" autoFocus />
          </div>

          <div>
            <label className="text-[13px] font-medium text-ink mb-2 block">Secret value <span className="text-muted font-normal">*</span></label>
            <div className="relative">
              <input type={showValue ? "text" : "password"} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste your API key here"
                className="w-full px-3.5 py-2.5 pr-20 text-sm font-mono rounded-lg bg-surface-2 border border-border text-ink placeholder:text-muted/40 placeholder:font-sans outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all" />
              <button type="button" onClick={() => setShowValue(!showValue)} className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted hover:text-ink hover:bg-surface transition-colors">
                {showValue ? <><EyeOff size={12} strokeWidth={1.6} /> Hide</> : <><Eye size={12} strokeWidth={1.6} /> Show</>}
              </button>
            </div>
            {fingerprint && <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-md bg-surface-2 border border-border w-fit"><span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Fingerprint</span><code className="text-[11px] text-ink font-mono">{fingerprint}</code></div>}
          </div>

          <div>
            <label className="text-[13px] font-medium text-ink mb-2 block">Environment</label>
            <div className="grid grid-cols-3 gap-2">
              {(["dev", "staging", "prod"] as const).map((env) => {
                const meta = envMeta[env];
                const selected = environment === env;
                return (
                  <button key={env} type="button" onClick={() => setEnvironment(env)}
                    className={`flex flex-col items-start px-3.5 py-3 rounded-lg border transition-all ${selected ? "border-ink bg-ink/10 ring-1 ring-ink/20" : "border-border bg-surface hover:bg-surface-2"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      <span className="text-[13px] font-medium text-ink">{meta.label}</span>
                    </div>
                    <span className="text-[10px] text-muted">{meta.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Toggle checked={isGlobal} onChange={setIsGlobal} label="Global access" description="All org members can view" />
            <Toggle checked={autoRotate} onChange={setAutoRotate} label="Auto-rotate" description="Rotate every 90 days" />
          </div>

          {!isGlobal && (
            <div>
              <label className="text-[13px] font-medium text-ink mb-2 block">Share access <span className="text-muted font-normal">optional</span></label>
              <div className="relative mb-3">
                <div className="flex items-center gap-1.5 border border-border rounded-lg bg-surface-2 p-1">
                  <input type="text" value={shareInput} onChange={(e) => setShareInput(e.target.value)}
                    onFocus={() => shareInput.trim() && setShowDropdown(true)}
                    placeholder="Search users or groups..." className="flex-1 px-2.5 py-1.5 text-xs bg-transparent text-ink placeholder:text-muted/40 outline-none" />
                  <button type="button" onClick={() => setShareRole(shareRole === "manage" ? "view" : "manage")}
                    className="px-2 py-1.5 text-[11px] text-muted border-r border-border pr-2.5 hover:text-ink transition-colors shrink-0">can {shareRole} ▾</button>
                </div>

                {/* Search dropdown */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-popover z-10 overflow-hidden">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => addFromResult(r)}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-surface-2 transition-colors"
                      >
                        {r.type === "group" ? (
                          <div className="w-6 h-6 rounded-btn-sm bg-accent-soft flex items-center justify-center text-accent">
                            <Users size={12} strokeWidth={1.6} />
                          </div>
                        ) : r.avatar_url ? (
                          <img src={r.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[9px] font-semibold">
                            {r.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-ink truncate">{r.name}</p>
                          <p className="text-[10px] text-muted truncate">{r.email || (r.type === "group" ? "Group" : "")}</p>
                        </div>
                        <span className="text-[10px] text-muted px-1.5 py-0.5 bg-surface-2 rounded">
                          {r.type === "group" ? "Group" : "User"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && shareInput.trim() && searchResults.length === 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-popover z-10 px-3 py-3 text-center text-[11px] text-muted">
                    No users or groups found matching "{shareInput}"
                  </div>
                )}
              </div>
              {sharedWith.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  {sharedWith.map((s, i) => (
                    <div key={i} className={`flex items-center gap-2.5 px-3 py-2.5 ${i < sharedWith.length - 1 ? "border-b border-border" : ""}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold ${s.type === "group" ? "bg-accent-soft text-accent rounded-btn-sm" : "bg-gradient-to-br from-accent to-purple-400 text-white"}`}>
                        {s.type === "group" ? <Users size={12} strokeWidth={1.6} /> : s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="flex-1 text-[12px] font-medium text-ink truncate">{s.name}</p>
                      <span className="text-[11px] text-muted px-2 py-0.5 border border-border rounded">Can {s.permission}</span>
                      <button type="button" onClick={() => setSharedWith((p) => p.filter((_, j) => j !== i))} className="p-0.5 text-muted hover:text-red-500 transition-colors"><X size={12} strokeWidth={1.6} /></button>
                    </div>
                  ))}
                </div>
              )}
              {sharedWith.length === 0 && <p className="text-[11px] text-muted/50 text-center py-2">No one added yet. The key will only be visible to you.</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-2/50">
          <p className="text-[11px] text-muted">The key will be encrypted at rest.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted border border-border rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !name.trim() || !value.trim()}
              className="px-5 py-2 bg-ink text-surface text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2">
              {loading ? <div className="w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" /> : <KeyRound size={13} strokeWidth={1.6} />}
              Create key
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ── Edit Key Modal ── */

function EditKeyModal({ apiKey, onClose, onSaved, orgId }: { apiKey: ApiKey; onClose: () => void; onSaved: () => void; orgId: string }) {
  const [name, setName] = useState(apiKey.name);
  const [environment, setEnvironment] = useState(apiKey.environment);
  const [isGlobal, setIsGlobal] = useState(apiKey.is_global);
  const [autoRotate, setAutoRotate] = useState(apiKey.auto_rotate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Access management
  const [shareInput, setShareInput] = useState("");
  const [shareRole, setShareRole] = useState<"view" | "manage">("manage");
  const [searchResults, setSearchResults] = useState<{ type: "user" | "group"; id: string; name: string; email?: string; avatar_url?: string | null }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentAccess, setCurrentAccess] = useState<{ type: "user" | "group"; id: string; name: string; email?: string; permission: string; avatar_url?: string | null }[]>([]);

  // Fetch current access
  useEffect(() => {
    api.get<{ sharedUsers?: { id: string; username: string; display_name: string | null; avatar_url: string | null; ApiKeyUserAccess: { permission: string } }[]; sharedGroups?: { id: string; name: string; ApiKeyGroupAccess: { permission: string } }[] }>(`/keys/${apiKey.id}`)
      .then((d) => {
        const access: typeof currentAccess = [];
        d.sharedUsers?.forEach((u) => access.push({ type: "user", id: u.id, name: u.display_name || u.username, email: u.username, permission: u.ApiKeyUserAccess?.permission || "view", avatar_url: u.avatar_url }));
        d.sharedGroups?.forEach((g) => access.push({ type: "group", id: g.id, name: g.name, permission: g.ApiKeyGroupAccess?.permission || "view" }));
        setCurrentAccess(access);
      }).catch(() => {});
  }, [apiKey.id]);

  // Search users/groups
  useEffect(() => {
    if (!shareInput.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    const q = shareInput.toLowerCase();
    let cancelled = false;
    (async () => {
      try {
        const [members, groups] = await Promise.all([
          api.get<{ user: { id: string; username: string; display_name: string | null; email: string; avatar_url: string | null } }[]>(`/orgs/${orgId}/members`),
          api.get<{ id: string; name: string; member_count: number }[]>(`/orgs/${orgId}/groups`),
        ]);
        if (cancelled) return;
        const existingIds = new Set(currentAccess.map((a) => a.id));
        const userResults = members.filter((m) => !existingIds.has(m.user.id) && ((m.user.display_name || "").toLowerCase().includes(q) || m.user.username.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)))
          .map((m) => ({ type: "user" as const, id: m.user.id, name: m.user.display_name || m.user.username, email: m.user.email, avatar_url: m.user.avatar_url }));
        const groupResults = groups.filter((g) => !existingIds.has(g.id) && g.name.toLowerCase().includes(q))
          .map((g) => ({ type: "group" as const, id: g.id, name: g.name, email: `${g.member_count} members`, avatar_url: null }));
        setSearchResults([...userResults, ...groupResults].slice(0, 6));
        setShowDropdown(true);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [shareInput, orgId, currentAccess]);

  const addAccess = async (r: (typeof searchResults)[0]) => {
    try {
      if (r.type === "user") await api.post(`/keys/${apiKey.id}/share/user`, { user_id: r.id, permission: shareRole });
      else await api.post(`/keys/${apiKey.id}/share/group`, { group_id: r.id, permission: shareRole });
      setCurrentAccess((prev) => [...prev, { type: r.type, id: r.id, name: r.name, email: r.email, permission: shareRole, avatar_url: r.avatar_url }]);
    } catch { /* ignore */ }
    setShareInput("");
    setShowDropdown(false);
  };

  const removeAccess = async (a: (typeof currentAccess)[0]) => {
    try {
      if (a.type === "user") await api.delete(`/keys/${apiKey.id}/access/user/${a.id}`);
      setCurrentAccess((prev) => prev.filter((x) => !(x.id === a.id && x.type === a.type)));
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/keys/${apiKey.id}`, { name: name.trim(), environment, is_global: isGlobal, auto_rotate: autoRotate });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update key");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-md" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-[520px] bg-surface border border-border rounded-xl shadow-popover overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center"><Pencil size={14} strokeWidth={1.6} className="text-surface" /></div>
            <div><h3 className="text-[15px] font-semibold text-ink leading-tight">Edit API Key</h3><p className="text-[11px] text-muted">{apiKey.fingerprint}</p></div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 transition-colors"><X size={15} strokeWidth={1.6} /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {error && <div className="px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">{error}</div>}
          <div>
            <label className="text-[13px] font-medium text-ink mb-2 block">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-surface-2 border border-border text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all" autoFocus />
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink mb-2 block">Environment</label>
            <div className="grid grid-cols-3 gap-2">
              {(["dev", "staging", "prod"] as const).map((env) => {
                const meta = envMeta[env];
                const selected = environment === env;
                return (
                  <button key={env} type="button" onClick={() => setEnvironment(env)}
                    className={`flex flex-col items-start px-3.5 py-3 rounded-lg border transition-all ${selected ? "border-ink bg-ink/10 ring-1 ring-ink/20" : "border-border bg-surface hover:bg-surface-2"}`}>
                    <div className="flex items-center gap-2 mb-1"><span className={`w-2 h-2 rounded-full ${meta.dot}`} /><span className="text-[13px] font-medium text-ink">{meta.label}</span></div>
                    <span className="text-[10px] text-muted">{meta.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <Toggle checked={isGlobal} onChange={setIsGlobal} label="Global access" description="All org members can view" />
            <Toggle checked={autoRotate} onChange={setAutoRotate} label="Auto-rotate" description="Rotate every 90 days" />
          </div>

          {/* Share access */}
          {!isGlobal && (
            <div>
              <label className="text-[13px] font-medium text-ink mb-2 block">Share access <span className="text-muted font-normal">optional</span></label>
              <div className="relative mb-3">
                <div className="flex items-center gap-1.5 border border-border rounded-lg bg-surface-2 p-1">
                  <input type="text" value={shareInput} onChange={(e) => setShareInput(e.target.value)}
                    onFocus={() => shareInput.trim() && setShowDropdown(true)}
                    placeholder="Search users or groups..." className="flex-1 px-2.5 py-1.5 text-xs bg-transparent text-ink placeholder:text-muted/40 outline-none" />
                  <button type="button" onClick={() => setShareRole(shareRole === "manage" ? "view" : "manage")}
                    className="px-2 py-1.5 text-[11px] text-muted border-r border-border pr-2.5 hover:text-ink transition-colors shrink-0">can {shareRole} ▾</button>
                </div>
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-popover z-10 overflow-hidden">
                    {searchResults.map((r) => (
                      <button key={r.id} type="button" onClick={() => addAccess(r)}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-surface-2 transition-colors">
                        {r.type === "group" ? (
                          <div className="w-6 h-6 rounded-btn-sm bg-accent-soft flex items-center justify-center text-accent"><Users size={12} strokeWidth={1.6} /></div>
                        ) : r.avatar_url ? (
                          <img src={r.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[9px] font-semibold">
                            {r.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-ink truncate">{r.name}</p>
                          <p className="text-[10px] text-muted truncate">{r.email}</p>
                        </div>
                        <span className="text-[10px] text-muted px-1.5 py-0.5 bg-surface-2 rounded">{r.type === "group" ? "Group" : "User"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {currentAccess.length > 0 ? (
                <div className="border border-border rounded-lg overflow-hidden">
                  {currentAccess.map((a, i) => (
                    <div key={`${a.type}-${a.id}`} className={`flex items-center gap-2.5 px-3 py-2.5 ${i < currentAccess.length - 1 ? "border-b border-border" : ""}`}>
                      {a.type === "group" ? (
                        <div className="w-6 h-6 rounded-btn-sm bg-accent-soft flex items-center justify-center text-accent"><Users size={12} strokeWidth={1.6} /></div>
                      ) : a.avatar_url ? (
                        <img src={a.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[9px] font-semibold">
                          {a.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-ink truncate">{a.name}</p>
                        <p className="text-[10px] text-muted">{a.type === "group" ? "Group" : a.email}</p>
                      </div>
                      <span className="text-[11px] text-muted px-2 py-0.5 border border-border rounded">Can {a.permission}</span>
                      <button type="button" onClick={() => removeAccess(a)} className="p-0.5 text-muted hover:text-red-500 transition-colors"><X size={12} strokeWidth={1.6} /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted/50 text-center py-2">No one added yet. The key will only be visible to you.</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-surface-2/50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted border border-border rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
          <button type="submit" disabled={loading || !name.trim()} className="px-5 py-2 bg-ink text-surface text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2">
            {loading ? <div className="w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" /> : <Pencil size={13} strokeWidth={1.6} />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Key Detail View (B split detail — shown when clicking a row) ── */

/* ── Key Detail Pane (right side of split view) ── */

interface KeyDetail {
  id: string;
  name: string;
  fingerprint: string;
  environment: string;
  is_active: boolean;
  is_global: boolean;
  auto_rotate: boolean;
  created_by: string;
  created_at: string;
  creator?: { id: string; username: string; avatar_url: string | null };
  sharedUsers?: { id: string; username: string; display_name: string | null; avatar_url: string | null; ApiKeyUserAccess: { permission: string } }[];
  sharedGroups?: { id: string; name: string; color: string | null; ApiKeyGroupAccess: { permission: string } }[];
}

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  details: Record<string, string> | null;
  created_at?: string;
  createdAt?: string;
  actor?: { id: string; username: string; display_name: string | null; avatar_url: string | null };
}

function KeyDetailPane({ apiKey, onEdit, userId, onRevoke, orgId, onRefresh: _onRefresh }: { apiKey: ApiKey; onEdit: () => void; userId?: string; onRevoke: () => void; orgId: string; onRefresh?: () => void }) {
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [detail, setDetail] = useState<KeyDetail | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(0);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setLoadingDetail(true);
    setActivityPage(0);
    Promise.all([
      api.get<KeyDetail>(`/keys/${apiKey.id}`),
      api.get<{ logs: ActivityItem[]; total: number }>(`/orgs/${orgId}/activity?entity_type=api_key&entity_id=${apiKey.id}&limit=${PAGE_SIZE}&offset=0`).catch(() => ({ logs: [], total: 0 })),
    ]).then(([d, a]) => {
      setDetail(d);
      setActivities(a.logs || []);
      setActivityTotal(a.total || 0);
    }).finally(() => setLoadingDetail(false));
  }, [apiKey.id, orgId]);

  const loadMoreActivity = async () => {
    const nextPage = activityPage + 1;
    setLoadingMore(true);
    try {
      const a = await api.get<{ logs: ActivityItem[]; total: number }>(`/orgs/${orgId}/activity?entity_type=api_key&entity_id=${apiKey.id}&limit=${PAGE_SIZE}&offset=${nextPage * PAGE_SIZE}`);
      setActivities((prev) => [...prev, ...(a.logs || [])]);
      setActivityPage(nextPage);
    } catch { /* ignore */ }
    setLoadingMore(false);
  };

  return (
    <div>
      {/* Title + chips */}
      <div className="flex items-center gap-2.5 mb-2">
        <h2 className="text-2xl font-semibold text-ink tracking-tight">{apiKey.name}</h2>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-2 text-xs font-medium text-muted border border-border">
          <span className={`w-1.5 h-1.5 rounded-full ${envColor[apiKey.environment]}`} />{envLabel[apiKey.environment] || apiKey.environment}
        </span>
        {apiKey.is_active && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-dev/10 text-xs font-medium text-status-dev">
            <span className="w-1.5 h-1.5 rounded-full bg-status-dev" /> active
          </span>
        )}
        <div className="flex-1" />
        <button onClick={onEdit} className="px-3 py-1.5 border border-border text-[12px] font-medium text-ink rounded-btn hover:bg-surface-2 transition-colors flex items-center gap-1.5">
          <Pencil size={12} strokeWidth={1.6} /> Edit
        </button>
        {userId && apiKey.created_by === userId && (
          <button
            onClick={() => setConfirmRevoke(true)}
            className="px-3 py-1.5 border border-red-200 dark:border-red-900 text-[12px] font-medium text-red-500 rounded-btn hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex items-center gap-1.5"
          >
            <X size={12} strokeWidth={1.6} /> Revoke
          </button>
        )}

        {/* Revoke confirmation modal */}
        {confirmRevoke && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-ink/30 backdrop-blur-md" onClick={() => setConfirmRevoke(false)} />
            <div className="relative w-[400px] bg-surface border border-border rounded-xl shadow-popover p-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
                <X size={18} strokeWidth={1.6} className="text-red-500" />
              </div>
              <h3 className="text-[16px] font-semibold text-ink text-center mb-1">Revoke API Key</h3>
              <p className="text-sm text-muted text-center mb-5">
                Are you sure you want to revoke <span className="font-medium text-ink">"{apiKey.name}"</span>? This will permanently delete the key and remove all access. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmRevoke(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-ink border border-border rounded-lg hover:bg-surface-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmRevoke(false); onRevoke(); }}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                >
                  Revoke & Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fingerprint */}
      <div className="flex items-center gap-2.5 mb-5">
        <code className="text-xs font-mono text-muted bg-surface-2 border border-border px-3 py-1.5 rounded-lg">{apiKey.fingerprint}</code>
        <CopyKeyButton keyId={apiKey.id} />
        <span className="text-[12px] text-muted">Created {new Date(apiKey.createdAt || apiKey.created_at || "").toLocaleDateString()}</span>
      </div>

      {loadingDetail ? (
        <div className="flex justify-center py-8"><div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-surface border border-border rounded-card px-4 py-3.5">
              <p className="text-[11px] text-muted font-medium">Calls this month</p>
              <p className="text-xl font-semibold text-ink tracking-tight mt-1">—</p>
              <p className="text-[11px] text-muted mt-0.5">tracking</p>
            </div>
            <div className="bg-surface border border-border rounded-card px-4 py-3.5">
              <p className="text-[11px] text-muted font-medium">Shared with</p>
              <p className="text-xl font-semibold text-ink tracking-tight mt-1">
                {(detail?.sharedUsers?.length || 0)}{(detail?.sharedGroups?.length || 0) > 0 && ` + ${detail?.sharedGroups?.length} group`}
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                {(detail?.sharedUsers?.length || 0) + (detail?.sharedGroups?.length || 0) === 0 ? "only you" : "with access"}
              </p>
            </div>
            <div className="bg-surface border border-border rounded-card px-4 py-3.5">
              <p className="text-[11px] text-muted font-medium">Next rotation</p>
              <p className="text-xl font-semibold text-ink tracking-tight mt-1">{apiKey.auto_rotate ? "63 days" : "—"}</p>
              <p className="text-[11px] text-muted mt-0.5">{apiKey.auto_rotate ? "auto" : "disabled"}</p>
            </div>
          </div>

          {/* Access — real data */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-ink">Access</h2>
            <button className="px-2.5 py-1 bg-ink text-surface text-xs font-medium rounded-btn hover:opacity-90 transition-opacity flex items-center gap-1">
              <Plus size={12} strokeWidth={2} /> Share
            </button>
          </div>
          <div className="bg-surface border border-border rounded-card overflow-hidden mb-6">
            {/* Owner */}
            {detail?.creator && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                {detail.creator.avatar_url ? (
                  <img src={detail.creator.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[11px] font-semibold">
                    {detail.creator.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink">{detail.creator.username}</p>
                  <p className="text-[11.5px] text-muted">Key owner</p>
                </div>
                <span className="text-[11.5px] text-muted">Owner</span>
              </div>
            )}

            {/* Shared users */}
            {detail?.sharedUsers?.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[11px] font-semibold">
                    {(u.display_name || u.username).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink">{u.display_name || u.username}</p>
                  <p className="text-[11.5px] text-muted">{u.username}</p>
                </div>
                <span className="text-[11.5px] text-ink px-2.5 py-1 rounded-btn-sm border border-border">
                  Can {u.ApiKeyUserAccess?.permission || "view"} ▾
                </span>
                <button className="p-1 text-muted hover:text-ink transition-colors"><X size={13} strokeWidth={1.6} /></button>
              </div>
            ))}

            {/* Shared groups */}
            {detail?.sharedGroups?.map((g) => (
              <div key={g.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
                <div className="w-8 h-8 rounded-btn-sm bg-accent-soft flex items-center justify-center text-accent">
                  <Users size={15} strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink">{g.name}</p>
                  <p className="text-[11.5px] text-muted">Group members inherit access</p>
                </div>
                <span className="text-[11.5px] text-ink px-2.5 py-1 rounded-btn-sm border border-border">
                  Can {g.ApiKeyGroupAccess?.permission || "view"} ▾
                </span>
                <button className="p-1 text-muted hover:text-ink transition-colors"><X size={13} strokeWidth={1.6} /></button>
              </div>
            ))}

            {!detail?.sharedUsers?.length && !detail?.sharedGroups?.length && (
              <div className="px-4 py-4 text-center text-[12px] text-muted">
                Not shared with anyone yet.
              </div>
            )}
          </div>

          {/* Activity — real data */}
          <h2 className="text-[13px] font-semibold text-ink mb-3">Activity</h2>
          <div className="bg-surface border border-border rounded-card px-4 py-1">
            {activities.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-muted">No activity recorded yet.</p>
            ) : (
              activities.map((a, i) => (
                <div key={a.id} className={`flex items-center gap-3 py-3 ${i < activities.length - 1 ? "border-b border-border" : ""}`}>
                  {a.actor?.avatar_url ? (
                    <img src={a.actor.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[10px] font-semibold">
                      {(a.actor?.display_name || a.actor?.username || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <p className="flex-1 text-[12.5px] text-ink/80">
                    <span className="font-medium text-ink">{a.actor?.display_name || a.actor?.username}</span>
                    {" "}
                    {a.action === "created" && <>created key <span className="font-medium text-ink">{a.details?.name || apiKey.name}</span></>}
                    {a.action === "shared" && <>shared with <span className="font-medium text-ink">{a.details?.with_user || a.details?.with_group || "someone"}</span> ({a.details?.permission})</>}
                    {a.action === "revoked" && <>revoked the key</>}
                    {a.action === "updated" && <>updated the key</>}
                    {a.action === "viewed_value" && <>copied the key value</>}
                    {a.action === "copied" && <>copied the key value</>}
                    {!["created", "shared", "revoked", "updated", "viewed_value", "copied"].includes(a.action) && <>{a.action}</>}
                  </p>
                  <p className="text-[11.5px] text-muted shrink-0">{new Date(a.createdAt || a.created_at || "").toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              ))
            )}
          </div>
          {activities.length < activityTotal && (
            <button
              onClick={loadMoreActivity}
              disabled={loadingMore}
              className="w-full mt-2 py-2 text-[12px] font-medium text-muted hover:text-ink hover:bg-surface-2 rounded-btn transition-colors"
            >
              {loadingMore ? "Loading..." : `Load more (${activities.length} of ${activityTotal})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ── Key Detail View (kept for reference) ── */

// @ts-ignore — kept for potential standalone use
function KeyDetailView({ apiKey, onBack, onEdit }: { apiKey: ApiKey; onBack: () => void; onEdit: () => void }) {
  const accessList = [
    { name: "Maya Kapoor", sub: "maya@acme.com", role: "Owner", initials: "MK", isGroup: false },
    { name: "Jordan Tan", sub: "jordan@acme.com", role: "Can manage", initials: "JT", isGroup: false },
    { name: "Backend", sub: "6 members inherit", role: "Can view", initials: "", isGroup: true },
  ];
  const activity = [
    { initials: "MK", text: "Maya shared access with Jordan Tan", time: "2 hours ago", system: false },
    { initials: "", text: "Auto-rotated · new value issued", time: "3 days ago", system: true },
    { initials: "JT", text: "Jordan used key from staging.acme.com", time: "Mar 16", system: false },
    { initials: "MK", text: "Maya created key", time: "Mar 14", system: false },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 transition-colors">
          <ArrowLeft size={15} strokeWidth={1.6} />
        </button>
        <h1 className="text-xl font-semibold text-ink tracking-tight">{apiKey.name}</h1>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-2 text-xs font-medium text-muted border border-border">
          <span className={`w-1.5 h-1.5 rounded-full ${envColor[apiKey.environment]}`} />
          {envLabel[apiKey.environment] || apiKey.environment}
        </span>
        {apiKey.is_active && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-dev/10 text-xs font-medium text-status-dev">
            <span className="w-1.5 h-1.5 rounded-full bg-status-dev" /> active
          </span>
        )}
        <div className="flex-1" />
        <button onClick={onEdit} className="px-3 py-1.5 border border-border text-sm font-medium text-ink rounded-btn hover:bg-surface-2 transition-colors flex items-center gap-1.5">
          <Pencil size={13} strokeWidth={1.6} /> Edit
        </button>
      </div>

      <div className="flex items-center gap-2.5 mb-5">
        <code className="text-xs font-mono text-muted bg-surface border border-border px-3 py-1.5 rounded-lg">{apiKey.fingerprint}</code>
        <CopyKeyButton keyId={apiKey.id} />
        <span className="text-[12px] text-muted">Created {new Date(apiKey.createdAt || apiKey.created_at || "").toLocaleDateString()}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-card px-4 py-3.5">
          <p className="text-[11px] text-muted font-medium">Calls this month</p>
          <p className="text-xl font-semibold text-ink tracking-tight mt-1">1,294</p>
          <p className="text-[11px] text-status-dev mt-0.5">↑ 18%</p>
        </div>
        <div className="bg-surface border border-border rounded-card px-4 py-3.5">
          <p className="text-[11px] text-muted font-medium">Shared with</p>
          <p className="text-xl font-semibold text-ink tracking-tight mt-1">2 + 1 group</p>
          <p className="text-[11px] text-muted mt-0.5">8 people total</p>
        </div>
        <div className="bg-surface border border-border rounded-card px-4 py-3.5">
          <p className="text-[11px] text-muted font-medium">Next rotation</p>
          <p className="text-xl font-semibold text-ink tracking-tight mt-1">{apiKey.auto_rotate ? "63 days" : "—"}</p>
          <p className="text-[11px] text-muted mt-0.5">{apiKey.auto_rotate ? "auto" : "disabled"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-ink">Access</h2>
        <button className="px-2.5 py-1 bg-ink text-surface text-xs font-medium rounded-btn hover:opacity-90 transition-opacity flex items-center gap-1">
          <Plus size={12} strokeWidth={2} /> Share
        </button>
      </div>
      <div className="bg-surface border border-border rounded-card overflow-hidden mb-6">
        {accessList.map((p, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < accessList.length - 1 ? "border-b border-border" : ""}`}>
            {p.isGroup ? (
              <div className="w-8 h-8 rounded-btn-sm bg-accent-soft flex items-center justify-center text-accent"><Users size={15} strokeWidth={1.6} /></div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[11px] font-semibold">{p.initials}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-ink">{p.name}</p>
              <p className="text-[11.5px] text-muted">{p.sub}</p>
            </div>
            <span className={`text-[11.5px] px-2.5 py-1 rounded-btn-sm ${p.role === "Owner" ? "text-muted" : "text-ink border border-border"}`}>
              {p.role}{p.role !== "Owner" && " ▾"}
            </span>
            {p.role !== "Owner" && <button className="p-1 text-muted hover:text-ink transition-colors"><X size={13} strokeWidth={1.6} /></button>}
          </div>
        ))}
      </div>

      <h2 className="text-[13px] font-semibold text-ink mb-3">Activity</h2>
      <div className="bg-surface border border-border rounded-card px-4 py-1">
        {activity.map((a, i) => (
          <div key={i} className={`flex items-center gap-3 py-3 ${i < activity.length - 1 ? "border-b border-border" : ""}`}>
            {a.system ? (
              <div className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-muted"><RotateCcw size={13} strokeWidth={1.6} /></div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[10px] font-semibold">{a.initials}</div>
            )}
            <p className="flex-1 text-[12.5px] text-ink/80">{a.text}</p>
            <p className="text-[11.5px] text-muted">{a.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
