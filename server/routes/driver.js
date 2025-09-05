// server/routes/driver.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs");
const db = require("../db");

// ========== Mailer (inline) ==========
const nodemailer = require("nodemailer");

// Prefer EMAIL_* but fall back to SMTP_* (so you can keep your .env as-is)
const SMTP_HOST =
  process.env.EMAIL_HOST || process.env.SMTP_HOST || "localhost";
const SMTP_PORT = Number(
  process.env.EMAIL_PORT || process.env.SMTP_PORT || 587
);
const SMTP_USER = process.env.EMAIL_USER || process.env.SMTP_USER || "";
const SMTP_PASS = process.env.EMAIL_PASS || process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER || "no-reply@localhost";

const mailTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // 465 = SMTPS, otherwise STARTTLS
  auth:
    SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

// ===== SMTP sanity check + helpful logging =====
const REQUIRED_EMAIL_ENV = [
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_USER",
  "EMAIL_PASS",
];
for (const k of REQUIRED_EMAIL_ENV) {
  const hasEmail = !!process.env[k];
  const smtpKey = k.replace("EMAIL_", "SMTP_");
  const hasSmtp = !!process.env[smtpKey];
  if (!hasEmail && !hasSmtp) {
    console.warn(`[MAIL] Missing env ${k} (or ${smtpKey}). Emails may fail.`);
  }
}
(async () => {
  try {
    const ok = await mailTransporter.verify();
    console.log("[MAIL] SMTP transporter verified:", ok, {
      host: SMTP_HOST,
      port: SMTP_PORT,
    });
  } catch (e) {
    console.error("[MAIL] SMTP verify failed:", e?.message || e, {
      host: SMTP_HOST,
      port: SMTP_PORT,
    });
  }
})();

async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error("Missing recipient email (to)");
  try {
    const info = await mailTransporter.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      text: text || "",
      html: html || "",
    });
    console.log("[MAIL] sent:", {
      to,
      subject,
      messageId: info?.messageId,
      accepted: info?.accepted,
      rejected: info?.rejected,
      response: info?.response,
    });
    return info;
  } catch (e) {
    console.error("[MAIL] send failed:", {
      to,
      subject,
      error: e?.message || e,
    });
    throw e;
  }
}

// תבנית אימייל להחלפת נהג
function reassignedEmailHtml({
  travelerName,
  tripName,
  tripDate,
  pickupAddress,
  oldDriverName,
  newDriver,
}) {
  const when = new Date(tripDate).toLocaleString("he-IL", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `
  <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;line-height:1.6">
    <h2>עדכון הזמנה – שיבוץ נהג חדש</h2>
    <p>שלום ${travelerName || "מטייל/ת"},</p>
    <p>ההזמנה שלך לטיול <strong>${
      tripName || "-"
    }</strong> בתאריך <strong>${when}</strong> עודכנה.</p>
    ${
      oldDriverName
        ? `<p>הנהג הקודם: <strong>${oldDriverName}</strong> הודיע שאינו זמין.</p>`
        : ""
    }
    <p>נהג חדש שובץ עבורך:</p>
    <ul>
      <li>שם הנהג: <strong>${newDriver.userName || "-"}</strong></li>
      ${
        newDriver.phone
          ? `<li>טלפון: <a href="tel:${newDriver.phone}">${newDriver.phone}</a></li>`
          : ""
      }
      ${pickupAddress ? `<li>נקודת איסוף: ${pickupAddress}</li>` : ""}
    </ul>
    <p>אין צורך לבצע פעולה מצדך. אם יש שאלות – נשמח לעזור.</p>
    <p style="margin-top:20px">בברכה,<br/>Do OlaNya Trips</p>
  </div>`;
}

// ========== Auth (JWT) + Driver role ==========
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });
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
    if (!userId && !userNameFromToken)
      return res
        .status(401)
        .json({ message: "Invalid token payload (no user id/username)" });

    const [rows] = await db.query(
      "SELECT idNumber, role, userName, email, phone, address FROM users WHERE idNumber = ? OR userName = ? LIMIT 1",
      [userId || null, userNameFromToken || null]
    );
    const user = rows?.[0];
    if (!user) return res.status(401).json({ message: "User not found" });

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

// ========== Dynamic schema detection ==========
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
  HAS_CANCELLED_BY: false,
  HAS_CANCELLED_REASON: false,
  HAS_CANCELLED_AT: false,
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

  const [cBy] = await db.query(
    `SHOW COLUMNS FROM ${SCHEMA.ORDER_TABLE} LIKE 'cancelled_by'`
  );
  const [cReason] = await db.query(
    `SHOW COLUMNS FROM ${SCHEMA.ORDER_TABLE} LIKE 'cancelled_reason'`
  );
  const [cAt] = await db.query(
    `SHOW COLUMNS FROM ${SCHEMA.ORDER_TABLE} LIKE 'cancelled_at'`
  );
  SCHEMA.HAS_CANCELLED_BY = cBy.length > 0;
  SCHEMA.HAS_CANCELLED_REASON = cReason.length > 0;
  SCHEMA.HAS_CANCELLED_AT = cAt.length > 0;

  SCHEMA.ready = true;
}

// ========== Query builders ==========
function baseSelect() {
  const joinDro = SCHEMA.DRO_TABLE
    ? `LEFT JOIN ${SCHEMA.DRO_TABLE} dro ON dro.order_id = o.order_num`
    : "";
  const selectTravelerPhone = SCHEMA.DRO_TABLE
    ? "COALESCE(dro.traveler_phone, ut.phone)"
    : "ut.phone";

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
  COALESCE(o.status, CASE WHEN DATE(o.trip_date) < CURDATE() THEN 'completed' ELSE 'pending' END) AS status
FROM ${SCHEMA.ORDER_TABLE} o
${joinDro}
LEFT JOIN users ut ON ut.idNumber = o.o_traveler_id
`;
}
function whereForDriver(req) {
  const driverId = req.user?.idNumber || req.user?.id || null;
  const userName = req.user?.userName || null;
  const parts = [],
    params = [];
  if (SCHEMA.HAS_O_DRIVER_ID && driverId !== null) {
    parts.push(`o.o_driver_id = ?`);
    params.push(driverId);
  }
  if (SCHEMA.DRO_TABLE && userName !== null) {
    parts.push(`dro.username = ?`);
    params.push(userName);
  }
  if (parts.length === 0) return { sql: null, params: [] };
  return { sql: `(${parts.join(" OR ")})`, params };
}

// ========== Handlers ==========
async function getDriverProfile(req, res) {
  try {
    await ensureSchema();
    const idOrName = req.user?.idNumber || req.user?.id || req.user?.userName;
    if (!idOrName)
      return res.status(401).json({ error: "Missing driver identity" });

    const keyCol = req.user?.idNumber || req.user?.id ? "idNumber" : "userName";
    const [rows] = await db.query(
      `SELECT userName AS name, phone, address AS area, email FROM users WHERE ${keyCol} = ? LIMIT 1`,
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
        `SELECT COUNT(*) AS cnt ${base} AND (DATE(o.trip_date) < CURDATE() OR o.status IN ('completed','cancelled'))`,
        where.params
      );
      const [[u]] = await db.query(
        `SELECT COUNT(*) AS cnt ${base} AND DATE(o.trip_date) >= CURDATE() AND (o.status IS NULL OR o.status NOT IN ('completed','cancelled'))`,
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

    const [[g]] = await db.query(
      `SELECT COALESCE(Total_payment, 0) AS globalTotal FROM payment LIMIT 1`
    );
    const globalTotal = Number(g?.globalTotal || 0);

    res.set("Cache-Control", "no-store");
    res.json({
      driver: {
        ...profile,
        completedTrips: completed,
        upcomingTrips: upcoming,
        salary,
        globalTotal,
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
    if (!where.sql)
      return res.status(400).json({
        error:
          "Cannot map trips to driver (missing o_driver_id and no driver_receives_order.*username)",
      });

    const sql =
      baseSelect() +
      `
WHERE ${where.sql}
  AND DATE(o.trip_date) >= CURDATE()
  AND (o.status IS NULL OR o.status NOT IN ('completed','cancelled'))
ORDER BY o.trip_date ASC`;
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
    if (!where.sql)
      return res.status(400).json({
        error:
          "Cannot map trips to driver (missing o_driver_id and no driver_receives_order.*username)",
      });

    const sql =
      baseSelect() +
      `
WHERE ${where.sql}
  AND (DATE(o.trip_date) < CURDATE() OR o.status IN ('completed','cancelled'))
ORDER BY o.trip_date DESC`;
    const [rows] = await db.query(sql, where.params);
    res.json({ trips: rows });
  } catch {
    res.status(500).json({ error: "Failed to load trip history" });
  }
}

/**
 * Update order status:
 * - 'pending' / 'completed' – simple update
 * - 'declined' – reassign driver (round-robin), email traveler
 * - 'cancelled' – final cancel (optional cancelled_* fields)
 */
async function updateTripStatus(req, res) {
  const conn = await db.getConnection();
  try {
    await ensureSchema();

    // ---- Parse & validate input ----
    const { id, orderId: orderIdLegacy } = req.params;
    const orderId = id ?? orderIdLegacy;
    let { status, cancelled_by, cancelled_reason } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "חסר מזהה הזמנה (id)" });
    }

    status = String(status || "")
      .trim()
      .toLowerCase();
    const ALLOWED = new Set(["pending", "completed", "declined", "cancelled"]);
    if (!ALLOWED.has(status)) {
      return res.status(400).json({ error: "סטטוס לא חוקי" });
    }

    // ---- Load order + traveler essentials (single source of truth) ----
    const [rows] = await conn.query(
      `SELECT 
          o.order_num,
          o.o_driver_id,
          o.status                      AS currentStatus,
          o.trip_date,
          ${
            SCHEMA.TRIP_NAME_COL
              ? SCHEMA.TRIP_NAME_COL.includes(" ")
                ? `o.\`${SCHEMA.TRIP_NAME_COL}\``
                : `o.${SCHEMA.TRIP_NAME_COL}`
              : "NULL"
          }                  AS tripName,
          ${
            SCHEMA.HAS_TRAVELER_ADDRESS_COL
              ? "NULLIF(TRIM(o.traveler_address),'')"
              : "NULL"
          }                  AS pickupAddress,
          ut.userName                  AS travelerName, 
          ut.email                     AS travelerEmail
       FROM ${SCHEMA.ORDER_TABLE} o
       LEFT JOIN users ut ON ut.idNumber = o.o_traveler_id
       WHERE o.order_num = ?
       LIMIT 1`,
      [orderId]
    );
    const order = rows?.[0];
    if (!order) {
      return res.status(404).json({ error: "הזמנה לא נמצאה" });
    }

    const currentDriverId = order.o_driver_id || null;

    // ---- Authorization: allow by o_driver_id OR by DRO.username ----
    let assignedToUserById = false;
    let assignedToUserByDro = false;

    if (currentDriverId) {
      assignedToUserById =
        String(currentDriverId) === String(req.user.idNumber);
    }

    if (SCHEMA.DRO_TABLE) {
      const [[droRow]] = await conn.query(
        `SELECT username FROM ${SCHEMA.DRO_TABLE} WHERE order_id = ? LIMIT 1`,
        [orderId]
      );
      assignedToUserByDro = !!droRow && droRow.username === req.user.userName;
    }

    if (!assignedToUserById && !assignedToUserByDro) {
      return res.status(403).json({
        error: "אין הרשאה לעדכן הזמנה זו (לא משויך אליך כנהג להזמנה)",
      });
    }

    // ---- Old driver name for email (if exists) ----
    let oldDriverName = null;
    if (currentDriverId) {
      const [[od]] = await conn.query(
        "SELECT userName FROM users WHERE idNumber = ? LIMIT 1",
        [currentDriverId]
      );
      oldDriverName = od?.userName || null;
    }

    // helper: validate email
    const isValidEmail = (v) =>
      typeof v === "string" &&
      v.trim() &&
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());

    // ===== [A] CANCELLED =====
    if (status === "cancelled") {
      const fields = ["status = ?"];
      const params = ["cancelled"];

      if (SCHEMA.HAS_CANCELLED_BY) {
        fields.push("cancelled_by = ?");
        params.push(cancelled_by || "driver");
      }
      if (SCHEMA.HAS_CANCELLED_REASON) {
        fields.push("cancelled_reason = ?");
        params.push(cancelled_reason || null);
      }
      if (SCHEMA.HAS_CANCELLED_AT) {
        fields.push("cancelled_at = NOW()");
      }

      params.push(orderId);
      const sql = `UPDATE ${SCHEMA.ORDER_TABLE} SET ${fields.join(
        ", "
      )} WHERE order_num = ?`;
      const [result] = await conn.query(sql, params);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "הזמנה לא נמצאה" });
      }

      // email traveler – non-blocking
      const email = (order.travelerEmail || "").trim();
      if (!isValidEmail(email)) {
        console.warn(
          "[MAIL] Skip sending cancel email: invalid/missing travelerEmail for order",
          orderId,
          email
        );
      } else {
        try {
          await sendMail({
            to: email,
            subject: "עדכון הזמנה – ההזמנה בוטלה",
            html: `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif">
              <p>שלום ${order.travelerName || "מטייל/ת"},</p>
              <p>ההזמנה שלך לטיול <strong>${
                order.tripName || "-"
              }</strong> בוטלה.</p>
              <p>בברכה,<br/>Do OlaNya Trips</p>
            </div>`,
            text: `שלום ${order.travelerName || "מטייל/ת"}, הזמנתך לטיול "${
              order.tripName || "-"
            }" בוטלה.`,
          });
        } catch (e) {
          console.warn("⚠️ Failed to send cancel email:", e?.message || e);
        }
      }

      return res.json({ success: true, message: "ההזמנה בוטלה" });
    }

    // ===== [B] DECLINED -> reassign driver =====
    if (status === "declined") {
      await conn.beginTransaction();

      // בוחרים נהג חדש עם העומס הנמוך ביותר (ללא הנהג הנוכחי)
      const skipArgs = currentDriverId ? [currentDriverId] : [];
      const [candidates] = await conn.query(
        `
        SELECT 
          u.idNumber, u.userName, u.phone,
          COALESCE(cnt.cnt, 0) AS upcomingCount
        FROM users u
        LEFT JOIN (
          SELECT o2.o_driver_id AS did, COUNT(*) AS cnt
          FROM ${SCHEMA.ORDER_TABLE} o2
          WHERE DATE(o2.trip_date) >= CURDATE()
            AND (o2.status IS NULL OR o2.status NOT IN ('completed','cancelled'))
          GROUP BY o2.o_driver_id
        ) cnt ON cnt.did = u.idNumber
        WHERE u.role = 'driver' ${currentDriverId ? "AND u.idNumber != ?" : ""}
        ORDER BY upcomingCount ASC, u.idNumber ASC
        LIMIT 1
        `,
        skipArgs
      );

      if (!candidates.length) {
        // אם אין נהג חלופי – משאירים ללא נהג, סטטוס pending
        await conn.query(
          `UPDATE ${SCHEMA.ORDER_TABLE}
           SET o_driver_id = NULL, status = 'pending'
           WHERE order_num = ?`,
          [orderId]
        );
        await conn.commit();

        return res.json({
          success: true,
          noDriverFound: true,
          message: "לא נמצא נהג חלופי. ההזמנה הושארה כממתינה ללא נהג.",
        });
      }

      const newDriver = candidates[0];

      // עדכון order לשיוך לנהג החדש
      const [upd] = await conn.query(
        `UPDATE ${SCHEMA.ORDER_TABLE}
         SET o_driver_id = ?, status = 'pending'
         WHERE order_num = ?`,
        [newDriver.idNumber, orderId]
      );
      if (upd.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ error: "הזמנה לא נמצאה" });
      }

      // שמירה/עדכון גם ב-DRO (אם קיימת)
      if (SCHEMA.DRO_TABLE) {
        const [[exists]] = await conn.query(
          `SELECT 1 AS ok FROM ${SCHEMA.DRO_TABLE} WHERE order_id = ? LIMIT 1`,
          [orderId]
        );
        if (exists?.ok) {
          await conn.query(
            `UPDATE ${SCHEMA.DRO_TABLE}
             SET username = ?
             WHERE order_id = ?`,
            [newDriver.userName, orderId]
          );
        } else {
          await conn.query(
            `INSERT INTO ${SCHEMA.DRO_TABLE} (order_id, username)
             VALUES (?, ?)`,
            [orderId, newDriver.userName]
          );
        }
      }

      await conn.commit();

      // אימייל למטייל על החלפת נהג – non-blocking
      const email = (order.travelerEmail || "").trim();
      if (!isValidEmail(email)) {
        console.warn(
          "[MAIL] Skip sending reassignment email: invalid/missing travelerEmail for order",
          orderId,
          email
        );
      } else {
        try {
          const html = reassignedEmailHtml({
            travelerName: order.travelerName,
            tripName: order.tripName,
            tripDate: order.trip_date,
            pickupAddress: order.pickupAddress,
            oldDriverName,
            newDriver: { userName: newDriver.userName, phone: newDriver.phone },
          });

          await sendMail({
            to: email,
            subject: "עדכון הזמנה – שובץ עבורך נהג חדש",
            html,
            text:
              `שלום ${order.travelerName || "מטייל/ת"},\n` +
              `ההזמנה שלך לטיול "${
                order.tripName || "-"
              }" עודכנה. שובץ נהג חדש: ${newDriver.userName || "-"}.\n` +
              (newDriver.phone ? `טלפון: ${newDriver.phone}\n` : "") +
              (order.pickupAddress
                ? `נקודת איסוף: ${order.pickupAddress}\n`
                : "") +
              `בברכה,\nDo OlaNya Trips`,
          });
        } catch (mailErr) {
          console.warn(
            "⚠️ Failed to send reassignment email:",
            mailErr?.message || mailErr
          );
        }
      }

      return res.json({
        success: true,
        reassigned: true,
        newDriver: {
          idNumber: newDriver.idNumber,
          userName: newDriver.userName,
        },
        message: "ההזמנה הועברה לנהג אחר בהצלחה",
      });
    }

    // ===== [C] SIMPLE: pending / completed =====
    const [result] = await conn.query(
      `UPDATE ${SCHEMA.ORDER_TABLE} SET status = ? WHERE order_num = ?`,
      [status, orderId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "הזמנה לא נמצאה" });
    }

    return res.json({ success: true, message: "הסטטוס עודכן בהצלחה" });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    res.status(500).json({
      error: "שגיאה בעדכון סטטוס/העברה",
      details: e.sqlMessage || e.message,
    });
  } finally {
    try {
      conn.release();
    } catch {}
  }
}

// helper למעלה בקובץ (או באותו קובץ לפני השימוש)
function sanitizeSheetName(name) {
  if (!name) return "Sheet";
  // החלפת תווים אסורים
  const cleaned = String(name).replace(/[\\/*?:\[\]]/g, "־");
  // מגבלת אקסל 31 תווים
  const trimmed = cleaned.slice(0, 31).trim();
  return trimmed || "Sheet";
}

async function exportTripsExcel(req, res) {
  let sent = false;

  const runQuery = async (sql, params) => {
    try {
      const [rows] = await db.query(sql, params);
      return rows;
    } catch (e) {
      console.error("Export SQL failed:", {
        message: e?.message,
        sqlMessage: e?.sqlMessage,
        code: e?.code,
        sql,
        params,
      });
      throw e;
    }
  };

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

    const selectSqlFull = baseSelect();
    let sqlFull = `${selectSqlFull}\nWHERE ${where.sql}\n`;
    if (type === "history") {
      sqlFull +=
        `  AND (DATE(o.trip_date) < CURDATE() OR o.status IN ('completed','cancelled'))\n` +
        `ORDER BY o.trip_date DESC`;
    } else {
      sqlFull +=
        `  AND DATE(o.trip_date) >= CURDATE()\n` +
        `  AND (o.status IS NULL OR o.status NOT IN ('completed','cancelled'))\n` +
        `ORDER BY o.trip_date ASC`;
    }

    let rows;
    try {
      rows = await runQuery(sqlFull, where.params);
    } catch (e1) {
      // fallback מינימלי
      const sqlFallback =
        `
SELECT
  o.order_num        AS orderNumber,
  o.order_num        AS id,
  o.trip_date        AS departureTime,
  o.trip_date        AS tripDate,
  o.order_participants_num AS participants,
  o.o_driver_id      AS driverId,
  o.o_traveler_id    AS travelerId,
  ut.userName        AS travelerName,
  ut.phone           AS travelerPhone,
  COALESCE(
    o.status,
    CASE WHEN DATE(o.trip_date) < CURDATE() THEN 'completed' ELSE 'pending' END
  )                  AS status
FROM ${SCHEMA.ORDER_TABLE} o
LEFT JOIN users ut ON ut.idNumber = o.o_traveler_id
WHERE ${where.sql}
` +
        (type === "history"
          ? `  AND (DATE(o.trip_date) < CURDATE() OR o.status IN ('completed','cancelled'))\nORDER BY o.trip_date DESC`
          : `  AND DATE(o.trip_date) >= CURDATE()\n  AND (o.status IS NULL OR o.status NOT IN ('completed','cancelled'))\nORDER BY o.trip_date ASC`);

      rows = await runQuery(sqlFallback, where.params);
    }

    const safeCell = (v) => (v === undefined || v === null ? "" : v);

    const wb = new ExcelJS.Workbook();
    const rawTitle =
      type === "history" ? "טיולים שהסתיימו־בוטלו" : "טיולים ממתינים";
    const ws = wb.addWorksheet(sanitizeSheetName(rawTitle));

    const hasTripName =
      rows.length && Object.prototype.hasOwnProperty.call(rows[0], "tripName");
    const hasPickup =
      rows.length &&
      Object.prototype.hasOwnProperty.call(rows[0], "pickupAddress");
    const hasPayment =
      rows.length && Object.prototype.hasOwnProperty.call(rows[0], "payment");

    const cols = [
      { header: "מס׳ הזמנה", key: "orderNumber", width: 12 },
      ...(hasTripName
        ? [{ header: "שם הטיול", key: "tripName", width: 28 }]
        : []),
      ...(hasPickup
        ? [{ header: "כתובת איסוף", key: "pickupAddress", width: 28 }]
        : []),
      { header: "תאריך יציאה", key: "departureTime", width: 22 },
      { header: "משתתפים", key: "participants", width: 12 },
      ...(hasPayment
        ? [{ header: "תשלום (₪)", key: "payment", width: 14 }]
        : []),
      { header: "שם הנוסע", key: "travelerName", width: 22 },
      { header: "טלפון", key: "travelerPhone", width: 18 },
      { header: "סטטוס", key: "status", width: 12 },
    ];
    ws.columns = cols;

    for (const r of rows) {
      ws.addRow({
        orderNumber: safeCell(r.orderNumber),
        ...(hasTripName ? { tripName: safeCell(r.tripName) } : {}),
        ...(hasPickup ? { pickupAddress: safeCell(r.pickupAddress) } : {}),
        departureTime: safeCell(r.departureTime),
        participants: safeCell(r.participants),
        ...(hasPayment ? { payment: safeCell(r.payment) } : {}),
        travelerName: safeCell(r.travelerName),
        travelerPhone: safeCell(r.travelerPhone),
        status: safeCell(r.status),
      });
    }

    const filename = `driver-trips-${type}-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    sent = true;
    res.end();
  } catch (e) {
    console.error("Export trips excel (outer) failed:", {
      message: e?.message,
      sqlMessage: e?.sqlMessage,
      code: e?.code,
      stack: e?.stack,
    });
    if (!sent && !res.headersSent) {
      res.status(500).json({
        error: "Failed to export excel",
        details: e?.sqlMessage || e?.message || "unknown error",
      });
    }
  }
}

// ========== Routes ==========
router.get("/profile", authMiddleware, driverOnly, getDriverProfile);
router.get("/trips/upcoming", authMiddleware, driverOnly, getUpcomingTrips);
router.get("/trips/history", authMiddleware, driverOnly, getTripsHistory);
router.get("/trips/export", authMiddleware, driverOnly, exportTripsExcel);
router.put("/order-status/:id", authMiddleware, driverOnly, updateTripStatus);

module.exports = router;
