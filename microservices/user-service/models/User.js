import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: "ROLE_USER" },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "profile_image",
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      field: "is_verified",
      defaultValue: false,
    },
    accountStatus: {
      type: DataTypes.STRING(16),
      field: "account_status",
      defaultValue: "ACTIVE",
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);

export default User;
