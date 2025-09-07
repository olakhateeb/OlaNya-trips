// routes/favorites.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");

// ==== Auth helper ====
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
    req.user = decoded?.user || decoded;
    next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
};

const getUserId = (req) =>
  req?.user?.idNumber || req?.user?.id || req?.user?.userId || null;

// סינגולר ולוואר-קייס
const normalizeItemType = (t = "") => {
  const k = String(t || "")
    .trim()
    .toLowerCase();
  if (k === "trips") return "trip";
  if (k === "campings") return "camping";
  if (k === "attractions") return "attraction";
  return k; // trip | camping | attraction
};

// ===== NEW: נרמול itemId (מפתח) – כולל Unicode NFC, רווחים כפולים, טרימינג
const normalizeKey = (raw = "") => {
  let s = String(raw ?? "").normalize("NFC"); // מאחד גרסאות Unicode (עברית/סימנים)
  s = s.replace(/\s+/g, " "); // מצמצם רווחים כפולים
  s = s.trim();
  return s;
};

/* =========================
   הוספה/הסרה של מועדף
   ========================= */
router.post("/", localVerifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    let { itemType, itemId, on } = req.body;

    itemType = normalizeItemType(itemType);
    const itemKey = normalizeKey(itemId);

    console.log(
      "[FAV POST] userId=%s type=%s key='%s' len=%d on=%s",
      userId,
      itemType,
      itemKey,
      itemKey.length,
      on
    );

    if (!userId || typeof on === "undefined") {
      return res.status(400).json({ ok: false, message: "Missing params" });
    }
    if (!["trip", "camping", "attraction"].includes(itemType)) {
      return res.status(400).json({ ok: false, message: "Bad itemType" });
    }
    if (!itemKey) {
      return res.status(400).json({ ok: false, message: "Bad itemId" });
    }

    if (on) {
      const [r] = await db.query(
        "INSERT IGNORE INTO favorites (user_id, item_type, item_id) VALUES (?,?,?)",
        [userId, itemType, itemKey]
      );
      console.log("[FAV POST] INSERT IGNORE:", r);
    } else {
      const [r] = await db.query(
        "DELETE FROM favorites WHERE user_id=? AND item_type=? AND item_id=?",
        [userId, itemType, itemKey]
      );
      console.log("[FAV POST] DELETE:", r);
    }

    // בדיקת מצב בפועל אחרי הפעולה (מחזירים ללקוח)
    const [rows] = await db.query(
      "SELECT 1 FROM favorites WHERE user_id=? AND item_type=? AND item_id=? LIMIT 1",
      [userId, itemType, itemKey]
    );
    return res.json({ ok: true, isFavorite: rows.length > 0 });
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

    itemType = normalizeItemType(itemType);
    const itemKey = normalizeKey(itemId);

    console.log(
      "[FAV CHECK] userId=%s type=%s key='%s' len=%d",
      userId,
      itemType,
      itemKey,
      itemKey.length
    );

    if (!userId) {
      return res.status(400).json({ ok: false, message: "Missing user" });
    }
    if (!["trip", "camping", "attraction"].includes(itemType)) {
      return res.status(400).json({ ok: false, message: "Bad itemType" });
    }
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
