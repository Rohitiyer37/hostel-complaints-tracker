const Complaint = require('../models/Complaint');
const { MAX_PHOTOS, PAGE_SIZE } = require('../utils/constants');
const { HttpError, parsePage, buildPager } = require('../utils/helpers');
const { isObjectId, validateComplaint, validateComment, parseComplaintFilters } = require('../utils/validators');
const { listComplaints, deletePhotos, photoPaths } = require('../services/complaintService');

const notFound = () => new HttpError(404, 'Complaint not found');

// Complaint the logged-in user may see: their own, or any for a manager
async function findVisible(req) {
  if (!isObjectId(req.params.id)) throw notFound();
  const complaint = await Complaint.findById(req.params.id).populate('studentId', 'name email hostel roomNo');
  if (!complaint) throw notFound();

  const isOwner = complaint.studentId && complaint.studentId._id.equals(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw new HttpError(403, 'You can only view your own complaints');
  return complaint;
}

async function findOwn(req) {
  if (!isObjectId(req.params.id)) throw notFound();
  const complaint = await Complaint.findOne({ _id: req.params.id, studentId: req.user._id });
  if (!complaint) throw notFound();
  return complaint;
}

const notPending = (req, res, complaint, action) => {
  req.flash('error', 'Only pending complaints can be ' + action + '. This one is ' + complaint.status.toLowerCase() + '.');
  res.redirect('/complaints/' + complaint._id);
};

// ---------- FR5: student dashboard: my complaints (search, filter, sort, paginate) ----------
exports.dashboard = async (req, res) => {
  const f = parseComplaintFilters(req.query);
  const page = parsePage(req.query.page);
  const [{ items, total }, counts] = await Promise.all([
    listComplaints(f, page, { studentId: req.user._id }),
    Complaint.aggregate([{ $match: { studentId: req.user._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }])
  ]);
  res.render('dashboard', { complaints: items, f, counts, pager: buildPager(total, page, PAGE_SIZE, f) });
};

// ---------- FR2: new complaint form (hostel + room prefilled from profile) ----------
exports.newForm = (req, res) => {
  res.render('new-complaint', { error: null, form: { hostel: req.user.hostel, roomNo: req.user.roomNo, priority: 'Medium' } });
};

// ---------- FR2: create complaint (up to 3 photos) ----------
exports.create = async (req, res) => {
  const files = photoPaths(req.files);
  const { value, error } = validateComplaint(req.body);
  if (req.uploadError || error) {
    deletePhotos(files);
    return res.status(400).render('new-complaint', { error: req.uploadError || error, form: value });
  }

  let complaint;
  try {
    complaint = await Complaint.create({
      ...value,
      studentId: req.user._id,
      images: files,
      statusHistory: [{ status: 'Pending', by: req.user.name }]
    });
  } catch (err) {
    deletePhotos(files); // remove orphan images
    throw err;
  }
  req.flash('success', 'Complaint ' + complaint.complaintId + ' filed');
  res.redirect('/complaints/' + complaint._id);
};

// ---------- Complaint detail (owner or manager) ----------
exports.show = async (req, res) => {
  const complaint = await findVisible(req);
  res.render('complaint-detail', { complaint });
};

// ---------- FR6: edit own complaint (only while Pending) ----------
exports.editForm = async (req, res) => {
  const complaint = await findOwn(req);
  if (complaint.status !== 'Pending') return notPending(req, res, complaint, 'edited');
  res.render('edit-complaint', { error: null, complaint, form: complaint.toObject() });
};

exports.update = async (req, res) => {
  const files = photoPaths(req.files);
  const complaint = await findOwn(req).catch((err) => {
    deletePhotos(files);
    throw err;
  });
  if (complaint.status !== 'Pending') {
    deletePhotos(files);
    return notPending(req, res, complaint, 'edited');
  }

  const { value, error } = validateComplaint(req.body);
  const remove = [].concat(req.body.removePhotos || []).filter((p) => complaint.images.includes(p));
  const kept = complaint.images.filter((p) => !remove.includes(p));

  let problem = req.uploadError || error;
  if (!problem && kept.length + files.length > MAX_PHOTOS) {
    problem = 'A complaint can have at most ' + MAX_PHOTOS + ' photos. Remove some of the current ones first.';
  }
  if (problem) {
    deletePhotos(files);
    return res.status(400).render('edit-complaint', { error: problem, complaint, form: value });
  }

  // status in the filter: if a manager picked it up a moment ago, the edit is refused
  const result = await Complaint.updateOne(
    { _id: complaint._id, status: 'Pending' },
    { $set: { ...value, images: [...kept, ...files] } }
  );
  if (!result.matchedCount) {
    deletePhotos(files);
    return notPending(req, res, await Complaint.findById(complaint._id), 'edited');
  }
  deletePhotos(remove);
  req.flash('success', 'Complaint ' + complaint.complaintId + ' updated');
  res.redirect('/complaints/' + complaint._id);
};

// ---------- FR6: delete own complaint (only while Pending) ----------
exports.remove = async (req, res) => {
  const complaint = await findOwn(req);
  const deleted = await Complaint.findOneAndDelete({ _id: complaint._id, status: 'Pending' });
  if (!deleted) return notPending(req, res, complaint, 'deleted');

  deletePhotos([...deleted.images, deleted.image].filter(Boolean));
  req.flash('success', 'Complaint ' + deleted.complaintId + ' deleted');
  res.redirect('/dashboard');
};

// ---------- Add comment (embedded array: $push) ----------
exports.addComment = async (req, res) => {
  const complaint = await findVisible(req);
  const { value, error } = validateComment(req.body);
  if (error) {
    req.flash('error', error);
  } else {
    await Complaint.updateOne(
      { _id: complaint._id },
      { $push: { comments: { by: req.user.name, role: req.user.role, text: value.text } } }
    );
    req.flash('success', 'Comment posted');
  }
  res.redirect('/complaints/' + complaint._id + '#comments');
};
