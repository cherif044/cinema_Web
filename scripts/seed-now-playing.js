require("dotenv").config();

const { replaceNowPlayingSchedule } = require("../src/services/nowPlayingSeed");
const models = require("../src/models/connector");

const REQUIRED_ENV = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASS"];

async function main() {
  if (!process.env.DATABASE_URL) {
    const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
  }

  await models.sequelize.authenticate();
  const result = await replaceNowPlayingSchedule();
  console.log(JSON.stringify({ ok: true, data: result }, null, 2));
}

main()
  .catch((err) => {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await models.sequelize.close().catch(() => {});
  });
