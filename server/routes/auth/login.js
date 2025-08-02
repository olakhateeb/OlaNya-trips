const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../../db");
const router = express.Router();

// Log database connection status
console.log("Database connection pool initialized for login");

// @route   GET /auth/login
// @desc    Test route to check if login endpoint is accessible
// @access  Public
router.get("/login", (req, res) => {
  console.log("GET /auth/login endpoint hit");
  res.json({ success: true, message: "Login endpoint is working" });
});

// @route   POST /auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", async (req, res) => {
  console.log("POST /auth/login request received");
  console.log("Request headers:", req.headers);
  console.log("Request body:", req.body);

  const { userName, password } = req.body;

  // Input validation
  if (!userName || !password) {
    const error = new Error("Missing username or password");
    console.error("Login validation error:", error.message);
    return res.status(400).json({
      success: false,
      message: "Please provide both username and password",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }

  try {
    console.log("Attempting to find user:", userName);
    // Check if user exists
    const [users] = await db.query("SELECT * FROM users WHERE userName = ?", [
      userName,
    ]);
    console.log("Found users:", users);
// משתמש לא קיים מקבל שגיאה 
    if (!users || users.length === 0) {
      console.log("No user found with username:", userName);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = users[0];
    console.log("User found, comparing passwords...");

    // Verify password
    const isMatch = await new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, result) => {
        if (err) {
          console.error("Error comparing passwords:", err);
          reject(err);
        } else {
          resolve(result);//  return true/false
        }
      });
    });

    console.log("Password match result:", isMatch);

    if (!isMatch) {
      console.log("Invalid password for user:", userName);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    //שמירת הסיסמה כך שלא יכניס את הסיסמה שוב
    // Create JWT payload
    const payload = {
      user: {
        id: user.idNumber, 
        idNumber: user.idNumber,
        userName: user.userName,
        email: user.email,
        role: user.role || "traveler",
      },
    };

    console.log("JWT Payload:", payload);

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "7d" },
      (err, token) => {
        if (err) {
          console.error("JWT sign error:", err);
          return res.status(500).json({
            success: false,
            message: "Error generating token",
          });
        }

        // Return user data without sensitive information
        const { password, confirmPassword, ...userData } = user;

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
            profileImage: user.profilePicture || "", 
          },
        });
      }
    );
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
