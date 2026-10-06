const Reminder = require('../models/Reminder');
const Action = require('../models/Action');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

function parseReminderDate(value) {
  const date = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(date.getTime())) {
    throw new AppError('Please choose a valid reminder date and time.', 400);
  }
  return date;
}

const listReminders = asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({ userId: req.user._id }).sort({ reminderDate: 1 }).limit(500);
  res.json({ reminders });
});

// Creates a reminder for a task, or replaces the existing one (one reminder per task).
const createReminder = asyncHandler(async (req, res) => {
  const { actionId, reminderDate } = req.body;
  if (!actionId) throw new AppError('A task is required for a reminder.', 400);
  const date = parseReminderDate(reminderDate);

  const action = await Action.findOne({ _id: actionId, userId: req.user._id });
  if (!action) throw new AppError('Task not found.', 404);

  const reminder = await Reminder.findOneAndUpdate(
    { userId: req.user._id, actionId: action._id },
    { title: action.title, reminderDate: date, enabled: true, notifiedAt: null },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ reminder });
});

// PATCH: change the time, switch on/off, or mark as already shown ({ notified: true }).
const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.user._id });
  if (!reminder) throw new AppError('Reminder not found.', 404);

  const { reminderDate, enabled, notified } = req.body;
  if (reminderDate !== undefined) {
    reminder.reminderDate = parseReminderDate(reminderDate);
    reminder.notifiedAt = null;
  }
  if (enabled !== undefined) {
    if (typeof enabled !== 'boolean') throw new AppError('"enabled" must be true or false.', 400);
    reminder.enabled = enabled;
  }
  if (notified === true) reminder.notifiedAt = new Date();

  await reminder.save();
  res.json({ reminder });
});

const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!reminder) throw new AppError('Reminder not found.', 404);
  res.json({ message: 'Reminder deleted.' });
});

module.exports = { listReminders, createReminder, updateReminder, deleteReminder };
