const express = require('express');
const cors = require('cors');
const { usersRouter } = require('./api');
const { busyRouter } = require('./busyApi');
const db = require('./database');
const path = require('path');
// .env file
require('dotenv').config();


const app = express();
const port = process.env.PORT || 3002;
const imageDir = process.env.IMAGE_DIR || 'E:/Dropbox wilfordtechnology/Dropbox/NodeCode/GoelPackaging/public';
const origin = process.env.ORIGIN || 'http://localhost:3000';
//origin: /^https?:\/\/localhost(:\d+)?$/,

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all localhost origins (HTTP/HTTPS with any port)
app.use(cors({
  origin: origin,
  methods: ['PUT', 'GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use('/api', usersRouter);
app.use('/api', busyRouter);



// Serve static images from the public folder (adjust the path as needed)
app.use('/image', express.static(imageDir));


function checkDate() {
    // Static date in "dd-MM-yyyy" format
    const staticDateString = "25-03-2025";
    const dateParts = staticDateString.split("-");
  
    // Validate that the date string has the correct format
    if (dateParts.length !== 3) {
      console.error("Invalid date format. Expected dd-MM-yyyy.");
      process.exit(1);
    }
  
    const [day, month, year] = dateParts;
    // Create a Date object (month is 0-indexed in JavaScript)
    const staticDate = new Date(year, month - 1, day);
  
    // Check if the created date is valid
    if (isNaN(staticDate.getTime())) {
      console.error("Invalid date provided.");
      process.exit(1);
    }
  
    const currentDate = new Date();
  
    // Compare current date with the static date
    if (currentDate > staticDate) {
      console.log("Date expired. Exiting code.");
      process.exit(1);
    } else {
      console.log("Date is valid.");
    }
  }
  
  // Run the date check
  checkDate();
  

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

db.init().then(() => {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}).catch(console.error);