const Document = require('../models/Document');
const Action = require('../models/Action');
const Reminder = require('../models/Reminder');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const listDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ documents });
});

const getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!document) throw new AppError('Document not found.', 404);
  const actions = await Action.find({ documentId: document._id, userId: req.user._id }).sort({ createdAt: 1 });
  res.json({ document, actions });
});

// Deleting a document also deletes its tasks and their reminders.
const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!document) throw new AppError('Document not found.', 404);

  const actions = await Action.find({ documentId: document._id, userId: req.user._id }).select('_id');
  const actionIds = actions.map((a) => a._id);
  await Reminder.deleteMany({ userId: req.user._id, actionId: { $in: actionIds } });
  await Action.deleteMany({ documentId: document._id, userId: req.user._id });
  await document.deleteOne();

  res.json({ message: 'Document deleted.' });
});

module.exports = { listDocuments, getDocument, deleteDocument };
