const express = require('express');
const profile = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.use(protect);

router.get('/', asyncHandler(profile.show));
router.post('/', asyncHandler(profile.update));

module.exports = router;
