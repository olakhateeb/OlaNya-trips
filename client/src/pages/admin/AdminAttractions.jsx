// AdminAttractions.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getAttractions,
  createAttraction,
  updateAttraction,
  getAttractionDetails,
  adminDeleteOneImage,
  adminDeleteImages,
} from "../../services/api";
import Reviews from "../../components/reviews/Reviews";
import styles from "./adminAttractions.module.css";

/** ==== Helpers (local) ==== */
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
function normalizeImageList(type, rawOrTokens) {
  const list = Array.isArray(rawOrTokens)
    ? rawOrTokens
    : csvToList(rawOrTokens);
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
  if (!s.startsWith("http")) {
    return s.replace(/^\/+/, "");
  }
  try {
    const u = new URL(s);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.slice(-1)[0] || "";
  } catch {
    const parts = s.split("/").filter(Boolean);
    return parts.slice(-1)[0] || s;
  }
}

/** ==== Booleans (תואם לשרת) ==== */
const ATTR_BOOL_FIELDS = [
  "is_accessible",
  "has_parking",
  "has_toilets",
  "pet_friendly",
  "romantic",
  "couple_friendly",
  "has_water_activities",
  "suitable_for_groups",
  "has_entry_fee",
  "requires_reservation",
  "is_recommended",
];

const ATTR_BOOL_LABELS = {
  is_accessible: "נגיש לנכים",
  has_parking: "חניה",
  has_toilets: "שירותים",
  pet_friendly: "ידידותי לחיות מחמד",
  romantic: "רומנטי",
  couple_friendly: "מתאים לזוגות",
  has_water_activities: "פעילויות מים",
  suitable_for_groups: "מתאים לקבוצות",
  has_entry_fee: "דמי כניסה",
  requires_reservation: "דורש הזמנה מראש",
  is_recommended: "מועדף",
};

const ICONS = {
  has_water_activities: "💧",
  couple_friendly: "💑",
  romantic: "💖",
  suitable_for_groups: "👥",
  pet_friendly: "🐾",
  has_toilets: "🚻",
  has_parking: "🅿️",
  is_accessible: "♿",
  has_entry_fee: "💳",
  requires_reservation: "📅",
  is_recommended: "⭐",
};

const defaultAttrForm = {
  attraction_id: null,
  attraction_name: "",
  attraction_type: "",
  attraction_description: "",
  attraction_img: "", // CSV string
  _images: [], // tokens (local only)
  region: "",
  is_accessible: false,
  has_parking: false,
  has_toilets: false,
  pet_friendly: false,
  romantic: false,
  couple_friendly: false,
  has_water_activities: false,
  suitable_for_groups: false,
  has_entry_fee: false,
  requires_reservation: false,
  is_recommended: false,
};

const AdminAttractions = () => {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(defaultAttrForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // תמונות חדשות (מרובה)
  const [newFiles, setNewFiles] = useState([]);
  // מחיקה מרובה
  const [selectedTokens, setSelectedTokens] = useState(new Set());

  // פרטי אטרקציה במודאל
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailsCache, setDetailsCache] = useState({}); // { [id]: fullDetails }

  // פרטי משתמש נוכחי (ל־Reviews)
  const currentUserName = (() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?.userName || user?.username || "";
    } catch {
      return "";
    }
  })();

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await getAttractions();
      const arr = Array.isArray(res?.data)
        ? res.data
        : res?.data?.attractions || [];
      setList(arr);
    } catch (e) {
      console.error(e);
      setError("שגיאה בטעינת אטרקציות (ודאי שהראוט קיים ושיש הרשאות Admin)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // ניהול גלילת רקע עבור שני מודאלים (עריכה/פרטים)
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open || detailOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, detailOpen]);

  const isEdit = useMemo(() => !!form.attraction_id, [form.attraction_id]);

  const onOpenAdd = () => {
    setForm(defaultAttrForm);
    setNewFiles([]);
    setSelectedTokens(new Set());
    setError("");
    setOpen(true);
  };

  const onOpenEdit = (item) => {
    const tokens = csvToList(item.attraction_img);
    setForm({
      ...defaultAttrForm,
      ...item,
      attraction_id: item.attraction_id || item.id || null,
      attraction_img: item.attraction_img || "",
      _images: tokens,
      ...Object.fromEntries(ATTR_BOOL_FIELDS.map((k) => [k, !!item[k]])),
    });
    setNewFiles([]);
    setSelectedTokens(new Set());
    setError("");
    setOpen(true);
  };

  const onChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") setForm((s) => ({ ...s, [name]: !!checked }));
    else if (type === "file") setNewFiles(Array.from(files || []));
    else setForm((s) => ({ ...s, [name]: value }));
  };

  const removeExistingImageLocal = (idx) => {
    setForm((s) => {
      const next = [...(s._images || [])];
      next.splice(idx, 1);
      return { ...s, _images: next, attraction_img: joinCsv(next) };
    });
  };

  const handleDeleteOneRemote = async (token) => {
    if (!form.attraction_id) {
      const idx = (form._images || []).indexOf(token);
      if (idx >= 0) removeExistingImageLocal(idx);
      return;
    }
    try {
      await adminDeleteOneImage("attractions", form.attraction_id, token);
      setForm((s) => {
        const next = (s._images || []).filter((t) => t !== token);
        return { ...s, _images: next, attraction_img: joinCsv(next) };
      });
      setSelectedTokens((prev) => {
        const n = new Set(prev);
        n.delete(stripToToken(token));
        return n;
      });
      await fetchList();
    } catch (err) {
      console.error(err);
      alert("מחיקת התמונה נכשלה");
    }
  };

  const toggleSelect = (token) => {
    const tkn = stripToToken(token);
    setSelectedTokens((prev) => {
      const next = new Set(prev);
      next.has(tkn) ? next.delete(tkn) : next.add(tkn);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    const tokens = Array.from(selectedTokens || []);
    if (!tokens.length) return;

    if (!form.attraction_id) {
      setForm((s) => {
        const keep = (s._images || []).filter(
          (t) => !new Set(tokens).has(stripToToken(t))
        );
        return { ...s, _images: keep, attraction_img: joinCsv(keep) };
      });
      setSelectedTokens(new Set());
      return;
    }

    try {
      await adminDeleteImages("attractions", form.attraction_id, tokens);
      setForm((s) => {
        const keep = (s._images || []).filter(
          (t) => !new Set(tokens).has(stripToToken(t))
        );
        return { ...s, _images: keep, attraction_img: joinCsv(keep) };
      });
      setSelectedTokens(new Set());
      await fetchList();
    } catch (err) {
      console.error(err);
      alert("מחיקה מרובה נכשלה");
    }
  };

  /** בניית FormData: מיזוג CSV קיים + תמונות חדשות (שדה attraction_imgs) */
  const buildFormData = (obj) => {
    const fd = new FormData();
    const clean = { ...obj };

    // המרת בוליאנים ל-0/1
    ATTR_BOOL_FIELDS.forEach((k) => {
      if (k in clean) clean[k] = clean[k] ? 1 : 0;
    });

    // סנכרון ה-CSV לפי הרשימה המקומית
    clean.attraction_img = joinCsv(clean._images || []);

    // הוספת שדות רגילים (בלי PK ובלי _images)
    Object.entries(clean).forEach(([k, v]) => {
      if (k === "_images") return;
      if (k === "attraction_id") return;
      if (k === "attraction_img" && (v == null || String(v).trim() === ""))
        return;
      if (v == null) return;
      fd.append(k, v);
    });

    // תמונות חדשות
    for (const f of newFiles) {
      fd.append("attraction_imgs", f);
    }

    return fd;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = buildFormData(form);
      if (isEdit) {
        await updateAttraction(form.attraction_id, fd);
        if (detailId === form.attraction_id) {
          setDetailsCache((prev) => {
            const n = { ...prev };
            delete n[detailId];
            return n;
          });
          await openDetailsById(detailId, true);
        }
      } else {
        await createAttraction(fd);
      }
      setOpen(false);
      await fetchList();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  // ----- Details Modal -----
  const openDetails = async (item) => {
    const id = item.attraction_id ?? item.id;
    if (!id) return;
    await openDetailsById(id);
  };

  const openDetailsById = async (id, force = false) => {
    setDetailId(id);
    setDetailOpen(true);
    if (!force && detailsCache[id]) return;
    try {
      setDetailLoading(true);
      const res = await getAttractionDetails(id);
      const full = res?.data ?? res;
      setDetailsCache((prev) => ({ ...prev, [id]: full }));
    } catch (e) {
      console.error("Failed to load attraction details:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailOpen(false);
    setDetailId(null);
  };

  const BooleanBadges = ({ record }) => {
    const active = ATTR_BOOL_FIELDS.filter((k) => !!record?.[k]);
    if (active.length === 0) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {active.map((k) => (
          <span
            key={k}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e6e6e6",
              fontSize: 13,
              background: "#fafafa",
            }}
            title={ATTR_BOOL_LABELS[k] ?? k}
          >
            <span aria-hidden>{ICONS[k] ?? "✓"}</span>
            {ATTR_BOOL_LABELS[k] ?? k}
          </span>
        ))}
      </div>
    );
  };

  const DetailsModal = () => {
    if (!detailOpen || !detailId) return null;
    const base = list.find((x) => (x.attraction_id ?? x.id) === detailId) || {};
    const full = detailsCache[detailId] || {};
    const data = { ...base, ...full };
    const imgUrl = normalizeImagePath("attractions", data.attraction_img);
    const imgList = normalizeImageList("attractions", data.attraction_img);

    return (
      <div className={styles.modalOverlay} onClick={closeDetails}>
        <div
          className={styles.modal}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(980px, 94vw)",
            maxHeight: "86vh",
            overflow: "auto",
          }}
        >
          <div className={styles.modalHeader}>
            <h3>פרטי אטרקציה</h3>
            <button onClick={closeDetails} className={styles.closeBtn}>
              ✕
            </button>
          </div>

          <div className={styles.modalBody}>
            {detailLoading ? (
              <div style={{ padding: 12, color: "#777" }}>טוען פרטים...</div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "260px 1fr",
                    gap: 20,
                  }}
                >
                  <div>
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={data.attraction_name || "תמונה"}
                        style={{
                          width: "100%",
                          height: 180,
                          objectFit: "cover",
                          borderRadius: 12,
                        }}
                        onError={(e) => {
                          e.currentTarget.src = `${API_ORIGIN}/uploads/attractions/placeholder.jpg`;
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: 180,
                          borderRadius: 12,
                          background: "#f3f3f3",
                          display: "grid",
                          placeItems: "center",
                          color: "#888",
                        }}
                      >
                        ללא תמונה
                      </div>
                    )}
                  </div>

                  <div>
                    <h2
                      style={{
                        marginTop: 0,
                        marginBottom: 8,
                        fontSize: 22,
                        fontWeight: 800,
                        textAlign: "center",
                      }}
                    >
                      {data.attraction_name || "—"}
                    </h2>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2,auto)",
                        gap: 12,
                        justifyContent: "center",
                        marginBottom: 12,
                        fontSize: 14,
                      }}
                    >
                      <div>
                        <strong>סוג:</strong> {data.attraction_type || "—"}
                      </div>
                      <div>
                        <strong>אזור:</strong> {data.region || "—"}
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <strong>תיאור:</strong>
                      <div
                        style={{
                          marginTop: 6,
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {data.attraction_description || "—"}
                      </div>
                    </div>

                    <BooleanBadges record={data} />

                    {/* גלריה של כל התמונות */}
                    {imgList.length > 0 && (
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
                          {imgList.map((u, i) => (
                            <img
                              key={u + i}
                              src={u}
                              alt={`${data.attraction_name || "תמונה"} ${
                                i + 1
                              }`}
                              style={{
                                width: "100%",
                                height: 120,
                                objectFit: "cover",
                                borderRadius: 10,
                              }}
                              onError={(e) => {
                                e.currentTarget.src = `${API_ORIGIN}/uploads/attractions/placeholder.jpg`;
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 10,
                        marginTop: 16,
                      }}
                    >
                      <button
                        className={styles.editBtn}
                        type="button"
                        onClick={() => {
                          closeDetails();
                          onOpenEdit(data);
                        }}
                      >
                        עריכה
                      </button>
                      <button
                        className={styles.cancelBtn}
                        type="button"
                        onClick={closeDetails}
                      >
                        סגור
                      </button>
                    </div>
                  </div>
                </div>

                {/* ביקורות */}
                <div style={{ marginTop: 18 }}>
                  <Reviews
                    entityType="attraction"
                    entityId={detailId}
                    canWrite={false}
                    isAdmin={true}
                    currentUser={currentUserName}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const onCardClick = (item) => {
    openDetails(item);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>אטרקציות</h2>
        <button onClick={onOpenAdd} className={styles.addButton}>
          הוסף אטרקציה
        </button>
      </div>

      {loading ? (
        <p>טוען...</p>
      ) : (
        <div className={styles.grid}>
          {list.map((item, idx) => {
            const firstUrl = normalizeImagePath(
              "attractions",
              item.attraction_img
            );
            const id = item.attraction_id ?? item.id ?? idx;

            return (
              <article
                key={`attr-${id}`}
                className={styles.cardFrame}
                onClick={() => onCardClick(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onCardClick(item);
                  }
                }}
                role="button"
                tabIndex={0}
                title="לחצי לצפייה בפרטים"
                style={{ cursor: "pointer" }}
              >
                <figure className={styles.cardFigure}>
                  {firstUrl ? (
                    <img
                      src={firstUrl}
                      alt={item.attraction_name}
                      onError={(e) => {
                        e.currentTarget.src = `${API_ORIGIN}/uploads/attractions/placeholder.jpg`;
                      }}
                    />
                  ) : (
                    <div className={styles.figurePlaceholder}>ללא תמונה</div>
                  )}
                </figure>

                <div className={styles.card}>
                  <div className={styles.cardBody}>
                    <h4 className={styles.title}>{item.attraction_name}</h4>
                    <p className={styles.desc}>
                      {item.attraction_description?.slice(0, 100) || ""}
                      {item.attraction_description?.length > 100 ? "..." : ""}
                    </p>

                    <div className={styles.cardActions}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEdit(item);
                        }}
                        className={styles.editBtn}
                        type="button"
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

      {/* פרטי אטרקציה - מודאל */}
      <DetailsModal />

      {/* מודאל הוספה/עריכה */}
      {open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{isEdit ? "עריכת אטרקציה" : "הוספת אטרקציה"}</h3>
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
                    {/* גלריה עם מחיקה בודדת/מרובה */}
                    <div className={styles.previewFigure}>
                      {form._images?.length ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(100px, 1fr))",
                            gap: 10,
                          }}
                        >
                          {form._images.map((token, idx) => {
                            const url = normalizeImageList("attractions", [
                              token,
                            ])[0];
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
                                    e.currentTarget.src = `${API_ORIGIN}/uploads/attractions/placeholder.jpg`;
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
                                </label>
                                {/* מחיקה מיידית */}
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
                        className={styles.fileInput}
                        type="file"
                        accept="image/*"
                        name="attraction_imgs"
                        multiple
                        onChange={onChange}
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
                        <label>שם האטרקציה</label>
                        <input
                          className={styles.input}
                          name="attraction_name"
                          value={form.attraction_name}
                          onChange={onChange}
                          required
                        />
                      </div>

                      <div className={styles.field}>
                        <label>סוג</label>
                        <input
                          className={styles.input}
                          name="attraction_type"
                          value={form.attraction_type}
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
                          name="attraction_description"
                          value={form.attraction_description}
                          onChange={onChange}
                          rows={4}
                        />
                      </div>

                      <div className={styles.spanAll}>
                        <fieldset
                          className={`${styles.checkboxGroup} ${styles.compactTiles}`}
                        >
                          <legend className={styles.checkboxLegend}>
                            תכונות
                          </legend>
                          {ATTR_BOOL_FIELDS.map((field) => {
                            const id = `attr_${field}`;
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
                                <label
                                  htmlFor={id}
                                  className={styles.checkboxTile}
                                >
                                  <div
                                    className={styles.checkboxIcon}
                                    aria-hidden
                                  >
                                    {icon}
                                  </div>
                                  <div className={styles.checkboxLabel}>
                                    {ATTR_BOOL_LABELS?.[field] ?? field}
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                        </fieldset>
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

export default AdminAttractions;
