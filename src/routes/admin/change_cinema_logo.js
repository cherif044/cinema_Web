const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const requireAuth = require("../../middleware/logged_in");

router.post("/admin/change_cinema_logo",requireAuth, admin_check, async (req, res) => {
  try {
    const cinema_id = Number(req.body.cinema_id);
    const logo_url = String(req.body.logo_url || "").trim();

    if (!cinema_id || Number.isNaN(cinema_id) || !logo_url) {
      return res.status(400).json({
        ok: false,
        message: "Missing/invalid fields: cinema_id, logo_url",
      });
    }

    const cinema = await models.Cinema.findByPk(cinema_id);
    if (!cinema) return res.status(404).json({ ok: false, message: "Cinema not found" });

    cinema.logo_url = logo_url;
    await cinema.save();

    return res.json({ ok: true, message: "Cinema logo updated", data: { cinema_id, logo_url } });
  } catch (err) {
    console.error("POST /admin/change_cinema_logo error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
