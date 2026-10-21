const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { HttpError } = require('../utils/helpers');

// Checks the JWT cookie and loads the logged-in user
exports.protect = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.clearCookie('token');
      return res.redirect('/login');
    }
    req.user = user;
    res.locals.user = user;
    next();
  } catch (err) {
    res.clearCookie('token');
    res.redirect('/login');
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return next(new HttpError(403, 'This page is for hostel managers only'));
  next();
};

exports.studentOnly = (req, res, next) => {
  if (req.user.role !== 'student') return res.redirect('/admin');
  next();
};
