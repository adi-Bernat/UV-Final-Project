
const express = require("express");
const crypto = require("crypto");

const Quote = require("../models/Quote");

const { createSignedQuotePdf } = require("../services/quotePdfService");
const { saveSignedQuotePdf } = require("../services/quotePdfStorage");
const { sendWorkEmail } = require("../services/emailService");

const router = express.Router();

const roundMoney = (value) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

const approvalStatement =
    "קראתי את פרטי הצעת המחיר ואת התנאים המופיעים בה, ואני מאשר/ת את ההצעה בחתימתי.";

function hashToken(token) {
    if (
        typeof token !== "string" ||
        !/^[a-f0-9]{64}$/i.test(token)
    ) {
        return null;
    }

    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

function activeQuoteFilter(tokenHash, now) {
    return {
        shareTokenHash: tokenHash,
        shareTokenExpiresAt: { $gt: now },
        $or: [
            { validUntil: null },
            { validUntil: { $gt: now } },
        ],
    };
}

// =====================================
// יצירת PDF, שמירתו ושליחתו למייל
// =====================================

async function sendApprovedQuoteNotification(quote, token) {
    const frontendUrl = (
        process.env.FRONTEND_URL ||
        "http://localhost:5173"
    ).replace(/\/+$/, "");

    const adminLink =
        frontendUrl + "/admin/quotes/" + quote._id;

    const approvalDate = new Date(
        quote.approvedAt
    ).toLocaleString("he-IL", {
        timeZone: "Asia/Jerusalem",
    });

    let attachments = [];
    let pdfFailed = false;
    let storageFailed = false;

    try {
        // 1. יצירת PDF מההצעה החתומה
        const pdfBuffer = await createSignedQuotePdf(token);

        if (
            !Buffer.isBuffer(pdfBuffer) ||
            pdfBuffer.subarray(0, 5).toString() !== "%PDF-"
        ) {
            throw new Error("Invalid PDF generated");
        }

        console.log(
            "Signed quote PDF created:",
            quote._id.toString()
        );

        // 2. שמירת ה-PDF ב-MongoDB GridFS
        try {
            const savedFileId = await saveSignedQuotePdf(
                quote._id,
                pdfBuffer
            );

            console.log(
                "Signed PDF saved in MongoDB:",
                savedFileId.toString()
            );
        } catch (storageError) {
            storageFailed = true;

            // כשל בשמירה לא מונע שליחת מייל
            console.error(
                "Error saving signed PDF in MongoDB:",
                storageError
            );
        }

        // 3. הכנת ה-PDF לצירוף למייל
        attachments = [
            {
                filename: `UV-Signed-Quote-${quote._id}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
            },
        ];

    } catch (pdfError) {
        pdfFailed = true;

        console.error(
            "Error generating signed quote PDF:",
            pdfError
        );
    }

    // =====================================
    // תוכן המייל
    // =====================================

    const emailText = `
שלום יובל,

התקבלה חתימה חדשה על הצעת מחיר באתר UV נגרות חוץ!

פרטי ההצעה:

שם הלקוח: ${quote.customerName}
שם הפרויקט: ${quote.projectTitle}

שם החותם/ת: ${quote.approvedByName}
תאריך האישור: ${approvalDate}

סטטוס: ההצעה אושרה ונחתמה.

${pdfFailed
            ? "שימו לב: לא הצלחנו להפיק את קובץ ה-PDF. יש לבדוק את ההצעה במערכת הניהול."
            : "מצורף למייל קובץ PDF של הצעת המחיר החתומה."}

${storageFailed
            ? "אזהרה: ה-PDF צורף למייל אך לא נשמר במסד הנתונים. יש לבדוק את התקלה בשרת."
            : ""}

לצפייה במערכת הניהול:
${adminLink}

-------------------------------

UV נגרות חוץ
`;

    // =====================================
    // 4. שליחת המייל ליובל
    // =====================================

    try {
        await sendWorkEmail({
            subject: pdfFailed
                ? `הצעה אושרה - נדרשת בדיקת PDF - ${quote.customerName}`
                : `הצעת מחיר אושרה ונחתמה - ${quote.customerName}`,
            text: emailText,
            attachments,
        });

        console.log(
            "Approved quote email sent:",
            quote._id.toString()
        );
    } catch (emailError) {
        console.error(
            "Error sending approved quote email:",
            emailError
        );
    }
}

// =====================================
// הגדרות אבטחה
// =====================================

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");
    next();
});

// =====================================
// צפייה בהצעת מחיר דרך קישור אישי
// =====================================

router.get("/:token", async (req, res) => {
    try {
        const tokenHash = hashToken(req.params.token);

        if (!tokenHash) {
            return res.status(404).json({
                message: "Quote not found",
            });
        }

        const now = new Date();

        const quote = await Quote.findOne({
            ...activeQuoteFilter(tokenHash, now),
            status: { $in: ["sent", "approved"] },
        })
            .select(
                "customerName projectTitle projectAddress " +
                "items vatPercent notes showItemPrices sentAt " +
                "validUntil shareTokenExpiresAt status approvedAt " +
                "approvedByName pricingMode manualPrice " +
                "priceIncludesVat showQuantities +customerSignature"
            )
            .lean();

        if (!quote) {
            return res.status(404).json({
                message: "Quote not found or link expired",
            });
        }

        // =====================================
        // חישוב המחירים - גלובלי או מפורט
        // =====================================

        const pricingMode =
            quote.pricingMode === "manual"
                ? "manual"
                : "items";

        const priceIncludesVat =
            quote.priceIncludesVat !== false;

        const vatPercent = Number(
            quote.vatPercent ?? 18
        );

        const vatRate = vatPercent / 100;

        const quoteItems = Array.isArray(quote.items)
            ? quote.items
            : [];

        const basePrice =
            pricingMode === "manual"
                ? Number(quote.manualPrice ?? 0)
                : quoteItems.reduce(
                    (sum, item) =>
                        sum +
                        Number(item.quantity) *
                        Number(item.unitPrice),
                    0
                );

        if (
            !Number.isFinite(basePrice) ||
            basePrice < 0 ||
            !Number.isFinite(vatPercent) ||
            vatPercent < 0 ||
            vatPercent > 100
        ) {
            console.error(
                "Invalid quote pricing values:",
                quote._id
            );

            return res.status(500).json({
                message: "Invalid quote pricing data",
            });
        }

        let subtotal;
        let vatAmount;
        let total;

        if (priceIncludesVat) {
            // המחיר כבר כולל מע"מ
            total = roundMoney(basePrice);

            subtotal = roundMoney(
                total / (1 + vatRate)
            );

            vatAmount = roundMoney(total - subtotal);
        } else {
            // המחיר אינו כולל מע"מ
            subtotal = roundMoney(basePrice);

            vatAmount = roundMoney(
                subtotal * vatRate
            );

            total = roundMoney(subtotal + vatAmount);
        }

        // =====================================
        // הכנת פירוט העבודות
        // =====================================

        const items = quoteItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,

            ...(quote.showItemPrices
                ? {
                    unitPrice: item.unitPrice,
                    lineTotal: roundMoney(
                        Number(item.quantity) *
                        Number(item.unitPrice)
                    ),
                }
                : {}),
        }));

        // =====================================
        // החזרת הצעת המחיר ללקוח
        // =====================================

        return res.status(200).json({
            customerName: quote.customerName,
            projectTitle: quote.projectTitle,
            projectAddress: quote.projectAddress,

            items,

            notes: quote.notes,

            showItemPrices: Boolean(quote.showItemPrices),
            showQuantities: quote.showQuantities !== false,

            pricingMode,

            manualPrice:
                pricingMode === "manual"
                    ? Number(quote.manualPrice ?? 0)
                    : null,

            priceIncludesVat,

            subtotal,
            vatPercent,
            vatAmount,
            total,

            sentAt: quote.sentAt,
            validUntil: quote.validUntil,
            linkExpiresAt: quote.shareTokenExpiresAt,

            status: quote.status,

            approvedAt:
                quote.status === "approved"
                    ? quote.approvedAt
                    : null,

            approvedByName:
                quote.status === "approved"
                    ? quote.approvedByName
                    : null,

            signatureImage:
                quote.status === "approved"
                    ? quote.customerSignature
                    : null,
        });
    } catch (error) {
        console.error(
            "Error loading public quote:",
            error
        );

        return res.status(500).json({
            message: "Error loading quote",
        });
    }
});

// =====================================
// אישור הצעה וחתימה דיגיטלית
// =====================================

router.post("/:token/approve", async (req, res) => {
    try {
        const tokenHash = hashToken(req.params.token);

        if (!tokenHash) {
            return res.status(404).json({
                message: "Quote not found",
            });
        }

        const {
            approvedByName,
            accepted,
            signatureData,
        } = req.body || {};

        const name =
            typeof approvedByName === "string"
                ? approvedByName.trim()
                : "";

        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({
                message: "Invalid signer name",
            });
        }

        if (accepted !== true) {
            return res.status(400).json({
                message:
                    "Approval requires agreement to the quote terms",
            });
        }

        // =====================================
        // בדיקת תמונת החתימה
        // =====================================

        if (
            typeof signatureData !== "string" ||
            signatureData.length > 90000 ||
            !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(
                signatureData
            )
        ) {
            return res.status(400).json({
                message: "Invalid signature",
            });
        }

        const base64 = signatureData.slice(
            "data:image/png;base64,".length
        );

        const png = Buffer.from(base64, "base64");

        const pngHeader = Buffer.from([
            137, 80, 78, 71, 13, 10, 26, 10,
        ]);

        if (
            png.length < 80 ||
            png.length > 67000 ||
            !png.subarray(0, 8).equals(pngHeader) ||
            png.readUInt32BE(16) !== 700 ||
            png.readUInt32BE(20) !== 220
        ) {
            return res.status(400).json({
                message: "Invalid signature image",
            });
        }

        const now = new Date();

        // =====================================
        // שמירת האישור והחתימה ב-MongoDB
        // =====================================

        const quote = await Quote.findOneAndUpdate(
            {
                ...activeQuoteFilter(tokenHash, now),
                status: "sent",
            },
            {
                $set: {
                    status: "approved",
                    approvedAt: now,
                    approvedByName: name,
                    customerSignature: signatureData,
                    approvalConsentText: approvalStatement,
                },
            },
            {
                new: true,
                runValidators: true,
            }
        ).select(
            "customerName projectTitle approvedAt approvedByName"
        );

        if (!quote) {
            return res.status(409).json({
                message:
                    "Quote already approved, expired, or unavailable",
            });
        }

        // =====================================
        // החזרת אישור הצלחה ללקוח
        // =====================================

        res.status(200).json({
            message: "Quote approved successfully",
            status: "approved",
            approvedAt: quote.approvedAt,
            approvedByName: quote.approvedByName,
        });

        // =====================================
        // יצירת PDF, שמירה ושליחת מייל
        // =====================================

        setImmediate(() => {
            sendApprovedQuoteNotification(
                quote,
                req.params.token
            ).catch((error) => {
                console.error(
                    "Approved quote notification failed:",
                    error
                );
            });
        });

        return;
    } catch (error) {
        console.error(
            "Error approving quote:",
            error
        );

        if (res.headersSent) return;

        return res.status(500).json({
            message: "Error approving quote",
        });
    }
});

module.exports = router;
