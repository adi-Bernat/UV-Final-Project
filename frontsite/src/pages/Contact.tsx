
import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";

import {
    Link,
    useLocation,
    useNavigate,
} from "react-router-dom";

import axios from "axios";


type FieldName = "name" | "phone" | "message";

type ContactSuccessState = {
    sent: boolean;
    whatsappLink: string;
};

const API_URL = "http://localhost:3000/api/contact";

function Contact() {
    const navigate = useNavigate();
    const location = useLocation();

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("");

    const [touched, setTouched] = useState<
        Record<FieldName, boolean>
    >({
        name: false,
        phone: false,
        message: false,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const successHeadingRef =
        useRef<HTMLHeadingElement>(null);

    // =====================================
    // ולידציות
    // =====================================

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanMessage = message.trim();

    const normalizedPhone = cleanPhone.replace(
        /[\s\-().]/g,
        ""
    );

    const nameValid =
        cleanName.length >= 2 &&
        cleanName.length <= 100;

    // טלפון ישראלי, כולל אפשרות ל-+972
    const phoneValid =
        /^(?:0[2-9]\d{7,8}|\+972[2-9]\d{7,8})$/.test(
            normalizedPhone
        );

    const messageValid =
        cleanMessage.length >= 5 &&
        cleanMessage.length <= 2000;

    const formValid =
        nameValid &&
        phoneValid &&
        messageValid;

    // =====================================
    // מעקב אחרי שדות שהמשתמש ערך
    // =====================================

    const markTouched = (field: FieldName) => {
        setTouched((previous) => ({
            ...previous,
            [field]: true,
        }));
    };

    const getFeedbackClass = (
        field: FieldName,
        valid: boolean
    ) => {
        if (!touched[field]) {
            return "uv-form-feedback is-hint";
        }

        return valid
            ? "uv-form-feedback is-valid"
            : "uv-form-feedback is-invalid";
    };

    // =====================================
    // מסך אישור לאחר שליחה
    // =====================================

    const confirmation =
        location.state as ContactSuccessState | null;

    const success =
        location.pathname === "/contact/success" &&
        confirmation?.sent === true;

    // כניסה ישירה לכתובת הצלחה ללא שליחת טופס
    useEffect(() => {
        if (
            location.pathname === "/contact/success" &&
            !success
        ) {
            navigate("/contact", { replace: true });
        }
    }, [location.pathname, success, navigate]);

    // מיקוד בכותרת האישור לאחר הצלחה
    useEffect(() => {
        if (success) {
            successHeadingRef.current?.focus();
        }
    }, [success]);

    // =====================================
    // שליחת הטופס
    // =====================================

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (loading) return;

        setTouched({
            name: true,
            phone: true,
            message: true,
        });

        // לא מאפשרים שליחה עם נתונים לא תקינים
        if (!formValid) {
            setError(
                "יש לתקן את השדות המסומנים לפני השליחה."
            );
            return;
        }

        setLoading(true);
        setError("");

        try {
            // שמירת הפנייה בשרת
            await axios.post(API_URL, {
                name: cleanName,
                phone: normalizedPhone,
                message: cleanMessage,
            });
            // שמירה על אפשרות ההמשך לוואטסאפ
            const whatsappNumber = "972523115559";

            const whatsappMessage =
                "שלום יובל, אשמח לקבל פרטים על עבודה." +
                "\n\nשם: " + cleanName +
                "\nטלפון: " + cleanPhone +
                "\nתיאור העבודה: " + cleanMessage;

            let whatsappLink = "";

            if (/^9725\d{8}$/.test(whatsappNumber)) {
                whatsappLink =
                    "https://wa.me/" +
                    whatsappNumber +
                    "?text=" +
                    encodeURIComponent(whatsappMessage);
            }

            // מעבר לדף אישור רק לאחר הצלחה מהשרת
            navigate("/contact/success", {
                replace: true,
                state: {
                    sent: true,
                    whatsappLink,
                } satisfies ContactSuccessState,
            });

        } catch (err) {
            console.error(
                "Error sending contact form:",
                err
            );

            if (
                axios.isAxiosError(err) &&
                err.response?.status === 400
            ) {
                setError(
                    "השרת דחה את הפרטים. בדקו את השדות ונסו שוב."
                );
            } else {
                setError(
                    "לא הצלחנו לשמור את הפנייה. נסו שוב."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    // =====================================
    // התחלת פנייה חדשה
    // =====================================

    const resetForm = () => {
        setName("");
        setPhone("");
        setMessage("");

        setTouched({
            name: false,
            phone: false,
            message: false,
        });

        setError("");

        navigate("/contact", {
            replace: true,
            state: null,
        });
    };

    // =====================================
    // תצוגת העמוד
    // =====================================

    return (
        <main
            id="main-content"
            className="contact-page"
            dir="rtl"
        >
            <section
                className="contact-intro"
                aria-labelledby="contact-title"
            >
                <h1 id="contact-title">
                    בואו נדבר על הפרויקט הבא שלכם
                </h1>

                <p>
                    חולמים על פרגולה, דק, גדר
                    או עבודת עץ אחרת?
                    השאירו פרטים ונשמח לשמוע
                    על הרעיון שלכם.
                </p>
            </section>

            {success ? (
                // =====================================
                // מסך הצלחה
                // =====================================

                <section
                    className="contact-success"
                    aria-labelledby="contact-success-title"
                >
                    <h2
                        id="contact-success-title"
                        ref={successHeadingRef}
                        tabIndex={-1}
                    >
                        הפנייה נשלחה בהצלחה! ✓
                    </h2>

                    <p role="status">
                        תודה שפניתם אלינו.
                        הפנייה שלכם התקבלה ונשמרה בהצלחה.
                        ניצור איתכם קשר בהקדם.
                    </p>

                    {confirmation?.whatsappLink && (
                        <a
                            href={confirmation.whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-submit contact-whatsapp-link"
                            aria-label="המשך לשיחה בוואטסאפ, נפתח בחלון חדש"
                        >
                            המשך לשיחה בוואטסאפ
                        </a>
                    )}

                    <button
                        type="button"
                        className="contact-new-message"
                        onClick={resetForm}
                    >
                        שליחת פנייה נוספת
                    </button>

                    <Link
                        to="/"
                        className="contact-new-message"
                    >
                        חזרה לדף הבית
                    </Link>
                </section>
            ) : (
                // =====================================
                // טופס יצירת קשר
                // =====================================

                <form
                    className="contact-form"
                    onSubmit={handleSubmit}
                    noValidate
                    aria-label="טופס יצירת קשר"
                    aria-busy={loading}
                    aria-describedby="contact-form-description"
                >
                    <p
                        id="contact-form-description"
                        className="contact-form-description"
                    >
                        כל השדות בטופס הם שדות חובה.
                        מתחת לכל שדה יופיע חיווי
                        אם הנתונים שהזנתם תקינים.
                    </p>

                    {/* =====================================
              שם מלא
          ===================================== */}

                    <label htmlFor="contact-name">
                        שם מלא
                        <span aria-hidden="true"> *</span>
                    </label>

                    <input
                        id="contact-name"
                        name="name"
                        type="text"
                        value={name}
                        onChange={(event) => {
                            setName(event.target.value);
                            markTouched("name");
                            setError("");
                        }}
                        onBlur={() => markTouched("name")}
                        placeholder="השם שלכם"
                        autoComplete="name"
                        minLength={2}
                        maxLength={100}
                        required
                        disabled={loading}
                        aria-invalid={
                            touched.name && !nameValid
                        }
                        aria-describedby="contact-name-feedback"
                        className={
                            touched.name
                                ? nameValid
                                    ? "uv-form-valid"
                                    : "uv-form-invalid"
                                : ""
                        }
                    />

                    <small
                        id="contact-name-feedback"
                        className={getFeedbackClass(
                            "name",
                            nameValid
                        )}
                        aria-live="polite"
                    >
                        {!touched.name
                            ? "יש להזין שם באורך 2–100 תווים."
                            : nameValid
                                ? "✓ השם תקין"
                                : "✕ יש להזין שם באורך 2–100 תווים."}
                    </small>

                    {/* =====================================
              מספר טלפון
          ===================================== */}

                    <label htmlFor="contact-phone">
                        מספר טלפון
                        <span aria-hidden="true"> *</span>
                    </label>

                    <input
                        id="contact-phone"
                        name="tel"
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(event) => {
                            setPhone(event.target.value);
                            markTouched("phone");
                            setError("");
                        }}
                        onBlur={() => markTouched("phone")}
                        placeholder="050-0000000"
                        autoComplete="tel"
                        maxLength={20}
                        required
                        disabled={loading}
                        aria-invalid={
                            touched.phone && !phoneValid
                        }
                        aria-describedby="contact-phone-feedback"
                        className={
                            touched.phone
                                ? phoneValid
                                    ? "uv-form-valid"
                                    : "uv-form-invalid"
                                : ""
                        }
                    />

                    <small
                        id="contact-phone-feedback"
                        className={getFeedbackClass(
                            "phone",
                            phoneValid
                        )}
                        aria-live="polite"
                    >
                        {!touched.phone
                            ? "יש להזין מספר טלפון ישראלי תקין."
                            : phoneValid
                                ? "✓ מספר הטלפון תקין"
                                : "✕ יש להזין מספר טלפון תקין, למשל 050-1234567."}
                    </small>

                    {/* =====================================
              תיאור הפרויקט
          ===================================== */}

                    <label htmlFor="contact-message">
                        ספרו לנו על הפרויקט
                        <span aria-hidden="true"> *</span>
                    </label>

                    <textarea
                        id="contact-message"
                        name="message"
                        value={message}
                        onChange={(event) => {
                            setMessage(event.target.value);
                            markTouched("message");
                            setError("");
                        }}
                        onBlur={() => markTouched("message")}
                        placeholder="איזו עבודה תרצו לבצע?"
                        minLength={5}
                        maxLength={2000}
                        rows={5}
                        required
                        disabled={loading}
                        aria-invalid={
                            touched.message && !messageValid
                        }
                        aria-describedby="contact-message-feedback"
                        className={
                            touched.message
                                ? messageValid
                                    ? "uv-form-valid"
                                    : "uv-form-invalid"
                                : ""
                        }
                    />

                    <small
                        id="contact-message-feedback"
                        className={getFeedbackClass(
                            "message",
                            messageValid
                        )}
                        aria-live="polite"
                    >
                        {!touched.message
                            ? "יש לכתוב לפחות 5 תווים, עד 2,000 תווים."
                            : messageValid
                                ? "✓ תיאור הפרויקט תקין"
                                : "✕ יש לכתוב תיאור באורך 5–2,000 תווים."}
                    </small>

                    {/* =====================================
              שגיאה בשליחת הטופס
          ===================================== */}

                    {error && (
                        <p
                            id="contact-form-error"
                            className="contact-error"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    {/* חיווי לקוראי מסך */}
                    <div
                        role="status"
                        aria-live="polite"
                        className="uv-sr-only"
                    >
                        {loading
                            ? "הפנייה נשלחת, אנא המתינו."
                            : ""}
                    </div>

                    {/* =====================================
              כפתור שליחה
          ===================================== */}

                    <button
                        type="submit"
                        className="contact-submit"
                        disabled={
                            loading || !formValid
                        }
                    >
                        {loading
                            ? "שולחים..."
                            : "שליחת פנייה"}
                    </button>

                    {!formValid && (
                        <p className="uv-form-submit-help">
                            השליחה תתאפשר לאחר מילוי
                            כל שדות החובה בפרטים תקינים.
                        </p>
                    )}
                </form>
            )}
        </main>
    );
}

export default Contact;
