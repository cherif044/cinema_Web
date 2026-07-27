// models/index.js
const { Sequelize, DataTypes } = require("sequelize");
const { createSequelize } = require("../db/sequelize");

const sequelize = createSequelize();

// Import model definers
const defineUser = require("./users");
const defineCinema = require("././cinema");
const defineMovie = require("./movie");
const defineHall = require("./hall");
const defineSeat = require("./seat");
const defineShowtime = require("./showtime");
const defineRegistration = require("./registration");
const defineContributor = require("./contributor");
const defineContributorsXMovies = require("./contributorsxmovies");
const definePricing = require("./pricing");

// Define models
const User = defineUser(sequelize, DataTypes);
const Cinema = defineCinema(sequelize, DataTypes);
const Movie = defineMovie(sequelize, DataTypes);
const Hall = defineHall(sequelize, DataTypes);
const Seat = defineSeat(sequelize, DataTypes);
const Showtime = defineShowtime(sequelize, DataTypes);
const Registration = defineRegistration(sequelize, DataTypes);
const Contributor = defineContributor(sequelize, DataTypes);
const ContributorsXMovies = defineContributorsXMovies(sequelize, DataTypes);
const Pricing = definePricing(sequelize, DataTypes);

// ======================
// Associations
// ======================

// Cinema -> Hall (composite key table)
Cinema.hasMany(Hall, { foreignKey: "cinema_id", sourceKey: "cinema_id" });
Hall.belongsTo(Cinema, { foreignKey: "cinema_id", targetKey: "cinema_id" });

// Cinema -> Pricing
Cinema.hasMany(Pricing, { foreignKey: "cinema_id", sourceKey: "cinema_id" });
Pricing.belongsTo(Cinema, { foreignKey: "cinema_id", targetKey: "cinema_id" });

// Hall -> Seat (composite: cinema_id + hall_id)
// Sequelize can't enforce composite FK automatically, but we can still associate via hall_id
// and always query with both cinema_id and hall_id when needed.
Hall.hasMany(Seat, { foreignKey: "hall_id", sourceKey: "hall_id" });
Seat.belongsTo(Hall, { foreignKey: "hall_id", targetKey: "hall_id" });

// Movie -> Showtime
Movie.hasMany(Showtime, { foreignKey: "movie_id", sourceKey: "movie_id" });
Showtime.belongsTo(Movie, { foreignKey: "movie_id", targetKey: "movie_id" });

// Hall -> Showtime (composite in DB: cinema_id + hall_id)
Hall.hasMany(Showtime, { foreignKey: "hall_id", sourceKey: "hall_id" });
Showtime.belongsTo(Hall, { foreignKey: "hall_id", targetKey: "hall_id" });

// Showtime -> Registration
Showtime.hasMany(Registration, { foreignKey: "showtime_id", sourceKey: "showtime_id" });
Registration.belongsTo(Showtime, { foreignKey: "showtime_id", targetKey: "showtime_id" });

// User -> Registration
User.hasMany(Registration, { foreignKey: "user_id", sourceKey: "id" });
Registration.belongsTo(User, { foreignKey: "user_id", targetKey: "id" });

// Seat -> Registration (composite in DB: cinema_id + hall_id + seat_id)
// We'll link by seat_id, but in queries you should filter by (cinema_id, hall_id, seat_id)
Seat.hasMany(Registration, { foreignKey: "seat_id", sourceKey: "seat_id" });
Registration.belongsTo(Seat, { foreignKey: "seat_id", targetKey: "seat_id" });

// Movie <-> Contributor (many-to-many through contributorsxmovies)
Movie.belongsToMany(Contributor, {
  through: ContributorsXMovies,
  foreignKey: "movie_id",
  otherKey: "contributor_id",
});
Contributor.belongsToMany(Movie, {
  through: ContributorsXMovies,
  foreignKey: "contributor_id",
  otherKey: "movie_id",
});


// Showtime -> Cinema (many showtimes belong to one cinema)
Showtime.belongsTo(Cinema, { foreignKey: "cinema_id" });
Cinema.hasMany(Showtime, { foreignKey: "cinema_id" });

// Showtime -> Movie (many showtimes belong to one movie)
Showtime.belongsTo(Movie, { foreignKey: "movie_id" });
Movie.hasMany(Showtime, { foreignKey: "movie_id" });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Cinema,
  Movie,
  Hall,
  Seat,
  Showtime,
  Registration,
  Contributor,
  ContributorsXMovies,
  Pricing,
};
