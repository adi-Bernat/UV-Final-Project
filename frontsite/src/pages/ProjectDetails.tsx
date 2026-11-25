import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

type Project = {
    _id: string;
    title: string;
    description: string;
    category: string;
    images?: string[];
    videos?: string[];
};

type MediaItem = {
    type: "image" | "video";
    src: string;
};

function ProjectDetails() {
    const { id } = useParams();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

    useEffect(() => {
        const getProject = async () => {
            try {
                const response = await axios.get<Project>(
                    "http://localhost:3000/api/projects/" + id
                );

                setProject(response.data);
            } catch (error) {
                console.error(error);
                setError("לא הצלחנו לטעון את הפרויקט");
            } finally {
                setLoading(false);
            }
        };

        getProject();
    }, [id]);

    if (loading) {
        return <p>טוען פרויקט...</p>;
    }

    if (error || !project) {
        return <p>{error || "הפרויקט לא נמצא"}</p>;
    }

    const media: MediaItem[] = [
        ...(project.images || []).map((src) => ({
            type: "image" as const,
            src,
        })),
        ...(project.videos || []).map((src) => ({
            type: "video" as const,
            src,
        })),
    ];

    const nextMedia = () => {
        if (media.length === 0) return;

        setCurrentMediaIndex((prev) =>
            prev === media.length - 1 ? 0 : prev + 1
        );
    };

    const previousMedia = () => {
        if (media.length === 0) return;

        setCurrentMediaIndex((prev) =>
            prev === 0 ? media.length - 1 : prev - 1
        );
    };
    const categoryRoutes: Record<string, string> = {
        Pergola: "pergolas",
        Deck: "decks",
        Fence: "fences",
        Storage: "storage",
        "Deck Renovation": "deck-renovation",
        "Sauna Renovation": "sauna-renovation",
        Suntuf: "suntuf",
    };
    const backCategory = categoryRoutes[project.category] || "pergolas";
    return (
        <main className="project-details-page" dir="rtl">
            <div className="project-details-top">
                <Link
                    to={"/projects/" + backCategory}
                    className="back-home-button"
                >
                    חזרה לפרויקטים ←
                </Link>
            </div>

            <div className="project-details-header">
                <h1>{project.title}</h1>
                <p>{project.description}</p>
            </div>

            {media.length > 0 ? (
                <div className="project-gallery">
                    {media.length > 1 && (
                        <button
                            type="button"
                            className="gallery-arrow gallery-arrow-right"
                            onClick={nextMedia}
                            aria-label="המדיה הבאה"
                        >
                            ›
                        </button>
                    )}

                    <div className="gallery-media">
                        {media[currentMediaIndex].type === "image" ? (

                            <img
                                src={media[currentMediaIndex].src}
                                alt={`${project.title} – תמונה ${currentMediaIndex + 1
                                    } מתוך ${project.images?.length || 0}`}
                            />

                        ) : (
                            <video
                                src={media[currentMediaIndex].src}
                                controls
                                playsInline
                            />
                        )}
                    </div>

                    {media.length > 1 && (
                        <button
                            type="button"
                            className="gallery-arrow gallery-arrow-left"
                            onClick={previousMedia}
                            aria-label="המדיה הקודמת"
                        >
                            ‹
                        </button>
                    )}

                    {media.length > 1 && (
                        <div className="gallery-counter">
                            {currentMediaIndex + 1} / {media.length}
                        </div>
                    )}
                </div>
            ) : (
                <p className="no-project-media">
                    עדיין לא נוספו תמונות או סרטונים לפרויקט הזה.
                </p>
            )}
        </main>
    );
}

export default ProjectDetails;