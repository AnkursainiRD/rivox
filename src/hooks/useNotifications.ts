import { useState, useEffect, useCallback, useRef } from "react";
import { api, connectSSE } from "../lib/api";

interface NotificationEvent {
  type: "notification" | "connected";
  notification?: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    entity_type: string;
    entity_id: string;
    is_read: boolean;
    created_at: string;
    sender: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
  };
}

export interface Toast {
  id: string;
  title: string;
  body: string | null;
  type: string;
  senderName: string;
  timestamp: number;
}

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const esRef = useRef<EventSource | null>(null);

  // Fetch initial unread count
  const fetchCount = useCallback(async () => {
    try {
      const data = await api.get<{ unread_count: number }>("/notifications?limit=1");
      setUnreadCount(data.unread_count);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  // Connect SSE
  useEffect(() => {
    const es = connectSSE((raw) => {
      const event = raw as NotificationEvent;
      if (event.type === "notification" && event.notification) {
        const n = event.notification;
        setUnreadCount((c) => c + 1);

        // Add toast
        const toast: Toast = {
          id: n.id,
          title: n.title,
          body: n.body,
          type: n.type,
          senderName: n.sender?.display_name || n.sender?.username || "",
          timestamp: Date.now(),
        };
        setToasts((prev) => [toast, ...prev].slice(0, 5));

        // Notify the Notifications page to refetch
        window.dispatchEvent(new Event("rivox-new-notification"));

        // Auto-dismiss after 5s
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, 5000);
      }
    });

    esRef.current = es;
    return () => { es.close(); };
  }, []);

  // Sync with Notifications page
  useEffect(() => {
    const handler = (e: Event) => {
      const count = (e as CustomEvent).detail;
      if (typeof count === "number") setUnreadCount(count);
    };
    window.addEventListener("notif-count", handler);
    return () => window.removeEventListener("notif-count", handler);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshCount = fetchCount;

  return { unreadCount, setUnreadCount, toasts, dismissToast, refreshCount };
}
