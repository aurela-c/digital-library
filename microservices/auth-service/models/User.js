import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: "ROLE_USER",
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      field: "is_verified",
      defaultValue: false,
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "verification_token",
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "reset_password_token",
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "reset_password_expires",
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "profile_image",
    },
    accountStatus: {
      type: DataTypes.STRING(16),
      allowNull: false,
      field: "account_status",
      defaultValue: "ACTIVE",
      validate: {
        isIn: [["ACTIVE", "INACTIVE", "BANNED"]],
      },
    },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

export default User;
