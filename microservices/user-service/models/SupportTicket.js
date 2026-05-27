import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Help-desk ticket. New table — does NOT touch the existing `users` schema.
 * `user_id` references `users.id` but we keep it a plain INT (no hard FK)
 * so the user-service can manage this table standalone without coupling
 * Sequelize associations across services.
 */
const SupportTicket = sequelize.define(
  "SupportTicket",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
    },
    subject: { type: DataTypes.STRING(160), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    category: {
      type: DataTypes.ENUM("technical", "account", "book", "general"),
      allowNull: false,
      defaultValue: "general",
    },
    status: {
      type: DataTypes.ENUM("open", "pending", "resolved", "closed"),
      allowNull: false,
      defaultValue: "open",
    },
    priority: {
      type: DataTypes.ENUM("low", "normal", "high"),
      allowNull: false,
      defaultValue: "normal",
    },
  },
  {
    tableName: "support_tickets",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id"] },
      { fields: ["status"] },
      { fields: ["category"] },
    ],
  }
);

export default SupportTicket;
