// src/pages/home/Home.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaInstagram,
  FaMapMarkerAlt,
  FaCampground,
  FaRoute,
  FaStar,
  FaArrowRight,
  FaPlay,
} from "react-icons/fa";
import PhoneVideoFrame from "../phoneVideoFrame/PhoneVideoFrame";
import {
  getRecommendedTrips,
  getRecommendedCamping,
  getRecommendedAttractions,
} from "../../services/api";
import TripsCard from "../../components/tripsCard/TripsCard";
import CampingCard from "../../components/campingCard/CampingCard";
import AttractionCard from "../../components/attractionCard/AttractionCard";
import styles from "./home-elegant.module.css";
export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trips, setTrips] = useState([]);
  const [camping, setCamping] = useState([]);
  const [attractions, setAttractions] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [t, c, a] = await Promise.all([
          getRecommendedTrips().catch(() => []),
          getRecommendedCamping().catch(() => []),
          getRecommendedAttractions().catch(() => []),
        ]);
        if (!mounted) return;

        setTrips(Array.isArray(t) ? t : t?.rows || t?.data || []);
        setCamping(Array.isArray(c) ? c : c?.rows || c?.data || []);
        setAttractions(Array.isArray(a) ? a : a?.rows || a?.data || []);
      } catch (e) {
        if (!mounted) return;
        setError("שגיאה בטעינת נתונים. נסי לרענן את העמוד.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className={styles.home}>
      {/* ─── ELEGANT HERO SECTION ─── */}
      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <div className={styles.brandSection}>
                <h1 className={styles.brandTitle}>Do OlaNya Trips</h1>
                <p className={styles.brandTagline}>
                  חוויות נסיעה יוצאות דופן בישראל
                </p>
              </div>

              <div className={styles.heroDescription}>
                <p>
                ✨ ברוכים הבאים ל־Do OlaNya Trips! ✨
📲 אם לא שמעתם עלינו ועל הטיולים שאנחנו מתכננים לכם –  ותראו מה חדש!

כאן מחכות לכם חוויות מיוחדות מכל הסוגים:
🏕️ קמפינג בטבע – לינות באוהלים באזורים הכי יפים בארץ
🚶 טיולים מאורגנים – מסלולים מתוכננים עד הפרט הקטן
🎡 אטרקציות ייחודיות – חוויות שתרצו לחזור אליהן שוב

💡 אנחנו מתכננים עבורכם את הטיולים עם המון תשומת לב לפרטים הקטנים.

🎁 הכרתם את טיול ההפתעה? אם לא — זה הזמן לגלות חוויה ייחודית:
בוחרים סגנון ותקציב, ואנחנו דואגים לכל השאר!
                </p>
              </div>

              <div className={styles.heroActions}>
                <button
                  onClick={() => navigate("/trips")}
                  className={styles.primaryAction}
                >
                  <span>גלו את הטיולים שלנו</span>
                  <FaArrowRight className={styles.actionIcon} />
                </button>
                <button
                  onClick={() => navigate("/surprise")}
                  className={styles.secondaryAction}
                >
                  <FaPlay className={styles.playIcon} />
                  <span>טיול הפתעה</span>
                </button>
              </div>

              <div className={styles.socialProof}>
                <div className={styles.socialStats}>
                  <div className={styles.stat}>
                    <span className={styles.statNumber}>500+</span>
                    <span className={styles.statLabel}>לקוחות מרוצים</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statNumber}>50+</span>
                    <span className={styles.statLabel}>יעדים ייחודיים</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statNumber}>5★</span>
                    <span className={styles.statLabel}>דירוג ממוצע</span>
                  </div>
                </div>
                <a
                  href="https://www.instagram.com/do_olanya_trips/"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.socialLink}
                >
                  <FaInstagram />
                  <span>עקבו אחרינו</span>
                </a>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.visualCard}>
                <PhoneVideoFrame
                  sourceType="video"
                  videoSrc="/videos/myVideo.mp4"
                  autoPlay
                  loop
                  muted
                  controls={false}
                  aspectRatio="9 / 19.5"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SERVICES SHOWCASE ─── */}
      <section className={styles.services}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2>השירותים שלנו</h2>
            <p>חוויות מותאמות אישית לכל סוג של מטייל</p>
          </div>

          <div className={styles.servicesGrid}>
            <div
              className={styles.serviceCard}
              onClick={() => navigate("/trips")}
            >
              <div className={styles.serviceIcon}>
                <FaRoute />
              </div>
              <h3>טיולים מאורגנים</h3>
              <p>מסלולים מתוכננים בקפידה ופעילויות מגוונות</p>
              <div className={styles.serviceLink}>
                <span>גלו עוד</span>
                <FaArrowRight />
              </div>
            </div>

            <div
              className={styles.serviceCard}
              onClick={() => navigate("/camping")}
            >
              <div className={styles.serviceIcon}>
                <FaCampground />
              </div>
              <h3>קמפינג בטבע</h3>
              <p>חוויות לינה באוהלים במקומות הכי יפים ושקטים בישראל</p>
              <div className={styles.serviceLink}>
                <span>גלו עוד</span>
                <FaArrowRight />
              </div>
            </div>

            <div
              className={styles.serviceCard}
              onClick={() => navigate("/attractions")}
            >
              <div className={styles.serviceIcon}>
                <FaMapMarkerAlt />
              </div>
              <h3>אטרקציות ייחודיות</h3>
              <p>גלו מקומות מיוחדים ופעילויות שלא תמצאו בשום מקום אחר</p>
              <div className={styles.serviceLink}>
                <span>גלו עוד</span>
                <FaArrowRight />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURED EXPERIENCES ─── */}
      <section className={styles.featured}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2>חוויות מומלצות</h2>
            <p>הבחירות הפופולריות ביותר של הלקוחות שלנו</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.featuredTabs}>
            <div className={styles.tabHeader}>
              <h3>טיולים פופולריים</h3>
              <Link to="/trips" className={styles.viewAll}>
                <span>צפו בכל הטיולים</span>
                <FaArrowRight />
              </Link>
            </div>
            <div className={styles.featuredGrid}>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={`t-skel-${i}`}
                    className={styles.featuredSkeleton}
                  />
                ))}
              {!loading && trips.length === 0 && (
                <div className={styles.emptyState}>אין טיולים זמינים כרגע</div>
              )}
              {!loading &&
                trips
                  .slice(0, 3)
                  .map((t) => <TripsCard key={t.trip_id || t.id} {...t} />)}
            </div>
          </div>

          <div className={styles.featuredTabs}>
            <div className={styles.tabHeader}>
              <h3>קמפינג מומלץ</h3>
              <Link to="/camping" className={styles.viewAll}>
                <span>צפו בכל האתרים</span>
                <FaArrowRight />
              </Link>
            </div>
            <div className={styles.featuredGrid}>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={`c-skel-${i}`}
                    className={styles.featuredSkeleton}
                  />
                ))}
              {!loading && camping.length === 0 && (
                <div className={styles.emptyState}>
                  אין אתרי קמפינג זמינים כרגע
                </div>
              )}
              {!loading &&
                camping
                  .slice(0, 3)
                  .map((c) => (
                    <CampingCard
                      key={c.camping_id || c.id || c.camping_location_name}
                      spot={c}
                    />
                  ))}
            </div>
          </div>

          <div className={styles.featuredTabs}>
            <div className={styles.tabHeader}>
              <h3>אטרקציות מיוחדות</h3>
              <Link to="/attractions" className={styles.viewAll}>
                <span>צפו בכל האטרקציות</span>
                <FaArrowRight />
              </Link>
            </div>
            <div className={styles.featuredGrid}>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={`a-skel-${i}`}
                    className={styles.featuredSkeleton}
                  />
                ))}
              {!loading && attractions.length === 0 && (
                <div className={styles.emptyState}>
                  אין אטרקציות זמינות כרגע
                </div>
              )}
              {!loading &&
                attractions
                  .slice(0, 3)
                  .map((a) => (
                    <AttractionCard key={a.attraction_id || a.id} {...a} />
                  ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CALL TO ACTION ─── */}
      <section className={styles.cta}>
        <div className={styles.container}>
          <div className={styles.ctaContent}>
            <h2>מוכנים להתחיל את ההרפתקה?</h2>
            <p>
              צרו איתנו קשר ונתכנן עבורכם חוויה מותאמת אישית שתישאר איתכם לכל
              החיים
            </p>
            <div className={styles.ctaActions}>
              <button
                className={styles.ctaPrimary}
                onClick={() => navigate("/contact")}
              >
                <span>בואו נתכנן ביחד</span>
                <FaArrowRight />
              </button>
              <button
                className={styles.ctaSecondary}
                onClick={() => navigate("/surprise")}
              >
                <span>טיול הפתעה</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
