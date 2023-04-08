const Sequelize = require("sequelize-cockroachdb");

// Connect to CockroachDB through Sequelize.
const connectionString = process.env.DATABASE_URL;
const sequelize = new Sequelize(connectionString, {
  dialectOptions: {
    application_name: "detouree",
  },
});

// Define the Account model for the "accounts" table.
const User = sequelize.define("user", {
  username: {
    type: Sequelize.STRING,
    primaryKey: true,
  },
  password: {
    type: Sequelize.STRING,
  },
  firstName: {
    type: Sequelize.STRING,
  },
  lastName: {
    type: Sequelize.STRING,
  },
  classes: {
    type: Sequelize.ARRAY(Sequelize.STRING),
  },
});

const BP = sequelize.define("bp", {
  id:{
    type: Sequelize.INTEGER,
    primaryKey: true
  },
  b1: {
    type: Sequelize.STRING,
  },
  b2: {
    type: Sequelize.STRING,
  },
  path: {
    type: Sequelize.ARRAY,
  },
});

const Obstacle = sequelize.define("obstacle", {
  id: {
    type: Sequelize.INTEGER,
  },
  boundaryType:{
    type: Sequelize.STRING,
  },
  boundary:{
    type: Sequelize.JSON,
  },
});
const dbinit = async () => {
  await User.sync({ force: true });
  await User.bulkCreate([
    {
      username: "ab",
      password: "password",
      firstName: "Akash",
      lastName: "Bhave",
      classes: [],
    },
    {
      username: "js",
      password: "password",
      firstName: "John",
      lastName: "Smith",
      classes: [],
    },
  ]);
  await BP.sync({ force: true });
  await BP.bulkCreate([
    {
     b1: "Montgomery Hall",
     b2: "Sheep Barn",
     path: [],
    },
    {
      b1: "Sheep Barn",
      b2: "Eppley Recreation Center",
      path: [],
     },
     {
      b1: "Montgomery Hall",
      b2: "Eppley Recreation Center",
      path: [],
     },
  ]);
  const users = await User.findAll();

  console.log(users);
};

module.exports = { sequelize, User, BP, Obstacle, dbinit };
