// src/pages/attractionDetails/AttractionDetails.jsx
import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getAttractionById } from "../../services/api";
import styles from "./attractionDetails.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBicycle,
  faWater,
  faLeaf,
  faChild,
  faTree,
  faCampground,
  faUtensils,
  faFire,
  faBaby,
  faWheelchair,
  faDog,
  faHiking,
  faHeart,
  faSun,
  faMapSigns,
  faParking,
  faSubway,
  faRoute,
  faArrowLeft,
  faLocationDot,
  faMapMarkerAlt,
  faInfoCircle,
  faClock,
  faMoneyBillWave,
} from "@fortawesome/free-solid-svg-icons";
import Reviews from "../../components/reviews/Reviews";

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

const AttractionDetails = () => {
  const { id } = useParams();
  console.log("AttractionDetails useParams id =", id);

  const [attraction, setAttraction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // 🧑‍💻 משתמש מחובר + בדיקת אדמין
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const currentUser = user?.userName || user?.username || user?.email || null;
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  // טעינת מידע מהשרת (כולל הגנה על id חסר)
  useEffect(() => {
    if (!id) {
      setError("אטרקציה לא נמצאה");
      setLoading(false);
      return;
    }

    const fetchAttraction = async () => {
      try {
        setLoading(true);
        const data = await getAttractionById(id);
        setAttraction(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching attraction details:", err);
        setError("לא ניתן לטעון את פרטי האטרקציה. נסו שוב מאוחר יותר.");
      } finally {
        setLoading(false);
      }
    };

    fetchAttraction();
  }, [id]);

  /* ============================
     בניית מערך תמונות באופן חסין
  ============================ */
  const allImages = useMemo(() => {
    const imgsFromArray =
      Array.isArray(attraction?.images) && attraction.images.length
        ? attraction.images
        : null;

    const imgsFromCsv = !imgsFromArray
      ? String(attraction?.attraction_img || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const rawArr = imgsFromArray || imgsFromCsv || [];

    const normalized = rawArr
      .map((img) => normalizeImagePathFromDB(img, "attractions"))
      .map((u) => safeUrl(u))
      .filter(Boolean);

    return normalized.length ? normalized : [PLACEHOLDER];
  }, [attraction]);

  // דאגה שהאינדקס תמיד בטווח
  const safeIndex =
    activeImageIndex < 0 || activeImageIndex >= allImages.length
      ? 0
      : activeImageIndex;

  const mainImage = allImages[safeIndex] || PLACEHOLDER;

  // מצבים מוקדמים
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>טוען פרטי אטרקציה...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>!</div>
        <h2>שגיאה</h2>
        <p>{error}</p>
        <button
          onClick={() => window.history.back()}
          className={styles.backButton}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> חזרה לאטרקציות
        </button>
      </div>
    );
  }

  if (!attraction) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>?</div>
        <h2>אטרקציה לא נמצאה</h2>
        <p>לא הצלחנו למצוא את האטרקציה המבוקשת</p>
        <button
          onClick={() => window.history.back()}
          className={styles.backButton}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> חזרה לאטרקציות
        </button>
      </div>
    );
  }

  // Sample data for the attraction details
  const features = [
    { icon: faTree, text: "שטחים ירוקים" },
    { icon: faWater, text: "אגם" },
    { icon: faBicycle, text: "שבילי אופניים" },
    { icon: faChild, text: "מתקני משחקים" },
    { icon: faUtensils, text: "מסעדות" },
    { icon: faCampground, text: "פיקניק" },
    { icon: faLeaf, text: "גני פרחים" },
    { icon: faHiking, text: "מסלולי הליכה" },
  ];

  const importantInfo = [
    { icon: faClock, text: "פתוח 24/7", isAvailable: true },
    { icon: faMoneyBillWave, text: "כניסה חופשית", isAvailable: true },
    { icon: faParking, text: "חניה זמינה", isAvailable: true },
    { icon: faWheelchair, text: "נגישות לנכים", isAvailable: true },
    { icon: faDog, text: "מותר להביא כלבים", isAvailable: true },
    { icon: faUtensils, text: "מזנונים", isAvailable: true },
    { icon: faFire, text: "מנגל מותר באזורים מסוימים", isAvailable: true },
    { icon: faBaby, text: "שירותי החתלה", isAvailable: false },
  ];

  const gettingThere = [
    { icon: faSubway, text: "תחנת רכבת אוניברסיטה במרחק הליכה" },
    { icon: faParking, text: "חניונים זמינים בכניסות הראשיות לפארק" },
    { icon: faRoute, text: "ניתן להגיע דרך שביל האופניים לאורך הירקון" },
  ];

  return (
    <div className={styles.detailsPage}>
      {/* Hero Header */}
      <div
        className={styles.detailsHeader}
        style={{ backgroundImage: `url(${mainImage})` }}
      >
        <div className={styles.headerOverlay}></div>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{attraction.attraction_name}</h1>
          <div className={styles.subtitle}>
            <FontAwesomeIcon
              icon={faLocationDot}
              className={styles.subtitleIcon}
            />
            {attraction.attraction_location || "ישראל"}
          </div>
          <div className={styles.attractionType}>
            <span className={styles.typeTag}>{attraction.attraction_type}</span>
          </div>
        </div>
        <div className={styles.decorShape1}></div>
        <div className={styles.decorShape2}></div>
      </div>

      {/* Main Content */}
      <div className={styles.contentContainer}>
        {/* Left Column - Gallery and Description */}
        <div className={styles.mainColumn}>
          {/* Image Gallery */}
          <div className={styles.galleryCard}>
            <div className={styles.mainImageContainer}>
              <img
                src={mainImage}
                alt={attraction.attraction_name}
                className={styles.mainImage}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = PLACEHOLDER;
                }}
              />
            </div>
            <div className={styles.thumbnailsContainer}>
              {allImages.map((image, index) => (
                <div
                  key={index}
                  className={`${styles.thumbnail} ${
                    index === safeIndex ? styles.activeThumbnail : ""
                  }`}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <img
                    src={image}
                    alt={`תמונה ${index + 1}`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = PLACEHOLDER;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Description Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <FontAwesomeIcon
                icon={faInfoCircle}
                className={styles.titleIcon}
              />
              אודות המקום
            </h2>
            <div className={styles.cardContent}>
              <p className={styles.description}>
                {attraction.attraction_description}
              </p>
            </div>
          </div>

          {/* Features Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <FontAwesomeIcon icon={faMapSigns} className={styles.titleIcon} />
              מה תמצאו במקום?
            </h2>
            <div className={styles.cardContent}>
              <div className={styles.featuresGrid}>
                {features.map((feature, index) => (
                  <div key={index} className={styles.featureItem}>
                    <div className={styles.featureIconWrapper}>
                      <FontAwesomeIcon
                        icon={feature.icon}
                        className={styles.featureIcon}
                      />
                    </div>
                    <span className={styles.featureText}>{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Side Column - Info Cards */}
        <div className={styles.sideColumn}>
          {/* Map Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <FontAwesomeIcon
                icon={faMapMarkerAlt}
                className={styles.titleIcon}
              />
              מיקום
            </h2>
            <div className={styles.cardContent}>
              <div className={styles.mapContainer}>
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    (attraction.attraction_name || "") +
                      " " +
                      (attraction.attraction_location || "ישראל")
                  )}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  className={styles.map}
                  title="מפה"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>

          {/* Important Info Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <FontAwesomeIcon
                icon={faInfoCircle}
                className={styles.titleIcon}
              />
              מידע שימושי
            </h2>
            <div className={styles.cardContent}>
              <div className={styles.infoGrid}>
                {importantInfo.map((info, index) => (
                  <div
                    key={index}
                    className={`${styles.infoItem} ${
                      info.isAvailable ? styles.available : styles.unavailable
                    }`}
                  >
                    <div className={styles.infoIconWrapper}>
                      <FontAwesomeIcon
                        icon={info.icon}
                        className={styles.infoIcon}
                      />
                    </div>
                    <span className={styles.infoText}>{info.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Getting There Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <FontAwesomeIcon icon={faRoute} className={styles.titleIcon} />
              איך מגיעים?
            </h2>
            <div className={styles.cardContent}>
              <div className={styles.directionsList}>
                {gettingThere.map((item, index) => (
                  <div key={index} className={styles.directionItem}>
                    <div className={styles.directionIconWrapper}>
                      <FontAwesomeIcon
                        icon={item.icon}
                        className={styles.directionIcon}
                      />
                    </div>
                    <span className={styles.directionText}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔽 ביקורות */}
      <Reviews
        entityType="attraction"
        entityId={attraction.attraction_id || attraction._id || id}
        canWrite={!!user}
        currentUser={currentUser}
        isAdmin={isAdmin}
      />

      {/* Back Button */}
      <div className={styles.backButtonContainer}>
        <button
          onClick={() => window.history.back()}
          className={styles.backButton}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> חזרה לאטרקציות
        </button>
      </div>
    </div>
  );
};

export default AttractionDetails;
