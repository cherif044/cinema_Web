const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const requireAuth = require("../../middleware/logged_in");

router.delete("/admin/delete_showtime",requireAuth, admin_check, async (req, res) => {
  const t = await models.sequelize.transaction();
  try {
    const showtime_id = Number(req.query.showtime_id ?? req.body?.showtime_id);

    if (!showtime_id || Number.isNaN(showtime_id)) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: "Missing/invalid showtime_id" });
    }

    const st = await models.Showtime.findByPk(showtime_id, { transaction: t });
    if (!st) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "Showtime not found." });
    }

    const deletedRegs = await models.Registration.destroy({
      where: { showtime_id },
      transaction: t,
    });

    const deletedShowtime = await models.Showtime.destroy({
      where: { showtime_id },
      transaction: t,
    });

    await t.commit();
    return res.json({
      ok: true,
      message: "Showtime deleted successfully (children deleted).",
      data: { showtime_id, deletedRegs, deletedShowtime },
    });
  } catch (err) {
    await t.rollback();
    console.error("DELETE /admin/delete_showtime error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
