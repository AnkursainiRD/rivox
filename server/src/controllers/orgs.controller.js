const { Organization, User, OrgMember } = require("../models");
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
    const orgs = await Organization.findAll({ order: [["created_at", "DESC"]] });

    // Check which orgs the current user is already a member of
    const memberships = await OrgMember.findAll({
      where: { user_id: req.user.id },
      attributes: ["org_id"],
    });
    const memberOrgIds = new Set(memberships.map((m) => m.org_id));

    const result = orgs.map((org) => ({
      ...org.toJSON(),
      is_member: memberOrgIds.has(org.id),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.joinOrg = async (req, res, next) => {
  try {
    const { orgId } = req.params;

    const org = await Organization.findByPk(orgId);
    if (!org) return res.status(404).json({ error: "Organization not found" });

    // Check if already a member
    const existing = await OrgMember.findOne({
      where: { org_id: orgId, user_id: req.user.id },
    });
    if (existing) return res.status(400).json({ error: "Already a member" });

    await OrgMember.create({ org_id: orgId, user_id: req.user.id, role: "employee" });

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
