const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Action', required: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    reminderDate: { type: Date, required: true },
    enabled: { type: Boolean, default: true },
    // Set when the browser/in-app alert has been shown, so it only fires once.
    notifiedAt: { type: Date, default: null },
    // Kept so email/push channels can be added later without changing the model.
    notificationType: { type: String, enum: ['browser'], default: 'browser' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One reminder per task per user.
reminderSchema.index({ userId: 1, actionId: 1 }, { unique: true });

module.exports = mongoose.model('Reminder', reminderSchema);
