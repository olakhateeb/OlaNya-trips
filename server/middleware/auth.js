// // // server/middleware/auth.js
// // const jwt = require('jsonwebtoken');
// // const User = require('../models/User');

// // // Middleware to verify JWT token in the Authorization header
// // async function verifyToken(req, res, next) {
// //   const authHeader = req.headers.authorization;
// //   if (!authHeader || !authHeader.startsWith('Bearer ')) {
// //     return res.status(401).json({ message: 'No token provided' });
// //   }

// //   const token = authHeader.split(' ')[1];
// //   try {
// //     const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");

// //     // JWT payload has nested user structure
// //     const userId = decoded.user.id || decoded.user.idNumber;

// //     // Get user details including role from database
// //     const user = await User.findById(userId);
// //     if (!user) {
// //       return res.status(401).json({ message: 'User not found' });
// //     }

// //     req.user = {
// //       id: userId,
// //       role: user.role,
// //       userName: user.userName,
// //       email: user.email
// //     };
// //     next();
// //   } catch (err) {
// //     console.error('Auth middleware error:', err);
// //     return res.status(401).json({ message: 'Invalid or expired token' });
// //   }
// // }

// // module.exports = { verifyToken };

// // server/middleware/auth.js
// const jwt = require("jsonwebtoken");
// const db = require("../db");

// module.exports = async function authMiddleware(req, res, next) {
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({ message: "No token provided" });
//   }

//   const token = authHeader.split(" ")[1];
//   try {
//     const decoded = jwt.verify(
//       token,
//       process.env.JWT_SECRET || "your_jwt_secret"
//     );

//     // ננסה לזהות מזהה משתמש מה־JWT:
//     const userId =
//       decoded?.user?.idNumber ||
//       decoded?.user?.id ||
//       decoded?.idNumber ||
//       decoded?.id;
//     if (!userId) {
//       return res
//         .status(401)
//         .json({ message: "Invalid token payload (no user id)" });
//     }

//     // שליפת המשתמש מ־MySQL (טבלת users כפי שהגדרת)
//     const [rows] = await db.query(
//       "SELECT idNumber, role, userName, email FROM users WHERE idNumber = ? LIMIT 1",
//       [userId]
//     );
//     const user = rows?.[0];
//     if (!user) {
//       return res.status(401).json({ message: "User not found" });
//     }

//     // ננרמל לשדה idNumber כדי להתאים לקונטרולר
//     req.user = {
//       idNumber: user.idNumber,
//       role: user.role,
//       userName: user.userName,
//       email: user.email,
//     };

//     next();
//   } catch (err) {
//     console.error("Auth middleware error:", err);
//     return res.status(401).json({ message: "Invalid or expired token" });
//   }
// };
