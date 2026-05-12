export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userRole = String(req.user.role || "").trim();
  const allowed = roles.map((r) => String(r));

  if (!allowed.includes(userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  next();
};
