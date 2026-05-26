const { Issue, IssueComment, IssueAttachment, IssueLabel, IssueLabelMap, User, Group, Channel } = require("../models");
const { logActivity } = require("../utils/log");
const { notify } = require("../utils/notify");

exports.list = async (req, res, next) => {
  try {
    const { Op } = require("sequelize");
    const { status, priority, type, assigned_to, assigned_group, channel_id, from, to, page, limit: lim } = req.query;
    const where = {};
    // Support both org-scoped and global
    if (req.params.orgId) where.org_id = req.params.orgId;

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (assigned_to) where.assigned_to = assigned_to;
    if (assigned_group) where.assigned_group = assigned_group;
    if (channel_id) where.channel_id = channel_id;

    // Date range filter
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) where.created_at[Op.lte] = new Date(to + "T23:59:59.999Z");
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(lim) || 50));
    const offset = (pageNum - 1) * pageSize;

    const { count, rows } = await Issue.findAndCountAll({
      where,
      include: [
        { model: User, as: "reporter", attributes: ["id", "username", "avatar_url"] },
        { model: User, as: "assignee", attributes: ["id", "username", "display_name", "avatar_url"] },
        { model: Group, as: "assignedGroup", attributes: ["id", "name", "color"] },
        { model: Channel, as: "channel", attributes: ["id", "name", "color"] },
        { model: IssueLabel, as: "labels", through: { attributes: [] } },
      ],
      order: [["created_at", "DESC"]],
      limit: pageSize,
      offset,
      distinct: true,
    });

    res.json({
      issues: rows,
      total: count,
      page: pageNum,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const orgId = req.params.orgId || req.body.org_id || null;
    const issue = await Issue.create({ org_id: orgId, reported_by: req.user.id, ...req.body });
    if (orgId) {
      await logActivity(orgId, req.user.id, "created", "issue", issue.id, { title: issue.title, type: issue.type });
    }

    if (issue.assigned_to && issue.assigned_to !== req.user.id) {
      await notify(orgId, req.user.id, issue.assigned_to, "issue_assigned",
        `Issue assigned: ${issue.title}`, `You were assigned "${issue.title}".`, "issue", issue.id);
    }
    res.status(201).json(issue);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const issue = await Issue.findByPk(req.params.issueId, {
      include: [
        { model: Channel, as: "channel", attributes: ["id", "name", "color"] },
        { model: User, as: "reporter", attributes: ["id", "username", "display_name", "avatar_url"] },
        { model: User, as: "assignee", attributes: ["id", "username", "display_name", "avatar_url"] },
        { model: Group, as: "assignedGroup", attributes: ["id", "name", "color"] },
        { model: IssueComment, as: "comments", include: [{ model: User, as: "author", attributes: ["id", "username", "display_name", "avatar_url"] }], order: [["created_at", "ASC"]] },
        { model: IssueAttachment, as: "attachments" },
        { model: IssueLabel, as: "labels", through: { attributes: [] } },
      ],
    });
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    res.json(issue);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const issue = await Issue.findByPk(req.params.issueId);
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    const oldStatus = issue.status;
    if ((req.body.status === "resolved" || req.body.status === "closed") && !issue.resolved_at) {
      req.body.resolved_at = new Date();
    }

    await issue.update(req.body);

    if (req.body.status && req.body.status !== oldStatus) {
      await logActivity(issue.org_id, req.user.id, req.body.status === "resolved" ? "resolved" : "status_changed", "issue", issue.id);
      if ((req.body.status === "resolved" || req.body.status === "closed") && issue.reported_by !== req.user.id) {
        await notify(issue.org_id, req.user.id, issue.reported_by, "issue_resolved",
          `Issue resolved: ${issue.title}`, `"${issue.title}" was ${req.body.status}.`, "issue", issue.id);
      }
    }

    if (req.body.assigned_to && req.body.assigned_to !== req.user.id) {
      await notify(issue.org_id, req.user.id, req.body.assigned_to, "issue_assigned",
        `Issue assigned: ${issue.title}`, `You were assigned "${issue.title}".`, "issue", issue.id);
    }

    res.json(issue);
  } catch (err) {
    next(err);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const comment = await IssueComment.create({
      issue_id: req.params.issueId,
      user_id: req.user.id,
      body: req.body.body,
    });

    const issue = await Issue.findByPk(req.params.issueId);
    if (issue) {
      await logActivity(issue.org_id, req.user.id, "commented", "issue", issue.id, { comment_id: comment.id });
      const targets = new Set([issue.reported_by, issue.assigned_to].filter(Boolean));
      targets.delete(req.user.id);
      for (const target of targets) {
        await notify(issue.org_id, req.user.id, target, "issue_commented",
          `Comment on: ${issue.title}`,
          `${req.user.display_name || req.user.username} commented on "${issue.title}".`,
          "issue", issue.id);
      }
    }
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
};

exports.updateComment = async (req, res, next) => {
  try {
    const comment = await IssueComment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    if (comment.user_id !== req.user.id) return res.status(403).json({ error: "Not your comment" });
    await comment.update({ body: req.body.body });
    res.json(comment);
  } catch (err) {
    next(err);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await IssueComment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    if (comment.user_id !== req.user.id) return res.status(403).json({ error: "Not your comment" });
    await comment.destroy();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.addLabel = async (req, res, next) => {
  try {
    await IssueLabelMap.findOrCreate({
      where: { issue_id: req.params.issueId, label_id: req.body.label_id },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.notify = async (req, res, next) => {
  try {
    const issue = await Issue.findByPk(req.params.issueId, {
      include: [
        { model: User, as: "reporter", attributes: ["id", "username", "display_name"] },
        { model: User, as: "assignee", attributes: ["id", "username", "display_name"] },
        { model: Group, as: "assignedGroup", attributes: ["id", "name"] },
      ],
    });
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    const { message } = req.body;
    const targets = new Set();

    // Notify assignee
    if (issue.assigned_to) targets.add(issue.assigned_to);
    // Notify reporter
    if (issue.reported_by) targets.add(issue.reported_by);
    // Remove sender from targets
    targets.delete(req.user.id);

    if (targets.size === 0) {
      return res.json({ ok: true, sent_to: 0, message: "No one to notify" });
    }

    const senderName = req.user.display_name || req.user.username;
    const body = message || `${senderName} wants your attention on "${issue.title}"`;

    for (const targetId of targets) {
      await notify(
        issue.org_id, req.user.id, targetId,
        "mention",
        `Nudge on #${issue.number}: ${issue.title}`,
        body,
        "issue", issue.id
      );
    }

    await logActivity(issue.org_id, req.user.id, "notified", "issue", issue.id, { targets: [...targets], message: body });

    res.json({ ok: true, sent_to: targets.size });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await Issue.destroy({ where: { id: req.params.issueId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.listLabels = async (req, res, next) => {
  try {
    const labels = await IssueLabel.findAll({ where: { org_id: req.params.orgId }, order: [["name", "ASC"]] });
    res.json(labels);
  } catch (err) {
    next(err);
  }
};

exports.createLabel = async (req, res, next) => {
  try {
    const label = await IssueLabel.create({ org_id: req.params.orgId, ...req.body });
    res.status(201).json(label);
  } catch (err) {
    next(err);
  }
};
