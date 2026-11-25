"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Mounted BEFORE existing authRoutes, keeps original admins login unchanged.
// Registered users who were promoted can sign in via the same admin login form.
router.post("/login", async (req, res, next) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") return next();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) return next();

  try {
    const user = await User.collection.findOne({ email: cleanEmail });
    if (!user || user.role !== "admin") return next();

    // Supports common field names while never accepting a plaintext comparison.
    const hashes = [user.passwordHash, user.password, user.hashedPassword]
      .filter(value => typeof value === "string" && /^\$2[aby]\$/.test(value));
    let matches = false;
    for (const hash of hashes) {
      if (await bcrypt.compare(password, hash)) { matches = true; break; }
    }

    // Let existing legacy admin login try as well, in case emails overlap.
    if (!matches) return next();
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = jwt.sign(
      { sub: `user:${String(user._id)}`, role: "admin" },
      process.env.JWT_SECRET,
      { algorithm: "HS256", expiresIn: "4h" }
    );
    return res.json({ token });
  } catch (error) {
    console.error("Promoted admin login error:", error);
    return res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;
