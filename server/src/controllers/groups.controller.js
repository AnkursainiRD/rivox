const { Group, GroupMember, GroupPermission, User, ApiKey, ApiKeyGroupAccess } = require("../models");
const { logActivity } = require("../utils/log");
const { notify } = require("../utils/notify");

exports.list = async (req, res, next) => {
  try {
    const groups = await Group.findAll({
      where: { org_id: req.params.orgId },
      include: [{ model: User, as: "members", attributes: ["id"], through: { attributes: [] } }],
      order: [["name", "ASC"]],
    });

    // Get key counts per group
    const keyCounts = await ApiKeyGroupAccess.findAll({
      attributes: ["group_id", [require("sequelize").fn("COUNT", require("sequelize").col("key_id")), "key_count"]],
      where: { group_id: groups.map((g) => g.id) },
      group: ["group_id"],
    });
    const keyCountMap = Object.fromEntries(keyCounts.map((k) => [k.group_id, parseInt(k.getDataValue("key_count")) || 0]));

    res.json(groups.map((g) => ({ ...g.toJSON(), member_count: g.members.length, key_count: keyCountMap[g.id] || 0, members: undefined })));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    const group = await Group.create({ org_id: req.params.orgId, name, description, color, created_by: req.user.id });
    await logActivity(req.params.orgId, req.user.id, "created", "group", group.id, { name });
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
};

exports.getMembers = async (req, res, next) => {
  try {
    const members = await GroupMember.findAll({
      where: { group_id: req.params.groupId },
      include: [{ model: User, as: "user", attributes: { exclude: ["password_hash"] } }],
    });
    res.json(members);
  } catch (err) {
    next(err);
  }
};

exports.getKeys = async (req, res, next) => {
  try {
    const access = await ApiKeyGroupAccess.findAll({
      where: { group_id: req.params.groupId },
      include: [{ model: ApiKey, as: "key", attributes: ["id", "name", "fingerprint", "environment"] }],
    });
    res.json(access.map((a) => ({ ...a.toJSON().key, permission: a.permission })));
  } catch (err) {
    next(err);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { user_id } = req.body;
    await GroupMember.create({ group_id: req.params.groupId, user_id });

    const group = await Group.findByPk(req.params.groupId);
    if (group) {
      await logActivity(group.org_id, req.user.id, "added_member", "group", group.id, { user_id });
      await notify(group.org_id, req.user.id, user_id, "group_added",
        `Added to ${group.name}`, `You were added to the ${group.name} group.`, "group", group.id);
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    await GroupMember.destroy({ where: { group_id: req.params.groupId, user_id: req.params.userId } });

    const group = await Group.findByPk(req.params.groupId);
    if (group) {
      await logActivity(group.org_id, req.user.id, "removed_member", "group", group.id, { user_id: req.params.userId });
      await notify(group.org_id, req.user.id, req.params.userId, "group_removed",
        `Removed from ${group.name}`, `You were removed from the ${group.name} group.`, "group", group.id);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.getPermissions = async (req, res, next) => {
  try {
    const perms = await GroupPermission.findAll({ where: { group_id: req.params.groupId } });
    res.json(perms);
  } catch (err) {
    next(err);
  }
};

exports.updatePermission = async (req, res, next) => {
  try {
    const { capability, level } = req.body;
    const groupId = req.params.groupId;
    if (level === "none") {
      await GroupPermission.destroy({ where: { group_id: groupId, capability } });
    } else {
      const existing = await GroupPermission.findOne({ where: { group_id: groupId, capability } });
      if (existing) {
        await existing.update({ level });
      } else {
        await GroupPermission.create({ group_id: groupId, capability, level });
      }
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const group = await Group.findByPk(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    await group.update(req.body);
    res.json(group);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await Group.destroy({ where: { id: req.params.groupId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ── USER PERMISSIONS ──────────────────────────────────────────────────────

const { UserPermission } = require("../models");
const { hasPermission } = require("../permissions");

/**
 * GET /orgs/:orgId/user-permissions
 * Returns all granted action IDs per user for this org.
 * Response: [{ user_id, module_id, action_id }]
 */
exports.getOrgUserPermissions = async (req, res, next) => {
  try {
    const perms = await UserPermission.findAll({
      where: { org_id: req.params.orgId },
      attributes: ["user_id", "module_id", "action_id"],
    });
    res.json(perms);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /orgs/:orgId/members/:userId/permissions
 * Grant or revoke a specific action for a user.
 * Body: { module_id: number, action_id: number, granted: boolean }
 */
exports.updateUserPermission = async (req, res, next) => {
  try {
    const { orgId, userId } = req.params;
    const { module_id, action_id, granted } = req.body;
    if (granted) {
      await UserPermission.upsert({ org_id: orgId, user_id: userId, module_id, action_id });
    } else {
      await UserPermission.destroy({ where: { org_id: orgId, user_id: userId, module_id, action_id } });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /orgs/:orgId/members/:userId/permissions/check?module_id=2&action_id=4
 * Helper endpoint: check if a specific user has a specific permission.
 * Response: { granted: boolean }
 */
exports.checkUserPermission = async (req, res, next) => {
  try {
    const { orgId, userId } = req.params;
    const { module_id, action_id } = req.query;
    const granted = await hasPermission(
      UserPermission, userId, orgId,
      Number(module_id), Number(action_id)
    );
    res.json({ granted });
  } catch (err) {
    next(err);
  }
};
