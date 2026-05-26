const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");

const authCtrl = require("../controllers/auth.controller");
const orgsCtrl = require("../controllers/orgs.controller");
const groupsCtrl = require("../controllers/groups.controller");
const keysCtrl = require("../controllers/keys.controller");
const tasksCtrl = require("../controllers/tasks.controller");
const issuesCtrl = require("../controllers/issues.controller");
const notifCtrl = require("../controllers/notifications.controller");
const activityCtrl = require("../controllers/activity.controller");

// ── Auth ────────────────────────────────────────────────────
router.post("/auth/session", authCtrl.createSession);
router.get("/auth/poll", authCtrl.pollSession);
router.get("/auth/discord", authCtrl.discordRedirect);
router.get("/auth/discord/callback", authCtrl.discordCallback);
router.get("/auth/me", authCtrl.getMe);
router.post("/auth/discord/disconnect", auth, authCtrl.disconnectDiscord);

// ── All Users (admin only) ──────────────────────────────────
router.get("/users", auth, async (req, res, next) => {
  try {
    const { User } = require("../models");
    if (req.user.role !== "super_admin" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const users = await User.findAll({
      attributes: { exclude: ["password_hash"] },
      order: [["created_at", "DESC"]],
    });
    res.json(users);
  } catch (err) { next(err); }
});

router.patch("/users/:userId/role", auth, async (req, res, next) => {
  try {
    const { User } = require("../models");
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ error: "Super admin access required" });
    }
    const { role } = req.body;
    await User.update({ role }, { where: { id: req.params.userId } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Organizations ───────────────────────────────────────────
router.get("/orgs", auth, orgsCtrl.listAll);
router.post("/orgs", auth, orgsCtrl.create);
router.post("/orgs/:orgId/join", auth, orgsCtrl.joinOrg);
router.get("/orgs/:orgId", auth, orgsCtrl.getById);
router.get("/orgs/:orgId/members", auth, orgsCtrl.getMembers);
router.post("/orgs/:orgId/members", auth, requireRole("super_admin", "admin"), orgsCtrl.addMember);
router.patch("/orgs/:orgId/members/:userId", auth, requireRole("super_admin"), orgsCtrl.updateMemberRole);
router.delete("/orgs/:orgId/members/:userId", auth, requireRole("super_admin", "admin"), orgsCtrl.removeMember);



// ── Groups ──────────────────────────────────────────────────
router.get("/orgs/:orgId/groups", auth, groupsCtrl.list);
router.post("/orgs/:orgId/groups", auth, requireRole("super_admin", "admin"), groupsCtrl.create);
router.get("/groups/:groupId/members", auth, groupsCtrl.getMembers);
router.get("/groups/:groupId/keys", auth, groupsCtrl.getKeys);
router.post("/groups/:groupId/members", auth, groupsCtrl.addMember);
router.delete("/groups/:groupId/members/:userId", auth, groupsCtrl.removeMember);
router.get("/groups/:groupId/permissions", auth, groupsCtrl.getPermissions);
router.put("/groups/:groupId/permissions", auth, groupsCtrl.updatePermission);
router.patch("/groups/:groupId", auth, groupsCtrl.update);
router.delete("/groups/:groupId", auth, groupsCtrl.remove);



// ── API Keys ────────────────────────────────────────────────
router.get("/orgs/:orgId/keys", auth, keysCtrl.list);
router.post("/orgs/:orgId/keys", auth, keysCtrl.create);
router.get("/keys/:keyId", auth, keysCtrl.getById);
router.get("/keys/:keyId/value", auth, keysCtrl.getValue);
router.patch("/keys/:keyId", auth, keysCtrl.update);
router.post("/keys/:keyId/share/user", auth, keysCtrl.shareWithUser);
router.post("/keys/:keyId/share/group", auth, keysCtrl.shareWithGroup);
router.post("/keys/:keyId/revoke", auth, keysCtrl.revoke);
router.delete("/keys/:keyId/access/user/:userId", auth, keysCtrl.removeUserAccess);



// ── Tasks ───────────────────────────────────────────────────
router.get("/orgs/:orgId/tasks", auth, tasksCtrl.list);
router.post("/orgs/:orgId/tasks", auth, tasksCtrl.create);
router.patch("/tasks/:taskId", auth, tasksCtrl.update);
router.delete("/tasks/:taskId", auth, tasksCtrl.remove);

// ── AI Copilot Chat ────────────────────────────────────────
const { handleChat } = require("../ai/chat");

router.post("/chat", auth, async (req, res, next) => {
  try {
    await handleChat(req, res);
  } catch (err) {
    if (!res.headersSent) return next(err);
    res.end();
  }
});

// ── Integrations ───────────────────────────────────────────
const sequelize = require("../db");
const { QueryTypes } = require("sequelize");

router.get("/integrations/discord/status", auth, async (req, res) => {
  const rows = await sequelize.query("SELECT value FROM app_settings WHERE key = 'discord_channel_id'", { type: QueryTypes.SELECT });
  res.json({
    bot_connected: !!process.env.DISCORD_BOT_TOKEN,
    channel_id: rows[0]?.value || null,
  });
});

router.post("/integrations/discord/channel", auth, async (req, res) => {
  const { channel_id } = req.body;
  if (!channel_id) return res.status(400).json({ error: "channel_id required" });
  await sequelize.query(
    `INSERT INTO app_settings (key, value) VALUES ('discord_channel_id', :cid)
     ON CONFLICT (key) DO UPDATE SET value = :cid`,
    { replacements: { cid: channel_id } }
  );
  res.json({ ok: true });
});

router.post("/integrations/discord/test", auth, async (req, res) => {
  const rows = await sequelize.query("SELECT value FROM app_settings WHERE key = 'discord_channel_id'", { type: QueryTypes.SELECT });
  const channelId = rows[0]?.value;
  if (!channelId) return res.status(400).json({ error: "No channel configured" });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return res.status(400).json({ error: "Bot not configured" });
  try {
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "Rivox: Test Message",
          description: "Discord channel notifications are working! You'll see issue updates, key alerts, and team activity here.",
          color: 0x5b5bd6,
          timestamp: new Date().toISOString(),
          footer: { text: `Sent by ${req.user.display_name || req.user.username}` },
        }],
      }),
    });
    const msg = await msgRes.json();
    if (msg.id) return res.json({ ok: true });
    res.status(400).json({ error: msg.message || "Failed to send" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send test message" });
  }
});

// ── Channels (global, not org-scoped) ──────────────────────
const channelsCtrl = require("../controllers/channels.controller");
router.get("/channels", auth, channelsCtrl.list);
router.post("/channels", auth, channelsCtrl.create);
router.get("/channels/:channelId/check", auth, channelsCtrl.check);
router.patch("/channels/:channelId", auth, channelsCtrl.update);
router.delete("/channels/:channelId", auth, channelsCtrl.remove);

// ── Issues (global + org-scoped) ────────────────────────────
router.get("/issues/all", auth, issuesCtrl.list);
router.post("/issues/create", auth, issuesCtrl.create);
router.get("/orgs/:orgId/issues", auth, issuesCtrl.list);
router.post("/orgs/:orgId/issues", auth, issuesCtrl.create);
router.get("/orgs/:orgId/labels", auth, issuesCtrl.listLabels);
router.post("/orgs/:orgId/labels", auth, issuesCtrl.createLabel);
router.get("/issues/:issueId", auth, issuesCtrl.getById);
router.patch("/issues/:issueId", auth, issuesCtrl.update);
router.delete("/issues/:issueId", auth, issuesCtrl.remove);
router.post("/issues/:issueId/notify", auth, issuesCtrl.notify);
router.post("/issues/:issueId/comments", auth, issuesCtrl.addComment);
router.patch("/comments/:commentId", auth, issuesCtrl.updateComment);
router.delete("/comments/:commentId", auth, issuesCtrl.deleteComment);
router.post("/issues/:issueId/labels", auth, issuesCtrl.addLabel);



// ── Notifications ───────────────────────────────────────────
router.get("/notifications/stream", auth, notifCtrl.stream);
router.get("/notifications", auth, notifCtrl.list);
router.patch("/notifications/read-all", auth, notifCtrl.markAllRead);
router.patch("/notifications/:id/read", auth, notifCtrl.markRead);
router.get("/notifications/preferences", auth, notifCtrl.getPreferences);
router.put("/notifications/preferences", auth, notifCtrl.updatePreference);

// ── Activity Logs ───────────────────────────────────────────
router.get("/orgs/:orgId/activity", auth, activityCtrl.list);

module.exports = router;
