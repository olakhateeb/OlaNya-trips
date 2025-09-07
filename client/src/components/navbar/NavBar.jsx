//src/components/navbar/NavBar.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaSignOutAlt,
  FaUserCircle,
  FaUserCog,
  FaCar,
} from "react-icons/fa";
import { FaHome, FaSearch, FaHiking, FaEnvelope } from "react-icons/fa";
import { GiCampingTent } from "react-icons/gi";
import { MdAttractions } from "react-icons/md";
import styles from "./navBar.module.css";

const API_ORIGIN = "http://localhost:5000";
const PLACEHOLDER = `${API_ORIGIN}/uploads/profileImages/placeholder.jpg`;

const first = (v = "") => String(v || "").trim();
const pickProfile = (u = {}) =>
  u.profilePicture || u.profile_img || u.profileImage || "";

const normalizeProfileUrl = (raw) => {
  const src = first(raw);
  if (!src) return PLACEHOLDER;
  if (/^https?:\/\//i.test(src) || src.startsWith("data:")) return src;
  if (src.startsWith("/uploads/")) return `${API_ORIGIN}${src}`;
  if (src.startsWith("uploads/")) return `${API_ORIGIN}/${src}`;
  return `${API_ORIGIN}/uploads/profileImages/${src}`;
};

export default function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(PLACEHOLDER);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const readUserFromStorage = () => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    try {
      const raw = localStorage.getItem("user");
      const u = raw ? JSON.parse(raw) : null;
      setUserData(u);
      const base = normalizeProfileUrl(pickProfile(u));
      const bust = u?.imgVersion ? `?t=${u.imgVersion}` : "";
      setAvatarUrl(`${base}${bust}`);
    } catch {
      setUserData(null);
      setAvatarUrl(PLACEHOLDER);
    }
  };

  useEffect(() => {
    readUserFromStorage();
    const onStorage = (e) => {
      if (e.key === "user" || e.key === "token") readUserFromStorage();
    };
    const onUserUpdated = () => readUserFromStorage();

    window.addEventListener("storage", onStorage);
    window.addEventListener("user:updated", onUserUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("user:updated", onUserUpdated);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserData(null);
    setAvatarUrl(PLACEHOLDER);
    setShowDropdown(false);
    navigate("/home");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest(`.${styles.profileDropdown}`)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const isAdmin = userData?.role === "admin";
  const isDriver = userData?.role === "driver";

  // Navigation items configuration
  const navItems = [
    { to: "/home", icon: <FaHome className={styles.navIcon} />, show: true },
    { to: "/camping", icon: <GiCampingTent className={styles.navIcon} />, show: true },
    { to: "/trips", icon: <FaHiking className={styles.navIcon} />, show: true },
    { to: "/attractions", icon: <MdAttractions className={styles.navIcon} />, show: true },
    { to: "/contact", icon: <FaEnvelope className={styles.navIcon} />, show: !isAdmin },
    { to: "/search", icon: <FaSearch className={styles.navIcon} />, show: !isAdmin },
  ];

  return (
    <nav className={styles.navbar} dir="rtl">
      <div className={styles.navContainer}>
        <ul className={styles.navList}>
          {navItems.map((item, index) => 
            item.show && (
              <li key={index} className={styles.navItem}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? styles.navLinkActive : styles.navLink
                  }
                >
                  {item.icon}
                </NavLink>
              </li>
            )
          )}
          {isAdmin && (
            <li className={styles.navItem}>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  isActive ? styles.navLinkActive : styles.navLink
                }
              >
                <FaUserCog className={styles.navIcon} /> Admin Dashboard
              </NavLink>
            </li>
          )}
        </ul>

        {/* אזור פרופיל */}
        <div className={styles.authSection}>
          {isLoggedIn ? (
            <div className={styles.profileDropdown}>
              <button
                className={styles.profileButton}
                onClick={() => setShowDropdown((v) => !v)}
                aria-label="פרופיל משתמש"
                aria-expanded={showDropdown}
                title={userData?.userName || "Profile"}
              >
                <img
                  src={avatarUrl || PLACEHOLDER}
                  alt="Profile"
                  className={styles.profileImage}
                  onError={(e) => {
                    e.currentTarget.src = PLACEHOLDER;
                  }}
                />
              </button>

              {showDropdown && (
                <div className={styles.dropdownMenu}>
                  <NavLink
                    to="/profile"
                    className={styles.dropdownItem}
                    onClick={() => setShowDropdown(false)}
                  >
                    <FaUser className={styles.dropdownIcon} /> My Profile
                  </NavLink>
                  {isAdmin && (
                    <NavLink
                      to="/admin"
                      className={styles.dropdownItem}
                      onClick={() => setShowDropdown(false)}
                    >
                      <FaUserCog className={styles.dropdownIcon} /> Admin
                      Dashboard
                    </NavLink>
                  )}
                  {isDriver && (
                    <NavLink
                      to="/driver"
                      className={styles.dropdownItem}
                      onClick={() => setShowDropdown(false)}
                    >
                      <FaCar className={styles.dropdownIcon} /> Driver Dashboard
                    </NavLink>
                  )}
                  <button
                    className={styles.dropdownItem}
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className={styles.dropdownIcon} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authLinks}>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  isActive ? styles.authLinkActive : styles.authLink
                }
              >
                <FaUser className={styles.authIcon} />
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
