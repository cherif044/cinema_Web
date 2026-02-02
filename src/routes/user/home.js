const router = require("express").Router();
const path = require("path");
const requireAuth = require("../../middleware/logged_in");

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../../public/home.html"));
});


module.exports = router;
