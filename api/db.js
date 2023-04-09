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
  phone: {
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
  // currentLength: {
  //   type: Sequelize.INTEGER,
  // },
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
      phone: "5711920101",
      classes: [],
    },
  ]);
  await BP.sync({ force: true });
  await BP.bulkCreate([
    {
      b1: "Montgomery Hall",
      b2: "Sheep Barn",
      path: {
        type: "Feature",
        properties: {},
        geometry: {
          coordinates: [
            [-76.9389732946151, 38.98244328852027],
            [-76.93935383502587, 38.9825766923685],
            [-76.93960752863343, 38.98270429581444],
            [-76.93984629908722, 38.98297110227634],
            [-76.939973145891, 38.98331910919387],
            [-76.94009999269417, 38.984803919488115],
            [-76.94016934438179, 38.98659305154362],
            [-76.94011711334524, 38.98695264026409],
            [-76.94002757442478, 38.987283228282735],
            [-76.93997534338824, 38.98741662301069],
            [-76.93982611185434, 38.98756741674836],
            [-76.93978880397101, 38.987677611969076],
            [-76.93987088131458, 38.98777620754757],
            [-76.94002757442478, 38.987816805686805],
            [-76.94017680595867, 38.98782840515125],
            [-76.94028126803235, 38.98782840515125],
            [-76.94039319168233, 38.98784000461336],
            [-76.94053496163932, 38.98795599913123],
            [-76.94059465425278, 38.98806619374702],
            [-76.9406319621361, 38.98821698610095],
            [-76.94064692606437, 38.989148068217276],
            [-76.94065438764125, 38.98978022435122],
            [-76.9407140802547, 38.989965810401],
            [-76.94069169552459, 38.99035437961737],
            [-76.94067677237138, 38.991380888030676],
            [-76.94147516107623, 38.99138668747062],
            [-76.94146769949933, 38.99162446411253],
          ],
          type: "LineString",
        },
      },
    },
    {
      b1: "Sheep Barn",
      b2: "Eppley Recreation Center",
      path: {
        type: "Feature",
        properties: {},
        geometry: {
          coordinates: [
            [-76.94146235678132, 38.99164071475249],
            [-76.94173568516096, 38.99165083099686],
            [-76.94173568516096, 38.992530938694244],
            [-76.94179425552827, 38.99273326075516],
            [-76.94191790408108, 38.99285465371469],
            [-76.94215218554923, 38.992970988437946],
            [-76.94255567030048, 38.992970988437946],
            [-76.94321946779435, 38.992950756325996],
            [-76.94390929656277, 38.992950756325996],
            [-76.9438181871027, 38.993082264951454],
            [-76.94493753189636, 38.99311767107832],
            [-76.94508070390492, 38.993112613061186],
            [-76.9452564150063, 38.99353242724328],
          ],
          type: "LineString",
        },
      },
    },
  ]);
  await Obstacle.sync({ force: true });
  await Obstacle.bulkCreate([
    {
      name: "M Circle re-routing",
      boundaryType: "area",
      boundary: {
        type: "Feature",
        properties: {},
        geometry: {
          coordinates: [
            [
              [-76.94108421635978, 38.9880871790221],
              [-76.94108421635978, 38.98703480970116],
              [-76.93922805175788, 38.98703480970116],
              [-76.93922805175788, 38.9880871790221],
              [-76.94108421635978, 38.9880871790221],
            ],
          ],
          type: "Polygon",
        },
      },
      updates: [],
    },
    {
      name: "Chemistry building construction",
      boundaryType: "area",
      boundary: {
        type: "Feature",
        properties: {},
        geometry: {
          coordinates: [
            [
              [-76.9406505719337, 38.99025915839874],
              [-76.9406505719337, 38.99006797171728],
              [-76.93731348262163, 38.99006797171728],
              [-76.93731348262163, 38.99025915839874],
              [-76.9406505719337, 38.99025915839874],
            ],
          ],
          type: "Polygon",
        },
      },
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
