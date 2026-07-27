const { Op } = require("sequelize");
const models = require("../models/connector");
const {
  CURRENT_MOVIES,
  HALLS,
  LEGACY_CINEMA_NAMES,
  SEEDED_CINEMA,
  makeDailySchedule,
} = require("../data/nowPlaying");

const PRICES = {
  standard: { normal: 120, vip: 170 },
  gold: { normal: 170, vip: 240 },
  premium: { normal: 220, vip: 320 },
};

const MIN_HEALTHY_SHOWTIMES = 8;
let ensurePromise = null;

async function updateOrCreate(Model, where, values, transaction) {
  const row = await Model.findOne({ where, transaction });
  if (row) {
    await row.update(values, { transaction });
    return { row, created: false };
  }

  const created = await Model.create({ ...where, ...values }, { transaction });
  return { row: created, created: true };
}

async function updateOrCreateSeededCinema(transaction) {
  const cinema = await models.Cinema.findOne({
    where: {
      [Op.or]: [
        { cinema_name: SEEDED_CINEMA.cinema_name },
        { cinema_name: { [Op.in]: LEGACY_CINEMA_NAMES } },
        { location: SEEDED_CINEMA.location },
      ],
    },
    order: [["cinema_id", "ASC"]],
    transaction,
  });

  if (cinema) {
    await cinema.update(
      {
        cinema_name: SEEDED_CINEMA.cinema_name,
        location: SEEDED_CINEMA.location,
        logo_url: SEEDED_CINEMA.logo_url,
        location_url: SEEDED_CINEMA.location_url,
      },
      { transaction }
    );
    return { row: cinema, created: false };
  }

  const created = await models.Cinema.create(SEEDED_CINEMA, { transaction });
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

    deletedRegistrations = await models.Registration.destroy({
      where: { booking_id: { [Op.ne]: null } },
      transaction,
    });

    if (futureShowtimeIds.length) {
      deletedShowtimes = await models.Showtime.destroy({
        where: { showtime_id: { [Op.in]: futureShowtimeIds } },
        transaction,
      });
    }

    const { row: cinema, created: createdCinema } = await updateOrCreateSeededCinema(transaction);

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
      refreshed: true,
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

async function ensureNowPlayingSchedule() {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const cinema = await models.Cinema.findOne({
      where: { cinema_name: SEEDED_CINEMA.cinema_name },
      attributes: ["cinema_id", "cinema_name"],
    });

    if (cinema) {
      const now = new Date();
      const from = new Date(now.getTime() + 5 * 60 * 1000);
      const to = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const movieNames = CURRENT_MOVIES.map((movie) => movie.movie_name);

      const currentShowtimes = await models.Showtime.count({
        where: {
          cinema_id: Number(cinema.cinema_id),
          start_time: { [Op.gte]: from, [Op.lt]: to },
        },
        include: [
          {
            model: models.Movie,
            required: true,
            where: { movie_name: { [Op.in]: movieNames } },
          },
        ],
      });

      if (currentShowtimes >= MIN_HEALTHY_SHOWTIMES) {
        return {
          refreshed: false,
          cinema_id: Number(cinema.cinema_id),
          cinema_name: cinema.cinema_name,
          existingShowtimes: currentShowtimes,
        };
      }
    }

    return replaceNowPlayingSchedule();
  })();

  try {
    return await ensurePromise;
  } finally {
    ensurePromise = null;
  }
}

module.exports = {
  ensureNowPlayingSchedule,
  replaceNowPlayingSchedule,
};
