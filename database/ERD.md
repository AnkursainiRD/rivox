# Rivox — Database ERD

## Architecture

```
+------------------+         +------------------+
|   MySQL (Remote)  |  sync   | SQLite (Embedded) |
|   Team shared DB  | <-----> |  Local cache/prefs |
+------------------+         +------------------+
```

---

## Entity Relationship Diagram

```
                              +------------------+
                              |  organizations   |
                              |------------------|
                              | id          PK   |
                              | name             |
                              | slug        UQ   |
                              | logo_url         |
                              +--------+---------+
                                       |
                     +-----------------+------------------+
                     |                 |                  |
              +------+------+  +------+------+   +-------+-------+
              | org_members |  |   groups    |   |   api_keys    |
              |-------------|  |-------------|   |---------------|
              | id       PK |  | id       PK |   | id         PK |
              | org_id   FK |  | org_id   FK |   | org_id     FK |
              | user_id  FK |  | name        |   | name          |
              | role        |  | description |   | fingerprint   |
              +------+------+  | color       |   | encrypted_val |
                     |         | created_by  |   | environment   |
                     |         +------+------+   | is_active     |
                     |                |          | is_global     |
              +------+------+        |          | created_by FK |
              |    users    |        |          +---+-------+---+
              |-------------|        |              |       |
              | id       PK |  +----+-------+  +---+---+ +-+----------+
              | email    UQ |  | group_     |  | key_  | | key_group_ |
              | username    |  | members    |  | user_ | | access     |
              | display_name|  |------------|  | access| |------------|
              | avatar_url  |  | group_id FK|  |-------| | key_id  FK |
              | discord_id  |  | user_id  FK|  |key_id | | group_id FK|
              | password_   |  +------------+  |user_id| | permission |
              |   hash      |                  |perm.  | +------------+
              +------+------+                  +-------+
                     |
     +---------------+----------------+------------------+
     |               |                |                  |
+----+----+   +------+------+  +------+------+  +-------+--------+
|  tasks  |   |   issues    |  | activity_   |  | api_key_       |
|---------|   |-------------|  |    logs      |  | revocations    |
| id   PK |   | id       PK |  |-------------|  |----------------|
| org_id  |   | org_id   FK |  | id       PK |  | key_id      FK |
| title   |   | title       |  | org_id   FK |  | revoked_by  FK |
| body    |   | description |  | user_id  FK |  | reason         |
| color   |   | status      |  | action      |  +----------------+
| status  |   | priority    |  | entity_type |
| scope   |   | severity    |  | entity_id   |
| priority|   | type        |  | details JSON|
| start_  |   | reported_by |  +-------------+
|   date  |   | assigned_to |
| end_date|   | assigned_   |
| created |   |   group  FK |
|   _by   |   | due_date    |
| assigned|   +------+------+
|   _to   |          |
+---------+    +-----+----------+
               |                |
        +------+------+  +-----+--------+
        | issue_      |  | issue_       |
        | comments    |  | attachments  |
        |-------------|  |--------------|
        | id       PK |  | id        PK |
        | issue_id FK |  | issue_id  FK |
        | user_id  FK |  | file_name    |
        | body        |  | file_url     |
        +-------------+  | uploaded_by  |
                          +--------------+
```

---

## Tables Summary

### Core
| Table | Purpose | Rows scale |
|-------|---------|-----------|
| `organizations` | Workspaces (YourGPT, MCP360, Marketing) | 10s |
| `users` | All users, Discord OAuth linked | 100s |
| `org_members` | User-to-org mapping + role (super_admin/admin/employee) | 100s |

### Teams
| Table | Purpose |
|-------|---------|
| `groups` | Teams within an org (Backend, Frontend, Design, Ops) |
| `group_members` | User-to-group mapping |
| `group_permissions` | Per-group capability matrix (view_keys, use_keys, etc.) |

### API Keys
| Table | Purpose |
|-------|---------|
| `api_keys` | Stored secrets with env, rotation config, global flag |
| `api_key_user_access` | Per-user key sharing (view/use permission) |
| `api_key_group_access` | Per-group key sharing (view/use permission) |
| `api_key_revocations` | Audit log of revoked keys |

### Sticky Board (Tasks)
| Table | Purpose |
|-------|---------|
| `tasks` | Notes/tasks with status, scope (personal/team), dates, canvas position |
| `task_tags` | Org-level tag definitions |
| `task_tag_map` | Many-to-many task ↔ tag |

### Issues
| Table | Purpose |
|-------|---------|
| `issues` | Bug/feature reports with severity, assignment to user or group |
| `issue_labels` | Org-level label definitions |
| `issue_label_map` | Many-to-many issue ↔ label |
| `issue_comments` | Threaded comments on issues |
| `issue_attachments` | File uploads on issues |

### Audit
| Table | Purpose |
|-------|---------|
| `activity_logs` | All actions — employees see own, admins see all |

### Notifications
| Table | Purpose |
|-------|---------|
| `notifications` | In-app + Discord DM notifications with read/unread tracking |
| `notification_preferences` | Per-user toggles for each notification type (in-app / Discord DM) |

---

## Notification Flow

```
User A shares API key with User B
           │
           ├──> INSERT into notifications (recipient=B, type=key_shared)
           │
           ├──> In-App: real-time push via SSE (Server-Sent Events)
           │       └─ Client holds GET /api/events/stream (persistent connection)
           │       └─ Server pushes event: { type: "notification", data: {...} }
           │       └─ Bell icon shows unread count badge
           │       └─ Click marks as read via PATCH /api/notifications/:id
           │
           └──> Discord DM: if B.notification_preferences.discord_dm = true
                   └─ Bot sends embed via Discord API
                   └─ Stores discord_msg_id for tracking
                   └─ Marks discord_sent = true

SSE vs WebSocket:
  - SSE is one-way (server → client) which is all we need for notifications
  - Works over standard HTTP, no upgrade handshake, simpler infra
  - Auto-reconnects natively in the browser/webview (EventSource API)
  - Passes through proxies/firewalls without issues
  - For client → server actions (mark read, dismiss) we use normal REST calls
```

### Notification Types

| Type | Trigger | Example message |
|------|---------|-----------------|
| `key_shared` | Key shared with user/group | "Maya shared **prod-anthropic** key with you" |
| `key_revoked` | Key access revoked | "Access to **staging-stripe** was revoked" |
| `key_rotated` | Key auto/manual rotation | "**prod-openai** was rotated — new value available" |
| `task_assigned` | Task assigned to user | "You were assigned **Auth flow redesign**" |
| `task_status_changed` | Task you own changes status | "**Deploy checklist** moved to Completed" |
| `issue_assigned` | Issue assigned to user/group | "Bug **#42 Login crash** assigned to you" |
| `issue_commented` | Comment on issue you're in | "Jordan commented on **#42 Login crash**" |
| `issue_resolved` | Issue you reported resolved | "**#42 Login crash** was resolved" |
| `group_added` | Added to a group | "You were added to **Backend** group" |
| `group_removed` | Removed from a group | "You were removed from **Contractors** group" |
| `mention` | @mentioned in comment/task | "Maya mentioned you in **#42 Login crash**" |

---

## Role Hierarchy

```
super_admin ──> Full control, create orgs, manage billing
    |
  admin ──────> Create/delete groups, manage members, see all logs
    |
 employee ────> Use assigned keys, own tasks, report issues, see own logs
```

---

## Access Control Flow

```
Can user U see API key K?

  K.is_global == true?
    └─ YES ─> granted

  K.created_by == U.id?
    └─ YES ─> granted (owner)

  api_key_user_access (key_id=K, user_id=U) exists?
    └─ YES ─> granted with permission level

  U is member of group G
  AND api_key_group_access (key_id=K, group_id=G) exists?
    └─ YES ─> granted with permission level

  Otherwise ─> denied
```

---

## Activity Log Actions

| action | entity_type | details (JSON) |
|--------|-------------|----------------|
| `created` | api_key | `{ "name": "...", "env": "prod" }` |
| `shared` | api_key | `{ "with_user": "...", "permission": "use" }` |
| `revoked` | api_key | `{ "reason": "..." }` |
| `rotated` | api_key | `{ "auto": true }` |
| `used` | api_key | `{ "from_ip": "..." }` |
| `created` | task | `{ "title": "...", "scope": "team" }` |
| `status_changed` | task | `{ "from": "pending", "to": "completed" }` |
| `created` | issue | `{ "title": "...", "type": "bug" }` |
| `assigned` | issue | `{ "to_user": "..." }` |
| `commented` | issue | `{ "comment_id": "..." }` |
| `resolved` | issue | `{ "resolution": "fixed" }` |
| `added_member` | group | `{ "user_id": "..." }` |
| `removed_member` | group | `{ "user_id": "..." }` |
| `permission_changed` | permission | `{ "capability": "...", "from": "none", "to": "admin" }` |

---

## Local SQLite (Embedded per client)

```sql
-- User preferences (theme, layout, etc.)
CREATE TABLE local_preferences (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Offline task drafts (synced when online)
CREATE TABLE local_draft_tasks (
  id          TEXT PRIMARY KEY,
  payload     TEXT NOT NULL,  -- JSON of the task
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Cached key metadata (never the actual secret)
CREATE TABLE local_cache_keys (
  id          TEXT PRIMARY KEY,
  metadata    TEXT NOT NULL,  -- JSON
  cached_at   TEXT DEFAULT (datetime('now'))
);

-- Sync state tracking
CREATE TABLE local_sync_state (
  entity_type TEXT PRIMARY KEY,
  last_synced TEXT NOT NULL
);
```
