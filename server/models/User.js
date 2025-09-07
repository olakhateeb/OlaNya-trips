// models/User.js
const db = require("../db"); // חיבור למסד הנתונים

// מחזיר אובייקט עדכון נקי: מסיר undefined/null/"" וכדו'
function cleanUpdateData(data) {
  const cleaned = {};
  for (const [k, v] of Object.entries(data || {})) {
    // מתעלמים משדות שלא באמת מעדכנים
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;

    cleaned[k] = typeof v === "string" ? v.trim() : v;
  }

  // לא מוחקים profilePicture בטעות: אם נשאר ערך ריק — להסיר מהעדכון
  if (
    Object.prototype.hasOwnProperty.call(cleaned, "profilePicture") &&
    (cleaned.profilePicture === "" ||
      cleaned.profilePicture === null ||
      cleaned.profilePicture === undefined)
  ) {
    delete cleaned.profilePicture;
  }

  return cleaned;
}

const User = {
  // מחפש משתמש לפי מזהה (idNumber) ומחזיר אותו.
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

  // מחפש משתמש לפי קריטריונים גמישים (למשל: { email, password }).
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

  // פונקציה שמשלבת חיפוש משתמש לפי תנאים, עדכון, ואז החזרת המשתמש המעודכן.
  findOneAndUpdate: async (criteria, updateData) => {
    try {
      // First find the user
      const user = await User.findOne(criteria);
      if (!user) {
        return null;
      }

      // Extract the set data from updateData.$set if it exists
      const dataToUpdate = updateData.$set || updateData;

      // ניקוי כדי לא לדרוס ערכים לריק
      const cleaned = cleanUpdateData(dataToUpdate);
      if (Object.keys(cleaned).length === 0) {
        return await User.findById(user.idNumber); // אין מה לעדכן
      }

      // Update the user
      await User.update(user.idNumber, cleaned);

      // Return the updated user (fetch it again to get the updated data)
      return await User.findById(user.idNumber);
    } catch (err) {
      console.error("Error in findOneAndUpdate:", err);
      throw err;
    }
  },

  // מחסן מפני דריסה: מסיר ערכי ריק לפני UPDATE
  update: async (id, data) => {
    try {
      const cleaned = cleanUpdateData(data);

      if (Object.keys(cleaned).length === 0) {
        // אין שדות לעדכן — מדלגים
        return { affectedRows: 0, warningStatus: 0, skipped: true };
      }

      const [result] = await db.query("UPDATE users SET ? WHERE idNumber = ?", [
        cleaned,
        id,
      ]);
      return result;
    } catch (err) {
      console.error("Error in update:", err);
      throw err;
    }
  },

  // מחזיר את כל המשתמשים (לשימוש מנהל)
  findAll: async () => {
    try {
      const [rows] = await db.query(
        "SELECT idNumber, userName, email, phone, address, role, profilePicture, createdAt FROM users"
      );
      return rows;
    } catch (err) {
      console.error("Error in findAll:", err);
      throw err;
    }
  },

  // מחזיר את כל הנהגים
  findAllDrivers: async () => {
    try {
      const [rows] = await db.query(
        "SELECT idNumber, userName, email, phone, address, profilePicture FROM users WHERE role = 'driver'"
      );
      return rows;
    } catch (err) {
      console.error("Error in findAllDrivers:", err);
      throw err;
    }
  },

  // עדכון תפקיד משתמש
  updateRole: async (userId, role) => {
    try {
      const [result] = await db.query(
        "UPDATE users SET role = ? WHERE idNumber = ?",
        [role, userId]
      );
      return result;
    } catch (err) {
      console.error("Error in updateRole:", err);
      throw err;
    }
  },

  // מחיקת משתמש
  delete: async (userId) => {
    try {
      const [result] = await db.query("DELETE FROM users WHERE idNumber = ?", [
        userId,
      ]);
      return result;
    } catch (err) {
      console.error("Error in delete:", err);
      throw err;
    }
  },

  // יצירת משתמש חדש
  create: async (userData) => {
    try {
      const [result] = await db.query("INSERT INTO users SET ?", [userData]);
      return result;
    } catch (err) {
      console.error("Error in create:", err);
      throw err;
    }
  },
};

module.exports = User;
