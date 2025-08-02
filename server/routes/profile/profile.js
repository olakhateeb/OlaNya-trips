const express = require("express");
const router = express.Router();
const { updateProfile } = require("../../controllers/userController");
const auth = require("../../middleware/authMiddleware");

router.put("/profile", auth, updateProfile);

module.exports = router;
