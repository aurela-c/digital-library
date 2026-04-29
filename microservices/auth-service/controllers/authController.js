import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/emailService.js";

const ACCESS_SECRET = "ACCESS_SECRET_KEY";
const REFRESH_SECRET = "REFRESH_SECRET_KEY";

// generate tokens
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "USER",
    },
    ACCESS_SECRET,
    { expiresIn: "1h" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
    },
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

// REGISTER
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomBytes(32).toString("hex");

    await User.create({
      username: name,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
    });

    const verifyUrl = `${process.env.BASE_URL}/auth/verify/${verificationToken}`;

    await sendEmail(
      email,
      "Verify your account",
      `
        <h2>Welcome to Digital Library</h2>
        <p>Click below to verify your account:</p>
        <a href="${verifyUrl}">Verify Account</a>
      `
    );

    res.json({ message: "User registered. Check email to verify account." });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user)
      return res.status(400).json({ error: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(400).json({ error: "Invalid email or password" });

    if (!user.isVerified) {
      return res.status(403).json({ error: "Verify your email first" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// REFRESH TOKEN
export const refresh = (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(401).json({ error: "No refresh token" });

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);

    const newAccessToken = jwt.sign(
      { id: decoded.id },
      ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }
};


export const getUserById = async (req, res) => {
  try {
    const id = req.params.id;

    const user = await User.findByPk(id);

    if (!user)
      return res.status(404).json({ error: "User not found" });

    res.json({
      id: user.id,
      name: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const token = req.params.token;

    const user = await User.findOne({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid token" });
    }

    user.isVerified = true;
    user.verificationToken = null;

    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const requestReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) return res.json({ message: "If exists, email sent" });

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    const resetUrl = `${process.env.BASE_URL}/auth/reset/${resetToken}`;

    await sendEmail(
      email,
      "Reset Password",
      `
        <p>Click below to reset password:</p>
        <a href="${resetUrl}">Reset Password</a>
      `
    );

    res.json({ message: "Reset email sent" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = req.params.token;
    const { password } = req.body;

    const user = await User.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};