
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

const Admin = require("../models/Admin");

const router = express.Router();

// בדיקת תקינות פרטי ההתחברות
const loginSchema = Joi.object({
    email: Joi.string().email().trim().required(),
    password: Joi.string().required(),
});

// התחברות למנהל
router.post("/login", async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                message: "Invalid login details",
            });
        }

        const admin = await Admin.findOne({
            email: value.email.toLowerCase(),
        }).select("+passwordHash");

        if (!admin) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        const passwordMatches = await bcrypt.compare(
            value.password,
            admin.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing");

            return res.status(500).json({
                message: "Server configuration error",
            });
        }

        const token = jwt.sign(
            {
                sub: admin._id.toString(),
                role: admin.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Error logging in",
        });
    }
});

module.exports = router;
