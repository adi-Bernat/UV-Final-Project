
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

type ProfileData = {
    id: string;
    name: string;
    email: string;
    profileImage: string;
};

const API = "http://localhost:3000";

function Profile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // קבלת טוקן ההתחברות של המשתמש
    const getToken = () => localStorage.getItem("userToken");

    // טעינת הפרטים האישיים מהשרת
    useEffect(() => {
        const token = getToken();

        if (!token) {
            navigate("/login", { replace: true });
            return;
        }

        let active = true;

        axios.get<ProfileData>(`${API}/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(({ data }) => {
                if (!active) return;
                setProfile(data);
                setName(data.name);
                setEmail(data.email);
            })
            .catch((err) => {
                if (!active) return;
                if (axios.isAxiosError(err) &&
                    [401, 403].includes(err.response?.status ?? 0)) {
                    localStorage.removeItem("userToken");
                    navigate("/login", { replace: true });
                } else {
                    setError("לא הצלחנו לטעון את הפרופיל");
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [navigate]);

    // עדכון שם וכתובת אימייל
    const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const token = getToken();
        if (!token) return navigate("/login");

        setSaving(true);
        setError("");
        setMessage("");

        try {
            const { data } = await axios.patch<ProfileData>(
                `${API}/api/users/profile`,
                { name, email },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setProfile(data);
            setName(data.name);
            setEmail(data.email);
            sessionStorage.setItem("userName", data.name);
            setMessage("הפרטים עודכנו בהצלחה!");
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                setError("כתובת האימייל כבר קיימת במערכת");
            } else {
                setError("לא הצלחנו לשמור את הפרטים");
            }
        } finally {
            setSaving(false);
        }
    };

    // העלאת תמונה למחשב שבו פועל השרת
    const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError("");
        setMessage("");

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setError("ניתן להעלות JPG, PNG או WebP בלבד");
            return;
        }

        if (file.size > 3 * 1024 * 1024) {
            setError("גודל התמונה חייב להיות עד 3MB");
            return;
        }

        const token = getToken();
        if (!token) return navigate("/login");

        const formData = new FormData();
        formData.append("profileImage", file);

        setUploading(true);

        try {
            const { data } = await axios.post<ProfileData>(
                `${API}/api/users/profile/image`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setProfile(data);
            setMessage("תמונת הפרופיל עודכנה בהצלחה!");
        } catch {
            setError("לא הצלחנו להעלות את התמונה");
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    };

    if (loading) {
        return <main dir="rtl"><p>טוענים את הפרופיל...</p></main>;
    }

    return (
        <main className="uv-profile-page" dir="rtl">
            <section className="uv-profile-card">
                <h1>הפרופיל שלי</h1>

                <div className="uv-profile-avatar">
                    {profile?.profileImage ? (
                        <img
                            src={`${API}${profile.profileImage}`}
                            alt="תמונת הפרופיל שלי"
                        />
                    ) : (
                        <span aria-label="אין תמונת פרופיל">👤</span>
                    )}
                </div>

                <label className="uv-profile-upload">
                    {uploading ? "מעלים תמונה..." : "בחירת תמונת פרופיל"}
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={uploadImage}
                        disabled={uploading}
                    />
                </label>

                <form onSubmit={saveProfile}>
                    <label htmlFor="profile-name">שם מלא</label>
                    <input
                        id="profile-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        minLength={2}
                        maxLength={80}
                        required
                    />

                    <label htmlFor="profile-email">כתובת אימייל</label>
                    <input
                        id="profile-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <button type="submit" disabled={saving || uploading || !profile}>
                        {saving ? "שומרים..." : "שמירת שינויים"}
                    </button>
                </form>

                {message && <p role="status" className="uv-profile-success">{message}</p>}
                {error && <p role="alert" className="uv-profile-error">{error}</p>}

                <Link to="/" className="uv-profile-back">
                    חזרה לדף הבית
                </Link>
            </section>
        </main>
    );
}

export default Profile;
