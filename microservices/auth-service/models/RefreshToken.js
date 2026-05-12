import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const RefreshToken = sequelize.define(
  "RefreshToken",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    jti: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "auth_refresh_tokens",
    timestamps: true,
    indexes: [{ fields: ["userId"] }, { fields: ["jti"] }],
  }
);

export default RefreshToken;
