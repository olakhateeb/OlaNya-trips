const db = require("../db");

exports.getAllTrips = async (req, res) => {
  try {
    const [trips] = await db.query("SELECT * FROM trips");
    res.json(trips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    res.status(500).json({ error: "Failed to fetch trips" });
  }
};

exports.getTripById = async (req, res) => {
  try {
    const [trip] = await db.query(
      "SELECT * FROM trips WHERE trip_id = ?",
      [req.params.id]
    );
    if (trip.length === 0) {
      return res.status(404).json({ error: "Trip not found" });
    }
    res.json(trip[0]);
  } catch (error) {
    console.error("Error fetching trip:", error);
    res.status(500).json({ error: "Failed to fetch trip" });
  }
};

exports.addTrip = async (req, res) => {
  try {
    const {
      trip_name,
      trip_location_name,
      trip_description,
      trip_img,
      trip_duration,
      trip_difficulty,
      trip_distance,
      trip_type
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO trips 
        (trip_name, trip_location_name, trip_description, trip_img, trip_duration, trip_difficulty, trip_distance, trip_type) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trip_name,
        trip_location_name,
        trip_description,
        trip_img,
        trip_duration,
        trip_difficulty,
        trip_distance,
        trip_type
      ]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error("Error adding trip:", error);
    res.status(500).json({ error: "Failed to add trip" });
  }
};

exports.updateTrip = async (req, res) => {
  try {
    const {
      trip_name,
      trip_location_name,
      trip_description,
      trip_img,
      trip_duration,
      trip_difficulty,
      trip_distance,
      trip_type
    } = req.body;

    const [result] = await db.query(
      `UPDATE trips SET 
        trip_name = ?, 
        trip_location_name = ?, 
        trip_description = ?, 
        trip_img = ?, 
        trip_duration = ?, 
        trip_difficulty = ?, 
        trip_distance = ?,
        trip_type = ? 
        WHERE trip_id = ?`,
      [
        trip_name,
        trip_location_name,
        trip_description,
        trip_img,
        trip_duration,
        trip_difficulty,
        trip_distance,
        trip_type,
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
};

exports.deleteTrip = async (req, res) => {
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
};
