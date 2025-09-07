const express = require("express");
const router = express.Router();
const db = require("../db");
const path = require("path");
const fs = require("fs");

// ========== מחלקת מודל CampingSpot ==========
class CampingSpot {
  static async findAll() {
    const [rows] = await db.query("SELECT * FROM camping");
    return rows;
  }

  static async findByName(name) {
    const [rows] = await db.query(
      "SELECT * FROM camping WHERE camping_location_name = ?",
      [name]
    );
    if (!rows[0]) return null;
    const spot = rows[0];
    spot.images = spot.camping_img?.includes(",")
      ? spot.camping_img.split(",").map((img) => img.trim())
      : [spot.camping_img];
    return spot;
  }

  static async findById(name) {
    return this.findByName(name);
  }

  static async create(data) {
    const existing = await this.findByName(data.camping_location_name);
    if (existing)
      throw new Error(
        `Camping spot '${data.camping_location_name}' already exists`
      );

    await db.query("START TRANSACTION");

    const [result] = await db.query(
      `INSERT INTO camping (camping_location_name, camping_description, camping_duration, camping_img)
       VALUES (?, ?, ?, ?)`,
      [
        data.camping_location_name,
        data.camping_description,
        data.camping_duration,
        data.camping_img || "default-camping.jpg",
      ]
    );

    if (data.images?.length) {
      for (const img of data.images) {
        await db.query(
          "INSERT INTO camping_images (camping_location_name, image_path) VALUES (?, ?)",
          [data.camping_location_name, img]
        );
      }
    } else {
      await db.query(
        "INSERT INTO camping_img (camping_location_name, image_path) VALUES (?, ?)",
        [data.camping_location_name, data.camping_img || "default-camping.jpg"]
      );
    }

    await db.query("COMMIT");
    return { insertId: data.camping_location_name };
  }

  static async update(name, data) {
    await db.query("START TRANSACTION");

    await db.query(
      `UPDATE camping SET camping_description = ?, camping_duration = ?, camping_img = ?
       WHERE camping_location_name = ?`,
      [
        data.camping_description,
        data.camping_duration,
        data.camping_img || "default-camping.jpg",
        name,
      ]
    );

    if (data.images?.length) {
      await db.query(
        "DELETE FROM camping_images WHERE camping_location_name = ?",
        [name]
      );
      for (const img of data.images) {
        await db.query(
          "INSERT INTO camping_images (camping_location_name, image_path) VALUES (?, ?)",
          [name, img]
        );
      }
    }

    await db.query("COMMIT");
    return { success: true };
  }

  static async getImages(name) {
    const [rows] = await db.query(
      "SELECT camping_img FROM camping WHERE camping_location_name = ?",
      [name]
    );
    if (!rows[0]?.camping_img) return [];
    return rows[0].camping_img.includes(",")
      ? rows[0].camping_img.split(",").map((img) => img.trim())
      : [rows[0].camping_img];
  }

  static async addImage(name, imagePath) {
    const [result] = await db.query(
      "INSERT INTO camping_images (camping_location_name, image_path) VALUES (?, ?)",
      [name, imagePath]
    );
    return { insertId: result.insertId };
  }

  static async deleteImage(imageId) {
    const [result] = await db.query(
      "DELETE FROM camping_images WHERE image_id = ?",
      [imageId]
    );
    return { affectedRows: result.affectedRows };
  }
}

// ========== ראוטים ==========
router.get("/tables", async (req, res) => {
  try {
    const [tables] = await db.query("SHOW TABLES");
    const names = tables.map((t) => Object.values(t)[0]);
    res.json({ tables: names });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error listing tables", error: err.message });
  }
});

router.get("/spots", async (req, res) => {
  try {
    const spots = await CampingSpot.findAll();
    res.json(spots);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching spots", error: err.message });
  }
});

router.get("/spots/:id", async (req, res) => {
  try {
    const spot = await CampingSpot.findById(req.params.id);
    if (!spot)
      return res.status(404).json({ message: "Camping spot not found" });
    res.json(spot);
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

router.get("/name/:name", async (req, res) => {
  try {
    const spot = await CampingSpot.findByName(
      decodeURIComponent(req.params.name).trim()
    );
    if (!spot) return res.status(404).json({ message: "Camping not found" });
    res.json(spot);
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

router.get("/:id/images", async (req, res) => {
  try {
    const images = await CampingSpot.getImages(req.params.id);
    if (!images.length)
      return res.status(404).json({ message: "No images found" });
    res.json({ images });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error getting images", error: err.message });
  }
});

router.get("/uploads/camping/:filename", (req, res) => {
  try {
    const imagePath = path.join(
      process.cwd(),
      "uploads/camping",
      req.params.filename
    );
    if (fs.existsSync(imagePath)) res.sendFile(imagePath);
    else res.status(404).json({ message: "Image not found" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error serving image", error: err.message });
  }
});

router.post("/spots", async (req, res) => {
  try {
    const result = await CampingSpot.create(req.body);
    res.status(201).json({
      success: true,
      message: "אתר הקמפינג נוסף בהצלחה",
      camping_id: result.insertId,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating spot", error: err.message });
  }
});

router.put("/spots/:id", async (req, res) => {
  try {
    await CampingSpot.update(req.params.id, req.body);
    res.json({ success: true, message: "אתר הקמפינג עודכן בהצלחה" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating spot", error: err.message });
  }
});

router.post("/:id/images", async (req, res) => {
  try {
    const name = req.params.id;
    const spot = await CampingSpot.findById(name);
    if (!spot) return res.status(404).json({ message: "Camping not found" });
    if (!req.file)
      return res.status(400).json({ message: "No image file uploaded" });

    const currentImages = spot.images || [];
    currentImages.push(req.file.filename);

    await db.query(
      "UPDATE camping SET camping_img = ? WHERE camping_location_name = ?",
      [currentImages.join(","), name]
    );

    res.status(201).json({
      message: "Image added successfully",
      imagePath: req.file.filename,
      images: currentImages,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error uploading image", error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { is_recommended } = req.query;
    let sql = "SELECT * FROM camping";
    const where = [];
    if (String(is_recommended) === "1") where.push("is_recommended = 1");
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY camping_location_name DESC";
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
