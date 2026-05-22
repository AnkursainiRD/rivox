const { Notification, NotificationPreference, User } = require("../models");

const sseClients = new Map();

exports.sseClients = sseClients;

exports.stream = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("data: {\"type\":\"connected\"}\n\n");

  sseClients.set(req.user.id, res);
  req.on("close", () => sseClients.delete(req.user.id));
};

exports.list = async (req, res, next) => {
  try {
    const { unread_only, limit = 50, offset = 0 } = req.query;
    const where = { recipient_id: req.user.id };
    if (unread_only === "true") where.is_read = false;

    const notifications = await Notification.findAll({
      where,
      include: [{ model: User, as: "sender", attributes: ["id", "username", "display_name", "avatar_url"] }],
      order: [["created_at", "DESC"]],
      limit: Number(limit),
      offset: Number(offset),
    });

    const unread_count = await Notification.count({ where: { recipient_id: req.user.id, is_read: false } });
    res.json({ notifications, unread_count });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { id: req.params.id, recipient_id: req.user.id } }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { recipient_id: req.user.id, is_read: false } }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.getPreferences = async (req, res, next) => {
  try {
    const prefs = await NotificationPreference.findAll({ where: { user_id: req.user.id } });
    res.json(prefs);
  } catch (err) {
    next(err);
  }
};

exports.updatePreference = async (req, res, next) => {
  try {
    const { type, in_app, discord_dm } = req.body;
    await NotificationPreference.upsert({ user_id: req.user.id, type, in_app, discord_dm });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
