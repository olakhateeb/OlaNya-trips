// components/favoritebutton/FavoriteButton.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  toggleFavorite,
  checkFavorite,
  setRecommendation,
} from "../../services/api";
import styles from "./favoritebutton.module.css";

/**
 * props:
 *  - itemType: "trip" | "attraction" | "camping"
 *  - itemId:  number|string (בקמפינג זה שם)
 *  - adminMode?: boolean           // אם true – מציג גם כפתור כוכב (המלצה)
 *  - initialRecommended?: boolean  // מצב התחלתי של המלצה לאדמין
 *  - size?: "sm" | "md"
 */
export default function FavoriteButton({
  itemType,
  itemId,
  adminMode = false,
  initialRecommended = false,
  size = "md",
}) {
  // נרמול טיפוס
  const type = useMemo(() => {
    const t = String(itemType || "").toLowerCase();
    if (t === "trips") return "trip";
    if (t === "attractions") return "attraction";
    if (t === "campings") return "camping";
    return t;
  }, [itemType]);

  const hasToken = !!localStorage.getItem("token");

  // לב (מועדפים)
  const [isFav, setIsFav] = useState(false);
  // כוכב (המלצה) — רק אם adminMode
  const [recommended, setRecommended] = useState(!!initialRecommended);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // טען סטטוס מועדף אם יש טוקן
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        if (!hasToken) return;
        if (!itemId || !["trip", "attraction", "camping"].includes(type))
          return;
        const r = await checkFavorite({ itemType: type, itemId });
        if (!ignore && typeof r?.isFavorite === "boolean") {
          setIsFav(r.isFavorite);
        }
      } catch {
        // לא מפנים לשום מקום; מתעלמים בשקט
      }
    })();
    return () => {
      ignore = true;
    };
  }, [type, itemId, hasToken]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(""), 1600);
  };

  /** לב – מועדפים (לכולם, כולל מנהל) */
  const onToggleFavorite = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (busy) return;

    if (!itemId) return showToast("itemId חסר");
    if (!["trip", "attraction", "camping"].includes(type))
      return showToast("itemType לא תקין");

    if (!hasToken) return showToast("כדי לשמור מועדפים צריך להתחבר 🙂");

    setBusy(true);
    try {
      const next = !isFav;
      const out = await toggleFavorite({ itemType: type, itemId, on: next });
      if (out?.success === false)
        throw new Error(out?.message || "שגיאה בעדכון מועדף");
      setIsFav(next);
      showToast(next ? "נוסף למועדפים ❤️" : "הוסר מהמועדפים");
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "פעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  /** כוכב – המלצה (רק אם adminMode=true) */
  const onToggleRecommend = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (busy || !adminMode) return;

    if (!itemId) return showToast("itemId חסר");
    if (!["trip", "attraction", "camping"].includes(type))
      return showToast("itemType לא תקין");

    if (!hasToken) return showToast("צריך להתחבר כדי לשנות המלצה");

    setBusy(true);
    try {
      const next = !recommended;
      const out = await setRecommendation({
        itemType: type,
        itemId,
        recommended: next,
      });
      if (out?.success === false)
        throw new Error(out?.message || "שגיאה בהגדרת המלצה");
      setRecommended(next);
      showToast(next ? "סומן כהמלצה ⭐" : "הוסרה ההמלצה");
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          err?.message ||
          "שגיאה בשינוי סטטוס המלצה"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`${styles.wrap} ${styles[size]}`}
      style={{ pointerEvents: "auto" }}
    >
      {/* לב – מועדפים (תמיד מוצג) */}
      <button
        aria-label={isFav ? "הסר מהמועדפים" : "הוסף למועדפים"}
        className={`${styles.btn} ${styles.heart} ${isFav ? styles.on : ""}`}
        onClick={onToggleFavorite}
        disabled={busy}
        aria-pressed={isFav}
        title={isFav ? "הסר מהמועדפים" : "הוסף למועדפים"}
      >
        <i
          className={`fa-${isFav ? "solid" : "regular"} fa-heart`}
          aria-hidden="true"
        />
      </button>

      {/* כוכב – המלצה (מוצג רק לאדמין/ב-adminMode) */}
      {adminMode && (
        <button
          aria-label={recommended ? "בטל המלצה" : "סמן כהמלצה"}
          className={`${styles.btn} ${styles.star} ${
            recommended ? styles.on : ""
          }`}
          onClick={onToggleRecommend}
          disabled={busy}
          aria-pressed={recommended}
          title={recommended ? "בטל המלצה" : "סמן כהמלצה"}
        >
          <i
            className={`fa-${recommended ? "solid" : "regular"} fa-star`}
            aria-hidden="true"
          />
        </button>
      )}

      {/* טוסט קטן */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
