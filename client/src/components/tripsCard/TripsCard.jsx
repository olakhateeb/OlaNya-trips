// src/components/tripsCard/TripsCard.jsx
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./tripsCard.module.css";
import GlowCard from "../GlowCard/GlowCard";
import FavoriteButton from "../favoritebutton/FavoriteButton";

const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || "http://localhost:5000";
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80";

function normalizeImagePathFromDB(raw, folder = "trips") {
  if (!raw) return "";
  const first = String(raw).split(",")[0].trim();
  if (/^https?:\/\//i.test(first) || first.startsWith("data:")) return first;
  if (first.startsWith("/uploads/")) return `${API_ORIGIN}${first}`;
  return `${API_ORIGIN}/uploads/${folder}/${first.replace(
    /^uploads\/[^/]+\//,
    ""
  )}`;
}

const TripsCard = (props) => {
  const { _id, trip_id, trip_img, created_at, location, is_recommended } =
    props;

  // ---- debug: מה מגיע לכל כרטיס ----
  // הסירי אחרי שמוודאים
  console.debug("TripsCard props:", props);

  // שם עם Fallbacks נפוצים
  const title = useMemo(() => {
    const candidates = [
      props.trip_name,
      props.name,
      props.title,
      props.tripTitle,
    ]
      .map((s) => (s == null ? "" : String(s).trim()))
      .filter(Boolean);
    return candidates[0] || "ללא שם";
  }, [props.trip_name, props.name, props.title, props.tripTitle]);

  // מזהה מספרי אם אפשר
  const numericId = useMemo(() => {
    if (Number.isFinite(Number(trip_id))) return Number(trip_id);
    if (Number.isFinite(Number(_id))) return Number(_id);
    return NaN;
  }, [trip_id, _id]);

  // linkId בטוח לנווט
  const linkId = useMemo(() => {
    const candidates = [trip_id, _id];
    for (const c of candidates) {
      if (c == null) continue;
      const s = String(c).trim();
      if (s && s.toLowerCase() !== "undefined") return s;
    }
    return "";
  }, [trip_id, _id]);
  const hasValidId = linkId.length > 0;

  const isAdmin = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return String(u?.role || "").toLowerCase() === "admin";
    } catch {
      return false;
    }
  }, []);

  const [imageError, setImageError] = useState(false);

  const isNew = () => {
    if (!created_at) return false;
    const createdDate = new Date(created_at);
    const diffDays = Math.ceil(Math.abs(Date.now() - createdDate) / 86400000);
    return diffDays <= 7;
  };

  const imgSrc = imageError
    ? PLACEHOLDER
    : props.trip_img
    ? normalizeImagePathFromDB(trip_img, "trips")
    : PLACEHOLDER;

  const CardWrapper = ({ children }) =>
    hasValidId ? (
      <Link to={`/trip/${linkId}`} className={styles.cardLink}>
        {children}
      </Link>
    ) : (
      <div
        className={styles.cardLink}
        onClick={(e) => e.preventDefault()}
        title="חסר מזהה טיול"
        style={{ cursor: "not-allowed", opacity: 0.6 }}
      >
        {children}
      </div>
    );

  return (
    <div className={styles.cardContainer}>
      <CardWrapper>
        <GlowCard>
          {isNew() && <span className={styles.badge}>חדש</span>}
          <div
            className={styles.imageContainer}
            style={{ position: "relative" }}
          >
            <img
              src={imgSrc}
              alt={title}
              className={styles.image}
              onError={() => setImageError(true)}
              loading="lazy"
            />
            <div
              className={styles.topRight || ""}
              style={{
                position: "absolute",
                top: ".5rem",
                right: ".5rem",
                zIndex: 2,
              }}
              onClick={(e) => e.preventDefault()}
            >
              <FavoriteButton
                itemType="trip"
                itemId={Number.isFinite(numericId) ? numericId : null}
                adminMode={isAdmin}
                initialRecommended={Boolean(is_recommended)}
              />
            </div>
            <div className={styles.imageOverlay}></div>
          </div>

          <div className={styles.nameContainer}>
            <h3 className={styles.title}>{title}</h3>
            {location && <p className={styles.location}>{location}</p>}
          </div>
        </GlowCard>
      </CardWrapper>
    </div>
  );
};

export default TripsCard;
