const router = require("express").Router();
const requireAuth = require("../../middleware/logged_in");
const models = require("../../models/connector");

router.get("/cancel", requireAuth, async (req, res) => {
  try {
    const registration_id = Number(req.query.registration_id);

    if (!registration_id || Number.isNaN(registration_id)) {
      return res.status(400).json({
        ok: false,
        message: "Missing or invalid registration_id. Example: /cancel?registration_id=123",
      });
    }

    // ✅ Find the registration first (PK in schema is booking_id)
    const reg = await models.Registration.findOne({
      where: { booking_id: registration_id },
      attributes: ["booking_id", "user_id", "showtime_id", "cinema_id", "hall_id", "seat_id", "created_at"],
      raw: true,
    });

    if (!reg) {
      return res.status(404).json({
        ok: false,
        message: "Registration not found.",
      });
    }

    // ✅ user can only cancel their own booking (recommended)
    const sessionUserId = Number(req.session?.userId ?? req.session?.user_id ?? req.user?.id);
    if (!sessionUserId || Number.isNaN(sessionUserId)) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }
    if (Number(reg.user_id) !== sessionUserId) {
      return res.status(403).json({
        ok: false,
        message: "Not allowed to cancel this registration.",
      });
    }

    // ✅ Load showtime to apply the time rule
    const showtime = await models.Showtime.findOne({
      where: {
        showtime_id: reg.showtime_id,
        cinema_id: reg.cinema_id,
        hall_id: reg.hall_id,
      },
      attributes: ["showtime_id", "start_time", "end_time"],
      raw: true,
    });

    if (!showtime) {
      return res.status(404).json({
        ok: false,
        message: "Showtime not found for this registration.",
      });
    }

    // ✅ Rule: must cancel at least 15 minutes before start_time
    const now = new Date();
    const start = new Date(showtime.start_time);

    if (Number.isNaN(start.getTime())) {
      return res.status(500).json({
        ok: false,
        message: "Invalid showtime start_time in database.",
      });
    }

    const cancelDeadline = new Date(start.getTime() - 15 * 60 * 1000); // start - 15 min

    if (now >= cancelDeadline) {
      return res.status(409).json({
        ok: false,
        message: "You cannot cancel now. Cancellation must be at least 15 minutes before showtime starts.",
        start_time: showtime.start_time,
      });
    }

    // ✅ Delete it
    const deletedCount = await models.Registration.destroy({
      where: {
        booking_id: reg.booking_id,
        user_id: sessionUserId, // extra safety
      },
    });

    if (deletedCount === 0) {
      return res.status(409).json({
        ok: false,
        message: "Registration could not be cancelled (already cancelled or changed).",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Registration cancelled successfully.",
      registration_id: reg.booking_id,
      showtime_id: reg.showtime_id,
      seat_id: reg.seat_id,
    });
  } catch (err) {
    console.error("GET /cancel error name:", err.name);
    console.error("GET /cancel error message:", err.message);
    console.error("sqlMessage:", err?.parent?.sqlMessage);
    console.error("sql:", err?.parent?.sql);

    return res.status(500).json({
      ok: false,
      message: "Database/server error while cancelling registration.",
    });
  }
});

module.exports = router;
