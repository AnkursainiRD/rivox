// AI tools — defined using @yourgpt/llm-sdk tool() + zod

const { tool } = require("@yourgpt/llm-sdk");
const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("../db");
const { QueryTypes } = require("sequelize");

const q = (sql, replacements) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

function createTools(orgId, userId) {
  return {
    // ── Data tools ────────────────────────────────────

    list_issues: tool({
      description: "List issues in the workspace. Can filter by status, priority, type.",
      parameters: z.object({
        status: z.enum(["open", "in_progress", "resolved", "closed", "wont_fix"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        type: z.enum(["bug", "feature", "improvement", "task"]).optional(),
        limit: z.number().optional(),
      }),
      execute: async ({ status, priority, type, limit }) => {
        let sql = "SELECT id, number, title, status, priority, type, created_at FROM issues WHERE org_id = :orgId";
        const r = { orgId };
        if (status) { sql += " AND status = :status"; r.status = status; }
        if (priority) { sql += " AND priority = :priority"; r.priority = priority; }
        if (type) { sql += " AND type = :type"; r.type = type; }
        sql += " ORDER BY created_at DESC LIMIT :limit";
        r.limit = limit || 10;
        return await q(sql, r);
      },
    }),

    list_tasks: tool({
      description: "List sticky board tasks. Can filter by status or scope.",
      parameters: z.object({
        status: z.enum(["inbox", "pending", "ongoing", "in_review", "completed", "rejected"]).optional(),
        scope: z.enum(["personal", "team"]).optional(),
        limit: z.number().optional(),
      }),
      execute: async ({ status, scope, limit }) => {
        let sql = "SELECT id, title, status, priority, scope, color FROM tasks WHERE org_id = :orgId";
        const r = { orgId };
        if (status) { sql += " AND status = :status"; r.status = status; }
        if (scope) { sql += " AND scope = :scope"; r.scope = scope; }
        sql += " ORDER BY created_at DESC LIMIT :limit";
        r.limit = limit || 10;
        return await q(sql, r);
      },
    }),

    list_api_keys: tool({
      description: "List API keys in the workspace.",
      parameters: z.object({
        environment: z.enum(["prod", "staging", "dev"]).optional(),
      }),
      execute: async ({ environment }) => {
        let sql = "SELECT id, name, environment, is_active, fingerprint FROM api_keys WHERE org_id = :orgId";
        const r = { orgId };
        if (environment) { sql += " AND environment = :env"; r.env = environment; }
        sql += " ORDER BY created_at DESC";
        return await q(sql, r);
      },
    }),

    list_members: tool({
      description: "List team members in the current workspace.",
      parameters: z.object({}),
      execute: async () => {
        return await q(
          `SELECT u.id, u.display_name, u.username, u.email, om.role
           FROM org_members om JOIN users u ON u.id = om.user_id
           WHERE om.org_id = :orgId ORDER BY om.joined_at DESC`,
          { orgId }
        );
      },
    }),

    list_groups: tool({
      description: "List groups/teams in the workspace.",
      parameters: z.object({}),
      execute: async () => {
        return await q(
          `SELECT id, name, description, color FROM "groups" WHERE org_id = :orgId ORDER BY created_at DESC`,
          { orgId }
        );
      },
    }),

    get_group_members: tool({
      description: "Get members of a specific group/team by group name.",
      parameters: z.object({
        groupName: z.string(),
      }),
      execute: async ({ groupName }) => {
        const [group] = await q(
          `SELECT id, name FROM "groups" WHERE org_id = :orgId AND LOWER(name) = LOWER(:name)`,
          { orgId, name: groupName }
        );
        if (!group) return { error: `Group "${groupName}" not found` };
        return await q(
          `SELECT u.id, u.display_name, u.username, u.email
           FROM group_members gm JOIN users u ON u.id = gm.user_id
           WHERE gm.group_id = :groupId ORDER BY gm.added_at DESC`,
          { groupId: group.id }
        );
      },
    }),

    get_activity: tool({
      description: "Get recent activity log for the workspace.",
      parameters: z.object({
        limit: z.number().optional(),
      }),
      execute: async ({ limit }) => {
        return await q(
          `SELECT action, entity_type, details, created_at
           FROM activity_logs WHERE org_id = :orgId ORDER BY created_at DESC LIMIT :limit`,
          { orgId, limit: limit || 10 }
        );
      },
    }),

    // ── Action tools ─────────────────────────────────

    create_issue: tool({
      description: "Create a new issue in the workspace.",
      parameters: z.object({
        title: z.string(),
        description: z.string().optional(),
        type: z.enum(["bug", "feature", "improvement", "task"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      }),
      execute: async ({ title, description, type, priority }) => {
        const id = uuidv4();
        await sequelize.query(
          `INSERT INTO issues (id, org_id, title, description, type, priority, reported_by)
           VALUES (:id, :orgId, :title, :desc, :type, :priority, :userId)`,
          { replacements: { id, orgId, title, desc: description || null, type: type || "bug", priority: priority || "medium", userId } }
        );
        return { created: true, id, title };
      },
    }),

    create_task: tool({
      description: "Create a new sticky board task.",
      parameters: z.object({
        title: z.string(),
        body: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        scope: z.enum(["personal", "team"]).optional(),
      }),
      execute: async ({ title, body, priority, scope }) => {
        const id = uuidv4();
        await sequelize.query(
          `INSERT INTO tasks (id, org_id, title, body, priority, scope, created_by)
           VALUES (:id, :orgId, :title, :body, :priority, :scope, :userId)`,
          { replacements: { id, orgId, title, body: body || null, priority: priority || "medium", scope: scope || "personal", userId } }
        );
        return { created: true, id, title };
      },
    }),

    // ── Navigation tools ─────────────────────────────

    navigate: tool({
      description: "Navigate user to a page. Use when user says 'show me', 'go to', 'open' a page.",
      parameters: z.object({
        page: z.enum(["issues", "sticky-board", "team", "settings", "notifications", "organizations", "help", "/"]),
      }),
      execute: async ({ page }) => {
        const routes = { "issues": "/issues", "sticky-board": "/sticky-board", "team": "/team", "settings": "/settings", "notifications": "/notifications", "organizations": "/organizations", "help": "/help", "/": "/" };
        return { __action: "navigate", path: routes[page] || "/" };
      },
    }),

    open_issue: tool({
      description: "Open a specific issue by number.",
      parameters: z.object({
        issueNumber: z.number(),
      }),
      execute: async ({ issueNumber }) => {
        const [issue] = await q("SELECT id FROM issues WHERE org_id = :orgId AND number = :num", { orgId, num: issueNumber });
        if (issue) return { __action: "navigate", path: `/issues/${issue.id}` };
        return { error: `Issue #${issueNumber} not found` };
      },
    }),

    // ── Issue operations ─────────────────────────────

    get_issue: tool({
      description: "Get full details of a specific issue by number.",
      parameters: z.object({ issueNumber: z.number() }),
      execute: async ({ issueNumber }) => {
        const [issue] = await q(
          `SELECT i.*, u.display_name as reporter_name, a.display_name as assignee_name
           FROM issues i
           LEFT JOIN users u ON u.id = i.reported_by
           LEFT JOIN users a ON a.id = i.assigned_to
           WHERE i.org_id = :orgId AND i.number = :num`,
          { orgId, num: issueNumber }
        );
        if (!issue) return { error: `Issue #${issueNumber} not found` };
        const comments = await q(
          `SELECT c.body, c.created_at, u.display_name FROM issue_comments c JOIN users u ON u.id = c.user_id WHERE c.issue_id = :id ORDER BY c.created_at DESC LIMIT 5`,
          { id: issue.id }
        );
        return { ...issue, recent_comments: comments };
      },
    }),

    update_issue: tool({
      description: "Update an issue's status, priority, assignee, or type.",
      parameters: z.object({
        issueNumber: z.number(),
        status: z.enum(["open", "in_progress", "resolved", "closed", "wont_fix"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        type: z.enum(["bug", "feature", "improvement", "task"]).optional(),
      }),
      execute: async ({ issueNumber, status, priority, type }) => {
        const [issue] = await q("SELECT id, title FROM issues WHERE org_id = :orgId AND number = :num", { orgId, num: issueNumber });
        if (!issue) return { error: `Issue #${issueNumber} not found` };
        const sets = [];
        const r = { id: issue.id };
        if (status) { sets.push("status = :status"); r.status = status; }
        if (priority) { sets.push("priority = :priority"); r.priority = priority; }
        if (type) { sets.push("type = :type"); r.type = type; }
        if (!sets.length) return { error: "Nothing to update" };
        await sequelize.query(`UPDATE issues SET ${sets.join(", ")} WHERE id = :id`, { replacements: r });
        return { updated: true, number: issueNumber, title: issue.title, changes: { status, priority, type } };
      },
    }),

    add_comment: tool({
      description: "Add a comment to an issue.",
      parameters: z.object({
        issueNumber: z.number(),
        body: z.string(),
      }),
      execute: async ({ issueNumber, body }) => {
        const [issue] = await q("SELECT id FROM issues WHERE org_id = :orgId AND number = :num", { orgId, num: issueNumber });
        if (!issue) return { error: `Issue #${issueNumber} not found` };
        const id = uuidv4();
        await sequelize.query(
          "INSERT INTO issue_comments (id, issue_id, user_id, body) VALUES (:id, :issueId, :userId, :body)",
          { replacements: { id, issueId: issue.id, userId, body } }
        );
        return { commented: true, issueNumber, body };
      },
    }),

    // ── Task operations ──────────────────────────────

    update_task: tool({
      description: "Update a task's status, priority, or scope.",
      parameters: z.object({
        title: z.string().describe("Exact or partial title to find the task"),
        status: z.enum(["inbox", "pending", "ongoing", "in_review", "completed", "rejected"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        scope: z.enum(["personal", "team"]).optional(),
      }),
      execute: async ({ title, status, priority, scope }) => {
        const [task] = await q("SELECT id, title FROM tasks WHERE org_id = :orgId AND LOWER(title) LIKE LOWER(:title) LIMIT 1", { orgId, title: `%${title}%` });
        if (!task) return { error: `Task "${title}" not found` };
        const sets = [];
        const r = { id: task.id };
        if (status) { sets.push("status = :status"); r.status = status; }
        if (priority) { sets.push("priority = :priority"); r.priority = priority; }
        if (scope) { sets.push("scope = :scope"); r.scope = scope; }
        if (!sets.length) return { error: "Nothing to update" };
        await sequelize.query(`UPDATE tasks SET ${sets.join(", ")} WHERE id = :id`, { replacements: r });
        return { updated: true, title: task.title, changes: { status, priority, scope } };
      },
    }),

    delete_task: tool({
      description: "Delete a task by title.",
      parameters: z.object({ title: z.string() }),
      execute: async ({ title }) => {
        const [task] = await q("SELECT id, title FROM tasks WHERE org_id = :orgId AND LOWER(title) LIKE LOWER(:title) LIMIT 1", { orgId, title: `%${title}%` });
        if (!task) return { error: `Task "${title}" not found` };
        await sequelize.query("DELETE FROM tasks WHERE id = :id", { replacements: { id: task.id } });
        return { deleted: true, title: task.title };
      },
    }),

    // ── API Key operations ───────────────────────────

    create_api_key: tool({
      description: "Create a new API key in the workspace.",
      parameters: z.object({
        name: z.string(),
        value: z.string().describe("The secret key value"),
        environment: z.enum(["prod", "staging", "dev"]).optional(),
      }),
      execute: async ({ name, value, environment }) => {
        const id = uuidv4();
        const crypto = require("../utils/crypto");
        const encrypted = crypto.encrypt(value);
        const fingerprint = "fp:" + require("crypto").createHash("sha256").update(value).digest("hex").slice(0, 16);
        await sequelize.query(
          `INSERT INTO api_keys (id, org_id, name, fingerprint, encrypted_value, environment, created_by) VALUES (:id, :orgId, :name, :fp, :enc, :env, :userId)`,
          { replacements: { id, orgId, name, fp: fingerprint, enc: encrypted, env: environment || "dev", userId } }
        );
        return { created: true, id, name, environment: environment || "dev" };
      },
    }),

    revoke_api_key: tool({
      description: "Revoke/deactivate an API key by name.",
      parameters: z.object({ name: z.string() }),
      execute: async ({ name }) => {
        const [key] = await q("SELECT id, name FROM api_keys WHERE org_id = :orgId AND LOWER(name) LIKE LOWER(:name) AND is_active = true LIMIT 1", { orgId, name: `%${name}%` });
        if (!key) return { error: `Active key "${name}" not found` };
        await sequelize.query("UPDATE api_keys SET is_active = false WHERE id = :id", { replacements: { id: key.id } });
        return { revoked: true, name: key.name };
      },
    }),

    // ── Group operations ─────────────────────────────

    create_group: tool({
      description: "Create a new group/team.",
      parameters: z.object({
        name: z.string(),
        description: z.string().optional(),
        color: z.string().optional(),
      }),
      execute: async ({ name, description, color }) => {
        const id = uuidv4();
        await sequelize.query(
          `INSERT INTO "groups" (id, org_id, name, description, color, created_by) VALUES (:id, :orgId, :name, :desc, :color, :userId)`,
          { replacements: { id, orgId, name, desc: description || null, color: color || "#5b5bd6", userId } }
        );
        return { created: true, id, name };
      },
    }),

    add_member_to_group: tool({
      description: "Add a user to a group by username or display name.",
      parameters: z.object({
        groupName: z.string(),
        userName: z.string(),
      }),
      execute: async ({ groupName, userName }) => {
        const [group] = await q(`SELECT id, name FROM "groups" WHERE org_id = :orgId AND LOWER(name) = LOWER(:name)`, { orgId, name: groupName });
        if (!group) return { error: `Group "${groupName}" not found` };
        const [user] = await q(
          `SELECT u.id, u.display_name FROM users u JOIN org_members om ON om.user_id = u.id WHERE om.org_id = :orgId AND (LOWER(u.display_name) LIKE LOWER(:name) OR LOWER(u.username) LIKE LOWER(:name)) LIMIT 1`,
          { orgId, name: `%${userName}%` }
        );
        if (!user) return { error: `User "${userName}" not found in this workspace` };
        const [existing] = await q("SELECT id FROM group_members WHERE group_id = :gid AND user_id = :uid", { gid: group.id, uid: user.id });
        if (existing) return { error: `${user.display_name} is already in ${group.name}` };
        await sequelize.query("INSERT INTO group_members (id, group_id, user_id) VALUES (:id, :gid, :uid)", { replacements: { id: uuidv4(), gid: group.id, uid: user.id } });
        return { added: true, user: user.display_name, group: group.name };
      },
    }),

    remove_member_from_group: tool({
      description: "Remove a user from a group.",
      parameters: z.object({
        groupName: z.string(),
        userName: z.string(),
      }),
      execute: async ({ groupName, userName }) => {
        const [group] = await q(`SELECT id, name FROM "groups" WHERE org_id = :orgId AND LOWER(name) = LOWER(:name)`, { orgId, name: groupName });
        if (!group) return { error: `Group "${groupName}" not found` };
        const [user] = await q(
          `SELECT u.id, u.display_name FROM users u JOIN group_members gm ON gm.user_id = u.id WHERE gm.group_id = :gid AND (LOWER(u.display_name) LIKE LOWER(:name) OR LOWER(u.username) LIKE LOWER(:name)) LIMIT 1`,
          { gid: group.id, name: `%${userName}%` }
        );
        if (!user) return { error: `User "${userName}" not found in ${group.name}` };
        await sequelize.query("DELETE FROM group_members WHERE group_id = :gid AND user_id = :uid", { replacements: { gid: group.id, uid: user.id } });
        return { removed: true, user: user.display_name, group: group.name };
      },
    }),

    // ── Org member management ────────────────────────

    change_member_role: tool({
      description: "Change a workspace member's role.",
      parameters: z.object({
        userName: z.string(),
        role: z.enum(["super_admin", "admin", "employee"]),
      }),
      execute: async ({ userName, role }) => {
        const [member] = await q(
          `SELECT u.id, u.display_name, om.role as current_role FROM users u JOIN org_members om ON om.user_id = u.id WHERE om.org_id = :orgId AND (LOWER(u.display_name) LIKE LOWER(:name) OR LOWER(u.username) LIKE LOWER(:name)) LIMIT 1`,
          { orgId, name: `%${userName}%` }
        );
        if (!member) return { error: `User "${userName}" not found` };
        await sequelize.query("UPDATE org_members SET role = :role WHERE org_id = :orgId AND user_id = :uid", { replacements: { role, orgId, uid: member.id } });
        return { updated: true, user: member.display_name, from: member.current_role, to: role };
      },
    }),

    // ── Notifications ────────────────────────────────

    list_notifications: tool({
      description: "List recent notifications for the current user.",
      parameters: z.object({ unreadOnly: z.boolean().optional() }),
      execute: async ({ unreadOnly }) => {
        let sql = `SELECT n.id, n.type, n.title, n.body, n.is_read, n.created_at FROM notifications n WHERE n.recipient_id = :userId`;
        if (unreadOnly) sql += " AND n.is_read = false";
        sql += " ORDER BY n.created_at DESC LIMIT 10";
        return await q(sql, { userId });
      },
    }),

    mark_notifications_read: tool({
      description: "Mark all notifications as read.",
      parameters: z.object({}),
      execute: async () => {
        await sequelize.query("UPDATE notifications SET is_read = true, read_at = NOW() WHERE recipient_id = :userId AND is_read = false", { replacements: { userId } });
        return { done: true };
      },
    }),

    // ── Search ───────────────────────────────────────

    search: tool({
      description: "Search across issues, tasks, keys, and members by keyword.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query: searchQuery }) => {
        const lq = `%${searchQuery}%`;
        const issues = await q("SELECT id, number, title, status, type FROM issues WHERE org_id = :orgId AND LOWER(title) LIKE LOWER(:q) LIMIT 5", { orgId, q: lq });
        const tasks = await q("SELECT id, title, status FROM tasks WHERE org_id = :orgId AND LOWER(title) LIKE LOWER(:q) LIMIT 5", { orgId, q: lq });
        const members = await q(
          `SELECT u.id, u.display_name, u.username FROM users u JOIN org_members om ON om.user_id = u.id WHERE om.org_id = :orgId AND (LOWER(u.display_name) LIKE LOWER(:q) OR LOWER(u.username) LIKE LOWER(:q)) LIMIT 5`,
          { orgId, q: lq }
        );
        return { issues, tasks, members };
      },
    }),
  };
}

module.exports = { createTools };
