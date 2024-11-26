const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const app = express();
const apiRoute = require('./api');
const collection = require("./db");
const flash = require('express-flash');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', apiRoute);

app.use(session({
  secret: 'qTnFxvLy5k6psZRMJ0i4jWOmbIAGzVlr', 
  resave: false,
  saveUninitialized: true,
}));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
app.use(flash());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

const indexRoutes = require("./routes/indexRoutes");
const adminRoutes = require("./routes/adminRoutes");
app.use(indexRoutes);
app.use(adminRoutes);


const port = process.env.PORT || 3001;
app.listen(port, (err) => {
    if (err) {
        console.error(err);
    }
    console.log('App started on port ${port}');
});