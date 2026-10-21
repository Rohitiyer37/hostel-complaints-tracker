const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { PAGE_SIZE } = require('../utils/constants');
const { HttpError, parsePage, buildPager } = require('../utils/helpers');
const { isObjectId, validateStatusUpdate, parseComplaintFilters } = require('../utils/validators');
const { listComplaints, getAnalytics } = require('../services/complaintService');
const { listStudents } = require('../services/studentService');

// ---------- FR7: all complaints with student details and filters ----------
exports.list = async (req, res) => {
  const f = parseComplaintFilters(req.query);
  const page = parsePage(req.query.page);
  const [{ items, total }, student] = await Promise.all([
    listComplaints(f, page),
    f.student ? User.findById(f.student).select('name') : null
  ]);
  res.render('admin', { complaints: items, f, student, pager: buildPager(total, page, PAGE_SIZE, f) });
};

// ---------- FR8 + FR9: status, priority, staff, comment ----------
exports.updateComplaint = async (req, res) => {
  if (!isObjectId(req.params.id)) throw new HttpError(404, 'Complaint not found');
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new HttpError(404, 'Complaint not found');

  const back = '/complaints/' + complaint._id;
  const { value, error } = validateStatusUpdate(req.body);
  if (error) {
    req.flash('error', error);
    return res.redirect(back);
  }

  const changes = [];
  if (value.status !== complaint.status) {
    complaint.statusHistory.push({ status: value.status, by: req.user.name });
    // FR9: record when it was resolved; clear it if the complaint is reopened or rejected
    complaint.resolvedAt = value.status === 'Resolved' ? new Date() : undefined;
    complaint.status = value.status;
    changes.push('status set to ' + value.status);
  }
  if (value.priority !== complaint.priority) {
    complaint.priority = value.priority;
    changes.push('priority set to ' + value.priority);
  }
  if (value.assignedTo !== (complaint.assignedTo || '')) {
    complaint.assignedTo = value.assignedTo || undefined;
    changes.push(value.assignedTo ? 'assigned to ' + value.assignedTo : 'staff unassigned');
  }
  if (value.note) {
    complaint.comments.push({ by: req.user.name, role: 'admin', text: value.note });
    changes.push('comment added');
  }

  if (!changes.length) {
    req.flash('info', 'Nothing to update');
    return res.redirect(back);
  }
  await complaint.save();
  req.flash('success', complaint.complaintId + ': ' + changes.join(', '));
  res.redirect(back);
};

// ---------- FR10: student directory ----------
exports.students = async (req, res) => {
  const f = parseComplaintFilters(req.query);
  const page = parsePage(req.query.page);
  const { items, total } = await listStudents(f, page);
  res.render('students', { students: items, f, pager: buildPager(total, page, PAGE_SIZE, { q: f.q, hostel: f.hostel }) });
};

// ---------- FR11: analytics (aggregation pipelines) ----------
exports.stats = async (req, res) => {
  res.render('stats', await getAnalytics());
};
