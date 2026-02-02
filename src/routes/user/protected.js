const router = require("express").Router();
const path = require("path");
const requireAuth = require("../../middleware/logged_in");


router.get("/protected", requireAuth, (req, res) => {
  res.json({ ok: true, userId: req.user.id, user_name: req.user.user_name });
});

module.exports = router;
