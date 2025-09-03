const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs");
const db = require("../db");

/* =========================================
   Auth (JWT) + Driver Role Check
   ========================================= */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );

    const userId =
      decoded?.user?.idNumber ||
      decoded?.user?.id ||
      decoded?.idNumber ||
      decoded?.id;

    const userNameFromToken =
      decoded?.user?.userName ||
      decoded?.userName ||
      decoded?.username ||
      decoded?.name ||
      null;

    if (!userId && !userNameFromToken) {
      return res
        .status(401)
        .json({ message: "Invalid token payload (no user id/username)" });
    }

    const [rows] = await db.query(
      "SELECT idNumber, role, userName, email, phone, address FROM users WHERE idNumber = ? OR userName = ? LIMIT 1",
      [userId || null, userNameFromToken || null]
    );
    const user = rows?.[0];
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      idNumber: user.idNumber,
      role: user.role,
      userName: user.userName,
      email: user.email,
      phone: user.phone,
      address: user.address,
    };

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function driverOnly(req, res, next) {
  try {
    if (!req.user || req.user.role !== "driver") {
      return res
        .status(403)
        .json({ success: false, message: "אין הרשאה. נדרשות הרשאות נהג." });
    }
    next();
  } catch {
    res.status(500).json({ success: false, message: "שגיאת שרת" });
  }
}

/* =========================================
   Dynamic Schema Detection (once per process)
   ========================================= */
let SCHEMA = {
  ready: false,
  ORDER_TABLE: null,
  DRO_TABLE: null,
  HAS_O_DRIVER_ID: false,
  HAS_O_TRAVELER_ID: false,
  TRIP_NAME_COL: null,
  DPAY_TABLE: null,
  HAS_DPAY_AMOUNT: false,
  HAS_DPAY_USERNAME: false,
  HAS_TRAVELER_ADDRESS_COL: false,
};

async function ensureSchema() {
  if (SCHEMA.ready) return;

  const [tOrders] = await db.query("SHOW TABLES LIKE 'orders'");
  const [tOrder] = await db.query("SHOW TABLES LIKE 'order'");
  if (tOrders.length) SCHEMA.ORDER_TABLE = "orders";
  else if (tOrder.length) SCHEMA.ORDER_TABLE = "`order`";
  else throw new Error("No orders/order table found");

  const [tDro1] = await db.query("SHOW TABLES LIKE 'driver_receives_order'");
  const [tDro2] = await db.query("SHOW TABLES LIKE 'drviver_receives_order'");
  if (tDro1.length) SCHEMA.DRO_TABLE = "driver_receives_order";
  else if (tDro2.length) SCHEMA.DRO_TABLE = "drviver_receives_order";
  else SCHEMA.DRO_TABLE = null;

  const [colsDriver] = await db.query(
    `SHOW COLUMNS FROM ${SCHEMA.ORDER_TABLE} LIKE 'o_driver_id'`
  );
  const [colsTraveler] = await db.query(
    `SHOW COLUMNS FROM ${SCHEMA.ORDER_TABLE} LIKE 'o_traveler_id'`
  );
  const [colTravAddr] = await db.query(
    `SHOW COLUMNS FROM ${SCHEMA.ORDER_TABLE} LIKE 'traveler_address'`
  );
  SCHEMA.HAS_O_DRIVER_ID = colsDriver.length > 0;
  SCHEMA.HAS_O_TRAVELER_ID = colsTraveler.length > 0;
  SCHEMA.HAS_TRAVELER_ADDRESS_COL = colTravAddr.length > 0;

  const tripCandidates = ["trip_name", "trip_ name", "tripName", "trip_title"];
  for (const c of tripCandidates) {
    const [hit] = await db.query(
      `SHOW COLUMNS FROM ${SCHEMA.ORDER_TABLE} LIKE ?`,
      [c]
    );
    if (hit.length) {
      SCHEMA.TRIP_NAME_COL = c;
      break;
    }
  }

  const [tPay1] = await db.query("SHOW TABLES LIKE 'driver_receives_payment'");
  const [tPay2] = await db.query("SHOW TABLES LIKE 'drviver_receives_payment'");
  if (tPay1.length) SCHEMA.DPAY_TABLE = "driver_receives_payment";
  else if (tPay2.length) SCHEMA.DPAY_TABLE = "drviver_receives_payment";
  else SCHEMA.DPAY_TABLE = null;

  if (SCHEMA.DPAY_TABLE) {
    const [cAmt] = await db.query(
      `SHOW COLUMNS FROM ${SCHEMA.DPAY_TABLE} LIKE 'amount'`
    );
    const [cUser] = await db.query(
      `SHOW COLUMNS FROM ${SCHEMA.DPAY_TABLE} LIKE 'username'`
    );
    SCHEMA.HAS_DPAY_AMOUNT = cAmt.length > 0;
    SCHEMA.HAS_DPAY_USERNAME = cUser.length > 0;
  }

  SCHEMA.ready = true;
}

/* =========================================
   Query Builders
   ========================================= */
function baseSelect() {
  const joinDro = SCHEMA.DRO_TABLE
    ? `LEFT JOIN ${SCHEMA.DRO_TABLE} dro ON dro.order_id = o.order_num`
    : "";

  const selectTravelerPhone = SCHEMA.DRO_TABLE
    ? "COALESCE(dro.traveler_phone, ut.phone)"
    : "ut.phone";

  // ✅ העיקר: להתייחס למחרוזות ריקות כ-NULL
  // קודם orders.traveler_address (אחרי TRIM), אם ריק/NULL – נופלים ל-dro.traveler_address (גם אחרי TRIM).
  const pickupCol = (() => {
    const ord = SCHEMA.HAS_TRAVELER_ADDRESS_COL
      ? "NULLIF(TRIM(o.traveler_address), '')"
      : "NULL";
    const dro = SCHEMA.DRO_TABLE
      ? "NULLIF(TRIM(dro.traveler_address), '')"
      : "NULL";
    if (ord !== "NULL" && dro !== "NULL") return `COALESCE(${ord}, ${dro})`;
    if (ord !== "NULL") return ord;
    if (dro !== "NULL") return dro;
    return "NULL";
  })();

  const tripCol = SCHEMA.TRIP_NAME_COL
    ? SCHEMA.TRIP_NAME_COL.includes(" ")
      ? `o.\`${SCHEMA.TRIP_NAME_COL}\``
      : `o.${SCHEMA.TRIP_NAME_COL}`
    : "NULL";

  const payExpr =
    SCHEMA.DPAY_TABLE && SCHEMA.HAS_DPAY_AMOUNT
      ? `COALESCE((SELECT SUM(p.amount) FROM ${SCHEMA.DPAY_TABLE} p WHERE p.order_id = o.order_num), 0)`
      : "NULL";

  return `
SELECT
  o.order_num AS orderNumber,
  o.order_num AS id,
  o.trip_date AS departureTime,
  o.trip_date AS tripDate,
  o.order_participants_num AS participants,
  o.o_driver_id AS driverId,
  o.o_traveler_id AS travelerId,
  ut.userName AS travelerName,
  ${selectTravelerPhone} AS travelerPhone,
  ${tripCol} AS tripName,
  ${pickupCol} AS pickupAddress,
  ${payExpr} AS payment,
  COALESCE(
    o.status,
    CASE WHEN DATE(o.trip_date) < CURDATE() THEN 'completed' ELSE 'pending' END
  ) AS status
FROM ${SCHEMA.ORDER_TABLE} o
${joinDro}
LEFT JOIN users ut ON ut.idNumber = o.o_traveler_id
`;
}

function whereForDriver(req) {
  const driverId = req.user?.idNumber || req.user?.id || null;
  const userName = req.user?.userName || null;

  const parts = [];
  const params = [];

  if (SCHEMA.HAS_O_DRIVER_ID && driverId !== null) {
    parts.push(`o.o_driver_id = ?`);
    params.push(driverId);
  }

  if (SCHEMA.DRO_TABLE && userName !== null) {
    parts.push(`dro.username = ?`);
    params.push(userName);
  }

  if (parts.length === 0) {
    return { sql: null, params: [] };
  }
  return { sql: `(${parts.join(" OR ")})`, params };
}

/* =========================================
   Handlers
   ========================================= */
async function getDriverProfile(req, res) {
  try {
    await ensureSchema();

    const idOrName = req.user?.idNumber || req.user?.id || req.user?.userName;
    if (!idOrName)
      return res.status(401).json({ error: "Missing driver identity" });

    const keyCol = req.user?.idNumber || req.user?.id ? "idNumber" : "userName";
    const [rows] = await db.query(
      `SELECT userName AS name, phone, address AS area, email
       FROM users WHERE ${keyCol} = ? LIMIT 1`,
      [idOrName]
    );
    const profile = rows?.[0] || {};

    const where = whereForDriver(req);
    let completed = 0,
      upcoming = 0;
    if (where.sql) {
      const joinDro = SCHEMA.DRO_TABLE
        ? `LEFT JOIN ${SCHEMA.DRO_TABLE} dro ON dro.order_id = o.order_num`
        : "";
      const base = `FROM ${SCHEMA.ORDER_TABLE} o ${joinDro} WHERE ${where.sql}`;

      const [[c]] = await db.query(
        `SELECT COUNT(*) AS cnt
      ${base} AND (DATE(o.trip_date) < CURDATE() OR o.status = 'completed')`,
        where.params
      );
      const [[u]] = await db.query(
        `SELECT COUNT(*) AS cnt
      ${base} AND DATE(o.trip_date) >= CURDATE()
            AND (o.status IS NULL OR o.status != 'completed')`,
        where.params
      );
      completed = c?.cnt || 0;
      upcoming = u?.cnt || 0;
    }

    let salary = 0;
    if (SCHEMA.DPAY_TABLE && SCHEMA.HAS_DPAY_AMOUNT && SCHEMA.HAS_O_DRIVER_ID) {
      const [[s]] = await db.query(
        `SELECT COALESCE(SUM(CAST(p.amount AS DECIMAL(18,2))), 0) AS total
         FROM ${SCHEMA.DPAY_TABLE} p
         JOIN ${SCHEMA.ORDER_TABLE} o ON o.order_num = p.order_id
         WHERE o.o_driver_id = ?`,
        [req.user.idNumber]
      );
      salary = Number(s?.total || 0);
    }

    // ✅ NEW: להביא גם את הסכום הגלובלי מטבלת payment (רשומה בודדת)
    const [[g]] = await db.query(
      `SELECT COALESCE(Total_payment, 0) AS globalTotal
       FROM payment
       LIMIT 1`
    );
    const globalTotal = Number(g?.globalTotal || 0);

    res.set("Cache-Control", "no-store"); // למנוע קאש בדפדפן/פרוקסי
    res.json({
      driver: {
        ...profile,
        completedTrips: completed,
        upcomingTrips: upcoming,
        salary, // סכום לנהג
        globalTotal, // ✅ סכום גלובלי מכל ההזמנות
      },
    });
  } catch (e) {
    res.status(500).json({
      error: "Failed to load profile",
      details: e.sqlMessage || e.message,
    });
  }
}

async function getUpcomingTrips(req, res) {
  try {
    await ensureSchema();
    const where = whereForDriver(req);
    if (!where.sql) {
      return res.status(400).json({
        error:
          "Cannot map trips to driver (missing o_driver_id and no driver_receives_order.*username)",
      });
    }

    const sql =
      baseSelect() +
      `
WHERE ${where.sql}
  AND DATE(o.trip_date) >= CURDATE()
  AND (o.status IS NULL OR o.status != 'completed')
ORDER BY o.trip_date ASC
`;
    const [rows] = await db.query(sql, where.params);
    res.json({ trips: rows });
  } catch {
    res.status(500).json({ error: "Failed to load upcoming trips" });
  }
}

async function getTripsHistory(req, res) {
  try {
    await ensureSchema();
    const where = whereForDriver(req);
    if (!where.sql) {
      return res.status(400).json({
        error:
          "Cannot map trips to driver (missing o_driver_id and no driver_receives_order.*username)",
      });
    }

    const sql =
      baseSelect() +
      `
WHERE ${where.sql}
  AND (
    DATE(o.trip_date) < CURDATE()
    OR o.status = 'completed'
  )
ORDER BY o.trip_date DESC
`;
    const [rows] = await db.query(sql, where.params);
    res.json({ trips: rows });
  } catch {
    res.status(500).json({ error: "Failed to load trip history" });
  }
}

async function updateTripStatus(req, res) {
  try {
    await ensureSchema();

    const { id, orderId: orderIdLegacy } = req.params;
    const orderId = id ?? orderIdLegacy;
    const { status } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "חסר מזהה הזמנה (id)" });
    }
    if (!["pending", "completed"].includes(status)) {
      return res.status(400).json({ error: "סטטוס לא חוקי" });
    }

    const [result] = await db.query(
      `UPDATE ${SCHEMA.ORDER_TABLE} SET status = ? WHERE order_num = ?`,
      [status, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "הזמנה לא נמצאה" });
    }

    res.json({ success: true, message: "הסטטוס עודכן בהצלחה" });
  } catch (e) {
    res.status(500).json({
      error: "שגיאה בעדכון סטטוס",
      details: e.sqlMessage || e.message,
    });
  }
}

async function exportTripsExcel(req, res) {
  try {
    await ensureSchema();
    const where = whereForDriver(req);
    if (!where.sql) {
      return res.status(400).json({
        error:
          "Cannot map trips to driver (missing o_driver_id and no driver_receives_order.*username)",
      });
    }

    const { type = "upcoming" } = req.query;
    let sql = baseSelect() + ` WHERE ${where.sql} `;

    if (type === "history") {
      sql += ` AND (DATE(o.trip_date) < CURDATE() OR o.status = 'completed') ORDER BY o.trip_date DESC`;
    } else {
      sql += ` AND DATE(o.trip_date) >= CURDATE() AND (o.status IS NULL OR o.status != 'completed') ORDER BY o.trip_date ASC`;
    }

    const [rows] = await db.query(sql, where.params);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(
      type === "history" ? "טיולים שהסתיימו" : "טיולים ממתינים"
    );

    ws.columns = [
      { header: "מס׳ הזמנה", key: "orderNumber", width: 12 },
      { header: "שם הטיול", key: "tripName", width: 28 },
      { header: "כתובת איסוף", key: "pickupAddress", width: 28 },
      { header: "תאריך יציאה", key: "departureTime", width: 22 },
      { header: "משתתפים", key: "participants", width: 12 },
      { header: "תשלום (₪)", key: "payment", width: 14 },
      { header: "שם הנוסע", key: "travelerName", width: 22 },
      { header: "טלפון", key: "travelerPhone", width: 18 },
      { header: "סטטוס", key: "status", width: 12 },
    ];

    const safeCell = (v) => (v === undefined || v === null ? "" : v);
    rows.forEach((r) => {
      ws.addRow({
        orderNumber: safeCell(r.orderNumber),
        tripName: safeCell(r.tripName),
        pickupAddress: safeCell(r.pickupAddress),
        departureTime: safeCell(r.departureTime),
        participants: safeCell(r.participants),
        payment: safeCell(r.payment),
        travelerName: safeCell(r.travelerName),
        travelerPhone: safeCell(r.travelerPhone),
        status: safeCell(r.status),
      });
    });

    const filename = `driver-trips-${type}-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    res.status(500).json({
      error: "Failed to export excel",
      details: e.sqlMessage || e.message,
    });
  }
}

/* =========================================
   Routes
   ========================================= */
router.get("/profile", authMiddleware, driverOnly, getDriverProfile);
router.get("/trips/upcoming", authMiddleware, driverOnly, getUpcomingTrips);
router.get("/trips/history", authMiddleware, driverOnly, getTripsHistory);
router.get("/trips/export", authMiddleware, driverOnly, exportTripsExcel);
router.put("/order-status/:id", authMiddleware, driverOnly, updateTripStatus);

module.exports = router;
