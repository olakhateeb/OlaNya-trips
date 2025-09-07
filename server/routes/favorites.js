// routes/favorites.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");

/* ==== Auth helper ==== */
const localVerifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );
    req.user = decoded?.user || decoded; // תואם למבנה שלך
    next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
};

const getUserId = (req) =>
  req?.user?.idNumber || req?.user?.id || req?.user?.userId || null;

/* Helper: נרמול טיפוס הפריט (סינגולרי ולוואר-קייס) */
const normalizeItemType = (t = "") => {
  const k = String(t || "")
    .trim()
    .toLowerCase();
  if (k === "trips") return "trip";
  if (k === "campings") return "camping";
  if (k === "attractions") return "attraction";
  return k; // trip | camping | attraction
};

/* =========================
   הוספה/הסרה של מועדף
   ========================= */
// on=true => להוסיף, on=false => למחוק
router.post("/", localVerifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    let { itemType, itemId, on } = req.body;

    if (!userId || typeof on === "undefined") {
      return res.status(400).json({ ok: false, message: "Missing params" });
    }

    itemType = normalizeItemType(itemType);
    if (!["trip", "camping", "attraction"].includes(itemType)) {
      return res.status(400).json({ ok: false, message: "Bad itemType" });
    }

    // מזהה נשמר תמיד כמחרוזת (תומך גם ב־VARCHAR כמו camping_location_name)
    const itemKey = String(itemId ?? "").trim();
    if (!itemKey) {
      return res.status(400).json({ ok: false, message: "Bad itemId" });
    }

    if (on) {
      await db.query(
        "INSERT IGNORE INTO favorites (user_id, item_type, item_id) VALUES (?,?,?)",
        [userId, itemType, itemKey]
      );
    } else {
      await db.query(
        "DELETE FROM favorites WHERE user_id=? AND item_type=? AND item_id=?",
        [userId, itemType, itemKey]
      );
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/favorites error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/* =========================
   בדיקת מצב מועדף לכרטיס
   ========================= */
router.get("/check", localVerifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    let { itemType, itemId } = req.query;

    if (!userId) {
      return res.status(400).json({ ok: false, message: "Missing user" });
    }

    itemType = normalizeItemType(itemType);
    if (!["trip", "camping", "attraction"].includes(itemType)) {
      return res.status(400).json({ ok: false, message: "Bad itemType" });
    }

    const itemKey = String(itemId ?? "").trim();
    if (!itemKey) {
      return res.status(400).json({ ok: false, message: "Bad itemId" });
    }

    const [rows] = await db.query(
      "SELECT 1 FROM favorites WHERE user_id=? AND item_type=? AND item_id=? LIMIT 1",
      [userId, itemType, itemKey]
    );
    return res.json({ ok: true, isFavorite: rows.length > 0 });
  } catch (e) {
    console.error("GET /api/favorites/check error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/* =========================
   רשימת המועדפים של המשתמש
   ========================= */
router.get("/my", localVerifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ ok: false, message: "Missing user" });
    }

    const [rows] = await db.query(
      `SELECT 
         item_type AS itemType, 
         item_id   AS itemId, 
         created_at AS createdAt
       FROM favorites 
       WHERE user_id=? 
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({ ok: true, favorites: rows });
  } catch (e) {
    console.error("GET /api/favorites/my error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
