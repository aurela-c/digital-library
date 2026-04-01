import express from "express";
import mysql from "mysql2/promise"; 
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Connect to your MySQL database
const database = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "digital-library", 
});

// Secret key for JWT
const JWT_SECRET = "your_secret_key";

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await database.execute(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );
    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await database.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (rows.length === 0) return res.status(400).json({ error: "User not found" });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Incorrect password" });

    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token, name: user.name });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Database error" });
  }
});


app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});

// Register user
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if email already exists
    const [existing] = await database.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into database
    await database.execute(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Database error" });
  }
});