import React, { useEffect, useMemo, useState, useRef } from "react";
import { getTrips, createTrip, updateTrip } from "../../services/api";
import { adminDeleteOneImage, adminDeleteImages } from "../../services/api";
import Reviews from "../../components/reviews/Reviews";
import styles from "./adminTrips.module.css";

/** ==== Helpers for images ==== */
const API_ORIGIN = "http://localhost:5000";
function csvToList(val = "") {
  return String(val || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function joinCsv(arr = []) {
  return (arr || []).filter(Boolean).join(",");
}
function firstFromCsv(val = "") {
  const list = csvToList(val);
  return list[0] || "";
}
function normalizeImagePath(type, raw) {
  const first = firstFromCsv(raw);
  if (!first) return "";
  if (/^https?:\/\//i.test(first) || first.startsWith("data:")) return first;
  if (first.startsWith("/uploads/")) return `${API_ORIGIN}${first}`;
  const subdir =
    type === "trips"
      ? "trips"
      : type === "camping"
      ? "camping"
      : type === "attractions"
      ? "attractions"
      : "misc";
  return `${API_ORIGIN}/uploads/${subdir}/${first}`;
}
function normalizeImageList(type, rawOrToken) {
  // מקבל CSV שלם או טוקן בודד ומחזיר URL מלא/ים
  const list = Array.isArray(rawOrToken) ? rawOrToken : csvToList(rawOrToken);
  const subdir =
    type === "trips"
      ? "trips"
      : type === "camping"
      ? "camping"
      : type === "attractions"
      ? "attractions"
      : "misc";
  return list.map((token) => {
    if (/^https?:\/\//i.test(token) || token.startsWith("data:")) return token;
    if (token.startsWith("/uploads/")) return `${API_ORIGIN}${token}`;
    return `${API_ORIGIN}/uploads/${subdir}/${token}`;
  });
}
function stripToToken(urlOrToken = "") {
  const s = String(urlOrToken || "");
  if (!s) return "";
  // אם כבר זה טוקן יחסי
  if (!s.startsWith("http")) {
    return s.replace(/^\/+/, "");
  }
  try {
    const u = new URL(s);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.slice(-1)[0] || "";
  } catch {
    // לא URL – נחזיר הדבר האחרון אחרי /
    const parts = s.split("/").filter(Boolean);
    return parts.slice(-1)[0] || s;
  }
}

/** ==== Boolean fields ==== */
const TRIP_BOOL_FIELDS = [
  "is_accessible",
  "has_parking",
  "has_toilets",
  "pet_friendly",
  "family_friendly",
  "romantic",
  "couple_friendly",
  "has_water_activities",
  "bbq_area",
  "suitable_for_groups",
  "has_entry_fee",
  "is_favorite",
];
const TRIP_BOOL_LABELS = {
  is_accessible: "נגיש לנכים",
  has_parking: "חניה",
  has_toilets: "שירותים",
  pet_friendly: "ידידותי לחיות מחמד",
  family_friendly: "מתאים למשפחות",
  romantic: "רומנטי",
  couple_friendly: "מתאים לזוגות",
  has_water_activities: "פעילויות מים",
  bbq_area: "אזור מנגל",
  suitable_for_groups: "מתאים לקבוצות",
  has_entry_fee: "דמי כניסה",
  is_favorite: "מועדף",
};
const ICONS = {
  has_water_activities: "💧",
  couple_friendly: "💑",
  romantic: "💖",
  family_friendly: "👨‍👩‍👧",
  suitable_for_groups: "👥",
  pet_friendly: "🐾",
  has_toilets: "🚻",
  has_parking: "🅿️",
  is_accessible: "♿",
  has_entry_fee: "💳",
  bbq_area: "🍖",
  is_favorite: "⭐",
};

const defaultTripForm = {
  trip_id: null,
  trip_name: "",
  trip_duration: "",
  trip_description: "",
  trip_type: "",
  trip_img: "", // CSV של תמונות קיימות
  _images: [], // tokens (סנכרון מקומי)
  region: "",
  // בוליאנים
  is_accessible: false,
  has_parking: false,
  has_toilets: false,
  pet_friendly: false,
  family_friendly: false,
  romantic: false,
  couple_friendly: false,
  has_water_activities: false,
  bbq_area: false,
  suitable_for_groups: false,
  has_entry_fee: false,
  is_favorite: false,
};

const AdminTrips = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(defaultTripForm);
  const [newFiles, setNewFiles] = useState([]); // קבצים חדשים להעלאה
  const [selectedTokens, setSelectedTokens] = useState(new Set()); // למחיקה מרובה
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ======== View Details state ========
  const [selected, setSelected] = useState(null);
  const openDetails = (item) => setSelected(item);
  const closeDetails = () => setSelected(null);

  // ✅ שם משתמש נוכחי עבור Reviews
  const currentUserName = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u?.userName || u?.username || "";
    } catch {
      return "";
    }
  })();

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await getTrips();
      const arr = Array.isArray(res?.data) ? res.data : res?.data?.trips || [];
      setList(arr);
    } catch (e) {
      console.error(e);
      setError("שגיאה בטעינת טיולים");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open || selected) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, selected]);

  const isEdit = useMemo(() => !!form.trip_id, [form.trip_id]);

  const onOpenAdd = () => {
    setForm(defaultTripForm);
    setNewFiles([]);
    setSelectedTokens(new Set());
    setOpen(true);
    setError("");
    setSuccess("");
  };
  const onOpenEdit = (item) => {
    const tokens = csvToList(item.trip_img);
    setForm({
      ...defaultTripForm,
      ...item,
      trip_id: item.trip_id || item.id || item.tripId || null,
      trip_img: item.trip_img || "",
      _images: tokens,
      ...Object.fromEntries(TRIP_BOOL_FIELDS.map((k) => [k, !!item[k]])),
    });
    setNewFiles([]);
    setSelectedTokens(new Set());
    setOpen(true);
    setError("");
    setSuccess("");
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") setForm((s) => ({ ...s, [name]: !!checked }));
    else setForm((s) => ({ ...s, [name]: value }));
  };

  const normalizeForBackend = (obj) => {
    const out = { ...obj };
    TRIP_BOOL_FIELDS.forEach((k) => {
      out[k] = obj[k] ? 1 : 0;
    });
    [
      "trip_name",
      "trip_duration",
      "trip_description",
      "trip_type",
      "region",
    ].forEach((k) => {
      if (out[k] != null) out[k] = String(out[k]).trim();
    });
    return out;
  };

  // הסרה מקומית של תמונה קיימת (לפני שמירה)
  const removeExistingImageLocal = (idx) => {
    setForm((s) => {
      const next = [...(s._images || [])];
      next.splice(idx, 1);
      return { ...s, _images: next, trip_img: joinCsv(next) };
    });
  };

  // מחיקה בשרת של תמונה אחת (מיידית)
  const handleDeleteOneRemote = async (token) => {
    if (!form.trip_id) {
      // אם זה פריט חדש – אין מחיקה בשרת, רק מקומית
      const idx = (form._images || []).indexOf(token);
      if (idx >= 0) removeExistingImageLocal(idx);
      return;
    }
    try {
      await adminDeleteOneImage("trips", form.trip_id, token); // מוחק מה-CSV וגם את הקובץ
      // עדכון מקומי לאחר מחיקה
      setForm((s) => {
        const next = (s._images || []).filter((t) => t !== token);
        return { ...s, _images: next, trip_img: joinCsv(next) };
      });
      setSelectedTokens((prev) => {
        const n = new Set(prev);
        n.delete(token);
        return n;
      });
      // רענון רשימה (כדי לראות תוצאה גם בכרטיסים)
      await fetchList();
    } catch (err) {
      console.error(err);
      alert("מחיקת התמונה נכשלה");
    }
  };

  // בחירה/ביטול בחירה למחיקה מרובה
  const toggleSelect = (token) => {
    setSelectedTokens((prev) => {
      const next = new Set(prev);
      next.has(token) ? next.delete(token) : next.add(token);
      return next;
    });
  };

  // מחיקה מרובה מהשרת (אם בעריכה) או מקומית (אם חדש)
  const handleDeleteSelected = async () => {
    const tokens = Array.from(selectedTokens || []);
    if (!tokens.length) return;

    // אם טרם נשמר (אין trip_id) – מחיקה מקומית בלבד
    if (!form.trip_id) {
      setForm((s) => {
        const keep = (s._images || []).filter((t) => !new Set(tokens).has(t));
        return { ...s, _images: keep, trip_img: joinCsv(keep) };
      });
      setSelectedTokens(new Set());
      return;
    }

    try {
      await adminDeleteImages("trips", form.trip_id, tokens);
      setForm((s) => {
        const keep = (s._images || []).filter((t) => !new Set(tokens).has(t));
        return { ...s, _images: keep, trip_img: joinCsv(keep) };
      });
      setSelectedTokens(new Set());
      await fetchList();
    } catch (err) {
      console.error(err);
      alert("מחיקה מרובה נכשלה");
    }
  };

  // FormData (שומר CSV קיים + מוסיף קבצים חדשים תחת trip_imgs)
  const buildFormData = (obj) => {
    const fd = new FormData();

    // סנכרון CSV עם הרשימה לאחר מחיקות מקומיות
    const synced = { ...obj, trip_img: joinCsv(obj._images || []) };

    // שדות טקסט/בוליאנים
    Object.entries(normalizeForBackend(synced)).forEach(([k, v]) => {
      if (k === "_images") return;
      if (k === "trip_img" && (v == null || String(v).trim() === "")) return;
      if (v == null) return;
      fd.append(k, v);
    });

    // קבצים חדשים: append מרובה – חשוב שהשם יתאים לראוטר (trip_imgs)
    for (const f of newFiles) {
      fd.append("trip_imgs", f);
    }

    return fd;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const fd = buildFormData(form);
      const resp = isEdit
        ? await updateTrip(form.trip_id, fd)
        : await createTrip(fd);

      if (resp && typeof resp === "object" && resp.success === false) {
        throw new Error(resp.message || "שמירה נכשלה");
      }

      setSuccess("נשמר בהצלחה");
      setOpen(false);
      await fetchList();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const BooleanCheckboxes = ({ fields, compact = false }) => (
    <fieldset
      className={`${styles.checkboxGroup} ${
        compact ? styles.compactTiles : ""
      }`}
    >
      <legend className={styles.checkboxLegend}>תכונות</legend>
      {fields.map((field) => {
        const id = `trip_${field}`;
        const icon = ICONS[field] ?? "✓";
        return (
          <div key={field} className={styles.checkboxItem}>
            <input
              id={id}
              type="checkbox"
              name={field}
              checked={!!form[field]}
              onChange={onChange}
              className={styles.checkboxInput}
            />
            <label htmlFor={id} className={styles.checkboxTile}>
              <div className={styles.checkboxIcon} aria-hidden>
                {icon}
              </div>
              <div className={styles.checkboxLabel}>
                {TRIP_BOOL_LABELS[field] ?? field}
              </div>
            </label>
          </div>
        );
      })}
    </fieldset>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>טיולים</h2>
        <button onClick={onOpenAdd} className={styles.addButton}>
          + הוסף טיול
        </button>
      </div>

      {success && (
        <div style={{ color: "#16a34a", marginBottom: 8 }}>{success}</div>
      )}
      {error && (
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</div>
      )}

      {loading ? (
        <p className={styles.loading}>טוען...</p>
      ) : (
        <div className={styles.grid}>
          {list.map((item) => {
            const first = normalizeImagePath(
              "trips",
              item.trip_img || item.image
            );
            return (
              <article
                key={item.trip_id || item.id}
                className={styles.cardFrame}
                onClick={() => openDetails(item)}
                role="button"
                tabIndex={0}
              >
                <figure className={styles.cardFigure}>
                  {first ? (
                    <img
                      src={first}
                      alt={item.trip_name}
                      onError={(e) =>
                        (e.currentTarget.src = `${API_ORIGIN}/uploads/trips/placeholder.jpg`)
                      }
                    />
                  ) : (
                    <div className={styles.figurePlaceholder}>ללא תמונה</div>
                  )}
                </figure>
                <div className={styles.card}>
                  <div className={styles.cardBody}>
                    <h4 className={styles.title}>{item.trip_name}</h4>
                    <p className={styles.desc}>
                      {item.trip_description?.slice(0, 100) || ""}
                      {item.trip_description?.length > 100 ? "..." : ""}
                    </p>
                    <div className={styles.cardActions}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEdit(item);
                        }}
                        className={styles.editBtn}
                      >
                        עריכה
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ===== Details Modal (View) ===== */}
      {selected && (
        <div className={styles.modalOverlay} onClick={closeDetails}>
          <div
            className={`${styles.modal} ${styles.detailsModal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>פרטי טיול</h3>
              <button onClick={closeDetails} className={styles.closeBtn}>
                ✕
              </button>
            </div>

            <div className={`${styles.modalBody} ${styles.detailsBody}`}>
              <div className={styles.detailsTop}>
                <div className={styles.detailsImage}>
                  {(() => {
                    const img = normalizeImagePath(
                      "trips",
                      selected.trip_img || ""
                    );
                    return img ? (
                      <img
                        src={img}
                        alt={selected.trip_name}
                        onError={(e) =>
                          (e.currentTarget.src = `${API_ORIGIN}/uploads/trips/placeholder.jpg`)
                        }
                      />
                    ) : (
                      <div className={styles.previewPlaceholder}>אין תמונה</div>
                    );
                  })()}
                </div>

                <div className={styles.detailsHeaderBox}>
                  <h2 className={styles.detailsTitle}>
                    {selected.trip_name || "ללא שם"}
                  </h2>
                  <div className={styles.metaGrid}>
                    <div>
                      <span className={styles.metaKey}>משך:</span>{" "}
                      {selected.trip_duration || "—"}
                    </div>
                    <div>
                      <span className={styles.metaKey}>סוג:</span>{" "}
                      {selected.trip_type || "—"}
                    </div>
                    <div>
                      <span className={styles.metaKey}>אזור:</span>{" "}
                      {selected.region || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.detailsSection}>
                <div className={styles.sectionTitle}>תיאור</div>
                <p className={styles.detailsText}>
                  {selected.trip_description || "—"}
                </p>
              </div>

              {/* גלריה */}
              {normalizeImageList("trips", selected.trip_img).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <strong>תמונות:</strong>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(140px, 1fr))",
                      gap: 10,
                      marginTop: 8,
                    }}
                  >
                    {normalizeImageList("trips", selected.trip_img).map(
                      (u, i) => (
                        <img
                          key={u + i}
                          src={u}
                          alt={`${selected.trip_name || "תמונה"} ${i + 1}`}
                          style={{
                            width: "100%",
                            height: 120,
                            objectFit: "cover",
                            borderRadius: 10,
                          }}
                          onError={(e) => {
                            e.currentTarget.src = `${API_ORIGIN}/uploads/trips/placeholder.jpg`;
                          }}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              <div className={styles.detailsActionsRow}>
                <button
                  className={styles.editBtn}
                  onClick={() => {
                    onOpenEdit(selected);
                    closeDetails();
                  }}
                >
                  עריכה
                </button>
                <button className={styles.cancelBtn} onClick={closeDetails}>
                  סגירה
                </button>
              </div>

              {/* ביקורות */}
              <div style={{ marginTop: 18 }}>
                <Reviews
                  entityType="trip"
                  entityId={selected.trip_id || selected.id}
                  canWrite={false}
                  isAdmin={true}
                  currentUser={currentUserName}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Edit / Add Modal ===== */}
      {open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{isEdit ? "עריכת טיול" : "הוספת טיול"}</h3>
              <button
                onClick={() => setOpen(false)}
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {error && <div className={styles.error}>{error}</div>}
              <form onSubmit={onSubmit} className={styles.form}>
                <div className={styles.formLayout}>
                  <aside className={styles.previewBox}>
                    {/* גלריית תמונות קיימות עם מחיקה בודדת/מרובה */}
                    <div className={styles.previewFigure}>
                      {(form._images?.length ?? 0) > 0 ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(100px, 1fr))",
                            gap: 10,
                          }}
                        >
                          {form._images.map((token, idx) => {
                            const url = normalizeImageList("trips", [token])[0];
                            const tkn = stripToToken(token);
                            const checked = selectedTokens.has(tkn);
                            return (
                              <div
                                key={token + idx}
                                style={{ position: "relative" }}
                              >
                                <img
                                  src={url}
                                  alt={`img ${idx + 1}`}
                                  style={{
                                    width: "100%",
                                    height: 90,
                                    objectFit: "cover",
                                    borderRadius: 8,
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.src = `${API_ORIGIN}/uploads/trips/placeholder.jpg`;
                                  }}
                                />
                                {/* בחירה למחיקה מרובה */}
                                <label
                                  style={{
                                    position: "absolute",
                                    top: 6,
                                    right: 6,
                                    background: "rgba(255,255,255,.9)",
                                    borderRadius: 6,
                                    padding: "2px 6px",
                                    fontSize: 12,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleSelect(tkn)}
                                  />
                                  בחר
                                </label>
                                {/* מחיקה מיידית של אחת */}
                                <button
                                  type="button"
                                  title="מחק תמונה זו"
                                  onClick={() =>
                                    isEdit
                                      ? handleDeleteOneRemote(tkn)
                                      : removeExistingImageLocal(idx)
                                  }
                                  className={styles.deleteThumbBtn}
                                  style={{
                                    position: "absolute",
                                    bottom: 6,
                                    left: 6,
                                    background: "rgba(0,0,0,0.6)",
                                    color: "#fff",
                                    border: 0,
                                    borderRadius: 6,
                                    padding: "4px 6px",
                                    cursor: "pointer",
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={styles.previewPlaceholder}>
                          אין תמונות
                        </div>
                      )}
                    </div>

                    {/* מחיקה מרובה */}
                    {selectedTokens.size > 0 && (
                      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={handleDeleteSelected}
                          className={styles.dangerBtn}
                        >
                          מחק {selectedTokens.size} תמונות נבחרות
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTokens(new Set())}
                          className={styles.cancelBtn}
                        >
                          נקה בחירה
                        </button>
                      </div>
                    )}

                    {/* העלאת תמונות חדשות (מרובה) */}
                    <div className={styles.field} style={{ marginTop: 12 }}>
                      <label>העלאת תמונות חדשות</label>
                      <input
                        type="file"
                        accept="image/*"
                        name="trip_imgs" // ⬅️ חשוב — שם השדה כפי שהשרת מצפה
                        multiple // ⬅️ העלאה מרובה
                        className={styles.fileInput}
                        onChange={(e) =>
                          setNewFiles(Array.from(e.target.files || []))
                        }
                      />
                      {newFiles.length > 0 && (
                        <small style={{ color: "#555" }}>
                          {newFiles.length} קבצים נבחרו. השמירה תוסיף אותם
                          לגלריה.
                        </small>
                      )}
                    </div>
                  </aside>

                  <section className={styles.inputsBox}>
                    <div className={styles.twoCol}>
                      <div className={styles.field}>
                        <label>שם הטיול</label>
                        <input
                          className={styles.input}
                          name="trip_name"
                          value={form.trip_name}
                          onChange={onChange}
                          required
                        />
                      </div>
                      <div className={styles.field}>
                        <label>משך הטיול</label>
                        <input
                          className={styles.input}
                          name="trip_duration"
                          value={form.trip_duration}
                          onChange={onChange}
                        />
                      </div>
                      <div className={styles.field}>
                        <label>סוג הטיול</label>
                        <input
                          className={styles.input}
                          name="trip_type"
                          value={form.trip_type}
                          onChange={onChange}
                        />
                      </div>
                      <div className={styles.field}>
                        <label>אזור</label>
                        <input
                          className={styles.input}
                          name="region"
                          value={form.region}
                          onChange={onChange}
                        />
                      </div>

                      <div className={`${styles.field} ${styles.spanAll}`}>
                        <label>תיאור</label>
                        <textarea
                          className={styles.textarea}
                          name="trip_description"
                          value={form.trip_description}
                          onChange={onChange}
                          rows={4}
                        />
                      </div>

                      <div className={styles.spanAll}>
                        <BooleanCheckboxes fields={TRIP_BOOL_FIELDS} compact />
                      </div>
                    </div>

                    <div
                      className={`${styles.actions} ${styles.actionsSticky}`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className={styles.cancelBtn}
                      >
                        ביטול
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className={styles.saveBtn}
                      >
                        {saving ? "שומר..." : "שמירה"}
                      </button>
                    </div>
                  </section>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTrips;
