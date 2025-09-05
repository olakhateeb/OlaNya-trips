// export default CampingCard;
// src/components/campingCard/CampingCard.jsx
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./campingCard.module.css";
import GlowCard from "../GlowCard/GlowCard";
import FavoriteButton from "../favoritebutton/FavoriteButton";

const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || "http://localhost:5000";
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80";

/* ========= Helpers ========= */
function firstToken(val = "") {
  return (
    String(val || "")
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)[0] || ""
  );
}
function extractUploadsPath(s = "") {
  const fixed = String(s).replace(/\\/g, "/");
  if (/^https?:\/\//i.test(fixed)) {
    try {
      const u = new URL(fixed);
      const p = u.pathname;
      if (/\/uploads\//i.test(p)) return p;
    } catch {}
  }
  const m = fixed.match(/\/?uploads\/.+$/i);
  if (m) return m[0].startsWith("/") ? m[0] : `/${m[0]}`;
  return "";
}
function normalizeImagePathFromDB(raw, folder = "camping") {
  if (!raw) return "";
  let first = firstToken(raw);
  if (!first) return "";
  if (first.startsWith("data:")) return first;

  const uploadsPath = extractUploadsPath(first);
  if (uploadsPath) {
    return `${API_ORIGIN}${uploadsPath}`.replace(/([^:]\/)\/+/g, "$1");
  }
  if (/^https?:\/\//i.test(first)) return first;
  first = first.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${API_ORIGIN}/uploads/${folder}/${first}`.replace(
    /([^:]\/)\/+/g,
    "$1"
  );
}

export default function CampingCard(props) {
  const src = props?.spot || props?.item || props?.data || props || {};
  const {
    camping_location_name,
    camping_img,
    images,
    is_featured,
    region,
    is_recommended,
  } = src;

  const isAdmin = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return String(u?.role || "").toLowerCase() === "admin";
    } catch {
      return false;
    }
  }, []);

  const [imageError, setImageError] = useState(false);

  const rawImage = useMemo(() => {
    if (Array.isArray(images) && images.length) return images[0];
    return camping_img || "";
  }, [images, camping_img]);

  const imageUrl = useMemo(() => {
    if (imageError) return PLACEHOLDER;
    if (!rawImage) return PLACEHOLDER;
    const url = normalizeImagePathFromDB(rawImage, "camping");
    const noDoubleSlashes = url.replace(/([^:]\/)\/+/g, "$1");
    return encodeURI(noDoubleSlashes);
  }, [rawImage, imageError]);

  const encodedName = encodeURIComponent(camping_location_name || "");
  const linkTarget = `/camping-detail/${encodedName}`;

  return (
    <div className={styles.cardContainer}>
      <Link to={linkTarget} className={styles.cardLink}>
        <GlowCard>
          {is_featured && <span className={styles.badge}>מומלץ</span>}
          <div
            className={styles.imageContainer}
            style={{ position: "relative" }}
          >
            <img
              src={imageUrl}
              alt={camping_location_name}
              className={styles.image}
              onError={() => setImageError(true)}
              loading="lazy"
            />

            {/* כפתור מועדפים/המלצות — שולחים את ה-שם כמזהה */}
            {camping_location_name && (
              <div
                className={styles.topRight || ""}
                style={{
                  position: "absolute",
                  top: ".5rem",
                  right: ".5rem",
                  zIndex: 5,
                  pointerEvents: "auto",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <FavoriteButton
                  itemType="camping"
                  itemId={camping_location_name} // <<— מזהה מחרוזתי
                  adminMode={isAdmin}
                  initialRecommended={Boolean(is_recommended)}
                />
              </div>
            )}

            <div
              className={styles.imageOverlay}
              style={{ pointerEvents: "none", zIndex: 1 }}
            />
          </div>

          <div className={styles.nameContainer}>
            <h3 className={styles.title}>{camping_location_name}</h3>
            {region && <p className={styles.location}>{region}</p>}
          </div>
        </GlowCard>
      </Link>
    </div>
  );
}
