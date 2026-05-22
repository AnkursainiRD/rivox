const { ActivityLog, OrgMember, User } = require("../models");

exports.list = async (req, res, next) => {
  try {
    const { entity_type, entity_id, limit = 50, offset = 0 } = req.query;

    const member = await OrgMember.findOne({ where: { org_id: req.params.orgId, user_id: req.user.id } });
    if (!member) return res.status(403).json({ error: "Not a member" });

    const isAdmin = member.role === "super_admin" || member.role === "admin";
    const where = { org_id: req.params.orgId };

    if (!isAdmin) where.user_id = req.user.id;
    if (entity_type) where.entity_type = entity_type;
    if (entity_id) where.entity_id = entity_id;

    const { count: total, rows: logs } = await ActivityLog.findAndCountAll({
      where,
      include: [{ model: User, as: "actor", attributes: ["id", "username", "display_name", "avatar_url"] }],
      order: [["created_at", "DESC"]],
      limit: Number(limit),
      offset: Number(offset),
    });
    res.json({ logs, total, limit: Number(limit), offset: Number(offset) });
  } catch (err) {
    next(err);
  }
};
