// AdminUsers.jsx

import React, { useEffect, useState, useMemo } from "react";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaFilter,
  FaDownload,
  FaUserCheck,
  FaUserTimes,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaUsers,
  FaUserShield,
  FaCar,
  FaChevronLeft,
  FaChevronRight,
  FaUser,
  FaEnvelope,
  FaCog,
  FaCheckCircle,
  FaShieldAlt,
  FaExclamationTriangle,
} from "react-icons/fa";

import {
  getAllUsers,
  getUserDetails,
  updateUserRole,
  exportUsersExcel, // ✔ פונקציית הייצוא (חייבת להיות עם responseType:'blob' בשכבת ה-service)
} from "../../services/api";
import styles from "./adminUsers.module.css";

/* ===== Helpers ===== */
const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || "http://localhost:5000";

// Helper function to normalize image URLs
const normalizeImageUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
};

/** נתיב placeholder מהשרת (ודאי שקיים קובץ כזה!) */
const SERVER_PLACEHOLDER = `${API_ORIGIN}/uploads/profileImages/placeholder.jpg`;

const firstFromCsv = (val = "") => {
  const s = String(val || "").trim();
  return s && s.includes(",") ? s.split(",")[0].trim() : s;
};

/**
 * ממיר שם/נתיב לתמונת פרופיל לכתובת מלאה:
 * - אם כבר URL מלא / data-uri -> מחזיר כמו שהוא
 * - אם מתחיל ב-/uploads -> מוסיף דומיין
 * - אחרת מניח שזה קובץ בתוך uploads/profileImages
 */
const normalizeImagePath = (raw) => {
  const first = firstFromCsv(raw);
  if (!first) return "";
  if (/^https?:\/\//i.test(first) || first.startsWith("data:")) return first;
  if (first.startsWith("/uploads/")) return `${API_ORIGIN}${first}`;
  return `${API_ORIGIN}/uploads/profileImages/${first}`;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "מנהל", icon: FaUserShield, color: "#ef4444" },
  { value: "traveler", label: "מטייל", icon: FaUsers, color: "#10b981" },
  { value: "driver", label: "נהג", icon: FaCar, color: "#f59e0b" },
];
const roleLabel = (val) =>
  ROLE_OPTIONS.find((o) => o.value === val)?.label || val || "-";

const getRoleIcon = (val) =>
  ROLE_OPTIONS.find((o) => o.value === val)?.icon || FaUsers;

const getRoleColor = (val) =>
  ROLE_OPTIONS.find((o) => o.value === val)?.color || "#10b981";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [expandedKey, setExpandedKey] = useState(null);
  const [detailsCache, setDetailsCache] = useState({});
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState({});
  const [saving, setSaving] = useState({});
  const [error, setError] = useState("");

  // Enhanced state for new features
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortField, setSortField] = useState("userName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" or "cards"

  // 🆕 מצב להורדת אקסל (שולט על disabled של הכפתור)
  const [exporting, setExporting] = useState(false);

  // טען את כל המשתמשים: getAllUsers() מחזיר מערך מוכן
  const fetchUsers = async () => {
    try {
      setLoadingList(true);
      setError("");
      const list = await getAllUsers(); // <-- חשוב: הפונקציה מחזירה מערך, לא .data
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("getAllUsers failed:", e?.response?.data || e.message);
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 403
          ? "אין הרשאה (Admin only). ודאי שאת מחוברת כ-Admin."
          : "שגיאה בטעינת משתמשים");
      setError(msg);
      setUsers([]);
    } finally {
      setLoadingList(false);
    }
  };

  // Filtered and sorted users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter((user) => {
      const matchesSearch =
        !searchTerm ||
        user.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm) ||
        user.idNumber?.toString().includes(searchTerm);

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aVal = a[sortField] || "";
      let bVal = b[sortField] || "";

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [users, searchTerm, roleFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === "admin").length;
    const travelers = users.filter((u) => u.role === "traveler").length;
    const drivers = users.filter((u) => u.role === "driver").length;

    return { total, admins, travelers, drivers };
  }, [users]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  // פתיחה/סגירת כרטיס הפרטים (לוקח rowKey ל-UI ו-idNumber ל-API)
  const handleToggle = async (rowKey, idNumber) => {
    if (expandedKey === rowKey) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(null);

    if (idNumber && !detailsCache[idNumber]) {
      try {
        setLoadingDetails((m) => ({ ...m, [idNumber]: true }));
        const full = await getUserDetails(idNumber); // אובייקט אחד
        setDetailsCache((m) => ({ ...m, [idNumber]: full || {} }));
      } catch (e) {
        console.error("getUserDetails failed:", e?.response?.data || e.message);
        alert("שגיאה בטעינת פרטי המשתמש");
        return;
      } finally {
        setLoadingDetails((m) => ({ ...m, [idNumber]: false }));
      }
    }

    setTimeout(() => {
      setExpandedKey(rowKey);
    }, 50);
  };

  // Enhanced functions
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map((u) => u.idNumber)));
    }
  };

  // 🆕 ייצוא ל־Excel דרך השרת
  const exportUsers = async () => {
    try {
      setExporting(true);
      const res = await exportUsersExcel(); // חייב להחזיר Blob (services/api מגדיר responseType:'blob')
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `users_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Users Excel export failed:", err);
      const status = err?.response?.status;
      if (status === 401) {
        alert("לא מחובר/טוקן לא תקין. התחבר/י שוב.");
      } else if (status === 403) {
        alert("אין הרשאה. רק מנהל יכול לייצא משתמשים.");
      } else if (status === 404) {
        alert("הנתיב לא נמצא (בדקי שהקליינט קורא ל־/api/admin/users/export).");
      } else {
        alert("ייצוא אקסל נכשל");
      }
    } finally {
      setExporting(false);
    }
  };

  // שינוי תפקיד
  const onChangeRole = async (idNumber, newRole) => {
    setSaving((prev) => ({ ...prev, [idNumber]: true }));
    try {
      await updateUserRole(idNumber, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.idNumber === idNumber ? { ...u, role: newRole } : u))
      );
      setDetailsCache((prev) => ({
        ...prev,
        [idNumber]: { ...prev[idNumber], role: newRole },
      }));
    } catch (err) {
      console.error("Error updating role:", err);
      alert("שגיאה בעדכון התפקיד");
    } finally {
      setSaving((prev) => ({ ...prev, [idNumber]: false }));
    }
  };

  const handleEditRole = (idNumber) => {
    const user = users.find((u) => u.idNumber === idNumber);
    if (!user) return;

    const newRole = prompt(
      `בחר תפקיד חדש עבור ${user.userName}:\n1. admin - מנהל\n2. traveler - נוסע\n3. driver - נהג\n\nהכנס: admin, traveler או driver`,
      user.role
    );

    if (
      newRole &&
      ["admin", "traveler", "driver"].includes(newRole.toLowerCase())
    ) {
      onChangeRole(idNumber, newRole.toLowerCase());
    } else if (newRole !== null) {
      alert("תפקיד לא תקין. אנא בחר: admin, traveler או driver");
    }
  };

  return (
    <div className={styles.adminUsers}>
      {/* Enhanced Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerTop}>
          <h2 className={styles.title}>ניהול משתמשים</h2>

          <button
            className={styles.actionBtn}
            onClick={exportUsers}
            title="ייצוא לקובץ Excel"
            disabled={exporting}
          >
            <FaDownload />
            {exporting ? "מוריד…" : "ייצוא"}
          </button>
        </div>

        {/* Statistics Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div
              className={styles.statIcon}
              style={{ backgroundColor: "#10b981" }}
            >
              <FaUsers />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stats.total}</div>
              <div className={styles.statLabel}>סה"כ משתמשים</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div
              className={styles.statIcon}
              style={{ backgroundColor: "#ef4444" }}
            >
              <FaUserShield />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stats.admins}</div>
              <div className={styles.statLabel}>מנהלים</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div
              className={styles.statIcon}
              style={{ backgroundColor: "#10b981" }}
            >
              <FaUsers />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stats.travelers}</div>
              <div className={styles.statLabel}>מטיילים</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div
              className={styles.statIcon}
              style={{ backgroundColor: "#f59e0b" }}
            >
              <FaCar />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stats.drivers}</div>
              <div className={styles.statLabel}>נהגים</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className={styles.filtersSection}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="חיפוש לפי שם, אימייל, טלפון או ת.ז..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterControls}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">כל התפקידים</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className={styles.filterSelect}
            >
              <option value={5}>5 בעמוד</option>
              <option value={10}>10 בעמוד</option>
              <option value={25}>25 בעמוד</option>
              <option value={50}>50 בעמוד</option>
            </select>

            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewBtn} ${
                  viewMode === "table" ? styles.active : ""
                }`}
                onClick={() => setViewMode("table")}
                title="תצוגת טבלה"
              >
                טבלה
              </button>
              <button
                className={`${styles.viewBtn} ${
                  viewMode === "cards" ? styles.active : ""
                }`}
                onClick={() => setViewMode("cards")}
                title="תצוגת כרטיסים"
              >
                כרטיסים
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!loadingList && !error && filteredAndSortedUsers.length === 0 ? (
        <div className={styles.empty}>
          {searchTerm || roleFilter !== "all"
            ? "לא נמצאו משתמשים התואמים לחיפוש"
            : "אין משתמשים."}
        </div>
      ) : viewMode === "table" ? (
        // Table View
        <div className={styles.tableContainer}>
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      selectedUsers.size === paginatedUsers.length &&
                      paginatedUsers.length > 0
                    }
                    onChange={handleSelectAll}
                    className={styles.checkbox}
                  />
                </th>
                <th>תמונה</th>
                <th
                  className={styles.sortableHeader}
                  onClick={() => handleSort("userName")}
                >
                  שם
                  {sortField === "userName" &&
                    (sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />)}
                  {sortField !== "userName" && <FaSort />}
                </th>
                <th
                  className={styles.sortableHeader}
                  onClick={() => handleSort("email")}
                >
                  אימייל
                  {sortField === "email" &&
                    (sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />)}
                  {sortField !== "email" && <FaSort />}
                </th>
                <th
                  className={styles.sortableHeader}
                  onClick={() => handleSort("phone")}
                >
                  טלפון
                  {sortField === "phone" &&
                    (sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />)}
                  {sortField !== "phone" && <FaSort />}
                </th>
                <th
                  className={styles.sortableHeader}
                  onClick={() => handleSort("role")}
                >
                  תפקיד
                  {sortField === "role" &&
                    (sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />)}
                  {sortField !== "role" && <FaSort />}
                </th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u, i) => {
                const rowKey = [
                  u.idNumber ?? "",
                  u.email ?? "",
                  u.userName ?? "",
                  i,
                ].join("|");
                const isSelected = selectedUsers.has(u.idNumber);
                const isOpen = expandedKey === rowKey;
                const RoleIcon = getRoleIcon(u.role);
                const roleColor = getRoleColor(u.role);
                const avatarSrc =
                  normalizeImagePath(u.profilePicture) || SERVER_PLACEHOLDER;
                const details = detailsCache[u.idNumber] || {};

                return (
                  <React.Fragment key={`user-${rowKey}`}>
                    <tr
                      className={`${styles.tableRow} ${
                        isSelected ? styles.selected : ""
                      }`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectUser(u.idNumber)}
                          className={styles.checkbox}
                        />
                      </td>
                      <td>
                        <img
                          src={avatarSrc}
                          alt={u.userName}
                          className={styles.tableAvatar}
                          onError={(e) => {
                            if (e.currentTarget.src !== SERVER_PLACEHOLDER) {
                              e.currentTarget.src = SERVER_PLACEHOLDER;
                            }
                          }}
                        />
                      </td>
                      <td className={styles.userName}>{u.userName || "-"}</td>
                      <td className={styles.email} dir="ltr">
                        {u.email || "-"}
                      </td>
                      <td className={styles.phone} dir="ltr">
                        {u.phone || "-"}
                      </td>
                      <td>
                        <div
                          className={styles.roleTag}
                          style={{
                            backgroundColor: `${roleColor}20`,
                            color: roleColor,
                          }}
                        >
                          <RoleIcon className={styles.roleTagIcon} />
                          {roleLabel(u.role)}
                        </div>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            className={styles.actionButton}
                            onClick={() => handleToggle(rowKey, u.idNumber)}
                            title="צפה בפרטים"
                          >
                            <FaEye />
                          </button>
                          <button
                            className={styles.actionButton}
                            onClick={() => handleEditRole(u.idNumber)}
                            title="ערוך תפקיד"
                          >
                            <FaEdit />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className={styles.expandedRow}>
                        <td colSpan="7" className={styles.expandedCell}>
                          <div className={styles.detailsCard}>
                            <div className={styles.avatar}>
                              <img
                                src={
                                  normalizeImageUrl(
                                    details.profilePicture ?? u.profilePicture
                                  ) || SERVER_PLACEHOLDER
                                }
                                alt={u.userName}
                                onError={(e) => {
                                  if (
                                    e.currentTarget.src !== SERVER_PLACEHOLDER
                                  ) {
                                    e.currentTarget.src = SERVER_PLACEHOLDER;
                                  }
                                }}
                              />
                            </div>

                            <div className={styles.detailsContainer}>
                              {/* Personal Information Section */}
                              <div className={styles.detailsSection}>
                                <h4 className={styles.sectionTitle}>
                                  <FaUser className={styles.sectionIcon} />
                                  פרטים אישיים
                                </h4>
                                <div className={styles.detailsGrid}>
                                  <label>שם מלא</label>
                                  <div className={styles.fieldValue}>
                                    {details.userName ?? u.userName ?? "-"}
                                  </div>

                                  <label>מספר זהות</label>
                                  <div className={styles.fieldValue}>
                                    {details.idNumber ?? u.idNumber ?? "-"}
                                  </div>

                                  <label>כתובת</label>
                                  <div className={styles.fieldValue}>
                                    {details.address ?? u.address ?? "לא צוין"}
                                  </div>
                                </div>
                              </div>

                              {/* Contact Information Section */}
                              <div className={styles.detailsSection}>
                                <h4 className={styles.sectionTitle}>
                                  <FaEnvelope className={styles.sectionIcon} />
                                  פרטי התקשרות
                                </h4>
                                <div className={styles.detailsGrid}>
                                  <label>אימייל</label>
                                  <div className={styles.fieldValue} dir="ltr">
                                    <a
                                      href={`mailto:${
                                        details.email ?? u.email
                                      }`}
                                      className={styles.emailLink}
                                    >
                                      {details.email ?? u.email ?? "-"}
                                    </a>
                                  </div>

                                  <label>טלפון</label>
                                  <div className={styles.fieldValue} dir="ltr">
                                    {details.phone ?? u.phone ? (
                                      <a
                                        href={`tel:${details.phone ?? u.phone}`}
                                        className={styles.phoneLink}
                                      >
                                        {details.phone ?? u.phone}
                                      </a>
                                    ) : (
                                      "לא צוין"
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Account Information Section */}
                              <div className={styles.detailsSection}>
                                <h4 className={styles.sectionTitle}>
                                  <FaCog className={styles.sectionIcon} />
                                  פרטי חשבון
                                </h4>
                                <div className={styles.detailsGrid}>
                                  <label>תפקיד</label>
                                  <div className={styles.roleArea}>
                                    <strong className={styles.roleText}>
                                      {roleLabel(details.role ?? u.role)}
                                    </strong>
                                    <select
                                      className={styles.select}
                                      value={
                                        details.role ?? u.role ?? "traveler"
                                      }
                                      disabled={saving[u.idNumber]}
                                      onChange={(e) =>
                                        onChangeRole(u.idNumber, e.target.value)
                                      }
                                    >
                                      {ROLE_OPTIONS.map((opt) => (
                                        <option
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                    {saving[u.idNumber] && (
                                      <span className={styles.saving}>
                                        שומר…
                                      </span>
                                    )}
                                  </div>

                                  <label>סטטוס חשבון</label>
                                  <div className={styles.fieldValue}>
                                    <span
                                      className={`${styles.statusBadge} ${styles.statusActive}`}
                                    >
                                      <FaCheckCircle
                                        className={styles.statusIcon}
                                      />
                                      פעיל
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Security Information Section */}
                              <div className={styles.detailsSection}>
                                <h4 className={styles.sectionTitle}>
                                  <FaShieldAlt className={styles.sectionIcon} />
                                  מידע אבטחה
                                </h4>
                                <div className={styles.detailsGrid}>
                                  <label>איפוס סיסמה</label>
                                  <div className={styles.fieldValue}>
                                    {details.resetToken ? (
                                      <span className={styles.resetTokenActive}>
                                        <FaExclamationTriangle
                                          className={styles.warningIcon}
                                        />
                                        בתהליך איפוס
                                      </span>
                                    ) : (
                                      <span
                                        className={styles.resetTokenInactive}
                                      >
                                        <FaCheckCircle
                                          className={styles.successIcon}
                                        />
                                        תקין
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {loadingDetails[u.idNumber] && (
                              <div className={styles.loadingOverlay}>
                                טוען פרטים…
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        // Cards View (existing implementation)
        <div className={styles.list}>
          {paginatedUsers.map((u, i) => {
            const rowKey = [
              u.idNumber ?? "",
              u.email ?? "",
              u.userName ?? "",
              i,
            ].join("|");

            const isOpen = expandedKey === rowKey;
            const busy = !!saving[u.idNumber];

            const details = detailsCache[u.idNumber] || {};
            const avatarSrc =
              normalizeImagePath(details.profilePicture ?? u.profilePicture) ||
              SERVER_PLACEHOLDER;

            return (
              <div key={`user-${rowKey}`} className={styles.row}>
                <div className={styles.rowMain}>
                  <div
                    className={styles.userName}
                    title={u.email || ""} // tooltip בלבד
                  >
                    {u.userName || "-"}
                  </div>

                  <button
                    className={styles.viewBtn}
                    onClick={() => handleToggle(rowKey, u.idNumber)}
                    aria-expanded={isOpen}
                    title="עיין"
                  >
                    <FaEye />
                  </button>
                </div>

                {isOpen && (
                  <div className={styles.detailsCard}>
                    <div className={styles.avatar}>
                      <img
                        src={avatarSrc}
                        alt={u.userName}
                        onError={(e) => {
                          if (e.currentTarget.src !== SERVER_PLACEHOLDER) {
                            e.currentTarget.src = SERVER_PLACEHOLDER;
                          }
                        }}
                      />
                    </div>

                    <div className={styles.detailsContainer}>
                      {/* Personal Information Section */}
                      <div className={styles.detailsSection}>
                        <h4 className={styles.sectionTitle}>
                          <FaUser className={styles.sectionIcon} />
                          פרטים אישיים
                        </h4>
                        <div className={styles.detailsGrid}>
                          <label>שם מלא</label>
                          <div className={styles.fieldValue}>
                            {details.userName ?? u.userName ?? "-"}
                          </div>

                          <label>מספר זהות</label>
                          <div className={styles.fieldValue}>
                            {details.idNumber ?? u.idNumber ?? "-"}
                          </div>

                          <label>כתובת</label>
                          <div className={styles.fieldValue}>
                            {details.address ?? u.address ?? "לא צוין"}
                          </div>
                        </div>
                      </div>

                      {/* Contact Information Section */}
                      <div className={styles.detailsSection}>
                        <h4 className={styles.sectionTitle}>
                          <FaEnvelope className={styles.sectionIcon} />
                          פרטי התקשרות
                        </h4>
                        <div className={styles.detailsGrid}>
                          <label>אימייל</label>
                          <div className={styles.fieldValue} dir="ltr">
                            <a
                              href={`mailto:${details.email ?? u.email}`}
                              className={styles.emailLink}
                            >
                              {details.email ?? u.email ?? "-"}
                            </a>
                          </div>

                          <label>טלפון</label>
                          <div className={styles.fieldValue} dir="ltr">
                            {details.phone ?? u.phone ? (
                              <a
                                href={`tel:${details.phone ?? u.phone}`}
                                className={styles.phoneLink}
                              >
                                {details.phone ?? u.phone}
                              </a>
                            ) : (
                              "לא צוין"
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Account Information Section */}
                      <div className={styles.detailsSection}>
                        <h4 className={styles.sectionTitle}>
                          <FaCog className={styles.sectionIcon} />
                          פרטי חשבון
                        </h4>
                        <div className={styles.detailsGrid}>
                          <label>תפקיד</label>
                          <div className={styles.roleArea}>
                            <strong className={styles.roleText}>
                              {roleLabel(details.role ?? u.role)}
                            </strong>
                            <select
                              className={styles.select}
                              value={details.role ?? u.role ?? "traveler"}
                              disabled={busy}
                              onChange={(e) =>
                                onChangeRole(u.idNumber, e.target.value)
                              }
                            >
                              {ROLE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            {busy && (
                              <span className={styles.saving}>שומר…</span>
                            )}
                          </div>

                          <label>סטטוס חשבון</label>
                          <div className={styles.fieldValue}>
                            <span
                              className={`${styles.statusBadge} ${styles.statusActive}`}
                            >
                              <FaCheckCircle className={styles.statusIcon} />
                              פעיל
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Security Information Section */}
                      <div className={styles.detailsSection}>
                        <h4 className={styles.sectionTitle}>
                          <FaShieldAlt className={styles.sectionIcon} />
                          מידע אבטחה
                        </h4>
                        <div className={styles.detailsGrid}>
                          <label>איפוס סיסמה</label>
                          <div className={styles.fieldValue}>
                            {details.resetToken ? (
                              <span className={styles.resetTokenActive}>
                                <FaExclamationTriangle
                                  className={styles.warningIcon}
                                />
                                בתהליך איפוס
                              </span>
                            ) : (
                              <span className={styles.resetTokenInactive}>
                                <FaCheckCircle className={styles.successIcon} />
                                תקין
                              </span>
                            )}
                          </div>

                          <label>תוקף איפוס</label>
                          <div className={styles.fieldValue}>
                            {details.resetTokenExpiry
                              ? new Date(
                                  details.resetTokenExpiry
                                ).toLocaleDateString("he-IL", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "לא רלוונטי"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {loadingDetails[u.idNumber] && (
                      <div className={styles.loadingOverlay}>טוען פרטים…</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={`${styles.pageBtn} ${
              currentPage === 1 ? styles.disabled : ""
            }`}
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <FaChevronRight />
          </button>

          <div className={styles.pageNumbers}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  className={`${styles.pageBtn} ${
                    currentPage === pageNum ? styles.active : ""
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            className={`${styles.pageBtn} ${
              currentPage === totalPages ? styles.disabled : ""
            }`}
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
          >
            <FaChevronLeft />
          </button>

          <div className={styles.pageInfo}>
            עמוד {currentPage} מתוך {totalPages} | מציג{" "}
            {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(
              currentPage * itemsPerPage,
              filteredAndSortedUsers.length
            )}
            מתוך {filteredAndSortedUsers.length} משתמשים
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <div className={styles.bulkActionsBar}>
          <div className={styles.bulkInfo}>
            נבחרו {selectedUsers.size} משתמשים
          </div>
          <div className={styles.bulkActions}>
            <button className={styles.bulkBtn}>
              <FaUserCheck />
              הפעל משתמשים
            </button>
            <button className={styles.bulkBtn}>
              <FaUserTimes />
              השבת משתמשים
            </button>
            <button className={`${styles.bulkBtn} ${styles.danger}`}>
              <FaTrash />
              מחק משתמשים
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
