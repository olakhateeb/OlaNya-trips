// // middleware/adminAuth.js
// // מידלוור לבדיקת הרשאות מנהל

// module.exports = function(req, res, next) {
//   try {
//     // בדיקה שהמשתמש הוא מנהל
//     if (!req.user || req.user.role !== 'admin') {
//       return res.status(403).json({ success: false, message: 'אין הרשאה. נדרשות הרשאות מנהל.' });
//     }
    
//     next();
//   } catch (err) {
//     console.error('Error in admin authentication:', err);
//     res.status(500).json({ success: false, message: 'שגיאת שרת' });
//   }
// };
