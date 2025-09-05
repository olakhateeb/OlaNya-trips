// src/pages/driver/DriverDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./driver-dashboard.module.css";
import {
  FaUser,
  FaCalendarAlt,
  FaHistory,
  FaUserAlt,
  FaDownload,
  FaSort,
  FaSortUp,
  FaSortDown,
} from "react-icons/fa";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

const DriverDashboard = () => {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [trips, setTrips] = useState([]);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sort, setSort] = useState({ key: "departureTime", dir: "asc" });
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const authHeader = () => ({ headers: { Authorization: `Bearer ${token}` } });

  useEffect(() => {
    const userRaw = localStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    if (!token || !user || user.role !== "driver") {
      navigate("/login");
      return;
    }
    fetchDriverProfile(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (activeTab === "profile") {
      fetchDriverProfile(true);
    } else if (activeTab === "upcoming" || activeTab === "history") {
      fetchTrips(activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token]);

  const friendlyAxiosError = (err, fallback = "אירעה שגיאה") => {
    const status = err?.response?.status;
    if (status === 401) return "אין הרשאה (401). אנא התחבר מחדש.";
    if (status === 403) return "גישה נדחתה (403). נדרשות הרשאות נהג.";
    if (status === 404)
      return "הנתיב לא נמצא (404). ודא שהשרת רושם app.use('/api/driver', driverRoutes).";
    return err?.response?.data?.error || err?.message || fallback;
  };

  const fetchDriverProfile = async (noCache = false) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/driver/profile`, {
        ...authHeader(),
        params: noCache ? { _t: Date.now() } : {},
      });
      const drv = data?.driver ? { ...data.driver } : {};
      const globalTotalNum = Number(drv.globalTotal);
      if (!Number.isNaN(globalTotalNum)) {
        drv.salary = globalTotalNum;
      }
      setProfile(drv);
      setError("");
    } catch (err) {
      setError(friendlyAxiosError(err, "שגיאה בטעינת פרופיל הנהג"));
    } finally {
      setLoading(false);
    }
  };

  const fetchTrips = async (type) => {
    try {
      setLoading(true);
      const url =
        type === "history"
          ? `${API_BASE}/driver/trips/history`
          : `${API_BASE}/driver/trips/upcoming`;

      const { data } = await axios.get(url, authHeader());

      const filtered = Array.isArray(data.trips)
        ? data.trips.filter((t) => {
            const st = (t.status || "").toLowerCase();
            if (type === "upcoming")
              return st !== "completed" && st !== "cancelled";
            if (type === "history")
              return (
                st === "completed" ||
                st === "cancelled" ||
                new Date(t.departureTime) < new Date()
              );
            return true;
          })
        : [];

      setTrips(filtered);
      setError("");
    } catch (err) {
      console.error("שגיאה בטעינת הטיולים", err);
      setError(friendlyAxiosError(err, "שגיאה בטעינת הטיולים"));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE}/driver/trips/export?type=${activeTab}`,
        { ...authHeader(), responseType: "arraybuffer" }
      );
      const contentType = res.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        const decoder = new TextDecoder("utf-8");
        const txt = decoder.decode(res.data);
        const json = JSON.parse(txt);
        setError(json.error || json.message || "אירעה שגיאה ביצוא");
        return;
      }
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `driver-trips-${activeTab}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(friendlyAxiosError(err, "שגיאה בהורדת הקובץ"));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const { data } = await axios.put(
        `${API_BASE}/driver/order-status/${orderId}`,
        { status: newStatus },
        authHeader()
      );

      if (newStatus === "completed" || newStatus === "cancelled") {
        setActiveTab("history");
        await fetchTrips("history");
      } else {
        setActiveTab("upcoming");
        await fetchTrips("upcoming");
      }

      await fetchDriverProfile(true);

      if (data?.reassigned) {
        setSuccess(`ההזמנה הועברה לנהג אחר: ${data.newDriver?.userName || ""}`);
      } else if (newStatus === "declined" && data?.noDriverFound) {
        setSuccess("ההזמנה הוסרה מהנהג ותישובץ ידנית (לא נמצא נהג חלופי).");
      } else {
        setSuccess("הסטטוס עודכן בהצלחה");
      }
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("שגיאה בעדכון הסטטוס", err);
      setError(friendlyAxiosError(err, "שגיאה בעדכון הסטטוס"));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleString("he-IL", {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatPhone = (p) => {
    const digits = String(p).replace(/[^\d]/g, "");
    if (digits.length === 10)
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return p || "-";
  };

  const formatCurrency = (v) => {
    const num = Number(v);
    if (Number.isNaN(num)) return v ?? "-";
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const statusLabel = (s) => {
    switch ((s || "").toLowerCase()) {
      case "pending":
        return "ממתין";
      case "completed":
        return "הושלם";
      case "declined":
        return "נדחה";
      case "cancelled":
        return "בוטל";
      default:
        return s || "-";
    }
  };

  const onSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  const sortedTrips = useMemo(() => {
    const list = [...trips];
    const numericCols = new Set([
      "participants",
      "payment",
      "orderNumber",
      "id",
    ]);
    list.sort((a, b) => {
      const { key, dir } = sort;
      let va = a[key],
        vb = b[key];

      if (key === "departureTime") {
        va = new Date(va).getTime();
        vb = new Date(vb).getTime();
      } else if (numericCols.has(key)) {
        va = Number(va ?? 0);
        vb = Number(vb ?? 0);
      } else {
        va = (va ?? "").toString().toLowerCase();
        vb = (vb ?? "").toString().toLowerCase();
      }

      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [trips, sort]);

  const SortIcon = ({ col }) =>
    sort.key !== col ? (
      <FaSort className={styles.sortIcon} />
    ) : sort.dir === "asc" ? (
      <FaSortUp className={styles.sortIcon} />
    ) : (
      <FaSortDown className={styles.sortIcon} />
    );

  const renderTripsTable = () => (
    <div className={styles.tabContent} dir="rtl">
      <div className={styles.tableToolbar}>
        <div />
        <button
          className={styles.exportBtn}
          onClick={handleExport}
          disabled={loading}
        >
          <FaDownload /> הורד כ-Excel
        </button>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th onClick={() => onSort("orderNumber")}>
                מס׳ הזמנה <SortIcon col="orderNumber" />
              </th>
              <th onClick={() => onSort("tripName")}>
                שם טיול <SortIcon col="tripName" />
              </th>
              <th onClick={() => onSort("pickupAddress")}>
                כתובת איסוף <SortIcon col="pickupAddress" />
              </th>
              <th onClick={() => onSort("departureTime")}>
                תאריך <SortIcon col="departureTime" />
              </th>
              <th onClick={() => onSort("participants")}>
                משתתפים <SortIcon col="participants" />
              </th>
              <th onClick={() => onSort("payment")}>
                תשלום <SortIcon col="payment" />
              </th>
              <th>נוסע</th>
              <th>טלפון</th>
              <th>סטטוס</th>
              {activeTab === "upcoming" && <th>עדכון סטטוס</th>}
            </tr>
          </thead>
          <tbody>
            {sortedTrips.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={activeTab === "upcoming" ? 11 : 10}
                  style={{ textAlign: "center", padding: 16 }}
                >
                  אין נתונים להצגה
                </td>
              </tr>
            )}
            {sortedTrips.map((t, i) => (
              <tr key={t.orderNumber || t.id}>
                <td>{i + 1}</td>
                <td>{t.orderNumber || t.id}</td>
                <td>{t.tripName || "-"}</td>
                <td>{t.pickupAddress || "-"}</td>
                <td>{formatDate(t.tripDate || t.departureTime)}</td>
                <td>{t.participants}</td>
                <td>{formatCurrency(t.payment)}</td>
                <td>{t.travelerName || "-"}</td>
                <td>{t.travelerPhone}</td>
                <td>
                  <span
                    className={`${styles.statusBadge} ${
                      styles["st_" + (t.status || "pending")]
                    }`}
                  >
                    {statusLabel(t.status)}
                  </span>
                </td>
                {activeTab === "upcoming" && (
                  <td>
                    <select
                      value={(t.status || "pending").toLowerCase()}
                      onChange={(e) =>
                        handleStatusChange(
                          t.orderNumber || t.id,
                          e.target.value
                        )
                      }
                      className={styles.statusSelect}
                    >
                      <option value="pending">ממתין</option>
                      <option value="completed">הושלם</option>
                      <option value="declined">לדחות</option>
                      <option value="cancelled">לבטל</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && (
        <div style={{ textAlign: "center", padding: 12 }}>טוען...</div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className={styles.profile} dir="rtl">
      <h3>
        <FaUserAlt /> הפרופיל שלי
      </h3>
      <div className={styles.profileGrid}>
        <div>
          <strong>שם:</strong> {profile.name || "-"}
        </div>
        <div>
          <strong>אימייל:</strong> {profile.email || "-"}
        </div>
        <div>
          <strong>טלפון:</strong> {formatPhone(profile.phone) || "-"}
        </div>
        <div>
          <strong>אזור:</strong> {profile.area || "-"}
        </div>
        <div>
          <strong>טיולים ממתינים:</strong> {profile.upcomingTrips ?? "-"}
        </div>
        <div>
          <strong>טיולים שהושלמו:</strong> {profile.completedTrips ?? "-"}
        </div>
        <div>
          <strong>משכורת (סה״כ לנהג):</strong>{" "}
          {formatCurrency(profile.salary || 0)}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.driverDashboard}>
      <div className={styles.tabsContainer}>
        <button
          className={activeTab === "upcoming" ? styles.activeTab : ""}
          onClick={() => setActiveTab("upcoming")}
        >
          <FaCalendarAlt /> טיולים מתוכננים
        </button>
        <button
          className={activeTab === "history" ? styles.activeTab : ""}
          onClick={() => setActiveTab("history")}
        >
          <FaHistory /> היסטוריה
        </button>
        <button
          className={activeTab === "profile" ? styles.activeTab : ""}
          onClick={() => setActiveTab("profile")}
        >
          <FaUser /> הפרופיל שלי
        </button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {success && <div className={styles.successMessage}>{success}</div>}

      {(activeTab === "upcoming" || activeTab === "history") &&
        renderTripsTable()}
      {activeTab === "profile" && renderProfile()}
    </div>
  );
};

export default DriverDashboard;
