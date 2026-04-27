const express = require("express");
const app = express();

app.use(express.json());


app.get("/", (req, res) => {
  res.send("User Service Running");
});

app.get("/profile", (req, res) => {
  res.json({ id: 1, name: "Test User" });
});

app.get("/users", (req, res) => {
  res.json([{ id: 1, name: "User 1" }]);
});

app.listen(5002, () => {
  console.log("User service running on port 5002");
});