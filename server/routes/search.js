const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchController");

// Search across all data types (trips, camping spots, attractions)
router.get("/", searchController.searchAll);

module.exports = router;
