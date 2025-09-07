// routes/recommendations.js
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

const isAdmin = (req) => {
  const role = req?.user?.role || req?.user?.user?.role;
  return String(role || "").toLowerCase() === "admin";
};

/* =========================
   PUT /api/recommendations
   הדלקה/כיבוי המלצה
   ========================= */
router.put("/", localVerifyToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ ok: false, message: "Admin only" });
    }

    let { itemType, itemId, recommended } = req.body || {};

    // נרמול טיפוס (תמיכה גם ברבים)
    const normType = (t = "") => {
      const k = String(t).trim().toLowerCase();
      if (k === "trips") return "trip";
      if (k === "campings") return "camping";
      if (k === "attractions") return "attraction";
      return k;
    };
    itemType = normType(itemType);

    // קלטים תקינים
    if (!["trip", "camping", "attraction"].includes(itemType)) {
      return res.status(400).json({ ok: false, message: "Bad itemType" });
    }
    if (typeof recommended === "undefined") {
      return res
        .status(400)
        .json({ ok: false, message: "Missing 'recommended' boolean" });
    }
    const toBool01 = (v) =>
      v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true"
        ? 1
        : 0;
    const flag = toBool01(recommended);

    // camping מזוהה לפי שם (PRIMARY KEY טקסטואלי)
    if (itemType === "camping") {
      const nameKey = String(itemId ?? "").trim();
      if (!nameKey) {
        return res.status(400).json({
          ok: false,
          message:
            "Bad itemId for camping (use camping_location_name as the identifier)",
        });
      }
      const [result] = await db.query(
        "UPDATE camping SET is_recommended=? WHERE camping_location_name=?",
        [flag, nameKey]
      );
      return res.json({ ok: true, updated: result?.affectedRows || 0 });
    }

    // trips / attractions מזוהים לפי מזהה מספרי
    const numId = Number(itemId);
    if (!Number.isFinite(numId) || numId <= 0) {
      return res
        .status(400)
        .json({ ok: false, message: "Bad itemId (number required)" });
    }

    const MAP = {
      trip: { table: "trips", id: "trip_id" },
      attraction: { table: "attractions", id: "attraction_id" },
    };
    const meta = MAP[itemType];

    const [result] = await db.query(
      `UPDATE ${meta.table} SET is_recommended=? WHERE ${meta.id}=?`,
      [flag, numId]
    );

    return res.json({ ok: true, updated: result?.affectedRows || 0 });
  } catch (e) {
    console.error("PUT /api/recommendations error:", e);
    return res
      .status(500)
      .json({ ok: false, message: e.message || "Server error" });
  }
});

/* =========================
   GET /api/recommendations
   רשימת המלצות לעמוד הראשי
   ========================= */
router.get("/", async (req, res) => {
  try {
    // Trips & Attractions לפי מזהה מספרי
    const [trips] = await db.query(
      "SELECT trip_id AS id, trip_name AS name, trip_img AS img, is_recommended FROM trips WHERE is_recommended=1 LIMIT 12"
    );
    const [attractions] = await db.query(
      "SELECT attraction_id AS id, attraction_name AS name, attraction_img AS img, is_recommended FROM attractions WHERE is_recommended=1 LIMIT 12"
    );

    // Camping: אין camping_id – משתמשים בשם כמזהה (string id)
    const [camping] = await db.query(
      "SELECT camping_location_name AS id, camping_location_name AS name, camping_img AS img, is_recommended FROM camping WHERE is_recommended=1 LIMIT 12"
    );

    return res.json({ ok: true, trips, camping, attractions });
  } catch (e) {
    console.error("GET /api/recommendations error:", e);
    return res
      .status(500)
      .json({ ok: false, message: e.message || "Server error" });
  }
});

module.exports = router;
