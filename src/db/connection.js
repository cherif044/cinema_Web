const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  "cinema",        // database name
  "root",      // mysql user
  "Basche@1172",         // mysql password
  {
    host: "localhost",
    dialect: "mysql",
    logging: false
  }
);

module.exports = sequelize;
