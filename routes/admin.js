const express = require('express');
const Complaint = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, adminOnly);

const CATEGORIES = ['Electrical', 'Plumbing', 'Cleaning', 'Furniture', 'Internet', 'Other'];
const HOSTELS = ['Block A', 'Block B', 'Block C', 'Block D'];

// ---------- All complaints with filters ----------
router.get('/', async (req, res) => {
  const { status, category, hostel, priority, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (hostel) filter.hostel = hostel;
  if (priority) filter.priority = priority;
  if (q) filter.$text = { $search: q };

  const complaints = await Complaint.find(filter).populate('studentId', 'name').sort({ createdAt: -1 });
  res.render('admin', {
    complaints,
    categories: CATEGORIES,
    hostels: HOSTELS,
    f: { status: status || '', category: category || '', hostel: hostel || '', priority: priority || '', q: q || '' }
  });
});

// ---------- Update status ($set + $push to embedded history) ----------
router.post('/complaints/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!['Pending', 'In Progress', 'Resolved'].includes(status)) return res.status(400).send('Invalid status');

    const update = {
      $set: { status, resolvedAt: status === 'Resolved' ? new Date() : null },
      $push: { statusHistory: { status } }
    };
    if (note && note.trim()) {
      update.$push.comments = { by: req.user.name, role: 'admin', text: note.trim() };
    }
    await Complaint.updateOne({ _id: req.params.id }, update);
    res.redirect('/complaints/' + req.params.id);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// ---------- Stats dashboard (AGGREGATION PIPELINES) ----------
router.get('/stats', async (req, res) => {
  const total = await Complaint.countDocuments();

  // 1. complaints per category
  const byCategory = await Complaint.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // 2. complaints per status
  const byStatus = await Complaint.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // 3. per hostel: total, and how many are still open
  const byHostel = await Complaint.aggregate([
    {
      $group: {
        _id: '$hostel',
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $ne: ['$status', 'Resolved'] }, 1, 0] } }
      }
    },
    { $sort: { total: -1 } }
  ]);

  // 4. average resolution time (hours) per hostel, only resolved complaints
  const avgResolution = await Complaint.aggregate([
    { $match: { status: 'Resolved', resolvedAt: { $ne: null } } },
    { $project: { hostel: 1, hours: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60] } } },
    { $group: { _id: '$hostel', avgHours: { $avg: '$hours' }, resolved: { $sum: 1 } } },
    { $sort: { avgHours: 1 } }
  ]);

  // 5. complaints per month
  const perMonth = await Complaint.aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  // 6. students with most complaints ($lookup = JOIN with users collection)
  const topStudents = await Complaint.aggregate([
    { $group: { _id: '$studentId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'student' } },
    { $unwind: '$student' },
    { $project: { _id: 0, name: '$student.name', roomNo: '$student.roomNo', count: 1 } }
  ]);

  res.render('stats', { total, byCategory, byStatus, byHostel, avgResolution, perMonth, topStudents });
});

module.exports = router;
