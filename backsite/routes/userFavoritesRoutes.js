
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Project = require("../models/Project");
const UserFavorite = require("../models/UserFavorite");

const router = express.Router();

// בדיקת התחברות של משתמש רגיל
router.use((req, res, next) => {
    const authorization =
        req.headers.authorization || "";

    const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({
            message: "יש להתחבר כדי לגשת למועדפים",
        });
    }

    if (!process.env.USER_JWT_SECRET) {
        return res.status(500).json({
            message: "שגיאה בהגדרות השרת",
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.USER_JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        if (
            typeof decoded !== "object" ||
            decoded.role !== "user" ||
            !mongoose.isValidObjectId(decoded.sub)
        ) {
            return res.status(401).json({
                message: "ההתחברות אינה תקינה",
            });
        }

        req.userId = decoded.sub;
        next();
    } catch {
        return res.status(401).json({
            message: "פג תוקף ההתחברות. יש להתחבר מחדש.",
        });
    }
});

// קבלת המועדפים של המשתמש המחובר
router.get("/", async (req, res) => {
    try {
        const document = await UserFavorite.findOne({
            userId: req.userId,
        });

        const favoriteIds = document
            ? document.projectIds.map((id) => id.toString())
            : [];

        res.json({ favoriteIds });
    } catch (error) {
        console.error("Load favorites error:", error);

        res.status(500).json({
            message: "לא ניתן לטעון את המועדפים",
        });
    }
});

// הוספת פרויקט למועדפים
router.post("/:projectId", async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!mongoose.isValidObjectId(projectId)) {
            return res.status(400).json({
                message: "מזהה הפרויקט אינו תקין",
            });
        }

        const projectExists = await Project.exists({
            _id: projectId,
        });

        if (!projectExists) {
            return res.status(404).json({
                message: "הפרויקט לא נמצא",
            });
        }

        await UserFavorite.findOneAndUpdate(
            { userId: req.userId },
            {
                $addToSet: {
                    projectIds: projectId,
                },
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            }
        );

        res.json({
            message: "הפרויקט נוסף למועדפים",
        });
    } catch (error) {
        console.error("Add favorite error:", error);

        res.status(500).json({
            message: "לא ניתן להוסיף את הפרויקט למועדפים",
        });
    }
});

// הסרת פרויקט מהמועדפים
router.delete("/:projectId", async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!mongoose.isValidObjectId(projectId)) {
            return res.status(400).json({
                message: "מזהה הפרויקט אינו תקין",
            });
        }

        await UserFavorite.updateOne(
            { userId: req.userId },
            {
                $pull: {
                    projectIds: projectId,
                },
            }
        );

        res.json({
            message: "הפרויקט הוסר מהמועדפים",
        });
    } catch (error) {
        console.error("Remove favorite error:", error);

        res.status(500).json({
            message: "לא ניתן להסיר את הפרויקט מהמועדפים",
        });
    }
});

module.exports = router;
