
import {
    useEffect,
    useState,
    type FormEvent,
} from "react";

import {
    Link,
    useLocation,
    useNavigate,
} from "react-router-dom";

import axios from "axios";

type LoginRole = "user" | "admin";

type UserLoginResponse = {
    message?: string;
    token: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
};

type LoginSuccess = {
    message: string;
    redirectTo: string;
};

const EMAIL_REGEX =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// קריאת המידע שב-JWT בצד הדפדפן לצורך תצוגה ובחירת מסלול.
// זו אינה בדיקת חתימה! הרשאות מאובטחות נבדקות בשרת באמצעות jwt.verify.
type TokenClaims = {
    sub?: unknown;
    role?: unknown;
    exp?: unknown;
};

function readTokenClaims(token: string): TokenClaims | null {
    try {
        const segments = token.split(".");
        if (segments.length !== 3) return null;

        const base64 = segments[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");
        const padded = base64.padEnd(
            Math.ceil(base64.length / 4) * 4,
            "="
        );

        const parsed: unknown = JSON.parse(atob(padded));
        if (
            typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)
        ) {
            return null;
        }

        return parsed as TokenClaims;
    } catch {
        return null;
    }
}

function tokenMatchesRole(token: string, expectedRole: LoginRole): boolean {
    const claims = readTokenClaims(token);

    return Boolean(
        claims &&
        typeof claims.sub === "string" &&
        claims.sub.trim().length > 0 &&
        claims.role === expectedRole &&
        typeof claims.exp === "number" &&
        claims.exp * 1000 > Date.now()
    );
}

function AdminLogin() {
    const navigate = useNavigate();
    const location = useLocation();

    // כניסה ישירה לאזור הניהול תבחר מנהל
    const [role, setRole] = useState<LoginRole>(
        location.pathname.startsWith("/admin")
            ? "admin"
            : "user"
    );

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] =
        useState(false);

    const [emailTouched, setEmailTouched] =
        useState(false);

    const [passwordTouched, setPasswordTouched] =
        useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [success, setSuccess] =
        useState<LoginSuccess | null>(null);

    // =====================================
    // התאמת סוג החשבון לכתובת
    // =====================================

    useEffect(() => {
        setRole(
            location.pathname.startsWith("/admin")
                ? "admin"
                : "user"
        );
    }, [location.pathname]);

    // =====================================
    // ולידציות
    // =====================================

    const cleanEmail = email.trim();

    const emailValid =
        EMAIL_REGEX.test(cleanEmail) &&
        cleanEmail.length <= 254;

    // לא מחייבים סיסמת מנהל באורך מסוים
    // כדי לא לשנות את ההתחברות המקורית
    const passwordValid =
        role === "admin"
            ? password.length > 0
            : password.length >= 12;

    const formValid =
        emailValid && passwordValid;

    // =====================================
    // החלפת סוג החשבון
    // =====================================

    const changeRole = (newRole: LoginRole) => {
        if (loading || success) return;

        setRole(newRole);
        setPassword("");
        setPasswordTouched(false);
        setError("");
        setShowPassword(false);
    };

    // =====================================
    // מעבר לעמוד אחרי הצלחה
    // =====================================

    useEffect(() => {
        if (!success) return;

        const timer = window.setTimeout(() => {
            navigate(success.redirectTo, {
                replace: true,
            });
        }, 1200);

        return () => {
            window.clearTimeout(timer);
        };
    }, [success, navigate]);

    // =====================================
    // שליחת התחברות
    // =====================================

    const handleLogin = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (loading || success) return;

        setEmailTouched(true);
        setPasswordTouched(true);
        setError("");

        if (!formValid) {
            setError(
                "יש למלא אימייל וסיסמה תקינים."
            );
            return;
        }

        setLoading(true);

        try {
            if (role === "admin") {
                // =========================
                // התחברות מנהל קיימת
                // =========================

                const response = await axios.post<{
                    token: string;
                }>(
                    "http://localhost:3000/api/auth/login",
                    {
                        email: cleanEmail,
                        password,
                    }
                );

                // ההרשאה נלקחת מתוכן ה-JWT ולא מכפתור בחירת החשבון.
                // השרת הוא הגורם היחיד שמאמת את החתימה ומאשר פעולות.
                if (
                    !response.data.token ||
                    !tokenMatchesRole(response.data.token, "admin")
                ) {
                    throw new Error("Invalid admin token claims");
                }

                localStorage.setItem(
                    "adminToken",
                    response.data.token
                );
                // התחברות חדשה: מתחילים לספור ארבע שעות ללא פעילות.
                localStorage.setItem("uv-last-activity", String(Date.now()));

                // מניעת ערבוב בין חשבון מנהל למשתמש רגיל
                localStorage.removeItem("userToken");
                sessionStorage.removeItem("userToken");
                sessionStorage.removeItem("userName");

                // מציגים אישור במקום טופס
                setSuccess({
                    message:
                        "התחברת בהצלחה כמנהל האתר!",
                    redirectTo: "/admin",
                });

            } else {
                // =========================
                // התחברות משתמש רגיל
                // =========================

                const response =
                    await axios.post<UserLoginResponse>(
                        "http://localhost:3000/api/users/login",
                        {
                            email: cleanEmail.toLowerCase(),
                            password,
                        }
                    );

                const { token, user } =
                    response.data;

                if (
                    !token ||
                    !user ||
                    user.role !== "user" ||
                    !tokenMatchesRole(token, "user")
                ) {
                    throw new Error("Invalid user token or login response");
                }

                // דרישת הפרויקט: שמירת ה-Token ב-localStorage.
                localStorage.setItem("userToken", token);
                localStorage.setItem("uv-last-activity", String(Date.now()));
                sessionStorage.removeItem("userToken");

                // השם מיועד לתצוגה בלבד ולא נשמר בתוך ה-Token.
                sessionStorage.setItem("userName", user.name);

                // משתמש רגיל אינו מנהל
                localStorage.removeItem("adminToken");

                setSuccess({
                    message:
                        `התחברת בהצלחה! ברוכים הבאים, ${user.name}.`,
                    redirectTo: "/",
                });
            }

        } catch (err) {
            console.error(
                "Login failed:",
                err
            );

            if (axios.isAxiosError(err)) {
                const status =
                    err.response?.status;

                if (
                    status === 400 ||
                    status === 401
                ) {
                    setError(
                        "האימייל או הסיסמה שגויים."
                    );
                } else if (status === 403) {
                    setError(
                        "אין הרשאה להתחבר לחשבון הזה."
                    );
                } else if (!err.response) {
                    setError(
                        "לא ניתן להתחבר לשרת. בדקי שה-Backend פועל."
                    );
                } else {
                    setError(
                        "אירעה שגיאת שרת בהתחברות. נסי שוב."
                    );
                }
            } else {
                setError(
                    "התקבלה תשובת התחברות לא תקינה. בדקי שהשרת מחזיר Token עם role, sub ו-exp."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    // =====================================
    // הצגת העמוד
    // =====================================

    return (
        <main
            className="admin-login-page"
            dir="rtl"
        >
            <div className="admin-login-card">

                {/* =========================
                    מסך הצלחה
                ========================= */}

                {success ? (
                    <section
                        className="uv-login-success-screen"
                        role="status"
                        aria-live="polite"
                    >
                        <h1>
                            התחברות הצליחה! ✓
                        </h1>

                        <p>
                            {success.message}
                        </p>

                        <p>
                            מעבירים אותך לעמוד המתאים...
                        </p>

                        <Link to={success.redirectTo}>
                            מעבר עכשיו
                        </Link>
                    </section>
                ) : (
                    <>
                        <h1>
                            ברוכים הבאים ל־UV
                        </h1>

                        <p>
                            נגרות חוץ | התחברות לחשבון
                        </p>

                        {/* בחירת סוג חשבון */}

                        <fieldset className="uv-login-role-group">
                            <legend>
                                סוג חשבון
                            </legend>

                            <label className="uv-login-role-choice">
                                <input
                                    type="radio"
                                    name="login-role"
                                    checked={role === "user"}
                                    onChange={() =>
                                        changeRole("user")
                                    }
                                    disabled={loading}
                                />

                                <span>
                                    משתמש רגיל
                                </span>
                            </label>

                            <label className="uv-login-role-choice">
                                <input
                                    type="radio"
                                    name="login-role"
                                    checked={role === "admin"}
                                    onChange={() =>
                                        changeRole("admin")
                                    }
                                    disabled={loading}
                                />

                                <span>
                                    מנהל האתר
                                </span>
                            </label>
                        </fieldset>

                        <form
                            onSubmit={handleLogin}
                            noValidate
                            aria-busy={loading}
                        >
                            <p className="uv-login-form-info">
                                כל השדות הם שדות חובה.
                            </p>

                            {/* =====================
                                אימייל
                            ===================== */}

                            <label htmlFor="login-email">
                                כתובת אימייל *
                            </label>

                            <input
                                id="login-email"
                                type="email"
                                value={email}
                                onChange={(event) => {
                                    setEmail(
                                        event.target.value
                                    );
                                    setEmailTouched(true);
                                    setError("");
                                }}
                                onBlur={() =>
                                    setEmailTouched(true)
                                }
                                autoComplete="email"
                                placeholder="example@gmail.com"
                                maxLength={254}
                                required
                                disabled={loading}
                                aria-invalid={
                                    emailTouched &&
                                    !emailValid
                                }
                                aria-describedby="login-email-feedback"
                                className={
                                    !emailTouched
                                        ? ""
                                        : emailValid
                                            ? "uv-login-field-valid"
                                            : "uv-login-field-invalid"
                                }
                            />

                            <small
                                id="login-email-feedback"
                                className={
                                    "uv-login-feedback " +
                                    (!emailTouched
                                        ? "is-hint"
                                        : emailValid
                                            ? "is-valid"
                                            : "is-invalid")
                                }
                                aria-live="polite"
                            >
                                {!emailTouched
                                    ? "יש להזין אימייל תקין."
                                    : emailValid
                                        ? "✓ פורמט האימייל תקין"
                                        : "✕ יש להזין כתובת אימייל תקינה."}
                            </small>

                            {/* =====================
                                סיסמה
                            ===================== */}

                            <label htmlFor="login-password">
                                סיסמה *
                            </label>

                            <input
                                id="login-password"
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                value={password}
                                onChange={(event) => {
                                    setPassword(
                                        event.target.value
                                    );
                                    setPasswordTouched(true);
                                    setError("");
                                }}
                                onBlur={() =>
                                    setPasswordTouched(true)
                                }
                                autoComplete="current-password"
                                placeholder="הכניסו סיסמה"
                                required
                                disabled={loading}
                                aria-invalid={
                                    passwordTouched &&
                                    !passwordValid
                                }
                                aria-describedby="login-password-feedback"
                                className={
                                    !passwordTouched
                                        ? ""
                                        : passwordValid
                                            ? "uv-login-field-valid"
                                            : "uv-login-field-invalid"
                                }
                            />

                            <small
                                id="login-password-feedback"
                                className={
                                    "uv-login-feedback " +
                                    (!passwordTouched
                                        ? "is-hint"
                                        : passwordValid
                                            ? "is-valid"
                                            : "is-invalid")
                                }
                                aria-live="polite"
                            >
                                {!passwordTouched
                                    ? role === "admin"
                                        ? "יש להזין את סיסמת המנהל."
                                        : "יש להזין סיסמה של לפחות 12 תווים."
                                    : passwordValid
                                        ? "✓ השדה עומד בדרישות הפורמט"
                                        : role === "admin"
                                            ? "✕ יש להזין סיסמה."
                                            : "✕ יש להזין לפחות 12 תווים."}
                            </small>

                            {/* הצגת הסיסמה */}

                            <label className="uv-login-password-toggle">
                                <input
                                    type="checkbox"
                                    checked={showPassword}
                                    onChange={(event) =>
                                        setShowPassword(
                                            event.target.checked
                                        )
                                    }
                                    disabled={loading}
                                />

                                <span>
                                    {showPassword
                                        ? "הסתרת סיסמה"
                                        : "הצגת סיסמה"}
                                </span>
                            </label>

                            {/* שגיאה מהשרת */}

                            {error && (
                                <p
                                    className="admin-login-error"
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}

                            {/* איפוס סיסמה למשתמשים רשומים בלבד */}
                            {role === "user" && (
                                <p className="uv-login-forgot-password">
                                    <Link to="/forgot-password">
                                        שכחתי סיסמה?
                                    </Link>
                                </p>
                            )}

                            {/* כפתור התחברות */}

                            <button
                                type="submit"
                                disabled={
                                    loading ||
                                    !formValid
                                }
                            >
                                {loading
                                    ? "מתחברים..."
                                    : "התחברות"}
                            </button>

                            {!formValid && (
                                <p className="uv-login-submit-help">
                                    יש למלא את כל שדות
                                    החובה בפרטים תקינים.
                                </p>
                            )}
                        </form>

                        {/* הרשמה */}

                        {role === "user" && (
                            <p className="uv-login-register-text">
                                עדיין אין לכם חשבון?{" "}
                                <Link to="/register">
                                    הרשמה לאתר
                                </Link>
                            </p>
                        )}

                        <p className="uv-login-back-home">
                            <Link to="/">
                                חזרה לדף הבית
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </main>
    );
}

export default AdminLogin;
