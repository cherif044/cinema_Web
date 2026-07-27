const SEEDED_CINEMA = {
  cinema_name: "CFC Cinema",
  location: "Cairo Festival City",
  logo_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
  location_url: "https://maps.google.com/?q=Cairo+Festival+City+Mall",
};

const LEGACY_CINEMA_NAMES = [
  "Chinema Cairo Festival",
];

const CURRENT_MOVIES = [
  {
    key: "odyssey",
    movie_name: "The Odyssey",
    movie_genre: "Epic",
    duration_mins: 162,
    poster_url: "/posters/the-odyssey.jpg",
  },
  {
    key: "toyStory5",
    movie_name: "Toy Story 5",
    movie_genre: "Animation",
    duration_mins: 104,
    poster_url: "/posters/toy-story-5.jpg",
  },
  {
    key: "moana",
    movie_name: "Moana",
    movie_genre: "Adventure",
    duration_mins: 113,
    poster_url: "/posters/moana.jpg",
  },
  {
    key: "minionsMonsters",
    movie_name: "Minions & Monsters",
    movie_genre: "Animation",
    duration_mins: 91,
    poster_url: "/posters/minions-monsters.jpg",
  },
  {
    key: "supergirl",
    movie_name: "Supergirl",
    movie_genre: "Action",
    duration_mins: 126,
    poster_url: "/posters/supergirl.jpg",
  },
  {
    key: "mandalorianGrogu",
    movie_name: "The Mandalorian and Grogu",
    movie_genre: "Sci-Fi",
    duration_mins: 132,
    poster_url: "/posters/mandalorian-grogu.jpg",
  },
  {
    key: "backrooms",
    movie_name: "Backrooms",
    movie_genre: "Horror",
    duration_mins: 102,
    poster_url: "/posters/backrooms.jpg",
  },
  {
    key: "scaryMovie",
    movie_name: "Scary Movie",
    movie_genre: "Comedy",
    duration_mins: 88,
    poster_url: "/posters/scary-movie.jpg",
  },
];

const HALLS = [
  { hall_id: 1, type: "premium", capacity: 80 },
  { hall_id: 2, type: "gold", capacity: 70 },
  { hall_id: 3, type: "standard", capacity: 90 },
];

const CINEMA_TIME_ZONE = "Africa/Cairo";

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getZonedParts(date, timeZone = CINEMA_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function getTimeZoneOffsetMs(date, timeZone = CINEMA_TIME_ZONE) {
  const parts = getZonedParts(date, timeZone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return localAsUtc - date.getTime();
}

function makeDateInTimeZone(year, month, day, hour, minute, timeZone = CINEMA_TIME_ZONE) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const firstOffset = getTimeZoneOffsetMs(utcGuess, timeZone);
  const firstResult = new Date(utcGuess.getTime() - firstOffset);
  const correctedOffset = getTimeZoneOffsetMs(firstResult, timeZone);
  return new Date(utcGuess.getTime() - correctedOffset);
}

function makeDailySchedule(movieRecords, now = new Date(), days = 2) {
  const records = movieRecords.length ? movieRecords : CURRENT_MOVIES;
  const schedule = [];
  const today = getZonedParts(now);
  const cleanSlotsByHall = {
    1: [
      ["11:00", "13:00"],
      ["14:00", "16:00"],
      ["17:00", "19:00"],
      ["20:00", "22:00"],
    ],
    2: [
      ["12:00", "14:00"],
      ["16:00", "18:00"],
      ["19:00", "21:00"],
      ["21:30", "23:30"],
    ],
    3: [
      ["10:30", "12:30"],
      ["13:30", "15:30"],
      ["16:30", "18:30"],
      ["19:30", "21:30"],
    ],
  };

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    for (const hall of HALLS) {
      const slots = cleanSlotsByHall[hall.hall_id] || [];

      for (const [slotIndex, [startLabel, endLabel]] of slots.entries()) {
        const [startHour, startMinute] = startLabel.split(":").map(Number);
        const [endHour, endMinute] = endLabel.split(":").map(Number);
        const start = makeDateInTimeZone(
          today.year,
          today.month,
          today.day + dayOffset,
          startHour,
          startMinute
        );

        if (start <= addMinutes(now, 20)) continue;

        const end = makeDateInTimeZone(
          today.year,
          today.month,
          today.day + dayOffset,
          endHour,
          endMinute
        );
        if (end <= start) end.setDate(end.getDate() + 1);

        const movieIndex = (
          dayOffset * HALLS.length * slots.length +
          (hall.hall_id - 1) * slots.length +
          slotIndex
        ) % records.length;

        const movie = records[movieIndex] || records[0];
        schedule.push({
          hall,
          movie,
          start_time: start,
          end_time: end,
        });
      }
    }
  }

  return schedule.sort((a, b) => a.start_time - b.start_time);
}

function createDemoShowtimes(cinema, now = new Date()) {
  const movieRecords = CURRENT_MOVIES.map((movie, index) => ({
    ...movie,
    movie_id: 9901 + index,
  }));

  return makeDailySchedule(movieRecords, now).map((slot, index) => {
    const registered = Math.floor(slot.hall.capacity * (0.25 + (index % 5) * 0.08));
    return {
      showtime_id: 0,
      cinema_id: cinema.cinema_id,
      hall_id: slot.hall.hall_id,
      movie_id: slot.movie.movie_id,
      start_time: slot.start_time.toISOString(),
      end_time: slot.end_time.toISOString(),
      hall_capacity_active: slot.hall.capacity,
      registered_active: registered,
      available_active: Math.max(slot.hall.capacity - registered, 0),
      seat_statuses: [],
      Movie: {
        movie_id: slot.movie.movie_id,
        movie_name: slot.movie.movie_name,
        movie_genre: slot.movie.movie_genre,
        duration_mins: slot.movie.duration_mins,
        poster_url: slot.movie.poster_url,
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

module.exports = {
  CURRENT_MOVIES,
  HALLS,
  LEGACY_CINEMA_NAMES,
  SEEDED_CINEMA,
  createDemoShowtimes,
  makeDailySchedule,
};
