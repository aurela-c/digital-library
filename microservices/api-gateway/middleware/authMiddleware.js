import jwt from "jsonwebtoken";

const ACCESS_SECRET = "ACCESS_SECRET_KEY";

export const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "No token" });
  }

  const token = header.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);

    req.user = decoded; 

    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

