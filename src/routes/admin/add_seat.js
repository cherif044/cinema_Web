const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const requireAuth = require("../../middleware/logged_in");

const ALLOWED_SEAT_TYPES = new Set(["normal", "vip"]);
const ALLOWED_STATUS = new Set(["active", "inactive"]);

router.post("/admin/add_seat", requireAuth,admin_check, async (req, res) => {
  try {
    const cinema_id = Number(req.body.cinema_id);
    const hall_id = Number(req.body.hall_id);
    const seat_id = Number(req.body.seat_id);
    const seat_row = Number(req.body.seat_row);
    const seat_col = Number(req.body.seat_col);
    const seat_type = String(req.body.seat_type || "").trim().toLowerCase();
    const status = String(req.body.status || "").trim().toLowerCase();

    if (
      !cinema_id || Number.isNaN(cinema_id) ||
      !hall_id || Number.isNaN(hall_id) ||
      !seat_id || Number.isNaN(seat_id) ||
      !seat_row || Number.isNaN(seat_row) ||
      !seat_col || Number.isNaN(seat_col) ||
      !seat_type ||
      !status
    ) {
      return res.status(400).json({
        ok: false,
        message: "Missing/invalid fields: cinema_id, hall_id, seat_id, seat_row, seat_col, seat_type, status",
      });
    }

    if (!ALLOWED_SEAT_TYPES.has(seat_type)) {
      return res.status(400).json({ ok: false, message: "seat_type must be normal or vip" });
    }
    if (!ALLOWED_STATUS.has(status)) {
      return res.status(400).json({ ok: false, message: "status must be active or inactive" });
    }

    const cinema = await models.Cinema.findByPk(cinema_id, { attributes: ["cinema_id"] });
    if (!cinema) return res.status(404).json({ ok: false, message: "Cinema not found" });

    const hall = await models.Hall.findOne({
      where: { cinema_id, hall_id },
      attributes: ["cinema_id", "hall_id"],
    });
    if (!hall) return res.status(404).json({ ok: false, message: "Hall not found for this cinema" });

    // ✅ Ensure unique seat_id inside (cinema,hall) OR unique seat position
    const existsSeat = await models.Seat.findOne({
      where: { cinema_id, hall_id, seat_id },
      attributes: ["seat_id"],
    });
    if (existsSeat) {
      return res.status(409).json({ ok: false, message: "Seat already exists (cinema_id+hall_id+seat_id)" });
    }

    // optional: prevent two seats same row/col
    const posTaken = await models.Seat.findOne({
      where: { cinema_id, hall_id, seat_row, seat_col },
      attributes: ["seat_id"],
    });
    if (posTaken) {
      return res.status(409).json({ ok: false, message: "Seat position already used (seat_row+seat_col)" });
    }

    const created = await models.Seat.create({
      cinema_id,
      hall_id,
      seat_id,
      seat_row,
      seat_col,
      seat_type,
      status,
    });

    return res.status(201).json({ ok: true, message: "Seat added successfully", data: created });
  } catch (err) {
    console.error("POST /admin/add_seat error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
