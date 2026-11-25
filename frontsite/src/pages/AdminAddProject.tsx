
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const categoryFolders: Record<string, string> = {
    Pergola: "pergolas",
    Deck: "decks",
    Fence: "fences",
    Storage: "storage",
    "Deck Renovation": "deck-renovation",
    "Sauna Renovation": "sauna-renovation",
    Suntuf: "suntuf",
};

type UploadedMedia = {
    images: string[];
    videos: string[];
};

function AdminAddProject() {
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Pergola");
    const [files, setFiles] = useState<File[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const token = localStorage.getItem("adminToken");

        if (!token) {
            navigate("/admin/login", { replace: true });
            return;
        }

        if (files.length === 0) {
            setError("יש לבחור לפחות תמונה או סרטון אחד.");
            return;
        }

        if (files.length > 10) {
            setError("ניתן להעלות עד 10 קבצים בכל פעם.");
            return;
        }

        const allowedExtensions = [
            ".jpg", ".jpeg", ".png", ".webp",
            ".mp4", ".webm",
        ];

        const invalidFile = files.find((file) => {
            const name = file.name.toLowerCase();

            return !allowedExtensions.some((extension) =>
                name.endsWith(extension)
            );
        });

        if (invalidFile) {
            setError("ניתן להעלות רק תמונות JPG, PNG, WebP וסרטוני MP4 או WebM.");
            return;
        }

        const oversizedFile = files.find(
            (file) => file.size > 40 * 1024 * 1024
        );

        if (oversizedFile) {
            setError("כל קובץ חייב להיות קטן מ-40MB.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const folder = categoryFolders[category];

            // שלב ראשון: העלאת התמונות והסרטונים
            const formData = new FormData();

            files.forEach((file) => {
                formData.append("files", file);
            });

            const uploadResponse = await axios.post<UploadedMedia>(
                "http://localhost:3000/api/uploads/" + folder,
                formData,
                {
                    headers: {
                        Authorization: "Bearer " + token,
                    },
                }
            );

            // שלב שני: שמירת הפרויקט ב-MongoDB
            await axios.post(
                "http://localhost:3000/api/projects",
                {
                    title: title.trim(),
                    description: description.trim(),
                    category,
                    images: uploadResponse.data.images,
                    videos: uploadResponse.data.videos,
                },
                {
                    headers: {
                        Authorization: "Bearer " + token,
                    },
                }
            );

            navigate("/admin/projects");

        } catch (err) {
            console.error("Error creating project:", err);

            if (
                axios.isAxiosError(err) &&
                [401, 403].includes(err.response?.status || 0)
            ) {
                localStorage.removeItem("adminToken");
                navigate("/admin/login", { replace: true });
                return;
            }

            setError(
                "לא הצלחנו לשמור את הפרויקט. בדקי את הפרטים ונסי שוב."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="admin-add-page" dir="rtl">
            <Link
                to="/admin/projects"
                className="back-home-button"
            >
                חזרה לניהול פרויקטים ←
            </Link>

            <h1>הוספת פרויקט חדש</h1>

            <p className="admin-add-intro">
                הוסיפו עבודה חדשה לאתר, כולל תמונות וסרטונים.
            </p>

            <form
                className="admin-add-form"
                onSubmit={handleSubmit}
            >
                <label htmlFor="project-title">
                    שם הפרויקט
                </label>

                <input
                    id="project-title"
                    type="text"
                    value={title}
                    onChange={(event) =>
                        setTitle(event.target.value)
                    }
                    placeholder="לדוגמה: פרגולת עץ"
                    minLength={2}
                    required
                />

                <label htmlFor="project-description">
                    תיאור הפרויקט
                </label>

                <textarea
                    id="project-description"
                    value={description}
                    onChange={(event) =>
                        setDescription(event.target.value)
                    }
                    placeholder="כמה מילים על העבודה..."
                    rows={4}
                    minLength={2}
                    required
                />

                <label htmlFor="project-category">
                    קטגוריה
                </label>

                <select
                    id="project-category"
                    value={category}
                    onChange={(event) =>
                        setCategory(event.target.value)
                    }
                >
                    <option value="Pergola">פרגולות</option>
                    <option value="Deck">דקים</option>
                    <option value="Fence">גדרות</option>
                    <option value="Storage">מחסנים</option>
                    <option value="Deck Renovation">חידוש דקים</option>
                    <option value="Sauna Renovation">חידוש סאונות</option>
                    <option value="Suntuf">קירויי סנטף</option>
                </select>

                <label htmlFor="project-files">
                    תמונות וסרטונים של הפרויקט
                </label>

                <input
                    id="project-files"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
                    multiple
                    onChange={(event) =>
                        setFiles(Array.from(event.target.files || []))
                    }
                />

                <p className="admin-add-hint">
                    אפשר לבחור עד 10 קבצים, תמונות וסרטונים יחד.
                    עד 40MB לכל קובץ.
                </p>

                {files.length > 0 && (
                    <div className="admin-selected-files">
                        <h3>
                            נבחרו {files.length} קבצים:
                        </h3>

                        <ul>
                            {files.map((file, index) => (
                                <li key={index}>
                                    {file.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {error && (
                    <p
                        className="admin-add-error"
                        role="alert"
                    >
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={saving}
                >
                    {saving
                        ? "מעלים קבצים ושומרים..."
                        : "שמירת הפרויקט"}
                </button>
            </form>
        </main>
    );
}

export default AdminAddProject;
