// server/routes/contactus.js
const express = require('express');
const router = express.Router();
const { sendContactMessage } = require('./emailService');

// Handle Contact Us form submissions
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;
  console.log('📩 Contact form submitted:', { name, email, message });

  try {
    await sendContactMessage(name, email, message);
    return res.json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('❌ Error sending contact message:', error);
    return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

module.exports = router;
