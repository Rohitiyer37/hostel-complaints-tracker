const mongoose = require('mongoose');
const { CATEGORIES, STATUSES, PRIORITIES } = require('../utils/constants');
const { nextComplaintId } = require('../services/counterService');

// ---- EMBEDDED sub-documents (live INSIDE the complaint document) ----
const commentSchema = new mongoose.Schema(
  { by: String, role: String, text: String, at: { type: Date, default: Date.now } },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  { status: String, by: String, at: { type: Date, default: Date.now } },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    // Human-friendly sequential ID, e.g. CMP-0001 (assigned in the pre-validate hook below)
    complaintId: { type: String, unique: true, sparse: true },

    // ---- REFERENCED: points to a document in the "users" collection ----
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    category: { type: String, enum: CATEGORIES, required: true },
    issue: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    status: { type: String, enum: STATUSES, default: 'Pending' },
    hostel: String,
    roomNo: String,

    // Images: only the file PATHS are stored (max 3), the files sit in /uploads
    images: { type: [String], default: [] },
    image: String, // legacy single photo, moved into images on startup

    // FLEXIBLE SCHEMA: different categories store different extra fields
    extraDetails: { type: mongoose.Schema.Types.Mixed, default: {} },

    assignedTo: { type: String, trim: true }, // staff member handling the complaint

    comments: [commentSchema],
    statusHistory: { type: [historySchema], default: () => [{ status: 'Pending' }] },

    resolvedAt: Date
  },
  { timestamps: true, minimize: false }
);

complaintSchema.pre('validate', async function () {
  if (this.isNew && !this.complaintId) this.complaintId = await nextComplaintId();
});

// ---- INDEXES ----
complaintSchema.index({ studentId: 1, status: 1 });          // student's own list filtered by status
complaintSchema.index({ hostel: 1, category: 1 });           // admin filters
complaintSchema.index({ createdAt: -1 });                    // default sort + date range filter
complaintSchema.index({ title: 'text', description: 'text' }); // text search

module.exports = mongoose.model('Complaint', complaintSchema);
