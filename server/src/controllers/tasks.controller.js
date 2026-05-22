const { Task, TaskTag, User } = require("../models");
const { logActivity } = require("../utils/log");
const { notify } = require("../utils/notify");

exports.list = async (req, res, next) => {
  try {
    const { scope, status, assigned_to } = req.query;
    const where = { org_id: req.params.orgId };

    if (scope === "personal") {
      where.scope = "personal";
      where.created_by = req.user.id;
    } else if (scope === "team") {
      where.scope = "team";
    }
    if (status) where.status = status;
    if (assigned_to) where.assigned_to = assigned_to;

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: "creator", attributes: ["id", "username", "display_name", "avatar_url"] },
        { model: User, as: "assignee", attributes: ["id", "username", "display_name", "avatar_url"] },
        { model: TaskTag, as: "tags", through: { attributes: [] } },
      ],
      order: [["is_pinned", "DESC"], ["created_at", "DESC"]],
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const task = await Task.create({ org_id: req.params.orgId, created_by: req.user.id, ...req.body });
    await logActivity(req.params.orgId, req.user.id, "created", "task", task.id, { title: task.title, scope: task.scope });

    if (task.assigned_to && task.assigned_to !== req.user.id) {
      await notify(req.params.orgId, req.user.id, task.assigned_to, "task_assigned",
        `Task assigned: ${task.title}`, `You were assigned "${task.title}".`, "task", task.id);
    }
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const oldStatus = task.status;
    const oldAssignee = task.assigned_to;
    await task.update(req.body);

    if (req.body.status && req.body.status !== oldStatus && task.assigned_to && task.assigned_to !== req.user.id) {
      await logActivity(task.org_id, req.user.id, "status_changed", "task", task.id, { from: oldStatus, to: req.body.status });
      await notify(task.org_id, req.user.id, task.assigned_to, "task_status_changed",
        `Task updated: ${task.title}`, `"${task.title}" moved to ${req.body.status}.`, "task", task.id);
    }

    if (req.body.assigned_to && req.body.assigned_to !== oldAssignee && req.body.assigned_to !== req.user.id) {
      await notify(task.org_id, req.user.id, req.body.assigned_to, "task_assigned",
        `Task assigned: ${task.title}`, `You were assigned "${task.title}".`, "task", task.id);
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await Task.destroy({ where: { id: req.params.taskId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
