
import logo from "../assets/logo.png";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

type ContactMessage = {
    _id: string;
    name: string;
    phone: string;
    message: string;
    status: "new" | "in-progress" | "completed";
    createdAt: string;
};

// קריאת תפקיד ותוקף מתוך ה-JWT לצורך חיווי וניווט בצד הלקוח.
// ההרשאה האמיתית נקבעת רק בשרת באמצעות jwt.verify.
type AdminJwtClaims = {
    sub?: unknown;
    role?: unknown;
    exp?: unknown;
};

function getValidAdminToken(): string | null {
    const token = localStorage.getItem("adminToken");
    if (!token) return null;

    try {
        const parts = token.split(".");
        if (parts.length !== 3) {
            throw new Error("Invalid JWT format");
        }

        const base64 = parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");
        const padded = base64.padEnd(
            Math.ceil(base64.length / 4) * 4,
            "="
        );

        const claims = JSON.parse(atob(padded)) as AdminJwtClaims;

        if (
            claims.role !== "admin" ||
            typeof claims.sub !== "string" ||
            !claims.sub.trim() ||
            typeof claims.exp !== "number" ||
            claims.exp * 1000 <= Date.now()
        ) {
            throw new Error("Invalid or expired admin claims");
        }

        return token;
    } catch {
        localStorage.removeItem("adminToken");
        return null;
    }
}

function AdminDashboard() {
    const navigate = useNavigate();

    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [accessVerified, setAccessVerified] = useState(false);

    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [statusError, setStatusError] = useState("");

    // מחיקת פניות
    const [pendingDelete, setPendingDelete] =
        useState<ContactMessage | null>(null);

    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    // התנתקות: הסרת ה-Token וחזרה למסך ההתחברות
    const logout = () => {
        localStorage.removeItem("adminToken");
        setAccessVerified(false);
        navigate("/admin/login", { replace: true });
    };

    // טעינת פניות ובדיקת הרשאה מול השרת
    useEffect(() => {
        const token = getValidAdminToken();

        if (!token) {
            navigate("/admin/login", { replace: true });
            return;
        }

        let active = true;

        const loadMessages = async () => {
            try {
                const response = await axios.get<ContactMessage[]>(
                    "http://localhost:3000/api/contact",
                    {
                        headers: {
                            Authorization: "Bearer " + token,
                        },
                    }
                );

                if (active) {
                    setMessages(response.data);
                    // רק תשובת 200 מהנתיב המוגן מאשרת גישה למנהל.
                    setAccessVerified(true);
                }
            } catch (err) {
                if (!active) return;

                if (
                    axios.isAxiosError(err) &&
                    (err.response?.status === 401 ||
                        err.response?.status === 403)
                ) {
                    localStorage.removeItem("adminToken");
                    navigate("/admin/login", { replace: true });
                    return;
                }

                if (active) {
                    setError("לא הצלחנו לטעון את הפניות.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadMessages();

        return () => {
            active = false;
        };
    }, [navigate]);

    // עדכון סטטוס
    const updateStatus = async (
        id: string,
        status: ContactMessage["status"]
    ) => {
        const token = getValidAdminToken();

        if (!token) {
            logout();
            return;
        }

        setUpdatingId(id);
        setStatusError("");

        try {
            const response = await axios.patch<ContactMessage>(
                "http://localhost:3000/api/contact/" + id + "/status",
                { status },
                {
                    headers: {
                        Authorization: "Bearer " + token,
                    },
                }
            );

            setMessages((previous) =>
                previous.map((item) =>
                    item._id === id ? response.data : item
                )
            );
        } catch (err) {
            if (
                axios.isAxiosError(err) &&
                (err.response?.status === 401 ||
                    err.response?.status === 403)
            ) {
                logout();
                return;
            }

            setStatusError("לא הצלחנו לעדכן את הסטטוס.");
        } finally {
            setUpdatingId(null);
        }
    };

    // מחיקת פנייה לאחר אישור
    const deleteMessage = async () => {
        if (!pendingDelete) return;

        const token = getValidAdminToken();

        if (!token) {
            logout();
            return;
        }

        setDeleting(true);
        setDeleteError("");

        try {
            await axios.delete(
                "http://localhost:3000/api/contact/" + pendingDelete._id,
                {
                    headers: {
                        Authorization: "Bearer " + token,
                    },
                }
            );

            setMessages((previous) =>
                previous.filter(
                    (item) => item._id !== pendingDelete._id
                )
            );

            setPendingDelete(null);
        } catch (err) {
            if (
                axios.isAxiosError(err) &&
                (err.response?.status === 401 ||
                    err.response?.status === 403)
            ) {
                logout();
                return;
            }

            setDeleteError("לא הצלחנו למחוק את הפנייה.");
        } finally {
            setDeleting(false);
        }
    };

    // לא מציגים קישורי ניהול או נתוני לקוחות עד לאישור מהשרת.
    if (!accessVerified) {
        return (
            <main className="admin-dashboard-page" dir="rtl">
                <p role="status">
                    {loading ? "בודקים הרשאת מנהל..." : error || "מעבירים להתחברות..."}
                </p>
                {!loading && error && (
                    <button type="button" onClick={() => navigate("/admin/login")}>
                        חזרה להתחברות
                    </button>
                )}
            </main>
        );
    }

    return (
        <main className="admin-dashboard-page" dir="rtl">
            <header className="admin-dashboard-header">
                <div className="admin-dashboard-brand">
                    <h1>מערכת ניהול</h1>

                    <img
                        src={logo}
                        alt="UV נגרות חוץ"
                        className="admin-dashboard-logo"
                    />
                    <p className="admin-session-status" role="status">
                        ✓ מחובר כמנהל המערכת
                    </p>
                </div>
            </header>
            {/* קישורי מערכת הניהול: שני כפתורים בכל שורה */}
            <nav className="admin-actions-grid" aria-label="פעולות ניהול">
                <Link to="/admin/quotes" className="admin-action-button">
                    + יצירת הצעת מחיר
                </Link>
                <Link to="/admin/quotes/saved" className="admin-action-button">
                    הצעות מחיר שמורות
                </Link>
                <Link to="/admin/projects" className="admin-action-button">
                    ניהול פרויקטים
                </Link>
                <Link to="/admin/users" className="admin-action-button">
                    ניהול משתמשים
                </Link>
            </nav>
            <section className="admin-messages-section">
                <h2>פניות שהתקבלו</h2>

                {statusError && (
                    <p role="alert" className="admin-status-error">
                        {statusError}
                    </p>
                )}

                {loading ? (
                    <p>טוען פניות...</p>
                ) : error ? (
                    <p role="alert">{error}</p>
                ) : messages.length === 0 ? (
                    <p>עדיין לא התקבלו פניות.</p>
                ) : (
                    <div className="admin-messages-grid">
                        {messages.map((item) => (
                            <article
                                className="admin-message-card"
                                key={item._id}
                            >
                                <div className="admin-message-top">
                                    <h3>{item.name}</h3>

                                    <select
                                        className="admin-status-select"
                                        value={item.status}
                                        disabled={updatingId !== null}
                                        aria-label={"סטטוס הפנייה של " + item.name}
                                        onChange={(event) =>
                                            updateStatus(
                                                item._id,
                                                event.target.value as ContactMessage["status"]
                                            )
                                        }
                                    >
                                        <option value="new">פנייה חדשה</option>
                                        <option value="in-progress">בטיפול</option>
                                        <option value="completed">הושלם</option>
                                    </select>
                                </div>

                                <p>
                                    <strong>טלפון: </strong>
                                    <a href={"tel:" + item.phone}>
                                        {item.phone}
                                    </a>
                                </p>

                                <p>
                                    <strong>תיאור העבודה: </strong>
                                    {item.message}
                                </p>

                                <p className="admin-message-date">
                                    התקבל בתאריך:{" "}
                                    {new Date(item.createdAt).toLocaleString("he-IL")}
                                </p>

                                <button
                                    type="button"
                                    className="admin-delete-button"
                                    onClick={() => {
                                        setDeleteError("");
                                        setPendingDelete(item);
                                    }}
                                >
                                    מחיקת פנייה
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {/* חלון אישור מחיקה */}
            {pendingDelete && (
                <div className="admin-modal-overlay">
                    <div
                        className="admin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-modal-title"
                    >
                        <h2 id="delete-modal-title">
                            מחיקת פנייה
                        </h2>

                        <p>
                            האם למחוק את הפנייה של{" "}
                            <strong>{pendingDelete.name}</strong>?
                        </p>

                        <p className="admin-modal-warning">
                            פעולה זו תמחק את הפנייה לצמיתות.
                        </p>

                        {deleteError && (
                            <p role="alert" className="admin-status-error">
                                {deleteError}
                            </p>
                        )}

                        <div className="admin-modal-actions">
                            <button
                                type="button"
                                className="admin-modal-cancel"
                                disabled={deleting}
                                onClick={() => setPendingDelete(null)}
                            >
                                ביטול
                            </button>

                            <button
                                type="button"
                                className="admin-modal-confirm"
                                disabled={deleting}
                                onClick={deleteMessage}
                            >
                                {deleting ? "מוחקים..." : "כן, למחוק"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default AdminDashboard;
