//trips.js
// routes/trips.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// 📥 Add a new trip
router.post("/", async (req, res) => {
  try {
    const {
      trip_name,
      trip_duration = "",
      trip_description = "",
      trip_type = "",
      trip_img = "",
      is_accessible = 0,
      has_parking = 0,
      has_toilets = 0,
      pet_friendly = 0,
      family_friendly = 0,
      romantic = 0,
      couple_friendly = 0,
      has_water_activities = 0,
      bbq_area = 0,
      suitable_for_groups = 0,
      has_entry_fee = 0,
      is_favorite = 0,
      region = "",
    } = req.body;

    if (!trip_name) {
      return res
        .status(400)
        .json({ success: false, message: "Trip name is required" });
    }

    const sql = `
      INSERT INTO trips (
        trip_name, trip_duration, trip_description, trip_type, trip_img,
        is_accessible, has_parking, has_toilets, pet_friendly, family_friendly,
        romantic, couple_friendly, has_water_activities, bbq_area, suitable_for_groups, has_entry_fee,
        is_favorite, region
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const params = [
      trip_name,
      trip_duration,
      trip_description,
      trip_type,
      trip_img || "",
      +is_accessible,
      +has_parking,
      +has_toilets,
      +pet_friendly,
      +family_friendly,
      +romantic,
      +couple_friendly,
      +has_water_activities,
      +bbq_area,
      +suitable_for_groups,
      +has_entry_fee,
      +is_favorite,
      region || "",
    ];

    const [result] = await db.query(sql, params);
    return res.status(201).json({
      success: true,
      message: "Trip added successfully",
      trip_id: result.insertId,
    });
  } catch (err) {
    console.error("❌ Error adding trip:", err);
    return res.status(500).json({
      success: false,
      message: "Error adding trip",
      error: err.message,
    });
  }
});

// 🔄 Get all trips
router.get("/", async (req, res) => {
  try {
    console.log("🔄 getAllTrips API called");
    const [trips] = await db.query("SELECT * FROM trips ORDER BY trip_id DESC");
    console.log(`📊 Found ${trips.length} trips in database:`);

    res.json({
      success: true,
      count: trips.length,
      trips: trips,
    });
  } catch (error) {
    console.error("❌ Error fetching trips:", error);
    res.status(500).json({ error: "Failed to fetch trips" });
  }
});

// 🔍 Get single trip
router.get("/:id", async (req, res) => {
  try {
    const [trip] = await db.query("SELECT * FROM trips WHERE trip_id = ?", [
      req.params.id,
    ]);
    if (trip.length === 0) {
      return res.status(404).json({ error: "Trip not found" });
    }
    res.json(trip[0]);
  } catch (error) {
    console.error("Error fetching trip:", error);
    res.status(500).json({ error: "Failed to fetch trip" });
  }
});

// ✏️ Update trip
router.put("/:id", async (req, res) => {
  try {
    const {
      trip_name,
      trip_duration,
      trip_description,
      trip_type,
      trip_img,
      is_accessible = false,
      has_parking = false,
      has_toilets = false,
      pet_friendly = false,
      family_friendly = false,
      romantic = false,
      couple_friendly = false,
      has_water_activities = false,
      bbq_area = false,
      suitable_for_groups = false,
      has_entry_fee = false,
    } = req.body;

    const [result] = await db.query(
      `UPDATE trips SET 
        trip_name = ?, 
        trip_duration = ?, 
        trip_description = ?, 
        trip_type = ?, 
        trip_img = ?, 
        is_accessible = ?, 
        has_parking = ?, 
        has_toilets = ?, 
        pet_friendly = ?, 
        family_friendly = ?, 
        romantic = ?, 
        couple_friendly = ?, 
        has_water_activities = ?, 
        bbq_area = ?, 
        suitable_for_groups = ?, 
        has_entry_fee = ?
        WHERE trip_id = ?`,
      [
        trip_name,
        trip_duration,
        trip_description,
        trip_type,
        trip_img,
        is_accessible ? 1 : 0,
        has_parking ? 1 : 0,
        has_toilets ? 1 : 0,
        pet_friendly ? 1 : 0,
        family_friendly ? 1 : 0,
        romantic ? 1 : 0,
        couple_friendly ? 1 : 0,
        has_water_activities ? 1 : 0,
        bbq_area ? 1 : 0,
        suitable_for_groups ? 1 : 0,
        has_entry_fee ? 1 : 0,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Trip not found" });
    }

    res.json({ message: "Trip updated successfully" });
  } catch (error) {
    console.error("Error updating trip:", error);
    res.status(500).json({ error: "Failed to update trip" });
  }
});

// ❌ Delete trip
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM trips WHERE trip_id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Trip not found" });
    }

    res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Error deleting trip:", error);
    res.status(500).json({ error: "Failed to delete trip" });
  }
});

module.exports = router;
