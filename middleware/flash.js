// Toast notifications that survive one redirect, stored in a short-lived cookie.
//   req.flash('success', 'Complaint filed')  -> shown as a toast on the next page
//   res.locals.toast = {...}                 -> shown on the page being rendered now
const TYPES = ['success', 'error', 'info'];

module.exports = (req, res, next) => {
  res.locals.toast = null;
  if (req.cookies.flash) {
    try {
      const t = JSON.parse(req.cookies.flash);
      if (TYPES.includes(t.type) && typeof t.text === 'string') res.locals.toast = { type: t.type, text: t.text };
    } catch (e) {
      // ignore a malformed cookie
    }
    res.clearCookie('flash');
  }
  req.flash = (type, text) => {
    res.cookie('flash', JSON.stringify({ type, text }), { httpOnly: true, sameSite: 'lax', maxAge: 60 * 1000 });
  };
  next();
};
