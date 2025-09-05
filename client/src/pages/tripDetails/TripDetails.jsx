// TripDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./tripDetails.module.css";
import Reviews from "../../components/reviews/Reviews";
import AboutCampingSection from "../../components/AboutCampingSection/AboutCampingSection";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faGlobe,
  faMapMarkedAlt,
  faCalendarAlt,
  faLeaf,
  faUsers,
  faRoute,
  faInfoCircle,
  faImages,
  faMapSigns,
  faMountain,
} from "@fortawesome/free-solid-svg-icons";

const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || "http://localhost:5000";

/** ממיר ערך מה-DB לנתיב תמונה תקין */
function normalizeImagePathFromDB(raw, folder = "trips") {
  if (!raw) return "";
  const first = String(raw).split(",")[0].trim();
  if (/^https?:\/\//i.test(first) || first.startsWith("data:")) return first;
  if (first.startsWith("/uploads/")) return `${API_ORIGIN}${first}`;
  return `${API_ORIGIN}/uploads/${folder}/${first.replace(
    /^uploads\/[^/]+\//,
    ""
  )}`;
}

function TripDetails() {
  const params = useParams();
  const rawId = params?.id;
  // מזהה ממוגן
  const id = useMemo(() => {
    const s = String(rawId ?? "").trim();
    return s && s.toLowerCase() !== "undefined" ? s : "";
  }, [rawId]);

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [animateSection, setAnimateSection] = useState(false);

  // המשתמש המחובר עבור Reviews
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const isAdmin = user?.role === "admin";

  // אנימציה קלה אחרי טעינה
  useEffect(() => {
    if (!loading && trip) {
      const t = setTimeout(() => setAnimateSection(true), 300);
      return () => clearTimeout(t);
    }
  }, [loading, trip]);

  useEffect(() => {
    // אין id? אל תבצע קריאה
    if (!id) {
      setLoading(false);
      setError("לא התקבל מזהה טיול בכתובת.");
      return;
    }
    let cancelled = false;

    const fetchTrip = async () => {
      try {
        const res = await axios.get(`${API_ORIGIN}/api/trips/${id}`);
        if (!cancelled) {
          setTrip(res.data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError("אירעה שגיאה בטעינת פרטי הטיול.");
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrip();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading)
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <p>טוען פרטי טיול...</p>
      </div>
    );

  if (error)
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <p>{error}</p>
      </div>
    );

  if (!trip)
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <p>טיול לא נמצא</p>
      </div>
    );

  // תמיכה במס׳ תמונות מופרדות בפסיקים או מערך
  const imageNames = Array.isArray(trip.trip_img)
    ? trip.trip_img
    : trip.trip_img
    ? trip.trip_img.split(",").map((img) => img.trim())
    : [];

  // תיאור מקוצר
  const shortDescription =
    trip.trip_description && trip.trip_description.length > 150
      ? `${trip.trip_description.substring(0, 150)}...`
      : trip.trip_description;

  // ======= מחירים – לוגיקה קיימת =======
  const extractPrices = (text) => {
    if (!text) return [];
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const entries = [];
    const pushIfMatch = (labelHe, patterns) => {
      for (const pat of patterns) {
        const re = new RegExp(
          `(?:${pat})\\s*(?:[:\\-–])?\\s*(?:₪|ש"?ח|NIS)?\\s*([\\d.,]+)\\s*(₪|ש"?ח|NIS)?`,
          "i"
        );
        const line = lines.find((l) => re.test(l));
        if (line) {
          const m = line.match(re);
          if (m && m[1]) {
            const amount = m[1];
            const currency = m[2] || "₪";
            entries.push({
              label: labelHe,
              value: `${amount} ${currency}`.trim(),
            });
            return;
          }
        }
      }
    };
    pushIfMatch("מבוגר", ["מבוגר"]);
    pushIfMatch("ילד", ["ילד"]);
    pushIfMatch("מבוגר בקבוצה", ["מבוגר בקבוצה"]);
    pushIfMatch("ילד בקבוצה", ["ילד בקבוצה"]);
    pushIfMatch("סטודנט", ["סטודנט"]);
    pushIfMatch("מילואים", ["מילואים"]);
    pushIfMatch("חייל / אזרח ותיק", [
      "חייל\\s*/\\s*אזרח ותיק",
      "חייל",
      "אזרח ותיק",
    ]);
    return entries;
  };
  const parsedPrices = extractPrices(trip.trip_description);

  const extractPricesFromHtmlTable = (text) => {
    try {
      if (!text || !text.includes("<table")) return [];
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const table = doc.querySelector("table");
      if (!table) return [];
      const rows = [];
      table.querySelectorAll("tr").forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll("th,td"))
          .map((td) => td.textContent.trim())
          .filter(Boolean);
        if (cells.length >= 2) rows.push({ label: cells[0], value: cells[1] });
      });
      if (
        rows.length &&
        /סוג|קטגוריה/i.test(rows[0].label) &&
        /מחיר/i.test(rows[0].value)
      ) {
        rows.shift();
      }
      return rows;
    } catch {
      return [];
    }
  };
  const htmlPriceRows = extractPricesFromHtmlTable(trip.trip_description);

  const extractPricesFromPipeTable = (text) => {
    if (!text) return [];
    const rows = [];
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      if (/\|/.test(line)) {
        const parts = line
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length >= 2) rows.push({ label: parts[0], value: parts[1] });
      }
    }
    if (
      rows.length &&
      /סוג|קטגוריה/i.test(rows[0].label) &&
      /מחיר/i.test(rows[0].value)
    ) {
      rows.shift();
    }
    return rows;
  };
  const pipePriceRows = extractPricesFromPipeTable(trip.trip_description);

  const extractGenericPriceLines = (text) => {
    if (!text) return [];
    const rows = [];
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const amountRe = /(₪|ש"?ח|NIS)?\s*([\d][\d.,]*)\s*(₪|ש"?ח|NIS)?/i;
    for (const line of lines) {
      if (amountRe.test(line)) {
        const parts = line.split(/[:\-–]\s*/);
        if (parts.length >= 2) {
          const label = parts[0].replace(/^[-–:]+/, "").trim();
          const valueMatch = line.match(amountRe);
          if (label && valueMatch) {
            const currency = valueMatch[1] || valueMatch[3] || "₪";
            const amount = valueMatch[2];
            rows.push({ label, value: `${amount} ${currency}`.trim() });
          }
        }
      }
    }
    return rows;
  };
  const genericPriceRows = extractGenericPriceLines(trip.trip_description);
  // ======= סוף לוגיקת המחירים =======

  // נתוני תצוגה לרכיב AboutCampingSection
  const aboutCampingData = {
    camping_location_name: trip.trip_name,
    camping_description: trip.trip_description,
    camping_location: trip.trip_location,
    camping_duration: trip.trip_duration,
    camping_environment: trip.trip_type,
    water_access: trip.has_water_activities || false,
    images: imageNames.map((img) => normalizeImagePathFromDB(img, "trips")),
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.tripHeader}>
        <div className={styles.heroOverlay}></div>
        <div className={styles.tripNameWrapper}>
          <h1 className={styles.tripName}>{trip.trip_name}</h1>
          {trip.trip_location && (
            <div className={styles.tripLocation}>
              <FontAwesomeIcon icon={faMapSigns} />
              <span>{trip.trip_location}</span>
            </div>
          )}
          <div className={styles.tripBadges}>
            {trip.trip_type && (
              <div className={styles.tripBadge}>
                <FontAwesomeIcon icon={faRoute} />
                <span>{trip.trip_type}</span>
              </div>
            )}
            {trip.difficulty_level && (
              <div className={styles.tripBadge}>
                <FontAwesomeIcon icon={faMountain} />
                <span>{trip.difficulty_level}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* גלריית תמונות ומאפיינים */}
      <AboutCampingSection camping={aboutCampingData} showReviews={false} />

      <div
        className={`${styles.mainContent} ${
          animateSection ? styles.animate : ""
        }`}
      >
        <div className={styles.leftColumn}>
          {/* מחירים */}
          <div className={styles.priceCard}>
            <div className={styles.infoCardHeader}>
              <div className={styles.infoCardHeaderIcon}>
                <FontAwesomeIcon icon={faInfoCircle} />
              </div>
              <h2>מחירים</h2>
            </div>
            <div className={styles.priceContent}>
              {(() => {
                const hasEntry = trip.has_entry_fee;
                const hasParsed = parsedPrices.length > 0;
                const hasHtml = htmlPriceRows.length > 0;
                const hasPipe = pipePriceRows.length > 0;
                const hasGeneric = genericPriceRows.length > 0;
                const looksLikePricesInText =
                  /(מחיר|₪|ש"?ח|NIS|\d+[\d.,]*)/i.test(
                    trip.trip_description || ""
                  );
                const isFree =
                  !(
                    hasParsed ||
                    hasHtml ||
                    hasPipe ||
                    hasGeneric ||
                    looksLikePricesInText
                  ) &&
                  (hasEntry === false || hasEntry === 0 || hasEntry === "0");

                return (
                  <>
                    <table className={styles.priceTable}>
                      <thead>
                        <tr>
                          <th>סוג מחיר</th>
                          <th>מחיר</th>
                        </tr>
                      </thead>
                      <tbody>
                        {htmlPriceRows.length > 0 ? (
                          htmlPriceRows.map((row, idx) => (
                            <tr key={idx}>
                              <td>{row.label}</td>
                              <td>{row.value}</td>
                            </tr>
                          ))
                        ) : pipePriceRows.length > 0 ? (
                          pipePriceRows.map((row, idx) => (
                            <tr key={idx}>
                              <td>{row.label}</td>
                              <td>{row.value}</td>
                            </tr>
                          ))
                        ) : genericPriceRows.length > 0 ? (
                          genericPriceRows.map((row, idx) => (
                            <tr key={idx}>
                              <td>{row.label}</td>
                              <td>{row.value}</td>
                            </tr>
                          ))
                        ) : isFree ? (
                          <tr>
                            <td>כניסה</td>
                            <td>חינם / אין דמי כניסה</td>
                          </tr>
                        ) : (
                          <>
                            <tr>
                              <td>כניסה</td>
                              <td>
                                {hasParsed
                                  ? "בתשלום"
                                  : trip.entry_fee_label || "בתשלום"}
                              </td>
                            </tr>
                            {hasParsed &&
                              parsedPrices.map((p, idx) => (
                                <tr key={idx}>
                                  <td>{p.label}</td>
                                  <td>{p.value}</td>
                                </tr>
                              ))}
                          </>
                        )}
                      </tbody>
                    </table>
                    {isFree ? (
                      <p className={styles.priceNote}>
                        אין דמי כניסה · המקום חינמי
                      </p>
                    ) : (
                      (trip.entry_fee_note || trip.price_note) && (
                        <p className={styles.priceNote}>
                          {trip.entry_fee_note || trip.price_note}
                        </p>
                      )
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* טיפים לטיול */}
          {trip.trip_tips && (
            <div className={styles.tripTips}>
              <div className={styles.tipsHeader}>
                <div className={styles.tipsHeaderIcon}>
                  <FontAwesomeIcon icon={faLeaf} />
                </div>
                <h2>טיפים לטיול</h2>
              </div>

              <div className={styles.modernTipsContent}>
                <div className={styles.tipsContainer}>
                  {trip.trip_tips.split("\n").map(
                    (tip, index) =>
                      tip.trim() && (
                        <div key={index} className={styles.tipItem}>
                          <div className={styles.tipIcon}>
                            <FontAwesomeIcon icon={faRoute} />
                          </div>
                          <p>{tip}</p>
                        </div>
                      )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.rightColumn}>
          {(trip.additional_info || trip.contact_info) && (
            <div className={styles.additionalCard}>
              <div className={styles.infoCardHeader}>
                <div className={styles.infoCardHeaderIcon}>
                  <FontAwesomeIcon icon={faInfoCircle} />
                </div>
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

      {/* 🔽 Reviews */}
      <Reviews
        entityType="trip"
        entityId={trip.trip_id}
        canWrite={!!user}
        currentUser={user?.userName}
        isAdmin={isAdmin}
      />
    </div>
  );
}

export default TripDetails;
