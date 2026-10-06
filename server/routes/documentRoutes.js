const express = require('express');
const { listDocuments, getDocument, deleteDocument } = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/', listDocuments);
router.get('/:id', getDocument);
router.delete('/:id', deleteDocument);

module.exports = router;
