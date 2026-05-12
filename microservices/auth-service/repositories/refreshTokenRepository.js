import { Op } from "sequelize";
import RefreshToken from "../models/RefreshToken.js";

export const refreshTokenRepository = {
  create({ userId, jti, expiresAt }) {
    return RefreshToken.create({ userId, jti, expiresAt });
  },

  findValidByJti(jti) {
    return RefreshToken.findOne({
      where: {
        jti,
        revokedAt: { [Op.is]: null },
        expiresAt: { [Op.gt]: new Date() },
      },
    });
  },

  revokeByJti(jti) {
    return RefreshToken.update(
      { revokedAt: new Date() },
      { where: { jti, revokedAt: { [Op.is]: null } } }
    );
  },

  revokeAllActiveForUser(userId) {
    return RefreshToken.update(
      { revokedAt: new Date() },
      { where: { userId, revokedAt: { [Op.is]: null } } }
    );
  },
};
