const express = require('express');
const admin = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/', asyncHandler(admin.list));
router.post('/complaints/:id/status', asyncHandler(admin.updateComplaint));
router.get('/students', asyncHandler(admin.students));
router.get('/stats', asyncHandler(admin.stats));

module.exports = router;
