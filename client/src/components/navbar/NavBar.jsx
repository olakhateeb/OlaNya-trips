import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaUser, FaSignOutAlt, FaUserCircle } from "react-icons/fa";
import styles from "./navBar.module.css";

export default function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      // Fetch user data if needed
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setUserData(user);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserData(null);
    setShowDropdown(false);
    navigate("/");
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest(`.${styles.profileDropdown}`)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);
  const getProfileImageUrl = () => {
    if (!userData) return "/default-avatar.png";

    // אם כבר URL מלא (כולל http), החזרי אותו כפי שהוא
    if (userData.profileImage?.startsWith("http")) return userData.profileImage;

    // אחרת, הוסיפי את הכתובת של השרת
    if (userData.profileImage)
      return `http://localhost:5000${userData.profileImage}`;

    // ברירת מחדל
    return "/default-avatar.png";
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <ul className={styles.navList}>
          <li className={styles.navItem}>
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? styles.navLinkActive : styles.navLink
              }
            >
              Home
            </NavLink>
          </li>
          <li className={styles.navItem}>
            <NavLink
              to="/camping"
              className={({ isActive }) =>
                isActive ? styles.navLinkActive : styles.navLink
              }
            >
              Camping
            </NavLink>
          </li>
          <li className={styles.navItem}>
            <NavLink
              to="/trips"
              className={({ isActive }) =>
                isActive ? styles.navLinkActive : styles.navLink
              }
            >
              Trips
            </NavLink>
          </li>
          <li className={styles.navItem}>
            <NavLink
              to="/attractions"
              className={({ isActive }) =>
                isActive ? styles.navLinkActive : styles.navLink
              }
            >
              Attractions
            </NavLink>
          </li>
          <li className={styles.navItem}>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                isActive ? styles.navLinkActive : styles.navLink
              }
            >
              Contact Us
            </NavLink>
          </li>
          <li className={styles.navItem}>
            <NavLink
              to="/search"
              className={({ isActive }) =>
                isActive ? styles.navLinkActive : styles.navLink
              }
            >
              🔍 Search
            </NavLink>
          </li>
        </ul>

        <div className={styles.authSection}>
          {isLoggedIn ? (
            <div className={styles.profileDropdown}>
              <button
                className={styles.profileButton}
                onClick={toggleDropdown}
                aria-label="User profile"
                aria-expanded={showDropdown}
                title={userData?.name || "Profile"}
              >
                {userData?.profileImage ? (
                  <img
                    src={getProfileImageUrl()}
                    alt="Profile"
                    className={styles.profileImage}
                  />
                ) : (
                  <FaUserCircle className={styles.profileIcon} />
                )}
              </button>

              {showDropdown && (
                <div className={styles.dropdownMenu}>
                  <NavLink
                    to="/profile"
                    className={styles.dropdownItem}
                    onClick={() => setShowDropdown(false)}
                  >
                    <FaUser className={styles.dropdownIcon} />
                    My Profile
                  </NavLink>
                  <button
                    className={styles.dropdownItem}
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className={styles.dropdownIcon} />
                    Logout
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
