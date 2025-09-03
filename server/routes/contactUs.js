// server/routes/contactus.js
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
require("dotenv").config(); // Load environment variables from .env

// ==============================
// SMTP SETUP
// ==============================
const transporter = nodemailer.createTransport(
  {
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS.replace(/\s/g, ""), // Remove accidental spaces
    },
  },
  {
    logger: true,
    debug: true,
  }
);

// Verify SMTP on startup
transporter
  .verify()
  .then(() => console.log("✅ SMTP connection successful"))
  .catch((err) => console.error("❌ SMTP connection error:", err));

// ==============================
// Email sending function
// ==============================
async function sendContactMessage(name, fromEmail, message) {
  const mailOptions = {
    from: `"DoOlanyaTrips" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    bcc: process.env.BCC_EMAIL || "",
    subject: `New Contact Form Submission from ${name}`,
    text: `Name: ${name}\nEmail: ${fromEmail}\n\nMessage:\n${message}`,
    replyTo: fromEmail,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("📧 Email sent info:", info);
  return info;
}

// ==============================
// Route: POST /api/contact
// ==============================
router.post("/", async (req, res) => {
  const { name, email, message } = req.body;
  console.log("📩 Contact form submitted:", { name, email, message });

  try {
    await sendContactMessage(name, email, message);
    return res.json({
      success: true,
      message: "Message sent successfully!",
    });
  } catch (error) {
    console.error("❌ Error sending contact message:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

module.exports = router;
