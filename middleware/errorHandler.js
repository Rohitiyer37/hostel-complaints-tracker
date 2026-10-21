// Centralised error handling: every route error ends up here.
// Only errors marked "expose" (HttpError) show their message; anything else is
// logged on the server and the user sees a generic message.

exports.notFound = (req, res) => {
  res.status(404).render('error', { status: 404, message: 'Page not found' });
};

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  if (res.headersSent) return next(err);

  const message = status < 500 && err.expose ? err.message : 'Something went wrong. Please try again.';
  res.status(status).render('error', { status, message });
};
