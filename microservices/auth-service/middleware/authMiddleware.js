import jwt from "jsonwebtoken";

const ACCESS_SECRET = "ACCESS_SECRET_KEY";

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header)
    return res.status(401).json({ error: "No token provided" });

  const token = header.split(" ")[1]; 

  if (!token)
    return res.status(401).json({ error: "Invalid token format" });

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);

    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export const auditLog = (action) => {
  return (req, res, next) => {
    const userId = req.user?.id || "anonymous";

    console.log(`[AUDIT] User: ${userId} | Action: ${action} | Time: ${new Date().toISOString()}`);

    next();
  };
};