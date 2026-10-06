const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// Only these fields are ever sent to the client (never the password hash).
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    notificationPreference: user.notificationPreference,
    createdAt: user.createdAt,
  };
}

const register = asyncHandler(async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const preferredLanguage = req.body.preferredLanguage === 'ta' ? 'ta' : 'en';

  if (!name || !email || !password) throw new AppError('Please enter your name, email and password.', 400);
  if (name.length > 80) throw new AppError('Name is too long (maximum 80 characters).', 400);
  if (!EMAIL_PATTERN.test(email)) throw new AppError('Please enter a valid email address.', 400);
  if (password.length < 8) throw new AppError('Password must be at least 8 characters.', 400);
  if (password.length > 128) throw new AppError('Password is too long (maximum 128 characters).', 400);

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('An account with this email already exists. Try logging in.', 409);

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed, preferredLanguage });

  res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) throw new AppError('Please enter your email and password.', 400);

  const user = await User.findOne({ email }).select('+password');
  // Same message for "no such user" and "wrong password" so attackers learn nothing.
  const valid = user && (await bcrypt.compare(password, user.password));
  if (!valid) throw new AppError('Incorrect email or password.', 401);

  res.json({ token: signToken(user._id), user: publicUser(user) });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

const updateMe = asyncHandler(async (req, res) => {
  const { name, email, preferredLanguage, notificationPreference } = req.body;
  const user = req.user;

  if (name !== undefined) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed || trimmed.length > 80) throw new AppError('Please enter a name (maximum 80 characters).', 400);
    user.name = trimmed;
  }
  if (email !== undefined) {
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(normalized)) throw new AppError('Please enter a valid email address.', 400);
    if (normalized !== user.email) {
      const taken = await User.findOne({ email: normalized });
      if (taken) throw new AppError('That email is already used by another account.', 409);
      user.email = normalized;
    }
  }
  if (preferredLanguage !== undefined) {
    if (!['en', 'ta'].includes(preferredLanguage)) throw new AppError('Language must be English or Tamil.', 400);
    user.preferredLanguage = preferredLanguage;
  }
  if (notificationPreference !== undefined) {
    if (!['browser', 'none'].includes(notificationPreference)) throw new AppError('Invalid notification preference.', 400);
    user.notificationPreference = notificationPreference;
  }

  await user.save();
  res.json({ user: publicUser(user) });
});

module.exports = { register, login, getMe, updateMe };
