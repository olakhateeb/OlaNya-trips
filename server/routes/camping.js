const express = require("express");
const router = express.Router();
const campingController = require("../controllers/campingController");
const CampingSpot = require("../models/CampingSpot");

// @route   GET /api/camping/tables
// @desc    List all database tables
// @access  Public
router.get("/tables", campingController.listTables);

// @route   GET /api/camping/spots
// @desc    Get all camping spots
// @access  Public
router.get("/spots", campingController.getCampingSpots);

// @route   GET /api/camping/spots/:id
// @desc    Get single camping spot by ID
// @access  Public
router.get("/spots/:id", campingController.getCampingSpotById);
router.get("/uploads/camping/:filename", campingController.getCampingImages);

router.get("/name/:name", async (req, res) => {
  try {
    const rawName = req.params.name;
    const name = decodeURIComponent(rawName).trim();
    console.log("🔍 מחפש לפי שם:", `"${name}"`);

    const camping = await CampingSpot.findByName(name);

    if (!camping) {
      console.log("❌ לא נמצא קמפינג:", name);
      return res.status(404).json({ message: "Camping not found" });
    }

    res.json(camping);
  } catch (err) {
    console.error("🔥 שגיאת שרת:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
