// src/components/reviews/Reviews.jsx
import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaStar } from "react-icons/fa";

import {
  getReviewsFull,
  upsertReview,
  deleteMyReview,
  getMyReview,
  adminDeleteReview,
} from "../../services/api";
import styles from "./reviews.module.css";

const Reviews = ({
  entityType, // 'trip' | 'camping' | 'attraction'
  entityId,
  canWrite = false,
  currentUser, // שם המשתמש הנוכחי (לזיהוי הביקורת שלי)
  isAdmin = false,
}) => {
  const [reviews, setReviews] = useState([]);
  const [meta, setMeta] = useState({ reviews_count: 0 });

  const [form, setForm] = useState({ rating: 0, description: "" });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [myReview, setMyReview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hoverRating, setHoverRating] = useState(0);

  // אייקון-באטנז קומפקטיים (inline styles כדי לא לשנות קבצי CSS קיימים)
  const ICON_BTN = {
    background: "#ffffffcc",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "6px 8px",
    fontSize: "1rem",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    transition:
      "transform .15s ease, background-color .2s ease, box-shadow .2s ease",
  };
  const ICON_BTN_HOVER = {
    transform: "translateY(-1px)",
    boxShadow: "0 3px 8px rgba(0,0,0,0.12)",
  };
  const EDIT_COLOR = { color: "#4a90e2" };
  const DELETE_COLOR = { color: "#dc3545" };

  // (רק תצוגה — לא חובה)
  const moods = {
    0: { emoji: "⭐", label: "דרג/י" },
    1: { emoji: "😡", label: "נורא" },
    2: { emoji: "😟", label: "רע" },
    3: { emoji: "😐", label: "בסדר" },
    4: { emoji: "🙂", label: "טוב" },
    5: { emoji: "🤩", label: "מצוין" },
  };

  // מזהה ביקורת בצורה עמידה לשמות שונים
  const getReviewId = (r) =>
    r?.review_id ??
    r?.id ??
    r?.Attraction_review_id ??
    r?.Camping_review_id ??
    r?.Trip_review_id ??
    null;

  const load = async () => {
    setLoading(true);
    try {
      const { list, meta } = await getReviewsFull(entityType, entityId, {
        sort: "old",
      });
      setReviews(Array.isArray(list) ? list : []);
      setMeta(meta || { reviews_count: 0 });

      if (canWrite) {
        try {
          const mineRes = await getMyReview(entityType, entityId);
          const mine =
            mineRes?.data && !Array.isArray(mineRes.data)
              ? mineRes.data
              : mineRes;
          setMyReview(mine && typeof mine === "object" ? mine : null);
        } catch {
          setMyReview(null);
        }
      } else {
        setMyReview(null);
      }
    } catch (err) {
      console.error("Error loading reviews", err);
      setReviews([]);
      setMeta({ reviews_count: 0 });
      setMyReview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId, canWrite]);

  const handleSubmit = async (e) => {
    e.preventDefault(); // ← מונע רענון/ניווט בטופס
    setErrorMsg("");

    const r = Number(form.rating) || 0;
    if (r < 1 || r > 5) {
      setErrorMsg("חייב לבחור דירוג בין 1 ל־5 לפני שמירה.");
      return;
    }

    try {
      setSaving(true);
      await upsertReview(entityType, entityId, {
        rating: r,
        description: form.description || "",
      });

      setIsEditing(false);
      setForm({ rating: 0, description: "" });
      setHoverRating(0);

      await load();
    } catch (err) {
      console.error("Error saving review", err);
      setErrorMsg("שמירת הביקורת נכשלה. נסו שוב.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (review) => {
    setForm({
      rating: Number(review.rating) || 0,
      description: review.description || "",
    });
    setIsEditing(true);
    setHoverRating(0);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setForm({ rating: 0, description: "" });
    setHoverRating(0);
    setErrorMsg("");
  };

  // מחיקת הביקורת שלי
  const handleDeleteMine = async () => {
    try {
      setSaving(true);
      await deleteMyReview(entityType, entityId);
      setIsEditing(false);
      setForm({ rating: 0, description: "" });
      setHoverRating(0);
      await load();
    } catch (err) {
      console.error("Error deleting review", err);
      setErrorMsg("מחיקת הביקורת נכשלה.");
    } finally {
      setSaving(false);
    }
  };

  // מחיקת ביקורת ע"י אדמין
  const handleAdminDelete = async (review) => {
    const reviewId = getReviewId(review);
    if (!reviewId) {
      setErrorMsg("לא נמצא מזהה ביקורת למחיקה.");
      return;
    }
    try {
      setSaving(true);
      await adminDeleteReview(entityType, reviewId);
      await load();
    } catch (err) {
      console.error("Admin delete review failed", err);
      setErrorMsg("מחיקת ביקורת (אדמין) נכשלה.");
    } finally {
      setSaving(false);
    }
  };

  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const visualRating = hoverRating || Number(form.rating) || 0;
  const mood = moods[visualRating] || moods[0];
  const groupName = `rating-${entityId || "new"}`;

  // עזר: אירועי hover ל-ICON_BTN
  const withHover = (base, hovered) => ({
    onMouseEnter: (e) => Object.assign(e.currentTarget.style, hovered),
    onMouseLeave: (e) => Object.assign(e.currentTarget.style, {}),
    style: base,
  });

  return (
    <section className={styles.reviews}>
      <h3>ביקורות ({meta.reviews_count})</h3>

      {canWrite && (
        <div className={styles["reviews-sticky"]}>
          <form
            onSubmit={handleSubmit}
            className={`${styles["review-form"]} ${styles.fancy}`}
            // הגנה נוספת: מניעת submit ע"י Enter בשדות שאינם כפתור שמירה
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
                e.preventDefault();
              }
            }}
            // אל תגדירי action כדי למנוע ניווט
            action={undefined}
          >
            {/* כרטיס דירוג */}
            <div className={styles["rating-card"]} dir="ltr">
              <div className={styles.mood}>
                <div className={styles["mood-emoji"]} aria-hidden>
                  {mood.emoji}
                </div>
                <div className={styles["mood-label"]}>{mood.label}</div>
              </div>

              {/* ⭐⭐ כפתורי כוכבים בטוחים ⭐⭐ */}
              <div
                className={styles["rating-group"]}
                role="radiogroup"
                aria-label="דירוג כוכבים"
                onMouseLeave={() => setHoverRating(0)}
              >
                {/* רדיו נסתר לנגישות בלבד (לא לוחיצים עליו) */}
                <input
                  className={`${styles.rating__input} ${styles["rating__input--none"]}`}
                  name={groupName}
                  id={`${groupName}-none`}
                  value="0"
                  type="radio"
                  checked={Number(form.rating) === 0}
                  readOnly
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    opacity: 0,
                    pointerEvents: "none",
                  }}
                  tabIndex={-1}
                />

                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button" // ← חשוב: לא submit
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setForm((f) => ({ ...f, rating: n }));
                    }}
                    onMouseEnter={() => setHoverRating(n)}
                    onFocus={() => setHoverRating(n)}
                    onBlur={() => setHoverRating(0)}
                    aria-pressed={Number(form.rating) >= n}
                    aria-label={`${n} כוכבים`}
                    className={styles.rating__label}
                    title={`${n} מתוך 5`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                  >
                    <FaStar
                      className={`${styles.rating__icon} ${styles["rating__icon--star"]}`}
                      style={{
                        opacity: (hoverRating || form.rating) >= n ? 1 : 0.35,
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              dir="rtl"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder={
                isEditing ? "עדכן את הביקורת שלך..." : "כתבו ביקורת חדשה..."
              }
            />

            {errorMsg && (
              <div style={{ color: "#c00", marginTop: 6 }} role="alert">
                {errorMsg}
              </div>
            )}

            <div className={styles["review-actions"]}>
              <button
                type="submit"
                className={`${styles.btn} ${styles["btn-primary"]}`}
                disabled={saving}
              >
                {isEditing ? "עדכון ביקורת" : "שמור ביקורת"}
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className={`${styles.btn} ${styles["btn-outline"]}`}
                  disabled={saving}
                >
                  ביטול
                </button>
              )}
            </div>

            {/* פעולות מהירות לביקורת שלי (כאשר לא עורכים) — עם איקונים */}
            {!isEditing && myReview && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => startEdit(myReview)}
                  aria-label="ערוך את הביקורת שלי"
                  title="ערוך את הביקורת שלי"
                  {...withHover({ ...ICON_BTN, ...EDIT_COLOR }, ICON_BTN_HOVER)}
                >
                  <FaEdit />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMine}
                  aria-label="מחק את הביקורת שלי"
                  title="מחק את הביקורת שלי"
                  {...withHover(
                    { ...ICON_BTN, ...DELETE_COLOR },
                    ICON_BTN_HOVER
                  )}
                >
                  <FaTrash />
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {loading && <p>טוען ביקורות...</p>}

      {!loading && safeReviews.length === 0 && (
        <div className={styles["reviews-empty"]}>
          אין עדיין ביקורות ליעד זה.
        </div>
      )}

      <ul className={styles["review-list"]}>
        {safeReviews.map((r) => {
          const rid = getReviewId(r);
          const isMine =
            currentUser &&
            (r.username === currentUser || r.userName === currentUser);

          return (
            <li
              key={rid || r.created_at || Math.random()}
              className={styles["review-item"]}
            >
              {/* כותרת הביקורת + אייקוני פעולות בצד שמאל */}
              <div
                className={styles["review-header"]}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <strong>{r.username || r.userName || "משתמש"}</strong>

                <span className={styles["rating-stars"]} aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <FaStar
                      key={i}
                      size={16}
                      className={`${styles.star} ${
                        i < (Number(r.rating) || 0) ? styles.active : ""
                      }`}
                    />
                  ))}
                </span>

                {/* מרווח דינמי כדי לדחוף את האייקונים לקצה השני */}
                <span style={{ marginInlineStart: "auto" }} />

                {/* פעולות — אייקונים בלבד */}
                <div style={{ display: "flex", gap: 8 }}>
                  {isMine && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        aria-label="עריכת הביקורת שלי"
                        title="עריכה"
                        disabled={saving}
                        {...withHover(
                          { ...ICON_BTN, ...EDIT_COLOR },
                          ICON_BTN_HOVER
                        )}
                      >
                        <FaEdit />
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteMine}
                        aria-label="מחיקת הביקורת שלי"
                        title="מחיקה"
                        disabled={saving}
                        {...withHover(
                          { ...ICON_BTN, ...DELETE_COLOR },
                          ICON_BTN_HOVER
                        )}
                      >
                        <FaTrash />
                      </button>
                    </>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleAdminDelete(r)}
                      aria-label="מחיקת ביקורת (אדמין)"
                      title={`מחק ביקורת (אדמין)${rid ? ` #${rid}` : ""}`}
                      disabled={saving}
                      {...withHover(
                        { ...ICON_BTN, ...DELETE_COLOR },
                        ICON_BTN_HOVER
                      )}
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>

              {r.description && <p>{r.description}</p>}
              {r.created_at && (
                <small>{new Date(r.created_at).toLocaleString()}</small>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default Reviews;
