import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import "../styles/admin/password-reset.css";

// יצירת סיסמה חדשה באמצעות קישור חד-פעמי
export default function ResetPassword() {
    const [params] = useSearchParams();
    const token = params.get("token") || "";
    const validToken = /^[a-f0-9]{64}$/i.test(token);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading || done || !validToken) return;
        if (password.length < 12 || password.length > 72) {
            setError("יש להזין סיסמה באורך 12 עד 72 תווים.");
            return;
        }
        if (password !== confirm) {
            setError("הסיסמאות אינן זהות.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await axios.post("http://localhost:3000/api/users/reset-password", {
                token, password,
            });
            setDone(true);
            setPassword("");
            setConfirm("");
            // הסרת הקוד מהכתובת לאחר שימוש מוצלח
            window.history.replaceState(null, "", "/reset-password");
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 429) {
                setError("יותר מדי ניסיונות. נסו שוב מאוחר יותר.");
            } else if (axios.isAxiosError(err) && err.response?.status === 400) {
                setError("הקישור אינו תקף, פג תוקפו או שהסיסמה אינה תקינה.");
            } else {
                setError("לא הצלחנו לעדכן את הסיסמה. נסו שוב.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="uv-reset-page" dir="rtl">
            <section className="uv-reset-card">
                <h1>הגדרת סיסמה חדשה</h1>
                {!validToken && !done ? (
                    <p role="alert">הקישור אינו תקין. בקשו קישור איפוס חדש.</p>
                ) : done ? (
                    <p role="status">הסיסמה עודכנה בהצלחה. אפשר להתחבר מחדש.</p>
                ) : (
                    <form onSubmit={submit}>
                        <label htmlFor="new-password">סיסמה חדשה (12 תווים לפחות)</label>
                        <input id="new-password" type="password" autoComplete="new-password"
                            minLength={12} maxLength={72} required value={password}
                            onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                        <label htmlFor="confirm-password">אימות סיסמה חדשה</label>
                        <input id="confirm-password" type="password" autoComplete="new-password"
                            minLength={12} maxLength={72} required value={confirm}
                            onChange={(e) => setConfirm(e.target.value)} disabled={loading} />
                        <button type="submit" disabled={loading}>
                            {loading ? "מעדכנים..." : "שמירת סיסמה חדשה"}
                        </button>
                    </form>
                )}
                {error && <p role="alert" className="uv-reset-error">{error}</p>}
                <Link to={done ? "/login" : "/forgot-password"}>
                    {done ? "מעבר להתחברות" : "בקשת קישור איפוס חדש"}
                </Link>
            </section>
        </main>
    );
}
