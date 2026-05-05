import User from "../models/User.js";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const requestedId = req.params.id;

    if (
      req.user.role !== "ROLE_ADMIN" &&
      req.user.id != requestedId
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const user = await User.findByPk(requestedId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};