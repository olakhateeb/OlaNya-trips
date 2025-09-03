// src/components/tripsCard/TripsCard.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./tripsCard.module.css";
import GlowCard from "../GlowCard/GlowCard";
import FavoriteButton from "../favoritebutton/FavoriteButton";

// ✅ דומיין ה-API (להגדיר ב-.env של הפרונט אם צריך)
const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || "http://localhost:5000";
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80";

/** ✅ ממיר ערך מה-DB (שם קובץ / /uploads/... / URL מלא) לכתובת תמונה תקינה עם דומיין */
function normalizeImagePathFromDB(raw, folder = "trips") {
  if (!raw) return "";
  // תמיכה במקרים של ריבוי תמונות מופרדות בפסיק
  const first = String(raw).split(",")[0].trim();

  // כבר URL מלא או data-uri
  if (/^https?:\/\//i.test(first) || first.startsWith("data:")) return first;

  // אם הערך כבר מתחיל ב-/uploads/ → נוסיף דומיין
  if (first.startsWith("/uploads/")) return `${API_ORIGIN}${first}`;

  // אם זה רק שם קובץ → נרכיב נתיב מלא לתיקיית הטיולים
  return `${API_ORIGIN}/uploads/${folder}/${first.replace(
    /^uploads\/[^/]+\//,
    ""
  )}`;
}

const TripsCard = ({
  _id,
  trip_id,
  trip_name,
  trip_img,
  created_at,
  location,
}) => {
  const id = _id || trip_id;
  const [imageError, setImageError] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch {}
    }
  }, []);

  const isNew = () => {
    if (!created_at) return false;
    const createdDate = new Date(created_at);
    const diffDays = Math.ceil(Math.abs(Date.now() - createdDate) / 86400000);
    return diffDays <= 7;
  };

  const imgSrc = imageError
    ? PLACEHOLDER
    : trip_img
    ? normalizeImagePathFromDB(trip_img, "trips")
    : PLACEHOLDER;

  return (
    <div className={styles.cardContainer}>
      <Link to={`/trip/${id}`} className={styles.cardLink}>
        <GlowCard>
          {isNew() && <span className={styles.badge}>חדש</span>}
          <div className={styles.imageContainer}>
            <img
              src={imgSrc}
              alt={trip_name}
              className={styles.image}
              onError={() => setImageError(true)}
              loading="lazy"
            />
            <div className={styles.imageOverlay}></div>
          </div>
          <div className={styles.nameContainer}>
            <h3 className={styles.title}>{trip_name}</h3>
            {location && <p className={styles.location}>{location}</p>}
          </div>
        </GlowCard>
      </Link>
      <div
        className={styles.favoriteButtonContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <FavoriteButton contentType="trip" contentId={id} />
      </div>
    </div>
  );
};

export default TripsCard;
