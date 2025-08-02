const express = require("express");
const router = express.Router();
const { changePassword } = require("../../controllers/userController");
const auth = require("../../middleware/authMiddleware");

// Change the route to match the client-side API call
router.put("/:userId/password", auth, changePassword);

module.exports = router;
