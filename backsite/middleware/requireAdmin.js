"use strict";

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

async function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing");
    return res.status(500).json({ message: "Server configuration error" });
  }

  const token = authorization.slice(7).trim();
  if (!token) return res.status(401).json({ message: "Authentication required" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  if (
    typeof decoded !== "object" || decoded === null ||
    decoded.role !== "admin" ||
    typeof decoded.sub !== "string" || !decoded.sub.trim()
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  // Existing legacy admin tokens behave exactly as before.
  // A promoted user's admin token is checked against the CURRENT DB role
  // on every protected request. Demotion/deletion immediately removes access.
  if (decoded.sub.startsWith("user:")) {
    const userId = decoded.sub.slice(5);
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ message: "Invalid account" });
    }
    try {
      const user = await User.collection.findOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { projection: { role: 1 } }
      );
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin permission revoked" });
      }
    } catch (error) {
      console.error("Admin role verification error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  req.adminId = decoded.sub;
  return next();
}

module.exports = requireAdmin;
