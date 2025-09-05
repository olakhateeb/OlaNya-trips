import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./attractionCard.module.css";
import GlowCard from "../../components/GlowCard/GlowCard";
import FavoriteButton from "../../components/favoritebutton/FavoriteButton";

/* ==== Helpers ==== */
const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || "http://localhost:5000";
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80";

function normalizeImagePathFromDB(raw, folder = "attractions") {
  if (!raw) return "";
  let first = String(raw).split(",")[0].trim();
  if (!first) return "";
  if (/^https?:\/\//i.test(first) || first.startsWith("data:")) return first;
  first = first.replace(/\\/g, "/");
  const lower = first.toLowerCase();
  let idx = lower.indexOf("/uploads/");
  if (idx === -1) {
    idx = lower.indexOf("uploads/");
    if (idx !== -1) first = "/" + first.slice(idx);
  } else {
    first = first.slice(idx);
  }
  if (first.startsWith("/uploads/")) return `${API_ORIGIN}${first}`;
  if (first.startsWith("uploads/")) return `${API_ORIGIN}/${first}`;
  return `${API_ORIGIN}/uploads/${folder}/${first}`;
}
const safeUrl = (u) => encodeURI(String(u || "").replace(/([^:]\/)\/+/g, "$1"));

const AttractionCard = (props) => {
  // ✅ קורא את הפריט מה־prop הנכון שקיבלת מה־Home
  const src = props?.attraction || props?.item || props?.data || props || {};

  const {
    id, // לפעמים קיים
    attraction_id, // ה-ID המספרי הסטנדרטי
    _id, // מונגו – לשימוש לניווט בלבד אם צריך
    attraction_name,
    attraction_img,
    is_popular,
    location,
    images,
    is_recommended,
  } = src;

  /** מזהה מספרי תקין לכפתור מועדפים/אדמין */
  const numericId = useMemo(() => {
    const n = Number(attraction_id ?? id);
    return Number.isFinite(n) && n > 0 ? n : NaN;
  }, [attraction_id, id]);

  /** לניווט נשתמש במה שיש; עדיפות למזהה המספרי */
  const linkId = attraction_id ?? id ?? _id;

  const [user, setUser] = useState(null);
  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) setUser(JSON.parse(u));
    } catch {}
  }, []);
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const rawImage = useMemo(() => {
    if (Array.isArray(images) && images.length) return images[0];
    return attraction_img || "";
  }, [images, attraction_img]);

  const processedImageUrl = useMemo(() => {
    if (!rawImage) return PLACEHOLDER;
    return safeUrl(normalizeImagePathFromDB(rawImage, "attractions"));
  }, [rawImage]);

  return (
    <div className={styles.cardContainer} style={{ position: "relative" }}>
      <Link
        to={linkId ? `/attractions/${linkId}` : "#"}
        className={styles.cardLink}
        onClick={(e) => {
          if (!linkId) {
            e.preventDefault();
            console.warn("AttractionCard: missing linkId", {
              attraction_id,
              id,
              _id,
              src,
            });
          }
        }}
      >
        <GlowCard>
          {is_popular && <span className={styles.badge}>פופולרי</span>}
          <div className={styles.imageContainer}>
            <img
              src={processedImageUrl}
              alt={attraction_name}
              className={styles.image}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = PLACEHOLDER;
              }}
              loading="lazy"
            />
            <div className={styles.imageOverlay} />
          </div>
          <div className={styles.nameContainer}>
            <h3 className={styles.title}>{attraction_name}</h3>
            {location && <p className={styles.location}>{location}</p>}
          </div>
        </GlowCard>
      </Link>

      {Number.isFinite(numericId) && (
        <div
          style={{
            position: "absolute",
            top: ".5rem",
            right: ".5rem",
            zIndex: 50,
            pointerEvents: "auto",
          }}
        >
          <FavoriteButton
            itemType="attraction"
            itemId={numericId}
            adminMode={isAdmin}
            initialRecommended={Boolean(is_recommended)}
          />
        </div>
      )}
    </div>
  );
};

export default AttractionCard;
