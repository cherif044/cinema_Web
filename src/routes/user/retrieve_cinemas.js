const router = require("express").Router();
const models = require("../../models/connector");
const { SEEDED_CINEMA } = require("../../data/nowPlaying");

const DEMO_CINEMAS = [
  {
    cinema_id: 1,
    ...SEEDED_CINEMA,
  },
];

router.get("/retrieve_cinemas",async (req, res) => {
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
