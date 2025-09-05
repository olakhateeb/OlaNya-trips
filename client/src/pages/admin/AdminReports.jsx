// AdminReports.jsx
import React, { useEffect, useState } from "react";
import { getOrdersReport, exportOrdersReport } from "../../services/api";
import styles from "./adminReports.module.css";

const AdminReports = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // פילטרים
  const [status, setStatus] = useState("all"); // all | pending | completed
  const [start, setStart] = useState(""); // YYYY-MM-DD
  const [end, setEnd] = useState(""); // YYYY-MM-DD

  // פורמט תאריך/שעה ידידותי (ישראל)
  const formatDate = (val) => {
    if (!val) return "";
    try {
      return new Date(val).toLocaleString("he-IL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(val);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (status !== "all") params.status = status;
      if (start) params.start = start;
      if (end) params.end = end;

      // ✨ סינון לפי שדה התאריך הרצוי (כאן: תאריך טיול)
      params.dateField = "trip"; // אפשר לשנות ל-"order" אם רוצים לפי order_date

      const res = await getOrdersReport(params);
      const arr = Array.isArray(res?.data) ? res.data : res?.data?.orders || [];
      setOrders(arr);
    } catch (e) {
      console.error(e);
      alert("שגיאה בטעינת דוחות");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async () => {
    try {
      const params = {};
      if (status !== "all") params.status = status;
      if (start) params.start = start;
      if (end) params.end = end;

      // ✨ אותו הדבר בקובץ ה-Excel
      params.dateField = "trip"; // אפשר לשנות ל-"order"

      const res = await exportOrdersReport(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "orders-report.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("ייצוא נכשל");
    }
  };

  const renderStatus = (val) => {
    if (!val) return "";
    const cls =
      val === "completed"
        ? `${styles.status} ${styles.completed}`
        : val === "pending"
        ? `${styles.status} ${styles.pending}`
        : styles.status;
    return (
      <span className={cls}>
        <span className={styles.statusDot} />
        {val === "completed" ? "הושלם" : val === "pending" ? "ממתין" : val}
      </span>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>דוחות הזמנות — טיול ההפתעה</h2>

        <div className={styles.controls}>
          <label className={styles.label}>
            סטטוס
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={styles.select}
            >
              <option value="all">הכול</option>
              <option value="pending">ממתין</option>
              <option value="completed">הושלם</option>
            </select>
          </label>

          <label className={styles.label}>
            מתאריך
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={styles.inputDate}
            />
          </label>

          <label className={styles.label}>
            עד תאריך
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={styles.inputDate}
            />
          </label>

          <button onClick={fetchOrders} className={styles.btnFilter}>
            סנן
          </button>

          <button onClick={handleExport} className={styles.btnExport}>
            הורד Excel
          </button>
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>טוען...</p>
      ) : orders.length === 0 ? (
        <div className={styles.empty}>אין נתונים להצגה.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                {[
                  "מס׳ הזמנה",
                  "תאריך הזמנה",
                  "תאריך טיול",
                  "משתתפים",
                  "ת.ז נהג",
                  "שם נהג",
                  "ת.ז מטייל",
                  "שם מטייל",
                  "שם טיול",
                  "כתובת איסוף",
                  "סטטוס",
                ].map((h) => (
                  <th key={h} className={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_num} className={styles.tr}>
                  <td className={styles.td}>{o.order_num}</td>
                  <td className={styles.td}>{formatDate(o.order_date)}</td>
                  <td className={styles.td}>{formatDate(o.trip_date)}</td>
                  <td className={styles.td}>
                    {o.order_participants_num ?? ""}
                  </td>
                  <td className={styles.td}>{o.o_driver_id ?? ""}</td>
                  <td className={styles.td}>{o.driver_name ?? ""}</td>
                  <td className={styles.td}>{o.o_traveler_id ?? ""}</td>
                  <td className={styles.td}>{o.traveler_name ?? ""}</td>
                  <td className={styles.td}>{o.trip_name ?? ""}</td>
                  <td className={styles.td}>{o.traveler_address ?? ""}</td>
                  <td className={styles.td}>{renderStatus(o.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
