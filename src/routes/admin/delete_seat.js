const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const requireAuth = require("../../middleware/logged_in");

router.delete("/admin/delete_seat",requireAuth, admin_check, async (req, res) => {
  const t = await models.sequelize.transaction();
  try {
    const cinema_id = Number(req.query.cinema_id ?? req.body?.cinema_id);
    const hall_id = Number(req.query.hall_id ?? req.body?.hall_id);
    const seat_id = Number(req.query.seat_id ?? req.body?.seat_id);

    if (
      !cinema_id || Number.isNaN(cinema_id) ||
      !hall_id || Number.isNaN(hall_id) ||
      !seat_id || Number.isNaN(seat_id)
    ) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "Missing/invalid cinema_id, hall_id, seat_id" });
    }

    const seat = await models.Seat.findOne({
      where: { cinema_id, hall_id, seat_id },
      transaction: t,
    });

    if (!seat) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "Seat not found." });
    }

    const deletedRegs = await models.Registration.destroy({
      where: { cinema_id, hall_id, seat_id },
      transaction: t,
    });

    const deletedSeat = await models.Seat.destroy({
      where: { cinema_id, hall_id, seat_id },
      transaction: t,
    });

    await t.commit();
    return res.json({
      ok: true,
      message: "Seat deleted successfully (and related registrations).",
      data: { cinema_id, hall_id, seat_id, deletedRegs, deletedSeat },
    });
  } catch (err) {
    await t.rollback();
    console.error("DELETE /admin/delete_seat error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
