const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const KEY = crypto.scryptSync(process.env.JWT_SECRET || "fallback-secret", "rivox-salt", 32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  // Store as iv:tag:encrypted
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

function decrypt(stored) {
  const [ivHex, tagHex, encrypted] = stored.split(":");
  if (!ivHex || !tagHex || !encrypted) {
    // Fallback: return as-is if not encrypted (legacy plain text)
    return stored;
  }
  try {
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // If decryption fails, return as-is (legacy plain text)
    return stored;
  }
}

module.exports = { encrypt, decrypt };
