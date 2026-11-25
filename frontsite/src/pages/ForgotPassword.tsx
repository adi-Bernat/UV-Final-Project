import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/admin/password-reset.css";

// טופס בקשת קישור לאיפוס סיסמה למשתמשים רשומים
export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading) return;
        setLoading(true);
        setError("");
        setMessage("");
        try {
            const response = await axios.post<{ message: string }>(
                "http://localhost:3000/api/users/forgot-password",
                { email: email.trim().toLowerCase() }
            );
            setMessage(response.data.message);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 429) {
                setError("יותר מדי בקשות. נסו שוב מאוחר יותר.");
            } else {
                setError("לא ניתן לשלוח בקשה כעת. נסו שוב מאוחר יותר.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="uv-reset-page" dir="rtl">
            <section className="uv-reset-card">
                <h1>שכחתי סיסמה</h1>
                <p>הזינו את כתובת האימייל שבה נרשמתם לאתר.</p>
                <form onSubmit={submit}>
                    <label htmlFor="reset-email">כתובת אימייל</label>
                    <input id="reset-email" type="email" autoComplete="email"
                        maxLength={254} required value={email}
                        onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                    <button type="submit" disabled={loading}>
                        {loading ? "שולחים..." : "שליחת קישור לאיפוס"}
                    </button>
                </form>
                {message && <p role="status">{message}</p>}
                {error && <p role="alert" className="uv-reset-error">{error}</p>}
                <Link to="/login">חזרה להתחברות</Link>
            </section>
        </main>
    );
}
