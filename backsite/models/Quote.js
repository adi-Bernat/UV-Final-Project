
const mongoose = require("mongoose");

// ==============================
// חומרים ועבודות בהצעת המחיר
// ==============================

const quoteItemSchema = new mongoose.Schema(
    {
        description: {
            type: String,
            required: true,
            trim: true,
        },

        type: {
            type: String,
            enum: ["material", "labor", "other"],
            default: "material",
        },

        quantity: {
            type: Number,
            required: true,
            min: 0,
            default: 1,
        },

        unit: {
            type: String,
            default: "יחידה",
        },

        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: true }
);

// ==============================
// הצעת המחיר המלאה
// ==============================

const quoteSchema = new mongoose.Schema(
    {
        // פרטי הלקוח

        customerName: {
            type: String,
            required: true,
            trim: true,
        },

        customerPhone: {
            type: String,
            default: "",
        },

        customerEmail: {
            type: String,
            default: "",
        },

        projectAddress: {
            type: String,
            default: "",
        },

        projectTitle: {
            type: String,
            required: true,
            trim: true,
        },

        // ==============================
        // פירוט חומרים ועבודות
        // ==============================

        items: {
            type: [quoteItemSchema],
            default: [],
        },

        // סוג תמחור - גלובלי או מפורט

        pricingMode: {
            type: String,
            enum: ["items", "manual"],
            default: "items",
        },

        // מחיר גלובלי

        manualPrice: {
            type: Number,
            default: null,
            min: 0,
        },

        // האם המחיר כולל מע"מ

        priceIncludesVat: {
            type: Boolean,
            default: true,
        },

        // האם להציג כמויות במסמך

        showQuantities: {
            type: Boolean,
            default: true,
        },

        // אחוז מע"מ

        vatPercent: {
            type: Number,
            default: 18,
            min: 0,
            max: 100,
        },

        // האם להציג מחיר לכל שורה

        showItemPrices: {
            type: Boolean,
            default: false,
        },

        // ==============================
        // הערות ותוקף
        // ==============================

        notes: {
            type: String,
            default: "",
        },

        validUntil: {
            type: Date,
        },

        // ==============================
        // סטטוס ההצעה
        // ==============================

        status: {
            type: String,
            enum: ["draft", "sent", "approved", "rejected"],
            default: "draft",
        },

        // ==============================
        // שיתוף הצעת מחיר
        // ==============================

        shareTokenHash: {
            type: String,
            default: null,
            select: false,
        },

        shareTokenExpiresAt: {
            type: Date,
            default: null,
        },

        sentAt: {
            type: Date,
            default: null,
        },

        // ==============================
        // אישור וחתימת הלקוח
        // ==============================

        approvedAt: {
            type: Date,
            default: null,
        },

        approvedByName: {
            type: String,
            trim: true,
            default: "",
        },

        customerSignature: {
            type: String,
            default: null,
            select: false,
        },

        approvalConsentText: {
            type: String,
            default: "",
        },

        // ==============================
        // שמירת PDF חתום במערכת
        // ==============================

        // מזהה הקובץ שנשמר ב-MongoDB GridFS
        signedPdfFileId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            select: false,
        },

        // התאריך שבו ה-PDF נשמר
        signedPdfSavedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Quote", quoteSchema);
