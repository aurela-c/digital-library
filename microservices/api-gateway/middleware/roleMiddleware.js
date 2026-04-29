export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {

      if (!req.user) {
        return res.status(401).json({
          error: "Unauthorized - No user in request",
        });
      }


      if (!req.user.role) {
        return res.status(403).json({
          error: "Forbidden - No role assigned",
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: "Forbidden - Insufficient permissions",
        });
      }
      next();

    } catch (err) {
      console.error("Role middleware error:", err.message);
      return res.status(500).json({
        error: "Server error",
      });
    }
  };
};