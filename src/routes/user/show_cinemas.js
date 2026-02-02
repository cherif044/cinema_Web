const router = require("express").Router();
const path = require("path");
const requireAuth = require("../../middleware/logged_in");
const models = require("../../models/connector");

router.get("/show_cinemas",requireAuth,(req, res) => {
    // If you need to pass data to the view, do it like this
    const data = { 
        title: 'Some Title', 
        content: 'Details to display on the page' 
    };
    res.render('cinemas', data); // Replace 'some-template' with your HBS file name
});



module.exports = router;
