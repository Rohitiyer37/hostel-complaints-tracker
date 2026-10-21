const rateLimit = require('express-rate-limit');

// At most 10 FAILED login attempts per IP every 15 minutes
// (failed logins answer with 401, successful ones are not counted)
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).render('login', {
      error: 'Too many login attempts. Please try again in 15 minutes.',
      form: { email: '' }
    })
});
