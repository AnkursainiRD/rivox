import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Plus, ChevronDown, Search, Filter, MoreHorizontal, Trash2,
  LayoutGrid, Columns3, List, X, ChevronLeft, ChevronRight,
  Share2, Bell, Edit3, Paperclip, Image, FileText, Check,
} from "lucide-react";
import { api } from "../lib/api";

/* ── Types ── */

interface UserRef { id: string; username: string; display_name: string | null; avatar_url: string | null }

interface Issue {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  severity: string;
  type: string;
  environment: string | null;
  due_date: string | null;
  createdAt?: string;
  created_at?: string;
  reporter?: UserRef;
  assignee?: UserRef | null;
  assignedGroup?: { id: string; name: string; color: string } | null;
  channel?: { id: string; name: string; color: string } | null;
  labels?: { id: string; name: string; color: string }[];
  comments?: IssueComment[];
  attachments?: IssueAttachment[];
}

interface IssueComment {
  id: string;
  body: string;
  created_at?: string;
  createdAt?: string;
  author: UserRef;
}

interface IssueAttachment {
  id: string;
  filename: string;
  mime_type: string;
  url: string;
}

interface OrgMember {
  user: { id: string; username: string; display_name: string | null; avatar_url: string | null };
}

interface ChannelData {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  issue_count: number;
}

interface GroupData {
  id: string;
  name: string;
  color: string | null;
  member_count: number;
}

type ViewMode = "sheet" | "board" | "list";

/* ── Options ── */

const statusOptions = ["open", "in_progress", "resolved", "closed", "wont_fix"];
const priorityOptions = ["low", "medium", "high", "critical"];
const severityOptions = ["cosmetic", "minor", "major", "blocker"];
const typeOptions = ["bug", "feature", "improvement", "task"];

/* ── Style maps ── */

const typeDot: Record<string, string> = { bug: "#ef4444", feature: "#5b5bd6", improvement: "#7c3aed", task: "#71717a" };
const typeLabel: Record<string, string> = { bug: "Bug", feature: "Feature", improvement: "Improvement", task: "Task" };
const typeColors: Record<string, { bg: string; fg: string }> = {
  bug:         { bg: "#fef2f2", fg: "#b91c1c" },
  feature:     { bg: "#eeeefb", fg: "#5b5bd6" },
  improvement: { bg: "#ede9fe", fg: "#7c3aed" },
  task:        { bg: "#f4f4f5", fg: "#52525b" },
};

const statusDot: Record<string, string> = { open: "#a1a1aa", in_progress: "#f59e0b", resolved: "#5b5bd6", closed: "#10b981", wont_fix: "#71717a" };
const statusLabel: Record<string, string> = { open: "Open", in_progress: "In progress", resolved: "In review", closed: "Done", wont_fix: "Won't fix" };
const statusFill: Record<string, boolean> = { in_progress: true, closed: true, resolved: true };

const priorityColor: Record<string, string> = { low: "#a1a1aa", medium: "#71717a", high: "#f59e0b", critical: "#dc2626" };
const priorityBars: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const priorityLabel: Record<string, string> = { low: "Low", medium: "Medium", high: "High", critical: "Urgent" };

const severityColors: Record<string, { bg: string; fg: string } | null> = {
  blocker:  { bg: "#fef2f2", fg: "#dc2626" },
  major:    { bg: "#fffbeb", fg: "#d97706" },
  minor:    null,
  cosmetic: null,
};

/* ── Helpers ── */

function formatDate(d: string | null | undefined) {
  if (!d) return "";
  // Handle date-only (YYYY-MM-DD) vs full timestamp
  const parts = d.split("-");
  if (parts.length === 3 && parts[2].length === 2) {
    const date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return `${date.getDate()} ${date.toLocaleDateString(undefined, { month: "short" })}`;
  }
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return `${date.getDate()} ${date.toLocaleDateString(undefined, { month: "short" })}`;
}

function StatusDotIcon({ status, size = 10 }: { status: string; size?: number }) {
  const dot = statusDot[status] || "#a1a1aa";
  const filled = statusFill[status];
  return (
    <span className="shrink-0" style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${dot}`,
      background: filled ? dot : "transparent",
      display: "inline-block",
    }} />
  );
}

function PriorityBarsIcon({ priority }: { priority: string }) {
  const color = priorityColor[priority] || "#71717a";
  const bars = priorityBars[priority] || 2;
  return (
    <span className="inline-flex items-end gap-[1.5px] h-[11px]">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className="rounded-[1px]" style={{
          width: 2.5, height: 3 + i * 2,
          background: i <= bars ? color : "var(--border, #e5e5e1)",
        }} />
      ))}
    </span>
  );
}

function Avatar({ user, size = 22 }: { user: { display_name: string | null; username: string; avatar_url: string | null }; size?: number }) {
  if (user.avatar_url) return <img src={user.avatar_url} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {(user.display_name || user.username).slice(0, 2).toUpperCase()}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */

type TimeRange = "week" | "month" | "all" | "custom";

function getDateRange(range: TimeRange, customFrom?: string, customTo?: string): { from?: string; to?: string } {
  const now = new Date();
  if (range === "all") return {};
  if (range === "custom") return { from: customFrom, to: customTo };
  const d = new Date(now);
  if (range === "week") { d.setDate(d.getDate() - d.getDay()); }
  else if (range === "month") { d.setDate(1); }
  return { from: d.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

interface PaginatedResponse {
  issues: Issue[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function IssuesPage({ orgId }: { orgId?: string }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [showNewRow, setShowNewRow] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("sheet");

  // Time range
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeChannel) params.set("channel_id", activeChannel);
      const { from, to } = getDateRange(timeRange, customFrom, customTo);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      // Only paginate in sheet view; board/list need all issues
      if (view === "sheet") {
        params.set("page", String(page));
        params.set("limit", String(pageSize));
      } else {
        params.set("limit", "500");
      }
      const qs = params.toString() ? `?${params}` : "";

      const [paginated, memberData, groupData, channelData] = await Promise.all([
        api.get<PaginatedResponse>(`/issues/all${qs}`),
        orgId ? api.get<OrgMember[]>(`/orgs/${orgId}/members`) : Promise.resolve([]),
        orgId ? api.get<GroupData[]>(`/orgs/${orgId}/groups`) : Promise.resolve([]),
        api.get<ChannelData[]>(`/channels`),
      ]);
      setIssues(paginated.issues);
      setTotalPages(paginated.totalPages);
      setTotalCount(paginated.total);
      setOrgMembers(memberData);
      setGroups(groupData);
      setChannels(channelData);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, activeChannel, timeRange, customFrom, customTo, page, view]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateIssue = async (id: string, field: string, value: string | null) => {
    // Fields with nested objects need a refetch, others can update locally
    const needsRefetch = field === "assigned_to" || field === "assigned_group" || field === "channel_id";
    if (!needsRefetch) {
      setIssues((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));
    }
    await api.patch(`/issues/${id}`, { [field]: value });
    if (needsRefetch) fetchData();
  };

  const deleteIssue = async (id: string) => {
    await api.delete(`/issues/${id}`);
    setIssues((prev) => prev.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const createIssue = async (data: Partial<Issue>) => {
    const payload = { ...data, channel_id: activeChannel || undefined };
    await api.post<Issue>(`/issues/create`, { ...payload, org_id: orgId || undefined });
    setShowNewRow(false);
    setShowDrawer(false);
    fetchData();
  };

  const createChannel = async (name: string, color: string) => {
    const ch = await api.post<ChannelData>(`/channels`, { name, color });
    setChannels((prev) => [...prev, { ...ch, issue_count: 0 }]);
    setActiveChannel(ch.id);
  };

  const deleteChannel = async (channelId: string) => {
    await api.delete(`/channels/${channelId}`);
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    if (activeChannel === channelId) setActiveChannel(null);
  };

  const filtered = issues.filter((i) => {
    if (filterType && i.type !== filterType) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusCounts = issues.reduce<Record<string, number>>((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});
  const selectedIssue = issues.find((i) => i.id === selectedId) || null;

  if (!orgId) {
    return <div className="flex items-center justify-center h-full"><p className="text-sm text-muted">No organization selected.</p></div>;
  }

  const subtitle = !loading && issues.length === 0
    ? "Track bugs, features and tasks across your team."
    : view === "board"
      ? `${issues.length} issues · grouped by status`
      : view === "list" && selectedIssue
        ? `${issues.length} issues · 1 selected`
        : `${statusCounts.open || 0} open · ${statusCounts.in_progress || 0} in progress · ${statusCounts.resolved || 0} in review`;

  return (
    <div data-issues-page className="flex flex-col h-full -mx-6 -mt-6 -mb-6 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 bg-surface border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-ink tracking-tight">Issues</h1>
          <p className="mt-0.5 text-[12.5px] text-muted tracking-tight">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-[12px] font-medium text-ink border border-border rounded-md hover:bg-surface-2 transition-colors flex items-center gap-1.5">
            <Filter size={12} />
            Filter
          </button>
          <button
            onClick={() => setShowDrawer(true)}
            className="px-3 py-1.5 bg-ink text-surface text-[12px] font-medium rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus size={13} strokeWidth={2} />
            New issue
          </button>
        </div>
      </div>

      {/* Channel tabs */}
      <ChannelTabs
        channels={channels}
        activeChannel={activeChannel}
        onSelect={setActiveChannel}
        onCreate={createChannel}
        onDelete={deleteChannel}
      />

      {/* Toolbar */}
      <div className="px-5 py-2 bg-surface border-b border-border flex items-center gap-2 shrink-0">
        <div className="flex bg-surface-2 border border-border rounded-md p-0.5">
          {([
            { id: "sheet" as const, icon: LayoutGrid, label: "Sheet" },
            { id: "board" as const, icon: Columns3, label: "Board" },
            { id: "list" as const, icon: List, label: "List" },
          ]).map((v) => (
            <button
              key={v.id}
              onClick={() => { setView(v.id); if (v.id !== "list") setSelectedId(null); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11.5px] font-medium transition-colors ${
                v.id === view
                  ? "bg-surface border border-border text-ink shadow-sm"
                  : "text-muted border border-transparent hover:text-ink"
              }`}
            >
              <v.icon size={12} />
              {v.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarDropdown label="Type" value={filterType} options={typeOptions} labels={typeLabel} onChange={(v) => { setFilterType(v); setPage(1); }} />
        <ToolbarDropdown label="Status" value={filterStatus} options={statusOptions} labels={statusLabel} onChange={(v) => { setFilterStatus(v); setPage(1); }} />

        <div className="w-px h-4 bg-border mx-1" />

        {/* Time range */}
        <TimeRangeSelector
          value={timeRange}
          customFrom={customFrom}
          customTo={customTo}
          onChange={(r) => { setTimeRange(r); setPage(1); }}
          onCustomChange={(f, t) => { setCustomFrom(f); setCustomTo(t); setPage(1); }}
        />

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-2 border border-border rounded-md w-[200px]">
          <Search size={12} className="text-muted shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search issues"
            className="flex-1 text-[12px] bg-transparent outline-none text-ink placeholder:text-muted/50" />
          <span className="text-[10px] text-muted/50 font-mono">/</span>
        </div>
      </div>

      {/* Content area */}
      <div data-content-area className="flex-1 relative overflow-hidden min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : issues.length === 0 && !showNewRow ? (
          <EmptyState onCreateClick={() => setShowNewRow(true)} />
        ) : view === "sheet" ? (
          <SheetView
            issues={filtered}
            orgMembers={orgMembers}
            groups={groups}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            showNewRow={showNewRow}
            setShowNewRow={setShowNewRow}
            onUpdate={updateIssue}
            onDelete={deleteIssue}
            onCreate={createIssue}
            allCount={issues.length}
          />
        ) : view === "board" ? (
          <BoardView
            issues={filtered}
            onUpdate={updateIssue}
            onDelete={deleteIssue}
            onCreateClick={() => setShowDrawer(true)}
          />
        ) : (
          <ListView
            issues={filtered}
            orgMembers={orgMembers}
            groups={groups}
            selectedIssue={selectedIssue}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            onUpdate={updateIssue}
            onDelete={deleteIssue}
          />
        )}

      </div>

      {/* Footer */}
      <div className="px-5 py-1.5 border-t border-border bg-surface flex items-center gap-3 text-[11.5px] text-muted shrink-0">
        <span>{totalCount} issues</span>
        <span className="text-border">&middot;</span>
        <span>Showing {filtered.length}</span>
        <div className="flex-1" />
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-2 py-0.5 rounded text-[11px] font-medium hover:bg-surface-2 disabled:opacity-30 transition-colors">&lsaquo; Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
              Math.max(0, page - 3), Math.min(totalPages, page + 2)
            ).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-6 h-6 rounded text-[11px] font-medium transition-colors ${p === page ? "bg-ink text-surface" : "hover:bg-surface-2"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-2 py-0.5 rounded text-[11px] font-medium hover:bg-surface-2 disabled:opacity-30 transition-colors">Next &rsaquo;</button>
          </div>
        )}
      </div>

      {/* Create Issue Drawer — fixed, top aligned with content area, bottom to screen edge */}
      {showDrawer && (
        <CreateIssueDrawer
          orgMembers={orgMembers}
          groups={groups}
          onCreate={createIssue}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CHANNEL TABS
   ══════════════════════════════════════════════════════════════════════════ */

/* ── Time range selector ── */

const timeRangeLabels: Record<TimeRange, string> = { week: "This week", month: "This month", all: "All time", custom: "Custom" };

function TimeRangeSelector({ value, customFrom, customTo, onChange, onCustomChange }: {
  value: TimeRange; customFrom: string; customTo: string;
  onChange: (r: TimeRange) => void;
  onCustomChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const label = value === "custom" && customFrom
    ? `${customFrom} — ${customTo || "now"}`
    : timeRangeLabels[value];

  return (
    <>
      <button ref={ref}
        onClick={() => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.bottom + 4, left: r.left }); } setOpen(!open); }}
        className={`px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 ${
          value !== "week" ? "bg-accent-soft/20 text-accent" : "text-muted hover:text-ink hover:bg-surface-2"
        }`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        {label}
        <ChevronDown size={11} className="text-muted/60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-[220px] bg-surface border border-border rounded-lg shadow-popover py-1" style={{ top: pos.top, left: pos.left }}>
            {(["week", "month", "all"] as TimeRange[]).map((r) => (
              <button key={r} onClick={() => { onChange(r); setOpen(false); }}
                className={`w-full px-3 py-2 text-[12px] text-left transition-colors flex items-center justify-between ${
                  value === r ? "text-ink font-medium bg-surface-2" : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}>
                {timeRangeLabels[r]}
                {value === r && <span className="text-accent text-[11px]">&#10003;</span>}
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <div className="px-3 py-2">
              <p className="text-[10.5px] font-medium text-muted uppercase tracking-wider mb-2">Custom range</p>
              <div className="flex gap-2 mb-2">
                <input type="date" value={customFrom} onChange={(e) => onCustomChange(e.target.value, customTo)}
                  className="flex-1 px-2 py-1 text-[11px] bg-surface border border-border rounded outline-none focus:border-accent" />
                <input type="date" value={customTo} onChange={(e) => onCustomChange(customFrom, e.target.value)}
                  className="flex-1 px-2 py-1 text-[11px] bg-surface border border-border rounded outline-none focus:border-accent" />
              </div>
              <button onClick={() => { if (customFrom) { onChange("custom"); setOpen(false); } }}
                disabled={!customFrom}
                className="w-full py-1.5 text-[11px] font-medium bg-ink text-surface rounded hover:opacity-90 disabled:opacity-30 transition-opacity">
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const channelColors = ["#5b5bd6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4"];

function ChannelTabs({ channels, activeChannel, onSelect, onCreate, onDelete }: {
  channels: ChannelData[];
  activeChannel: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; active: number; total: number } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const [morePos, setMorePos] = useState({ top: 0, left: 0 });

  useEffect(() => { if (showCreate) inputRef.current?.focus(); }, [showCreate]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const color = channelColors[channels.length % channelColors.length];
    onCreate(newName.trim(), color);
    setNewName("");
    setShowCreate(false);
  };

  const visibleChannels = channels.slice(0, 3);
  const overflowChannels = channels.slice(3);
  const activeOverflow = overflowChannels.find((ch) => ch.id === activeChannel);

  return (
    <div className="px-5 py-1.5 bg-surface border-b border-border flex items-center gap-1 shrink-0">
      {/* All issues tab */}
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors shrink-0 ${
          !activeChannel ? "bg-ink text-surface" : "text-muted hover:text-ink hover:bg-surface-2"
        }`}
      >
        All issues
      </button>

      {/* First 3 channel tabs */}
      {visibleChannels.map((ch) => (
        <button
          key={ch.id}
          onClick={() => onSelect(ch.id)}
          onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ id: ch.id, top: e.clientY, left: e.clientX }); }}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 shrink-0 ${
            activeChannel === ch.id
              ? "bg-surface-2 border border-border text-ink shadow-sm"
              : "text-muted hover:text-ink hover:bg-surface-2"
          }`}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ch.color || "#5b5bd6" }} />
          {ch.name}
          <span className="text-[10px] text-muted/60 ml-0.5">{ch.issue_count}</span>
        </button>
      ))}

      {/* Overflow dropdown for 4+ channels */}
      {overflowChannels.length > 0 && (
        <>
          <button
            ref={moreBtnRef}
            onClick={() => {
              if (moreBtnRef.current) {
                const r = moreBtnRef.current.getBoundingClientRect();
                setMorePos({ top: r.bottom + 4, left: r.left });
              }
              setShowMore(!showMore);
            }}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 shrink-0 ${
              activeOverflow
                ? "bg-surface-2 border border-border text-ink shadow-sm"
                : "text-muted hover:text-ink hover:bg-surface-2"
            }`}
          >
            {activeOverflow ? (
              <>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: activeOverflow.color || "#5b5bd6" }} />
                {activeOverflow.name}
              </>
            ) : (
              `+${overflowChannels.length} more`
            )}
            <ChevronDown size={11} className="text-muted/60" />
          </button>
          {showMore && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
              <div className="fixed z-50 w-48 bg-surface border border-border rounded-lg shadow-popover py-1"
                style={{ top: morePos.top, left: morePos.left }}>
                {overflowChannels.map((ch) => (
                  <button key={ch.id} onClick={() => { onSelect(ch.id); setShowMore(false); }}
                    onContextMenu={(e) => { e.preventDefault(); setShowMore(false); setCtxMenu({ id: ch.id, top: e.clientY, left: e.clientX }); }}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-surface-2 transition-colors ${
                      activeChannel === ch.id ? "text-ink font-medium bg-surface-2" : "text-muted"
                    }`}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ch.color || "#5b5bd6" }} />
                    {ch.name}
                    <span className="text-[10px] text-muted/60 ml-auto">{ch.issue_count}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Create channel */}
      {showCreate ? (
        <div className="flex items-center gap-1 shrink-0">
          <input ref={inputRef} value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setShowCreate(false); setNewName(""); } }}
            placeholder="Channel name..."
            className="px-2 py-1 text-[12px] text-ink bg-surface border border-accent/30 rounded-md outline-none focus:border-accent w-[130px] placeholder:text-muted/40" />
          <button onClick={handleCreate} disabled={!newName.trim()}
            className="px-2 py-1 text-[10.5px] font-medium bg-ink text-surface rounded-md hover:opacity-90 disabled:opacity-30">Add</button>
          <button onClick={() => { setShowCreate(false); setNewName(""); }}
            className="px-1.5 py-1 text-[10.5px] text-muted hover:text-ink">
            <X size={12} />
          </button>
        </div>
      ) : (
        <button onClick={() => setShowCreate(true)}
          className="px-2 py-1.5 text-[12px] text-muted hover:text-ink transition-colors shrink-0 flex items-center gap-1">
          <Plus size={12} /> Channel
        </button>
      )}

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <div className="fixed z-50 w-[150px] bg-surface border border-border rounded-lg shadow-popover py-1"
            style={{ top: ctxMenu.top, left: ctxMenu.left }}>
            <button onClick={async () => {
              const ch = channels.find((c) => c.id === ctxMenu.id);
              setCtxMenu(null);
              if (!ch) return;
              try {
                const info = await api.get<{ name: string; active_issues: number; total_issues: number }>(`/channels/${ch.id}/check`);
                setConfirmDelete({ id: ch.id, name: info.name, active: info.active_issues, total: info.total_issues });
              } catch { setConfirmDelete({ id: ch.id, name: ch.name, active: 0, total: 0 }); }
            }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              <Trash2 size={12} /> Delete channel
            </button>
          </div>
        </>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center"
            onClick={() => setConfirmDelete(null)}>
            <div className="bg-surface border border-border rounded-xl shadow-xl w-[380px] p-5"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[15px] font-semibold text-ink mb-2">
                Delete "{confirmDelete.name}"?
              </h3>

              {confirmDelete.active > 0 ? (
                <div className="mb-4">
                  <div className="px-3 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg mb-3">
                    <p className="text-[12.5px] text-amber-800 dark:text-amber-300 font-medium">
                      This channel has {confirmDelete.active} active issue{confirmDelete.active !== 1 ? "s" : ""} (open or in progress).
                    </p>
                  </div>
                  <p className="text-[12.5px] text-muted leading-relaxed">
                    {confirmDelete.total} issue{confirmDelete.total !== 1 ? "s" : ""} will be unlinked from this channel. The issues won't be deleted.
                  </p>
                </div>
              ) : confirmDelete.total > 0 ? (
                <p className="text-[12.5px] text-muted leading-relaxed mb-4">
                  {confirmDelete.total} issue{confirmDelete.total !== 1 ? "s" : ""} will be unlinked from this channel. The issues won't be deleted.
                </p>
              ) : (
                <p className="text-[12.5px] text-muted leading-relaxed mb-4">
                  This channel has no issues. It will be permanently deleted.
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmDelete(null)}
                  className="px-3.5 py-2 text-[12.5px] font-medium text-ink border border-border rounded-lg hover:bg-surface-2 transition-colors">
                  Cancel
                </button>
                <button onClick={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}
                  className="px-3.5 py-2 text-[12.5px] font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Delete channel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE A · EMPTY STATE
   ══════════════════════════════════════════════════════════════════════════ */

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex-1 grid place-items-center p-10 bg-surface-2/30">
      <div className="flex flex-col items-center gap-5 max-w-[480px] text-center">
        {/* Illustration: stacked cards */}
        <div className="relative w-[120px] h-[120px]">
          <div className="absolute left-4 top-[22px] w-[92px] h-[60px] bg-surface border border-border rounded-[10px] rotate-[-6deg] shadow-sm" />
          <div className="absolute left-3.5 top-4 w-[92px] h-[60px] bg-surface border border-border rounded-[10px] rotate-[3deg] shadow-sm" />
          <div className="absolute left-3 top-2.5 w-24 h-16 bg-surface border border-border-hard rounded-[10px] shadow-md p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border-2 border-accent" />
              <div className="w-12 h-1.5 rounded bg-border" />
            </div>
            <div className="w-4/5 h-[5px] rounded bg-border" />
            <div className="w-3/5 h-[5px] rounded bg-border" />
            <div className="flex gap-1 mt-auto">
              <span className="w-[26px] h-2 rounded bg-accent-soft" />
              <span className="w-[18px] h-2 rounded bg-surface-2" />
            </div>
          </div>
        </div>

        <div>
          <div className="text-lg font-semibold text-ink tracking-tight mb-1.5">No issues yet</div>
          <div className="text-[13px] text-muted leading-relaxed max-w-[360px]">
            Create your first issue to start tracking bugs, features and tasks. You can also import from a CSV or your existing tracker.
          </div>
        </div>

        <div className="flex gap-2 mt-1">
          <button onClick={onCreateClick}
            className="px-3.5 py-1.5 bg-ink text-surface text-[12px] font-medium rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5">
            <Plus size={13} /> Create issue
          </button>
          <button className="px-3.5 py-1.5 text-[12px] font-medium text-ink border border-border rounded-md hover:bg-surface-2 transition-colors">
            Import CSV
          </button>
          <button className="px-3.5 py-1.5 text-[12px] font-medium text-muted hover:text-ink transition-colors">
            Use template &#9662;
          </button>
        </div>

        <div className="mt-4 px-3.5 py-2.5 bg-surface border border-border rounded-lg flex items-center gap-2 text-[12px] text-muted">
          <span>Press</span>
          <kbd className="font-mono text-[11px] font-medium px-[7px] py-0.5 rounded bg-surface-2 border border-border text-ink">C</kbd>
          <span>to create a new issue anywhere in Rivox</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CREATE ISSUE DRAWER
   ══════════════════════════════════════════════════════════════════════════ */

function DrawerBackdrop({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const contentArea = el.closest("[data-issues-page]")?.querySelector("[data-content-area]");
    if (contentArea) {
      const r = contentArea.getBoundingClientRect();
      el.style.top = r.top + "px";
      el.style.left = r.left + "px";
    }
    // Animate in
    requestAnimationFrame(() => { if (el) el.style.opacity = "1"; });
  }, []);
  return <div ref={ref} className="fixed right-0 bottom-0 z-50 bg-black/15 backdrop-blur-[2px] transition-opacity duration-200 ease-out" onClick={onClose} style={{ top: 0, left: 0, opacity: 0 }} />;
}

function DrawerPanel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const contentArea = el.closest("[data-issues-page]")?.querySelector("[data-content-area]");
    if (contentArea) {
      const r = contentArea.getBoundingClientRect();
      el.style.top = r.top + "px";
    }
    // Animate in
    requestAnimationFrame(() => { if (el) { el.style.transform = "translateX(0)"; el.style.opacity = "1"; } });
  }, []);
  return (
    <div ref={ref} className="fixed right-0 bottom-0 z-50 w-full sm:w-[520px] sm:max-w-[85%] bg-surface border-l border-border shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{ top: 0, transform: "translateX(100%)", opacity: 0 }}>
      {children}
    </div>
  );
}

function CreateIssueDrawer({ orgMembers, groups, onCreate, onClose }: {
  orgMembers: OrgMember[]; groups: GroupData[];
  onCreate: (data: Partial<Issue>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("bug");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("medium");
  const [severity, setSeverity] = useState("minor");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [assignedGroup, setAssignedGroup] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [environment, setEnvironment] = useState("");
  const [browser, setBrowser] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { titleRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        title: title.trim(), description: description.trim() || null,
        type, status, priority, severity,
        assigned_to: assignee, assigned_group: assignedGroup,
        due_date: dueDate || null,
        environment: environment || null,
        browser: browser || null,
        steps_to_reproduce: stepsToReproduce.trim() || null,
        expected_behavior: expectedBehavior.trim() || null,
        actual_behavior: actualBehavior.trim() || null,
      } as Partial<Issue>);
    } catch (err) {
      console.error("Failed to create issue:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <DrawerBackdrop onClose={onClose} />

      {/* Drawer */}
      <DrawerPanel>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-[15px] font-semibold text-ink tracking-tight">New Issue</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-surface-2 hover:text-ink transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Title</label>
            <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title..."
              className="w-full px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-muted/40 transition-colors" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              rows={4}
              className="w-full px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-muted/40 resize-none transition-colors" />
          </div>

          {/* Type & Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Type</label>
              <DrawerSelect value={type} options={typeOptions} labels={typeLabel} onChange={setType} />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Status</label>
              <DrawerSelect value={status} options={statusOptions} labels={statusLabel} onChange={setStatus} />
            </div>
          </div>

          {/* Priority & Severity row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Priority</label>
              <DrawerSelect value={priority} options={priorityOptions} labels={priorityLabel} onChange={setPriority} />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Severity</label>
              <DrawerSelect value={severity} options={severityOptions} labels={{}} onChange={setSeverity} />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Assign Person</label>
            <DrawerPersonPicker value={assignee} orgMembers={orgMembers} onChange={setAssignee} />
          </div>

          {/* Team */}
          <div>
            <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Assign Team</label>
            <DrawerTeamPicker value={assignedGroup} groups={groups} onChange={setAssignedGroup} />
          </div>

          {/* Due date & Environment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors" />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Environment</label>
              <DrawerSelect value={environment || "none"} options={["none", "prod", "staging", "dev"]}
                labels={{ none: "Select...", prod: "Production", staging: "Staging", dev: "Development" }}
                onChange={(v) => setEnvironment(v === "none" ? "" : v)} />
            </div>
          </div>

          {/* Browser */}
          <div>
            <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Browser</label>
            <input value={browser} onChange={(e) => setBrowser(e.target.value)}
              placeholder="e.g. Chrome 125, Safari 18..."
              className="w-full px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-muted/40 transition-colors" />
          </div>

          {/* Steps to reproduce */}
          <div>
            <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Steps to Reproduce</label>
            <textarea value={stepsToReproduce} onChange={(e) => setStepsToReproduce(e.target.value)}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
              rows={3}
              className="w-full px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-muted/40 resize-none transition-colors" />
          </div>

          {/* Expected & Actual */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Expected Behavior</label>
              <textarea value={expectedBehavior} onChange={(e) => setExpectedBehavior(e.target.value)}
                placeholder="What should happen..."
                rows={2}
                className="w-full px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-muted/40 resize-none transition-colors" />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Actual Behavior</label>
              <textarea value={actualBehavior} onChange={(e) => setActualBehavior(e.target.value)}
                placeholder="What actually happens..."
                rows={2}
                className="w-full px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-muted/40 resize-none transition-colors" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border flex items-center gap-2 shrink-0">
          <button onClick={onClose}
            className="px-3.5 py-2 text-[12.5px] font-medium text-muted border border-border rounded-lg hover:bg-surface-2 hover:text-ink transition-colors">
            Cancel
          </button>
          <div className="flex-1" />
          <button onClick={handleSubmit} disabled={!title.trim() || saving}
            className="px-4 py-2 bg-ink text-surface text-[12.5px] font-medium rounded-lg hover:opacity-90 disabled:opacity-30 transition-opacity flex items-center gap-1.5">
            <Plus size={13} />
            {saving ? "Creating..." : "Create issue"}
          </button>
        </div>
      </DrawerPanel>
    </>
  );
}

/* ── Drawer select (simple native-styled) ── */

function DrawerSelect({ value, options, labels, onChange }: {
  value: string; options: string[]; labels: Record<string, string>; onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 appearance-none transition-colors"
      style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%2371717a' d='M0 0h10L5 6z'/></svg>")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
      {options.map((opt) => (
        <option key={opt} value={opt}>{labels[opt] || opt.charAt(0).toUpperCase() + opt.slice(1).replace(/_/g, " ")}</option>
      ))}
    </select>
  );
}

/* ── Drawer person picker (full-width field style) ── */

function DrawerPersonPicker({ value, orgMembers, onChange }: {
  value: string | null; orgMembers: OrgMember[]; onChange: (uid: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = orgMembers.find((m) => m.user.id === value)?.user || null;
  const filtered = orgMembers.filter((m) => {
    if (!search) return true;
    const name = (m.user.display_name || m.user.username).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-lg flex items-center gap-2.5 hover:border-accent/50 transition-colors text-left">
        {selected ? (
          <>
            <Avatar user={selected} size={24} />
            <span className="text-ink font-medium">{selected.display_name || selected.username}</span>
          </>
        ) : (
          <>
            <span className="w-6 h-6 rounded-full border-[1.5px] border-dashed border-border shrink-0" />
            <span className="text-muted/50">Select person...</span>
          </>
        )}
        <ChevronDown size={13} className="ml-auto text-muted/50" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-surface border border-border rounded-lg shadow-popover overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-2 rounded-md">
              <Search size={12} className="text-muted shrink-0" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..."
                autoFocus className="flex-1 text-[12px] bg-transparent outline-none text-ink placeholder:text-muted/40" />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto py-1">
            {selected && (
              <button onClick={() => { onChange(null); setOpen(false); setSearch(""); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[12.5px] text-muted hover:bg-surface-2 transition-colors">
                <span className="w-6 h-6 rounded-full border-[1.5px] border-dashed border-border" />
                Unassign
              </button>
            )}
            {filtered.map((m) => (
              <button key={m.user.id} onClick={() => { onChange(m.user.id); setOpen(false); setSearch(""); }}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-[12.5px] hover:bg-surface-2 transition-colors ${value === m.user.id ? "bg-accent-soft/20 text-ink font-medium" : "text-ink/80"}`}>
                <Avatar user={m.user} size={24} />
                <div className="flex flex-col items-start">
                  <span>{m.user.display_name || m.user.username}</span>
                  {m.user.display_name && <span className="text-[10.5px] text-muted">@{m.user.username}</span>}
                </div>
                {value === m.user.id && <span className="ml-auto text-accent text-[11px]">&#10003;</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-[12px] text-muted">No members found</div>
            )}
          </div>
        </div>
      )}
      {open && <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setSearch(""); }} />}
    </div>
  );
}

/* ── Drawer team picker (full-width field style) ── */

function DrawerTeamPicker({ value, groups, onChange }: {
  value: string | null; groups: GroupData[]; onChange: (gid: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = groups.find((g) => g.id === value) || null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-lg flex items-center gap-2.5 hover:border-accent/50 transition-colors text-left">
        {selected ? (
          <>
            <span className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
              style={{ background: selected.color || "#5b5bd6" }}>{selected.name[0]}</span>
            <span className="text-ink font-medium">{selected.name}</span>
            <span className="text-[11px] text-muted">{selected.member_count} members</span>
          </>
        ) : (
          <>
            <span className="w-6 h-6 rounded-md border-[1.5px] border-dashed border-border shrink-0" />
            <span className="text-muted/50">Select team...</span>
          </>
        )}
        <ChevronDown size={13} className="ml-auto text-muted/50" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-surface border border-border rounded-lg shadow-popover overflow-hidden">
          <div className="max-h-[200px] overflow-y-auto py-1">
            {selected && (
              <button onClick={() => { onChange(null); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[12.5px] text-muted hover:bg-surface-2 transition-colors">
                <span className="w-6 h-6 rounded-md border-[1.5px] border-dashed border-border" />
                Unassign
              </button>
            )}
            {groups.map((g) => (
              <button key={g.id} onClick={() => { onChange(g.id); setOpen(false); }}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-[12.5px] hover:bg-surface-2 transition-colors ${value === g.id ? "bg-accent-soft/20 text-ink font-medium" : "text-ink/80"}`}>
                <span className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: g.color || "#5b5bd6" }}>{g.name[0]}</span>
                <div className="flex flex-col items-start">
                  <span>{g.name}</span>
                  <span className="text-[10.5px] text-muted">{g.member_count} members</span>
                </div>
                {value === g.id && <span className="ml-auto text-accent text-[11px]">&#10003;</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      {open && <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE B · SHEET VIEW
   ══════════════════════════════════════════════════════════════════════════ */

const SHEET_COLS = "50px 1fr 110px 110px 96px 92px 132px 110px 96px 40px";

function SheetView({ issues, orgMembers, groups, selectedId, setSelectedId, showNewRow, setShowNewRow, onUpdate, onDelete, onCreate, allCount }: {
  issues: Issue[]; orgMembers: OrgMember[]; groups: GroupData[];
  selectedId: string | null; setSelectedId: (id: string | null) => void;
  showNewRow: boolean; setShowNewRow: (v: boolean) => void;
  onUpdate: (id: string, f: string, v: string | null) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Partial<Issue>) => void;
  allCount: number;
}) {
  return (
    <div className="h-full overflow-auto bg-surface">
      {/* Header row */}
      <div className="grid items-center px-5 py-2.5 bg-surface-2 border-b border-border sticky top-0 z-10 text-[10.5px] font-semibold text-muted uppercase tracking-[0.06em]"
        style={{ gridTemplateColumns: SHEET_COLS }}>
        <div>#</div><div>Title</div><div>Type</div><div>Status</div><div>Priority</div><div>Severity</div><div>Assignee</div><div>Team</div><div>Created</div><div />
      </div>

      {showNewRow && <NewIssueRow orgMembers={orgMembers} groups={groups} onCreate={onCreate} onCancel={() => setShowNewRow(false)} />}

      {issues.map((issue) => (
        <SheetRow key={issue.id} issue={issue} selected={selectedId === issue.id}
          onSelect={() => setSelectedId(selectedId === issue.id ? null : issue.id)}
          orgMembers={orgMembers} groups={groups} onUpdate={onUpdate} onDelete={onDelete} />
      ))}

      {!showNewRow && (
        <div onClick={() => setShowNewRow(true)}
          className="flex items-center gap-2 px-5 py-3 border-b border-border text-muted text-[12.5px] font-medium tracking-tight cursor-pointer hover:bg-surface-2/60 transition-colors">
          <Plus size={13} /> New issue <span className="flex-1" />
          <span className="font-mono text-[10.5px] text-muted/40">or press C</span>
        </div>
      )}

      {issues.length === 0 && !showNewRow && allCount > 0 && (
        <div className="px-5 py-16 text-center text-sm text-muted">No issues match your filters.</div>
      )}
    </div>
  );
}

function SheetRow({ issue, selected, onSelect, orgMembers, groups, onUpdate, onDelete }: {
  issue: Issue; selected: boolean; onSelect: () => void;
  orgMembers: OrgMember[]; groups: GroupData[];
  onUpdate: (id: string, f: string, v: string | null) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div data-sheet-row onClick={onSelect}
      className={`grid items-center px-5 h-11 border-b border-border transition-colors group cursor-pointer ${selected ? "bg-surface-2" : "hover:bg-surface-2/50"}`}
      style={{ gridTemplateColumns: SHEET_COLS }}>
      <Link to={`/issues/${issue.id}`} onClick={(e) => e.stopPropagation()}
        className="text-[11.5px] text-muted font-mono hover:text-accent hover:underline transition-colors">
        {issue.number}
      </Link>
      <div className="pr-3.5 overflow-hidden">
        <IssueHoverPreview issue={issue}>
          <Link to={`/issues/${issue.id}`} onClick={(e) => e.stopPropagation()}
            className="text-[13px] font-medium text-ink tracking-tight truncate block hover:text-accent transition-colors">
            {issue.title}
          </Link>
        </IssueHoverPreview>
      </div>
      <div className="overflow-hidden"><TypeChip value={issue.type} options={typeOptions} onChange={(v) => onUpdate(issue.id, "type", v)} /></div>
      <div className="overflow-hidden"><StatusDropdown value={issue.status} options={statusOptions} onChange={(v) => onUpdate(issue.id, "status", v)} /></div>
      <div><PriorityDropdown value={issue.priority} options={priorityOptions} onChange={(v) => onUpdate(issue.id, "priority", v)} /></div>
      <div><SeverityDropdown value={issue.severity} options={severityOptions} onChange={(v) => onUpdate(issue.id, "severity", v)} /></div>
      <div><PersonPicker value={issue.assignee || null} orgMembers={orgMembers} onChange={(uid) => onUpdate(issue.id, "assigned_to", uid)} /></div>
      <div><TeamPicker value={issue.assignedGroup || null} groups={groups} onChange={(gid) => onUpdate(issue.id, "assigned_group", gid)} /></div>
      <div className="text-[12px] text-ink/70 font-medium tracking-tight">
        {formatDate(issue.created_at || issue.createdAt)}
      </div>
      <div className="flex justify-end"><RowActions onDelete={() => onDelete(issue.id)} /></div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE C · BOARD (KANBAN) VIEW
   ══════════════════════════════════════════════════════════════════════════ */

const boardColumns = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "resolved", label: "In review" },
  { key: "closed", label: "Done" },
];

function BoardView({ issues, onUpdate, onDelete, onCreateClick }: {
  issues: Issue[];
  onUpdate: (id: string, f: string, v: string | null) => void;
  onDelete: (id: string) => void;
  onCreateClick: () => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const byStatus = (st: string) => issues.filter((i) => i.status === st);

  const dragIssue = dragId ? issues.find((i) => i.id === dragId) : null;

  const findColumn = useCallback((clientX: number) => {
    for (let i = 0; i < colRefs.current.length; i++) {
      const el = colRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) return boardColumns[i].key;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!dragId) return;
    const onMove = (e: PointerEvent) => {
      setGhostPos({ x: e.clientX, y: e.clientY });
      setDropTarget(findColumn(e.clientX));
    };
    const onUp = () => {
      if (dragId && dropTarget) {
        const issue = issues.find((i) => i.id === dragId);
        if (issue && issue.status !== dropTarget) {
          onUpdate(dragId, "status", dropTarget);
        }
      }
      setDragId(null);
      setDropTarget(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [dragId, dropTarget, issues, onUpdate, findColumn]);

  return (
    <div className="h-full p-5 overflow-auto relative bg-surface-2/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 h-full">
        {boardColumns.map((col, ci) => {
          const colIssues = byStatus(col.key);
          const isOver = dropTarget === col.key && dragId !== null;
          return (
            <div key={col.key} ref={(el) => { colRefs.current[ci] = el; }}
              className={`flex flex-col gap-2.5 min-h-[200px] rounded-xl p-2 -m-2 transition-colors ${
                isOver ? "bg-accent/[0.06] ring-2 ring-accent/20 ring-inset" : ""
              }`}>
              {/* Column header */}
              <div className="flex items-center gap-2 px-0.5 py-1">
                <StatusDotIcon status={col.key} />
                <span className="text-[12.5px] font-semibold text-ink tracking-tight">{col.label}</span>
                <span className="text-[10.5px] text-muted font-medium px-1.5 py-0.5 bg-surface-2 rounded-full">{colIssues.length}</span>
                <div className="flex-1" />
                <button onClick={onCreateClick} className="w-5 h-5 rounded flex items-center justify-center text-muted hover:text-accent hover:bg-surface-2 transition-colors">
                  <Plus size={13} />
                </button>
              </div>

              {/* Cards */}
              {colIssues.map((iss) => (
                <BoardCard key={iss.id} issue={iss} onUpdate={onUpdate} onDelete={onDelete}
                  isDragging={dragId === iss.id}
                  onDragStart={(e) => {
                    e.preventDefault();
                    setDragId(iss.id);
                    setGhostPos({ x: e.clientX, y: e.clientY });
                  }} />
              ))}

              {/* Drop placeholder */}
              {isOver && <div className="py-4 border-2 border-dashed border-accent/30 rounded-lg bg-accent/[0.04]" />}

              {/* Add card */}
              <div onClick={onCreateClick}
                className="py-2 px-2.5 border border-dashed border-border-hard rounded-lg text-center text-[11.5px] text-muted tracking-tight cursor-pointer hover:border-accent hover:text-accent transition-colors">
                + Issue
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating ghost card */}
      {dragIssue && (
        <div className="fixed z-50 w-[240px] pointer-events-none opacity-90 rotate-[2deg] scale-[1.03]"
          style={{ left: ghostPos.x - 120, top: ghostPos.y - 30 }}>
          <div className="bg-surface border border-border rounded-[10px] p-3 shadow-2xl">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium"
                style={{ background: typeColors[dragIssue.type]?.bg || "#f4f4f5", color: typeColors[dragIssue.type]?.fg || "#52525b" }}>
                {typeLabel[dragIssue.type]}
              </span>
              <span className="text-[10px] text-muted font-mono">#{dragIssue.number}</span>
            </div>
            <div className="text-[12px] font-medium text-ink truncate">{dragIssue.title}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function BoardCard({ issue, onUpdate, onDelete, isDragging, onDragStart }: {
  issue: Issue;
  onUpdate: (id: string, f: string, v: string | null) => void;
  onDelete: (id: string) => void;
  isDragging: boolean;
  onDragStart: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        onDragStart(e);
      }}
      className={`bg-surface border border-border rounded-[10px] p-3 flex flex-col gap-2.5 shadow-sm group/card cursor-grab active:cursor-grabbing transition-all select-none ${
        isDragging ? "opacity-30 scale-[0.97] ring-2 ring-accent/30" : "hover:shadow-md"
      }`}>
      <div className="flex items-center gap-1.5">
        <TypeChip value={issue.type} options={typeOptions} onChange={(v) => onUpdate(issue.id, "type", v)} />
        <span className="text-[10.5px] text-muted font-mono">#{issue.number}</span>
        <div className="flex-1" />
        <RowActions onDelete={() => onDelete(issue.id)} />
      </div>
      <Link to={`/issues/${issue.id}`} className="text-[12.5px] font-medium text-ink tracking-tight leading-snug hover:text-accent transition-colors">{issue.title}</Link>
      <div className="flex items-center gap-1.5 pt-1.5 border-t border-border">
        <PriorityBarsIcon priority={issue.priority} />
        <span className="text-[12px] font-medium text-ink/70 tracking-tight">{priorityLabel[issue.priority] || issue.priority}</span>
        <div className="flex-1" />
        <span className="text-[10.5px] text-muted">{formatDate(issue.created_at || issue.createdAt)}</span>
        {issue.assignee && <Avatar user={issue.assignee} size={20} />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE D · LIST VIEW (with detail panel)
   ══════════════════════════════════════════════════════════════════════════ */

function ListView({ issues, orgMembers, groups, selectedIssue, selectedId, setSelectedId, onUpdate, onDelete }: {
  issues: Issue[]; orgMembers: OrgMember[]; groups: GroupData[];
  selectedIssue: Issue | null; selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onUpdate: (id: string, f: string, v: string | null) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="h-full flex min-h-0">
      {/* Compressed list */}
      <div className={`overflow-auto bg-surface ${selectedIssue ? "w-[65%] border-r border-border" : "flex-1"}`}>
        {issues.map((iss) => {
          const isSel = iss.id === selectedId;
          return (
            <div key={iss.id} onClick={() => setSelectedId(isSel ? null : iss.id)}
              className={`relative px-4 py-3 border-b border-border cursor-pointer transition-colors ${isSel ? "bg-accent-soft/30" : "hover:bg-surface-2/50"}`}>
              {isSel && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r" />}
              <div className="flex items-center gap-2 mb-1">
                <TypeChip value={iss.type} options={typeOptions} onChange={(v) => onUpdate(iss.id, "type", v)} />
                <span className="text-[11px] text-muted font-mono">#{iss.number}</span>
                <div className="flex-1" />
                <PriorityBarsIcon priority={iss.priority} />
                <span className="text-[12px] font-medium text-ink/70 tracking-tight">{priorityLabel[iss.priority]}</span>
                {iss.assignee && <Avatar user={iss.assignee} size={20} />}
              </div>
              <Link to={`/issues/${iss.id}`} onClick={(e) => e.stopPropagation()}
                className="text-[13px] font-medium text-ink tracking-tight hover:text-accent transition-colors">{iss.title}</Link>
              <div className="flex items-center gap-2.5 mt-1.5">
                <StatusDotIcon status={iss.status} />
                <span className="text-[12px] font-medium text-ink/70">{statusLabel[iss.status]}</span>
                <span className="text-[11px] text-muted">
                  · {iss.assignedGroup?.name || "—"} · {formatDate(iss.created_at || iss.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedIssue && (
        <DetailPanel issue={selectedIssue} orgMembers={orgMembers} groups={groups}
          onClose={() => setSelectedId(null)} onUpdate={onUpdate} onDelete={onDelete} />
      )}
    </div>
  );
}

function DetailPanel({ issue, orgMembers, groups, onClose, onUpdate, onDelete }: {
  issue: Issue; orgMembers: OrgMember[]; groups: GroupData[];
  onClose: () => void;
  onUpdate: (id: string, f: string, v: string | null) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="w-[35%] flex-shrink-0 overflow-auto p-5 bg-surface">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <TypeChip value={issue.type} options={typeOptions} onChange={(v) => onUpdate(issue.id, "type", v)} />
        <span className="text-[11.5px] text-muted font-mono">#{issue.number}</span>
        <div className="flex-1" />
        <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-muted hover:bg-surface-2 transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="text-lg font-semibold text-ink tracking-tight leading-snug mb-3.5">
        {issue.title}
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-[80px_1fr] gap-3 py-3.5 border-t border-b border-border text-[12px]">
        <div className="text-muted">Status</div>
        <div><StatusDropdown value={issue.status} options={statusOptions} onChange={(v) => onUpdate(issue.id, "status", v)} /></div>
        <div className="text-muted">Priority</div>
        <div><PriorityDropdown value={issue.priority} options={priorityOptions} onChange={(v) => onUpdate(issue.id, "priority", v)} /></div>
        <div className="text-muted">Severity</div>
        <div><SeverityDropdown value={issue.severity} options={severityOptions} onChange={(v) => onUpdate(issue.id, "severity", v)} /></div>
        <div className="text-muted">Assignee</div>
        <div><PersonPicker value={issue.assignee || null} orgMembers={orgMembers} onChange={(uid) => onUpdate(issue.id, "assigned_to", uid)} /></div>
        <div className="text-muted">Team</div>
        <div><TeamPicker value={issue.assignedGroup || null} groups={groups} onChange={(gid) => onUpdate(issue.id, "assigned_group", gid)} /></div>
        <div className="text-muted">Due</div>
        <div className="text-ink/80 font-medium">{formatDate(issue.due_date) || "—"}</div>
      </div>

      {/* Description */}
      <div className="mt-4 mb-2 text-[12.5px] font-semibold text-ink">Description</div>
      <div className="text-[12.5px] text-ink/70 leading-relaxed tracking-tight">
        {issue.description || <span className="text-muted/50 italic">No description provided.</span>}
      </div>

      {/* Delete */}
      <div className="mt-6 pt-4 border-t border-border">
        <button onClick={() => onDelete(issue.id)}
          className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-600 border border-red-200 dark:border-red-900 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
          <Trash2 size={12} /> Delete issue
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SHARED CELL COMPONENTS
   ══════════════════════════════════════════════════════════════════════════ */

function ToolbarDropdown({ label, value, options, labels, onChange }: {
  label: string; value: string | null; options: string[]; labels?: Record<string, string>; onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const getLabel = (v: string) => labels?.[v] || v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");
  return (
    <>
      <button ref={btnRef}
        onClick={() => { if (!options.length) return; if (btnRef.current) { const r = btnRef.current.getBoundingClientRect(); setPos({ top: r.bottom + 4, left: r.left }); } setOpen(!open); }}
        className={`px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1 ${value ? "bg-accent-soft/20 text-accent" : "text-muted hover:text-ink hover:bg-surface-2"}`}>
        {value ? `${label}: ${getLabel(value)}` : label}
        {options.length > 0 && <ChevronDown size={11} className="text-muted/60" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-44 bg-surface border border-border rounded-lg shadow-popover py-1" style={{ top: pos.top, left: pos.left }}>
            <button onClick={() => { onChange(null); setOpen(false); }}
              className={`w-full px-3 py-1.5 text-[12px] text-left transition-colors ${!value ? "text-ink font-medium bg-surface-2" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>All</button>
            {options.map((opt) => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full px-3 py-1.5 text-[12px] text-left transition-colors ${value === opt ? "text-ink font-medium bg-surface-2" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                {getLabel(opt)}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ── Type chip (dot + label pill) ── */

function TypeChip({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  return (
    <>
      <button ref={ref}
        onClick={(e) => { e.stopPropagation(); if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.bottom + 2, left: r.left }); } setOpen(!open); }}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium max-w-full truncate"
        style={{ background: typeColors[value]?.bg || "#f4f4f5", color: typeColors[value]?.fg || "#52525b" }}>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: typeDot[value] || "#71717a" }} />
        {typeLabel[value] || value}
      </button>
      {open && <DropdownMenu pos={pos} onClose={() => setOpen(false)} options={options}
        value={value} onChange={onChange} renderOption={(opt) => (
          <><span className="w-1.5 h-1.5 rounded-full" style={{ background: typeDot[opt] }} />{typeLabel[opt] || opt}</>
        )} />}
    </>
  );
}

/* ── Status dropdown (circle + label) ── */

function StatusDropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  return (
    <>
      <button ref={ref}
        onClick={(e) => { e.stopPropagation(); if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.bottom + 2, left: r.left }); } setOpen(!open); }}
        className="inline-flex items-center gap-[7px] text-[12px] font-medium text-ink/70 dark:text-ink/80 tracking-tight">
        <StatusDotIcon status={value} />
        {statusLabel[value] || value.replace(/_/g, " ")}
      </button>
      {open && <DropdownMenu pos={pos} onClose={() => setOpen(false)} options={options} value={value} onChange={onChange}
        renderOption={(opt) => (<><StatusDotIcon status={opt} />{statusLabel[opt] || opt.replace(/_/g, " ")}</>)} width={160} />}
    </>
  );
}

/* ── Priority dropdown (bars + label) ── */

function PriorityDropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  return (
    <>
      <button ref={ref}
        onClick={(e) => { e.stopPropagation(); if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.bottom + 2, left: r.left }); } setOpen(!open); }}
        className="inline-flex items-center gap-[7px] text-[12px] font-medium text-ink/70 dark:text-ink/80 tracking-tight">
        <PriorityBarsIcon priority={value} />
        {priorityLabel[value] || value}
      </button>
      {open && <DropdownMenu pos={pos} onClose={() => setOpen(false)} options={options} value={value} onChange={onChange}
        renderOption={(opt) => (<><PriorityBarsIcon priority={opt} />{priorityLabel[opt] || opt}</>)} />}
    </>
  );
}

/* ── Severity dropdown ── */

function SeverityDropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const sc = severityColors[value];
  return (
    <>
      <button ref={ref}
        onClick={(e) => { e.stopPropagation(); if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.bottom + 2, left: r.left }); } setOpen(!open); }}
        className={`text-[11px] font-medium tracking-tight ${sc ? "px-2 py-0.5 rounded" : "text-muted"}`}
        style={sc ? { background: sc.bg, color: sc.fg } : undefined}>
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </button>
      {open && <DropdownMenu pos={pos} onClose={() => setOpen(false)} options={options} value={value} onChange={onChange}
        renderOption={(opt) => <>{opt.charAt(0).toUpperCase() + opt.slice(1)}</>} width={128} />}
    </>
  );
}

/* ── Person picker ── */

function PersonPicker({ value, orgMembers, onChange }: {
  value: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
  orgMembers: OrgMember[]; onChange: (uid: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<React.CSSProperties>({});
  return (
    <>
      <button ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          if (ref.current) {
            const r = ref.current.getBoundingClientRect();
            const fitsBelow = r.bottom + 208 < window.innerHeight;
            const left = Math.min(r.left, window.innerWidth - 200);
            setPos(fitsBelow ? { top: r.bottom + 2, left } : { bottom: window.innerHeight - r.top + 2, left });
          }
          setOpen(!open);
        }}
        className="inline-flex items-center gap-2 text-[12px] text-ink/70 dark:text-ink/80 font-medium tracking-tight">
        {value ? (<><Avatar user={value} size={22} /><span className="truncate">{value.display_name || value.username}</span></>)
          : (<span className="inline-flex items-center gap-2 text-muted/50 hover:text-muted transition-colors">
              <span className="w-[22px] h-[22px] rounded-full border-[1.5px] border-dashed border-border shrink-0 flex items-center justify-center"><Plus size={9} /></span>
              Assign
            </span>)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-48 bg-surface border border-border rounded-lg shadow-popover py-1 max-h-[200px] overflow-y-auto" style={pos}>
            <button onClick={() => { onChange(null); setOpen(false); }} className="w-full px-3 py-1.5 text-[12px] text-muted hover:bg-surface-2 text-left">Unassign</button>
            {orgMembers.map((om) => (
              <button key={om.user.id} onClick={() => { onChange(om.user.id); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-surface-2 transition-colors ${value?.id === om.user.id ? "text-ink font-medium" : "text-muted"}`}>
                <Avatar user={om.user} size={20} />
                {om.user.display_name || om.user.username}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ── Team picker ── */

function TeamPicker({ value, groups, onChange }: {
  value: { id: string; name: string; color: string } | null;
  groups: GroupData[]; onChange: (gid: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<React.CSSProperties>({});
  return (
    <>
      <button ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          if (ref.current) {
            const r = ref.current.getBoundingClientRect();
            const dropH = (groups.length + 1) * 32 + 8;
            const fitsBelow = r.bottom + dropH + 8 < window.innerHeight;
            const left = Math.min(r.left, window.innerWidth - 180);
            setPos(fitsBelow ? { top: r.bottom + 2, left } : { bottom: window.innerHeight - r.top + 2, left });
          }
          setOpen(!open);
        }}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink/70 dark:text-ink/80 font-medium tracking-tight">
        {value ? (<>
          <span className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center text-white text-[8px] font-bold" style={{ background: value.color || "#5b5bd6" }}>{value.name[0]}</span>
          <span className="truncate">{value.name}</span>
        </>) : (
          <span className="inline-flex items-center gap-1.5 text-muted/50 hover:text-muted transition-colors">
            <span className="w-3.5 h-3.5 rounded border border-dashed border-border flex items-center justify-center"><Plus size={8} /></span>
            Add team
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-44 bg-surface border border-border rounded-lg shadow-popover py-1" style={pos}>
            <button onClick={() => { onChange(null); setOpen(false); }} className="w-full px-3 py-1.5 text-[12px] text-muted hover:bg-surface-2 text-left">Unassign</button>
            {groups.map((g) => (
              <button key={g.id} onClick={() => { onChange(g.id); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-surface-2 transition-colors ${value?.id === g.id ? "text-ink font-medium" : "text-muted"}`}>
                <span className="w-3.5 h-3.5 rounded flex items-center justify-center text-white text-[8px] font-bold" style={{ background: g.color || "#5b5bd6" }}>{g.name[0]}</span>
                {g.name}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ── Channel picker ── */

function ChannelPicker({ value, channels, onChange }: {
  value: { id: string; name: string; color: string } | null;
  channels: ChannelData[]; onChange: (cid: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<React.CSSProperties>({});
  return (
    <>
      <button ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          if (ref.current) {
            const r = ref.current.getBoundingClientRect();
            const dropH = (channels.length + 1) * 32 + 8;
            const fitsBelow = r.bottom + dropH + 8 < window.innerHeight;
            const left = Math.min(r.left, window.innerWidth - 180);
            setPos(fitsBelow ? { top: r.bottom + 2, left } : { bottom: window.innerHeight - r.top + 2, left });
          }
          setOpen(!open);
        }}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink/70 dark:text-ink/80 font-medium tracking-tight">
        {value ? (<>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: value.color || "#5b5bd6" }} />
          <span className="truncate">{value.name}</span>
        </>) : (
          <span className="inline-flex items-center gap-1.5 text-muted/50 hover:text-muted transition-colors">
            <span className="w-3.5 h-3.5 rounded border border-dashed border-border flex items-center justify-center"><Plus size={8} /></span>
            Add channel
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-44 bg-surface border border-border rounded-lg shadow-popover py-1" style={pos}>
            <button onClick={() => { onChange(null); setOpen(false); }} className="w-full px-3 py-1.5 text-[12px] text-muted hover:bg-surface-2 text-left">None</button>
            {channels.map((ch) => (
              <button key={ch.id} onClick={() => { onChange(ch.id); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] hover:bg-surface-2 transition-colors ${value?.id === ch.id ? "text-ink font-medium" : "text-muted"}`}>
                <span className="w-2 h-2 rounded-full" style={{ background: ch.color || "#5b5bd6" }} />
                {ch.name}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ── Generic dropdown menu ── */

function DropdownMenu({ pos, onClose, options, value, onChange, renderOption, width = 144 }: {
  pos: { top: number; left: number }; onClose: () => void;
  options: string[]; value: string; onChange: (v: string) => void;
  renderOption: (opt: string) => React.ReactNode; width?: number;
}) {
  const dropH = options.length * 32 + 8;
  const fitsBelow = pos.top + dropH + 8 < window.innerHeight;
  const left = Math.min(pos.left, window.innerWidth - width - 8);
  const style: React.CSSProperties = fitsBelow
    ? { top: pos.top, left, width }
    : { bottom: window.innerHeight - pos.top + 28, left, width };
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 bg-surface border border-border rounded-lg shadow-popover py-1"
        style={style}>
        {options.map((opt) => (
          <button key={opt} onClick={() => { onChange(opt); onClose(); }}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-[12px] transition-colors ${value === opt ? "text-ink font-medium bg-surface-2" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
            {renderOption(opt)}
          </button>
        ))}
      </div>
    </>
  );
}

/* ── Hover preview tooltip ── */

function IssueHoverPreview({ issue, children }: { issue: Issue; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const mousePos = useRef({ x: 0, y: 0 });

  const updatePos = (x: number, y: number) => {
    const cardW = 360, cardH = 260;
    const top = y - cardH / 2;
    const left = x + 20;
    setPos({
      top: Math.max(8, Math.min(top, window.innerHeight - cardH - 8)),
      left: left + cardW > window.innerWidth - 8 ? x - cardW - 20 : left,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
    if (show) updatePos(e.clientX, e.clientY);
  };

  const handleEnter = () => {
    timerRef.current = setTimeout(() => {
      const { x, y } = mousePos.current;
      updatePos(x, y);
      setShow(true);
    }, 1000);
  };

  const handleLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(false);
  };

  const created = issue.created_at || issue.createdAt;

  return (
    <div ref={triggerRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave} onMouseMove={handleMouseMove} className="min-w-0">
      {children}
      {show && (
        <div className="fixed z-50 w-[360px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden pointer-events-none"
          style={{ top: pos.top, left: pos.left }}>

          {/* Top gradient glow */}
          <div className="h-20 absolute top-0 left-0 right-0 pointer-events-none rounded-t-2xl" style={{ background: `linear-gradient(to bottom, ${typeDot[issue.type] || "#71717a"}30, ${typeDot[issue.type] || "#71717a"}10 40%, transparent)` }} />

          <div className="p-4 pb-3 relative">
            {/* Header: chips + number */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-medium"
                style={{ background: typeColors[issue.type]?.bg || "#f4f4f5", color: typeColors[issue.type]?.fg || "#52525b" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: typeDot[issue.type] || "#71717a" }} />
                {typeLabel[issue.type] || issue.type}
              </span>
              <StatusDotIcon status={issue.status} size={8} />
              <span className="text-[10.5px] text-ink/60 font-medium">{statusLabel[issue.status]}</span>
              <div className="flex-1" />
              <span className="text-[10.5px] text-muted font-mono">#{issue.number}</span>
            </div>

            {/* Title */}
            <div className="text-[14px] font-semibold text-ink tracking-tight leading-snug mb-1.5">
              {issue.title}
            </div>

            {/* Reporter + date */}
            {(issue.reporter || created) && (
              <div className="flex items-center gap-1.5 mb-3 text-[10.5px] text-muted">
                {issue.reporter && <Avatar user={issue.reporter} size={14} />}
                {issue.reporter && <span>{issue.reporter.display_name || issue.reporter.username}</span>}
                {created && <span>· {new Date(created).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
              </div>
            )}

            {/* Description */}
            <div className="mb-3">
              {issue.description ? (
                <div className="text-[12px] text-ink/55 leading-relaxed line-clamp-4">
                  {issue.description}
                </div>
              ) : (
                <div className="text-[11.5px] text-muted/35 italic">No description provided</div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-surface-2/40 border-t border-border flex items-center gap-3">
            {issue.assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar user={issue.assignee} size={18} />
                <span className="text-[11px] text-ink/70 font-medium">{issue.assignee.display_name || issue.assignee.username}</span>
              </div>
            ) : (
              <span className="text-[11px] text-muted/40">Unassigned</span>
            )}
            <div className="flex-1" />
            <PriorityBarsIcon priority={issue.priority} />
            <span className="text-[10.5px] text-ink/60 font-medium">{priorityLabel[issue.priority]}</span>
            {(issue.created_at || issue.createdAt) && (
              <>
                <span className="text-border">·</span>
                <span className="text-[10.5px] text-muted">{formatDate(issue.created_at || issue.createdAt)}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Row actions (three-dot menu) ── */

function RowActions({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  return (
    <>
      <button ref={ref}
        onClick={(e) => { e.stopPropagation(); if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.bottom + 2, left: r.right - 140 }); } setOpen(!open); }}
        className="w-6 h-6 rounded flex items-center justify-center text-muted opacity-0 group-hover:opacity-100 group-hover/card:opacity-100 hover:bg-surface-2 transition-all">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-[140px] bg-surface border border-border rounded-lg shadow-popover py-1" style={{ top: pos.top, left: pos.left }}>
            <button onClick={() => { onDelete(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              <Trash2 size={12} /> Delete issue
            </button>
          </div>
        </>
      )}
    </>
  );
}

/* ── New Issue Row (sheet) ── */

function NewIssueRow({ orgMembers, groups, onCreate, onCancel }: {
  orgMembers: OrgMember[]; groups: GroupData[];
  onCreate: (data: Partial<Issue>) => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("bug");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("medium");
  const [severity, setSeverity] = useState("minor");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [assignedGroup, setAssignedGroup] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), type, status, priority, severity, assigned_to: assignee, assigned_group: assignedGroup } as Partial<Issue>);
  };

  const assigneeUser = orgMembers.find((m) => m.user.id === assignee)?.user || null;
  const assignedGroupObj = groups.find((g) => g.id === assignedGroup) || null;

  return (
    <div className="grid items-center px-5 h-11 border-b border-border bg-accent/[0.03]" style={{ gridTemplateColumns: SHEET_COLS }}>
      <div><Plus size={13} className="text-accent" /></div>
      <div className="pr-3.5">
        <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
          placeholder="Issue title..."
          className="w-full px-2.5 py-1 text-[12.5px] text-ink bg-surface border border-accent/30 rounded-md outline-none focus:border-accent ring-2 ring-accent/10 placeholder:text-muted/40" />
      </div>
      <div><TypeChip value={type} options={typeOptions} onChange={setType} /></div>
      <div><StatusDropdown value={status} options={statusOptions} onChange={setStatus} /></div>
      <div><PriorityDropdown value={priority} options={priorityOptions} onChange={setPriority} /></div>
      <div><SeverityDropdown value={severity} options={severityOptions} onChange={setSeverity} /></div>
      <div><PersonPicker value={assigneeUser} orgMembers={orgMembers} onChange={setAssignee} /></div>
      <div><TeamPicker value={assignedGroupObj ? { id: assignedGroupObj.id, name: assignedGroupObj.name, color: assignedGroupObj.color || "#5b5bd6" } : null} groups={groups} onChange={setAssignedGroup} /></div>
      <div className="col-span-2 flex items-center gap-2">
        <div className="flex gap-1 ml-auto shrink-0">
          <button onClick={handleSubmit} disabled={!title.trim()} className="px-2.5 py-1 bg-ink text-surface text-[10.5px] font-medium rounded-md hover:opacity-90 disabled:opacity-30">Save</button>
          <button onClick={onCancel} className="px-2 py-1 text-[10.5px] text-muted hover:text-ink rounded-md hover:bg-surface-2">Esc</button>
        </div>
      </div>
    </div>
  );
}

/* ── Comment item with edit/delete ── */

function CommentItem({ comment, isOwn, onEdit, onDelete }: {
  comment: IssueComment; isOwn: boolean;
  onEdit: (body: string) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const ts = (() => {
    const d = new Date(comment.created_at || comment.createdAt || "");
    return isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  })();

  return (
    <div className="flex gap-2.5 items-start group/comment">
      <Avatar user={comment.author} size={24} />
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] font-medium text-ink">{comment.author.display_name || comment.author.username}</span>
          <span className="text-[10.5px] text-muted">{ts}</span>
          {isOwn && !editing && (
            <>
              <button ref={menuRef}
                onClick={() => {
                  if (menuRef.current) { const r = menuRef.current.getBoundingClientRect(); setMenuPos({ top: r.bottom + 2, left: r.left }); }
                  setMenuOpen(!menuOpen);
                }}
                className="ml-auto opacity-0 group-hover/comment:opacity-100 transition-opacity text-muted hover:text-ink">
                <MoreHorizontal size={13} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="fixed z-50 w-[120px] bg-surface border border-border rounded-lg shadow-popover py-1"
                    style={{ top: menuPos.top, left: Math.min(menuPos.left, window.innerWidth - 128) }}>
                    <button onClick={() => { setEditing(true); setDraft(comment.body); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-ink hover:bg-surface-2 transition-colors">
                      <Edit3 size={11} /> Edit
                    </button>
                    <button onClick={() => { onDelete(); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        {editing ? (
          <div className="mt-1">
            <textarea ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} rows={2}
              onKeyDown={(e) => { if (e.key === "Escape") { setEditing(false); setDraft(comment.body); } }}
              className="w-full px-3 py-2 text-[12.5px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 resize-none" />
            <div className="flex gap-1.5 mt-1.5">
              <button onClick={() => { if (draft.trim()) { onEdit(draft.trim()); setEditing(false); } }}
                disabled={!draft.trim() || draft.trim() === comment.body}
                className="px-2.5 py-1 bg-ink text-surface text-[10.5px] font-medium rounded-md hover:opacity-90 disabled:opacity-30">Save</button>
              <button onClick={() => { setEditing(false); setDraft(comment.body); }}
                className="px-2.5 py-1 text-[10.5px] text-muted hover:text-ink">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="text-[12.5px] text-ink/70 leading-relaxed mt-0.5">{comment.body}</div>
        )}
      </div>
    </div>
  );
}

/* ── Notify button (sends nudge to assignee + reporter) ── */

function DetailMoreMenu({ issueId, onDelete }: { issueId: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  return (
    <>
      <button ref={ref}
        onClick={() => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.bottom + 4, left: r.right - 160 }); } setOpen(!open); }}
        className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted hover:bg-surface-2 transition-colors">
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-[160px] bg-surface border border-border rounded-lg shadow-popover py-1" style={{ top: pos.top, left: pos.left }}>
            <NotifyButton issueId={issueId} inline onDone={() => setOpen(false)} />
            <div className="border-t border-border my-1" />
            <button onClick={() => { onDelete(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              <Trash2 size={12} /> Delete issue
            </button>
          </div>
        </>
      )}
    </>
  );
}

function NotifyButton({ issueId, inline, onDone }: { issueId: string; inline?: boolean; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const send = async () => {
    setSending(true);
    try {
      await api.post(`/issues/${issueId}/notify`, { message: message.trim() || undefined });
      setSent(true);
      setOpen(false);
      setMessage("");
      setTimeout(() => setSent(false), 2000);
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  if (inline) {
    return (
      <button onClick={async () => {
        setSending(true);
        try {
          await api.post(`/issues/${issueId}/notify`, {});
          onDone?.();
        } catch { /* ignore */ }
        finally { setSending(false); }
      }}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-ink hover:bg-surface-2 transition-colors">
        <Bell size={12} /> {sending ? "Sending..." : "Notify team"}
      </button>
    );
  }

  return (
    <>
      <button ref={ref}
        onClick={() => {
          if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 320) }); }
          setOpen(!open);
        }}
        className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 ${
          sent
            ? "bg-green-50 text-green-700 border border-green-200"
            : "text-accent border border-accent/30 hover:bg-accent-soft/20"
        }`}>
        {sent ? (
          <><Check size={12} /> Sent!</>
        ) : (
          <><Bell size={12} /> Notify</>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-[300px] bg-surface border border-border rounded-xl shadow-xl p-3" style={{ top: pos.top, left: pos.left }}>
            <p className="text-[11.5px] font-medium text-ink mb-2">Send a nudge to assignee & reporter</p>
            <p className="text-[10.5px] text-muted mb-3">They'll get an in-app notification + Discord DM (if connected).</p>
            <input ref={inputRef} value={message} onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); if (e.key === "Escape") setOpen(false); }}
              placeholder="Optional message..."
              className="w-full px-3 py-2 text-[12.5px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-muted/40 mb-3" />
            <div className="flex items-center gap-2">
              <button onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-[11.5px] font-medium text-muted hover:text-ink rounded-md hover:bg-surface-2 transition-colors">
                Cancel
              </button>
              <div className="flex-1" />
              <button onClick={send} disabled={sending}
                className="px-3.5 py-1.5 bg-accent text-white text-[11.5px] font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5">
                <Bell size={11} />
                {sending ? "Sending..." : "Send nudge"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ISSUE DETAIL PAGE (standalone route /issues/:issueId)
   ══════════════════════════════════════════════════════════════════════════ */

export function IssueDetailPage({ orgId, userId }: { orgId?: string; userId?: string }) {
  const { issueId } = useParams<{ issueId: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [channels, setChannels] = useState<ChannelData[]>([]);

  const fetchIssue = useCallback(async () => {
    if (!issueId) return;
    try {
      setLoading(true);
      const data = await api.get<Issue>(`/issues/${issueId}`);
      setIssue(data);
      setDescDraft(data.description || "");
    } catch { navigate("/issues"); }
    finally { setLoading(false); }
  }, [issueId, navigate]);

  useEffect(() => { fetchIssue(); }, [fetchIssue]);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      api.get<OrgMember[]>(`/orgs/${orgId}/members`),
      api.get<GroupData[]>(`/orgs/${orgId}/groups`),
      api.get<ChannelData[]>(`/channels`),
    ]).then(([m, g, c]) => { setOrgMembers(m); setGroups(g); setChannels(c); });
  }, [orgId]);

  const update = async (field: string, value: string | null) => {
    if (!issue) return;
    await api.patch(`/issues/${issue.id}`, { [field]: value });
    fetchIssue();
  };

  const saveDesc = async () => {
    await update("description", descDraft.trim() || null);
    setEditingDesc(false);
  };

  const addComment = async () => {
    if (!commentText.trim() || !issue) return;
    await api.post(`/issues/${issue.id}/comments`, { body: commentText.trim() });
    setCommentText("");
    setShowAllComments(false);
    fetchIssue();
  };

  const editComment = async (commentId: string, body: string) => {
    await api.patch(`/comments/${commentId}`, { body });
    fetchIssue();
  };

  const deleteComment = async (commentId: string) => {
    await api.delete(`/comments/${commentId}`);
    fetchIssue();
  };

  const deleteIssue = async () => {
    if (!issue) return;
    await api.delete(`/issues/${issue.id}`);
    navigate("/issues");
  };

  if (loading || !issue) {
    return (
      <div className="flex items-center justify-center h-full -mx-6 -mt-6 -mb-6">
        <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const reporter = issue.reporter;
  const created = issue.created_at || issue.createdAt;
  const nextStatus: Record<string, { label: string; target: string }> = {
    open: { label: "Start progress", target: "in_progress" },
    in_progress: { label: "Move to review", target: "resolved" },
    resolved: { label: "Mark done", target: "closed" },
    closed: { label: "Reopen", target: "open" },
    wont_fix: { label: "Reopen", target: "open" },
  };
  const action = nextStatus[issue.status] || nextStatus.open;

  return (
    <div className="flex flex-col h-full -mx-6 -mt-6 -mb-6 overflow-hidden">
      {/* Top bar */}
      <div className="px-5 py-2.5 bg-surface border-b border-border flex items-center gap-2 shrink-0">
        <Link to="/issues" className="text-[12.5px] text-muted hover:text-ink transition-colors">Issues</Link>
        <ChevronRight size={12} className="text-muted/40" />
        {issue.assignedGroup && (
          <>
            <span className="text-[12.5px] text-muted">{issue.assignedGroup.name}</span>
            <ChevronRight size={12} className="text-muted/40" />
          </>
        )}
        <span className="text-[12.5px] text-ink font-medium">#{issue.number}</span>
        <div className="flex-1" />
        <button onClick={() => navigate(-1 as unknown as string)} className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted hover:bg-surface-2 transition-colors"><ChevronLeft size={14} /></button>
        <button className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted hover:bg-surface-2 transition-colors"><ChevronRight size={14} /></button>
        <div className="w-px h-4 bg-border mx-1" />
        <button className="px-3 py-1.5 text-[12px] font-medium text-ink border border-border rounded-md hover:bg-surface-2 transition-colors flex items-center gap-1.5"><Share2 size={12} /> Share</button>
        <button className="px-3 py-1.5 text-[12px] font-medium text-ink border border-border rounded-md hover:bg-surface-2 transition-colors flex items-center gap-1.5"><Bell size={12} /> Subscribe</button>
        <button onClick={() => update("status", action.target)}
          className="px-3 py-1.5 bg-accent text-white text-[12px] font-medium rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5">
          <Check size={12} /> {action.label}
        </button>
        <DetailMoreMenu issueId={issue.id} onDelete={deleteIssue} />
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Issue header */}
          <div className="flex items-center gap-2 mb-2 text-[12.5px] text-muted">
            <span className="font-mono text-ink font-medium">#{issue.number}</span>
            <span>·</span>
            {reporter && <Avatar user={reporter} size={18} />}
            {reporter && <span className="font-medium text-ink/80">{reporter.display_name || reporter.username}</span>}
            {created && <span>opened on {new Date(created).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>}
          </div>

          {/* Title */}
          <h1 className="text-[24px] font-semibold text-ink tracking-tight leading-snug mb-4">{issue.title}</h1>

          {/* Labeled chip pills */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-[11.5px]">
              <span className="text-muted font-medium">TYPE</span>
              <TypeChip value={issue.type} options={typeOptions} onChange={(v) => update("type", v)} />
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-[11.5px]">
              <span className="text-muted font-medium">STATUS</span>
              <StatusDropdown value={issue.status} options={statusOptions} onChange={(v) => update("status", v)} />
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-[11.5px]">
              <span className="text-muted font-medium">PRIORITY</span>
              <PriorityDropdown value={issue.priority} options={priorityOptions} onChange={(v) => update("priority", v)} />
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-[11.5px]">
              <span className="text-muted font-medium">SEVERITY</span>
              <SeverityDropdown value={issue.severity} options={severityOptions} onChange={(v) => update("severity", v)} />
            </span>
          </div>

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-[14px] font-semibold text-ink">Description</h3>
              <div className="flex-1 h-px bg-border" />
              {!editingDesc && (
                <button onClick={() => setEditingDesc(true)} className="text-[12px] text-muted hover:text-ink transition-colors flex items-center gap-1"><Edit3 size={11} /> Edit</button>
              )}
            </div>
            {editingDesc ? (
              <div className="flex flex-col gap-2">
                <textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)} rows={8}
                  className="w-full px-4 py-3 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 resize-none leading-relaxed" />
                <div className="flex gap-2">
                  <button onClick={saveDesc} className="px-3 py-1.5 bg-ink text-surface text-[12px] font-medium rounded-md hover:opacity-90">Save</button>
                  <button onClick={() => { setEditingDesc(false); setDescDraft(issue.description || ""); }} className="px-3 py-1.5 text-[12px] text-muted hover:text-ink">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 bg-surface border border-border rounded-lg text-[13px] text-ink/80 leading-[1.7] whitespace-pre-wrap">
                {issue.description || <span className="text-muted/50 italic">No description provided.</span>}
              </div>
            )}
          </div>

          {/* Media & attachments */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-[14px] font-semibold text-ink">Media & attachments</h3>
              <span className="text-[11px] text-muted">· {issue.attachments?.length || 0}</span>
              <div className="flex-1 h-px bg-border" />
              <button className="text-[12px] text-muted hover:text-ink transition-colors flex items-center gap-1"><Plus size={11} /> Attach</button>
            </div>
            {issue.attachments && issue.attachments.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {issue.attachments.map((att) => (
                  <div key={att.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="h-20 bg-surface-2 flex items-center justify-center">
                      {att.mime_type?.startsWith("image/") ? <Image size={20} className="text-muted/40" /> : <FileText size={20} className="text-muted/40" />}
                    </div>
                    <div className="px-2.5 py-1.5 flex items-center gap-1.5">
                      <Paperclip size={10} className="text-muted shrink-0" />
                      <span className="text-[11px] text-ink/70 truncate">{att.filename}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface border border-dashed border-border rounded-lg px-5 py-5 flex items-center gap-4 cursor-pointer hover:bg-surface-2/30 transition-colors">
                <Share2 size={18} className="text-muted/30 shrink-0" />
                <div className="flex-1">
                  <span className="text-[12.5px] text-muted">Drop screenshots, dashboards or log excerpts here · max 25 MB</span>
                </div>
                <button className="px-3 py-1.5 text-[11.5px] font-medium text-ink border border-border rounded-md hover:bg-surface-2 transition-colors">Browse</button>
              </div>
            )}
          </div>

          {/* Activity */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-[14px] font-semibold text-ink">Activity</h3>
              <span className="text-[11px] text-muted">· {issue.comments?.length || 0} events</span>
              <div className="flex-1 h-px bg-border" />
              <div className="flex bg-surface-2 border border-border rounded-md p-0.5">
                {["All", "Comments", "Updates"].map((tab, i) => (
                  <button key={tab} className={`px-2.5 py-1 text-[10.5px] font-medium rounded transition-colors ${i === 0 ? "bg-surface border border-border text-ink shadow-sm" : "text-muted border border-transparent"}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {issue.comments && issue.comments.length > 0 ? (() => {
              const all = issue.comments;
              const LIMIT = 5;
              const hidden = all.length - LIMIT;
              const visible = showAllComments ? all : all.slice(-LIMIT);
              return (
                <div className="flex flex-col gap-3 mb-4">
                  {!showAllComments && hidden > 0 && (
                    <button onClick={() => setShowAllComments(true)} className="text-[12px] text-accent hover:underline self-start mb-1">
                      Show {hidden} older event{hidden !== 1 ? "s" : ""}
                    </button>
                  )}
                  {visible.map((c) => (
                    <CommentItem key={c.id} comment={c} isOwn={c.author.id === userId}
                      onEdit={(body) => editComment(c.id, body)} onDelete={() => deleteComment(c.id)} />
                  ))}
                </div>
              );
            })() : (
              <p className="text-[12px] text-muted/50 mb-4">No activity yet.</p>
            )}

            {/* Add comment */}
            <div className="border border-border rounded-lg overflow-hidden focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10">
              <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={2}
                placeholder="Add a comment... use @ to mention, / for commands"
                className="w-full px-4 py-3 text-[12.5px] text-ink bg-transparent outline-none resize-none placeholder:text-muted/40" />
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-2/30 border-t border-border">
                <button className="text-[11px] text-muted hover:text-ink transition-colors flex items-center gap-1"><Paperclip size={11} /> Attach</button>
                <div className="flex-1" />
                <button onClick={addComment} disabled={!commentText.trim()}
                  className="px-3.5 py-1.5 bg-ink text-surface text-[11px] font-medium rounded-md hover:opacity-90 disabled:opacity-30">
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-[280px] shrink-0 border-l border-border overflow-y-auto px-5 py-5 bg-surface self-stretch">
          {/* PEOPLE */}
          <div className="mb-5">
            <div className="text-[10px] font-bold text-muted uppercase tracking-[0.08em] mb-3">People</div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted w-[65px]">Assignee</span>
                {issue.assignee ? (
                  <button onClick={(e) => { e.stopPropagation(); }} className="flex items-center gap-2">
                    <Avatar user={issue.assignee} size={22} />
                    <div className="text-right">
                      <div className="text-[12px] text-ink font-medium leading-tight">{issue.assignee.display_name || issue.assignee.username}</div>
                      {issue.assignedGroup && <div className="text-[10.5px] text-muted leading-tight">{issue.assignedGroup.name}</div>}
                    </div>
                  </button>
                ) : (
                  <PersonPicker value={null} orgMembers={orgMembers} onChange={(uid) => update("assigned_to", uid)} />
                )}
              </div>
              {reporter && (
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted w-[65px]">Reporter</span>
                  <div className="flex items-center gap-2">
                    <Avatar user={reporter} size={22} />
                    <div className="text-right">
                      <div className="text-[12px] text-ink font-medium leading-tight">{reporter.display_name || reporter.username}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PROPERTIES */}
          <div className="mb-5 pt-4 border-t border-border">
            <div className="text-[10px] font-bold text-muted uppercase tracking-[0.08em] mb-3">Properties</div>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted w-[65px]">Team</span>
                <TeamPicker value={issue.assignedGroup || null} groups={groups} onChange={(gid) => update("assigned_group", gid)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted w-[65px]">Due</span>
                {issue.due_date ? (
                  <span className={`text-[12px] font-medium ${new Date(issue.due_date) < new Date() ? "text-red-500" : "text-ink/80"}`}>
                    {formatDate(issue.due_date)}
                    {new Date(issue.due_date) < new Date() && <span className="ml-1">· overdue</span>}
                  </span>
                ) : (
                  <span className="text-[12px] text-muted">—</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted w-[65px]">Channel</span>
                <ChannelPicker value={issue.channel || null} channels={channels} onChange={(cid) => update("channel_id", cid)} />
              </div>
            </div>
          </div>

          {/* LABELS */}
          <div className="mb-5 pt-4 border-t border-border">
            <div className="text-[10px] font-bold text-muted uppercase tracking-[0.08em] mb-3">Labels</div>
            <div className="flex flex-wrap gap-1.5">
              {issue.labels && issue.labels.length > 0 && issue.labels.map((l) => (
                <span key={l.id} className="px-2.5 py-1 rounded-md text-[10.5px] font-medium bg-surface-2 border border-border text-ink/70">{l.name}</span>
              ))}
              <button className="px-2.5 py-1 rounded-md text-[10.5px] text-muted hover:text-accent border border-dashed border-border hover:border-accent transition-colors">+ add</button>
            </div>
          </div>

          {/* LINKED */}
          <div className="mb-5 pt-4 border-t border-border">
            <div className="text-[10px] font-bold text-muted uppercase tracking-[0.08em] mb-3">Linked</div>
            <button className="flex items-center gap-1.5 text-[11.5px] text-muted hover:text-accent transition-colors">
              <Plus size={11} /> Link PR or issue
            </button>
          </div>

          {/* SUBSCRIBERS */}
          <div className="pt-4 border-t border-border">
            <div className="text-[10px] font-bold text-muted uppercase tracking-[0.08em] mb-3">
              Subscribers · {[issue.assignee, reporter].filter(Boolean).length}
            </div>
            <div className="flex items-center -space-x-1.5">
              {issue.assignee && <div className="ring-2 ring-surface rounded-full"><Avatar user={issue.assignee} size={26} /></div>}
              {reporter && <div className="ring-2 ring-surface rounded-full"><Avatar user={reporter} size={26} /></div>}
              <button className="w-[26px] h-[26px] rounded-full bg-surface-2 border border-border flex items-center justify-center text-muted hover:text-ink text-[11px] ring-2 ring-surface ml-0.5">+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
