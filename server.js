const dotenv = require('dotenv');
const chalk = require('chalk');
// Dotenv setup
dotenv.config({ path: `${__dirname}/config.env` });

const mongoose = require('mongoose');
const app = require('./app');

// Connect to the DB
mongoose
  .connect(process.env.DB_HOST, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  })
  .then(() => console.log(chalk.bgGreen('Successfully connected to the DB.')))
  .catch(err => console.log('Could not connect to the DB!', err));

// Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`Server is running on port ${port}`)
);

// Fetch data every 24 hours
const getAllData = require('./utils/get-daily-data');
const schedule = require('node-schedule');
schedule.scheduleJob('15 10 * * *', async () => {
  console.log('Scraped data at ', new Date());
  getAllData()
    .then(() => console.log('data scraped'))
    .catch(err => console.log(chalk.red('Error while scraping data!'), err));
});