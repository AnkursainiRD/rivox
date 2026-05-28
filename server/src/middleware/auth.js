const jwt = require("jsonwebtoken");
const { User, OrgMember, Group, ApiKey, Task, Issue, UserPermission } = require("../models");
const sequelize = require("../db");
const { QueryTypes } = require("sequelize");
const { hasPermission } = require("../permissions");

async function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.query.token;
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Check org-level role from org_members table
// Works with :orgId in params OR org_id in body
// Global super_admin always passes regardless of org-level role
function requireRole(...roles) {
  return async (req, res, next) => {
    const orgId = req.params.orgId || req.body?.org_id;
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const member = await OrgMember.findOne({ where: { org_id: orgId, user_id: req.user.id } });
    if (!member) return res.status(403).json({ error: "Not a member of this org" });

    // Global super_admin bypasses org-level role restriction
    const effectiveRole = req.user.role === "super_admin" ? "super_admin" : member.role;
    if (!roles.includes(effectiveRole)) return res.status(403).json({ error: "Insufficient permission" });

    req.orgRole = member.role;
    next();
  };
}

// Check org role by resolving orgId from a group, key, task, or issue
// Use for routes like /groups/:groupId, /keys/:keyId, /tasks/:taskId, /issues/:issueId
function requireOrgRole(...roles) {
  return async (req, res, next) => {
    try {
      let orgId = req.params.orgId || req.body?.org_id;

      // Resolve orgId from entity if not in params
      if (!orgId) {
        const { groupId, keyId, taskId, issueId, commentId } = req.params;

        if (groupId) {
          const g = await Group.findByPk(groupId, { attributes: ["org_id"] });
          orgId = g?.org_id;
        } else if (keyId) {
          const k = await ApiKey.findByPk(keyId, { attributes: ["org_id"] });
          orgId = k?.org_id;
        } else if (taskId) {
          const t = await Task.findByPk(taskId, { attributes: ["org_id"] });
          orgId = t?.org_id;
        } else if (issueId) {
          const iss = await Issue.findByPk(issueId, { attributes: ["org_id"] });
          orgId = iss?.org_id;
        } else if (commentId) {
          const [row] = await sequelize.query("SELECT i.org_id FROM issue_comments c JOIN issues i ON i.id = c.issue_id WHERE c.id = :id", { replacements: { id: commentId }, type: QueryTypes.SELECT });
          orgId = row?.org_id;
        }
      }

      if (!orgId) return res.status(400).json({ error: "Could not determine organization" });

      const member = await OrgMember.findOne({ where: { org_id: orgId, user_id: req.user.id } });
      if (!member) return res.status(403).json({ error: "Not a member of this org" });

      const effectiveRole = req.user.role === "super_admin" ? "super_admin" : member.role;
      if (!roles.includes(effectiveRole)) return res.status(403).json({ error: "Insufficient permission" });

      req.orgId = orgId;
      req.orgRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * requirePermission(moduleId, actionId)
 *
 * Middleware that checks whether the authenticated user has a specific
 * module+action permission for the org.
 *
 * Rules:
 *   - super_admin / admin  → always allowed (bypasses permission check)
 *   - employee             → must have an explicit UserPermission row
 *
 * orgId is resolved from: req.params.orgId → req.body.org_id → entity lookup
 * (same resolution chain as requireOrgRole)
 */
function requirePermission(moduleId, actionId) {
  return async (req, res, next) => {
    try {
      let orgId = req.params.orgId || req.body?.org_id;

      if (!orgId) {
        const { groupId, keyId, taskId, issueId } = req.params;
        if (groupId) {
          const g = await Group.findByPk(groupId, { attributes: ["org_id"] });
          orgId = g?.org_id;
        } else if (keyId) {
          const k = await ApiKey.findByPk(keyId, { attributes: ["org_id"] });
          orgId = k?.org_id;
        } else if (taskId) {
          const t = await Task.findByPk(taskId, { attributes: ["org_id"] });
          orgId = t?.org_id;
        } else if (issueId) {
          const iss = await Issue.findByPk(issueId, { attributes: ["org_id"] });
          orgId = iss?.org_id;
        }
      }

      if (!orgId) return res.status(400).json({ error: "Could not determine organization" });

      const member = await OrgMember.findOne({ where: { org_id: orgId, user_id: req.user.id } });
      if (!member) return res.status(403).json({ error: "Not a member of this org" });

      // super_admin and admin always pass
      if (member.role === "super_admin" || member.role === "admin") {
        req.orgId = orgId;
        req.orgRole = member.role;
        return next();
      }

      // employees must have an explicit grant
      const granted = await hasPermission(UserPermission, req.user.id, orgId, moduleId, actionId);
      if (!granted) {
        return res.status(403).json({ error: "Permission denied", module_id: moduleId, action_id: actionId });
      }

      req.orgId = orgId;
      req.orgRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { auth, requireRole, requireOrgRole, requirePermission };
