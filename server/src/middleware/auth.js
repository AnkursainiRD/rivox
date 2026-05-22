const jwt = require("jsonwebtoken");
const { User, OrgMember } = require("../models");

async function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.query.token;
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(...roles) {
  return async (req, res, next) => {
    const orgId = req.params.orgId || req.body.org_id;
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const member = await OrgMember.findOne({ where: { org_id: orgId, user_id: req.user.id } });
    if (!member) return res.status(403).json({ error: "Not a member of this org" });
    if (!roles.includes(member.role)) return res.status(403).json({ error: "Insufficient role" });

    req.orgRole = member.role;
    next();
  };
}

module.exports = { auth, requireRole };
