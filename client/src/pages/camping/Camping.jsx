import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./camping.module.css";
import {
  FaSpinner,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaLeaf,
  FaFire,
  FaCampground,
  FaTree,
  FaMountain,
  FaWater,
  FaCompass,
  FaCity,
  FaHiking,
  FaUmbrellaBeach,
} from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLandmark } from "@fortawesome/free-solid-svg-icons";
import { getCampingSpots } from "../../services/api";
import ImageTrail from "../../components/ImageTrail/ImageTrail.jsx";
import CampingCard from "../../components/campingCard/CampingCard.jsx";

const Camping = () => {
  const [campingSpots, setCampingSpots] = useState([]);
  const [campingByType, setCampingByType] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeType, setActiveType] = useState("all");

  useEffect(() => {
    const fetchCampingSpots = async () => {
      try {
        setLoading(true);
        const response = await getCampingSpots();

        const spots = response.data.map((spot) => {
          const imageFilename = spot.camping_img?.split(",")[0];

          const fullImageUrl = imageFilename
            ? `http://localhost:5000/uploads/camping/${imageFilename}`
            : "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1170&q=80";

          return {
            id: spot._id || spot.id,
            camping_location_name: spot.camping_location_name || "No name",
            camping_description: spot.camping_description || "No description",
            camping_img: fullImageUrl,
            camping_duration: spot.camping_duration || "Unknown",
            camping_type: spot.camping_type?.trim() || "other",
            full_texts: spot["Full texts"] || "",
          };
        });

        // Group camping spots by type
        const groupedByType = spots.reduce((acc, spot) => {
          const type = spot.camping_type || "other";
          if (!acc[type]) {
            acc[type] = [];
          }
          acc[type].push(spot);
          return acc;
        }, {});

        // Make sure we have an "all" category
        groupedByType["all"] = spots;
        
        setCampingSpots(spots);
        setCampingByType(groupedByType);
        setError(null);
      } catch (err) {
        console.error("Error fetching camping spots:", err);
        setError("Failed to fetch camping spots");
      } finally {
        setLoading(false);
      }
    };

    fetchCampingSpots();
  }, []);

  // Prepare image items for ImageTrail component
  const trailImages = campingSpots.slice(0, 6).map((spot, index) => ({
    key: spot.id || `camping-${index}`,
    url: spot.camping_img,
  }));
  
  // Get displayed camping spots based on active filter
  const getDisplayedCampingSpots = () => {
    if (!activeType || activeType === "all") {
      return campingSpots;
    }
    return campingByType[activeType] || [];
  };
  
  // Get the filtered camping spots to display
  const displayedCampingSpots = getDisplayedCampingSpots();

  return (
    <div className={styles.campingContainer}>
      {loading ? (
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} />
          <p>Loading camping spots...</p>
        </div>
      ) : (
        <>
          {/* Image Trail Section */}
          <section className={styles.imageTrailSection}>
            <h1 className={styles.imageTrailHeading}>
              Discover the magic of camping in Israel
            </h1>
            <ImageTrail items={trailImages} variant={1} />
          </section>
          

          {/* Features Section */}
          <section className={styles.featuresSection}>
            <div className={styles.container}>
              <div className={styles.sectionTitle}>
                <h2>למה לבחור בקמפינג?</h2>
                <p>
                  חוויית קמפינג משלבת טבע, הרפתקאות וזכרונות שיישארו איתך לתמיד
                </p>
              </div>

              <div className={styles.featuresGrid}>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <FaTree />
                  </div>
                  <h3>טבע מדהים</h3>
                  <p>התחברו מחדש לנוף הטבעי המדהים של ישראל</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <FaFire />
                  </div>
                  <h3>חוויה אותנטית</h3>
                  <p>בישול על האש, לינה תחת כוכבים וחיבור אמיתי</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <FaCampground />
                  </div>
                  <h3>מתקנים מתקדמים</h3>
                  <p>אתרי קמפינג מודרניים עם כל הנוחות הנדרשות</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <FaMountain />
                  </div>
                  <h3>מיקומים מדהימים</h3>
                  <p>מהרי הגליל ועד מדבר יהודה, חוויות מגוונות</p>
                </div>
              </div>
            </div>
          </section>

          {/* Popular Camping Spots Section */}
          <section id="campingSpots" className={styles.campingSection}>
            <div className={styles.container}>
              <div className={styles.sectionTitle}>
                <h2>אתרי קמפינג מומלצים</h2>
                <p>גלו את המקומות הטובים ביותר לחוויית קמפינג בלתי נשכחת</p>
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              {campingSpots.length > 0 ? (
                <div className={styles.campingGrid}>
                  {campingSpots.map((spot) => (
                    <CampingCard
                      key={spot.id || spot.camping_location_name}
                      id={spot.id}
                      camping_location_name={spot.camping_location_name}
                      camping_img={spot.camping_img}
                      camping_description={spot.camping_description}
                      camping_duration={spot.camping_duration}
                      full_texts={spot.full_texts}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p>No camping spots found</p>
                </div>
              )}
            </div>
          </section>

          {/* Tips Section */}
          <section className={styles.tipsSection}>
            <div className={styles.container}>
              <div className={styles.sectionTitle}>
                <h2>טיפים לקמפינג מוצלח</h2>
                <p>היערכו כראוי לחוויית קמפינג מושלמת</p>
              </div>

              <div className={styles.tipsGrid}>
                <div className={styles.tipCard}>
                  <div className={styles.tipNumber}>03</div>
                  <h3>אריזה חכמה</h3>
                  <p>ארזו ביגוד מתאים למזג האוויר, ציוד איכותי ואוכל מזין</p>
                </div>
                <div className={styles.tipCard}>
                  <div className={styles.tipNumber}>02</div>
                  <h3>בטיחות קודם כל</h3>
                  <p>הכירו את כללי הבטיחות באזור והצטיידו בערכת עזרה ראשונה</p>
                </div>
                <div className={styles.tipCard}>
                  <div className={styles.tipNumber}>01</div>
                  <h3>שמירה על הסביבה</h3>
                  <p>קחו את כל הפסולת איתכם ושמרו על הטבע למען הדורות הבאים</p>
                </div>
              </div>
            </div>
          </section>

          {/* Gallery Section */}
          <section className={styles.gallerySection}>
            <div className={styles.container}>
              <div className={styles.sectionTitle}>
                <h2>גלריית תמונות</h2>
              </div>

              <div className={styles.galleryGrid}>
                <div className={styles.galleryItem}>
                  <img
                    className={styles.galleryImage}
                    src="  http://localhost:5000/uploads/campingdesign/1.jpg "
                    alt="קמפינג בטבע"
                  />
                </div>
                <div className={styles.galleryItem}>
                  <img
                    className={styles.galleryImage}
                    src="http://localhost:5000/uploads/campingdesign/2.jpg"
                    alt="אוהל בטבע"
                  />
                </div>
                <div className={styles.galleryItem}>
                  <img
                    className={styles.galleryImage}
                    src="http://localhost:5000/uploads/campingdesign/3.jpg"
                    alt="מדורה בלילה"
                  />
                </div>
                <div className={styles.galleryItem}>
                  <img
                    className={styles.galleryImage}
                    src="  http://localhost:5000/uploads/campingdesign/4.jpg"
                    alt="נוף הרים"
                  />
                </div>
                <div className={styles.galleryItem}>
                  <img
                    className={styles.galleryImage}
                    src="http://localhost:5000/uploads/campingdesign/5.jpg"
                    alt="אגם"
                  />
                </div>
                <div className={styles.galleryItem}>
                  <img
                    className={styles.galleryImage}
                    src="http://localhost:5000/uploads/campingdesign/6.jpg"
                    alt="זריחה בקמפינג"
                  />
                </div>
              </div>
            </div>
          </section>


          
          {/* Camping Information CTA */}
          <section className={styles.premiumCtaSection}>
            <div className={styles.ctaBackgroundImage}></div>
            <div className={styles.ctaOverlay}></div>
            <div className={styles.container}>
              <div className={styles.premiumCtaContent}>
                <h2 className={styles.ctaTitle}>
                  הכי קרוב לשקט, הכי קרוב לעצמך
                </h2>
                <p className={styles.ctaDescription}>
                  לילות מתחת לכוכבים, ימים מול נופים פתוחים. קמפינג בישראל זה
                  יותר מחופשה — זו דרך חיים. כאן תמצאי מקומות קסומים, חניוני
                  לילה, אטרקציות קרובות ונוף שמחבק.
                </p>
                <div className={styles.ctaFeatures}>
                  <div className={styles.ctaFeature}>
                    <div className={styles.ctaFeatureIcon}>
                      <FaMapMarkerAlt />
                    </div>
                    <div className={styles.ctaFeatureText}>
                      מפות אתרי קמפינג
                    </div>
                  </div>
                  <div className={styles.ctaFeature}>
                    <div className={styles.ctaFeatureIcon}>
                      <FaMountain />
                    </div>
                    <div className={styles.ctaFeatureText}>
                      מסלולי טיול סמוכים
                    </div>
                  </div>
                  <div className={styles.ctaFeature}>
                    <div className={styles.ctaFeatureIcon}>
                      <FaWater />
                    </div>
                    <div className={styles.ctaFeatureText}>
                      מקורות מים באזור
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.ctaImageContainer}>
                <img
                  src="https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=600&q=80"
                  alt="מידע על קמפינג בישראל"
                  className={styles.ctaImage}
                />
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Camping;
