const router = require("express").Router();
const requireAuth = require("../../middleware/logged_in");
const models = require("../../models/connector");
const { Op, fn, col } = require("sequelize");

/**
 * FIXES:
 * 1) registered_active was wrong sometimes (showing 0 left) because COUNT with JOIN can duplicate rows.
 *    ✅ We count DISTINCT Registration.seat_id
 * 2) We ensure the joined Seat belongs to the SAME cinema_id + hall_id as the registration row
 *    ✅ using Op.col matching (prevents seat_id collisions across halls/cinemas)
 * 3) We also filter registrations by hall_id set (extra safety)
 */

const ACTIVE_SEAT_STATUS = "active"; // change if your DB uses another value

// ✅ Ensure associations exist
if (models.Registration && models.Seat && !models.Registration.associations?.Seat) {
  models.Registration.belongsTo(models.Seat, {
    foreignKey: "seat_id",
    targetKey: "seat_id",
  });
}
if (models.Seat && models.Registration && !models.Seat.associations?.Registrations) {
  models.Seat.hasMany(models.Registration, {
    foreignKey: "seat_id",
    sourceKey: "seat_id",
    as: "Registrations",
  });
}

router.get("/retrieve_showtimes", requireAuth, async (req, res) => {
  const cinema_id = Number(req.query.cinema_id);

  if (!cinema_id || Number.isNaN(cinema_id)) {
    return res.status(400).json({
      ok: false,
      message: "Invalid or missing cinema_id. Example: /retrieve_showtimes?cinema_id=1",
    });
  }

  try {
    const cinema = await models.Cinema.findByPk(cinema_id);
    if (!cinema) {
      return res.status(404).json({
        ok: false,
        message: "Cinema not found (cinema_id is not correct).",
      });
    }

    const now = new Date();
    const from = new Date(now.getTime() + 5 * 60 * 1000);
    const to = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const showtimes = await models.Showtime.findAll({
      where: {
        cinema_id,
        start_time: { [Op.gte]: from, [Op.lt]: to },
      },
      attributes: [
        "showtime_id",
        "cinema_id",
        "hall_id",
        "movie_id",
        "start_time",
        "end_time",
      ],
      include: [
        {
          model: models.Movie,
          attributes: ["movie_id", "movie_name", "movie_genre", "duration_mins", "poster_url"],
        },
        {
          model: models.Cinema,
          attributes: ["cinema_id", "cinema_name", "location", "logo_url"],
        },
        {
          model: models.Hall,
          attributes: ["cinema_id", "hall_id", "type"],
        },
      ],
      order: [["start_time", "ASC"]],
    });

    if (!showtimes.length) {
      return res.status(200).json({
        ok: true,
        message: "No showtimes found in the next 48 hours",
        data: [],
      });
    }

    const showtimeIds = showtimes.map((s) => Number(s.showtime_id));
    const hallIds = [...new Set(showtimes.map((s) => Number(s.hall_id)))];

    // 1) Capacity per hall (ACTIVE seats only)
    const capacityRows = await models.Seat.findAll({
      where: {
        cinema_id,
        hall_id: { [Op.in]: hallIds },
        status: ACTIVE_SEAT_STATUS,
      },
      attributes: ["hall_id", [fn("COUNT", col("seat_id")), "capacity_active"]],
      group: ["hall_id"],
      raw: true,
    });

    const capacityByHall = new Map(
      capacityRows.map((r) => [Number(r.hall_id), Number(r.capacity_active)])
    );

    // 2) Seat statuses per hall (send active/inactive list to frontend)
    const seatStatusRows = await models.Seat.findAll({
      where: {
        cinema_id,
        hall_id: { [Op.in]: hallIds },
      },
      attributes: ["hall_id", "seat_id", "seat_row", "seat_col", "seat_type", "status"],
      order: [["hall_id", "ASC"], ["seat_row", "ASC"], ["seat_col", "ASC"]],
      raw: true,
    });

    const seatsByHall = new Map();
    for (const s of seatStatusRows) {
      const h = Number(s.hall_id);
      if (!seatsByHall.has(h)) seatsByHall.set(h, []);
      seatsByHall.get(h).push({
        seat_id: s.seat_id,
        seat_row: s.seat_row,
        seat_col: s.seat_col,
        seat_type: s.seat_type,
        status: s.status,
      });
    }

    // 3) Registered count per showtime (ONLY registrations whose seat is ACTIVE)
    // ✅ FIXED: COUNT DISTINCT + force Seat cinema_id/hall_id match to Registration row
    const regRows = await models.Registration.findAll({
      where: {
        cinema_id,
        hall_id: { [Op.in]: hallIds }, // safety
        showtime_id: { [Op.in]: showtimeIds },
      },
      attributes: [
        "showtime_id",
        [fn("COUNT", fn("DISTINCT", col("Registration.seat_id"))), "registered_active"],
      ],
      include: [
        {
          model: models.Seat,
          attributes: [],
          required: true,
          where: {
            status: ACTIVE_SEAT_STATUS,

            // ✅ ensure it's the same hall/cinema as the registration row
            cinema_id: { [Op.col]: "Registration.cinema_id" },
            hall_id: { [Op.col]: "Registration.hall_id" },
          },
        },
      ],
      group: ["showtime_id"],
      raw: true,
    });

    const registeredByShowtime = new Map(
      regRows.map((r) => [Number(r.showtime_id), Number(r.registered_active)])
    );

    // 4) Merge computed fields into showtime JSON
    const enriched = showtimes.map((st) => {
      const j = st.toJSON();
      const hallId = Number(j.hall_id);
      const showId = Number(j.showtime_id);

      const hall_capacity_active = capacityByHall.get(hallId) || 0;
      const registered_active = registeredByShowtime.get(showId) || 0;

      j.hall_capacity_active = hall_capacity_active;
      j.registered_active = registered_active;
      j.available_active = Math.max(hall_capacity_active - registered_active, 0);

      j.seat_statuses = seatsByHall.get(hallId) || [];

      return j;
    });

    return res.status(200).json({
      ok: true,
      message: "Showtimes retrieved successfully",
      data: enriched,
    });
  } catch (err) {
    console.error("retrieve_showtimes error name:", err.name);
    console.error("retrieve_showtimes error message:", err.message);
    console.error("sqlMessage:", err?.parent?.sqlMessage);
    console.error("sql:", err?.parent?.sql);

    return res.status(500).json({
      ok: false,
      message: "Database error while retrieving showtimes",
    });
  }
});

module.exports = router;
