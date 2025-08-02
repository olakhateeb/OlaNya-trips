const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../../db");

// מוגדר מסלול POST שמקבל אימייל וסיסמה חדשה.
router.post("/resetPassword", async (req, res) => {
  // קבל את האימייל וסיסמה החדשה מהנתונים של הטופס.
  const { email, newPassword } = req.body;
  //אם אחד מהשדות חסר – מחזירים שגיאת לקוח
  if (!email || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email and new password are required",
    });
  }

  //הצפנה ועדכון סיסמה
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    //מבצעים שאילתת SQL לעדכון סיסמת המשתמש לפי המייל.
    const [result] = await db.query(
      "UPDATE users SET password = ? WHERE email = ?",
      [hashedPassword, email]
    );

    //אם לא עודכן אף משתמש (כלומר, המייל לא נמצא) – מחזירים שגיאת 404
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    res.json({
      success: true,
      message: "✅ Password has been reset successfully",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      success: false,
      message: "❌ Failed to reset password",
    });
  }
});

module.exports = router;
//מאפס את סיסמת המשתמש במסד הנתונים לאחר אימות מוצלח
