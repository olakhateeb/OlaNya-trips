const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// יצירת תיקיית uploads אם לא קיימת
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// הגדרת אחסון multer לתיקיית uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// סינון קבצים (רק תמונות)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed (jpeg, jpg, png, gif)'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter
});

// Middleware עם טיפול בשגיאות multer
const uploadMiddleware = (req, res, next) => {
  upload.single('image')(req, res, err => {
    if (err instanceof multer.MulterError) {
      // שגיאה של multer
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      // שגיאה כללית
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

router.post('/', uploadMiddleware, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const filePath = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    message: 'File uploaded successfully',
    filePath
  });
});

module.exports = router;