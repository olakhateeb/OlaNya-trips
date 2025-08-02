import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./tripDetails.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock, faGlobe, faMapMarkedAlt, faCalendarAlt, faLeaf,
  faUsers, faRoute, faInfoCircle, faImages, faMapSigns, faMountain
} from "@fortawesome/free-solid-svg-icons";

function TripDetails() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/trips/${id}`);
        setTrip(res.data);
      } catch (err) {
        setError("אירעה שגיאה בטעינת פרטי הטיול.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [id]);

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}>
        <div></div><div></div><div></div><div></div>
      </div>
      <p>טוען פרטי טיול...</p>
    </div>
  );
  
  if (error) return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <p>{error}</p>
    </div>
  );
  
  if (!trip) return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <p>טיול לא נמצא</p>
    </div>
  );

  // טיפול במספר תמונות מופרדות בפסיקים
  const imageNames = trip.trip_img
    ? trip.trip_img.split(",").map((img) => img.trim())
    : [];

  // הגבלת אורך התיאור לתצוגה מקוצרת
  const shortDescription = trip.trip_description && trip.trip_description.length > 150 
    ? `${trip.trip_description.substring(0, 150)}...` 
    : trip.trip_description;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.tripHeader}>
        <div className={styles.tripNameWrapper}>
          <h1 className={styles.tripName}>{trip.trip_name}</h1>
          {trip.trip_location && (
            <div className={styles.tripLocation}>
              <FontAwesomeIcon icon={faMapSigns} />
              <span>{trip.trip_location}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.mainContent}>
        <div className={styles.leftColumn}>
          {/* גלריית תמונות */}
          <div className={styles.imageGallery}>
            <div className={styles.mainImageContainer}>
              {imageNames.length > 0 ? (
                <img 
                  src={`http://localhost:5000/uploads/trips/${imageNames[activeImageIndex]}`}
                  alt={trip.trip_name}
                  className={styles.mainImage}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/800x500";
                  }}
                />
              ) : (
                <div className={styles.noImage}>
                  <FontAwesomeIcon icon={faMountain} />
                  <span>אין תמונות להציג</span>
                </div>
              )}
            </div>
            
            {imageNames.length > 1 && (
              <div className={styles.thumbnailStrip}>
                {imageNames.map((img, index) => (
                  <div 
                    key={index} 
                    className={`${styles.thumbnail} ${index === activeImageIndex ? styles.activeThumbnail : ''}`}
                    onClick={() => setActiveImageIndex(index)}
                  >
                    <img
                      src={`http://localhost:5000/uploads/trips/${img}`}
                      alt={`תמונה ${index + 1}`}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/100x100";
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* תיאור הטיול */}
          <div className={styles.tripDescription}>
            <h2>
              <FontAwesomeIcon icon={faInfoCircle} />
              <span>תיאור הטיול</span>
            </h2>
            <div className={styles.descriptionContent}>
              <p>
                {showFullDescription ? trip.trip_description : shortDescription}
                {trip.trip_description && trip.trip_description.length > 150 && (
                  <button 
                    className={styles.readMoreBtn}
                    onClick={() => setShowFullDescription(!showFullDescription)}
                  >
                    {showFullDescription ? 'הצג פחות' : 'קרא עוד'}
                  </button>
                )}
              </p>
            </div>
          </div>
          
          {/* טיפים לטיול */}
          {trip.trip_tips && (
            <div className={styles.tripTips}>
              <h2>
                <FontAwesomeIcon icon={faLeaf} />
                <span>טיפים לטיול</span>
              </h2>
              <div className={styles.tipsContent}>
                <p>{trip.trip_tips}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.rightColumn}>
          {/* כרטיס מידע */}
          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <FontAwesomeIcon icon={faGlobe} />
              <h2>פרטי הטיול</h2>
            </div>
            
            <div className={styles.infoList}>
              {trip.trip_duration && (
                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>
                    <FontAwesomeIcon icon={faClock} />
                  </div>
                  <div className={styles.infoText}>
                    <span className={styles.infoLabel}>משך הטיול</span>
                    <span className={styles.infoValue}>{trip.trip_duration}</span>
                  </div>
                </div>
              )}
              
              {trip.trip_type && (
                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>
                    <FontAwesomeIcon icon={faRoute} />
                  </div>
                  <div className={styles.infoText}>
                    <span className={styles.infoLabel}>סוג טיול</span>
                    <span className={styles.infoValue}>{trip.trip_type}</span>
                  </div>
                </div>
              )}
              
              {trip.suitable_for && (
                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>
                    <FontAwesomeIcon icon={faUsers} />
                  </div>
                  <div className={styles.infoText}>
                    <span className={styles.infoLabel}>מתאים ל</span>
                    <span className={styles.infoValue}>{trip.suitable_for}</span>
                  </div>
                </div>
              )}
              
              {trip.difficulty_level && (
                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>
                    <FontAwesomeIcon icon={faMountain} />
                  </div>
                  <div className={styles.infoText}>
                    <span className={styles.infoLabel}>רמת קושי</span>
                    <span className={styles.infoValue}>{trip.difficulty_level}</span>
                  </div>
                </div>
              )}
              
              {trip.best_season && (
                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>
                    <FontAwesomeIcon icon={faCalendarAlt} />
                  </div>
                  <div className={styles.infoText}>
                    <span className={styles.infoLabel}>עונה מומלצת</span>
                    <span className={styles.infoValue}>{trip.best_season}</span>
                  </div>
                </div>
              )}
              
              {trip.accessibility && (
                <div className={styles.infoItem}>
                  <div className={styles.infoIcon}>
                    <FontAwesomeIcon icon={faMapMarkedAlt} />
                  </div>
                  <div className={styles.infoText}>
                    <span className={styles.infoLabel}>נגישות</span>
                    <span className={styles.infoValue}>{trip.accessibility}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* כרטיס נוסף למידע נוסף אם יש */}
          {(trip.additional_info || trip.contact_info) && (
            <div className={styles.additionalCard}>
              <div className={styles.infoCardHeader}>
                <FontAwesomeIcon icon={faInfoCircle} />
                <h2>מידע נוסף</h2>
              </div>
              
              <div className={styles.additionalContent}>
                {trip.additional_info && <p>{trip.additional_info}</p>}
                {trip.contact_info && (
                  <div className={styles.contactInfo}>
                    <h3>פרטי יצירת קשר</h3>
                    <p>{trip.contact_info}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TripDetails;
