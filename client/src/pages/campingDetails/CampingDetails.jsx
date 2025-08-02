import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCampingByName } from "../../services/api";
import styles from "./campingDetails.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faClock, faMapMarkedAlt, faTree, faWater, 
  faShieldAlt, faParking, faDog, faHeart, 
  faUtensils, faMoneyBillWave, faCompass, faSun 
} from "@fortawesome/free-solid-svg-icons";

const CampingDetails = () => {
  const { camping_location_name } = useParams();
  const [camping, setCamping] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCamping = async () => {
      try {
        setIsLoading(true);
        const data = await getCampingByName(camping_location_name);
        setCamping(data);
      } catch (error) {
        console.error("Error fetching camping details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCamping();
  }, [camping_location_name]);

  if (isLoading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>טוען פרטי קמפינג...</p>
    </div>
  );

  if (!camping) return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <p>לא נמצאו פרטי קמפינג</p>
    </div>
  );

  return (
    <div className={styles.pageContainer}>
      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroImage} 
          style={{
            backgroundImage: camping.camping_img ? 
              `url(http://localhost:5000/uploads/camping/${camping.camping_img})` : 
              'url(https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1170&q=80)'
          }}
        ></div>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>{camping.camping_location_name}</h1>
          <div className={styles.locationBadge}>
            <FontAwesomeIcon icon={faMapMarkedAlt} />
            <span>{camping.camping_location || 'ישראל'}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.contentContainer}>
        {/* Feature Cards */}
        <div className={styles.featureCards}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <FontAwesomeIcon icon={faClock} className={styles.featureIcon} />
            </div>
            <div className={styles.featureContent}>
              <h3>משך הקמפינג</h3>
              <p>{camping.camping_duration || 'לא צוין'}</p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <FontAwesomeIcon icon={faTree} className={styles.featureIcon} />
            </div>
            <div className={styles.featureContent}>
              <h3>סביבה</h3>
              <p>{camping.camping_environment || 'טבעי'}</p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <FontAwesomeIcon icon={faWater} className={styles.featureIcon} />
            </div>
            <div className={styles.featureContent}>
              <h3>גישה למים</h3>
              <p>{camping.water_access ? 'זמין' : 'לא זמין'}</p>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>על המקום</h2>
          <div className={styles.sectionContent}>
            <p>{camping.camping_description}</p>
          </div>
        </div>

        {/* Amenities Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>מתקנים ושירותים</h2>
          <div className={styles.amenitiesGrid}>
            <div className={`${styles.amenityItem} ${camping.accessibility ? styles.available : styles.unavailable}`}>
              <div className={styles.amenityIconWrapper}>
                <FontAwesomeIcon icon={faShieldAlt} className={styles.amenityIcon} />
              </div>
              <span>נגישות</span>
            </div>
            <div className={`${styles.amenityItem} ${camping.parking ? styles.available : styles.unavailable}`}>
              <div className={styles.amenityIconWrapper}>
                <FontAwesomeIcon icon={faParking} className={styles.amenityIcon} />
              </div>
              <span>חניה</span>
            </div>
            <div className={`${styles.amenityItem} ${camping.pet_friendly ? styles.available : styles.unavailable}`}>
              <div className={styles.amenityIconWrapper}>
                <FontAwesomeIcon icon={faDog} className={styles.amenityIcon} />
              </div>
              <span>ידידותי לחיות</span>
            </div>
            <div className={`${styles.amenityItem} ${camping.romantic ? styles.available : styles.unavailable}`}>
              <div className={styles.amenityIconWrapper}>
                <FontAwesomeIcon icon={faHeart} className={styles.amenityIcon} />
              </div>
              <span>רומנטי</span>
            </div>
            <div className={`${styles.amenityItem} ${camping.services ? styles.available : styles.unavailable}`}>
              <div className={styles.amenityIconWrapper}>
                <FontAwesomeIcon icon={faUtensils} className={styles.amenityIcon} />
              </div>
              <span>שירותים</span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>מידע נוסף</h2>
          <div className={styles.infoGrid}>
            {camping.camping_price && (
              <div className={styles.infoItem}>
                <div className={styles.infoIconWrapper}>
                  <FontAwesomeIcon icon={faMoneyBillWave} className={styles.infoIcon} />
                </div>
                <div className={styles.infoContent}>
                  <h4>מחיר:</h4>
                  <p>{camping.camping_price} ₪</p>
                </div>
              </div>
            )}
            {camping.camping_region && (
              <div className={styles.infoItem}>
                <div className={styles.infoIconWrapper}>
                  <FontAwesomeIcon icon={faCompass} className={styles.infoIcon} />
                </div>
                <div className={styles.infoContent}>
                  <h4>אזור:</h4>
                  <p>{camping.camping_region}</p>
                </div>
              </div>
            )}
            <div className={styles.infoItem}>
              <div className={styles.infoIconWrapper}>
                <FontAwesomeIcon icon={faSun} className={styles.infoIcon} />
              </div>
              <div className={styles.infoContent}>
                <h4>עונה מומלצת:</h4>
                <p>{camping.recommended_season || 'כל השנה'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampingDetails;
