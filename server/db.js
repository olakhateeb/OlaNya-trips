const mysql = require("mysql2");

// צור את החיבור עם תמיכה ב-Promise
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "doolanyatrips",
});

// בדיקה שהחיבור מצליח
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Database connected successfully");
  connection.release();
});

// ייצוא עם promise
module.exports = pool.promise();