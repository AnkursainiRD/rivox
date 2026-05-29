// Discord bot listener — routes messages to Rivox AI chat handler

const sequelize = require("../db");
const { QueryTypes } = require("sequelize");

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID_KEY = "discord_channel_id";

// Simple Discord API helper
async function discordApi(endpoint, { method = "GET", body } = {}) {
  const res = await fetch(`https://discord.com/api/v10${endpoint}`, {
    method,
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// Find Rivox user by Discord ID
async function findUser(discordId) {
  const [user] = await sequelize.query(
    "SELECT id, display_name, username, role FROM users WHERE discord_id = :did",
    { replacements: { did: discordId }, type: QueryTypes.SELECT }
  );
  return user;
}

// Per-user org selection cache (discordId → orgId)
const userOrgCache = {};

// Per-user conversation history (discordId → last 5 messages)
const conversationHistory = {};
const MAX_HISTORY = 5;

// Find user's orgs
async function findUserOrgs(userId) {
  return await sequelize.query(
    "SELECT om.org_id, o.name FROM org_members om JOIN organizations o ON o.id = om.org_id WHERE om.user_id = :uid ORDER BY o.name",
    { replacements: { uid: userId }, type: QueryTypes.SELECT }
  );
}

// Get or pick org for a Discord user
async function findUserOrg(userId, discordId) {
  // Check cache
  if (userOrgCache[discordId]) return userOrgCache[discordId];

  const orgs = await findUserOrgs(userId);
  if (orgs.length === 0) return null;
  if (orgs.length === 1) {
    userOrgCache[discordId] = orgs[0].org_id;
    return orgs[0].org_id;
  }

  // Multiple orgs — return null to trigger selection prompt
  return null;
}

// Handle org switching command
function parseOrgSwitch(content, orgs) {
  const lower = content.toLowerCase();
  // Check "use <org name>" or "switch to <org name>"
  for (const org of orgs) {
    if (lower.includes(org.name.toLowerCase())) {
      return org.org_id;
    }
  }
  // Check by number "1", "2" etc
  const num = parseInt(content);
  if (num >= 1 && num <= orgs.length) return orgs[num - 1].org_id;
  return null;
}

// Get configured channel ID
async function getChannelId() {
  const [row] = await sequelize.query(
    "SELECT value FROM app_settings WHERE key = 'discord_channel_id'",
    { type: QueryTypes.SELECT }
  );
  return row?.value;
}

// Format tool result for Discord embed
function formatToolResult(toolName, result) {
  if (result?.error) return { title: "Error", description: result.error, color: 0xef4444 };

  switch (toolName) {
    case "list_issues": {
      const items = Array.isArray(result) ? result : [];
      return {
        title: `📋 ${items.length} Issues`,
        description: items.slice(0, 8).map((i) => `\`#${i.number}\` ${i.title} · *${i.status}*`).join("\n") || "No issues found.",
        color: 0x5b5bd6,
      };
    }
    case "create_issue":
      return { title: "✅ Issue Created", description: `**${result.title}**`, color: 0x16a34a };
    case "list_tasks": {
      const items = Array.isArray(result) ? result : [];
      return {
        title: `📝 ${items.length} Tasks`,
        description: items.slice(0, 8).map((t) => `• ${t.title} · *${t.status}*`).join("\n") || "No tasks.",
        color: 0x5b5bd6,
      };
    }
    case "create_task":
      return { title: "✅ Task Created", description: `**${result.title}**`, color: 0x16a34a };
    case "list_api_keys": {
      const items = Array.isArray(result) ? result : [];
      return {
        title: `🔑 ${items.length} API Keys`,
        description: items.map((k) => `• **${k.name}** · \`${k.fingerprint}\` · ${k.environment}`).join("\n") || "No keys.",
        color: 0x5b5bd6,
      };
    }
    case "list_members": {
      const items = Array.isArray(result) ? result : [];
      return {
        title: `👥 ${items.length} Members`,
        description: items.slice(0, 10).map((m) => `• **${m.display_name || m.username}** · ${m.role}`).join("\n"),
        color: 0x5b5bd6,
      };
    }
    case "list_groups": {
      const items = Array.isArray(result) ? result : [];
      return {
        title: `🏷️ ${items.length} Groups`,
        description: items.map((g) => `• **${g.name}**${g.description ? ` — ${g.description}` : ""}`).join("\n"),
        color: 0x5b5bd6,
      };
    }
    case "get_group_members": {
      const items = Array.isArray(result) ? result : [];
      return {
        title: `👥 ${items.length} Group Members`,
        description: items.map((m) => `• **${m.display_name || m.username}** (@${m.username})`).join("\n"),
        color: 0x5b5bd6,
      };
    }
    case "create_issue":
      return { title: "✅ Issue Created", description: `**${result.title}**`, color: 0x16a34a };
    case "update_issue":
      return { title: "✅ Issue Updated", description: `**#${result.number}** ${result.title}`, color: 0x16a34a };
    case "add_comment":
      return { title: "💬 Comment Added", description: `On **#${result.issueNumber}**\n${result.body?.slice(0, 200)}`, color: 0x5b5bd6 };
    case "create_task":
      return { title: "✅ Task Created", description: `**${result.title}**`, color: 0x16a34a };
    case "update_task":
      return { title: "✅ Task Updated", description: `**${result.title}**`, color: 0x16a34a };
    case "delete_task":
      return { title: "🗑️ Task Deleted", description: `**${result.title}**`, color: 0xef4444 };
    case "create_api_key":
      return { title: "🔑 Key Created", description: `**${result.name}** · ${result.environment}`, color: 0x16a34a };
    case "revoke_api_key":
      return { title: "🔑 Key Revoked", description: `**${result.name}**`, color: 0xef4444 };
    case "create_group":
      return { title: "✅ Group Created", description: `**${result.name}**`, color: 0x16a34a };
    case "add_member_to_group":
      return { title: "👤 Member Added", description: `**${result.user}** → ${result.group}`, color: 0x16a34a };
    case "remove_member_from_group":
      return { title: "👤 Member Removed", description: `**${result.user}** from ${result.group}`, color: 0xef4444 };
    case "change_member_role":
      return { title: "🛡️ Role Changed", description: `**${result.user}**: ${result.from} → ${result.to}`, color: 0x5b5bd6 };
    case "list_notifications": {
      const items = Array.isArray(result) ? result : [];
      return { title: `🔔 ${items.length} Notifications`, description: items.slice(0, 5).map((n) => `${n.is_read ? "☑" : "🔵"} ${n.title}`).join("\n") || "No notifications.", color: 0x5b5bd6 };
    }
    case "mark_notifications_read":
      return { title: "✅ Notifications Cleared", description: "All marked as read.", color: 0x16a34a };
    case "get_activity": {
      const items = Array.isArray(result) ? result : [];
      return { title: "📊 Recent Activity", description: items.slice(0, 5).map((a) => `• ${a.action.replace(/_/g, " ")} · ${a.entity_type}`).join("\n") || "No activity.", color: 0x5b5bd6 };
    }
    case "search": {
      const parts = [];
      if (result.issues?.length) parts.push(`**Issues:** ${result.issues.map((i) => `#${i.number} ${i.title}`).join(", ")}`);
      if (result.tasks?.length) parts.push(`**Tasks:** ${result.tasks.map((t) => t.title).join(", ")}`);
      if (result.members?.length) parts.push(`**People:** ${result.members.map((m) => m.display_name).join(", ")}`);
      return { title: "🔍 Search Results", description: parts.join("\n") || "No results.", color: 0x5b5bd6 };
    }
    case "get_issue":
      return { title: `#${result.number} ${result.title}`, description: `${result.type} · ${result.status} · ${result.priority}\n${result.description?.slice(0, 300) || ""}`, color: 0x5b5bd6 };
    case "navigate":
      return { title: "🔗 Navigation", description: `Opened **${result.path}**`, color: 0x7c7cf0 };
    default: {
      // Smart fallback — format common action patterns
      if (result.created) return { title: "✅ Created", description: result.title || result.name || "Done", color: 0x16a34a };
      if (result.updated) return { title: "✅ Updated", description: result.title || result.name || "Done", color: 0x16a34a };
      if (result.deleted) return { title: "🗑️ Deleted", description: result.title || result.name || "Done", color: 0xef4444 };
      if (result.error) return { title: "❌ Error", description: result.error, color: 0xef4444 };
      return { title: "✅ Done", description: "Action completed.", color: 0x16a34a };
    }
  }
}

// Process a message by calling the local /api/chat endpoint
async function processMessage(userMessage, discordUserId) {
  const user = await findUser(discordUserId);
  if (!user) return { text: "You're not linked to a Rivox account. Sign in via Discord in the Rivox app first." };

  const orgs = await findUserOrgs(user.id);
  if (orgs.length === 0) return { text: "You're not in any workspace yet. Join one in the Rivox app." };

  // Check if user is trying to switch org
  const switchedOrg = parseOrgSwitch(userMessage, orgs);
  if (switchedOrg) {
    userOrgCache[discordUserId] = switchedOrg;
    const orgName = orgs.find((o) => o.org_id === switchedOrg)?.name;
    return { text: `Switched to **${orgName}**. What would you like to do?` };
  }

  let orgId = userOrgCache[discordUserId];

  // If no org cached and multiple orgs, ask
  if (!orgId && orgs.length > 1) {
    const list = orgs.map((o, i) => `**${i + 1}.** ${o.name}`).join("\n");
    return { text: `You're in ${orgs.length} workspaces. Which one?\n\n${list}\n\nReply with the name or number.` };
  }

  if (!orgId) {
    orgId = orgs[0].org_id;
    userOrgCache[discordUserId] = orgId;
  }

  // Use @yourgpt/llm-sdk generateText for Discord (non-streaming, works in non-HTTP context)
  const { generateText } = require("@yourgpt/llm-sdk");
  const { MODEL, SYSTEM_PROMPT, MAX_STEPS, MAX_TOKENS } = require("./config");
  const { createTools } = require("./tools");

  const tools = createTools(orgId, user.id);

  const result = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT + "\nYou are responding via Discord. Keep responses brief. No markdown tables.",
    messages: (() => {
      if (!conversationHistory[discordUserId]) conversationHistory[discordUserId] = [];
      const history = conversationHistory[discordUserId];
      history.push({ role: "user", content: userMessage });
      while (history.length > MAX_HISTORY * 2) history.shift();
      return [...history];
    })(),
    tools,
    maxSteps: MAX_STEPS,
    maxTokens: MAX_TOKENS,
  });

  // Save assistant response to history
  if (conversationHistory[discordUserId] && result.text) {
    conversationHistory[discordUserId].push({ role: "assistant", content: result.text });
    while (conversationHistory[discordUserId].length > MAX_HISTORY * 2) conversationHistory[discordUserId].shift();
  }

  // Collect tool results for embeds
  const embeds = [];
  if (result.steps) {
    for (const step of result.steps) {
      for (const tr of (step.toolResults || [])) {
        const toolCall = (step.toolCalls || []).find((tc) => tc.id === tr.toolCallId);
        const toolName = toolCall?.name;
        if (toolName && tr.result && !tr.result?.__action) {
          embeds.push(formatToolResult(toolName, tr.result));
        }
      }
    }
  }

  return { text: (result.text || "").trim(), embeds };
}

// Discord Gateway connection (simplified — uses HTTP polling for messages)
// For production, use discord.js with gateway. This uses the simpler approach.
let lastMessageId = null;
let polling = false;
const processedMessages = new Set(); // track IDs we've already handled

async function pollMessages() {
  if (polling) return;
  polling = true;

  try {
    const channelId = await getChannelId();
    if (!channelId) return;

    const url = lastMessageId
      ? `/channels/${channelId}/messages?after=${lastMessageId}&limit=10`
      : `/channels/${channelId}/messages?limit=1`;

    const messages = await discordApi(url);

    if (!Array.isArray(messages) || messages.length === 0) return;

    // Update cursor to newest message immediately
    lastMessageId = messages[0].id;

    // Process messages oldest-first
    for (const msg of [...messages].reverse()) {
      // Skip if already processed, bot message, or own message
      if (processedMessages.has(msg.id)) continue;
      processedMessages.add(msg.id);
      if (msg.author.bot || msg.author.id === process.env.DISCORD_CLIENT_ID) continue;

      // Check if bot is mentioned (via mention_roles or content) or any message in the dedicated channel
      const botId = process.env.DISCORD_CLIENT_ID;
      const botMentioned = msg.content.includes(`<@${botId}>`) || msg.content.includes(`<@!${botId}>`) || msg.mention_roles?.length > 0;

      // If content is empty (Message Content Intent not enabled), the bot was likely mentioned
      // In a dedicated Rivox channel, respond to ALL non-bot messages
      const hasContent = msg.content && msg.content.trim().length > 0;

      console.log(`[Discord] msg from ${msg.author.username}: content="${msg.content.slice(0, 50)}" | hasContent=${hasContent} | mentioned=${botMentioned}`);

      // Clean the message — strip all mention formats
      let content = msg.content
        .replace(/^!rivox\s*/i, "")
        .replace(/^\/rivox\s*/i, "")
        .replace(/<@[!&]?\d+>/g, "")
        .trim() || "hello";

      // Show typing indicator
      discordApi(`/channels/${channelId}/typing`, { method: "POST" }).catch(() => {});

      // Process through AI
      try {
        console.log(`[Discord] Processing: "${content}" for user discord=${msg.author.id}`);
        let response;
        try {
          response = await processMessage(content, msg.author.id);
        } catch (innerErr) {
          console.error(`[Discord] processMessage CRASHED:`, innerErr.message, innerErr.stack?.split('\n').slice(0, 5).join('\n'));
          response = { text: "Sorry, I ran into an error: " + innerErr.message, embeds: [] };
        }
        console.log(`[Discord] Response: text="${response.text?.slice(0, 80)}" embeds=${response.embeds?.length}`);

        const payload = {
          message_reference: { message_id: msg.id },
        };

        if (response.text) {
          payload.content = response.text.slice(0, 2000);
        }

        if (response.embeds?.length) {
          payload.embeds = response.embeds.slice(0, 5).map((e) => ({
            title: e.title,
            description: e.description?.slice(0, 4096),
            color: e.color,
            footer: { text: "Rivox AI · Powered by Rivox" },
          }));
        }

        if (!payload.content && !payload.embeds?.length) {
          payload.content = "Done!";
        }

        await discordApi(`/channels/${channelId}/messages`, {
          method: "POST",
          body: payload,
        });
      } catch (err) {
        console.error("Discord AI error:", err.message, err.stack?.split('\n').slice(0, 3).join('\n'));
        await discordApi(`/channels/${channelId}/messages`, {
          method: "POST",
          body: {
            content: "Something went wrong. Try again.",
            message_reference: { message_id: msg.id },
          },
        });
      }
    }
  } catch (err) {
    // Silently ignore polling errors
  } finally {
    // Prune old IDs to prevent memory leak (keep last 100)
    if (processedMessages.size > 100) {
      const arr = [...processedMessages];
      arr.slice(0, arr.length - 100).forEach((id) => processedMessages.delete(id));
    }
    polling = false;
  }
}

// Start the Discord bot polling
function startDiscordBot() {
  if (!BOT_TOKEN) {
    console.log("Discord bot: no token, skipping");
    return;
  }

  console.log("Discord bot: listening for messages (polling every 3s)");

  // Initialize lastMessageId to skip old messages
  getChannelId().then(async (channelId) => {
    if (!channelId) return;
    try {
      const msgs = await discordApi(`/channels/${channelId}/messages?limit=1`);
      if (Array.isArray(msgs) && msgs.length) lastMessageId = msgs[0].id;
    } catch { /* ignore */ }
  });

  // Poll every 3 seconds
  setInterval(() => {
    pollMessages().catch((err) => console.error("[Discord] Poll error:", err.message));
  }, 3000);
}

module.exports = { startDiscordBot, processMessage };
