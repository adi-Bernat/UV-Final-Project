
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

type Project = {
    _id: string;
    title: string;
    description: string;
    category: string;
    images: string[];
    videos: string[];
};

type UploadedMedia = {
    images: string[];
    videos: string[];
};

const categoryFolders: Record<string, string> = {
    Pergola: "pergolas",
    Deck: "decks",
    Fence: "fences",
    Storage: "storage",
    "Deck Renovation": "deck-renovation",
    "Sauna Renovation": "sauna-renovation",
    Suntuf: "suntuf",
};


function AdminEditProject() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Pergola");

    const [images, setImages] = useState<string[]>([]);
    const [videos, setVideos] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);

    useEffect(() => {
        const token = localStorage.getItem("adminToken");

        if (!token) {
            navigate("/admin/login", { replace: true });
            return;
        }

        let active = true;

        const loadProject = async () => {
            try {
                const response = await axios.get<Project>(
                    "http://localhost:3000/api/projects/" + id
                );

                if (!active) return;

                const project = response.data;

                setTitle(project.title);
                setDescription(project.description);
                setCategory(project.category);
                setImages(project.images || []);
                setVideos(project.videos || []);
            } catch (err) {
                console.error(err);

                if (active) {
                    setError("לא הצלחנו לטעון את הפרויקט.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadProject();

        return () => {
            active = false;
        };
    }, [id, navigate]);

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const token = localStorage.getItem("adminToken");

        if (!token) {
            navigate("/admin/login", { replace: true });
            return;
        }

        if (newFiles.length > 10) {
            setError("אפשר להעלות עד 10 קבצים בכל פעם.");
            return;
        }

        const allowedExtensions = [
            ".jpg", ".jpeg", ".png", ".webp",
            ".mp4", ".webm",
        ];

        const invalidFile = newFiles.find(
            (file) =>
                !allowedExtensions.some((extension) =>
                    file.name.toLowerCase().endsWith(extension)
                )
        );

        if (invalidFile) {
            setError("נבחר קובץ בפורמט לא נתמך.");
            return;
        }

        if (
            newFiles.some(
                (file) => file.size > 40 * 1024 * 1024
            )
        ) {
            setError("כל קובץ חייב להיות קטן מ-40MB.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            let updatedImages = [...images];
            let updatedVideos = [...videos];

            // העלאת קבצים חדשים, אם נבחרו
            if (newFiles.length > 0) {
                const formData = new FormData();

                newFiles.forEach((file) => {
                    formData.append("files", file);
                });

                const uploadResponse = await axios.post<UploadedMedia>(
                    "http://localhost:3000/api/uploads/" +
                    categoryFolders[category],
                    formData,
                    {
                        headers: {
                            Authorization: "Bearer " + token,
                        },
                    }
                );

                updatedImages = [
                    ...updatedImages,
                    ...uploadResponse.data.images,
                ];

                updatedVideos = [
                    ...updatedVideos,
                    ...uploadResponse.data.videos,
                ];
            }

            // עדכון הפרויקט הקיים
            await axios.put(
                "http://localhost:3000/api/projects/" + id,
                {
                    title: title.trim(),
                    description: description.trim(),
                    category,
                    images: updatedImages,
                    videos: updatedVideos,
                },
                {
                    headers: {
                        Authorization: "Bearer " + token,
                    },
                }
            );

            navigate("/admin/projects");
        } catch (err) {
            console.error(err);

            if (
                axios.isAxiosError(err) &&
                [401, 403].includes(err.response?.status || 0)
            ) {
                localStorage.removeItem("adminToken");
                navigate("/admin/login", { replace: true });
                return;
            }

            setError("לא הצלחנו לשמור את השינויים.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <main dir="rtl"><p>טוען פרויקט...</p></main>;
    }

    return (
        <main className="admin-add-page" dir="rtl">
            <Link
                to="/admin/projects"
                className="back-home-button"
            >
                חזרה לניהול פרויקטים ←
            </Link>

            <h1>עריכת פרויקט</h1>

            <p className="admin-add-intro">
                כאן אפשר לעדכן את פרטי הפרויקט הקיים.
            </p>

            {error && (
                <p className="admin-add-error" role="alert">
                    {error}
                </p>
            )}

            <form className="admin-add-form" onSubmit={handleSubmit}>
                <label htmlFor="edit-title">שם הפרויקט</label>

                <input
                    id="edit-title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    minLength={2}
                    required
                />

                <label htmlFor="edit-description">
                    תיאור הפרויקט
                </label>

                <textarea
                    id="edit-description"
                    value={description}
                    onChange={(event) =>
                        setDescription(event.target.value)
                    }
                    rows={4}
                    required
                />

                <label htmlFor="edit-category">קטגוריה</label>

                <select
                    id="edit-category"
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

                <h3>תמונות קיימות</h3>

                <div className="admin-edit-media-grid">
                    {images.map((image, index) => (
                        <div className="admin-edit-media-item" key={image}>
                            <img src={image} alt={"תמונה " + (index + 1)} />

                            <button
                                type="button"
                                onClick={() =>
                                    setImages((previous) =>
                                        previous.filter((_, i) => i !== index)
                                    )
                                }
                            >
                                הסרת תמונה
                            </button>
                        </div>
                    ))}

                    {images.length === 0 && <p>אין תמונות.</p>}
                </div>

                <h3>סרטונים קיימים</h3>

                <div className="admin-edit-media-grid">
                    {videos.map((video, index) => (
                        <div className="admin-edit-media-item" key={video}>
                            <video src={video} controls preload="metadata" />

                            <button
                                type="button"
                                onClick={() =>
                                    setVideos((previous) =>
                                        previous.filter((_, i) => i !== index)
                                    )
                                }
                            >
                                הסרת סרטון
                            </button>
                        </div>
                    ))}

                    {videos.length === 0 && <p>אין סרטונים.</p>}
                </div>

                <label htmlFor="edit-files">
                    הוספת תמונות וסרטונים חדשים
                </label>

                <input
                    id="edit-files"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
                    multiple
                    onChange={(event) =>
                        setNewFiles(Array.from(event.target.files || []))
                    }
                />

                {newFiles.length > 0 && (
                    <p className="admin-add-hint">
                        נבחרו {newFiles.length} קבצים חדשים
                    </p>
                )}

                <button type="submit" disabled={saving}>
                    {saving ? "שומרים שינויים..." : "שמירת שינויים"}
                </button>
            </form>
        </main>
    );
}

export default AdminEditProject;
