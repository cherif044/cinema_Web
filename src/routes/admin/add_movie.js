const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const { Op } = require("sequelize");
const requireAuth = require("../../middleware/logged_in");

router.post("/admin/add_movie", requireAuth,admin_check, async (req, res) => {
  try {
    const { movie_name, movie_genre, duration_mins, poster_url } = req.body;

    if (!movie_name || !movie_genre || duration_mins === undefined || duration_mins === null || !poster_url) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields: movie_name, movie_genre, duration_mins, poster_url",
      });
    }

    const name = String(movie_name).trim();
    const genre = String(movie_genre).trim();
    const duration = Number(duration_mins);
    const poster = String(poster_url).trim();

    if (name.length < 1 || name.length > 100) {
      return res.status(400).json({ ok: false, message: "movie_name must be 1..100 chars" });
    }
    if (genre.length < 1 || genre.length > 20) {
      return res.status(400).json({ ok: false, message: "movie_genre must be 1..20 chars" });
    }
    if (!Number.isFinite(duration) || duration <= 0 || duration > 600) {
      return res.status(400).json({ ok: false, message: "duration_mins must be a valid number (1..600)" });
    }
    if (poster.length < 5 || poster.length > 255) {
      return res.status(400).json({ ok: false, message: "poster_url must be 5..255 chars" });
    }

    // ✅ unique movie_name
    const existing = await models.Movie.findOne({
      where: { movie_name: { [Op.eq]: name } },
      attributes: ["movie_id", "movie_name"],
    });

    if (existing) {
      return res.status(409).json({ ok: false, message: "Movie name already exists" });
    }

    const created = await models.Movie.create({
      movie_name: name,
      movie_genre: genre,
      duration_mins: duration,
      poster_url: poster,
    });

    return res.status(201).json({ ok: true, message: "Movie added successfully", data: created });
  } catch (err) {
    console.error("POST /admin/add_movie error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
