import { X, Bell, KeyRound, Zap, Users, AtSign } from "lucide-react";
import type { Toast } from "../hooks/useNotifications";

const typeIcons: Record<string, typeof Bell> = {
  key_shared: KeyRound, key_revoked: KeyRound, key_rotated: KeyRound,
  issue_assigned: Zap, issue_commented: AtSign, issue_resolved: Zap,
  task_assigned: Bell, task_status_changed: Bell,
  group_added: Users, group_removed: Users, mention: AtSign,
};

const typeColors: Record<string, string> = {
  key_shared: "#5b5bd6", key_revoked: "#dc2626", key_rotated: "#f59e0b",
  issue_assigned: "#5b5bd6", issue_commented: "#71717a", issue_resolved: "#10b981",
  task_assigned: "#10b981", task_status_changed: "#3b82f6",
  group_added: "#3b82f6", group_removed: "#dc2626", mention: "#ec4899",
};

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-[360px]">
      {toasts.map((t) => {
        const Icon = typeIcons[t.type] || Bell;
        const color = typeColors[t.type] || "#5b5bd6";
        return (
          <div key={t.id}
            className="bg-surface border border-border rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 animate-in slide-in-from-right-full duration-300">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: color + "18", color }}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-medium text-ink leading-snug truncate">{t.title}</p>
              {t.body && <p className="text-[11.5px] text-muted mt-0.5 truncate">{t.body}</p>}
              {t.senderName && <p className="text-[10.5px] text-muted/60 mt-1">{t.senderName} · just now</p>}
            </div>
            <button onClick={() => onDismiss(t.id)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 transition-colors shrink-0">
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
