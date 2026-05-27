const jwt = require("jsonwebtoken");
const { User, OrgMember } = require("../models");
const sequelize = require("../db");
const { QueryTypes } = require("sequelize");

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
function requireRole(...roles) {
  return async (req, res, next) => {
    const orgId = req.params.orgId || req.body.org_id;
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const member = await OrgMember.findOne({ where: { org_id: orgId, user_id: req.user.id } });
    if (!member) return res.status(403).json({ error: "Not a member of this org" });
    if (!roles.includes(member.role)) return res.status(403).json({ error: "Insufficient permission" });

    req.orgRole = member.role;
    next();
  };
}

// Check org role by resolving orgId from a group, key, task, or issue
// Use for routes like /groups/:groupId, /keys/:keyId, /tasks/:taskId, /issues/:issueId
function requireOrgRole(...roles) {
  return async (req, res, next) => {
    try {
      let orgId = req.params.orgId || req.body.org_id;

      // Resolve orgId from entity if not in params
      if (!orgId) {
        const { groupId, keyId, taskId, issueId, commentId } = req.params;

        if (groupId) {
          const [row] = await sequelize.query('SELECT org_id FROM "groups" WHERE id = :id', { replacements: { id: groupId }, type: QueryTypes.SELECT });
          orgId = row?.org_id;
        } else if (keyId) {
          const [row] = await sequelize.query("SELECT org_id FROM api_keys WHERE id = :id", { replacements: { id: keyId }, type: QueryTypes.SELECT });
          orgId = row?.org_id;
        } else if (taskId) {
          const [row] = await sequelize.query("SELECT org_id FROM tasks WHERE id = :id", { replacements: { id: taskId }, type: QueryTypes.SELECT });
          orgId = row?.org_id;
        } else if (issueId) {
          const [row] = await sequelize.query("SELECT org_id FROM issues WHERE id = :id", { replacements: { id: issueId }, type: QueryTypes.SELECT });
          orgId = row?.org_id;
        } else if (commentId) {
          const [row] = await sequelize.query("SELECT i.org_id FROM issue_comments c JOIN issues i ON i.id = c.issue_id WHERE c.id = :id", { replacements: { id: commentId }, type: QueryTypes.SELECT });
          orgId = row?.org_id;
        }
      }

      if (!orgId) return res.status(400).json({ error: "Could not determine organization" });

      const member = await OrgMember.findOne({ where: { org_id: orgId, user_id: req.user.id } });
      if (!member) return res.status(403).json({ error: "Not a member of this org" });
      if (!roles.includes(member.role)) return res.status(403).json({ error: "Insufficient permission" });

      req.orgId = orgId;
      req.orgRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { auth, requireRole, requireOrgRole };
