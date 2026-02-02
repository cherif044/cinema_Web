const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const { Op } = require("sequelize");
const requireAuth = require("../../middleware/logged_in");

router.post("/admin/add_cinema", requireAuth,admin_check, async (req, res) => {
  try {
    const { cinema_name, location, logo_url } = req.body;

    if (!cinema_name || !location || !logo_url) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields: cinema_name, location, logo_url",
      });
    }

    const name = String(cinema_name).trim();
    const loc = String(location).trim();
    const logo = String(logo_url).trim();

    if (name.length < 2 || name.length > 28) {
      return res.status(400).json({ ok: false, message: "cinema_name length must be 2..28" });
    }
    if (loc.length < 2 || loc.length > 40) {
      return res.status(400).json({ ok: false, message: "location length must be 2..40" });
    }
    if (logo.length < 5 || logo.length > 255) {
      return res.status(400).json({ ok: false, message: "logo_url length must be 5..255" });
    }

    // ✅ unique cinema_name (case-insensitive-ish)
    const existing = await models.Cinema.findOne({
      where: { cinema_name: { [Op.eq]: name } },
      attributes: ["cinema_id", "cinema_name"],
    });

    if (existing) {
      return res.status(409).json({
        ok: false,
        message: "Cinema name already exists",
      });
    }

    const created = await models.Cinema.create({
      cinema_name: name,
      location: loc,
      logo_url: logo,
    });

    return res.status(201).json({
      ok: true,
      message: "Cinema added successfully",
      data: created,
    });
  } catch (err) {
    console.error("POST /admin/add_cinema error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
