// Small pure helpers shared across the backend

// Express 4 does not catch rejected promises: forward them to the error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// An error whose message is safe to show the user (expose = true)
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- Pagination ----------
function parsePage(v) {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 100000) : 1;
}

// Builds what the pager partial needs; link(n) keeps the current filters
function buildPager(total, page, limit, query = {}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const link = (n) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (k !== 'page' && v) params.set(k, v);
    });
    if (n > 1) params.set('page', n);
    const qs = params.toString();
    return qs ? '?' + qs : '?';
  };
  return { total, page, pages, from: total ? (page - 1) * limit + 1 : 0, to: Math.min(total, page * limit), link };
}

// ---------- Complaint IDs ----------
const formatComplaintId = (n) => 'CMP-' + String(n).padStart(4, '0');

module.exports = { asyncHandler, HttpError, escapeRegex, parsePage, buildPager, formatComplaintId };
