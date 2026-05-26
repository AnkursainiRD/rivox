const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User, Organization } = require("../models");

// In-memory store for pending auth sessions
// key: sessionId, value: { token, createdAt } or null (pending)
const pendingSessions = new Map();

// Cleanup old sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingSessions) {
    if (now - (val?.createdAt || 0) > 5 * 60 * 1000) {
      pendingSessions.delete(key);
    }
  }
}, 60 * 1000);

// POST /api/auth/session — create a pending auth session
exports.createSession = (req, res) => {
  const sessionId = crypto.randomUUID();
  pendingSessions.set(sessionId, null);
  res.json({ session_id: sessionId });
};

// GET /api/auth/poll?session=ID — check if auth completed
exports.pollSession = (req, res) => {
  const { session } = req.query;
  if (!session || !pendingSessions.has(session)) {
    return res.status(404).json({ error: "Session not found" });
  }
  const result = pendingSessions.get(session);
  if (!result) {
    return res.json({ status: "pending" });
  }
  // Auth completed — return token and clean up
  pendingSessions.delete(session);
  res.json({ status: "done", token: result.token });
};

// GET /api/auth/discord?session=ID
exports.discordRedirect = (req, res) => {
  const { session } = req.query;
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify email",
    state: session || "",
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
};

// GET /api/auth/discord/callback
exports.discordCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ error: "No code" });

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(400).json({ error: "Token exchange failed" });

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `${tokenData.token_type} ${tokenData.access_token}` },
    });
    const discord = await userRes.json();

    const avatarUrl = discord.avatar
      ? `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png`
      : null;

    const [user] = await User.findOrCreate({
      where: { discord_id: discord.id },
      defaults: {
        email: discord.email || `${discord.username}@discord`,
        username: discord.username,
        display_name: discord.global_name || discord.username,
        avatar_url: avatarUrl,
      },
    });

    await user.update({
      username: discord.username,
      display_name: discord.global_name || discord.username,
      avatar_url: avatarUrl,
      email: discord.email || user.email,
    });

    const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    // If there's a session ID (from Tauri), store the token for polling
    if (state && pendingSessions.has(state)) {
      pendingSessions.set(state, { token: jwtToken, createdAt: Date.now() });
    }

    // Show a success page in the browser
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rivox</title>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; background: #0a0a0a; color: #fafafa;
               display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { text-align: center; }
        .check { width: 48px; height: 48px; background: #5b5bd6; border-radius: 12px;
                 display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        h1 { font-size: 20px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.025em; }
        p { font-size: 14px; color: #a1a1aa; margin: 0; }
      </style></head><body>
      <div class="card">
        <div class="check"><svg width="24" height="24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
        <h1>Signed in to Rivox</h1>
        <p>You can close this tab and return to the app.</p>
      </div></body></html>`);
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ["password_hash"] },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const sequelize = require("../db");
    const { QueryTypes } = require("sequelize");

    const orgs = await sequelize.query(
      `SELECT o.id, o.name, o.slug, o.logo_url, o.created_at,
              om.role AS "OrgMember.role",
              CAST((SELECT COUNT(*) FROM org_members WHERE org_id = o.id) AS INTEGER) AS member_count,
              CAST((SELECT COUNT(*) FROM api_keys WHERE org_id = o.id) AS INTEGER) AS key_count
       FROM organizations o
       JOIN org_members om ON om.org_id = o.id AND om.user_id = :userId
       ORDER BY o.created_at DESC`,
      { replacements: { userId: decoded.userId }, type: QueryTypes.SELECT }
    );

    // Fetch avatar previews for each org
    const orgIds = orgs.map((o) => o.id);
    let avatarMap = {};
    if (orgIds.length > 0) {
      const avatars = await sequelize.query(
        `SELECT om.org_id, u.display_name, u.avatar_url
         FROM org_members om JOIN users u ON u.id = om.user_id
         WHERE om.org_id IN (:orgIds)
         ORDER BY om.joined_at ASC`,
        { replacements: { orgIds }, type: QueryTypes.SELECT }
      );
      for (const a of avatars) {
        if (!avatarMap[a.org_id]) avatarMap[a.org_id] = [];
        if (avatarMap[a.org_id].length < 4) avatarMap[a.org_id].push(a);
      }
    }

    const result = orgs.map((o) => ({
      id: o.id, name: o.name, slug: o.slug, logo_url: o.logo_url,
      OrgMember: { role: o["OrgMember.role"] },
      member_count: o.member_count,
      key_count: o.key_count,
      members_preview: avatarMap[o.id] || [],
    }));

    res.json({ user, organizations: result });
  } catch (err) {
    next(err);
  }
};

exports.disconnectDiscord = async (req, res, next) => {
  try {
    await User.update(
      { discord_id: null, avatar_url: null },
      { where: { id: req.user.id } }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
