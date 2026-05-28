/**
 * Module & Action permission definitions.
 *
 * Structure:
 *   MODULES[moduleId] = { name, actions: { actionId: actionName } }
 *
 * Action IDs are globally unique across all modules.
 */

const MODULES = {
  1: {
    name: "View Keys",
    actions: {
      1: "View key list",
      2: "View key value",
    },
  },
  2: {
    name: "Manage Keys",
    actions: {
      3: "Create key",
      4: "Edit key",
      5: "Delete key",
      6: "Revoke key",
    },
  },
  3: {
    name: "Use Keys",
    actions: {
      7: "Use / consume key",
    },
  },
  4: {
    name: "Sticky Board",
    actions: {
      8: "View board",
      9: "Create note",
      10: "Edit note",
      11: "Delete note",
    },
  },
  5: {
    name: "Manage Team",
    actions: {
      12: "View members",
      13: "Add member",
      14: "Edit member role",
      15: "Remove member",
    },
  },
  6: {
    name: "Manage Issues",
    actions: {
      16: "View issues",
      17: "Create issue",
      18: "Edit issue",
      19: "Delete issue",
    },
  },
  7: {
    name: "Billing",
    actions: {
      20: "View billing",
      21: "Manage billing",
    },
  },
};

/** Flat lookup: actionId → { moduleId, actionName, moduleName } */
const ACTION_INDEX = {};
for (const [moduleId, mod] of Object.entries(MODULES)) {
  for (const [actionId, actionName] of Object.entries(mod.actions)) {
    ACTION_INDEX[Number(actionId)] = {
      moduleId: Number(moduleId),
      moduleName: mod.name,
      actionName,
    };
  }
}

/**
 * Check whether a user has a specific permission.
 *
 * @param {import("../models").UserPermission} UserPermission - Sequelize model
 * @param {string} userId
 * @param {string} orgId
 * @param {number} moduleId
 * @param {number} actionId
 * @returns {Promise<boolean>}
 */
async function hasPermission(UserPermission, userId, orgId, moduleId, actionId) {
  const perm = await UserPermission.findOne({
    where: { user_id: userId, org_id: orgId, module_id: moduleId, action_id: actionId },
  });
  return !!perm;
}

module.exports = { MODULES, ACTION_INDEX, hasPermission };
