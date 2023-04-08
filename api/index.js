require("dotenv").config();
const fastify = require("fastify")({
  logger: true,
});

const { User } = require("./db");

fastify.get("/", function (req, reply) {
  reply.send("Welcome to Detouree!");
});

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
