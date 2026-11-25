
const express = require("express");
const mongoose = require("mongoose");
const Joi = require("joi");
const crypto = require("crypto");

const Quote = require("../models/Quote");
const requireAdmin = require("../middleware/requireAdmin");
const { sendWorkEmail } = require("../services/emailService");

const router = express.Router();

// כל הפעולות בקובץ הזה מיועדות למנהל בלבד
router.use(requireAdmin);

// ======================================
// הכנת פרטי הצעת מחיר למייל
// ======================================

function formatPrice(value) {
    return Number(value || 0).toLocaleString("he-IL", {
        maximumFractionDigits: 2,
    });
}

function buildQuoteEmail(quote, adminLink) {
    const items = Array.isArray(quote.items)
        ? quote.items
        : [];

    let pricingDetails = "";

    if (quote.pricingMode === "manual") {
        pricingDetails =
            "מחיר גלובלי: " +
            formatPrice(quote.manualPrice) +
            " ש״ח";
    } else {
        pricingDetails = items.length
            ? items.map((item, index) => {
                const quantity = Number(item.quantity);
                const unitPrice = Number(item.unitPrice);

                return (
                    `${index + 1}. ${item.description}\n` +
                    `כמות: ${quantity} ${item.unit || "יחידה"}\n` +
                    `מחיר ליחידה: ${formatPrice(unitPrice)} ש״ח\n` +
                    `סכום שורה: ${formatPrice(quantity * unitPrice)} ש״ח`
                );
            }).join("\n\n")
            : "לא הוזנו פריטים";
    }

    return `
נוצר קישור לשיתוף הצעת מחיר באתר UV נגרות חוץ!

פרטי הלקוח:
שם: ${quote.customerName}
טלפון: ${quote.customerPhone || "לא צוין"}
מייל: ${quote.customerEmail || "לא צוין"}

פרטי הפרויקט:
שם הפרויקט: ${quote.projectTitle}
כתובת: ${quote.projectAddress || "לא צוינה"}

פרטי התמחור:
${pricingDetails}

מחירים כוללים מע״מ: ${quote.priceIncludesVat ? "כן" : "לא"}
אחוז מע״מ: ${quote.vatPercent}%

הערות:
${quote.notes || "אין הערות"}

${quote.validUntil
            ? "תוקף ההצעה: " +
            new Date(quote.validUntil).toLocaleDateString("he-IL")
            : ""}

לצפייה בהצעה במערכת הניהול:
${adminLink}

----------------------------

זוהי התראה אוטומטית על יצירת קישור לשיתוף.
יש לוודא שהקישור אכן נשלח ללקוח.

UV נגרות חוץ
  `;
}

// ======================================
// בדיקת תקינות של חומר או עבודה
// ======================================

const itemSchema = Joi.object({
    description: Joi.string()
        .trim()
        .min(2)
        .required(),

    type: Joi.string()
        .valid("material", "labor", "other")
        .default("material"),

    quantity: Joi.number()
        .min(0)
        .required(),

    unit: Joi.string()
        .trim()
        .allow("")
        .default("יחידה"),

    unitPrice: Joi.number()
        .min(0)
        .required(),
});

// ======================================
// בדיקת תקינות של הצעת מחיר
// ======================================

const quoteSchema = Joi.object({
    customerName: Joi.string()
        .trim()
        .min(2)
        .required(),

    customerPhone: Joi.string()
        .trim()
        .allow("")
        .default(""),

    customerEmail: Joi.string()
        .trim()
        .email()
        .allow("")
        .default(""),

    projectAddress: Joi.string()
        .trim()
        .allow("")
        .default(""),

    projectTitle: Joi.string()
        .trim()
        .min(2)
        .required(),

    items: Joi.array()
        .items(itemSchema)
        .default([]),

    pricingMode: Joi.string()
        .valid("items", "manual")
        .default("items"),

    manualPrice: Joi.number()
        .min(0)
        .allow(null)
        .default(null),

    priceIncludesVat: Joi.boolean()
        .default(true),

    showQuantities: Joi.boolean()
        .default(true),

    showItemPrices: Joi.boolean()
        .default(false),

    vatPercent: Joi.number()
        .min(0)
        .max(100)
        .default(18),

    notes: Joi.string()
        .allow("")
        .default(""),

    validUntil: Joi.date()
        .iso()
        .allow(null),
});

// ======================================
// יצירת הצעת מחיר חדשה
// POST /api/quotes
// ======================================

router.post("/", async (req, res) => {
    try {
        const { error, value } = quoteSchema.validate(
            req.body,
            { abortEarly: false }
        );

        if (error) {
            return res.status(400).json({
                message: "Invalid quote details",
                errors: error.details.map(
                    (item) => item.message
                ),
            });
        }

        const quote = await Quote.create({
            ...value,
            status: "draft",
        });

        return res.status(201).json(quote);

    } catch (error) {
        console.error("Error creating quote:", error);

        return res.status(500).json({
            message: "Error creating quote",
        });
    }
});

// ======================================
// הצגת כל הצעות המחיר
// GET /api/quotes
// ======================================

router.get("/", async (req, res) => {
    try {
        const quotes = await Quote.find()
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json(quotes);

    } catch (error) {
        console.error("Error getting quotes:", error);

        return res.status(500).json({
            message: "Error getting quotes",
        });
    }
});

// ======================================
// הצגת הצעת מחיר מסוימת
// GET /api/quotes/:id
// ======================================

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid quote ID",
            });
        }

        // החתימה גלויה רק למנהל מחובר
        const quote = await Quote.findById(id)
            .select("+customerSignature");

        if (!quote) {
            return res.status(404).json({
                message: "Quote not found",
            });
        }

        return res.status(200).json(quote);

    } catch (error) {
        console.error("Error getting quote:", error);

        return res.status(500).json({
            message: "Error getting quote",
        });
    }
});

// ======================================
// עריכת הצעת מחיר קיימת
// PUT /api/quotes/:id
// ======================================

router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid quote ID",
            });
        }

        const updateSchema = quoteSchema
            .fork(
                ["customerName", "projectTitle"],
                (schema) => schema.optional()
            )
            .min(1);

        const { error, value } = updateSchema.validate(
            req.body,
            {
                abortEarly: false,
                noDefaults: true,
            }
        );

        if (error) {
            return res.status(400).json({
                message: "Invalid quote details",
                errors: error.details.map(
                    (item) => item.message
                ),
            });
        }

        // ניתן לערוך רק טיוטות
        const quote = await Quote.findOneAndUpdate(
            {
                _id: id,
                status: "draft",
            },
            {
                $set: value,
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!quote) {
            return res.status(404).json({
                message: "Quote not found or not editable",
            });
        }

        return res.status(200).json(quote);

    } catch (error) {
        console.error("Error updating quote:", error);

        return res.status(500).json({
            message: "Error updating quote",
        });
    }
});

// ======================================
// יצירת קישור מאובטח להצעת מחיר
// POST /api/quotes/:id/share
// ======================================

router.post("/:id/share", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid quote ID",
            });
        }

        const quote = await Quote.findById(id);

        if (!quote) {
            return res.status(404).json({
                message: "Quote not found",
            });
        }

        // רק טיוטה או הצעה שנשלחה
        if (!["draft", "sent"].includes(quote.status)) {
            return res.status(409).json({
                message: "This quote cannot be shared",
            });
        }

        // שולחים התראה רק במעבר הראשון מטיוטה
        const isFirstShare = quote.status === "draft";

        // בדיקת המחיר לפי סוג ההצעה
        if (quote.pricingMode === "manual") {

            const manualPrice = Number(quote.manualPrice);

            if (
                quote.manualPrice == null ||
                !Number.isFinite(manualPrice) ||
                manualPrice <= 0
            ) {
                return res.status(400).json({
                    message:
                        "יש לשמור מחיר גלובלי גדול מ-0 לפני יצירת הקישור",
                });
            }

        } else {

            const items = Array.isArray(quote.items)
                ? quote.items
                : [];

            const subtotal = items.reduce(
                (sum, item) => {
                    const quantity = Number(item.quantity);
                    const unitPrice = Number(item.unitPrice);

                    if (
                        !Number.isFinite(quantity) ||
                        !Number.isFinite(unitPrice) ||
                        quantity < 0 ||
                        unitPrice < 0
                    ) {
                        return NaN;
                    }

                    return sum + quantity * unitPrice;
                },
                0
            );

            if (
                items.length === 0 ||
                !Number.isFinite(subtotal) ||
                subtotal <= 0
            ) {
                return res.status(400).json({
                    message:
                        "יש להוסיף עבודות עם מחירים תקינים לפני יצירת הקישור",
                });
            }
        }

        const now = new Date();

        // בדיקת תוקף ההצעה
        if (
            quote.validUntil &&
            quote.validUntil <= now
        ) {
            return res.status(400).json({
                message: "The quote has expired",
            });
        }

        // יצירת מזהה אקראי
        const token = crypto
            .randomBytes(32)
            .toString("hex");

        // שמירת גיבוב בלבד
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // תוקף מרבי: 30 ימים
        const maxExpiration = new Date(
            now.getTime() +
            30 * 24 * 60 * 60 * 1000
        );

        const expiresAt =
            quote.validUntil &&
                quote.validUntil < maxExpiration
                ? quote.validUntil
                : maxExpiration;

        // עדכון ההצעה
        quote.shareTokenHash = tokenHash;
        quote.shareTokenExpiresAt = expiresAt;
        quote.status = "sent";
        quote.sentAt = now;

        await quote.save();

        // בניית הקישור ללקוח
        const frontendUrl = (
            process.env.FRONTEND_URL ||
            "http://localhost:5173"
        ).replace(/\/+$/, "");

        const shareLink =
            frontendUrl + "/quote/view/" + token;

        // ======================================
        // התראת מייל ליובל על יצירת קישור
        // ======================================

        if (isFirstShare) {
            const adminLink =
                frontendUrl + "/admin/quotes/" + quote._id;

            sendWorkEmail({
                subject:
                    "נוצר קישור לשיתוף הצעת מחיר - " +
                    quote.customerName,

                text: buildQuoteEmail(quote, adminLink),
            })
                .then(() => {
                    console.log(
                        "Quote notification email sent:",
                        quote._id.toString()
                    );
                })
                .catch((emailError) => {
                    console.error(
                        "Error sending quote notification:",
                        emailError
                    );
                });
        }

        return res.status(200).json({
            message: "Share link created successfully",
            link: shareLink,
            expiresAt,
        });

    } catch (error) {
        console.error("Error creating share link:", error);

        return res.status(500).json({
            message: "Error creating share link",
        });
    }
});

// =====================================
// הורדת PDF חתום - למנהל בלבד
// GET /api/quotes/:id/signed-pdf
// =====================================

router.get("/:id/signed-pdf", async (req, res) => {
    try {
        const { id } = req.params;

        // בדיקת מזהה הצעת המחיר
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid quote ID",
            });
        }

        // מציאת ההצעה וקובץ ה-PDF שלה
        const quote = await Quote.findById(id)
            .select("+signedPdfFileId");

        if (!quote) {
            return res.status(404).json({
                message: "Quote not found",
            });
        }

        // רק הצעות שאושרו
        if (quote.status !== "approved") {
            return res.status(409).json({
                message: "Quote is not approved",
            });
        }

        if (!quote.signedPdfFileId) {
            return res.status(404).json({
                message: "Signed PDF not available",
            });
        }

        const database = mongoose.connection.db;

        if (!database) {
            return res.status(503).json({
                message: "Database is not connected",
            });
        }

        // חיבור ל-GridFS
        const bucket = new mongoose.mongo.GridFSBucket(
            database,
            {
                bucketName: "signedQuotePdfs",
            }
        );

        // בדיקה שהקובץ באמת קיים
        const file = await bucket
            .find({ _id: quote.signedPdfFileId })
            .next();

        if (!file) {
            return res.status(404).json({
                message: "Signed PDF file not found",
            });
        }

        // הגדרות הורדת הקובץ
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition":
                `attachment; filename="UV-Signed-Quote-${quote._id}.pdf"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        });

        // הורדה ישירות מתוך MongoDB
        const downloadStream = bucket.openDownloadStream(
            quote.signedPdfFileId
        );

        downloadStream.on("error", (error) => {
            console.error(
                "Error downloading signed PDF:",
                error
            );

            if (!res.headersSent) {
                res.status(500).json({
                    message: "Error downloading signed PDF",
                });
            } else {
                res.destroy(error);
            }
        });

        res.on("close", () => {
            downloadStream.destroy();
        });

        downloadStream.pipe(res);

    } catch (error) {
        console.error(
            "Error getting signed PDF:",
            error
        );

        if (!res.headersSent) {
            return res.status(500).json({
                message: "Error getting signed PDF",
            });
        }

        res.destroy(error);
    }
});

module.exports = router;
