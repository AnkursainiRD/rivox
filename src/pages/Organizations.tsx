import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  CheckmarkCircle02Icon,
  ArrowUpRight01Icon,
  UserGroupIcon,
  Key01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { PageHead } from "../components/PageHead";
import { api } from "../lib/api";
import type { Organization } from "../hooks/useAuth";

interface OrganizationsPageProps {
  orgs: Organization[];
  activeOrg: Organization | null;
  onSwitchOrg: (org: Organization) => void;
}

// Muted, professional palette — subtle enough for a utilitarian UI
const orgColors = [
  { bg: "#3d3d6b", text: "#c4c4e8" },  // deep indigo
  { bg: "#2e4a5a", text: "#b0ced9" },  // slate blue
  { bg: "#3a4a3a", text: "#b5c9b5" },  // forest
  { bg: "#4a3a3a", text: "#ccb5b5" },  // muted wine
  { bg: "#3d3d3d", text: "#c0c0c0" },  // neutral
  { bg: "#4a4435", text: "#c9c3af" },  // warm stone
];

function getOrgColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return orgColors[Math.abs(hash) % orgColors.length];
}

interface UserItem {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface MemberToAdd {
  user: UserItem;
  role: "admin" | "employee";
}

export function OrganizationsPage({
  orgs,
  activeOrg,
  onSwitchOrg,
}: OrganizationsPageProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingOrg, setEditingOrg] = useState<typeof orgs[0] | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [members, setMembers] = useState<MemberToAdd[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  // Fetch users when create modal opens
  const openCreate = () => {
    setShowCreate(true);
    api.get<UserItem[]>("/users").then(setAllUsers).catch(() => {});
  };

  const addMember = (user: UserItem) => {
    if (members.some((m) => m.user.id === user.id)) return;
    setMembers((prev) => [...prev, { user, role: "employee" }]);
    setMemberSearch("");
  };

  const removeMember = (userId: string) => {
    setMembers((prev) => prev.filter((m) => m.user.id !== userId));
  };

  const setMemberRole = (userId: string, role: "admin" | "employee") => {
    setMembers((prev) => prev.map((m) => m.user.id === userId ? { ...m, role } : m));
  };

  const filteredUsers = allUsers.filter((u) => {
    if (members.some((m) => m.user.id === u.id)) return false;
    if (!memberSearch) return true;
    const q = memberSearch.toLowerCase();
    return (u.display_name || "").toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const org = await api.post<{ id: string }>("/orgs", { name: name.trim(), slug: slug.trim() });
      // Add members with roles
      for (const m of members) {
        try {
          await api.post(`/orgs/${org.id}/members`, { user_id: m.user.id, role: m.role });
        } catch { /* ignore individual failures */ }
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowCreate(false);
    setName("");
    setSlug("");
    setError(null);
    setMembers([]);
    setMemberSearch("");
  };

  return (
    <div>
      <PageHead
        title="Organizations"
        subtitle={`${orgs.length} workspace${orgs.length !== 1 ? "s" : ""}`}
      />

      {/* Edit drawer */}
      {editingOrg && <EditOrgDrawer org={editingOrg} onClose={() => setEditingOrg(null)} />}

      {/* Create drawer */}
      {showCreate && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 backdrop-blur-sm" onClick={resetForm} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] bg-surface border-l border-border shadow-xl flex flex-col animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="text-[15px] font-semibold text-ink">New workspace</h3>
              <button type="button" onClick={resetForm} className="p-1 rounded-btn-sm text-muted hover:text-ink hover:bg-surface-2 transition-colors">
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {error && (
                <div className="px-3 py-2 rounded-btn bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label className="text-[13px] font-medium text-ink mb-1.5 block">Workspace name</label>
                <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. YourGPT" autoFocus
                  className="w-full px-3.5 py-2.5 text-sm rounded-btn bg-surface-2 border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
              </div>

              <div>
                <label className="text-[13px] font-medium text-ink mb-1.5 block">URL slug</label>
                <div className="flex items-center bg-surface-2 border border-border rounded-btn overflow-hidden focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all">
                  <span className="pl-3.5 pr-1 text-sm text-muted/50 select-none">rivox.app/</span>
                  <input type="text" value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="your-team"
                    className="w-full pr-3.5 py-2.5 text-sm bg-transparent text-ink placeholder:text-muted/40 outline-none" />
                </div>
              </div>

              {/* Members */}
              <div>
                <label className="text-[13px] font-medium text-ink mb-1.5 block">
                  Add members <span className="text-muted font-normal">(optional)</span>
                </label>
                <div className="relative mb-2">
                  <input type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by name, username, or email..."
                    className="w-full px-3.5 py-2 text-sm rounded-btn bg-surface-2 border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
                  {filteredUsers.length > 0 && (
                    <div className="border border-border rounded-btn py-1 max-h-[200px] overflow-y-auto mt-2">
                      {filteredUsers.slice(0, 10).map((u) => (
                        <button key={u.id} type="button" onClick={() => addMember(u)}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-surface-2 transition-colors">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[8px] font-bold">
                              {(u.display_name || u.username).slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="text-[12.5px] font-medium text-ink truncate">{u.display_name || u.username}</div>
                            <div className="text-[10.5px] text-muted truncate">@{u.username} · {u.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {members.length > 0 && (
                  <div className="space-y-1.5">
                    {members.map((m) => (
                      <div key={m.user.id} className="flex items-center gap-2.5 px-3 py-2 bg-surface-2 rounded-btn">
                        {m.user.avatar_url ? (
                          <img src={m.user.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[8px] font-bold">
                            {(m.user.display_name || m.user.username).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[12.5px] font-medium text-ink flex-1 truncate">{m.user.display_name || m.user.username}</span>
                        <select value={m.role} onChange={(e) => setMemberRole(m.user.id, e.target.value as "admin" | "employee")}
                          className="text-[11px] font-medium px-2 py-1 rounded bg-surface border border-border text-ink outline-none focus:border-accent appearance-none cursor-pointer"
                          style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'><path fill='%2371717a' d='M0 0h8L4 5z'/></svg>")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center", paddingRight: "18px" }}>
                          <option value="employee">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button type="button" onClick={() => removeMember(m.user.id)}
                          className="p-0.5 text-muted hover:text-ink transition-colors">
                          <HugeiconsIcon icon={Cancel01Icon} size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* Footer */}
            <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
              <button type="button" onClick={resetForm}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-muted border border-border rounded-btn hover:bg-surface-2 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate}
                disabled={loading || !name.trim() || !slug.trim()}
                className="flex-1 px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-btn hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Create workspace"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Org cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orgs.map((org) => {
          const isActive = activeOrg?.id === org.id;
          const color = getOrgColor(org.name);

          return (
            <div
              key={org.id}
              className={`group relative rounded-card border overflow-hidden transition-all duration-200 ${
                isActive
                  ? "border-accent/40 ring-1 ring-accent/15 shadow-md"
                  : "border-border hover:shadow-lg"
              } bg-surface`}
            >
              {/* Header bar */}
              <div
                className="h-16 relative"
                style={{ backgroundColor: color.bg }}
              >
                {isActive && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-white text-[10px] font-semibold border border-white/10">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} />
                    Active
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className="px-5 -mt-5 relative">
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[15px] font-semibold shadow-sm ring-[3px] ring-surface"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {org.name[0].toUpperCase()}
                </div>
              </div>

              {/* Content */}
              <div className="px-5 pt-3 pb-5">
                <h3 className="text-[15px] font-semibold text-ink tracking-tight">
                  {org.name}
                </h3>
                <p className="text-xs text-muted font-mono mt-0.5 mb-4">
                  /{org.slug}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <HugeiconsIcon icon={UserGroupIcon} size={13} />
                    <span>{org.member_count ?? 0} members</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <HugeiconsIcon icon={Key01Icon} size={13} />
                    <span>{org.key_count ?? 0} keys</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {isActive ? (
                    <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-accent bg-accent-soft rounded-btn">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                      Current workspace
                    </div>
                  ) : (
                    <button
                      onClick={() => onSwitchOrg(org)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-ink bg-surface-2 border border-border rounded-btn hover:bg-accent hover:text-white hover:border-accent transition-all duration-200"
                    >
                      Switch workspace
                      <HugeiconsIcon icon={ArrowUpRight01Icon} size={13} />
                    </button>
                  )}
                  {(org.OrgMember?.role === "super_admin" || org.OrgMember?.role === "admin") && (
                    <button
                      onClick={() => setEditingOrg(org)}
                      className="px-2.5 py-2 text-xs text-muted border border-border rounded-btn hover:bg-surface-2 hover:text-ink transition-colors"
                      title="Edit workspace"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Create card */}
        <button
          onClick={openCreate}
          className="group flex flex-col items-center justify-center rounded-card border-2 border-dashed border-border min-h-[240px] transition-all duration-200 hover:border-accent/40 hover:bg-accent-soft/30"
        >
          <div className="w-12 h-12 rounded-xl bg-surface-2 group-hover:bg-accent-soft flex items-center justify-center mb-3 transition-colors duration-200">
            <HugeiconsIcon
              icon={Add01Icon}
              size={20}
              className="text-muted group-hover:text-accent transition-colors duration-200"
            />
          </div>
          <span className="text-sm font-medium text-muted group-hover:text-accent transition-colors duration-200">
            New workspace
          </span>
          <span className="text-[11px] text-muted/50 mt-1">
            Create an organization
          </span>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EDIT ORG DRAWER
   ══════════════════════════════════════════════════════════════════════════ */

function EditOrgDrawer({ org, onClose }: { org: { id: string; name: string; slug: string }; onClose: () => void }) {
  const [editName, setEditName] = useState(org.name);
  const [editSlug, setEditSlug] = useState(org.slug);
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; username: string; display_name: string | null; email: string; avatar_url: string | null }[]>([]);
  const [orgMemberIds, setOrgMemberIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [addingMember, setAddingMember] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ id: string; username: string; display_name: string | null; email: string; avatar_url: string | null }[]>("/users"),
      api.get<{ user: { id: string } }[]>(`/orgs/${org.id}/members`),
    ]).then(([users, members]) => {
      setAllUsers(users);
      setOrgMemberIds(new Set(members.map((m) => m.user.id)));
    }).catch(() => {});
  }, [org.id]);

  const onAddMember = async (userId: string) => {
    setAddingMember(userId);
    try {
      await api.post(`/orgs/${org.id}/members`, { user_id: userId, role: "employee" });
      setOrgMemberIds((prev) => new Set([...prev, userId]));
    } catch { /* ignore */ }
    finally { setAddingMember(null); }
  };

  const nonMembers = allUsers.filter((u) =>
    !orgMemberIds.has(u.id) &&
    (!memberSearch || (u.display_name || u.username).toLowerCase().includes(memberSearch.toLowerCase()) || u.email.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const members = allUsers.filter((u) => orgMemberIds.has(u.id));

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px] bg-surface border-l border-border shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h3 className="text-[15px] font-semibold text-ink">Edit workspace</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="text-[13px] font-medium text-ink mb-1.5 block">Workspace name</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-surface-2 border border-border text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
          </div>

          {/* Slug */}
          <div>
            <label className="text-[13px] font-medium text-ink mb-1.5 block">URL slug</label>
            <div className="flex items-center bg-surface-2 border border-border rounded-lg overflow-hidden focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all">
              <span className="pl-3.5 pr-1 text-sm text-muted/50 select-none">rivox.app/</span>
              <input type="text" value={editSlug}
                onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="w-full pr-3.5 py-2.5 text-sm bg-transparent text-ink outline-none" />
            </div>
          </div>

          {/* Current members */}
          <div>
            <label className="text-[13px] font-medium text-ink mb-1.5 block">Members · {members.length}</label>
            <div className="border border-border rounded-lg max-h-[150px] overflow-y-auto">
              {members.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 px-3 py-2 border-b border-border last:border-0 group/member">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[8px] font-bold">
                      {(u.display_name || u.username).slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[12px] font-medium text-ink flex-1 truncate">{u.display_name || u.username}</span>
                  <button
                    onClick={async () => {
                      try {
                        await api.delete(`/orgs/${org.id}/members/${u.id}`);
                        setOrgMemberIds((prev) => { const next = new Set(prev); next.delete(u.id); return next; });
                      } catch { /* ignore */ }
                    }}
                    className="text-[10px] text-red-500 hidden group-hover/member:inline shrink-0 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add members */}
          <div>
            <label className="text-[13px] font-medium text-ink mb-1.5 block">Add members</label>
            <input type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search users to add..."
              className="w-full px-3.5 py-2 text-sm rounded-lg bg-surface-2 border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all mb-2" />
            {nonMembers.length > 0 ? (
              <div className="border border-border rounded-lg max-h-[200px] overflow-y-auto">
                {nonMembers.slice(0, 10).map((u) => (
                  <div key={u.id} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[9px] font-bold">
                        {(u.display_name || u.username).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-[12px] font-medium text-ink truncate">{u.display_name || u.username}</p>
                      <p className="text-[10px] text-muted truncate">{u.email}</p>
                    </div>
                    <button onClick={() => onAddMember(u.id)} disabled={addingMember === u.id}
                      className="px-3 py-1 text-[11px] font-medium text-accent border border-accent/20 rounded-lg hover:bg-accent-soft transition-colors disabled:opacity-50 shrink-0">
                      {addingMember === u.id ? "Adding..." : "Add"}
                    </button>
                  </div>
                ))}
              </div>
            ) : memberSearch ? (
              <p className="text-[12px] text-muted text-center py-3">No users found</p>
            ) : (
              <p className="text-[12px] text-muted text-center py-3">All users are already members</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-muted border border-border rounded-lg hover:bg-surface-2 transition-colors">
            Cancel
          </button>
          <button disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await api.patch(`/orgs/${org.id}`, { name: editName, slug: editSlug });
                onClose();
                window.location.reload();
              } catch { /* ignore */ }
              finally { setSaving(false); }
            }}
            className="flex-1 px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Save changes"}
          </button>
        </div>
      </div>
    </>
  );
}
