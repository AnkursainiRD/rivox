const { Op } = require("sequelize");
const { ApiKey, ApiKeyUserAccess, ApiKeyGroupAccess, ApiKeyRevocation, User, Group, GroupMember, OrgMember } = require("../models");
const { logActivity } = require("../utils/log");
const { notify } = require("../utils/notify");
const { encrypt, decrypt } = require("../utils/crypto");

// Check if user can manage a key (owner, admin, or super_admin)
async function canManageKey(key, userId) {
  if (key.created_by === userId) return true;
  const member = await OrgMember.findOne({ where: { org_id: key.org_id, user_id: userId } });
  if (!member) return false;
  return member.role === "super_admin" || member.role === "admin";
}

exports.list = async (req, res, next) => {
  try {
    const groupMemberships = await GroupMember.findAll({ where: { user_id: req.user.id }, attributes: ["group_id"] });
    const groupIds = groupMemberships.map((gm) => gm.group_id);

    const keys = await ApiKey.findAll({
      where: {
        org_id: req.params.orgId,
        is_active: true,
        [Op.or]: [
          { is_global: true },
          { created_by: req.user.id },
          { id: { [Op.in]: ApiKeyUserAccess.sequelize.literal(`(SELECT key_id FROM api_key_user_access WHERE user_id = '${req.user.id}')`) } },
          ...(groupIds.length ? [{ id: { [Op.in]: ApiKeyGroupAccess.sequelize.literal(`(SELECT key_id FROM api_key_group_access WHERE group_id IN (${groupIds.map((g) => `'${g}'`).join(",")}))`) } }] : []),
        ],
      },
      include: [
        { model: User, as: "creator", attributes: ["id", "username", "avatar_url"] },
        { model: User, as: "sharedUsers", attributes: ["id", "username", "avatar_url"], through: { attributes: [] } },
        { model: Group, as: "sharedGroups", attributes: ["id", "name"], through: { attributes: [] } },
      ],
      order: [["created_at", "DESC"]],
    });

    // Add shared count
    const result = keys.map((k) => {
      const j = k.toJSON();
      j.shared_user_count = j.sharedUsers?.length || 0;
      j.shared_group_count = j.sharedGroups?.length || 0;
      j.shared_total = j.shared_user_count + j.shared_group_count;
      return j;
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const crypto = require("crypto");
    const { name, encrypted_value, environment, is_global, auto_rotate } = req.body;
    // Generate a safe hash-based fingerprint — reveals nothing about the key
    const hash = crypto.createHash("sha256").update(encrypted_value).digest("hex");
    const fingerprint = `fp:${hash.slice(0, 16)}`;
    const key = await ApiKey.create({
      org_id: req.params.orgId, name, fingerprint, encrypted_value: encrypt(encrypted_value),
      environment, is_global, auto_rotate, created_by: req.user.id,
    });
    await logActivity(req.params.orgId, req.user.id, "created", "api_key", key.id, { name, environment });
    res.status(201).json(key);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const key = await ApiKey.findByPk(req.params.keyId);
    if (!key) return res.status(404).json({ error: "Key not found" });
    if (!(await canManageKey(key, req.user.id))) return res.status(403).json({ error: "Insufficient permission: only key owner or admin can edit this key" });
    await key.update(req.body);
    await logActivity(key.org_id, req.user.id, "updated", "api_key", key.id, req.body);
    res.json(key);
  } catch (err) {
    next(err);
  }
};

// Decrypt and return the actual key value (only for owner or users with access)
exports.getValue = async (req, res, next) => {
  try {
    const key = await ApiKey.findByPk(req.params.keyId);
    if (!key) return res.status(404).json({ error: "Key not found" });

    // Only owner can see the raw value
    if (key.created_by !== req.user.id) {
      return res.status(403).json({ error: "Only the key owner can view the value" });
    }

    const value = decrypt(key.encrypted_value);
    await logActivity(key.org_id, req.user.id, "copied", "api_key", key.id, { name: key.name });
    res.json({ value });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const key = await ApiKey.findByPk(req.params.keyId, {
      include: [
        { model: User, as: "creator", attributes: ["id", "username", "avatar_url"] },
        { model: User, as: "sharedUsers", attributes: ["id", "username", "display_name", "avatar_url"], through: { attributes: ["permission", "granted_at"] } },
        { model: Group, as: "sharedGroups", attributes: ["id", "name", "color"], through: { attributes: ["permission", "granted_at"] } },
      ],
    });
    if (!key) return res.status(404).json({ error: "Key not found" });
    res.json(key);
  } catch (err) {
    next(err);
  }
};

exports.shareWithUser = async (req, res, next) => {
  try {
    const keyCheck = await ApiKey.findByPk(req.params.keyId);
    if (!keyCheck) return res.status(404).json({ error: "Key not found" });
    if (!(await canManageKey(keyCheck, req.user.id))) return res.status(403).json({ error: "Insufficient permission: only key owner or admin can share this key" });
    const { user_id, permission = "view" } = req.body;
    await ApiKeyUserAccess.upsert({ key_id: req.params.keyId, user_id, permission, granted_by: req.user.id });

    const key = await ApiKey.findByPk(req.params.keyId);
    if (key) {
      await logActivity(key.org_id, req.user.id, "shared", "api_key", key.id, { with_user: user_id, permission });
      await notify(key.org_id, req.user.id, user_id, "key_shared",
        `Key shared: ${key.name}`,
        `${req.user.display_name || req.user.username} shared the ${key.name} key with you.`,
        "api_key", key.id);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.shareWithGroup = async (req, res, next) => {
  try {
    const keyCheck2 = await ApiKey.findByPk(req.params.keyId);
    if (!keyCheck2) return res.status(404).json({ error: "Key not found" });
    if (!(await canManageKey(keyCheck2, req.user.id))) return res.status(403).json({ error: "Insufficient permission: only key owner or admin can share this key" });
    const { group_id, permission = "view" } = req.body;
    await ApiKeyGroupAccess.upsert({ key_id: req.params.keyId, group_id, permission, granted_by: req.user.id });

    const key = await ApiKey.findByPk(req.params.keyId);
    if (key) {
      await logActivity(key.org_id, req.user.id, "shared", "api_key", key.id, { with_group: group_id, permission });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.revoke = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const key = await ApiKey.findByPk(req.params.keyId);
    if (!key) return res.status(404).json({ error: "Key not found" });
    if (!(await canManageKey(key, req.user.id))) return res.status(403).json({ error: "Insufficient permission: only key owner or admin can revoke this key" });

    const keyData = { name: key.name, environment: key.environment, reason };
    const orgId = key.org_id;

    // Delete all related access records first, then the key itself
    await ApiKeyUserAccess.destroy({ where: { key_id: key.id } });
    await ApiKeyGroupAccess.destroy({ where: { key_id: key.id } });
    await ApiKeyRevocation.destroy({ where: { key_id: key.id } });
    await key.destroy();

    await logActivity(orgId, req.user.id, "revoked", "api_key", req.params.keyId, keyData);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.removeUserAccess = async (req, res, next) => {
  try {
    const keyCheck3 = await ApiKey.findByPk(req.params.keyId);
    if (!keyCheck3) return res.status(404).json({ error: "Key not found" });
    if (!(await canManageKey(keyCheck3, req.user.id))) return res.status(403).json({ error: "Insufficient permission: only key owner or admin can remove access" });
    await ApiKeyUserAccess.destroy({ where: { key_id: req.params.keyId, user_id: req.params.userId } });

    const key = await ApiKey.findByPk(req.params.keyId);
    if (key) {
      await notify(key.org_id, req.user.id, req.params.userId, "key_revoked",
        `Access revoked: ${key.name}`, `Your access to ${key.name} was revoked.`, "api_key", key.id);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
