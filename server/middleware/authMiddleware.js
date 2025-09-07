// const jwt = require('jsonwebtoken');

// module.exports = (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//       console.log('No authorization header');
//       return res.status(401).json({ success: false, message: 'No token provided' });
//     }

//     const token = authHeader.split(' ')[1];
//     if (!token) {
//       console.log('No token in authorization header');
//       return res.status(401).json({ success: false, message: 'No token provided' });
//     }

//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

//       // Make sure we have the user data we expect
//       // Support both id and idNumber fields
//       if (!decoded.user || (!decoded.user.id && !decoded.user.idNumber)) {
//         console.log('Invalid token payload:', decoded);
//         return res.status(403).json({
//           success: false,
//           message: 'Invalid token payload'
//         });
//       }

//       // Ensure id is always available (some parts of the code use id, others use idNumber)
//       if (!decoded.user.id && decoded.user.idNumber) {
//         decoded.user.id = decoded.user.idNumber;
//       } else if (!decoded.user.idNumber && decoded.user.id) {
//         decoded.user.idNumber = decoded.user.id;
//       }

//       // Attach the user data to the request
//       req.user = decoded.user;
//       console.log('Authenticated user:', req.user);
//       next();
//     } catch (err) {
//       console.error('Token verification failed:', err);
//       return res.status(403).json({
//         success: false,
//         message: 'Failed to authenticate token'
//       });
//     }
//   } catch (error) {
//     console.error('Auth middleware error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error during authentication'
//     });
//   }
// };

// //אבטחה — מוודא שהבקשות לשרת מבוצעות רק על ידי משתמשים עם טוקן תקין.

// // גמישות — תומך בשני שמות למזהה (id ו־idNumber) בשביל תאימות עם שאר המערכת.

// // דיווח שגיאות מפורט — עוזר להבין למה האימות נכשל.

// // קל לשימוש — אפשר לשלב אותו בכל route שרוצים להגן עליו.
