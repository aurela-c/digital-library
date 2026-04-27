const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());


app.use("/auth", async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:5001${req.originalUrl.replace("/auth", "")}`,
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
      url: `http://localhost:5002${req.originalUrl.replace("/users", "")}`,
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
      url: `http://localhost:5003${req.originalUrl.replace("/books", "")}`,
      data: req.body,
    });

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Book service error" });
  }
});


app.get("/", (req, res) => {
  res.send("API Gateway Running");
});

app.listen(5000, () => {
  console.log("API Gateway running on port 5000");
});