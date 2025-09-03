// src/components/campingCard/CampingCard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./campingCard.module.css";
import GlowCard from "../GlowCard/GlowCard";
import FavoriteButton from "../favoritebutton/FavoriteButton";

const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || "http://localhost:5000";
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80";

function normalizeImagePathFromDB(raw, folder = "camping") {
  if (!raw) return "";
  let first = String(raw).split(",")[0].trim();
  if (!first) return "";

  // URL מלא / data-uri
  if (/^https?:\/\//i.test(first) || first.startsWith("data:")) return first;

  // לתקן backslashes
  first = first.replace(/\\/g, "/");

  // לחתוך מהמילה uploads אם יש (גם בתוך C:/.../uploads/...)
  const lower = first.toLowerCase();
  let idx = lower.indexOf("/uploads/");
  if (idx === -1) {
    idx = lower.indexOf("uploads/");
    if (idx !== -1) first = "/" + first.slice(idx);
  } else {
    first = first.slice(idx); // מתחיל ב-/uploads/...
  }

  // להרכיב URL תקין (בלי להכפיל /uploads)
  if (first.startsWith("/uploads/")) return `${API_ORIGIN}${first}`;
  if (first.startsWith("uploads/")) return `${API_ORIGIN}/${first}`;

  // שם קובץ בלבד
  return `${API_ORIGIN}/uploads/${folder}/${first}`;
}

const CampingCard = ({
  camping_id,
  _id,
  camping_location_name,
  camping_img,
  images, // אם רשימת ה-API כבר מספקת images, נעדיף images[0]
  is_featured,
  region,
}) => {
  const id = _id || camping_id;

  const [imageError, setImageError] = useState(false);

  // נעדיף images[0] אם קיים, אחרת camping_img
  const rawImage = useMemo(() => {
    if (Array.isArray(images) && images.length) return images[0];
    return camping_img || "";
  }, [images, camping_img]);

  // נבנה URL סופי, ננקה כפילויות סלאשים, ונקודד תווים בעייתיים
  const imageUrl = useMemo(() => {
    if (imageError) return PLACEHOLDER;
    if (!rawImage) return PLACEHOLDER;

    const url = normalizeImagePathFromDB(rawImage, "camping");
    const noDoubleSlashes = url.replace(/([^:]\/)\/+/g, "$1");
    return encodeURI(noDoubleSlashes);
  }, [rawImage, imageError]);

  const handleImageError = () => setImageError(true);

  const encodedName = encodeURIComponent(camping_location_name || "");

  // 🔎 דיבוג: תראי ב-Console מה ה-URL שהכרטיס מנסה לטעון
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.warn("CAMPING CARD IMG DEBUG:", {
      name: camping_location_name,
      rawImage,
      finalSrc: imageUrl,
    });
  }, [camping_location_name, rawImage, imageUrl]);

  return (
    <div className={styles.cardContainer}>
      <Link to={`/camping-detail/${encodedName}`} className={styles.cardLink}>
        <GlowCard>
          {is_featured && <span className={styles.badge}>מומלץ</span>}
          <div className={styles.imageContainer}>
            <img
              src={imageUrl}
              alt={camping_location_name}
              className={styles.image}
              onError={handleImageError}
              loading="lazy"
            />
            <div className={styles.imageOverlay}></div>
          </div>
          <div className={styles.nameContainer}>
            <h3 className={styles.title}>{camping_location_name}</h3>
            {region && <p className={styles.location}>{region}</p>}
          </div>
        </GlowCard>
      </Link>
      <div
        className={styles.favoriteButtonContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <FavoriteButton
          contentType="camping"
          contentId={camping_location_name}
        />
      </div>
    </div>
  );
};

export default CampingCard;
