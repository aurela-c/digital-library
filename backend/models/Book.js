import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Book = sequelize.define("Book", {
  id: {type: DataTypes.INTEGER,autoIncrement: true,primaryKey: true,},
  title: {type: DataTypes.STRING,allowNull: false,},
  author: {type: DataTypes.STRING,allowNull: false,},
  image: {type: DataTypes.STRING,allowNull: true,},
}, {
  tableName: "books", 
  timestamps: false,
});

export default Book;