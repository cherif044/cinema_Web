const rateLimit = require("express-rate-limit");


// 5 signups per hour per 10 mins
const registerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,//10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      ok: false,
      message: "Too many create account attempts. Try again in 1 minutes."
    });
  }
});


module.exports= registerLimiter;