import User from "../models/User.js";

export const userRepository = {
  findByEmail: (email) => User.findOne({ where: { email } }),
  findByPk: (id) => User.findByPk(id),
  create: (data) => User.create(data),
  findByVerificationToken: (token) =>
    User.findOne({ where: { verificationToken: token } }),
  findByResetToken: (token) =>
    User.findOne({ where: { resetPasswordToken: token } }),
};
