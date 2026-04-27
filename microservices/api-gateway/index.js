const express = require("express");
const app = express();
const axios = require("axios");

app.use(express.json());

app.use("/auth", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:5001${req.url}`,
      data: req.body,
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Auth service error" });
  }
});


app.use("/users", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:5002${req.url}`,
      data: req.body,
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "User service error" });
  }
});

app.use("/books", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:5003${req.url}`,
      data: req.body,
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Book service error" });
  }
});

app.listen(5000, () => {
  console.log("API Gateway running on port 5000");
});