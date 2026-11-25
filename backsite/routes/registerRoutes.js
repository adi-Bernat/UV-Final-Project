
const express = require("express");
const Joi = require("joi");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

const router = express.Router();

const registerSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(2)
        .max(80)
        .required(),

    email: Joi.string()
        .trim()
        .email()
        .max(254)
        .required(),

    password: Joi.string()
        .min(12)
        .max(128)
        .required(),
});

router.post("/", async (req, res) => {
    try {
        const { error, value } =
            registerSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                message: "פרטי ההרשמה אינם תקינים",
            });
        }

        const email = value.email.toLowerCase();

        const existingUser = await User.findOne({
            email,
        });

        if (existingUser) {
            return res.status(409).json({
                message: "כבר קיים חשבון עם האימייל הזה",
            });
        }

        const passwordHash = await bcrypt.hash(
            value.password,
            12
        );

        const user = await User.create({
            name: value.name,
            email,
            passwordHash,
        });

        return res.status(201).json({
            message: "החשבון נוצר בהצלחה",
            user: {
                id: user._id,
                name: user.name,
            },
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "כבר קיים חשבון עם האימייל הזה",
            });
        }

        console.error("Registration error:", error);

        return res.status(500).json({
            message: "אירעה שגיאה ביצירת החשבון",
        });
    }
});

module.exports = router;
