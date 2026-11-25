
"use strict";

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const { rateLimit } = require("express-rate-limit");

require("dotenv").config();

// חיבור מסד הנתונים
const connectDB = require("./config/db");

// נתיבי המערכת
const authRoutes = require("./routes/authRoutes");
const contactRoutes = require("./routes/contactRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const quoteRoutes = require("./routes/quoteRoutes");
const projectRoutes = require("./routes/projectRoutes");
const publicQuoteRoutes = require("./routes/publicQuoteRoutes");
const registerRoutes = require("./routes/registerRoutes");
const userFavoritesRoutes = require("./routes/userFavoritesRoutes");
const userAuthRoutes = require("./routes/userAuthRoutes");
const adminUsersRoutes = require("./routes/adminUsersRoutes");
const promotedAdminAuthRoutes = require("./routes/promotedAdminAuthRoutes");

// נתיבי הפרופיל האישי
const userProfileRoutes = require("./routes/userProfileRoutes");

const app = express();

connectDB();

// הגבלת בקשות במהלך 24 שעות
const envDailyLimit = Number(process.env.API_DAILY_LIMIT);
const dailyLimit =
    Number.isInteger(envDailyLimit) && envDailyLimit > 0
        ? envDailyLimit
        : 2000;

const dailyLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    limit: dailyLimit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many requests. Please try again later.",
    },
});

// הגבלת כמות בקשות בדקה
const minuteLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many requests per minute.",
    },
});

// הגדרות כלליות
app.use(cors());
app.use(morgan("dev"));

// הגבלת בקשות לכל נתיבי ה-API
app.use("/api", minuteLimiter, dailyLimiter);

// קבלת נתוני JSON
app.use(express.json());

// יצירת תיקייה לשמירת תמונות פרופיל
const profilesDir = path.join(__dirname, "uploads", "profiles");
fs.mkdirSync(profilesDir, { recursive: true });

// הצגת תמונות פרופיל בלבד
app.use(
    "/uploads/profiles",
    express.static(profilesDir, {
        index: false,
        dotfiles: "deny",
        fallthrough: false,
        setHeaders: (res) => {
            res.setHeader("X-Content-Type-Options", "nosniff");
        },
    })
);

// נתיבי הצעות מחיר והעלאת קבצים
app.use("/api/quotes", quoteRoutes);
app.use("/api/uploads", uploadRoutes);

// ניהול משתמשים – מנהלים בלבד
app.use("/api/admin/users", adminUsersRoutes);

// התחברות מנהלים
app.use("/api/auth", promotedAdminAuthRoutes);
app.use("/api/auth", authRoutes);

// פניות ופרויקטים
app.use("/api/contact", contactRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/public/quotes", publicQuoteRoutes);

// הרשמת משתמשים ומועדפים
app.use("/api/register", registerRoutes);
app.use("/api/user-favorites", userFavoritesRoutes);

// פרופיל המשתמש המחובר
app.use("/api/users/profile", userProfileRoutes);

// התחברות ואיפוס סיסמה למשתמשים
app.use("/api/users", userAuthRoutes);

// בדיקת פעילות השרת
app.get("/", (req, res) => {
    res.send("OUTDOORDESIGN server is working!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
});
