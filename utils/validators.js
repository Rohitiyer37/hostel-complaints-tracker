// PURE validation functions: no database, no req/res -> easy to unit test.
// Each returns { value, error } where value holds the cleaned input and
// error is null or a message that is safe to show to the user.

const { HOSTELS, ISSUES, CATEGORIES, EXTRA_FIELDS, STATUSES, PRIORITIES, SORT_OPTIONS } = require('./constants');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROOM_RE = /^[A-Za-z0-9][A-Za-z0-9 \-/]{0,11}$/;
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const result = (value, error = null) => ({ value, error });

function isObjectId(id) {
  return typeof id === 'string' && OBJECT_ID_RE.test(id);
}

function checkName(name) {
  if (name.length < 2 || name.length > 60) return 'Name must be 2 to 60 characters';
  return null;
}

function checkEmail(email) {
  if (!EMAIL_RE.test(email) || email.length > 100) return 'Enter a valid email address';
  return null;
}

function checkHostelRoom(hostel, roomNo) {
  if (!HOSTELS.includes(hostel)) return 'Choose a hostel block';
  if (!ROOM_RE.test(roomNo)) return 'Enter a valid room number (e.g. A-204)';
  return null;
}

// ---------- FR1: student registration ----------
function validateRegistration(body = {}) {
  const value = {
    name: str(body.name),
    email: str(body.email).toLowerCase(),
    password: typeof body.password === 'string' ? body.password : '',
    hostel: str(body.hostel),
    roomNo: str(body.roomNo).toUpperCase()
  };
  const error =
    checkName(value.name) ||
    checkEmail(value.email) ||
    (value.password.length < 6 || value.password.length > 72 ? 'Password must be 6 to 72 characters' : null) ||
    checkHostelRoom(value.hostel, value.roomNo);
  return result(value, error);
}

function validateLogin(body = {}) {
  const value = {
    email: str(body.email).toLowerCase(),
    password: typeof body.password === 'string' ? body.password : ''
  };
  const error = !value.email || !value.password ? 'Enter your email and password' : null;
  return result(value, error);
}

// ---------- FR12: profile (hostel + room only for students) ----------
function validateProfile(body = {}, role = 'student') {
  const value = { name: str(body.name), email: str(body.email).toLowerCase() };
  let error = checkName(value.name) || checkEmail(value.email);
  if (role === 'student') {
    value.hostel = str(body.hostel);
    value.roomNo = str(body.roomNo).toUpperCase();
    error = error || checkHostelRoom(value.hostel, value.roomNo);
  }
  return result(value, error);
}

// ---------- FR2 / FR6: complaint create + edit ----------
function validateComplaint(body = {}) {
  const value = {
    category: str(body.category),
    issue: str(body.issue),
    hostel: str(body.hostel),
    roomNo: str(body.roomNo).toUpperCase(),
    title: str(body.title),
    description: str(body.description),
    priority: str(body.priority) || 'Medium',
    extraDetails: {}
  };

  let error = null;
  if (!CATEGORIES.includes(value.category)) error = 'Choose a category';
  else if (!ISSUES[value.category].includes(value.issue)) error = 'Choose the issue';
  else error = checkHostelRoom(value.hostel, value.roomNo);

  if (!error && value.title.length > 100) error = 'Title can be at most 100 characters';
  if (!error && (value.description.length < 10 || value.description.length > 1000)) {
    error = 'Description must be 10 to 1000 characters';
  }
  if (!error && !PRIORITIES.includes(value.priority)) error = 'Choose a valid priority';

  if (!value.title) value.title = value.issue;

  // only keep the extra field that belongs to the chosen category
  const extra = EXTRA_FIELDS[value.category];
  if (extra) {
    const v = str(body[extra.key]);
    if (extra.options.includes(v)) value.extraDetails[extra.key] = v;
  }
  return result(value, error);
}

function validateComment(body = {}) {
  const value = { text: str(body.text) };
  let error = null;
  if (!value.text) error = 'Write a comment first';
  else if (value.text.length > 500) error = 'Comment can be at most 500 characters';
  return result(value, error);
}

// ---------- FR8: manager update ----------
function validateStatusUpdate(body = {}) {
  const value = {
    status: str(body.status),
    priority: str(body.priority),
    assignedTo: str(body.assignedTo),
    note: str(body.note)
  };
  let error = null;
  if (!STATUSES.includes(value.status)) error = 'Choose a valid status';
  else if (!PRIORITIES.includes(value.priority)) error = 'Choose a valid priority';
  else if (value.assignedTo.length > 60) error = 'Staff name can be at most 60 characters';
  else if (value.note.length > 500) error = 'Comment can be at most 500 characters';
  return result(value, error);
}

// ---------- FR5 / FR7: list filters from the query string ----------
// Unknown or malformed values are dropped instead of causing an error.
function parseComplaintFilters(query = {}) {
  const pick = (v, list) => (list.includes(str(v)) ? str(v) : '');
  const date = (v) => (DATE_RE.test(str(v)) && !isNaN(new Date(str(v))) ? str(v) : '');

  const category = pick(query.category, CATEGORIES);
  const allIssues = [...new Set(Object.values(ISSUES).flat())];
  return {
    q: str(query.q).slice(0, 100),
    status: pick(query.status, STATUSES),
    category,
    issue: pick(query.issue, category ? ISSUES[category] : allIssues),
    priority: pick(query.priority, PRIORITIES),
    hostel: pick(query.hostel, HOSTELS),
    from: date(query.from),
    to: date(query.to),
    student: isObjectId(str(query.student)) ? str(query.student) : '',
    sort: pick(query.sort, Object.keys(SORT_OPTIONS)) || 'newest'
  };
}

module.exports = {
  isObjectId,
  validateRegistration,
  validateLogin,
  validateProfile,
  validateComplaint,
  validateComment,
  validateStatusUpdate,
  parseComplaintFilters
};
