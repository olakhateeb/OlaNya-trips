// src/pages/trips/Trips.jsx
import React, { useEffect, useState } from "react";
import { axiosInstance } from "../../services/api";
import { useNavigate } from "react-router-dom";
import TripsCard from "../../components/tripsCard/TripsCard";
import styles from "./trips.module.css";
import ImgUpload from "../../components/imgUpload/ImgUpload";
import ParticleTextEffect from "../../components/ParticleTextEffect/ParticleTextEffect";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGift,
  faCompass,
  faMountain,
  faLeaf,
  faLocationDot,
  faRoute,
  faChevronDown,
  faWater,
  faHiking,
  faCity,
  faLandmark,
  faTree,
  faUmbrellaBeach,
} from "@fortawesome/free-solid-svg-icons";
const Trips = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [tripsByType, setTripsByType] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [previousType, setPreviousType] = useState(null);

  const handleImageUploaded = (imagePath) => {
    console.log("Image uploaded successfully:", imagePath);
    // You can add additional logic here, such as refreshing the trips list
    // or adding the new image to a specific trip
  };

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const response = await axiosInstance.get("/trips");
        console.log("API Response:", response.data); // Debug log

        // Handle different response formats
        let tripsArray = [];
        if (response.data.trips) {
          tripsArray = response.data.trips;
        } else if (Array.isArray(response.data)) {
          tripsArray = response.data;
        } else {
          console.warn("Unexpected response format:", response.data);
          tripsArray = [];
        }

        const data = tripsArray.map((trip) => {
          const image = trip.trip_img?.split(",")[0]?.trim();

          // Use the actual trip_type from database
          let normalizedType = trip.trip_type || "other";

          // Make sure we have a consistent key for filtering
          normalizedType = normalizedType.trim();

          // Let TripsCard resolve the final image URL
          return { ...trip, trip_img: image, normalized_type: normalizedType };
        });

        // Group trips by normalized type
        const groupedByType = data.reduce((acc, trip) => {
          const type = trip.normalized_type;
          if (!acc[type]) {
            acc[type] = [];
          }
          acc[type].push(trip);
          return acc;
        }, {});

        // Get all unique trip types from the data
        const uniqueTripTypes = [
          ...new Set(data.map((trip) => trip.trip_type?.trim() || "other")),
        ];

        // Make sure all trip types exist in our grouped data, even if empty
        uniqueTripTypes.forEach((category) => {
          if (!groupedByType[category]) {
            groupedByType[category] = [];
          }
        });

        setTrips(data);
        setTripsByType(groupedByType);
        setError(null);
      } catch (err) {
        console.error("Error loading trips:", err);
        setError("Failed to load trips");
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  // Get all unique trip types for the filter tabs
  const tripTypes = Object.keys(tripsByType).sort();

  const getDisplayedTrips = () => {
    if (!activeType || activeType === "all") {
      return trips;
    }
    return tripsByType[activeType] || [];
  };

  if (loading)
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p className={styles.loadingText}>Loading trips...</p>
      </div>
    );

  return (
    <div className={styles.tripsPage}>
      <ParticleTextEffect />
      <div className={styles.hero}>
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <div className={styles.circleFilters}>
            <button
              className={`${styles.circleFilter} ${
                activeType === "all" || !activeType ? styles.active : ""
              } ${previousType === "all" ? styles.returning : ""}`}
              onClick={() => {
                setPreviousType(activeType);
                setActiveType("all");
              }}
              data-position="12"
            >
              <FontAwesomeIcon icon={faCompass} className={styles.filterIcon} />
              <span>הכל</span>
            </button>

            <button
              className={`${styles.circleFilter} ${
                activeType === "טבע" ? styles.active : ""
              } ${previousType === "טבע" ? styles.returning : ""}`}
              onClick={() => {
                setPreviousType(activeType);
                setActiveType("טבע");
              }}
              data-position="2"
            >
              <FontAwesomeIcon icon={faTree} className={styles.filterIcon} />
              <span>טבע</span>
            </button>

            <button
              className={`${styles.circleFilter} ${
                activeType === "מים" ? styles.active : ""
              } ${previousType === "מים" ? styles.returning : ""}`}
              onClick={() => {
                setPreviousType(activeType);
                setActiveType("מים");
              }}
              data-position="4"
            >
              <FontAwesomeIcon icon={faWater} className={styles.filterIcon} />
              <span>מים</span>
            </button>

            <button
              className={`${styles.circleFilter} ${
                activeType === "טבע ומים" ? styles.active : ""
              } ${previousType === "טבע ומים" ? styles.returning : ""}`}
              onClick={() => {
                setPreviousType(activeType);
                setActiveType("טבע ומים");
              }}
              data-position="6"
            >
              <FontAwesomeIcon
                icon={faUmbrellaBeach}
                className={styles.filterIcon}
              />
              <span>טבע ומים</span>
            </button>

            <button
              className={`${styles.circleFilter} ${
                activeType === "אתרים ארכיאולוגיים" ? styles.active : ""
              } ${
                previousType === "אתרים ארכיאולוגיים" ? styles.returning : ""
              }`}
              onClick={() => {
                setPreviousType(activeType);
                setActiveType("אתרים ארכיאולוגיים");
              }}
              data-position="8"
            >
              <FontAwesomeIcon
                icon={faLandmark}
                className={styles.filterIcon}
              />
              <span>אתרים ארכיאולוגיים</span>
            </button>

            <button
              className={`${styles.circleFilter} ${
                activeType === "מסלולים בעיר" ? styles.active : ""
              } ${previousType === "מסלולים בעיר" ? styles.returning : ""}`}
              onClick={() => {
                setPreviousType(activeType);
                setActiveType("מסלולים בעיר");
              }}
              data-position="10"
            >
              <FontAwesomeIcon icon={faCity} className={styles.filterIcon} />
              <span>מסלולים בעיר</span>
            </button>

            <button
              className={`${styles.circleFilter} ${
                activeType === "הליכה" ? styles.active : ""
              } ${previousType === "הליכה" ? styles.returning : ""}`}
              onClick={() => {
                setPreviousType(activeType);
                setActiveType("הליכה");
              }}
              data-position="12"
            >
              <FontAwesomeIcon icon={faHiking} className={styles.filterIcon} />
              <span>הליכה</span>
            </button>
          </div>
          <div className={styles.line}></div>
          <a href="#trips-grid" className={styles.scrollIndicator}>
            <FontAwesomeIcon icon={faChevronDown} />
          </a>
        </div>
      </div>

      <div className={styles.gridContainer} id="trips-grid">
        {error && <div className={styles.error}>{error}</div>}

        {activeType && (
          <div className={styles.selectedTypeTitle}>
            <h2>{activeType === "all" ? "כל הטיולים" : activeType}</h2>
            <div className={styles.selectedTypeLine}></div>
          </div>
        )}

        {trips.length > 0 ? (
          <>
            <div className={styles.grid}>
              {getDisplayedTrips().map((trip, i) => (
                <div
                  className={styles.cardWrapper}
                  key={trip._id || trip.trip_id || `trip-${i}`}
                >
                  <TripsCard {...trip} />
                </div>
              ))}
            </div>
            {getDisplayedTrips().length === 0 && (
              <div className={styles.empty}>אין טיולים מסוג זה להצגה כרגע</div>
            )}
          </>
        ) : (
          <div className={styles.empty}>אין טיולים להצגה כרגע</div>
        )}
        <ImgUpload onImageUploaded={handleImageUploaded} />
      </div>
      <div className={styles.surpriseSection} id="surprise-trip">
        <span className={styles.surpriseBadge}>Special</span>
        <h2 className={styles.surpriseTitle}>Discover Your Next Adventure</h2>
        <p className={styles.surpriseDescription}>
          Can't decide where to go? Let us surprise you with a handpicked
          destination that matches your sense of adventure.
        </p>
        <a href="/surprise" className={styles.surpriseButton}>
          <FontAwesomeIcon icon={faGift} />
          Surprise Trip
        </a>
      </div>
    </div>
  );
};

export default Trips;
