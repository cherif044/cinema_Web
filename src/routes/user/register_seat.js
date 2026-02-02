const router = require("express").Router();
const requireAuth = require("../../middleware/logged_in");
const models = require("../../models/connector");

router.post("/register_seat", requireAuth, async (req, res) => {
  // Helper so every exit is JSON (your frontend expects JSON)
  const fail = (status, error, extra = {}) =>
    res.status(status).json({ ok: false, error, ...extra });

  try {
    // ✅ prove session is present
    console.log("[register_seat] session:", req.session);

    // Accept from body (recommended). Fallback to query.
    const showtime_id = Number(req.body.showtime_id ?? req.query.showtime_id);
    const cinema_id = Number(req.body.cinema_id ?? req.query.cinema_id);
    const hall_id = Number(req.body.hall_id ?? req.query.hall_id);
    const seat_id = Number(req.body.seat_id ?? req.query.seat_id);

    // ✅ user id from session (yours is userId)
    const user_id = Number(req.session?.userId ?? req.user?.id);

    // If requireAuth redirected before, this handler may not run.
    // But if it runs and user_id is missing -> return JSON 401
    if (!user_id || Number.isNaN(user_id)) {
      return fail(401, "Not authenticated");
    }

    // Validate inputs (this is a VERY common cause if frontend sends NaN)
    const bad = (v) => !Number.isFinite(v) || v <= 0;

    if (bad(showtime_id)) return fail(400, "Missing/invalid showtime_id", { showtime_id });
    if (bad(seat_id)) return fail(400, "Missing/invalid seat_id", { seat_id });

    // These are OPTIONAL now (in case your frontend sends them wrong)
    // We’ll verify against showtime anyway.
    if (bad(cinema_id)) console.log("[register_seat] cinema_id missing/invalid from client:", cinema_id);
    if (bad(hall_id)) console.log("[register_seat] hall_id missing/invalid from client:", hall_id);

    const { Showtime, Seat, Registration, sequelize } = models;

    if (!Showtime || !Seat || !Registration || !sequelize) {
      return fail(500, "Models not loaded correctly in connector");
    }

    const result = await sequelize.transaction(async (t) => {
      // 1) Get showtime (don’t hardcode attributes; schema/model mismatches break you)
      const st = await Showtime.findByPk(showtime_id, { transaction: t, raw: true });
      if (!st) return { status: 404, body: { ok: false, error: "Showtime not found" } };

      const stCinemaId = Number(st.cinema_id ?? st.cinemaId);
      const stHallId = Number(st.hall_id ?? st.hallId);

      if (!Number.isFinite(stCinemaId) || !Number.isFinite(stHallId)) {
        return {
          status: 500,
          body: { ok: false, error: "Showtime is missing cinema_id/hall_id in DB/model" },
        };
      }

      // If client sends cinema/hall, verify it matches showtime (prevents tampering)
      if (Number.isFinite(cinema_id) && cinema_id > 0 && cinema_id !== stCinemaId) {
        return {
          status: 400,
          body: { ok: false, error: "cinema_id does not match this showtime" },
        };
      }
      if (Number.isFinite(hall_id) && hall_id > 0 && hall_id !== stHallId) {
        return {
          status: 400,
          body: { ok: false, error: "hall_id does not match this showtime" },
        };
      }

      // 2) Verify seat exists in that hall
      const seat = await Seat.findOne({
        where: { cinema_id: stCinemaId, hall_id: stHallId, seat_id },
        transaction: t,
        raw: true,
      });

      if (!seat) {
        return {
          status: 404,
          body: { ok: false, error: "Seat not found in this hall" },
        };
      }

      // 3) Insert booking
      // NOTE: This assumes your Registration table has these columns.
      // If you dropped cinema_id/hall_id from registrations, this will throw a clear sqlMessage now.
      try {
        const reg = await Registration.create(
          {
            showtime_id,
            cinema_id: stCinemaId,
            hall_id: stHallId,
            seat_id,
            user_id,
          },
          { transaction: t }
        );

        return {
          status: 201,
          body: {
            ok: true,
            message: "Seat booked",
            // don't assume booking_id exists
            registration_id: reg.booking_id ?? reg.registration_id ?? reg.id ?? null,
          },
        };
      } catch (err) {
        // Duplicate booking (seat already taken)
        if (err?.name === "SequelizeUniqueConstraintError") {
          return {
            status: 409,
            body: { ok: false, error: "Seat already booked for this showtime" },
          };
        }
        throw err;
      }
    });

    return res.status(result.status).json(result.body);
  } catch (err) {
    // ✅ this is the MOST important part: show real MySQL error
    console.error("POST /register_seat error name:", err?.name);
    console.error("POST /register_seat sqlMessage:", err?.parent?.sqlMessage);
    console.error("POST /register_seat sql:", err?.parent?.sql);
    console.error("POST /register_seat full:", err);

    return res.status(500).json({
      ok: false,
      error: err?.parent?.sqlMessage || err?.message || "Server error",
    });
  }
});

module.exports = router;
