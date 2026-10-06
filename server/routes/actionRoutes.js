const express = require('express');
const { listActions, updateAction, deleteAction } = require('../controllers/actionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/', listActions);
router.patch('/:id', updateAction);
router.delete('/:id', deleteAction);

module.exports = router;
