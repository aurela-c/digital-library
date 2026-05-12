import User from "./User.js";
import RefreshToken from "./RefreshToken.js";

User.hasMany(RefreshToken, { foreignKey: "userId" });
RefreshToken.belongsTo(User, { foreignKey: "userId" });

export { User, RefreshToken };
