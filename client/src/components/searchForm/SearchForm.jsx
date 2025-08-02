import React, { useState } from "react";
import styles from "./searchForm.module.css";
import { 
  FaWheelchair, FaParking, FaMapMarkerAlt, FaToilet, FaHeart, FaDog,
  FaSwimmingPool, FaMountain, FaTree, FaUtensils, FaBaby, FaUmbrellaBeach,
  FaCampground, FaHiking, FaBicycle, FaWater, FaShuttleVan, FaMapSigns
} from "react-icons/fa";

const SearchForm = ({ onSearch }) => {
  const [likesWater, setLikesWater] = useState(false);
  const [tripType, setTripType] = useState("any");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [region, setRegion] = useState("");
  const [isAccessible, setIsAccessible] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [hasServices, setHasServices] = useState(false);
  const [isRomantic, setIsRomantic] = useState(false);
  const [isPetFriendly, setIsPetFriendly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Additional filter options
  const [attractionType, setAttractionType] = useState("");
  const [hasFoodOptions, setHasFoodOptions] = useState(false);
  const [isKidFriendly, setIsKidFriendly] = useState(false);
  const [hasShade, setHasShade] = useState(false);
  const [hasGuidedTours, setHasGuidedTours] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Create search criteria object with string values for boolean fields
    // This ensures they are properly passed as query parameters
    const criteria = { 
      likesWater: likesWater.toString(), 
      tripType,
      location: location.trim(),
      duration: duration.trim(),
      region,
      isAccessible: isAccessible.toString(),
      hasParking: hasParking.toString(),
      hasServices: hasServices.toString(),
      isRomantic: isRomantic.toString(),
      isPetFriendly: isPetFriendly.toString(),
      // Add new filter options
      attractionType: attractionType.trim(),
      hasFoodOptions: hasFoodOptions.toString(),
      isKidFriendly: isKidFriendly.toString(),
      hasShade: hasShade.toString(),
      hasGuidedTours: hasGuidedTours.toString(),
      difficultyLevel: difficultyLevel.trim()
    };
    
    console.log('Search criteria:', criteria);
    
    // Send to parent component
    onSearch(criteria);
    
    // Simulate loading state for better UX
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} dir="rtl">
      <h2 className={styles.formTitle}>חיפוש מותאם אישית 🔍</h2>
      
      <div className={styles.formGroup}>
        <label htmlFor="location">שם המקום</label>
        <input
          type="text"
          id="location"
          className={styles.searchInput}
          placeholder="שם המקום"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className={styles.selectGroup}>
        <label htmlFor="tripType">סוג טיול:</label>
        <select
          id="tripType"
          value={tripType}
          onChange={(e) => setTripType(e.target.value)}
        >
          <option value="any">כל הסוגים</option>
          <option value="hiking">טיולי הליכה</option>
          <option value="camping">חניוני לילה</option>
          <option value="attraction">אטרקציות</option>
          <option value="nature">טבע</option>
          <option value="historical">אתרים היסטוריים</option>
          <option value="water">מים</option>
        </select>
      </div>

      <div className={styles.selectGroup}>
        <label htmlFor="region">אזור בארץ:</label>
        <select
          id="region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="">כל האזורים</option>
          <option value="צפון">צפון</option>
          <option value="מרכז">מרכז</option>
          <option value="דרום">דרום</option>
          <option value="ירושלים">ירושלים</option>
        </select>
      </div>

      <div className={styles.selectGroup}>
        <label htmlFor="duration">משך זמן:</label>
        <select
          id="duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        >
          <option value="">כל משך זמן</option>
          <option value="day">טיול יום</option>
          <option value="weekend">סוף שבוע (2-3 ימים)</option>
          <option value="week">שבוע (4-7 ימים)</option>
          <option value="long">טיול ארוך (8+ ימים)</option>
        </select>
      </div>
      
      {/* New dropdown for attraction type */}
      <div className={styles.selectGroup}>
        <label htmlFor="attractionType">סוג אטרקציה:</label>
        <select
          id="attractionType"
          value={attractionType}
          onChange={(e) => setAttractionType(e.target.value)}
        >
          <option value="">כל סוגי האטרקציות</option>
          <option value="ספורט מים">ספורט מים</option>
          <option value="מוזיאון">מוזיאון</option>
          <option value="טבע">טבע</option>
          <option value="היסטורי">היסטורי</option>
          <option value="אטרקציה">אטרקציה כללית</option>
        </select>
      </div>
      
      {/* New dropdown for difficulty level */}
      <div className={styles.selectGroup}>
        <label htmlFor="difficultyLevel">רמת קושי:</label>
        <select
          id="difficultyLevel"
          value={difficultyLevel}
          onChange={(e) => setDifficultyLevel(e.target.value)}
        >
          <option value="">כל רמות הקושי</option>
          <option value="קל">קל</option>
          <option value="בינוני">בינוני</option>
          <option value="מאתגר">מאתגר</option>
          <option value="קשה">קשה</option>
        </select>
      </div>

      <div className={styles.checkboxesContainer}>
        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="waterActivities"
            checked={likesWater}
            onChange={() => setLikesWater(!likesWater)}
          />
          <label htmlFor="waterActivities">
            <FaSwimmingPool className={styles.filterIcon} /> כולל פעילויות מים
          </label>
        </div>

        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="accessible"
            checked={isAccessible}
            onChange={() => setIsAccessible(!isAccessible)}
          />
          <label htmlFor="accessible">
            <FaWheelchair className={styles.filterIcon} /> נגיש לנכים
          </label>
        </div>

        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="parking"
            checked={hasParking}
            onChange={() => setHasParking(!hasParking)}
          />
          <label htmlFor="parking">
            <FaParking className={styles.filterIcon} /> חניה זמינה
          </label>
        </div>

        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="services"
            checked={hasServices}
            onChange={() => setHasServices(!hasServices)}
          />
          <label htmlFor="services">
            <FaToilet className={styles.filterIcon} /> שירותים במקום
          </label>
        </div>

        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="romantic"
            checked={isRomantic}
            onChange={() => setIsRomantic(!isRomantic)}
          />
          <label htmlFor="romantic">
            <FaHeart className={styles.filterIcon} /> מתאים לזוגות
          </label>
        </div>

        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="petFriendly"
            checked={isPetFriendly}
            onChange={() => setIsPetFriendly(!isPetFriendly)}
          />
          <label htmlFor="petFriendly">
            <FaDog className={styles.filterIcon} /> מתאים לחיות מחמד
          </label>
        </div>
        
        {/* New filter options */}
        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="foodOptions"
            checked={hasFoodOptions}
            onChange={() => setHasFoodOptions(!hasFoodOptions)}
          />
          <label htmlFor="foodOptions">
            <FaUtensils className={styles.filterIcon} /> אפשרויות אוכל
          </label>
        </div>
        
        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="kidFriendly"
            checked={isKidFriendly}
            onChange={() => setIsKidFriendly(!isKidFriendly)}
          />
          <label htmlFor="kidFriendly">
            <FaBaby className={styles.filterIcon} /> מתאים למשפחות וילדים
          </label>
        </div>
        
        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="shade"
            checked={hasShade}
            onChange={() => setHasShade(!hasShade)}
          />
          <label htmlFor="shade">
            <FaTree className={styles.filterIcon} /> אזורי צל
          </label>
        </div>
        
        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="guidedTours"
            checked={hasGuidedTours}
            onChange={() => setHasGuidedTours(!hasGuidedTours)}
          />
          <label htmlFor="guidedTours">
            <FaMapSigns className={styles.filterIcon} /> סיורים מודרכים
          </label>
        </div>
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? "מחפש..." : "חפש הרפתקאות"}
      </button>
    </form>
  );
};

export default SearchForm;
