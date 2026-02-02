const router = require("express").Router();
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");

const models = require("../../models/connector");
const loginLimiter = require("../../limiters/loginLimiter");
const registerLimiter = require("../../limiters/signupLimiter");

router.post("/login", loginLimiter, async (req, res) => {
  const { user_name, password } = req.body;

  try {
    const user = await models.User.findOne({ where: { user_name } });
    if (!user) return res.status(401).json({ ok: false, message: "incorrect credentials" });

    const match = await bcrypt.compare(password, user.hashed_password);
    if (!match) return res.status(401).json({ ok: false, message: "incorrect credentials" });

   req.session.regenerate((err) => {
  if (err) return res.status(500).json({ ok: false, message: "Server error" });

  req.session.userId = user.id;

  // IMPORTANT: save session before responding
  req.session.save((saveErr) => {
    if (saveErr) return res.status(500).json({ ok: false, message: "Server error" });
    return res.json({ ok: true, message: "login successful", redirectTo: "/show_cinemas" });
  });
});

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});



module.exports = router;
