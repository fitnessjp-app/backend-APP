const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Storage is Cloudinary — files upload directly to the cloud, no local disk
// writes. Controllers only rely on `req.file.path` (Cloudinary returns the
// full secure URL in `path`), so this stays a drop-in swap.
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'fitzone/members',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const mimeOk = allowed.test(file.mimetype);
  if (mimeOk) return cb(null, true);
  cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
