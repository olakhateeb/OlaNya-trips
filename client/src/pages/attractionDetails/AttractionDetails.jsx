import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAttractionById } from "../../services/api";
import styles from "./attractionDetails.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBicycle, faWater, faLeaf, faChild, faTree, faMusic,
  faCampground, faUtensils, faFire, faBaby, faCar, faWheelchair,
  faDog, faHiking, faHeart, faSun, faMobile, faWalking, faCompass,
  faMapMarkerAlt, faPhone, faGlobe, faClock, faMoneyBillWave,
  faInfoCircle, faMapSigns, faBus, faParking, faSubway, faRoute,
  faArrowLeft, faLocationDot, faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';

const AttractionDetails = () => {
  const { id } = useParams();
  const [attraction, setAttraction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
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
        <button onClick={() => window.history.back()} className={styles.backButton}>
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
        <button onClick={() => window.history.back()} className={styles.backButton}>
          <FontAwesomeIcon icon={faArrowLeft} /> חזרה לאטרקציות
        </button>
      </div>
    );
  }

  // Process the attraction images
  const mainImage = attraction.attraction_img
    ? `http://localhost:5000/uploads/attractions/${attraction.attraction_img.split(',')[0]}`
    : "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80";

  // Create an array of images from the comma-separated string
  const allImages = attraction.attraction_img
    ? attraction.attraction_img.split(',').map(img => 
        `http://localhost:5000/uploads/attractions/${img.trim()}`
      )
    : ["https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80"];

  // Sample data for the attraction details
  const features = [
    { icon: faTree, text: "שטחים ירוקים" },
    { icon: faWater, text: "אגם" },
    { icon: faBicycle, text: "שבילי אופניים" },
    { icon: faChild, text: "מתקני משחקים" },
    { icon: faUtensils, text: "מסעדות" },
    { icon: faCampground, text: "פיקניק" },
    { icon: faLeaf, text: "גני פרחים" },
    { icon: faHiking, text: "מסלולי הליכה" }
  ];
  
  const importantInfo = [
    { icon: faClock, text: "פתוח 24/7", isAvailable: true },
    { icon: faMoneyBillWave, text: "כניסה חופשית", isAvailable: true },
    { icon: faParking, text: "חניה זמינה", isAvailable: true },
    { icon: faWheelchair, text: "נגישות לנכים", isAvailable: true },
    { icon: faDog, text: "מותר להביא כלבים", isAvailable: true },
    { icon: faUtensils, text: "מזנונים", isAvailable: true },
    { icon: faFire, text: "מנגל מותר באזורים מסוימים", isAvailable: true },
    { icon: faBaby, text: "שירותי החתלה", isAvailable: false }
  ];
  
  const gettingThere = [
    { icon: faBus, text: "קווי אוטובוס 4, 104, 204 מגיעים לכניסה הראשית" },
    { icon: faSubway, text: "תחנת רכבת אוניברסיטה במרחק הליכה" },
    { icon: faParking, text: "חניונים זמינים בכניסות הראשיות לפארק" },
    { icon: faRoute, text: "ניתן להגיע דרך שביל האופניים לאורך הירקון" }
  ];
  
  const tips = [
    { icon: faSun, text: "בקיץ מומלץ להגיע בשעות הבוקר המוקדמות או לקראת ערב" },
    { icon: faWater, text: "הביאו מספיק מים, במיוחד בימים חמים" },
    { icon: faMapSigns, text: "בכניסות לפארק יש מפות שיעזרו לכם להתמצא" },
    { icon: faHeart, text: "אל תפספסו את גן הסלעים והמפל בחלק המזרחי" }
  ];

  return (
    <div className={styles.detailsPage}>
      {/* Hero Header */}
      <div className={styles.detailsHeader} style={{ backgroundImage: `url(${mainImage})` }}>
        <div className={styles.headerOverlay}></div>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{attraction.attraction_name}</h1>
          <div className={styles.subtitle}>
            <FontAwesomeIcon icon={faLocationDot} className={styles.subtitleIcon} />
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
                src={allImages[activeImageIndex]} 
                alt={attraction.attraction_name} 
                className={styles.mainImage} 
              />
            </div>
            <div className={styles.thumbnailsContainer}>
              {allImages.map((image, index) => (
                <div 
                  key={index} 
                  className={`${styles.thumbnail} ${index === activeImageIndex ? styles.activeThumbnail : ''}`}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <img src={image} alt={`תמונה ${index + 1}`} />
                </div>
              ))}
            </div>
          </div>
          
          {/* Description Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <FontAwesomeIcon icon={faInfoCircle} className={styles.titleIcon} />
              אודות המקום
            </h2>
            <div className={styles.cardContent}>
              <p className={styles.description}>{attraction.attraction_description}</p>
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
                      <FontAwesomeIcon icon={feature.icon} className={styles.featureIcon} />
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
              <FontAwesomeIcon icon={faMapMarkerAlt} className={styles.titleIcon} />
              מיקום
            </h2>
            <div className={styles.cardContent}>
              <div className={styles.mapContainer}>
                <iframe 
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(attraction.attraction_name + ' ' + (attraction.attraction_location || 'ישראל'))}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
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
              <FontAwesomeIcon icon={faInfoCircle} className={styles.titleIcon} />
              מידע שימושי
            </h2>
            <div className={styles.cardContent}>
              <div className={styles.infoGrid}>
                {importantInfo.map((info, index) => (
                  <div 
                    key={index} 
                    className={`${styles.infoItem} ${info.isAvailable ? styles.available : styles.unavailable}`}
                  >
                    <div className={styles.infoIconWrapper}>
                      <FontAwesomeIcon icon={info.icon} className={styles.infoIcon} />
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
                      <FontAwesomeIcon icon={item.icon} className={styles.directionIcon} />
                    </div>
                    <span className={styles.directionText}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Tips Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <FontAwesomeIcon icon={faHeart} className={styles.titleIcon} />
              טיפים מאיתנו
            </h2>
            <div className={styles.cardContent}>
              <div className={styles.tipsList}>
                {tips.map((tip, index) => (
                  <div key={index} className={styles.tipItem}>
                    <div className={styles.tipIconWrapper}>
                      <FontAwesomeIcon icon={tip.icon} className={styles.tipIcon} />
                    </div>
                    <span className={styles.tipText}>{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Back Button */}
      <div className={styles.backButtonContainer}>
        <button onClick={() => window.history.back()} className={styles.backButton}>
          <FontAwesomeIcon icon={faArrowLeft} /> חזרה לאטרקציות
        </button>
      </div>
    </div>
  );
};

export default AttractionDetails;
