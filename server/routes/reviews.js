const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");

/* =========================
   Auth helpers
   ========================= */
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
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
};

const getUsername = (req) =>
  req?.user?.user?.userName || req?.user?.userName || req?.user?.username || "";

const requireAdmin = (req, res, next) => {
  const role = req?.user?.user?.role || req?.user?.role;
  if (String(role || "").toLowerCase() !== "admin") {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }
  next();
};

/* =========================
   Table/column mapping
   ========================= */
const MAP = {
  trip: {
    table: "traveler_reviews_trip",
    idCol: "trip_id",
    reviewIdCol: "review_id",
    ratingCol: "rating",
    descCol: "description",
  },
  attraction: {
    table: "traveler_reviews_attraction",
    idCol: "Attraction_id",
    reviewIdCol: "Attraction_review_id",
    ratingCol: "Attraction_rating",
    descCol: "attractions_description",
  },
  camping: {
    table: "traveler_reviews_camping",
    // מזהים לפי שם הקמפינג בטבלת הביקורות
    idCol: "Camping_name",
    reviewIdCol: "Camping_review_id",
    ratingCol: "Camping_rating",
    descCol: "Camping_description",
  },
};

function getCfg(entity_type) {
  const cfg = MAP[entity_type];
  if (!cfg) throw new Error("invalid entity_type");
  return cfg;
}

const clean = (s) => String(s ?? "").trim();

/* =========================
   ADMIN: מחיקת ביקורת לפי review_id
   (חייב להיות לפני הראוט הגנרי!)
   ========================= */
router.delete(
  "/:entity_type/admin/:review_id",
  localVerifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { entity_type, review_id } = req.params;
      const cfg = getCfg(entity_type);

      const [result] = await db.query(
        `DELETE FROM ${cfg.table} WHERE ${cfg.reviewIdCol} = ?`,
        [review_id]
      );

      if (!result.affectedRows) {
        return res
          .status(404)
          .json({ ok: false, message: `${entity_type} review not found` });
      }
      res.json({ ok: true, message: "Review deleted" });
    } catch (err) {
      console.error(err);
      res.status(400).json({ ok: false, message: err.message });
    }
  }
);

/* =========================
   GET: רשימת ביקורות + meta
   ========================= */
router.get("/:entity_type/:entity_id", async (req, res) => {
  try {
    const { entity_type } = req.params;
    const rawId = req.params.entity_id;
    const entity_id = clean(rawId);
    const cfg = getCfg(entity_type);

    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.max(1, Number(req.query.pageSize || 10));
    const sort = String(req.query.sort || "old");

    const limit = pageSize;
    const offset = (page - 1) * limit;

    const orderBy =
      sort === "top"
        ? `${cfg.ratingCol} DESC, created_at DESC`
        : sort === "low"
        ? `${cfg.ratingCol} ASC, created_at DESC`
        : sort === "new"
        ? `created_at DESC`
        : `created_at ASC`;

    const [data] = await db.query(
      `SELECT ${cfg.reviewIdCol} AS review_id,
              username,
              ${cfg.ratingCol} AS rating,
              ${cfg.descCol}   AS description,
              created_at, updated_at
       FROM ${cfg.table}
       WHERE ${cfg.idCol} = ?
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [entity_id, limit, offset]
    );

    const [[meta]] = await db.query(
      `SELECT COUNT(*) AS reviews_count
       FROM ${cfg.table}
       WHERE ${cfg.idCol} = ?`,
      [entity_id]
    );

    res.json({ ok: true, data, meta });
  } catch (err) {
    console.error(err);
    res.status(400).json({ ok: false, message: err.message });
  }
});

/* =========================
   GET: הביקורת של המשתמש (mine)
   ========================= */
// GET: הביקורת של המשתמש (mine) — מחזיר 200 גם כשאין ביקורת
router.get(
  "/:entity_type/:entity_id/mine",
  localVerifyToken,
  async (req, res) => {
    try {
      const { entity_type } = req.params;
      const entity_id = String(req.params.entity_id || "").trim(); // Express כבר עושה decode ל-URI
      const cfg = getCfg(entity_type);

      const username = getUsername(req);
      if (!username)
        return res.status(401).json({ ok: false, message: "Unauthorized" });

      const [rows] = await db.query(
        `SELECT ${cfg.reviewIdCol} AS review_id,
              username,
              ${cfg.ratingCol} AS rating,
              ${cfg.descCol}   AS description,
              created_at, updated_at
       FROM ${cfg.table}
       WHERE ${cfg.idCol} = ? AND username = ?
       LIMIT 1`,
        [entity_id, username]
      );

      if (!rows || rows.length === 0) {
        // 👇 במקום 404 — נחזיר 200 כדי שלא יהיה רעש בקונסול
        return res.json({ ok: true, exists: false, data: null });
      }

      return res.json({ ok: true, exists: true, data: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(400).json({ ok: false, message: err.message });
    }
  }
);

/* =========================
   POST: יצירה/עדכון (upsert)
   ========================= */
router.post("/:entity_type/:entity_id", localVerifyToken, async (req, res) => {
  try {
    const { entity_type } = req.params;
    const rawId = req.params.entity_id;
    const entity_id = clean(rawId);
    const { rating, description = "" } = req.body;

    const cfg = getCfg(entity_type);
    const username = getUsername(req);
    if (!username)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res
        .status(400)
        .json({ ok: false, message: "Rating must be 1..5" });
    }

    const [upd] = await db.query(
      `UPDATE ${cfg.table}
       SET ${cfg.ratingCol} = ?, ${cfg.descCol} = ?, updated_at = CURRENT_TIMESTAMP
       WHERE ${cfg.idCol} = ? AND username = ?`,
      [r, String(description).trim(), entity_id, username]
    );

    if (upd.affectedRows === 0) {
      await db.query(
        `INSERT INTO ${cfg.table}
         (${cfg.idCol}, username, ${cfg.ratingCol}, ${cfg.descCol}, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [entity_id, username, r, String(description).trim()]
      );
    }

    res.json({ ok: true, message: "Saved" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ ok: false, message: err.message });
  }
});

/* =========================
   PUT: עריכת ביקורת קיימת
   ========================= */
router.put("/:entity_type/:entity_id", localVerifyToken, async (req, res) => {
  try {
    const { entity_type } = req.params;
    const rawId = req.params.entity_id;
    const entity_id = clean(rawId);
    const { rating, description = "" } = req.body;

    const cfg = getCfg(entity_type);
    const username = getUsername(req);
    if (!username)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res
        .status(400)
        .json({ ok: false, message: "Rating must be 1..5" });
    }

    const [upd] = await db.query(
      `UPDATE ${cfg.table}
       SET ${cfg.ratingCol} = ?, ${cfg.descCol} = ?, updated_at = CURRENT_TIMESTAMP
       WHERE ${cfg.idCol} = ? AND username = ?`,
      [r, String(description).trim(), entity_id, username]
    );

    if (upd.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: "Review not found" });
    }

    res.json({ ok: true, message: "Review updated" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ ok: false, message: err.message });
  }
});

/* =========================
   DELETE: מחיקת הביקורת שלי (by entity_id + username)
   ========================= */
router.delete(
  "/:entity_type/:entity_id",
  localVerifyToken,
  async (req, res) => {
    try {
      const { entity_type } = req.params;
      const rawId = req.params.entity_id;
      const entity_id = clean(rawId);
      const cfg = getCfg(entity_type);

      const username = getUsername(req);
      if (!username)
        return res.status(401).json({ ok: false, message: "Unauthorized" });

      const [result] = await db.query(
        `DELETE FROM ${cfg.table}
       WHERE ${cfg.idCol} = ? AND username = ?`,
        [entity_id, username]
      );

      res.json({
        ok: true,
        message: result.affectedRows ? "Deleted" : "Nothing to delete",
      });
    } catch (err) {
      console.error(err);
      res.status(400).json({ ok: false, message: err.message });
    }
  }
);

/* =========================
   DELETE: מסלול מפורש ל-/mine
   ========================= */
router.delete(
  "/:entity_type/:entity_id/mine",
  localVerifyToken,
  async (req, res) => {
    try {
      const { entity_type } = req.params;
      const rawId = req.params.entity_id;
      const entity_id = clean(rawId);
      const cfg = getCfg(entity_type);

      const username = getUsername(req);
      if (!username)
        return res.status(401).json({ ok: false, message: "Unauthorized" });

      const [result] = await db.query(
        `DELETE FROM ${cfg.table}
       WHERE ${cfg.idCol} = ? AND username = ?`,
        [entity_id, username]
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ ok: false, message: "No review to delete" });
      }
      res.json({ ok: true, message: "Deleted" });
    } catch (err) {
      console.error(err);
      res.status(400).json({ ok: false, message: err.message });
    }
  }
);

module.exports = router;
