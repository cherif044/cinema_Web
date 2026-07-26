const router = require("express").Router();
const models = require("../../models/connector");
const { Op } = require("sequelize");

router.get("/showtimes_redirect", (req, res) => {
  const cinema_id = req.query.cinema_id; // <-- comes from ?cinema_id=...

  if (!cinema_id) {
    return res.status(400).send("cinema_id is required");
  }

  // render the hbs page and pass cinema_id into it
  return res.render("showtimes", { cinema_id });
});

module.exports = router;
