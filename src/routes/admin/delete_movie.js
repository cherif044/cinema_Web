const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const { Op } = require("sequelize");
const requireAuth = require("../../middleware/logged_in");

router.delete("/admin/delete_movie",requireAuth, admin_check, async (req, res) => {
  const t = await models.sequelize.transaction();
  try {
    const movie_id = Number(req.query.movie_id ?? req.body?.movie_id);
    const movie_name = String(req.query.movie_name ?? req.body?.movie_name ?? "").trim();

    if (!movie_id || Number.isNaN(movie_id)) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "Missing/invalid movie_id" });
    }

    const movie = await models.Movie.findByPk(movie_id, { transaction: t });
    if (!movie) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "Movie not found." });
    }

    // optional extra check if they send name too
    if (movie_name && String(movie.movie_name).trim() !== movie_name) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "movie_name does not match this movie_id" });
    }

    // Delete showtimes + their registrations
    const showtimes = await models.Showtime.findAll({
      where: { movie_id },
      attributes: ["showtime_id"],
      transaction: t,
      raw: true,
    });
    const showtimeIds = showtimes.map(s => s.showtime_id);

    const deletedRegs = showtimeIds.length
      ? await models.Registration.destroy({ where: { showtime_id: { [Op.in]: showtimeIds } }, transaction: t })
      : 0;

    const deletedShowtimes = await models.Showtime.destroy({ where: { movie_id }, transaction: t });

    // Delete contributor link rows
    let deletedLinks = 0;
    if (models.ContributorsXMovies) {
      deletedLinks = await models.ContributorsXMovies.destroy({ where: { movie_id }, transaction: t });
    }

    const deletedMovie = await models.Movie.destroy({ where: { movie_id }, transaction: t });

    await t.commit();
    return res.json({
      ok: true,
      message: "Movie deleted successfully (children deleted).",
      data: { movie_id, deletedRegs, deletedShowtimes, deletedLinks, deletedMovie },
    });
  } catch (err) {
    await t.rollback();
    console.error("DELETE /admin/delete_movie error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
