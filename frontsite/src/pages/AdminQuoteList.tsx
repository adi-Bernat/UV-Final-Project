
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import { calculateQuotePricing } from "../utils/quotePricing";

// ======================================
// טיפוסים
// ======================================

type QuoteItem = {
    quantity: number;
    unitPrice: number;
};

type Quote = {
    _id: string;
    customerName: string;
    projectTitle: string;
    status: string;
    createdAt: string;
    vatPercent?: number;
    items?: QuoteItem[];

    // הגדרות התמחור
    pricingMode?: "items" | "manual";
    manualPrice?: number | null;
    priceIncludesVat?: boolean;

    // תאריך שמירת ה-PDF החתום ב-MongoDB
    signedPdfSavedAt?: string | null;
};

const API_URL = "http://localhost:3000/api/quotes";

const statusText: Record<string, string> = {
    draft: "טיוטה",
    sent: "נשלחה",
    approved: "אושרה",
    rejected: "נדחתה",
};

const formatMoney = (amount: number) =>
    amount.toLocaleString("he-IL", {
        style: "currency",
        currency: "ILS",
    });

// ======================================
// עמוד הצעות המחיר השמורות
// ======================================

function AdminQuoteList() {
    const navigate = useNavigate();

    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [linkLoadingId, setLinkLoadingId] =
        useState<string | null>(null);

    const [shareLinks, setShareLinks] = useState<
        Record<string, string>
    >({});

    const [shareError, setShareError] = useState("");

    const [copiedId, setCopiedId] =
        useState<string | null>(null);

    // הורדת PDF
    const [downloadLoadingId, setDownloadLoadingId] =
        useState<string | null>(null);

    const [downloadError, setDownloadError] = useState("");

    // ======================================
    // טעינת ההצעות מהשרת
    // ======================================

    useEffect(() => {
        const token = localStorage.getItem("adminToken");

        if (!token) {
            navigate("/admin/login", { replace: true });
            return;
        }

        let active = true;

        const loadQuotes = async () => {
            try {
                const response = await axios.get<Quote[]>(
                    API_URL,
                    {
                        headers: {
                            Authorization: "Bearer " + token,
                        },
                    }
                );

                if (active) {
                    setQuotes(response.data);
                    setError("");
                }
            } catch (err) {
                console.error("Error loading quotes:", err);

                if (
                    axios.isAxiosError(err) &&
                    [401, 403].includes(
                        err.response?.status ?? 0
                    )
                ) {
                    localStorage.removeItem("adminToken");

                    navigate("/admin/login", {
                        replace: true,
                    });

                    return;
                }

                if (active) {
                    setError(
                        "לא הצלחנו לטעון את הצעות המחיר."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void loadQuotes();

        return () => {
            active = false;
        };
    }, [navigate]);

    // ======================================
    // יצירת קישור אישי ללקוח
    // ======================================

    const createShareLink = async (quote: Quote) => {
        const confirmed = window.confirm(
            quote.status === "sent"
                ? "יצירת קישור חדש תבטל את הקישור הקודם. להמשיך?"
                : "יצירת קישור תסמן את ההצעה כנשלחה ותנעל אותה לעריכה. להמשיך?"
        );

        if (!confirmed) return;

        const token = localStorage.getItem("adminToken");

        if (!token) {
            navigate("/admin/login");
            return;
        }

        setLinkLoadingId(quote._id);
        setShareError("");
        setCopiedId(null);

        try {
            const response = await axios.post<{
                link: string;
            }>(
                `${API_URL}/${quote._id}/share`,
                {},
                {
                    headers: {
                        Authorization: "Bearer " + token,
                    },
                }
            );

            // שמירת הקישור להצגה בכרטיס
            setShareLinks((previous) => ({
                ...previous,
                [quote._id]: response.data.link,
            }));

            // עדכון הסטטוס ברשימה
            setQuotes((previous) =>
                previous.map((item) =>
                    item._id === quote._id
                        ? { ...item, status: "sent" }
                        : item
                )
            );
        } catch (err) {
            console.error("Error sharing quote:", err);

            if (
                axios.isAxiosError(err) &&
                [401, 403].includes(
                    err.response?.status ?? 0
                )
            ) {
                localStorage.removeItem("adminToken");
                navigate("/admin/login");
                return;
            }

            if (axios.isAxiosError(err)) {
                const data = err.response?.data as
                    | {
                        message?: string;
                        errors?: string[];
                    }
                    | undefined;

                setShareError(
                    data?.errors?.join(" | ") ||
                    data?.message ||
                    "לא הצלחנו ליצור קישור להצעה."
                );
            } else {
                setShareError(
                    "אירעה שגיאה ביצירת הקישור."
                );
            }
        } finally {
            setLinkLoadingId(null);
        }
    };

    // ======================================
    // העתקת קישור
    // ======================================

    const copyShareLink = async (quoteId: string) => {
        const link = shareLinks[quoteId];

        if (!link) return;

        try {
            await navigator.clipboard.writeText(link);

            setCopiedId(quoteId);
            setShareError("");
        } catch {
            setShareError(
                "לא הצלחנו להעתיק. אפשר לסמן את הקישור ולהעתיק ידנית."
            );
        }
    };

    // ======================================
    // הורדת PDF חתום מ-MongoDB
    // ======================================

    const downloadSignedPdf = async (quote: Quote) => {
        if (quote.status !== "approved") return;

        const token = localStorage.getItem("adminToken");

        if (!token) {
            navigate("/admin/login", { replace: true });
            return;
        }

        setDownloadLoadingId(quote._id);
        setDownloadError("");

        try {
            // בקשת הקובץ באמצעות הרשאת המנהל
            const response = await axios.get<Blob>(
                `${API_URL}/${quote._id}/signed-pdf`,
                {
                    headers: {
                        Authorization: "Bearer " + token,
                    },
                    responseType: "blob",
                }
            );

            const pdfBlob = response.data;

            const contentType = String(
                response.headers["content-type"] || ""
            );

            // מוודאים שהשרת החזיר קובץ PDF
            if (
                !pdfBlob ||
                pdfBlob.size === 0 ||
                !contentType.includes("application/pdf")
            ) {
                throw new Error("Invalid PDF response");
            }

            // יצירת קישור הורדה זמני בדפדפן
            const fileUrl = URL.createObjectURL(pdfBlob);

            const downloadLink =
                document.createElement("a");

            downloadLink.href = fileUrl;

            downloadLink.download =
                `UV-Signed-Quote-${quote._id}.pdf`;

            document.body.appendChild(downloadLink);

            downloadLink.click();

            downloadLink.remove();

            // שחרור הזיכרון של הקישור הזמני
            window.setTimeout(() => {
                URL.revokeObjectURL(fileUrl);
            }, 30000);

        } catch (err) {
            console.error(
                "Error downloading signed PDF:",
                err
            );

            if (
                axios.isAxiosError(err) &&
                [401, 403].includes(
                    err.response?.status ?? 0
                )
            ) {
                localStorage.removeItem("adminToken");

                navigate("/admin/login", {
                    replace: true,
                });

                return;
            }

            if (
                axios.isAxiosError(err) &&
                err.response?.status === 404
            ) {
                setDownloadError(
                    "לא נמצא PDF שמור להצעה הזאת."
                );
            } else {
                setDownloadError(
                    "לא הצלחנו להוריד את ה-PDF החתום. נסו שוב."
                );
            }
        } finally {
            setDownloadLoadingId(null);
        }
    };

    // ======================================
    // תצוגת העמוד
    // ======================================

    return (
        <main
            className="admin-quote-list-page"
            dir="rtl"
        >
            <Link
                to="/admin"
                className="back-home-button"
            >
                חזרה למערכת הניהול ←
            </Link>

            <div className="admin-quote-list-header">
                <h1>הצעות המחיר שלי</h1>

                <p>
                    ניהול הצעות המחיר של UV | נגרות חוץ
                </p>

                <Link
                    to="/admin/quotes"
                    className="quote-new-link"
                >
                    + יצירת הצעת מחיר חדשה
                </Link>
            </div>

            {/* הודעת שגיאה ביצירת קישור */}
            {shareError && (
                <p
                    role="alert"
                    className="quote-share-error"
                >
                    {shareError}
                </p>
            )}

            {/* הודעת שגיאה בהורדת PDF */}
            {downloadError && (
                <p
                    role="alert"
                    className="quote-share-error"
                >
                    {downloadError}
                </p>
            )}

            {loading ? (
                <p>טוען הצעות מחיר...</p>
            ) : error ? (
                <p role="alert">{error}</p>
            ) : quotes.length === 0 ? (
                <p className="quote-list-empty">
                    עדיין לא נשמרו הצעות מחיר.
                </p>
            ) : (
                <div className="quote-list-grid">
                    {quotes.map((quote) => {
                        // ==================================
                        // חישוב המחיר לפי סוג ההצעה
                        // ==================================

                        const pricing = calculateQuotePricing({
                            items: quote.items ?? [],
                            vatPercent: quote.vatPercent ?? 18,
                            pricingMode:
                                quote.pricingMode ?? "items",
                            manualPrice:
                                quote.manualPrice ?? null,
                            priceIncludesVat:
                                quote.priceIncludesVat ?? true,
                        });

                        const missingManualPrice =
                            quote.pricingMode === "manual" &&
                            (
                                quote.manualPrice == null ||
                                !Number.isFinite(
                                    quote.manualPrice
                                )
                            );

                        const isDraft =
                            quote.status === "draft";

                        const canShare =
                            quote.status === "draft" ||
                            quote.status === "sent";

                        const canView =
                            ["sent", "approved", "rejected"]
                                .includes(quote.status);

                        // הצעה מאושרת שקיים עבורה PDF שמור
                        const hasSignedPdf =
                            quote.status === "approved" &&
                            Boolean(quote.signedPdfSavedAt);

                        return (
                            <article
                                className="quote-list-card"
                                key={quote._id}
                            >
                                <div className="quote-list-card-top">
                                    <h2>{quote.customerName}</h2>

                                    <span className="quote-list-status">
                                        {statusText[quote.status] ||
                                            quote.status}
                                    </span>
                                </div>

                                <p>
                                    <strong>פרויקט:</strong>{" "}
                                    {quote.projectTitle}
                                </p>

                                <p>
                                    <strong>תאריך:</strong>{" "}
                                    {new Date(
                                        quote.createdAt
                                    ).toLocaleDateString("he-IL")}
                                </p>

                                <p>
                                    <strong>סוג תמחור:</strong>{" "}
                                    {quote.pricingMode === "manual"
                                        ? "מחיר גלובלי"
                                        : "מחיר מפורט"}
                                </p>

                                {/* מחיר ההצעה */}
                                <div className="quote-list-total">
                                    <span>
                                        {quote.priceIncludesVat === false
                                            ? "סה״כ לא כולל מע״מ"
                                            : "סה״כ כולל מע״מ"}
                                    </span>

                                    <strong>
                                        {missingManualPrice
                                            ? "חסר מחיר גלובלי"
                                            : formatMoney(
                                                pricing.quotedPrice
                                            )}
                                    </strong>
                                </div>

                                {/* פתיחה ועריכה */}
                                {isDraft && (
                                    <Link
                                        to={
                                            "/admin/quotes/" +
                                            quote._id
                                        }
                                        className="quote-edit-link"
                                    >
                                        פתיחה ועריכה
                                    </Link>
                                )}

                                {/* צפייה בהצעה שנשלחה או אושרה */}
                                {canView && (
                                    <Link
                                        to={
                                            "/admin/quotes/" +
                                            quote._id
                                        }
                                        className="quote-edit-link"
                                    >
                                        {quote.status === "approved"
                                            ? "צפייה בהצעה החתומה"
                                            : "צפייה בהצעת המחיר"}
                                    </Link>
                                )}

                                {/* ==================================
                    כפתור הורדת PDF חתום
                ================================== */}

                                {hasSignedPdf && (
                                    <div className="uv-signed-pdf-area">
                                        <button
                                            type="button"
                                            className="quote-edit-link uv-signed-pdf-button"
                                            onClick={() =>
                                                downloadSignedPdf(quote)
                                            }
                                            disabled={
                                                downloadLoadingId !== null
                                            }
                                            aria-busy={
                                                downloadLoadingId === quote._id
                                            }
                                        >
                                            <span aria-hidden="true">
                                                ↓
                                            </span>

                                            {downloadLoadingId === quote._id
                                                ? "מורידים PDF..."
                                                : "הורדת PDF חתום"}
                                        </button>

                                        <p className="uv-signed-pdf-note">
                                            הקובץ החתום שמור במערכת
                                        </p>
                                    </div>
                                )}

                                {/* הצעה מאושרת ללא PDF שמור */}
                                {quote.status === "approved" &&
                                    !hasSignedPdf && (
                                        <p className="uv-signed-pdf-note">
                                            לא קיים PDF שמור להצעה זו
                                        </p>
                                    )}

                                {/* יצירת קישור */}
                                {canShare && (
                                    <div className="quote-share-area">
                                        <button
                                            type="button"
                                            className="quote-share-button"
                                            onClick={() =>
                                                createShareLink(quote)
                                            }
                                            disabled={
                                                linkLoadingId !== null
                                            }
                                        >
                                            {linkLoadingId === quote._id
                                                ? "יוצרים קישור..."
                                                : quote.status === "sent"
                                                    ? "יצירת קישור חדש"
                                                    : "יצירת קישור ללקוח"}
                                        </button>

                                        {shareLinks[quote._id] && (
                                            <div className="quote-share-result">
                                                <p>
                                                    הקישור האישי נוצר:
                                                </p>

                                                <input
                                                    type="text"
                                                    dir="ltr"
                                                    readOnly
                                                    value={
                                                        shareLinks[quote._id]
                                                    }
                                                    onFocus={(event) =>
                                                        event.currentTarget.select()
                                                    }
                                                    aria-label="קישור להצעת המחיר"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        copyShareLink(
                                                            quote._id
                                                        )
                                                    }
                                                >
                                                    {copiedId === quote._id
                                                        ? "הקישור הועתק ✓"
                                                        : "העתקת קישור"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </main>
    );
}

export default AdminQuoteList;
