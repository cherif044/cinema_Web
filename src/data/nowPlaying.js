const SEEDED_CINEMA = {
  cinema_name: "Chinema Cairo Festival",
  location: "Cairo Festival City",
  logo_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
  location_url: "https://maps.google.com/?q=Cairo+Festival+City+Mall",
};

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

function hashSeed(input) {
  let hash = 2166136261;
  for (const char of String(input)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function makeDailySchedule(movieRecords, now = new Date(), days = 2) {
  const records = movieRecords.length ? movieRecords : CURRENT_MOVIES;
  const seedBase = now.toISOString().slice(0, 10);
  const schedule = [];

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const day = startOfDay(now);
    day.setDate(day.getDate() + dayOffset);

    for (const hall of HALLS) {
      const rng = makeRng(hashSeed(`${seedBase}-${dayOffset}-${hall.hall_id}`));
      let cursor = new Date(day);
      cursor.setHours(11, 0 + Math.floor(rng() * 45), 0, 0);

      const closing = new Date(day);
      closing.setHours(23, 40, 0, 0);

      let previousMovieKey = null;

      while (cursor < closing) {
        if (cursor <= addMinutes(now, 20)) {
          cursor = addMinutes(cursor, 35 + Math.floor(rng() * 35));
          continue;
        }

        const pool = records.filter((movie) => movie.key !== previousMovieKey);
        const movie = pool[Math.floor(rng() * pool.length)] || records[0];
        const end = addMinutes(cursor, movie.duration_mins);

        if (end > closing) break;

        schedule.push({
          hall,
          movie,
          start_time: new Date(cursor),
          end_time: end,
        });

        previousMovieKey = movie.key;
        cursor = addMinutes(end, 22 + Math.floor(rng() * 24));
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
  SEEDED_CINEMA,
  createDemoShowtimes,
  makeDailySchedule,
};
