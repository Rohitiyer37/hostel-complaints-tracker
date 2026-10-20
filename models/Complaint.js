const mongoose = require('mongoose');

// ---- EMBEDDED sub-documents (live INSIDE the complaint document) ----
const commentSchema = new mongoose.Schema(
  { by: String, role: String, text: String, at: { type: Date, default: Date.now } },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  { status: String, at: { type: Date, default: Date.now } },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    // ---- REFERENCED: points to a document in the "users" collection ----
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    category: {
      type: String,
      enum: ['Electrical', 'Plumbing', 'Cleaning', 'Furniture', 'Internet', 'Other'],
      required: true
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
    hostel: String,
    roomNo: String,

    // Image: only the file PATH is stored, the file itself sits in /uploads
    image: String,

    // FLEXIBLE SCHEMA: different categories store different extra fields
    extraDetails: { type: mongoose.Schema.Types.Mixed, default: {} },

    comments: [commentSchema],
    statusHistory: { type: [historySchema], default: () => [{ status: 'Pending' }] },

    resolvedAt: Date
  },
  { timestamps: true, minimize: false }
);

// ---- INDEXES ----
complaintSchema.index({ studentId: 1, status: 1 });          // student's own list filtered by status
complaintSchema.index({ hostel: 1, category: 1 });           // admin filters
complaintSchema.index({ title: 'text', description: 'text' }); // text search

module.exports = mongoose.model('Complaint', complaintSchema);
