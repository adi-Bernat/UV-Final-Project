
const express = require("express");
const Joi = require("joi");

const ContactMessage = require("../models/ContactMessage");
const requireAdmin = require("../middleware/requireAdmin");

// שירות שליחת מיילים
const { sendWorkEmail } = require("../services/emailService");

const router = express.Router();

// בדיקת תקינות הנתונים שמגיעים מהטופס
const contactSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),

    phone: Joi.string()
        .trim()
        .pattern(/^\+?[0-9][0-9 -]{7,18}$/)
        .required(),

    message: Joi.string().trim().min(5).max(2000).required(),
});

// =====================================
// שמירת פנייה חדשה + שליחת מייל ליובל
// =====================================

router.post("/", async (req, res) => {
    try {
        const { error, value } = contactSchema.validate(req.body, {
            abortEarly: false,
        });

        if (error) {
            return res.status(400).json({
                message: "Invalid contact details",
                errors: error.details.map((item) => item.message),
            });
        }

        // שמירת הפנייה במערכת
        const newMessage = new ContactMessage(value);

        await newMessage.save();

        console.log("Contact message saved:", newMessage._id);

        // שליחת התראה למייל של יובל
        try {
            await sendWorkEmail({
                subject: "פנייה חדשה מאתר UV נגרות חוץ",

                text: `
התקבלה פנייה חדשה באתר UV נגרות חוץ!

שם הלקוח:
${value.name}

מספר טלפון:
${value.phone}

תיאור העבודה:
${value.message}

--------------------------

הפנייה נשמרה גם במערכת הניהול של האתר.

UV נגרות חוץ
        `,
            });

            console.log("Contact notification email sent successfully");

        } catch (emailError) {
            // אם המייל נכשל, הפנייה עדיין נשמרת באתר
            console.error(
                "Error sending contact notification email:",
                emailError
            );
        }

        return res.status(201).json({
            message: "Contact message saved successfully",
            id: newMessage._id,
        });

    } catch (error) {
        console.error("Error saving contact message:", error);

        return res.status(500).json({
            message: "Error saving contact message",
        });
    }
});


// =====================================
// הצגת כל הפניות - למנהל בלבד
// =====================================

router.get("/", requireAdmin, async (req, res) => {
    try {
        const messages = await ContactMessage.find()
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(messages);

    } catch (error) {
        console.error("Error getting contact messages:", error);

        res.status(500).json({
            message: "Error getting contact messages",
        });
    }
});


// =====================================
// עדכון סטטוס של פנייה - למנהל בלבד
// =====================================

router.patch("/:id/status", requireAdmin, async (req, res) => {
    try {
        const schema = Joi.object({
            status: Joi.string()
                .valid("new", "in-progress", "completed")
                .required(),
        });

        const { error, value } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({
                message: "Invalid status",
            });
        }

        if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            return res.status(400).json({
                message: "Invalid message ID",
            });
        }

        const updatedMessage = await ContactMessage.findByIdAndUpdate(
            req.params.id,
            { $set: { status: value.status } },
            { new: true, runValidators: true }
        );

        if (!updatedMessage) {
            return res.status(404).json({
                message: "Message not found",
            });
        }

        res.status(200).json(updatedMessage);

    } catch (error) {
        console.error("Error updating status:", error);

        res.status(500).json({
            message: "Error updating status",
        });
    }
});


// =====================================
// מחיקת פנייה - למנהל בלבד
// =====================================

router.delete("/:id", requireAdmin, async (req, res) => {
    try {
        if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            return res.status(400).json({
                message: "Invalid message ID",
            });
        }

        const deletedMessage = await ContactMessage.findByIdAndDelete(
            req.params.id
        );

        if (!deletedMessage) {
            return res.status(404).json({
                message: "Message not found",
            });
        }

        res.status(200).json({
            message: "Message deleted successfully",
        });

    } catch (error) {
        console.error("Error deleting message:", error);

        res.status(500).json({
            message: "Error deleting message",
        });
    }
});

module.exports = router;
