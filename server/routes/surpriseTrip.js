const express = require("express");
const router = express.Router();
const db = require("../db");
const nodemailer = require("nodemailer");

// 📜 טיול הפתעה לפי העדפות
router.post("/", async (req, res) => {
  try {
    const { travelerId, participantsNum, preferences } = req.body;

    // בדיקה שכל שדות חובה קיימים
    if (
      !travelerId ||
      !participantsNum ||
      !preferences ||
      !preferences.style ||
      !preferences.activity ||
      !preferences.groupType
    ) {
      return res.status(400).json({ error: "חסרים שדות בטופס ההעדפות" });
    }

    console.log("📦 Preferences received:", preferences);

    // 🔍 שליפת טיולים לפי סגנון
    const [trips] = await db.query(
      `SELECT * FROM trips WHERE trip_type LIKE ?`,
      [`%${preferences.style}%`]
    );

    if (!trips || trips.length === 0) {
      return res
        .status(404)
        .json({ error: "לא נמצאו טיולים מתאימים להעדפות שלך 😭" });
    }

    // 🎲 בחירת טיול רנדומלי
    const randomTrip = trips[Math.floor(Math.random() * trips.length)];

    // 🚗 שליפת נהג רנדומלי
    const [drivers] = await db.query(
      `SELECT * FROM users WHERE role = 'driver'`
    );

    if (!drivers || drivers.length === 0) {
      return res.status(500).json({ error: "לא נמצאו נהגים זמינים" });
    }

    const selectedDriver = drivers[Math.floor(Math.random() * drivers.length)];

    // 🢁‍♂️ שליפת פרטי המטייל
    const [travelerData] = await db.query(
      `SELECT idNumber, username, phone, email FROM users WHERE userName = ?`,
      [travelerId]
    );

    if (!travelerData || travelerData.length === 0) {
      return res.status(404).json({ error: "המשתמש לא נמצא במסד הנתונים" });
    }

    const travelerIdNumber = travelerData[0].idNumber;
    const travelerUsername = travelerData[0].username;
    const travelerPhone = travelerData[0].phone;
    const travelerEmail = travelerData[0].email;

    // 🗓️ תאריך נוכחי
    const orderDate = new Date().toISOString().split("T")[0];

    // ✅ יצירת ההזמנה בטבלת orders כולל שם הטיול ( למנהל בלבד )
    await db.query(
      `INSERT INTO orders (order_date, order_participants_num, o_driver_id, o_traveler_id, trip_name)
       VALUES (?, ?, ?, ?, ?)`,
      [
        orderDate,
        participantsNum,
        selectedDriver.idNumber,
        travelerIdNumber,
        randomTrip.trip_name,
      ]
    );

    // 🔎 שליפת orderId שנוצר
    const [orderResult] = await db.query(`SELECT LAST_INSERT_ID() as orderId`);
    const orderId = orderResult[0].orderId;

    // ➕ הכנסת ההזמנה גם לטבלת driver_receives_order עם מספר טלפון של המטייל
    await db.query(
      `INSERT INTO driver_receives_order (order_id, userName, traveler_phone) VALUES (?, ?, ?)`,
      [orderId, travelerUsername, travelerPhone]
    );

    // 📧 שליחת מייל למטייל
    if (travelerEmail) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "doolanyatrips@gmail.com",
          pass: "loeu irzo fbxx iuep",
        },
      });

      const mailOptions = {
        from: "doolanyatrips@gmail.com",
        to: travelerEmail,
        subject: "הטיול שלך מוכן!",
        text: `שלום! הזמנת טיול הפתעה מספר ${orderId}.
מלווה אותך הנהג: ${selectedDriver.userName}.
היעד ייחשף בהמשך 😉
צוות Doolanya Trips.`,
      };

      await transporter.sendMail(mailOptions);
    }

    // ✅ תשובה ללקוח — בלי לחשוף שם המקום
    res.status(200).json({
      orderId,
      driver: {
        name: selectedDriver.userName,
        phone: selectedDriver.phone,
      },
      trip: {
        id: randomTrip.trip_id,
        hidden: true,
      },
    });
  } catch (err) {
    console.error("🔥 Error in surprise trip:", err);
    res.status(500).json({ error: "שגיאת שרת. נסה שוב מאוחר יותר." });
  }
});

module.exports = router;
