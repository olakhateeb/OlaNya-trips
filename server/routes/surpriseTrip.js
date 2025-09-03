// server/routes/surpriseTrip.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// ---- Helpers ----

// ממיר קלטים לטיפוס MySQL DATETIME בלי טיימזון:
// - "YYYY-MM-DD"           -> "YYYY-MM-DD 08:00:00" (שעת דיפולט)
// - "YYYY-MM-DDTHH:mm"     -> "YYYY-MM-DD HH:MM:00"
// - ISO עם Z/offset        -> מנרמל לערכי תאריך/שעה מקומיים "YYYY-MM-DD HH:MM:SS"
function toMySQLDateTimeSmart(input) {
  if (input == null) return null;
  input = String(input).trim();

  // "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return `${input} 08:00:00`; // שעה דיפולט
  }

  // "YYYY-MM-DDTHH:mm"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) {
    return input.replace("T", " ") + ":00";
  }

  // "YYYY-MM-DDTHH:mm:SS"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(input)) {
    return input.replace("T", " ");
  }

  // "YYYY-MM-DD HH:mm"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(input)) {
    return input + ":00";
  }

  // "YYYY-MM-DD HH:mm:SS"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input)) {
    return input;
  }

  // ISO עם Z/offset → נפרמל לשעה מקומית בפורמט MySQL
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const MM = pad(d.getMinutes());
  const SS = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
}

// טבלת DRO (driver_receives_order / drviver_receives_order)
async function detectDroTable(conn) {
  const [t1] = await conn.query("SHOW TABLES LIKE 'driver_receives_order'");
  if (t1.length) return "driver_receives_order";
  const [t2] = await conn.query("SHOW TABLES LIKE 'drviver_receives_order'");
  if (t2.length) return "drviver_receives_order";
  return null;
}

// בריאות לבדיקה
router.get("/health", (req, res) => {
  res.json({
    ok: true,
    route: "/api/surprise-trip",
    ts: new Date().toISOString(),
  });
});

// יצירת טיול הפתעה
router.post("/", async (req, res) => {
  const body = req.body || {};
  const conn = await db.getConnection();

  console.log("📥 /api/surprise-trip body:", JSON.stringify(body, null, 2));

  try {
    await conn.beginTransaction();
    console.log("🔐 TX started");

    const travelerIdInput =
      body.travelerId || body.userName || body.idNumber || "";
    const participantsNum = Number(
      body.participantsNum ?? body.participants ?? 0
    );
    const preferences = body.preferences || {};
    const style = (preferences.style || body.style || "").trim();
    const activity = (preferences.activity || body.activity || "").trim();
    const groupType = (preferences.groupType || body.groupType || "").trim();
    const region =
      body.region || preferences.region || body.preferredRegion || "";
    const trip_address = body.trip_address || body.preferredAddress || "";

    // עדיפות לערך המקומי מהטופס (datetime-local) כדי לשמר "שעת קיר"
    const rawTrip =
      preferences.preferredDate ||
      body.preferredDate ||
      body.trip_datetime || // ISO fallback
      body.trip_date || // YYYY-MM-DD fallback
      "";

    const tripDateMySQL = toMySQLDateTimeSmart(rawTrip);
    console.log("🕒 tripDateMySQL =", tripDateMySQL);

    const missing = [];
    if (!travelerIdInput) missing.push("travelerId (userName/idNumber)");
    if (!participantsNum) missing.push("participantsNum");
    if (!style) missing.push("preferences.style");
    if (!activity) missing.push("preferences.activity");
    if (!groupType) missing.push("preferences.groupType");
    if (!tripDateMySQL) missing.push("trip_date");
    if (!region) missing.push("region");
    if (!trip_address) missing.push("trip_address");

    if (missing.length) {
      console.warn("⛔ Missing fields:", missing);
      await conn.rollback();
      console.log("↩️ TX rolled back (validation)");
      return res
        .status(400)
        .json({ error: "חסרים שדות", missingFields: missing });
    }

    // בדיקת עתיד (מול זמן ה-DB)
    const [[{ now: nowMySQL }]] = await conn.query("SELECT NOW() AS now");
    if (new Date(tripDateMySQL) < new Date(nowMySQL)) {
      await conn.rollback();
      console.log("↩️ TX rolled back (past date)");
      return res.status(400).json({ error: "יש לבחור תאריך עתידי" });
    }

    // בחירת טיול
    const [trips] = await conn.execute(
      `SELECT * FROM trips WHERE trip_type LIKE ? AND region = ?`,
      [`%${style}%`, region]
    );
    console.log("🧭 trips found:", trips.length);
    if (!trips?.length) {
      await conn.rollback();
      console.log("↩️ TX rolled back (no trips)");
      return res.status(404).json({ error: "לא נמצאו טיולים מתאימים" });
    }
    const randomTrip = trips[Math.floor(Math.random() * trips.length)];

    // בחירת נהג
    const [drivers] = await conn.execute(
      `SELECT idNumber, userName, phone FROM users WHERE role = 'driver'`
    );
    console.log("🚘 drivers found:", drivers.length);
    if (!drivers?.length) {
      await conn.rollback();
      console.log("↩️ TX rolled back (no drivers)");
      return res.status(500).json({ error: "לא נמצאו נהגים זמינים" });
    }
    const selectedDriver = drivers[Math.floor(Math.random() * drivers.length)];
    if (!selectedDriver?.idNumber) {
      await conn.rollback();
      console.log("↩️ TX rolled back (driver idNumber missing)");
      return res.status(500).json({ error: "driver.idNumber חסר" });
    }

    // מציאת הנוסע
    const [travelerData] = await conn.execute(
      `SELECT idNumber, userName, phone, email FROM users WHERE userName = ? OR idNumber = ? LIMIT 1`,
      [travelerIdInput, travelerIdInput]
    );
    console.log(
      "👤 traveler matches:",
      travelerData.length,
      "by:",
      travelerIdInput
    );
    if (!travelerData?.length) {
      await conn.rollback();
      console.log("↩️ TX rolled back (no traveler)");
      return res.status(404).json({ error: "המשתמש לא נמצא במסד הנתונים" });
    }
    const travelerIdNumber = travelerData[0].idNumber;
    const travelerUserName = travelerData[0].userName;
    const travelerPhone = travelerData[0].phone;

    // שמירת ההזמנה (trip_date כולל שעה!)
    const insertOrderSQL = `
      INSERT INTO orders (
        order_date,
        trip_date,
        order_participants_num,
        o_driver_id,
        o_traveler_id,
        trip_name,
        trip_address,
        status
      ) VALUES (NOW(), ?, ?, ?, ?, ?, ?, 'pending')`;
    const insertOrderParams = [
      tripDateMySQL,
      participantsNum,
      selectedDriver.idNumber,
      travelerIdNumber,
      randomTrip.trip_name,
      trip_address,
    ];

    console.log("🧾 SQL orders:", insertOrderSQL, insertOrderParams);
    let orderResult;
    try {
      [orderResult] = await conn.execute(insertOrderSQL, insertOrderParams);
    } catch (e) {
      console.error(
        "❌ INSERT orders failed:",
        e.code,
        e.sqlMessage || e.message
      );
      await conn.rollback();
      console.log("↩️ TX rolled back (orders insert failed)");
      return res.status(500).json({
        error: "כשל בשמירת הזמנה",
        sqlCode: e.code,
        sqlMessage: e.sqlMessage || e.message,
      });
    }
    const orderId = orderResult.insertId;
    console.log("✅ order inserted, id:", orderId);

    // טבלת DRO
    const droTable = await detectDroTable(conn);
    if (!droTable) {
      await conn.rollback();
      console.log("↩️ TX rolled back (dro table missing)");
      return res.status(500).json({ error: "טבלת מסירה לנהג לא קיימת" });
    }

    // username ב-DRO = של הנהג
    const insertDROSQL = `
      INSERT INTO ${droTable} (order_id, username, traveler_phone, traveler_address)
      VALUES (?, ?, ?, ?)`;
    const insertDROParams = [
      orderId,
      selectedDriver.userName,
      travelerPhone,
      trip_address,
    ];

    console.log("🧾 SQL DRO:", insertDROSQL, insertDROParams);
    try {
      await conn.execute(insertDROSQL, insertDROParams);
    } catch (e) {
      console.error("❌ INSERT DRO failed:", e.code, e.sqlMessage || e.message);
      await conn.rollback();
      console.log("↩️ TX rolled back (DRO insert failed)");
      return res.status(500).json({
        error: "כשל בשמירת נתוני מסירה לנהג",
        sqlCode: e.code,
        sqlMessage: e.sqlMessage || e.message,
      });
    }
    console.log("✅ DRO inserted");

    await conn.commit();
    console.log("💾 TX committed");

    // תאריך ידידותי להצגה
    const formattedDate = new Date(tripDateMySQL).toLocaleString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return res.status(200).json({
      success: true,
      orderId,
      driver: { name: selectedDriver.userName, phone: selectedDriver.phone },
      trip: {
        id: randomTrip.trip_id || randomTrip.id,
        name: randomTrip.trip_name,
        region,
        hidden: true,
      },
      trip_date: formattedDate,
      trip_address,
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    console.error(
      "❌ createSurpriseTrip error:",
      err.code || "",
      err.sqlMessage || err.message
    );
    return res.status(500).json({
      error: err.message || "שגיאה ביצירת טיול הפתעה",
      sqlCode: err.code,
      sqlMessage: err.sqlMessage,
    });
  } finally {
    conn.release();
    console.log("🔚 connection released");
  }
});

module.exports = router;
