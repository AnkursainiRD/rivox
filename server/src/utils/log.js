const { ActivityLog } = require("../models");

async function logActivity(orgId, userId, action, entityType, entityId, details = null) {
  await ActivityLog.create({
    org_id: orgId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}

module.exports = { logActivity };
