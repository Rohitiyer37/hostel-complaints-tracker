const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { validateProfile } = require('../utils/validators');

const renderProfile = async (req, res, form, error = null, status = 200) => {
  const counts =
    req.user.role === 'student'
      ? await Complaint.aggregate([{ $match: { studentId: req.user._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }])
      : [];
  res.status(status).render('profile', { form, error, counts });
};

// ---------- FR12: view profile ----------
exports.show = (req, res) => renderProfile(req, res, req.user);

// ---------- FR12: update profile ----------
exports.update = async (req, res) => {
  const { value, error } = validateProfile(req.body, req.user.role);
  if (error) return renderProfile(req, res, { ...value, role: req.user.role }, error, 400);

  if (await User.exists({ email: value.email, _id: { $ne: req.user._id } })) {
    return renderProfile(req, res, { ...value, role: req.user.role }, 'This email is already used by another account', 409);
  }
  await User.updateOne({ _id: req.user._id }, { $set: value });
  req.flash('success', 'Profile updated');
  res.redirect('/profile');
};
