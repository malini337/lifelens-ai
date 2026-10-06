const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    titleTa: { type: String, default: '', maxlength: 600 },
    description: { type: String, default: '', maxlength: 2000 },
    descriptionTa: { type: String, default: '', maxlength: 4000 },
    deadline: { type: Date, default: null }, // null = "Not clearly identified"
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    requiredItems: { type: [String], default: [] },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

actionSchema.index({ userId: 1, status: 1, deadline: 1 });

module.exports = mongoose.model('Action', actionSchema);
