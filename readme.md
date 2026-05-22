Rivox — Desktop App Wireframe Spec
A clean, paste-ready brief covering everything explored in the wireframes.

Product overview
Rivox is a desktop app (macOS-first) for small-to-mid product teams to manage three things in one workspace:

API Keys — store secrets and control who on the team can use each one.
Sticky Board — capture personal and team task notes / chits in flexible layouts.
Team & Permissions — admin surface to manage users, groups, and what each group can do.
The audience is engineering/product teams (2–50 people). Tone: utilitarian, modern, professional — closer to Linear/Vercel than Notion/Trello.

Information architecture
Rivox
├── Workspace switcher (top of sidebar)
├── API Keys           ← key inventory + per-key sharing
├── Sticky Board       ← personal / team notes
├── Team               ← admin: people, groups, permissions
├── Settings
└── Help
Global sidebar nav with icons + labels. Search (⌘K) at top. Profile pill at bottom.

Page 1 — API Keys
Goal: make it obvious who can see each key and let the owner change that fast.

Variation A — Table + inline share popover
Stat strip at top: total keys, in-production count, over-shared count, daily calls.
Table columns: Key (name + masked fingerprint) · Env chip · Last used · Shared with (avatar stack + count) · Actions (copy / share).
Clicking Share on a row opens an anchored popover with a notch:
Invite row (email / @handle / group → role dropdown → Invite)
Individual members list with role pills (Owner / Can use)
Group access section (Backend · 6 members inherit)
Footer: auto-rotation toggle, settings, done
Variation B — Split drill-down view
Left rail: searchable key list (selected key highlighted, env dot color-coded).
Right pane:
Title + env chip + active status
Masked fingerprint with copy button + creation metadata
3-card stat row (calls this month · shared with · next rotation)
Access card — owner, members, group rows with role dropdowns
Activity card — chronological audit trail (shared, rotated, used, created)
Decision needed: which feels more natural — inline popover (A) or full drill-down (B)?

Page 2 — Sticky Board
Goal: quick capture for tasks/ideas; toggle between personal and team scopes.

Global controls on the page:

Scope toggle: My board / Team board (segmented control)
Layout switcher: canvas / kanban / grid (icon pill)
+ Note primary button
Variation A — Free canvas
Dotted grid background, notes positioned freely, draggable.
Dashed connection lines between related notes.
Floating bottom toolbar: color swatches + add / pin / lightning shortcut.
Zoom indicator bottom-right.
Variation B — Kanban columns
Four columns: Inbox · In progress · In review · Done (status dot color per column).
Cards have title, sub, tag chip, assignee avatar.
"+ Add note" dashed placeholder at each column's bottom.
Variation C — Tidy grid
Uniform card grid sorted by date.
Each card: title, body, footer with pin icon + date + overflow menu.
"+ New note" tile to add.
Sticky note color palette: muted yellow, blue, pink, green, purple — tonal, not bright pastel.

Page 3 — Team & Permissions
Goal: admin can see at a glance who's in which group and what each group can do.

Variation A — Groups + member detail
Left: group cards (Backend · Frontend · Design · Ops · Contractors) with avatar tile, role chip, member count, key count.
Right: selected group detail
Header with avatar, name, description, created-by
Action row: Add member · Rename · Permissions · Delete
Members table with avatar, name, email, role dropdown, overflow
Inherited access — chips showing which keys this group can see + "Assign key" affordance
Variation B — Permission matrix
Top legend strip with 4 levels: None / View / Use / Admin (icon + label per level).
Matrix grid: rows = groups, columns = capabilities (View keys · Use keys · Sticky board · Manage team · Billing).
Each cell is a tappable level indicator; click cycles through levels.
Footer tip: "shift-click to bulk-edit across a column or row" + Export CSV.
Design system
Type
Inter (400 / 500 / 600 / 700) — all UI text.
JetBrains Mono (400 / 500) — API key fingerprints and shortcut keys.
Tight letter-spacing on display sizes (-0.025em to -0.005em).
Color tokens
Token	Light	Dark
App bg	#f6f6f4	#0a0a0a
Surface	#ffffff	#141414
Surface 2	#fafafa	#101010
Sidebar	#fbfbf9	#0d0d0d
Ink	#0a0a0a	#fafafa
Muted	#71717a	#a1a1aa
Border	#e5e5e1	#27272a
Accent	#5b5bd6 (indigo)	#7c7cf0
Accent soft	#eeeefb	#1d1d35
Status dots: prod #ef4444 · staging #f59e0b · dev #10b981.

Sticky note tonals (light): yellow #fef3c7 · blue #dbeafe · green #dcfce7 · pink #fce7f3 · purple #ede9fe — each paired with a darker ink color for legibility.

Shape & elevation
Card radius: 10–12px.
Button radius: 6px (sm), 7px (default).
Avatars: circular, gradient fills derived from initials.
Shadows: very subtle — 0 1px 2px rgba(0,0,0,0.03) for cards; 0 24px 60px -12px rgba(0,0,0,0.18) for popovers.
Components
WFBtn — primary (ink fill), default (surface + border), ghost, danger.
WFChip — tonal background + dot, semantic colors.
WFAvatar — gradient circle, initials, deterministic palette from initials.
WFIcon — 16px stroke icons, single-color, stroke-width: 1.6.
WFPageHead — title + subtitle + actions row.
Tweaks (in-product)
Light / Dark toggle (only tweak currently exposed).
Variations explored
Surface	Variants	Key decision
API Keys	A inline popover · B split detail	Compactness vs. depth
Sticky Board	Canvas · Kanban · Grid	Default layout per scope
Team	A group cards · B permission matrix	Drill-down vs. grid-edit