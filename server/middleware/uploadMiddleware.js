// Multer setup: files stay in memory only (never written to disk) and are discarded after analysis.
const multer = require('multer');
const { AppError } = require('./errorHandler');

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new AppError('Unsupported file type. Please upload a PDF, PNG, JPG or TXT file.', 415));
    }
    cb(null, true);
  },
});

module.exports = { uploadSingle: upload.single('file'), MAX_FILE_SIZE, ALLOWED_TYPES };
