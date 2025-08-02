const User = require("../models/User");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const db = require("../db"); // Import the database connection
const multer = require("multer"); // Added missing import
const express = require("express"); // Added missing import

// עדכון פרופיל משתמש (שם משתמש, אימייל, טלפון, כתובת)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { userName, email, phone, address } = req.body;

    const findUser = await User.findById(userId);
    if (!findUser) return res.status(404).json({ message: "User not found" });

    const updateUserData = { userName, email, phone, address };
    const updatedUser = await User.update(userId, updateUserData);

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// שינוי סיסמה
exports.changePassword = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { oldPassword, newPassword } = req.body;

    // שליפת המשתמש
    const [users] = await db.query("SELECT * FROM users WHERE idNumber = ?", [
      userId,
    ]);
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    // בדיקת סיסמה נוכחית
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect old password" });
    }

    // הצפנת סיסמה חדשה
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // עדכון בסיסמה החדשה
    const [updateResult] = await db.query(
      "UPDATE users SET password = ? WHERE idNumber = ?",
      [hashedPassword, userId]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(500).json({ message: "Failed to update password" });
    }

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// Upload profile image
exports.uploadProfileImage = async (req, res) => {
  console.log("=== Starting uploadProfileImage ===");
  console.log("Request body:", req.body);
  console.log("Request params:", req.params);
  console.log(
    "Request file info:",
    req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          filename: req.file.filename,
        }
      : "No file uploaded"
  );

  try {
    const userId = req.params.userId;

    if (!req.file) {
      console.error("No file in request");
      return res.status(400).json({
        success: false,
        message: "No file was uploaded",
      });
    }

    console.log("Processing file upload for user:", userId);

    // Verify file exists on disk
    try {
      //בודק אם קובץ קיים, ואם יש הרשאות אליו.
      await fs.promises.access(req.file.path, fs.constants.F_OK);
      console.log("File exists on disk:", req.file.path);
    } catch (err) {
      console.error("File does not exist at path:", req.file.path, err);
      return res.status(500).json({
        success: false,
        message: "Uploaded file could not be found on server",
      });
    }

    // Get the filename from multer
    const filename = req.file.filename;
    // Use absolute URL path for the image
    const imageUrl = `/uploads/profileImages/${filename}`;

    console.log("Saving image with filename:", filename);
    console.log("Image will be accessible at:", imageUrl);

    try {
      console.log("Updating user in database...");

      // Try to find the user by ID
      let users;
      try {
        [users] = await db.query("SELECT * FROM users WHERE idNumber = ?", [
          userId,
        ]);
      } catch (findError) {
        console.error("Error finding user in database:", findError);
        return res.status(500).json({
          success: false,
          message: "Database error while finding user",
        });
      }

      if (!users || users.length === 0) {
        console.log("User not found with ID:", userId);

        // Clean up the uploaded file since user doesn't exist
        try {
          await fs.promises.unlink(req.file.path);
          console.log("Cleaned up uploaded file - user not found");
        } catch (cleanupErr) {
          console.error("Error cleaning up file:", cleanupErr);
        }

        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const user = users[0];
      console.log("Found user:", user.userName);

      // Update the user's profile image in the database
      let updateResult;
      try {
        [updateResult] = await db.query(
          "UPDATE users SET profilePicture = ? WHERE idNumber = ?",
          [imageUrl, userId]
        );
      } catch (updateError) {
        console.error(
          "Error updating user profile image in database:",
          updateError
        );
        return res.status(500).json({
          success: false,
          message: "Database error while updating profile image",
        });
      }

      if (updateResult.affectedRows === 0) {
        console.error("Failed to update user record - no rows affected");
        return res.status(500).json({
          success: false,
          message: "Failed to update user record",
        });
      }

      console.log(
        "Profile image updated successfully for user:",
        user.userName
      );

      // Return the updated user data with the image URL
      const userResponse = {
        _id: user.idNumber,
        userName: user.userName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        profileImage: imageUrl,
      };

      res.json({
        success: true,
        message: "Image uploaded successfully",
        user: userResponse,
        imageUrl: imageUrl,
      });
    } catch (dbError) {
      console.error("Database error during profile image update:", dbError);
      // Instead of throwing a new error, respond with a 500 status
      return res.status(500).json({
        success: false,
        message: "Error updating user profile in database",
        error:
          process.env.NODE_ENV === "development" ? dbError.message : undefined,
      });
    }
  } catch (error) {
    console.error("Error in uploadProfileImage:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });

    // Clean up the uploaded file if there was an error
    if (req.file && req.file.path) {
      try {
        await fs.promises.unlink(req.file.path);
        console.log("Cleaned up uploaded file after error");
      } catch (cleanupErr) {
        console.error("Error cleaning up file after error:", cleanupErr);
      }
    }

    // More specific error messages based on error type
    let errorMessage = "Error updating user profile";
    if (error.name === "ValidationError") {
      errorMessage =
        "Validation error: " +
        Object.values(error.errors)
          .map((e) => e.message)
          .join(", ");
    } else if (error.code === 11000) {
      errorMessage =
        "Duplicate key error: A user with this information already exists";
    } else if (error.message.includes("ENOENT")) {
      errorMessage = "File system error: Could not access the uploaded file";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
