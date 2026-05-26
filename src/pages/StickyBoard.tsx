import { useState, useRef, useCallback, useEffect } from "react";
import {
  LayoutGrid, Columns3, PanelTop, Plus, Pin, MoreHorizontal,
  Trash2, X, Users, ChevronDown,
} from "lucide-react";
import { api } from "../lib/api";

type Scope = "my" | "team";
type Layout = "canvas" | "kanban" | "grid";
type TaskColor = string;
type TaskStatus = "inbox" | "pending" | "ongoing" | "in_review" | "completed" | "rejected";
type TaskPriority = "low" | "medium" | "high" | "urgent";

interface TaskUser {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url: string | null;
}

interface Task {
  id: string;
  title: string;
  body: string | null;
  color: TaskColor;
  status: TaskStatus;
  scope: "personal" | "team";
  priority: TaskPriority;
  is_pinned: boolean;
  canvas_x: number;
  canvas_y: number;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
  createdAt?: string;
  creator?: TaskUser;
  assignee?: TaskUser | null;
  tags?: { id: string; name: string; color: string }[];
}

const noteColorMap: Record<string, { bg: string; hex: string }> = {
  yellow: { bg: "bg-note-yellow", hex: "#fef3c7" },
  blue:   { bg: "bg-note-blue",   hex: "#dbeafe" },
  green:  { bg: "bg-note-green",  hex: "#dcfce7" },
  pink:   { bg: "bg-note-pink",   hex: "#fce7f3" },
  purple: { bg: "bg-note-purple", hex: "#ede9fe" },
};

const presetColors = [
  { key: "yellow", hex: "#fef3c7" },
  { key: "blue",   hex: "#dbeafe" },
  { key: "green",  hex: "#dcfce7" },
  { key: "pink",   hex: "#fce7f3" },
];

function getNoteStyle(color: string): { bg?: string; hex?: string } {
  if (noteColorMap[color]) return noteColorMap[color];
  return { hex: color };
}

const kanbanCols: { key: TaskStatus; label: string; dot: string }[] = [
  { key: "inbox", label: "Assigned", dot: "#a1a1aa" },
  { key: "ongoing", label: "In progress", dot: "#f59e0b" },
  { key: "in_review", label: "In review", dot: "#5b5bd6" },
  { key: "completed", label: "Done", dot: "#10b981" },
];




/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */

interface OrgMember {
  user: { id: string; username: string; display_name: string | null; avatar_url: string | null };
}

interface GroupData {
  id: string;
  name: string;
  color: string | null;
  member_count: number;
}

export function StickyBoardPage({ orgId, userId, userRole }: { orgId?: string; userId?: string; userRole?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>("my");
  const [layout, setLayout] = useState<Layout>("kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [filterUser, setFilterUser] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [myGroups, setMyGroups] = useState<GroupData[]>([]);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<StickyTimeRange>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const isAdmin = userRole === "super_admin" || userRole === "admin";

  const fetchTasks = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      const scopeParam = scope === "my" ? "personal" : "team";
      let url = `/orgs/${orgId}/tasks?scope=${scopeParam}`;
      if (scope === "team" && filterUser) url += `&assigned_to=${filterUser}`;
      let data = await api.get<Task[]>(url);

      // For non-admin team view: only show tasks assigned to me or to members of my groups
      if (scope === "team" && !isAdmin && !filterUser && !filterGroup) {
        const myGroupMemberIds = new Set<string>();
        for (const g of myGroups) {
          try {
            const members = await api.get<{ user: { id: string } }[]>(`/groups/${g.id}/members`);
            members.forEach((m) => myGroupMemberIds.add(m.user.id));
          } catch { /* ignore */ }
        }
        if (userId) myGroupMemberIds.add(userId);
        data = data.filter((t) => t.assignee && myGroupMemberIds.has(t.assignee.id));
      }

      // Client-side group filter
      if (scope === "team" && filterGroup && groupMembers.length > 0) {
        data = data.filter((t) => t.assignee && groupMembers.includes(t.assignee.id));
      }

      // Client-side date filter
      if (timeRange !== "all") {
        let from: Date | null = null;
        let to: Date | null = null;
        if (timeRange === "week") { from = new Date(); from.setDate(from.getDate() - from.getDay()); from.setHours(0,0,0,0); }
        else if (timeRange === "last_week") {
          from = new Date(); from.setDate(from.getDate() - from.getDay() - 7); from.setHours(0,0,0,0);
          to = new Date(); to.setDate(to.getDate() - to.getDay() - 1); to.setHours(23,59,59,999);
        }
        else if (timeRange === "month") { from = new Date(); from.setDate(1); from.setHours(0,0,0,0); }
        else if (timeRange === "custom") {
          if (customFrom) from = new Date(customFrom + "T00:00:00");
          if (customTo) { to = new Date(customTo + "T23:59:59"); }
        }
        data = data.filter((t) => {
          const d = new Date(t.created_at || t.createdAt || "");
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        });
      }
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, scope, filterUser, filterGroup, groupMembers, timeRange, customFrom, customTo, isAdmin, userId, myGroups]);

  // Fetch members, groups, and user's groups
  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      isAdmin ? api.get<OrgMember[]>(`/orgs/${orgId}/members`) : Promise.resolve([]),
      api.get<GroupData[]>(`/orgs/${orgId}/groups`),
    ]).then(([m, g]) => {
      setOrgMembers(m);
      setGroups(g);
      // For non-admins, find which groups the user belongs to
      if (!isAdmin && userId) {
        Promise.all(g.map(async (grp) => {
          try {
            const members = await api.get<{ user: { id: string } }[]>(`/groups/${grp.id}/members`);
            return members.some((mem) => mem.user.id === userId) ? grp : null;
          } catch { return null; }
        })).then((results) => setMyGroups(results.filter(Boolean) as GroupData[]));
      }
    }).catch(() => {});
  }, [orgId, isAdmin, userId]);

  // When group filter changes, fetch group members
  useEffect(() => {
    if (!filterGroup) { setGroupMembers([]); return; }
    api.get<{ user: { id: string } }[]>(`/groups/${filterGroup}/members`)
      .then((members) => setGroupMembers(members.map((m) => m.user.id)))
      .catch(() => setGroupMembers([]));
  }, [filterGroup]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = async (data: Partial<Task>) => {
    if (!orgId) return;
    const scopeVal = scope === "my" ? "personal" : "team";
    await api.post(`/orgs/${orgId}/tasks`, { ...data, scope: scopeVal });
    setShowCreate(false);
    fetchTasks();
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    // Optimistic update — move card instantly
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
    try {
      await api.patch(`/tasks/${id}`, data);
    } catch {
      // Revert on error
      fetchTasks();
    }
  };

  const deleteTask = async (id: string) => {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="flex flex-col h-full -mx-6 -mt-6 -mb-6 overflow-hidden">
      {/* Header */}
      <div data-sticky-header className="px-6 pt-6 pb-4 bg-surface border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-ink tracking-tight">Sticky Board</h1>
          <p className="mt-0.5 text-[12.5px] text-muted tracking-tight">
            {tasks.length} note{tasks.length !== 1 ? "s" : ""} · {scope === "my" ? "personal" : "team"} board
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 bg-ink text-surface text-[12px] font-medium rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5">
          <Plus size={13} strokeWidth={2} />
          Note
        </button>
      </div>

      {/* Controls bar */}
      <div className="px-6 py-2.5 bg-surface border-b border-border flex items-center gap-3 shrink-0">
        {/* Scope toggle */}
        <div className="flex bg-surface-2 border border-border rounded-md p-0.5">
          {(["my", "team"] as Scope[]).map((s) => (
            <button key={s} onClick={() => { setScope(s); setFilterUser(null); }}
              className={`px-3 py-1 text-[12px] font-medium rounded transition-colors ${
                scope === s ? "bg-surface border border-border text-ink shadow-sm" : "text-muted border border-transparent hover:text-ink"
              }`}>
              {s === "my" ? "My board" : "Team board"}
            </button>
          ))}
        </div>

        {/* Team filter */}
        {scope === "team" && isAdmin && (
          <TeamFilter
            members={orgMembers}
            groups={groups}
            filterUser={filterUser}
            filterGroup={filterGroup}
            onUserChange={(id) => { setFilterUser(id); setFilterGroup(null); }}
            onGroupChange={(id) => { setFilterGroup(id); setFilterUser(null); }}
          />
        )}
        {scope === "team" && !isAdmin && myGroups.length > 1 && (
          <MyGroupFilter
            groups={myGroups}
            value={filterGroup}
            onChange={(id) => { setFilterGroup(id); setFilterUser(null); }}
          />
        )}

        {/* Date filter */}
        <StickyDateFilter timeRange={timeRange} customFrom={customFrom} customTo={customTo}
          onChange={setTimeRange} onCustomChange={(f, t) => { setCustomFrom(f); setCustomTo(t); }} />

        <div className="flex-1" />

        {/* Layout switcher */}
        <div className="flex bg-surface-2 border border-border rounded-md p-0.5">
          {([
            { key: "canvas" as Layout, icon: PanelTop },
            { key: "kanban" as Layout, icon: Columns3 },
            { key: "grid" as Layout, icon: LayoutGrid },
          ]).map(({ key, icon: Icon }) => (
            <button key={key} onClick={() => setLayout(key)}
              className={`p-1.5 rounded transition-colors ${
                layout === key ? "bg-surface border border-border text-ink shadow-sm" : "text-muted border border-transparent hover:text-ink"
              }`}>
              <Icon size={14} strokeWidth={1.6} />
            </button>
          ))}
        </div>
      </div>

      {/* Board content */}
      <div data-sticky-content className="flex-1 min-h-0 overflow-hidden px-6 py-4 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : layout === "grid" ? (
          <GridView tasks={tasks} onUpdate={updateTask} onDelete={deleteTask} onCreate={() => setShowCreate(true)} />
        ) : layout === "kanban" ? (
          <KanbanView tasks={tasks} onUpdate={updateTask} onDelete={deleteTask} userId={userId} isAdmin={isAdmin} scope={scope} onCreateClick={() => setShowCreate(true)} />
        ) : (
          <CanvasView tasks={tasks.filter((t) => t.status === "ongoing" || t.status === "in_review")} allTasks={tasks} onUpdate={updateTask} onDelete={deleteTask} />
        )}

        {/* Create note drawer (inside content area) */}
        {showCreate && <CreateNoteDrawer onCreate={createTask} onClose={() => setShowCreate(false)} />}
      </div>
    </div>
  );
}

/* ── Date filter ── */

/* ── My group filter (for non-admins with multiple groups) ── */

function MyGroupFilter({ groups, value, onChange }: {
  groups: GroupData[]; value: string | null; onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const selected = groups.find((g) => g.id === value);

  return (
    <>
      <button ref={ref}
        onClick={() => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.bottom + 4, left: r.left }); } setOpen(!open); }}
        className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 ${
          value ? "bg-accent-soft/20 text-accent" : "text-muted hover:text-ink hover:bg-surface-2"
        }`}>
        <Users size={12} />
        {selected ? selected.name : "All my teams"}
        <ChevronDown size={11} className="text-muted/60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-[180px] bg-surface border border-border rounded-lg shadow-popover py-1" style={{ top: pos.top, left: pos.left }}>
            <button onClick={() => { onChange(null); setOpen(false); }}
              className={`w-full px-3 py-2 text-[12px] text-left transition-colors ${!value ? "text-ink font-medium bg-surface-2" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
              All my teams
            </button>
            {groups.map((g) => (
              <button key={g.id} onClick={() => { onChange(g.id); setOpen(false); }}
                className={`w-full px-3 py-2 text-[12px] text-left transition-colors flex items-center gap-2 ${value === g.id ? "text-ink font-medium bg-surface-2" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                <span className="w-4 h-4 rounded shrink-0 flex items-center justify-center text-white text-[7px] font-bold"
                  style={{ background: g.color || "#5b5bd6" }}>{g.name[0]}</span>
                {g.name}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

type StickyTimeRange = "week" | "last_week" | "month" | "all" | "custom";

function StickyDateFilter({ timeRange, customFrom, customTo, onChange, onCustomChange }: {
  timeRange: StickyTimeRange;
  customFrom: string; customTo: string;
  onChange: (r: StickyTimeRange) => void;
  onCustomChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const labels: Record<string, string> = { week: "This week", last_week: "Last week", month: "This month", all: "All time" };
  const label = timeRange === "custom" && customFrom
    ? `${customFrom} — ${customTo || "now"}`
    : labels[timeRange] || "All time";

  return (
    <>
      <button ref={ref}
        onClick={() => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.bottom + 4, left: r.left }); } setOpen(!open); }}
        className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 ${
          timeRange !== "all" ? "bg-accent-soft/20 text-accent" : "text-muted hover:text-ink hover:bg-surface-2"
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
          <div className="fixed z-50 w-[230px] bg-surface border border-border rounded-lg shadow-popover py-1" style={{ top: pos.top, left: pos.left }}>
            {(["week", "last_week", "month", "all"] as StickyTimeRange[]).map((r) => (
              <button key={r} onClick={() => { onChange(r); setOpen(false); }}
                className={`w-full px-3 py-2 text-[12px] text-left transition-colors flex items-center justify-between ${
                  timeRange === r ? "text-ink font-medium bg-surface-2" : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}>
                {labels[r]}
                {timeRange === r && <span className="text-accent text-[11px]">&#10003;</span>}
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <div className="px-3 py-2">
              <p className="text-[10.5px] font-medium text-muted uppercase tracking-wider mb-2">Custom range</p>
              <div className="flex gap-2 mb-2">
                <input type="date" value={customFrom} onChange={(e) => onCustomChange(e.target.value, customTo)}
                  className="flex-1 px-2 py-1.5 text-[11px] bg-surface border border-border rounded-md outline-none focus:border-accent" />
                <input type="date" value={customTo} onChange={(e) => onCustomChange(customFrom, e.target.value)}
                  className="flex-1 px-2 py-1.5 text-[11px] bg-surface border border-border rounded-md outline-none focus:border-accent" />
              </div>
              <button onClick={() => { if (customFrom) { onChange("custom"); setOpen(false); } }}
                disabled={!customFrom}
                className="w-full py-1.5 text-[11px] font-medium bg-ink text-surface rounded-md hover:opacity-90 disabled:opacity-30 transition-opacity">
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ── Team filter dropdown (members + groups) ── */

function TeamFilter({ members, groups, filterUser, filterGroup, onUserChange, onGroupChange }: {
  members: OrgMember[]; groups: GroupData[];
  filterUser: string | null; filterGroup: string | null;
  onUserChange: (id: string | null) => void;
  onGroupChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const selectedMember = members.find((m) => m.user.id === filterUser);
  const selectedGroup = groups.find((g) => g.id === filterGroup);
  const hasFilter = filterUser || filterGroup;
  const label = selectedMember
    ? (selectedMember.user.display_name || selectedMember.user.username)
    : selectedGroup
      ? selectedGroup.name
      : "Everyone";

  return (
    <>
      <button ref={ref}
        onClick={() => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.bottom + 4, left: r.left }); } setOpen(!open); }}
        className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 ${
          hasFilter ? "bg-accent-soft/20 text-accent" : "text-muted hover:text-ink hover:bg-surface-2"
        }`}>
        <Users size={12} />
        {label}
        <ChevronDown size={11} className="text-muted/60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-[220px] bg-surface border border-border rounded-lg shadow-popover max-h-[340px] overflow-y-auto" style={{ top: pos.top, left: pos.left }}>
            {/* All */}
            <div className="py-1">
              <button onClick={() => { onUserChange(null); onGroupChange(null); setOpen(false); }}
                className={`w-full px-3 py-2 text-[12px] text-left transition-colors flex items-center gap-2 ${!hasFilter ? "text-ink font-medium bg-surface-2" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                <Users size={12} /> Everyone
              </button>
            </div>

            {/* Teams section */}
            {groups.length > 0 && (
              <>
                <div className="px-3 py-1.5 border-t border-border">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Teams</span>
                </div>
                {groups.map((g) => (
                  <button key={g.id} onClick={() => { onGroupChange(g.id); setOpen(false); }}
                    className={`w-full px-3 py-2 text-[12px] text-left transition-colors flex items-center gap-2 ${filterGroup === g.id ? "text-ink font-medium bg-surface-2" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                    <span className="w-5 h-5 rounded shrink-0 flex items-center justify-center text-white text-[8px] font-bold"
                      style={{ background: g.color || "#5b5bd6" }}>{g.name[0]}</span>
                    {g.name}
                    <span className="ml-auto text-[10px] text-muted/50">{g.member_count}</span>
                  </button>
                ))}
              </>
            )}

            {/* Members section */}
            <div className="px-3 py-1.5 border-t border-border">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Members</span>
            </div>
            {members.map((m) => (
              <button key={m.user.id} onClick={() => { onUserChange(m.user.id); setOpen(false); }}
                className={`w-full px-3 py-2 text-[12px] text-left transition-colors flex items-center gap-2 ${filterUser === m.user.id ? "text-ink font-medium bg-surface-2" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                {m.user.avatar_url ? (
                  <img src={m.user.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[7px] font-bold">
                    {(m.user.display_name || m.user.username).slice(0, 2).toUpperCase()}
                  </div>
                )}
                {m.user.display_name || m.user.username}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GRID VIEW
   ══════════════════════════════════════════════════════════════════════════ */

function GridView({ tasks, onUpdate, onDelete, onCreate }: {
  tasks: Task[]; onUpdate: (id: string, d: Partial<Task>) => void;
  onDelete: (id: string) => void; onCreate: () => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto h-full pb-4 content-start">
      {tasks.map((t) => (
        <NoteCard key={t.id} task={t} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
      <button onClick={onCreate}
        className="border-2 border-dashed border-border rounded-xl px-4 py-8 flex items-center justify-center text-[13px] text-muted font-medium hover:border-accent hover:text-accent transition-colors min-h-[120px]">
        + New note
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   KANBAN VIEW
   ══════════════════════════════════════════════════════════════════════════ */

function KanbanView({ tasks, onUpdate, onDelete, userId, isAdmin, scope, onCreateClick }: {
  tasks: Task[]; onUpdate: (id: string, d: Partial<Task>) => void;
  onDelete: (id: string) => void; userId?: string; isAdmin: boolean; scope: Scope;
  onCreateClick: () => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<string | null>(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);

  const byStatus = (st: TaskStatus) => tasks.filter((t) => t.status === st);
  const dragTask = dragId ? tasks.find((t) => t.id === dragId) : null;

  const findColumn = useCallback((clientX: number) => {
    for (let i = 0; i < colRefs.current.length; i++) {
      const el = colRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) return kanbanCols[i].key;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!dragId) return;
    const onMove = (e: PointerEvent) => {
      setGhostPos({ x: e.clientX, y: e.clientY });
      setDropCol(findColumn(e.clientX));
    };
    const onUp = () => {
      if (dragId && dropCol) {
        const task = tasks.find((t) => t.id === dragId);
        if (task && task.status !== dropCol) {
          onUpdate(dragId, { status: dropCol as TaskStatus });
        }
      }
      setDragId(null);
      setDropCol(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [dragId, dropCol, tasks, onUpdate, findColumn]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full overflow-auto pb-4 relative">
      {kanbanCols.map((col, ci) => {
        const colTasks = byStatus(col.key);
        const isOver = dropCol === col.key && dragId !== null;
        return (
          <div key={col.key} ref={(el) => { colRefs.current[ci] = el; }}
            className={`flex flex-col gap-3 min-h-[200px] rounded-xl p-2 -m-2 transition-colors ${isOver ? "bg-accent/[0.06] ring-2 ring-accent/20 ring-inset" : ""}`}>
            {/* Column header */}
            <div className="flex items-center gap-2.5 px-1 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.dot }} />
              <span className="text-[13px] font-semibold text-ink tracking-tight">{col.label}</span>
              <span className="text-[11px] text-muted font-medium px-1.5 py-0.5 bg-surface-2 rounded-full">{colTasks.length}</span>
              <div className="flex-1" />
              <button onClick={onCreateClick} className="w-5 h-5 rounded flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 transition-colors">
                <Plus size={13} />
              </button>
            </div>

            {/* Cards */}
            {colTasks.map((t) => (
              <div key={t.id}
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  // Non-admins can only drag their own cards on team board
                  if (scope === "team" && !isAdmin && t.assignee?.id !== userId && t.creator?.id !== userId) return;
                  e.preventDefault();
                  setDragId(t.id);
                  setGhostPos({ x: e.clientX, y: e.clientY });
                }}
                className={`cursor-grab active:cursor-grabbing select-none transition-all ${dragId === t.id ? "opacity-30 scale-[0.97]" : ""}`}>
                <NoteCard task={t} onUpdate={onUpdate} onDelete={onDelete} />
              </div>
            ))}

            {isOver && <div className="py-4 border-2 border-dashed border-accent/30 rounded-lg bg-accent/[0.04]" />}

            {/* Add note */}
            <button onClick={onCreateClick} className="py-2.5 border border-dashed border-border rounded-xl text-center text-[12px] text-muted font-medium tracking-tight hover:border-accent hover:text-accent transition-colors">
              + Add note
            </button>
          </div>
        );
      })}

      {/* Floating ghost */}
      {dragTask && (
        <div className="fixed z-50 w-[220px] pointer-events-none opacity-90 rotate-[2deg] scale-[1.03]"
          style={{ left: ghostPos.x - 110, top: ghostPos.y - 40 }}>
          <div className={`${getNoteStyle(dragTask.color).bg || ""} rounded-xl px-3 py-3 shadow-2xl`}
            style={!getNoteStyle(dragTask.color).bg ? { background: getNoteStyle(dragTask.color).hex } : undefined}>
            <div className="text-[12px] font-semibold text-[#1a1a1a] truncate">{dragTask.title}</div>
            {dragTask.body && <div className="text-[10.5px] text-[#555] mt-1 truncate">{dragTask.body}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CANVAS VIEW (simplified — draggable free-form)
   ══════════════════════════════════════════════════════════════════════════ */

function CanvasView({ tasks: defaultTasks, allTasks, onUpdate, onDelete }: {
  tasks: Task[]; allTasks: Task[];
  onUpdate: (id: string, d: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const tasks = showAll ? allTasks : defaultTasks;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, task: Task) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const cr = container.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - cr.left - task.canvas_x, y: e.clientY - cr.top - task.canvas_y };
    setDragging(task.id);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - cr.left - dragOffset.current.x);
    const y = Math.max(0, e.clientY - cr.top - dragOffset.current.y);
    // Update locally for smooth movement
    const el = containerRef.current.querySelector(`[data-task-id="${dragging}"]`) as HTMLElement;
    if (el) { el.style.left = `${x}px`; el.style.top = `${y}px`; }
  }, [dragging]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - cr.left - dragOffset.current.x);
    const y = Math.max(0, e.clientY - cr.top - dragOffset.current.y);
    onUpdate(dragging, { canvas_x: x, canvas_y: y });
    setDragging(null);
  }, [dragging, onUpdate]);

  // Assign default positions if all tasks are at 0,0
  const positioned = tasks.map((t, i) => ({
    ...t,
    canvas_x: t.canvas_x || (80 + (i % 4) * 220),
    canvas_y: t.canvas_y || (40 + Math.floor(i / 4) * 180),
  }));

  return (
    <div ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setDragging(null)}
      className="relative h-full bg-surface-2/30 rounded-xl border border-border overflow-hidden cursor-default"
      style={{ backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>

      {/* Canvas filter toggle */}
      <div className="absolute top-3 left-3 z-20 flex bg-surface border border-border rounded-md p-0.5 shadow-sm">
        <button onClick={() => setShowAll(false)}
          className={`px-2.5 py-1 text-[10.5px] font-medium rounded transition-colors ${!showAll ? "bg-ink text-surface" : "text-muted hover:text-ink"}`}>
          In progress
        </button>
        <button onClick={() => setShowAll(true)}
          className={`px-2.5 py-1 text-[10.5px] font-medium rounded transition-colors ${showAll ? "bg-ink text-surface" : "text-muted hover:text-ink"}`}>
          All ({allTasks.length})
        </button>
      </div>

      {positioned.map((t) => (
        <div key={t.id} data-task-id={t.id}
          onMouseDown={(e) => handleMouseDown(e, t)}
          className={`absolute w-[200px] select-none transition-shadow ${dragging === t.id ? "z-10 shadow-2xl scale-[1.03] rotate-[2deg]" : "shadow-card hover:shadow-lg"}`}
          style={{ left: t.canvas_x, top: t.canvas_y, cursor: dragging === t.id ? "grabbing" : "grab" }}>
          <NoteCard task={t} onUpdate={onUpdate} onDelete={onDelete} />
        </div>
      ))}

      {tasks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
          No notes yet. Click "+ Note" to create one.
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   NOTE CARD
   ══════════════════════════════════════════════════════════════════════════ */

function NoteCard({ task, compact, onUpdate, onDelete }: {
  task: Task; compact?: boolean;
  onUpdate: (id: string, d: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const colorInfo = getNoteStyle(task.color);
  const tag = task.tags?.[0];

  return (
    <div className={`${colorInfo.bg || ""} rounded-xl px-4 py-4 shadow-sm relative group/note flex flex-col min-h-[110px]`}
      style={!colorInfo.bg ? { background: colorInfo.hex } : undefined}>
      {/* Header with title + menu */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="text-[13.5px] font-semibold text-[#1a1a1a] leading-snug tracking-tight">{task.title}</h4>
        <button ref={menuRef}
          onClick={(e) => {
            e.stopPropagation();
            if (menuRef.current) { const r = menuRef.current.getBoundingClientRect(); setMenuPos({ top: r.bottom + 2, left: Math.min(r.left, window.innerWidth - 160) }); }
            setMenuOpen(!menuOpen);
          }}
          className="p-0.5 text-[#999] hover:text-[#333] transition-colors opacity-0 group-hover/note:opacity-100 shrink-0 mt-0.5">
          <MoreHorizontal size={14} strokeWidth={1.6} />
        </button>
      </div>

      {/* Body */}
      {!compact && task.body && (
        <p className="text-[12px] text-[#555] leading-relaxed line-clamp-2 mb-auto">{task.body}</p>
      )}
      {(compact || !task.body) && <div className="flex-1" />}

      {/* Footer: tag + creator left, assignee avatar right */}
      <div className="flex items-center justify-between mt-3 pt-0.5">
        <div className="flex items-center gap-1.5">
          {tag && (
            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-white/50 text-[#444]">
              {tag.name}
            </span>
          )}
          {task.creator && (
            <span className="text-[10px] text-[#777] truncate max-w-[100px]">
              {task.creator.display_name || task.creator.username}
            </span>
          )}
        </div>
        {task.assignee && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-[#777] hidden group-hover/note:inline">{task.assignee.display_name || task.assignee.username}</span>
            {task.assignee.avatar_url ? (
              <img src={task.assignee.avatar_url} className="w-6 h-6 rounded-full object-cover ring-2 ring-white/60" title={task.assignee.display_name || task.assignee.username} />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[8px] font-bold ring-2 ring-white/60" title={task.assignee.display_name || task.assignee.username}>
                {(task.assignee.display_name || task.assignee.username).slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="fixed z-50 w-[150px] bg-surface border border-border rounded-lg shadow-popover py-1" style={{ top: menuPos.top, left: menuPos.left }}>
            <button onClick={() => { setMenuOpen(false); setViewOpen(true); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-ink hover:bg-surface-2 transition-colors">
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" /><circle cx="12" cy="12" r="3" /></svg>
              View
            </button>
            <button onClick={() => { onUpdate(task.id, { is_pinned: !task.is_pinned }); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-ink hover:bg-surface-2 transition-colors">
              <Pin size={11} /> {task.is_pinned ? "Unpin" : "Pin"}
            </button>
            <div className="px-3 py-1.5">
              <span className="text-[12px] text-muted block mb-1.5">Color</span>
              <div className="flex flex-wrap gap-1.5">
                {presetColors.map((c) => (
                  <button key={c.key} onClick={() => { onUpdate(task.id, { color: c.key }); setMenuOpen(false); }}
                    className={`w-5 h-5 rounded-md border-2 transition-all ${task.color === c.key ? "border-[#333] scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ background: c.hex }} />
                ))}
              </div>
            </div>
            <div className="border-t border-border my-1" />
            <button onClick={() => { onDelete(task.id); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </>
      )}

      {/* View detail drawer */}
      {viewOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm" onClick={() => setViewOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] bg-surface border-l border-border shadow-xl flex flex-col animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full" style={{ background: colorInfo.hex || "#fef3c7" }} />
                <span className="text-[14px] font-semibold text-ink">Task details</span>
              </div>
              <button onClick={() => setViewOpen(false)} className="p-1 text-muted hover:text-ink transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <h3 className="text-[18px] font-semibold text-ink tracking-tight mb-3">{task.title}</h3>

              {task.body && (
                <p className="text-[13px] text-muted leading-relaxed mb-5">{task.body}</p>
              )}

              <div className="space-y-4">
                {/* Status */}
                <div>
                  <div className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em] mb-1.5">Status</div>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink px-2.5 py-1 bg-surface-2 border border-border rounded-lg">
                    <span className="w-2 h-2 rounded-full" style={{ background: task.status === "completed" ? "#16a34a" : task.status === "ongoing" ? "#3b82f6" : task.status === "in_review" ? "#8b5cf6" : "#71717a" }} />
                    {task.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Priority */}
                <div>
                  <div className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em] mb-1.5">Priority</div>
                  <span className="text-[12px] font-medium text-ink px-2.5 py-1 bg-surface-2 border border-border rounded-lg capitalize">{task.priority}</span>
                </div>

                {/* Scope */}
                <div>
                  <div className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em] mb-1.5">Scope</div>
                  <span className="text-[12px] font-medium text-ink px-2.5 py-1 bg-surface-2 border border-border rounded-lg capitalize">{task.scope}</span>
                </div>

                {/* Creator */}
                {task.creator && (
                  <div>
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em] mb-1.5">Created by</div>
                    <div className="flex items-center gap-2">
                      {task.creator.avatar_url ? (
                        <img src={task.creator.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[8px] font-bold">
                          {(task.creator.display_name || task.creator.username).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[12px] text-ink font-medium">{task.creator.display_name || task.creator.username}</span>
                    </div>
                  </div>
                )}

                {/* Assignee */}
                {task.assignee && (
                  <div>
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em] mb-1.5">Assigned to</div>
                    <div className="flex items-center gap-2">
                      {task.assignee.avatar_url ? (
                        <img src={task.assignee.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white text-[8px] font-bold">
                          {(task.assignee.display_name || task.assignee.username).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[12px] text-ink font-medium">{task.assignee.display_name || task.assignee.username}</span>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em] mb-1.5">Tags</div>
                    <div className="flex flex-wrap gap-1.5">
                      {task.tags.map((t) => (
                        <span key={t.id} className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-surface-2 border border-border text-ink">{t.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pinned */}
                {task.is_pinned && (
                  <div className="flex items-center gap-1.5 text-[12px] text-accent">
                    <Pin size={12} /> Pinned
                  </div>
                )}

                {/* Created */}
                {(task.created_at || task.createdAt) && (
                  <div>
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em] mb-1.5">Created</div>
                    <span className="text-[12px] text-muted">{new Date(task.created_at || task.createdAt || "").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0">
              <button onClick={() => { onDelete(task.id); setViewOpen(false); }}
                className="px-4 py-2 text-[12px] font-medium text-red-600 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                Delete
              </button>
              <div className="flex-1" />
              <button onClick={() => setViewOpen(false)}
                className="px-4 py-2 text-[12px] font-medium text-ink bg-ink/5 border border-border rounded-lg hover:bg-surface-2 transition-colors">
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CREATE NOTE DRAWER
   ══════════════════════════════════════════════════════════════════════════ */

function CreateNoteDrawer({ onCreate, onClose }: {
  onCreate: (data: Partial<Task>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [color, setColor] = useState<TaskColor>("yellow");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("inbox");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await onCreate({
      title: title.trim(),
      body: body.trim() || null,
      color, priority, status,
    });
  };

  return (
    <>
      <StickyDrawerBackdrop onClose={onClose} />
      <StickyDrawerPanel>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-[15px] font-semibold text-ink tracking-tight">New Note</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-surface-2 hover:text-ink transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Color picker */}
          <div>
            <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((c) => (
                <button key={c.key} onClick={() => setColor(c.key)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${color === c.key ? "border-ink scale-110" : "border-transparent hover:scale-105"}`}
                  style={{ background: c.hex }} />
              ))}
              {/* Custom color input */}
              <label className={`w-8 h-8 rounded-lg border-2 cursor-pointer transition-all overflow-hidden relative ${!presetColors.some((p) => p.key === color) && color !== "yellow" ? "border-ink scale-110" : "border-transparent hover:scale-105"}`}
                style={{ background: !presetColors.some((p) => p.key === color) && color !== "yellow" ? color : "conic-gradient(from 0deg, #f87171, #fbbf24, #34d399, #60a5fa, #a78bfa, #f472b6, #f87171)" }}>
                <input type="color" value={color.startsWith("#") ? color : "#fef3c7"}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Title</label>
            <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-muted/40" />
          </div>

          {/* Body */}
          <div>
            <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Body</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="Write something..."
              rows={5}
              className="w-full px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-muted/40 resize-none" />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%2371717a' d='M0 0h10L5 6z'/></svg>")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
                <option value="inbox">Inbox</option>
                <option value="pending">Pending</option>
                <option value="ongoing">In progress</option>
                <option value="in_review">In review</option>
                <option value="completed">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-muted uppercase tracking-wider mb-1.5">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-[13px] text-ink bg-surface border border-border rounded-lg outline-none focus:border-accent appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%2371717a' d='M0 0h10L5 6z'/></svg>")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-border flex items-center gap-2 shrink-0">
          <button onClick={onClose}
            className="px-3.5 py-2 text-[12.5px] font-medium text-muted border border-border rounded-lg hover:bg-surface-2 hover:text-ink transition-colors">
            Cancel
          </button>
          <div className="flex-1" />
          <button onClick={handleSubmit} disabled={!title.trim()}
            className="px-4 py-2 bg-ink text-surface text-[12.5px] font-medium rounded-lg hover:opacity-90 disabled:opacity-30 transition-opacity flex items-center gap-1.5">
            <Plus size={13} /> Create note
          </button>
        </div>
      </StickyDrawerPanel>
    </>
  );
}

/* ── Animated drawer helpers ── */

function StickyDrawerBackdrop({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Position to cover only the main content area (exclude sidebar)
    const header = el.closest("main")?.querySelector("[data-sticky-header]");
    if (header) {
      const r = header.getBoundingClientRect();
      const main = el.closest("main");
      const mainR = main?.getBoundingClientRect();
      el.style.top = r.bottom + "px";
      el.style.left = (mainR?.left || 0) + "px";
      el.style.width = (mainR?.width || 0) + "px";
      el.style.bottom = "0px";
    }
    requestAnimationFrame(() => { el.style.opacity = "1"; });
  }, []);
  return <div ref={ref} className="fixed z-50 bg-black/10 backdrop-blur-[1px] transition-opacity duration-200 ease-out" onClick={onClose} style={{ opacity: 0, top: 0, left: 0 }} />;
}

function StickyDrawerPanel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const header = el.closest("main")?.querySelector("[data-sticky-header]");
    if (header) {
      el.style.top = header.getBoundingClientRect().bottom + "px";
    }
    requestAnimationFrame(() => { if (el) { el.style.transform = "translateX(0)"; el.style.opacity = "1"; } });
  }, []);
  return (
    <div ref={ref}
      className="fixed right-0 bottom-0 z-50 w-full sm:w-[440px] sm:max-w-[85vw] bg-surface border-l border-border shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{ top: 0, transform: "translateX(100%)", opacity: 0 }}>
      {children}
    </div>
  );
}
