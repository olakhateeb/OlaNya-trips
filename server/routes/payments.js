// server/routes/payment.js

const express = require("express");
const router = express.Router();

const paypal = require("@paypal/checkout-server-sdk");
const nodemailer = require("nodemailer");
const db = require("../db");

// ====== קבלות (inline במקום receiptController.js) ======
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

function formatILS(n) {
  const num = Number(n || 0);
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(num);
}
function safe(str, fallback = "") {
  return (str ?? fallback).toString();
}

/**
 * יוצר PDF של קבלה ושומר תחת public/receipts/kabala_<orderId>.pdf
 * ומחזיר URL יחסי: /receipts/kabala_<orderId>.pdf
 */
async function generateReceiptPDF({
  orderId,
  total_price,
  order_date,
  trip_date,
  driver_name,
  driver_phone,
  pickup_address,
}) {
  if (!orderId) throw new Error("orderId is required for receipt");

  const receiptsDir = path.join(__dirname, "..", "public", "receipts");
  if (!fs.existsSync(receiptsDir))
    fs.mkdirSync(receiptsDir, { recursive: true });

  const fileName = `kabala_${orderId}.pdf`;
  const filePath = path.join(receiptsDir, fileName);

  const html = `
<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>קבלה #${safe(orderId)}</title>
  <style>
    @page { size: A4; margin: 24mm 18mm; }
    body { font-family: "Noto Sans Hebrew","Rubik","Arial",sans-serif; direction: rtl; color: #111; }
    .header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #eee; padding-bottom:12px; margin-bottom:20px; }
    .brand { font-size:20px; font-weight:700; }
    .doc-title { font-size:22px; font-weight:800; }
    .meta { margin-top:6px; color:#444; font-size:14px; }
    .section { margin:18px 0; }
    .row { display:flex; gap:16px; flex-wrap:wrap; }
    .card { flex:1 1 260px; border:1px solid #eee; border-radius:8px; padding:12px 14px; background:#fafafa; }
    .label { color:#666; font-size:13px; margin-bottom:4px; }
    .value { font-weight:600; font-size:15px; }
    .total { text-align:center; font-size:22px; font-weight:800; margin-top:16px; padding:12px; border-radius:10px; background:#f1f7ff; border:1px solid #e2efff; }
    .footer { margin-top:28px; color:#666; font-size:12px; text-align:center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">Doolanya Trips</div>
    <div class="doc-title">קבלה</div>
  </div>

  <div class="meta">
    מספר הזמנה: <b>#${safe(orderId)}</b><br/>
    תאריך ההזמנה: <b>${safe(order_date)}</b>
  </div>

  <div class="section">
    <div class="row">
      <div class="card">
        <div class="label">תאריך הטיול</div>
        <div class="value">${safe(trip_date)}</div>
      </div>
      <div class="card">
        <div class="label">שם הנהג</div>
        <div class="value">${safe(driver_name)}</div>
      </div>
      <div class="card">
        <div class="label">טלפון הנהג</div>
        <div class="value">${safe(driver_phone)}</div>
      </div>
      <div class="card">
        <div class="label">נקודת המפגש</div>
        <div class="value">${safe(pickup_address)}</div>
      </div>
    </div>
  </div>

  <div class="total">
    סכום ששולם: ${formatILS(total_price)}
  </div>

  <div class="footer">
    קבלה זו נוצרה אוטומטית ע״י המערכת לאחר אישור תשלום PayPal.
  </div>
</body>
</html>`.trim();

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({ path: filePath, format: "A4", printBackground: true });
  await browser.close();

  return `/receipts/${fileName}`;
}

// ====== PayPal client factory ======
function paypalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const rawEnv = (process.env.PAYPAL_ENV || "sandbox").toLowerCase();

  if (!clientId || !clientSecret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
  }
  const env =
    rawEnv === "live"
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);

  return new paypal.core.PayPalHttpClient(env);
}

// ====== Create PayPal order ======
async function createPaypalOrder(req, res) {
  try {
    const { amountILS = 200, currency = process.env.PAYPAL_CURRENCY || "ILS" } =
      req.body;

    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return res.status(500).json({
        error: "PayPal credentials missing on server",
        hint: "Check PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_ENV",
      });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: Number(amountILS).toFixed(2),
          },
          description: "Surprise Trip",
        },
      ],
      application_context: { shipping_preference: "NO_SHIPPING" },
    });

    const client = paypalClient();
    const response = await client.execute(request);
    return res.json({
      orderID: response.result.id,
      env: process.env.PAYPAL_ENV || "sandbox",
    });
  } catch (e) {
    console.error("❌ createPaypalOrder error:", e?.message, e?.statusCode);
    return res.status(500).json({
      error: "create-order failed",
      message: e?.message,
      statusCode: e?.statusCode,
      details: e?.result?.details || e?.result,
    });
  }
}

/**
 * מעדכן את הטבלה הגלובלית payment.Total_payment (עמודה יחידה INT)
 * - אם קיימת שורה: UPDATE +?
 * - אם אין שורה: INSERT עם הערך הראשוני
 */
async function addToGlobalPaymentTotal(conn, amount) {
  const add = Math.round(Number(amount) || 0);
  if (!add) return;

  // ננעל את השורה (אם קיימת) כדי למנוע מרוץ
  const [rows] = await conn.query(
    "SELECT `Total_payment` AS total FROM payment LIMIT 1 FOR UPDATE"
  );
  if (rows.length) {
    await conn.execute(
      "UPDATE payment SET `Total_payment` = `Total_payment` + ?",
      [add]
    );
  } else {
    await conn.execute("INSERT INTO payment (`Total_payment`) VALUES (?)", [
      add,
    ]);
  }
}

// ====== Capture + DB + Receipt + Email ======
async function capturePaypalOrder(req, res) {
  const conn = await db.getConnection();

  // helpers
  const nn = (v) => (v === undefined ? null : v);
  const toInt = (v, dflt = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : dflt;
  };
  const toStrOrNull = (v) => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
  };
  const parseMySQLDateTime = (input) => {
    if (!input) return null;
    const d = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)
      ? new Date(input)
      : new Date(input);
    return isNaN(d.getTime())
      ? null
      : new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  };

  try {
    const paypalOrderId = req.params.orderId;
    if (!paypalOrderId)
      return res.status(400).json({ error: "Missing PayPal orderId" });

    const {
      travelerId,
      participantsNum,
      preferences = {},
      trip_datetime,
      region,
      traveler_address, // primary
      trip_address, // legacy from client
      amountILS = 200,
    } = req.body || {};

    // ולידציה
    const errs = [];
    if (!toStrOrNull(travelerId)) errs.push("travelerId");
    if (!toStrOrNull(region)) errs.push("region");
    const tripDateParsed = parseMySQLDateTime(trip_datetime);
    if (!tripDateParsed) errs.push("trip_datetime");
    const participants = toInt(participantsNum, NaN);
    if (!Number.isFinite(participants) || participants <= 0)
      errs.push("participantsNum");
    if (errs.length) {
      return res
        .status(400)
        .json({ error: "missing required fields", fields: errs });
    }
    const tripDateForMySQL = tripDateParsed
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // לאחד כתובת איסוף ממקורות שונים
    const pickupAddress =
      toStrOrNull(traveler_address) ||
      toStrOrNull(trip_address) ||
      toStrOrNull(preferences?.preferredAddress);

    // 1) CAPTURE
    const client = paypalClient();
    const capReq = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
    capReq.requestBody({});
    const capRes = await client.execute(capReq);
    if (capRes?.result?.status !== "COMPLETED") {
      return res.status(402).json({
        error: "Payment not completed",
        status: capRes?.result?.status,
      });
    }

    // 2) DB
    await conn.beginTransaction();

    const style = toStrOrNull(preferences.style) || "";

    const [trips] = await conn.execute(
      `SELECT * FROM trips WHERE trip_type LIKE ? AND region = ?`,
      [`%${style}%`, region]
    );
    if (!trips?.length) {
      await conn.rollback();
      return res.status(404).json({ error: "no trips for given prefs/region" });
    }
    const randomTrip = trips[Math.floor(Math.random() * trips.length)];
    const tripNameSafe =
      toStrOrNull(randomTrip?.trip_name) ||
      toStrOrNull(randomTrip?.tripName) ||
      toStrOrNull(randomTrip?.trip_title) ||
      null;

    const [drivers] = await conn.execute(
      `SELECT idNumber, userName, phone FROM users WHERE role = 'driver'`
    );
    if (!drivers?.length) {
      await conn.rollback();
      return res.status(500).json({ error: "no drivers available" });
    }
    const selectedDriver = drivers[Math.floor(Math.random() * drivers.length)];
    const driverIdNumber = selectedDriver?.idNumber ?? null;

    const [travelerData] = await conn.execute(
      `SELECT idNumber, userName, phone, email
       FROM users
       WHERE userName = ? OR idNumber = ?
       LIMIT 1`,
      [travelerId, travelerId]
    );
    if (!travelerData?.length) {
      await conn.rollback();
      return res.status(404).json({ error: "traveler not found" });
    }
    const travelerIdNumber = travelerData[0].idNumber;
    const travelerUserName = travelerData[0].userName;
    const travelerPhone = toStrOrNull(travelerData[0].phone);
    const travelerEmail = toStrOrNull(travelerData[0].email);

    const orderDateDisplay = new Date().toISOString().split("T")[0];

    // INSERT orders
    const [orderResult] = await conn.execute(
      `INSERT INTO orders (
        order_date, trip_date, traveler_address, order_participants_num,
        o_driver_id, o_traveler_id, status, trip_name
      ) VALUES (
        NOW(), ?, ?, ?, ?, ?, 'pending', ?
      )`,
      [
        tripDateForMySQL,
        pickupAddress,
        participants,
        nn(driverIdNumber),
        nn(travelerIdNumber),
        tripNameSafe,
      ]
    );
    const orderId = orderResult.insertId;

    // INSERT driver orders/payment
    await conn.execute(
      `INSERT INTO driver_receives_order
        (order_id, username, traveler_phone, traveler_address)
       VALUES (?, ?, ?, ?)`,
      [
        orderId,
        toStrOrNull(travelerUserName),
        toStrOrNull(travelerPhone),
        pickupAddress,
      ]
    );

    const paidAmount = Number(amountILS);
    await conn.execute(
      `INSERT INTO driver_receives_payment (order_id, username, amount)
       VALUES (?, ?, ?)`,
      [
        orderId,
        toStrOrNull(travelerUserName),
        Number.isFinite(paidAmount) ? paidAmount : 0,
      ]
    );

    // ✅ עדכון טבלת payment.total_payment (רשומה בודדת)
    // נועל את הרשומה (אם קיימת), מעדכן, ואם אין — יוצר אחת.
    await conn.execute(
      `INSERT INTO payment (id, Total_payment)
   VALUES (1, ?)
   ON DUPLICATE KEY UPDATE
     Total_payment = COALESCE(Total_payment, 0) + VALUES(Total_payment)`,
      [Number.isFinite(paidAmount) ? paidAmount : 0]
    );

    const tripDateHeb = tripDateParsed.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let receiptUrl = "";
    try {
      receiptUrl = await generateReceiptPDF({
        orderId,
        total_price: Number.isFinite(paidAmount) ? paidAmount : 0,
        order_date: orderDateDisplay,
        trip_date: tripDateHeb,
        driver_name: toStrOrNull(selectedDriver?.userName),
        driver_phone: toStrOrNull(selectedDriver?.phone),
        pickup_address: pickupAddress,
      });
    } catch (e) {
      console.warn("⚠️ receipt generation failed:", e?.message);
    }

    await conn.commit();

    // שליחת מייל (אם יש)
    if (travelerEmail) {
      (async () => {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || "smtp.gmail.com",
            port: Number(process.env.EMAIL_PORT || 587),
            secure: false,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });
          await transporter.verify();
          await transporter.sendMail({
            from:
              process.env.EMAIL_FROM ||
              `Doolanya Trips <${process.env.EMAIL_USER}>`,
            to: travelerEmail,
            subject: `הזמנה #${orderId} – התשלום נקלט וקבלה מצורפת`,
            text: `שלום ${travelerUserName || ""},
התשלום עבור הזמנת טיול הפתעה #${orderId} נקלט בהצלחה.

תאריך הטיול: ${tripDateHeb}
נהג מלווה: ${selectedDriver?.userName || "-"} (${selectedDriver?.phone || "-"})
נקודת מפגש: ${pickupAddress || "-"}
סכום ששולם: ₪${(Number.isFinite(paidAmount) ? paidAmount : 0).toFixed(2)}

קבלה:
${receiptUrl ? "http://localhost:5000" + receiptUrl : "(הקבלה בתהליך יצירה)"}`,
          });
        } catch (e) {
          console.warn("⚠️ email send failed:", e?.message);
        }
      })();
    }

    return res.status(200).json({
      success: true,
      orderId,
      paypalOrderId,
      amount: Number.isFinite(paidAmount) ? paidAmount : 0,
      driver: {
        name: selectedDriver?.userName || null,
        phone: selectedDriver?.phone || null,
      },
      trip: {
        id: randomTrip?.trip_id || randomTrip?.id || null,
        name: tripNameSafe,
        region,
      },
      trip_date: tripDateHeb,
      traveler_address: pickupAddress,
      receiptUrl,
    });
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    console.error("❌ capturePaypalOrder error:", e?.message);
    return res
      .status(500)
      .json({ error: "capture failed", message: e?.message });
  } finally {
    conn.release();
  }
}

// ====== Routes ======
router.post("/create-order", createPaypalOrder);
router.post("/capture/:orderId", capturePaypalOrder);

router.get("/health", (req, res) => {
  const id = process.env.PAYPAL_CLIENT_ID || "";
  const sec = process.env.PAYPAL_CLIENT_SECRET || "";
  res.json({
    ok: true,
    PAYPAL_ENV: process.env.PAYPAL_ENV || "sandbox",
    CLIENT_ID_present: !!id,
    SECRET_present: !!sec,
    CLIENT_ID_prefix: id ? id.slice(0, 6) : null,
    SECRET_prefix: sec ? sec.slice(0, 6) : null,
  });
});

module.exports = router;
