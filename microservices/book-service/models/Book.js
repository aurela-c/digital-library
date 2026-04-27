import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Book = sequelize.define("Book", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: DataTypes.STRING,
  author: DataTypes.STRING,
  image: DataTypes.STRING,
  description: DataTypes.TEXT,
  total_copies: { type: DataTypes.INTEGER, defaultValue: 10 },
  available_copies: { type: DataTypes.INTEGER, defaultValue: 10 },
}, {
  tableName: "books",
  timestamps: false,
});

export default Book;