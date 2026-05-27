import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Plus, KeyRound,
  Eye, Check, Zap, Lock, StickyNote,
} from "lucide-react";
import { api } from "../lib/api";

type View = "groups" | "matrix";

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  member_count: number;
  key_count: number;
  created_by: string;
}

interface MemberData {
  id: string;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  added_at: string;
}

interface OrgMemberData {
  id: string;
  role: string;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function TeamPage({ orgId: _orgId, userId: currentUserId }: { orgId?: string; userId?: string }) {
  const [] = useState<View>("groups");
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const fetchData = useCallback(async () => {
    if (!_orgId) return;
    try {
      setLoading(true);
      const [g, m] = await Promise.all([
        api.get<GroupData[]>(`/orgs/${_orgId}/groups`),
        api.get<OrgMemberData[]>(`/orgs/${_orgId}/members`),
      ]);
      setGroups(g);
      setOrgMembers(m);
    } catch (err) {
      console.error("Failed to fetch team data:", err);
    } finally {
      setLoading(false);
    }
  }, [_orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!_orgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted">No organization selected.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full -mx-6 -mt-6 -mb-6 overflow-hidden">
      <div className="px-6 pt-6 pb-5 bg-surface border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Team & Groups</h1>
          <p className="mt-0.5 text-sm text-muted">{orgMembers.length} people · {groups.length} groups</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 border border-border text-sm font-medium text-ink rounded-btn hover:bg-surface-2 transition-colors flex items-center gap-1.5">
            <Users size={13} strokeWidth={1.6} />
            Invite
          </button>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="px-3 py-1.5 bg-ink text-surface text-sm font-medium rounded-btn hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus size={14} strokeWidth={2} />
            New group
          </button>
        </div>
      </div>

      {/* Create group modal */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <GroupsView groups={groups} orgId={_orgId} orgMembers={orgMembers} onRefresh={fetchData} onMembersChange={setOrgMembers} showCreateGroup={showCreateGroup} setShowCreateGroup={setShowCreateGroup} currentUserId={currentUserId} />
      )}
    </div>
  );
}

/* ── Create Group Modal ── */

function CreateGroupPanel({ orgId, onClose, onCreated, orgMembers }: { orgId: string; onClose: () => void; onCreated: () => void; orgMembers: OrgMemberData[] }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#5b5bd6");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [allUsers, setAllUsers] = useState<OrgMemberData[]>([]);

  const colors = ["#5b5bd6", "#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#6366f1", "#ef4444", "#71717a"];

  // For admin/super_admin, fetch all platform users so they can add anyone
  useEffect(() => {
    api.get<{ id: string; username: string; display_name: string | null; email: string; avatar_url: string | null; role: string }[]>("/users")
      .then((users) => {
        // Convert to OrgMemberData format, exclude users already in orgMembers
        const orgMemberIds = new Set(orgMembers.map((om) => om.user.id));
        const extra: OrgMemberData[] = users
          .filter((u) => !orgMemberIds.has(u.id))
          .map((u) => ({ id: "", role: "employee", user: { id: u.id, username: u.username, display_name: u.display_name, email: u.email, avatar_url: u.avatar_url } }));
        setAllUsers([...orgMembers, ...extra]);
      })
      .catch(() => setAllUsers(orgMembers)); // Fallback to org members if not admin
  }, [orgMembers]);

  const membersToShow = allUsers.length > 0 ? allUsers : orgMembers;

  const filteredMembers = membersToShow.filter((om) =>
    !memberSearch || (om.user.display_name || om.user.username).toLowerCase().includes(memberSearch.toLowerCase()) ||
    om.user.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const group = await api.post<{ id: string }>(`/orgs/${orgId}/groups`, { name: name.trim(), description: description.trim() || null, color });
      // Add selected members — if user isn't in org yet, add them first
      const orgMemberIds = new Set(orgMembers.map((om) => om.user.id));
      for (const userId of selectedMembers) {
        if (!orgMemberIds.has(userId)) {
          await api.post(`/orgs/${orgId}/members`, { user_id: userId, role: "employee" }).catch(() => {});
        }
        await api.post(`/groups/${group.id}/members`, { user_id: userId }).catch((e) => console.error("Failed to add member to group:", e));
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <h3 className="text-[15px] font-semibold text-ink">New group</h3>
        <button type="button" onClick={onClose} className="text-muted hover:text-ink transition-colors text-lg">×</button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="text-[13px] font-medium text-ink mb-2 block">Group name <span className="text-muted font-normal">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Backend, Frontend, Design"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-surface-2 border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all" autoFocus />
          </div>

          <div>
            <label className="text-[13px] font-medium text-ink mb-2 block">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this group is for"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-surface-2 border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all" />
          </div>

          <div>
            <label className="text-[13px] font-medium text-ink mb-2 block">Color</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${color === c ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Add members */}
          <div>
            <label className="text-[13px] font-medium text-ink mb-2 block">
              Add members <span className="text-muted font-normal">optional · {selectedMembers.size} selected</span>
            </label>
            <input type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full px-3.5 py-2 text-sm rounded-lg bg-surface-2 border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all mb-2" />
            <div className="border border-border rounded-lg max-h-[200px] overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <p className="px-3 py-4 text-center text-[11px] text-muted">No members found.</p>
              ) : (
                filteredMembers.map((om) => {
                  const checked = selectedMembers.has(om.user.id);
                  const colors2 = ["from-indigo-400 to-purple-400", "from-emerald-400 to-teal-400", "from-rose-400 to-pink-400", "from-amber-400 to-orange-400"];
                  const idx = om.user.username.charCodeAt(0) % colors2.length;
                  return (
                    <button key={om.user.id} type="button" onClick={() => toggleMember(om.user.id)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-left transition-colors ${checked ? "bg-ink/5" : "hover:bg-surface-2"}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-ink border-ink" : "border-border"}`}>
                        {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                      </div>
                      {om.user.avatar_url ? (
                        <img src={om.user.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${colors2[idx]} flex items-center justify-center text-white text-[10px] font-bold`}>
                          {(om.user.display_name || om.user.username).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-[12px] font-medium text-ink truncate">{om.user.display_name || om.user.username}</p>
                        <p className="text-[10px] text-muted truncate">{om.user.email}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted border border-border rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
          <button type="submit" disabled={loading || !name.trim()}
            className="px-5 py-2 bg-ink text-surface text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2">
            {loading ? <div className="w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" /> : <Plus size={13} strokeWidth={2} />}
            Create group
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Groups View ── */

function GroupsView({ groups, orgId: _orgId, orgMembers, onRefresh, onMembersChange, showCreateGroup, setShowCreateGroup, currentUserId }: { groups: GroupData[]; orgId: string; orgMembers: OrgMemberData[]; onRefresh: () => void; onMembersChange: (m: OrgMemberData[]) => void; showCreateGroup: boolean; setShowCreateGroup: (v: boolean) => void; currentUserId?: string }) {
  const [selectedGroup, setSelectedGroup] = useState(0);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const navigate = useNavigate();
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("");
  const [inheritedKeys, setInheritedKeys] = useState<{ id: string; name: string; environment: string; permission: string }[]>([]);

  const group = groups[selectedGroup];

  const fetchMembers = useCallback(async () => {
    if (!group) return;
    try {
      setLoadingMembers(true);
      const [memberData, keyData] = await Promise.all([
        api.get<MemberData[]>(`/groups/${group.id}/members`),
        api.get<{ id: string; name: string; environment: string; permission: string }[]>(`/groups/${group.id}/keys`).catch(() => []),
      ]);
      setMembers(memberData);
      setInheritedKeys(Array.isArray(keyData) ? keyData : []);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [group]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  if (groups.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={32} className="text-muted mb-3" />
          <p className="text-sm font-medium text-ink mb-1">No groups yet</p>
          <p className="text-xs text-muted">Create your first group to organize your team.</p>
        </div>

        {showCreateGroup && (
          <>
            <div className="fixed inset-0 z-50 bg-ink/10 backdrop-blur-[3px]" onClick={() => setShowCreateGroup(false)} />
            <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[400px] h-screen bg-surface border-l border-border shadow-xl text-left overflow-hidden">
              <CreateGroupPanel orgId={_orgId} orgMembers={orgMembers} onClose={() => setShowCreateGroup(false)} onCreated={() => { setShowCreateGroup(false); onRefresh(); }} />
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
      {/* Left: Group list */}
      <div className="w-full md:w-[380px] shrink-0 border-b md:border-b-0 md:border-r border-border overflow-y-auto max-h-[40vh] md:max-h-none">
        <div className="px-6 py-3">
          <span className="text-[10.5px] font-semibold text-muted uppercase tracking-widest">Groups</span>
        </div>
        <div className="px-4 pb-3 space-y-1.5">
          {groups.map((g, i) => {
            const sel = selectedGroup === i;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(i)}
                className={`group w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-card border transition-all ${
                  sel ? "bg-surface border-border shadow-card" : "border-transparent hover:bg-surface-2"
                }`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: g.color || "#5b5bd6" }}>
                  {g.name[0]}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-[14px] font-semibold text-ink truncate">{g.name}</p>
                  <p className="text-[11.5px] text-muted mt-0.5 truncate">{g.description || "No description"}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <p className="text-[14px] font-semibold text-ink">{g.member_count}</p>
                    <p className="text-[9px] text-muted uppercase tracking-wider">Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-semibold text-ink">{g.key_count ?? 0}</p>
                    <p className="text-[9px] text-muted uppercase tracking-wider">Keys</p>
                  </div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGroup(i);
                      setEditName(g.name);
                      setEditDesc(g.description || "");
                      setEditColor(g.color || "#5b5bd6");
                      setShowEdit(true);
                    }}
                    className="w-6 h-6 rounded-btn-sm flex items-center justify-center text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-2 hover:text-ink transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </span>
                  <span className="text-muted text-xs">›</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Group detail */}
      {group && (
        <div className="flex-1 min-w-0 overflow-y-auto p-6 relative">
          <div className="mb-1">
            <span className="text-[10.5px] font-semibold text-muted uppercase tracking-widest">Group</span>
          </div>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
              style={{ backgroundColor: group.color || "#5b5bd6" }}>
              {group.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink">{group.name}</h2>
              <p className="text-[12.5px] text-muted">{group.description || "No description"} · created {new Date(group.created_by).toLocaleDateString() === "Invalid Date" ? "" : ""}</p>
            </div>
          </div>

          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setShowAddMember(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-btn bg-ink text-surface hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <Plus size={13} strokeWidth={2} />
              Add member
            </button>
            <button
              onClick={() => { setEditName(group.name); setEditDesc(group.description || ""); setEditColor(group.color || "#5b5bd6"); setShowEdit(true); }}
              className="px-3 py-1.5 text-sm font-medium rounded-btn border border-border text-ink hover:bg-surface-2 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setShowPermissions(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-btn border border-border text-ink hover:bg-surface-2 transition-colors"
            >
              Permissions
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-btn text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              Delete
            </button>
          </div>

          {/* Delete confirmation modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-ink/30 backdrop-blur-md" onClick={() => setShowDeleteConfirm(false)} />
              <div className="relative w-[400px] bg-surface border border-border rounded-xl shadow-popover p-6">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-semibold text-ink text-center mb-1">Delete group</h3>
                <p className="text-sm text-muted text-center mb-5">
                  Are you sure you want to delete <span className="font-medium text-ink">"{group.name}"</span>? All members will be removed from this group. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-ink border border-border rounded-lg hover:bg-surface-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await api.delete(`/groups/${group.id}`);
                      setShowDeleteConfirm(false);
                      onRefresh();
                    }}
                    className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Delete group
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Inline panel drawers — scoped to right panel */}
          {(showAddMember || showEdit || showCreateGroup || showPermissions) && (
            <div className="absolute inset-0 z-20 flex justify-end">
              <div className="absolute inset-0 bg-ink/10 backdrop-blur-[3px]" onClick={() => { setShowAddMember(false); setShowEdit(false); setShowCreateGroup(false); setShowPermissions(false); }} />
              <div className={`relative ${showPermissions ? "w-full" : "w-full md:w-[360px]"} h-full bg-surface border-l border-border shadow-popover flex flex-col animate-slide-in`}>
                {/* Permissions panel — full width */}
                {showPermissions && (
                  <PermissionsPanel groups={groups} onClose={() => setShowPermissions(false)} />
                )}

                {/* Create group panel */}
                {showCreateGroup && (
                  <CreateGroupPanel orgId={_orgId} orgMembers={orgMembers} onClose={() => setShowCreateGroup(false)} onCreated={() => { setShowCreateGroup(false); onRefresh(); }} />
                )}

                {/* Add member panel */}
                {showAddMember && (
                  <AddMemberModal
                    groupId={group.id}
                    orgMembers={orgMembers}
                    existingMembers={members}
                    onClose={() => setShowAddMember(false)}
                    onAdded={() => { setShowAddMember(false); fetchMembers(); onRefresh(); }}
                  />
                )}

                {/* Edit group panel */}
                {showEdit && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!editName.trim()) return;
                      await api.patch(`/groups/${group.id}`, { name: editName.trim(), description: editDesc.trim() || null, color: editColor });
                      setShowEdit(false);
                      onRefresh();
                    }}
                    className="flex flex-col h-full"
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <h3 className="text-[15px] font-semibold text-ink">Edit group</h3>
                      <button type="button" onClick={() => setShowEdit(false)} className="text-muted hover:text-ink transition-colors text-lg">×</button>
                    </div>
                    <div className="flex-1 px-5 py-5 space-y-5">
                      <div>
                        <label className="text-[13px] font-medium text-ink mb-2 block">Group name</label>
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-surface-2 border border-border text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all" autoFocus />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-ink mb-2 block">Description</label>
                        <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="What this group is for"
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-surface-2 border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all" />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-ink mb-2 block">Color</label>
                        <div className="flex gap-2">
                          {["#5b5bd6", "#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#6366f1", "#ef4444", "#71717a"].map((c) => (
                            <button key={c} type="button" onClick={() => setEditColor(c)}
                              className={`w-8 h-8 rounded-lg transition-all ${editColor === c ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "hover:scale-110"}`}
                              style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
                      <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-medium text-muted border border-border rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
                      <button type="submit" disabled={!editName.trim()} className="px-4 py-2 bg-ink text-surface text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-40">Save changes</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Members header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-ink">Members · {members.length}</h3>
            <span className="text-[11.5px] text-muted">Sort by name ▾</span>
          </div>

          {loadingMembers ? (
            <div className="flex justify-center py-8">
              <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="bg-surface border border-border rounded-card p-8 text-center">
              <p className="text-sm text-muted">No members in this group yet.</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-card overflow-hidden mb-6">
              {members.map((m, i) => {
                    const orgMember = orgMembers.find((om) => om.user.id === m.user.id);
                    const role = orgMember?.role || "employee";
                    const colors = ["from-indigo-400 to-purple-400", "from-emerald-400 to-teal-400", "from-rose-400 to-pink-400", "from-amber-400 to-orange-400", "from-cyan-400 to-blue-400", "from-fuchsia-400 to-violet-400"];
                    return (
                      <div key={m.user.id} className={`flex items-center gap-3 px-4 py-3 ${i < members.length - 1 ? "border-b border-border" : ""} hover:bg-surface-2 transition-colors`}>
                        {m.user.avatar_url ? (
                          <img src={m.user.avatar_url} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center text-white text-[11px] font-bold`}>
                            {(m.user.display_name || m.user.username).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-[13px] font-medium text-ink truncate">{m.user.display_name || m.user.username}</p>
                          <p className="text-[11.5px] text-muted truncate">{m.user.email}</p>
                        </div>
                        <span className={`text-[12px] text-ink px-2.5 py-1 border border-border rounded-btn-sm shrink-0 whitespace-nowrap ${m.user.id === currentUserId ? "" : "cursor-pointer"}`}>
                          {role === "super_admin" ? "Admin" : role.charAt(0).toUpperCase() + role.slice(1)} {m.user.id !== currentUserId && "▾"}
                        </span>
                        {m.user.id !== currentUserId && <MemberMenu
                          currentRole={role}
                          onChangeRole={async (newRole) => {
                            try {
                              await api.patch(`/orgs/${_orgId}/members/${m.user.id}`, { role: newRole });
                              onMembersChange(orgMembers.map((om) =>
                                om.user.id === m.user.id ? { ...om, role: newRole } : om
                              ));
                            } catch { /* ignore */ }
                          }}
                          onRemove={async () => {
                            await api.delete(`/groups/${group.id}/members/${m.user.id}`);
                            fetchMembers();
                            onRefresh();
                          }}
                          memberName={m.user.display_name || m.user.username}
                        />}
                      </div>
                    );
                  })}
            </div>
          )}

          {/* Inherited access */}
          <h3 className="text-[14px] font-semibold text-ink mb-3">Inherited access</h3>
          <div className="flex flex-wrap gap-2">
            {inheritedKeys.map((k) => (
              <span key={k.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent-soft text-accent text-xs font-medium rounded-btn">
                <KeyRound size={10} strokeWidth={1.6} /> {k.name}
              </span>
            ))}
            {inheritedKeys.length === 0 && (
              <span className="text-[11.5px] text-muted">No keys assigned to this group yet.</span>
            )}
            <button
              onClick={() => navigate("/?create=true")}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-dashed border-border text-xs text-muted rounded-btn hover:border-accent hover:text-accent transition-colors"
            >
              <Plus size={10} strokeWidth={2} /> Assign key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Permission Matrix ── */

/* ── Permissions Panel ── */

const capabilities = [
  { name: "View keys", icon: Eye },
  { name: "Use keys", icon: KeyRound },
  { name: "Sticky board", icon: StickyNote },
  { name: "Manage team", icon: Users },
  { name: "Billing", icon: Lock },
];

const levelConfig = [
  { label: "No access", bg: "bg-transparent", border: "border-border", text: "text-muted/40", icon: null },
  { label: "View", bg: "bg-surface", border: "border-border", text: "text-ink/70", icon: Eye },
  { label: "Use", bg: "bg-accent-soft", border: "border-accent", text: "text-accent", icon: Check },
  { label: "Admin", bg: "bg-accent", border: "border-accent", text: "text-white", icon: Zap },
];

function PermissionCell({ level, onClick }: { level: number; onClick: () => void }) {
  const cfg = levelConfig[level];
  const Icon = cfg.icon;
  return (
    <button onClick={onClick} className={`w-7 h-7 rounded-btn-sm ${cfg.bg} border ${cfg.border} flex items-center justify-center ${cfg.text} hover:opacity-70 transition-opacity`}>
      {level === 0 && <span className="w-1.5 h-1.5 rounded-full bg-muted/30" />}
      {Icon && <Icon size={13} strokeWidth={1.6} />}
    </button>
  );
}

function PermissionsPanel({ groups, onClose }: { groups: GroupData[]; onClose: () => void }) {
  const defaultPerms = [3, 2, 2, 1, 3];
  const [perms, setPerms] = useState<Record<string, number[]>>(
    Object.fromEntries(groups.map((g) => [g.id, [...defaultPerms]]))
  );

  const cycleLevel = (groupId: string, capIndex: number) => {
    setPerms((prev) => {
      const next = { ...prev };
      next[groupId] = [...(next[groupId] || defaultPerms)];
      next[groupId][capIndex] = (next[groupId][capIndex] + 1) % 4;
      return next;
    });
  };

  const totalPeople = groups.reduce((a, g) => a + g.member_count, 0);

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-[15px] font-semibold text-ink">Permissions Matrix</h3>
        <button onClick={onClose} className="text-muted hover:text-ink transition-colors text-lg">×</button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 bg-surface-2 border-b border-border">
        <span className="text-[10.5px] font-semibold text-muted uppercase tracking-widest">Legend</span>
        {levelConfig.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <PermissionCell level={i} onClick={() => {}} />
            <span className="text-xs text-ink/70">{l.label}</span>
          </div>
        ))}
        <div className="flex-1" />
        <span className="text-[11.5px] text-muted">{groups.length} groups · {totalPeople} people · changes auto-save</span>
      </div>

      {/* Matrix */}
      <div className="flex-1 overflow-auto p-5">
        <div className="bg-surface border border-border rounded-card overflow-hidden">
          {/* Header */}
          <div className="grid bg-surface-2 border-b border-border" style={{ gridTemplateColumns: `200px repeat(${capabilities.length}, 1fr)` }}>
            <div className="px-4 py-3 text-[10.5px] font-semibold text-muted uppercase tracking-widest">Group</div>
            {capabilities.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.name} className="px-2 py-3 border-l border-border flex items-center justify-center gap-1.5 text-xs font-medium text-ink/70">
                  <Icon size={13} strokeWidth={1.6} className="text-muted" />
                  {c.name}
                </div>
              );
            })}
          </div>

          {/* Rows */}
          {groups.map((g, gi) => (
            <div key={g.id} className={`grid ${gi < groups.length - 1 ? "border-b border-border" : ""}`}
              style={{ gridTemplateColumns: `200px repeat(${capabilities.length}, 1fr)` }}>
              <div className="px-4 py-3.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-btn-sm flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: g.color || "#5b5bd6" }}>
                  {g.name[0]}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-ink">{g.name}</p>
                  <p className="text-[11px] text-muted">{g.member_count} members</p>
                </div>
              </div>
              {(perms[g.id] || defaultPerms).map((lvl, ci) => (
                <div key={ci} className="px-2 py-3.5 border-l border-border flex items-center justify-center">
                  <PermissionCell level={lvl} onClick={() => cycleLevel(g.id, ci)} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="mt-3.5 px-3.5 py-2.5 flex items-center gap-2.5 bg-surface border border-border rounded-card text-xs text-muted">
          <Zap size={14} strokeWidth={1.6} className="text-accent shrink-0" />
          <span>Tip — shift-click to bulk-edit cells across a column or row.</span>
          <div className="flex-1" />
          <button className="px-2.5 py-1 border border-border rounded-btn text-xs font-medium text-ink hover:bg-surface-2 transition-colors">
            Export CSV
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Member `...` Menu ── */

function MemberMenu({ onRemove, onChangeRole, memberName, currentRole }: {
  onRemove: () => void;
  onChangeRole?: (role: string) => void;
  memberName: string;
  currentRole?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right - 160 });
    }
    setShowRoles(false);
    setOpen(!open);
  };

  const roles = ["super_admin", "admin", "employee"];

  return (
    <div className="relative">
      <button ref={btnRef} onClick={handleOpen} className="w-7 h-7 rounded-btn-sm flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-44 bg-surface border border-border rounded-card shadow-popover py-1" style={{ top: pos.top, left: pos.left }}>
            {!showRoles ? (
              <>
                <button
                  onClick={() => onChangeRole ? setShowRoles(true) : null}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-ink hover:bg-surface-2 transition-colors"
                >
                  Change role
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  onClick={() => { setOpen(false); onRemove(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  Remove {memberName.split(" ")[0]}
                </button>
              </>
            ) : (
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">Select role</div>
                {roles.map((r) => (
                  <button
                    key={r}
                    disabled={changingRole !== null}
                    onClick={async () => {
                      if (r === currentRole) return;
                      setChangingRole(r);
                      await onChangeRole?.(r);
                      setChangingRole(null);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2 text-[13px] hover:bg-surface-2 transition-colors ${
                      r === currentRole ? "text-accent font-medium" : "text-ink"
                    }`}
                  >
                    {r === "super_admin" ? "Super Admin" : r.charAt(0).toUpperCase() + r.slice(1)}
                    {changingRole === r ? (
                      <div className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    ) : r === currentRole ? (
                      <span className="text-accent">✓</span>
                    ) : null}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Add Member Modal ── */

function AddMemberModal({ groupId, orgMembers, existingMembers, onClose, onAdded }: {
  groupId: string;
  orgMembers: OrgMemberData[];
  existingMembers: MemberData[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const existingIds = new Set(existingMembers.map((m) => m.user.id));
  const available = orgMembers.filter(
    (om) => !existingIds.has(om.user.id) &&
      ((om.user.display_name || om.user.username).toLowerCase().includes(search.toLowerCase()) ||
       om.user.email.toLowerCase().includes(search.toLowerCase()))
  );

  const addUser = async (userId: string) => {
    setLoading(userId);
    try {
      await api.post(`/groups/${groupId}/members`, { user_id: userId });
      onAdded();
    } catch (err) {
      console.error("Failed to add member:", err);
    }
    setLoading(null);
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-[15px] font-semibold text-ink">Add member</h3>
        <button onClick={onClose} className="text-muted hover:text-ink transition-colors text-lg">×</button>
      </div>
      <div className="px-5 py-3 border-b border-border">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search org members..."
          className="w-full px-3 py-2 text-sm rounded-btn bg-surface-2 border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all" autoFocus />
      </div>
      <div className="flex-1 overflow-y-auto">
        {available.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            {search ? "No matching members found." : "All org members are already in this group."}
          </p>
        ) : (
          available.map((om) => (
            <div key={om.user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors">
              {om.user.avatar_url ? (
                <img src={om.user.avatar_url} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[11px] font-semibold">
                  {(om.user.display_name || om.user.username).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-[13px] font-medium text-ink">{om.user.display_name || om.user.username}</p>
                <p className="text-[11px] text-muted">{om.user.email}</p>
              </div>
              <button onClick={() => addUser(om.user.id)} disabled={loading === om.user.id}
                className="px-3 py-1 bg-ink text-surface text-[12px] font-medium rounded-btn hover:opacity-90 transition-opacity disabled:opacity-40">
                {loading === om.user.id ? "..." : "Add"}
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

