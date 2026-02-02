const rateLimit = require("express-rate-limit");

// 3 login attempts per 5 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, //5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      ok: false,
      message: "Too many login attempts. Try again in 1 minutes."
    });
  }
});

module.exports=loginLimiter;