-- ============================================================
-- Rivox Database Schema — MySQL
-- ============================================================

-- ── ORGANIZATIONS ──────────────────────────────────────────

CREATE TABLE organizations (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(100) NOT NULL UNIQUE,
  logo_url      VARCHAR(500),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── USERS ──────────────────────────────────────────────────

CREATE TABLE users (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email         VARCHAR(255) NOT NULL UNIQUE,
  username      VARCHAR(100) NOT NULL,
  display_name  VARCHAR(100),
  avatar_url    VARCHAR(500),
  discord_id    VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255),
  role          ENUM('super_admin', 'admin', 'user') NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── ORG MEMBERSHIPS (user ↔ org + role) ────────────────────

CREATE TABLE org_members (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  org_id        CHAR(36) NOT NULL,
  user_id       CHAR(36) NOT NULL,
  role          ENUM('super_admin', 'admin', 'employee') NOT NULL DEFAULT 'employee',
  joined_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_org_user (org_id, user_id),
  FOREIGN KEY (org_id)  REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── GROUPS ─────────────────────────────────────────────────

CREATE TABLE `groups` (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  org_id        CHAR(36) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   VARCHAR(500),
  color         VARCHAR(20),
  created_by    CHAR(36) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_org_group_name (org_id, name),
  FOREIGN KEY (org_id)     REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ── GROUP MEMBERS ──────────────────────────────────────────

CREATE TABLE group_members (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  group_id      CHAR(36) NOT NULL,
  user_id       CHAR(36) NOT NULL,
  added_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_group_user (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
);

-- ── GROUP PERMISSIONS ──────────────────────────────────────

CREATE TABLE group_permissions (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  group_id      CHAR(36) NOT NULL,
  capability    ENUM('view_keys', 'use_keys', 'manage_keys', 'sticky_board', 'manage_team', 'manage_issues', 'billing') NOT NULL,
  level         ENUM('none', 'view', 'use', 'admin') NOT NULL DEFAULT 'none',

  UNIQUE KEY uq_group_cap (group_id, capability),
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE
);

-- ── API KEYS ───────────────────────────────────────────────

CREATE TABLE api_keys (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  org_id        CHAR(36) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  fingerprint   VARCHAR(100) NOT NULL,
  encrypted_value TEXT NOT NULL,
  environment   ENUM('prod', 'staging', 'dev') NOT NULL DEFAULT 'dev',
  is_active     BOOLEAN DEFAULT TRUE,
  is_global     BOOLEAN DEFAULT FALSE,
  auto_rotate   BOOLEAN DEFAULT FALSE,
  rotate_days   INT DEFAULT 90,
  last_rotated  TIMESTAMP NULL,
  last_used_at  TIMESTAMP NULL,
  expires_at    TIMESTAMP NULL,
  created_by    CHAR(36) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (org_id)     REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- key shared with individual users
CREATE TABLE api_key_user_access (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  key_id        CHAR(36) NOT NULL,
  user_id       CHAR(36) NOT NULL,
  permission    ENUM('view', 'manage') NOT NULL DEFAULT 'view',
  granted_by    CHAR(36) NOT NULL,
  granted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_key_user (key_id, user_id),
  FOREIGN KEY (key_id)     REFERENCES api_keys(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- key shared with groups
CREATE TABLE api_key_group_access (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  key_id        CHAR(36) NOT NULL,
  group_id      CHAR(36) NOT NULL,
  permission    ENUM('view', 'manage') NOT NULL DEFAULT 'view',
  granted_by    CHAR(36) NOT NULL,
  granted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_key_group (key_id, group_id),
  FOREIGN KEY (key_id)     REFERENCES api_keys(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id)   REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- revoked keys log
CREATE TABLE api_key_revocations (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  key_id        CHAR(36) NOT NULL,
  revoked_by    CHAR(36) NOT NULL,
  reason        VARCHAR(500),
  revoked_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (key_id)     REFERENCES api_keys(id) ON DELETE CASCADE,
  FOREIGN KEY (revoked_by) REFERENCES users(id)
);

-- ── STICKY BOARD (TASKS) ───────────────────────────────────

CREATE TABLE tasks (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  org_id        CHAR(36) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  body          TEXT,
  color         ENUM('yellow', 'blue', 'green', 'pink', 'purple') DEFAULT 'yellow',
  status        ENUM('inbox', 'pending', 'ongoing', 'in_review', 'completed', 'rejected') NOT NULL DEFAULT 'inbox',
  scope         ENUM('personal', 'team') NOT NULL DEFAULT 'personal',
  priority      ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  is_pinned     BOOLEAN DEFAULT FALSE,

  -- canvas position (for free canvas layout)
  canvas_x      FLOAT DEFAULT 0,
  canvas_y      FLOAT DEFAULT 0,

  -- dates
  start_date    DATE NULL,
  end_date      DATE NULL,

  created_by    CHAR(36) NOT NULL,
  assigned_to   CHAR(36) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (org_id)      REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by)  REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE task_tags (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  org_id        CHAR(36) NOT NULL,
  name          VARCHAR(50) NOT NULL,
  color         VARCHAR(20) DEFAULT '#5b5bd6',

  UNIQUE KEY uq_org_tag (org_id, name),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE task_tag_map (
  task_id       CHAR(36) NOT NULL,
  tag_id        CHAR(36) NOT NULL,

  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES task_tags(id) ON DELETE CASCADE
);

-- ── CHANNELS ──────────────────────────────────────────────

CREATE TABLE channels (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name          VARCHAR(100) NOT NULL UNIQUE,
  description   VARCHAR(500),
  color         VARCHAR(20),
  created_by    CHAR(36) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ── ISSUES ─────────────────────────────────────────────────

CREATE TABLE issues (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  number        INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  org_id        CHAR(36) NOT NULL,
  channel_id    CHAR(36) NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  status        ENUM('open', 'in_progress', 'resolved', 'closed', 'wont_fix') NOT NULL DEFAULT 'open',
  priority      ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  severity      ENUM('cosmetic', 'minor', 'major', 'blocker') DEFAULT 'minor',
  type          ENUM('bug', 'feature', 'improvement', 'task') NOT NULL DEFAULT 'bug',

  -- assignment
  reported_by   CHAR(36) NOT NULL,
  assigned_to   CHAR(36) NULL,
  assigned_group CHAR(36) NULL,

  -- metadata
  environment   ENUM('prod', 'staging', 'dev') NULL,
  browser       VARCHAR(100),
  steps_to_reproduce TEXT,
  expected_behavior  TEXT,
  actual_behavior    TEXT,

  -- dates
  due_date      DATE NULL,
  resolved_at   TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (org_id)        REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id)    REFERENCES channels(id) ON DELETE SET NULL,
  FOREIGN KEY (reported_by)   REFERENCES users(id),
  FOREIGN KEY (assigned_to)   REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_group) REFERENCES `groups`(id) ON DELETE SET NULL
);

CREATE TABLE issue_labels (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  org_id        CHAR(36) NOT NULL,
  name          VARCHAR(50) NOT NULL,
  color         VARCHAR(20) DEFAULT '#ef4444',

  UNIQUE KEY uq_org_label (org_id, name),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE issue_label_map (
  issue_id      CHAR(36) NOT NULL,
  label_id      CHAR(36) NOT NULL,

  PRIMARY KEY (issue_id, label_id),
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES issue_labels(id) ON DELETE CASCADE
);

CREATE TABLE issue_comments (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  issue_id      CHAR(36) NOT NULL,
  user_id       CHAR(36) NOT NULL,
  body          TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)
);

CREATE TABLE issue_attachments (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  issue_id      CHAR(36) NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  file_url      VARCHAR(500) NOT NULL,
  file_size     INT,
  mime_type     VARCHAR(100),
  uploaded_by   CHAR(36) NOT NULL,
  uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (issue_id)   REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- ── ACTIVITY LOGS ──────────────────────────────────────────

CREATE TABLE activity_logs (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  org_id        CHAR(36) NOT NULL,
  user_id       CHAR(36) NOT NULL,
  action        VARCHAR(50) NOT NULL,
  entity_type   ENUM('api_key', 'task', 'issue', 'group', 'user', 'org', 'permission') NOT NULL,
  entity_id     CHAR(36) NOT NULL,
  details       JSON,
  ip_address    VARCHAR(45),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_org_created (org_id, created_at DESC),
  INDEX idx_user_created (user_id, created_at DESC),
  INDEX idx_entity (entity_type, entity_id),
  FOREIGN KEY (org_id)  REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── NOTIFICATIONS ──────────────────────────────────────────

CREATE TABLE notifications (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  org_id        CHAR(36) NOT NULL,
  recipient_id  CHAR(36) NOT NULL,
  sender_id     CHAR(36) NOT NULL,
  type          ENUM(
    'key_shared',
    'key_revoked',
    'key_rotated',
    'task_assigned',
    'task_status_changed',
    'issue_assigned',
    'issue_commented',
    'issue_resolved',
    'group_added',
    'group_removed',
    'mention'
  ) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  body          VARCHAR(500),
  entity_type   ENUM('api_key', 'task', 'issue', 'group', 'user', 'org') NOT NULL,
  entity_id     CHAR(36) NOT NULL,
  is_read       BOOLEAN DEFAULT FALSE,
  read_at       TIMESTAMP NULL,

  -- discord delivery
  discord_sent     BOOLEAN DEFAULT FALSE,
  discord_sent_at  TIMESTAMP NULL,
  discord_msg_id   VARCHAR(50),

  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_recipient_unread (recipient_id, is_read, created_at DESC),
  INDEX idx_org_created (org_id, created_at DESC),
  FOREIGN KEY (org_id)       REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id)    REFERENCES users(id)
);

-- per-user notification preferences
CREATE TABLE notification_preferences (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id       CHAR(36) NOT NULL,
  type          ENUM(
    'key_shared',
    'key_revoked',
    'key_rotated',
    'task_assigned',
    'task_status_changed',
    'issue_assigned',
    'issue_commented',
    'issue_resolved',
    'group_added',
    'group_removed',
    'mention'
  ) NOT NULL,
  in_app        BOOLEAN DEFAULT TRUE,
  discord_dm    BOOLEAN DEFAULT TRUE,

  UNIQUE KEY uq_user_type (user_id, type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── LOCAL SQLITE CACHE (embedded) ──────────────────────────
-- These tables live in a local SQLite DB on each client:
--
-- local_preferences   — theme, layout defaults, sidebar state
-- local_draft_tasks   — offline task drafts before sync
-- local_cache_keys    — cached key metadata (never the actual secret)
-- local_sync_state    — last sync timestamps per entity type
-- ============================================================
