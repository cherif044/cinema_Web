const router = require("express").Router();
const path = require("path");
const requireAuth = require("../../middleware/logged_in");
const models = require("../../models/connector");

router.get("/retrieve_cinemas",requireAuth,async (req, res) => {
  try {
    // get all cinemas
    const cinemas = await models.Cinema.findAll();

    res.json({
      ok: true,
      data: cinemas
    });
  } catch (err) {
    console.error("retrieve_cinemas error:", err);
    res.status(500).json({
      ok: false,
      message: "Server error"
    });
  }
});

module.exports = router;
