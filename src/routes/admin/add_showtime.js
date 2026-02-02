const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const { Op } = require("sequelize");
const requireAuth = require("../../middleware/logged_in");

router.post("/admin/add_showtime",requireAuth, admin_check, async (req, res) => {
  try {
    const cinema_id = Number(req.body.cinema_id);
    const hall_id = Number(req.body.hall_id);
    const movie_id = Number(req.body.movie_id);
    const start_time = req.body.start_time;
    const end_time = req.body.end_time;

    if (
      !cinema_id || Number.isNaN(cinema_id) ||
      !hall_id || Number.isNaN(hall_id) ||
      !movie_id || Number.isNaN(movie_id) ||
      !start_time || !end_time
    ) {
      return res.status(400).json({
        ok: false,
        message: "Missing/invalid fields: cinema_id, hall_id, movie_id, start_time, end_time",
      });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ ok: false, message: "start_time/end_time must be valid datetime" });
    }
    if (end <= start) {
      return res.status(400).json({ ok: false, message: "end_time must be after start_time" });
    }

    // ✅ FK checks
    const cinema = await models.Cinema.findByPk(cinema_id, { attributes: ["cinema_id"] });
    if (!cinema) return res.status(404).json({ ok: false, message: "Cinema not found" });

    const hall = await models.Hall.findOne({
      where: { cinema_id, hall_id },
      attributes: ["cinema_id", "hall_id"],
    });
    if (!hall) return res.status(404).json({ ok: false, message: "Hall not found for this cinema" });

    const movie = await models.Movie.findByPk(movie_id, { attributes: ["movie_id"] });
    if (!movie) return res.status(404).json({ ok: false, message: "Movie not found" });

    // ✅ Overlap check (same cinema + hall)
    // conflict if existing.start < newEnd AND existing.end > newStart
    const conflict = await models.Showtime.findOne({
      where: {
        cinema_id,
        hall_id,
        [Op.and]: [
          { start_time: { [Op.lt]: end } },
          { end_time: { [Op.gt]: start } },
        ],
      },
      attributes: ["showtime_id", "start_time", "end_time"],
    });

    if (conflict) {
      return res.status(409).json({
        ok: false,
        message: "Hall is occupied in this time window (showtime overlap)",
        conflict,
      });
    }

    const created = await models.Showtime.create({
      cinema_id,
      hall_id,
      movie_id,
      start_time: start,
      end_time: end,
      // total_spots/registered/unregistered if your table needs them:
      // total_spots: req.body.total_spots ?? null
    });

    return res.status(201).json({ ok: true, message: "Showtime added successfully", data: created });
  } catch (err) {
    console.error("POST /admin/add_showtime error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
