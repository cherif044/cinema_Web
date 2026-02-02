const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const requireAuth = require("../../middleware/logged_in");

const ALLOWED_HALL_TYPES = new Set(["standard", "gold", "premium"]);
const ALLOWED_SEAT_TYPES = new Set(["normal", "vip"]);

router.patch("/admin/edit_pricing", requireAuth,admin_check, async (req, res) => {
  try {
    if (!models.Pricing) {
      return res.status(500).json({
        ok: false,
        message: "Pricing model not found in connector (models.Pricing). Add it first.",
      });
    }

    const cinema_id = Number(req.body.cinema_id);
    const hall_type = String(req.body.hall_type || "").trim().toLowerCase();
    const seat_type = String(req.body.seat_type || "").trim().toLowerCase();
    const price = Number(req.body.price);

    if (!cinema_id || Number.isNaN(cinema_id) || !hall_type || !seat_type || !Number.isFinite(price)) {
      return res.status(400).json({
        ok: false,
        message: "Missing/invalid fields: cinema_id, hall_type, seat_type, price",
      });
    }

    if (!ALLOWED_HALL_TYPES.has(hall_type)) {
      return res.status(400).json({ ok: false, message: "hall_type must be standard/gold/premium" });
    }
    if (!ALLOWED_SEAT_TYPES.has(seat_type)) {
      return res.status(400).json({ ok: false, message: "seat_type must be normal/vip" });
    }
    if (price <= 0 || price > 999999) {
      return res.status(400).json({ ok: false, message: "price out of range" });
    }

    // ensure cinema exists
    const cinema = await models.Cinema.findByPk(cinema_id, { attributes: ["cinema_id"] });
    if (!cinema) return res.status(404).json({ ok: false, message: "Cinema not found" });

    const row = await models.Pricing.findOne({
      where: { cinema_id, hall_type, seat_type },
    });

    if (!row) {
      return res.status(404).json({
        ok: false,
        message: "Pricing row not found for this cinema_id + hall_type + seat_type",
      });
    }

    row.price = price;
    await row.save();

    return res.json({
      ok: true,
      message: "Pricing updated successfully",
      data: row,
    });
  } catch (err) {
    console.error("PATCH /admin/edit_pricing error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
