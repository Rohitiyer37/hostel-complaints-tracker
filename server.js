require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// make "user" available in every EJS page (null if not logged in)
app.use((req, res, next) => {
  res.locals.user = null;
  next();
});

app.get('/', (req, res) => res.redirect(req.cookies.token ? '/dashboard' : '/login'));

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/complaints'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => res.status(404).send('Page not found'));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log('Server running on http://localhost:' + port));
  })
  .catch((err) => console.error('DB connection failed:', err.message));
