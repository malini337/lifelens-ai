const Action = require('../models/Action');
const Reminder = require('../models/Reminder');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { isValidISODate, isoToDate } = require('../utils/dateHelpers');

const listActions = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (['Pending', 'Completed'].includes(req.query.status)) filter.status = req.query.status;
  if (['High', 'Medium', 'Low'].includes(req.query.priority)) filter.priority = req.query.priority;

  const actions = await Action.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ actions });
});

// PATCH: update title, description, priority, status or deadline.
const updateAction = asyncHandler(async (req, res) => {
  const action = await Action.findOne({ _id: req.params.id, userId: req.user._id });
  if (!action) throw new AppError('Task not found.', 404);

  const { title, description, priority, status, deadline } = req.body;

  if (title !== undefined) {
    const trimmed = typeof title === 'string' ? title.trim() : '';
    if (!trimmed || trimmed.length > 300) throw new AppError('Task title must be 1-300 characters.', 400);
    action.title = trimmed;
    action.titleTa = ''; // the Tamil text belonged to the old title
  }
  if (description !== undefined) {
    if (typeof description !== 'string' || description.length > 2000) throw new AppError('Description is too long.', 400);
    action.description = description.trim();
    action.descriptionTa = '';
  }
  if (priority !== undefined) {
    if (!['High', 'Medium', 'Low'].includes(priority)) throw new AppError('Priority must be High, Medium or Low.', 400);
    action.priority = priority;
  }
  if (status !== undefined) {
    if (!['Pending', 'Completed'].includes(status)) throw new AppError('Status must be Pending or Completed.', 400);
    if (status !== action.status) {
      action.status = status;
      action.completedAt = status === 'Completed' ? new Date() : null;
    }
  }
  if (deadline !== undefined) {
    if (deadline === null || deadline === '') {
      action.deadline = null;
    } else if (isValidISODate(deadline)) {
      action.deadline = isoToDate(deadline);
    } else {
      throw new AppError('Deadline must be a valid date (YYYY-MM-DD).', 400);
    }
  }

  await action.save();
  res.json({ action });
});

const deleteAction = asyncHandler(async (req, res) => {
  const action = await Action.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!action) throw new AppError('Task not found.', 404);
  await Reminder.deleteMany({ userId: req.user._id, actionId: action._id });
  res.json({ message: 'Task deleted.' });
});

module.exports = { listActions, updateAction, deleteAction };
