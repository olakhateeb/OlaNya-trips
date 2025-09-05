//Src/client/src/pages/profile/ProfilePage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  updateMyProfile, // עדכון פרטי המשתמש (ללא תמונה)
  updatePassword, // עדכון סיסמה
  uploadProfileImage, // העלאת תמונת פרופיל (FormData)
  getMyFavorites, // ✔ למשיכת המועדפים
  toggleFavorite, // ✔ להוספה/הסרה של מועדף
  getAttractionById, // ✔ פרטי אטרקציה
  getCampingByName, // ✔ פרטי קמפינג לפי שם
  axiosInstance, // ✔ לשימוש נקודתי בפרטי טיול
} from "../../services/api";

import TripsCard from "../../components/tripsCard/TripsCard";
import AttractionCard from "../../components/attractionCard/AttractionCard";
import CampingCard from "../../components/campingCard/CampingCard";

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

/** עוזר קטן: קביעה אם המשתמש הוא אדמין */
const useIsAdmin = () => {
  return useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return String(u?.role || "").toLowerCase() === "admin";
    } catch {
      return false;
    }
  }, []);
};

/** טעינת פרטי טיול (ניסיון דרך admin, ואם נכשל — נחזיר אובייקט מינימלי) */
async function fetchTripDetailsSafe(id) {
  const normalize = (x) => {
    if (!x) return null;
    const t = x.trip || x.data?.trip || x.data || x; // תופס את רוב הצורות
    if (!t) return null;
    return {
      trip_id: t.trip_id ?? t.id ?? id,
      trip_name: t.trip_name ?? t.name ?? `טיול #${id}`,
      trip_img: t.trip_img ?? t.img ?? t.image ?? "",
      location: t.location || t.region || "",
      created_at: t.created_at || t.createdAt || null,
      is_recommended: t.is_recommended ?? t.recommended ?? 0,
    };
  };

  // 1) ניסיון אדמין
  try {
    const r1 = await axiosInstance.get(`/admin/trips/${id}`);
    const n1 = normalize(r1.data);
    if (n1) return n1;
  } catch {}

  // 2) ניסיון ציבורי לפי id
  try {
    const r2 = await axiosInstance.get(`/trips/${id}`);
    const n2 = normalize(r2.data);
    if (n2) return n2;
  } catch {}

  // 3) גיבוי: משיכה של כל הטיולים וחיפוש לפי id
  try {
    const r3 = await axiosInstance.get(`/trips`);
    const list = Array.isArray(r3.data?.data)
      ? r3.data.data
      : Array.isArray(r3.data)
      ? r3.data
      : [];
    const found = list.find(
      (row) => Number(row.trip_id ?? row.id) === Number(id)
    );
    const n3 = normalize(found);
    if (n3) return n3;
  } catch {}

  // 4) fallback – אם הכול נכשל
  return { trip_id: id, trip_name: `טיול #${id}`, trip_img: "" };
}

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [user, setUser] = useState(null);

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

  // ===== Favorites state =====
  const [favLoading, setFavLoading] = useState(false);
  const [favError, setFavError] = useState("");
  const [favItems, setFavItems] = useState([]); // אוסף פריטים מנורמלים לתצוגה

  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

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

          if (!userData._id && userData.idNumber)
            userData._id = userData.idNumber;

          const pic = pickProfile(userData);
          if (pic) {
            userData.profilePicture = pic;
            userData.profileImage = pic;
          }

          setUser(userData);

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

  // ===== Favorites: טעינה כאשר נכנסים לטאב "favorites" =====
  useEffect(() => {
    if (activeTab !== "favorites") return;

    let ignore = false;
    (async () => {
      setFavLoading(true);
      setFavError("");
      setFavItems([]);

      try {
        const res = await getMyFavorites();
        const rows = res?.favorites || [];

        // נטען פרטי כל פריט לפי סוגו
        const details = await Promise.all(
          rows.map(async (row) => {
            const type = String(row.itemType || "").toLowerCase(); // 'trip' | 'camping' | 'attraction'
            const rawId = row.itemId;

            try {
              if (type === "camping") {
                // itemId הוא שם הקמפינג
                const data = await getCampingByName(rawId);
                return { type, rawId, data };
              }
              if (type === "attraction") {
                const idNum = Number(rawId);
                const data = await getAttractionById(idNum);
                return { type, rawId: idNum, data };
              }
              if (type === "trip") {
                const idNum = Number(rawId);
                const data = await fetchTripDetailsSafe(idNum);
                return { type, rawId: idNum, data };
              }
              // לא מזוהה — נחזיר מבנה בסיסי
              return { type, rawId, data: null, error: "Unsupported type" };
            } catch (e) {
              console.warn("Failed loading favorite details:", row, e);
              return {
                type,
                rawId,
                data: null,
                error: e?.message || "Load error",
              };
            }
          })
        );

        if (!ignore) setFavItems(details);
      } catch (e) {
        if (!ignore) setFavError(e?.message || "Failed loading favorites");
      } finally {
        if (!ignore) setFavLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [activeTab]);

  // הסרת פריט מהרשימה והמועדפים
  const handleRemoveFavorite = async (type, rawId, itemRef) => {
    try {
      // Apply animation before removing
      if (itemRef && itemRef.current) {
        itemRef.current.style.animation = `${styles.removeAnimation} 0.5s forwards`;
        // Wait for animation to complete
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      await toggleFavorite({ itemType: type, itemId: rawId, on: false });
      setFavItems((prev) =>
        prev.filter(
          (x) => !(x.type === type && String(x.rawId) === String(rawId))
        )
      );
    } catch (e) {
      setMessage({
        text:
          e?.response?.data?.message ||
          e?.message ||
          "Failed to remove favorite",
        type: "error",
      });
    }
  };

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

  // העלאת תמונת פרופיל
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
      const serverUrl =
        res.data?.imageUrl || res.data?.profilePicture || res.data?.url || "";

      if (res.data?.success && serverUrl) {
        const updatedUser = {
          ...storedUser,
          profilePicture: serverUrl,
          profileImage: serverUrl,
          imgVersion: Date.now(),
        };

        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
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
      const { profileImage, profilePicture, ...safePayload } = formData;
      const response = await updateMyProfile(userId, safePayload);

      let updatedUser;
      if (response.data && response.data.user) {
        updatedUser = { ...user, ...response.data.user };
      } else {
        updatedUser = { ...user, ...safePayload };
      }

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

          {/* ✔ טאב מועדפים חדש */}
          <button
            className={`${styles.tabButton} ${
              activeTab === "favorites" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("favorites")}
          >
            <i className="fas fa-heart"></i> Favorites
          </button>
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

          {/* ✔ Favorites Tab */}
          {activeTab === "favorites" && (
            <div className={styles.favoritesSection}>
              <h2>My Favorites</h2>

              {favLoading && (
                <div className={styles.loading}>Loading favorites…</div>
              )}
              {favError && (
                <div className={`${styles.message} ${styles.error}`}>
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{favError}</span>
                </div>
              )}

              {!favLoading && !favError && favItems.length === 0 && (
                <div className={styles.empty}>
                  <i className="far fa-heart"></i>
                  <p>No favorites yet.</p>
                </div>
              )}

              <div className={styles.favoritesGrid}>
                {favItems.map((f, idx) => {
                  const key = `${f.type}-${f.rawId}-${idx}`;

                  // עטיפה עם כפתור "הסר"
                  const Wrapper = ({ children }) => {
                    const itemRef = React.useRef(null);
                    return (
                      <div className={styles.favoriteItem} ref={itemRef}>
                        <button
                          title="Remove from favorites"
                          onClick={() =>
                            handleRemoveFavorite(f.type, f.rawId, itemRef)
                          }
                          className={styles.removeButton}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                        {children}
                      </div>
                    );
                  };

                  // הצגת כרטיס לפי סוג
                  if (f.type === "trip") {
                    const t = f.data || {};
                    return (
                      <Wrapper key={key}>
                        <TripsCard
                          trip_id={t.trip_id ?? f.rawId}
                          trip_name={t.trip_name}
                          trip_img={t.trip_img}
                          location={t.location}
                          created_at={t.created_at}
                          is_recommended={t.is_recommended}
                        />
                      </Wrapper>
                    );
                  }

                  if (f.type === "attraction") {
                    const a = f.data || {};
                    return (
                      <Wrapper key={key}>
                        <AttractionCard
                          attraction_id={a.attraction_id ?? f.rawId}
                          attraction_name={a.attraction_name}
                          attraction_img={a.attraction_img}
                          location={a.location}
                          images={a.images}
                          is_recommended={a.is_recommended}
                        />
                      </Wrapper>
                    );
                  }

                  if (f.type === "camping") {
                    const c = f.data || {};
                    return (
                      <Wrapper key={key}>
                        <CampingCard
                          camping_location_name={
                            c.camping_location_name ?? String(f.rawId)
                          }
                          camping_img={c.camping_img}
                          images={c.images}
                          region={c.region}
                          is_recommended={c.is_recommended}
                        />
                      </Wrapper>
                    );
                  }

                  // fallback
                  return (
                    <div key={key} className={styles.infoItem}>
                      {f.type} — {String(f.rawId)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
