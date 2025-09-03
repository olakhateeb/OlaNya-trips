//Src/client/src/pages/profile/ProfilePage.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  updateMyProfile, // עדכון פרטי המשתמש (ללא תמונה)
  updatePassword, // עדכון סיסמה
  uploadProfileImage, // העלאת תמונת פרופיל (FormData)
} from "../../services/api";
import Favorites from "../../components/favorites/Favorites";
import styles from "./ProfilePage.module.css";

/* ===== Helpers ===== */
const API_ORIGIN = "http://localhost:5000";
const DEFAULT_AVATAR = `${API_ORIGIN}/uploads/profileImages/placeholder.jpg`;

const normalizeProfileUrl = (raw) => {
  const src = String(raw || "").trim();
  if (!src) return DEFAULT_AVATAR;
  if (/^https?:\/\//i.test(src) || src.startsWith("data:")) return src;
  if (src.startsWith("/uploads/")) return `${API_ORIGIN}${src}`;
  if (src.startsWith("uploads/")) return `${API_ORIGIN}/${src}`;
  return `${API_ORIGIN}/uploads/profileImages/${src}`;
};

// מאחד שמות אפשריים (profilePicture / profileImage)
const pickProfile = (u = {}) => u.profilePicture || u.profileImage || "";

/* ===== Component ===== */
const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [user, setUser] = useState(null);
  const [canShowFavorites, setCanShowFavorites] = useState(false);

  // טופס עריכת פרופיל (בלי תמונה)
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    phone: "",
    address: "",
  });

  // שינוי סיסמה
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
  });

  // קובץ תמונה שנבחר
  const [file, setFile] = useState(null);

  // הודעות מצב
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const togglePasswordVisibility = (field) =>
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleFileChange = (e) => setFile(e.target.files[0] || null);

  // טען נתוני משתמש מ־localStorage + האזן לשינויים חיצוניים
  useEffect(() => {
    const loadUserData = () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/auth");
          return;
        }
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);

          // normalize id
          if (!userData._id && userData.idNumber)
            userData._id = userData.idNumber;

          // איחוד תמונה לשני השדות לתאימות קדימה/אחורה
          const pic = pickProfile(userData);
          if (pic) {
            userData.profilePicture = pic;
            userData.profileImage = pic;
          }

          setUser(userData);

          const role = String(userData.role || "").toLowerCase();
          setCanShowFavorites(role === "traveler" || role === "driver");

          setFormData({
            userName: userData.userName || "",
            email: userData.email || "",
            phone: userData.phone || "",
            address: userData.address || "",
          });
        }
      } catch (err) {
        console.error("Error loading user data:", err);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/auth");
      }
    };

    loadUserData();

    // האזן לאירוע מותאם ולאירוע storage לטאבים/קומפ' אחרות
    const onUserUpdated = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    };
    const onStorage = (e) => {
      if (e.key === "user" || e.key === "token") onUserUpdated();
    };

    window.addEventListener("user:updated", onUserUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("user:updated", onUserUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [navigate]);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/auth");
  };

  // עדכון שדות טופס פרופיל
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // עדכון שדות טופס סיסמה
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  // העלאת תמונת פרופיל (FormData)
  const handleImageUpload = async () => {
    if (!file) {
      setMessage({ text: "Please select an image first", type: "error" });
      return;
    }
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    if (!storedUser) {
      setMessage({
        text: "User not authenticated properly. Please log in again.",
        type: "error",
      });
      return;
    }
    const userId = storedUser.idNumber || storedUser._id;
    if (!userId) {
      setMessage({
        text: "User ID is missing. Please log in again.",
        type: "error",
      });
      return;
    }

    setIsLoading(true);
    try {
      setMessage({ text: "", type: "" });

      const res = await uploadProfileImage(userId, file);
      // תעדוף מפתחות אפשריים מהשרת
      const serverUrl =
        res.data?.imageUrl || res.data?.profilePicture || res.data?.url || "";

      if (res.data?.success && serverUrl) {
        // נשמור גם profilePicture וגם profileImage (תאימות לאחור)
        const updatedUser = {
          ...storedUser,
          profilePicture: serverUrl,
          profileImage: serverUrl,
          imgVersion: Date.now(),
        };

        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // ליידע את ה-Header/NavBar להתעדכן
        window.dispatchEvent(new Event("user:updated"));

        setMessage({
          text: "Profile picture updated successfully!",
          type: "success",
        });
        setFile(null);
      } else {
        setMessage({
          text: res.data?.message || "Failed to update profile picture",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage({
        text:
          error.response?.data?.message || "Failed to update profile picture",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // עדכון פרופיל (ללא תמונה)
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const userId = user?.idNumber || user?._id;
    if (!userId) {
      setMessage({ text: "User ID is missing!", type: "error" });
      setIsLoading(false);
      return;
    }

    try {
      // אל תשלחי profileImage/ProfilePicture בטופס רגיל
      const { profileImage, profilePicture, ...safePayload } = formData;

      const response = await updateMyProfile(userId, safePayload);

      let updatedUser;
      if (response.data && response.data.user) {
        updatedUser = { ...user, ...response.data.user };
      } else {
        updatedUser = { ...user, ...safePayload };
      }

      // שימור תמונה קיימת אם השרת לא החזיר אותה
      const currentPic = pickProfile(user);
      if (
        currentPic &&
        !updatedUser.profilePicture &&
        !updatedUser.profileImage
      ) {
        updatedUser.profilePicture = currentPic;
        updatedUser.profileImage = currentPic;
      }

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("user:updated"));

      setMessage({
        text: response.data?.message || "Profile updated successfully!",
        type: "success",
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      setMessage({
        text:
          err.response?.data?.message ||
          "Error updating profile. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // עדכון סיסמה
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const userId = user?.idNumber || user?._id;
    if (!userId) {
      setMessage({
        text: "User ID not found. Please refresh or log in again.",
        type: "error",
      });
      setIsLoading(false);
      return;
    }

    try {
      await updatePassword(userId, passwords);
      setMessage({ text: "Password changed successfully!", type: "success" });
      setPasswords({ oldPassword: "", newPassword: "" });
    } catch (err) {
      console.error("Password update error:", err);
      setMessage({
        text:
          err.response?.data?.message ||
          "Failed to change password. Please check your current password.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return <div className={styles.loading}>Loading...</div>;

  const getProfileImageUrl = () => normalizeProfileUrl(pickProfile(user));

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileWrapper}>
        {/* User Info Header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarContainer}>
            <img
              src={pickProfile(user) ? getProfileImageUrl() : DEFAULT_AVATAR}
              alt={user?.userName}
              className={styles.avatar}
              onError={(e) => {
                // fallback חד־פעמי אם התמונה מהשרת שבורה
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />
            <div className={styles.userInfo}>
              <h2 className={styles.userName}>{user.userName}</h2>
              <p className={styles.userEmail}>{user.email}</p>
            </div>
          </div>

          <div className={styles.uploadControls}>
            <input
              type="file"
              id="profile-upload"
              accept="image/*"
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            <label htmlFor="profile-upload" className={styles.uploadButton}>
              <i className="fas fa-camera"></i> Change Photo
            </label>
            <button
              onClick={handleImageUpload}
              disabled={!file || isLoading}
              className={`${styles.actionButton} ${
                !file ? styles.disabled : ""
              }`}
            >
              {isLoading ? <i className="fas fa-spinner fa-spin"></i> : "Save"}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNav}>
          <button
            className={`${styles.tabButton} ${
              activeTab === "profile" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("profile")}
          >
            <i className="fas fa-user"></i> Profile
          </button>
          <button
            className={`${styles.tabButton} ${
              activeTab === "edit" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("edit")}
          >
            <i className="fas fa-user-edit"></i> Edit Profile
          </button>
          <button
            className={`${styles.tabButton} ${
              activeTab === "password" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("password")}
          >
            <i className="fas fa-key"></i> Change Password
          </button>
          {canShowFavorites && (
            <button
              className={`${styles.tabButton} ${
                activeTab === "favorites" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("favorites")}
            >
              <i className="fas fa-heart"></i> favorites
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {message.text && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              <i
                className={`fas fa-${
                  message.type === "success"
                    ? "check-circle"
                    : "exclamation-circle"
                }`}
              ></i>
              <span>{message.text}</span>
            </div>
          )}

          {activeTab === "profile" && (
            <div className={styles.profileInfo}>
              <h2>My Profile</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Username:</span>
                  <span className={styles.infoValue}>{user.userName}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email:</span>
                  <span className={styles.infoValue}>{user.email}</span>
                </div>
                {user.phone && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Phone:</span>
                    <span className={styles.infoValue}>{user.phone}</span>
                  </div>
                )}
                {user.address && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Address:</span>
                    <span className={styles.infoValue}>{user.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "edit" && (
            <form onSubmit={handleProfileUpdate} className={styles.form}>
              <h2>Edit Profile</h2>
              <div className={styles.formGroup}>
                <label htmlFor="userName" className={styles.label}>
                  Username
                </label>
                <input
                  type="text"
                  id="userName"
                  name="userName"
                  value={formData.userName}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phone" className={styles.label}>
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="address" className={styles.label}>
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </form>
          )}

          {activeTab === "password" && (
            <form onSubmit={handlePasswordUpdate} className={styles.form}>
              <h2>Change Password</h2>
              <div className={styles.formGroup}>
                <label htmlFor="oldPassword" className={styles.label}>
                  Current Password
                </label>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={showPasswords.oldPassword ? "text" : "password"}
                    id="oldPassword"
                    name="oldPassword"
                    value={passwords.oldPassword}
                    onChange={handlePasswordChange}
                    className={styles.passwordInput}
                    required
                  />
                  <button
                    type="button"
                    className={styles.togglePasswordButton}
                    onClick={() => togglePasswordVisibility("oldPassword")}
                    aria-label={
                      showPasswords.oldPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    <i
                      className={`fas fa-eye${
                        showPasswords.oldPassword ? "-slash" : ""
                      }`}
                    ></i>
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="newPassword" className={styles.label}>
                  New Password
                </label>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={showPasswords.newPassword ? "text" : "password"}
                    id="newPassword"
                    name="newPassword"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                    className={styles.passwordInput}
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    className={styles.togglePasswordButton}
                    onClick={() => togglePasswordVisibility("newPassword")}
                    aria-label={
                      showPasswords.newPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    <i
                      className={`fas fa-eye${
                        showPasswords.newPassword ? "-slash" : ""
                      }`}
                    ></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          {activeTab === "favorites" && canShowFavorites && (
            <div className={styles.favoritesSection}>
              <h2>המועדפים שלי</h2>
              {user && <Favorites userId={user.idNumber || user._id} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
