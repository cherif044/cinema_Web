const router = require("express").Router();
const path = require("path");
const requireAuth = require("../../middleware/logged_in");
const models = require("../../models/connector");

const DEMO_CINEMAS = [
  {
    cinema_id: 1,
    cinema_name: "Chinema Downtown",
    location: "Downtown",
    logo_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
    location_url: "https://maps.google.com/?q=Downtown",
  },
  {
    cinema_id: 2,
    cinema_name: "Chinema Mall",
    location: "City Mall",
    logo_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    location_url: "https://maps.google.com/?q=City+Mall",
  },
  {
    cinema_id: 3,
    cinema_name: "Chinema Plaza",
    location: "Plaza District",
    logo_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
    location_url: "https://maps.google.com/?q=Plaza+District",
  },
];

router.get("/retrieve_cinemas",requireAuth,async (req, res) => {
  try {
    // get all cinemas
    const cinemas = await models.Cinema.findAll();

    if (!cinemas.length) {
      return res.json({
        ok: true,
        demo: true,
        data: DEMO_CINEMAS,
      });
    }

    res.json({
      ok: true,
      data: cinemas
    });
  } catch (err) {
    console.error("retrieve_cinemas error:", err);
    res.status(500).json({
      ok: true,
      demo: true,
      message: "Using demo cinemas because the database is unavailable",
      data: DEMO_CINEMAS
    });
  }
});

module.exports = router;
