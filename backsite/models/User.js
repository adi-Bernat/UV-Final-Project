
"use strict";

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        // שם המשתמש
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },

        // כתובת האימייל
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        // סיסמה שמורה כ-Hash בלבד
        passwordHash: {
            type: String,
            required: true,
            select: false,
        },

        // הרשאת המשתמש במערכת
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },

        // נתיב תמונת הפרופיל בשרת
        profileImage: {
            type: String,
            default: "",
        },

        // גיבוב של קוד איפוס הסיסמה
        resetPasswordTokenHash: {
            type: String,
            select: false,
        },

        // מועד תפוגת קישור איפוס הסיסמה
        resetPasswordExpiresAt: {
            type: Date,
            select: false,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);
