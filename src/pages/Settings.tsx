import { useState, useEffect } from "react";
import {
  User as UserIcon, Bell, Palette, Lock,
  Save, ChevronRight, Keyboard,
  Moon, Sun, CheckCircle, Globe, Monitor, Trash2,
} from "lucide-react";
import { api } from "../lib/api";
import type { User } from "../hooks/useAuth";

interface NotifPref {
  type: string;
  in_app: boolean;
  discord_dm: boolean;
}

const notifTypes = [
  { type: "key_shared", label: "Key shared with you" },
  { type: "key_revoked", label: "Key revoked" },
  { type: "issue_assigned", label: "Issue assigned to you" },
  { type: "issue_commented", label: "Comment on your issue" },
  { type: "issue_resolved", label: "Issue resolved" },
  { type: "task_assigned", label: "Task assigned to you" },
  { type: "group_added", label: "Added to a team" },
  { type: "mention", label: "Mentioned in a comment" },
];

type Tab = "profile" | "security" | "notifications" | "appearance" | "keyboard" | "integrations";

const sidebarSections: { title: string; items: { key: Tab; label: string; icon: typeof UserIcon; dot?: boolean }[] }[] = [
  {
    title: "Account",
    items: [
      { key: "profile", label: "Profile", icon: UserIcon },
      { key: "security", label: "Security", icon: Lock },
      { key: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Workspace",
    items: [
      { key: "appearance", label: "Appearance", icon: Palette },
      { key: "keyboard", label: "Keyboard", icon: Keyboard },
      { key: "integrations", label: "Integrations", icon: Globe },
    ],
  },
];

export function SettingsPage({ user, theme, onToggleTheme }: {
  user: User; theme: "light" | "dark"; onToggleTheme: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const tabLabels: Record<Tab, string> = {
    profile: "Profile", security: "Security", notifications: "Notifications", integrations: "Integrations",
    appearance: "Appearance", keyboard: "Keyboard",
  };

  return (
    <div className="flex flex-col h-full -mx-6 -mt-6 -mb-6 overflow-hidden">
      {/* Breadcrumb header */}
      <div className="px-6 py-2.5 bg-surface border-b border-border flex items-center gap-2 text-[12.5px] text-muted shrink-0">
        <span>Settings</span>
        <ChevronRight size={12} className="text-muted/40" />
        <span className="text-ink font-medium">{tabLabels[activeTab]}</span>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Settings sidebar */}
        <div className="w-[220px] shrink-0 border-r border-border bg-surface overflow-y-auto py-3 px-3">
          {sidebarSections.map((section) => (
            <div key={section.title} className="mb-4">
              <div className="text-[10px] font-bold text-muted uppercase tracking-[0.08em] px-2.5 mb-1.5">{section.title}</div>
              {section.items.map((item) => (
                <button key={item.key} onClick={() => setActiveTab(item.key)}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    activeTab === item.key ? "bg-accent-soft text-accent" : "text-ink/70 hover:bg-surface-2 hover:text-ink"
                  }`}>
                  <item.icon size={15} />
                  {item.label}
                  {item.dot && <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-auto" />}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-surface-2/20">
          {activeTab === "profile" && <ProfileTab user={user} />}
          {activeTab === "security" && <SecurityTab user={user} />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "appearance" && <AppearanceTab theme={theme} onToggle={onToggleTheme} />}
          {activeTab === "keyboard" && <KeyboardTab />}
          {activeTab === "integrations" && <IntegrationsTab user={user} />}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PROFILE TAB
   ══════════════════════════════════════════════════════════════════════════ */

function ProfileTab({ user }: { user: User }) {
  const [displayName, setDisplayName] = useState(user.display_name || "");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleSave = async () => {
    try {
      await api.patch("/users/me", { display_name: displayName });
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-3xl mx-auto px-10 py-8">
      <h2 className="text-[17px] font-semibold text-ink tracking-tight mb-0.5">Profile</h2>
      <p className="text-[13px] text-muted mb-6">How you appear to your team in Rivox.</p>

      {/* Cover + Avatar */}
      <div className="mb-8 rounded-xl overflow-hidden border border-border">
        {/* Cover photo */}
        <div className="h-36 relative" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #2d2b55 70%, #3d3b6b 100%)" }}>
          <button className="absolute top-3 right-3 px-2.5 py-1.5 bg-white/20 backdrop-blur-sm text-white text-[11px] font-medium rounded-lg hover:bg-white/30 transition-colors flex items-center gap-1.5">
            <Palette size={11} /> Change cover
          </button>
        </div>

        {/* Profile row */}
        <div className="px-6 pb-5 pt-3 -mt-10 flex items-end gap-5">
          <div className="relative">
            {user.avatar_url ? (
              <img src={user.avatar_url} className="w-20 h-20 rounded-full object-cover ring-4 ring-surface" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-surface">
                {(user.display_name || user.username).slice(0, 1).toUpperCase()}
              </div>
            )}
            <button className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-surface border border-border shadow-sm flex items-center justify-center text-muted hover:text-ink transition-colors">
              <span className="text-[13px] leading-none">+</span>
            </button>
          </div>
          <div className="pb-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-semibold text-ink">{user.display_name || user.username}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-soft text-accent">{user.role.replace(/_/g, " ")}</span>
            </div>
            <p className="text-[12px] text-muted">@{user.username} · {user.email}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-surface border border-border rounded-xl px-8 py-6">
        <h3 className="text-[15px] font-semibold text-ink mb-0.5">Public profile</h3>
        <p className="text-[12.5px] text-muted mb-6">Shown next to your comments, sticky notes and key shares.</p>

        <div className="space-y-5">
          {/* Display name */}
          <SettingsField label="Display name" desc="Up to 32 characters. Shown across the product.">
            <input value={displayName} onChange={(e) => { setDisplayName(e.target.value); setDirty(true); }}
              maxLength={32}
              className="w-full px-3 py-2.5 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors" />
          </SettingsField>

          {/* Username */}
          <SettingsField label="Username" desc="Used for @mentions. Must be unique." badge="@">
            <div className="flex items-center gap-0 bg-surface border border-border rounded-lg overflow-hidden">
              <span className="pl-3 pr-1 text-[13px] text-muted/50">@</span>
              <input value={user.username} readOnly
                className="flex-1 px-1 py-2.5 text-[13px] text-muted bg-transparent outline-none" />
            </div>
          </SettingsField>

          {/* Email */}
          <SettingsField label="Email" desc="Managed via your Discord account.">
            <div className="px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-[13px] text-muted">
              {user.email}
            </div>
          </SettingsField>
        </div>
      </div>

      {/* Save bar */}
      {dirty && (
        <div className="fixed bottom-0 left-[220px] right-0 z-40 px-8 py-3 bg-surface border-t border-border flex items-center gap-3">
          <span className="flex items-center gap-2 text-[12px] text-muted">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Unsaved changes
          </span>
          <div className="flex-1" />
          <button onClick={() => { setDisplayName(user.display_name || ""); setDirty(false); }}
            className="px-4 py-2 text-[12.5px] font-medium text-muted hover:text-ink transition-colors">
            Discard
          </button>
          <button onClick={handleSave}
            className={`px-4 py-2 text-[12.5px] font-medium rounded-lg flex items-center gap-1.5 transition-all ${
              saved ? "bg-green-50 text-green-700 border border-green-200" : "bg-ink text-surface hover:opacity-90"
            }`}>
            {saved ? <><CheckCircle size={13} /> Saved</> : <><Save size={13} /> Save changes</>}
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECURITY TAB
   ══════════════════════════════════════════════════════════════════════════ */

function SecurityTab({ user }: { user: User }) {
  return (
    <div className="max-w-3xl mx-auto px-10 py-8">
      <h2 className="text-[17px] font-semibold text-ink tracking-tight mb-0.5">Security</h2>
      <p className="text-[13px] text-muted mb-6">Authentication and session management.</p>

      <div className="space-y-4">
        {/* Auth method */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center shrink-0">
              <Globe size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-ink mb-0.5">Discord OAuth</div>
              <div className="text-[12.5px] text-muted leading-relaxed">
                Signed in via Discord. ID: <code className="text-[11px] bg-surface-2 px-1.5 py-0.5 rounded font-mono">{user.discord_id || "—"}</code>
              </div>
            </div>
            <span className="text-[11px] font-medium text-green-600 bg-surface-2 px-2.5 py-1 rounded-full shrink-0">Connected</span>
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center shrink-0">
              <Monitor size={18} className="text-muted" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-ink mb-0.5">Active sessions</div>
              <div className="text-[12.5px] text-muted">JWT tokens expire after 7 days of inactivity.</div>
            </div>
          </div>
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Monitor size={14} className="text-muted" />
              <span className="text-[12.5px] text-ink font-medium">This device</span>
              <span className="text-[10px] text-green-600 bg-surface-2 px-1.5 py-0.5 rounded-full">Active now</span>
            </div>
            <button className="text-[12px] text-red-600 hover:text-red-700 font-medium">Sign out all</button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-surface border border-red-200 dark:border-red-900/50 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center shrink-0">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-red-600 mb-0.5">Delete account</div>
              <div className="text-[12.5px] text-muted leading-relaxed mb-3">
                Permanently remove your account and all data. This cannot be undone.
              </div>
              <button className="px-3.5 py-2 text-[12.5px] font-medium text-red-600 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                Delete my account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS TAB
   ══════════════════════════════════════════════════════════════════════════ */

function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotifPref[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<NotifPref[]>("/notifications/preferences").then(setPrefs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const getPref = (type: string) => prefs.find((p) => p.type === type) || { type, in_app: true, discord_dm: true };

  const togglePref = async (type: string, field: "in_app" | "discord_dm") => {
    const current = getPref(type);
    const updated = { ...current, [field]: !current[field] };
    try {
      await api.put("/notifications/preferences", updated);
      setPrefs((prev) => {
        const exists = prev.find((p) => p.type === type);
        if (exists) return prev.map((p) => p.type === type ? updated : p);
        return [...prev, updated];
      });
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-3xl mx-auto px-10 py-8">
      <h2 className="text-[17px] font-semibold text-ink tracking-tight mb-0.5">Notifications</h2>
      <p className="text-[13px] text-muted mb-6">Choose how and when you get notified.</p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px] px-5 py-3 bg-surface-2/50 border-b border-border text-[10.5px] font-bold text-muted uppercase tracking-wider">
            <div>Event</div>
            <div className="text-center">In-app</div>
            <div className="text-center">Discord</div>
          </div>
          {notifTypes.map((nt, i) => {
            const p = getPref(nt.type);
            return (
              <div key={nt.type} className={`grid grid-cols-[1fr_80px_80px] px-5 py-3.5 items-center ${i < notifTypes.length - 1 ? "border-b border-border" : ""}`}>
                <span className="text-[13px] text-ink">{nt.label}</span>
                <div className="flex justify-center"><Checkbox checked={p.in_app} onChange={() => togglePref(nt.type, "in_app")} /></div>
                <div className="flex justify-center"><Checkbox checked={p.discord_dm} onChange={() => togglePref(nt.type, "discord_dm")} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   APPEARANCE TAB
   ══════════════════════════════════════════════════════════════════════════ */

function AppearanceTab({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  const accentColors = [
    { name: "Default", value: "#5b5bd6", soft: "#eeeefb" },
    { name: "Blue", value: "#3b82f6", soft: "#dbeafe" },
    { name: "Emerald", value: "#10b981", soft: "#dcfce7" },
    { name: "Rose", value: "#f43f5e", soft: "#ffe4e6" },
    { name: "Amber", value: "#f59e0b", soft: "#fef3c7" },
    { name: "Purple", value: "#8b5cf6", soft: "#ede9fe" },
    { name: "Cyan", value: "#06b6d4", soft: "#cffafe" },
    { name: "Pink", value: "#ec4899", soft: "#fce7f3" },
  ];

  const [activeAccent, setActiveAccent] = useState(
    () => getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() || "#5b5bd6"
  );

  const [fontSize, setFontSize] = useState(
    () => localStorage.getItem("rivox-font-size") || "default"
  );

  const [sidebarDensity, setSidebarDensity] = useState(
    () => localStorage.getItem("rivox-sidebar-density") || "default"
  );

  const [borderRadius, setBorderRadius] = useState(
    () => localStorage.getItem("rivox-radius") || "default"
  );

  const applyAccent = (color: string, soft: string) => {
    document.documentElement.style.setProperty("--color-accent", color);
    document.documentElement.style.setProperty("--color-accent-soft", soft);
    localStorage.setItem("rivox-accent", color);
    localStorage.setItem("rivox-accent-soft", soft);
    setActiveAccent(color);
  };

  const applyFontSize = (size: string) => {
    const root = document.documentElement;
    root.classList.remove("text-sm", "text-base", "text-lg");
    if (size === "compact") root.style.fontSize = "14px";
    else if (size === "large") root.style.fontSize = "16.5px";
    else root.style.fontSize = "";
    localStorage.setItem("rivox-font-size", size);
    setFontSize(size);
  };

  const applySidebarDensity = (density: string) => {
    localStorage.setItem("rivox-sidebar-density", density);
    setSidebarDensity(density);
  };

  const applyBorderRadius = (radius: string) => {
    const root = document.documentElement;
    if (radius === "sharp") root.style.setProperty("--radius-card", "6px");
    else if (radius === "round") root.style.setProperty("--radius-card", "16px");
    else root.style.removeProperty("--radius-card");
    localStorage.setItem("rivox-radius", radius);
    setBorderRadius(radius);
  };

  return (
    <div className="max-w-3xl mx-auto px-10 py-8">
      <h2 className="text-[17px] font-semibold text-ink tracking-tight mb-0.5">Appearance</h2>
      <p className="text-[13px] text-muted mb-6">Customize the look and feel of Rivox.</p>

      {/* Theme */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-4">
        <h3 className="text-[13px] font-semibold text-ink mb-4">Theme</h3>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => { if (theme === "dark") onToggle(); }}
            className={`p-4 rounded-xl border-2 transition-all ${theme === "light" ? "border-accent" : "border-border hover:border-accent/30"}`}>
            <div className="w-full h-24 rounded-lg bg-white border border-zinc-200 mb-3 flex items-end p-2.5 gap-2">
              <div className="w-10 h-full rounded bg-zinc-50 border border-zinc-100" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-2 rounded bg-zinc-200 w-3/4" />
                <div className="h-2 rounded bg-zinc-100 w-1/2" />
                <div className="h-2 rounded bg-zinc-100 w-2/3" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sun size={14} className={theme === "light" ? "text-accent" : "text-muted"} />
              <span className={`text-[13px] font-medium ${theme === "light" ? "text-ink" : "text-muted"}`}>Light</span>
              {theme === "light" && <CheckCircle size={13} className="text-accent ml-auto" />}
            </div>
          </button>
          <button onClick={() => { if (theme === "light") onToggle(); }}
            className={`p-4 rounded-xl border-2 transition-all ${theme === "dark" ? "border-accent" : "border-border hover:border-accent/30"}`}>
            <div className="w-full h-24 rounded-lg bg-zinc-900 border border-zinc-700 mb-3 flex items-end p-2.5 gap-2">
              <div className="w-10 h-full rounded bg-zinc-800 border border-zinc-700" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-2 rounded bg-zinc-700 w-3/4" />
                <div className="h-2 rounded bg-zinc-800 w-1/2" />
                <div className="h-2 rounded bg-zinc-800 w-2/3" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Moon size={14} className={theme === "dark" ? "text-accent" : "text-muted"} />
              <span className={`text-[13px] font-medium ${theme === "dark" ? "text-ink" : "text-muted"}`}>Dark</span>
              {theme === "dark" && <CheckCircle size={13} className="text-accent ml-auto" />}
            </div>
          </button>
        </div>
      </div>

      {/* Accent Color */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-4">
        <h3 className="text-[13px] font-semibold text-ink mb-1">Accent color</h3>
        <p className="text-[12px] text-muted mb-4">Applied to buttons, links, badges, and focus rings.</p>
        <div className="flex flex-wrap gap-2.5">
          {accentColors.map((c) => (
            <button key={c.value} onClick={() => applyAccent(c.value, c.soft)}
              className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${activeAccent === c.value ? "border-ink scale-110" : "border-transparent hover:scale-105"}`}
              style={{ background: c.value }}
              title={c.name}
            >
              {activeAccent === c.value && (
                <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-4">
        <h3 className="text-[13px] font-semibold text-ink mb-1">Interface scale</h3>
        <p className="text-[12px] text-muted mb-4">Adjust the overall text and element size.</p>
        <div className="inline-flex bg-surface-2 border border-border rounded-lg p-0.5">
          {[
            { key: "compact", label: "Compact", size: "text-[11px]" },
            { key: "default", label: "Default", size: "text-[13px]" },
            { key: "large", label: "Large", size: "text-[15px]" },
          ].map((opt) => (
            <button key={opt.key} onClick={() => applyFontSize(opt.key)}
              className={`px-4 py-2 rounded-md text-[12.5px] font-medium transition-all ${fontSize === opt.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              <span className={opt.size}>A</span>
              <span className="ml-1.5">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar Density */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-4">
        <h3 className="text-[13px] font-semibold text-ink mb-1">Sidebar density</h3>
        <p className="text-[12px] text-muted mb-4">Control spacing between sidebar items.</p>
        <div className="inline-flex bg-surface-2 border border-border rounded-lg p-0.5">
          {[
            { key: "compact", label: "Compact" },
            { key: "default", label: "Default" },
            { key: "spacious", label: "Spacious" },
          ].map((opt) => (
            <button key={opt.key} onClick={() => applySidebarDensity(opt.key)}
              className={`px-4 py-2 rounded-md text-[12.5px] font-medium transition-all ${sidebarDensity === opt.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-[13px] font-semibold text-ink mb-1">Corner radius</h3>
        <p className="text-[12px] text-muted mb-4">Card and button roundness.</p>
        <div className="inline-flex bg-surface-2 border border-border rounded-lg p-0.5">
          {[
            { key: "sharp", label: "Sharp", preview: "rounded" },
            { key: "default", label: "Default", preview: "rounded-lg" },
            { key: "round", label: "Round", preview: "rounded-2xl" },
          ].map((opt) => (
            <button key={opt.key} onClick={() => applyBorderRadius(opt.key)}
              className={`px-4 py-2 rounded-md text-[12.5px] font-medium transition-all flex items-center gap-2 ${borderRadius === opt.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              <div className={`w-5 h-5 border-2 border-current ${opt.preview}`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   KEYBOARD TAB
   ══════════════════════════════════════════════════════════════════════════ */

const shortcuts = [
  { keys: ["⌘", "K"], label: "Open global search" },
  { keys: ["C"], label: "Create new issue" },
  { keys: ["Esc"], label: "Close drawer or modal" },
  { keys: ["↑", "↓"], label: "Navigate search results" },
  { keys: ["Enter"], label: "Open selected result" },
];

function KeyboardTab() {
  return (
    <div className="max-w-3xl mx-auto px-10 py-8">
      <h2 className="text-[17px] font-semibold text-ink tracking-tight mb-0.5">Keyboard shortcuts</h2>
      <p className="text-[13px] text-muted mb-6">Navigate Rivox faster with these shortcuts.</p>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {shortcuts.map((s, i) => (
          <div key={i} className={`flex items-center justify-between px-5 py-3.5 ${i < shortcuts.length - 1 ? "border-b border-border" : ""}`}>
            <span className="text-[13px] text-ink">{s.label}</span>
            <div className="flex items-center gap-1">
              {s.keys.map((k, j) => (
                <span key={j} className="flex items-center">
                  <kbd className="px-2 py-0.5 text-[11px] font-mono font-medium bg-surface-2 border border-border rounded text-ink/80 min-w-[24px] text-center">{k}</kbd>
                  {j < s.keys.length - 1 && <span className="text-[9px] text-muted/40 mx-0.5">+</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Shared components ── */

/* ══════════════════════════════════════════════════════════════════════════
   INTEGRATIONS TAB
   ══════════════════════════════════════════════════════════════════════════ */

function IntegrationsTab({ user }: { user: User }) {
  const [botStatus, setBotStatus] = useState<"loading" | "connected" | "not_connected">("loading");
  const [channelId, setChannelId] = useState("");
  const [savedChannelId, setSavedChannelId] = useState("");
  const [testResult, setTestResult] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => {
    api.get<{ bot_connected: boolean; channel_id: string | null }>("/integrations/discord/status")
      .then((data) => {
        setBotStatus(data.bot_connected ? "connected" : "not_connected");
        if (data.channel_id) { setChannelId(data.channel_id); setSavedChannelId(data.channel_id); }
      })
      .catch(() => setBotStatus("not_connected"));
  }, []);

  const saveChannel = async () => {
    if (!channelId.trim()) return;
    await api.post("/integrations/discord/channel", { channel_id: channelId.trim() });
    setSavedChannelId(channelId.trim());
  };

  const testChannel = async () => {
    setTestResult("sending");
    try {
      await api.post("/integrations/discord/test");
      setTestResult("success");
      setTimeout(() => setTestResult("idle"), 3000);
    } catch { setTestResult("error"); setTimeout(() => setTestResult("idle"), 3000); }
  };

  const discordClientId = "1506189937664462848";
  const botInviteUrl = `https://discord.com/oauth2/authorize?client_id=${discordClientId}&permissions=84992&scope=bot`;

  return (
    <div className="max-w-3xl mx-auto px-10 py-8">
      <h2 className="text-[17px] font-semibold text-ink tracking-tight mb-0.5">Integrations</h2>
      <p className="text-[13px] text-muted mb-6">Connect external services to enhance your workflow.</p>

      <div className="space-y-4">
        {/* Discord Bot */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#5865F2" }}>
                <svg width="24" height="18" viewBox="0 0 71 55" fill="white">
                  <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.7 40.7 0 00-1.8 3.7 54 54 0 00-16.2 0A37.2 37.2 0 0025.4.3a.2.2 0 00-.2-.1 58.4 58.4 0 00-14.7 4.6.2.2 0 00-.1 0A59.7 59.7 0 00.3 43.5a.2.2 0 000 .2A58.8 58.8 0 0018 54.8a.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.7.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.8 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .3 36.4 36.4 0 01-5.5 2.7.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1A58.6 58.6 0 0070.7 43.7a.2.2 0 000-.2A59.1 59.1 0 0060.2 5a.2.2 0 00-.1 0zM23.7 35.7c-3.3 0-6.1-3.1-6.1-6.8s2.7-6.9 6.1-6.9 6.2 3.1 6.1 6.9c0 3.7-2.7 6.8-6.1 6.8zm22.6 0c-3.4 0-6.1-3.1-6.1-6.8s2.7-6.9 6.1-6.9 6.2 3.1 6.1 6.9c0 3.7-2.7 6.8-6.1 6.8z"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[15px] font-semibold text-ink">Discord Bot</h3>
                  {botStatus === "connected" ? (
                    <span className="text-[10px] font-medium text-green-600 bg-surface-2 px-2 py-0.5 rounded-full">Connected</span>
                  ) : botStatus === "not_connected" ? (
                    <span className="text-[10px] font-medium text-muted bg-surface-2 px-2 py-0.5 rounded-full">Not installed</span>
                  ) : null}
                </div>
                <p className="text-[12.5px] text-muted leading-relaxed mb-4">
                  Install the Rivox bot in your Discord server to receive real-time notifications as DMs.
                  When enabled, team members get instant alerts for issue assignments, key shares, comments, and status changes.
                </p>

                {/* Features */}
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {[
                    { icon: Bell, label: "DM notifications", desc: "Get notified instantly via Discord DM" },
                    { icon: UserIcon, label: "Issue assignments", desc: "Know when you're assigned an issue" },
                    { icon: Lock, label: "Key alerts", desc: "Key shared, revoked, or rotated" },
                    { icon: Bell, label: "Comment mentions", desc: "When someone @mentions you" },
                  ].map((f) => (
                    <div key={f.label} className="flex items-start gap-2.5 px-3 py-2.5 bg-surface-2/50 rounded-lg">
                      <f.icon size={13} className="text-muted mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[11.5px] font-medium text-ink">{f.label}</div>
                        <div className="text-[10.5px] text-muted">{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  {botStatus === "connected" ? (
                    <>
                      <div className="flex items-center gap-2 text-[12.5px] text-green-600">
                        <CheckCircle size={14} />
                        <span className="font-medium">Bot is active in your server</span>
                      </div>
                      <a href={botInviteUrl} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:bg-surface-2 transition-colors">
                        Reconfigure
                      </a>
                    </>
                  ) : (
                    <>
                      <a href={botInviteUrl} target="_blank" rel="noopener noreferrer"
                        className="px-4 py-2 text-[13px] font-medium text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                        style={{ background: "#5865F2" }}>
                        <svg width="16" height="12" viewBox="0 0 71 55" fill="white">
                          <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.7 40.7 0 00-1.8 3.7 54 54 0 00-16.2 0A37.2 37.2 0 0025.4.3a.2.2 0 00-.2-.1 58.4 58.4 0 00-14.7 4.6.2.2 0 00-.1 0A59.7 59.7 0 00.3 43.5a.2.2 0 000 .2A58.8 58.8 0 0018 54.8a.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.7.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.8 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .3 36.4 36.4 0 01-5.5 2.7.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1A58.6 58.6 0 0070.7 43.7a.2.2 0 000-.2A59.1 59.1 0 0060.2 5a.2.2 0 00-.1 0zM23.7 35.7c-3.3 0-6.1-3.1-6.1-6.8s2.7-6.9 6.1-6.9 6.2 3.1 6.1 6.9c0 3.7-2.7 6.8-6.1 6.8zm22.6 0c-3.4 0-6.1-3.1-6.1-6.8s2.7-6.9 6.1-6.9 6.2 3.1 6.1 6.9c0 3.7-2.7 6.8-6.1 6.8z"/>
                        </svg>
                        Install Discord Bot
                      </a>
                      <span className="text-[11.5px] text-muted">Requires server admin permissions</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Setup steps */}
          <div className="px-6 py-4 bg-surface-2/30 border-t border-border">
            <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-3">Setup in 3 steps</div>
            <div className="flex gap-6">
              {[
                { step: "1", label: "Install bot", desc: "Click the button above to add Rivox bot to your Discord server" },
                { step: "2", label: "Link accounts", desc: "Team members sign in to Rivox via Discord OAuth to link their accounts" },
                { step: "3", label: "Get notified", desc: "Notifications are sent as DMs automatically — configure per-type in Notifications tab" },
              ].map((s) => (
                <div key={s.step} className="flex-1 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center shrink-0">{s.step}</span>
                  <div>
                    <div className="text-[12px] font-medium text-ink">{s.label}</div>
                    <div className="text-[10.5px] text-muted leading-relaxed">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Discord status */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#5865F218" }}>
              <svg width="18" height="14" viewBox="0 0 71 55" fill="#5865F2">
                <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.7 40.7 0 00-1.8 3.7 54 54 0 00-16.2 0A37.2 37.2 0 0025.4.3a.2.2 0 00-.2-.1 58.4 58.4 0 00-14.7 4.6.2.2 0 00-.1 0A59.7 59.7 0 00.3 43.5a.2.2 0 000 .2A58.8 58.8 0 0018 54.8a.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.7.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.8 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .3 36.4 36.4 0 01-5.5 2.7.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.2.1A58.6 58.6 0 0070.7 43.7a.2.2 0 000-.2A59.1 59.1 0 0060.2 5a.2.2 0 00-.1 0zM23.7 35.7c-3.3 0-6.1-3.1-6.1-6.8s2.7-6.9 6.1-6.9 6.2 3.1 6.1 6.9c0 3.7-2.7 6.8-6.1 6.8zm22.6 0c-3.4 0-6.1-3.1-6.1-6.8s2.7-6.9 6.1-6.9 6.2 3.1 6.1 6.9c0 3.7-2.7 6.8-6.1 6.8z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-ink">Your Discord account</div>
              <div className="text-[12px] text-muted">
                {user.discord_id
                  ? <>Linked · Discord ID: <code className="text-[10.5px] bg-surface-2 px-1.5 py-0.5 rounded font-mono">{user.discord_id}</code></>
                  : "Not linked — sign in via Discord to receive DM notifications"
                }
              </div>
            </div>
            {user.discord_id ? (
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-medium text-green-600 bg-surface-2 px-2.5 py-1 rounded-full">Linked</span>
                <button
                  onClick={async () => {
                    if (!confirm("Disconnect your Discord account? You won't receive DM notifications.")) return;
                    try {
                      await api.post("/auth/discord/disconnect");
                      window.location.reload();
                    } catch { /* ignore */ }
                  }}
                  className="px-3 py-1.5 text-[12px] font-medium text-red-600 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button className="px-3 py-1.5 text-[12px] font-medium text-ink border border-border rounded-lg hover:bg-surface-2 transition-colors">Link Discord</button>
            )}
          </div>
        </div>

        {/* Discord Channel Config */}
        {botStatus === "connected" && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center shrink-0">
                <Bell size={18} className="text-accent" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-medium text-ink mb-0.5">Channel notifications</div>
                <div className="text-[12.5px] text-muted leading-relaxed mb-3">
                  Post all notifications to a Discord channel so your whole team can see activity. Right-click a channel in Discord → "Copy Channel ID".
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input value={channelId} onChange={(e) => setChannelId(e.target.value)}
                    placeholder="Paste Discord channel ID..."
                    className="flex-1 px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-muted/40 font-mono" />
                  <button onClick={saveChannel} disabled={!channelId.trim() || channelId === savedChannelId}
                    className="px-3 py-2 text-[12px] font-medium bg-ink text-surface rounded-lg hover:opacity-90 disabled:opacity-30 transition-opacity">
                    Save
                  </button>
                </div>
                {savedChannelId && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-green-600 font-medium">Channel configured</span>
                    <button onClick={testChannel} disabled={testResult === "sending"}
                      className="text-[11px] text-accent hover:underline font-medium">
                      {testResult === "sending" ? "Sending..." : testResult === "success" ? "Sent! Check Discord" : testResult === "error" ? "Failed" : "Send test message"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* More integrations coming soon */}
        <div className="bg-surface border border-dashed border-border rounded-xl p-6 text-center">
          <div className="text-[13px] text-muted mb-1">More integrations coming soon</div>
          <div className="text-[11.5px] text-muted/60">Slack, GitHub, Linear, Jira, and more</div>
        </div>
      </div>
    </div>
  );
}

function SettingsField({ label, desc, badge, children }: {
  label: string; desc?: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[240px_1fr] gap-6 py-4 border-b border-border last:border-0">
      <div>
        <div className="text-[13px] font-medium text-ink flex items-center gap-1.5">
          {label}
          {badge && <span className="text-[9px] font-bold bg-surface-2 border border-border px-1 py-0.5 rounded">{badge}</span>}
        </div>
        {desc && <p className="text-[11.5px] text-muted mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all ${
        checked ? "bg-accent border-accent" : "bg-surface border-border hover:border-accent/50"
      }`}>
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
