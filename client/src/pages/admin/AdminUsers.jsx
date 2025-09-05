// AdminUsers.jsx
import React, { useEffect, useState } from "react";
import { FaEye } from "react-icons/fa";

import {
  getAllUsers,
  getUserDetails,
  updateUserRole,
} from "../../services/api";
import styles from "./adminUsers.module.css";

/* ===== Helpers ===== */
const API_ORIGIN = "http://localhost:5000";

/** נתיב placeholder מהשרת (ודאי שקיים קובץ כזה!) */
const SERVER_PLACEHOLDER = `${API_ORIGIN}/uploads/profileImages/placeholder.jpg`;

const firstFromCsv = (val = "") => {
  const s = String(val || "").trim();
  return s && s.includes(",") ? s.split(",")[0].trim() : s;
};

/**
 * ממיר שם/נתיב לתמונת פרופיל לכתובת מלאה:
 * - אם כבר URL מלא / data-uri -> מחזיר כמו שהוא
 * - אם מתחיל ב-/uploads -> מוסיף דומיין
 * - אחרת מניח שזה קובץ בתוך uploads/profileImages
 */
const normalizeImagePath = (raw) => {
  const first = firstFromCsv(raw);
  if (!first) return "";
  if (/^https?:\/\//i.test(first) || first.startsWith("data:")) return first;
  if (first.startsWith("/uploads/")) return `${API_ORIGIN}${first}`;
  return `${API_ORIGIN}/uploads/profileImages/${first}`;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "מנהל" },
  { value: "traveler", label: "מטייל" },
  { value: "driver", label: "נהג" },
];
const roleLabel = (val) =>
  ROLE_OPTIONS.find((o) => o.value === val)?.label || val || "-";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  // מזהה תצוגה של כרטיס מורחב (מפתח ייחודי לפי שדות שונים)
  const [expandedKey, setExpandedKey] = useState(null);

  const [detailsCache, setDetailsCache] = useState({});
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState({});
  const [saving, setSaving] = useState({});
  const [error, setError] = useState("");

  // טען את כל המשתמשים: getAllUsers() מחזיר מערך מוכן
  const fetchUsers = async () => {
    try {
      setLoadingList(true);
      setError("");
      const list = await getAllUsers(); // <-- חשוב: לא .data!
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("getAllUsers failed:", e?.response?.data || e.message);
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 403
          ? "אין הרשאה (Admin only). ודאי שאת מחוברת כ-Admin."
          : "שגיאה בטעינת משתמשים");
      setError(msg);
      setUsers([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // פתיחה/סגירת כרטיס הפרטים (לוקח rowKey ל-UI ו-idNumber ל-API)
  const handleToggle = async (rowKey, idNumber) => {
    // סגירת כרטיס אם הוא כבר פתוח
    if (expandedKey === rowKey) {
      setExpandedKey(null);
      return;
    }

    // סגירת כל הכרטיסים האחרים לפני פתיחת כרטיס חדש
    setExpandedKey(null);

    // טעינת פרטי המשתמש אם עוד לא נטענו
    if (idNumber && !detailsCache[idNumber]) {
      try {
        setLoadingDetails((m) => ({ ...m, [idNumber]: true }));
        const full = await getUserDetails(idNumber); // אובייקט אחד
        setDetailsCache((m) => ({ ...m, [idNumber]: full || {} }));
      } catch (e) {
        console.error("getUserDetails failed:", e?.response?.data || e.message);
        alert("שגיאה בטעינת פרטי המשתמש");
        return;
      } finally {
        setLoadingDetails((m) => ({ ...m, [idNumber]: false }));
      }
    }

    // פתיחת הכרטיס החדש
    setTimeout(() => {
      setExpandedKey(rowKey);
    }, 50);
  };

  // שינוי תפקיד
  const onChangeRole = async (idNumber, newRole) => {
    setSaving((m) => ({ ...m, [idNumber]: true }));
    try {
      await updateUserRole(idNumber, newRole);
      // עדכון הרשימה
      setUsers((list) =>
        list.map((u) =>
          String(u.idNumber) === String(idNumber) ? { ...u, role: newRole } : u
        )
      );
      // עדכון הפרטים (אם נטענו)
      setDetailsCache((m) =>
        m[idNumber]
          ? { ...m, [idNumber]: { ...m[idNumber], role: newRole } }
          : m
      );
    } catch (e) {
      console.error("updateUserRole failed:", e?.response?.data || e.message);
      alert(e?.response?.data?.message || "עדכון תפקיד נכשל");
    } finally {
      setSaving((m) => ({ ...m, [idNumber]: false }));
    }
  };

  return (
    <div className={styles.adminUsers}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>ניהול משתמשים</h2>
        {loadingList ? (
          <span className={styles.dim}>טוען…</span>
        ) : (
          <span className={styles.dim}>סה״כ: {users.length}</span>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!loadingList && !error && users.length === 0 ? (
        <div className={styles.empty}>אין משתמשים.</div>
      ) : (
        <div className={styles.list}>
          {users.map((u, i) => {
            // ✅ מפתח תצוגה ייחודי תמיד — גם אם idNumber=0/ריק או כפול
            const rowKey = [
              u.idNumber ?? "",
              u.email ?? "",
              u.userName ?? "",
              i, // מבטיח ייחודיות מלאה
            ].join("|");

            const isOpen = expandedKey === rowKey;
            const busy = !!saving[u.idNumber];

            const details = detailsCache[u.idNumber] || {};
            const avatarSrc =
              normalizeImagePath(details.profilePicture ?? u.profilePicture) ||
              SERVER_PLACEHOLDER;

            return (
              <div key={`user-${rowKey}`} className={styles.row}>
                <div className={styles.rowMain}>
                  <div
                    className={styles.userName}
                    title={u.email || ""} // tooltip בלבד
                  >
                    {u.userName || "-"}
                  </div>

                  <button
                    className={styles.viewBtn}
                    onClick={() => handleToggle(rowKey, u.idNumber)}
                    aria-expanded={isOpen}
                    title="עיין"
                  >
                    <FaEye />
                  </button>
                </div>

                {isOpen && (
                  <div className={styles.detailsCard}>
                    <div className={styles.avatar}>
                      <img
                        src={avatarSrc}
                        alt={u.userName}
                        onError={(e) => {
                          if (e.currentTarget.src !== SERVER_PLACEHOLDER) {
                            e.currentTarget.src = SERVER_PLACEHOLDER;
                          }
                        }}
                      />
                    </div>

                    <div className={styles.detailsGrid}>
                      <label>שם</label>
                      <div>{details.userName ?? u.userName ?? "-"}</div>

                      <label>אימייל</label>
                      <div dir="ltr">{details.email ?? u.email ?? "-"}</div>

                      <label>טלפון</label>
                      <div dir="ltr">{details.phone ?? u.phone ?? "-"}</div>

                      <label>ת.ז.</label>
                      <div>{details.idNumber ?? u.idNumber ?? "-"}</div>

                      <label>כתובת</label>
                      <div>{details.address ?? u.address ?? "-"}</div>

                      <label>תפקיד</label>
                      <div className={styles.roleArea}>
                        <strong className={styles.roleText}>
                          {roleLabel(details.role ?? u.role)}
                        </strong>
                        <select
                          className={styles.select}
                          value={details.role ?? u.role ?? "traveler"}
                          disabled={busy}
                          onChange={(e) =>
                            onChangeRole(u.idNumber, e.target.value)
                          }
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {busy && <span className={styles.saving}>שומר…</span>}
                      </div>
                    </div>

                    {loadingDetails[u.idNumber] && (
                      <div className={styles.loadingOverlay}>טוען פרטים…</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
