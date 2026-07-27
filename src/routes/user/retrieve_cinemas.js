const router = require("express").Router();
const models = require("../../models/connector");
const { SEEDED_CINEMA } = require("../../data/nowPlaying");
const { ensureNowPlayingSchedule } = require("../../services/nowPlayingSeed");

const DEMO_CINEMAS = [
  {
    cinema_id: 1,
    ...SEEDED_CINEMA,
  },
];

router.get("/retrieve_cinemas",async (req, res) => {
  try {
    await ensureNowPlayingSchedule();

    const cinema = await models.Cinema.findOne({
      where: { cinema_name: SEEDED_CINEMA.cinema_name },
    });

    if (!cinema) {
      return res.json({
        ok: true,
        demo: true,
        data: DEMO_CINEMAS,
      });
    }

    res.json({
      ok: true,
      data: [cinema]
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
