// routes/users.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const User = require("../models/User");

// ========== קוד אימות - שמירה בזיכרון ==========
const codeStore = new Map();
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ========== Middleware אימות טוקן JWT ==========
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = decoded.user;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// ========== Multer - הגדרות להעלאת קבצים ==========
const uploadsDir = path.join(__dirname, "../uploads/profileImages");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.userId}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ===== עוזרים כלליים =====
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

function safeUnlinkIfLocal(filePath) {
  try {
    // מוחקים רק אם זה נתיב פנימי תחת /uploads/profileImages/
    if (
      isNonEmptyString(filePath) &&
      !/^https?:\/\//i.test(filePath) &&
      filePath.startsWith("/uploads/profileImages/")
    ) {
      // להסיר את הסלאש הראשון כדי ש-path.join לא יתעלם מהבסיס
      const relative = filePath.replace(/^\//, "");
      const abs = path.join(__dirname, "..", relative);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    }
  } catch {
    // לא מפילים את הבקשה בגלל כשל מחיקה
  }
}

// ========== שליחת קוד אימות ==========
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const code = generateCode();
  codeStore.set(email, code);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER || "doolanyatrips@gmail.com",
      pass: (process.env.EMAIL_PASS || "loeu irzo fbxx iuep").replace(
        /\s/g,
        ""
      ),
    },
  });

  try {
    await transporter.sendMail({
      from: "doolanyatrips@gmail.com",
      to: email,
      subject:
        "\u05e7\u05d5\u05d3 \u05d0\u05d9\u05de\u05d5\u05ea \u05dc\u05d0\u05d9\u05e4\u05d5\u05e1 \u05e1\u05d9\u05e1\u05de\u05d4",
      text: `\u05e7\u05d5\u05d3 \u05d4\u05d0\u05d9\u05de\u05d5\u05ea \u05e9\u05dc\u05da \u05d4\u05d5\u05d0: ${code}`,
    });
    res.json({ success: true, message: "✅ קוד נשלח למייל." });
  } catch (err) {
    res.status(500).json({ success: false, message: "❌ שגיאה בשליחת קוד." });
  }
});

// ========== אימות קוד ==========
router.post("/verify-code", (req, res) => {
  const { email, code } = req.body;
  const stored = codeStore.get(email);
  if (stored === code) {
    codeStore.delete(email);
    res.json({ success: true, message: "✅ קוד אומת בהצלחה" });
  } else {
    res.status(401).json({ success: false, message: "❌ קוד שגוי" });
  }
});

// ========== הרשמה ==========
router.post("/signup", async (req, res) => {
  const {
    userName,
    email,
    phone,
    password,
    confirmPassword,
    idNumber,
    address,
    role = "traveler",
  } = req.body;

  // ולידציה בסיסית
  if (!userName || !email || !phone || !password || !idNumber || !address) {
    return res.status(400).json({ message: "Missing fields" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    // בדיקת כפילות: גם אימייל וגם ת.ז.
    const [existsRows] = await db.query(
      "SELECT idNumber, email FROM users WHERE email = ? OR idNumber = ? LIMIT 1",
      [email, idNumber]
    );
    if (existsRows.length > 0) {
      return res
        .status(409)
        .json({ message: "User already exists (email or idNumber)" });
    }

    const hashed = await bcrypt.hash(password, 10);

    // הכנסה לטבלה (בלי confirmPassword)
    await db.query(
      `INSERT INTO users (userName, email, phone, password, idNumber, address, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userName, email, phone, hashed, idNumber, address, role]
    );

    return res
      .status(201)
      .json({ success: true, message: "Registration successful" });
  } catch (err) {
    console.error("Signup error:", err); // חשוב ללוג!
    // אם מגיעה שגיאת ייחודיות מה-DB (למקרה שיש UNIQUE)
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email or ID already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
});

// ========== התחברות ==========
router.post("/login", async (req, res) => {
  const { userName, password } = req.body;
  if (!userName || !password)
    return res.status(400).json({ message: "Missing credentials" });

  try {
    const user = await User.findOne({ userName });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      {
        user: {
          idNumber: user.idNumber,
          userName: user.userName,
          role: user.role,
          email: user.email,
        },
      },
      process.env.JWT_SECRET || "my_fallback_secret",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        idNumber: user.idNumber,
        userName: user.userName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        profilePicture: user.profilePicture || "",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ========== איפוס סיסמה ==========
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword)
    return res.status(400).json({ message: "Missing email or password" });

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    const result = await User.findOneAndUpdate(
      { email },
      { $set: { password: hashed } }
    );
    if (!result) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ========== שינוי סיסמה ==========
router.put("/:userId/change-password", auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect old password" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.update(req.params.userId, { password: hashed });
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ========== עדכון פרופיל (ללא תמונה) – חסין מחיקת תמונה ==========
router.put("/:userId", auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    const existing = await User.findById(userId);
    if (!existing) return res.status(404).json({ message: "User not found" });

    // שדות שמותר לעדכן דרך טופס כללי
    const allowed = ["userName", "email", "phone", "address", "role"];
    const payload = {};

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        const val = req.body[key];
        if (
          val !== undefined &&
          val !== null &&
          !(typeof val === "string" && val.trim() === "")
        ) {
          payload[key] = typeof val === "string" ? val.trim() : val;
        }
      }
    }

    // טיפול ב-profilePicture:
    // 1) אם הגיעה מחרוזת לא-ריקה => מעדכנים לחדשה
    // 2) אם הגיע מפתח עם ריק/NULL => מתעלמים ושומרים את הקיימת
    // 3) אם לא הגיע מפתח בכלל => שומרים את הקיימת
    const hasPPKey = Object.prototype.hasOwnProperty.call(
      req.body,
      "profilePicture"
    );
    const incomingPP = hasPPKey ? req.body.profilePicture : undefined;

    if (hasPPKey && isNonEmptyString(incomingPP)) {
      payload.profilePicture = incomingPP.trim();
    } else {
      // תמיד שולחים את הקיים כדי שה-Model לא ימחק
      payload.profilePicture = existing.profilePicture || "";
    }

    if (Object.keys(payload).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    await User.update(userId, payload);
    const fresh = await User.findById(userId);
    res.json(fresh);
  } catch (err) {
    console.error("Safe update user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ========== העלאת תמונת פרופיל ==========
router.post(
  "/:userId/upload-image",
  auth,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const userId = req.params.userId;
      const existing = await User.findById(userId);
      if (!existing) return res.status(404).json({ message: "User not found" });

      // מוחקים תמונה ישנה אם היא פנימית
      safeUnlinkIfLocal(existing.profilePicture);

      const imageUrl = `/uploads/profileImages/${req.file.filename}`;
      await User.update(userId, { profilePicture: imageUrl });

      const fresh = await User.findById(userId);
      res.json({
        success: true,
        imageUrl,
        user: {
          ...fresh,
          profilePicture: imageUrl,
        },
      });
    } catch (err) {
      console.error("Upload image error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
