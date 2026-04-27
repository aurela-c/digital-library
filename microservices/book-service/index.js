const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Book Service Running");
});

app.get("/books", (req, res) => {
  res.json([
    { id: 1, title: "Book 1" },
    { id: 2, title: "Book 2" }
  ]);
});

app.listen(5003, () => {
  console.log("Book service running on port 5003");
});