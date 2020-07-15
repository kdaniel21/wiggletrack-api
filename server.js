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
  })
  .then(() => console.log(chalk.bgGreen('Successfully connected to the DB.')))
  .catch((err) => console.log('Could not connect to the DB!', err));

// Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`Server is running on port ${port}`)
);
