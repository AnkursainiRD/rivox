const { Channel, Issue, User } = require("../models");

exports.list = async (req, res, next) => {
  try {
    const channels = await Channel.findAll({
      include: [{ model: User, as: "creator", attributes: ["id", "username", "display_name", "avatar_url"] }],
      order: [["name", "ASC"]],
    });

    const result = await Promise.all(
      channels.map(async (ch) => {
        const issue_count = await Issue.count({ where: { channel_id: ch.id } });
        return { ...ch.toJSON(), issue_count };
      })
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });

    const channel = await Channel.create({
      created_by: req.user.id,
      name: name.trim(),
      description: description?.trim() || null,
      color: color || null,
    });
    res.status(201).json(channel);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Channel name already exists" });
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const channel = await Channel.findByPk(req.params.channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    await channel.update(req.body);
    res.json(channel);
  } catch (err) {
    next(err);
  }
};

exports.check = async (req, res, next) => {
  try {
    const { Op } = require("sequelize");
    const channel = await Channel.findByPk(req.params.channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const activeCount = await Issue.count({
      where: { channel_id: req.params.channelId, status: { [Op.in]: ["open", "in_progress"] } },
    });
    const totalCount = await Issue.count({ where: { channel_id: req.params.channelId } });

    res.json({ name: channel.name, active_issues: activeCount, total_issues: totalCount });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await Issue.update({ channel_id: null }, { where: { channel_id: req.params.channelId } });
    await Channel.destroy({ where: { id: req.params.channelId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
