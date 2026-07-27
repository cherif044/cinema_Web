const router = require("express").Router();
const admin_check = require("../../middleware/admin_check");
const requireAuth = require("../../middleware/logged_in");
const { replaceNowPlayingSchedule } = require("../../services/nowPlayingSeed");

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
