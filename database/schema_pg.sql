-- ============================================================
-- Rivox Database Schema — PostgreSQL (Neon)
-- ============================================================

-- ── ORGANIZATIONS ──────────────────────────────────────────

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(100) NOT NULL UNIQUE,
  logo_url      VARCHAR(500),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── USERS ──────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  username      VARCHAR(100) NOT NULL,
  display_name  VARCHAR(100),
  avatar_url    VARCHAR(500),
  discord_id    VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255),
  role          VARCHAR(20) NOT NULL DEFAULT 'user'
                CHECK (role IN ('super_admin', 'admin', 'user')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── ORG MEMBERSHIPS (user ↔ org + role) ────────────────────

CREATE TABLE org_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          VARCHAR(20) NOT NULL DEFAULT 'employee'
                CHECK (role IN ('super_admin', 'admin', 'employee')),
  joined_at     TIMESTAMPTZ DEFAULT now(),

  UNIQUE (org_id, user_id)
);

-- ── GROUPS ─────────────────────────────────────────────────

CREATE TABLE "groups" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  description   VARCHAR(500),
  color         VARCHAR(20),
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (org_id, name)
);

-- ── GROUP MEMBERS ──────────────────────────────────────────

CREATE TABLE group_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES "groups"(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (group_id, user_id)
);

-- ── GROUP PERMISSIONS ──────────────────────────────────────

CREATE TABLE group_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES "groups"(id) ON DELETE CASCADE,
  capability    VARCHAR(20) NOT NULL
                CHECK (capability IN ('view_keys', 'use_keys', 'manage_keys', 'sticky_board', 'manage_team', 'manage_issues', 'billing')),
  level         VARCHAR(10) NOT NULL DEFAULT 'none'
                CHECK (level IN ('none', 'view', 'use', 'admin')),

  UNIQUE (group_id, capability)
);

-- ── API KEYS ───────────────────────────────────────────────

CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  fingerprint   VARCHAR(100) NOT NULL,
  encrypted_value TEXT NOT NULL,
  environment   VARCHAR(10) NOT NULL DEFAULT 'dev'
                CHECK (environment IN ('prod', 'staging', 'dev')),
  is_active     BOOLEAN DEFAULT TRUE,
  is_global     BOOLEAN DEFAULT FALSE,
  auto_rotate   BOOLEAN DEFAULT FALSE,
  rotate_days   INTEGER DEFAULT 90,
  last_rotated  TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- key shared with individual users
CREATE TABLE api_key_user_access (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id        UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission    VARCHAR(10) NOT NULL DEFAULT 'view'
                CHECK (permission IN ('view', 'manage')),
  granted_by    UUID NOT NULL REFERENCES users(id),
  granted_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (key_id, user_id)
);

-- key shared with groups
CREATE TABLE api_key_group_access (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id        UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  group_id      UUID NOT NULL REFERENCES "groups"(id) ON DELETE CASCADE,
  permission    VARCHAR(10) NOT NULL DEFAULT 'view'
                CHECK (permission IN ('view', 'manage')),
  granted_by    UUID NOT NULL REFERENCES users(id),
  granted_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (key_id, group_id)
);

-- revoked keys log
CREATE TABLE api_key_revocations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id        UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  revoked_by    UUID NOT NULL REFERENCES users(id),
  reason        VARCHAR(500),
  revoked_at    TIMESTAMPTZ DEFAULT now()
);

-- ── STICKY BOARD (TASKS) ───────────────────────────────────

CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  body          TEXT,
  color         VARCHAR(10) DEFAULT 'yellow'
                CHECK (color IN ('yellow', 'blue', 'green', 'pink', 'purple')),
  status        VARCHAR(15) NOT NULL DEFAULT 'inbox'
                CHECK (status IN ('inbox', 'pending', 'ongoing', 'in_review', 'completed', 'rejected')),
  scope         VARCHAR(10) NOT NULL DEFAULT 'personal'
                CHECK (scope IN ('personal', 'team')),
  priority      VARCHAR(10) DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_pinned     BOOLEAN DEFAULT FALSE,

  -- canvas position (for free canvas layout)
  canvas_x      REAL DEFAULT 0,
  canvas_y      REAL DEFAULT 0,

  -- dates
  start_date    DATE,
  end_date      DATE,

  created_by    UUID NOT NULL REFERENCES users(id),
  assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE task_tags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          VARCHAR(50) NOT NULL,
  color         VARCHAR(20) DEFAULT '#5b5bd6',

  UNIQUE (org_id, name)
);

CREATE TABLE task_tag_map (
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id        UUID NOT NULL REFERENCES task_tags(id) ON DELETE CASCADE,

  PRIMARY KEY (task_id, tag_id)
);

-- ── CHANNELS ──────────────────────────────────────────────

CREATE TABLE channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL UNIQUE,
  description   VARCHAR(500),
  color         VARCHAR(20),
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── ISSUES ─────────────────────────────────────────────────

CREATE TABLE issues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number        INTEGER GENERATED ALWAYS AS IDENTITY UNIQUE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id    UUID REFERENCES channels(id) ON DELETE SET NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  status        VARCHAR(15) NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')),
  priority      VARCHAR(10) NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  severity      VARCHAR(10) DEFAULT 'minor'
                CHECK (severity IN ('cosmetic', 'minor', 'major', 'blocker')),
  type          VARCHAR(15) NOT NULL DEFAULT 'bug'
                CHECK (type IN ('bug', 'feature', 'improvement', 'task')),

  -- assignment
  reported_by   UUID NOT NULL REFERENCES users(id),
  assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_group UUID REFERENCES "groups"(id) ON DELETE SET NULL,

  -- metadata
  environment   VARCHAR(10)
                CHECK (environment IN ('prod', 'staging', 'dev')),
  browser       VARCHAR(100),
  steps_to_reproduce TEXT,
  expected_behavior  TEXT,
  actual_behavior    TEXT,

  -- dates
  due_date      DATE,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE issue_labels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          VARCHAR(50) NOT NULL,
  color         VARCHAR(20) DEFAULT '#ef4444',

  UNIQUE (org_id, name)
);

CREATE TABLE issue_label_map (
  issue_id      UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  label_id      UUID NOT NULL REFERENCES issue_labels(id) ON DELETE CASCADE,

  PRIMARY KEY (issue_id, label_id)
);

CREATE TABLE issue_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id      UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE issue_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id      UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  file_name     VARCHAR(255) NOT NULL,
  file_url      VARCHAR(500) NOT NULL,
  file_size     INTEGER,
  mime_type     VARCHAR(100),
  uploaded_by   UUID NOT NULL REFERENCES users(id),
  uploaded_at   TIMESTAMPTZ DEFAULT now()
);

-- ── ACTIVITY LOGS ──────────────────────────────────────────

CREATE TABLE activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  action        VARCHAR(50) NOT NULL,
  entity_type   VARCHAR(15) NOT NULL
                CHECK (entity_type IN ('api_key', 'task', 'issue', 'group', 'user', 'org', 'permission')),
  entity_id     UUID NOT NULL,
  details       JSONB,
  ip_address    VARCHAR(45),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_org_created ON activity_logs (org_id, created_at DESC);
CREATE INDEX idx_activity_user_created ON activity_logs (user_id, created_at DESC);
CREATE INDEX idx_activity_entity ON activity_logs (entity_type, entity_id);

-- ── NOTIFICATIONS ──────────────────────────────────────────

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES users(id),
  type          VARCHAR(25) NOT NULL
                CHECK (type IN (
                  'key_shared', 'key_revoked', 'key_rotated',
                  'task_assigned', 'task_status_changed',
                  'issue_assigned', 'issue_commented', 'issue_resolved',
                  'group_added', 'group_removed', 'mention'
                )),
  title         VARCHAR(255) NOT NULL,
  body          VARCHAR(500),
  entity_type   VARCHAR(15) NOT NULL
                CHECK (entity_type IN ('api_key', 'task', 'issue', 'group', 'user', 'org')),
  entity_id     UUID NOT NULL,
  is_read       BOOLEAN DEFAULT FALSE,
  read_at       TIMESTAMPTZ,

  -- discord delivery
  discord_sent     BOOLEAN DEFAULT FALSE,
  discord_sent_at  TIMESTAMPTZ,
  discord_msg_id   VARCHAR(50),

  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notif_recipient_unread ON notifications (recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notif_org_created ON notifications (org_id, created_at DESC);

-- per-user notification preferences
CREATE TABLE notification_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(25) NOT NULL
                CHECK (type IN (
                  'key_shared', 'key_revoked', 'key_rotated',
                  'task_assigned', 'task_status_changed',
                  'issue_assigned', 'issue_commented', 'issue_resolved',
                  'group_added', 'group_removed', 'mention'
                )),
  in_app        BOOLEAN DEFAULT TRUE,
  discord_dm    BOOLEAN DEFAULT TRUE,

  UNIQUE (user_id, type)
);

-- ── APP SETTINGS ──────────────────────────────────────────

CREATE TABLE app_settings (
  key           VARCHAR(100) PRIMARY KEY,
  value         TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
-- organizations (2 rows)
INSERT INTO organizations (id, name, slug, logo_url, created_at, updated_at) VALUES
('362c0b8a-0eb8-4578-8100-6753e85cea77', 'MCP360', 'mcp360', NULL, '2026-05-19 09:26:17', '2026-05-19 09:26:17'),
('7aba0da1-45ee-41bf-8612-58335b60e497', 'Yourgpt', 'yourgpt', NULL, '2026-05-19 09:23:53', '2026-05-19 09:23:53');

-- users (8 rows)
INSERT INTO users (id, email, username, display_name, avatar_url, discord_id, password_hash, role, created_at, updated_at) VALUES
('36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'employee@rivox.app', 'emp_user', 'Eren', NULL, NULL, NULL, 'super_admin', '2026-05-19 10:48:04', '2026-05-20 11:04:18'),
('aa083e26-5370-11f1-a90b-bda2f5e69f69', 'sarah@rivox.app', 'sarah_chen', 'Sarah Chen', NULL, NULL, NULL, 'admin', '2026-05-19 10:51:17', '2026-05-19 11:41:59'),
('aa0865a4-5370-11f1-a90b-bda2f5e69f69', 'marcus@rivox.app', 'marcus_j', 'Marcus Johnson', NULL, NULL, NULL, 'user', '2026-05-19 10:51:17', '2026-05-19 10:51:17'),
('aa0866da-5370-11f1-a90b-bda2f5e69f69', 'aisha@rivox.app', 'aisha_p', 'Aisha Patel', NULL, NULL, NULL, 'user', '2026-05-19 10:51:17', '2026-05-19 10:51:17'),
('aa086770-5370-11f1-a90b-bda2f5e69f69', 'jake@rivox.app', 'jake_m', 'Jake Morrison', NULL, NULL, NULL, 'user', '2026-05-19 10:51:17', '2026-05-19 10:51:17'),
('aa0867e8-5370-11f1-a90b-bda2f5e69f69', 'elena@rivox.app', 'elena_r', 'Elena Rodriguez', NULL, NULL, NULL, 'user', '2026-05-19 10:51:17', '2026-05-19 10:51:17'),
('aa08689c-5370-11f1-a90b-bda2f5e69f69', 'tom@rivox.app', 'tom_b', 'Tom Baker', NULL, NULL, NULL, 'user', '2026-05-19 10:51:17', '2026-05-20 11:04:23'),
('d81ea825-692b-4a62-82e5-de0eca6a0638', 'ankur.delta4infotech@gmail.com', 'ankur_d4', 'Ankur', 'https://cdn.discordapp.com/avatars/1345979302662897704/f4898abf6b985e151995c4f0e20c4a2f.png', '1345979302662897704', NULL, 'super_admin', '2026-05-19 08:20:35', '2026-05-19 09:18:42');

-- org_members (9 rows)
INSERT INTO org_members (id, org_id, user_id, role, joined_at) VALUES
('3de81fa1-9c10-4404-9195-7478245ae0cb', '362c0b8a-0eb8-4578-8100-6753e85cea77', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'super_admin', '2026-05-19 09:26:17'),
('b8197192-5370-11f1-a90b-bda2f5e69f69', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'admin', '2026-05-19 10:51:41'),
('b819af40-5370-11f1-a90b-bda2f5e69f69', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', 'employee', '2026-05-19 10:51:41'),
('b819b1ca-5370-11f1-a90b-bda2f5e69f69', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'employee', '2026-05-19 10:51:41'),
('b819b2ba-5370-11f1-a90b-bda2f5e69f69', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa086770-5370-11f1-a90b-bda2f5e69f69', 'employee', '2026-05-19 10:51:41'),
('b819b378-5370-11f1-a90b-bda2f5e69f69', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0867e8-5370-11f1-a90b-bda2f5e69f69', 'employee', '2026-05-19 10:51:41'),
('b819b422-5370-11f1-a90b-bda2f5e69f69', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa08689c-5370-11f1-a90b-bda2f5e69f69', 'employee', '2026-05-19 10:51:41'),
('b819b4c2-5370-11f1-a90b-bda2f5e69f69', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'employee', '2026-05-19 10:51:41'),
('d770d7d1-eb6a-44f3-a4a6-e754ed80bfff', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'super_admin', '2026-05-19 09:23:53');

-- groups (5 rows)
INSERT INTO "groups" (id, org_id, name, description, color, created_by, created_at, updated_at) VALUES
('3ab62ea0-9662-4117-9215-a52eba1524cb', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Marketing', NULL, '#71717a', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-19 12:01:55', '2026-05-19 12:01:55'),
('72323f0f-5f06-4140-85fd-1c9be5424e69', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Backend', 'This group is for the backend team', '#6366f1', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-20 05:17:27', '2026-05-20 06:25:45'),
('b81a3b54-5370-11f1-a90b-bda2f5e69f69', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Frontend', 'Frontend and design engineering', '#3b82f6', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-19 10:51:41', '2026-05-19 10:51:41'),
('b81a3c94-5370-11f1-a90b-bda2f5e69f69', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Design', 'Product design team', '#ec4899', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-19 10:51:41', '2026-05-19 10:51:41'),
('b81a3d52-5370-11f1-a90b-bda2f5e69f69', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Ops', 'DevOps and infrastructure', '#f59e0b', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-19 10:51:41', '2026-05-19 10:51:41');

-- group_members (15 rows)
INSERT INTO group_members (id, group_id, user_id, added_at) VALUES
('1f37e462-8ab9-4b51-8390-3aa5800af640', '72323f0f-5f06-4140-85fd-1c9be5424e69', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', '2026-05-20 05:34:28'),
('7d80c204-86fa-4d2b-8d73-7049f062e824', 'b81a3c94-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-22 06:57:01'),
('8838a948-72f5-42d1-9982-e035344ccd6b', '72323f0f-5f06-4140-85fd-1c9be5424e69', 'aa0867e8-5370-11f1-a90b-bda2f5e69f69', '2026-05-20 05:34:31'),
('aaab342d-4277-48ff-af35-e9fd89005eff', '72323f0f-5f06-4140-85fd-1c9be5424e69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-20 05:17:41'),
('bff255f9-cfed-4e3f-bb2b-efb505ec648c', '3ab62ea0-9662-4117-9215-a52eba1524cb', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', '2026-05-19 12:01:59'),
('c6c2520e-5370-11f1-a90b-bda2f5e69f69', 'b81a3b54-5370-11f1-a90b-bda2f5e69f69', 'aa0867e8-5370-11f1-a90b-bda2f5e69f69', '2026-05-19 10:52:06'),
('c6c2540c-5370-11f1-a90b-bda2f5e69f69', 'b81a3b54-5370-11f1-a90b-bda2f5e69f69', 'aa086770-5370-11f1-a90b-bda2f5e69f69', '2026-05-19 10:52:06'),
('c6c254fc-5370-11f1-a90b-bda2f5e69f69', 'b81a3b54-5370-11f1-a90b-bda2f5e69f69', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', '2026-05-19 10:52:06'),
('c6c26578-5370-11f1-a90b-bda2f5e69f69', 'b81a3b54-5370-11f1-a90b-bda2f5e69f69', 'aa08689c-5370-11f1-a90b-bda2f5e69f69', '2026-05-19 10:52:06'),
('c6c266e0-5370-11f1-a90b-bda2f5e69f69', 'b81a3c94-5370-11f1-a90b-bda2f5e69f69', 'aa0867e8-5370-11f1-a90b-bda2f5e69f69', '2026-05-19 10:52:06'),
('c6c26794-5370-11f1-a90b-bda2f5e69f69', 'b81a3c94-5370-11f1-a90b-bda2f5e69f69', 'aa08689c-5370-11f1-a90b-bda2f5e69f69', '2026-05-19 10:52:06'),
('c6c26852-5370-11f1-a90b-bda2f5e69f69', 'b81a3c94-5370-11f1-a90b-bda2f5e69f69', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', '2026-05-19 10:52:06'),
('c6c2696a-5370-11f1-a90b-bda2f5e69f69', 'b81a3d52-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-19 10:52:06'),
('c6c26a28-5370-11f1-a90b-bda2f5e69f69', 'b81a3d52-5370-11f1-a90b-bda2f5e69f69', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', '2026-05-19 10:52:06'),
('cdb32820-5566-4880-9f23-16875f071d38', 'b81a3d52-5370-11f1-a90b-bda2f5e69f69', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', '2026-05-19 12:02:09');

-- api_keys (3 rows)
INSERT INTO api_keys (id, org_id, name, fingerprint, encrypted_value, environment, is_active, is_global, auto_rotate, rotate_days, last_rotated, last_used_at, expires_at, created_by, created_at, updated_at) VALUES
('085358b3-ebd1-448d-af4c-ac77862fb17f', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Github personal token', 'fp:0040d9c56db3fd0b', '2899819fe3f97b2b1cd404a90080d233:eddb3f0c4a773cbec710bf3a9296736e:b9d7d68c55be11547902425bc2340592b7ef4e561d84b9fae82a9bbafcd7db6e58f6ba0ad548c246', 'dev', TRUE, FALSE, FALSE, 90, NULL, NULL, NULL, 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-22 07:39:44', '2026-05-22 07:39:44'),
('1e562f54-a3a8-4435-9600-be28b3f1740d', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Grok', 'fp:03ac674216f3e15c', 'f712d2ef38ef45b1ac2e9b1b5648373a:dcc38abf76dccdadd0733882404b4ac6:54e15c5e', 'dev', TRUE, FALSE, FALSE, 90, NULL, NULL, NULL, 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-19 12:31:45', '2026-05-19 12:31:45'),
('8f5357fa-308d-4ecc-bbf9-82a9bad96db0', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Open AI', 'fp:80481c7c6378b3a1', 'eb906d1cc1a67d54feb2fb23d77bf586:5a17ac50d527d63a901718c174599c5b:4f0883b885', 'staging', TRUE, FALSE, FALSE, 90, NULL, NULL, NULL, 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-20 07:27:01', '2026-05-20 07:57:55');

-- api_key_user_access (4 rows)
INSERT INTO api_key_user_access (id, key_id, user_id, permission, granted_by, granted_at) VALUES
('295f1a22-87aa-429e-a2ac-3edaad33ae57', '1e562f54-a3a8-4435-9600-be28b3f1740d', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'manage', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-20 06:44:03'),
('9458f93b-76ac-4dbf-97da-910655615a40', '1e562f54-a3a8-4435-9600-be28b3f1740d', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'manage', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-20 07:26:31'),
('9bd82def-f338-404c-9beb-28813da5b085', '1e562f54-a3a8-4435-9600-be28b3f1740d', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', 'manage', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-20 07:01:53'),
('c75a8780-1ac6-4d6d-bd74-10d9a93d8230', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'manage', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-21 10:12:22');

-- tasks (11 rows)
INSERT INTO tasks (id, org_id, title, body, color, status, scope, priority, is_pinned, canvas_x, canvas_y, start_date, end_date, created_by, assigned_to, created_at, updated_at) VALUES
('467a07a9-60f8-47a9-a3f7-0a863295b0b0', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Test', 'Test', 'yellow', 'inbox', 'team', 'medium', FALSE, 220, 234, NULL, NULL, 'd81ea825-692b-4a62-82e5-de0eca6a0638', NULL, '2026-05-20 12:28:06', '2026-05-22 07:11:03'),
('7aeb94e4-5447-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Auth flow redesign', 'Simplify the login → onboarding path. Check with design on new OTP screen. Remove legacy session cookie fallback.', 'green', 'ongoing', 'personal', 'high', TRUE, 602, 204, NULL, NULL, 'd81ea825-692b-4a62-82e5-de0eca6a0638', NULL, '2026-05-20 12:29:00', '2026-05-21 13:31:45'),
('7aebaace-5447-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'API rate limiting', 'Implement sliding window approach for /v2 endpoints. Current token bucket leaks under burst traffic.', 'blue', 'in_review', 'team', 'urgent', FALSE, 634, 130, NULL, NULL, 'd81ea825-692b-4a62-82e5-de0eca6a0638', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', '2026-05-20 12:29:00', '2026-05-22 07:10:59'),
('7aebabfa-5447-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Customer feedback Q2', 'Top asks: better search, dark mode (done!), export CSV. Schedule user interviews for next week.', 'pink', 'inbox', 'team', 'medium', FALSE, 475, 167, NULL, NULL, 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-20 12:29:00', '2026-05-22 07:11:05'),
('7aebacd6-5447-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Deploy checklist', 'Run migrations, update env vars, notify #ops channel. Verify health checks pass before switching traffic.', 'green', 'ongoing', 'team', 'high', TRUE, 775, 551, NULL, NULL, 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', '2026-05-20 12:29:00', '2026-05-22 07:11:02'),
('7aebadee-5447-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Design system tokens', 'Audit all hardcoded colors and replace with design tokens. Start with the button and input components.', 'purple', 'inbox', 'personal', 'medium', FALSE, 302, 42, NULL, NULL, 'd81ea825-692b-4a62-82e5-de0eca6a0638', NULL, '2026-05-20 12:29:00', '2026-05-22 05:53:07'),
('7aebafd8-5447-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Sprint retro notes', 'Went well: shipping velocity, team morale. Improve: test coverage, PR review turnaround time.', 'yellow', 'completed', 'team', 'low', FALSE, 596, 250, NULL, NULL, 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', '2026-05-20 12:29:00', '2026-05-22 07:20:18'),
('7aebb0a0-5447-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Webhook retry logic', 'Add exponential backoff with jitter for failed webhook deliveries. Max 5 retries over 24h window.', 'blue', 'in_review', 'personal', 'high', FALSE, 85, 270, NULL, NULL, 'd81ea825-692b-4a62-82e5-de0eca6a0638', NULL, '2026-05-20 12:29:00', '2026-05-22 05:01:49'),
('7aebb19a-5447-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Mobile responsive audit', 'Test all pages on iPhone 15, Pixel 8, iPad. Fix sidebar collapse and table horizontal scroll.', 'green', 'pending', 'team', 'medium', FALSE, 39, 299, NULL, NULL, 'aa083e26-5370-11f1-a90b-bda2f5e69f69', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', '2026-05-20 12:29:00', '2026-05-21 12:22:58'),
('7aebb2a8-5447-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'SSO documentation', 'Write setup guide for Okta and Azure AD integrations. Include screenshots and troubleshooting section.', 'pink', 'ongoing', 'team', 'low', FALSE, 338, 475, NULL, NULL, 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', '2026-05-20 12:29:00', '2026-05-22 07:20:22'),
('7aebb37a-5447-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'Billing page redesign', 'New layout with usage graph, plan comparison, and invoice history. Figma link in #design channel.', 'purple', 'ongoing', 'personal', 'medium', TRUE, 75, 77, NULL, NULL, 'd81ea825-692b-4a62-82e5-de0eca6a0638', NULL, '2026-05-20 12:29:00', '2026-05-22 05:53:07');

-- task_tags (6 rows)
INSERT INTO task_tags (id, org_id, name, color) VALUES
('579350ec-544a-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'design', '#ec4899'),
('579d5128-544a-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'frontend', '#3b82f6'),
('579d55ce-544a-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'backend', '#10b981'),
('579d5696-544a-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'auth', '#f59e0b'),
('579d5718-544a-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'legal', '#ef4444'),
('579dbe92-544a-11f1-b5d8-585aba99cd39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'ops', '#8b5cf6');

-- task_tag_map (10 rows)
INSERT INTO task_tag_map (task_id, tag_id) VALUES
('7aebabfa-5447-11f1-b5d8-585aba99cd39', '579350ec-544a-11f1-b5d8-585aba99cd39'),
('7aebadee-5447-11f1-b5d8-585aba99cd39', '579350ec-544a-11f1-b5d8-585aba99cd39'),
('7aebafd8-5447-11f1-b5d8-585aba99cd39', '579350ec-544a-11f1-b5d8-585aba99cd39'),
('7aebb37a-5447-11f1-b5d8-585aba99cd39', '579350ec-544a-11f1-b5d8-585aba99cd39'),
('7aebb19a-5447-11f1-b5d8-585aba99cd39', '579d5128-544a-11f1-b5d8-585aba99cd39'),
('7aebaace-5447-11f1-b5d8-585aba99cd39', '579d55ce-544a-11f1-b5d8-585aba99cd39'),
('7aebb0a0-5447-11f1-b5d8-585aba99cd39', '579d55ce-544a-11f1-b5d8-585aba99cd39'),
('7aeb94e4-5447-11f1-b5d8-585aba99cd39', '579d5696-544a-11f1-b5d8-585aba99cd39'),
('7aebb2a8-5447-11f1-b5d8-585aba99cd39', '579d5696-544a-11f1-b5d8-585aba99cd39'),
('7aebacd6-5447-11f1-b5d8-585aba99cd39', '579dbe92-544a-11f1-b5d8-585aba99cd39');

-- channels (3 rows)
INSERT INTO channels (id, name, description, color, created_by, created_at, updated_at) VALUES
('2f839d84-543e-11f1-b5d8-585aba99cd39', 'YourGPT', 'YourGPT product issues', '#5b5bd6', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-20 11:22:28', '2026-05-20 11:22:28'),
('2f83b1f2-543e-11f1-b5d8-585aba99cd39', 'Whitelisted', 'Whitelisted platform bugs', '#10b981', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-20 11:22:28', '2026-05-20 11:22:28'),
('2f83b2d8-543e-11f1-b5d8-585aba99cd39', 'mTarsier', 'mTarsier integration issues', '#f59e0b', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '2026-05-20 11:22:28', '2026-05-20 11:22:28');

-- issues (16 rows)
INSERT INTO issues (id, number, org_id, channel_id, title, description, status, priority, severity, type, reported_by, assigned_to, assigned_group, environment, browser, steps_to_reproduce, expected_behavior, actual_behavior, due_date, resolved_at, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES
('5134696c-54e9-11f1-a1d1-1f2352330b9b', 9, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f839d84-543e-11f1-b5d8-585aba99cd39', 'Add dark mode toggle to settings', 'Done. The issue detail page now matches the v3 wireframe:

Top bar: Breadcrumb + nav arrows + Share + Subscribe + "Move to review" (dynamic — changes based on current status: Start progress → Move to review → Mark done → Reopen) + Notify button

Header: #9 · avatar · Sarah Chen opened on 20 May 2026 — issue number prominent, reporter with avatar inline

Title: Larger (24px) and bolder

Labeled chip pills: TYPE ● Feature | STATUS ● In progress | PRIORITY ▌▌ Medium | SEVERITY Major — each in a bordered pill container with label

Description: Larger text, white bg card with more padding, Edit button

Media & attachments: Single unified drop zone with share icon, file count, "Browse" button — matches wireframe exactly

Activity: Section title with event count, filter tabs (All/Comments/Updates), comment box with "use @ to mention, / for commands" placeholder + Attach button in footer

Right sidebar reorganized into sections:

PEOPLE — Assignee (with picker), Reporter (read-only with avatar)
PROPERTIES — Team, Due, Channel
LABELS — Tag chips with "+ add" button
SUBSCRIBERS — Avatar stack with + button
Delete button at bottom', 'in_progress', 'medium', 'major', 'feature', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', '72323f0f-5f06-4140-85fd-1c9be5424e69', NULL, NULL, NULL, NULL, NULL, '2026-05-11 18:30:00', '2026-05-21 08:25:59', '2026-05-20 08:45:00', '2026-05-22 06:21:04'),
('51346c46-54e9-11f1-a1d1-1f2352330b9b', 10, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f839d84-543e-11f1-b5d8-585aba99cd39', 'CSV export missing last column header', 'When exporting issues to CSV, the last column header (Due Date) is missing. The data is there but the header row is truncated.', 'open', 'medium', 'minor', 'bug', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', '72323f0f-5f06-4140-85fd-1c9be5424e69', NULL, NULL, NULL, NULL, NULL, '2026-05-25 18:30:00', '2026-05-21 09:47:13', '2026-05-19 03:30:00', '2026-05-22 07:24:15'),
('51346e3a-54e9-11f1-a1d1-1f2352330b9b', 11, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f839d84-543e-11f1-b5d8-585aba99cd39', 'Implement @mention picker in comments', 'Add an autocomplete dropdown when typing @ in issue comments. Should search org members and link to their profile.', 'open', 'low', 'minor', 'feature', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '72323f0f-5f06-4140-85fd-1c9be5424e69', NULL, NULL, NULL, NULL, NULL, '2026-06-01 18:30:00', '2026-05-21 09:47:14', '2026-05-18 11:15:00', '2026-05-22 06:54:28'),
('51346fd4-54e9-11f1-a1d1-1f2352330b9b', 12, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f839d84-543e-11f1-b5d8-585aba99cd39', 'API key rotation fails on staging', 'Rotation cron fails for keys created via REST API. After the 90-day rotation window, the new key isnt propagated to Stripe webhooks fast enough — webhook returns 401 for ~3 minutes.', 'closed', 'critical', 'blocker', 'bug', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'aa086770-5370-11f1-a90b-bda2f5e69f69', '72323f0f-5f06-4140-85fd-1c9be5424e69', 'staging', NULL, NULL, NULL, NULL, '2026-05-21 18:30:00', '2026-05-21 07:56:42', '2026-05-15 05:30:00', '2026-05-21 09:46:12'),
('5134860e-54e9-11f1-a1d1-1f2352330b9b', 13, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f839d84-543e-11f1-b5d8-585aba99cd39', 'Onboarding tour skips API key step on mobile', 'The product tour wizard skips step 3 (Create your first API key) when viewport width is below 768px. Tested on iPhone 15 and Pixel 8.', 'open', 'low', 'minor', 'bug', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'aa0867e8-5370-11f1-a90b-bda2f5e69f69', 'b81a3b54-5370-11f1-a90b-bda2f5e69f69', NULL, NULL, NULL, NULL, NULL, '2026-05-20 18:30:00', NULL, '2026-05-14 03:00:00', '2026-05-21 09:47:30'),
('51348a8c-54e9-11f1-a1d1-1f2352330b9b', 14, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f83b1f2-543e-11f1-b5d8-585aba99cd39', 'Permission matrix exports wrong CSV header', 'The exported CSV has jumbled column headers when more than 10 permissions are selected. Works fine with fewer.', 'open', 'medium', 'minor', 'bug', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', '72323f0f-5f06-4140-85fd-1c9be5424e69', NULL, NULL, NULL, NULL, NULL, '2026-05-24 18:30:00', '2026-05-21 09:47:20', '2026-05-10 07:50:00', '2026-05-21 09:47:29'),
('51348d5c-54e9-11f1-a1d1-1f2352330b9b', 15, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f83b1f2-543e-11f1-b5d8-585aba99cd39', 'Audit log retention setting in workspace UI', 'Add a setting in workspace admin to configure audit log retention period (30/60/90/365 days). Currently hardcoded to 90 days.', 'resolved', 'high', 'major', 'feature', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'aa0867e8-5370-11f1-a90b-bda2f5e69f69', '72323f0f-5f06-4140-85fd-1c9be5424e69', NULL, NULL, NULL, NULL, NULL, '2026-06-04 18:30:00', '2026-05-21 09:47:19', '2026-05-08 04:30:00', '2026-05-21 09:47:19'),
('51349108-54e9-11f1-a1d1-1f2352330b9b', 16, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f83b1f2-543e-11f1-b5d8-585aba99cd39', 'SSO group sync — Okta scope handling', 'Okta SCIM provisioning doesnt map group scopes correctly when user belongs to 3+ groups. Needs investigation with Okta support.', 'closed', 'critical', 'blocker', 'task', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', '72323f0f-5f06-4140-85fd-1c9be5424e69', 'prod', NULL, NULL, NULL, NULL, '2026-05-19 18:30:00', '2026-05-21 07:48:11', '2026-05-05 10:00:00', '2026-05-21 09:46:12'),
('5134946e-54e9-11f1-a1d1-1f2352330b9b', 17, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f83b1f2-543e-11f1-b5d8-585aba99cd39', 'Migrate billing webhook to new endpoint', 'Stripe deprecated the v1 webhook endpoint. Need to migrate to v2 events API and update the signature verification.', 'in_progress', 'medium', 'minor', 'task', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', 'b81a3d52-5370-11f1-a90b-bda2f5e69f69', NULL, NULL, NULL, NULL, NULL, '2026-05-17 18:30:00', '2026-05-21 07:56:54', '2026-05-03 04:15:00', '2026-05-21 09:47:31'),
('51349838-54e9-11f1-a1d1-1f2352330b9b', 18, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f83b2d8-543e-11f1-b5d8-585aba99cd39', 'Sticky note color contrast fails AA in dark mode', 'Yellow and green sticky notes have insufficient contrast ratio (below 4.5:1) against the dark canvas background. Needs darker text or lighter bg.', 'closed', 'medium', 'minor', 'bug', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'b81a3c94-5370-11f1-a90b-bda2f5e69f69', NULL, NULL, NULL, NULL, NULL, '2026-05-22 18:30:00', '2026-05-21 08:29:24', '2026-05-01 06:30:00', '2026-05-21 09:46:12'),
('51349c02-54e9-11f1-a1d1-1f2352330b9b', 19, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f83b2d8-543e-11f1-b5d8-585aba99cd39', 'Empty state copy for new workspaces', 'Write and implement empty state illustrations and copy for: Issues, Sticky Board, API Keys, and Team pages when a workspace is freshly created.', 'resolved', 'low', 'cosmetic', 'task', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'b81a3c94-5370-11f1-a90b-bda2f5e69f69', NULL, NULL, NULL, NULL, NULL, '2026-05-23 18:30:00', '2026-05-21 07:48:10', '2026-04-28 08:30:00', '2026-05-22 07:14:14'),
('51349f90-54e9-11f1-a1d1-1f2352330b9b', 20, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f83b2d8-543e-11f1-b5d8-585aba99cd39', 'Search results dont clear after backspace', 'When you type a search query, get results, then backspace to clear — the old results remain visible until you click away. Should clear on empty input.', 'open', 'low', 'minor', 'bug', 'aa086770-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'b81a3b54-5370-11f1-a90b-bda2f5e69f69', NULL, NULL, NULL, NULL, NULL, '2026-05-31 18:30:00', '2026-05-21 09:47:16', '2026-04-20 05:00:00', '2026-05-22 07:14:15'),
('5134a29c-54e9-11f1-a1d1-1f2352330b9b', 21, '7aba0da1-45ee-41bf-8612-58335b60e497', '2f83b2d8-543e-11f1-b5d8-585aba99cd39', 'Avatar image 404 after profile update', 'After changing profile picture, the old avatar URL returns 404 on other users screens until they hard refresh. CDN cache invalidation issue.', 'resolved', 'medium', 'major', 'bug', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', '72323f0f-5f06-4140-85fd-1c9be5424e69', 'prod', NULL, NULL, NULL, NULL, '2026-05-26 18:30:00', '2026-05-21 07:48:15', '2026-04-15 10:30:00', '2026-05-21 09:46:12'),
('51f2e428-54f8-11f1-a1d1-1f2352330b9b', 22, '7aba0da1-45ee-41bf-8612-58335b60e497', NULL, 'Old bug from last week', NULL, 'closed', 'low', 'minor', 'bug', 'd81ea825-692b-4a62-82e5-de0eca6a0638', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'b81a3b54-5370-11f1-a90b-bda2f5e69f69', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-12 04:30:00', '2026-05-21 10:00:54'),
('51f3292e-54f8-11f1-a1d1-1f2352330b9b', 23, '7aba0da1-45ee-41bf-8612-58335b60e497', NULL, 'Ancient feature request', NULL, 'closed', 'medium', 'minor', 'feature', 'd81ea825-692b-4a62-82e5-de0eca6a0638', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-15 04:30:00', '2026-05-21 09:34:52'),
('51f32d2a-54f8-11f1-a1d1-1f2352330b9b', 24, '7aba0da1-45ee-41bf-8612-58335b60e497', NULL, 'Last month improvement', NULL, 'open', 'high', 'major', 'improvement', 'd81ea825-692b-4a62-82e5-de0eca6a0638', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-02 04:30:00', '2026-05-21 09:47:38');

-- issue_comments (2 rows)
INSERT INTO issue_comments (id, issue_id, user_id, body, created_at, updated_at) VALUES
('81001445-9b24-4b0d-b96c-11ec4c0460ea', '51349c02-54e9-11f1-a1d1-1f2352330b9b', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'hey there,', '2026-05-21 07:56:13', '2026-05-21 07:56:13'),
('fe258874-fb04-4369-9847-b820074228d6', '5134696c-54e9-11f1-a1d1-1f2352330b9b', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'Hey', '2026-05-22 06:28:23', '2026-05-22 06:28:23');

-- activity_logs (219 rows)
INSERT INTO activity_logs (id, org_id, user_id, action, entity_type, entity_id, details, ip_address, created_at) VALUES
('001aeec9-726a-4888-813c-902f9dc900ac', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:57'),
('0092fbf5-a8d8-48f0-a68d-c7016a407788', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51348a8c-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:29'),
('00c3ca56-57bb-4e6b-a5c5-38bdaa3742ad', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '5134a29c-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 07:56:43'),
('0143057a-c618-4809-9cb3-5c19f2bc923e', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:31:47'),
('0213dc3c-a9c0-45d2-8ad0-dfc8e2d4351b', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"completed"}', NULL, '2026-05-22 07:20:22'),
('034d6560-abae-4562-abd9-28c1209aca8e', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'api_key', 'd0d7f515-038a-49e7-b3b0-fb55f7397720', '{"name":"OpenAI","environment":"staging"}', NULL, '2026-05-19 09:43:12'),
('035d6e0c-f174-4ff8-a330-5478238d0c4f', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51349108-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 08:27:41'),
('0548a380-78fe-4834-be69-fc57722c46f8', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"with_user":"aa0866da-5370-11f1-a90b-bda2f5e69f69","permission":"view"}', NULL, '2026-05-20 06:40:34'),
('06b02539-df31-4d3b-af26-14924ec30005', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'commented', 'issue', '2868099f-7966-416c-8dea-0353bfc053a1', '{"comment_id":"7aa2c46c-675b-4856-b1c1-5422901f5708"}', NULL, '2026-05-20 11:46:57'),
('07e83b22-4e87-4750-a8b0-3fe181ad77a5', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:59'),
('0906db11-0878-49ab-ac2d-14bb053faeca', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 13:04:48'),
('092dff46-9ae1-4a21-aa4e-cacdbed8a955', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', 'a5d42af7-d473-4d2a-8492-62018798de22', NULL, NULL, '2026-05-20 09:45:34'),
('0a0919f2-2a18-44f8-a097-fa2beb855804', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:32:11'),
('0a4eb9e0-bc31-41cc-b83e-81729e4ca359', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"in_review"}', NULL, '2026-05-21 12:12:22'),
('0b3625ef-7625-42fa-a2e5-e3f5671c50b0', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 07:52:12'),
('0cdffd22-ef37-4812-bb5a-e4ec6f6924fa', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebaace-5447-11f1-b5d8-585aba99cd39', '{"to":"completed","from":"ongoing"}', NULL, '2026-05-21 08:07:40'),
('0ea28443-3c5d-4f69-8f89-02bab08a9df0', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', '{"with_user":"aa0865a4-5370-11f1-a90b-bda2f5e69f69","permission":"manage"}', NULL, '2026-05-20 07:26:27'),
('0fbb33ee-b0f6-40b4-b027-94cf4ad074ec', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:31:40'),
('0fc8d9ac-8cf6-4b9a-9327-2213c586ef3c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51349c02-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:41'),
('10f63f08-99c6-459c-a88e-faf20af84d10', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebacd6-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"completed"}', NULL, '2026-05-22 07:05:03'),
('118396fd-b4a9-4976-a7cf-f401e716f5cc', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebacd6-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"completed"}', NULL, '2026-05-21 08:07:39'),
('132b9ae3-d668-4dcf-b8b2-cade73e545a9', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'notified', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', '{"message":"Ankur wants your attention on \"Implement @mention picker in comments\"","targets":["aa0866da-5370-11f1-a90b-bda2f5e69f69"]}', NULL, '2026-05-22 06:56:05'),
('17d37d7f-2862-467d-806c-fc8f59c415e6', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:59'),
('1a34fdb5-f10c-4949-a2fc-451290032174', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:58'),
('1a39b4e6-fbd1-41c9-92ce-6368da5717d5', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'group', '72323f0f-5f06-4140-85fd-1c9be5424e69', '{"name":"Backend Team"}', NULL, '2026-05-20 05:17:27'),
('1b664c3b-db5f-44a3-b6a5-bfef76a4ea6e', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '13e4c7b7-1aa3-460e-99ce-bb25440a6001', NULL, NULL, '2026-05-20 09:36:13'),
('1b7338c7-9876-4528-8c52-8ad536c88fee', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"in_review"}', NULL, '2026-05-21 12:41:35'),
('1fae58c1-f49f-418c-9027-7b0b76683e23', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '51348a8c-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:20'),
('2041e090-1753-421d-9f08-16aae013fb20', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"in_review"}', NULL, '2026-05-21 12:41:33'),
('2096a245-dbc9-417e-8c94-69eb2ac4c50b', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:57'),
('23094e23-c2c2-4890-a9dc-9644c537fa74', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"in_review"}', NULL, '2026-05-21 12:41:14'),
('231088dd-f3a6-469d-a2e0-557a948fd6dc', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51349f90-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-22 07:14:15'),
('23cf9989-cc43-4244-81d1-5d1328272dd9', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 07:55:24'),
('2469c9fc-9295-43ec-8549-ca84e3a7bb91', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebaace-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"ongoing"}', NULL, '2026-05-22 07:05:05'),
('24e3461a-b521-4d8f-bb48-0f60df69c804', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'notified', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', '{"message":"Ankur wants your attention on \"Implement @mention picker in comments\"","targets":["aa0866da-5370-11f1-a90b-bda2f5e69f69"]}', NULL, '2026-05-22 06:56:35'),
('25bce400-c7fa-4e9e-bf97-df6f876f8c9c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', NULL, NULL, '2026-05-20 07:46:15'),
('26e8f719-bd7d-459a-84d4-9d8641bddb73', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51346fd4-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 07:56:56'),
('26e9f639-0421-4945-8770-757a9d6d31a7', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:58'),
('27b1ad68-f14e-4043-a5af-2d63ead0e579', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:58'),
('2811dde5-3dc5-4b50-9ac9-cf59e001b7b7', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"with_user":"aa0866da-5370-11f1-a90b-bda2f5e69f69","permission":"view"}', NULL, '2026-05-20 06:40:38'),
('29272141-7e28-45b2-be9a-7b991bfd1832', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:31:42'),
('298089be-4a01-46db-82de-ebf763e7191a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'notified', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', '{"message":"Ankur wants your attention on \"Implement @mention picker in comments\"","targets":["aa0866da-5370-11f1-a90b-bda2f5e69f69"]}', NULL, '2026-05-22 06:43:40'),
('29c0c29a-c7c9-42a1-92a2-6266aee03e33', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"with_user":"36eda1ec-5370-11f1-a90b-bda2f5e69f69","permission":"view"}', NULL, '2026-05-20 06:40:41'),
('2c15e740-2c1c-4e8d-b36f-0809a54afee5', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51349c02-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 07:48:10'),
('2d702c06-f8ce-4c0f-ad00-0af98887ac2c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"with_user":"36eda1ec-5370-11f1-a90b-bda2f5e69f69","permission":"use"}', NULL, '2026-05-20 05:40:07'),
('2db89c9e-bd59-4925-9249-25c8bac235dc', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '51349108-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 07:48:11'),
('2dbdf8ba-2eb4-42a9-8681-c75b1ce52d0b', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:31:49'),
('304d6a48-a9ae-4381-829a-e0bb1fda79cf', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'revoked', 'api_key', 'd0d7f515-038a-49e7-b3b0-fb55f7397720', '{"name":"OpenAI","reason":"Manual revoke","environment":"staging"}', NULL, '2026-05-19 12:02:35'),
('3087998c-3f66-4f29-bdc4-60c3c346eda6', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '5134946e-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 07:56:54'),
('309c4962-d498-40a4-9426-1a8b48230584', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:32:31'),
('31c907ab-2414-4dc0-b13d-7df06c4ba2d0', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'copied', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', '{"name":"Grok"}', NULL, '2026-05-22 07:09:07'),
('3345ebff-8061-4295-bfef-ef801a9835d9', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', NULL, NULL, '2026-05-20 06:28:54'),
('33cd0cdb-7980-4a1d-8b75-5ade2da066a5', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'added_member', 'group', '3ab62ea0-9662-4117-9215-a52eba1524cb', '{"user_id":"36eda1ec-5370-11f1-a90b-bda2f5e69f69"}', NULL, '2026-05-19 12:01:59'),
('34883182-9c16-4f8a-80dd-0e113ee3202a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'updated', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', '{"name":"Open AI","is_global":false,"auto_rotate":false,"environment":"staging"}', NULL, '2026-05-20 07:57:55'),
('35acede6-6f5f-4ab4-9d2a-59cc929f8f05', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:58'),
('38afccb8-92e4-45be-b91c-d6483f1455a9', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"ongoing"}', NULL, '2026-05-21 12:41:32'),
('39695d94-5b00-4197-ac65-93490b5d94a4', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'added_member', 'group', '72323f0f-5f06-4140-85fd-1c9be5424e69', '{"user_id":"aa0866da-5370-11f1-a90b-bda2f5e69f69"}', NULL, '2026-05-20 05:22:41'),
('3d055469-29cb-4dbb-98ff-a5ef73f0e375', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', '{"with_user":"aa0865a4-5370-11f1-a90b-bda2f5e69f69","permission":"manage"}', NULL, '2026-05-20 07:01:53'),
('3e4d8280-cd62-4f40-8cf4-bc98ab47d697', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"inbox","from":"ongoing"}', NULL, '2026-05-21 12:41:10'),
('3fdd94d0-d7bf-45b4-bc58-fab5300dcc51', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:57'),
('400246c7-ae41-491a-9036-f5aef0d44aad', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 07:54:06'),
('42e582c8-86f9-4baf-a9f7-57d0a44f5b2b', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51346c46-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-22 07:24:14'),
('440582ff-5499-4e5a-a58a-3e25057041dd', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'revoked', 'api_key', '422d41b9-07d2-4136-bcae-258d61cdb08d', '{"name":"Grok","reason":"Manual revoke","environment":"staging"}', NULL, '2026-05-19 12:02:29'),
('457e3de0-8f00-4e9c-b37e-35a7be21c434', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', NULL, NULL, '2026-05-20 07:50:37'),
('4699b317-6ed4-4a0a-a9d2-bcceac1356e8', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebacd6-5447-11f1-b5d8-585aba99cd39', '{"to":"completed","from":"ongoing"}', NULL, '2026-05-21 12:12:21'),
('49c2aab2-5f00-4b55-a5ab-acd80accb3ac', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', '{"with_user":"aa0866da-5370-11f1-a90b-bda2f5e69f69","permission":"manage"}', NULL, '2026-05-20 07:26:31'),
('4a8dc4c3-770f-4d46-baa7-161636d4884a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'notified', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', '{"message":"Ankur wants your attention on \"Implement @mention picker in comments\"","targets":["aa0866da-5370-11f1-a90b-bda2f5e69f69"]}', NULL, '2026-05-22 06:54:30'),
('4b6804c6-a9ef-4bce-98b0-d9864c94d4c6', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'group', '3ab62ea0-9662-4117-9215-a52eba1524cb', '{"name":"Marketing"}', NULL, '2026-05-19 12:01:55'),
('4f345b21-c3dc-4c0c-a9a6-54db2b003086', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"completed","from":"in_review"}', NULL, '2026-05-22 07:20:18'),
('4f74f497-1256-4598-90d0-bb8bbc7b1acd', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"ongoing"}', NULL, '2026-05-21 12:47:23'),
('531b8015-732f-409f-a623-ffe473fb3eb9', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', '{"name":"Open AI","environment":"staging"}', NULL, '2026-05-20 07:27:01'),
('54b23f3d-596b-4e6b-b965-8091debc14e1', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"completed"}', NULL, '2026-05-22 07:05:01'),
('55709d95-108d-4dab-b5e5-416d65783094', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'notified', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', '{"message":"Ankur wants your attention on \"Implement @mention picker in comments\"","targets":["aa0866da-5370-11f1-a90b-bda2f5e69f69"]}', NULL, '2026-05-22 06:56:40'),
('56912e38-0ccd-404a-aeb5-1dbe956e1891', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"completed","from":"in_review"}', NULL, '2026-05-22 05:52:48'),
('57811f92-8ce7-4358-8c02-385bdf18fb4a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"in_review"}', NULL, '2026-05-21 12:41:07'),
('5b5bc11a-725e-429c-9b69-24593688eec7', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'notified', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', '{"message":"Ankur wants your attention on \"Implement @mention picker in comments\"","targets":["aa0866da-5370-11f1-a90b-bda2f5e69f69"]}', NULL, '2026-05-22 06:53:22'),
('5d844f60-49a8-4a9b-8e54-4fcd57e5e105', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"inbox"}', NULL, '2026-05-21 08:07:34'),
('5debc77a-fc78-4ea8-a765-84d1fd49a40c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'commented', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', '{"comment_id":"ba8fbc5c-4a0f-4bbc-8484-3a0bbb527efc"}', NULL, '2026-05-21 05:51:36'),
('5e68fb89-5693-479d-a59e-49156bcf28b1', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'org', '7aba0da1-45ee-41bf-8612-58335b60e497', '{"name":"Yourgpt"}', NULL, '2026-05-19 09:23:53'),
('5f8da4cc-01a6-4a9e-85c6-6e219a2a0a7f', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'added_member', 'group', '72323f0f-5f06-4140-85fd-1c9be5424e69', '{"user_id":"aa083e26-5370-11f1-a90b-bda2f5e69f69"}', NULL, '2026-05-20 05:34:28'),
('61d3f58d-eedd-4fea-b918-11b91a58db87', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '5134860e-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:30'),
('633e70b7-c4dd-4125-abdb-779acb1db5e0', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51348d5c-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:16:06'),
('63436248-f8ac-4afa-97a2-f36dece9a5c7', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"permission":"use","with_group":"b81a3b54-5370-11f1-a90b-bda2f5e69f69"}', NULL, '2026-05-19 12:06:28'),
('6384b731-f27e-4db2-bcec-96baa4b9162a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', NULL, NULL, '2026-05-20 07:30:39'),
('63e2ad19-1123-4faa-b56c-75b9bdc658d8', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:36:06'),
('641fc937-bb10-411b-9411-486251c3d56c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'api_key', '422d41b9-07d2-4136-bcae-258d61cdb08d', '{"name":"Grok","environment":"staging"}', NULL, '2026-05-19 09:45:57'),
('64e02460-1482-4853-8ec2-508a0cd849bb', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:59'),
('65e65cbc-ba17-4ac1-b925-6b9d57d01b98', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'commented', 'issue', '2868099f-7966-416c-8dea-0353bfc053a1', '{"comment_id":"4a5f24a9-9489-4e5e-8f23-b4e8c1cb03a7"}', NULL, '2026-05-20 11:59:05'),
('661aae0b-f84a-4e75-b6f3-fd03efb54a5a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"ongoing"}', NULL, '2026-05-21 12:41:06'),
('672699a1-af2b-4d17-8a3a-80df114b2e8e', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"in_review"}', NULL, '2026-05-22 05:52:49'),
('67b273a5-5188-4410-a3d7-c606756ddccb', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 07:50:37'),
('686a854c-d7c5-4dbb-954f-8326d344bd92', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'issue', '2868099f-7966-416c-8dea-0353bfc053a1', '{"type":"bug","title":"Issues now use a simple auto-increment number instead of UUID hashes. Existing issues got numbers 1, 2, 3... and new issues will continue from there. The UI now shows #1, #2, #3 etc everywhere — sheet rows, board cards, list view, detail page breadcrumb."}', NULL, '2026-05-20 11:34:04'),
('6eece555-2791-44d9-a244-63314a76841d', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'notified', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', '{"message":"Ankur wants your attention on \"Implement @mention picker in comments\"","targets":["aa0866da-5370-11f1-a90b-bda2f5e69f69"]}', NULL, '2026-05-22 06:55:34'),
('710058a3-3585-424b-bf15-95e33722472d', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', 'a5d42af7-d473-4d2a-8492-62018798de22', NULL, NULL, '2026-05-20 10:47:11'),
('73595190-0c0f-45e9-ba82-b931d90363c3', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', NULL, NULL, '2026-05-20 07:49:28'),
('73b769f2-d3ff-4eaf-be9f-55a92c02bcd3', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'added_member', 'group', '72323f0f-5f06-4140-85fd-1c9be5424e69', '{"user_id":"aa0867e8-5370-11f1-a90b-bda2f5e69f69"}', NULL, '2026-05-20 05:34:31'),
('73e9b763-9502-4b1d-bb7d-18c4d3077d08', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'added_member', 'group', 'd21e9066-c4f3-4c0e-a532-d6337ad41476', '{"user_id":"d81ea825-692b-4a62-82e5-de0eca6a0638"}', NULL, '2026-05-20 06:20:03'),
('74e2b3a6-9d35-44d3-bbae-1a810b315534', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:59'),
('761e6456-cd4e-4ab8-8b8b-22ed87fdc6da', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'notified', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', '{"message":"Ankur wants your attention on \"Implement @mention picker in comments\"","targets":["aa0866da-5370-11f1-a90b-bda2f5e69f69"]}', NULL, '2026-05-22 06:53:51'),
('76b3c965-0bf8-4e06-855e-e5bbbc22a5f7', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"ongoing"}', NULL, '2026-05-22 07:10:56'),
('7888c292-5d00-4430-875c-87b6a47abfaa', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '5134946e-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:31'),
('793b18d9-d02e-4426-99ec-dd1013278288', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'notified', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', '{"message":"Ankur wants your attention on \"Add dark mode toggle to settings\"","targets":["36eda1ec-5370-11f1-a90b-bda2f5e69f69","aa083e26-5370-11f1-a90b-bda2f5e69f69"]}', NULL, '2026-05-22 06:24:57'),
('7a996c22-c224-4cf8-8d1f-4bdf5c077071', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 08:26:01'),
('7c129dee-3da6-471c-bfdb-b1580311e1f5', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 07:48:30'),
('7d5fcb49-b094-404d-9c16-68b0d2fbd163', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', '{"with_user":"aa0865a4-5370-11f1-a90b-bda2f5e69f69","permission":"view"}', NULL, '2026-05-20 07:26:26'),
('7e3618a9-3745-410a-a772-f454c905435e', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', '{"with_user":"36eda1ec-5370-11f1-a90b-bda2f5e69f69","permission":"manage"}', NULL, '2026-05-21 10:12:22'),
('7e599c31-fd55-4bef-9c93-0cd8f1e9f2b5', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'issue', '13e4c7b7-1aa3-460e-99ce-bb25440a6001', '{"type":"bug","title":"Test"}', NULL, '2026-05-20 08:25:37'),
('7e83670c-dd55-4e1a-98db-6dafd4d8ca55', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:32:03'),
('7efaa48a-e509-4558-bb50-afaa19148302', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"completed","from":"in_review"}', NULL, '2026-05-22 07:05:04'),
('7f7853b1-c89f-4021-b4de-fde5c420f5a1', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51f32d2a-54f8-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:38'),
('7fb40ac7-9361-47fa-9305-3e72c883466e', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:58'),
('80fdc404-e37f-4bc4-8596-9aca023829d0', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'revoked', 'api_key', '9f715c55-c41f-45c9-ba7e-4571e6d39bcf', '{"name":"Anthropic Key","reason":"Manual revoke","environment":"dev"}', NULL, '2026-05-19 11:55:53'),
('82013586-1f73-4950-9cfc-018442a503a8', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"ongoing"}', NULL, '2026-05-21 08:07:37'),
('824258c7-0f7b-4e64-85eb-c2447200cea3', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:36:05'),
('84d27ded-3c6e-40c4-b570-ef7c56e1c310', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:58'),
('854563b9-1cdf-44f1-bb32-233b605d618b', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '5133f98c-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 07:56:34'),
('887717cf-0ffa-4d70-8520-ef8d6ae3fe76', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '13e4c7b7-1aa3-460e-99ce-bb25440a6001', NULL, NULL, '2026-05-20 10:19:59'),
('8a45b0c1-f149-4d96-b42a-8f1ae91f9ed4', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:31:17'),
('8b0c54aa-f3d9-4bb0-b1df-810a96915dd3', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', 'e2814999-e5f4-4bfd-8b74-95e0c53c908b', NULL, NULL, '2026-05-20 12:09:06'),
('8c16281d-6354-44e4-b739-16ec9d97b596', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"inbox","from":"ongoing"}', NULL, '2026-05-21 12:40:52'),
('8c23d4a6-28ba-486a-878c-62846a6929d5', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'notified', 'issue', '51346c46-54e9-11f1-a1d1-1f2352330b9b', '{"message":"Ankur wants your attention on \"CSV export missing last column header\"","targets":["aa0865a4-5370-11f1-a90b-bda2f5e69f69"]}', NULL, '2026-05-21 12:11:33'),
('8d4c9bb2-be88-47c9-9bea-22a44a16e82e', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:36:11'),
('8e34451b-9a1f-4336-9e12-94597307d866', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', NULL, NULL, '2026-05-20 07:33:36'),
('9159be4f-97ad-474a-8238-3efcce48cb39', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'issue', '3f837719-508c-4f4f-8e8e-50138385c735', '{"type":"bug","title":"Total comment count shown in the header: \"Activity · 12 comments\""}', NULL, '2026-05-20 12:10:08'),
('925552a4-c725-4d96-999e-86e9705dfb08', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"name":"Grok","environment":"staging"}', NULL, '2026-05-19 12:06:28'),
('92b63de3-a257-495a-b6ad-2feac8596ced', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51349f90-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 07:48:12'),
('96927a78-ed0f-4489-a3d1-9b4e446b767d', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:36:15'),
('973869b5-f62a-42b3-b617-39623c312792', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:59'),
('97692802-db2d-412f-bfae-c3da9fd81d9c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'issue', 'a5d42af7-d473-4d2a-8492-62018798de22', '{"type":"bug","title":"The date is being rendered at line 513. It''s there but formatDue returns empty string when due_date is null. The card looks correct"}', NULL, '2026-05-20 09:45:17'),
('97aa1f4b-86c6-4867-b4b3-8578d245fd48', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '51349c02-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 07:56:50'),
('9aac0faa-135c-4729-b203-8bde92683fad', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 08:25:59'),
('9b4454fe-eb1e-4af6-9cd4-baede2296981', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:34:10'),
('9b9211f1-b04a-4616-a94c-853b7ea3a9fe', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'notified', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', '{"message":"Ankur wants your attention on \"Add dark mode toggle to settings\"","targets":["36eda1ec-5370-11f1-a90b-bda2f5e69f69","aa083e26-5370-11f1-a90b-bda2f5e69f69"]}', NULL, '2026-05-22 06:36:55'),
('9d5ef1df-aaf8-4a23-9040-344fa6546b3e', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', NULL, NULL, '2026-05-20 06:28:54'),
('a130d2b7-122b-4170-bef2-2aa52195a6cb', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"inbox","from":"ongoing"}', NULL, '2026-05-21 08:07:34'),
('a18e32a3-ba7c-4fad-a39b-53ddffab5da2', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'group', 'd21e9066-c4f3-4c0e-a532-d6337ad41476', '{"name":"TEst"}', NULL, '2026-05-20 06:20:03'),
('a2804142-671a-4486-b85e-ba7f560b5641', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', NULL, NULL, '2026-05-20 07:54:01'),
('a2a4522a-8e2e-498d-8260-510eba26260d', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'api_key', '085358b3-ebd1-448d-af4c-ac77862fb17f', '{"name":"Github personal token","environment":"dev"}', NULL, '2026-05-22 07:39:44'),
('a47d582f-79a4-4487-825f-e5b2da0909e0', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'commented', 'issue', '5133f98c-54e9-11f1-a1d1-1f2352330b9b', '{"comment_id":"eb8833ec-01d7-44c0-99ae-e1c3af12b4d4"}', NULL, '2026-05-21 07:58:19'),
('a69f2837-270c-465a-91a2-37021256712a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:32:32'),
('a7948cf8-7dbe-48f9-8158-8deb74304b5a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"ongoing"}', NULL, '2026-05-22 07:05:00'),
('a97da3a8-bb30-4c44-a28c-3bd09e4781e8', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'removed_member', 'group', '72323f0f-5f06-4140-85fd-1c9be5424e69', '{"user_id":"aa0866da-5370-11f1-a90b-bda2f5e69f69"}', NULL, '2026-05-20 05:23:06'),
('a9c3119c-f69b-4911-8963-51e857ad9d12', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:36:03'),
('a9c566d7-2d73-44cf-b325-9d2e824c143f', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'copied', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', '{"name":"Open AI"}', NULL, '2026-05-22 04:38:07'),
('a9d74c25-a791-49e3-9ac4-47bd100834ba', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'commented', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', '{"comment_id":"fe258874-fb04-4369-9847-b820074228d6"}', NULL, '2026-05-22 06:28:23'),
('ab75f754-4026-4301-a687-562f94ef13b9', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:28'),
('ac1e9be4-f783-420e-891a-3e99feb7eaf1', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'commented', 'issue', '5133f98c-54e9-11f1-a1d1-1f2352330b9b', '{"comment_id":"0ad5e0ba-213b-4ee7-98b1-dff91f08b368"}', NULL, '2026-05-21 07:58:31'),
('ac9e3daa-2130-46b6-a99b-1ef25770e65d', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:59'),
('ae895cc9-3377-4d9b-a4f7-498481683e09', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"with_user":"36eda1ec-5370-11f1-a90b-bda2f5e69f69","permission":"use"}', NULL, '2026-05-20 05:40:14'),
('b17cd47b-6a88-4dcc-897e-0569aad1b6a5', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:36:07'),
('b38d6a52-7b66-4f51-8877-95757a4ece50', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 07:33:37'),
('b48d0463-bc34-4cd9-a98a-67df70e31bcc', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:31:46'),
('b7e0002e-a8f2-4a31-b863-d827a80dec66', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', '{"name":"Grok","environment":"dev"}', NULL, '2026-05-19 12:31:45'),
('b7ed0c01-510f-4d32-a216-13a935527c7d', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"ongoing"}', NULL, '2026-05-21 12:41:35'),
('b84fa94c-ec19-468f-8e60-a7ffcc6278cc', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"with_user":"aa0866da-5370-11f1-a90b-bda2f5e69f69","permission":"manage"}', NULL, '2026-05-20 06:40:40'),
('b89aaca5-7335-4287-bf50-6cd7e3e955ce', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '51348d5c-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:19'),
('ba1570df-5b39-417b-aff6-91c1fdaf989d', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'commented', 'issue', '51349c02-54e9-11f1-a1d1-1f2352330b9b', '{"comment_id":"81001445-9b24-4b0d-b96c-11ec4c0460ea"}', NULL, '2026-05-21 07:56:13'),
('bb6e1cad-721d-48ac-943f-5b48a97d2569', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '51349c02-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-22 07:14:14'),
('bc88d4d8-1879-479d-9cd1-f90f81626536', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"inbox"}', NULL, '2026-05-21 12:41:11'),
('bdc7b0ef-24bb-4417-ac1b-de862f1b61b8', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:58'),
('be2314b4-cf42-49fc-bf30-3b24066546e7', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:58'),
('c03c1a0d-a0e4-4467-8baf-5091db7c7776', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebaace-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"completed"}', NULL, '2026-05-22 04:38:27'),
('c0d690ca-5ef5-423d-b800-b2c18a614181', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'updated', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"name":"Grok","is_global":false,"auto_rotate":false,"environment":"staging"}', NULL, '2026-05-19 13:34:15'),
('c0d91d30-bc32-4994-b8e1-eb98c6d8b773', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51349838-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 08:29:24'),
('c2442451-6760-491f-b869-a2aac22cc18c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"with_user":"aa0866da-5370-11f1-a90b-bda2f5e69f69","permission":"manage"}', NULL, '2026-05-20 06:40:35'),
('c2d8e3db-b41c-4788-814f-3cef65ae0ec9', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'added_member', 'group', 'b81a3d52-5370-11f1-a90b-bda2f5e69f69', '{"user_id":"aa0866da-5370-11f1-a90b-bda2f5e69f69"}', NULL, '2026-05-19 12:02:09'),
('c3ab22a7-1d1d-42e0-8241-c22f19dfb3dc', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:31:41'),
('c44c8a71-c5e9-4d5f-b2c5-4b9976733d4d', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"with_user":"aa0866da-5370-11f1-a90b-bda2f5e69f69","permission":"view"}', NULL, '2026-05-20 06:40:45'),
('c52ccbbd-3e01-4da4-adc4-3e2f884423f2', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"completed"}', NULL, '2026-05-22 07:20:20'),
('c5adaf02-990f-4b02-beb5-c8a771ae8a50', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"in_review"}', NULL, '2026-05-21 08:07:36'),
('c6372549-fe92-4cfc-a10a-9962ecc29a4e', '362c0b8a-0eb8-4578-8100-6753e85cea77', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'org', '362c0b8a-0eb8-4578-8100-6753e85cea77', '{"name":"MCP360"}', NULL, '2026-05-19 09:26:17'),
('c870f4bb-e773-47cd-bda4-89916f47ec92', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'copied', 'api_key', '085358b3-ebd1-448d-af4c-ac77862fb17f', '{"name":"Github personal token"}', NULL, '2026-05-22 07:39:55'),
('c88c9166-f69d-40fe-b4b5-9944a8d57693', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"with_user":"aa0866da-5370-11f1-a90b-bda2f5e69f69","permission":"view"}', NULL, '2026-05-20 06:40:36'),
('cc8d2e34-6dc9-4602-91ec-dbf9b41f84a8', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '5134a29c-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 07:48:15'),
('cec5e70e-e70b-46bc-8bae-a58d7b9f41ed', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'updated', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"name":"Grok","is_global":false,"auto_rotate":false,"environment":"staging"}', NULL, '2026-05-20 05:40:15'),
('cf80cc9a-06e7-4b9f-8592-a77e263410c2', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'issue', 'e2814999-e5f4-4bfd-8b74-95e0c53c908b', '{"type":"bug","title":"Total comment count shown in the header: \"Activity · 12 comments\""}', NULL, '2026-05-20 12:08:40'),
('d20c2e85-9ed8-486e-a12e-7c2c5c2712dc', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 08:26:02'),
('d21a4124-7700-47c5-bbb3-17b8bc0bbaf9', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', '{"type":"bug","title":"Total comment count shown in the header: \"Activity · 12 comments\""}', NULL, '2026-05-20 12:12:11'),
('d3048e93-2f3c-4471-aa47-5ff3162219eb', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"inbox"}', NULL, '2026-05-21 12:40:52'),
('d419887b-3c0c-4aa6-9d20-02e9d762cb77', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"ongoing"}', NULL, '2026-05-21 12:41:12'),
('d515c6ae-06f4-477f-84b4-8ac59498be43', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', '{"permission":"use","with_group":"b81a19b2-5370-11f1-a90b-bda2f5e69f69"}', NULL, '2026-05-19 12:31:45'),
('d56da1da-74d6-4039-9658-f55cf5220fc2', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '51346c46-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:13'),
('d67c5fec-d92f-447e-9053-c71893b081de', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"ongoing"}', NULL, '2026-05-22 04:38:24'),
('d696b398-afa2-4515-b9e2-92b2d98a5c03', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'api_key', '9f715c55-c41f-45c9-ba7e-4571e6d39bcf', '{"name":"Anthropic Key","environment":"dev"}', NULL, '2026-05-19 11:43:17'),
('d77330bf-1e48-4c0a-a9db-d6f7ed4275b7', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:36:16'),
('d7a70bee-fe00-416a-9ec7-8c2f96104373', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', NULL, NULL, '2026-05-20 07:48:21'),
('d8082b77-7577-4973-a3f6-14cc705cd2e7', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'commented', 'issue', '2868099f-7966-416c-8dea-0353bfc053a1', '{"comment_id":"5c299a8f-20b6-4029-8af0-769801ebe600"}', NULL, '2026-05-20 11:46:58'),
('d8acaf5a-c6fc-4369-9f8a-07ca7d5ce037', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:31:35'),
('d8ae34c3-9c05-4e8b-856a-a193911e0508', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'task', 'e060ee04-74d5-4991-8f75-bc8b03041f7a', '{"scope":"personal","title":"test"}', NULL, '2026-05-22 05:09:24'),
('d8f05dfa-3a67-46b3-bb12-722b6c79cb4c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:32:31'),
('db25d49f-9355-4cfa-830b-8bd17170b504', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:36:14'),
('dc53eabb-2171-4532-a669-d246b155e726', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '51346c46-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-22 07:24:15'),
('dcbeae87-7046-4e0c-aedf-46db81a0d130', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-20 12:12:33'),
('df793889-d088-4d8b-96b6-af7f18b4d957', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'issue', '52df8019-1d78-4481-bb4c-3ead3c176833', '{"type":"feature","title":"Permission matrix exports wrong CSV header"}', NULL, '2026-05-20 09:41:25'),
('e13aaf84-cede-4cca-a68c-cd1c6c92f3a4', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:15'),
('e1c73777-1587-49f6-ae2a-1bb3775a2d1d', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"with_user":"aa0866da-5370-11f1-a90b-bda2f5e69f69","permission":"manage"}', NULL, '2026-05-20 06:40:37'),
('e255e40b-f84f-42c1-8494-0633db57be29', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', NULL, NULL, '2026-05-20 07:33:32'),
('e424c39d-9eff-43f5-9b81-75f692eef3f2', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"with_user":"aa0866da-5370-11f1-a90b-bda2f5e69f69","permission":"use"}', NULL, '2026-05-19 13:34:14'),
('e44fe7ea-96f0-4a81-9dd5-1674e7daa516', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', NULL, NULL, '2026-05-20 07:34:29'),
('e46e366b-b874-4bf0-9734-c6f3601645bf', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'added_member', 'group', 'b81a3c94-5370-11f1-a90b-bda2f5e69f69', '{"user_id":"d81ea825-692b-4a62-82e5-de0eca6a0638"}', NULL, '2026-05-22 06:57:01'),
('e723122e-9345-44c1-b63e-3810fc83322e', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"in_review"}', NULL, '2026-05-22 07:05:07'),
('e72a2584-8cd0-4184-b9cc-84191ff3e7bc', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '51349f90-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:16'),
('e84ad38b-2191-4f7b-a8e5-0233168ccef8', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'updated', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', '{"name":"Grok","is_global":false,"auto_rotate":false,"environment":"dev"}', NULL, '2026-05-20 06:44:04'),
('e9c71e2b-82ca-4d6b-b45f-4c1506ccc07f', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"in_review","from":"inbox"}', NULL, '2026-05-22 04:38:26'),
('ea3a0d6e-2dfa-4990-8496-2f378e126b56', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:14'),
('eb515bfc-c91c-4369-b825-89e7eb0a1d66', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '2868099f-7966-416c-8dea-0353bfc053a1', NULL, NULL, '2026-05-20 11:44:55'),
('ed62c980-e7b6-40cb-b87a-4d99437ba7f1', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'added_member', 'group', '72323f0f-5f06-4140-85fd-1c9be5424e69', '{"user_id":"d81ea825-692b-4a62-82e5-de0eca6a0638"}', NULL, '2026-05-20 05:17:41'),
('ef0a34b7-785f-46d1-98a0-b86de9c4b57c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"completed","from":"in_review"}', NULL, '2026-05-22 07:20:21'),
('f01d5867-7e13-4626-9ea2-f111704a9ff9', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'created', 'task', '467a07a9-60f8-47a9-a3f7-0a863295b0b0', '{"scope":"team","title":"Test"}', NULL, '2026-05-20 12:28:06'),
('f097fdb9-172c-487a-af1e-e242c584fe70', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:36:04'),
('f4227931-fb97-4504-aead-eac589d7db1b', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '51346fd4-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 07:56:42'),
('f45eec60-39b6-4e88-826e-195648c985a3', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'resolved', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', NULL, NULL, '2026-05-21 07:31:18'),
('f6026dbf-a341-4c5f-bf8c-5a615291fb3c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'viewed_value', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', NULL, NULL, '2026-05-20 08:02:59'),
('f6605aa9-ff35-4512-9805-1082b1e58c74', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', '{"to":"inbox","from":"in_review"}', NULL, '2026-05-22 04:38:25'),
('f93e1f25-7e3b-4987-8b08-6856d1995185', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', '{"to":"ongoing","from":"inbox"}', NULL, '2026-05-21 12:41:05'),
('f9c93fa9-72cd-4e55-835a-f2dcbee52b5d', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'revoked', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', '{"name":"Grok","reason":"Manual revoke","environment":"staging"}', NULL, '2026-05-20 07:26:48'),
('fc617ee3-e013-484c-a6ca-492304e3cda6', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '13e4c7b7-1aa3-460e-99ce-bb25440a6001', NULL, NULL, '2026-05-20 09:36:14'),
('fe25460c-a1ea-49b1-bfe6-6f1cd6f7fa17', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'status_changed', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', NULL, NULL, '2026-05-21 09:47:27'),
('feb022ef-711a-4a56-aff0-cff72d4929fe', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'shared', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', '{"with_user":"36eda1ec-5370-11f1-a90b-bda2f5e69f69","permission":"manage"}', NULL, '2026-05-20 06:44:03');

-- notifications (98 rows)
INSERT INTO notifications (id, org_id, recipient_id, sender_id, type, title, body, entity_type, entity_id, is_read, read_at, discord_sent, discord_sent_at, discord_msg_id, created_at) VALUES
('005b3d5c-b947-4459-be95-677664a30eed', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 06:40:45'),
('05b4d364-37c4-4e21-b114-ed06e928b1ef', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to ongoing.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 08:07:36'),
('074b6b6a-af6f-4515-a2e6-ec951187d8fc', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 05:40:14'),
('07cce349-c0fb-469a-becf-2737fda7b8fd', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'group_added', 'Added to Marketing', 'You were added to the Marketing group.', 'group', '3ab62ea0-9662-4117-9215-a52eba1524cb', FALSE, NULL, FALSE, NULL, NULL, '2026-05-19 12:01:59'),
('083b1804-aa87-4a44-80e0-360f0651281c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to in_review.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 07:20:20'),
('0d2f1731-ff2a-4a69-8cc3-a85dd0a9311a', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 05:40:07'),
('0eaaec4f-0416-4bec-9ff3-a859c2714e28', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to ongoing.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:41:07'),
('0f920f2c-b692-46f5-98d4-bee9b08dab94', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to inbox.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 08:07:34'),
('112fa01b-2b98-45ad-bc12-a4361b0038b4', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to ongoing.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:40:52'),
('13b9bbe9-5ed1-4ae4-932f-43dcaae5ee67', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #11: Implement @mention picker in comments', 'Ankur wants your attention on "Implement @mention picker in comments"', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:56:05'),
('1693e436-ae97-47de-a07e-8b45e1e2915f', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #10: CSV export missing last column header', 'Ankur wants your attention on "CSV export missing last column header"', 'issue', '51346c46-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:11:33'),
('19b000fb-8f6f-4f8e-9689-906f10e0a9e3', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to ongoing.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 07:20:22'),
('1d0d0bb2-2839-41fc-aad9-d1eb957e5d01', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_resolved', 'Issue resolved: Sticky note color contrast fails AA in dark mode', '"Sticky note color contrast fails AA in dark mode" was closed.', 'issue', '51349838-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 08:29:24'),
('1d4cf672-b6b3-4f0c-b324-72c75cd53db4', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_commented', 'Comment on: Add dark mode toggle to settings', 'Ankur commented on "Add dark mode toggle to settings".', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:28:23'),
('1d809abd-81aa-42cf-b177-de6477924c24', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #9: Add dark mode toggle to settings', 'Ankur wants your attention on "Add dark mode toggle to settings"', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:24:57'),
('224f6b96-7a46-4504-8787-73f7bec2435c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to in_review.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 04:38:24'),
('248bd4a5-bfe5-49f4-b1ae-aa76914c8c4f', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'group_added', 'Added to Backend Team', 'You were added to the Backend Team group.', 'group', '72323f0f-5f06-4140-85fd-1c9be5424e69', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 05:34:28'),
('2813fddd-ed3a-41af-9520-2e194a10a3c2', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to ongoing.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:12:22'),
('2e2e1f1b-6af5-4c58-b594-fe66ab48433a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 07:26:31'),
('30bcb900-9572-4ebf-9a63-8940d8920d82', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_commented', 'Comment on: Login session expires during file upload', 'Ankur commented on "Login session expires during file upload".', 'issue', '5133f98c-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 07:58:31'),
('31a960ed-0e8e-45dd-bbc8-38bc7dae7912', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 06:40:35'),
('3970e414-8ebd-4563-b3a5-5e4dca074c8f', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_assigned', 'Issue assigned: Add dark mode toggle to settings', 'You were assigned "Add dark mode toggle to settings".', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 08:28:02'),
('39a1a723-74b3-4e30-8cdc-f522f8b79ea8', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_resolved', 'Issue resolved: Implement @mention picker in comments', '"Implement @mention picker in comments" was resolved.', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 09:47:14'),
('3dcc2a42-7d4e-440c-8316-0f4405e95539', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to inbox.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:41:10'),
('41b70c25-f562-454d-9364-d752d71af042', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa086770-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_resolved', 'Issue resolved: Search results dont clear after backspace', '"Search results dont clear after backspace" was resolved.', 'issue', '51349f90-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 09:47:16'),
('4417d828-302d-404e-b1a0-bbf2a103c3ad', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to in_review.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 04:38:26'),
('45d6cda5-a06a-44f9-9b12-97cc518df0ac', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 06:40:36'),
('469212ae-5d60-405b-b995-3a64606bf1b3', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to inbox.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 04:38:25'),
('469cb924-b7da-494d-9099-f043a655b226', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to in_review.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:41:12'),
('46acb98f-c6ea-4f07-8f75-939917e0c2f5', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'group_added', 'Added to Backend Team', 'You were added to the Backend Team group.', 'group', '72323f0f-5f06-4140-85fd-1c9be5424e69', TRUE, '2026-05-21 10:07:15', FALSE, NULL, NULL, '2026-05-20 05:17:41'),
('4d7d461f-d608-4a7f-87a7-e429b21e8a3a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to completed.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 07:20:18'),
('4e50162d-ac03-4fd4-a1e6-104503b8a254', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 06:40:40'),
('4eac1915-e3ae-457e-93b2-68e130893fa5', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_resolved', 'Issue resolved: Add dark mode toggle to settings', '"Add dark mode toggle to settings" was resolved.', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 08:25:59'),
('5557d12a-c6fe-4f8e-a7a2-9750e8d6b9ff', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_assigned', 'Issue assigned: Permission matrix exports wrong CSV header', 'You were assigned "Permission matrix exports wrong CSV header".', 'issue', '52df8019-1d78-4481-bb4c-3ead3c176833', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 09:41:44'),
('56db96ca-37ef-48c4-9177-d066a922c4b2', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #11: Implement @mention picker in comments', 'Ankur wants your attention on "Implement @mention picker in comments"', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:54:30'),
('5b31880a-9891-4956-8464-9de5ede26790', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to in_review.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 08:07:37'),
('5c75490e-c7d1-4193-80dc-18911243bf8a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #11: Implement @mention picker in comments', 'Ankur wants your attention on "Implement @mention picker in comments"', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:43:40'),
('5d276cc9-8a74-4af4-911e-2d533b7ea9f8', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_commented', 'Comment on: Total comment count shown in the header: "Activity · 12 comments"', 'Ankur commented on "Total comment count shown in the header: "Activity · 12 comments"".', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 05:51:36'),
('5d43ca8a-5f32-4013-9389-0fde2eadb9f3', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'group_added', 'Added to Design', 'You were added to the Design group.', 'group', 'b81a3c94-5370-11f1-a90b-bda2f5e69f69', TRUE, '2026-05-22 07:44:43', TRUE, '2026-05-22 06:57:02', '1507276082607292558', '2026-05-22 06:57:01'),
('6044dc29-87d9-40f4-9445-dcff7d853ea2', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to ongoing.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:41:11'),
('60b5c12a-083d-4bc7-abb1-0b73f039063b', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_resolved', 'Issue resolved: Audit log retention setting in workspace UI', '"Audit log retention setting in workspace UI" was resolved.', 'issue', '51348d5c-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 09:47:19'),
('62c914bc-1b6e-4610-9e94-5457f3968ea9', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 07:26:27'),
('63171e20-f76b-42ef-b095-c176b6b09a06', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_commented', 'Comment on: Empty state copy for new workspaces', 'Ankur commented on "Empty state copy for new workspaces".', 'issue', '51349c02-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 07:56:13'),
('64a3e0d3-66b5-428f-9e88-6e770a66b216', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #9: Add dark mode toggle to settings', 'Ankur wants your attention on "Add dark mode toggle to settings"', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:36:55'),
('653b8db5-b2ac-4f37-9169-ef9140713c9e', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Deploy checklist', '"Deploy checklist" moved to ongoing.', 'task', '7aebacd6-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 07:05:03'),
('6758cf99-b309-40b1-a96d-ce6284e26e30', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to in_review.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 07:05:00'),
('69d89559-0b70-47fe-b84d-cb4ad0a3d890', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 07:26:26'),
('6adc9364-69a1-4af5-b83d-2899bf9e6acb', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 06:40:41'),
('6db58298-cd94-4f80-a87e-bfda1c38ffbc', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #11: Implement @mention picker in comments', 'Ankur wants your attention on "Implement @mention picker in comments"', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:55:34'),
('74d916cd-d9c3-44a0-ab73-f3b563a62387', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_resolved', 'Issue resolved: SSO group sync — Okta scope handling', '"SSO group sync — Okta scope handling" was resolved.', 'issue', '51349108-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 07:48:11'),
('764fd51d-6fd5-4b10-b697-fc1774ad3ccb', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to ongoing.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 05:52:49'),
('78895398-d1f6-40a5-a927-34b97190b1f0', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to completed.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 07:20:21'),
('7a09ebf1-01e7-492e-a207-de34a74a6269', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_assigned', 'Issue assigned: Total comment count shown in the header: "Activity · 12 comments"', 'You were assigned "Total comment count shown in the header: "Activity · 12 comments"".', 'issue', '94342c9c-76b4-4058-b8b7-2c68eeac9780', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 12:12:11'),
('7e898432-5ac4-460a-b288-2653ba3f926f', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_commented', 'Comment on: Login session expires during file upload', 'Ankur commented on "Login session expires during file upload".', 'issue', '5133f98c-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 07:58:19'),
('86dc845e-aaa8-4e50-a27a-553c6fc63574', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_revoked', 'Access revoked: Grok', 'Your access to Grok was revoked.', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 05:40:11'),
('87258bd7-cc2c-418e-9c12-c704a4c18f84', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to in_review.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:41:32'),
('87e61dea-b51f-4f4f-ba37-33b1c7ea5725', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: API rate limiting', '"API rate limiting" moved to ongoing.', 'task', '7aebaace-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 04:38:27'),
('8a63036c-1940-4a5b-9374-0724d1166159', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #9: Add dark mode toggle to settings', 'Ankur wants your attention on "Add dark mode toggle to settings"', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:36:55'),
('8af3adcd-48ea-497d-842b-a3c8d9feb5d9', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to ongoing.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 07:05:07'),
('8b90a0bc-9589-4766-94e5-6ae79509cfe0', '7aba0da1-45ee-41bf-8612-58335b60e497', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'group_added', 'Added to TEst', 'You were added to the TEst group.', 'group', 'd21e9066-c4f3-4c0e-a532-d6337ad41476', TRUE, '2026-05-21 10:07:15', FALSE, NULL, NULL, '2026-05-20 06:20:03'),
('8bf46ae6-50d2-4019-8930-04d10899748c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_resolved', 'Issue resolved: SSO group sync — Okta scope handling', '"SSO group sync — Okta scope handling" was closed.', 'issue', '51349108-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 08:27:41'),
('92137806-2e5f-4c2b-b7a8-818f373a2e75', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to in_review.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:47:23'),
('9690149d-6fdf-45a9-8124-a1b5c9502a8e', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to in_review.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 07:10:56'),
('990263c1-f0f9-4c3c-89fa-6ee681d90801', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to in_review.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:41:06'),
('99a53e73-261d-4975-a109-b6c9ff6d85e4', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to ongoing.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:41:14'),
('9b6a6d1f-1d40-42bf-a977-96da3f19aee7', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0867e8-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'group_added', 'Added to Backend Team', 'You were added to the Backend Team group.', 'group', '72323f0f-5f06-4140-85fd-1c9be5424e69', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 05:34:31'),
('9d5b5f36-54c6-4a5a-a484-e683493ef992', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Open AI', 'Ankur shared the Open AI key with you.', 'api_key', '8f5357fa-308d-4ecc-bbf9-82a9bad96db0', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 10:12:22'),
('9fca37e9-0133-4d61-85e6-85d73d356912', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to ongoing.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:41:35'),
('a04777ab-f750-4c83-be41-e590c5cc6fb3', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to ongoing.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:41:33'),
('a4fc2be7-13a8-4f0d-875d-cfdaf60550d3', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to ongoing.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:41:05'),
('a85bac4e-91c1-4e05-9700-a94691b63323', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to completed.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 07:05:04'),
('a85e6817-b00e-4194-88cf-66b44bd54a5c', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_commented', 'Comment on: Add dark mode toggle to settings', 'Ankur commented on "Add dark mode toggle to settings".', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:28:23'),
('b580dc9f-5577-4738-a4f9-a9f0af54a197', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to inbox.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:40:52'),
('b8ec365b-2c5c-4839-83e2-92ddab331b23', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: SSO documentation', '"SSO documentation" moved to ongoing.', 'task', '7aebb2a8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 08:07:34'),
('b9e17296-615b-4cdf-b04e-4a2b83887bb8', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to completed.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 05:52:48'),
('bb8a9136-9161-4172-829f-5bfb845b8510', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to in_review.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:41:35'),
('bbeda3c9-739e-4d96-8469-b025e9ed6da7', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 06:40:34'),
('bd3ada11-800f-474e-a695-897aa2dabfa1', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #9: Add dark mode toggle to settings', 'Ankur wants your attention on "Add dark mode toggle to settings"', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:24:57'),
('bda29e97-d2aa-433f-ba32-8781afc339cd', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 06:40:37'),
('c4125717-dd50-4fd9-865d-8ae33dd4e493', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #11: Implement @mention picker in comments', 'Ankur wants your attention on "Implement @mention picker in comments"', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:53:22'),
('c8079501-9b03-407c-9afc-f82b5ebc4fac', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_resolved', 'Issue resolved: Add dark mode toggle to settings', '"Add dark mode toggle to settings" was resolved.', 'issue', '5134696c-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 09:47:15'),
('caa15482-d22e-41c9-b4d2-5d8a27149f59', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 07:01:53'),
('cbe78000-961d-48d2-88b4-6e898898da57', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_assigned', 'Issue assigned: Old bug from last week', 'You were assigned "Old bug from last week".', 'issue', '51f2e428-54f8-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 10:00:52'),
('ce92493f-c602-4f14-ae01-6df298774ffe', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: API rate limiting', '"API rate limiting" moved to in_review.', 'task', '7aebaace-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 07:05:05'),
('cf804cb6-60a0-4e50-8275-6fa93f7ddbd6', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'group_added', 'Added to Backend Team', 'You were added to the Backend Team group.', 'group', '72323f0f-5f06-4140-85fd-1c9be5424e69', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 05:22:41'),
('d291e65e-50f3-4296-a263-705468357e95', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #11: Implement @mention picker in comments', 'Ankur wants your attention on "Implement @mention picker in comments"', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:53:51'),
('d69af1e1-2206-4150-8579-b177af05382a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'group_removed', 'Removed from Backend Team', 'You were removed from the Backend Team group.', 'group', '72323f0f-5f06-4140-85fd-1c9be5424e69', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 05:23:06'),
('e16b0153-ee19-4ef2-9e5f-4df08c4f51a8', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_assigned', 'Issue assigned: The date is being rendered at line 513. It''s there but formatDue returns empty string when due_date is null. The card looks correct', 'You were assigned "The date is being rendered at line 513. It''s there but formatDue returns empty string when due_date is null. The card looks correct".', 'issue', 'a5d42af7-d473-4d2a-8492-62018798de22', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 09:45:17'),
('e2909752-dc5d-4d80-8fc7-d5a6fd063369', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #11: Implement @mention picker in comments', 'Ankur wants your attention on "Implement @mention picker in comments"', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:56:35'),
('e4c84473-127e-4f50-8bce-26498249811d', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', FALSE, NULL, FALSE, NULL, NULL, '2026-05-19 13:34:14'),
('e64f84df-72c3-4d72-9896-5735ad09f299', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Deploy checklist', '"Deploy checklist" moved to ongoing.', 'task', '7aebacd6-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 08:07:39'),
('ec48da47-7214-4bd1-9821-3bc30169e7d3', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', '1e562f54-a3a8-4435-9600-be28b3f1740d', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 06:44:03'),
('ec9db790-483c-492c-8c0b-e8bcb67927d0', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa083e26-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Sprint retro notes', '"Sprint retro notes" moved to in_review.', 'task', '7aebafd8-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 07:05:01'),
('f03542e0-cc82-4a95-bfa6-6dc7b83b0cde', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0865a4-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: Deploy checklist', '"Deploy checklist" moved to completed.', 'task', '7aebacd6-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 12:12:21'),
('f4fc00d9-3c2a-4297-8187-f22678e59b1a', '7aba0da1-45ee-41bf-8612-58335b60e497', '36eda1ec-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', 'Task updated: API rate limiting', '"API rate limiting" moved to completed.', 'task', '7aebaace-5447-11f1-b5d8-585aba99cd39', FALSE, NULL, FALSE, NULL, NULL, '2026-05-21 08:07:40'),
('f7d5be9d-ebab-4cf3-8123-e0f2dbcc0c2a', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', 'Key shared: Grok', 'Ankur shared the Grok key with you.', 'api_key', 'd7b955c1-a0bc-4d7b-a5dd-3f7b4f1bf247', FALSE, NULL, FALSE, NULL, NULL, '2026-05-20 06:40:38'),
('fc92afc8-ab76-431a-abe9-53ba36b30712', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'mention', 'Nudge on #11: Implement @mention picker in comments', 'Ankur wants your attention on "Implement @mention picker in comments"', 'issue', '51346e3a-54e9-11f1-a1d1-1f2352330b9b', FALSE, NULL, FALSE, NULL, NULL, '2026-05-22 06:56:40'),
('ffddbf2f-67e2-45b3-bd2f-edef7827832b', '7aba0da1-45ee-41bf-8612-58335b60e497', 'aa0866da-5370-11f1-a90b-bda2f5e69f69', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'group_added', 'Added to Ops', 'You were added to the Ops group.', 'group', 'b81a3d52-5370-11f1-a90b-bda2f5e69f69', FALSE, NULL, FALSE, NULL, NULL, '2026-05-19 12:02:09');

-- notification_preferences (3 rows)
INSERT INTO notification_preferences (id, user_id, type, in_app, discord_dm) VALUES
('289c081a-2502-4409-ad81-26af5e6c7773', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'task_status_changed', TRUE, TRUE),
('c91b4206-8d84-49af-ad79-972d68976bca', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'key_shared', TRUE, TRUE),
('f9cd19c8-d3b6-4914-b35d-c40420ab6036', 'd81ea825-692b-4a62-82e5-de0eca6a0638', 'issue_assigned', TRUE, TRUE);

-- app_settings (1 rows)
INSERT INTO app_settings (key, value, updated_at) VALUES
('discord_channel_id', '1359877860281684251', '2026-05-22 07:04:08');

-- Reset issues number sequence
SELECT setval(pg_get_serial_sequence('issues', 'number'), (SELECT MAX(number) FROM issues));
