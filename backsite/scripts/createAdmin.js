
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Admin = require("../models/Admin");

async function createAdmin() {
    try {
        const email = (
            process.env.SETUP_ADMIN_EMAIL || ""
        ).trim().toLowerCase();

        const password = process.env.SETUP_ADMIN_PASSWORD || "";

        const mongoUri =
            process.env.MONGO_URI ||
            process.env.MONGODB_URI ||
            process.env.MONGO_URL;

        if (!mongoUri) {
            throw new Error(
                "MongoDB address not found. Check the environment variable in server.js."
            );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("Please enter a valid email.");
        }

        if (password.length < 12) {
            throw new Error("Password must contain at least 12 characters.");
        }

        await mongoose.connect(mongoUri);

        // מאפשר יצירת מנהל ראשון בלבד
        const existingAdmin = await Admin.exists({});

        if (existingAdmin) {
            console.log("An admin already exists. No new admin created.");
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await Admin.create({
            email,
            passwordHash,
            role: "admin",
        });

        console.log("Admin created successfully!");
    } catch (error) {
        console.error("Admin setup failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

createAdmin();
