
import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
    type PointerEvent,
} from "react";

import { useParams } from "react-router-dom";
import axios from "axios";
import logo from "../assets/logo.png";

// =====================================
// טיפוסים
// =====================================

type PublicQuoteItem = {
    description: string;
    quantity: number;
    unit: string;
    lineTotal?: number;
};

type PublicQuote = {
    customerName: string;
    projectTitle: string;
    projectAddress: string;
    items: PublicQuoteItem[];
    notes: string;

    showItemPrices: boolean;
    showQuantities: boolean;

    subtotal: number;
    vatPercent: number;
    vatAmount: number;
    total: number;

    sentAt: string | null;
    validUntil: string | null;
    linkExpiresAt: string;

    status: "sent" | "approved";
    approvedAt: string | null;
    approvedByName: string | null;
    signatureImage: string | null;
};

type ApprovalResult = {
    status: "approved";
    approvedAt: string;
    approvedByName: string;
};

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 220;

function QuoteView() {
    const { token } = useParams<{ token: string }>();

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawingRef = useRef(false);

    const [quote, setQuote] = useState<PublicQuote | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [signerName, setSignerName] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [approvalError, setApprovalError] = useState("");

    // =====================================
    // טעינת הצעת המחיר
    // =====================================

    useEffect(() => {
        if (!token) {
            setError("הקישור להצעת המחיר אינו תקין.");
            setLoading(false);
            return;
        }

        let active = true;

        const loadQuote = async () => {
            setLoading(true);
            setError("");
            setQuote(null);

            try {
                const response = await axios.get<PublicQuote>(
                    `http://localhost:3000/api/public/quotes/${token}`
                );

                if (active) {
                    setQuote(response.data);
                }
            } catch (err) {
                console.error(err);

                if (active) {
                    setError(
                        "לא ניתן לפתוח את ההצעה. ייתכן שהקישור פג תוקף או הוחלף."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void loadQuote();

        return () => {
            active = false;
        };
    }, [token]);

    // =====================================
    // רקע לבן לחתימה
    // =====================================

    useEffect(() => {
        if (quote?.status !== "sent") return;

        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context) return;

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
    }, [quote?.status]);

    // =====================================
    // פונקציות עזר
    // =====================================

    const formatMoney = (amount: number) =>
        amount.toLocaleString("he-IL", {
            style: "currency",
            currency: "ILS",
        });

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString("he-IL");

    const getPoint = (
        event: PointerEvent<HTMLCanvasElement>
    ) => {
        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();

        return {
            x:
                ((event.clientX - rect.left) / rect.width) *
                canvas.width,
            y:
                ((event.clientY - rect.top) / rect.height) *
                canvas.height,
        };
    };

    // =====================================
    // תחילת ציור חתימה
    // =====================================

    const startDrawing = (
        event: PointerEvent<HTMLCanvasElement>
    ) => {
        if (submitting) return;

        const canvas = event.currentTarget;
        const context = canvas.getContext("2d");

        if (!context) return;

        const point = getPoint(event);

        canvas.setPointerCapture(event.pointerId);
        drawingRef.current = true;

        context.beginPath();
        context.moveTo(point.x, point.y);

        context.strokeStyle = "#263429";
        context.lineWidth = 3.5;
        context.lineCap = "round";
        context.lineJoin = "round";
    };

    // =====================================
    // המשך ציור חתימה
    // =====================================

    const continueDrawing = (
        event: PointerEvent<HTMLCanvasElement>
    ) => {
        if (!drawingRef.current || submitting) return;

        const context =
            event.currentTarget.getContext("2d");

        if (!context) return;

        const point = getPoint(event);

        context.lineTo(point.x, point.y);
        context.stroke();

        setHasSignature(true);
    };

    // =====================================
    // סיום ציור חתימה
    // =====================================

    const stopDrawing = (
        event: PointerEvent<HTMLCanvasElement>
    ) => {
        drawingRef.current = false;

        event.currentTarget
            .getContext("2d")
            ?.closePath();

        if (
            event.currentTarget.hasPointerCapture(
                event.pointerId
            )
        ) {
            event.currentTarget.releasePointerCapture(
                event.pointerId
            );
        }
    };

    // =====================================
    // ניקוי חתימה
    // =====================================

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context || submitting) return;

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        context.fillStyle = "#ffffff";
        context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        drawingRef.current = false;
        setHasSignature(false);
        setApprovalError("");
    };

    // =====================================
    // אישור הצעה וחתימה
    // =====================================

    const approveQuote = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (
            !token ||
            !quote ||
            quote.status !== "sent"
        ) {
            return;
        }

        if (signerName.trim().length < 2) {
            setApprovalError(
                "יש למלא את השם המלא של החותם/ת."
            );
            return;
        }

        if (!accepted) {
            setApprovalError(
                "יש לאשר שקראת את ההצעה והתנאים."
            );
            return;
        }

        if (!hasSignature || !canvasRef.current) {
            setApprovalError(
                "יש לחתום בתיבת החתימה לפני האישור."
            );
            return;
        }

        const signatureData =
            canvasRef.current.toDataURL("image/png");

        setApprovalError("");
        setSubmitting(true);

        try {
            const response =
                await axios.post<ApprovalResult>(
                    `http://localhost:3000/api/public/quotes/${token}/approve`,
                    {
                        approvedByName: signerName.trim(),
                        accepted: true,
                        signatureData,
                    }
                );

            setQuote((previous) =>
                previous
                    ? {
                        ...previous,
                        status: "approved",
                        approvedAt:
                            response.data.approvedAt,
                        approvedByName:
                            response.data.approvedByName,
                        signatureImage: signatureData,
                    }
                    : previous
            );
        } catch (err) {
            console.error(err);

            if (
                axios.isAxiosError(err) &&
                err.response?.status === 409
            ) {
                setApprovalError(
                    "לא ניתן לאשר כרגע. ייתכן שההצעה כבר אושרה או שהקישור פג תוקף. רעננו את הדף."
                );
            } else {
                setApprovalError(
                    "האישור לא נשמר. נסו שוב או פנו לבית העסק."
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    // =====================================
    // מסך טעינה
    // =====================================

    if (loading) {
        return (
            <main
                className="quote-customer-page"
                dir="rtl"
            >
                <p className="quote-customer-message">
                    טוענים את הצעת המחיר...
                </p>
            </main>
        );
    }

    // =====================================
    // הודעת שגיאה
    // =====================================

    if (error || !quote) {
        return (
            <main
                className="quote-customer-page"
                dir="rtl"
            >
                <p
                    className="quote-customer-message"
                    role="alert"
                >
                    {error || "הצעת המחיר לא נמצאה."}
                </p>
            </main>
        );
    }

    // =====================================
    // תצוגת הצעת המחיר
    // =====================================

    return (
        <main
            className="quote-customer-page"
            dir="rtl"
        >
            {quote.status === "approved" && (
                <div
                    className="quote-approved-banner"
                    role="status"
                >
                    הצעת המחיר אושרה ונחתמה בהצלחה ✓
                </div>
            )}

            <section className="quote-client-preview">

                {quote.status === "approved" && (
                    <button
                        type="button"
                        className="quote-pdf-button quote-customer-print-button"
                        onClick={() => window.print()}
                    >
                        שמירת ההצעה החתומה כ-PDF
                    </button>
                )}

                <article className="quote-preview-paper">

                    {/* =====================================
              לוגו וכותרת
          ===================================== */}

                    <div className="quote-preview-logo">
                        <img
                            src={logo}
                            alt="UV נגרות חוץ"
                        />

                        <h2>הצעת מחיר</h2>

                        <p>
                            עבודות עץ ונגרות חוץ בהתאמה אישית
                        </p>
                    </div>

                    {/* =====================================
              פרטי הלקוח
          ===================================== */}

                    <div className="quote-preview-details">

                        {quote.sentAt && (
                            <p>
                                <strong>תאריך ההצעה: </strong>
                                {formatDate(quote.sentAt)}
                            </p>
                        )}

                        <p>
                            <strong>לכבוד: </strong>
                            {quote.customerName}
                        </p>

                        {quote.projectAddress && (
                            <p>
                                <strong>כתובת הפרויקט: </strong>
                                {quote.projectAddress}
                            </p>
                        )}

                        {quote.validUntil && (
                            <p>
                                <strong>ההצעה בתוקף עד: </strong>
                                {formatDate(quote.validUntil)}
                            </p>
                        )}

                    </div>

                    {/* =====================================
              פרטי הפרויקט והעבודות
          ===================================== */}

                    <div className="quote-preview-project">
                        <h3>{quote.projectTitle}</h3>

                        <h4>פירוט העבודות והחומרים</h4>

                        {/* =====================================
                טבלה מתוקנת:
                מציגה כמויות רק אם נבחר
            ===================================== */}

                        <table className="quote-preview-table">

                            <thead>
                                <tr>
                                    <th>תיאור</th>

                                    {quote.showQuantities !== false && (
                                        <th>כמות</th>
                                    )}

                                    {quote.showItemPrices && (
                                        <th>סה״כ לשורה</th>
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {quote.items.map(
                                    (item, index) => (
                                        <tr key={index}>

                                            <td>
                                                {item.description}
                                            </td>

                                            {/* כמות מופיעה רק כשנבחרה */}
                                            {quote.showQuantities !== false && (
                                                <td>
                                                    {item.quantity} {item.unit}
                                                </td>
                                            )}

                                            {/* מחיר שורה לפי ההגדרה */}
                                            {quote.showItemPrices && (
                                                <td>
                                                    {formatMoney(
                                                        item.lineTotal ?? 0
                                                    )}
                                                </td>
                                            )}

                                        </tr>
                                    )
                                )}
                            </tbody>

                        </table>
                    </div>

                    {/* =====================================
              סכומי הצעת המחיר
          ===================================== */}

                    <div className="quote-preview-totals">

                        <p>
                            <span>סה״כ לפני מע״מ</span>
                            <strong>
                                {formatMoney(quote.subtotal)}
                            </strong>
                        </p>

                        <p>
                            <span>
                                מע״מ ({quote.vatPercent}%)
                            </span>
                            <strong>
                                {formatMoney(quote.vatAmount)}
                            </strong>
                        </p>

                        <div className="quote-preview-final">
                            <span>סה״כ כולל מע״מ</span>

                            <strong>
                                {formatMoney(quote.total)}
                            </strong>
                        </div>

                    </div>

                    {/* =====================================
              הערות ותנאים
          ===================================== */}

                    {quote.notes && (
                        <div className="quote-preview-notes">
                            <h4>הערות ותנאים</h4>

                            <p>{quote.notes}</p>
                        </div>
                    )}

                    {/* =====================================
              חתימה דיגיטלית
          ===================================== */}

                    <div className="quote-preview-signature">

                        {quote.status === "approved" ? (

                            <div className="quote-signed-result">

                                <h3>אישור הלקוח</h3>

                                <p>
                                    <strong>שם החותם/ת: </strong>
                                    {quote.approvedByName}
                                </p>

                                {quote.approvedAt && (
                                    <p>
                                        <strong>
                                            תאריך האישור:
                                        </strong>{" "}
                                        {formatDate(quote.approvedAt)}
                                    </p>
                                )}

                                {quote.signatureImage && (
                                    <img
                                        src={quote.signatureImage}
                                        alt="חתימת הלקוח"
                                        className="quote-signed-image"
                                    />
                                )}

                            </div>

                        ) : (

                            <form
                                className="quote-approval-form"
                                onSubmit={approveQuote}
                                noValidate
                            >

                                <h3>
                                    אישור וחתימה על הצעת המחיר
                                </h3>

                                <p>
                                    יש לקרוא את ההצעה, לרשום את
                                    השם ולחתום עם האצבע או
                                    העכבר בתיבה שלמטה.
                                </p>

                                <label htmlFor="quote-signer-name">
                                    שם מלא של החותם/ת
                                </label>

                                <input
                                    id="quote-signer-name"
                                    value={signerName}
                                    onChange={(event) =>
                                        setSignerName(
                                            event.target.value
                                        )
                                    }
                                    maxLength={100}
                                    placeholder="שם פרטי ושם משפחה"
                                    required
                                />

                                <label htmlFor="quote-signature-pad">
                                    חתימה
                                </label>

                                <canvas
                                    ref={canvasRef}
                                    id="quote-signature-pad"
                                    className="quote-signature-canvas"
                                    width={CANVAS_WIDTH}
                                    height={CANVAS_HEIGHT}
                                    onPointerDown={startDrawing}
                                    onPointerMove={continueDrawing}
                                    onPointerUp={stopDrawing}
                                    onPointerCancel={stopDrawing}
                                    aria-label="אזור חתימה בכתב יד"
                                />

                                <button
                                    type="button"
                                    className="quote-clear-signature"
                                    onClick={clearSignature}
                                    disabled={submitting}
                                >
                                    ניקוי חתימה
                                </button>

                                <label className="quote-approval-consent">

                                    <input
                                        type="checkbox"
                                        checked={accepted}
                                        onChange={(event) =>
                                            setAccepted(
                                                event.target.checked
                                            )
                                        }
                                        required
                                    />

                                    <span>
                                        קראתי את פרטי הצעת המחיר
                                        ואת התנאים המופיעים בה,
                                        ואני מאשר/ת את ההצעה
                                        בחתימתי.
                                    </span>

                                </label>

                                {approvalError && (
                                    <p
                                        role="alert"
                                        className="quote-approval-error"
                                    >
                                        {approvalError}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    className="quote-confirm-approval"
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? "שומרים את האישור..."
                                        : "אישור וחתימה על ההצעה"}
                                </button>

                            </form>

                        )}

                    </div>

                </article>

            </section>

        </main>
    );
}

export default QuoteView;
