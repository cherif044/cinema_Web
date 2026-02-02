const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const { Op } = require("sequelize");
const requireAuth = require("../../middleware/logged_in");

const ALLOWED_HALL_TYPES = new Set(["standard", "gold", "premium"]);

router.post("/admin/add_hall", requireAuth,admin_check, async (req, res) => {
  try {
    const cinema_id = Number(req.body.cinema_id);
    const hall_id = Number(req.body.hall_id);
    const typeRaw = req.body.type;

    if (!cinema_id || Number.isNaN(cinema_id) || !hall_id || Number.isNaN(hall_id) || !typeRaw) {
      return res.status(400).json({
        ok: false,
        message: "Missing/invalid required fields: cinema_id, hall_id, type",
      });
    }

    const type = String(typeRaw).trim().toLowerCase();
    if (!ALLOWED_HALL_TYPES.has(type)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid hall type. Allowed: standard, gold, premium",
      });
    }

    const cinema = await models.Cinema.findByPk(cinema_id, { attributes: ["cinema_id"] });
    if (!cinema) {
      return res.status(404).json({ ok: false, message: "Cinema not found" });
    }

    // ✅ Hall composite uniqueness: (cinema_id, hall_id)
    const existsHall = await models.Hall.findOne({
      where: { cinema_id, hall_id },
      attributes: ["cinema_id", "hall_id"],
    });

    if (existsHall) {
      return res.status(409).json({
        ok: false,
        message: "Hall already exists for this cinema (cinema_id + hall_id must be unique)",
      });
    }

    const created = await models.Hall.create({
      cinema_id,
      hall_id,
      type,
      // if your table has capacity/ticket_price with allowNull true, you can omit them
    });

    return res.status(201).json({
      ok: true,
      message: "Hall added successfully",
      data: created,
    });
  } catch (err) {
    console.error("POST /admin/add_hall error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
