import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Check, CheckCheck, KeyRound, StickyNote, Users,
  Clock, MoreHorizontal, AtSign, Settings, Zap, Shield,
} from "lucide-react";
import { api } from "../lib/api";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string;
  entity_id: string;
  is_read: boolean;
  created_at?: string;
  createdAt?: string;
  sender?: { id: string; username: string; display_name?: string | null; avatar_url: string | null };
}

type FilterTab = "all" | "unread" | "mentions" | "keys" | "issues" | "team";

/* ── Style maps ── */

const entityIcons: Record<string, typeof Bell> = {
  api_key: KeyRound, task: StickyNote, issue: Zap, group: Users,
};

const typeConfig: Record<string, { label: string; color: string; icon: typeof Bell }> = {
  key_shared:         { label: "KEY ACCESS GRANTED",  color: "#5b5bd6", icon: KeyRound },
  key_revoked:        { label: "KEY REVOKED",         color: "#dc2626", icon: Shield },
  key_rotated:        { label: "KEY AUTO-ROTATED",    color: "#f59e0b", icon: KeyRound },
  task_assigned:      { label: "TASK ASSIGNED",       color: "#10b981", icon: StickyNote },
  task_status_changed:{ label: "TASK UPDATED",        color: "#3b82f6", icon: StickyNote },
  issue_assigned:     { label: "ISSUE ASSIGNED",      color: "#5b5bd6", icon: Zap },
  issue_commented:    { label: "MENTIONED IN COMMENT",color: "#ec4899", icon: AtSign },
  issue_resolved:     { label: "ISSUE RESOLVED",      color: "#10b981", icon: Zap },
  group_added:        { label: "ADDED TO TEAM",       color: "#3b82f6", icon: Users },
  group_removed:      { label: "REMOVED FROM TEAM",   color: "#dc2626", icon: Users },
  mention:            { label: "MENTIONED IN COMMENT",color: "#ec4899", icon: AtSign },
};

/* ── Helpers ── */

function getDateGroup(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  if (d >= today) return "Today";
  if (d >= yesterday) return "Yesterday";
  if (d >= weekStart) return "Earlier this week";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<{ notifications: NotificationItem[]; unread_count: number }>("/notifications");
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Listen for real-time notifications via SSE
  useEffect(() => {
    const handler = (e: Event) => {
      const count = (e as CustomEvent).detail;
      if (typeof count === "number") setUnreadCount(count);
      // Refetch to get the new notification
      fetchNotifications();
    };
    window.addEventListener("notif-count", handler);

    // Also listen for new notifications from the SSE stream
    const sseHandler = () => { fetchNotifications(); };
    window.addEventListener("rivox-new-notification", sseHandler);

    return () => {
      window.removeEventListener("notif-count", handler);
      window.removeEventListener("rivox-new-notification", sseHandler);
    };
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => { const next = Math.max(0, c - 1); window.dispatchEvent(new CustomEvent("notif-count", { detail: next })); return next; });
  };

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    window.dispatchEvent(new CustomEvent("notif-count", { detail: 0 }));
  };

  // Filter
  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "mentions") return n.type === "mention" || n.type === "issue_commented";
    if (filter === "keys") return n.entity_type === "api_key";
    if (filter === "issues") return n.entity_type === "issue";
    if (filter === "team") return n.entity_type === "group";
    return true;
  });

  // Counts
  const counts: Record<FilterTab, number> = {
    all: notifications.length,
    unread: notifications.filter((n) => !n.is_read).length,
    mentions: notifications.filter((n) => n.type === "mention" || n.type === "issue_commented").length,
    keys: notifications.filter((n) => n.entity_type === "api_key").length,
    issues: notifications.filter((n) => n.entity_type === "issue").length,
    team: notifications.filter((n) => n.entity_type === "group").length,
  };

  // Group by date
  const grouped: { label: string; items: NotificationItem[] }[] = [];
  let lastGroup = "";
  for (const n of filtered) {
    const ts = n.created_at || n.createdAt || "";
    const group = ts ? getDateGroup(ts) : "Unknown";
    if (group !== lastGroup) {
      grouped.push({ label: group, items: [] });
      lastGroup = group;
    }
    grouped[grouped.length - 1].items.push(n);
  }

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "mentions", label: "Mentions" },
    { key: "keys", label: "Keys" },
    { key: "issues", label: "Issues" },
    { key: "team", label: "Team" },
  ];

  return (
    <div className="flex flex-col h-full -mx-6 -mt-6 -mb-6 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 bg-surface border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-ink tracking-tight">Notifications</h1>
          <p className="mt-0.5 text-[12.5px] text-muted tracking-tight">
            {unreadCount > 0 ? `${unreadCount} unread · across keys, issues and team` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="px-3 py-1.5 text-[12px] font-medium text-ink border border-border rounded-md hover:bg-surface-2 transition-colors flex items-center gap-1.5">
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
          <button className="px-3 py-1.5 text-[12px] font-medium text-ink border border-border rounded-md hover:bg-surface-2 transition-colors flex items-center gap-1.5">
            <Clock size={12} /> Snooze 1h
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-6 py-2.5 bg-surface border-b border-border flex items-center gap-1 shrink-0">
        {filterTabs.map((tab) => {
          const active = filter === tab.key;
          const count = counts[tab.key];
          return (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium rounded-md transition-colors shrink-0 ${
                active ? "bg-ink text-surface" : "text-muted hover:text-ink hover:bg-surface-2"
              }`}>
              {tab.label}
              {count > 0 && (
                <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  active ? "bg-white/20" : "bg-surface-2"
                }`}>{count}</span>
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        <button onClick={() => navigate("/settings")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-muted hover:text-ink hover:bg-surface-2 rounded-md transition-colors">
          <Settings size={12} /> Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center mb-4">
              <Bell size={22} className="text-muted" />
            </div>
            <p className="text-[15px] font-medium text-ink mb-1">
              {filter === "unread" ? "All caught up!" : "No notifications"}
            </p>
            <p className="text-[12.5px] text-muted max-w-full sm:max-w-[280px]">
              {filter === "unread"
                ? "You've read all your notifications. Nice work."
                : `No ${filter === "all" ? "" : filter + " "}notifications yet. They'll show up here when something happens.`}
            </p>
          </div>
        ) : (
          <div className="px-6 py-5">
            {grouped.map((group) => (
              <div key={group.label} className="mb-8 last:mb-0">
                {/* Date group header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-[0.08em]">{group.label}</span>
                  <span className="text-[10.5px] text-muted/40 font-medium">{group.items.length}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Notification cards */}
                <div className="flex flex-col gap-1.5">
                  {group.items.map((n) => (
                    <NotificationCard key={n.id} notification={n} onMarkRead={markRead} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   NOTIFICATION CARD
   ══════════════════════════════════════════════════════════════════════════ */

function NotificationCard({ notification: n, onMarkRead }: {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  const tc = typeConfig[n.type];
  const ts = n.created_at || n.createdAt || "";
  const senderName = n.sender?.display_name || n.sender?.username || "";
  const TypeIcon = tc?.icon || entityIcons[n.entity_type] || Bell;

  return (
    <div className={`flex gap-4 pl-4 pr-3 py-4 rounded-xl border transition-colors group/notif relative ${
      n.is_read
        ? "bg-surface border-border hover:bg-surface-2/50"
        : "bg-surface border-accent/10 shadow-sm hover:shadow-md"
    }`}>
      {/* Left accent bar for unread */}
      {!n.is_read && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-accent" />
      )}

      {/* Icon + avatar */}
      <div className="relative shrink-0 mt-0.5">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          n.is_read ? "bg-surface-2 text-muted" : "bg-accent-soft text-accent"
        }`}>
          <TypeIcon size={16} />
        </div>
        {/* Sender avatar overlay */}
        {n.sender && (
          <div className="absolute -bottom-1 -right-1">
            {n.sender.avatar_url ? (
              <img src={n.sender.avatar_url} className="w-5 h-5 rounded-full object-cover ring-2 ring-surface" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[7px] font-bold ring-2 ring-surface">
                {senderName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Type label + time */}
        <div className="flex items-center gap-2 mb-1">
          {tc && (
            <span className="text-[10px] font-bold tracking-[0.06em]" style={{ color: tc.color }}>
              {tc.label}
            </span>
          )}
          <span className="text-[10.5px] text-muted/50">·</span>
          <span className="text-[10.5px] text-muted/50">{timeAgo(ts)}</span>
        </div>

        {/* Main text */}
        <p className={`text-[13px] leading-snug ${n.is_read ? "text-ink/70" : "text-ink"}`}>
          {senderName && <strong>{senderName}</strong>}
          {senderName && " "}
          {n.body || n.title}
        </p>

        {/* Rich preview card */}
        <RichPreview notification={n} />
      </div>

      {/* Right actions */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {!n.is_read && (
          <span className="text-[10px] font-bold text-accent tracking-wider">NEW</span>
        )}
        <div className="flex items-center gap-0.5 mt-auto opacity-0 group-hover/notif:opacity-100 transition-opacity">
          {!n.is_read && (
            <button onClick={() => onMarkRead(n.id)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-surface-2 hover:text-ink transition-colors"
              title="Mark as read">
              <Check size={14} />
            </button>
          )}
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-surface-2 hover:text-ink transition-colors"
            title="More">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   RICH PREVIEW (inline card inside notification)
   ══════════════════════════════════════════════════════════════════════════ */

function RichPreview({ notification: n }: { notification: NotificationItem }) {
  const navigate = useNavigate();

  // Issue-related: show issue preview
  if (n.entity_type === "issue" && (n.type === "issue_assigned" || n.type === "issue_resolved")) {
    return (
      <div className="mt-2 px-3 py-2.5 bg-surface border border-border rounded-lg flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium"
          style={{ background: "#fef2f2", color: "#b91c1c" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Bug
        </span>
        <span className="text-[11px] text-muted">
          <PriorityBarsInline /> Medium
        </span>
        <div className="flex-1" />
        <button onClick={() => navigate(`/issues/${n.entity_id}`)}
          className="px-2.5 py-1 text-[10.5px] font-medium text-ink border border-border rounded-md hover:bg-surface-2 transition-colors">
          Open
        </button>
      </div>
    );
  }

  // Comment/mention: show quoted comment — clickable to open issue
  if (n.type === "issue_commented" || n.type === "mention") {
    return (
      <button onClick={() => navigate(`/issues/${n.entity_id}`)} className="mt-2 pl-3 border-l-2 border-accent/30 py-1 block text-left hover:opacity-80 transition-opacity">
        <p className="text-[12px] text-muted italic leading-relaxed line-clamp-2">
          "{n.body || n.title}"
        </p>
      </button>
    );
  }

  // Key-related: show key preview
  if (n.entity_type === "api_key") {
    const isRevoked = n.type === "key_revoked";
    return (
      <div className="mt-2 px-3 py-2.5 bg-surface border border-border rounded-lg flex items-center gap-3">
        <KeyRound size={13} className={`shrink-0 ${isRevoked ? "text-red-400" : "text-muted"}`} />
        <div className="flex-1 min-w-0 overflow-hidden">
          <span className={`text-[12px] font-medium ${isRevoked ? "text-muted line-through" : "text-ink"}`}>
            {isRevoked ? "Access revoked" : (n.title.split(":")[0] || "API Key")}
          </span>
          <span className="text-[10.5px] text-muted ml-2">sk-•••</span>
        </div>
        {!isRevoked && (
          <button onClick={() => navigate("/")}
            className="px-2.5 py-1 text-[10.5px] font-medium text-ink border border-border rounded-md hover:bg-surface-2 transition-colors shrink-0">
            Open key
          </button>
        )}
      </div>
    );
  }

  // Group-related: navigate to team
  if (n.entity_type === "group") {
    return (
      <button onClick={() => navigate("/team")}
        className="mt-2 px-2.5 py-1 text-[10.5px] font-medium text-accent hover:underline">
        Open team →
      </button>
    );
  }

  return null;
}

/* ── Inline priority bars (tiny) ── */
function PriorityBarsInline() {
  return (
    <span className="inline-flex items-end gap-[1px] h-[9px] mr-1">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className="rounded-[0.5px]" style={{
          width: 2, height: 2 + i * 1.5,
          background: i <= 2 ? "#71717a" : "#e5e5e1",
        }} />
      ))}
    </span>
  );
}
