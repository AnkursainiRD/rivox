const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { sequelize } = require("./models");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// All routes under /api
app.use("/api", routes);

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: err.message });
  }
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

async function start() {
  await sequelize.authenticate();
  console.log("Database connected via Sequelize");

  // Sync user_permissions table (recreate if schema changed, safe while empty)
  const { UserPermission } = require("./models");
  await UserPermission.sync({ alter: true });

  app.listen(PORT, () => {
    console.log(`Rivox API running on http://localhost:${PORT}`);

    // Keep alive: self-ping every 14 minutes to prevent Render free tier sleep
    if (process.env.RENDER_EXTERNAL_URL) {
      setInterval(() => {
        fetch(`${process.env.RENDER_EXTERNAL_URL}/api/health`).catch(() => {});
      }, 14 * 60 * 1000);
    }

    // Auto-delete expired temp keys every 5 minutes
    setInterval(async () => {
      try {
        const { ApiKey, ApiKeyUserAccess, ApiKeyGroupAccess, ApiKeyRevocation } = require("./models");
        const { Op } = require("sequelize");
        const expired = await ApiKey.findAll({
          where: { expires_at: { [Op.lt]: new Date() } },
        });
        if (expired.length > 0) {
          for (const key of expired) {
            await ApiKeyUserAccess.destroy({ where: { key_id: key.id } });
            await ApiKeyGroupAccess.destroy({ where: { key_id: key.id } });
            await ApiKeyRevocation.destroy({ where: { key_id: key.id } });
            await key.destroy();
          }
          console.log(`[Cleanup] Deleted ${expired.length} expired key(s)`);
        }
      } catch { /* ignore */ }
    }, 5 * 60 * 1000);

    // Start Discord bot listener
    const { startDiscordBot } = require("./ai/discord-bot");
    startDiscordBot();
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});

module.exports = app;
