import { useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { CreateOrg } from "./components/CreateOrg";
import { ToastContainer } from "./components/ToastContainer";
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

  // No orgs
  if (!auth.activeOrg) {
    const canCreate = auth.user.role === "super_admin" || auth.user.role === "admin";

    if (canCreate) {
      return (
        <div className="h-screen bg-app-bg">
          <CreateOrg onCreated={() => window.location.reload()} />
        </div>
      );
    }

    return (
      <div className="flex h-screen bg-app-bg items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink mb-1">No workspace yet</h2>
          <p className="text-sm text-muted mb-6">
            You haven't been added to any organization. Ask your admin to invite you.
          </p>
          <button
            onClick={auth.logout}
            className="px-4 py-2 border border-border text-sm font-medium rounded-btn text-muted hover:text-ink hover:bg-surface-2 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <AuthenticatedApp auth={{ user: auth.user, orgs: auth.orgs, activeOrg: auth.activeOrg, switchOrg: auth.switchOrg, logout: auth.logout }} theme={theme} toggle={toggle} />;
}

function AuthenticatedApp({ auth, theme, toggle }: {
  auth: { user: NonNullable<ReturnType<typeof useAuth>["user"]>; orgs: ReturnType<typeof useAuth>["orgs"]; activeOrg: NonNullable<ReturnType<typeof useAuth>["activeOrg"]>; switchOrg: ReturnType<typeof useAuth>["switchOrg"]; logout: ReturnType<typeof useAuth>["logout"] };
  theme: "light" | "dark"; toggle: () => void;
}) {
  const notif = useNotifications();

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
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          <Routes>
            <Route path="/" element={<ApiKeysPage orgId={auth.activeOrg.id} userId={auth.user.id} />} />
            <Route path="/sticky-board" element={<StickyBoardPage orgId={auth.activeOrg.id} userId={auth.user.id} userRole={auth.user.role} />} />
            <Route path="/team" element={<TeamPage orgId={auth.activeOrg.id} />} />
            <Route path="/issues" element={<IssuesPage orgId={auth.activeOrg.id} />} />
            <Route path="/issues/:issueId" element={<IssueDetailPage orgId={auth.activeOrg.id} userId={auth.user.id} />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/organizations" element={
              <OrganizationsPage orgs={auth.orgs} activeOrg={auth.activeOrg} onSwitchOrg={auth.switchOrg} />
            } />
            <Route path="/all-users" element={<AllUsersPage />} />
            <Route path="/settings" element={<SettingsPage user={auth.user} theme={theme} onToggleTheme={toggle} />} />
            <Route path="/help" element={<HelpPage />} />
          </Routes>
        </main>

        {/* Toast notifications */}
        <ToastContainer toasts={notif.toasts} onDismiss={notif.dismissToast} />
      </div>
    </BrowserRouter>
  );
}

export default App;
