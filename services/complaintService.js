const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { STATUSES, PRIORITIES, PAGE_SIZE } = require('../utils/constants');
const { escapeRegex } = require('../utils/helpers');
const { syncCounter, nextComplaintId } = require('./counterService');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  priority: { priorityRank: 1, createdAt: -1 },
  status: { statusRank: 1, createdAt: -1 }
};

// Turns the parsed filters (see parseComplaintFilters) into a MongoDB $match
function buildMatch(f, studentId) {
  const match = {};
  if (studentId) match.studentId = studentId;
  else if (f.student) match.studentId = new mongoose.Types.ObjectId(f.student);

  ['status', 'category', 'issue', 'priority', 'hostel'].forEach((k) => {
    if (f[k]) match[k] = f[k];
  });

  if (f.from || f.to) {
    match.createdAt = {};
    if (f.from) match.createdAt.$gte = new Date(f.from + 'T00:00:00');
    if (f.to) {
      const end = new Date(f.to + 'T00:00:00');
      end.setDate(end.getDate() + 1); // "to" date is inclusive
      match.createdAt.$lt = end;
    }
  }

  if (f.q) {
    const re = new RegExp(escapeRegex(f.q), 'i');
    match.$or = [{ complaintId: re }, { title: re }, { description: re }, { issue: re }];
  }
  return match;
}

// ---------- One page of complaints + total count in a single aggregation ----------
async function listComplaints(filters, page, { studentId } = {}) {
  const [res] = await Complaint.aggregate([
    { $match: buildMatch(filters, studentId) },
    {
      $addFields: {
        priorityRank: { $indexOfArray: [PRIORITIES, '$priority'] },
        statusRank: { $indexOfArray: [STATUSES, '$status'] }
      }
    },
    { $sort: SORTS[filters.sort] || SORTS.newest },
    {
      $facet: {
        items: [
          { $skip: (page - 1) * PAGE_SIZE },
          { $limit: PAGE_SIZE },
          // JOIN the student (only for this page of results)
          { $lookup: { from: User.collection.name, localField: 'studentId', foreignField: '_id', as: 'student' } },
          { $set: { student: { $arrayElemAt: ['$student', 0] } } },
          { $unset: ['student.password', 'comments', 'statusHistory'] }
        ],
        total: [{ $count: 'n' }]
      }
    }
  ]);
  return { items: res.items, total: res.total.length ? res.total[0].n : 0 };
}

// ---------- FR11: analytics, all from ONE aggregation using $facet ----------
async function getAnalytics() {
  const hours = { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60] };
  const [r] = await Complaint.aggregate([
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              open: { $sum: { $cond: [{ $in: ['$status', ['Pending', 'In Progress']] }, 1, 0] } },
              resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
              avgHours: { $avg: { $cond: [{ $and: [{ $eq: ['$status', 'Resolved'] }, '$resolvedAt'] }, hours, null] } }
            }
          }
        ],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        byIssue: [
          { $group: { _id: { category: '$category', issue: { $ifNull: ['$issue', 'Not specified'] } }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 12 },
          { $project: { _id: 0, label: { $concat: ['$_id.category', ' · ', '$_id.issue'] }, count: 1 } }
        ],
        // per hostel: total, and how many are still open
        byHostel: [
          {
            $group: {
              _id: '$hostel',
              total: { $sum: 1 },
              open: { $sum: { $cond: [{ $in: ['$status', ['Pending', 'In Progress']] }, 1, 0] } }
            }
          },
          { $sort: { total: -1 } }
        ],
        // average resolution time (hours) per hostel, only resolved complaints
        avgResolution: [
          { $match: { status: 'Resolved', resolvedAt: { $ne: null } } },
          { $group: { _id: '$hostel', avgHours: { $avg: hours }, resolved: { $sum: 1 } } },
          { $sort: { avgHours: 1 } }
        ],
        perMonth: [
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ],
        // students with most complaints ($lookup = JOIN with users collection)
        topStudents: [
          { $group: { _id: '$studentId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
          { $lookup: { from: User.collection.name, localField: '_id', foreignField: '_id', as: 'student' } },
          { $unwind: '$student' },
          { $project: { _id: 1, name: '$student.name', roomNo: '$student.roomNo', count: 1 } }
        ]
      }
    }
  ]);

  // always list every status / priority, even with 0 complaints
  const fill = (rows, keys) => keys.map((k) => ({ _id: k, count: (rows.find((x) => x._id === k) || {}).count || 0 }));
  return {
    totals: r.totals[0] || { total: 0, open: 0, resolved: 0, rejected: 0, avgHours: null },
    byStatus: fill(r.byStatus, STATUSES),
    byPriority: fill(r.byPriority, PRIORITIES),
    byCategory: r.byCategory,
    byIssue: r.byIssue,
    byHostel: r.byHostel,
    avgResolution: r.avgResolution,
    perMonth: r.perMonth,
    topStudents: r.topStudents,
    students: await User.countDocuments({ role: 'student' })
  };
}

// ---------- Photo files ----------
function deletePhotos(paths = []) {
  // basename() stops a stored path from pointing outside /uploads
  paths.forEach((p) => fs.unlink(path.join(UPLOAD_DIR, path.basename(p)), () => {}));
}

const photoPaths = (files = []) => files.map((f) => '/uploads/' + f.filename);

// ---------- One-off upgrade of complaints created before these features ----------
async function migrateLegacyComplaints() {
  // single "image" -> "images" array
  await Complaint.updateMany(
    { image: { $nin: [null, ''] }, $or: [{ images: { $exists: false } }, { images: { $size: 0 } }] },
    [{ $set: { images: ['$image'] } }, { $unset: 'image' }]
  );

  // give old complaints a CMP-xxxx ID, oldest first
  const [max] = await Complaint.aggregate([
    { $match: { complaintId: { $type: 'string' } } },
    { $group: { _id: null, n: { $max: { $toInt: { $substrCP: ['$complaintId', 4, 20] } } } } }
  ]);
  await syncCounter(max ? max.n : 0);

  const missing = await Complaint.find({ complaintId: { $exists: false } }).sort({ createdAt: 1 }).select('_id');
  for (const c of missing) {
    await Complaint.updateOne(
      { _id: c._id, complaintId: { $exists: false } },
      { $set: { complaintId: await nextComplaintId() } }
    );
  }
  if (missing.length) console.log('Assigned complaint IDs to', missing.length, 'older complaint(s)');
}

module.exports = { listComplaints, getAnalytics, deletePhotos, photoPaths, migrateLegacyComplaints };
