import User from "../models/User.js";

export const GetAllUsers = async (call, callback) => {
  try {
    const users = await User.findAll();

    callback(null, {
      users: users.map((u) => ({
        id: u.id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
        profileImage: u.profileImage,
        createdAt: u.created_at,
      })),
    });

  } catch (err) {
    callback({ code: 13, message: "Server error" });
  }
};

export const GetUserById = async (call, callback) => {
  try {
    const requestedId = call.request.id;

    const user = await User.findByPk(requestedId);

    if (!user) {
      return callback({ code: 5, message: "User not found" });
    }

    callback(null, {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      createdAt: user.created_at,
    });

  } catch (err) {
    callback({ code: 13, message: "Server error" });
  }
};