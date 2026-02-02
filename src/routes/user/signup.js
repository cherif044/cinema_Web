const router = require("express").Router();
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");

const models = require("../../models/connector");
const loginLimiter = require("../../limiters/loginLimiter");
const registerLimiter = require("../../limiters/signupLimiter");

router.post('/create_account', registerLimiter, async (req, res) => {
  // Validate inputs
  await body('first_name')
    .isLength({ min: 3, max: 40 })
    .withMessage('First name must be between 3 and 40 characters.')
    .run(req);

  await body('last_name')
    .isLength({ min: 3, max: 40 })
    .withMessage('Last name must be between 3 and 40 characters.')
    .run(req);

  await body('user_name')
    .isLength({ min: 3, max: 28 })
    .withMessage('Username must be between 3 and 28 characters.')
    .run(req);

  await body('password')
    .isStrongPassword()
    .withMessage('Password must be strong.')
    .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { first_name, last_name, user_name, password } = req.body;

  try {
    // ✅ fixed: use models.User (User was undefined before)
    const existingUser = await models.User.findOne({ where: { user_name } });

    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const hashed_password = await bcrypt.hash(password, 10);
     const roles='user';
    // ✅ fixed: models.User (was models.USer)
    await models.User.create({
      first_name,
      last_name,
      user_name,
      hashed_password,
      roles,
    });

    res.status(201).json({ message: 'Account created successfully' });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
