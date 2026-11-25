
const nodemailer = require("nodemailer");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "..", ".env"),
});

// =====================================
// חיבור לחשבון המייל
// =====================================

function createTransporter() {
    const email = process.env.SMTP_USER;
    const password = process.env.SMTP_APP_PASSWORD;

    if (!email || !password) {
        throw new Error("Email configuration is missing");
    }

    return nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: email,
            pass: password,
        },
    });
}

// =====================================
// שליחת מייל או הדמיה בפרויקט הגמר
// =====================================

async function sendWorkEmail({
    subject,
    text,
    attachments = [],
}) {

    // ברירת המחדל היא לא לשלוח מיילים.
    // שליחה אמיתית תתאפשר רק בהפעלה מפורשת.
    if (process.env.SEND_REAL_EMAILS !== "true") {
        console.log(
            "[FINAL PROJECT] Email sending disabled."
        );

        return {
            skipped: true,
            messageId: "not-sent-final-project",
            accepted: [],
            rejected: [],
        };
    }

    if (!process.env.WORK_EMAIL) {
        throw new Error("WORK_EMAIL is missing");
    }

    const transporter = createTransporter();

    const info = await transporter.sendMail({
        from: `"UV נגרות חוץ" <${process.env.SMTP_USER}>`,
        to: process.env.WORK_EMAIL,
        subject,
        text,
        attachments,
    });

    console.log("Work email sent:", info.messageId);

    return info;
}

module.exports = { sendWorkEmail };
