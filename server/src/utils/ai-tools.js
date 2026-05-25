const sequelize = require("../db");
const { QueryTypes } = require("sequelize");

// ── Tool definitions (sent to Claude) ─────────────────────

const definitions = [
  {
    name: "list_issues",
    description: "List issues in the current workspace. Can filter by status, priority, type, or assignee.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "in_progress", "resolved", "closed", "wont_fix"], description: "Filter by status" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Filter by priority" },
        type: { type: "string", enum: ["bug", "feature", "improvement", "task"], description: "Filter by type" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "create_issue",
    description: "Create a new issue in the workspace.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Issue title" },
        description: { type: "string", description: "Issue description" },
        type: { type: "string", enum: ["bug", "feature", "improvement", "task"], description: "Issue type" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Priority level" },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description: "List sticky board tasks. Can filter by status or scope.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["inbox", "pending", "ongoing", "in_review", "completed", "rejected"] },
        scope: { type: "string", enum: ["personal", "team"] },
        limit: { type: "number", description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "create_task",
    description: "Create a new sticky board task.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        body: { type: "string", description: "Task body/details" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        scope: { type: "string", enum: ["personal", "team"] },
      },
      required: ["title"],
    },
  },
  {
    name: "list_api_keys",
    description: "List API keys in the workspace.",
    input_schema: {
      type: "object",
      properties: {
        environment: { type: "string", enum: ["prod", "staging", "dev"], description: "Filter by environment" },
      },
    },
  },
  {
    name: "list_members",
    description: "List team members in the current workspace.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_groups",
    description: "List groups/teams in the workspace.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_activity",
    description: "Get recent activity log for the workspace.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "navigate",
    description: "Navigate the user to a page in the app. Use when the user says 'show me', 'go to', 'open', or 'take me to' a page. Pages: issues, sticky-board, team, settings, notifications, organizations, help, api-keys (home).",
    input_schema: {
      type: "object",
      properties: {
        page: { type: "string", enum: ["issues", "sticky-board", "team", "settings", "notifications", "organizations", "help", "/"], description: "Page to navigate to" },
      },
      required: ["page"],
    },
  },
  {
    name: "open_issue",
    description: "Open a specific issue detail page by issue number or ID.",
    input_schema: {
      type: "object",
      properties: {
        issueNumber: { type: "number", description: "Issue number (e.g. 9)" },
        issueId: { type: "string", description: "Issue UUID" },
      },
    },
  },
];

// ── Tool executors ────────────────────────────────────────

async function execute(name, params, { orgId, userId }) {
  const q = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

  switch (name) {
    case "list_issues": {
      let sql = "SELECT id, number, title, status, priority, type, created_at FROM issues WHERE org_id = :orgId";
      const r = { orgId };
      if (params.status) { sql += " AND status = :status"; r.status = params.status; }
      if (params.priority) { sql += " AND priority = :priority"; r.priority = params.priority; }
      if (params.type) { sql += " AND type = :type"; r.type = params.type; }
      sql += " ORDER BY created_at DESC LIMIT :limit";
      r.limit = params.limit || 10;
      return await q(sql, r);
    }

    case "create_issue": {
      const id = require("uuid").v4();
      await sequelize.query(
        `INSERT INTO issues (id, org_id, title, description, type, priority, reported_by)
         VALUES (:id, :orgId, :title, :desc, :type, :priority, :userId)`,
        { replacements: { id, orgId, title: params.title, desc: params.description || null, type: params.type || "bug", priority: params.priority || "medium", userId } }
      );
      return { created: true, id, title: params.title };
    }

    case "list_tasks": {
      let sql = "SELECT id, title, status, priority, scope, color FROM tasks WHERE org_id = :orgId";
      const r = { orgId };
      if (params.status) { sql += " AND status = :status"; r.status = params.status; }
      if (params.scope) { sql += " AND scope = :scope"; r.scope = params.scope; }
      sql += " ORDER BY created_at DESC LIMIT :limit";
      r.limit = params.limit || 10;
      return await q(sql, r);
    }

    case "create_task": {
      const id = require("uuid").v4();
      await sequelize.query(
        `INSERT INTO tasks (id, org_id, title, body, priority, scope, created_by)
         VALUES (:id, :orgId, :title, :body, :priority, :scope, :userId)`,
        { replacements: { id, orgId, title: params.title, body: params.body || null, priority: params.priority || "medium", scope: params.scope || "personal", userId } }
      );
      return { created: true, id, title: params.title };
    }

    case "list_api_keys": {
      let sql = "SELECT id, name, environment, is_active, fingerprint FROM api_keys WHERE org_id = :orgId";
      const r = { orgId };
      if (params.environment) { sql += " AND environment = :env"; r.env = params.environment; }
      sql += " ORDER BY created_at DESC";
      return await q(sql, r);
    }

    case "list_members": {
      return await q(
        `SELECT u.id, u.display_name, u.username, u.email, om.role
         FROM org_members om JOIN users u ON u.id = om.user_id
         WHERE om.org_id = :orgId ORDER BY om.joined_at DESC`,
        { orgId }
      );
    }

    case "list_groups": {
      return await q(
        `SELECT id, name, description, color FROM "groups" WHERE org_id = :orgId ORDER BY created_at DESC`,
        { orgId }
      );
    }

    case "get_activity": {
      return await q(
        `SELECT action, entity_type, details, created_at
         FROM activity_logs WHERE org_id = :orgId ORDER BY created_at DESC LIMIT :limit`,
        { orgId, limit: params.limit || 10 }
      );
    }

    case "navigate": {
      const routes = { "issues": "/issues", "sticky-board": "/sticky-board", "team": "/team", "settings": "/settings", "notifications": "/notifications", "organizations": "/organizations", "help": "/help", "/": "/" };
      return { __action: "navigate", path: routes[params.page] || "/" };
    }

    case "open_issue": {
      if (params.issueId) return { __action: "navigate", path: `/issues/${params.issueId}` };
      if (params.issueNumber) {
        const [issue] = await q("SELECT id FROM issues WHERE org_id = :orgId AND number = :num", { orgId, num: params.issueNumber });
        if (issue) return { __action: "navigate", path: `/issues/${issue.id}` };
        return { error: `Issue #${params.issueNumber} not found` };
      }
      return { error: "Provide issueNumber or issueId" };
    }

    default:
      return { error: "Unknown tool" };
  }
}

module.exports = { definitions, execute };
