// server/routes/profile.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const { verifyToken } = require('../../middleware/auth');
const db = require('../../db');

// multer setup for profile-picture upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// GET current user profile
// verifyToken in /mid/auth.js
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const conn = db.getConnection();
    const [rows] = await conn.promise()
      .query('SELECT name, email, phone, profilePicture FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE profile (name, phone, profilePicture)
router.put(
  '/profile',
  verifyToken,
  upload.single('profilePicture'),
  async (req, res) => {
    const { name, phone } = req.body;
    const updates = [];
    const params  = [];

    if (name)  { updates.push('name = ?');  params.push(name); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (req.file) {
      updates.push('profilePicture = ?');
      params.push(`/uploads/${req.file.filename}`);
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No data provided' });
    }
    params.push(req.user.id);

    try {
      const conn = db.getConnection();
      await conn.promise()
        .query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

      // return updated record
      const [rows] = await conn.promise()
        .query('SELECT name, email, phone, profilePicture FROM users WHERE id = ?', [req.user.id]);
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// CHANGE password
router.put('/password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const conn = db.getConnection();
    const [rows] = await conn.promise()
      .query('SELECT password FROM users WHERE id = ?', [req.user.id]);

    if (!rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const match = await bcrypt.compare(currentPassword, rows[0].password);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await conn.promise()
      .query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
