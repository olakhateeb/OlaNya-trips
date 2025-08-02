import React, { useState, useEffect } from 'react';
import axios from "axios";
import styles from './surpriseTrip.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCompass,
  faCheck,
  faUsers,
  faMapMarkedAlt,
  faMountain,
  faGift,
  faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FaPlane, FaRegClock, FaRegSurprise } from 'react-icons/fa';

function SurpriseTripView() {
  const user = JSON.parse(localStorage.getItem("user"));
  const travelerId = user?.userName; // אם אתה רוצה לפי idNumber תעדכן כאן

  const [participants, setParticipants] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [formAnswers, setFormAnswers] = useState({
    style: "",
    activity: "",
    groupType: "",
  });
  
  const [animateIn, setAnimateIn] = useState(false);
  
  useEffect(() => {
    setAnimateIn(true);
  }, []);

  const handleSurpriseTrip = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("http://localhost:5000/api/surprise-trip", {
        travelerId,
        participantsNum: participants,
        preferences: formAnswers,
      });
      console.log("🎉 Response:", res.data);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError("משהו השתבש. נסה שוב.");
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.decorShape1}></div>
      <div className={styles.decorShape2}></div>
      <div className={styles.decorShape3}></div>
      <div className={styles.mainContent}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBadge}>
              <span className={styles.headerIcon}>
                <FaPlane />
              </span>
            </div>
            <h1 className={styles.title}>טיול הפתעה</h1>
            <p className={styles.subtitle}>ספרו לנו מה אתם מחפשים ואנחנו נמצא לכם את החופשה המושלמת</p>
          </div>

          {/* ✅ הצגת תוצאה */}
          {result && (
            <div className={styles.result}>
              <div className={styles.successIcon}>
                <FontAwesomeIcon icon={faCheck} />
              </div>
              <h3>הטיול נוצר בהצלחה!</h3>
              <div className={styles.resultDetails}>
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>מספר הזמנה:</span>
                  <span className={styles.resultValue}>{result.orderId}</span>
                </div>
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>נהג מלווה:</span>
                  <span className={styles.resultValue}>{result.driver?.name}</span>
                </div>
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>מספר טלפון:</span>
                  <span className={styles.resultValue}>{result.driver?.phone}</span>
                </div>
              </div>
              <div className={styles.confetti}></div>
            </div>
          )}

          {/* ⏳ בזמן טעינה */}
          {loading && (
            <div className={styles.loading}>
              <div className={styles.loadingSpinner}></div>
              <p className={styles.loadingText}>מחפשים את החופשה המושלמת עבורך</p>
            </div>
          )}

          {/* ❌ הודעת שגיאה */}
          {error && (
            <div className={styles.error}>
              {error}
              <span className={styles.errorIcon}><FontAwesomeIcon icon={faExclamationCircle} /></span>
            </div>
          )}

          {/* 🧾 טופס שאלון */}
          {!result && !loading && showForm ? (
            <form
              className={styles.formContainer}
              onSubmit={(e) => {
                e.preventDefault();
                handleSurpriseTrip();
              }}
            >
              <div className={styles.formProgress}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div className={styles.formContent}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <FontAwesomeIcon icon={faUsers} className={styles.inputIcon} />
                    מספר משתתפים
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="number"
                      className={styles.input}
                      value={participants}
                      onChange={(e) => setParticipants(Number(e.target.value))}
                      min={1}
                      max={10}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <FontAwesomeIcon icon={faMapMarkedAlt} className={styles.inputIcon} />
                    סגנון הטיול המועדף
                  </label>
                  <div className={styles.inputWrapper}>
                    <select
                      className={styles.select}
                      value={formAnswers.style}
                      onChange={(e) =>
                        setFormAnswers({ ...formAnswers, style: e.target.value })
                      }
                      required
                    >
                      <option value="">בחר סגנון</option>
                      <option value="מים">מים</option>
                      <option value="טבע">טבע</option>
                      <option value="אתרים ארכיאולוגיים">אתרים ארכיאולוגיים</option>
                      <option value="מסלולים בעיר">מסלולים בעיר</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <FontAwesomeIcon icon={faMountain} className={styles.inputIcon} />
                    סוג פעילות מועדף
                  </label>
                  <div className={styles.inputWrapper}>
                    <select
                      className={styles.select}
                      value={formAnswers.activity}
                      onChange={(e) =>
                        setFormAnswers({ ...formAnswers, activity: e.target.value })
                      }
                      required
                    >
                      <option value="">בחר פעילות</option>
                      <option value="טיול רגלי">טיול רגלי</option>
                      <option value="רכיבה על אופניים">רכיבה על אופניים</option>
                      <option value="שייט">שייט</option>
                      <option value="ביקור באתרים">ביקור באתרים</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <FontAwesomeIcon icon={faUsers} className={styles.inputIcon} />
                    סוג הקבוצה
                  </label>
                  <div className={styles.inputWrapper}>
                    <select
                      className={styles.select}
                      value={formAnswers.groupType}
                      onChange={(e) =>
                        setFormAnswers({ ...formAnswers, groupType: e.target.value })
                      }
                      required
                    >
                      <option value="">בחר סוג קבוצה</option>
                      <option value="זוג">זוג</option>
                      <option value="משפחה">משפחה</option>
                      <option value="חברים">חברים</option>
                      <option value="עסקי">עסקי</option>
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" className={styles.button} disabled={loading}>
                <span className={styles.buttonText}>{loading ? "מעבד..." : "צור טיול הפתעה"}</span>
                <FontAwesomeIcon icon={faGift} className={styles.buttonIcon} />
              </button>
            </form>
          ) : !result && !loading ? (
            <div className={styles.welcomeContainer}>
              <h2 className={styles.welcomeTitle}>ברוכים הבאים לטיול הפתעה!</h2>
              <p className={styles.welcomeSubtitle}>השאירו לנו את הפרטים ואנחנו נמצא לכם את החופשה המושלמת</p>
              
              <div className={styles.featuresList}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}><FontAwesomeIcon icon={faMapMarkedAlt} /></div>
                  <h3 className={styles.featureTitle}>יעדים מותאמים אישית</h3>
                  <p className={styles.featureDescription}>נמליץ לכם על יעדים שמתאימים בדיוק לטעם שלכם</p>
                </div>
                
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}><FaRegClock /></div>
                  <h3 className={styles.featureTitle}>חסכון בזמן</h3>
                  <p className={styles.featureDescription}>אנחנו עושים את כל המחקר בשבילכם</p>
                </div>
                
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}><FaRegSurprise /></div>
                  <h3 className={styles.featureTitle}>חוויה מפתיעה</h3>
                  <p className={styles.featureDescription}>גלו יעדים חדשים שלא חשבתם עליהם</p>
                </div>
              </div>
              <button
                type="button"
                className={styles.button}
                onClick={() => setShowForm(true)}
              >
                <span className={styles.buttonText}>התחל עכשיו</span>
                <FontAwesomeIcon icon={faCompass} className={styles.buttonIcon} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default SurpriseTripView;
