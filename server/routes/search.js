// routes/search.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// ---- Helpers ----
function normalizeFilters(query) {
  const out = {};
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v === "true") out[k] = true;
    else if (v === "false") out[k] = false;
    else if (v !== "" && v != null) out[k] = v;
  });
  if (out.region === "all") delete out.region;
  return out;
}

// מפצל CSV, מחזיר את הראשון
function firstFromCsv(val = "") {
  const s = String(val || "").trim();
  if (!s) return "";
  if (s.includes(",")) return s.split(",")[0].trim();
  return s;
}

// משלים URL לתמונה לפי סוג
function normalizeImage(type, raw) {
  const first = firstFromCsv(raw);
  if (!first) return "";

  // אם כבר URL מלא או data-uri
  if (/^https?:\/\//i.test(first) || first.startsWith("data:")) return first;

  // אם כבר מתחיל ב-/uploads – נחזיר כמו שהוא (הפרוקסי/הקליינט ישלים דומיין)
  if (first.startsWith("/uploads/")) return first;

  const folder =
    type === "trip"
      ? "trips"
      : type === "attraction"
      ? "attractions"
      : "camping";

  // שם קובץ בלבד -> נשים תחת uploads/<folder>/
  return `/uploads/${folder}/${first}`;
}

function toCard(row, type) {
  if (type === "trip") {
    return {
      type,
      id: row.trip_id,
      title: row.trip_name,
      description: row.trip_description,
      img: row.trip_img,
      region: row.region || null,
      href: `/trip/${row.trip_id}`,
      badges: [row.trip_duration, row.region].filter(Boolean),
    };
  }
  if (type === "attraction") {
    return {
      type,
      id: row.attraction_id,
      title: row.attraction_name,
      description: row.attraction_description,
      img: row.attraction_img,
      region: row.region || null,
      href: `/attraction/${row.attraction_id}`,
      badges: [row.region].filter(Boolean),
    };
  }
  // 🎯 כאן השינוי: שימוש ב־/camping-detail/:camping_location_name
  return {
    type,
    id: row.camping_location_name,
    title: row.camping_location_name,
    description: row.camping_description,
    img: row.camping_img,
    region: row.region || null,
    href: `/camping-detail/${encodeURIComponent(row.camping_location_name)}`,
    badges: [row.camping_duration, row.region].filter(Boolean),
  };
}

function buildWhere({ scope, q, region, ...flags }) {
  const where = [];
  const params = [];

  if (q && String(q).trim()) {
    const like = `%${String(q).trim()}%`;
    if (scope === "trip") {
      where.push(
        "(trip_name LIKE ? OR trip_description LIKE ? OR trip_type LIKE ?)"
      );
      params.push(like, like, like);
    } else if (scope === "attraction") {
      where.push(
        "(attraction_name LIKE ? OR attraction_description LIKE ? OR attraction_type LIKE ?)"
      );
      params.push(like, like, like);
    } else {
      where.push(
        "(camping_location_name LIKE ? OR camping_description LIKE ?)"
      );
      params.push(like, like);
    }
  }

  if (region) {
    where.push("region = ?");
    params.push(region);
  }

  const commonFlags = [
    "is_accessible",
    "has_parking",
    "has_toilets",
    "pet_friendly",
    "family_friendly",
    "romantic",
    "couple_friendly",
    "suitable_for_groups",
    "has_entry_fee",
  ];
  commonFlags.forEach((k) => {
    if (flags[k]) where.push(`${k} = 1`);
  });

  if (scope === "trip" || scope === "attraction") {
    if (flags.has_water_activities) where.push("has_water_activities = 1");
    if (scope === "trip" && flags.bbq_area) where.push("bbq_area = 1");
  }
  if (scope === "camping") {
    if (flags.near_water) where.push("near_water = 1");
    if (flags.bbq_area) where.push("bbq_area = 1");
    if (flags.night_camping) where.push("night_camping = 1");
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

// ---- GET /api/search ----
router.get("/", async (req, res) => {
  try {
    const filters = normalizeFilters(req.query);
    const limit = Math.min(parseInt(filters.limit || 50, 10), 200);

    const { whereSql: wTrips, params: pTrips } = buildWhere({
      ...filters,
      scope: "trip",
    });
    const { whereSql: wAttr, params: pAttr } = buildWhere({
      ...filters,
      scope: "attraction",
    });
    const { whereSql: wCamp, params: pCamp } = buildWhere({
      ...filters,
      scope: "camping",
    });

    const tripsSql = `
      SELECT trip_id, trip_name, trip_description, trip_img, trip_duration, region
      FROM trips ${wTrips}
      ORDER BY trip_id DESC LIMIT ${limit}`;
    const attractionsSql = `
      SELECT attraction_id, attraction_name, attraction_description, attraction_img, region
      FROM attractions ${wAttr}
      ORDER BY attraction_id DESC LIMIT ${limit}`;
    const campingsSql = `
      SELECT camping_location_name, camping_description, camping_img, camping_duration, region
      FROM camping ${wCamp}
      ORDER BY camping_location_name DESC LIMIT ${limit}`;

    console.log("[/api/search] filters:", filters);
    console.log("SQL trips:", tripsSql, pTrips);
    console.log("SQL attr:", attractionsSql, pAttr);
    console.log("SQL camp:", campingsSql, pCamp);

    const [tripsRows, attrRows, campRows] = await Promise.all([
      db.query(tripsSql, pTrips),
      db.query(attractionsSql, pAttr),
      db.query(campingsSql, pCamp),
    ]);

    const trips = (tripsRows[0] || tripsRows).map((r) => toCard(r, "trip"));
    const attractions = (attrRows[0] || attrRows).map((r) =>
      toCard(r, "attraction")
    );
    const campings = (campRows[0] || campRows).map((r) => toCard(r, "camping"));

    res.json({ trips, attractions, campings });
  } catch (e) {
    console.error("GET /api/search error:", e);
    res.status(500).json({ message: "Search failed" });
  }
});

module.exports = router;
