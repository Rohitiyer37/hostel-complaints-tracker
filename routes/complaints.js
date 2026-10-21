const express = require('express');
const complaints = require('../controllers/complaintController');
const upload = require('../middleware/upload');
const { protect, studentOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
const student = [protect, studentOnly];

router.get('/dashboard', student, asyncHandler(complaints.dashboard));
router.get('/complaints/new', student, complaints.newForm);
router.post('/complaints', student, upload.photos, asyncHandler(complaints.create));
router.get('/complaints/:id', protect, asyncHandler(complaints.show));
router.get('/complaints/:id/edit', student, asyncHandler(complaints.editForm));
router.post('/complaints/:id/edit', student, upload.photos, asyncHandler(complaints.update));
router.post('/complaints/:id/delete', student, asyncHandler(complaints.remove));
router.post('/complaints/:id/comment', protect, asyncHandler(complaints.addComment));

module.exports = router;
