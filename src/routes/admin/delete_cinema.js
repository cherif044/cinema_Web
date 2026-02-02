const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const requireAuth = require("../../middleware/logged_in");

router.delete("/admin/delete_cinema",requireAuth, admin_check, async (req, res) => {
  const t = await models.sequelize.transaction();
  try {
    const cinema_id = Number(req.query.cinema_id ?? req.body?.cinema_id);

    if (!cinema_id || Number.isNaN(cinema_id)) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "Missing/invalid cinema_id" });
    }

    const cinema = await models.Cinema.findByPk(cinema_id, { transaction: t });
    if (!cinema) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "Cinema not found." });
    }

    // children order: registrations -> showtimes -> seats -> halls -> pricing -> cinema
    const deletedRegs = await models.Registration.destroy({ where: { cinema_id }, transaction: t });
    const deletedShowtimes = await models.Showtime.destroy({ where: { cinema_id }, transaction: t });
    const deletedSeats = await models.Seat.destroy({ where: { cinema_id }, transaction: t });
    const deletedHalls = await models.Hall.destroy({ where: { cinema_id }, transaction: t });

    // Pricing table if exists (name might differ)
    let deletedPricing = 0;
    if (models.Pricing) {
      deletedPricing = await models.Pricing.destroy({ where: { cinema_id }, transaction: t });
    }

    const deletedCinema = await models.Cinema.destroy({ where: { cinema_id }, transaction: t });

    await t.commit();
    return res.json({
      ok: true,
      message: "Cinema deleted successfully (children deleted).",
      data: { cinema_id, deletedRegs, deletedShowtimes, deletedSeats, deletedHalls, deletedPricing, deletedCinema },
    });
  } catch (err) {
    await t.rollback();
    console.error("DELETE /admin/delete_cinema error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
