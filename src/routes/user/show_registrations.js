const router = require("express").Router();
const requireAuth = require("../../middleware/logged_in");
const models = require("../../models/connector");
const { Op } = require("sequelize");

router.get("/show_registrations", requireAuth, async (req, res) => {
  try {
    // 1) user_id from session ONLY
    const user_id = Number(req.session?.userId ?? req.session?.user_id ?? req.user?.id);
    if (!user_id || Number.isNaN(user_id)) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const { Registration, Showtime, Movie, Cinema, Hall } = models;

    // 2) Get all registrations for this user
    const regs = await Registration.findAll({
      where: { user_id },
      attributes: ["booking_id", "showtime_id", "cinema_id", "hall_id", "seat_id", "created_at"],
      order: [["created_at", "DESC"]],
      raw: true,
    });

    if (!regs.length) {
      return res.json({ ok: true, message: "No registrations available", data: [] });
    }

    // 3) Unique showtime ids from registrations
    const showtimeIds = [...new Set(regs.map(r => r.showtime_id))];

    // 4) Only active showtimes (end_time > now)
    const now = new Date();

    const showtimesRaw = await Showtime.findAll({
      where: {
        showtime_id: { [Op.in]: showtimeIds },
        end_time: { [Op.gt]: now },
      },
      attributes: [
        "showtime_id",
        "cinema_id",
        "hall_id",
        "movie_id",
        "start_time",
        "end_time"
      ],
      include: [
        { model: Movie, attributes: ["movie_id", "movie_name", "movie_genre", "duration_mins", "poster_url"], required: false },
        { model: Cinema, attributes: ["cinema_id", "cinema_name", "location"], required: false },
        // ❌ DO NOT include Hall here (hall_id repeats across cinemas -> duplicates)
      ],
      order: [["start_time", "ASC"]],
    });

    if (!showtimesRaw.length) {
      return res.json({ ok: true, message: "No active registrations (all showtimes ended).", data: [] });
    }

    // 5) Convert showtimes to plain objects & ensure unique by showtime_id
    const uniqShowtimes = new Map();
    for (const st of showtimesRaw) {
      const plain = st.get({ plain: true });
      uniqShowtimes.set(plain.showtime_id, plain);
    }
    const showtimes = [...uniqShowtimes.values()];

    // 6) Fetch halls separately using (cinema_id, hall_id) pairs
    const hallPairs = [];
    const hallKeySet = new Set();

    for (const st of showtimes) {
      const key = `${st.cinema_id}-${st.hall_id}`;
      if (!hallKeySet.has(key)) {
        hallKeySet.add(key);
        hallPairs.push({ cinema_id: st.cinema_id, hall_id: st.hall_id });
      }
    }

    const halls = await Hall.findAll({
      where: { [Op.or]: hallPairs },
      attributes: ["cinema_id", "hall_id","type"],
      raw: true,
    });

    const hallMap = new Map(halls.map(h => [`${h.cinema_id}-${h.hall_id}`, h]));

    // 7) Group registrations by showtime_id (only active showtimes)
    const activeSet = new Set(showtimes.map(s => s.showtime_id));

    const regsByShowtime = {};
    for (const r of regs) {
      if (!activeSet.has(r.showtime_id)) continue;

      if (!regsByShowtime[r.showtime_id]) regsByShowtime[r.showtime_id] = [];
      regsByShowtime[r.showtime_id].push({
        booking_id: r.booking_id,
        seat_id: r.seat_id,
        created_at: r.created_at,
      });
    }

    // 8) Build response: one object per showtime
    const data = showtimes.map(st => {
      const registrations = regsByShowtime[st.showtime_id] || [];

      return {
        ...st,
        Hall: hallMap.get(`${st.cinema_id}-${st.hall_id}`) || null, // ✅ safely attached
        registrations, // ✅ [{booking_id, seat_id, created_at}]
        seat_ids: registrations.map(x => x.seat_id), // optional convenience
      };
    });

    return res.json({
      ok: true,
      user_id,
      count: data.length,
      data,
    });

  } catch (err) {
    console.error("GET /show_registrations error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
