// const express = require('express');
// const router = express.Router();
// const db = require('../db');
// const { verifyToken } = require('../middleware/auth');

// // @route   GET /api/favorites/public
// // @desc    Get all favorite items for public display (travelers/drivers home page)
// // @access  Public
// router.get('/public', async (req, res) => {
//   try {
//     const favorites = {
//       trips: [],
//       camping: [],
//       attractions: []
//     };

//     // Get favorite trips
//     try {
//       const [trips] = await db.query("SELECT * FROM trips WHERE is_favorite = TRUE");
//       favorites.trips = trips;
//     } catch (err) {
//       console.log("No is_favorite column in trips table yet");
//     }

//     // Get favorite camping spots
//     try {
//       const [camping] = await db.query("SELECT * FROM camping WHERE is_favorite = TRUE");
//       favorites.camping = camping;
//     } catch (err) {
//       console.log("No is_favorite column in camping table yet");
//     }

//     // Get favorite attractions
//     try {
//       const [attractions] = await db.query("SELECT * FROM attractions WHERE is_favorite = TRUE");
//       favorites.attractions = attractions;
//     } catch (err) {
//       console.log("No is_favorite column in attractions table yet");
//     }

//     res.json(favorites);
//   } catch (err) {
//     console.error("🔥 שגיאה בקבלת מועדפים ציבוריים:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// });

// // @route   POST /api/favorites/toggle
// // @desc    Toggle user favorite (add/remove)
// // @access  Public (no auth required)
// router.post('/toggle', async (req, res) => {
//   try {
//     const { userId, contentType, contentId } = req.body;

//     console.log('🔄 Toggle favorite:', { userId, contentType, contentId });

//     if (!userId || !contentType || !contentId) {
//       return res.status(400).json({ error: 'Missing required fields: userId, contentType, contentId' });
//     }

//     // בדיקה אם כבר קיים במועדפים
//     const checkQuery = 'SELECT * FROM favorites WHERE user_idNumber = ? AND content_type = ? AND content_id = ?';
//     const [existing] = await db.query(checkQuery, [userId, contentType, contentId]);

//     if (existing.length > 0) {
//       // אם קיים → מחיקה
//       const deleteQuery = 'DELETE FROM favorites WHERE user_idNumber = ? AND content_type = ? AND content_id = ?';
//       await db.query(deleteQuery, [userId, contentType, contentId]);
//       console.log('❌ Removed from favorites');
//       res.json({ message: 'הוסר מהמועדפים', isFavorite: false });
//     } else {
//       // אם לא קיים → הוספה
//       const insertQuery = 'INSERT INTO favorites (user_idNumber, content_type, content_id, created_at) VALUES (?, ?, ?, NOW())';
//       await db.query(insertQuery, [userId, contentType, contentId]);
//       console.log('✅ Added to favorites');
//       res.json({ message: 'נוסף למועדפים', isFavorite: true });
//     }
//   } catch (err) {
//     console.error('🔥 שגיאה בעדכון מועדפים:', err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // @route   GET /api/favorites/check/:userId/:contentType/:contentId
// // @desc    Check if item is favorited by user
// // @access  Public (no auth required since userId is in URL)
// router.get('/check/:userId/:contentType/:contentId', async (req, res) => {
//   try {
//     const { userId, contentType, contentId } = req.params;

//     if (!userId || !contentType || !contentId) {
//       return res.status(400).json({ error: 'Missing required fields' });
//     }

//     console.log('🔍 Checking favorite:', { userId, contentType, contentId });

//     const checkQuery = 'SELECT * FROM favorites WHERE user_idNumber = ? AND content_type = ? AND content_id = ?';
//     const [existing] = await db.query(checkQuery, [userId, contentType, contentId]);

//     console.log('✅ Check result:', { isFavorite: existing.length > 0 });
//     res.json({ isFavorite: existing.length > 0 });
//   } catch (err) {
//     console.error('🔥 שגיאה בבדיקת מועדפים:', err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // @route   GET /api/favorites/user
// // @desc    Get all user favorites for profile page
// // @access  Private
// router.get('/user', verifyToken, async (req, res) => {
//   try {
//     const user_idNumber = req.user.idNumber;

//     const favorites = {
//       trips: [],
//       camping: [],
//       attractions: []
//     };

//     // Get user's favorite trips
//     const [tripFavorites] = await db.query(`
//       SELECT t.* FROM trips t
//       INNER JOIN favorites f ON f.content_id = t.trip_id
//       WHERE f.user_idNumber = ? AND f.content_type = 'trip'
//     `, [user_idNumber]);
//     favorites.trips = tripFavorites;

//     // Get user's favorite camping spots
//     const [campingFavorites] = await db.query(`
//       SELECT c.* FROM camping c
//       INNER JOIN favorites f ON f.content_id = c.camping_location_name
//       WHERE f.user_idNumber = ? AND f.content_type = 'camping'
//     `, [user_idNumber]);
//     favorites.camping = campingFavorites;

//     // Get user's favorite attractions
//     const [attractionFavorites] = await db.query(`
//       SELECT a.* FROM attractions a
//       INNER JOIN favorites f ON f.content_id = a.attraction_id
//       WHERE f.user_idNumber = ? AND f.content_type = 'attraction'
//     `, [user_idNumber]);
//     favorites.attractions = attractionFavorites;

//     res.json(favorites);
//   } catch (err) {
//     console.error('🔥 שגיאה בקבלת מועדפי משתמש:', err);
//     res.status(500).json({ error: err.message });
//   }
// });

// module.exports = router;
