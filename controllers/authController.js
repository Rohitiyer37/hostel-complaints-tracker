const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateRegistration, validateLogin } = require('../utils/validators');

function sendToken(res, user) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  });
}

const renderRegister = (res, error, form = {}, status = 200) =>
  res.status(status).render('register', { error, form });

exports.showLogin = (req, res) => res.render('login', { error: null, form: {} });

exports.showRegister = (req, res) => renderRegister(res, null);

exports.register = async (req, res) => {
  const { value, error } = validateRegistration(req.body);
  if (error) return renderRegister(res, error, value, 400);

  if (await User.exists({ email: value.email })) {
    return renderRegister(res, 'This email is already registered', value, 409);
  }
  const hashed = await bcrypt.hash(value.password, 10);
  const user = await User.create({ ...value, password: hashed, role: 'student' });
  sendToken(res, user);
  req.flash('success', 'Account created. Welcome, ' + user.name + '!');
  res.redirect('/dashboard');
};

exports.login = async (req, res) => {
  const { value, error } = validateLogin(req.body);
  if (error) return res.status(400).render('login', { error, form: value });

  const user = await User.findOne({ email: value.email });
  if (!user || !(await bcrypt.compare(value.password, user.password))) {
    // 401 so the rate limiter counts this as a failed attempt
    return res.status(401).render('login', { error: 'Wrong email or password', form: value });
  }
  sendToken(res, user);
  req.flash('success', 'Welcome back, ' + user.name + '!');
  res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  req.flash('info', 'You have been logged out');
  res.redirect('/login');
};
