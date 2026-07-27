const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const models = require("../models/connector");

function setupSession(app) {
  const sessionStore = new SequelizeStore({
    db: models.sequelize,
    tableName: "session",
  });

  sessionStore.sync().catch((err) => {
    console.error("Session store sync failed:", err.message);
  });

  app.use(
    session({
      name: "sid",
      secret: process.env.SESSION_SECRET || "development-session-secret",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 30,
      },
    })
  );
}

module.exports = setupSession;
