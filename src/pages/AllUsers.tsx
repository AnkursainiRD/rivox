import { useState, useEffect, useCallback } from "react";
import { Shield, MoreHorizontal, Search } from "lucide-react";
import { PageHead } from "../components/PageHead";
import { api } from "../lib/api";

interface UserData {
  id: string;
  username: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  discord_id: string | null;
  role: "super_admin" | "admin" | "user";
  createdAt: string;
}

const roleBadge: Record<string, { label: string; style: string }> = {
  super_admin: { label: "Super Admin", style: "bg-ink text-surface" },
  admin: { label: "Admin", style: "bg-accent-soft text-accent" },
  user: { label: "User", style: "bg-surface-2 text-muted" },
};

export function AllUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleMenu, setRoleMenu] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<UserData[]>("/users");
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const changeRole = async (userId: string, role: string) => {
    try {
      await api.patch(`/users/${userId}/role`, { role });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: role as UserData["role"] } : u))
      );
    } catch (err) {
      console.error("Failed to change role:", err);
    }
    setRoleMenu(null);
  };

  const filtered = users.filter(
    (u) =>
      !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHead
        title="Employees"
        subtitle={`${users.length} member${users.length !== 1 ? "s" : ""} across the platform`}
      />

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search size={14} strokeWidth={1.6} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-btn bg-surface border border-border text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-card shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left px-4 py-2.5 text-[10.5px] font-semibold text-muted uppercase tracking-widest">User</th>
                <th className="text-left px-4 py-2.5 text-[10.5px] font-semibold text-muted uppercase tracking-widest">Email</th>
                <th className="text-left px-4 py-2.5 text-[10.5px] font-semibold text-muted uppercase tracking-widest">Discord</th>
                <th className="text-left px-4 py-2.5 text-[10.5px] font-semibold text-muted uppercase tracking-widest">Role</th>
                <th className="text-left px-4 py-2.5 text-[10.5px] font-semibold text-muted uppercase tracking-widest">Joined</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const badge = roleBadge[u.role];
                return (
                  <tr key={u.id} className="border-b border-border last:border-b-0 hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[11px] font-semibold">
                            {(u.display_name || u.username).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-[13px] font-medium text-ink">{u.display_name || u.username}</p>
                          <p className="text-[11px] text-muted">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.discord_id ? (
                        <span className="text-[11px] text-muted font-mono bg-surface-2 px-2 py-0.5 rounded">{u.discord_id}</span>
                      ) : (
                        <span className="text-[11px] text-muted/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 relative">
                      <button
                        onClick={() => setRoleMenu(roleMenu === u.id ? null : u.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.style}`}
                      >
                        {(u.role === "super_admin" || u.role === "admin") && <Shield size={10} strokeWidth={1.6} />}
                        {badge.label} ▾
                      </button>

                      {/* Role dropdown */}
                      {roleMenu === u.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setRoleMenu(null)} />
                          <div className="absolute left-4 top-10 z-50 w-40 bg-surface border border-border rounded-card shadow-popover py-1">
                            {(["super_admin", "admin", "user"] as const).map((r) => {
                              const rb = roleBadge[r];
                              return (
                                <button
                                  key={r}
                                  onClick={() => changeRole(u.id, r)}
                                  className={`flex items-center gap-2 w-full px-3 py-2 text-[13px] transition-colors ${
                                    u.role === r ? "text-accent bg-accent-soft/50" : "text-ink hover:bg-surface-2"
                                  }`}
                                >
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${rb.style}`}>
                                    {rb.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button className="p-1 rounded-btn-sm text-muted hover:bg-surface-2 transition-colors">
                        <MoreHorizontal size={14} strokeWidth={1.6} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
