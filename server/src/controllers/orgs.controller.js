const { Organization, User, OrgMember } = require("../models");
const sequelize = require("../db");
const { QueryTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const { logActivity } = require("../utils/log");

exports.create = async (req, res, next) => {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) return res.status(400).json({ error: "name and slug required" });

    const org = await Organization.create({ name, slug });
    await OrgMember.create({ org_id: org.id, user_id: req.user.id, role: "super_admin" });
    await logActivity(org.id, req.user.id, "created", "org", org.id, { name });

    res.status(201).json(org);
  } catch (err) {
    next(err);
  }
};

exports.listAll = async (req, res, next) => {
  try {
    const orgs = await sequelize.query(
      `SELECT o.id, o.name, o.slug, o.logo_url, o.created_at,
              CASE WHEN my.user_id IS NOT NULL THEN true ELSE false END AS is_member,
              my.role AS my_role,
              CAST((SELECT COUNT(*) FROM org_members WHERE org_id = o.id) AS INTEGER) AS member_count,
              CAST((SELECT COUNT(*) FROM api_keys WHERE org_id = o.id) AS INTEGER) AS key_count
       FROM organizations o
       LEFT JOIN org_members my ON my.org_id = o.id AND my.user_id = :userId
       ORDER BY o.created_at DESC`,
      { replacements: { userId: req.user.id }, type: QueryTypes.SELECT }
    );

    // Fetch top 4 member avatars per org
    const orgIds = orgs.map((o) => o.id);
    if (orgIds.length > 0) {
      const avatars = await sequelize.query(
        `SELECT om.org_id, u.display_name, u.avatar_url
         FROM org_members om JOIN users u ON u.id = om.user_id
         WHERE om.org_id IN (:orgIds)
         ORDER BY om.joined_at ASC`,
        { replacements: { orgIds }, type: QueryTypes.SELECT }
      );

      const avatarMap = {};
      for (const a of avatars) {
        if (!avatarMap[a.org_id]) avatarMap[a.org_id] = [];
        if (avatarMap[a.org_id].length < 4) avatarMap[a.org_id].push(a);
      }
      for (const org of orgs) {
        org.members_preview = avatarMap[org.id] || [];
      }
    }

    res.json(orgs);
  } catch (err) {
    next(err);
  }
};

exports.joinOrg = async (req, res, next) => {
  try {
    const { orgId } = req.params;

    const [org] = await sequelize.query(
      "SELECT * FROM organizations WHERE id = :orgId",
      { replacements: { orgId }, type: QueryTypes.SELECT }
    );
    if (!org) return res.status(404).json({ error: "Organization not found" });

    const [existing] = await sequelize.query(
      "SELECT id FROM org_members WHERE org_id = :orgId AND user_id = :userId",
      { replacements: { orgId, userId: req.user.id }, type: QueryTypes.SELECT }
    );
    if (existing) return res.status(400).json({ error: "Already a member" });

    await sequelize.query(
      "INSERT INTO org_members (id, org_id, user_id, role) VALUES (:id, :orgId, :userId, 'employee')",
      { replacements: { id: uuidv4(), orgId, userId: req.user.id } }
    );

    res.json({ ok: true, org });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.params.orgId);
    if (!org) return res.status(404).json({ error: "Org not found" });
    res.json(org);
  } catch (err) {
    next(err);
  }
};

exports.getMembers = async (req, res, next) => {
  try {
    const members = await OrgMember.findAll({
      where: { org_id: req.params.orgId },
      include: [{ model: User, as: "user", attributes: { exclude: ["password_hash"] } }],
      order: [["joined_at", "ASC"]],
    });
    res.json(members);
  } catch (err) {
    next(err);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { user_id, role = "employee" } = req.body;
    await OrgMember.create({ org_id: req.params.orgId, user_id, role });
    await logActivity(req.params.orgId, req.user.id, "added_member", "org", req.params.orgId, { user_id, role });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    await OrgMember.update({ role }, { where: { org_id: req.params.orgId, user_id: req.params.userId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    await OrgMember.destroy({ where: { org_id: req.params.orgId, user_id: req.params.userId } });
    await logActivity(req.params.orgId, req.user.id, "removed_member", "org", req.params.orgId, { user_id: req.params.userId });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
