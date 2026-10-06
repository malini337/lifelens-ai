const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // select:false keeps the hash out of normal queries; login asks for it explicitly.
    password: { type: String, required: true, select: false },
    preferredLanguage: { type: String, enum: ['en', 'ta'], default: 'en' },
    notificationPreference: { type: String, enum: ['browser', 'none'], default: 'browser' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
