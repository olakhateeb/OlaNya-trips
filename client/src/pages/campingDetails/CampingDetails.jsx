// CampingDetails.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { getCampingByName } from "../../services/api";
import styles from "./campingDetails.module.css";
import AboutCampingSection from "../../components/AboutCampingSection/AboutCampingSection";
import Reviews from "../../components/reviews/Reviews";

const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || "http://localhost:5000";

function normalizeImagePathFromDB(raw, folder = "camping") {
  if (!raw) return "";
  // רק הראשונה אם יש פסיקים
  let first = String(raw).split(",")[0].trim();
  if (!first) return "";

  // כבר URL מלא / data-uri
  if (/^https?:\/\//i.test(first) || first.startsWith("data:")) return first;

  // תיקון backslashes (Windows)
  first = first.replace(/\\/g, "/");

  // חתך מ-"uploads" אם קיים (גם בתוך נתיב מלא כמו C:/.../uploads/...)
  const lower = first.toLowerCase();
  let idx = lower.indexOf("/uploads/");
  if (idx === -1) {
    idx = lower.indexOf("uploads/");
    if (idx !== -1) first = "/" + first.slice(idx);
  } else {
    first = first.slice(idx); // מתחיל עכשיו ב-/uploads/...
  }

  // אם יש /uploads/... → הוסף דומיין
  if (first.startsWith("/uploads/")) return `${API_ORIGIN}${first}`;
  if (first.startsWith("uploads/")) return `${API_ORIGIN}/${first}`;

  // שם קובץ בלבד
  return `${API_ORIGIN}/uploads/${folder}/${first}`;
}

/** ✅ מנרמל אובייקט לקומפוננטה AboutCampingSection (תמיד יהיה שדה images) */
function normalizeCamping(raw) {
  if (!raw) return null;

  const imgs = Array.isArray(raw.camping_img)
    ? raw.camping_img
    : raw.camping_img
    ? raw.camping_img.split(",").map((s) => s.trim())
    : [];

  const images = imgs.map((img) => normalizeImagePathFromDB(img, "camping"));

  return {
    ...raw,
    images, // AboutCampingSection מצפה לשדה זה
  };
}

const CampingDetails = () => {
  const { camping_location_name } = useParams();
  const [camping, setCamping] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ זיהוי משתמש/הרשאות לאזור הביקורות
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const currentUser = user?.userName || user?.username || user?.email || null;
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  // ✅ מזהה הישות לביקורות: עדיפות למזהה מספרי, נפילה לשם אם אין
  const entityId =
    (camping && (camping.camping_id || camping.id)) || camping_location_name;

  useEffect(() => {
    const fetchCamping = async () => {
      try {
        setIsLoading(true);
        const data = await getCampingByName(camping_location_name);
        setCamping(normalizeCamping(data));
      } catch (error) {
        console.error("Error fetching camping details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCamping();
  }, [camping_location_name]);

  if (isLoading)
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>טוען פרטי קמפינג...</p>
      </div>
    );

  if (!camping)
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <p>לא נמצאו פרטי קמפינג</p>
      </div>
    );

  // 🔎 שאילתת מפה: שם + מיקום/כתובת אם קיימים (נופל לישראל כברירת מחדל)
  const mapQuery = encodeURIComponent(
    `${camping?.camping_location_name || ""} ${
      camping?.camping_location || camping?.location || "ישראל"
    }`
  );

  return (
    <div className={styles.fullWidthPageContainer}>
      <AboutCampingSection camping={camping} />

      {/* 🗺️ כרטיס מפה קטן ומעוצב */}
      <section className={styles.mapCard}>
        <div className={styles.mapCardHeader}>
          <h2 className={styles.mapTitle}>מיקום על המפה</h2>
        </div>
        <div className={styles.mapCardBody}>
          <div className={styles.mapContainer}>
            <div className={styles.mapSquareWrapper}>
              <iframe
                className={styles.map}
                title="מפת קמפינג"
                src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                allowFullScreen
              />
            </div>
            {/* לינק ניווט בגוגל מפות (אופציונלי) */}
            <a
              className={styles.mapLink}
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
            >
              פתיחה בניווט
            </a>
          </div>
        </div>
      </section>

      {/* ✅ ביקורות לקמפינג */}
      <div className={styles.reviewsBlock}>
        <Reviews
          entityType="camping"
          entityId={camping?.camping_location_name || entityId}
          canWrite={!!currentUser}
          currentUser={currentUser}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
};

export default CampingDetails;
