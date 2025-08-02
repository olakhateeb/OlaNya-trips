const db = require("../db");

class CampingSpot {
  // שליפת כל הקמפינגים
  static async findAll() {
    try {
      const [rows] = await db.query("SELECT * FROM camping");
      return rows;
    } catch (error) {
      console.error("Error fetching all camping spots:", error);
      throw error;
    }
  }

  // שליפה לפי שם הקמפינג (camping_location_name)
  static async findByName(name) {
    try {
      const [rows] = await db.query(
        "SELECT * FROM camping WHERE camping_location_name = ?",
        [name]
      );
      console.log("🔍 תוצאה מבסיס הנתונים:", rows);
      return rows[0];
    } catch (error) {
      console.error("❌ Error in findByName:", error.message);
      throw error;
    }
  }
}

module.exports = CampingSpot;
