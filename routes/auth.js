const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const HOSTELS = ['Block A', 'Block B', 'Block C', 'Block D'];

function sendToken(res, user) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
}

router.get('/login', (req, res) => res.render('login', { error: null }));

router.get('/register', (req, res) => res.render('register', { error: null, hostels: HOSTELS }));

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, hostel, roomNo } = req.body;
    if (!name || !email || !password || !hostel) {
      return res.render('register', { error: 'Fill in all required fields', hostels: HOSTELS });
    }
    if (password.length < 6) {
      return res.render('register', { error: 'Password must be at least 6 characters', hostels: HOSTELS });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.render('register', { error: 'This email is already registered', hostels: HOSTELS });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, hostel, roomNo, role: 'student' });
    sendToken(res, user);
    res.redirect('/dashboard');
  } catch (err) {
    res.render('register', { error: err.message, hostels: HOSTELS });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.password))) {
      return res.render('login', { error: 'Wrong email or password' });
    }
    sendToken(res, user);
    res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
  } catch (err) {
    res.render('login', { error: err.message });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = router;
