// const express = require("express");
// const router = express.Router();
// const favoritesController = require("../../controllers/favoritesController");
// const { verifyToken } = require("../../middleware/auth");

// router.post("/toggle", verifyToken, favoritesController.toggleFavorite);
// router.get("/check", verifyToken, favoritesController.checkFavorite);
// router.get("/user", verifyToken, favoritesController.getUserFavorites); // אם רוצים רשימת מועדפים

// module.exports = router;

// // Debug all incoming requests to this router
// router.use((req, res, next) => {
//     console.log(`Favorites router received: ${req.method} ${req.originalUrl}`);
//     console.log('Query params:', req.query);
//     console.log('Body:', req.body);
//     next();
// });

// // Check if item is favorited
// router.get("/check", verifyToken, favoritesController.checkFavorite);

// // Toggle favorite status (add/remove)
// router.post("/toggle", verifyToken, favoritesController.toggleFavorite);

// // Get current user's favorites
// // Using token to identify user, no need for userId param in URL
// router.get("/user", verifyToken, favoritesController.getUserFavorites);

// module.exports = router;
