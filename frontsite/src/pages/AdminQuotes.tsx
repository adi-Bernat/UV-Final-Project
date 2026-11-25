import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import logo from "../assets/logo.png";
import { calculateQuotePricing, type PricingMode } from "../utils/quotePricing";

type QuoteItem = {
    description: string;
    type: "material" | "labor" | "other";
    quantity: number;
    unit: string;
    unitPrice: number;
};

type SavedQuote = {
    _id: string;
    customerName: string;
    customerPhone?: string;
    projectTitle: string;
    projectAddress?: string;
    notes?: string;
    items: (QuoteItem & { _id?: string })[];
    vatPercent: number;
    status: "draft" | "sent" | "approved" | "rejected";
    createdAt?: string;
    showItemPrices?: boolean;
    pricingMode?: PricingMode;
    manualPrice?: number | null;
    priceIncludesVat?: boolean;
    approvedByName?: string;
    approvedAt?: string | null;
    customerSignature?: string | null;
};

const API_URL = "http://localhost:3000/api/quotes";

const newItem = (): QuoteItem => ({
    description: "",
    type: "material",
    quantity: 1,
    unit: "יחידה",
    unitPrice: 0,
});

function AdminQuotes() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [loadingQuote, setLoadingQuote] = useState(Boolean(id));
    const [editable, setEditable] = useState(true);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [projectTitle, setProjectTitle] = useState("");
    const [projectAddress, setProjectAddress] = useState("");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<QuoteItem[]>([newItem()]);
    const [vatPercent, setVatPercent] = useState(18);
    const [showItemPrices, setShowItemPrices] = useState(false);
    const [pricingMode, setPricingMode] = useState<PricingMode>("items");
    const [manualPrice, setManualPrice] = useState<number | null>(null);
    const [priceIncludesVat, setPriceIncludesVat] = useState(true);
    const [issuedAt, setIssuedAt] = useState("");
    const [approvalDetails, setApprovalDetails] = useState<{
        signedBy: string;
        signedAt: string;
        signature: string;
    } | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    // Prevent creating a duplicate when the first POST worked but verification failed.
    const [createdQuoteId, setCreatedQuoteId] = useState("");

    useEffect(() => {
        if (!id) {
            setLoadingQuote(false);
            return;
        }

        const token = localStorage.getItem("adminToken");
        if (!token) {
            navigate("/admin/login", { replace: true });
            return;
        }

        let active = true;
        setLoadingQuote(true);

        const loadQuote = async () => {
            try {
                const response = await axios.get<SavedQuote>(`${API_URL}/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!active) return;
                const quote = response.data;

                setCustomerName(quote.customerName ?? "");
                setCustomerPhone(quote.customerPhone ?? "");
                setProjectTitle(quote.projectTitle ?? "");
                setProjectAddress(quote.projectAddress ?? "");
                setNotes(quote.notes ?? "");
                setVatPercent(quote.vatPercent ?? 18);
                setShowItemPrices(quote.showItemPrices ?? false);
                setPricingMode(quote.pricingMode ?? "items");
                setManualPrice(quote.manualPrice ?? null);
                setPriceIncludesVat(quote.priceIncludesVat ?? true);
                setIssuedAt(quote.createdAt ?? "");
                setApprovalDetails(
                    quote.status === "approved"
                        ? {
                            signedBy: quote.approvedByName ?? "",
                            signedAt: quote.approvedAt ?? "",
                            signature: quote.customerSignature ?? "",
                        }
                        : null
                );

                // MongoDB מוסיף _id לכל שורה; לא שולחים אותו חזרה ל-Joi בעת עדכון.
                setItems(
                    (quote.items ?? []).map((item) => ({
                        description: item.description ?? "",
                        type: item.type ?? "material",
                        quantity: item.quantity ?? 1,
                        unit: item.unit ?? "יחידה",
                        unitPrice: item.unitPrice ?? 0,
                    }))
                );

                const isDraft = quote.status === "draft";
                setEditable(isDraft);
                setError(isDraft ? "" : "ההצעה אינה טיוטה, ולכן אפשר לצפות בה ולהפיק PDF אך לא לערוך אותה.");
            } catch (err) {
                if (!active) return;

                if (
                    axios.isAxiosError(err) &&
                    [401, 403].includes(err.response?.status ?? 0)
                ) {
                    localStorage.removeItem("adminToken");
                    navigate("/admin/login", { replace: true });
                    return;
                }

                setEditable(false);

                if (axios.isAxiosError(err)) {
                    const data = err.response?.data;

                    const serverError =
                        data?.errors?.join(" | ") ||
                        data?.message ||
                        `שגיאת שרת: ${err.response?.status || "אין חיבור"}`;

                    setError(serverError);
                } else {
                    setError("אירעה שגיאה לא צפויה בטעינת הצעת המחיר.");
                }

            } finally {
                if (active) setLoadingQuote(false);
            }
        };

        void loadQuote();
        return () => {
            active = false;
        };
    }, [id, navigate]);

    const markChanged = () => setSuccessMessage("");

    const updateItem = (index: number, changes: Partial<QuoteItem>) => {
        if (!editable) return;
        setItems((previous) =>
            previous.map((item, i) =>
                i === index ? { ...item, ...changes } : item
            )
        );
        markChanged();
    };

    const addItem = () => {
        if (!editable) return;
        setItems((previous) => [...previous, newItem()]);
        markChanged();
    };

    const removeItem = (index: number) => {
        if (!editable) return;
        setItems((previous) => previous.filter((_, i) => i !== index));
        markChanged();
    };

    const { subtotal, vatAmount, total, quotedPrice } = calculateQuotePricing({
        items,
        vatPercent,
        pricingMode,
        manualPrice,
        priceIncludesVat,
    });
    const displayLinePrices = pricingMode === "items" && showItemPrices;
    const displayQuantities = pricingMode === "items";

    const formatMoney = (value: number) =>
        value.toLocaleString("he-IL", { style: "currency", currency: "ILS" });

    const saveQuote = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editable || saving) return;

        if (pricingMode === "items" && items.length === 0) {
            setError("במצב מחיר מחושב יש להוסיף לפחות חומר או עבודה אחד.");
            return;
        }
        if (pricingMode === "manual" && (manualPrice === null || !Number.isFinite(manualPrice) || manualPrice < 0)) {
            setError("יש להזין מחיר ידני תקין.");
            return;
        }

        const token = localStorage.getItem("adminToken");
        if (!token) {
            navigate("/admin/login");
            return;
        }

        setSaving(true);
        setError("");
        setSuccessMessage("");

        const quoteData = {
            customerName,
            customerPhone,
            projectTitle,
            projectAddress,
            notes,
            items: pricingMode === "manual"
                ? items.filter((item) => item.description.trim().length > 0)
                : items,
            vatPercent,
            showItemPrices: pricingMode === "items" && showItemPrices,
            showQuantities: pricingMode === "items",
            pricingMode,
            manualPrice: pricingMode === "manual" ? manualPrice : null,
            priceIncludesVat,
        };

        const config = {
            headers: { Authorization: `Bearer ${token}` },
        };

        try {
            const targetId = id || createdQuoteId;
            const response = targetId
                ? await axios.put<SavedQuote>(`${API_URL}/${targetId}`, quoteData, config)
                : await axios.post<SavedQuote>(API_URL, quoteData, config);

            const savedId = response.data?._id || targetId;
            if (!savedId) {
                setError("השרת החזיר תשובה בלי מזהה הצעה. בדקי את quoteRoutes.js.");
                return;
            }

            // Remember the new ID before checking persistence so retrying won't create a duplicate.
            if (!id) setCreatedQuoteId(savedId);

            // A 200/201 response does NOT prove that Mongoose persisted all new fields.
            const savedResponse = await axios.get<SavedQuote>(`${API_URL}/${savedId}`, config);
            const stored = savedResponse.data;

            if (pricingMode === "manual") {
                const storedPrice = stored.manualPrice;
                const priceMatches =
                    stored.pricingMode === "manual" &&
                    storedPrice !== undefined &&
                    storedPrice !== null &&
                    Math.abs(Number(storedPrice) - Number(manualPrice)) < 0.01;

                if (!priceMatches) {
                    setError(
                        "ההצעה נוצרה, אבל השרת לא שמר את המחיר הגלובלי. " +
                        "בדקי את השדות pricingMode ו-manualPrice בתוך Quote.js ו-quoteRoutes.js. " +
                        "לא נוצרה הצעה כפולה."
                    );
                    return;
                }
            } else if (stored.pricingMode !== "items" && stored.pricingMode !== undefined) {
                setError("השרת לא שמר את סוג התמחור. בדקי את quoteRoutes.js.");
                return;
            }

            if (stored.priceIncludesVat !== priceIncludesVat) {
                setError("השרת לא שמר את הבחירה כולל/לא כולל מע״מ. בדקי את quoteRoutes.js.");
                return;
            }

            setSuccessMessage(
                targetId ? "השינויים נשמרו ונבדקו בהצלחה!" : "הצעת המחיר נשמרה ונבדקה בהצלחה!"
            );

            if (!id) {
                navigate(`/admin/quotes/${savedId}`, { replace: true });
            }
        } catch (err) {
            console.error("Error saving quote:", err);

            if (
                axios.isAxiosError(err) &&
                [401, 403].includes(err.response?.status ?? 0)
            ) {
                localStorage.removeItem("adminToken");
                navigate("/admin/login", { replace: true });
                return;
            }


            if (axios.isAxiosError(err)) {
                const data = err.response?.data;

                const details = Array.isArray(data?.errors)
                    ? data.errors.join(" | ")
                    : "";

                const message =
                    details ||
                    data?.message ||
                    `שגיאת חיבור או שרת: ${err.response?.status || "אין תגובה"}`;

                setError(message);
            } else {
                setError("אירעה שגיאה לא צפויה בשמירת ההצעה.");
            }

        } finally {
            setSaving(false);
        }
    };

    if (loadingQuote) {
        return <main className="admin-quotes-page" dir="rtl">טוענים את הצעת המחיר...</main>;
    }

    return (
        <main className="admin-quotes-page" dir="rtl">
            <Link to="/admin" className="back-home-button">
                חזרה למערכת הניהול ←
            </Link>

            <div className="quote-brand-header">
                <img src={logo} alt="UV נגרות חוץ" className="quote-brand-logo" />
                <h1>{id ? (editable ? "עריכת הצעת מחיר" : "צפייה בהצעת מחיר") : "הצעת מחיר חדשה"}</h1>
                <p>עבודות עץ ונגרות חוץ בהתאמה אישית</p>
                <Link to="/admin/quotes/saved">לכל הצעות המחיר השמורות</Link>
            </div>

            <form onSubmit={saveQuote} className="quote-form">
                <section className="quote-section">
                    <h2>פרטי הלקוח</h2>

                    <label htmlFor="quote-customer-name">שם הלקוח</label>
                    <input
                        id="quote-customer-name"
                        value={customerName}
                        onChange={(e) => { setCustomerName(e.target.value); markChanged(); }}
                        minLength={2}
                        disabled={!editable || saving}
                        required
                    />

                    <label htmlFor="quote-customer-phone">מספר טלפון</label>
                    <input
                        id="quote-customer-phone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => { setCustomerPhone(e.target.value); markChanged(); }}
                        disabled={!editable || saving}
                    />

                    <label htmlFor="quote-project-title">שם הפרויקט</label>
                    <input
                        id="quote-project-title"
                        value={projectTitle}
                        onChange={(e) => { setProjectTitle(e.target.value); markChanged(); }}
                        placeholder="לדוגמה: בניית פרגולת עץ"
                        minLength={2}
                        disabled={!editable || saving}
                        required
                    />

                    <label htmlFor="quote-project-address">כתובת הפרויקט</label>
                    <input
                        id="quote-project-address"
                        value={projectAddress}
                        onChange={(e) => { setProjectAddress(e.target.value); markChanged(); }}
                        disabled={!editable || saving}
                    />
                </section>

                <section className="quote-section">
                    <h2>{pricingMode === "manual" ? "פירוט העבודות" : "חומרים ועבודות"}</h2>
                    <p className="quote-mode-hint">
                        {pricingMode === "manual"
                            ? "במחיר גלובלי מפרטים מה כוללת העבודה. אין צורך בכמויות או במחירים לכל שורה."
                            : "במחיר מפורט מוסיפים לכל שורה כמות ומחיר ליחידה."}
                    </p>

                    {items.map((item, index) => (
                        pricingMode === "manual" ? (
                            <div className="quote-global-item" key={index}>
                                <label htmlFor={`quote-item-description-${index}`}>
                                    תיאור העבודה
                                </label>
                                <input
                                    id={`quote-item-description-${index}`}
                                    value={item.description}
                                    onChange={(e) => updateItem(index, { description: e.target.value })}
                                    placeholder="לדוגמה: בניית פרגולה כולל קירוי והתקנה"
                                    disabled={!editable || saving}
                                />
                                <button
                                    type="button"
                                    className="quote-remove-button"
                                    onClick={() => removeItem(index)}
                                    disabled={!editable || saving}
                                >
                                    הסרת שורה
                                </button>
                            </div>
                        ) : (
                            <div className="quote-item" key={index}>
                                <label htmlFor={`quote-item-description-${index}`}>
                                    תיאור החומר או העבודה
                                </label>
                                <input
                                    id={`quote-item-description-${index}`}
                                    value={item.description}
                                    onChange={(e) => updateItem(index, { description: e.target.value })}
                                    placeholder="לדוגמה: קורות עץ"
                                    minLength={2}
                                    disabled={!editable || saving}
                                    required
                                />

                                <label htmlFor={`quote-item-type-${index}`}>סוג</label>
                                <select
                                    id={`quote-item-type-${index}`}
                                    value={item.type}
                                    onChange={(e) => updateItem(index, { type: e.target.value as QuoteItem["type"] })}
                                    disabled={!editable || saving}
                                >
                                    <option value="material">חומר</option>
                                    <option value="labor">עבודה</option>
                                    <option value="other">אחר</option>
                                </select>

                                <label htmlFor={`quote-item-unit-${index}`}>יחידת מידה</label>
                                <input
                                    id={`quote-item-unit-${index}`}
                                    value={item.unit}
                                    onChange={(e) => updateItem(index, { unit: e.target.value })}
                                    disabled={!editable || saving}
                                />

                                <label htmlFor={`quote-item-quantity-${index}`}>כמות</label>
                                <input
                                    id={`quote-item-quantity-${index}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                                    disabled={!editable || saving}
                                    required
                                />

                                <label htmlFor={`quote-item-price-${index}`}>מחיר ליחידה (₪)</label>
                                <input
                                    id={`quote-item-price-${index}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                                    disabled={!editable || saving}
                                    required
                                />

                                <p>סה״כ לשורה: {formatMoney(item.quantity * item.unitPrice)}</p>
                                <button
                                    type="button"
                                    className="quote-remove-button"
                                    onClick={() => removeItem(index)}
                                    disabled={!editable || saving}
                                >
                                    הסרת שורה
                                </button>
                            </div>
                        )
                    ))}

                    <button
                        type="button"
                        className="quote-add-button"
                        onClick={addItem}
                        disabled={!editable || saving}
                    >
                        {pricingMode === "manual" ? "+ הוספת עבודה לפירוט" : "+ הוספת חומר או עבודה"}
                    </button>
                </section>

                <section className="quote-section">
                    <h2>סיכום הצעת המחיר</h2>

                    <div className="quote-segmented-field">
                        <span className="quote-control-label">סוג הצעת המחיר</span>
                        <div className="quote-segmented-control" role="group" aria-label="סוג הצעת המחיר">
                            <button
                                type="button"
                                className={`quote-segment ${pricingMode === "manual" ? "is-active" : ""}`}
                                aria-pressed={pricingMode === "manual"}
                                onClick={() => { setPricingMode("manual"); markChanged(); }}
                                disabled={!editable || saving}
                            >
                                גלובלי
                            </button>
                            <button
                                type="button"
                                className={`quote-segment ${pricingMode === "items" ? "is-active" : ""}`}
                                aria-pressed={pricingMode === "items"}
                                onClick={() => { setPricingMode("items"); markChanged(); }}
                                disabled={!editable || saving}
                            >
                                מפורט
                            </button>
                        </div>
                    </div>

                    {pricingMode === "manual" && (
                        <>
                            <label htmlFor="quote-manual-price">מחיר גלובלי (₪)</label>
                            <input
                                id="quote-manual-price"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="לדוגמה: 8700"
                                value={manualPrice ?? ""}
                                onChange={(e) => {
                                    setManualPrice(e.target.value === "" ? null : Number(e.target.value));
                                    markChanged();
                                }}
                                disabled={!editable || saving}
                                required
                            />
                            <p className="quote-pricing-help">המחיר הזה לא תלוי בשורות הפירוט.</p>
                        </>
                    )}

                    <div className="quote-segmented-field">
                        <span className="quote-control-label">איך להציג את המע״מ?</span>
                        <div className="quote-segmented-control" role="group" aria-label="אופן הצגת מע״מ">
                            <button
                                type="button"
                                className={`quote-segment ${!priceIncludesVat ? "is-active" : ""}`}
                                aria-pressed={!priceIncludesVat}
                                onClick={() => { setPriceIncludesVat(false); markChanged(); }}
                                disabled={!editable || saving}
                            >
                                ללא מע״מ
                            </button>
                            <button
                                type="button"
                                className={`quote-segment ${priceIncludesVat ? "is-active" : ""}`}
                                aria-pressed={priceIncludesVat}
                                onClick={() => { setPriceIncludesVat(true); markChanged(); }}
                                disabled={!editable || saving}
                            >
                                כולל מע״מ
                            </button>
                        </div>
                    </div>

                    <p className="quote-pricing-help">
                        ללא מע״מ = המחיר המוצג לפני מע״מ; הסכום לתשלום כולל מע״מ מחושב בנפרד.
                    </p>

                    <label htmlFor="quote-vat">אחוז מע״מ</label>
                    <input
                        id="quote-vat"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={vatPercent}
                        onChange={(e) => { setVatPercent(Number(e.target.value)); markChanged(); }}
                        disabled={!editable || saving}
                        required
                    />

                    <p>מחיר לפני מע״מ: {formatMoney(subtotal)}</p>
                    <p>מע״מ: {formatMoney(vatAmount)}</p>
                    <h3>
                        המחיר שיוצג: {formatMoney(quotedPrice)}
                        <small className="quote-vat-note"> {priceIncludesVat ? "כולל מע״מ" : "לא כולל מע״מ"}</small>
                    </h3>
                    {!priceIncludesVat && <p>לתשלום כולל מע״מ: {formatMoney(total)}</p>}

                    <label htmlFor="quote-notes">הערות ותנאים</label>
                    <textarea
                        id="quote-notes"
                        value={notes}
                        onChange={(e) => { setNotes(e.target.value); markChanged(); }}
                        rows={4}
                        disabled={!editable || saving}
                    />

                    {pricingMode === "items" && (
                        <label className="quote-option-checkbox">
                            <input
                                type="checkbox"
                                checked={showItemPrices}
                                onChange={(e) => { setShowItemPrices(e.target.checked); markChanged(); }}
                                disabled={!editable || saving}
                            />
                            להציג מחירים לכל שורה במסמך הלקוח
                        </label>
                    )}
                </section>

                {error && <p role="alert" style={{ color: "#9b3d35" }}>{error}</p>}
                {successMessage && (
                    <p role="status" className="quote-success">{successMessage}</p>
                )}

                {editable && (
                    <button type="submit" className="quote-save-button" disabled={saving}>
                        {saving ? "שומרים..." : id ? "שמירת שינויים" : "שמירת הצעת מחיר"}
                    </button>
                )}
            </form>

            <section className="quote-client-preview" dir="rtl">
                <div className="quote-preview-heading">
                    <h2>תצוגה מקדימה ללקוח</h2>
                    <p>כך תיראה הצעת המחיר לפני השליחה</p>
                </div>

                <button
                    type="button"
                    className="quote-pdf-button"
                    onClick={() => window.print()}
                >
                    הורדת הצעת מחיר כ-PDF
                </button>

                <div className="quote-preview-paper">
                    <div className="quote-preview-logo">
                        <img src={logo} alt="UV נגרות חוץ" />
                        <h2>הצעת מחיר</h2>
                    </div>

                    <div className="quote-preview-details">
                        <p>
                            <strong>תאריך:</strong>{" "}
                            {new Date(issuedAt || Date.now()).toLocaleDateString("he-IL")}
                        </p>
                        <p><strong>לכבוד:</strong> {customerName || "שם הלקוח"}</p>
                        {customerPhone && (
                            <p><strong>טלפון:</strong> {customerPhone}</p>
                        )}
                        {projectAddress && (
                            <p><strong>כתובת הפרויקט:</strong> {projectAddress}</p>
                        )}
                    </div>

                    <div className="quote-preview-project">
                        <h3>{projectTitle || "שם הפרויקט"}</h3>
                        <h4>פירוט העבודות והחומרים</h4>
                        {items.some((item) => item.description.trim()) && (
                            <table className="quote-preview-table">
                                <thead>
                                    <tr>
                                        <th>תיאור</th>
                                        {displayQuantities && <th>כמות</th>}
                                        {displayLinePrices && <th>מחיר ליחידה</th>}
                                        {displayLinePrices && <th>סה״כ לשורה</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items
                                        .filter((item) => item.description.trim())
                                        .map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.description}</td>
                                                {displayQuantities && <td>{item.quantity} {item.unit}</td>}
                                                {displayLinePrices && <td>{formatMoney(item.unitPrice)}</td>}
                                                {displayLinePrices && (
                                                    <td>{formatMoney(item.quantity * item.unitPrice)}</td>
                                                )}
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="quote-preview-totals">
                        <p>
                            <span>סה״כ לפני מע״מ</span>
                            <strong>{formatMoney(subtotal)}</strong>
                        </p>
                        <p>
                            <span>מע״מ ({vatPercent}%)</span>
                            <strong>{formatMoney(vatAmount)}</strong>
                        </p>
                        <div className="quote-preview-final">
                            <span>{priceIncludesVat ? "סה״כ כולל מע״מ" : "סה״כ לא כולל מע״מ"}</span>
                            <strong>{formatMoney(quotedPrice)}</strong>
                        </div>
                        {!priceIncludesVat && (
                            <p className="quote-vat-breakdown">
                                <span>לתשלום כולל מע״מ</span>
                                <strong>{formatMoney(total)}</strong>
                            </p>
                        )}
                    </div>

                    {notes && (
                        <div className="quote-preview-notes">
                            <h4>הערות ותנאים</h4>
                            <p>{notes}</p>
                        </div>
                    )}

                    <div className="quote-preview-signature">
                        {approvalDetails ? (
                            <div className="quote-signed-result">
                                <h3>אישור וחתימת הלקוח</h3>
                                <p>
                                    <strong>שם החותם/ת: </strong>
                                    {approvalDetails.signedBy || "לא צוין"}
                                </p>
                                {approvalDetails.signedAt && (
                                    <p>
                                        <strong>תאריך ושעת האישור: </strong>
                                        {new Date(approvalDetails.signedAt).toLocaleString("he-IL")}
                                    </p>
                                )}
                                {approvalDetails.signature ? (
                                    <img
                                        src={approvalDetails.signature}
                                        alt="חתימת הלקוח"
                                        className="quote-signed-image"
                                    />
                                ) : (
                                    <p role="status">ההצעה אושרה, אך תמונת החתימה לא נטענה.</p>
                                )}
                            </div>
                        ) : (
                            <>
                                <p>אישור הלקוח</p>
                                <div className="quote-signature-lines">
                                    <span>שם וחתימה: ______________</span>
                                    <span>תאריך: ______________</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}

export default AdminQuotes;