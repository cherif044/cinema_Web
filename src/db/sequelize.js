const { Sequelize } = require("sequelize");
const mysql2 = require("mysql2");
const pg = require("pg");

function hasDatabaseUrl() {
  return Boolean(
    process.env.DATABASE_URL &&
      !String(process.env.DATABASE_URL).includes("[SENSITIVE]")
  );
}

function sslOptions() {
  if (process.env.DB_SSL === "false") return undefined;

  return {
    require: true,
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true",
  };
}

function createSequelize() {
  if (hasDatabaseUrl()) {
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      dialectModule: pg,
      dialectOptions: {
        ssl: sslOptions(),
      },
      logging: false,
    });
  }

  return new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      dialect: "mysql",
      dialectModule: mysql2,
      logging: false,
    }
  );
}

module.exports = {
  createSequelize,
};
