
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

const folders = new Set([
    "pergolas",
    "decks",
    "fences",
    "storage",
    "deck-renovation",
    "sauna-renovation",
    "suntuf",
]);

const imageExtensions = new Set([
    ".jpg", ".jpeg", ".png", ".webp"
]);

const videoExtensions = new Set([
    ".mp4", ".webm"
]);

const allowedExtensions = new Set([
    ...imageExtensions,
    ...videoExtensions,
]);

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        const folder = path.join(
            __dirname,
            "..",
            "..",
            "frontsite",
            "public",
            "projects",
            req.params.category
        );

        fs.mkdir(folder, { recursive: true }, (error) => {
            callback(error, folder);
        });
    },

    filename: (req, file, callback) => {
        const extension = path.extname(
            file.originalname
        ).toLowerCase();

        callback(null, randomUUID() + extension);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 40 * 1024 * 1024,
        files: 10,
    },
    fileFilter: (req, file, callback) => {
        const extension = path.extname(
            file.originalname
        ).toLowerCase();

        if (!allowedExtensions.has(extension)) {
            return callback(
                new Error("File type not allowed")
            );
        }

        callback(null, true);
    },
}).array("files", 10);

// בדיקת חתימת הקובץ, ולא רק הסיומת
async function isValidMedia(file) {
    const extension = path.extname(
        file.filename
    ).toLowerCase();

    const handle = await fs.promises.open(file.path, "r");
    const bytes = Buffer.alloc(16);

    try {
        await handle.read(bytes, 0, 16, 0);
    } finally {
        await handle.close();
    }

    if (extension === ".jpg" || extension === ".jpeg") {
        return bytes.subarray(0, 3).equals(
            Buffer.from([0xff, 0xd8, 0xff])
        );
    }

    if (extension === ".png") {
        return bytes.subarray(0, 8).equals(
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
        );
    }

    if (extension === ".webp") {
        return (
            bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP"
        );
    }

    if (extension === ".mp4") {
        return bytes.toString("ascii", 4, 8) === "ftyp";
    }

    if (extension === ".webm") {
        return bytes.subarray(0, 4).equals(
            Buffer.from([0x1a, 0x45, 0xdf, 0xa3])
        );
    }

    return false;
}

// העלאת קבצים - למנהל בלבד
router.post("/:category", requireAdmin, (req, res) => {
    const category = req.params.category;

    if (!folders.has(category)) {
        return res.status(400).json({
            message: "Invalid category",
        });
    }

    upload(req, res, async (error) => {
        if (error) {
            return res.status(400).json({
                message: error.message,
            });
        }

        const files = req.files || [];

        if (files.length === 0) {
            return res.status(400).json({
                message: "No files selected",
            });
        }

        try {
            const checks = await Promise.all(
                files.map(isValidMedia)
            );

            if (checks.some((valid) => !valid)) {
                await Promise.all(
                    files.map((file) =>
                        fs.promises.unlink(file.path).catch(() => { })
                    )
                );

                return res.status(400).json({
                    message: "Invalid media file",
                });
            }

            const images = [];
            const videos = [];

            for (const file of files) {
                const extension = path.extname(
                    file.filename
                ).toLowerCase();

                const url =
                    "/projects/" + category + "/" + file.filename;

                if (imageExtensions.has(extension)) {
                    images.push(url);
                } else if (videoExtensions.has(extension)) {
                    videos.push(url);
                }
            }

            res.status(201).json({
                message: "Files uploaded successfully",
                images,
                videos,
            });
        } catch (err) {
            console.error("Upload error:", err);

            await Promise.all(
                files.map((file) =>
                    fs.promises.unlink(file.path).catch(() => { })
                )
            );

            res.status(500).json({
                message: "Error uploading files",
            });
        }
    });
});

module.exports = router;
