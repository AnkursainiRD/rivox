const { DataTypes } = require("sequelize");
const sequelize = require("../db");

// ── ORGANIZATIONS ──────────────────────────────────────────

const Organization = sequelize.define("Organization", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  logo_url: DataTypes.STRING(500),
}, { tableName: "organizations", underscored: true });

// ── USERS ──────────────────────────────────────────────────

const User = sequelize.define("User", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  username: { type: DataTypes.STRING(100), allowNull: false },
  display_name: DataTypes.STRING(100),
  avatar_url: DataTypes.STRING(500),
  discord_id: { type: DataTypes.STRING(50), unique: true },
  password_hash: DataTypes.STRING(255),
  role: { type: DataTypes.ENUM("super_admin", "admin", "user"), defaultValue: "user" },
}, { tableName: "users", underscored: true });

// ── ORG MEMBERS ────────────────────────────────────────────

const OrgMember = sequelize.define("OrgMember", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  role: { type: DataTypes.ENUM("super_admin", "admin", "employee"), defaultValue: "employee" },
  joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: "org_members", underscored: true, timestamps: false });

Organization.belongsToMany(User, { through: OrgMember, foreignKey: "org_id", otherKey: "user_id", as: "members" });
User.belongsToMany(Organization, { through: OrgMember, foreignKey: "user_id", otherKey: "org_id", as: "organizations" });
OrgMember.belongsTo(User, { foreignKey: "user_id", as: "user" });
OrgMember.belongsTo(Organization, { foreignKey: "org_id" });

// ── GROUPS ─────────────────────────────────────────────────

const Group = sequelize.define("Group", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  description: DataTypes.STRING(500),
  color: DataTypes.STRING(20),
  created_by: { type: DataTypes.UUID, allowNull: false },
}, { tableName: "groups", underscored: true });

Group.belongsTo(Organization, { foreignKey: "org_id" });
Group.belongsTo(User, { foreignKey: "created_by", as: "creator" });

// ── GROUP MEMBERS ──────────────────────────────────────────

const GroupMember = sequelize.define("GroupMember", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  added_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: "group_members", underscored: true, timestamps: false });

Group.belongsToMany(User, { through: GroupMember, foreignKey: "group_id", otherKey: "user_id", as: "members" });
User.belongsToMany(Group, { through: GroupMember, foreignKey: "user_id", otherKey: "group_id", as: "groups" });
GroupMember.belongsTo(User, { foreignKey: "user_id", as: "user" });
GroupMember.belongsTo(Group, { foreignKey: "group_id" });

// ── GROUP PERMISSIONS ──────────────────────────────────────

const GroupPermission = sequelize.define("GroupPermission", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  capability: { type: DataTypes.ENUM("view_keys", "use_keys", "manage_keys", "sticky_board", "manage_team", "manage_issues", "billing"), allowNull: false },
  level: { type: DataTypes.ENUM("none", "view", "use", "admin"), defaultValue: "none" },
}, { tableName: "group_permissions", underscored: true, timestamps: false });

Group.hasMany(GroupPermission, { foreignKey: "group_id", as: "permissions" });
GroupPermission.belongsTo(Group, { foreignKey: "group_id" });

// ── API KEYS ───────────────────────────────────────────────

const ApiKey = sequelize.define("ApiKey", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  fingerprint: { type: DataTypes.STRING(100), allowNull: false },
  encrypted_value: { type: DataTypes.TEXT, allowNull: false },
  environment: { type: DataTypes.ENUM("prod", "staging", "dev"), defaultValue: "dev" },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_global: { type: DataTypes.BOOLEAN, defaultValue: false },
  auto_rotate: { type: DataTypes.BOOLEAN, defaultValue: false },
  rotate_days: { type: DataTypes.INTEGER, defaultValue: 90 },
  last_rotated: DataTypes.DATE,
  last_used_at: DataTypes.DATE,
  expires_at: DataTypes.DATE,
  created_by: { type: DataTypes.UUID, allowNull: false },
}, { tableName: "api_keys", underscored: true });

ApiKey.belongsTo(Organization, { foreignKey: "org_id" });
ApiKey.belongsTo(User, { foreignKey: "created_by", as: "creator" });

// ── KEY ACCESS ─────────────────────────────────────────────

const ApiKeyUserAccess = sequelize.define("ApiKeyUserAccess", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  permission: { type: DataTypes.ENUM("view", "manage"), defaultValue: "view" },
  granted_by: { type: DataTypes.UUID, allowNull: false },
  granted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: "api_key_user_access", underscored: true, timestamps: false });

ApiKey.belongsToMany(User, { through: ApiKeyUserAccess, foreignKey: "key_id", otherKey: "user_id", as: "sharedUsers" });
ApiKeyUserAccess.belongsTo(User, { foreignKey: "user_id", as: "user" });
ApiKeyUserAccess.belongsTo(ApiKey, { foreignKey: "key_id" });

const ApiKeyGroupAccess = sequelize.define("ApiKeyGroupAccess", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  permission: { type: DataTypes.ENUM("view", "manage"), defaultValue: "view" },
  granted_by: { type: DataTypes.UUID, allowNull: false },
  granted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: "api_key_group_access", underscored: true, timestamps: false });

ApiKey.belongsToMany(Group, { through: ApiKeyGroupAccess, foreignKey: "key_id", otherKey: "group_id", as: "sharedGroups" });
ApiKeyGroupAccess.belongsTo(Group, { foreignKey: "group_id", as: "group" });
ApiKeyGroupAccess.belongsTo(ApiKey, { foreignKey: "key_id", as: "key" });

const ApiKeyRevocation = sequelize.define("ApiKeyRevocation", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reason: DataTypes.STRING(500),
  revoked_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: "api_key_revocations", underscored: true, timestamps: false });

ApiKeyRevocation.belongsTo(ApiKey, { foreignKey: "key_id" });
ApiKeyRevocation.belongsTo(User, { foreignKey: "revoked_by", as: "revoker" });

// ── TASKS ──────────────────────────────────────────────────

const Task = sequelize.define("Task", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  body: DataTypes.TEXT,
  color: { type: DataTypes.STRING(20), defaultValue: "yellow" },
  status: { type: DataTypes.ENUM("inbox", "pending", "ongoing", "in_review", "completed", "rejected"), defaultValue: "inbox" },
  scope: { type: DataTypes.ENUM("personal", "team"), defaultValue: "personal" },
  priority: { type: DataTypes.ENUM("low", "medium", "high", "urgent"), defaultValue: "medium" },
  is_pinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  canvas_x: { type: DataTypes.FLOAT, defaultValue: 0 },
  canvas_y: { type: DataTypes.FLOAT, defaultValue: 0 },
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
}, { tableName: "tasks", underscored: true });

Task.belongsTo(Organization, { foreignKey: "org_id" });
Task.belongsTo(User, { foreignKey: "created_by", as: "creator" });
Task.belongsTo(User, { foreignKey: "assigned_to", as: "assignee" });

const TaskTag = sequelize.define("TaskTag", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  color: { type: DataTypes.STRING(20), defaultValue: "#5b5bd6" },
}, { tableName: "task_tags", underscored: true, timestamps: false });

TaskTag.belongsTo(Organization, { foreignKey: "org_id" });

const TaskTagMap = sequelize.define("TaskTagMap", {}, { tableName: "task_tag_map", underscored: true, timestamps: false });
Task.belongsToMany(TaskTag, { through: TaskTagMap, foreignKey: "task_id", otherKey: "tag_id", as: "tags" });

// ── CHANNELS ──────────────────────────────────────────────

const Channel = sequelize.define("Channel", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description: DataTypes.STRING(500),
  color: DataTypes.STRING(20),
}, { tableName: "channels", underscored: true });

Channel.belongsTo(User, { foreignKey: "created_by", as: "creator" });

// ── ISSUES ─────────────────────────────────────────────────

const Issue = sequelize.define("Issue", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  number: { type: DataTypes.INTEGER, autoIncrement: true, unique: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: DataTypes.TEXT,
  status: { type: DataTypes.ENUM("open", "in_progress", "resolved", "closed", "wont_fix"), defaultValue: "open" },
  priority: { type: DataTypes.ENUM("low", "medium", "high", "critical"), defaultValue: "medium" },
  severity: { type: DataTypes.ENUM("cosmetic", "minor", "major", "blocker"), defaultValue: "minor" },
  type: { type: DataTypes.ENUM("bug", "feature", "improvement", "task"), defaultValue: "bug" },
  environment: DataTypes.ENUM("prod", "staging", "dev"),
  browser: DataTypes.STRING(100),
  steps_to_reproduce: DataTypes.TEXT,
  expected_behavior: DataTypes.TEXT,
  actual_behavior: DataTypes.TEXT,
  due_date: DataTypes.DATEONLY,
  resolved_at: DataTypes.DATE,
}, { tableName: "issues", underscored: true });

Issue.belongsTo(Organization, { foreignKey: "org_id" });
Issue.belongsTo(Channel, { foreignKey: "channel_id", as: "channel" });
Issue.belongsTo(User, { foreignKey: "reported_by", as: "reporter" });
Issue.belongsTo(User, { foreignKey: "assigned_to", as: "assignee" });
Issue.belongsTo(Group, { foreignKey: "assigned_group", as: "assignedGroup" });
Channel.hasMany(Issue, { foreignKey: "channel_id" });

const IssueLabel = sequelize.define("IssueLabel", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  color: { type: DataTypes.STRING(20), defaultValue: "#ef4444" },
}, { tableName: "issue_labels", underscored: true, timestamps: false });

IssueLabel.belongsTo(Organization, { foreignKey: "org_id" });

const IssueLabelMap = sequelize.define("IssueLabelMap", {}, { tableName: "issue_label_map", underscored: true, timestamps: false });
Issue.belongsToMany(IssueLabel, { through: IssueLabelMap, foreignKey: "issue_id", otherKey: "label_id", as: "labels" });

const IssueComment = sequelize.define("IssueComment", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  body: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: "issue_comments", underscored: true });

IssueComment.belongsTo(Issue, { foreignKey: "issue_id" });
IssueComment.belongsTo(User, { foreignKey: "user_id", as: "author" });
Issue.hasMany(IssueComment, { foreignKey: "issue_id", as: "comments" });

const IssueAttachment = sequelize.define("IssueAttachment", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  file_name: { type: DataTypes.STRING(255), allowNull: false },
  file_url: { type: DataTypes.STRING(500), allowNull: false },
  file_size: DataTypes.INTEGER,
  mime_type: DataTypes.STRING(100),
  uploaded_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: "issue_attachments", underscored: true, timestamps: false });

IssueAttachment.belongsTo(Issue, { foreignKey: "issue_id" });
IssueAttachment.belongsTo(User, { foreignKey: "uploaded_by", as: "uploader" });
Issue.hasMany(IssueAttachment, { foreignKey: "issue_id", as: "attachments" });

// ── ACTIVITY LOGS ──────────────────────────────────────────

const ActivityLog = sequelize.define("ActivityLog", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  action: { type: DataTypes.STRING(50), allowNull: false },
  entity_type: { type: DataTypes.ENUM("api_key", "task", "issue", "group", "user", "org", "permission"), allowNull: false },
  entity_id: { type: DataTypes.UUID, allowNull: false },
  details: DataTypes.JSON,
  ip_address: DataTypes.STRING(45),
}, { tableName: "activity_logs", underscored: true, updatedAt: false });

ActivityLog.belongsTo(Organization, { foreignKey: "org_id" });
ActivityLog.belongsTo(User, { foreignKey: "user_id", as: "actor" });

// ── NOTIFICATIONS ──────────────────────────────────────────

const Notification = sequelize.define("Notification", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.ENUM("key_shared", "key_revoked", "key_rotated", "task_assigned", "task_status_changed", "issue_assigned", "issue_commented", "issue_resolved", "group_added", "group_removed", "mention"), allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  body: DataTypes.STRING(500),
  entity_type: { type: DataTypes.ENUM("api_key", "task", "issue", "group", "user", "org"), allowNull: false },
  entity_id: { type: DataTypes.UUID, allowNull: false },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  read_at: DataTypes.DATE,
  discord_sent: { type: DataTypes.BOOLEAN, defaultValue: false },
  discord_sent_at: DataTypes.DATE,
  discord_msg_id: DataTypes.STRING(50),
}, { tableName: "notifications", underscored: true, updatedAt: false });

Notification.belongsTo(Organization, { foreignKey: "org_id" });
Notification.belongsTo(User, { foreignKey: "recipient_id", as: "recipient" });
Notification.belongsTo(User, { foreignKey: "sender_id", as: "sender" });

const NotificationPreference = sequelize.define("NotificationPreference", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.ENUM("key_shared", "key_revoked", "key_rotated", "task_assigned", "task_status_changed", "issue_assigned", "issue_commented", "issue_resolved", "group_added", "group_removed", "mention"), allowNull: false },
  in_app: { type: DataTypes.BOOLEAN, defaultValue: true },
  discord_dm: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: "notification_preferences", underscored: true, timestamps: false });

NotificationPreference.belongsTo(User, { foreignKey: "user_id" });

module.exports = {
  sequelize,
  Organization, User, OrgMember,
  Group, GroupMember, GroupPermission,
  ApiKey, ApiKeyUserAccess, ApiKeyGroupAccess, ApiKeyRevocation,
  Task, TaskTag, TaskTagMap,
  Channel,
  Issue, IssueLabel, IssueLabelMap, IssueComment, IssueAttachment,
  ActivityLog,
  Notification, NotificationPreference,
};
