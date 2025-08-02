const express = require("express");
const router = express.Router();
const tripController = require("../controllers/tripsController");

// Get all attractions
router.get("/", tripController.getAllTrips);

// Get single attraction
router.get("/:id", tripController.getTripById);

// Add new attraction
router.post("/", tripController.addTrip);

// Update attraction
router.put("/:id", tripController.updateTrip);

// Delete attraction
router.delete("/:id", tripController.deleteTrip);

router.get("/trips/:id", async (req, res) => {
  try {
    const tripId = req.params.id;
    const [tripResult] = await db.query(
      "SELECT * FROM trips WHERE trip_id = ?",
      [tripId]
    );

    if (tripResult.length === 0) {
      return res.status(404).json({ error: "הטיול לא נמצא" });
    }

    res.status(200).json(tripResult[0]);
  } catch (err) {
    console.error("❌ שגיאה בשליפת טיול:", err);
    res.status(500).json({ error: "שגיאת שרת. נסה שוב מאוחר יותר." });
  }
});

module.exports = router;
