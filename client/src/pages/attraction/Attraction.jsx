// src/pages/attraction/Attractions.jsx
import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "../../services/api";
import AttractionCard from "../../components/attractionCard/AttractionCard";
import styles from "./attraction.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCompass,
  faMapMarkedAlt,
  faTicketAlt,
  faStar,
  faWater,
  faTree,
  faLandmark,
  faCity,
  faHiking,
  faUmbrellaBeach,
} from "@fortawesome/free-solid-svg-icons";

/* ==== Helpers (inline) ==== */
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

function safeUrl(u) {
  const noDoubleSlashes = String(u || "").replace(/([^:]\/)\/+/g, "$1");
  return encodeURI(noDoubleSlashes);
}

const Attractions = () => {
  const [attractions, setAttractions] = useState([]);
  const [attractionsByType, setAttractionsByType] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeType, setActiveType] = useState("all");

  useEffect(() => {
    const fetchAttractions = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/attractions");

        const data = (response.data || []).map((attr) => ({
          ...attr,
          attraction_img: attr.attraction_img || "",
          images: Array.isArray(attr.images) ? attr.images : null,
          is_popular: !!attr.is_popular,
        }));

        const groupedByType = data.reduce((acc, attraction) => {
          const type = (attraction.attraction_type || "other").trim();
          if (!acc[type]) acc[type] = [];
          acc[type].push(attraction);
          return acc;
        }, {});

        setAttractions(data);
        setAttractionsByType(groupedByType);
        setError(null);
      } catch (err) {
        console.error("Error loading attractions:", err);
        setError("Failed to load attractions");
      } finally {
        setLoading(false);
      }
    };

    fetchAttractions();
  }, []);

  const attractionTypes = useMemo(
    () => Object.keys(attractionsByType).sort(),
    [attractionsByType]
  );

  const getDisplayedAttractions = () => {
    if (activeType === "all") {
      return attractions;
    }
    return attractionsByType[activeType] || [];
  };

  if (loading) return <div className={styles.loading}>טוען...</div>;

  return (
    <div className={styles.attractionsPage}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>גלו אטרקציות מרהיבות</h1>
          <p>ממקומות שקטים ועד הרפתקאות אדרנלין - יש לנו הכל בשבילכם</p>

          <div className={styles.heroFeatures}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <FontAwesomeIcon icon={faMapMarkedAlt} />
              </div>
              <div className={styles.featureText}>
                <h3>מיקומים מובחרים</h3>
                <p>אטרקציות במיקומים מובחרים בכל רחבי הארץ</p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <FontAwesomeIcon icon={faTicketAlt} />
              </div>
              <div className={styles.featureText}>
                <h3>הזמנה מראש</h3>
                <p>הזמנת כרטיסים בקלות ובמחירים אטרקטיביים</p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <FontAwesomeIcon icon={faStar} />
              </div>
              <div className={styles.featureText}>
                <h3>חוויות מובטחות</h3>
                <p>חוויות בלתי נשכחות לכל המשפחה</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.decorShape1}></div>
        <div className={styles.decorShape2}></div>

        {/* תמונות טרייל — נרמול עדין כדי לא להתרסק אם מגיע raw */}
        <div className={styles.trailWrapper}>
          <div className={styles.featuredBadge}>אטרקציות מומלצות</div>
          <div className={styles.imageTrail}>
            {attractions.slice(0, 5).map((attraction, index) => {
              const defaultImages = [
                "http://localhost:5000/uploads/attractions/img-attraction06.jpg",
                "http://localhost:5000/uploads/attractions/img-attraction09.jpg",
                "http://localhost:5000/uploads/attractions/img-attraction03.jpg",
                "http://localhost:5000/uploads/attractions/img-attraction04.jpg",
                "http://localhost:5000/uploads/attractions/img-attraction17.jpg",
              ];

              const raw =
                (Array.isArray(attraction.images) && attraction.images[0]) ||
                attraction.attraction_img ||
                "";

              const src = raw
                ? safeUrl(normalizeImagePathFromDB(raw, "attractions"))
                : defaultImages[index] || PLACEHOLDER;

              return (
                <div
                  key={index}
                  className={styles.trailImage}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <img
                    src={src}
                    alt={attraction.attraction_name || "אטרקציה"}
                  />
                  <div className={styles.imageOverlay}>
                    <span className={styles.imageName}>
                      {attraction.attraction_name || ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.trailControls}>
            <div className={styles.trailDots}>
              {[...Array(Math.min(5, attractions.length))].map((_, index) => (
                <span key={index} className={styles.dot}></span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.gridContainer}>
        {error && <div className={styles.error}>{error}</div>}

        {attractions.length > 0 ? (
          <>
            <div className={styles.filterTabsContainer}>
              <h2 className={styles.filterTitle}>סנן לפי קטגוריה</h2>
              <div className={styles.filterTabs}>
                <button
                  className={`${styles.filterTab} ${
                    activeType === "all" ? styles.active : ""
                  }`}
                  onClick={() => setActiveType("all")}
                >
                  <div className={styles.filterIconWrapper}>
                    <FontAwesomeIcon
                      icon={faCompass}
                      className={styles.filterIcon}
                    />
                  </div>
                  <span className={styles.filterLabel}>כל האטרקציות</span>
                </button>

                {attractionTypes
                  .filter((type) => type !== "other")
                  .map((type, index) => {
                    let icon = faCompass;
                    switch (String(type).toLowerCase()) {
                      case "טבע":
                        icon = faTree;
                        break;
                      case "מים":
                        icon = faWater;
                        break;
                      case "טבע ומים":
                        icon = faUmbrellaBeach;
                        break;
                      case "אתרים ארכיאולוגיים":
                        icon = faLandmark;
                        break;
                      case "מסלולים בעיר":
                        icon = faCity;
                        break;
                      case "הרפתקאות":
                        icon = faHiking;
                        break;
                      default:
                        icon = faCompass;
                    }
                    return (
                      <button
                        key={index}
                        className={`${styles.filterTab} ${
                          activeType === type ? styles.active : ""
                        }`}
                        onClick={() => setActiveType(type)}
                      >
                        <div className={styles.filterIconWrapper}>
                          <FontAwesomeIcon
                            icon={icon}
                            className={styles.filterIcon}
                          />
                        </div>
                        <span className={styles.filterLabel}>{type}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className={styles.grid}>
              {getDisplayedAttractions().map((attr, i) => (
                <div
                  className={styles.cardWrapper}
                  key={attr.attraction_id || attr._id || `attr-${i}`}
                >
                  <AttractionCard
                    attraction_id={attr.attraction_id}
                    _id={attr._id}
                    attraction_name={attr.attraction_name}
                    attraction_img={attr.attraction_img} // raw
                    images={attr.images} // אם קיים
                    is_popular={attr.is_popular}
                    location={attr.attraction_location}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.empty}>אין אטרקציות להצגה כרגע</div>
        )}
      </div>
    </div>
  );
};

export default Attractions;
