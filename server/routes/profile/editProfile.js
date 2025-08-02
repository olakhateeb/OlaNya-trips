const express = require('express');
const router = express.Router();
const { 
  uploadProfileImage,
  updateProfile 
} = require('../../controllers/userController');
const uploadSingle = require('../../middleware/uploadMiddleware');
const auth = require('../../middleware/authMiddleware');

const checkUser = (req, res, next) => {
  if (req.user.id !== req.params.userId) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  next();
};

// Update user profile
router.put('/:userId', auth, checkUser, updateProfile);

// Upload profile image
router.post('/:userId/upload-image', auth, checkUser, uploadSingle('profileImage'), uploadProfileImage);

module.exports = router;
