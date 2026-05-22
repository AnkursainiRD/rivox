const { Notification, NotificationPreference, User } = require("../models");
const { sseClients } = require("../controllers/notifications.controller");
const sequelize = require("../db");
const { QueryTypes } = require("sequelize");

const typeColors = {
  key_shared: 0x5b5bd6, key_revoked: 0xdc2626, key_rotated: 0xf59e0b,
  task_assigned: 0x10b981, task_status_changed: 0x3b82f6,
  issue_assigned: 0x5b5bd6, issue_commented: 0x71717a, issue_resolved: 0x10b981,
  group_added: 0x3b82f6, group_removed: 0xdc2626, mention: 0xec4899,
};

async function notify(orgId, senderId, recipientId, type, title, body, entityType, entityId) {
  const notif = await Notification.create({
    org_id: orgId,
    recipient_id: recipientId,
    sender_id: senderId,
    type,
    title,
    body,
    entity_type: entityType,
    entity_id: entityId,
  });

  const sender = await User.findByPk(senderId, { attributes: ["id", "username", "display_name", "avatar_url"] });

  // Push via SSE
  const client = sseClients.get(recipientId);
  if (client) {
    const data = JSON.stringify({
      type: "notification",
      notification: {
        id: notif.id, type, title, body,
        entity_type: entityType, entity_id: entityId,
        is_read: false, created_at: notif.created_at,
        sender: sender ? { id: sender.id, username: sender.username, display_name: sender.display_name, avatar_url: sender.avatar_url } : null,
      },
    });
    client.write(`data: ${data}\n\n`);
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return notif.id;

  // Discord DM to recipient
  try {
    const pref = await NotificationPreference.findOne({ where: { user_id: recipientId, type } });
    const shouldDM = !pref || pref.discord_dm;

    if (shouldDM) {
      const user = await User.findByPk(recipientId);
      if (user?.discord_id) {
        await sendDiscordDM(user.discord_id, title, body, notif.id);
      }
    }
  } catch (err) {
    console.error("Discord DM failed:", err.message);
  }

  // Discord channel post
  try {
    const rows = await sequelize.query("SELECT value FROM app_settings WHERE `key` = 'discord_channel_id'", { type: QueryTypes.SELECT });
    const channelId = rows[0]?.value;
    if (channelId) {
      const senderName = sender?.display_name || sender?.username || "Someone";
      await sendDiscordChannel(channelId, type, title, body, senderName);
    }
  } catch (err) {
    console.error("Discord channel post failed:", err.message);
  }

  return notif.id;
}

async function sendDiscordDM(discordUserId, title, body, notifId) {
  const botToken = process.env.DISCORD_BOT_TOKEN;

  const channelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id: discordUserId }),
  });
  const channel = await channelRes.json();

  const msgRes = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title: `Rivox: ${title}`,
        description: body || "",
        color: 0x5b5bd6,
        timestamp: new Date().toISOString(),
      }],
    }),
  });
  const msg = await msgRes.json();

  await Notification.update(
    { discord_sent: true, discord_sent_at: new Date(), discord_msg_id: msg.id },
    { where: { id: notifId } }
  );
}

async function sendDiscordChannel(channelId, type, title, body, senderName) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const color = typeColors[type] || 0x5b5bd6;
  const typeLabel = type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title,
        description: body || "",
        color,
        timestamp: new Date().toISOString(),
        footer: { text: `${typeLabel} · by ${senderName}` },
      }],
    }),
  });
}

module.exports = { notify };
