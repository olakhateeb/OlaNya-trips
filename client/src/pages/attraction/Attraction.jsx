import React, { useEffect, useState } from "react";
import { axiosInstance } from "../../services/api";
import AttractionCard from "../../components/attractionCard/AttractionCard";
import styles from "./attraction.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCompass, faMapMarkedAlt, faTicketAlt, faStar } from '@fortawesome/free-solid-svg-icons';
import { faWater, faTree, faLandmark, faCity, faHiking, faUmbrellaBeach } from "@fortawesome/free-solid-svg-icons";

const Attractions = () => {
  const [attractions, setAttractions] = useState([]);
  const [attractionsByType, setAttractionsByType] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeType, setActiveType] = useState("all");

  useEffect(() => {
    const fetchAttractions = async () => {
      try {
        const response = await axiosInstance.get("/attractions");
        const data = response.data.map((attr) => {
          const image = attr.attraction_img?.split(",")[0];
          const imageUrl = image
            ? `http://localhost:5000/uploads/attractions/${image}`
            : "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1170&q=80";
          return { ...attr, attraction_img: imageUrl };
        });

        const groupedByType = data.reduce((acc, attraction) => {
          const type = attraction.attraction_type?.trim() || "other";
          if (!acc[type]) {
            acc[type] = [];
          }
          acc[type].push(attraction);
          return acc;
        }, {});
        
        // Get all unique attraction types from the data
        const uniqueAttractionTypes = [...new Set(data.map(attr => attr.attraction_type?.trim() || "other"))];

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

  const attractionTypes = Object.keys(attractionsByType).sort();

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
        
        <div className={styles.trailWrapper}>
          <div className={styles.featuredBadge}>אטרקציות מומלצות</div>
          <div className={styles.imageTrail}>
            {attractions.slice(0, 5).map((attraction, index) => {
              // Array of predefined image URLs for the trail
              const defaultImages = [
                "http://localhost:5000/uploads/attractions/img-attraction06.jpg",
                "http://localhost:5000/uploads/attractions/img-attraction09.jpg",
                "http://localhost:5000/uploads/attractions/img-attraction03.jpg",
                "http://localhost:5000/uploads/attractions/img-attraction04.jpg",
                "http://localhost:5000/uploads/attractions/img-attraction17.jpg"
              ];
              
              return (
                <div key={index} className={styles.trailImage} style={{animationDelay: `${index * 0.2}s`}}>
                  <img 
                    src={attraction.image_url || defaultImages[index]} 
                    alt={attraction.name} 
                  />
                  <div className={styles.imageOverlay}>
                    <span className={styles.imageName}>{attraction.name}</span>
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
                    <FontAwesomeIcon icon={faCompass} className={styles.filterIcon} />
                  </div>
                  <span className={styles.filterLabel}>כל האטרקציות</span>
                </button>
                
                {/* Dynamically generate filter tabs based on attraction types */}
                {Object.keys(attractionsByType)
                  .filter(type => type !== "other")
                  .map((type, index) => {
                    // Map attraction types to appropriate icons
                    let icon;
                    switch(type.toLowerCase()) {
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
                          <FontAwesomeIcon icon={icon} className={styles.filterIcon} />
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
                  key={attr.attraction_id || `attr-${i}`}
                >
                  <AttractionCard
                    attraction_id={attr.attraction_id}
                    attraction_name={attr.attraction_name}
                    attraction_img={attr.attraction_img}
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
