const router = require("express").Router();
const requireAuth = require("../../middleware/logged_in");
const models = require("../../models/connector");
const { Op, fn, col } = require("sequelize");

const DEMO_POSTERS = {
  inception:
    "https://en.wikipedia.org/wiki/Special:FilePath/Inception%20(2010)%20theatrical%20poster.jpg",
  interstellar:
    "https://en.wikipedia.org/wiki/Special:FilePath/Interstellar%20film%20poster.jpg",
  darkKnight:
    "https://en.wikipedia.org/wiki/Special:FilePath/The%20Dark%20Knight%20(2008%20film).jpg",
  dune:
    "https://en.wikipedia.org/wiki/Special:FilePath/Dune%20(2021%20film).jpg",
};

const DEMO_MOVIES = [
  {
    movie_id: 901,
    movie_name: "Inception",
    movie_genre: "Sci-Fi",
    duration_mins: 148,
    poster_url: DEMO_POSTERS.inception,
  },
  {
    movie_id: 902,
    movie_name: "Interstellar",
    movie_genre: "Sci-Fi",
    duration_mins: 169,
    poster_url: DEMO_POSTERS.interstellar,
  },
  {
    movie_id: 903,
    movie_name: "The Dark Knight",
    movie_genre: "Action",
    duration_mins: 152,
    poster_url: DEMO_POSTERS.darkKnight,
  },
  {
    movie_id: 904,
    movie_name: "Dune",
    movie_genre: "Adventure",
    duration_mins: 155,
    poster_url: DEMO_POSTERS.dune,
  },
];

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function createDemoShowtimes(cinema) {
  const baseDay = new Date();
  baseDay.setHours(11, 30, 0, 0);

  const hallProfiles = [
    { hall_id: 1, type: "premium", capacity: 72, seatsLeft: 18 },
    { hall_id: 2, type: "gold", capacity: 54, seatsLeft: 21 },
    { hall_id: 3, type: "standard", capacity: 88, seatsLeft: 34 },
  ];

  const schedule = [
    { movie: DEMO_MOVIES[0], dayOffset: 0, startHour: 12, startMinute: 15, hall: hallProfiles[0] },
    { movie: DEMO_MOVIES[1], dayOffset: 1, startHour: 15, startMinute: 40, hall: hallProfiles[1] },
    { movie: DEMO_MOVIES[2], dayOffset: 2, startHour: 13, startMinute: 0, hall: hallProfiles[2] },
    { movie: DEMO_MOVIES[3], dayOffset: 2, startHour: 18, startMinute: 20, hall: hallProfiles[0] },
    { movie: DEMO_MOVIES[0], dayOffset: 1, startHour: 11, startMinute: 50, hall: hallProfiles[1] },
    { movie: DEMO_MOVIES[1], dayOffset: 2, startHour: 16, startMinute: 10, hall: hallProfiles[2] },
    { movie: DEMO_MOVIES[2], dayOffset: 2, startHour: 19, startMinute: 30, hall: hallProfiles[0] },
  ];

  return schedule.map((slot, index) => {
    const dayStart = new Date(baseDay);
    dayStart.setDate(dayStart.getDate() + slot.dayOffset);

    const start = new Date(dayStart);
    start.setHours(slot.startHour, slot.startMinute, 0, 0);

    const end = addMinutes(start, slot.movie.duration_mins);

    return {
      showtime_id: 0,
      cinema_id: cinema.cinema_id,
      hall_id: slot.hall.hall_id,
      movie_id: slot.movie.movie_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      hall_capacity_active: slot.hall.capacity,
      registered_active: Math.min(slot.hall.capacity - 8, slot.hall.capacity),
      available_active: slot.hall.seatsLeft,
      seat_statuses: [],
      Movie: {
        ...slot.movie,
      },
      Cinema: {
        cinema_id: cinema.cinema_id,
        cinema_name: cinema.cinema_name,
        location: cinema.location,
        logo_url: cinema.logo_url,
      },
      Hall: {
        cinema_id: cinema.cinema_id,
        hall_id: slot.hall.hall_id,
        type: slot.hall.type,
      },
      is_demo: true,
      demo_index: index + 1,
    };
  });
}

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
      const demoShowtimes = createDemoShowtimes({
        cinema_id,
        cinema_name: `Demo Cinema ${cinema_id}`,
        location: "Demo location",
        logo_url: null,
      });

      return res.status(200).json({
        ok: true,
        demo: true,
        message: "Cinema not found in the database. Showing a 3-day demo schedule.",
        data: demoShowtimes,
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
      const demoShowtimes = createDemoShowtimes(cinema);
      return res.status(200).json({
        ok: true,
        message: "No live showtimes found. Showing a 3-day demo schedule.",
        demo: true,
        data: demoShowtimes,
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

    const demoCinema = {
      cinema_id,
      cinema_name: "Demo Cinema",
      location: "Demo location",
      logo_url: null,
    };

    return res.status(500).json({
      ok: true,
      demo: true,
      message: "Database error while retrieving showtimes. Showing a 3-day demo schedule.",
      data: createDemoShowtimes(demoCinema),
    });
  }
});

module.exports = router;
