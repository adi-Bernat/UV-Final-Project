
"use strict";

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

// בדיקה שהמשתמש מחובר ומזוהה
async function requireUser(req, res, next) {
    const authorization = req.headers.authorization;

    // בדיקת קיום טוקן התחברות
    if (!authorization?.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "נדרשת התחברות למערכת",
        });
    }

    // בדיקת הגדרות השרת
    if (!process.env.USER_JWT_SECRET) {
        return res.status(500).json({
            message: "שגיאה בהגדרות השרת",
        });
    }

    try {
        // אימות הטוקן מול המפתח הסודי
        const token = authorization.slice(7).trim();

        const decoded = jwt.verify(
            token,
            process.env.USER_JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        // בדיקת סוג החשבון ומזהה המשתמש
        if (
            !decoded ||
            typeof decoded !== "object" ||
            decoded.role !== "user" ||
            typeof decoded.sub !== "string" ||
            !mongoose.isValidObjectId(decoded.sub)
        ) {
            return res.status(401).json({
                message: "טוקן התחברות לא תקין",
            });
        }

        // בדיקה שהמשתמש עדיין קיים במסד הנתונים
        const user = await User.findById(decoded.sub);

        if (!user) {
            return res.status(401).json({
                message: "המשתמש לא נמצא",
            });
        }

        // שמירת המשתמש המאומת בבקשה
        req.user = user;
        req.userId = user._id.toString();

        next();
    } catch (error) {
        // טיפול בטוקן לא תקין או שפג תוקפו
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                message: "פג תוקף ההתחברות. יש להתחבר מחדש.",
            });
        }

        console.error("שגיאה באימות משתמש:", error);

        return res.status(500).json({
            message: "שגיאה באימות המשתמש",
        });
    }
}

module.exports = requireUser;
