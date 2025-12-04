const express = require("express");
const router = express.Router();

// POST /api/gigs
router.post("/", (req, res) => {
  const { title, description, paymentAmount, requiredBadge, employer } = req.body;
  
});

module.exports = router;