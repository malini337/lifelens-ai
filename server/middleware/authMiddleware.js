// Protects routes: reads "Authorization: Bearer <token>", verifies it, attaches req.user.
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError, asyncHandler } = require('./errorHandler');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Please log in to continue.', 401);
  }

  const payload = jwt.verify(token, process.env.JWT_SECRET); // throws on invalid/expired
  const user = await User.findById(payload.id);
  if (!user) {
    throw new AppError('Your account could not be found. Please log in again.', 401);
  }

  req.user = user;
  next();
});

module.exports = { protect };
