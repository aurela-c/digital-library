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
      defaultValue: false,
    },

    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    accountStatus: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "ACTIVE",
      validate: {
        isIn: [["ACTIVE", "INACTIVE", "BANNED"]],
      },
    },
  },
  {
    // Dedicated table: user-service also uses MySQL "users" with a smaller
    // schema; sharing one table causes missing-column / sync conflicts and
    // breaks auth register/login.
    tableName: "auth_users",
    timestamps: true,
  }
);

export default User;