const db = require("../db");

exports.getAllAttractions = async (req, res) => {
  try {
    const [attractions] = await db.query("SELECT * FROM attractions");
    res.json(attractions);
  } catch (error) {
    console.error("Error fetching attractions:", error);
    res.status(500).json({ error: "Failed to fetch attractions" });
  }
};

exports.getAttractionById = async (req, res) => {
  try {
    const [attraction] = await db.query(
      "SELECT * FROM attractions WHERE attraction_id = ?",
      [req.params.id]
    );

    if (attraction.length === 0) {
      return res.status(404).json({ error: "Attraction not found" });
    }

    res.json(attraction[0]);
  } catch (error) {
    console.error("Error fetching attraction:", error);
    res.status(500).json({ error: "Failed to fetch attraction" });
  }
};

exports.addAttraction = async (req, res) => {
  try {
    const {
      attraction_name,
      attraction_type,
      attraction_description,
      attraction_img,
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO attractions 
       (attraction_name, attraction_type, attraction_description, attraction_img) 
       VALUES (?, ?, ?, ?)`,
      [attraction_name, attraction_type, attraction_description, attraction_img]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error("Error adding attraction:", error);
    res.status(500).json({ error: "Failed to add attraction" });
  }
};

exports.updateAttraction = async (req, res) => {
  try {
    const {
      attraction_name,
      attraction_type,
      attraction_description,
      attraction_img,
    } = req.body;

    const [result] = await db.query(
      `UPDATE attractions SET 
        attraction_name = ?, 
        attraction_type = ?, 
        attraction_description = ?, 
        attraction_img = ? 
       WHERE attraction_id = ?`,
      [
        attraction_name,
        attraction_type,
        attraction_description,
        attraction_img,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Attraction not found" });
    }

    res.json({ message: "Attraction updated successfully" });
  } catch (error) {
    console.error("Error updating attraction:", error);
    res.status(500).json({ error: "Failed to update attraction" });
  }
};
