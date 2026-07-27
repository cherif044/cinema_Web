const models = require("../models/connector");

function demoUser() {
  return {
    id: 0,
    user_name: "Demo User",
    role: "user",
    get(field) {
      return this[field];
    },
  };
}

module.exports = async function requireAuth(req, res, next) {
  try {
    if (req.cookies?.demo_auth === "1") {
      req.user = demoUser();
      return next();
    }

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
    if (req.cookies?.demo_auth === "1") {
      req.user = demoUser();
      return next();
    }

    return res.status(500).json({ ok: false, message: "Authentication failed" });
  }
};
