const express = require("express");
const router = express.Router();
const requireAuth = require("../../middleware/logged_in");

const models = require("../../models/connector");

router.get("/models-test", requireAuth,async (req, res) => {
  try {
    const counts = {
      cinemas: await models.Cinema.count(),
      movies: await models.Movie.count(),
      halls: await models.Hall.count(),
      seats: await models.Seat.count(),
      showtimes: await models.Showtime.count(),
      registrations: await models.Registration.count(),
      contributors: await models.Contributor.count(),
      contributorsxmovies: await models.ContributorsXMovies.count(),
      users: await models.User.count(),
    };

    res.json(counts);
  } catch (err) {
    console.error("models-test error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
