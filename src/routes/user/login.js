const router = require("express").Router();
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");

const models = require("../../models/connector");
const loginLimiter = require("../../limiters/loginLimiter");
const registerLimiter = require("../../limiters/signupLimiter");

function isDatabaseUnavailable(err) {
  return [
    "SequelizeHostNotFoundError",
    "SequelizeConnectionError",
    "SequelizeConnectionRefusedError",
    "SequelizeConnectionTimedOutError",
  ].includes(err?.name);
}

function setDemoAuthCookie(res) {
  res.cookie("demo_auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 30,
  });
}

router.post("/login", loginLimiter, async (req, res) => {
  const { user_name, password } = req.body;

  try {
    const user = await models.User.findOne({ where: { user_name } });
    if (!user) return res.status(401).json({ ok: false, message: "incorrect credentials" });

    const match = await bcrypt.compare(password, user.hashed_password);
    if (!match) return res.status(401).json({ ok: false, message: "incorrect credentials" });

   req.session.regenerate((err) => {
  if (err) {
    setDemoAuthCookie(res);
    return res.json({ ok: true, demo: true, message: "demo login successful", redirectTo: "/show_cinemas" });
  }

  req.session.userId = user.id;

  // IMPORTANT: save session before responding
  req.session.save((saveErr) => {
    if (saveErr) {
      setDemoAuthCookie(res);
      return res.json({ ok: true, demo: true, message: "demo login successful", redirectTo: "/show_cinemas" });
    }
    return res.json({ ok: true, message: "login successful", redirectTo: "/show_cinemas" });
  });
});

  } catch (err) {
    console.error(err);
    if (user_name && password && isDatabaseUnavailable(err)) {
      setDemoAuthCookie(res);
      return res.json({
        ok: true,
        demo: true,
        message: "Database is unavailable, using demo login",
        redirectTo: "/show_cinemas",
      });
    }

    res.status(500).json({ ok: false, message: "Server error" });
  }
});



module.exports = router;
