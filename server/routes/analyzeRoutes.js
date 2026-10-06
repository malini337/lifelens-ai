const express = require('express');
const { analyze } = require('../controllers/analyzeController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', protect, uploadSingle, analyze);

module.exports = router;
