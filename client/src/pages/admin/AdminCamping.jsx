// AdminCamping.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getCampingSpots,
  createCamping,
  updateCamping,
  adminDeleteOneImage,
  adminDeleteImages,
} from "../../services/api";
import Reviews from "../../components/reviews/Reviews";
import styles from "./adminCamping.module.css";

/** Helpers */
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

/** Booleans (תואם לטבלה שלך) */
const CAMP_BOOL_FIELDS = [
  "is_accessible",
  "has_parking",
  "has_toilets",
  "pet_friendly",
  "family_friendly",
  "romantic",
  "couple_friendly",
  "near_water",
  "bbq_area",
  "night_camping",
  "suitable_for_groups",
  "has_entry_fee",
  "is_recommended",
];
const CAMP_BOOL_LABELS = {
  is_accessible: "נגיש",
  has_parking: "חניה",
  has_toilets: "שירותים",
  pet_friendly: "ידידותי לחיות מחמד",
  family_friendly: "מתאים למשפחות",
  romantic: "רומנטי",
  couple_friendly: "מתאים לזוגות",
  near_water: "ליד מים",
  bbq_area: "אזור מנגל",
  night_camping: "קמפינג לילה",
  suitable_for_groups: "מתאים לקבוצות",
  has_entry_fee: "דמי כניסה",
  is_recommended: "מועדף",
};
const ICONS = {
  near_water: "💧",
  couple_friendly: "💑",
  romantic: "💖",
  family_friendly: "👨‍👩‍👧",
  suitable_for_groups: "👥",
  pet_friendly: "🐾",
  has_toilets: "🚻",
  has_parking: "🅿️",
  night_camping: "🌙",
  has_entry_fee: "💳",
  bbq_area: "🍖",
  is_recommended: "⭐",
  is_accessible: "♿",
};

const defaultCampForm = {
  id: null, // ה-PK: camping_location_name
  camping_location_name: "",
  camping_description: "",
  camping_duration: "",
  camping_img: "", // CSV
  _images: [], // tokens
  region: "",
  // booleans
  is_accessible: false,
  has_parking: false,
  has_toilets: false,
  pet_friendly: false,
  family_friendly: false,
  romantic: false,
  couple_friendly: false,
  near_water: false,
  bbq_area: false,
  night_camping: false,
  suitable_for_groups: false,
  has_entry_fee: false,
  is_recommended: false,
};

const AdminCamping = () => {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(defaultCampForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // קבצים חדשים להעלאה (מרובה)
  const [newFiles, setNewFiles] = useState([]);
  // בחירות למחיקה מרובה
  const [selectedTokens, setSelectedTokens] = useState(new Set());

  // View Details
  const [selected, setSelected] = useState(null);
  const openDetails = (item) => setSelected(item);
  const closeDetails = () => setSelected(null);

  // שם משתמש ל-Reviews
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
      const res = await getCampingSpots();
      const arr = Array.isArray(res?.data)
        ? res.data
        : res?.data?.camping || [];
      setList(arr);
    } catch (e) {
      console.error(e);
      setError("שגיאה בטעינת קמפינג");
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

  const isEdit = useMemo(() => !!form.id, [form.id]);

  const onOpenAdd = () => {
    setForm(defaultCampForm);
    setNewFiles([]);
    setSelectedTokens(new Set());
    setOpen(true);
    setError("");
  };

  const onOpenEdit = (item) => {
    const id = item.camping_location_name;
    const tokens = csvToList(item.camping_img);
    setForm({
      ...defaultCampForm,
      ...item,
      id,
      camping_img: item.camping_img || "",
      _images: tokens,
      ...Object.fromEntries(CAMP_BOOL_FIELDS.map((k) => [k, !!item[k]])),
    });
    setNewFiles([]);
    setSelectedTokens(new Set());
    setOpen(true);
    setError("");
  };

  const onChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") setForm((s) => ({ ...s, [name]: !!checked }));
    else if (type === "file") setNewFiles(Array.from(files || []));
    else setForm((s) => ({ ...s, [name]: value }));
  };

  // מחיקה מקומית מתמונות קיימות (כשעדיין לא שמרנו)
  const removeExistingImageLocal = (idx) => {
    setForm((s) => {
      const next = [...(s._images || [])];
      next.splice(idx, 1);
      return { ...s, _images: next, camping_img: joinCsv(next) };
    });
  };

  // מחיקה מיידית מהשרת של תמונה בודדת (כשבעריכה)
  const handleDeleteOneRemote = async (token) => {
    if (!form.id) {
      const idx = (form._images || []).indexOf(token);
      if (idx >= 0) removeExistingImageLocal(idx);
      return;
    }
    try {
      await adminDeleteOneImage("camping", encodeURIComponent(form.id), token);
      setForm((s) => {
        const next = (s._images || []).filter((t) => t !== token);
        return { ...s, _images: next, camping_img: joinCsv(next) };
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

    if (!form.id) {
      setForm((s) => {
        const keep = (s._images || []).filter(
          (t) => !new Set(tokens).has(stripToToken(t))
        );
        return { ...s, _images: keep, camping_img: joinCsv(keep) };
      });
      setSelectedTokens(new Set());
      return;
    }

    try {
      await adminDeleteImages("camping", encodeURIComponent(form.id), tokens);
      setForm((s) => {
        const keep = (s._images || []).filter(
          (t) => !new Set(tokens).has(stripToToken(t))
        );
        return { ...s, _images: keep, camping_img: joinCsv(keep) };
      });
      setSelectedTokens(new Set());
      await fetchList();
    } catch (err) {
      console.error(err);
      alert("מחיקה מרובה נכשלה");
    }
  };

  // בניית FormData: מיזוג ה־CSV הקיים עם קבצים חדשים
  const buildFormData = (obj) => {
    const fd = new FormData();

    // סנכרון CSV עם הרשימה לאחר מחיקות מקומיות
    const synced = { ...obj, camping_img: joinCsv(obj._images || []) };

    // בוליאנים ל־0/1
    CAMP_BOOL_FIELDS.forEach((k) => {
      if (k in synced) synced[k] = synced[k] ? 1 : 0;
    });

    // שדות רגילים
    Object.entries(synced).forEach(([k, v]) => {
      if (k === "_images") return;
      if (k === "id") return;
      if (k === "camping_img" && (v == null || String(v).trim() === "")) return;
      if (v == null) return;
      fd.append(k, v);
    });

    // הוספת קבצים חדשים תחת השדה שהשרת מצפה לו: camping_imgs
    for (const f of newFiles) {
      fd.append("camping_imgs", f);
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
        await updateCamping(encodeURIComponent(form.id), fd);
      } else {
        await createCamping(fd);
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

  const BooleanCheckboxes = ({ fields, labels, compact = false }) => (
    <fieldset
      className={`${styles.checkboxGroup} ${
        compact ? styles.compactTiles : ""
      }`}
    >
      <legend className={styles.checkboxLegend}>תכונות</legend>
      {fields.map((field) => {
        const id = `camp_${field}`;
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
                {labels?.[field] ?? field}
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
        <h2>קמפינג</h2>
        <button onClick={onOpenAdd} className={styles.addButton}>
          הוסף קמפינג
        </button>
      </div>

      {loading ? (
        <p>טוען...</p>
      ) : (
        <div className={styles.grid}>
          {list.map((item, idx) => {
            const first = normalizeImagePath("camping", item.camping_img);
            const keyStr = String(item.camping_location_name ?? idx);
            return (
              <article
                key={`camp-${keyStr}`}
                className={styles.cardFrame}
                onClick={() => openDetails(item)}
                role="button"
                tabIndex={0}
              >
                <figure className={styles.cardFigure}>
                  {first ? (
                    <img
                      src={first}
                      alt={item.camping_location_name}
                      onError={(e) =>
                        (e.currentTarget.src = `${API_ORIGIN}/uploads/camping/placeholder.jpg`)
                      }
                    />
                  ) : (
                    <div className={styles.figurePlaceholder}>ללא תמונה</div>
                  )}
                </figure>
                <div className={styles.card}>
                  <div className={styles.cardBody}>
                    <h4 className={styles.title}>
                      {item.camping_location_name}
                    </h4>
                    <p className={styles.desc}>
                      {item.camping_description?.slice(0, 100) || ""}
                      {item.camping_description?.length > 100 ? "..." : ""}
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
              <h3>פרטי קמפינג</h3>
              <button onClick={closeDetails} className={styles.closeBtn}>
                ✕
              </button>
            </div>

            <div className={`${styles.modalBody} ${styles.detailsBody}`}>
              <div className={styles.detailsTop}>
                <div className={styles.detailsImage}>
                  {(() => {
                    const img = normalizeImagePath(
                      "camping",
                      selected.camping_img || ""
                    );
                    return img ? (
                      <img
                        src={img}
                        alt={selected.camping_location_name}
                        onError={(e) =>
                          (e.currentTarget.src = `${API_ORIGIN}/uploads/camping/placeholder.jpg`)
                        }
                      />
                    ) : (
                      <div className={styles.previewPlaceholder}>אין תמונה</div>
                    );
                  })()}
                </div>

                <div className={styles.detailsHeaderBox}>
                  <h2 className={styles.detailsTitle}>
                    {selected.camping_location_name || "ללא שם"}
                  </h2>
                  <div className={styles.metaGrid}>
                    <div>
                      <span className={styles.metaKey}>משך:</span>{" "}
                      {selected.camping_duration || "—"}
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
                  {selected.camping_description || "—"}
                </p>
              </div>

              <div className={styles.detailsSection}>
                <div className={styles.sectionTitle}>תכונות</div>
                <div className={styles.chips}>
                  {CAMP_BOOL_FIELDS.map((k) => {
                    const enabled = !!selected[k];
                    if (!enabled) return null;
                    const icon = ICONS[k] ?? "✓";
                    return (
                      <span key={k} className={styles.chip}>
                        <span className={styles.chipIcon} aria-hidden>
                          {icon}
                        </span>
                        {CAMP_BOOL_LABELS[k] ?? k}
                      </span>
                    );
                  })}
                  {CAMP_BOOL_FIELDS.every((k) => !selected[k]) && (
                    <span className={styles.chipMuted}>אין תכונות מסומנות</span>
                  )}
                </div>
              </div>

              {/* גלריה */}
              {normalizeImageList("camping", selected.camping_img).length >
                0 && (
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
                    {normalizeImageList("camping", selected.camping_img).map(
                      (u, i) => (
                        <img
                          key={u + i}
                          src={u}
                          alt={`${selected.camping_location_name || "תמונה"} ${
                            i + 1
                          }`}
                          style={{
                            width: "100%",
                            height: 120,
                            objectFit: "cover",
                            borderRadius: 10,
                          }}
                          onError={(e) => {
                            e.currentTarget.src = `${API_ORIGIN}/uploads/camping/placeholder.jpg`;
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
                  entityType="camping"
                  entityId={selected.camping_location_name}
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
              <h3>{isEdit ? "עריכת קמפינג" : "הוספת קמפינג"}</h3>
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
                            const url = normalizeImageList("camping", [
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
                                    e.currentTarget.src = `${API_ORIGIN}/uploads/camping/placeholder.jpg`;
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
                        type="file"
                        accept="image/*"
                        name="camping_imgs"
                        multiple
                        className={styles.fileInput}
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
                        <label>שם מיקום </label>
                        <input
                          className={styles.input}
                          name="camping_location_name"
                          value={form.camping_location_name}
                          onChange={onChange}
                          required
                          disabled={isEdit}
                        />
                      </div>
                      <div className={styles.field}>
                        <label>משך</label>
                        <input
                          className={styles.input}
                          name="camping_duration"
                          value={form.camping_duration}
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
                          name="camping_description"
                          value={form.camping_description}
                          onChange={onChange}
                          rows={4}
                        />
                      </div>

                      <div className={styles.spanAll}>
                        <BooleanCheckboxes
                          fields={CAMP_BOOL_FIELDS}
                          labels={CAMP_BOOL_LABELS}
                          compact
                        />
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

export default AdminCamping;
