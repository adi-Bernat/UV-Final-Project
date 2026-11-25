
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { useEffect, type MouseEvent } from "react";

function Footer() {
    const { pathname } = useLocation();

    // מעבר לעמוד אחר מחזיר לראש העמוד
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    // גם לחיצה על קישור לעמוד שבו אנחנו כבר נמצאים
    // תחזיר אותנו לראש העמוד
    const handleFooterNavigation = (
        event: MouseEvent<HTMLElement>
    ) => {
        const target = event.target as Element;
        const link = target.closest("a");

        if (!link) return;

        const href = link.getAttribute("href");

        if (href?.startsWith("/") && !href.startsWith("//")) {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: "auto",
            });
        }
    };

    const hideFooter =
        pathname === "/admin" ||
        pathname.startsWith("/admin/") ||
        pathname.startsWith("/quote/view/");

    if (hideFooter) return null;

    const instagramUrl =
        "https://www.instagram.com/uv.outdoordesign?vrfl=dWF5ZnZlNXIyNWs4";

    const facebookUrl =
        "https://www.facebook.com/share/1A7Td1LSJb/";

    const email = "uv.outdoordesign@gmail.com";
    const phone = "0523115559";

    const whatsappUrl =
        "https://wa.me/972523115559?text=" +
        encodeURIComponent(
            "שלום יובל, אשמח לקבל פרטים על עבודות נגרות חוץ"
        );

    return (
        <footer
            className="uv2-footer"
            dir="rtl"
            onClick={handleFooterNavigation}
        >
            <div className="uv2-container">

                {/* אזור פתיחה */}
                <section className="uv2-top">
                    <div>
                        <span className="uv2-eyebrow">
                            UV | נגרות חוץ
                        </span>

                        <h2>החצר שלכם. העבודה שלנו.</h2>

                        <p>
                            יש לכם רעיון לפרויקט עץ?
                            נשמח להפוך אותו למציאות.
                        </p>
                    </div>

                    <Link to="/contact" className="uv2-main-button">
                        בואו נדבר
                        <span aria-hidden="true">←</span>
                    </Link>
                </section>

                {/* תוכן הפוטר */}
                <div className="uv2-content">

                    {/* לוגו */}
                    <div className="uv2-brand">
                        <Link to="/" aria-label="UV - דף הבית">
                            <div className="uv2-logo-box">
                                <img
                                    src={logo}
                                    alt="UV נגרות חוץ"
                                />
                            </div>
                        </Link>

                        <p>
                            נגרות חוץ בהתאמה אישית.
                            תכנון וביצוע עבודות עץ
                            עם דגש על איכות, דיוק ועיצוב.
                        </p>
                    </div>

                    {/* ניווט */}
                    <nav
                        className="uv2-column"
                        aria-label="ניווט תחתון"
                    >
                        <h3>לגלות עוד</h3>

                        <Link to="/">דף הבית</Link>
                        <Link to="/about">קצת עלינו</Link>
                        <Link to="/contact">צור קשר</Link>
                    </nav>

                    {/* שירותים */}
                    <nav
                        className="uv2-column"
                        aria-label="השירותים שלנו"
                    >
                        <h3>השירותים שלנו</h3>

                        <Link to="/projects/pergolas">
                            פרגולות
                        </Link>

                        <Link to="/projects/suntuf">
                            קירויי סנטף
                        </Link>

                        <Link to="/projects/decks">
                            דקים
                        </Link>

                        <Link to="/projects/fences">
                            גדרות
                        </Link>

                        <Link to="/projects/storage">
                            מחסנים
                        </Link>

                        <Link to="/projects/deck-renovation">
                            חידושי דקים
                        </Link>

                        <Link to="/projects/sauna-renovation">
                            חידוש סאונות
                        </Link>
                    </nav>

                    {/* פרטי קשר ורשתות */}
                    <div className="uv2-column uv2-contact">
                        <h3>נשארים בקשר</h3>

                        <a href={`tel:${phone}`}>
                            052-3115559
                        </a>

                        <a href={`mailto:${email}`}>
                            {email}
                        </a>

                        <div className="uv2-socials">

                            <a
                                href={instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="אינסטגרם של UV"
                                title="אינסטגרם"
                                className="uv2-social"
                            >
                                <svg viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true">
                                    <rect x="2" y="2" width="20"
                                        height="20" rx="6" />
                                    <circle cx="12" cy="12" r="4" />
                                    <circle cx="18" cy="6" r="1"
                                        fill="currentColor" stroke="none" />
                                </svg>
                            </a>

                            <a
                                href={facebookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="פייסבוק של UV"
                                title="פייסבוק"
                                className="uv2-social"
                            >
                                <svg viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true">
                                    <path d="M15 21v-8h3l.5-4H15V7c0-1.2.4-2 2-2h2V2h-2.5C12 2 11 4.7 11 7.5V9H8v4h3v8" />
                                </svg>
                            </a>

                            <a
                                href={`mailto:${email}`}
                                aria-label="שליחת מייל ל-UV"
                                title="מייל"
                                className="uv2-social"
                            >
                                <svg viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="1.8"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true">
                                    <rect x="2" y="5" width="20"
                                        height="14" rx="2" />
                                    <path d="m3 7 9 7 9-7" />
                                </svg>
                            </a>

                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="וואטסאפ של UV"
                                title="וואטסאפ"
                                className="uv2-social"
                            >
                                <svg viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="1.7"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true">
                                    <path d="M20.5 11.5a8.5 8.5 0 0 1-12.7 7.4L3 20l1.2-4.5a8.5 8.5 0 1 1 16.3-4Z" />
                                    <path d="M8.6 8.2c.3-.3.6-.3.8.1l1 1.5c.1.3 0 .5-.3.8l-.4.4a9 9 0 0 0 3.3 3.3l.5-.5c.3-.3.5-.3.8-.2l1.5.8c.4.2.4.5.2.9-.4.8-1.2 1.2-2 1a10 10 0 0 1-6-6c-.3-.9 0-1.6.6-2.1Z" />
                                </svg>
                            </a>

                        </div>

                        <span className="uv2-social-caption">
                            עקבו אחרינו ברשתות
                        </span>
                    </div>
                </div>

                {/* זכויות יוצרים */}
                <div className="uv2-bottom">
                    <span>
                        © {new Date().getFullYear()} UV נגרות חוץ.
                        כל הזכויות שמורות.
                    </span>

                    <span>
                        עבודות עץ | תכנון | ביצוע
                    </span>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
