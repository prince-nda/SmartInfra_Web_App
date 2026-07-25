const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');

const MAX_IMAGES_PER_REPORT = 3;
const MAX_FILE_SIZE_MB = 5;

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, or WEBP images are allowed'));
  }
  cb(null, true);
}

// Field name "images", capped at 3 per the class-diagram composition rule
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: MAX_IMAGES_PER_REPORT,
  },
}).array('images', MAX_IMAGES_PER_REPORT);

/** Wraps multer's callback API in a middleware that returns clean JSON errors. */
function handleImageUpload(req, res, next) {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: `A report can have at most ${MAX_IMAGES_PER_REPORT} images` });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: `Each image must be under ${MAX_FILE_SIZE_MB}MB` });
      }
      return res.status(400).json({ message: err.message });
    }
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}

/** Streams a single in-memory buffer up to Cloudinary and resolves with { url, publicId }. */
function uploadBufferToCloudinary(buffer, folder = 'smartinfra/reports') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/** Uploads every file on req.files (set by handleImageUpload) to Cloudinary. */
async function uploadAllToCloudinary(files = []) {
  const uploads = files.map((file) => uploadBufferToCloudinary(file.buffer));
  return Promise.all(uploads);
}

module.exports = { handleImageUpload, uploadAllToCloudinary, MAX_IMAGES_PER_REPORT };