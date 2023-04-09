// import updateUsers from "twilioTest.js";
require("dotenv").config();
const turf = require("@turf/turf");

const algos = require("./requests");

const fastify = require("fastify")({
  logger: true,
});

fastify.register(require("@fastify/cors"), (instance) => {
  return (req, callback) => {
    const corsOptions = {
      origin: true,
    };

    if (/^localhost$/m.test(req.headers.origin)) {
      corsOptions.origin = false;
    }

    callback(null, corsOptions);
  };
});

const { dbinit, User, BP, Obstacle } = require("./db");

fastify.get("/", function (req, reply) {
  reply.send("Welcome to Detouree!");
});

// User routes
fastify.get("/users/:username", async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({
    where: { username },
  });
  if (user == null) return res.status(404).send();
  return user;
});

fastify.post("/users", async (req, res) => {
  const { username, password, firstName, lastName, phone, classes } = req.body;
  if (
    username == null ||
    username == "" ||
    password == null ||
    password == "" ||
    firstName == null ||
    firstName == "" ||
    lastName == null ||
    lastName == "" ||
    classes == null ||
    classes == "" ||
    phone == null ||
    phone == ""
  ) {
    return res.status(400).send();
  }

  const buildingPairs = [];
  for (const c of classes) {
    const { b1, b2 } = c;
    // First, query for (b1, b2)
    let buildingPair = await BP.findOne({
      where: { b1: b1, b2: b2 },
    });
    if (buildingPair != null) {
      buildingPairs.push(buildingPair.id);
    } else {
      // Next, query for (b2, b1)
      buildingPair = await BP.findOne({
        where: { b1: b2, b2: b1 },
      });
      if (buildingPair != null) {
        buildingPairs.push(buildingPair.id);
      } else {
        // Create a new BP
        const b1Coords = algos.getCoords(b1);
        const b2Coords = algos.getCoords(b2);
        const obstacles = await Obstacle.findAll();
        const bboxes = obstacles.map((o) => {
          const bbox = turf.bbox(o.boundary);
          return [
            [bbox[1], bbox[0]],
            [bbox[3], bbox[2]],
          ];
        });
        const [dist, path] = await algos.req(b1Coords, b2Coords, bboxes);
        const buildingPair = await BP.create({
          b1,
          b2,
          path: path.features[0],
        });
        buildingPairs.push(buildingPair.id);
      }
    }
  }

  const user = await User.create({
    username,
    password,
    firstName,
    lastName,
    classes: buildingPairs,
    phone,
  });
  if (user == null) return res.status(404).send();
  return user;
});

// BP routes
fastify.get("/bps/:id", async (req, res) => {
  const { id } = req.params;
  const buildingPair = await BP.findOne({
    where: { id },
  });
  if (id == null) return res.status(404).send();
  return buildingPair;
});

fastify.get("/bps", async (req, res) => {
  const buildingPairs = await BP.findAll();
  if (buildingPairs == null) return res.status(500).send();
  return buildingPairs;
});

fastify.put("/bps/:id", async (req, res) => {
  const { currentLength, newGeo } = req.params;
  const buildingPair = await BP.findOne({
    where: { id },
  });

  const bpID = buildingPair.id;

  // const params = [id]
  // const text = 'SELECT * FROM USERS WHERE id = $1'
  const usersList = User.findAll({
    where: id === bpID,
  });
  buildingPair.currentLength = currentLength;
  buildingPair.path = newGeo;
  // updateUsers(usersList);
  if (id == null) return res.status(404).send();
  return bpID;
});

fastify.post("/bps", async (req, res) => {
  const { b1, b2, path } = req.body;
  if (b1 == null || b1 == "" || b2 == null || b2 == "" || path == null)
    return res.status(400).send();
  // TODO: compute the path
  const buildingPair = await BP.create({
    b1,
    b2,
    path,
  });
  if (buildingPair == null) return res.status(404).send();
  return buildingPair;
});

// Obstacle routes
fastify.get("/obstacles/:id", async (req, res) => {
  const { id } = req.params;
  const obstacle = await Obstacle.findOne({
    where: { id },
  });
  if (id == null) return res.status(404).send();
  return obstacle;
});

fastify.get("/obstacles", async (req, res) => {
  const { id } = req.params;
  const obstacles = await Obstacle.findAll();
  if (obstacles == null) return res.status(500).send();
  return obstacles;
});

fastify.post("/obstacles", async (req, res) => {
  const { boundary, name } = req.body;
  if (name == null || name == "" || boundary == null || boundary == "")
    return res.status(400).send();
  const obstacle = await Obstacle.create({
    name,
    type: "area",
    boundary,
  });
  if (obstacle == null) return res.status(404).send();
  return obstacle;
});

fastify.post("/obstacles/:id/updates", async (req, res) => {
  const { id } = req.params;
  const obstacle = await Obstacle.findOne({
    where: { id },
  });
  if (id == null) return res.status(404).send();
  const { message } = req.body;
  if (message == null || message == "") return res.status(400).send();
  const updates = obstacle.updates;
  updates.push({ message, ts: Date.now() });
  const updatedObstacle = (
    await Obstacle.update(
      { updates },
      { where: { id }, returning: true, plain: true }
    )
  )[1];
  return updatedObstacle;
});

fastify.post("/auth", async (req, res) => {
  const { username, password } = req.body;
  if (username == null || password == null) return res.status(400).send();
  const user = await User.findOne({
    where: { username },
  });
  if (user == null || user.password != password) return res.status(404).send();
  return user;
});

// Run the server!
fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
