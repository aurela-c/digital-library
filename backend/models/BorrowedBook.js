import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./User.js";
import Book from "./Book.js";

const BorrowedBook = sequelize.define("BorrowedBook", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  book_id: { type: DataTypes.INTEGER, allowNull: false },
  borrow_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  return_date: { type: DataTypes.DATE, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: "borrowed" },
}, {
  tableName: "borrows",
  timestamps: true, 
});


User.hasMany(BorrowedBook, { foreignKey: "user_id" });
BorrowedBook.belongsTo(User, { foreignKey: "user_id" });

Book.hasMany(BorrowedBook, { foreignKey: "book_id" });
BorrowedBook.belongsTo(Book, { foreignKey: "book_id" });

export default BorrowedBook;