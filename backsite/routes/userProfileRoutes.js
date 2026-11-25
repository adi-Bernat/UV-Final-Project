
"use strict";

const express = require("express");
const Joi = require("joi");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const User = require("../models/User");
const requireUser = require("../middleware/requireUser");

const router = express.Router();

// כל הפעולות מחייבות משתמש מחובר
router.use(requireUser);

// יצירת תיקייה לשמירת תמונות הפרופיל
const uploadDir = path.join(__dirname, "../uploads/profiles");
fs.mkdirSync(uploadDir, { recursive: true });

// בדיקת פרטים אישיים
const profileSchema = Joi.object({
    name: Joi.string().trim().min(2).max(80),
    email: Joi.string().trim().lowercase().email().max(254),
}).min(1).unknown(false);

// הגדרת שמירת התמונות בזיכרון לפני בדיקה
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024 },
}).single("profileImage");

// החזרת פרטי המשתמש ללא מידע רגיש
function publicProfile(user) {
    return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        profileImage: user.profileImage || "",
    };
}

// קבלת פרטי המשתמש המחובר
router.get("/", (req, res) => {
    return res.json(publicProfile(req.user));
});

// עדכון שם ואימייל
router.patch("/", async (req, res) => {
    const { error, value } = profileSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            message: "פרטי המשתמש אינם תקינים",
        });
    }

    try {
        // שינוי של החשבון המחובר בלבד
        const user = await User.findByIdAndUpdate(
            req.userId,
            { $set: value },
            { new: true, runValidators: true }
        );

        return res.json(publicProfile(user));
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "כתובת האימייל כבר קיימת",
            });
        }
        return res.status(500).json({
            message: "לא ניתן לעדכן את הפרופיל",
        });
    }
});

// העלאת תמונת פרופיל
router.post("/image", (req, res) => {
    upload(req, res, async (error) => {
        if (error) {
            return res.status(400).json({
                message: "התמונה גדולה מדי או שההעלאה נכשלה",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "לא נבחרה תמונה",
            });
        }

        // בדיקת חתימת הקובץ ולא רק הסיומת
        const file = req.file.buffer;
        const isJpeg =
            file.length >= 3 &&
            file[0] === 0xff &&
            file[1] === 0xd8 &&
            file[2] === 0xff;

        const isPng =
            file.length >= 8 &&
            file.subarray(0, 8).equals(
                Buffer.from("89504e470d0a1a0a", "hex")
            );

        const isWebp =
            file.length >= 12 &&
            file.toString("ascii", 0, 4) === "RIFF" &&
            file.toString("ascii", 8, 12) === "WEBP";

        if (!isJpeg && !isPng && !isWebp) {
            return res.status(400).json({
                message: "ניתן להעלות תמונות JPG, PNG או WebP בלבד",
            });
        }

        const extension = isJpeg ? ".jpg" : isPng ? ".png" : ".webp";
        const filename = crypto.randomUUID() + extension;
        const filePath = path.join(uploadDir, filename);

        try {
            // שמירת התמונה בתיקייה מקומית
            await fs.promises.writeFile(filePath, file, { flag: "wx" });

            // שמירת נתיב התמונה במסד הנתונים
            const user = await User.findByIdAndUpdate(
                req.userId,
                { $set: { profileImage: "/uploads/profiles/" + filename } },
                { new: true }
            );

            if (!user) {
                await fs.promises.unlink(filePath);
                return res.status(404).json({ message: "המשתמש לא נמצא" });
            }

            return res.json(publicProfile(user));
        } catch (err) {
            await fs.promises.unlink(filePath).catch(() => { });
            console.error("שגיאה בהעלאת תמונה:", err);
            return res.status(500).json({
                message: "לא הצלחנו לשמור את התמונה",
            });
        }
    });
});

module.exports = router;
