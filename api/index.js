require("dotenv").config();
const fastify = require("fastify")({
  logger: true,
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
  const { username, password, firstName, lastName, classes } = req.body;
  if (
    username == null ||
    username == "" ||
    password == null ||
    password == "" ||
    firstName == null ||
    firstName == "" ||
    lastName == null ||
    lastName == ""
  )
    return res.status(400).send();
  const user = await User.create({
    username,
    password,
    firstName,
    lastName,
    classes,
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

fastify.post("/bps", async (req, res) => {
  const { id, building1, building2, path } = req.body;
  if (
    id == null ||
    id == "" ||
    building1 == null ||
    building1 == "" ||
    building2 == null ||
    building2 == "" ||
    path == null
  )
    return res.status(400).send();
  const buildingPair = await BP.create({
    id,
    building1,
    building2,
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
  const { id, boundary } = req.body;
  if (id == null || id == "" || boundary == null || boundary == "")
    return res.status(400).send();
  const obstacle = await Obstacle.create({
    id,
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
