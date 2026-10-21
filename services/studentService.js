const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { PAGE_SIZE } = require('../utils/constants');
const { escapeRegex } = require('../utils/helpers');

// ---------- FR10: student directory with per-student complaint counts ----------
// One aggregation: page of students + a $lookup that GROUPS each student's complaints
// inside the database (no extra query per student).
async function listStudents({ q, hostel }, page) {
  const match = { role: 'student' };
  if (hostel) match.hostel = hostel;
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    match.$or = [{ name: re }, { email: re }, { roomNo: re }];
  }

  const count = (status) => ({ $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] } });

  const [res] = await User.aggregate([
    { $match: match },
    { $sort: { name: 1 } },
    {
      $facet: {
        items: [
          { $skip: (page - 1) * PAGE_SIZE },
          { $limit: PAGE_SIZE },
          { $project: { password: 0 } },
          {
            $lookup: {
              from: Complaint.collection.name,
              let: { sid: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$studentId', '$$sid'] } } },
                {
                  $group: {
                    _id: null,
                    total: { $sum: 1 },
                    pending: count('Pending'),
                    inProgress: count('In Progress'),
                    resolved: count('Resolved'),
                    rejected: count('Rejected'),
                    last: { $max: '$createdAt' }
                  }
                }
              ],
              as: 'stats'
            }
          },
          { $set: { stats: { $ifNull: [{ $arrayElemAt: ['$stats', 0] }, { total: 0 }] } } }
        ],
        total: [{ $count: 'n' }]
      }
    }
  ]);
  return { items: res.items, total: res.total.length ? res.total[0].n : 0 };
}

module.exports = { listStudents };
