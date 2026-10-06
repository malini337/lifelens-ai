// Central place for turning errors into safe, friendly JSON responses.
// Stack traces and secrets are NEVER sent to the client.

// An error whose message is safe to show to the user.
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

// Wraps async route handlers so thrown errors reach errorHandler.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(req, res) {
  res.status(404).json({ message: 'That endpoint does not exist.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Something went wrong on our side. Please try again.';

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
  } else if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      status = 413;
      message = 'That file is too large. The maximum size is 8 MB.';
    } else {
      status = 400;
      message = 'The upload could not be processed. Please upload a single file.';
    }
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'The request is too large.';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Your session has expired. Please log in again.';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = 'Some of the information you sent is not valid.';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'That identifier is not valid.';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That value is already in use.';
  } else if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNetworkError'
  ) {
    status = 503;
    message = 'The database is temporarily unavailable. Please try again shortly.';
  } else if (err.message === 'Not allowed by CORS') {
    status = 403;
    message = 'This website is not allowed to use the API.';
  }

  if (status >= 500) {
    // Log the message only (no request bodies, no passwords, no keys).
    console.error(`[${req.method} ${req.originalUrl}] ${err.name}: ${err.message}`);
  }

  res.status(status).json({ message });
}

module.exports = { AppError, asyncHandler, notFound, errorHandler };
