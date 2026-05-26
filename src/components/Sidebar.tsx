import { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  KeyRound,
  StickyNote,
  Users,
  Settings,
  HelpCircle,
  Search,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  AlertCircle,
  Bell,
  Building2,
  UserCog,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import rivoxMark from "../assets/rivox-mark.svg";
import rivoxMarkInverted from "../assets/rivox-mark-inverted.svg";
import { api } from "../lib/api";
import type { User, Organization } from "../hooks/useAuth";

const navItems = [
  { to: "/", icon: KeyRound, label: "API Keys" },
  { to: "/sticky-board", icon: StickyNote, label: "Sticky Board" },
  { to: "/team", icon: Users, label: "Team" },
  { to: "/issues", icon: AlertCircle, label: "Issues" },
];

const bottomItems = [
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/help", icon: HelpCircle, label: "Help" },
];

interface SidebarProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  user: User;
  orgs: Organization[];
  activeOrg: Organization | null;
  onSwitchOrg: (org: Organization) => void;
  onLogout: () => void;
  unreadCount?: number;
}

export function Sidebar({ theme, onToggleTheme, user, orgs, activeOrg, onSwitchOrg, onLogout, unreadCount = 0 }: SidebarProps) {
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  // ⌘K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Shared sidebar content (used in both mobile overlay and desktop)
  const sidebarContent = (
    <>
      {/* Workspace switcher */}
      <div className="px-3 pt-4 pb-2 relative">
        <button
          onClick={() => setOrgMenuOpen(!orgMenuOpen)}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-btn text-sm font-semibold text-ink hover:bg-surface-2 transition-colors"
        >
          <img
            src={theme === "dark" ? rivoxMarkInverted : rivoxMark}
            alt="Rivox"
            className="w-6 h-6 rounded-md"
          />
          <span className="truncate tracking-tight">
            {activeOrg?.name || "rivox"}
          </span>
          <ChevronDown size={14} className={`ml-auto text-muted transition-transform ${orgMenuOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Org switcher dropdown */}
        {orgMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOrgMenuOpen(false)} />
            <div className="absolute left-3 right-3 top-16 z-50 bg-surface border border-border rounded-card shadow-popover py-1">
              {orgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => { onSwitchOrg(org); setOrgMenuOpen(false); }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                    activeOrg?.id === org.id
                      ? "bg-accent-soft text-accent font-medium"
                      : "text-ink hover:bg-surface-2"
                  }`}
                >
                  <div className="w-5 h-5 rounded bg-accent/10 flex items-center justify-center text-accent text-[10px] font-bold">
                    {org.name[0].toUpperCase()}
                  </div>
                  <span className="truncate">{org.name}</span>
                </button>
              ))}
              {orgs.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted">No workspaces</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-btn text-sm text-muted bg-surface border border-border hover:bg-surface-2 transition-colors">
          <Search size={16} strokeWidth={1.6} />
          <span>Search</span>
          <kbd className="ml-auto font-mono text-[11px] text-muted bg-surface-2 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2 py-1.5 rounded-btn text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-ink hover:bg-surface-2"
              }`
            }
          >
            <Icon size={16} strokeWidth={1.6} />
            {label}
          </NavLink>
        ))}

        {/* Admin-only tabs */}
        {(user.role === "super_admin" || user.role === "admin") && (
          <>
            <NavLink
              to="/organizations"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2 py-1.5 rounded-btn text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "text-ink hover:bg-surface-2"
                }`
              }
            >
              <Building2 size={16} strokeWidth={1.6} />
              Organizations
            </NavLink>
            <NavLink
              to="/all-users"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2 py-1.5 rounded-btn text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "text-ink hover:bg-surface-2"
                }`
              }
            >
              <UserCog size={16} strokeWidth={1.6} />
              Employees
            </NavLink>
          </>
        )}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-2 space-y-0.5 border-t border-border">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2 py-1.5 rounded-btn text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface-2"
              }`
            }
          >
            <Icon size={16} strokeWidth={1.6} />
            {label}
            {label === "Notifications" && unreadCount > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-accent text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>
        ))}

        <button
          onClick={onToggleTheme}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-btn text-sm font-medium text-muted hover:bg-surface-2 transition-colors w-full"
        >
          {theme === "light" ? (
            <Moon size={16} strokeWidth={1.6} />
          ) : (
            <Sun size={16} strokeWidth={1.6} />
          )}
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>
      </div>

      {/* Profile pill */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2 px-2">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-xs font-semibold">
              {(user.display_name || user.username).slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">
              {user.display_name || user.username}
            </p>
            <p className="text-xs text-muted truncate">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-1 rounded-btn-sm text-muted hover:text-ink hover:bg-surface-2 transition-colors"
            title="Sign out"
          >
            <LogOut size={14} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile top bar (< md) ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-2.5 bg-sidebar border-b border-border">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-btn text-ink hover:bg-surface-2 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} strokeWidth={1.6} />
        </button>
        <div className="flex items-center gap-2">
          <img
            src={theme === "dark" ? rivoxMarkInverted : rivoxMark}
            alt="Rivox"
            className="w-6 h-6 rounded-md"
          />
          <span className="text-sm font-semibold text-ink tracking-tight">
            {activeOrg?.name || "rivox"}
          </span>
        </div>
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.username}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[10px] font-semibold">
            {(user.display_name || user.username).slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* ── Mobile sidebar overlay (< md) ── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Slide-in sidebar */}
          <aside className="absolute top-0 left-0 bottom-0 w-[260px] flex flex-col bg-sidebar border-r border-border shadow-xl animate-slide-in-left">
            {/* Close button at top */}
            <div className="flex items-center justify-end px-3 pt-3 pb-0">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-btn text-muted hover:text-ink hover:bg-surface-2 transition-colors"
                aria-label="Close menu"
              >
                <X size={18} strokeWidth={1.6} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar (>= md) ── */}
      <aside className="hidden md:flex flex-col w-[220px] h-full bg-sidebar border-r border-border shrink-0">
        {sidebarContent}
      </aside>

      {/* Search modal */}
      {searchOpen && activeOrg && (
        <SearchModal orgId={activeOrg.id} onClose={() => setSearchOpen(false)} />
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SEARCH MODAL (⌘K)
   ══════════════════════════════════════════════════════════════════════════ */

interface SearchResult {
  type: "issue" | "task" | "member" | "page" | "key";
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  path: string;
}

const pages: SearchResult[] = [
  { type: "page", id: "p1", title: "API Keys", path: "/", icon: "key" },
  { type: "page", id: "p2", title: "Sticky Board", path: "/sticky-board", icon: "note" },
  { type: "page", id: "p3", title: "Team", path: "/team", icon: "users" },
  { type: "page", id: "p4", title: "Issues", path: "/issues", icon: "issue" },
  { type: "page", id: "p5", title: "Settings", path: "/settings", icon: "settings" },
  { type: "page", id: "p6", title: "Notifications", path: "/notifications", icon: "bell" },
  { type: "page", id: "p7", title: "Help", path: "/help", icon: "help" },
];

function SearchModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Search
  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const items: SearchResult[] = [];

    // Search pages
    const lq = q.toLowerCase();
    pages.forEach((p) => {
      if (p.title.toLowerCase().includes(lq)) items.push(p);
    });

    // Search issues
    try {
      const issueData = await api.get<{ issues: { id: string; number: number; title: string; status: string; type: string }[] }>(`/issues/all?limit=100`);
      const issues = issueData.issues;
      issues.forEach((iss) => {
        if (iss.title.toLowerCase().includes(lq) || `#${iss.number}`.includes(lq)) {
          items.push({ type: "issue", id: iss.id, title: `#${iss.number} ${iss.title}`, subtitle: `${iss.type} · ${iss.status.replace(/_/g, " ")}`, path: `/issues/${iss.id}` });
        }
      });
    } catch { /* ignore */ }

    // Search tasks
    try {
      const tasks = await api.get<{ id: string; title: string; status: string; color: string }[]>(`/orgs/${orgId}/tasks`);
      tasks.forEach((t) => {
        if (t.title.toLowerCase().includes(lq)) {
          items.push({ type: "task", id: t.id, title: t.title, subtitle: `note · ${t.status.replace(/_/g, " ")}`, path: "/sticky-board" });
        }
      });
    } catch { /* ignore */ }

    // Search API keys
    try {
      const keys = await api.get<{ id: string; name: string; provider: string; environment: string }[]>(`/orgs/${orgId}/keys`);
      keys.forEach((k) => {
        if (k.name.toLowerCase().includes(lq) || k.provider?.toLowerCase().includes(lq)) {
          items.push({ type: "key", id: k.id, title: k.name, subtitle: `${k.provider || "key"} · ${k.environment || "—"}`, path: "/" });
        }
      });
    } catch { /* ignore */ }

    // Search members
    try {
      const members = await api.get<{ user: { id: string; username: string; display_name: string | null; avatar_url: string | null } }[]>(`/orgs/${orgId}/members`);
      members.forEach((m) => {
        const name = m.user.display_name || m.user.username;
        if (name.toLowerCase().includes(lq) || m.user.username.toLowerCase().includes(lq)) {
          items.push({ type: "member", id: m.user.id, title: name, subtitle: `@${m.user.username}`, path: "/team" });
        }
      });
    } catch { /* ignore */ }

    setResults(items.slice(0, 12));
    setActiveIdx(0);
    setLoading(false);
  }, [orgId]);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 200);
  };

  const go = (result: SearchResult) => {
    navigate(result.path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[activeIdx]) { go(results[activeIdx]); }
  };

  const typeIcon = (type: string) => {
    if (type === "issue") return <AlertCircle size={14} className="text-muted shrink-0" />;
    if (type === "task") return <StickyNote size={14} className="text-muted shrink-0" />;
    if (type === "key") return <KeyRound size={14} className="text-muted shrink-0" />;
    if (type === "member") return <Users size={14} className="text-muted shrink-0" />;
    return <ArrowRight size={14} className="text-muted shrink-0" />;
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[8px]" onClick={onClose} />
      <div className="fixed z-[100] top-[14%] left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] bg-surface border border-border rounded-[18px] overflow-hidden"
        style={{ boxShadow: "0 32px 80px -8px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.08)" }}>
        {/* Input */}
        <div className="flex items-center gap-3 px-[18px] py-4 border-b border-border">
          <div className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #7c7cf0, #a5a5ff)" }}>
            <Search size={15} className="text-white" />
          </div>
          <input ref={inputRef} value={query} onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search issues, notes, keys, people…"
            className="flex-1 text-[17px] bg-transparent outline-none text-ink placeholder:text-muted/40"
            style={{ letterSpacing: "-0.015em" }} />
          <kbd className="font-mono text-[10.5px] text-muted/50 bg-surface-2 px-1.5 py-0.5 rounded border border-border">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto">
          {query.trim() === "" ? (
            <div className="px-[18px] py-[14px]">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-[0.08em] mb-2.5">Quick links</p>
              {pages.slice(0, 5).map((p, i) => (
                <button key={p.id} onClick={() => go(p)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-[8px] text-[13px] transition-colors ${i === activeIdx ? "bg-surface-2 text-ink" : "text-ink/70 hover:bg-surface-2"}`}>
                  {typeIcon("page")}
                  <span style={{ letterSpacing: "-0.005em" }}>{p.title}</span>
                </button>
              ))}
            </div>
          ) : loading ? (
            <div className="px-4 py-10 text-center">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted">
              No results for "<span className="text-ink font-medium">{query}</span>"
            </div>
          ) : (
            <div className="px-2.5 py-2">
              {results.map((r, i) => (
                <button key={`${r.type}-${r.id}`} onClick={() => go(r)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-[8px] text-left transition-colors ${i === activeIdx ? "bg-surface-2" : "hover:bg-surface-2/50"}`}>
                  {typeIcon(r.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-ink font-medium truncate" style={{ letterSpacing: "-0.005em" }}>{r.title}</div>
                    {r.subtitle && <div className="text-[11px] text-muted truncate">{r.subtitle}</div>}
                  </div>
                  <span className="text-[10px] text-muted/50 bg-surface-2 px-1.5 py-0.5 rounded capitalize shrink-0">{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-[14px] py-2.5 border-t border-border bg-surface-2/30 flex items-center gap-4 text-[10.5px] text-muted">
          <span className="flex items-center gap-1.5"><kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border text-ink/60 font-medium">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1.5"><kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border text-ink/60 font-medium">↵</kbd> open</span>
          <span className="flex items-center gap-1.5"><kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border text-ink/60 font-medium">esc</kbd> close</span>
        </div>
      </div>
    </>
  );
}
