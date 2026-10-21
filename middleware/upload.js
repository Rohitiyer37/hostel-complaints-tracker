const multer = require('multer');
const path = require('path');
const { MAX_PHOTOS } = require('../utils/constants');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  }
});

const fileFilter = (req, file, cb) => {
  if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024, files: MAX_PHOTOS } }); // 2 MB each

const MESSAGES = {
  LIMIT_FILE_SIZE: 'Each photo must be 2 MB or smaller',
  LIMIT_FILE_COUNT: 'You can attach at most ' + MAX_PHOTOS + ' photos',
  LIMIT_UNEXPECTED_FILE: 'You can attach at most ' + MAX_PHOTOS + ' photos'
};

// Accepts up to MAX_PHOTOS files in the "photos" field. Upload problems do not crash
// the request: they are stored in req.uploadError so the form can be shown again.
exports.photos = (req, res, next) => {
  upload.array('photos', MAX_PHOTOS)(req, res, (err) => {
    if (err) {
      req.uploadError = MESSAGES[err.code] || (err instanceof multer.MulterError ? 'Could not upload the photos' : err.message);
      req.files = [];
    }
    next();
  });
};
