import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/emailService.js";
import dotenv from "dotenv";

dotenv.config();

const ACCESS_SECRET = process.env.ACCESS_SECRET || "ACCESS_SECRET_KEY";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "REFRESH_SECRET_KEY";


const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "ROLE_USER",
    },
    ACCESS_SECRET,
    { expiresIn: "1h" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "ROLE_USER",
    },
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};



export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ where: { email } });

    if (exists) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      username: name,
      email,
      password: hashedPassword,
      role: "ROLE_USER",
      isVerified: false,
      verificationToken,
    });

    const baseUrl = process.env.BASE_URL || "http://localhost:5001";
    const verifyUrl = `${baseUrl}/auth/verify/${verificationToken}`;

    try {
      await sendEmail(
        email,
        "Verify your account",
        `<a href="${verifyUrl}">Verify Account</a>`
      );
    } catch (err) {
      console.log("EMAIL ERROR:", err.message);
    }

    return res.status(201).json({
      message: "User registered. Check email to verify account.",
    });

  } catch (err) {
    console.log("REGISTER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: "Verify your email first" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


export const refresh = (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: "No refresh token" });
    }

    const decoded = jwt.verify(token, REFRESH_SECRET);

    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      },
      ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({ accessToken: newAccessToken });

  } catch (err) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }
};


export const getUserById = async (req, res) => {
  try {
    const requestedId = req.params.id;

    const user = await User.findByPk(requestedId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    });

  } catch (err) {
    console.log("GET USER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
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

    return res.json({ message: "Email verified successfully" });

  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};


export const requestReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.json({ message: "If exists, email sent" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;

    await user.save();

    const baseUrl = process.env.BASE_URL || "http://localhost:5001";
    const resetUrl = `${baseUrl}/auth/reset/${resetToken}`;

    await sendEmail(
      email,
      "Reset Password",
      `<a href="${resetUrl}">Reset Password</a>`
    );

    return res.json({ message: "Reset email sent" });

  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = req.params.token;
    const { password } = req.body;

    const user = await User.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return res.json({ message: "Password reset successful" });

  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};