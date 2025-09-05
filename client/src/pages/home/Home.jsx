// src/pages/home/Home.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaInstagram } from "react-icons/fa";
import PhoneVideoFrame from "../phoneVideoFrame/PhoneVideoFrame";

import {
  getRecommendedTrips,
  getRecommendedCamping,
  getRecommendedAttractions,
} from "../../services/api";

import TripsCard from "../../components/tripsCard/TripsCard";
import CampingCard from "../../components/campingCard/CampingCard";
import AttractionCard from "../../components/attractionCard/AttractionCard";

import styles from "./home.module.css";

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
      {/* ─── HERO ─── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <p className={styles.heroParagraph}>
              ✨ ברוכים הבאים ל־Do OlaNya Trips! ✨ <br />
              📲 אם לא שמעתם עלינו ועל הטיולים שאנחנו מתכננים לכם –{" "}
              <a
                href="https://www.instagram.com/do_olanya_trips/"
                target="_blank"
                rel="noreferrer"
                className={styles.instaLink}
                aria-label="עקבו באינסטגרם"
                title="עקבו באינסטגרם"
              >
                <FaInstagram className={styles.instaIcon} />
              </a>{" "}
              ותראו מה חדש!
              <br />
              <br />
              כאן מחכות לכם חוויות מיוחדות מכל הסוגים:
              <br />
              🏕️ קמפינג בטבע – לינות באוהלים באזורים הכי יפים בארץ
              <br />
              🚶 טיולים מאורגנים – מסלולים מתוכננים עד הפרט הקטן
              <br />
              🎡 אטרקציות ייחודיות – חוויות שתרצו לחזור אליהן שוב
              <br />
              <br />
              💡 אנחנו מתכננים עבורכם את הטיולים עם המון תשומת לב לפרטים הקטנים.
              <br />
              <br />
              🎁 הכרתם את טיול ההפתעה? אם לא — זה הזמן לגלות חוויה ייחודית:
              <br />
              בוחרים סגנון ותקציב, ואנחנו דואגים לכל השאר!
              <br />
              👉{" "}
              <Link to="/surprise" className={styles.surpriseLinkInline}>
                בואו להכיר את טיול ההפתעה →
              </Link>
            </p>

            <div className={styles.heroCtas}>
              <button
                onClick={() => navigate("/trips")}
                className={styles.primaryBtn}
              >
                לכל הטיולים
              </button>
              <button
                onClick={() => navigate("/camping")}
                className={styles.secondaryBtn}
              >
                אתרי קמפינג
              </button>
              <button
                onClick={() => navigate("/attractions")}
                className={styles.ghostBtn}
              >
                אטרקציות
              </button>
            </div>
          </div>

          <div className={styles.videoWrapper}>
            <PhoneVideoFrame
              sourceType="video"
              videoSrc="/videos/myVideo.mp4"
              autoPlay
              loop
              muted
              controls={true}
              aspectRatio="9 / 19.5"
            />
          </div>
        </div>
      </section>

      {/* ─── המלצות ─── */}
      <section className={styles.recoSection}>
        <div className={styles.sectionHeader}>
          <h2>המלצות חמות 🔥</h2>
          <p>נבחרו במיוחד מתוך טיולים, קמפינג ואטרקציות שסומנו כהמלצה.</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Trips */}
        <div className={styles.groupHeader}>
          <h3>טיולים מומלצים</h3>
          <Link to="/trips" className={styles.link}>
            לכל הטיולים →
          </Link>
        </div>
        <div className={styles.cardsGrid}>
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={`t-skel-${i}`} className={styles.skeleton} />
            ))}
          {!loading && trips.length === 0 && (
            <div className={styles.empty}>אין טיולים מומלצים כרגע.</div>
          )}
          {!loading &&
            trips.map((t) => <TripsCard key={t.trip_id || t.id} {...t} />)}
        </div>

        {/* Camping */}
        <div className={styles.groupHeader}>
          <h3>קמפינג מומלץ</h3>
          <Link to="/camping" className={styles.link}>
            לכל אתרי הקמפינג →
          </Link>
        </div>
        <div className={styles.cardsGrid}>
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={`c-skel-${i}`} className={styles.skeleton} />
            ))}
          {!loading && camping.length === 0 && (
            <div className={styles.empty}>אין אתרי קמפינג מומלצים כרגע.</div>
          )}
          {!loading &&
            camping.map((c) => (
              <CampingCard
                key={c.camping_id || c.id || c.camping_location_name}
                spot={c}
              />
            ))}
        </div>

        {/* Attractions */}
        <div className={styles.groupHeader}>
          <h3>אטרקציות מומלצות</h3>
          <Link to="/attractions" className={styles.link}>
            לכל האטרקציות →
          </Link>
        </div>
        <div className={styles.cardsGrid}>
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={`a-skel-${i}`} className={styles.skeleton} />
            ))}
          {!loading && attractions.length === 0 && (
            <div className={styles.empty}>אין אטרקציות מומלצות כרגע.</div>
          )}
          {!loading &&
            attractions.map((a) => (
              <AttractionCard key={a.attraction_id || a.id} {...a} />
            ))}
        </div>
      </section>

      {/* ─── סגירה ─── */}
      <section className={styles.bottomCta}>
        <h3>מחפשים משהו מיוחד למשפחה או לחברים?</h3>
        <p>נדאג לכם לחוויה מותאמת אישית – מהיציאה מהבית ועד החזרה עם חיוך.</p>
        <div className={styles.heroCtas}>
          <button
            className={styles.primaryBtn}
            onClick={() => navigate("/contact")}
          >
            צרו קשר
          </button>
          <button
            className={styles.secondaryBtn}
            onClick={() => navigate("/about")}
          >
            להכיר אותנו
          </button>
        </div>
      </section>
    </main>
  );
}
