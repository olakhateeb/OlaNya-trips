const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../../db");

const router = express.Router();

// @route   POST /auth/signup
// @desc    Register a new user
// @access  Public
router.post("/signup", async (req, res) => {
  console.log("Received signup request with body:", req.body);

  const {
    userName,
    email,
    phone,
    password,
    confirmPassword = req.body.password, // Default to password if not provided
    idNumber,
    address,
    role = "traveler",
  } = req.body;

  // Check for missing required fields
  const requiredFields = [
    "userName",
    "email",
    "phone",
    "password",
    "idNumber",
    "address",
  ];
  // Check for missing required fields
  const missingFields = requiredFields.filter((field) => !req.body[field]);
  //אם קיים לפחות שדה חסר (המערך לא ריק)...
  if (missingFields.length > 0) {
    console.log("Missing required fields:", missingFields);
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Check for matching passwords
  if (password !== confirmPassword) {
    console.log("Passwords do not match");
    return res.status(400).json({
      success: false,
      message: "Passwords do not match",
    });
  }

  // Check for existing user with the same email, username, or ID number
  try {
    const [existing] = await db.query(
      "SELECT * FROM users WHERE email = ? OR userName = ? OR idNumber = ?",
      [email, userName, idNumber]
    );
    // If an existing user is found, return an error
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email, username, or ID number already exists",
      });
    }
    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(password, 10);
    let finalRole = role === null ? "traveler" : role;
    await db.query(
      "INSERT INTO users (userName, email, phone, password, confirmPassword, idNumber, address, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userName,
        email,
        phone,
        hashedPassword,
        hashedPassword,
        idNumber,
        address,
        finalRole,
      ]
    );

    console.log("Registration successful for user:", { userName, email });
    // Return a success message to the client
    res.json({
      success: true,
      message: "Registration successful!",
    });
  } catch (err) {
    console.error("Unexpected error during signup:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      sqlMessage: err.sqlMessage,
      sql: err.sql,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
      error:
        process.env.NODE_ENV === "development"
          ? {
              message: err.message,
              code: err.code,
              sqlMessage: err.sqlMessage,
            }
          : undefined,
    });
  }
});

module.exports = router;
