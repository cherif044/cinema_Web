const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const { Op } = require("sequelize");
const requireAuth = require("../../middleware/logged_in");

router.post("/admin/change_cinema_name",requireAuth, admin_check, async (req, res) => {
  try {
    const cinema_id = Number(req.body.cinema_id);
    const new_name = String(req.body.new_name || "").trim();

    if (!cinema_id || Number.isNaN(cinema_id) || !new_name) {
      return res.status(400).json({
        ok: false,
        message: "Missing/invalid fields: cinema_id, new_name",
      });
    }

    if (new_name.length < 2 || new_name.length > 28) {
      return res.status(400).json({ ok: false, message: "new_name length must be 2..28" });
    }

    const cinema = await models.Cinema.findByPk(cinema_id);
    if (!cinema) return res.status(404).json({ ok: false, message: "Cinema not found" });

    // ✅ unique check (excluding current cinema)
    const exists = await models.Cinema.findOne({
      where: {
        cinema_name: { [Op.eq]: new_name },
        cinema_id: { [Op.ne]: cinema_id },
      },
      attributes: ["cinema_id", "cinema_name"],
    });

    if (exists) {
      return res.status(409).json({ ok: false, message: "Cinema name already used" });
    }

    cinema.cinema_name = new_name;
    await cinema.save();

    return res.json({ ok: true, message: "Cinema name updated", data: { cinema_id, cinema_name: new_name } });
  } catch (err) {
    console.error("POST /admin/change_cinema_name error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
