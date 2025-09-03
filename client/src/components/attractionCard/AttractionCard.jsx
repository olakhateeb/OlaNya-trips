// src/components/attractionCard/AttractionCard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./attractionCard.module.css";
import GlowCard from "../../components/GlowCard/GlowCard";
import FavoriteButton from "../favoritebutton/FavoriteButton";

/* ==== Helpers (inline) ==== */
const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || "http://localhost:5000";
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80";

/** נרמול חסין: URL מלא / data-uri / backslashes / "uploads" כפול / שם קובץ בלבד */
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

/** ניקוי // כפולים + קידוד בטוח ל־URL */
function safeUrl(u) {
  const noDoubleSlashes = String(u || "").replace(/([^:]\/)\/+/g, "$1");
  return encodeURI(noDoubleSlashes);
}

const AttractionCard = ({
  attraction_id,
  attraction_name,
  attraction_img,
  is_popular,
  _id,
  location,
  images, // אם ה־API מספק מערך תמונות
}) => {
  const id = attraction_id || _id;

  const [user, setUser] = useState(null);
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  // נעדיף images[0] אם קיים; אחרת attraction_img (raw)
  const rawImage = useMemo(() => {
    if (Array.isArray(images) && images.length) return images[0];
    return attraction_img || "";
  }, [images, attraction_img]);

  // נרמול חסין לכתובת הסופית
  const processedImageUrl = useMemo(() => {
    if (!rawImage) return PLACEHOLDER;
    return safeUrl(normalizeImagePathFromDB(rawImage, "attractions"));
  }, [rawImage]);

  if (!id) {
    console.warn("AttractionCard missing ID for navigation:", {
      attraction_name,
      attraction_img,
    });
  }

  return (
    <div className={styles.cardContainer}>
      <Link to={`/attraction/${id}`} className={styles.cardLink}>
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
            <div className={styles.imageOverlay}></div>
          </div>
          <div className={styles.nameContainer}>
            <h3 className={styles.title}>{attraction_name}</h3>
            {location && <p className={styles.location}>{location}</p>}
          </div>
        </GlowCard>
      </Link>
      <div
        className={styles.favoriteButtonContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <FavoriteButton contentType="attraction" contentId={id} />
      </div>
    </div>
  );
};

export default AttractionCard;
