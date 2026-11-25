import {
    useEffect,
    useRef,
    useState,
    type MouseEvent,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

// דרישת HackerU: התנתקות לאחר ארבע שעות ללא פעילות.
const INACTIVITY_LIMIT_MS = 4 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "uv-last-activity";
const ACTIVITY_WRITE_INTERVAL_MS = 15 * 1000;

type AuthStatus = {
    isAdmin: boolean;
    isUser: boolean;
    userName: string;
};

// מצב התצוגה בלבד: הרשאות אמיתיות נבדקות בשרת.
function getAuthStatus(): AuthStatus {
    return {
        isAdmin: Boolean(localStorage.getItem("adminToken")),
        isUser: Boolean(localStorage.getItem("userToken")),
        userName: sessionStorage.getItem("userName") || "",
    };
}

function scrollToServices() {
    const servicesSection = document.getElementById("services");
    if (!servicesSection) return;

    const reduceMotion =
        document.documentElement.classList.contains("uv-a11y2-motion") ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    servicesSection.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
    });
}

function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [auth, setAuth] = useState<AuthStatus>(getAuthStatus);
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    // מעדכן תצוגה אחרי התחברות ומעבר עמוד.
    useEffect(() => {
        setAuth(getAuthStatus());
        setMenuOpen(false);
    }, [location.pathname, location.hash, location.key]);

    // עדכון כשמשתנה ה-localStorage בטאב אחר.
    useEffect(() => {
        const syncAuth = () => setAuth(getAuthStatus());
        window.addEventListener("storage", syncAuth);
        return () => window.removeEventListener("storage", syncAuth);
    }, []);

    // ניתוק אוטומטי לאחר 4 שעות ללא פעילות, גם אחרי רענון או חזרה לטאב.
    useEffect(() => {
        const isSignedIn = () =>
            Boolean(
                localStorage.getItem("adminToken") ||
                localStorage.getItem("userToken")
            );

        const logoutDueToInactivity = () => {
            if (!isSignedIn()) return;

            const wasAdmin = Boolean(localStorage.getItem("adminToken"));
            localStorage.removeItem("adminToken");
            localStorage.removeItem("userToken");
            localStorage.removeItem(LAST_ACTIVITY_KEY);
            localStorage.removeItem("uv-favorite-projects");
            sessionStorage.removeItem("userToken");
            sessionStorage.removeItem("userName");

            setAuth(getAuthStatus());
            setMenuOpen(false);
            navigate(wasAdmin ? "/admin/login" : "/login", {
                replace: true,
                state: { logoutReason: "inactivity" },
            });
        };

        const checkInactivity = () => {
            if (!isSignedIn()) {
                // אין התחברות פעילה: אין סיבה לשמור את זמן הפעילות הקודם.
                if (localStorage.getItem(LAST_ACTIVITY_KEY)) {
                    localStorage.removeItem(LAST_ACTIVITY_KEY);
                }
                return;
            }

            const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
            const now = Date.now();

            if (!Number.isFinite(lastActivity) || lastActivity <= 0) {
                // חשבון שהיה מחובר עוד לפני התקנת המנגנון.
                localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
                return;
            }

            if (now - lastActivity >= INACTIVITY_LIMIT_MS) {
                logoutDueToInactivity();
            }
        };

        const recordActivity = () => {
            if (!isSignedIn()) return;

            const now = Date.now();
            const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));

            // פעילות לאחר ארבע שעות לא תאריך בדיעבד התחברות שפג זמנה.
            if (Number.isFinite(lastActivity) && lastActivity > 0 &&
                now - lastActivity >= INACTIVITY_LIMIT_MS) {
                logoutDueToInactivity();
                return;
            }

            // לא כותבים ל-localStorage בכל אירוע כדי למנוע עומס.
            if (!Number.isFinite(lastActivity) || lastActivity <= 0 ||
                now - lastActivity >= ACTIVITY_WRITE_INTERVAL_MS) {
                localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
            }
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") checkInactivity();
        };

        // מיועד גם למקרה שבו המשתמש היה פעיל בטאב אחר של אותו אתר.
        const onStorageChange = (event: StorageEvent) => {
            if (
                event.key === LAST_ACTIVITY_KEY ||
                event.key === "adminToken" ||
                event.key === "userToken"
            ) {
                checkInactivity();
            }
        };

        checkInactivity();
        window.addEventListener("pointerdown", recordActivity, { passive: true });
        window.addEventListener("keydown", recordActivity);
        window.addEventListener("scroll", recordActivity, { passive: true });
        window.addEventListener("touchstart", recordActivity, { passive: true });
        window.addEventListener("focus", checkInactivity);
        window.addEventListener("storage", onStorageChange);
        document.addEventListener("visibilitychange", onVisibilityChange);
        const intervalId = window.setInterval(checkInactivity, 60 * 1000);

        return () => {
            window.removeEventListener("pointerdown", recordActivity);
            window.removeEventListener("keydown", recordActivity);
            window.removeEventListener("scroll", recordActivity);
            window.removeEventListener("touchstart", recordActivity);
            window.removeEventListener("focus", checkInactivity);
            window.removeEventListener("storage", onStorageChange);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.clearInterval(intervalId);
        };
    }, [navigate]);

    // סגירת התפריט במקש Escape.
    useEffect(() => {
        if (!menuOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMenuOpen(false);
                menuButtonRef.current?.focus();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [menuOpen]);

    // גלילה לשירותים כאשר מגיעים מדף אחר.
    useEffect(() => {
        if (location.pathname !== "/" || location.hash !== "#services") {
            return;
        }

        let secondFrame = 0;
        const firstFrame = requestAnimationFrame(() => {
            secondFrame = requestAnimationFrame(scrollToServices);
        });

        return () => {
            cancelAnimationFrame(firstFrame);
            cancelAnimationFrame(secondFrame);
        };
    }, [location.pathname, location.hash]);

    const skipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
        const main = document.querySelector<HTMLElement>("main, [role='main']");
        if (!main) return;

        event.preventDefault();
        main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
        main.scrollIntoView({ behavior: "auto", block: "start" });
    };

    const closeMenu = () => setMenuOpen(false);

    const handleServicesClick = () => {
        closeMenu();
        if (location.pathname === "/" && location.hash === "#services") {
            requestAnimationFrame(scrollToServices);
        }
    };

    const isAdminPage =
        location.pathname === "/admin" ||
        location.pathname.startsWith("/admin/");

    // במקרה ששני סוגי הטוקנים קיימים, באזור הניהול ניתן עדיפות למנהל.
    const showAdmin = auth.isAdmin && (isAdminPage || !auth.isUser);
    const showUser = auth.isUser && !showAdmin;
    const showGuest = !showAdmin && !showUser;

    const handleLogout = () => {
        const wasAdmin = showAdmin;
        localStorage.removeItem("adminToken");
        localStorage.removeItem("userToken");
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        // מנקים מועדפים מקומיים שנותרו מאורח, לא את המועדפים שבחשבון המשתמש.
        localStorage.removeItem("uv-favorite-projects");
        sessionStorage.removeItem("userToken"); // ניקוי נתונים ישנים לפני המעבר ל-localStorage
        sessionStorage.removeItem("userName");
        setAuth(getAuthStatus());
        setMenuOpen(false);
        navigate(wasAdmin ? "/admin/login" : "/", { replace: true });
    };

    return (
        <>
            <a href="#main-content" className="uv-skip-link" onClick={skipToContent}>
                דילוג לתוכן הראשי
            </a>

            <header className="site-header">
                <div className="brand">
                    <Link
                        to="/"
                        onClick={closeMenu}
                        aria-label="UV נגרות חוץ - דף הבית"
                        className="uv-header-brand-link"
                    >
                        <div className="header-logo-crop">
                            <img src={logo} alt="" className="header-logo" />
                        </div>
                    </Link>
                </div>

                <button
                    ref={menuButtonRef}
                    type="button"
                    className="uv-mobile-menu-button"
                    aria-label={menuOpen ? "סגירת התפריט הראשי" : "פתיחת התפריט הראשי"}
                    aria-controls="uv-header-navigation"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((previous) => !previous)}
                >
                    <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
                    <span>תפריט</span>
                </button>

                <nav
                    id="uv-header-navigation"
                    aria-label="ניווט ראשי"
                    className={"uv-header-navigation" + (menuOpen ? " is-open" : "")}
                >
                    <Link
                        to="/"
                        aria-current={location.pathname === "/" ? "page" : undefined}
                        onClick={closeMenu}
                    >
                        ראשי
                    </Link>

                    <Link to="/#services" onClick={handleServicesClick}>
                        שירותים
                    </Link>

                    <Link
                        to="/about"
                        aria-current={location.pathname === "/about" ? "page" : undefined}
                        onClick={closeMenu}
                    >
                        אודות
                    </Link>

                    <Link
                        to="/contact"
                        aria-current={location.pathname === "/contact" ? "page" : undefined}
                        onClick={closeMenu}
                    >
                        צור קשר
                    </Link>

                    <Link
                        to="/favorites"
                        className="uv-favorites-nav-link"
                        aria-current={location.pathname === "/favorites" ? "page" : undefined}
                        onClick={closeMenu}
                    >
                        <span aria-hidden="true">♡</span>{" "}
                        <span>המועדפים שלי</span>
                    </Link>

                    {showGuest && (
                        <>
                            <Link
                                to="/login"
                                aria-current={location.pathname === "/login" ? "page" : undefined}
                                onClick={closeMenu}
                            >
                                התחברות
                            </Link>
                            <Link
                                to="/register"
                                aria-current={location.pathname === "/register" ? "page" : undefined}
                                onClick={closeMenu}
                            >
                                הרשמה
                            </Link>
                        </>
                    )}

                    {showUser && (
                        <>
                            <span className="uv-header-user-name">
                                שלום, {auth.userName || "משתמש"}
                            </span>
                            <Link
                                to="/profile"
                                aria-current={location.pathname === "/profile" ? "page" : undefined}
                                onClick={closeMenu}
                            >
                                הפרופיל שלי
                            </Link>
                        </>
                    )}

                    {showAdmin && (
                        <Link
                            to="/admin"
                            aria-current={location.pathname === "/admin" ? "page" : undefined}
                            onClick={closeMenu}
                        >
                            מערכת ניהול
                        </Link>
                    )}

                    {(showAdmin || showUser) && (
                        <button
                            type="button"
                            className="nav-logout-button"
                            onClick={handleLogout}
                        >
                            התנתקות
                        </button>
                    )}
                </nav>
            </header>
        </>
    );
}

export default Header;
