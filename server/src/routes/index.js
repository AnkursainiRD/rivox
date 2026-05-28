const router = require("express").Router();
const { auth, requireRole, requireOrgRole, requirePermission } = require("../middleware/auth");

// Module / Action IDs (mirror of server/src/permissions.js)
// Module 1: View Keys       → actions 1 (list), 2 (value)
// Module 2: Manage Keys     → actions 3 (create), 4 (edit), 5 (delete), 6 (revoke)
// Module 3: Use Keys        → action  7 (use/consume)
// Module 4: Sticky Board    → actions 8 (view), 9 (create), 10 (edit), 11 (delete)
// Module 5: Manage Team     → actions 12 (view), 13 (add), 14 (edit role), 15 (remove)
// Module 6: Manage Issues   → actions 16 (view), 17 (create), 18 (edit), 19 (delete)
// Module 7: Billing         → actions 20 (view), 21 (manage)

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

// Delete user (super_admin only) — cascades all related data
router.delete("/users/:userId", auth, async (req, res, next) => {
  try {
    const { User } = require("../models");
    if (req.user.role !== "super_admin") return res.status(403).json({ error: "Super admin access required" });
    if (req.params.userId === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });

    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const sequelize = require("../db");
    // Delete all related data in order
    await sequelize.query("DELETE FROM notification_preferences WHERE user_id = :uid", { replacements: { uid: req.params.userId } });
    await sequelize.query("DELETE FROM notifications WHERE recipient_id = :uid OR sender_id = :uid", { replacements: { uid: req.params.userId } });
    await sequelize.query("DELETE FROM issue_comments WHERE user_id = :uid", { replacements: { uid: req.params.userId } });
    await sequelize.query("DELETE FROM api_key_user_access WHERE user_id = :uid OR granted_by = :uid", { replacements: { uid: req.params.userId } });
    await sequelize.query("DELETE FROM group_members WHERE user_id = :uid", { replacements: { uid: req.params.userId } });
    await sequelize.query("DELETE FROM org_members WHERE user_id = :uid", { replacements: { uid: req.params.userId } });
    await user.destroy();

    res.json({ ok: true });
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
router.patch("/orgs/:orgId", auth, requireRole("super_admin", "admin"), orgsCtrl.update);
router.get("/orgs/:orgId/members", auth, requirePermission(5, 12), orgsCtrl.getMembers);  // view members
router.post("/orgs/:orgId/members", auth, requireRole("super_admin", "admin"), orgsCtrl.addMember);
router.patch("/orgs/:orgId/members/:userId", auth, requireRole("super_admin"), orgsCtrl.updateMemberRole);
router.delete("/orgs/:orgId/members/:userId", auth, requireRole("super_admin", "admin"), orgsCtrl.removeMember);
router.get("/orgs/:orgId/user-permissions", auth, requireRole("super_admin", "admin"), groupsCtrl.getOrgUserPermissions);
router.put("/orgs/:orgId/members/:userId/permissions", auth, requireRole("super_admin", "admin"), groupsCtrl.updateUserPermission);
router.get("/orgs/:orgId/members/:userId/permissions/check", auth, groupsCtrl.checkUserPermission);



// ── Groups ──────────────────────────────────────────────────
router.get("/orgs/:orgId/groups", auth, requirePermission(5, 12), groupsCtrl.list);       // view team/groups
router.post("/orgs/:orgId/groups", auth, requireRole("super_admin", "admin"), groupsCtrl.create);
router.get("/groups/:groupId/members", auth, requireOrgRole("super_admin", "admin", "employee"), groupsCtrl.getMembers);
router.get("/groups/:groupId/keys", auth, requireOrgRole("super_admin", "admin"), groupsCtrl.getKeys);
router.post("/groups/:groupId/members", auth, requireOrgRole("super_admin", "admin"), groupsCtrl.addMember);
router.delete("/groups/:groupId/members/:userId", auth, requireOrgRole("super_admin", "admin"), groupsCtrl.removeMember);
router.get("/groups/:groupId/permissions", auth, requireOrgRole("super_admin", "admin"), groupsCtrl.getPermissions);
router.put("/groups/:groupId/permissions", auth, requireOrgRole("super_admin", "admin"), groupsCtrl.updatePermission);
router.patch("/groups/:groupId", auth, requireOrgRole("super_admin", "admin"), groupsCtrl.update);
router.delete("/groups/:groupId", auth, requireOrgRole("super_admin", "admin"), groupsCtrl.remove);



// ── API Keys ────────────────────────────────────────────────
router.get("/orgs/:orgId/keys", auth, requirePermission(1, 1), keysCtrl.list);           // view key list
router.post("/orgs/:orgId/keys", auth, requireRole("super_admin", "admin"), keysCtrl.create);
router.get("/keys/:keyId", auth, requirePermission(1, 1), keysCtrl.getById);             // view key
router.get("/keys/:keyId/value", auth, requirePermission(1, 2), keysCtrl.getValue);      // view key value
router.patch("/keys/:keyId", auth, requirePermission(2, 4), keysCtrl.update);            // edit key
router.post("/keys/:keyId/share/user", auth, requirePermission(2, 4), keysCtrl.shareWithUser);
router.post("/keys/:keyId/share/group", auth, requirePermission(2, 4), keysCtrl.shareWithGroup);
router.post("/keys/:keyId/revoke", auth, requirePermission(2, 6), keysCtrl.revoke);      // revoke key
router.delete("/keys/:keyId/access/user/:userId", auth, requirePermission(2, 5), keysCtrl.removeUserAccess); // delete access



// ── Tasks (Sticky Board) ────────────────────────────────────
router.get("/orgs/:orgId/tasks", auth, requirePermission(4, 8), tasksCtrl.list);         // view board
router.post("/orgs/:orgId/tasks", auth, requirePermission(4, 9), tasksCtrl.create);      // create note
router.patch("/tasks/:taskId", auth, requirePermission(4, 10), tasksCtrl.update);        // edit note
router.delete("/tasks/:taskId", auth, requirePermission(4, 11), tasksCtrl.remove);       // delete note

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
router.get("/orgs/:orgId/issues", auth, requirePermission(6, 16), issuesCtrl.list);         // view issues
router.post("/orgs/:orgId/issues", auth, requirePermission(6, 17), issuesCtrl.create);      // create issue
router.get("/orgs/:orgId/labels", auth, requirePermission(6, 16), issuesCtrl.listLabels);   // view (same as view issues)
router.post("/orgs/:orgId/labels", auth, requireRole("super_admin", "admin"), issuesCtrl.createLabel);
router.get("/issues/:issueId", auth, requirePermission(6, 16), issuesCtrl.getById);         // view issue
router.patch("/issues/:issueId", auth, requirePermission(6, 18), issuesCtrl.update);        // edit issue
router.delete("/issues/:issueId", auth, requirePermission(6, 19), issuesCtrl.remove);       // delete issue
router.post("/issues/:issueId/notify", auth, requirePermission(6, 16), issuesCtrl.notify);
router.post("/issues/:issueId/comments", auth, requirePermission(6, 18), issuesCtrl.addComment);
router.patch("/comments/:commentId", auth, issuesCtrl.updateComment);
router.delete("/comments/:commentId", auth, issuesCtrl.deleteComment);
router.post("/issues/:issueId/labels", auth, requireRole("super_admin", "admin"), issuesCtrl.addLabel);



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
