const db = require("../db");

// @desc    List all tables in the database
// @route   GET /api/camping/tables
// @access  Public
const listTables = async (req, res) => {
  try {
    const [tables] = await db.query("SHOW TABLES");
    const tableNames = tables.map((table) => Object.values(table)[0]);
    res.json({ tables: tableNames });
  } catch (error) {
    console.error("Error listing tables:", error);
    res
      .status(500)
      .json({ message: "Error listing database tables", error: error.message });
  }
};

// @desc    Get all camping spots
// @route   GET /api/camping/spots
// @access  Public
const getCampingSpots = async (req, res) => {
  try {
    // First, let's see what tables we have
    const [tables] = await db.query("SHOW TABLES");
    const tableNames = tables.map((table) => Object.values(table)[0]);

    // Find a table that might contain camping spots
    const possibleTables = tableNames.filter(
      (name) =>
        name.toLowerCase().includes("camping") ||
        name.toLowerCase().includes("spots") ||
        name.toLowerCase().includes("locations")
    );

    if (possibleTables.length === 0) {
      return res.status(404).json({
        message: "No camping spots table found",
        availableTables: tableNames,
      });
    }

    // Use the first matching table
    const [spots] = await db.query(`SELECT * FROM \`${possibleTables[0]}\``);

    res.json(spots);
  } catch (error) {
    console.error("Error getting camping spots:", error);
    res.status(500).json({
      message: "Error fetching camping spots",
      error: error.message,
      code: error.code,
      sql: error.sql,
    });
  }
};

// @desc    Get single camping spot
// @route   GET /api/camping/spots/:id
// @access  Public
const getCampingSpotById = async (req, res) => {
  try {
    const spot = await CampingSpot.findById(req.params.id);
    if (!spot) {
      return res.status(404).json({ message: "Camping spot not found" });
    }
    res.json(spot);
  } catch (error) {
    console.error("Error getting camping spot by id:", error);
    res
      .status(500)
      .json({ message: "Error fetching camping spot", error: error.message });
  }
};

const getCampingImages = async (req, res) => {
  try {
    const imageName = req.params.filename;
    const imagePath = `uploads/camping/${imageName}`;
    res.sendFile(imagePath);
  } catch (error) {
    console.error("Error getting camping spot by id:", error);
    res
      .status(500)
      .json({ message: "Error fetching camping spot", error: error.message });
  }
};
module.exports = {
  listTables,
  getCampingSpots,
  getCampingSpotById,
  getCampingImages,
};
