const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const requireAuth = require("../../middleware/logged_in");

router.delete("/admin/delete_hall",requireAuth, admin_check, async (req, res) => {
  const t = await models.sequelize.transaction();
  try {
    const cinema_id = Number(req.query.cinema_id ?? req.body?.cinema_id);
    const hall_id = Number(req.query.hall_id ?? req.body?.hall_id);

    if (!cinema_id || Number.isNaN(cinema_id) || !hall_id || Number.isNaN(hall_id)) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "Missing/invalid cinema_id or hall_id" });
    }

    const hall = await models.Hall.findOne({
      where: { cinema_id, hall_id },
      transaction: t,
    });

    if (!hall) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "Hall not found for this cinema." });
    }

    const deletedRegs = await models.Registration.destroy({ where: { cinema_id, hall_id }, transaction: t });
    const deletedShowtimes = await models.Showtime.destroy({ where: { cinema_id, hall_id }, transaction: t });
    const deletedSeats = await models.Seat.destroy({ where: { cinema_id, hall_id }, transaction: t });

    // Pricing rows for this hall_type? (Pricing is by hall_type not hall_id, so not deleted here unless you want)
    const deletedHall = await models.Hall.destroy({ where: { cinema_id, hall_id }, transaction: t });

    await t.commit();
    return res.json({
      ok: true,
      message: "Hall deleted successfully (children deleted).",
      data: { cinema_id, hall_id, deletedRegs, deletedShowtimes, deletedSeats, deletedHall },
    });
  } catch (err) {
    await t.rollback();
    console.error("DELETE /admin/delete_hall error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
