require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const requireAuth=require('./middleware/logged_in');
const requireAdmin=require('./middleware/admin_check');
const registerLimiter=require('./limiters/signupLimiter');
const loginLimiter=require('./limiters/loginLimiter');
const models = require('./models/connector');
const setupSession = require('./config/sessions');
const home=require('./routes/user/home');
const login=require('./routes/user/login');
const signup=require('./routes/user/signup');
const models_check=require('./routes/user/models_check');
const protected=require('./routes/user/protected');
const retrieve_cinemas=require('./routes/user/retrieve_cinemas');
const retrieve_showtimes=require('./routes/user/retrieve_showtimes');
const show_cinemas=require('./routes/user/show_cinemas');
const seat_select=require('./routes/user/seat_select');
const register_seat=require('./routes/user/register_seat');
const show_registrations=require('./routes/user/show_registrations');
const showtimes_redirect=require('./routes/user/showtimes_redirect')
const cancel=require('./routes/user/cancel');
const add_cinema = require("./routes/admin/add_cinema");
const add_hall = require("./routes/admin/add_hall");
const add_movie = require("./routes/admin/add_movie");
const add_seat = require("./routes/admin/add_seat");
const add_showtime = require("./routes/admin/add_showtime");
const change_cinema_logo = require("./routes/admin/change_cinema_logo");
const change_cinema_name = require("./routes/admin/change_cinema_name");
const delete_user = require("./routes/admin/delete_user");
const delete_cinema = require("./routes/admin/delete_cinema");
const delete_hall = require("./routes/admin/delete_hall");
const delete_movie = require("./routes/admin/delete_movie");
const delete_regis = require("./routes/admin/delete_regis");
const delete_seat = require("./routes/admin/delete_seat");
const delete_showtime = require("./routes/admin/delete_showtime");
const edit_pricing = require("./routes/admin/edit_pricing");
const seed_now_playing = require("./routes/admin/seed_now_playing");




//start server
const app = express();
app.set("trust proxy", 1);

// EJS
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '../views'));

// Parse body BEFORE routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));





//sessions
setupSession(app);

//routes
//user
app.use("/", home);
app.use("/",login );
app.use("/", signup);
app.use("/", protected);
app.use("/", models_check);
app.use("/", retrieve_cinemas);
app.use("/", retrieve_showtimes);
app.use("/", show_cinemas);
app.use("/", seat_select);
app.use("/", register_seat);
app.use("/", show_registrations);
app.use("/", showtimes_redirect);
app.use("/", cancel);



//admin

app.use("/", add_cinema);
app.use("/", add_hall);
app.use("/", add_movie);
app.use("/", add_seat);
app.use("/", add_showtime);
app.use("/", change_cinema_logo);
app.use("/", change_cinema_name);
app.use("/", delete_user);
app.use("/", delete_cinema);
app.use("/", delete_hall);
app.use("/", delete_movie);
app.use("/", delete_regis);
app.use("/", delete_seat);
app.use("/", delete_showtime);
app.use("/", edit_pricing);
app.use("/", seed_now_playing);
// Admin panel page (protect it)
app.get("/admin_panel",
  requireAuth,requireAdmin,(req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"));
});



// ✅ For Vercel (serverless): DO NOT app.listen() here.
// ✅ Also don't hard-crash the process on DB issues.

// Optional: you can test DB connection on cold start without killing app
(async () => {
  try {
    await models.sequelize.authenticate();
    console.log("Connected to MySQL (cold start)");
  } catch (err) {
    console.error("DB connection failed (cold start):", err.message);
  }
})();

module.exports = app;
