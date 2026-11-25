
import { useEffect, useState } from "react";
import {
    Link,
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";
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

type ViewMode = "cards" | "table";

// =====================================
// שמות הקטגוריות באתר
// =====================================

const categoryNames: Record<string, string> = {
    pergolas: "פרגולות",
    decks: "דקים",
    fences: "גדרות",
    storage: "מחסנים",
    "deck-renovation": "חידושי דק",
    "sauna-renovation": "חידושי סאונות",
    suntuf: "קירויי סנטף",
};

// =====================================
// שמות הקטגוריות במסד הנתונים
// =====================================

const databaseCategories: Record<string, string> = {
    pergolas: "Pergola",
    decks: "Deck",
    fences: "Fence",
    storage: "Storage",
    "deck-renovation": "Deck Renovation",
    "sauna-renovation": "Sauna Renovation",
    suntuf: "Suntuf",
};

// =====================================
// הגדרות API ומועדפי אורח
// =====================================

// בחיבור מטלפון פיזי, localhost מפנה לטלפון ולא למחשב.
// בזמן פיתוח נשתמש בשם המחשב/ה-IP שדרכו נפתח האתר.
// בפרסום האתר אפשר להגדיר VITE_API_URL ב-.env של Vite.
const API_URL =
    import.meta.env.VITE_API_URL?.trim() ||
    `${window.location.protocol}//${window.location.hostname}:3000/api`;

const FAVORITES_KEY = "uv-favorite-projects";

// קריאת מועדפים מהדפדפן - לאורחים בלבד
function loadGuestFavorites(): string[] {
    try {
        const saved = localStorage.getItem(
            FAVORITES_KEY
        );

        if (!saved) return [];

        const parsed: unknown = JSON.parse(saved);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter(
            (id): id is string =>
                typeof id === "string"
        );
    } catch (error) {
        console.error(
            "Error loading guest favorites:",
            error
        );

        return [];
    }
}

// =====================================
// עמוד פרויקטים לפי קטגוריה
// =====================================

function CategoryProjects() {
    const { category = "" } = useParams();

    const location = useLocation();
    const navigate = useNavigate();

    // חיפוש ציבורי לפי שם או תיאור הפרויקט
    const [searchTerm, setSearchTerm] = useState("");

    // מעבר בין תצוגת כרטיסיות לתצוגת טבלה
    const [viewMode, setViewMode] = useState<ViewMode>("cards");

    const [projects, setProjects] =
        useState<Project[]>([]);

    const [favoriteIds, setFavoriteIds] =
        useState<string[]>([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [favoriteError, setFavoriteError] =
        useState("");

    const [savingId, setSavingId] =
        useState<string | null>(null);

    // =====================================
    // טעינת פרויקטים ומועדפים
    // =====================================

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            setLoading(true);
            setError("");
            setFavoriteError("");

            try {
                const token =
                    localStorage.getItem(
                        "userToken"
                    );

                // טעינת כל הפרויקטים
                const projectsRequest =
                    axios.get<Project[]>(
                        `${API_URL}/projects`
                    );

                if (token) {
                    // משתמש מחובר:
                    // טוענים מועדפים מהשרת
                    const favoritesRequest =
                        axios.get<FavoritesResponse>(
                            `${API_URL}/user-favorites`,
                            {
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`,
                                },
                            }
                        );

                    const [
                        projectsResponse,
                        favoritesResponse,
                    ] = await Promise.all([
                        projectsRequest,
                        favoritesRequest,
                    ]);

                    if (!active) return;

                    setProjects(
                        projectsResponse.data
                    );

                    setFavoriteIds(
                        favoritesResponse.data.favoriteIds
                    );
                } else {
                    // אורח:
                    // הפרויקטים מהשרת,
                    // המועדפים מהדפדפן
                    const projectsResponse =
                        await projectsRequest;

                    if (!active) return;

                    setProjects(
                        projectsResponse.data
                    );

                    setFavoriteIds(
                        loadGuestFavorites()
                    );
                }
            } catch (err) {
                console.error(
                    "Error loading category projects:",
                    err
                );

                if (!active) return;

                if (
                    axios.isAxiosError(err) &&
                    [401, 403].includes(
                        err.response?.status ?? 0
                    )
                ) {
                    setError(
                        "פג תוקף ההתחברות. יש להתחבר מחדש כדי לטעון את המועדפים."
                    );
                } else {
                    setError(
                        "לא הצלחנו לטעון את הפרויקטים או המועדפים. בדקו שהשרת פועל."
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
    }, [location.key]);

    // =====================================
    // הוספה או הסרה מהמועדפים
    // =====================================

    const toggleFavorite = async (
        projectId: string
    ) => {
        // מונעים לחיצות חוזרות בזמן שמירה
        if (savingId || loading || error) {
            return;
        }

        setFavoriteError("");
        setSavingId(projectId);

        const isFavorite =
            favoriteIds.includes(projectId);

        try {
            const token =
                localStorage.getItem(
                    "userToken"
                );

            if (token) {
                // ==========================
                // משתמש מחובר - MongoDB
                // ==========================

                const config = {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                };

                if (isFavorite) {
                    // הסרה מהחשבון
                    await axios.delete(
                        `${API_URL}/user-favorites/${projectId}`,
                        config
                    );
                } else {
                    // הוספה לחשבון
                    await axios.post(
                        `${API_URL}/user-favorites/${projectId}`,
                        {},
                        config
                    );
                }
            } else {
                // ==========================
                // אורח - localStorage
                // ==========================

                const updated = isFavorite
                    ? favoriteIds.filter(
                        (id) => id !== projectId
                    )
                    : [
                        ...favoriteIds,
                        projectId,
                    ];

                localStorage.setItem(
                    FAVORITES_KEY,
                    JSON.stringify(updated)
                );
            }

            // עדכון הלב רק לאחר שמירה מוצלחת
            setFavoriteIds((current) => {
                if (isFavorite) {
                    return current.filter(
                        (id) => id !== projectId
                    );
                }

                if (current.includes(projectId)) {
                    return current;
                }

                return [
                    ...current,
                    projectId,
                ];
            });
        } catch (err) {
            console.error(
                "Error saving favorite:",
                err
            );

            if (
                axios.isAxiosError(err) &&
                [401, 403].includes(
                    err.response?.status ?? 0
                )
            ) {
                setFavoriteError(
                    "פג תוקף ההתחברות. התחברו מחדש כדי לשמור מועדפים."
                );
            } else {
                setFavoriteError(
                    "לא הצלחנו לעדכן את המועדפים. נסו שוב."
                );
            }
        } finally {
            setSavingId(null);
        }
    };

    // =====================================
    // סינון משולב: קטגוריה + שם / תיאור
    // =====================================

    const selectedCategory = category || "all";
    const searchQuery = searchTerm.trim().toLocaleLowerCase("he-IL");

    const filteredProjects = projects.filter((project) => {
        const matchesCategory =
            selectedCategory === "all" ||
            project.category === databaseCategories[selectedCategory];

        const matchesSearch =
            !searchQuery ||
            project.title.toLocaleLowerCase("he-IL").includes(searchQuery) ||
            project.description.toLocaleLowerCase("he-IL").includes(searchQuery);

        return matchesCategory && matchesSearch;
    });

    const resetFilters = () => {
        setSearchTerm("");
        if (category) {
            navigate("/projects");
        }
    };

    // =====================================
    // מצב טעינה
    // =====================================

    if (loading) {
        return (
            <main
                className="category-page"
                dir="rtl"
            >
                <p role="status">
                    טוען פרויקטים ומועדפים...
                </p>
            </main>
        );
    }

    // =====================================
    // מצב שגיאה בטעינה
    // =====================================

    if (error) {
        return (
            <main
                className="category-page"
                dir="rtl"
            >
                <Link
                    to="/"
                    className="back-home-button"
                >
                    ← חזרה לדף הבית
                </Link>

                <h1>
                    {categoryNames[category] ||
                        "פרויקטים"}
                </h1>

                <p role="alert">
                    {error}
                </p>

                <Link
                    to="/login"
                    className="back-home-button"
                >
                    מעבר להתחברות
                </Link>
            </main>
        );
    }

    // =====================================
    // הצגת הפרויקטים
    // =====================================

    return (
        <main
            className="category-page"
            dir="rtl"
        >
            <Link
                to="/"
                className="back-home-button"
            >
                ← חזרה לדף הבית
            </Link>

            <h1>
                {categoryNames[category] || "כל הפרויקטים"}
            </h1>

            {/* חיפוש וסינון שזמינים גם לגולשים שאינם מחוברים */}
            <section className="uv-project-filters" aria-label="סינון פרויקטים">
                <div className="uv-project-filters-fields">
                    <div className="uv-project-filter-field">
                        <label htmlFor="uv-project-search">חיפוש פרויקט</label>
                        <input
                            id="uv-project-search"
                            type="search"
                            placeholder="חיפוש לפי שם או תיאור..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>

                    <div className="uv-project-filter-field">
                        <label htmlFor="uv-project-category">סינון לפי קטגוריה</label>
                        <select
                            id="uv-project-category"
                            value={selectedCategory}
                            onChange={(event) => {
                                const nextCategory = event.target.value;
                                navigate(nextCategory === "all" ? "/projects" : `/projects/${nextCategory}`);
                            }}
                        >
                            <option value="all">כל הקטגוריות</option>
                            {Object.entries(categoryNames).map(([slug, name]) => (
                                <option key={slug} value={slug}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        className="uv-project-filter-reset"
                        onClick={resetFilters}
                        disabled={!searchTerm.trim() && !category}
                    >
                        איפוס סינון
                    </button>
                </div>
                <p className="uv-project-filter-count" role="status" aria-live="polite">
                    נמצאו {filteredProjects.length} פרויקטים
                </p>
            </section>

            {/* מעבר בין מצבי תצוגה — הסינון והמועדפים משותפים לשניהם */}
            <div className="uv-project-view-toolbar">
                <div className="uv-project-view-toggle" role="group" aria-label="בחירת אופן תצוגת הפרויקטים">
                    <button
                        type="button"
                        className={viewMode === "cards" ? "is-active" : ""}
                        aria-pressed={viewMode === "cards"}
                        onClick={() => setViewMode("cards")}
                    >
                        <span aria-hidden="true">▦</span> כרטיסיות
                    </button>
                    <button
                        type="button"
                        className={viewMode === "table" ? "is-active" : ""}
                        aria-pressed={viewMode === "table"}
                        onClick={() => setViewMode("table")}
                    >
                        <span aria-hidden="true">☷</span> טבלה
                    </button>
                </div>
            </div>

            {/* הודעת שגיאה בשמירת מועדף */}
            {favoriteError && (
                <p role="alert">
                    {favoriteError}
                </p>
            )}

            {viewMode === "cards" ? (
                <div className="category-projects-grid">
                    {filteredProjects.map((project) => {
                        const isFavorite =
                            favoriteIds.includes(
                                project._id
                            );

                        const isSaving =
                            savingId === project._id;

                        return (
                            <div
                                className="favorite-project-wrapper"
                                key={project._id}
                            >
                                {/* כרטיס הפרויקט */}
                                <Link
                                    to={
                                        "/project/" +
                                        project._id
                                    }
                                    className="category-project-card project-card-link"
                                >
                                    {project.images &&
                                        project.images.length > 0 && (

                                            <img
                                                src={project.images[0]}
                                                alt={`תמונה של פרויקט נגרות חוץ: ${project.title}`}
                                            />

                                        )}

                                    <h2>
                                        {project.title}
                                    </h2>

                                    <p>
                                        {project.description}
                                    </p>
                                </Link>

                                {/* לב המועדפים */}
                                <button
                                    type="button"
                                    className={
                                        "project-favorite-button" +
                                        (isFavorite
                                            ? " is-favorite"
                                            : "")
                                    }
                                    aria-label={
                                        isFavorite
                                            ? `הסרת ${project.title} מהמועדפים`
                                            : `הוספת ${project.title} למועדפים`
                                    }
                                    aria-pressed={
                                        isFavorite
                                    }
                                    aria-busy={
                                        isSaving
                                    }
                                    title={
                                        isFavorite
                                            ? "הסרה מהמועדפים"
                                            : "הוספה למועדפים"
                                    }
                                    disabled={
                                        savingId !== null
                                    }
                                    onClick={() =>
                                        toggleFavorite(
                                            project._id
                                        )
                                    }
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        width="24"
                                        height="24"
                                        fill={
                                            isFavorite
                                                ? "currentColor"
                                                : "none"
                                        }
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
                        );
                    })}
                </div>
            ) : (
                <div
                    className="uv-project-table-scroll"
                    role="region"
                    aria-label="טבלת פרויקטים"
                    tabIndex={0}
                >
                    <table className="uv-project-table">
                        <thead>
                            <tr>
                                <th scope="col">תמונה</th>
                                <th scope="col">שם הפרויקט</th>
                                <th scope="col">קטגוריה</th>
                                <th scope="col">תיאור</th>
                                <th scope="col">מועדפים</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProjects.map((project) => {
                                const isFavorite = favoriteIds.includes(project._id);
                                const isSaving = savingId === project._id;
                                const categorySlug = Object.keys(databaseCategories).find(
                                    (slug) => databaseCategories[slug] === project.category
                                );
                                return (
                                    <tr key={project._id}>
                                        <td className="uv-project-table-image">
                                            {project.images?.length ? (
                                                <img src={project.images[0]} alt="" loading="lazy" />
                                            ) : (
                                                <span aria-label="אין תמונה">—</span>
                                            )}
                                        </td>
                                        <td>
                                            <Link className="uv-project-table-link" to={`/project/${project._id}`}>
                                                {project.title}
                                            </Link>
                                        </td>
                                        <td>{categorySlug ? categoryNames[categorySlug] : project.category}</td>
                                        <td className="uv-project-table-description">{project.description}</td>
                                        <td className="uv-project-table-favorite">
                                            <button
                                                type="button"
                                                className={"project-favorite-button" + (isFavorite ? " is-favorite" : "")}
                                                aria-label={isFavorite
                                                    ? `הסרת ${project.title} מהמועדפים`
                                                    : `הוספת ${project.title} למועדפים`}
                                                aria-pressed={isFavorite}
                                                aria-busy={isSaving}
                                                title={isFavorite ? "הסרה מהמועדפים" : "הוספה למועדפים"}
                                                disabled={savingId !== null}
                                                onClick={() => toggleFavorite(project._id)}
                                            >
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    width="24"
                                                    height="24"
                                                    fill={isFavorite ? "currentColor" : "none"}
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* חיווי רלוונטי כשהסינון לא מחזיר תוצאות */}
            {filteredProjects.length === 0 && (
                <div className="uv-project-filter-empty" role="status">
                    <p>
                        {projects.length === 0
                            ? "עדיין לא נוספו פרויקטים לאתר."
                            : "לא נמצאו פרויקטים שמתאימים לחיפוש או לקטגוריה שבחרתם."}
                    </p>
                    {projects.length > 0 && (
                        <button
                            type="button"
                            className="uv-project-filter-reset"
                            onClick={resetFilters}
                        >
                            הצגת כל הפרויקטים
                        </button>
                    )}
                </div>
            )}
        </main>
    );
}

export default CategoryProjects;
