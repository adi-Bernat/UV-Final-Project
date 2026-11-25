import "./App.css";

// עיצוב Header
import "./styles/header/header-base-01.css";
import "./styles/header/header-account-01.css";
import "./styles/header/header-favorites-01.css";
import "./styles/header/header-mobile-01.css";
import "./styles/projects/project-filters.css";
import "./styles/profile/profile.css";
import { Routes, Route, Link } from "react-router-dom";

// רכיבים כלליים
import Header from "./components/Header";
import Footer from "./components/Footer";
import TestimonialsCarousel from "./components/TestimonialsCarousel";
import AccessibilityMenu from "./components/AccessibilityMenu";

// עמודי האתר
import CategoryProjects from "./pages/CategoryProjects";
import ProjectDetails from "./pages/ProjectDetails";
import Favorites from "./pages/Favorites";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminUsers from "./pages/AdminUsers";
import Profile from "./pages/Profile";
// הרשמה והתחברות
import Register from "./pages/Register";
import AdminLogin from "./pages/AdminLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// מערכת הניהול
import AdminDashboard from "./pages/AdminDashboard";
import AdminProjects from "./pages/AdminProjects";
import AdminAddProject from "./pages/AdminAddProject";
import AdminEditProject from "./pages/AdminEditProject";

// הצעות מחיר
import AdminQuotes from "./pages/AdminQuotes";
import AdminQuoteList from "./pages/AdminQuoteList";
import QuoteView from "./pages/QuoteView";

function App() {
  return (
    <>
      <Header />

      <Routes>
        {/* =================================
            דף הבית - פרויקט הגמר
        ================================= */}

        <Route
          path="/"
          element={
            <main id="home">
              {/* תמונת פתיחה */}
              <section className="hero-section">
                <div className="uv-final-hero-intro">
                  <h1>UV | נגרות חוץ</h1>

                  <h2>
                    הופכים רעיונות למציאות מעץ
                  </h2>

                  <p>
                    מתמחים בתכנון וביצוע עבודות
                    נגרות חוץ בהתאמה אישית:
                    פרגולות, דקים, גדרות,
                    מחסנים וחידוש עבודות עץ.
                    כל פרויקט נבנה מתוך מחשבה
                    על איכות, שימושיות ועיצוב.
                  </p>

                  {/* הרשמת משתמש חדש */}
                  <Link
                    to="/register"
                    className="uv-final-hero-contact"
                  >
                    הרשמה לאתר
                  </Link>
                </div>
              </section>

              {/* =================================
                  השירותים שלנו
              ================================= */}

              <section
                id="services"
                className="services-section"
              >
                <h2>השירותים שלנו</h2>

                <div className="services-grid">
                  {/* פרגולות */}
                  <Link
                    to="/projects/pergolas"
                    className="service-card service-card-link"
                  >
                    <h3>פרגולות</h3>
                    <p>
                      תכנון ובנייה בהתאמה אישית
                      לבית ולחצר.
                    </p>
                  </Link>

                  {/* קירויי סנטף */}
                  <Link
                    to="/projects/suntuf"
                    className="service-card service-card-link"
                  >
                    <h3>קירויי סנטף</h3>
                    <p>
                      קירויי סנטף לפרגולות
                      ומבני חוץ בהתאמה אישית.
                    </p>
                  </Link>

                  {/* דקים */}
                  <Link
                    to="/projects/decks"
                    className="service-card service-card-link"
                  >
                    <h3>דקים</h3>
                    <p>
                      הקמה וחידוש דקים
                      במראה טבעי ומדויק.
                    </p>
                  </Link>

                  {/* גדרות */}
                  <Link
                    to="/projects/fences"
                    className="service-card service-card-link"
                  >
                    <h3>גדרות</h3>
                    <p>
                      גדרות עץ מעוצבות
                      בהתאמה לסגנון הבית.
                    </p>
                  </Link>

                  {/* מחסנים */}
                  <Link
                    to="/projects/storage"
                    className="service-card service-card-link"
                  >
                    <h3>מחסנים</h3>
                    <p>
                      מחסני עץ ופתרונות חוץ
                      שימושיים ואסתטיים.
                    </p>
                  </Link>

                  {/* חידושי דק */}
                  <Link
                    to="/projects/deck-renovation"
                    className="service-card service-card-link"
                  >
                    <h3>חידושי דק</h3>
                    <p>
                      ליטוש, טיפול וחידוש
                      לדקים קיימים.
                    </p>
                  </Link>

                  {/* חידושי סאונות */}
                  <Link
                    to="/projects/sauna-renovation"
                    className="service-card service-card-link"
                  >
                    <h3>חידושי סאונות</h3>
                    <p>
                      שיקום וחידוש עבודות
                      עץ בסאונות.
                    </p>
                  </Link>
                </div>

                {/* מעבר לעמוד סינון הפרויקטים הציבורי */}
                <div className="uv-all-projects-link">
                  <Link to="/projects" className="uv-final-hero-contact">
                    לכל הפרויקטים והסינון ←
                  </Link>
                </div>
              </section>

              {/* ביקורות לקוחות */}
              <TestimonialsCarousel />
            </main>
          }
        />

        {/* =================================
            הרשמת משתמשים
        ================================= */}

        <Route
          path="/register"
          element={<Register />}
        />

        {/* =================================
            התחברות משותפת
            משתמש רגיל + מנהל
        ================================= */}

        <Route
          path="/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />
        {/* בקשת קישור לאיפוס סיסמה */}
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* הגדרת סיסמה חדשה */}
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
        {/* =================================
            עמודי פרויקטים
        ================================= */}

        <Route
          path="/projects"
          element={<CategoryProjects />}
        />

        <Route
          path="/projects/:category"
          element={<CategoryProjects />}
        />

        <Route
          path="/project/:id"
          element={<ProjectDetails />}
        />

        {/* =================================
            עמוד המועדפים
        ================================= */}

        <Route
          path="/favorites"
          element={<Favorites />}
        />
        {/* פרופיל אישי של המשתמש המחובר */}
        <Route
          path="/profile"
          element={<Profile />}
        />
        {/* =================================
            עמודים כלליים
        ================================= */}

        <Route
          path="/about"
          element={<About />}
        />

        <Route
          path="/contact"
          element={<Contact />}
        />

        <Route
          path="/contact/success"
          element={<Contact />}
        />

        {/* =================================
            מערכת הניהול
        ================================= */}

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route
          path="/admin/projects"
          element={<AdminProjects />}
        />

        <Route
          path="/admin/projects/new"
          element={<AdminAddProject />}
        />

        <Route
          path="/admin/projects/:id/edit"
          element={<AdminEditProject />}
        />

        {/* =================================
            הצעות מחיר
        ================================= */}

        <Route
          path="/admin/quotes"
          element={<AdminQuotes />}
        />

        <Route
          path="/admin/quotes/saved"
          element={<AdminQuoteList />}
        />

        <Route
          path="/admin/quotes/:id"
          element={<AdminQuotes />}
        />

        <Route
          path="/quote/view/:token"
          element={<QuoteView />}
        />
      </Routes>

      <Footer />

      <AccessibilityMenu />
    </>
  );
}

export default App;
