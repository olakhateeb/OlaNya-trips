// src/pages/search/SearchPage.jsx
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { searchAll } from "../../services/api";
import styles from "./search-page.module.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const TYPE_KEYWORDS = [
  "טבע",
  "מים",
  "מסלולים בעיר",
  "אתרים ארכיאולוגיים",
  "אופניים",
  "אופנוע",
  "ספורט מים",
  "אתגר",
  "חיות",
];

const normalizeSingleType = (value) => {
  if (!value) return "";
  const first = String(value)
    .split(/[,;\/\n\|]+/)[0]
    .trim();
  return first;
};

const STORAGE_KEY = "searchState";
const FROM_FLAG = "cameFromSearch";

const SearchPage = () => {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    q: "",
    region: "all",
    is_accessible: false,
    has_parking: false,
    has_toilets: false,
    pet_friendly: false,
    family_friendly: false,
    romantic: false,
    couple_friendly: false,
    has_water_activities: false,
    near_water: false,
    bbq_area: false,
    suitable_for_groups: false,
    has_entry_fee: false,
  });

  const [results, setResults] = useState({
    trips: [],
    attractions: [],
    campings: [],
  });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // --- helpers for storage ---
  const clearSearchSession = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(FROM_FLAG);
  };
  const saveSearchSession = (stateFilters, nextResults) => {
    const pack = {
      filters: stateFilters,
      results: nextResults,
      searched: true,
      scrollY: window.scrollY || 0,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
  };

  // שחזור רק אם חזרנו מדף פרטים (דגל FROM_FLAG)
  useEffect(() => {
    const cameFromSearch = sessionStorage.getItem(FROM_FLAG) === "1";
    if (!cameFromSearch) return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.filters) setFilters(saved.filters);
      if (saved?.results) setResults(saved.results);
      if (saved?.searched) setSearched(true);
      if (typeof saved.scrollY === "number") {
        setTimeout(() => window.scrollTo(0, saved.scrollY || 0), 0);
      }
    } catch {}
    // ננקה את הדגל תמיד אחרי שחזור
    sessionStorage.removeItem(FROM_FLAG);
  }, []);

  const isFormValid = useCallback(
    (state = filters) => {
      const errs = {};
      if (!state.q || !state.q.trim()) errs.q = "יש להזין מילת חיפוש";
      if (!state.region || state.region === "all")
        errs.region = "יש לבחור אזור";
      setFieldErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [filters]
  );

  const buildPayload = (state = filters) => {
    const payload = {};
    if (state.q?.trim()) payload.q = state.q.trim();
    if (state.region && state.region !== "all") payload.region = state.region;
    [
      "is_accessible",
      "has_parking",
      "has_toilets",
      "pet_friendly",
      "family_friendly",
      "romantic",
      "couple_friendly",
      "has_water_activities",
      "near_water",
      "bbq_area",
      "suitable_for_groups",
      "has_entry_fee",
    ].forEach((k) => {
      if (state[k] === true) payload[k] = true;
    });
    return payload;
  };

  // תמיד שומרות תוצאה אחרי שקיבלנו נתונים
  const doSearch = useCallback(
    async (state = filters) => {
      setError("");
      setLoading(true);
      try {
        const payload = buildPayload(state);
        const { data } = await searchAll(payload);
        const nextResults = {
          trips: data?.trips || [],
          attractions: data?.attractions || [],
          campings: data?.campings || [],
        };
        setResults(nextResults);
        setSearched(true);
        saveSearchSession(state, nextResults); // ← שמירה לצורך דפדוף/חזרה
      } catch (err) {
        console.error("searchAll error:", err);
        setError("קרתה שגיאה בעת החיפוש. נסה/י שוב.");
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // שינוי פילטר → מוחקים מצב ישן ואז מחפשים חדש (אם תקין)
  const runSearchIfValid = useCallback(
    (state) => {
      if (!isFormValid(state)) return;
      clearSearchSession(); // ← מוחק את התוצאה הקודמת
      doSearch(state); // ← מחפש ושומר תוצאה חדשה
    },
    [isFormValid, doSearch]
  );

  const handleText = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      const normalized = name === "q" ? normalizeSingleType(value) : value;
      const next = { ...prev, [name]: normalized };
      // מחיקה + חיפוש חדש רק כששדה תקין
      if (isFormValid(next)) {
        clearSearchSession();
        doSearch(next);
      } else {
        setFieldErrors((errs) => ({ ...errs })); // רק עדכון שגיאות בלי חיפוש
      }
      return next;
    });
  };

  const toggleBool = (key) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === "has_water_activities" && !prev.has_water_activities)
        next.near_water = true;
      if (key === "near_water" && !prev.near_water)
        next.has_water_activities = true;
      runSearchIfValid(next);
      return next;
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;
    clearSearchSession(); // ← לפני חיפוש ידני מוחקים הישן
    await doSearch(); // ← מביא ושומר חדש
  };

  // לפני פתיחת פריט — שומרים מצב קיים ומסמנים שחוזרים מהחיפוש
  const handleBeforeOpen = () => {
    saveSearchSession(filters, results);
    sessionStorage.setItem(FROM_FLAG, "1");
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>חיפוש כללי</h1>

      <section className={styles.searchIntro} aria-label="מידע על החיפוש">
        <p className={styles.searchIntroText}>
          אפשר לחפש כאן <strong>טיולים, אטרקציות וקמפינג</strong> ביחד. בחרו{" "}
          <strong>סוג אחד</strong> בתיבת החיפוש או הקליקו על אחד הסוגים הבאים:
        </p>

        <div className={styles.keywordChips} role="list">
          {TYPE_KEYWORDS.map((kw) => (
            <button
              key={kw}
              type="button"
              role="listitem"
              className={`${styles.chip} ${
                filters.q === kw ? styles.chipSelected : ""
              }`}
              onClick={() =>
                setFilters((prev) => {
                  const next = { ...prev, q: kw };
                  runSearchIfValid(next);
                  return next;
                })
              }
            >
              {kw}
            </button>
          ))}
          {filters.q && (
            <button
              type="button"
              className={`${styles.chip} ${styles.chipClear}`}
              onClick={() =>
                setFilters((prev) => {
                  const next = { ...prev, q: "" };
                  // ניקוי בלבד אם ריק, לא מחפשים
                  clearSearchSession();
                  setSearched(false);
                  setResults({ trips: [], attractions: [], campings: [] });
                  return next;
                })
              }
            >
              ניקוי
            </button>
          )}
        </div>

        <div className={styles.searchTips}>
          טיפ: ניתן לשנות סוג בלחיצה על צ’יפ אחר, או לנקות ולבחור מחדש. בשדה
          “מילות חיפוש” אפשר להקליד <strong>סוג אחד בלבד</strong>.
        </div>
      </section>

      <form className={styles.form} onSubmit={handleSearch} noValidate>
        <div className={styles.controlsRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="q">
              מילות חיפוש <span className={styles.req}>*</span>
            </label>
            <input
              id="q"
              name="q"
              value={filters.q}
              onChange={handleText}
              placeholder=""
              className={`${styles.input} ${
                fieldErrors.q ? styles.inputError : ""
              }`}
              required
            />
            {fieldErrors.q && (
              <div className={styles.fieldError}>{fieldErrors.q}</div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="region">
              אזור <span className={styles.req}>*</span>
            </label>
            <select
              id="region"
              name="region"
              value={filters.region}
              onChange={handleText}
              className={`${styles.select} ${
                fieldErrors.region ? styles.inputError : ""
              }`}
              required
            >
              <option value="all">בחר/י אזור…</option>
              <option value="צפון">צפון</option>
              <option value="מרכז">מרכז</option>
              <option value="דרום">דרום</option>
            </select>
            {fieldErrors.region && (
              <div className={styles.fieldError}>{fieldErrors.region}</div>
            )}
          </div>
        </div>

        <fieldset className={styles.checkboxGroup} aria-label="מאפיינים">
          <legend className={styles.checkboxGroupLegend}>מאפיינים</legend>
          <CheckboxTile
            id="is_accessible"
            label="נגיש"
            icon="♿"
            checked={filters.is_accessible}
            onChange={() => toggleBool("is_accessible")}
          />
          <CheckboxTile
            id="has_parking"
            label="חניה"
            icon="🅿️"
            checked={filters.has_parking}
            onChange={() => toggleBool("has_parking")}
          />
          <CheckboxTile
            id="has_toilets"
            label="שירותים"
            icon="🚻"
            checked={filters.has_toilets}
            onChange={() => toggleBool("has_toilets")}
          />
          <CheckboxTile
            id="pet_friendly"
            label="ידידותי לחיות"
            icon="🐾"
            checked={filters.pet_friendly}
            onChange={() => toggleBool("pet_friendly")}
          />
          <CheckboxTile
            id="family_friendly"
            label="מתאים למשפחות"
            icon="👨‍👩‍👧‍👦"
            checked={filters.family_friendly}
            onChange={() => toggleBool("family_friendly")}
          />
          <CheckboxTile
            id="romantic"
            label="רומנטי"
            icon="💞"
            checked={filters.romantic}
            onChange={() => toggleBool("romantic")}
          />
          <CheckboxTile
            id="couple_friendly"
            label="מתאים לזוגות"
            icon="💑"
            checked={filters.couple_friendly}
            onChange={() => toggleBool("couple_friendly")}
          />
          <CheckboxTile
            id="water"
            label="ליד מים / פעילויות מים"
            icon="💧"
            checked={filters.has_water_activities || filters.near_water}
            onChange={() => {
              toggleBool("has_water_activities");
              toggleBool("near_water");
            }}
          />
          <CheckboxTile
            id="bbq_area"
            label="אזור על האש"
            icon="🍖"
            checked={filters.bbq_area}
            onChange={() => toggleBool("bbq_area")}
          />
          <CheckboxTile
            id="suitable_for_groups"
            label="מתאים לקבוצות"
            icon="👥"
            checked={filters.suitable_for_groups}
            onChange={() => toggleBool("suitable_for_groups")}
          />
          <CheckboxTile
            id="has_entry_fee"
            label="דמי כניסה"
            icon="💳"
            checked={filters.has_entry_fee}
            onChange={() => toggleBool("has_entry_fee")}
          />
        </fieldset>

        <div className={styles.actions}>
          <button type="submit" className={styles.searchBtn} disabled={loading}>
            {loading ? "מחפש…" : "חפש"}
          </button>
        </div>
      </form>

      {error && <div className={styles.error}>{error}</div>}

      {searched && (
        <div className={styles.resultsWrap}>
          <ResultsSection
            title="טיולים"
            items={results.trips}
            onBeforeOpen={handleBeforeOpen}
            onOpen={(id) => navigate(`/trip/${id}`)}
          />
          <ResultsSection
            title="אטרקציות"
            items={results.attractions}
            onBeforeOpen={handleBeforeOpen}
            onOpen={(id) => navigate(`/attractions/${id}`)}
          />
          <ResultsSection
            title="קמפינג"
            items={results.campings}
            onBeforeOpen={handleBeforeOpen}
            // בלי onOpen — השרת מחזיר href נכון (/camping-detail/...)
          />
        </div>
      )}

      {loading && <div className={styles.loadingOverlay}>טוען תוצאות…</div>}
    </div>
  );
};

const CheckboxTile = ({ id, label, onChange, checked, icon }) => (
  <label className={styles.checkboxTileWrapper} htmlFor={id}>
    <input
      id={id}
      type="checkbox"
      className={styles.checkboxInput}
      checked={checked}
      onChange={onChange}
    />
    <div className={styles.checkboxTile} role="button" tabIndex={0}>
      <div className={styles.checkboxIcon} aria-hidden>
        {icon || "✓"}
      </div>
      <div className={styles.checkboxLabel}>{label}</div>
    </div>
  </label>
);

const ResultsSection = ({ title, items, onOpen, onBeforeOpen }) => {
  const navigate = useNavigate();
  const FALLBACK_SVG =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
        <rect width="100%" height="100%" fill="#f0f2f5"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              font-family="Arial" font-size="24" fill="#98a2b3">No Image</text>
      </svg>`
    );

  const inferType = (it) => {
    if (it.type) return it.type;
    if (it.trip_id || it.trip_name) return "trip";
    if (it.attraction_id || it.attraction_name) return "attraction";
    if (it.camping_duration || it.camping_location_name) return "camping";
    return "trip";
  };

  const resolveImg = (it) => {
    let raw =
      it.img || it.trip_img || it.attraction_img || it.camping_img || "";
    if (typeof raw === "string" && raw.includes(","))
      raw = raw.split(",")[0].trim();
    if (!raw) return FALLBACK_SVG;
    if (/^https?:\/\//.test(raw) || raw.startsWith("data:")) return raw;
    if (raw.startsWith("/uploads/")) return `${API_BASE}${raw}`;
    const type = inferType(it);
    const folder =
      type === "trip"
        ? "trips"
        : type === "attraction"
        ? "attractions"
        : "camping";
    return `${API_BASE}/uploads/${folder}/${raw}`;
  };

  const getId = (it, idx) =>
    it.id ?? it.trip_id ?? it.attraction_id ?? it.camping_id ?? idx;
  const getName = (it) =>
    it.title ??
    it.trip_name ??
    it.attraction_name ??
    it.camping_location_name ??
    "ללא שם";
  const getDesc = (it) =>
    it.description ??
    it.trip_description ??
    it.attraction_description ??
    it.camping_description ??
    "";
  const getBadges = (it) => {
    if (Array.isArray(it.badges)) return it.badges.filter(Boolean);
    const list = [];
    if (it.region) list.push(it.region);
    if (it.trip_duration) list.push(it.trip_duration);
    if (it.camping_duration) list.push(it.camping_duration);
    return list;
  };

  const openItem = (it) => {
    if (typeof onBeforeOpen === "function") onBeforeOpen(it);

    const id = it.trip_id ?? it.attraction_id ?? it.camping_id ?? it.id;

    // 1) עדיפות ל-onOpen אם קיים (אחיד ובטוח)
    if (onOpen && id != null) {
      onOpen(id);
      return;
    }

    // 2) fallback: אם אין onOpen אבל יש href – נשתמש בו, עם נרמול מסלולים
    if (it.href) {
      let href = String(it.href || "");

      // נרמול שכיח: /attraction/:id → /attractions/:id
      href = href.replace(/^\/attraction\/(\d+.*)$/i, "/attractions/$1");

      // להבטיח שסלאש ראשון קיים
      if (!href.startsWith("/")) href = `/${href}`;

      navigate(href);
      return;
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {!items || items.length === 0 ? (
        <div className={styles.empty}>אין תוצאות להצגה</div>
      ) : (
        <div className={styles.cardsGrid}>
          {items.map((it, idx) => {
            const id = getId(it, idx);
            const name = getName(it);
            const desc = getDesc(it);
            const imgSrc = resolveImg(it);
            const badges = getBadges(it);

            return (
              <article
                key={id}
                className={styles.card}
                onClick={() => openItem(it)}
                role="button"
              >
                <div className={styles.cardImgWrap}>
                  <img
                    src={imgSrc}
                    alt={name}
                    className={styles.cardImg}
                    loading="lazy"
                    onError={(e) => {
                      if (e.currentTarget.src !== FALLBACK_SVG)
                        e.currentTarget.src = FALLBACK_SVG;
                    }}
                  />
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{name}</h3>
                  {desc && <p className={styles.cardDesc}>{desc}</p>}
                  <div className={styles.badgeRow}>
                    {badges.map((b, i) => (
                      <span key={i} className={styles.badge}>
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SearchPage;
