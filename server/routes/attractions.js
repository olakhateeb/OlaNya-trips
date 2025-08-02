const express = require("express");
const router = express.Router();
const attractionController = require("../controllers/attractionController");

// Get all attractions
router.get("/", attractionController.getAllAttractions);

// Get single attraction
router.get("/:id", attractionController.getAttractionById);

// Add new attraction
router.post("/", attractionController.addAttraction);

// Update attraction
router.put("/:id", attractionController.updateAttraction);

module.exports = router;
