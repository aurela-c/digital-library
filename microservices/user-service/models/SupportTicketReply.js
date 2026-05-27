import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import SupportTicket from "./SupportTicket.js";

/**
 * Conversation thread entries for a support ticket.
 * Each row is one message — either from the original requester or an admin.
 */
const SupportTicketReply = sequelize.define(
  "SupportTicketReply",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "ticket_id",
    },
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "author_id",
    },
    authorRole: {
      type: DataTypes.ENUM("user", "admin"),
      allowNull: false,
      defaultValue: "user",
      field: "author_role",
    },
    message: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    tableName: "support_ticket_replies",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["ticket_id"] }],
  }
);

// Eager join helper — kept inside the user-service only.
SupportTicket.hasMany(SupportTicketReply, {
  foreignKey: { name: "ticketId", field: "ticket_id" },
  as: "replies",
  onDelete: "CASCADE",
});
SupportTicketReply.belongsTo(SupportTicket, {
  foreignKey: { name: "ticketId", field: "ticket_id" },
  as: "ticket",
});

export default SupportTicketReply;
