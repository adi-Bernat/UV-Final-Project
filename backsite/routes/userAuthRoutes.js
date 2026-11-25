
"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { rateLimit } = require("express-rate-limit");

const User = require("../models/User");
const router = express.Router();

// בדיקת נתוני התחברות
const loginSchema = Joi.object({
    email: Joi.string().email().trim().required(),
    password: Joi.string().required(),
});

// בדיקת כתובת אימייל לאיפוס סיסמה
const forgotSchema = Joi.object({
    email: Joi.string().email().trim().required(),
});

// בדיקת קוד איפוס וסיסמה חדשה
const resetSchema = Joi.object({
    token: Joi.string().hex().length(64).required(),
    password: Joi.string().min(8).max(72).required(),
});

// הגבלת מספר בקשות כדי למנוע שימוש לרעה
const forgotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "יותר מדי בקשות. נסו שוב מאוחר יותר." },
});

const resetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "יותר מדי ניסיונות. נסו שוב מאוחר יותר." },
});

// יצירת חיבור לשירות שליחת המיילים
function createMailer() {
    const port = Number(process.env.SMTP_PORT || 587);

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// התחברות משתמש רגיל
router.post("/login", async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                message: "פרטי ההתחברות אינם תקינים",
            });
        }

        const user = await User.findOne({
            email: value.email.toLowerCase(),
        }).select("+passwordHash");

        if (!user) {
            return res.status(401).json({
                message: "אימייל או סיסמה שגויים",
            });
        }

        const passwordMatches = await bcrypt.compare(
            value.password,
            user.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "אימייל או סיסמה שגויים",
            });
        }

        if (!process.env.USER_JWT_SECRET) {
            console.error("USER_JWT_SECRET is missing");
            return res.status(500).json({
                message: "שגיאה בהגדרות השרת",
            });
        }

        // יצירת טוקן התחברות למערכת המשתמשים
        const token = jwt.sign(
            {
                sub: user._id.toString(),
                role: "user",
            },
            process.env.USER_JWT_SECRET,
            { expiresIn: "2h" }
        );

        return res.status(200).json({
            message: "התחברת בהצלחה",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: "user",
            },
        });
    } catch (error) {
        console.error("User login error:", error);
        return res.status(500).json({
            message: "אירעה שגיאה בהתחברות",
        });
    }
});

// בקשה לשליחת קישור לאיפוס סיסמה
router.post("/forgot-password", forgotLimiter, async (req, res) => {
    const { error, value } = forgotSchema.validate(req.body);

    if (error) {
        return res.status(400).json({
            message: "כתובת האימייל אינה תקינה",
        });
    }

    // הודעה אחידה שאינה חושפת אם המשתמש קיים
    const successMessage =
        "אם האימייל רשום במערכת, יישלח אליו קישור לאיפוס סיסמה.";

    try {
        const user = await User.findOne({
            email: value.email.toLowerCase(),
        });

        if (!user) {
            return res.json({ message: successMessage });
        }

        // יצירת קוד אקראי ומאובטח
        const resetToken = crypto.randomBytes(32).toString("hex");

        // שמירת גיבוב הקוד במקום הקוד המקורי
        const tokenHash = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await User.updateOne(
            { _id: user._id },
            {
                $set: {
                    resetPasswordTokenHash: tokenHash,
                    resetPasswordExpiresAt: expiresAt,
                },
            }
        );

        // בניית קישור לדף איפוס הסיסמה באתר
        const frontendUrl = process.env.FRONTEND_URL;
        if (!frontendUrl || !/^https?:\/\//.test(frontendUrl)) {
            throw new Error("FRONTEND_URL is not configured");
        }

        const resetUrl = new URL(
            "/reset-password",
            frontendUrl
        );

        resetUrl.searchParams.set("token", resetToken);

        // שליחת הקישור לאימייל הרשום
        await createMailer().sendMail({
            from: process.env.SMTP_FROM,
            to: user.email,
            subject: "איפוס סיסמה – UV נגרות חוץ",
            text:
                "שלום,\n\n" +
                "התקבלה בקשה לאיפוס הסיסמה שלך.\n" +
                "ליצירת סיסמה חדשה היכנסו לקישור:\n" +
                resetUrl.toString() +
                "\n\nהקישור תקף למשך 15 דקות ולשימוש חד־פעמי.\n" +
                "אם לא ביקשתם לשנות סיסמה, אפשר להתעלם מההודעה.",
        });

        return res.json({ message: successMessage });
    } catch (error) {
        // לא חושפים פרטי חשבון או קוד איפוס
        console.error("Password reset request failed:", error.message);

        return res.json({ message: successMessage });
    }
});

// בדיקת קישור איפוס ושמירת סיסמה חדשה
router.post("/reset-password", resetLimiter, async (req, res) => {
    const { error, value } = resetSchema.validate(req.body);

    if (error) {
        return res.status(400).json({
            message: "קישור או סיסמה לא תקינים",
        });
    }

    try {
        // יצירת גיבוב מקוד האיפוס שהתקבל
        const tokenHash = crypto
            .createHash("sha256")
            .update(value.token)
            .digest("hex");

        const now = new Date();

        // איתור משתמש שהקישור שלו עדיין בתוקף
        const user = await User.findOne({
            resetPasswordTokenHash: tokenHash,
            resetPasswordExpiresAt: { $gt: now },
        });

        if (!user) {
            return res.status(400).json({
                message: "קישור האיפוס אינו תקף או שפג תוקפו",
            });
        }

        // הצפנה חד-כיוונית של הסיסמה החדשה
        const newPasswordHash = await bcrypt.hash(
            value.password,
            12
        );

        // עדכון אטומי ומחיקת קוד האיפוס
        const result = await User.updateOne(
            {
                _id: user._id,
                resetPasswordTokenHash: tokenHash,
                resetPasswordExpiresAt: { $gt: new Date() },
            },
            {
                $set: { passwordHash: newPasswordHash },
                $unset: {
                    resetPasswordTokenHash: "",
                    resetPasswordExpiresAt: "",
                },
            }
        );

        if (result.modifiedCount !== 1) {
            return res.status(400).json({
                message: "קישור האיפוס כבר נוצל או שפג תוקפו",
            });
        }

        return res.json({
            message: "הסיסמה עודכנה בהצלחה. אפשר להתחבר מחדש.",
        });
    } catch (error) {
        console.error("Password reset failed:", error);

        return res.status(500).json({
            message: "אירעה שגיאה באיפוס הסיסמה",
        });
    }
});

module.exports = router;
