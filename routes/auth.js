const express = require('express');
const auth = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

router.get('/login', auth.showLogin);
router.post('/login', loginLimiter, asyncHandler(auth.login));
router.get('/register', auth.showRegister);
router.post('/register', asyncHandler(auth.register));
router.get('/logout', auth.logout);

module.exports = router;
