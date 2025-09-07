const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/profileImages');
if (!fs.existsSync(uploadDir)) {
  console.log(`Creating directory: ${uploadDir}`);
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use absolute path to ensure directory is found
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.userId}-${Date.now()}${ext}`);
  },
});

// Add file filter to only accept images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Export a wrapper function that handles errors
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        console.error('Multer error:', err);
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        // An unknown error occurred
        console.error('Unknown upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      // If file was uploaded successfully, log it
      if (req.file) {
        console.log('File uploaded successfully:', {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size
        });
      }
      
      // Continue to next middleware
      next();
    });
  };
};

module.exports = uploadSingle;
