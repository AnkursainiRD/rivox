import { useState } from "react";
import {
  Book, MessageCircle, Keyboard, Shield, Users,
  ChevronDown, ExternalLink, Mail, Search,
  KeyRound, StickyNote, AlertCircle, Settings, Bell,
  Globe, Lock, RefreshCcw,
  Smartphone,
  FileText, Video, Headphones, ArrowRight,
} from "lucide-react";

/* ── Data ── */

const shortcuts = [
  { keys: ["⌘", "K"], label: "Open global search" },
  { keys: ["C"], label: "Create new issue (Issues page)" },
  { keys: ["N"], label: "Create new note (Sticky Board)" },
  { keys: ["Esc"], label: "Close drawer, modal, or dropdown" },
  { keys: ["↑", "↓"], label: "Navigate search results" },
  { keys: ["Enter"], label: "Open selected result" },
  { keys: ["⌘", "⇧", "D"], label: "Toggle dark mode" },
  { keys: ["⌘", "."], label: "Open notification panel" },
];

const faqSections = [
  {
    title: "Getting Started",
    items: [
      {
        q: "How do I get started with Rivox?",
        a: "After signing in via Discord OAuth, you'll be placed in your organization's workspace. Start by exploring the sidebar — API Keys for managing secrets, Sticky Board for task management, Issues for bug tracking, and Team for managing members.",
      },
      {
        q: "What is a workspace/organization?",
        a: "A workspace (organization) is your team's shared environment. All API keys, issues, tasks, and team members belong to a workspace. You can be part of multiple workspaces and switch between them using the dropdown in the top-left corner.",
      },
      {
        q: "How do I invite team members?",
        a: "Go to Team page → click \"Invite member\" → enter their Discord username or email. They'll receive an invitation and can join after authenticating via Discord. Admins can also set roles (admin, member, viewer) during invitation.",
      },
    ],
  },
  {
    title: "Issues & Bug Tracking",
    items: [
      {
        q: "How do I create a new issue?",
        a: "Click the \"+ New issue\" button in the Issues page header. A drawer opens where you can set the title, description, type (Bug/Feature/Improvement/Task), priority, severity, assignee, team, environment, browser, steps to reproduce, and expected/actual behavior.",
      },
      {
        q: "What are channels?",
        a: "Channels are global groupings for your issues — think of them as projects (e.g. YourGPT, Whitelisted, mTarsier). Issues belong to a channel. You can filter by channel, create new ones from the toolbar, and delete them by right-clicking the tab. Issues are never deleted when you remove a channel — they just become unlinked.",
      },
      {
        q: "Can I drag issues between status columns?",
        a: "Yes! In the Board view, grab any card and drag it to a different column (Open, In progress, In review, Done) to update its status instantly. The change is saved to the server automatically.",
      },
      {
        q: "How does the date filter work?",
        a: "The date filter in the toolbar lets you view issues by creation date — This week (default), This month, All time, or a Custom date range. This affects all views (Sheet, Board, List). Combined with channel and type/status filters, you can drill down to exactly the issues you need.",
      },
      {
        q: "What happens when I hover over an issue title?",
        a: "After 1 second, a preview card appears showing the issue's type, status, title, description, assignee, priority, and creation date. The card follows your cursor horizontally. It's a quick way to scan issues without opening them.",
      },
      {
        q: "How do I delete an issue?",
        a: "On the Sheet view, hover over a row and click the \"...\" menu → Delete issue. On the detail page, scroll down in the right sidebar to find the Delete button. On Board view, click \"...\" on any card. You'll be asked to confirm before deletion.",
      },
      {
        q: "What does the Notify button do?",
        a: "On an issue's detail page, clicking \"Notify\" sends a nudge to the assignee and reporter. They'll receive an in-app notification (via SSE) and a Discord DM if they have Discord connected. You can include an optional message with the nudge.",
      },
    ],
  },
  {
    title: "API Keys",
    items: [
      {
        q: "How do I share an API key?",
        a: "On the API Keys page, click \"Share\" next to a key. Search for team members or groups, select a permission level (Can use / Can manage), and confirm. Shared users will see the key in their list and receive a notification.",
      },
      {
        q: "What's the difference between 'Can use' and 'Can manage'?",
        a: "\"Can use\" allows the user to view and copy the key value. \"Can manage\" also lets them rotate the key, change sharing settings, and revoke it. Only the key creator and managers can delete a key.",
      },
      {
        q: "How does key rotation work?",
        a: "Keys can be rotated manually from the key detail page or automatically via the rotation cron. Rotation generates a new key value and invalidates the old one after a propagation window. All shared users are notified of the rotation.",
      },
    ],
  },
  {
    title: "Sticky Board",
    items: [
      {
        q: "What's the difference between My board and Team board?",
        a: "My board shows your personal sticky notes — only visible to you. Team board shows notes shared with your organization. Admins can see all team notes and filter by member or group. Regular users see notes from their groups only.",
      },
      {
        q: "Can I change a note's color?",
        a: "Yes! Click the \"...\" menu on any note card to see the color picker. Choose from 4 preset colors (yellow, blue, green, pink) or pick a custom color using the color wheel.",
      },
      {
        q: "How does the Canvas view work?",
        a: "Canvas view shows notes as free-floating sticky notes on an infinite canvas. Drag notes to position them — positions are saved to the server. By default it shows only in-progress notes. Toggle \"All\" in the top-left to see everything.",
      },
      {
        q: "Can I drag notes between columns in Kanban view?",
        a: "Yes! Grab any note card and drag it to a different column to change its status. On the team board, non-admin users can only drag their own notes — other team members' notes are visible but not draggable.",
      },
    ],
  },
  {
    title: "Notifications",
    items: [
      {
        q: "How do real-time notifications work?",
        a: "Rivox uses Server-Sent Events (SSE) to push notifications instantly. When someone assigns you an issue, shares a key, or mentions you in a comment, you'll see a toast popup in the bottom-right corner and the sidebar badge updates. No page refresh needed.",
      },
      {
        q: "Can I get notifications on Discord?",
        a: "Yes! If you authenticated via Discord and have DM notifications enabled, you'll receive Discord DMs for key events. You can configure which notification types trigger Discord DMs in Settings → Notification Preferences.",
      },
      {
        q: "How do I filter notifications?",
        a: "The Notifications page has filter pills: All, Unread, Mentions, Keys, Issues, Team. Each shows a count badge. Notifications are also grouped by date (Today, Yesterday, Earlier this week) for easy scanning.",
      },
    ],
  },
];

const features = [
  { icon: KeyRound, title: "API Keys", desc: "Create, share, rotate, and revoke API keys. Fine-grained access control with user and group permissions. Encrypted at rest.", color: "#5b5bd6" },
  { icon: StickyNote, title: "Sticky Board", desc: "Visual task management with Kanban, Grid, and Canvas views. Personal and team boards. Drag-and-drop, tags, and color coding.", color: "#f59e0b" },
  { icon: AlertCircle, title: "Issues", desc: "Full issue tracker with Sheet, Board, and List views. Channels, time filters, pagination, comments, attachments, and detail pages.", color: "#ef4444" },
  { icon: Users, title: "Team", desc: "Manage members, groups, and roles. Invite via Discord. Group-based permissions for keys and task visibility.", color: "#10b981" },
  { icon: Bell, title: "Notifications", desc: "Real-time SSE notifications with Discord DM integration. Filter by type, date grouping, mark read, and toast popups.", color: "#3b82f6" },
  { icon: Settings, title: "Settings", desc: "Profile management, notification preferences, theme customization, and workspace configuration.", color: "#71717a" },
];


const resources = [
  { icon: FileText, title: "API Reference", desc: "Complete REST API documentation with request/response examples.", href: "#" },
  { icon: Video, title: "Video Tutorials", desc: "Step-by-step walkthroughs for common workflows.", href: "#" },
  { icon: Book, title: "User Guide", desc: "Comprehensive guide covering all features and best practices.", href: "#" },
  { icon: FileText, title: "Changelog", desc: "What's new in each version — features, fixes, and improvements.", href: "#" },
  { icon: Globe, title: "Community", desc: "Join our Discord server for discussions, feedback, and support.", href: "#" },
  { icon: Headphones, title: "Premium Support", desc: "Priority support with dedicated account manager for teams.", href: "#" },
];


/* ══════════════════════════════════════════════════════════════════════════
   HELP PAGE
   ══════════════════════════════════════════════════════════════════════════ */

export function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const allFaqs = faqSections.flatMap((s) => s.items.map((item) => ({ ...item, section: s.title })));
  const filteredFaqs = searchQuery
    ? allFaqs.filter((f) => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="flex flex-col h-full -mx-6 -mt-6 -mb-6 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 bg-surface border-b border-border shrink-0">
        <h1 className="text-xl font-semibold text-ink tracking-tight">Help & Support</h1>
        <p className="mt-0.5 text-[12.5px] text-muted tracking-tight">Everything you need to get the most out of Rivox.</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="px-6 py-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent-soft flex items-center justify-center mx-auto mb-5">
              <Book size={26} className="text-accent" />
            </div>
            <h2 className="text-[22px] font-semibold text-ink tracking-tight mb-2">How can we help?</h2>
            <p className="text-[13.5px] text-muted mb-6 max-w-md mx-auto leading-relaxed">
              Search our knowledge base, explore features, or get in touch with our team.
            </p>
            <div className="flex items-center gap-2.5 px-4 py-3 bg-surface border border-border rounded-xl shadow-sm mx-auto max-w-lg focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 transition-all">
              <Search size={16} className="text-muted shrink-0" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help articles, shortcuts, features..."
                className="flex-1 text-[14px] bg-transparent outline-none text-ink placeholder:text-muted/50" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-muted hover:text-ink text-[11px] px-2 py-0.5 rounded bg-surface-2">Clear</button>
              )}
            </div>

            {/* Search results */}
            {searchQuery && (
              <div className="mt-4 text-left max-w-lg mx-auto bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                {filteredFaqs.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[13px] text-muted">No results for "{searchQuery}"</div>
                ) : (
                  filteredFaqs.slice(0, 5).map((f, i) => (
                    <button key={i} onClick={() => { setSearchQuery(""); setOpenFaq(`${f.section}-${i}`); }}
                      className="w-full px-4 py-3 text-left hover:bg-surface-2/50 transition-colors border-b border-border last:border-0">
                      <div className="text-[10px] text-accent font-medium uppercase tracking-wider mb-0.5">{f.section}</div>
                      <div className="text-[13px] text-ink font-medium">{f.q}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-10 max-w-4xl mx-auto">
          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
            {[
              { icon: Book, label: "Documentation", desc: "Guides and API reference", href: "#" },
              { icon: MessageCircle, label: "Contact Support", desc: "Get help from our team", href: "#contact" },
              { icon: Keyboard, label: "Keyboard Shortcuts", desc: "Work faster with hotkeys", href: "#shortcuts" },
            ].map((link) => (
              <a key={link.label} href={link.href}
                className="flex items-start gap-3 p-4 bg-surface border border-border rounded-xl hover:border-accent/30 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center shrink-0 group-hover:bg-accent-soft transition-colors">
                  <link.icon size={17} className="text-muted group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-ink flex items-center gap-1">
                    {link.label} <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                  </div>
                  <div className="text-[11.5px] text-muted mt-0.5">{link.desc}</div>
                </div>
              </a>
            ))}
          </div>

          {/* Features */}
          <div className="mb-10">
            <h3 className="text-[12px] font-bold text-muted uppercase tracking-[0.08em] mb-4">Platform Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {features.map((f) => (
                <div key={f.title} className="p-4 bg-surface border border-border rounded-xl hover:shadow-sm transition-shadow">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: f.color + "14" }}>
                    <f.icon size={17} style={{ color: f.color }} />
                  </div>
                  <div className="text-[13px] font-semibold text-ink mb-1">{f.title}</div>
                  <div className="text-[11.5px] text-muted leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ sections */}
          <div className="mb-10">
            <h3 className="text-[12px] font-bold text-muted uppercase tracking-[0.08em] mb-4">Frequently Asked Questions</h3>
            <div className="space-y-4">
              {faqSections.map((section) => (
                <div key={section.title} className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-surface-2/30 border-b border-border">
                    <span className="text-[12px] font-semibold text-ink">{section.title}</span>
                    <span className="text-[10.5px] text-muted ml-2">{section.items.length} articles</span>
                  </div>
                  <div className="divide-y divide-border">
                    {section.items.map((faq, i) => {
                      const key = `${section.title}-${i}`;
                      const isOpen = openFaq === key;
                      return (
                        <div key={i}>
                          <button onClick={() => setOpenFaq(isOpen ? null : key)}
                            className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-surface-2/30 transition-colors">
                            <ChevronDown size={13} className={`text-muted shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                            <span className={`text-[13px] ${isOpen ? "font-semibold text-ink" : "font-medium text-ink/80"}`}>{faq.q}</span>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 pl-10">
                              <p className="text-[12.5px] text-muted leading-[1.7]">{faq.a}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div className="mb-10" id="shortcuts">
            <h3 className="text-[12px] font-bold text-muted uppercase tracking-[0.08em] mb-4">Keyboard Shortcuts</h3>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border">
                {[shortcuts.slice(0, 4), shortcuts.slice(4)].map((col, ci) => (
                  <div key={ci} className="divide-y divide-border">
                    {col.map((s, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3">
                        <span className="text-[12.5px] text-ink">{s.label}</span>
                        <div className="flex items-center gap-0.5">
                          {s.keys.map((k, j) => (
                            <span key={j} className="flex items-center">
                              <kbd className="px-1.5 py-0.5 text-[10.5px] font-mono font-medium bg-surface-2 border border-border rounded text-ink/80 min-w-[22px] text-center">{k}</kbd>
                              {j < s.keys.length - 1 && <span className="text-[9px] text-muted/50 mx-0.5">+</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resources */}
          <div className="mb-10">
            <h3 className="text-[12px] font-bold text-muted uppercase tracking-[0.08em] mb-4">Resources</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {resources.map((r) => (
                <a key={r.title} href={r.href}
                  className="flex items-start gap-3 p-4 bg-surface border border-border rounded-xl hover:border-accent/20 hover:shadow-sm transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0 group-hover:bg-accent-soft transition-colors">
                    <r.icon size={14} className="text-muted group-hover:text-accent transition-colors" />
                  </div>
                  <div>
                    <div className="text-[12.5px] font-medium text-ink">{r.title}</div>
                    <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{r.desc}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>



          {/* Security */}
          <div className="mb-10">
            <h3 className="text-[12px] font-bold text-muted uppercase tracking-[0.08em] mb-4">Security & Privacy</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: Lock, title: "Encryption", desc: "API keys encrypted at rest with AES-256. All traffic over TLS 1.3." },
                { icon: Shield, title: "Authentication", desc: "JWT tokens with configurable expiry. Discord OAuth with minimal scopes." },
                { icon: RefreshCcw, title: "Key Rotation", desc: "Automatic and manual key rotation with propagation window and notifications." },
              ].map((s) => (
                <div key={s.title} className="p-4 bg-surface border border-border rounded-xl">
                  <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center mb-3">
                    <s.icon size={16} className="text-green-600" />
                  </div>
                  <div className="text-[13px] font-medium text-ink mb-1">{s.title}</div>
                  <div className="text-[11.5px] text-muted leading-relaxed">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="mb-8 bg-surface border border-border rounded-xl overflow-hidden" id="contact">
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-4">
                <Mail size={20} className="text-accent" />
              </div>
              <div className="text-[17px] font-semibold text-ink mb-1.5">Still need help?</div>
              <div className="text-[13px] text-muted mb-5 max-w-sm mx-auto leading-relaxed">
                Our support team is available Monday–Friday, 9am–6pm IST.
                We typically respond within a few hours.
              </div>
              <div className="flex items-center justify-center gap-3">
                <button className="px-5 py-2.5 bg-ink text-surface text-[13px] font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                  <Mail size={14} /> Contact Support
                </button>
                <button className="px-5 py-2.5 text-[13px] font-medium text-ink border border-border rounded-lg hover:bg-surface-2 transition-colors flex items-center gap-2">
                  <Globe size={14} /> Join Discord
                </button>
                <button className="px-5 py-2.5 text-[13px] font-medium text-ink border border-border rounded-lg hover:bg-surface-2 transition-colors flex items-center gap-2">
                  <ExternalLink size={14} /> View Docs
                </button>
              </div>
            </div>
            <div className="px-8 py-3 bg-surface-2/30 border-t border-border flex items-center justify-center gap-6 text-[11px] text-muted">
              <span>Response time: ~2 hours</span>
              <span className="text-border">|</span>
              <span>Email: support@rivox.app</span>
              <span className="text-border">|</span>
              <span>Discord: discord.gg/rivox</span>
            </div>
          </div>

          {/* System info */}
          <div className="flex items-center justify-between text-[11px] text-muted/50 pb-4">
            <div className="flex items-center gap-4">
              <span>Rivox v0.1.0</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Smartphone size={10} /> Desktop App (Tauri)</span>
            </div>
            <span>Built with care by the Rivox team</span>
          </div>
        </div>
      </div>
    </div>
  );
}
