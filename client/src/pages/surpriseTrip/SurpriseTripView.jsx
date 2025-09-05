// SurpriseTripView.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import styles from "./surpriseTrip.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faUsers,
  faMapMarkedAlt,
  faMountain,
  faGift,
  faExclamationCircle,
  faClock, // אינפו
  faWandMagicSparkles, // אינפו
  faRoute, // אינפו
} from "@fortawesome/free-solid-svg-icons";
import { FaRegClock } from "react-icons/fa";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

function SurpriseTripView() {
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const travelerUserName = user?.userName || user?.username || user?.name || "";
  const travelerIdNumber = user?.idNumber || "";

  const [participants, setParticipants] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showPaypal, setShowPaypal] = useState(false);

  // סכום לדוגמה; להתאים ללוגיקה שלך
  const amount = 200;

  // ENV של הלקוח (client/.env)
  const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID || "";
  // אם השרת עובד עם ILS, עדכן גם כאן וגם בשרת
  const PAYPAL_CURRENCY = "USD";
  const PAYMENTS_BASE = "http://localhost:5000/api/payments";

  const [formAnswers, setFormAnswers] = useState({
    style: "",
    activity: "",
    groupType: "",
    preferredDate: "", // YYYY-MM-DDTHH:mm (ערך input[type=datetime-local])
    preferredRegion: "",
    preferredAddress: "",
  });

  // למנוע עבר: עכשיו + 2 שעות (מותאם לקלט מקומי)
  const minDateTime = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    d.setHours(d.getHours() + 2);
    return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
  }, []);

  useEffect(() => {
    if (PAYPAL_CLIENT_ID) {
      console.log("PAYPAL_CLIENT_ID:", PAYPAL_CLIENT_ID.slice(0, 6) + "…");
    } else {
      console.log("PAYPAL_CLIENT_ID: (missing)");
    }
  }, [PAYPAL_CLIENT_ID]);

  const extractErrMsg = (e, fallback = "אירעה שגיאה") => {
    const data = e?.response?.data;
    return (
      data?.details?.[0]?.issue ||
      data?.message ||
      data?.error ||
      e?.message ||
      fallback
    );
  };

  const validateForm = () => {
    if (
      !travelerUserName ||
      !formAnswers.style ||
      !formAnswers.activity ||
      !formAnswers.groupType ||
      !formAnswers.preferredDate ||
      !formAnswers.preferredRegion ||
      !formAnswers.preferredAddress ||
      !participants
    ) {
      setError("אנא מלא/י את כל השדות בטופס");
      return false;
    }

    // בדיקת עבר מול השעה המקומית של המשתמש
    const chosen = new Date(formAnswers.preferredDate);
    const now = new Date();
    if (isNaN(chosen.getTime()) || chosen.getTime() <= now.getTime()) {
      setError("בחר/י תאריך ושעה עתידיים");
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;

    if (!PAYPAL_CLIENT_ID) {
      setError(
        "חסר REACT_APP_PAYPAL_CLIENT_ID בפרונט (client/.env), ואז לעשות restart ל-React."
      );
      return;
    }
    setShowPaypal(true);
  };

  // ממיר ערך מקומי של datetime-local ל-ISO UTC מלא (לשמירה מדויקת בצד שרת)
  const toUTCISO = (localDateTimeString) => {
    const d = new Date(localDateTimeString);
    if (isNaN(d.getTime())) return null;
    // לשמר את שעת הקיר: מסיט את ה-offset ואז מייצר ISO
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  };

  // payload שישלח לשרת בעת capture (לאחר אישור ב-PayPal)
  const buildCapturePayload = (paypalOrderId) => {
    const tripDateISO = toUTCISO(formAnswers.preferredDate); // למשל "2025-09-01T10:30:00.000Z"
    const tripDateYMD =
      tripDateISO?.slice(0, 10) ||
      new Date(formAnswers.preferredDate).toISOString().slice(0, 10);

    return {
      travelerId: travelerUserName, // זיהוי לפי userName
      travelerIdNumber, // וגם idNumber אם השרת צריך
      participantsNum: participants,

      // העדפות – שימוש פנימי/תיעוד
      preferences: {
        style: formAnswers.style,
        activity: formAnswers.activity,
        groupType: formAnswers.groupType,
        preferredDate: formAnswers.preferredDate, // הערך המקומי שקיבלנו מהטופס
        preferredRegion: formAnswers.preferredRegion,
        preferredAddress: formAnswers.preferredAddress,
        region: formAnswers.preferredRegion,
      },

      // שדות לשמירה ישירה בהזמנה
      trip_date: tripDateYMD, // YYYY-MM-DD (לתצוגה/קבלה)
      trip_datetime: tripDateISO, // ISO מלא ב-UTC (לשדה DATETIME ב-DB)
      region: formAnswers.preferredRegion,
      traveler_address: formAnswers.preferredAddress,

      amount, // מסונכרן עם create-order
      currency: PAYPAL_CURRENCY,
      paypalOrderId,
    };
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <div className={styles.layout}>
          {/* ===== פאנל אינפו (שמאל) ===== */}
          <aside className={styles.infoPanel}>
            <h4 className={styles.infoTitle}>למה טיול בהפתעה?</h4>
            <ul className={styles.infoList}>
              <li className={styles.infoItem}>
                <FontAwesomeIcon icon={faClock} className={styles.infoIcon} />
                חוסך לכם זמן בתכנון
              </li>
              <li className={styles.infoItem}>
                <FontAwesomeIcon
                  icon={faWandMagicSparkles}
                  className={styles.infoIcon}
                />
                חוויה אישית ומפתיעה
              </li>
              <li className={styles.infoItem}>
                <FontAwesomeIcon icon={faRoute} className={styles.infoIcon} />
                מסלול מותאם לקצב ולסגנון שלכם
              </li>
            </ul>
          </aside>

          {/* ===== עמודת הטופס (אמצע) ===== */}
          <div className={styles.formCard}>
            {/* כפתור פתיחת הטופס */}
            {!showForm && !result && !showPaypal && (
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={() => setShowForm(true)}
                  className={styles.startButton}
                >
                  התחל
                </button>
              </div>
            )}

            {/* 🧾 טופס הזמנה */}
            {!result && showForm && (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formHeader}>
                  <h3 className={styles.formTitle}>תיאום טיול בהפתעה</h3>
                  <p className={styles.formSubtitle}>
                    מלא/י כמה פרטים קצרים ונצא לדרך
                  </p>
                </div>

                <div className={styles.formGrid}>
                  {/* עמודה 1 */}
                  <div className="col-6">
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        <FontAwesomeIcon
                          icon={faMountain}
                          className={styles.inputIcon}
                        />
                        סגנון הטיול
                      </label>
                      <select
                        className={styles.select}
                        value={formAnswers.style}
                        onChange={(e) =>
                          setFormAnswers({
                            ...formAnswers,
                            style: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">בחר/י סגנון</option>
                        <option value="טבע">טבע</option>
                        <option value="מים">מים</option>
                        <option value="מסלולים בעיר">מסלולים בעיר</option>
                        <option value="אתרים ארכיאולוגיים">
                          אתרים ארכיאולוגיים
                        </option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        <FontAwesomeIcon
                          icon={faUsers}
                          className={styles.inputIcon}
                        />
                        מספר משתתפים
                      </label>
                      <input
                        type="number"
                        className={styles.input}
                        value={participants}
                        onChange={(e) =>
                          setParticipants(parseInt(e.target.value || "0", 10))
                        }
                        min="1"
                        max="20"
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        <FontAwesomeIcon
                          icon={faMapMarkedAlt}
                          className={styles.inputIcon}
                        />
                        איזור
                      </label>
                      <select
                        className={styles.select}
                        value={formAnswers.preferredRegion}
                        onChange={(e) =>
                          setFormAnswers({
                            ...formAnswers,
                            preferredRegion: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">בחר איזור</option>
                        <option value="צפון">צפון</option>
                        <option value="מרכז">מרכז</option>
                        <option value="דרום">דרום</option>
                        <option value="אילת">אילת</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>כתובת מפגש / איסוף</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="לדוגמה: תל אביב, רח׳ דיזנגוף 100"
                        value={formAnswers.preferredAddress}
                        onChange={(e) =>
                          setFormAnswers({
                            ...formAnswers,
                            preferredAddress: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* עמודה 2 */}
                  <div className="col-6">
                    <div className={styles.formGroup}>
                      <label className={styles.label}>פעילות מועדפת</label>
                      <select
                        className={styles.select}
                        value={formAnswers.activity}
                        onChange={(e) =>
                          setFormAnswers({
                            ...formAnswers,
                            activity: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">בחר/י פעילות</option>
                        <option value="טיול רגלי">טיול רגלי</option>
                        <option value="רכיבה על אופניים">
                          רכיבה על אופניים
                        </option>
                        <option value="שייט">שייט</option>
                        <option value="ביקור באתרים">ביקור באתרים</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        <FaRegClock className={styles.inputIcon} />
                        תאריך ושעה מועדפים
                      </label>
                      <input
                        type="datetime-local"
                        className={styles.input}
                        value={formAnswers.preferredDate}
                        onChange={(e) =>
                          setFormAnswers({
                            ...formAnswers,
                            preferredDate: e.target.value,
                          })
                        }
                        min={minDateTime}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>סוג הקבוצה</label>
                      <select
                        className={styles.select}
                        value={formAnswers.groupType}
                        onChange={(e) =>
                          setFormAnswers({
                            ...formAnswers,
                            groupType: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">בחר/י סוג קבוצה</option>
                        <option value="זוג">זוג</option>
                        <option value="משפחה">משפחה</option>
                        <option value="חברים">חברים</option>
                        <option value="עסקי">עסקי</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={loading}
                  >
                    {loading ? "מעבד..." : "עבור לתשלום"}
                    <FontAwesomeIcon
                      icon={faGift}
                      className={styles.buttonIcon}
                    />
                  </button>
                </div>
              </form>
            )}

            {/* ❌ הודעת שגיאה */}
            {error && !result && (
              <div className={styles.error} style={{ marginTop: "0.75rem" }}>
                {error}
                <span className={styles.errorIcon}>
                  <FontAwesomeIcon icon={faExclamationCircle} />
                </span>
              </div>
            )}

            {/* ⏳ לודינג */}
            {loading && (
              <div
                className={styles.loadingCard}
                style={{ marginTop: "0.75rem" }}
              >
                <div className={styles.loadingContent}>
                  <div className={styles.loadingSpinner}></div>
                  <p className={styles.loadingText}>מעבד/ת…</p>
                </div>
              </div>
            )}
          </div>

          {/* ===== עמודת תוצאות/תשלום דביקה (ימין) ===== */}
          <aside className={`${styles.resultCard} ${styles.stickyAside}`}>
            {/* 🟡 PayPal */}
            {showPaypal && !result && (
              <div className={styles.paymentSection}>
                {!PAYPAL_CLIENT_ID ? (
                  <div className={styles.error}>
                    חסר REACT_APP_PAYPAL_CLIENT_ID בפרונט (client/.env), ואז
                    לעשות restart ל-React.
                  </div>
                ) : (
                  <PayPalScriptProvider
                    options={{
                      "client-id": PAYPAL_CLIENT_ID,
                      currency: PAYPAL_CURRENCY,
                      intent: "capture",
                    }}
                  >
                    <div className={styles.resultHeader}>
                      <h3 className={styles.resultTitle}>תשלום מאובטח</h3>
                    </div>
                    <PayPalButtons
                      style={{
                        layout: "vertical",
                        shape: "rect",
                        label: "paypal",
                        height: 40,
                      }}
                      createOrder={async () => {
                        try {
                          const res = await axios.post(
                            `${PAYMENTS_BASE}/create-order`,
                            { amount, currency: PAYPAL_CURRENCY }
                          );
                          return res.data.orderID;
                        } catch (e) {
                          setError(
                            extractErrMsg(e, "שגיאה ביצירת הזמנה ב-PayPal")
                          );
                          throw e;
                        }
                      }}
                      onApprove={async (data) => {
                        try {
                          setLoading(true);
                          setError("");
                          const payload = buildCapturePayload(data.orderID);
                          const res = await axios.post(
                            `${PAYMENTS_BASE}/capture/${data.orderID}`,
                            payload,
                            { headers: { "Content-Type": "application/json" } }
                          );
                          setResult(res.data);
                        } catch (e) {
                          setError(extractErrMsg(e, "שגיאה בסיום התשלום"));
                        } finally {
                          setLoading(false);
                        }
                      }}
                      onError={(err) => {
                        console.error("[PayPalButtons] onError:", err);
                        setError("שגיאה בחיבור לשירות התשלומים");
                      }}
                      onCancel={() => setError("התשלום בוטל על ידי המשתמש")}
                    />
                  </PayPalScriptProvider>
                )}
              </div>
            )}

            {/* ✅ תוצאה לאחר תשלום והזמנה */}
            {result && (
              <>
                <div className={styles.resultHeader}>
                  <div className={styles.successIcon}>
                    <FontAwesomeIcon icon={faCheck} />
                  </div>
                  <h3 className={styles.resultTitle}>
                    התשלום הושלם וההזמנה אושרה!
                  </h3>
                </div>

                <div className={styles.resultGrid}>
                  <div className={styles.resultSection}>
                    <div className={styles.resultItem}>
                      <span className={styles.resultLabel}>מס׳ הזמנה:</span>
                      <span className={styles.resultValue}>
                        {result.orderId}
                      </span>
                    </div>
                    <div className={styles.resultItem}>
                      <span className={styles.resultLabel}>תאריך הטיול:</span>
                      <span className={styles.resultValue}>
                        {result.trip_date}
                      </span>
                    </div>
                    <div className={styles.resultItem}>
                      <span className={styles.resultLabel}>שם הנהג:</span>
                      <span className={styles.resultValue}>
                        {result.driver?.name}
                      </span>
                    </div>
                    <div className={styles.resultItem}>
                      <span className={styles.resultLabel}>טלפון הנהג:</span>
                      <span className={styles.resultValue}>
                        {result.driver?.phone}
                      </span>
                    </div>
                    <div className={styles.resultItem}>
                      <span className={styles.resultLabel}>סכום ששולם:</span>
                      <span className={styles.resultValue}>
                        ₪{Number(result.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {result.receiptUrl ? (
                    <div className={styles.resultSection}>
                      <a
                        href={`http://localhost:5000${result.receiptUrl}`}
                        download
                        className={styles.downloadButton}
                      >
                        📄 הורד קבלה (PDF)
                      </a>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {/* רמז צד כאשר עדיין לא נפתח טופס */}
            {!showForm && !showPaypal && !result && (
              <div className={styles.resultSection}>
                <div className={styles.resultLabel} style={{ marginBottom: 8 }}>
                  איך זה עובד?
                </div>
                <div className={styles.resultValue}>
                  לוחצים “התחל”, ממלאים פרטים קצרים, משלמים—ומקבלים טיול מפתיע
                  מותאם אישית.
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export default SurpriseTripView;
