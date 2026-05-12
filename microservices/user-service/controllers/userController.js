import User from "../models/User.js";
import { Op } from "sequelize";

export const GetAllUsers = async (call, callback) => {
  try {

    const page = parseInt(call.request.page) || 1;
    const limit = parseInt(call.request.limit) || 10;
    const offset = (page - 1) * limit;


    const { role, email, username } = call.request;

    const where = {};

 
    if (role) where.role = role;
    if (email) where.email = email;

   
    if (username) {
      where.username = {
        [Op.like]: `%${username}%`,
      };
    }

 
    const result = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

 
    callback(null, {
      total: result.count,
      page,
      pages: Math.ceil(result.count / limit),
      users: result.rows.map((u) => ({
        id: u.id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
        profileImage: u.profileImage,
        createdAt: u.created_at,
      })),
    });

  } catch (err) {
    console.error("GetAllUsers ERROR:", err.message);
    callback({ code: 13, message: "Server error" });
  }
};


export const GetUserById = async (call, callback) => {
  try {
    const { id } = call.request;

    if (!id) {
      return callback({ code: 3, message: "ID is required" });
    }

    const user = await User.findByPk(id);

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
    console.error("GetUserById ERROR:", err.message);
    callback({ code: 13, message: "Server error" });
  }
};