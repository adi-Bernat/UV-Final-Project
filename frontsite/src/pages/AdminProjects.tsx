
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

type Project = {
    _id: string;
    title: string;
    description: string;
    category: string;
    images?: string[];
    videos?: string[];
};

const categoryNames: Record<string, string> = {
    Pergola: "פרגולות",
    Deck: "דקים",
    Fence: "גדרות",
    Storage: "מחסנים",
    "Deck Renovation": "חידוש דקים",
    "Sauna Renovation": "חידוש סאונות",
    Suntuf: "קירויי סנטף",
};

function AdminProjects() {
    const navigate = useNavigate();

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [pendingDelete, setPendingDelete] =
        useState<Project | null>(null);

    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("adminToken");

        if (!token) {
            navigate("/admin/login", { replace: true });
            return;
        }

        let active = true;

        const loadProjects = async () => {
            try {
                const response = await axios.get<Project[]>(
                    "http://localhost:3000/api/projects"
                );

                if (active) {
                    setProjects(response.data);
                }
            } catch (err) {
                console.error(err);
                if (active) {
                    setError("לא הצלחנו לטעון את הפרויקטים.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadProjects();

        return () => {
            active = false;
        };
    }, [navigate]);

    const deleteProject = async () => {
        if (!pendingDelete) return;

        const token = localStorage.getItem("adminToken");

        if (!token) {
            navigate("/admin/login", { replace: true });
            return;
        }

        setDeleting(true);
        setDeleteError("");

        try {
            await axios.delete(
                "http://localhost:3000/api/projects/" + pendingDelete._id,
                {
                    headers: {
                        Authorization: "Bearer " + token,
                    },
                }
            );

            setProjects((previous) =>
                previous.filter(
                    (project) => project._id !== pendingDelete._id
                )
            );

            setPendingDelete(null);
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

            setDeleteError("לא הצלחנו למחוק את הפרויקט.");
        } finally {
            setDeleting(false);
        }
    };
    const filteredProjects = projects.filter((project) => {
        const matchesSearch =
            project.title.toLowerCase().includes(search.toLowerCase()) ||
            project.description.toLowerCase().includes(search.toLowerCase());

        const matchesCategory =
            selectedCategory === "all" ||
            project.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });
    return (
        <main className="admin-projects-page" dir="rtl">
            <Link to="/admin" className="back-home-button">
                חזרה למערכת הניהול ←
            </Link>

            <h1>ניהול פרויקטים</h1>

            <div className="admin-add-navigation">
                <Link
                    to="/admin/projects/new"
                    className="admin-add-link"
                >
                    + הוספת פרויקט חדש
                </Link>
            </div>

            <p className="admin-projects-intro">
                כל העבודות של UV | נגרות חוץ במקום אחד.
            </p>

            <div className="admin-projects-filters">
                <input
                    type="search"
                    placeholder="חיפוש פרויקט לפי שם או תיאור..."
                    aria-label="חיפוש פרויקטים"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />

                <select
                    value={selectedCategory}
                    aria-label="סינון לפי קטגוריה"
                    onChange={(event) => setSelectedCategory(event.target.value)}
                >
                    <option value="all">כל הקטגוריות</option>
                    <option value="Pergola">פרגולות</option>
                    <option value="Deck">דקים</option>
                    <option value="Fence">גדרות</option>
                    <option value="Storage">מחסנים</option>
                    <option value="Deck Renovation">חידוש דקים</option>
                    <option value="Sauna Renovation">חידוש סאונות</option>
                    <option value="Suntuf">קירויי סנטף</option>
                </select>
            </div>

            {loading ? (
                <p>טוען פרויקטים...</p>
            ) : error ? (
                <p role="alert">{error}</p>
            ) : projects.length === 0 ? (
                <p>עדיין לא נוספו פרויקטים.</p>
            ) : filteredProjects.length === 0 ? (
                <div className="admin-no-results">
                    <span>⌕</span>
                    <h3>לא מצאנו פרויקטים</h3>
                    <p>נסי לחפש בשם אחר או לבחור קטגוריה שונה.</p>
                </div>
            ) : (
                <div className="admin-projects-grid">
                    {filteredProjects.map((project) => (
                        <article
                            key={project._id}
                            className="admin-project-card"
                        >
                            {project.images?.length ? (
                                <img
                                    src={project.images[0]}
                                    alt={project.title}
                                />
                            ) : (
                                <div className="admin-project-no-image">
                                    אין תמונה ראשית
                                </div>
                            )}

                            <div className="admin-project-content">
                                <span className="admin-project-category">
                                    {categoryNames[project.category] ||
                                        project.category}
                                </span>

                                <h2>{project.title}</h2>
                                <p>{project.description}</p>

                                <div className="admin-project-actions">
                                    <Link
                                        to={"/project/" + project._id}
                                        className="admin-project-view"
                                    >
                                        צפייה בפרויקט
                                    </Link>
                                    <Link
                                        to={"/admin/projects/" + project._id + "/edit"}
                                        className="admin-project-edit-button"
                                    >
                                        עריכת פרויקט
                                    </Link>
                                    <button
                                        type="button"
                                        className="admin-project-delete-button"
                                        onClick={() => {
                                            setDeleteError("");
                                            setPendingDelete(project);
                                        }}
                                    >
                                        מחיקת פרויקט
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {pendingDelete && (
                <div className="admin-modal-overlay">
                    <div
                        className="admin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="project-delete-title"
                    >
                        <h2 id="project-delete-title">
                            מחיקת פרויקט
                        </h2>

                        <p>
                            האם למחוק את הפרויקט{" "}
                            <strong>{pendingDelete.title}</strong>?
                        </p>

                        <p className="admin-modal-warning">
                            הפרויקט יימחק ממסד הנתונים ולא
                            יוצג עוד באתר.
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
                                onClick={deleteProject}
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

export default AdminProjects;
