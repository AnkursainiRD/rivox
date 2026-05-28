import { useState, useEffect, useCallback } from "react";
import { Shield, Search } from "lucide-react";
import { PageHead } from "../components/PageHead";
import { api } from "../lib/api";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface OrgMember {
  role: "super_admin" | "admin" | "employee";
  user: {
    id: string;
    username: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface Group {
  id: string;
  name: string;
  member_count?: number;
}

interface Permission {
  capability: string;
  level: string;
}

type Level = "none" | "view" | "use" | "admin";
type PermMap = Record<string, Record<string, Level>>; // groupId → capability → level

/* ── Constants ───────────────────────────────────────────────────────────── */

const CAPABILITIES: { key: string; label: string; icon: React.ReactNode }[] = [
  {
    key: "view_keys",
    label: "View keys",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    key: "use_keys",
    label: "Use keys",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
  },
  {
    key: "manage_keys",
    label: "Manage keys",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    key: "sticky_board",
    label: "Sticky board",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    key: "manage_team",
    label: "Manage team",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "manage_issues",
    label: "Manage issues",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    key: "billing",
    label: "Billing",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
];

const LEVEL_CYCLE: Level[] = ["none", "view", "use", "admin"];

const GROUP_COLORS = [
  "#374151", "#6366f1", "#ef4444", "#3b82f6",
  "#f97316", "#8b5cf6", "#14b8a6", "#10b981", "#ec4899",
];

/* ── Permission Cell ─────────────────────────────────────────────────────── */

function PermCell({
  level,
  saving,
  onClick,
}: {
  level: Level;
  saving: boolean;
  onClick: () => void;
}) {
  if (level === "admin") {
    return (
      <button
        onClick={onClick}
        disabled={saving}
        title="Admin — click to change"
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80 active:scale-95 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
      >
        {saving ? (
          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white" stroke="none">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        )}
      </button>
    );
  }

  if (level === "use") {
    return (
      <button
        onClick={onClick}
        disabled={saving}
        title="Use — click to change"
        className="w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all hover:bg-accent-soft active:scale-95 disabled:opacity-50"
        style={{ borderColor: "#6366f1" }}
      >
        {saving ? (
          <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
    );
  }

  if (level === "view") {
    return (
      <button
        onClick={onClick}
        disabled={saving}
        title="View — click to change"
        className="w-9 h-9 rounded-xl flex items-center justify-center border-2 border-border transition-all hover:border-accent/30 hover:bg-surface-2 active:scale-95 disabled:opacity-50"
      >
        {saving ? (
          <span className="w-3.5 h-3.5 border-2 border-muted/30 border-t-muted rounded-full animate-spin" />
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    );
  }

  // none
  return (
    <button
      onClick={onClick}
      disabled={saving}
      title="No access — click to change"
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-surface-2 active:scale-95 disabled:opacity-50 group"
    >
      {saving ? (
        <span className="w-3.5 h-3.5 border-2 border-muted/30 border-t-muted rounded-full animate-spin" />
      ) : (
        <span className="w-2 h-2 rounded-full bg-border group-hover:bg-muted/40 transition-colors" />
      )}
    </button>
  );
}

/* ── Org Roles Tab ───────────────────────────────────────────────────────── */

const ORG_ROLES: { key: "employee" | "admin" | "super_admin"; label: string; icon: React.ReactNode }[] = [
  {
    key: "employee",
    label: "Employee",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: "admin",
    label: "Admin",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    key: "super_admin",
    label: "Super Admin",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

function RoleCell({
  active,
  roleKey,
  saving,
  onClick,
}: {
  active: boolean;
  roleKey: "employee" | "admin" | "super_admin";
  saving: boolean;
  onClick: () => void;
}) {
  if (active && roleKey === "super_admin") {
    return (
      <button
        onClick={onClick}
        disabled={saving}
        title="Super Admin — click to change"
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80 active:scale-95 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
      >
        {saving ? (
          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        )}
      </button>
    );
  }

  if (active) {
    return (
      <button
        onClick={onClick}
        disabled={saving}
        title={`${roleKey} — click to change`}
        className="w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all hover:bg-accent-soft active:scale-95 disabled:opacity-50"
        style={{ borderColor: "#6366f1" }}
      >
        {saving ? (
          <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={saving}
      title={`Set to ${roleKey}`}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-surface-2 active:scale-95 disabled:opacity-50 group"
    >
      {saving ? (
        <span className="w-3.5 h-3.5 border-2 border-muted/30 border-t-muted rounded-full animate-spin" />
      ) : (
        <span className="w-2 h-2 rounded-full bg-border group-hover:bg-muted/40 transition-colors" />
      )}
    </button>
  );
}

function OrgRolesTab({ orgId }: { orgId: string }) {
  const [savedRoles, setSavedRoles] = useState<Record<string, OrgMember["role"]>>({});
  const [localRoles, setLocalRoles] = useState<Record<string, OrgMember["role"]>>({});
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<OrgMember[]>(`/orgs/${orgId}/members`)
      .then((data) => {
        setMembers(data);
        const map = Object.fromEntries(data.map((m) => [m.user.id, m.role]));
        setSavedRoles(map);
        setLocalRoles({ ...map });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  const setRole = (userId: string, role: OrgMember["role"]) =>
    setLocalRoles((prev) => ({ ...prev, [userId]: role }));

  const pendingChanges = members.filter((m) => localRoles[m.user.id] !== savedRoles[m.user.id]);
  const hasPending = pendingChanges.length > 0;

  const discard = () => setLocalRoles({ ...savedRoles });

  const grantAll = async () => {
    setGranting(true);
    setError(null);
    try {
      await Promise.all(
        pendingChanges.map((m) =>
          api.patch(`/orgs/${orgId}/members/${m.user.id}`, { role: localRoles[m.user.id] })
        )
      );
      setSavedRoles({ ...localRoles });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
    setGranting(false);
  };

  const filtered = members.filter(
    (m) =>
      !search ||
      m.user.username.toLowerCase().includes(search.toLowerCase()) ||
      (m.user.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-btn bg-red-500/10 border border-red-500/20 text-[12px] text-red-500 font-medium">
          {error}
        </div>
      )}
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md border border-border flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-border" />
            </span>
            <span className="text-[11px] text-muted">Not assigned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md border-2 flex items-center justify-center" style={{ borderColor: "#6366f1" }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="text-[11px] text-muted">Active role</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md border-2 border-dashed border-accent/60 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
            </span>
            <span className="text-[11px] text-muted">Pending</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-[11px] text-muted">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
          {hasPending && (
            <>
              <button onClick={discard} className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-btn hover:bg-surface-2 transition-colors">
                Discard
              </button>
              <button
                onClick={grantAll}
                disabled={granting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white rounded-btn transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
              >
                {granting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                )}
                Grant Permissions
                <span className="ml-0.5 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingChanges.length}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={14} strokeWidth={1.6} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-btn bg-surface border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-card shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-2/50">
                <th className="text-left px-5 py-3 text-[10.5px] font-semibold text-muted uppercase tracking-widest">Member</th>
                {ORG_ROLES.map((r) => (
                  <th key={r.key} className="px-3 py-3 text-center min-w-[110px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-muted">{r.icon}</span>
                      <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">{r.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const currentRole = localRoles[m.user.id];
                const isPending = currentRole !== savedRoles[m.user.id];
                return (
                  <tr key={m.user.id} className={`border-b border-border last:border-b-0 transition-colors ${isPending ? "bg-accent/[0.03] hover:bg-accent/[0.06]" : "hover:bg-surface-2/30"}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {m.user.avatar_url ? (
                          <img src={m.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[11px] font-semibold">
                            {(m.user.display_name || m.user.username).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-[13px] font-medium text-ink">{m.user.display_name || m.user.username}</p>
                          <p className="text-[11px] text-muted">@{m.user.username}</p>
                        </div>
                        {isPending && (
                          <span className="ml-1 text-[10px] font-semibold text-accent bg-accent-soft px-1.5 py-0.5 rounded-full">
                            pending
                          </span>
                        )}
                      </div>
                    </td>
                    {ORG_ROLES.map((r) => (
                      <td key={r.key} className={`px-3 py-3 text-center ${isPending && currentRole === r.key ? "bg-accent/[0.04]" : ""}`}>
                        <div className="flex justify-center">
                          <RoleCell
                            active={currentRole === r.key}
                            roleKey={r.key}
                            saving={false}
                            onClick={() => { if (currentRole !== r.key) setRole(m.user.id, r.key); }}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted">No members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


/* ── Group Permissions Tab ───────────────────────────────────────────────── */

function GroupPermissionsTab({ orgId }: { orgId: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [savedPermMap, setSavedPermMap] = useState<PermMap>({});
  const [localPermMap, setLocalPermMap] = useState<PermMap>({});
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgMemberCount, setOrgMemberCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [groupList, orgMembers] = await Promise.all([
        api.get<Group[]>(`/orgs/${orgId}/groups`),
        api.get<OrgMember[]>(`/orgs/${orgId}/members`),
      ]);
      setGroups(groupList);
      setOrgMemberCount(orgMembers.length);

      const results = await Promise.allSettled(
        groupList.map(async (g) => {
          const [perms, members] = await Promise.all([
            api.get<Permission[]>(`/groups/${g.id}/permissions`),
            api.get<{ user: { id: string } }[]>(`/groups/${g.id}/members`),
          ]);
          return { groupId: g.id, perms, memberCount: members.length };
        })
      );

      const map: PermMap = {};
      const counts: Record<string, number> = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          const { groupId, perms, memberCount } = r.value;
          counts[groupId] = memberCount;
          map[groupId] = {};
          perms.forEach((p) => { map[groupId][p.capability] = p.level as Level; });
        }
      });
      setSavedPermMap(map);
      setLocalPermMap(JSON.parse(JSON.stringify(map)));
      setMemberCounts(counts);
    } catch { /* ignore */ }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const getLevel = (groupId: string, capability: string): Level =>
    localPermMap[groupId]?.[capability] ?? "none";

  const getSavedLevel = (groupId: string, capability: string): Level =>
    savedPermMap[groupId]?.[capability] ?? "none";

  const cycleLevel = (groupId: string, capability: string) => {
    const current = getLevel(groupId, capability);
    const next = LEVEL_CYCLE[(LEVEL_CYCLE.indexOf(current) + 1) % LEVEL_CYCLE.length];
    setLocalPermMap((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], [capability]: next },
    }));
  };

  // Collect all cells that differ from saved
  const pendingChanges: { groupId: string; capability: string; level: Level }[] = [];
  for (const group of groups) {
    for (const cap of CAPABILITIES) {
      const local = getLevel(group.id, cap.key);
      const saved = getSavedLevel(group.id, cap.key);
      if (local !== saved) pendingChanges.push({ groupId: group.id, capability: cap.key, level: local });
    }
  }
  const hasPending = pendingChanges.length > 0;

  const discard = () => setLocalPermMap(JSON.parse(JSON.stringify(savedPermMap)));

  const grantAll = async () => {
    setGranting(true);
    setError(null);
    try {
      await Promise.all(
        pendingChanges.map(({ groupId, capability, level }) =>
          api.put(`/groups/${groupId}/permissions`, { capability, level })
        )
      );
      setSavedPermMap(JSON.parse(JSON.stringify(localPermMap)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
    setGranting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center mb-3">
          <Shield size={22} strokeWidth={1.4} className="text-muted/50" />
        </div>
        <p className="text-[14px] font-medium text-ink">No groups yet</p>
        <p className="text-[13px] text-muted mt-1">Create a group on the Team page first.</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-btn bg-red-500/10 border border-red-500/20 text-[12px] text-red-500 font-medium">
          {error}
        </div>
      )}
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-4">
          {[
            { label: "No access", node: <span className="w-1.5 h-1.5 rounded-full bg-border" />, cls: "border border-border" },
            { label: "View", node: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>, cls: "border-2 border-border" },
            { label: "Use", node: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>, cls: "border-2", style: { borderColor: "#6366f1" } },
            { label: "Admin", node: <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>, cls: "", style: { background: "linear-gradient(135deg,#6366f1,#818cf8)" } },
            { label: "Pending", node: <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />, cls: "border-2 border-dashed border-accent/60" },
          ].map(({ label, node, cls, style }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded-md flex items-center justify-center ${cls}`} style={style}>{node}</span>
              <span className="text-[11px] text-muted">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <p className="text-[11px] text-muted">
            {groups.length} group{groups.length !== 1 ? "s" : ""} · {orgMemberCount} people
          </p>
          {hasPending && (
            <>
              <button onClick={discard} className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-btn hover:bg-surface-2 transition-colors">
                Discard
              </button>
              <button
                onClick={grantAll}
                disabled={granting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white rounded-btn transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
              >
                {granting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                )}
                Grant Permissions
                <span className="ml-0.5 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingChanges.length}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Matrix table */}
      <div className="bg-surface border border-border rounded-card shadow-card overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-surface-2/50">
              <th className="text-left px-5 py-3 text-[10.5px] font-semibold text-muted uppercase tracking-widest w-[200px]">Group</th>
              {CAPABILITIES.map((cap) => (
                <th key={cap.key} className="px-3 py-3 text-center min-w-[90px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-muted">{cap.icon}</span>
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wider leading-tight">{cap.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group, i) => {
              const color = GROUP_COLORS[i % GROUP_COLORS.length];
              const count = memberCounts[group.id] ?? group.member_count ?? 0;
              return (
                <tr key={group.id} className="border-b border-border last:border-b-0 hover:bg-surface-2/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[13px] font-bold shrink-0" style={{ background: color }}>
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-ink leading-tight">{group.name}</p>
                        <p className="text-[11px] text-muted">{count} member{count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </td>
                  {CAPABILITIES.map((cap) => {
                    const level = getLevel(group.id, cap.key);
                    const pending = level !== getSavedLevel(group.id, cap.key);
                    return (
                      <td key={cap.key} className={`px-3 py-3 text-center ${pending ? "bg-accent/[0.04]" : ""}`}>
                        <div className="flex justify-center">
                          <div className={pending ? "ring-2 ring-accent/40 ring-offset-1 rounded-xl" : ""}>
                            <PermCell
                              level={level}
                              saving={false}
                              onClick={() => cycleLevel(group.id, cap.key)}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Module / Action definitions (mirrors server/src/permissions.js) ──────── */

const PERMISSION_MODULES: {
  id: number;
  name: string;
  actions: { id: number; label: string }[];
}[] = [
  { id: 1, name: "View Keys",     actions: [{ id: 1, label: "List" }, { id: 2, label: "Value" }] },
  { id: 2, name: "Manage Keys",   actions: [{ id: 3, label: "Create" }, { id: 4, label: "Edit" }, { id: 5, label: "Delete" }, { id: 6, label: "Revoke" }] },
  { id: 3, name: "Use Keys",      actions: [{ id: 7, label: "Use" }] },
  { id: 4, name: "Sticky Board",  actions: [{ id: 8, label: "View" }, { id: 9, label: "Create" }, { id: 10, label: "Edit" }, { id: 11, label: "Delete" }] },
  { id: 5, name: "Team",          actions: [{ id: 12, label: "View" }, { id: 13, label: "Add" }, { id: 14, label: "Edit role" }, { id: 15, label: "Remove" }] },
  { id: 6, name: "Issues",        actions: [{ id: 16, label: "View" }, { id: 17, label: "Create" }, { id: 18, label: "Edit" }, { id: 19, label: "Delete" }] },
  { id: 7, name: "Billing",       actions: [{ id: 20, label: "View" }, { id: 21, label: "Manage" }] },
];

// Total action count for colSpan
const TOTAL_ACTIONS = PERMISSION_MODULES.reduce((s, m) => s + m.actions.length, 0);

/* ── Toggle cell (granted / not granted) ─────────────────────────────────── */

/* ── User Permissions Tab ────────────────────────────────────────────────── */

interface UserPerm {
  user_id: string;
  module_id: number;
  action_id: number;
}

// grantSet key: "userId:moduleId:actionId"
type GrantSet = Set<string>;

function grantKey(userId: string, moduleId: number, actionId: number) {
  return `${userId}:${moduleId}:${actionId}`;
}

function UserPermissionsTab({ orgId }: { orgId: string }) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  // savedGrants = what's actually in the DB
  const [savedGrants, setSavedGrants] = useState<GrantSet>(new Set());
  // localGrants = what the user sees (staged, not yet saved)
  const [localGrants, setLocalGrants] = useState<GrantSet>(new Set());
  const [granting, setGranting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mems, perms] = await Promise.all([
        api.get<OrgMember[]>(`/orgs/${orgId}/members`),
        api.get<UserPerm[]>(`/orgs/${orgId}/user-permissions`),
      ]);
      setMembers(mems);
      const set: GrantSet = new Set(
        perms.map((p) => grantKey(p.user_id, p.module_id, p.action_id))
      );
      setSavedGrants(set);
      setLocalGrants(new Set(set));
    } catch { /* ignore */ }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  // Toggle a cell locally — no API call yet
  const toggle = (userId: string, moduleId: number, actionId: number) => {
    const key = grantKey(userId, moduleId, actionId);
    setLocalGrants((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Compute pending changes: keys that differ between saved and local
  const pendingChanges = (() => {
    const changes: { userId: string; moduleId: number; actionId: number; granted: boolean }[] = [];
    // Added
    for (const key of localGrants) {
      if (!savedGrants.has(key)) {
        const [userId, moduleId, actionId] = key.split(":");
        changes.push({ userId, moduleId: Number(moduleId), actionId: Number(actionId), granted: true });
      }
    }
    // Removed
    for (const key of savedGrants) {
      if (!localGrants.has(key)) {
        const [userId, moduleId, actionId] = key.split(":");
        changes.push({ userId, moduleId: Number(moduleId), actionId: Number(actionId), granted: false });
      }
    }
    return changes;
  })();

  const hasPending = pendingChanges.length > 0;

  const discard = () => setLocalGrants(new Set(savedGrants));

  const grantAll = async () => {
    setGranting(true);
    try {
      await Promise.all(
        pendingChanges.map(({ userId, moduleId, actionId, granted }) =>
          api.put(`/orgs/${orgId}/members/${userId}/permissions`, {
            module_id: moduleId,
            action_id: actionId,
            granted,
          })
        )
      );
      setSavedGrants(new Set(localGrants));
    } catch { /* ignore */ }
    setGranting(false);
  };

  const filtered = members.filter(
    (m) =>
      !search ||
      m.user.username.toLowerCase().includes(search.toLowerCase()) ||
      (m.user.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  // Is a specific cell pending (changed from saved)?
  const isPending = (key: string) =>
    localGrants.has(key) !== savedGrants.has(key);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Top bar: legend + pending banner */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md border border-border flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-border" />
            </span>
            <span className="text-[11px] text-muted">No access</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="text-[11px] text-muted">Granted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md border-2 border-dashed border-accent/60 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
            </span>
            <span className="text-[11px] text-muted">Pending</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-[11px] text-muted">
            {members.length} member{members.length !== 1 ? "s" : ""} · {TOTAL_ACTIONS} actions
          </p>
          {hasPending && (
            <>
              <button
                onClick={discard}
                className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-btn hover:bg-surface-2 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={grantAll}
                disabled={granting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white rounded-btn transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
              >
                {granting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                )}
                Grant Permissions
                <span className="ml-0.5 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingChanges.length}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={14} strokeWidth={1.6} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-btn bg-surface border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
        />
      </div>

      {/* Matrix */}
      <div className="bg-surface border border-border rounded-card shadow-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-2/70">
              <th className="text-left px-5 py-2.5 text-[10.5px] font-semibold text-muted uppercase tracking-widest w-[190px] border-r border-border" rowSpan={2}>
                Member
              </th>
              {PERMISSION_MODULES.map((mod) => (
                <th
                  key={mod.id}
                  colSpan={mod.actions.length}
                  className="px-2 py-2 text-center text-[10px] font-bold text-ink uppercase tracking-wider border-r border-border last:border-r-0"
                >
                  {mod.name}
                </th>
              ))}
            </tr>
            <tr className="border-b border-border bg-surface-2/40">
              {PERMISSION_MODULES.map((mod) =>
                mod.actions.map((action, ai) => (
                  <th
                    key={action.id}
                    className={`px-2 py-2 text-center text-[9.5px] font-semibold text-muted uppercase tracking-wider min-w-[58px] ${ai === mod.actions.length - 1 ? "border-r border-border" : ""}`}
                  >
                    {action.label}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.user.id} className="border-b border-border last:border-b-0 hover:bg-surface-2/30 transition-colors">
                <td className="px-5 py-2.5 border-r border-border">
                  <div className="flex items-center gap-2.5">
                    {m.user.avatar_url ? (
                      <img src={m.user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                        {(m.user.display_name || m.user.username).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-ink truncate">{m.user.display_name || m.user.username}</p>
                      <p className="text-[10px] text-muted truncate">@{m.user.username}</p>
                    </div>
                  </div>
                </td>
                {PERMISSION_MODULES.map((mod) =>
                  mod.actions.map((action, ai) => {
                    const key = grantKey(m.user.id, mod.id, action.id);
                    const granted = localGrants.has(key);
                    const pending = isPending(key);
                    return (
                      <td
                        key={action.id}
                        className={`py-2 text-center ${ai === mod.actions.length - 1 ? "border-r border-border pr-2" : "px-1"} ${pending ? "bg-accent/[0.04]" : ""}`}
                      >
                        <div className="flex justify-center">
                          <button
                            onClick={() => toggle(m.user.id, mod.id, action.id)}
                            title={granted ? "Granted — click to remove" : "No access — click to grant"}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 group ${
                              pending ? "ring-2 ring-accent/40 ring-offset-1" : ""
                            }`}
                          >
                            {granted ? (
                              <span
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </span>
                            ) : (
                              <span className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-2">
                                <span className="w-2 h-2 rounded-full bg-border group-hover:bg-muted/40 transition-colors" />
                              </span>
                            )}
                          </button>
                        </div>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={TOTAL_ACTIONS + 1} className="px-4 py-12 text-center text-sm text-muted">
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */

export function RbacPage({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<"users" | "groups" | "roles">("users");

  return (
    <div>
      <PageHead
        title="Permissions"
        subtitle="Manage org roles and capability access per user or group"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-surface-2 border border-border rounded-btn w-fit">
        {(
          [
            { key: "users", label: "User Permissions" },
            { key: "groups", label: "Group Permissions" },
            { key: "roles", label: "Org Roles" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
              tab === key
                ? "bg-surface text-ink shadow-sm border border-border"
                : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <UserPermissionsTab orgId={orgId} />
      ) : tab === "groups" ? (
        <GroupPermissionsTab orgId={orgId} />
      ) : (
        <OrgRolesTab orgId={orgId} />
      )}
    </div>
  );
}
