import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Book = sequelize.define(
  "Book",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    author: { type: DataTypes.STRING(255), allowNull: false },
    // Cover URLs can be longer than 255 chars (CDN-signed links etc.).
    image: { type: DataTypes.STRING(512), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    // CRITICAL: the table has a `category_id` column but the previous model
    // didn't declare it, so every Book.create() silently dropped the field
    // and stored NULL. That's why admin-set categories never persisted.
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "category_id",
    },
    total_copies: { type: DataTypes.INTEGER, defaultValue: 10 },
    available_copies: { type: DataTypes.INTEGER, defaultValue: 10 },
    /**
     * Admin-curated "Popular Now" flag. Drives the catalog landing
     * carousel. Optional column — added via a guarded queryInterface
     * migration in `index.js` so existing tables keep working.
     */
    is_popular: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_popular",
    },
    // Surface created_at so the gRPC mapper actually returns a value
    // instead of `undefined`.
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "created_at",
    },
  },
  {
    tableName: "books",
    timestamps: false,
  }
);

export default Book;