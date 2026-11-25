import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/admin/admin-users.css";

type Role = "user" | "admin";
type AccountType = "registered" | "legacy-admin";

type Account = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string | null;
  accountType: AccountType;
};

type ListResponse = {
  users: Account[];
  legacyAdmins: Account[];
};

const API_BASE = (
  import.meta.env.VITE_API_URL?.trim() ||
  `${window.location.protocol}//${window.location.hostname}:3000/api`
).replace(/\/$/, "");

function getErrorText(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (message === "Email already exists") return "כתובת האימייל כבר קיימת במערכת.";
    if (error.response?.status === 400) return "יש לבדוק את הנתונים שהוזנו.";
    if (error.response?.status === 403) return "אין הרשאה לבצע פעולה זו.";
    if (error.response?.status === 404) return "המשתמש לא נמצא. כדאי לרענן את הרשימה.";
    if (typeof message === "string" && message.length < 180) return message;
    if (!error.response) return "לא ניתן להתחבר לשרת. בדקי שה־Backend פועל.";
  }
  return "הפעולה נכשלה. אפשר לנסות שוב.";
}

function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Account[]>([]);
  const [legacyAdmins, setLegacyAdmins] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const getToken = () => localStorage.getItem("adminToken");

  const handleAuthError = (err: unknown): boolean => {
    if (axios.isAxiosError(err) && [401, 403].includes(err.response?.status || 0)) {
      // 403 may indicate insufficient rights; preserve sign-in only on 401.
      if (err.response?.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/admin/login", { replace: true });
      }
      return true;
    }
    return false;
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }
    let alive = true;
    const load = async () => {
      try {
        const response = await axios.get<ListResponse>(`${API_BASE}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!alive) return;
        setUsers(response.data.users);
        setLegacyAdmins(response.data.legacyAdmins);
      } catch (err) {
        if (!alive) return;
        if (handleAuthError(err)) {
          setError("אין הרשאה לצפות במשתמשים. התחברי כמנהלת.");
        } else {
          setError(getErrorText(err));
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => { alive = false; };
    // No refetch on transient navigation or local state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const all = [...users, ...legacyAdmins];
    if (!normalized) return all;
    return all.filter(person =>
      person.name.toLowerCase().includes(normalized) ||
      person.email.toLowerCase().includes(normalized)
    );
  }, [users, legacyAdmins, query]);

  const beginEdit = (person: Account) => {
    setEditingId(person._id);
    setDraftName(person.name);
    setDraftEmail(person.email);
    setError("");
    setNotice("");
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId || busyId) return;
    const token = getToken();
    if (!token) return navigate("/admin/login", { replace: true });

    setBusyId(editingId);
    setError("");
    setNotice("");
    try {
      const response = await axios.patch<Account>(
        `${API_BASE}/admin/users/${editingId}`,
        { name: draftName.trim(), email: draftEmail.trim().toLowerCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(previous => previous.map(p => p._id === editingId ? response.data : p));
      setEditingId(null);
      setNotice("פרטי המשתמש עודכנו בהצלחה.");
    } catch (err) {
      handleAuthError(err);
      setError(getErrorText(err));
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (person: Account, role: Role) => {
    if (role === person.role || busyId) return;
    const action = role === "admin" ? "לתת הרשאת מנהל" : "להסיר הרשאת מנהל";
    if (!window.confirm(`האם ${action} למשתמש/ת ${person.name || person.email}?`)) return;
    const token = getToken();
    if (!token) return navigate("/admin/login", { replace: true });

    setBusyId(person._id);
    setError("");
    setNotice("");
    try {
      const response = await axios.patch<Account>(
        `${API_BASE}/admin/users/${person._id}/role`,
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(previous => previous.map(p => p._id === person._id ? response.data : p));
      setNotice(role === "admin" ? "המשתמש קיבל הרשאת מנהל. עליו להתחבר מחדש במסלול מנהל." : "הרשאת המנהל הוסרה.");
    } catch (err) {
      handleAuthError(err);
      setError(getErrorText(err));
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (person: Account) => {
    if (busyId) return;
    if (!window.confirm(`למחוק לצמיתות את החשבון של ${person.name || person.email}?\nלא ניתן לבטל את הפעולה.`)) return;
    const token = getToken();
    if (!token) return navigate("/admin/login", { replace: true });

    setBusyId(person._id);
    setError("");
    setNotice("");
    try {
      await axios.delete(`${API_BASE}/admin/users/${person._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(previous => previous.filter(p => p._id !== person._id));
      if (editingId === person._id) setEditingId(null);
      setNotice("המשתמש נמחק בהצלחה.");
    } catch (err) {
      handleAuthError(err);
      setError(getErrorText(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main dir="rtl" className="uv-users-page">
      <section className="uv-users-content">
        <div className="uv-users-heading">
          <div>
            <h1>ניהול משתמשים</h1>
            <p>עריכת חשבונות, מחיקה ושינוי הרשאות באופן מאובטח.</p>
          </div>
          <Link to="/admin" className="uv-users-back">חזרה ללוח הניהול</Link>
        </div>

        <div className="uv-users-tools">
          <label htmlFor="uv-users-search">חיפוש לפי שם או אימייל</label>
          <input id="uv-users-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="חיפוש משתמשים..." />
          <span className="uv-users-count">{users.length} משתמשים רשומים · {legacyAdmins.length} מנהלי מערכת קיימים</span>
        </div>

        {loading && <p role="status">טוען משתמשים...</p>}
        {error && <p className="uv-users-error" role="alert">{error}</p>}
        {notice && <p className="uv-users-success" role="status">{notice}</p>}

        {!loading && !error && rows.length === 0 && <p>לא נמצאו משתמשים מתאימים.</p>}

        {!loading && rows.length > 0 && (
          <div className="uv-users-table-scroll">
            <table className="uv-users-table">
              <thead>
                <tr>
                  <th>שם</th><th>אימייל</th><th>הרשאה</th><th>סוג חשבון</th><th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(person => {
                  const isLegacy = person.accountType === "legacy-admin";
                  const isBusy = busyId !== null;
                  return (
                    <tr key={`${person.accountType}-${person._id}`}>
                      <td data-label="שם">{person.name || "—"}</td>
                      <td data-label="אימייל" className="uv-users-email">{person.email}</td>
                      <td data-label="הרשאה">
                        {isLegacy ? <span className="uv-users-role">מנהל</span> : (
                          <select
                            aria-label={`הרשאה עבור ${person.name || person.email}`}
                            value={person.role}
                            disabled={isBusy}
                            onChange={e => void changeRole(person, e.target.value as Role)}
                          >
                            <option value="user">משתמש רגיל</option>
                            <option value="admin">מנהל</option>
                          </select>
                        )}
                      </td>
                      <td data-label="סוג חשבון">{isLegacy ? "מנהל מערכת קיים" : "משתמש רשום"}</td>
                      <td data-label="פעולות">
                        {isLegacy ? (
                          <span className="uv-users-locked">חשבון מוגן</span>
                        ) : (
                          <div className="uv-users-actions">
                            <button type="button" disabled={isBusy} onClick={() => beginEdit(person)}>עריכה</button>
                            <button className="uv-users-delete" type="button" disabled={isBusy} onClick={() => void deleteUser(person)}>מחיקה</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editingId && (
          <section className="uv-users-edit" aria-labelledby="uv-users-edit-title">
            <h2 id="uv-users-edit-title">עריכת פרטי משתמש</h2>
            <form onSubmit={saveEdit}>
              <label htmlFor="uv-edit-name">שם</label>
              <input id="uv-edit-name" required minLength={2} maxLength={100} value={draftName} onChange={e => setDraftName(e.target.value)} />
              <label htmlFor="uv-edit-email">אימייל</label>
              <input id="uv-edit-email" type="email" required maxLength={254} value={draftEmail} onChange={e => setDraftEmail(e.target.value)} />
              <div className="uv-users-actions">
                <button type="submit" disabled={busyId !== null}>שמירת שינויים</button>
                <button type="button" className="uv-users-cancel" onClick={() => setEditingId(null)}>ביטול</button>
              </div>
            </form>
          </section>
        )}
      </section>
    </main>
  );
}

export default AdminUsers;
