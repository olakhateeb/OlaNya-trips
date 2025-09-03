// models/DriverTrip.js

const db = require("../db"); // חיבור למסד הנתונים

const DriverTrip = {
  // מחזיר את כל הטיולים המשויכים לנהג מסוים
  findByDriverId: async (driverId) => {
    try {
      const [rows] = await db.query(
        `SELECT dt.*, u.userName, u.phone, u.email 
         FROM driver_trips dt 
         JOIN users u ON dt.userId = u.idNumber 
         WHERE dt.driverId = ?
         ORDER BY dt.tripDate ASC`,
        [driverId]
      );
      return rows;
    } catch (err) {
      console.error("Error in findByDriverId:", err);
      throw err;
    }
  },

  // מחזיר את כל הטיולים עם נהגים
  findAll: async () => {
    try {
      const [rows] = await db.query(
        `SELECT dt.*, 
         u1.userName as travelerName, u1.phone as travelerPhone, 
         u2.userName as driverName
         FROM driver_trips dt 
         JOIN users u1 ON dt.userId = u1.idNumber 
         LEFT JOIN users u2 ON dt.driverId = u2.idNumber
         ORDER BY dt.tripDate ASC`
      );
      return rows;
    } catch (err) {
      console.error("Error in findAll:", err);
      throw err;
    }
  },

  // יצירת טיול חדש עם נהג
  create: async (tripData) => {
    try {
      const [result] = await db.query("INSERT INTO driver_trips SET ?", [tripData]);
      return result;
    } catch (err) {
      console.error("Error in create:", err);
      throw err;
    }
  },

  // עדכון סטטוס טיול
  updateStatus: async (tripId, status) => {
    try {
      const [result] = await db.query(
        "UPDATE driver_trips SET status = ? WHERE id = ?",
        [status, tripId]
      );
      return result;
    } catch (err) {
      console.error("Error in updateStatus:", err);
      throw err;
    }
  },

  // שיוך נהג לטיול
  assignDriver: async (tripId, driverId) => {
    try {
      const [result] = await db.query(
        "UPDATE driver_trips SET driverId = ? WHERE id = ?",
        [driverId, tripId]
      );
      return result;
    } catch (err) {
      console.error("Error in assignDriver:", err);
      throw err;
    }
  },

}

module.exports = DriverTrip;
