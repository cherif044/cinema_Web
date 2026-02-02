const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const requireAuth = require("../../middleware/logged_in");

router.delete("/admin/delete_regis",requireAuth, admin_check, async (req, res) => {
  try {
    const booking_id = Number(req.query.booking_id ?? req.body?.booking_id);

    if (!booking_id || Number.isNaN(booking_id)) {
      return res.status(400).json({ ok: false, message: "Missing/invalid booking_id" });
    }

    const reg = await models.Registration.findByPk(booking_id);
    if (!reg) return res.status(404).json({ ok: false, message: "Registration not found." });

    const deleted = await models.Registration.destroy({ where: { booking_id } });

    return res.json({
      ok: true,
      message: "Registration deleted successfully.",
      data: { booking_id, deleted },
    });
  } catch (err) {
    console.error("DELETE /admin/delete_regis error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
