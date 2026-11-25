
const mongoose = require("mongoose");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const Quote = require("../models/Quote");

// =====================================
// שמירת PDF חתום בתוך MongoDB GridFS
// =====================================

async function saveSignedQuotePdf(quoteId, pdfBuffer) {

    // בדיקת מזהה ההצעה
    if (!mongoose.isValidObjectId(quoteId)) {
        throw new Error("Invalid quote ID");
    }

    // בדיקת קובץ ה-PDF
    if (
        !Buffer.isBuffer(pdfBuffer) ||
        pdfBuffer.subarray(0, 5).toString() !== "%PDF-" ||
        pdfBuffer.length > 20 * 1024 * 1024
    ) {
        throw new Error("Invalid PDF file");
    }

    // איתור הצעת המחיר
    const quote = await Quote.findById(quoteId)
        .select("+signedPdfFileId");

    if (!quote || quote.status !== "approved") {
        throw new Error("Approved quote not found");
    }

    // אם כבר שמרנו PDF, לא שומרים עותק נוסף
    if (quote.signedPdfFileId) {
        return quote.signedPdfFileId;
    }

    // בדיקת חיבור למסד הנתונים
    const database = mongoose.connection.db;

    if (!database) {
        throw new Error("MongoDB is not connected");
    }

    // יצירת מערכת שמירת קבצים
    const bucket = new mongoose.mongo.GridFSBucket(
        database,
        {
            bucketName: "signedQuotePdfs",
        }
    );

    // יצירת שם הקובץ
    const filename =
        `UV-Signed-Quote-${quote._id}.pdf`;

    // פתיחת זרם העלאה
    const uploadStream = bucket.openUploadStream(
        filename,
        {
            metadata: {
                quoteId: quote._id.toString(),
                approvedAt: quote.approvedAt,
                contentType: "application/pdf",
            },
        }
    );

    let linkedToQuote = false;

    try {
        // שמירת ה-PDF בתוך GridFS
        await pipeline(
            Readable.from([pdfBuffer]),
            uploadStream
        );

        // קישור הקובץ להצעת המחיר
        const result = await Quote.updateOne(
            {
                _id: quote._id,
                status: "approved",
                signedPdfFileId: null,
            },
            {
                $set: {
                    signedPdfFileId: uploadStream.id,
                    signedPdfSavedAt: new Date(),
                },
            }
        );

        // הגנה מפני שמירה כפולה
        if (result.modifiedCount !== 1) {
            const latestQuote = await Quote.findById(
                quote._id
            ).select("+signedPdfFileId");

            if (latestQuote?.signedPdfFileId) {
                return latestQuote.signedPdfFileId;
            }

            throw new Error(
                "Could not link PDF to quote"
            );
        }

        linkedToQuote = true;

        console.log(
            "Signed PDF saved in MongoDB:",
            quote._id.toString()
        );

        return uploadStream.id;

    } finally {
        // ניקוי קובץ שלא קושר להצעת המחיר
        if (!linkedToQuote) {
            try {
                await bucket.delete(uploadStream.id);
            } catch (cleanupError) {
                console.error(
                    "PDF cleanup warning:",
                    cleanupError
                );
            }
        }
    }
}

module.exports = { saveSignedQuotePdf };
