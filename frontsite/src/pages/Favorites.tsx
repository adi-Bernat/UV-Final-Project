
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

type Project = {
    _id: string;
    title: string;
    description: string;
    category: string;
    location?: string;
    images?: string[];
    videos?: string[];
};

type FavoritesResponse = {
    favoriteIds: string[];
};

const API_URL = "http://localhost:3000/api";

const FAVORITES_KEY = "uv-favorite-projects";

// מועדפים מקומיים עבור אורחים
function loadGuestFavorites(): string[] {
    try {
        const saved = localStorage.getItem(FAVORITES_KEY);

        if (!saved) return [];

        const parsed: unknown = JSON.parse(saved);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter(
            (id): id is string => typeof id === "string"
        );
    } catch {
        return [];
    }
}

function Favorites() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [removingId, setRemovingId] = useState<string | null>(
        null
    );

    const token = localStorage.getItem("userToken");
    const isLoggedIn = Boolean(token);

    // טעינת פרויקטים ומועדפים
    useEffect(() => {
        let active = true;

        const loadData = async () => {
            setLoading(true);
            setError("");

            try {
                const currentToken =
                    localStorage.getItem("userToken");

                const projectsRequest = axios.get<Project[]>(
                    `${API_URL}/projects`
                );

                if (currentToken) {
                    // משתמש מחובר - קריאה למסד הנתונים
                    const favoritesRequest =
                        axios.get<FavoritesResponse>(
                            `${API_URL}/user-favorites`,
                            {
                                headers: {
                                    Authorization: `Bearer ${currentToken}`,
                                },
                            }
                        );

                    const [projectsResponse, favoritesResponse] =
                        await Promise.all([
                            projectsRequest,
                            favoritesRequest,
                        ]);

                    if (!active) return;

                    setProjects(projectsResponse.data);
                    setFavoriteIds(
                        favoritesResponse.data.favoriteIds
                    );
                } else {
                    // אורח - שמירה מקומית כמו קודם
                    const projectsResponse =
                        await projectsRequest;

                    if (!active) return;

                    setProjects(projectsResponse.data);
                    setFavoriteIds(loadGuestFavorites());
                }
            } catch (err) {
                console.error("Load favorites error:", err);

                if (active) {
                    setError(
                        "לא הצלחנו לטעון את המועדפים. בדקו שהשרת פועל ושהחשבון מחובר."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            active = false;
        };
    }, []);

    // הסרת פרויקט מהמועדפים
    const removeFavorite = async (projectId: string) => {
        if (removingId) return;

        setRemovingId(projectId);
        setActionError("");

        try {
            const currentToken =
                localStorage.getItem("userToken");

            if (currentToken) {
                // הסרה מהמועדפים במסד הנתונים
                await axios.delete(
                    `${API_URL}/user-favorites/${projectId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${currentToken}`,
                        },
                    }
                );
            } else {
                // הסרה מהמועדפים המקומיים של אורח
                const updated = favoriteIds.filter(
                    (id) => id !== projectId
                );

                localStorage.setItem(
                    FAVORITES_KEY,
                    JSON.stringify(updated)
                );
            }

            setFavoriteIds((current) =>
                current.filter((id) => id !== projectId)
            );
        } catch (err) {
            console.error("Remove favorite error:", err);

            setActionError(
                "לא הצלחנו להסיר את הפרויקט מהמועדפים. נסו שוב."
            );
        } finally {
            setRemovingId(null);
        }
    };

    const favoriteProjects = projects.filter(
        (project) => favoriteIds.includes(project._id)
    );

    return (
        <main className="category-page" dir="rtl">
            <Link to="/" className="back-home-button">
                ← חזרה לדף הבית
            </Link>

            <h1>המועדפים שלי ♡</h1>

            <p className="favorites-description">
                כל הפרויקטים שאהבתם, במקום אחד.
                שמרו רעיונות והשראה לפרויקט הבא שלכם.
            </p>

            {!loading && !error && (
                <p className="favorites-description">
                    {isLoggedIn
                        ? "המועדפים נשמרים בחשבון האישי שלכם."
                        : "המועדפים נשמרים כרגע בדפדפן הזה. התחברו כדי לשמור מועדפים בחשבון אישי."}
                </p>
            )}

            {actionError && (
                <p className="favorites-error" role="alert">
                    {actionError}
                </p>
            )}

            {loading ? (
                <p role="status">טוען מועדפים...</p>
            ) : error ? (
                <div>
                    <p role="alert">{error}</p>

                    {isLoggedIn && (
                        <Link to="/login">
                            מעבר להתחברות
                        </Link>
                    )}
                </div>
            ) : favoriteProjects.length === 0 ? (
                <div className="favorites-empty">
                    <span
                        className="favorites-empty-heart"
                        aria-hidden="true"
                    >
                        ♡
                    </span>

                    <h2>עדיין אין פרויקטים במועדפים</h2>

                    <p>
                        ראיתם פרויקט שאהבתם?
                        לחצו על הלב בכרטיס הפרויקט
                        והוא יופיע כאן.
                    </p>

                    <Link to="/" className="back-home-button">
                        בואו לגלות פרויקטים
                    </Link>
                </div>
            ) : (
                <>
                    <p className="favorites-count">
                        שמרתם {favoriteProjects.length} פרויקטים
                    </p>

                    <div className="category-projects-grid">
                        {favoriteProjects.map((project) => (
                            <div
                                className="favorite-project-wrapper"
                                key={project._id}
                            >
                                <Link
                                    to={`/project/${project._id}`}
                                    className="category-project-card project-card-link"
                                >
                                    {project.images &&
                                        project.images.length > 0 && (

                                            <img
                                                src={project.images[0]}
                                                alt={`תמונה של פרויקט נגרות חוץ: ${project.title}`}
                                            />

                                        )}

                                    <h2>{project.title}</h2>
                                    <p>{project.description}</p>
                                </Link>

                                <button
                                    type="button"
                                    className="project-favorite-button is-favorite"
                                    aria-label={`הסרת ${project.title} מהמועדפים`}
                                    aria-pressed="true"
                                    title="הסרה מהמועדפים"
                                    disabled={removingId === project._id}
                                    onClick={() =>
                                        removeFavorite(project._id)
                                    }
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        width="24"
                                        height="24"
                                        fill="currentColor"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </main>
    );
}

export default Favorites;
