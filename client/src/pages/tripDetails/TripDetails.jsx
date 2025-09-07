// TripDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./tripDetails.module.css";
import Reviews from "../../components/reviews/Reviews";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faGlobe,
  faMapMarkedAlt,
  faCalendarAlt,
  faLeaf,
  faUsers,
  faRoute,
  faInfoCircle,
  faMountain,
  faHeart,
  faChevronLeft,
  faChevronRight,
  faPhone,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || "http://localhost:5000";

/** ממיר ערך מה-DB לנתיב תמונה תקין (עמיד למגוון צורות) */
function normalizeImagePathFromDB(raw, folder = "trips") {
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
  // גיבוי: אם נשלח רק שם קובץ
  return `${API_ORIGIN}/uploads/${folder}/${first.replace(
    /^uploads\/[^/]+\//,
    ""
  )}`;
}

function TripDetails() {
  const params = useParams();
  const rawId = params?.id;
  // מזהה ממוגן
  const id = useMemo(() => {
    const s = String(rawId ?? "").trim();
    return s && s.toLowerCase() !== "undefined" ? s : "";
  }, [rawId]);

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [animateSection, setAnimateSection] = useState(false);

  // המשתמש המחובר עבור Reviews
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  // אנימציה קלה אחרי טעינה
  useEffect(() => {
    if (!loading && trip) {
      const t = setTimeout(() => setAnimateSection(true), 300);
      return () => clearTimeout(t);
    }
  }, [loading, trip]);

  useEffect(() => {
    // אין id? אל תבצע קריאה
    if (!id) {
      setLoading(false);
      setError("לא התקבל מזהה טיול בכתובת.");
      return;
    }
    let cancelled = false;

    const fetchTrip = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_ORIGIN}/api/trips/${id}`);
        if (!cancelled) {
          setTrip(res.data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError("אירעה שגיאה בטעינת פרטי הטיול.");
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrip();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading)
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <p>טוען פרטי טיול...</p>
      </div>
    );

  if (error)
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <p>{error}</p>
      </div>
    );

  if (!trip)
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <p>טיול לא נמצא</p>
      </div>
    );

  // תמיכה במס׳ תמונות מופרדות בפסיקים או מערך
  const imageNames = Array.isArray(trip.trip_img)
    ? trip.trip_img
    : trip.trip_img
    ? String(trip.trip_img)
        .split(",")
        .map((img) => img.trim())
    : [];

  // תיאור מקוצר
  const shortDescription =
    trip.trip_description && trip.trip_description.length > 150
      ? `${trip.trip_description.substring(0, 150)}...`
      : trip.trip_description || "";

  // ======= מחירים – לוגיקה קיימת =======
  const extractPrices = (text) => {
    if (!text) return [];
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const entries = [];
    const pushIfMatch = (labelHe, patterns) => {
      for (const pat of patterns) {
        const re = new RegExp(
          `(?:${pat})\\s*(?:[:\\-–])?\\s*(?:₪|ש"?ח|NIS)?\\s*([\\d.,]+)\\s*(₪|ש"?ח|NIS)?`,
          "i"
        );
        const line = lines.find((l) => re.test(l));
        if (line) {
          const m = line.match(re);
          if (m && m[1]) {
            const amount = m[1];
            const currency = m[2] || "₪";
            entries.push({
              label: labelHe,
              value: `${amount} ${currency}`.trim(),
            });
            return;
          }
        }
      }
    };
    pushIfMatch("מבוגר", ["מבוגר"]);
    pushIfMatch("ילד", ["ילד"]);
    pushIfMatch("מבוגר בקבוצה", ["מבוגר בקבוצה"]);
    pushIfMatch("ילד בקבוצה", ["ילד בקבוצה"]);
    pushIfMatch("סטודנט", ["סטודנט"]);
    pushIfMatch("מילואים", ["מילואים"]);
    pushIfMatch("חייל / אזרח ותיק", [
      "חייל\\s*/\\s*אזרח ותיק",
      "חייל",
      "אזרח ותיק",
    ]);
    return entries;
  };
  const parsedPrices = extractPrices(trip.trip_description);

  const extractPricesFromHtmlTable = (text) => {
    try {
      if (!text || !text.includes("<table")) return [];
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const table = doc.querySelector("table");
      if (!table) return [];
      const rows = [];
      table.querySelectorAll("tr").forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll("th,td"))
          .map((td) => td.textContent.trim())
          .filter(Boolean);
        if (cells.length >= 2) rows.push({ label: cells[0], value: cells[1] });
      });
      if (
        rows.length &&
        /סוג|קטגוריה/i.test(rows[0].label) &&
        /מחיר/i.test(rows[0].value)
      ) {
        rows.shift();
      }
      return rows;
    } catch {
      return [];
    }
  };
  const htmlPriceRows = extractPricesFromHtmlTable(trip.trip_description);

  const extractPricesFromPipeTable = (text) => {
    if (!text) return [];
    const rows = [];
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      if (/\|/.test(line)) {
        const parts = line
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length >= 2) rows.push({ label: parts[0], value: parts[1] });
      }
    }
    if (
      rows.length &&
      /סוג|קטגוריה/i.test(rows[0].label) &&
      /מחיר/i.test(rows[0].value)
    ) {
      rows.shift();
    }
    return rows;
  };
  const pipePriceRows = extractPricesFromPipeTable(trip.trip_description);

  const extractGenericPriceLines = (text) => {
    if (!text) return [];
    const rows = [];
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const amountRe = /(₪|ש"?ח|NIS)?\s*([\d][\d.,]*)\s*(₪|ש"?ח|NIS)?/i;
    for (const line of lines) {
      if (amountRe.test(line)) {
        const parts = line.split(/[:\-–]\s*/);
        if (parts.length >= 2) {
          const label = parts[0].replace(/^[-–:]+/, "").trim();
          const valueMatch = line.match(amountRe);
          if (label && valueMatch) {
            const currency = valueMatch[1] || valueMatch[3] || "₪";
            const amount = valueMatch[2];
            rows.push({ label, value: `${amount} ${currency}`.trim() });
          }
        }
      }
    }
    return rows;
  };
  const genericPriceRows = extractGenericPriceLines(trip.trip_description);
  // ======= סוף לוגיקת המחירים =======

  // תוכן דינמי
  const tripFeatures = [
    {
      icon: faMapMarkedAlt,
      title: "נופים מרהיבים",
      description: "נוף פנורמי של הטבע הישראלי",
    },
    {
      icon: faUsers,
      title: "חוויה קבוצתית",
      description: "פעילות מתאימה לכל המשפחה",
    },
    {
      icon: faLeaf,
      title: "קרוב לטבע",
      description: "חיבור אמיתי לסביבה הטבעית",
    },
    {
      icon: faRoute,
      title: "מסלול מתוכנן",
      description: "נתיב בטוח ומסומן היטב",
    },
  ];

  const preparationData = {
    clothing: [
      "נעליים סגורות ונוחות",
      "בגדים בשכבות",
      "כובע להגנה מהשמש",
      "מעיל קל (בהתאם לעונה)",
    ],
    equipment: [
      "בקבוק מים (לפחות 1.5 ליטר)",
      "חטיפים אנרגטיים",
      "קרם הגנה",
      "תרופות אישיות",
    ],
  };

  const locationInfo = [
    {
      icon: faMapMarkedAlt,
      title: "איך להגיע",
      description: "נגיש בתחבורה ציבורית ופרטית. חניה זמינה באזור",
    },
    {
      icon: faClock,
      title: "שעות פעילות",
      description: "מומלץ להגיע בשעות הבוקר המוקדמות או אחר הצהריים",
    },
    {
      icon: faUsers,
      title: "נגישות",
      description: "מתאים לרמות כושר שונות. יש להתחשב ברמת הקושי",
    },
  ];

  const safetyGuidelines = [
    { icon: faExclamationTriangle, text: "הישארו במסלול המסומן" },
    { icon: faUsers, text: "אל תטיילו לבד" },
    { icon: faPhone, text: "ודאו שיש קליטה סלולרית" },
    { icon: faClock, text: "תכננו לחזור לפני החשכה" },
  ];

  const weatherSeasons = [
    {
      emoji: "🌸",
      season: "אביב (מרץ-מאי)",
      description: "מזג אוויר נעים, פריחות יפות. זמן מושלם לטיול",
    },
    {
      emoji: "☀️",
      season: "קיץ (יוני-אוגוסט)",
      description: "חם ויבש. מומלץ לצאת מוקדם בבוקר או בערב",
    },
    {
      emoji: "🍂",
      season: "סתיו (ספטמבר-נובמבר)",
      description: "טמפרטורות נעימות, נופים יפים. עונה מומלצת",
    },
    {
      emoji: "🌧️",
      season: "חורף (דצמבר-פברואר)",
      description: "קריר ולח. יש להתכונן לגשם ולהחליק",
    },
  ];

  // נתונים לרכיב Reviews
  const currentUser = user?.userName || user?.username || user?.email || null;
  const reviewsEntityId = trip.trip_id || trip._id || id;

  // שאילתת מפה בטוחה
  const mapQuery = encodeURIComponent(
    `${trip.trip_name || ""} ${trip.trip_location || "ישראל"}`
  );

  return (
    <div className={styles.pageContainer}>
      {/* Immersive Fullscreen Hero with Parallax */}
      <div className={styles.immersiveHero}>
        {imageNames.length > 0 && (
          <>
            <div
              className={styles.parallaxBackground}
              style={{
                backgroundImage: `url(${normalizeImagePathFromDB(
                  imageNames[0],
                  "trips"
                )})`,
              }}
            />
            <div className={styles.floatingParticles}>
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={styles.particle}
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${3 + Math.random() * 4}s`,
                  }}
                />
              ))}
            </div>
          </>
        )}

        <div className={styles.cinematicOverlay} />

        {/* Animated Title Reveal */}
        <div className={styles.heroContent}>
          <div className={styles.titleReveal}>
            <div className={styles.locationBadge}>
              <FontAwesomeIcon icon={faMapMarkedAlt} />
              <span>{trip.trip_location}</span>
            </div>
            <h1 className={styles.cinematicTitle}>
              {String(trip.trip_name || "")
                .split(" ")
                .map((word, index) => (
                  <span
                    key={index}
                    className={styles.titleWord}
                    style={{ animationDelay: `${index * 0.3}s` }}
                  >
                    {word}
                  </span>
                ))}
            </h1>

            {/* Interactive Journey Timeline */}
            <div className={styles.journeyTimeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineIcon}>
                  <FontAwesomeIcon icon={faRoute} />
                </div>
                <span>{trip.trip_type}</span>
              </div>
              <div className={styles.timelineLine} />
              <div className={styles.timelineItem}>
                <div className={styles.timelineIcon}>
                  <FontAwesomeIcon icon={faMountain} />
                </div>
                <span>{trip.difficulty_level}</span>
              </div>
              <div className={styles.timelineLine} />
              <div className={styles.timelineItem}>
                <div className={styles.timelineIcon}>
                  <FontAwesomeIcon icon={faClock} />
                </div>
                <span>{trip.trip_duration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className={styles.scrollIndicator}>
          <div className={styles.scrollMouse}>
            <div className={styles.scrollWheel} />
          </div>
          <span>גלה את הטיול</span>
        </div>
      </div>

      {/* Interactive 3D Image Carousel */}
      {imageNames.length > 1 && (
        <div className={styles.immersiveGallery}>
          <div className={styles.galleryTitle}>
            <h2>חוויה חזותית</h2>
            <div className={styles.titleUnderline} />
          </div>

          <div className={styles.carousel3D}>
            <div className={styles.carouselContainer}>
              {imageNames.map((img, index) => (
                <div
                  key={index}
                  className={`${styles.carouselSlide} ${
                    index === activeImageIndex
                      ? styles.activeSlide
                      : index === (activeImageIndex + 1) % imageNames.length
                      ? styles.nextSlide
                      : index ===
                        (activeImageIndex - 1 + imageNames.length) %
                          imageNames.length
                      ? styles.prevSlide
                      : styles.hiddenSlide
                  }`}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <div className={styles.slideInner}>
                    <img
                      src={normalizeImagePathFromDB(img, "trips")}
                      alt={`${trip.trip_name} ${index + 1}`}
                      onError={(e) => {
                        e.currentTarget.src = "/images/placeholder-trip.jpg";
                      }}
                    />
                    <div className={styles.slideOverlay}>
                      <div className={styles.slideNumber}>{index + 1}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Floating Navigation */}
            <div className={styles.floatingNav}>
              <button
                className={styles.navOrb}
                onClick={() =>
                  setActiveImageIndex((prev) =>
                    prev === 0 ? imageNames.length - 1 : prev - 1
                  )
                }
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
              <div className={styles.imageProgress}>
                <div
                  className={styles.progressBar}
                  style={{
                    width: `${
                      ((activeImageIndex + 1) / imageNames.length) * 100
                    }%`,
                  }}
                />
                <span>
                  {activeImageIndex + 1} מתוך {imageNames.length}
                </span>
              </div>
              <button
                className={styles.navOrb}
                onClick={() =>
                  setActiveImageIndex((prev) =>
                    prev === imageNames.length - 1 ? 0 : prev + 1
                  )
                }
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storytelling Content Experience */}
      <div className={styles.storyContainer}>
        {/* Interactive Story Chapters */}
        <div className={styles.storyChapter}>
          <div className={styles.chapterHeader}>
            <div className={styles.chapterNumber}>01</div>
            <h2 className={styles.chapterTitle}>הסיפור שלך מתחיל כאן</h2>
            <div className={styles.chapterLine} />
          </div>

          {trip.trip_description && (
            <div className={styles.immersiveStory}>
              <div className={styles.storyContent}>
                <div className={styles.storyText}>
                  {showFullDescription
                    ? trip.trip_description
                    : shortDescription}
                </div>

                {trip.trip_description.length > 150 && (
                  <div className={styles.storyReveal}>
                    <button
                      className={styles.revealBtn}
                      onClick={() =>
                        setShowFullDescription(!showFullDescription)
                      }
                    >
                      <span>
                        {showFullDescription ? "סגור את הסיפור" : "המשך לקרוא"}
                      </span>
                      <div className={styles.revealIcon}>
                        <FontAwesomeIcon
                          icon={
                            showFullDescription ? faChevronLeft : faChevronRight
                          }
                        />
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.storyVisual}>
                <div className={styles.floatingElements}>
                  <div className={styles.floatingIcon}>
                    <FontAwesomeIcon icon={faRoute} />
                  </div>
                  <div className={styles.floatingIcon}>
                    <FontAwesomeIcon icon={faMountain} />
                  </div>
                  <div className={styles.floatingIcon}>
                    <FontAwesomeIcon icon={faLeaf} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Journey Map (מידע כללי) */}
        <div className={styles.journeyMap}>
          <div className={styles.mapHeader}>
            <div className={styles.chapterNumber}>02</div>
            <h2 className={styles.chapterTitle}>המסע שלך</h2>
            <div className={styles.chapterLine} />
          </div>

          <div className={styles.journeySteps}>
            <div className={styles.journeyStep}>
              <div className={styles.stepIcon}>
                <FontAwesomeIcon icon={faClock} />
              </div>
              <div className={styles.stepContent}>
                <h4>משך הטיול</h4>
                <p>{trip.trip_duration || "לא צוין"}</p>
              </div>
              <div className={styles.stepConnector} />
            </div>

            <div className={styles.journeyStep}>
              <div className={styles.stepIcon}>
                <FontAwesomeIcon icon={faMountain} />
              </div>
              <div className={styles.stepContent}>
                <h4>רמת קושי</h4>
                <p>{trip.difficulty_level || "לא צוין"}</p>
              </div>
              <div className={styles.stepConnector} />
            </div>

            <div className={styles.journeyStep}>
              <div className={styles.stepIcon}>
                <FontAwesomeIcon icon={faUsers} />
              </div>
              <div className={styles.stepContent}>
                <h4>משתתפים</h4>
                <p>
                  {trip.max_participants
                    ? `עד ${trip.max_participants}`
                    : "ללא הגבלה"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trip Details */}
        <div className={styles.detailsSection}>
          <div className={styles.sectionCard}>
            <div className={styles.cardHeader}>
              <FontAwesomeIcon icon={faRoute} className={styles.cardIcon} />
              <h2>פרטי הטיול</h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.detailsGrid}>
                {trip.trip_duration && (
                  <div className={styles.detailItem}>
                    <FontAwesomeIcon
                      icon={faClock}
                      className={styles.detailIcon}
                    />
                    <div className={styles.detailText}>
                      <span className={styles.detailLabel}>משך הטיול</span>
                      <span className={styles.detailValue}>
                        {trip.trip_duration}
                      </span>
                    </div>
                  </div>
                )}
                {trip.difficulty_level && (
                  <div className={styles.detailItem}>
                    <FontAwesomeIcon
                      icon={faMountain}
                      className={styles.detailIcon}
                    />
                    <div className={styles.detailText}>
                      <span className={styles.detailLabel}>רמת קושי</span>
                      <span className={styles.detailValue}>
                        {trip.difficulty_level}
                      </span>
                    </div>
                  </div>
                )}
                {trip.max_participants && (
                  <div className={styles.detailItem}>
                    <FontAwesomeIcon
                      icon={faUsers}
                      className={styles.detailIcon}
                    />
                    <div className={styles.detailText}>
                      <span className={styles.detailLabel}>מספר משתתפים</span>
                      <span className={styles.detailValue}>
                        עד {trip.max_participants}
                      </span>
                    </div>
                  </div>
                )}
                {trip.trip_type && (
                  <div className={styles.detailItem}>
                    <FontAwesomeIcon
                      icon={faGlobe}
                      className={styles.detailIcon}
                    />
                    <div className={styles.detailText}>
                      <span className={styles.detailLabel}>סוג הטיול</span>
                      <span className={styles.detailValue}>
                        {trip.trip_type}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Magical Pricing Experience */}
        <div className={styles.magicalPricing}>
          <div className={styles.chapterHeader}>
            <div className={styles.chapterNumber}>03</div>
            <h2 className={styles.chapterTitle}>השקעה בחוויה</h2>
            <div className={styles.chapterLine} />
          </div>

          <div className={styles.pricingOrb}>
            {(() => {
              const hasEntry = trip.has_entry_fee;
              const hasParsed = parsedPrices.length > 0;
              const hasHtml = htmlPriceRows.length > 0;
              const hasPipe = pipePriceRows.length > 0;
              const hasGeneric = genericPriceRows.length > 0;
              const looksLikePricesInText =
                /(מחיר|₪|ש"?ח|NIS|\d+[\d.,]*)/i.test(
                  trip.trip_description || ""
                );
              const isFree =
                !(
                  hasParsed ||
                  hasHtml ||
                  hasPipe ||
                  hasGeneric ||
                  looksLikePricesInText
                ) &&
                (hasEntry === false || hasEntry === 0 || hasEntry === "0");

              if (isFree) {
                return (
                  <div className={styles.freeExperience}>
                    <div className={styles.freeGlow}>
                      <FontAwesomeIcon icon={faHeart} />
                    </div>
                    <h3>חוויה ללא תשלום!</h3>
                    <p>הטבע נותן לנו את המתנה הכי יפה - בחינם</p>
                  </div>
                );
              }

              const priceRows =
                htmlPriceRows.length > 0
                  ? htmlPriceRows
                  : pipePriceRows.length > 0
                  ? pipePriceRows
                  : genericPriceRows.length > 0
                  ? genericPriceRows
                  : parsedPrices;

              return (
                <div className={styles.pricingCards}>
                  {priceRows.length > 0 ? (
                    priceRows.map((row, idx) => (
                      <div key={idx} className={styles.priceCard}>
                        <div className={styles.priceCardGlow} />
                        <div className={styles.priceCardContent}>
                          <h4>{row.label}</h4>
                          <div className={styles.priceAmount}>{row.value}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.priceCard}>
                      <div className={styles.priceCardGlow} />
                      <div className={styles.priceCardContent}>
                        <h4>כניסה</h4>
                        <div className={styles.priceAmount}>
                          {trip.entry_fee_label || "בתשלום"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Tips Section */}
        {trip.trip_tips && (
          <div className={styles.tipsSection}>
            <div className={styles.sectionCard}>
              <div className={styles.cardHeader}>
                <FontAwesomeIcon icon={faLeaf} className={styles.cardIcon} />
                <h2>טיפים והמלצות</h2>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.tipsList}>
                  {trip.trip_tips
                    .split("\n")
                    .map((tip) => tip.trim())
                    .filter(Boolean)
                    .map((tip, index) => (
                      <div key={index} className={styles.tipItem}>
                        <div className={styles.tipBullet}>
                          <FontAwesomeIcon icon={faRoute} />
                        </div>
                        <p>{tip}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Trip Highlights */}
        <div className={styles.highlightsSection}>
          <div className={styles.chapterHeader}>
            <div className={styles.chapterNumber}>04</div>
            <h2 className={styles.chapterTitle}>מה מיוחד בטיול הזה</h2>
            <div className={styles.chapterLine} />
          </div>

          <div className={styles.featuresGrid}>
            {tripFeatures.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIconWrapper}>
                  <FontAwesomeIcon
                    icon={feature.icon}
                    className={styles.featureIcon}
                  />
                </div>
                <div className={styles.featureContent}>
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
                <div className={styles.featureGlow} />
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic What to Bring */}
        <div className={styles.preparationSection}>
          <div className={styles.chapterHeader}>
            <div className={styles.chapterNumber}>05</div>
            <h2 className={styles.chapterTitle}>מה להביא</h2>
            <div className={styles.chapterLine} />
          </div>

          <div className={styles.preparationGrid}>
            <div className={styles.prepCategory}>
              <div className={styles.categoryHeader}>
                <FontAwesomeIcon
                  icon={faRoute}
                  className={styles.categoryIcon}
                />
                <h4>ביגוד מומלץ</h4>
              </div>
              <div className={styles.prepList}>
                {preparationData.clothing.map((item, index) => (
                  <div key={index} className={styles.prepItem}>
                    <div className={styles.prepBullet} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.prepCategory}>
              <div className={styles.categoryHeader}>
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  className={styles.categoryIcon}
                />
                <h4>ציוד חיוני</h4>
              </div>
              <div className={styles.prepList}>
                {preparationData.equipment.map((item, index) => (
                  <div key={index} className={styles.prepItem}>
                    <div className={styles.prepBullet} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Location & Accessibility */}
        <div className={styles.locationSection}>
          <div className={styles.chapterHeader}>
            <div className={styles.chapterNumber}>06</div>
            <h2 className={styles.chapterTitle}>מיקום ונגישות</h2>
            <div className={styles.chapterLine} />
          </div>

          <div className={styles.locationGrid}>
            {locationInfo.map((location, index) => (
              <div key={index} className={styles.locationCard}>
                <div className={styles.locationIconWrapper}>
                  <FontAwesomeIcon
                    icon={location.icon}
                    className={styles.locationIcon}
                  />
                </div>
                <div className={styles.locationContent}>
                  <h4>{location.title}</h4>
                  <p>{location.description}</p>
                </div>
                <div className={styles.locationGlow} />
              </div>
            ))}
          </div>
        </div>

        {/* ===== כרטיס מפה (Google Map) — מלבן קטן ===== */}
        <div className={styles.detailsSection}>
          <div className={styles.sectionCard}>
            <div className={styles.cardHeader}>
              <FontAwesomeIcon
                icon={faMapMarkedAlt}
                className={styles.cardIcon}
              />
              <h2>מפה</h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.mapContainer}>
                <iframe
                  className={styles.map}
                  title="Trip map"
                  src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Safety Guidelines */}
        <div className={styles.safetySection}>
          <div className={styles.chapterHeader}>
            <div className={styles.chapterNumber}>07</div>
            <h2 className={styles.chapterTitle}>הנחיות בטיחות</h2>
            <div className={styles.chapterLine} />
          </div>

          <div className={styles.safetyGrid}>
            {safetyGuidelines.map((guideline, index) => (
              <div key={index} className={styles.safetyCard}>
                <div className={styles.safetyIconWrapper}>
                  <FontAwesomeIcon
                    icon={guideline.icon}
                    className={styles.safetyIcon}
                  />
                </div>
                <span className={styles.safetyText}>{guideline.text}</span>
                <div className={styles.safetyGlow} />
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Weather Info */}
        <div className={styles.weatherSection}>
          <div className={styles.chapterHeader}>
            <div className={styles.chapterNumber}>08</div>
            <h2 className={styles.chapterTitle}>מזג אויר ועונות</h2>
            <div className={styles.chapterLine} />
          </div>

          <div className={styles.weatherGrid}>
            {weatherSeasons.map((season, index) => (
              <div key={index} className={styles.seasonCard}>
                <div className={styles.seasonEmoji}>{season.emoji}</div>
                <div className={styles.seasonContent}>
                  <h4>{season.season}</h4>
                  <p>{season.description}</p>
                </div>
                <div className={styles.seasonGlow} />
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info & Contact */}
        {(trip.additional_info || trip.contact_info) && (
          <div className={styles.additionalSection}>
            <div className={styles.sectionCard}>
              <div className={styles.cardHeader}>
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  className={styles.cardIcon}
                />
                <h2>מידע נוסף</h2>
              </div>
              <div className={styles.cardContent}>
                {trip.additional_info && (
                  <div className={styles.additionalInfo}>
                    <h3>מידע כללי</h3>
                    <p>{trip.additional_info}</p>
                  </div>
                )}
                {trip.contact_info && (
                  <div className={styles.contactInfo}>
                    <h3>פרטי יצירת קשר</h3>
                    <div className={styles.contactDetails}>
                      <FontAwesomeIcon
                        icon={faPhone}
                        className={styles.contactIcon}
                      />
                      <p>{trip.contact_info}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🔽 Reviews */}
      <Reviews
        entityType="trip"
        entityId={reviewsEntityId}
        canWrite={!!user}
        currentUser={currentUser}
        isAdmin={isAdmin}
      />
    </div>
  );
}

export default TripDetails;
