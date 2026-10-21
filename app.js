// The Express app on its own (no database connection, no listen) so tests can use it directly.
// server.js connects to MongoDB and starts it.
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const constants = require('./utils/constants');
const flash = require('./middleware/flash');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

// lists like CATEGORIES, ISSUES, HOSTELS are available in every EJS page
Object.assign(app.locals, constants);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// make "user" and the current path available in every EJS page (user is null if not logged in)
app.use((req, res, next) => {
  res.locals.user = null;
  res.locals.path = req.path;
  next();
});
app.use(flash);

app.get('/', (req, res) => res.redirect(req.cookies.token ? '/dashboard' : '/login'));

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/complaints'));
app.use('/admin', require('./routes/admin'));
app.use('/profile', require('./routes/profile'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
