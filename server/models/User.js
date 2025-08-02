// models/User.js

const db = require("../db"); // חיבור למסד הנתונים

const User = {
  //מחפש משתמש לפי מזהה (idNumber) ומחזיר אותו.
  findById: async (id) => {
    try {
      const [rows] = await db.query("SELECT * FROM users WHERE idNumber = ?", [
        id,
      ]);
      return rows[0]; // rows is an array of results
    } catch (err) {
      console.error("Error in findById:", err);
      throw err;
    }
  },

  //מחפש משתמש לפי קריטריונים גמישים (למשל: { email, password }).

  findOne: async (criteria) => {
    try {
      // Build WHERE clause from criteria object
      const whereConditions = [];
      const values = [];

      Object.entries(criteria).forEach(([key, value]) => {
        whereConditions.push(`${key} = ?`);
        values.push(value);
      });

      // Join WHERE conditions with AND operator
      const whereClause = whereConditions.join(" AND ");
      const query = `SELECT * FROM users WHERE ${whereClause} LIMIT 1`;

      console.log("Executing query:", query, "with values:", values);

      const [rows] = await db.query(query, values);
      return rows[0]; // Return the first matching user or undefined
    } catch (err) {
      console.error("Error in findOne:", err);
      throw err;
    }
  },
  //פונקציה שמשלבת חיפוש משתמש לפי תנאים, עדכון, ואז החזרת המשתמש המעודכן.
  findOneAndUpdate: async (criteria, updateData) => {
    try {
      // First find the user
      const user = await User.findOne(criteria);

      if (!user) {
        return null;
      }

      // Extract the set data from updateData.$set if it exists
      const dataToUpdate = updateData.$set || updateData;

      // Update the user
      await User.update(user.idNumber, dataToUpdate);

      // Return the updated user (fetch it again to get the updated data)
      return await User.findById(user.idNumber);
    } catch (err) {
      console.error("Error in findOneAndUpdate:", err);
      throw err;
    }
  },

  update: async (id, data) => {
    try {
      const [result] = await db.query("UPDATE users SET ? WHERE idNumber = ?", [
        data,
        id,
      ]);
      return result;
    } catch (err) {
      console.error("Error in update:", err);
      throw err;
    }
  },

  // אפשר להוסיף פונקציות נוספות כמו יצירת משתמש, מחיקת משתמש ועוד
};

module.exports = User;
