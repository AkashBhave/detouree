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
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  b1: {
    type: Sequelize.STRING,
  },
  b2: {
    type: Sequelize.STRING,
  },
  path: {
    type: Sequelize.JSON,
  },
});

const Obstacle = sequelize.define("obstacle", {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: Sequelize.STRING,
  },
  updates: {
    type: Sequelize.JSON,
  },
  boundaryType: {
    type: Sequelize.STRING,
  },
  boundary: {
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
  await Obstacle.sync({ force: true });
  await Obstacle.bulkCreate([
    {
      name: "Zupnik Hall groundbreaking",
      boundaryType: "segment",
      boundary: [],
      updates: [],
    },
    {
      name: "Purple Line construction",
      boundaryType: "area",
      boundary: [],
      updates: [],
    },
  ]);

  const users = await User.findAll();
  users.forEach((u) => console.log(`${u.firstName} ${u.lastName}`));
  const bps = await BP.findAll();
  bps.forEach((bp) => console.log(`${bp.b1} ${bp.b2}`));
  const obstacles = await Obstacle.findAll();
  obstacles.forEach((o) => console.log(o.name));
};

module.exports = { sequelize, User, BP, Obstacle, dbinit };
