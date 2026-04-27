import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const BorrowedBook = sequelize.define(
  "BorrowedBook",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    user_id: { type: DataTypes.INTEGER, allowNull: false },
    book_id: { type: DataTypes.INTEGER, allowNull: false },

    borrow_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    return_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING,
      defaultValue: "borrowed",
    },
  },
  {
    tableName: "borrows",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

export default BorrowedBook;