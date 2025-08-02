const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const uploadSingle = require('../../middleware/uploadMiddleware');
const userController = require('../../controllers/userController');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/profileImages');
if (!fs.existsSync(uploadsDir)) {
  console.log(`Creating directory: ${uploadsDir}`);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure user can only upload their own profile image
const authorizeUser = (req, res, next) => {
  const requestedUserId = req.params.userId;
  const authenticatedUserId = req.user.id || req.user.idNumber;
  
  console.log('Authorization check:', {
    requestedUserId,
    authenticatedUserId,
    isAdmin: req.user.role === 'admin'
  });
  
  // Allow if user is uploading their own image or is an admin
  if (requestedUserId === authenticatedUserId || req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'You are not authorized to upload a profile image for this user'
  });
};

// POST /api/users/:userId/upload-image
router.post(
  '/:userId/upload-image',
  authMiddleware,
  authorizeUser,
  uploadSingle('profileImage'),
  userController.uploadProfileImage
);

module.exports = router;
