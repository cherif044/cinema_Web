const models = require("../models/connector");

module.exports = async function requireAuth(req, res, next) {
  try {
    if (!req.session?.userId) {
      return res.redirect("/");
    }

    const user = await models.User.findByPk(req.session.userId);

    if (!user) {
      return req.session.destroy(() => res.redirect("/"));
    }

    req.user = user; // keep full user object for other APIs
    next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(500).json({ ok: false, message: "Authentication failed" });
  }
};
