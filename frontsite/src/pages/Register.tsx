
import {
    useEffect,
    useState,
    type FormEvent,
} from "react";

import {
    Link,
    useNavigate,
} from "react-router-dom";

import axios from "axios";

type FieldName =
    | "name"
    | "email"
    | "password"
    | "confirmPassword";

type RegisterResponse = {
    message?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Register() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [showPasswords, setShowPasswords] =
        useState(false);

    const [touched, setTouched] = useState<
        Record<FieldName, boolean>
    >({
        name: false,
        email: false,
        password: false,
        confirmPassword: false,
    });

    const [emailConflict, setEmailConflict] =
        useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    // =====================================
    // בדיקת תקינות כל השדות
    // =====================================

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    const nameValid =
        cleanName.length >= 2 &&
        cleanName.length <= 80;

    const emailValid =
        EMAIL_REGEX.test(cleanEmail) &&
        cleanEmail.length <= 254 &&
        !emailConflict;

    const passwordValid =
        password.length >= 12;

    const confirmPasswordValid =
        confirmPassword.length > 0 &&
        confirmPassword === password &&
        passwordValid;

    const formValid =
        nameValid &&
        emailValid &&
        passwordValid &&
        confirmPasswordValid;

    // =====================================
    // סימון שדה שהמשתמש התחיל למלא
    // =====================================

    const markTouched = (field: FieldName) => {
        setTouched((previous) => ({
            ...previous,
            [field]: true,
        }));
    };

    // =====================================
    // חיווי חזותי לכל שדה
    // =====================================

    const getFieldClass = (
        field: FieldName,
        valid: boolean
    ) => {
        if (!touched[field]) return "";

        return valid
            ? "uv-register-field-valid"
            : "uv-register-field-invalid";
    };

    const getFeedbackClass = (
        field: FieldName,
        valid: boolean
    ) => {
        if (!touched[field]) {
            return "uv-register-feedback is-hint";
        }

        return valid
            ? "uv-register-feedback is-valid"
            : "uv-register-feedback is-invalid";
    };

    // =====================================
    // מעבר להתחברות לאחר הרשמה מוצלחת
    // =====================================

    useEffect(() => {
        if (!success) return;

        const timeout = window.setTimeout(() => {
            navigate("/login", {
                replace: true,
            });
        }, 3500);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [success, navigate]);

    // =====================================
    // שליחת טופס הרשמה
    // =====================================

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (loading) return;

        setError("");

        setTouched({
            name: true,
            email: true,
            password: true,
            confirmPassword: true,
        });

        // לא שולחים טופס לא תקין
        if (!formValid) {
            setError(
                "יש לתקן את השדות המסומנים לפני ההרשמה."
            );
            return;
        }

        setLoading(true);

        try {
            await axios.post<RegisterResponse>(
                "http://localhost:3000/api/register",
                {
                    name: cleanName,
                    email: cleanEmail.toLowerCase(),
                    password,
                }
            );

            // הרשמה הצליחה
            setSuccess(true);

            // לא משאירים סיסמאות בזיכרון הטופס
            setPassword("");
            setConfirmPassword("");

        } catch (err) {
            console.error("Registration failed:", err);

            if (axios.isAxiosError<RegisterResponse>(err)) {
                if (err.response?.status === 409) {
                    // כתובת אימייל שכבר רשומה
                    setEmailConflict(true);
                    setTouched((previous) => ({
                        ...previous,
                        email: true,
                    }));
                    setError("כתובת האימייל כבר רשומה במערכת.");
                } else if (err.response) {
                    // שגיאה שהשרת החזיר (למשל 400 או 500)
                    setError(
                        err.response.data?.message ||
                        "לא ניתן ליצור את החשבון. בדקו את הפרטים."
                    );
                } else {
                    // שגיאת רשת / שרת לא זמין
                    setError(
                        "לא ניתן להתחבר לשרת. בדקו שהשרת פועל ונסו שוב."
                    );
                }
            } else {
                setError("אירעה שגיאה לא צפויה. נסו שוב.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main
            className="uv-register-page"
            dir="rtl"
        >
            <section className="uv-register-card">

                {success ? (
                    // =================================
                    // הודעת הצלחה
                    // =================================

                    <div
                        className="uv-register-success"
                        role="status"
                        aria-live="polite"
                    >
                        <h1>
                            ההרשמה הושלמה בהצלחה! ✓
                        </h1>

                        <p>
                            החשבון שלך נוצר ונשמר
                            במערכת בהצלחה.
                        </p>

                        <p>
                            מיד נעביר אותך לעמוד
                            ההתחברות.
                        </p>

                        <Link
                            to="/login"
                            className="uv-register-link"
                        >
                            מעבר להתחברות
                        </Link>
                    </div>
                ) : (
                    <>
                        <h1>מצטרפים ל־UV</h1>

                        <h2>יצירת חשבון חדש</h2>

                        <p>
                            הרשמה מהירה לאתר
                            נגרות החוץ שלנו.
                        </p>

                        <form
                            onSubmit={handleSubmit}
                            noValidate
                            aria-busy={loading}
                        >
                            <p className="uv-register-form-info">
                                כל השדות הם שדות חובה.
                                מתחת לכל שדה יופיע
                                חיווי על תקינות הפרטים.
                            </p>

                            {/* =======================
                                שם מלא
                            ======================= */}

                            <label htmlFor="register-name">
                                שם מלא *
                            </label>

                            <input
                                id="register-name"
                                name="name"
                                type="text"
                                value={name}
                                onChange={(event) => {
                                    setName(
                                        event.target.value
                                    );
                                    markTouched("name");
                                    setError("");
                                }}
                                onBlur={() =>
                                    markTouched("name")
                                }
                                placeholder="שם מלא"
                                autoComplete="name"
                                minLength={2}
                                maxLength={80}
                                required
                                disabled={loading}
                                aria-invalid={
                                    touched.name &&
                                    !nameValid
                                }
                                aria-describedby="register-name-feedback"
                                className={getFieldClass(
                                    "name",
                                    nameValid
                                )}
                            />

                            <small
                                id="register-name-feedback"
                                className={getFeedbackClass(
                                    "name",
                                    nameValid
                                )}
                                aria-live="polite"
                            >
                                {!touched.name
                                    ? "יש להזין שם באורך 2–80 תווים."
                                    : nameValid
                                        ? "✓ השם תקין"
                                        : "✕ יש להזין שם באורך 2–80 תווים."}
                            </small>

                            {/* =======================
                                כתובת אימייל
                            ======================= */}

                            <label htmlFor="register-email">
                                כתובת אימייל *
                            </label>

                            <input
                                id="register-email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(event) => {
                                    setEmail(
                                        event.target.value
                                    );
                                    setEmailConflict(false);
                                    markTouched("email");
                                    setError("");
                                }}
                                onBlur={() =>
                                    markTouched("email")
                                }
                                placeholder="example@gmail.com"
                                autoComplete="email"
                                maxLength={254}
                                required
                                disabled={loading}
                                aria-invalid={
                                    touched.email &&
                                    !emailValid
                                }
                                aria-describedby="register-email-feedback"
                                className={getFieldClass(
                                    "email",
                                    emailValid
                                )}
                            />

                            <small
                                id="register-email-feedback"
                                className={getFeedbackClass(
                                    "email",
                                    emailValid
                                )}
                                aria-live="polite"
                            >
                                {emailConflict
                                    ? "✕ כתובת האימייל כבר רשומה במערכת."
                                    : !touched.email
                                        ? "יש להזין כתובת אימייל תקינה."
                                        : emailValid
                                            ? "✓ כתובת האימייל תקינה"
                                            : "✕ יש להזין כתובת אימייל תקינה."}
                            </small>

                            {/* =======================
                                סיסמה
                            ======================= */}

                            <label htmlFor="register-password">
                                סיסמה *
                            </label>

                            <input
                                id="register-password"
                                name="password"
                                type={
                                    showPasswords
                                        ? "text"
                                        : "password"
                                }
                                value={password}
                                onChange={(event) => {
                                    setPassword(
                                        event.target.value
                                    );
                                    markTouched("password");
                                    setError("");
                                }}
                                onBlur={() =>
                                    markTouched("password")
                                }
                                placeholder="לפחות 12 תווים"
                                autoComplete="new-password"
                                minLength={12}
                                required
                                disabled={loading}
                                aria-invalid={
                                    touched.password &&
                                    !passwordValid
                                }
                                aria-describedby="register-password-feedback"
                                className={getFieldClass(
                                    "password",
                                    passwordValid
                                )}
                            />

                            <small
                                id="register-password-feedback"
                                className={getFeedbackClass(
                                    "password",
                                    passwordValid
                                )}
                                aria-live="polite"
                            >
                                {!touched.password
                                    ? "הסיסמה חייבת להכיל לפחות 12 תווים."
                                    : passwordValid
                                        ? "✓ אורך הסיסמה תקין"
                                        : "✕ יש להזין סיסמה באורך 12 תווים לפחות."}
                            </small>

                            {/* =======================
                                אימות סיסמה
                            ======================= */}

                            <label htmlFor="register-confirm">
                                אימות סיסמה *
                            </label>

                            <input
                                id="register-confirm"
                                name="confirmPassword"
                                type={
                                    showPasswords
                                        ? "text"
                                        : "password"
                                }
                                value={confirmPassword}
                                onChange={(event) => {
                                    setConfirmPassword(
                                        event.target.value
                                    );
                                    markTouched(
                                        "confirmPassword"
                                    );
                                    setError("");
                                }}
                                onBlur={() =>
                                    markTouched(
                                        "confirmPassword"
                                    )
                                }
                                placeholder="הקלידו שוב את הסיסמה"
                                autoComplete="new-password"
                                required
                                disabled={loading}
                                aria-invalid={
                                    touched.confirmPassword &&
                                    !confirmPasswordValid
                                }
                                aria-describedby="register-confirm-feedback"
                                className={getFieldClass(
                                    "confirmPassword",
                                    confirmPasswordValid
                                )}
                            />

                            <small
                                id="register-confirm-feedback"
                                className={getFeedbackClass(
                                    "confirmPassword",
                                    confirmPasswordValid
                                )}
                                aria-live="polite"
                            >
                                {!touched.confirmPassword
                                    ? "יש להקליד שוב את אותה הסיסמה."
                                    : confirmPasswordValid
                                        ? "✓ הסיסמאות תואמות"
                                        : "✕ הסיסמאות אינן תואמות או שהסיסמה קצרה מדי."}
                            </small>

                            {/* =======================
                                הצגת סיסמאות
                            ======================= */}

                            <label className="uv-register-password-toggle">
                                <input
                                    type="checkbox"
                                    checked={showPasswords}
                                    onChange={(event) =>
                                        setShowPasswords(
                                            event.target.checked
                                        )
                                    }
                                    disabled={loading}
                                />

                                <span>
                                    {showPasswords
                                        ? "הסתרת סיסמאות"
                                        : "הצגת סיסמאות"}
                                </span>
                            </label>

                            {/* =======================
                                הודעת שגיאה כללית
                            ======================= */}

                            {error && (
                                <p
                                    className="uv-register-error"
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}

                            {/* =======================
                                כפתור הרשמה
                            ======================= */}

                            <button
                                type="submit"
                                disabled={
                                    loading ||
                                    !formValid
                                }
                            >
                                {loading
                                    ? "יוצרים חשבון..."
                                    : "יצירת חשבון"}
                            </button>

                            {!formValid && (
                                <p className="uv-register-submit-help">
                                    השליחה תתאפשר לאחר
                                    שכל שדות החובה
                                    יהיו תקינים.
                                </p>
                            )}

                        </form>

                        <p className="uv-register-login-text">
                            כבר יש לך חשבון?{" "}
                            <Link to="/login">
                                התחברות
                            </Link>
                        </p>

                        <Link
                            to="/"
                            className="uv-register-back"
                        >
                            חזרה לדף הבית
                        </Link>
                    </>
                )}

            </section>
        </main>
    );
}

export default Register;
