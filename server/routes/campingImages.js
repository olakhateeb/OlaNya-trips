const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Route to get all camping images from the uploads/camping directory
router.get('/', (req, res) => {
  try {
    const campingDir = path.join(__dirname, '../uploads/camping');
    
    // Check if directory exists
    if (!fs.existsSync(campingDir)) {
      return res.status(404).json({ message: 'Camping images directory not found' });
    }
    
    // Read the directory
    fs.readdir(campingDir, (err, files) => {
      if (err) {
        console.error('Error reading camping directory:', err);
        return res.status(500).json({ message: 'Error reading camping images directory' });
      }
      
      // Filter for image files only
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });
      
      res.json(imageFiles);
    });
  } catch (error) {
    console.error('Error in camping images route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
