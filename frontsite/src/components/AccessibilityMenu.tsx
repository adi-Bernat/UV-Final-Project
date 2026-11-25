
import { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

type Preferences = {
    largeText: boolean;
    highContrast: boolean;
    underlineLinks: boolean;
    reduceMotion: boolean;
};

const STORAGE_KEY = "uv-accessibility-v2";

const defaults: Preferences = {
    largeText: false,
    highContrast: false,
    underlineLinks: false,
    reduceMotion: false,
};

function readPreferences(): Preferences {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return { ...defaults };

        const data = JSON.parse(saved) as Partial<Preferences>;

        return {
            largeText: data.largeText === true,
            highContrast: data.highContrast === true,
            underlineLinks: data.underlineLinks === true,
            reduceMotion: data.reduceMotion === true,
        };
    } catch {
        return { ...defaults };
    }
}

const options: {
    key: keyof Preferences;
    text: string;
}[] = [
        { key: "largeText", text: "הגדלת טקסט" },
        { key: "highContrast", text: "ניגודיות גבוהה" },
        { key: "underlineLinks", text: "הדגשת קישורים" },
        { key: "reduceMotion", text: "הפחתת תנועה" },
    ];

function AccessibilityMenu() {
    const { pathname } = useLocation();

    const panelId = useId();
    const headingId = useId();

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [settings, setSettings] =
        useState<Preferences>(readPreferences);

    // החלת ההעדפות על האתר
    useEffect(() => {
        const html = document.documentElement;

        html.classList.toggle(
            "uv-a11y2-large",
            settings.largeText
        );

        html.classList.toggle(
            "uv-a11y2-contrast",
            settings.highContrast
        );

        html.classList.toggle(
            "uv-a11y2-links",
            settings.underlineLinks
        );

        html.classList.toggle(
            "uv-a11y2-motion",
            settings.reduceMotion
        );

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(settings)
            );
        } catch {
            // ההעדפות יפעלו גם בלי אחסון מקומי
        }
    }, [settings]);

    // סגירת התפריט במעבר בין עמודים
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // סגירה באמצעות Escape או לחיצה מחוץ לתפריט
    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };

        const onPointerDown = (event: PointerEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(
                    event.target as Node
                )
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener(
            "pointerdown",
            onPointerDown
        );

        return () => {
            document.removeEventListener(
                "keydown",
                onKeyDown
            );

            document.removeEventListener(
                "pointerdown",
                onPointerDown
            );
        };
    }, [isOpen]);

    const toggle = (key: keyof Preferences) => {
        setSettings((previous) => ({
            ...previous,
            [key]: !previous[key],
        }));
    };

    const closeMenu = () => {
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    return (
        <div
            ref={containerRef}
            className="uv-a11y2-widget"
            dir="rtl"
        >
            <button
                ref={triggerRef}
                type="button"
                className="uv-a11y2-trigger"
                aria-label="התאמות נגישות"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setIsOpen((value) => !value)}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="10" />
                    <circle
                        cx="12"
                        cy="7"
                        r="1.5"
                        fill="currentColor"
                        stroke="none"
                    />
                    <path d="M5.5 10.5 12 12l6.5-1.5" />
                    <path d="M12 12v7" />
                    <path d="m12 15-4 5" />
                    <path d="m12 15 4 5" />
                </svg>

                <span>נגישות</span>
            </button>

            <section
                id={panelId}
                className="uv-a11y2-panel"
                aria-labelledby={headingId}
                hidden={!isOpen}
            >
                <div className="uv-a11y2-header">
                    <h2 id={headingId}>
                        התאמות נגישות
                    </h2>

                    <button
                        type="button"
                        className="uv-a11y2-close"
                        aria-label="סגירת תפריט הנגישות"
                        onClick={closeMenu}
                    >
                        ×
                    </button>
                </div>

                <p className="uv-a11y2-description">
                    ניתן להתאים את תצוגת האתר
                    להעדפות האישיות שלכם.
                </p>

                <div className="uv-a11y2-options">
                    {options.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            className={
                                "uv-a11y2-option" +
                                (settings[option.key]
                                    ? " is-active"
                                    : "")
                            }
                            aria-pressed={settings[option.key]}
                            onClick={() => toggle(option.key)}
                        >
                            <span>{option.text}</span>

                            <span aria-hidden="true">
                                {settings[option.key] ? "✓" : "+"}
                            </span>
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    className="uv-a11y2-reset"
                    onClick={() => setSettings({ ...defaults })}
                >
                    איפוס התאמות
                </button>

                <div className="uv-a11y2-help">
                    <p>נתקלתם בבעיית נגישות באתר?</p>

                    <a
                        href={
                            "mailto:uv.outdoordesign@gmail.com" +
                            "?subject=" +
                            encodeURIComponent(
                                "דיווח על בעיית נגישות באתר"
                            )
                        }
                    >
                        שלחו לנו דיווח במייל
                    </a>
                </div>
            </section>
        </div>
    );
}

export default AccessibilityMenu;
