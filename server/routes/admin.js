// routes/admin.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const db = require("../db");
const ExcelJS = require("exceljs");

// ============================
//  Auth middlewares
// ============================
async function verifyToken(req, res, next) {
  try {
    if (req.method === "OPTIONS") return next();

    const hdr = req.headers.authorization || "";
    if (!hdr.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, message: "No token provided" });
    }
    const token = hdr.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );

    const base = decoded?.user ? decoded.user : decoded;
    req.user = {
      idNumber: base?.idNumber || base?.id || null,
      username: base?.userName || base?.username || null,
      role: base?.role || null,
      ...base,
    };

    if (!req.user.role && (req.user.idNumber || req.user.username)) {
      try {
        let rows;
        if (req.user.idNumber) {
          const [r] = await db.query(
            "SELECT role FROM users WHERE idNumber = ? LIMIT 1",
            [req.user.idNumber]
          );
          rows = r;
        } else {
          const [r] = await db.query(
            "SELECT role FROM users WHERE userName = ? LIMIT 1",
            [req.user.username]
          );
          rows = r;
        }
        if (Array.isArray(rows) && rows.length) {
          req.user.role = rows[0].role || null;
        }
      } catch (_e) {}
    }

    next();
  } catch (err) {
    console.error("verifyToken error:", err.message);
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

function adminAuth(req, res, next) {
  const role = (req.user && req.user.role) || null;
  if (role !== "admin") {
    return res.status(403).json({ ok: false, message: "Admin only" });
  }
  next();
}

// ============================
//  Multer uploads
// ============================
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const type = req.uploadType || "misc";
    const dir = path.join(__dirname, `../uploads/${type}`);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    const base = path
      .basename(file.originalname || "img", ext)
      .replace(/\s+/g, "_");
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ============================
//  Helpers
// ============================
const truthy = new Set(["true", "1", 1, true, "on", "yes", "y"]);

function toBool(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  const s = String(v).trim().toLowerCase();
  return truthy.has(s) || truthy.has(v) ? 1 : 0;
}

function mapBooleans(obj, fields) {
  const out = { ...obj };
  fields.forEach((f) => {
    if (out[f] !== undefined) out[f] = toBool(out[f]);
  });
  return out;
}

function buildUpdateSet(obj, allowedKeys) {
  const keys = [];
  const vals = [];
  allowedKeys.forEach((k) => {
    if (obj[k] !== undefined) {
      keys.push(`${k}=?`);
      vals.push(obj[k]);
    }
  });
  return { setSql: keys.join(", "), vals };
}

// CSV helpers
function csvToList(csv) {
  if (!csv) return [];
  return String(csv)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function listToCsv(list) {
  return (list || []).filter(Boolean).join(",");
}
// קבלת שם קובץ "טהור" מתוך URL/נתיב
function stripToToken(v) {
  if (!v) return "";
  const s = String(v).trim();
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const u = new URL(s);
      return path.basename(u.pathname);
    }
  } catch {}
  return path.basename(s);
}
// מחיקה בטוחה של קובץ (אם קיים)
function safeUnlinkMaybe(absPath) {
  try {
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  } catch (e) {
    console.warn("safeUnlinkMaybe error:", absPath, e.message);
  }
}

// אוסף קבצים שעלו (בודד/מרובים) בשמות השדות התואמים
function collectUploadedPaths(req, cfg) {
  const out = [];
  if (req.file) {
    out.push(`/uploads/${cfg.uploadType}/${req.file.filename}`);
  }
  if (Array.isArray(req.files)) {
    for (const f of req.files) {
      if (
        f.fieldname === cfg.uploadField ||
        f.fieldname === cfg.uploadMultiField
      ) {
        out.push(`/uploads/${cfg.uploadType}/${f.filename}`);
      }
    }
  }
  return out;
}

// ============================
//  Table Configs
// ============================
const trips = {
  table: "trips",
  idCol: "trip_id",
  bools: [
    "is_accessible",
    "has_parking",
    "has_toilets",
    "pet_friendly",
    "family_friendly",
    "romantic",
    "couple_friendly",
    "has_water_activities",
    "bbq_area",
    "suitable_for_groups",
    "has_entry_fee",
    "is_recommended",
  ],
  fields: [
    "trip_name",
    "trip_duration",
    "trip_description",
    "trip_type",
    "trip_img",
    "region",
  ],
  uploadField: "trip_img",
  uploadMultiField: "trip_imgs", // תמונות מרובות
  uploadType: "trips",
};

const camping = {
  table: "camping",
  idCol: "camping_location_name",
  bools: [
    "is_accessible",
    "has_parking",
    "has_toilets",
    "pet_friendly",
    "family_friendly",
    "romantic",
    "couple_friendly",
    "near_water",
    "bbq_area",
    "night_camping",
    "suitable_for_groups",
    "has_entry_fee",
    "is_recommended",
  ],
  fields: [
    "camping_location_name",
    "camping_description",
    "camping_duration",
    "camping_img",
    "region",
  ],
  uploadField: "camping_img",
  uploadMultiField: "camping_imgs",
  uploadType: "camping",
};

const attractions = {
  table: "attractions",
  idCol: "attraction_id",
  bools: [
    "is_accessible",
    "has_parking",
    "has_toilets",
    "pet_friendly",
    "romantic",
    "couple_friendly",
    "has_water_activities",
    "suitable_for_groups",
    "has_entry_fee",
    "requires_reservation",
    "is_recommended",
  ],
  fields: [
    "attraction_name",
    "attraction_type",
    "attraction_description",
    "attraction_img",
    "region",
  ],
  uploadField: "attraction_img",
  uploadMultiField: "attraction_imgs",
  uploadType: "attractions",
};

// מפה מהירה לשימוש בראוטים דינמיים של תמונות
const ENTITY_CFG = {
  trips,
  camping,
  attractions,
};

// ============================
//  Generic Handlers
// ============================
function listRoute(cfg) {
  return async (_req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT * FROM ${cfg.table} ORDER BY ${cfg.idCol} DESC`
      );
      res.json(rows || []);
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "DB error" });
    }
  };
}

function getByIdRoute(cfg) {
  return async (req, res) => {
    try {
      const id = req.params.id;
      const [rows] = await db.query(
        `SELECT * FROM ${cfg.table} WHERE ${cfg.idCol} = ? LIMIT 1`,
        [id]
      );
      if (!rows || !rows.length)
        return res.status(404).json({ ok: false, message: "Not found" });
      res.json(rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "DB error" });
    }
  };
}

function createRoute(cfg) {
  return async (req, res) => {
    try {
      const uploaded = collectUploadedPaths(req, cfg);
      const bodyImgRaw = req.body[cfg.uploadField] || null;
      const imgValue = uploaded.length
        ? uploaded.join(",")
        : bodyImgRaw || null;

      let body = { ...req.body, [cfg.uploadField]: imgValue };
      body = mapBooleans(body, cfg.bools);

      const allowed = [...cfg.fields, ...cfg.bools].filter(
        (k) => body[k] !== undefined
      );
      if (!allowed.length) {
        return res
          .status(400)
          .json({ ok: false, message: "No fields to insert" });
      }

      const placeholders = allowed.map(() => "?").join(",");
      const values = allowed.map((k) => body[k]);
      const sql = `INSERT INTO ${cfg.table} (${allowed.join(
        ","
      )}) VALUES (${placeholders})`;

      const [result] = await db.query(sql, values);
      const newId = result?.insertId || body[cfg.idCol] || null;

      res.json({ ok: true, id: newId });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "DB error" });
    }
  };
}

function updateRoute(cfg) {
  return async (req, res) => {
    try {
      const id = req.params.id;
      if (!id)
        return res.status(400).json({ ok: false, message: "Missing id" });

      let body = { ...req.body };

      // קבצים חדשים שעלו (תומך בשדות uploadField/ uploadMultiField)
      const uploaded = collectUploadedPaths(req, cfg);

      // אם יש קבצים חדשים – לא להחליף, אלא למזג עם מה שנשלח מהטופס (CSV לאחר מחיקות מקומיות)
      if (uploaded.length) {
        const fromBodyCsv = (body[cfg.uploadField] || "").trim();
        const merged = [...csvToList(fromBodyCsv), ...uploaded].filter(Boolean);
        body[cfg.uploadField] = listToCsv(merged);
      } else if (Object.prototype.hasOwnProperty.call(body, cfg.uploadField)) {
        // אם לא עלו קבצים אבל השדה קיים בגוף — נשאיר אותו כמו שהוא (כולל ריק אם המשתמש מחק הכל)
        const v = body[cfg.uploadField];
        if (v == null) delete body[cfg.uploadField];
      }

      // מיפוי בוליאנים ל-0/1
      body = mapBooleans(body, cfg.bools);
      delete body[cfg.idCol];

      const allowed = [...cfg.fields, ...cfg.bools];
      const { setSql, vals } = buildUpdateSet(body, allowed);
      if (!setSql) {
        return res
          .status(400)
          .json({ ok: false, message: "No fields to update" });
      }

      const sql = `UPDATE ${cfg.table} SET ${setSql} WHERE ${cfg.idCol} = ?`;
      const [result] = await db.query(sql, [...vals, id]);
      res.json({ ok: true, affectedRows: result?.affectedRows || 0 });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "DB error" });
    }
  };
}

// ============================
//  Routes (Trips / Camping / Attractions)
// ============================

// Trips
router.get("/trips", verifyToken, adminAuth, listRoute(trips));
router.get("/trips/:id", verifyToken, adminAuth, getByIdRoute(trips));
router.post(
  "/trips",
  verifyToken,
  adminAuth,
  (req, _res, next) => {
    req.uploadType = trips.uploadType;
    next();
  },
  upload.any(), // תומך בשדות trip_img / trip_imgs
  createRoute(trips)
);
router.put(
  "/trips/:id",
  verifyToken,
  adminAuth,
  (req, _res, next) => {
    req.uploadType = trips.uploadType;
    next();
  },
  upload.any(),
  updateRoute(trips)
);

// Camping
router.get("/camping", verifyToken, adminAuth, listRoute(camping));
router.get("/camping/:id", verifyToken, adminAuth, getByIdRoute(camping));
router.post(
  "/camping",
  verifyToken,
  adminAuth,
  (req, _res, next) => {
    req.uploadType = camping.uploadType;
    next();
  },
  upload.any(), // camping_img / camping_imgs
  createRoute(camping)
);
router.put(
  "/camping/:id",
  verifyToken,
  adminAuth,
  (req, _res, next) => {
    req.uploadType = camping.uploadType;
    next();
  },
  upload.any(),
  updateRoute(camping)
);

// Attractions
router.get("/attractions", verifyToken, adminAuth, listRoute(attractions));
router.get(
  "/attractions/:id",
  verifyToken,
  adminAuth,
  getByIdRoute(attractions)
);
router.post(
  "/attractions",
  verifyToken,
  adminAuth,
  (req, _res, next) => {
    req.uploadType = attractions.uploadType;
    next();
  },
  upload.any(), // attraction_img / attraction_imgs
  createRoute(attractions)
);
router.put(
  "/attractions/:id",
  verifyToken,
  adminAuth,
  (req, _res, next) => {
    req.uploadType = attractions.uploadType;
    next();
  },
  upload.any(),
  updateRoute(attractions)
);

// ============================
//  IMAGES: single delete & bulk delete
// ============================

// מחיקת תמונה בודדת מה-CSV (ואופציונלית מהדיסק)
// DELETE /admin/:entity/:id/images/:token?keepFile=true
router.delete(
  "/:entity/:id/images/:token",
  verifyToken,
  adminAuth,
  async (req, res) => {
    try {
      const { entity, id, token } = req.params;
      const keepFile =
        String(req.query.keepFile || "").toLowerCase() === "true";
      const cfg = ENTITY_CFG[entity];
      if (!cfg) {
        return res.status(400).json({ ok: false, message: "Invalid entity" });
      }
      const [rows] = await db.query(
        `SELECT ${
          cfg.imgField || cfg.uploadField || "trip_img"
        } AS imgcsv FROM ${cfg.table} WHERE ${cfg.idCol} = ? LIMIT 1`,
        [id]
      );
      if (!rows || !rows.length) {
        return res.status(404).json({ ok: false, message: "Record not found" });
      }

      const fieldName = cfg.imgField || cfg.uploadField; // אצלנו זה uploadField
      const currentCsv = rows[0].imgcsv || "";
      const list = csvToList(currentCsv);

      const tok = stripToToken(token);
      const next = list.filter(
        (t) => stripToToken(t).toLowerCase() !== tok.toLowerCase()
      );

      if (next.length === list.length) {
        return res
          .status(404)
          .json({ ok: false, message: "Image not found in CSV" });
      }

      const newCsv = listToCsv(next);
      const [result] = await db.query(
        `UPDATE ${cfg.table} SET ${fieldName} = ? WHERE ${cfg.idCol} = ?`,
        [newCsv, id]
      );

      if (!keepFile) {
        const uploadsRoot = path.join(
          __dirname,
          `../uploads/${cfg.uploadType}`
        );
        const abs = path.join(uploadsRoot, tok);
        if (abs.startsWith(uploadsRoot)) safeUnlinkMaybe(abs);
      }

      res.json({
        ok: true,
        removed: tok,
        csv: newCsv,
        images: next,
        affectedRows: result?.affectedRows || 0,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "DB error" });
    }
  }
);

// מחיקת מספר תמונות בבת אחת
// POST /admin/:entity/:id/images/delete?keepFile=true
// BODY: { tokens: ["a.jpg", "/uploads/trips/b.jpg", "https://x/c.jpg"] }
router.post(
  "/:entity/:id/images/delete",
  verifyToken,
  adminAuth,
  async (req, res) => {
    try {
      const { entity, id } = req.params;
      const keepFile =
        String(req.query.keepFile || "").toLowerCase() === "true";
      const cfg = ENTITY_CFG[entity];

      if (!cfg) {
        return res.status(400).json({ ok: false, message: "Invalid entity" });
      }

      const tokensRaw = Array.isArray(req.body?.tokens) ? req.body.tokens : [];
      if (!tokensRaw.length) {
        return res
          .status(400)
          .json({ ok: false, message: "tokens array is required" });
      }

      const [rows] = await db.query(
        `SELECT ${cfg.uploadField} AS imgcsv FROM ${cfg.table} WHERE ${cfg.idCol} = ? LIMIT 1`,
        [id]
      );
      if (!rows || !rows.length) {
        return res.status(404).json({ ok: false, message: "Record not found" });
      }

      const currentCsv = rows[0].imgcsv || "";
      const list = csvToList(currentCsv);

      const wantedTokens = tokensRaw.map(stripToToken).filter(Boolean);
      if (!wantedTokens.length) {
        return res
          .status(400)
          .json({ ok: false, message: "No valid tokens to delete" });
      }
      const wantedSet = new Set(wantedTokens.map((t) => t.toLowerCase()));

      const next = list.filter(
        (t) => !wantedSet.has(stripToToken(t).toLowerCase())
      );

      if (next.length === list.length) {
        return res
          .status(404)
          .json({ ok: false, message: "No matching images found in CSV" });
      }

      const newCsv = listToCsv(next);
      const [result] = await db.query(
        `UPDATE ${cfg.table} SET ${cfg.uploadField} = ? WHERE ${cfg.idCol} = ?`,
        [newCsv, id]
      );

      if (!keepFile) {
        const uploadsRoot = path.join(
          __dirname,
          `../uploads/${cfg.uploadType}`
        );
        for (const tok of wantedTokens) {
          const abs = path.join(uploadsRoot, tok);
          if (abs.startsWith(uploadsRoot)) safeUnlinkMaybe(abs);
        }
      }

      return res.json({
        ok: true,
        message: "Images removed",
        removed: wantedTokens,
        csv: newCsv,
        images: next,
        affectedRows: result?.affectedRows || 0,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "DB error" });
    }
  }
);

// ============================
//  Users Management
// ============================

// רשימת משתמשים
router.get("/users", verifyToken, adminAuth, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT userName, email, phone, idNumber, address, role, profilePicture
       FROM users
       ORDER BY userName ASC`
    );
    res.json(rows || []);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: "DB error" });
  }
});

// ✅ ייצוא לאקסל — חייב לבוא לפני /users/:idNumber
router.get("/users/export", verifyToken, adminAuth, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT userName, email, phone, idNumber, address, role, profilePicture
       FROM users
       ORDER BY userName ASC`
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Users");

    ws.columns = [
      { header: "שם מלא", key: "userName", width: 22 },
      { header: "אימייל", key: "email", width: 28 },
      { header: "טלפון", key: "phone", width: 16 },
      { header: "ת.ז.", key: "idNumber", width: 16 },
      { header: "כתובת", key: "address", width: 28 },
      { header: "תפקיד", key: "role", width: 12 },
      { header: "תמונת פרופיל", key: "profilePicture", width: 36 },
    ];

    (rows || []).forEach((u) =>
      ws.addRow({
        userName: u.userName || "",
        email: u.email || "",
        phone: u.phone || "",
        idNumber: u.idNumber || "",
        address: u.address || "",
        role: u.role || "",
        profilePicture: u.profilePicture || "",
      })
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    const today = new Date().toISOString().split("T")[0];
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="users_${today}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("Users export failed:", e);
    res.status(500).json({ ok: false, message: "Export failed" });
  }
});

// פרטי משתמש (ללא regex כדי לא לשבור את ה-parser)
router.get("/users/:idNumber", verifyToken, adminAuth, async (req, res) => {
  try {
    const { idNumber } = req.params;
    const [rows] = await db.query(
      `SELECT userName, email, phone, idNumber, address, role, profilePicture
       FROM users
       WHERE idNumber = ? LIMIT 1`,
      [idNumber]
    );
    if (!rows || !rows.length) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: "DB error" });
  }
});

// עדכון תפקיד
router.put(
  "/users/:idNumber/role",
  verifyToken,
  adminAuth,
  async (req, res) => {
    try {
      const { idNumber } = req.params;
      const { role } = req.body;

      if (!idNumber)
        return res.status(400).json({ ok: false, message: "Missing idNumber" });
      if (!role)
        return res.status(400).json({ ok: false, message: "Missing role" });

      const allowed = new Set(["admin", "traveler", "driver"]);
      const normalized = String(role).toLowerCase().trim();
      if (!allowed.has(normalized)) {
        return res.status(400).json({ ok: false, message: "Invalid role" });
      }

      const [result] = await db.query(
        "UPDATE users SET role = ? WHERE idNumber = ?",
        [normalized, idNumber]
      );
      res.json({
        ok: true,
        affectedRows: result?.affectedRows || 0,
        role: normalized,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "DB error" });
    }
  }
);

// ============================
//  Reports (dynamic WHERE + JOIN fix)
// ============================
function parseDateOnly(v) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

function buildOrdersWhere(q = {}) {
  const clauses = ["WHERE 1=1"];
  const args = [];

  const status = q.status && q.status !== "all" ? String(q.status).trim() : "";

  const startRaw =
    q.start || q.startDate || q.from || q.dateFrom || q.date_start || "";
  const endRaw = q.end || q.endDate || q.to || q.dateTo || q.date_end || "";

  const start = parseDateOnly(startRaw);
  const end = parseDateOnly(endRaw);

  const dateField =
    q.dateField === "order" || q.dateField === "order_date"
      ? "o.order_date"
      : "o.trip_date";

  if (status) {
    clauses.push("AND o.status = ?");
    args.push(status);
  }

  if (start && end) {
    clauses.push(`AND DATE(${dateField}) BETWEEN ? AND ?`);
    args.push(start, end);
  } else if (start) {
    clauses.push(`AND DATE(${dateField}) >= ?`);
    args.push(start);
  } else if (end) {
    clauses.push(`AND DATE(${dateField}) <= ?`);
    args.push(end);
  }

  return { whereSql: clauses.join(" "), args };
}

router.get("/reports/orders", verifyToken, adminAuth, async (req, res) => {
  try {
    const { whereSql, args } = buildOrdersWhere(req.query);
    const sql = `
      SELECT
        o.order_num,
        o.order_date,
        o.trip_date,
        o.order_participants_num,
        o.o_driver_id,
        o.o_traveler_id,
        o.trip_name,
        o.traveler_address,
        o.status,
        uD.userName AS driver_name,
        uT.userName AS traveler_name
      FROM orders o
      LEFT JOIN users uD ON uD.idNumber = o.o_driver_id
      LEFT JOIN users uT ON uT.idNumber = o.o_traveler_id
      ${whereSql}
      ORDER BY o.order_num DESC
    `;
    const [rows] = await db.query(sql, args);
    res.json(rows || []);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: "DB error" });
  }
});

router.get(
  "/reports/orders/export",
  verifyToken,
  adminAuth,
  async (req, res) => {
    try {
      const { whereSql, args } = buildOrdersWhere(req.query);
      const sql = `
      SELECT
        o.order_num,
        o.order_date,
        o.trip_date,
        o.order_participants_num,
        o.o_driver_id,
        o.o_traveler_id,
        o.trip_name,
        o.traveler_address,
        o.status,
        uD.userName AS driver_name,
        uT.userName AS traveler_name
      FROM orders o
      LEFT JOIN users uD ON uD.idNumber = o.o_driver_id
      LEFT JOIN users uT ON uT.idNumber = o.o_traveler_id
      ${whereSql}
      ORDER BY o.order_num DESC
    `;
      const [rows] = await db.query(sql, args);

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Orders");
      ws.columns = [
        { header: "מס׳ הזמנה", key: "order_num", width: 12 },
        { header: "תאריך הזמנה", key: "order_date", width: 14 },
        { header: "תאריך טיול", key: "trip_date", width: 18 },
        { header: "משתתפים", key: "order_participants_num", width: 10 },
        { header: "נהג (ת.ז.)", key: "o_driver_id", width: 14 },
        { header: "שם נהג", key: "driver_name", width: 18 },
        { header: "מטייל (ת.ז.)", key: "o_traveler_id", width: 14 },
        { header: "שם מטייל", key: "traveler_name", width: 18 },
        { header: "שם טיול", key: "trip_name", width: 22 },
        { header: "כתובת איסוף", key: "traveler_address", width: 24 },
        { header: "סטטוס", key: "status", width: 12 },
      ];
      const fmt = (v) => (v == null ? "" : String(v));
      (rows || []).forEach((r) =>
        ws.addRow({
          order_num: r.order_num,
          order_date: fmt(r.order_date),
          trip_date: fmt(r.trip_date),
          order_participants_num: r.order_participants_num,
          o_driver_id: r.o_driver_id,
          driver_name: r.driver_name,
          o_traveler_id: r.o_traveler_id,
          traveler_name: r.traveler_name,
          trip_name: r.trip_name,
          traveler_address: r.traveler_address,
          status: r.status,
        })
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="orders-report.xlsx"`
      );
      await wb.xlsx.write(res);
      res.end();
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "Export failed" });
    }
  }
);

// ============================
//  Reviews Management (Admin only)
// ============================
router.delete(
  "/reviews/attraction/:id",
  verifyToken,
  adminAuth,
  async (req, res) => {
    try {
      const id = req.params.id;
      const [result] = await db.query(
        "DELETE FROM attraction_reviews WHERE Attraction_review_id = ?",
        [id]
      );
      if (result.affectedRows === 0)
        return res
          .status(404)
          .json({ ok: false, message: "Attraction review not found" });
      res.json({ ok: true, message: "Attraction review deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, message: "DB error" });
    }
  }
);

router.delete(
  "/reviews/camping/:id",
  verifyToken,
  adminAuth,
  async (req, res) => {
    try {
      const id = req.params.id;
      const [result] = await db.query(
        "DELETE FROM camping_reviews WHERE Camping_review_id = ?",
        [id]
      );
      if (result.affectedRows === 0)
        return res
          .status(404)
          .json({ ok: false, message: "Camping review not found" });
      res.json({ ok: true, message: "Camping review deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, message: "DB error" });
    }
  }
);

router.delete("/reviews/trip/:id", verifyToken, adminAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const [result] = await db.query(
      "DELETE FROM trip_reviews WHERE review_id = ?",
      [id]
    );
    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ ok: false, message: "Trip review not found" });
    res.json({ ok: true, message: "Trip review deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "DB error" });
  }
});

module.exports = router;
