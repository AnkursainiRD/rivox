import { useCallback, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { ToastContainer } from "./components/ToastContainer";
import { api } from "./lib/api";
import rivoxMark from "./assets/rivox-mark.svg";
import { AISideRail, AICommandPalette } from "./components/AIChat";
import { useTheme } from "./hooks/useTheme";
import { useAuth } from "./hooks/useAuth";
import { useNotifications } from "./hooks/useNotifications";
import { LoginPage } from "./pages/Login";
import { AuthCallback } from "./pages/AuthCallback";
import { ApiKeysPage } from "./pages/ApiKeys";
import { StickyBoardPage } from "./pages/StickyBoard";
import { TeamPage } from "./pages/Team";
import { IssuesPage, IssueDetailPage } from "./pages/Issues";
import { NotificationsPage } from "./pages/Notifications";
import { OrganizationsPage } from "./pages/Organizations";
import { AllUsersPage } from "./pages/AllUsers";
import { RbacPage } from "./pages/Rbac";
import { SettingsPage } from "./pages/Settings";
import { HelpPage } from "./pages/Help";

function App() {
  const { theme, toggle } = useTheme();
  const auth = useAuth();

  const handleTokenFound = useCallback(() => {
    window.location.reload();
  }, []);

  if (window.location.pathname === "/auth/callback") {
    return <AuthCallback />;
  }

  if (auth.loading) {
    return (
      <div className="flex h-screen bg-app-bg items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!auth.user) {
    return (
      <LoginPage
        theme={theme}
        onToggleTheme={toggle}
        onTokenFound={handleTokenFound}
      />
    );
  }

  // No orgs or no active org — show workspace picker (handles both states)
  if (!auth.activeOrg) {
    return <WorkspacePicker auth={auth} />;
  }

  return <AuthenticatedApp auth={{ user: auth.user, orgs: auth.orgs, activeOrg: auth.activeOrg, switchOrg: auth.switchOrg, logout: auth.logout }} theme={theme} toggle={toggle} />;
}

function AuthenticatedApp({ auth, theme, toggle }: {
  auth: { user: NonNullable<ReturnType<typeof useAuth>["user"]>; orgs: ReturnType<typeof useAuth>["orgs"]; activeOrg: NonNullable<ReturnType<typeof useAuth>["activeOrg"]>; switchOrg: ReturnType<typeof useAuth>["switchOrg"]; logout: ReturnType<typeof useAuth>["logout"] };
  theme: "light" | "dark"; toggle: () => void;
}) {
  const notif = useNotifications();
  const [chatOpen, setChatOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘J shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handlePaletteSend = (text: string) => {
    setChatOpen(true);
    // Small delay so the side rail mounts first
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("rivox-ai-send", { detail: text }));
    }, 100);
  };

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-app-bg overflow-hidden">
        <Sidebar
          theme={theme}
          onToggleTheme={toggle}
          user={auth.user}
          orgs={auth.orgs}
          activeOrg={auth.activeOrg}
          onSwitchOrg={auth.switchOrg}
          onLogout={auth.logout}
          unreadCount={notif.unreadCount}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-16 md:pt-6">
          <Routes>
            <Route path="/" element={<ApiKeysPage orgId={auth.activeOrg.id} userId={auth.user.id} />} />
            <Route path="/sticky-board" element={<StickyBoardPage orgId={auth.activeOrg.id} userId={auth.user.id} userRole={auth.user.role} />} />
            <Route path="/team" element={<TeamPage orgId={auth.activeOrg.id} userId={auth.user.id} />} />
            <Route path="/issues" element={<IssuesPage orgId={auth.activeOrg.id} />} />
            <Route path="/issues/:issueId" element={<IssueDetailPage orgId={auth.activeOrg.id} userId={auth.user.id} />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/organizations" element={
              <OrganizationsPage orgs={auth.orgs} activeOrg={auth.activeOrg} onSwitchOrg={auth.switchOrg} />
            } />
            <Route path="/all-users" element={<AllUsersPage />} />
            <Route path="/rbac" element={<RbacPage orgId={auth.activeOrg.id} />} />
            <Route path="/settings" element={<SettingsPage user={auth.user} theme={theme} onToggleTheme={toggle} />} />
            <Route path="/help" element={<HelpPage />} />
          </Routes>
        </main>

        {/* AI Side Rail */}
        {chatOpen && <AISideRailWrapper onClose={() => setChatOpen(false)} user={auth.user} orgId={auth.activeOrg.id} />}

        {/* Command Palette */}
        {paletteOpen && <AICommandPalette onClose={() => setPaletteOpen(false)} onSend={handlePaletteSend} />}

        {/* Toast notifications */}
        <ToastContainer toasts={notif.toasts} onDismiss={notif.dismissToast} />

        {/* AI toggle button */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-6 w-11 h-11 rounded-xl text-white shadow-lg hover:opacity-90 transition-all flex items-center justify-center z-50"
            style={{ background: "linear-gradient(135deg, #7c7cf0, #a5a5ff)", boxShadow: "0 8px 20px -4px rgba(124,124,240,0.5)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" fill="#fff" />
              <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z" fill="#fff" opacity="0.65" />
            </svg>
          </button>
        )}
      </div>
    </BrowserRouter>
  );
}


function AISideRailWrapper({ onClose, user, orgId }: { onClose: () => void; user: { display_name: string | null; username: string }; orgId: string }) {
  const navigate = useNavigate();
  return <AISideRail onClose={onClose} onNavigate={(path) => navigate(path)} userName={user.display_name || user.username} orgId={orgId} />;
}

/* ══════════════════════════════════════════════════════════════════════════
   JOIN ORG CARD — shared between split and centered layouts
   ══════════════════════════════════════════════════════════════════════════ */

const AVATAR_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

function JoinOrgCard({ org, color, joining, onJoin, showKeys }: {
  org: DiscoverOrg; color: string; joining: boolean; onJoin: () => void; showKeys: boolean;
}) {
  const memberCount = Number(org.member_count) || 0;
  const keyCount = Number(org.key_count) || 0;
  const previews = org.members_preview || [];

  return (
    <div className="flex items-center gap-[14px] w-full px-4 py-[14px] text-left">
      <div className="w-[46px] h-[46px] rounded-[11px] flex items-center justify-center text-white font-semibold text-[18px] shrink-0" style={{ background: color, boxShadow: `0 4px 14px ${color}40` }}>
        {org.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[15px] font-semibold text-ink truncate" style={{ letterSpacing: "-0.01em" }}>{org.name}</span>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-muted mt-0.5">
          <span className="font-mono">@{org.slug}</span>
          <span className="text-muted/30">·</span>
          <span>{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
          {showKeys && (
            <>
              <span className="text-muted/30">·</span>
              <span>{keyCount} key{keyCount !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>
      </div>

      {/* Avatar stack */}
      {previews.length > 0 && (
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center">
            {previews.slice(0, 3).map((m, j) => (
              m.avatar_url ? (
                <img key={j} src={m.avatar_url} className="w-5 h-5 rounded-full object-cover" style={{ marginLeft: j === 0 ? 0 : -6, boxShadow: "0 0 0 2px var(--color-surface)" }} />
              ) : (
                <div key={j} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ background: AVATAR_COLORS[j % AVATAR_COLORS.length], marginLeft: j === 0 ? 0 : -6, boxShadow: "0 0 0 2px var(--color-surface)" }}>
                  {(m.display_name || "?").charAt(0).toUpperCase()}
                </div>
              )
            ))}
            {memberCount > 3 && (
              <div className="w-5 h-5 rounded-full bg-surface-2 flex items-center justify-center text-[8px] font-semibold text-muted" style={{ marginLeft: -6, boxShadow: "0 0 0 2px var(--color-surface)" }}>
                +{memberCount - 3}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={onJoin}
        disabled={joining}
        className="px-4 py-2 text-[12px] font-medium text-white bg-accent rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
      >
        {joining ? "Joining..." : "Join"}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   WORKSPACE PICKER — responsive: centered card (small) / split (large)
   ══════════════════════════════════════════════════════════════════════════ */

const ORG_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444"];

interface DiscoverOrg {
  id: string;
  name: string;
  slug: string;
  is_member: boolean;
  my_role: string | null;
  member_count: number;
  key_count: number;
  members_preview: { display_name: string; avatar_url: string | null }[];
}

function WorkspacePicker({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const user = auth.user!;
  const canCreate = user.role === "super_admin" || user.role === "admin";
  const [filter, setFilter] = useState("");
  const [allOrgs, setAllOrgs] = useState<DiscoverOrg[]>([]);
  const [joining, setJoining] = useState<string | null>(null);

  // Fetch all orgs when user has no orgs (for discovery)
  useEffect(() => {
    if (auth.orgs.length === 0) {
      api.get<DiscoverOrg[]>("/orgs").then(setAllOrgs).catch((err) => console.error("Failed to fetch orgs:", err));
    }
  }, [auth.orgs.length]);

  const handleJoin = async (orgId: string) => {
    setJoining(orgId);
    try {
      await api.post(`/orgs/${orgId}/join`);
      window.location.reload();
    } catch {
      setJoining(null);
    }
  };

  const availableOrgs = allOrgs.filter((o) => !o.is_member);

  const filtered = auth.orgs.filter((o) =>
    o.name.toLowerCase().includes(filter.toLowerCase()) ||
    o.slug.toLowerCase().includes(filter.toLowerCase())
  );

  const orgRow = (org: typeof auth.orgs[0], i: number, isFirst: boolean = false) => {
    const color = ORG_COLORS[i % ORG_COLORS.length];
    const role = org.OrgMember?.role || "member";
    const memberCount = Number(org.member_count) || 0;
    const keyCount = Number(org.key_count) || 0;
    const previews = org.members_preview || [];
    return (
      <button
        key={org.id}
        onClick={() => auth.switchOrg(org)}
        className={`flex items-center gap-[14px] w-full px-4 py-[14px] bg-surface border rounded-xl transition-all text-left group ${
          isFirst
            ? "border-accent/40 shadow-[0_4px_16px_-4px_rgba(124,124,240,0.18),0_1px_2px_rgba(0,0,0,0.04)]"
            : "border-border hover:border-accent/30"
        }`}
        style={isFirst ? { borderLeft: "2px solid var(--color-accent)" } : undefined}
      >
        <div className="w-[46px] h-[46px] rounded-[11px] flex items-center justify-center text-white font-semibold text-[18px] shrink-0" style={{ background: color, boxShadow: `0 4px 14px ${color}40` }}>
          {org.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[15px] font-semibold text-ink truncate" style={{ letterSpacing: "-0.01em" }}>{org.name}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted/70 bg-surface-2 px-[7px] py-px rounded shrink-0">{role.replace(/_/g, " ")}</span>
          </div>
          <div className="text-[11.5px] text-muted flex items-center gap-2 mt-0.5">
            <span className="font-mono">@{org.slug}</span>
            <span className="text-muted/30">·</span>
            <span>{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
            <span className="text-muted/30">·</span>
            <span>{keyCount} key{keyCount !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Avatar stack */}
        {previews.length > 0 && (
          <div className="flex items-center shrink-0">
            {previews.slice(0, 3).map((m, j) => (
              m.avatar_url ? (
                <img key={j} src={m.avatar_url} className="w-5 h-5 rounded-full object-cover" style={{ marginLeft: j === 0 ? 0 : -6, boxShadow: "0 0 0 2px var(--color-surface)" }} />
              ) : (
                <div key={j} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ background: AVATAR_COLORS[j % AVATAR_COLORS.length], marginLeft: j === 0 ? 0 : -6, boxShadow: "0 0 0 2px var(--color-surface)" }}>
                  {(m.display_name || "?").charAt(0).toUpperCase()}
                </div>
              )
            ))}
            {memberCount > 3 && (
              <div className="w-5 h-5 rounded-full bg-surface-2 flex items-center justify-center text-[8px] font-semibold text-muted" style={{ marginLeft: -6, boxShadow: "0 0 0 2px var(--color-surface)" }}>
                +{memberCount - 3}
              </div>
            )}
          </div>
        )}

        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 ${isFirst ? "text-accent" : "text-muted/25 group-hover:text-accent"} transition-colors`} viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  };

  /* ── Large screen: split layout (Design B) ── */
  const splitLayout = (
    <div className="hidden lg:flex h-screen">
      {/* Left dark panel */}
      <div className="w-[400px] shrink-0 text-white flex flex-col p-8 relative overflow-hidden bg-[#08080c]">
        {/* Primary indigo glow — upper area */}
        <div className="absolute top-[10%] left-[30%] w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(80,80,200,0.22) 0%, rgba(60,60,180,0.08) 40%, transparent 65%)" }} />
        {/* Secondary blue-purple accent */}
        <div className="absolute top-[5%] right-[10%] w-[250px] h-[250px] rounded-full" style={{ background: "radial-gradient(circle, rgba(120,100,255,0.12) 0%, transparent 55%)" }} />
        {/* Deep bottom warmth */}
        <div className="absolute bottom-[20%] left-[20%] w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(60,50,140,0.08) 0%, transparent 60%)" }} />

        {/* Top spacer */}
        <div className="relative z-10" />

        {/* Name — vertically centered */}
        <div className="relative z-10 flex-1 flex flex-col justify-center -mt-8">
          <h1 className="text-[52px] tracking-tight leading-none mb-4" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontWeight: 400, color: "#A5A5FF" }}>
            {user.display_name || user.username}
          </h1>
          <p className="text-[14px] leading-relaxed text-white/40 max-w-[280px]">
            {auth.orgs.length > 0 ? (
              <>You have <span className="text-white/70 font-medium">{auth.orgs.length} workspace{auth.orgs.length !== 1 ? "s" : ""}</span> linked to your account. Pick one to continue.</>
            ) : (
              <>You're not in any workspace yet. Join one with an invite link to get started.</>
            )}
          </p>
        </div>

        {/* User card bottom */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.05] rounded-lg">
            {user.avatar_url ? (
              <img src={user.avatar_url} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-[11px] font-bold">
                {(user.display_name || user.username).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono text-white/40 truncate">{user.email}</div>
            </div>
          </div>

          {/* Version */}
          <div className="mt-6 flex items-center gap-2 text-[11px] text-white/25 font-mono">
            <span>v0.1.0</span>
            <span>·</span>
            <span className="hover:text-white/40 cursor-pointer transition-colors">What's new ↗</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-white dark:bg-app-bg flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto px-10 py-10 max-w-[680px] w-full">
          {/* Header + search */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-1">Choose a workspace</div>
              <h2 className="text-[28px] font-semibold text-ink tracking-tight">{auth.orgs.length > 0 ? "Where to today?" : "No workspace yet"}</h2>
            </div>
            {auth.orgs.length > 0 && (
              <div className="relative mt-2">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
                </svg>
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter workspaces"
                  className="w-[220px] pl-9 pr-10 py-2 text-[13px] text-ink bg-surface border border-border rounded-xl outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-muted/40 transition-colors"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted/30 bg-surface-2 border border-border px-1.5 py-0.5 rounded">⌘K</kbd>
              </div>
            )}
          </div>

          {auth.orgs.length > 0 ? (
            <>
              {/* RECENT label with line */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">Recent</span>
                <span className="flex-1 h-px bg-border" />
              </div>

              {/* Org list — each card separate */}
              <div className="space-y-2">
                {filtered.map((org, i) => orgRow(org, i, i === 0))}
              </div>
            </>
          ) : (
            <>
              {/* Available orgs to join */}
              {availableOrgs.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">Available workspaces</span>
                    <span className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-2">
                    {availableOrgs.map((org, i) => (
                      <div key={org.id} className="bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/30 transition-colors">
                        <JoinOrgCard org={org} color={ORG_COLORS[i % ORG_COLORS.length]} joining={joining === org.id} onJoin={() => handleJoin(org.id)} showKeys={canCreate} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-surface border border-border rounded-2xl p-8 text-center mt-2">
                  <div className="w-14 h-14 rounded-2xl bg-accent-soft flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-medium text-ink mb-1">No workspaces available</p>
                  <p className="text-[12.5px] text-muted">Ask your admin to create one and invite you.</p>
                </div>
              )}
            </>
          )}

          {/* New workspace */}
          {canCreate && (
            <div className="mt-2 border border-dashed border-border/80 rounded-xl overflow-hidden">
              <div className="flex items-center gap-[14px] px-4 py-[14px]">
                <div className="w-[46px] h-[46px] rounded-[11px] border border-dashed border-border/80 flex items-center justify-center text-muted shrink-0">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-medium text-ink" style={{ letterSpacing: "-0.005em" }}>New workspace</div>
                  <div className="text-[11.5px] text-muted mt-0.5">Start a clean workspace for a team, side project or client.</div>
                </div>
                <button className="px-3 py-1.5 text-[12px] font-medium text-ink border border-border rounded-lg hover:bg-surface-2 transition-colors flex items-center gap-1.5 shrink-0">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                  Create
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center gap-2 px-[14px] py-[10px] bg-surface-2/50 border border-border rounded-[10px] text-[12px] text-muted" style={{ letterSpacing: "-0.005em" }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" /></svg>
            Have an invite link? <span className="text-accent font-medium cursor-pointer hover:underline">Paste it here</span>
            <div className="flex-1" />
            <button onClick={auth.logout} className="text-[12px] font-medium text-muted hover:text-ink transition-colors">Sign out</button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Small screen: centered card layout (Design A) ── */
  const centeredLayout = (
    <div className="lg:hidden flex flex-col h-screen bg-[#f6f6f4] dark:bg-app-bg">
      {/* Top nav */}
      <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-surface border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <img src={rivoxMark} alt="Rivox" className="w-7 h-7 rounded-lg" />
          <span className="text-[14px] font-semibold text-ink tracking-tight">rivox</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[12px] text-muted font-mono">{user.email}</span>
          <button onClick={auth.logout} className="text-[12px] font-semibold text-muted hover:text-ink transition-colors">Sign out</button>
        </div>
      </div>

      {/* Centered content */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center pt-16 pb-8 px-4">
        <div className="w-full max-w-[520px]">
          {/* Logo + Welcome */}
          <div className="text-center mb-8">
            <img src={rivoxMark} alt="Rivox" className="w-[60px] h-[60px] rounded-2xl mx-auto mb-5 shadow-lg" />
            <h2 className="text-[24px] font-semibold text-ink tracking-tight">
              Welcome back, <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontWeight: 400, color: "#A5A5FF" }}>{user.display_name || user.username}</span>
            </h2>
            <p className="text-[13px] text-muted mt-1.5">Choose a workspace to pick up where you left off.</p>
          </div>

          {auth.orgs.length > 0 ? (
            <>
              {/* Org list card */}
              <div className="bg-white dark:bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Your workspaces · {auth.orgs.length}</span>
                </div>
                <div className="divide-y divide-border">
                  {filtered.map((org, i) => orgRow(org, i))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-4">
                {canCreate && (
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-medium text-ink bg-white dark:bg-surface border border-border rounded-2xl hover:bg-surface-2 transition-colors shadow-sm">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                    New workspace
                  </button>
                )}
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-medium text-ink bg-white dark:bg-surface border border-border rounded-2xl hover:bg-surface-2 transition-colors shadow-sm">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" /></svg>
                  Join with invite
                </button>
              </div>
            </>
          ) : (
            <>
              {availableOrgs.length > 0 ? (
                <div className="bg-white dark:bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Available workspaces · {availableOrgs.length}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {availableOrgs.map((org, i) => (
                      <JoinOrgCard key={org.id} org={org} color={ORG_COLORS[i % ORG_COLORS.length]} joining={joining === org.id} onJoin={() => handleJoin(org.id)} showKeys={canCreate} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-surface border border-border rounded-2xl p-8 text-center shadow-sm">
                  <p className="text-[14px] font-medium text-ink mb-1">No workspaces available</p>
                  <p className="text-[12.5px] text-muted">Ask your admin to create one and invite you.</p>
                </div>
              )}
            </>
          )}

          {/* Help link */}
          <div className="text-center mt-6">
            <span className="text-[12px] text-muted">Need help? </span>
            <span className="text-[12px] text-accent font-medium cursor-pointer hover:underline">Contact your admin →</span>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="shrink-0 px-5 py-2.5 border-t border-border bg-white dark:bg-surface flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-[11px] text-muted font-mono">v0.1.0 · all systems operational</span>
      </div>
    </div>
  );

  return (
    <>
      {splitLayout}
      {centeredLayout}
    </>
  );
}

export default App;
