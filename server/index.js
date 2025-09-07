// Ola Khateeb & Danya Swaed
// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 5000;
const db = require("./db");
const path = require("path");
const fs = require("fs");

// Enable CORS for all routes
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

//All User routes:
app.use("/api/users", require("./routes/users"));

//Contact us route:
app.use("/api/contact", require("./routes/contactUs"));

//Trips routes:
app.use("/api/trips", require("./routes/trips"));

//Attractions routes:
app.use("/api/attractions", require("./routes/attractions"));

//Camping routes:
app.use("/api/camping", require("./routes/camping"));

//Driver routes:
app.use("/api/driver", require("./routes/driver"));

//Admin routes:
app.use("/api/admin", require("./routes/admin"));

//SurpiseTrip routes:
app.use("/api/surprise-trip", require("./routes/surpriseTrip"));

//PayPal payments routes
app.use("/api/payments", require("./routes/payments"));

//Search routes:
app.use("/api/search", require("./routes/search"));

//reviews routes:
app.use("/api/reviews", require("./routes/reviews"));

// ===== Feature/content routes =====
const uploadRouter = require("./routes/upload");
// Favorites (user)
const favoritesRouter = require("./routes/favorites");
app.use("/api/favorites", favoritesRouter);
// Recommendations (admin)
const recommendationsRouter = require("./routes/recommendations");
app.use("/api/recommendations", recommendationsRouter);
// Upload images
app.use("/api/upload", uploadRouter);

// ===== Simple test endpoints =====
app.get("/api/test-users", async (req, res) => {
  console.log("🧪 Simple test endpoint called");
  try {
    const db = require("./db");
    const [users] = await db.query(
      "SELECT idNumber as id, userName as name, role FROM users LIMIT 3"
    );
    console.log("✅ Test successful! Sample users:", users);
    res.json({
      message: "Database test successful!",
      users: users,
      count: users.length,
    });
  } catch (err) {
    console.error("❌ Test failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/test-trips", async (req, res) => {
  console.log("🧪 Testing trips table...");
  try {
    const db = require("./db");
    const [trips] = await db.query("SELECT * FROM trips LIMIT 5");
    console.log("✅ Trips test successful! Sample trips:", trips);
    res.json({
      message: "Trips database test successful!",
      trips: trips,
      count: trips.length,
    });
  } catch (err) {
    console.error("❌ Trips test failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===== Static directories =====
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== Ensure required folders exist =====
const uploadsDir = path.join(__dirname, "uploads");
const profileImagesDir = path.join(uploadsDir, "profileImages");
const campingImagesDir = path.join(uploadsDir, "camping");
const receiptsDir = path.join(__dirname, "public", "receipts");

if (!fs.existsSync(uploadsDir)) {
  console.log(`Creating uploads directory: ${uploadsDir}`);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(profileImagesDir)) {
  console.log(`Creating profile images directory: ${profileImagesDir}`);
  fs.mkdirSync(profileImagesDir, { recursive: true });
}

if (!fs.existsSync(campingImagesDir)) {
  console.log(`Creating camping images directory: ${campingImagesDir}`);
  fs.mkdirSync(campingImagesDir, { recursive: true });
}

if (!fs.existsSync(receiptsDir)) {
  console.log(`Creating receipts directory: ${receiptsDir}`);
  fs.mkdirSync(receiptsDir, { recursive: true });
}

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
