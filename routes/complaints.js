const express = require('express');
const fs = require('fs');
const path = require('path');
const Complaint = require('../models/Complaint');
const upload = require('../middleware/upload');
const { protect, studentOnly } = require('../middleware/auth');

const router = express.Router();
const CATEGORIES = ['Electrical', 'Plumbing', 'Cleaning', 'Furniture', 'Internet', 'Other'];

// ---------- Student dashboard: my complaints (with filter + text search) ----------
router.get('/dashboard', protect, studentOnly, async (req, res) => {
  const { status, q } = req.query;
  const filter = { studentId: req.user._id };
  if (status) filter.status = status;
  if (q) filter.$text = { $search: q }; // uses the text index

  const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
  res.render('dashboard', { complaints, status: status || '', q: q || '' });
});

// ---------- New complaint form ----------
router.get('/complaints/new', protect, studentOnly, (req, res) => {
  res.render('new-complaint', { error: null, categories: CATEGORIES });
});

// ---------- Create complaint (with optional image) ----------
router.post(
  '/complaints',
  protect,
  studentOnly,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) return res.render('new-complaint', { error: err.message, categories: CATEGORIES });
      next();
    });
  },
  async (req, res) => {
    try {
      const { category, title, description, priority, waterSource, applianceType, speedIssue } = req.body;

      // Flexible schema: store different extra fields per category
      const extraDetails = {};
      if (category === 'Plumbing' && waterSource) extraDetails.waterSource = waterSource;
      if (category === 'Electrical' && applianceType) extraDetails.applianceType = applianceType;
      if (category === 'Internet' && speedIssue) extraDetails.speedIssue = speedIssue;

      await Complaint.create({
        studentId: req.user._id,
        category,
        title,
        description,
        priority,
        hostel: req.user.hostel,
        roomNo: req.user.roomNo,
        image: req.file ? '/uploads/' + req.file.filename : undefined,
        extraDetails
      });
      res.redirect('/dashboard');
    } catch (err) {
      if (req.file) fs.unlink(req.file.path, () => {}); // remove orphan image
      res.render('new-complaint', { error: err.message, categories: CATEGORIES });
    }
  }
);

// ---------- Complaint detail (owner or admin) ----------
router.get('/complaints/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('studentId', 'name email roomNo');
    if (!complaint) return res.status(404).send('Complaint not found');

    const isOwner = complaint.studentId._id.equals(req.user._id);
    if (!isOwner && req.user.role !== 'admin') return res.status(403).send('Not allowed');

    res.render('complaint-detail', { complaint });
  } catch (err) {
    res.status(404).send('Complaint not found');
  }
});

// ---------- Add comment (embedded array: $push) ----------
router.post('/complaints/:id/comment', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).send('Complaint not found');

    const isOwner = complaint.studentId.equals(req.user._id);
    if (!isOwner && req.user.role !== 'admin') return res.status(403).send('Not allowed');

    if (req.body.text && req.body.text.trim()) {
      await Complaint.updateOne(
        { _id: complaint._id },
        { $push: { comments: { by: req.user.name, role: req.user.role, text: req.body.text.trim() } } }
      );
    }
    res.redirect('/complaints/' + complaint._id);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// ---------- Delete own complaint (only while Pending) ----------
router.post('/complaints/:id/delete', protect, studentOnly, async (req, res) => {
  const complaint = await Complaint.findOne({ _id: req.params.id, studentId: req.user._id, status: 'Pending' });
  if (complaint) {
    if (complaint.image) fs.unlink(path.join(__dirname, '..', complaint.image), () => {});
    await complaint.deleteOne();
  }
  res.redirect('/dashboard');
});

module.exports = router;
