// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// // ===========================
// // קבלת כל האטרקציות
// // ===========================
// router.get("/", async (req, res) => {
//   try {
//     const [attractions] = await db.query("SELECT * FROM attractions");
//     res.json(attractions);
//   } catch (error) {
//     console.error("❌ Error fetching attractions:", error);
//     res.status(500).json({ error: "Failed to fetch attractions" });
//   }
// });

// // ===========================
// // קבלת אטרקציה לפי מזהה
// // ===========================
// router.get("/:id", async (req, res) => {
//   try {
//     const [attraction] = await db.query(
//       "SELECT * FROM attractions WHERE attraction_id = ?",
//       [req.params.id]
//     );

//     if (attraction.length === 0) {
//       return res.status(404).json({ error: "Attraction not found" });
//     }

//     res.json(attraction[0]);
//   } catch (error) {
//     console.error("❌ Error fetching attraction:", error);
//     res.status(500).json({ error: "Failed to fetch attraction" });
//   }
// });

// // ===========================
// // הוספת אטרקציה חדשה
// // ===========================
// router.post("/", async (req, res) => {
//   try {
//     const {
//       attraction_name,
//       attraction_type,
//       attraction_description,
//       attraction_img,
//     } = req.body;

//     const [result] = await db.query(
//       `INSERT INTO attractions
//        (attraction_name, attraction_type, attraction_description, attraction_img)
//        VALUES (?, ?, ?, ?)`,
//       [attraction_name, attraction_type, attraction_description, attraction_img]
//     );

//     res.status(201).json({ id: result.insertId });
//   } catch (error) {
//     console.error("❌ Error adding attraction:", error);
//     res.status(500).json({ error: "Failed to add attraction" });
//   }
// });

// // ===========================
// // עדכון אטרקציה קיימת
// // ===========================
// router.put("/:id", async (req, res) => {
//   try {
//     const {
//       attraction_name,
//       attraction_type,
//       attraction_description,
//       attraction_img,
//     } = req.body;

//     const [result] = await db.query(
//       `UPDATE attractions SET
//         attraction_name = ?,
//         attraction_type = ?,
//         attraction_description = ?,
//         attraction_img = ?
//        WHERE attraction_id = ?`,
//       [
//         attraction_name,
//         attraction_type,
//         attraction_description,
//         attraction_img,
//         req.params.id,
//       ]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: "Attraction not found" });
//     }

//     res.json({ message: "Attraction updated successfully" });
//   } catch (error) {
//     console.error("❌ Error updating attraction:", error);
//     res.status(500).json({ error: "Failed to update attraction" });
//   }
// });

// router.get("/:id", async (req, res) => {
//   try {
//     const { is_recommended } = req.query;
//     let sql = "SELECT * FROM attractions";
//     const where = [];
//     if (String(is_recommended) === "1") where.push("is_recommended = 1");
//     if (where.length) sql += " WHERE " + where.join(" AND ");
//     sql += " ORDER BY attraction_id DESC";
//     const [rows] = await db.query(sql);
//     res.json(rows);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ ok: false, message: "Server error" });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * ===========================
 * רשימת אטרקציות
 * GET /api/attractions?is_recommended=1
 * ===========================
 */
router.get("/", async (req, res) => {
  try {
    const { is_recommended } = req.query;

    let sql = "SELECT * FROM attractions";
    const where = [];

    // סינון מומלצים (עמודה: is_recommended)
    if (String(is_recommended) === "1") {
      where.push("is_recommended = 1");
    }

    if (where.length) {
      sql += " WHERE " + where.join(" AND ");
    }

    sql += " ORDER BY attraction_id DESC"; // אופציונלי: סדר תצוגה

    const [rows] = await db.query(sql);
    return res.json(rows);
  } catch (error) {
    console.error("❌ Error fetching attractions:", error);
    return res.status(500).json({ error: "Failed to fetch attractions" });
  }
});

/**
 * ===========================
 * קבלת אטרקציה לפי מזהה
 * GET /api/attractions/:id
 * ===========================
 */
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM attractions WHERE attraction_id = ?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Attraction not found" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error fetching attraction:", error);
    return res.status(500).json({ error: "Failed to fetch attraction" });
  }
});

/**
 * ===========================
 * הוספת אטרקציה חדשה
 * POST /api/attractions
 * ===========================
 */
router.post("/", async (req, res) => {
  try {
    const {
      attraction_name,
      attraction_type,
      attraction_description,
      attraction_img,
      is_recommended = 0, // ברירת מחדל
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO attractions 
       (attraction_name, attraction_type, attraction_description, attraction_img, is_recommended) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        attraction_name,
        attraction_type,
        attraction_description,
        attraction_img,
        is_recommended ? 1 : 0,
      ]
    );

    return res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error("❌ Error adding attraction:", error);
    return res.status(500).json({ error: "Failed to add attraction" });
  }
});

/**
 * ===========================
 * עדכון אטרקציה קיימת
 * PUT /api/attractions/:id
 * ===========================
 */
router.put("/:id", async (req, res) => {
  try {
    const {
      attraction_name,
      attraction_type,
      attraction_description,
      attraction_img,
      is_recommended, // אופציונלי לעדכון
    } = req.body;

    const fields = [
      "attraction_name = ?",
      "attraction_type = ?",
      "attraction_description = ?",
      "attraction_img = ?",
    ];
    const params = [
      attraction_name,
      attraction_type,
      attraction_description,
      attraction_img,
    ];

    if (typeof is_recommended !== "undefined") {
      fields.push("is_recommended = ?");
      params.push(is_recommended ? 1 : 0);
    }

    params.push(req.params.id);

    const [result] = await db.query(
      `UPDATE attractions 
       SET ${fields.join(", ")} 
       WHERE attraction_id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Attraction not found" });
    }

    return res.json({ message: "Attraction updated successfully" });
  } catch (error) {
    console.error("❌ Error updating attraction:", error);
    return res.status(500).json({ error: "Failed to update attraction" });
  }
});

module.exports = router;
