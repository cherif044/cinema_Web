const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const models = require("../../models/connector");
const requireAuth = require("../../middleware/logged_in");

router.post("/admin/add_regis",requireAuth, admin_check, async (req, res) => {
  try {
    const user_id = Number(req.body.user_id);
    const showtime_id = Number(req.body.showtime_id);
    const cinema_id = Number(req.body.cinema_id);
    const hall_id = Number(req.body.hall_id);
    const seat_id = Number(req.body.seat_id);

    if (
      !user_id || Number.isNaN(user_id) ||
      !showtime_id || Number.isNaN(showtime_id) ||
      !cinema_id || Number.isNaN(cinema_id) ||
      !hall_id || Number.isNaN(hall_id) ||
      !seat_id || Number.isNaN(seat_id)
    ) {
      return res.status(400).json({
        ok: false,
        message: "Missing/invalid fields: user_id, showtime_id, cinema_id, hall_id, seat_id",
      });
    }

    // ✅ User exists
    const user = await models.User.findByPk(user_id, { attributes: ["id"] });
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    // ✅ Showtime exists and matches cinema/hall
    const showtime = await models.Showtime.findByPk(showtime_id, {
      attributes: ["showtime_id", "cinema_id", "hall_id", "start_time", "end_time"],
    });
    if (!showtime) return res.status(404).json({ ok: false, message: "Showtime not found" });

    if (Number(showtime.cinema_id) !== cinema_id || Number(showtime.hall_id) !== hall_id) {
      return res.status(400).json({
        ok: false,
        message: "showtime_id does not belong to the given cinema_id/hall_id",
      });
    }

    // ✅ Cinema exists
    const cinema = await models.Cinema.findByPk(cinema_id, { attributes: ["cinema_id"] });
    if (!cinema) return res.status(404).json({ ok: false, message: "Cinema not found" });

    // ✅ Hall exists for that cinema
    const hall = await models.Hall.findOne({
      where: { cinema_id, hall_id },
      attributes: ["cinema_id", "hall_id"],
    });
    if (!hall) return res.status(404).json({ ok: false, message: "Hall not found for this cinema" });

    // ✅ Seat exists in same cinema+hall
    const seat = await models.Seat.findOne({
      where: { cinema_id, hall_id, seat_id },
      attributes: ["seat_id", "status"],
    });
    if (!seat) return res.status(404).json({ ok: false, message: "Seat not found in this cinema/hall" });

    if (String(seat.status).toLowerCase() !== "active") {
      return res.status(409).json({ ok: false, message: "Seat is inactive and cannot be registered" });
    }

    // ✅ Prevent duplicate booking for same showtime seat
    const already = await models.Registration.findOne({
      where: { showtime_id, cinema_id, hall_id, seat_id },
      attributes: ["booking_id"],
    });
    if (already) {
      return res.status(409).json({ ok: false, message: "Seat already registered for this showtime" });
    }

    const created = await models.Registration.create({
      user_id,
      showtime_id,
      cinema_id,
      hall_id,
      seat_id,
      // created_at auto by DB if you have defaults
    });

    return res.status(201).json({ ok: true, message: "Registration added successfully", data: created });
  } catch (err) {
    console.error("POST /admin/add_regis error:", err);
    return res.status(500).json({ ok: false, message: "Server/database error" });
  }
});

module.exports = router;
