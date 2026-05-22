import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  CheckmarkCircle02Icon,
  ArrowUpRight01Icon,
  UserGroupIcon,
  Key01Icon,
  Globe02Icon,
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
    if (!memberSearch) return false;
    if (members.some((m) => m.user.id === u.id)) return false;
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

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
            onClick={resetForm}
          />
          <form
            onSubmit={handleCreate}
            className="relative w-[440px] bg-surface border border-border rounded-card shadow-popover p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-ink">
                New workspace
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 rounded-btn-sm text-muted hover:text-ink hover:bg-surface-2 transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-btn bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="text-[13px] font-medium text-ink mb-1.5 block">
                Workspace name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. YourGPT"
                className="w-full px-3.5 py-2.5 text-sm rounded-btn bg-surface-2 border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-ink mb-1.5 block">
                URL slug
              </label>
              <div className="flex items-center bg-surface-2 border border-border rounded-btn overflow-hidden focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all">
                <span className="pl-3.5 pr-1 text-sm text-muted/50 select-none">
                  rivox.app/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  placeholder="your-team"
                  className="w-full pr-3.5 py-2.5 text-sm bg-transparent text-ink placeholder:text-muted/40 outline-none"
                />
              </div>
            </div>

            {/* Members */}
            <div>
              <label className="text-[13px] font-medium text-ink mb-1.5 block">
                Add members <span className="text-muted font-normal">(optional)</span>
              </label>

              {/* Search input */}
              <div className="relative mb-2">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search by name, username, or email..."
                  className="w-full px-3.5 py-2 text-sm rounded-btn bg-surface-2 border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
                {/* Dropdown results */}
                {filteredUsers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-surface border border-border rounded-btn shadow-popover py-1 max-h-[160px] overflow-y-auto">
                    {filteredUsers.slice(0, 6).map((u) => (
                      <button key={u.id} type="button" onClick={() => addMember(u)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-surface-2 transition-colors">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[8px] font-bold">
                            {(u.display_name || u.username).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-medium text-ink truncate">{u.display_name || u.username}</div>
                          <div className="text-[10.5px] text-muted truncate">@{u.username} · {u.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected members */}
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

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-muted border border-border rounded-btn hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim() || !slug.trim()}
                className="flex-1 px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-btn hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Create workspace"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Org cards grid */}
      <div className="grid grid-cols-3 gap-4">
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
                    <span>—</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <HugeiconsIcon icon={Key01Icon} size={13} />
                    <span>—</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <HugeiconsIcon icon={Globe02Icon} size={13} />
                    <span>—</span>
                  </div>
                </div>

                {/* Action */}
                {isActive ? (
                  <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-accent bg-accent-soft rounded-btn">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                    Current workspace
                  </div>
                ) : (
                  <button
                    onClick={() => onSwitchOrg(org)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-ink bg-surface-2 border border-border rounded-btn hover:bg-accent hover:text-white hover:border-accent transition-all duration-200"
                  >
                    Switch workspace
                    <HugeiconsIcon icon={ArrowUpRight01Icon} size={13} />
                  </button>
                )}
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
