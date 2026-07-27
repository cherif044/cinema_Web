const router = require("express").Router();
const { Op } = require("sequelize");
const admin_check = require("../../middleware/admin_check");
const requireAuth = require("../../middleware/logged_in");
const models = require("../../models/connector");
const {
  CURRENT_MOVIES,
  HALLS,
  SEEDED_CINEMA,
  makeDailySchedule,
} = require("../../data/nowPlaying");

const PRICES = {
  standard: { normal: 120, vip: 170 },
  gold: { normal: 170, vip: 240 },
  premium: { normal: 220, vip: 320 },
};

async function updateOrCreate(Model, where, values, transaction) {
  const row = await Model.findOne({ where, transaction });
  if (row) {
    await row.update(values, { transaction });
    return { row, created: false };
  }

  const created = await Model.create({ ...where, ...values }, { transaction });
  return { row: created, created: true };
}

async function replaceNowPlayingSchedule() {
  return models.sequelize.transaction(async (transaction) => {
    const now = new Date();
    const from = new Date(now.getTime() - 5 * 60 * 1000);

    const futureShowtimes = await models.Showtime.findAll({
      where: { start_time: { [Op.gte]: from } },
      attributes: ["showtime_id"],
      raw: true,
      transaction,
    });
    const futureShowtimeIds = futureShowtimes.map((st) => Number(st.showtime_id));

    let deletedRegistrations = 0;
    let deletedShowtimes = 0;

    if (futureShowtimeIds.length) {
      deletedRegistrations = await models.Registration.destroy({
        where: { showtime_id: { [Op.in]: futureShowtimeIds } },
        transaction,
      });

      deletedShowtimes = await models.Showtime.destroy({
        where: { showtime_id: { [Op.in]: futureShowtimeIds } },
        transaction,
      });
    }

    const { row: cinema, created: createdCinema } = await updateOrCreate(
      models.Cinema,
      { cinema_name: SEEDED_CINEMA.cinema_name },
      {
        location: SEEDED_CINEMA.location,
        logo_url: SEEDED_CINEMA.logo_url,
        location_url: SEEDED_CINEMA.location_url,
      },
      transaction
    );

    const movieRows = [];
    let createdMovies = 0;
    for (const movie of CURRENT_MOVIES) {
      const { row, created } = await updateOrCreate(
        models.Movie,
        { movie_name: movie.movie_name },
        {
          movie_genre: movie.movie_genre,
          duration_mins: movie.duration_mins,
          poster_url: movie.poster_url,
        },
        transaction
      );

      if (created) createdMovies += 1;
      movieRows.push({ ...movie, movie_id: Number(row.movie_id) });
    }

    let createdHalls = 0;
    for (const hall of HALLS) {
      const { created } = await updateOrCreate(
        models.Hall,
        { cinema_id: Number(cinema.cinema_id), hall_id: hall.hall_id },
        { type: hall.type },
        transaction
      );
      if (created) createdHalls += 1;
    }

    let touchedSeats = 0;
    for (const hall of HALLS) {
      const cols = 10;
      for (let seatId = 1; seatId <= hall.capacity; seatId += 1) {
        const seatRow = Math.ceil(seatId / cols);
        const seatCol = ((seatId - 1) % cols) + 1;
        const seatType = seatRow <= 2 ? "vip" : "normal";

        await updateOrCreate(
          models.Seat,
          {
            cinema_id: Number(cinema.cinema_id),
            hall_id: hall.hall_id,
            seat_id: seatId,
          },
          {
            seat_row: seatRow,
            seat_col: seatCol,
            seat_type: seatType,
            status: "active",
          },
          transaction
        );
        touchedSeats += 1;
      }
    }

    let touchedPrices = 0;
    for (const [hallType, seatPrices] of Object.entries(PRICES)) {
      for (const [seatType, price] of Object.entries(seatPrices)) {
        await updateOrCreate(
          models.Pricing,
          {
            cinema_id: Number(cinema.cinema_id),
            hall_type: hallType,
            seat_type: seatType,
          },
          { price },
          transaction
        );
        touchedPrices += 1;
      }
    }

    const slots = makeDailySchedule(movieRows, now, 2);
    const createdShowtimes = await models.Showtime.bulkCreate(
      slots.map((slot) => ({
        cinema_id: Number(cinema.cinema_id),
        hall_id: slot.hall.hall_id,
        movie_id: slot.movie.movie_id,
        start_time: slot.start_time,
        end_time: slot.end_time,
      })),
      { transaction }
    );

    return {
      cinema_id: Number(cinema.cinema_id),
      cinema_name: cinema.cinema_name,
      createdCinema,
      movies: movieRows.map((movie) => ({
        movie_id: movie.movie_id,
        movie_name: movie.movie_name,
      })),
      createdMovies,
      createdHalls,
      touchedSeats,
      touchedPrices,
      deletedRegistrations,
      deletedShowtimes,
      createdShowtimes: createdShowtimes.length,
      firstShowtime: createdShowtimes[0]?.start_time || null,
      lastShowtime: createdShowtimes[createdShowtimes.length - 1]?.start_time || null,
    };
  });
}

router.post("/admin/seed_now_playing", requireAuth, admin_check, async (req, res) => {
  try {
    const result = await replaceNowPlayingSchedule();
    return res.json({
      ok: true,
      message: "Now-playing cinema, posters, seats, pricing, and logical showtimes refreshed.",
      data: result,
    });
  } catch (err) {
    console.error("POST /admin/seed_now_playing error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server/database error while refreshing now-playing data.",
      error: err.message,
    });
  }
});

module.exports = router;
module.exports.replaceNowPlayingSchedule = replaceNowPlayingSchedule;
