const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    hostel: { type: String, required: true },
    roomNo: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
