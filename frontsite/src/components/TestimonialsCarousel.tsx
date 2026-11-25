
import { useState } from "react";

type Review = {
    name: string;
    project: string;
    text: string;
};

const reviews: Review[] = [
    {
        name: "שם הלקוח הראשון",
        project: "פרגולה",
        text: "כאן נכניס את הביקורת האמיתית הראשונה של לקוח מרוצה.",
    },
    {
        name: "שם הלקוח השני",
        project: "דק עץ",
        text: "כאן נכניס את הביקורת האמיתית השנייה.",
    },
    {
        name: "שם הלקוח השלישי",
        project: "גדר עץ",
        text: "כאן נכניס את הביקורת האמיתית השלישית.",
    },
];

function TestimonialsCarousel() {
    const [current, setCurrent] = useState(0);

    const nextReview = () => {
        setCurrent((previous) =>
            (previous + 1) % reviews.length
        );
    };

    const previousReview = () => {
        setCurrent((previous) =>
            (previous - 1 + reviews.length) % reviews.length
        );
    };

    const review = reviews[current];

    return (
        <section
            id="reviews"
            className="uv-reviews-section"
            dir="rtl"
            aria-labelledby="uv-reviews-title"
        >
            <div className="uv-reviews-container">

                <span className="uv-reviews-eyebrow">
                    המילים שלכם
                </span>

                <h2 id="uv-reviews-title">
                    מה הלקוחות שלנו אומרים
                </h2>

                <p className="uv-reviews-subtitle">
                    לכל פרויקט יש סיפור.
                    נשמח לתת ללקוחות שלנו לספר אותו.
                </p>

                <div
                    className="uv-reviews-carousel"
                    role="region"
                    aria-roledescription="קרוסלה"
                    aria-label="ביקורות לקוחות"
                >
                    <button
                        type="button"
                        className="uv-reviews-arrow"
                        onClick={previousReview}
                        aria-label="לביקורת הקודמת"
                    >
                        <span aria-hidden="true">→</span>
                    </button>

                    <div
                        className="uv-review-card"
                        key={current}
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        <span
                            className="uv-review-quote-icon"
                            aria-hidden="true"
                        >
                            ”
                        </span>

                        <blockquote className="uv-review-text">
                            {review.text}
                        </blockquote>

                        <div className="uv-review-divider" />

                        <p className="uv-review-name">
                            {review.name}
                        </p>

                        <p className="uv-review-project">
                            {review.project}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="uv-reviews-arrow"
                        onClick={nextReview}
                        aria-label="לביקורת הבאה"
                    >
                        <span aria-hidden="true">←</span>
                    </button>
                </div>

                <div
                    className="uv-reviews-dots"
                    aria-label="בחירת ביקורת"
                >
                    {reviews.map((_, index) => (
                        <button
                            key={index}
                            type="button"
                            className={
                                "uv-review-dot" +
                                (current === index ? " active" : "")
                            }
                            aria-label={`מעבר לביקורת ${index + 1}`}
                            aria-current={
                                current === index ? "true" : undefined
                            }
                            onClick={() => setCurrent(index)}
                        />
                    ))}
                </div>

            </div>
        </section>
    );
}

export default TestimonialsCarousel;
