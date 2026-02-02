const router = require("express").Router();
const requireAuth = require("../../middleware/logged_in");
const models = require("../../models/connector");

router.get("/seat_select", requireAuth, async (req, res) => {
  try {
    const showtime_id = Number(req.query.showtime_id);
    if (!showtime_id || Number.isNaN(showtime_id)) {
      return res.status(400).send("Missing or invalid showtime_id");
    }

    const { Showtime, Seat, Registration, Hall, Pricing } = models;

    if (!Pricing) {
      return res.status(500).send("Pricing model not loaded in connector");
    }

    // 1) Get showtime
    const showtime = await Showtime.findByPk(showtime_id, {
      attributes: ["showtime_id", "cinema_id", "hall_id", "movie_id", "start_time", "end_time"],
      raw: true,
    });

    if (!showtime) return res.status(404).send("Showtime not found");

    // 2) Get hall type (gold/standard/premium)
    const hall = await Hall.findOne({
      where: { cinema_id: showtime.cinema_id, hall_id: showtime.hall_id },
      attributes: ["cinema_id", "hall_id", "type"],
      raw: true,
    });

    if (!hall) return res.status(404).send("Hall not found for this showtime");

    const hallType = hall.type; // e.g. "gold" / "standard" / "premium"

    // 3) Get seats for this hall (OPTIONAL: filter only active seats)
    const seats = await Seat.findAll({
      where: {
        cinema_id: showtime.cinema_id,
        hall_id: showtime.hall_id,
        // status: "active", // ✅ uncomment if you want ONLY active seats shown
      },
      attributes: ["seat_id", "seat_row", "seat_col", "seat_type", "status"],
      order: [["seat_row", "ASC"], ["seat_col", "ASC"]],
      raw: true,
    });

    // 4) Booked seats for this showtime
    const booked = await Registration.findAll({
      where: {
        showtime_id: showtime.showtime_id,
        cinema_id: showtime.cinema_id,
        hall_id: showtime.hall_id,
      },
      attributes: ["seat_id"],
      raw: true,
    });

    const bookedSet = new Set(booked.map(r => r.seat_id));

    // 5) Fetch pricing once for this hallType + seat types in this hall
    const seatTypesInHall = [...new Set(seats.map(s => s.seat_type).filter(Boolean))];

    const pricingRows = await Pricing.findAll({
      where: {
        cinema_id: showtime.cinema_id,
        hall_type: hallType,
        seat_type: seatTypesInHall, // Sequelize treats array as IN (...)
      },
      attributes: ["seat_type", "price"],
      raw: true,
    });

    const priceBySeatType = new Map(
      pricingRows.map(p => [String(p.seat_type), Number(p.price)])
    );

    // 6) Build seat map with price
    const seatMap = seats.map(s => {
      const seatType = s.seat_type ? String(s.seat_type) : null;
      const price = seatType && priceBySeatType.has(seatType)
        ? priceBySeatType.get(seatType) : null; // if missing pricing row

      return {
        seat_id: s.seat_id,
        row: s.seat_row,
        col: s.seat_col,
      registered: bookedSet.has(s.seat_id),
        seat_type: s.seat_type,
        status: s.status,
        price, // ✅ this seat pricec
      };
    });

    // Render page and embed data
    return res.render("seat_select", {
      showtime,
      hallType,
      seatMapJson: JSON.stringify(seatMap),
    });
  } catch (err) {
    console.error("GET /seat_select error:", err);
    return res.status(500).send("Server error");
  }
});

module.exports = router;
