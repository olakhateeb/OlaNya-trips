import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  updateMyProfile, // עדכון פרטי המשתמש
  updatePassword, // עדכון סיסמה
  uploadProfileImage, // העלאת תמונת פרופיל
} from "../../services/api";
import styles from "./ProfilePage.module.css";

//profilepage component
const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [user, setUser] = useState(null);

  //טופס ערכת פרופיל
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    phone: "",
    address: "",
  });
  //שינוי סיסמה
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
  });
  //הסתרת סיסמה בטופס
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
  });
  //אחסון קובץ תמונה שנבחר
  const [file, setFile] = useState(null);
  // הודעת הצחה /שגיאה
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // טוגגל להראות/להסתיר סיסמאות
  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // טפל בשינוי קובץ - חשוב להגדיר את הפונקציה הזו
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // טען נתוני משתמש מ־localStorage
  useEffect(() => {
    //פונקציה פנימית שמבצעת את כל השליפה והבדיקה של המשתמש.
    const loadUserData = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!token) {
          console.log("No token found, redirecting to login");
          navigate("/auth");
          return;
        }

        if (storedUser) {
          console.log("Found stored user data:", storedUser);
          const userData = JSON.parse(storedUser);
          // Ensure we have a valid user ID
          if (!userData._id && userData.idNumber) {
            userData._id = userData.idNumber;
          }

          console.log("Setting user data:", userData);
          setUser(userData);

          //טוענים את השדות לטופס עריכת פרופיל
          setFormData({
            userName: userData.userName || "",
            email: userData.email || "",
            phone: userData.phone || "",
            address: userData.address || "",
            profileImage: userData.profileImage || "",
          });
        } else {
          console.log("No user data found in localStorage");
          // Try to get user data from the server if not in localStorage
          // This would require an API endpoint to fetch user data by token
          // fetchUserData();
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        // If there's an error parsing user data, clear it and redirect to login
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/auth");
      }
    };

    loadUserData();
  }, [navigate]);

  //logout function
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

  // Upload profile image
  const handleImageUpload = async () => {
    if (!file) {
      setMessage({ text: "Please select an image first", type: "error" });
      return;
    }

    // Get the latest user data from local storage
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      console.error("User data is missing from localStorage");
      setMessage({
        text: "User not authenticated properly. Please log in again.",
        type: "error",
      });
      return;
    }

    // Use either idNumber or _id, whichever is available
    const userId = storedUser.idNumber || storedUser._id;
    if (!userId) {
      console.error("User ID is missing from user data:", storedUser);
      setMessage({
        text: "User ID is missing. Please log in again.",
        type: "error",
      });
      return;
    }

    console.log("Attempting to upload image for user ID:", userId);
    console.log("File to upload:", file.name, file.type, file.size);

    setIsLoading(true);
    try {
      // Clear any previous messages
      setMessage({ text: "", type: "" });

      const response = await uploadProfileImage(userId, file);
      console.log("Upload response:", response.data);

      if (response.data.success) {
        // Create a local URL for immediate display
        const localImageUrl = URL.createObjectURL(file);

        setMessage({
          text: "Profile picture updated successfully!",
          type: "success",
        });

        // Update the user object with the new image URL
        const updatedUser = {
          ...storedUser,
          profileImage: response.data.imageUrl || localImageUrl,
        };
        console.log(
          "Updated user object before saving to localStorage:",
          updatedUser
        );

        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Clear the file input
        setFile(null);
      } else {
        setMessage({
          text: response.data.message || "Failed to update profile picture",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Upload error:", {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message,
      });
      setMessage({
        text:
          error.response?.data?.message || "Failed to update profile picture",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  // עדכון פרופיל
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Use idNumber if available, otherwise fall back to _id
    const userId = user?.idNumber || user?._id;

    try {
      /* -------- Check if we have a valid user ID -------- */
      if (!user || !userId) {
        console.error("User ID is missing! User:", user);
        setMessage({ text: "User ID is missing!", type: "error" });
        setIsLoading(false);
        return;
      }
      /* ------------------------------------------ */

      console.log("Updating profile with data:", formData);

      // Send the update request
      const response = await updateMyProfile(userId, formData);

      // Log the full response for debugging
      console.log("Profile update response:", response);

      // Update the user data with the response from the server
      if (response.data && response.data.user) {
        const updatedUser = { ...user, ...response.data.user };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } else {
        // Fallback: update with form data if server response is missing user data
        const updatedUser = { ...user, ...formData };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      setMessage({
        text: response.data?.message || "Profile updated successfully!",
        type: "success",
      });
    } catch (err) {
      console.error("Error updating profile:", {
        error: err,
        response: err.response?.data,
        status: err.response?.status,
      });

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

    // Use idNumber if available, otherwise fall back to _id
    const userId = user?.idNumber || user?._id;

    if (!userId) {
      setMessage({
        text: "User ID not found. Please refresh the page or log in again.",
        type: "error",
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log("Updating password for user ID:", userId);
      await updatePassword(userId, passwords);
      setMessage({
        text: "Password changed successfully!",
        type: "success",
      });
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

  if (!user) {
    return <div className={styles.loading}>Loading...</div>;
  }

  const getProfileImageUrl = () => {
    if (user?.profileImage?.startsWith("http")) return user.profileImage;
    if (user?.profileImage) return `http://localhost:5000${user.profileImage}`;
    return "/default-avatar.png";
  };
  // console.log("🖼️ Image path in user object:", user?.profileImage);
  // console.log("🌍 Final image URL:", getProfileImageUrl());

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileWrapper}>
        {/* User Info Header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarContainer}>
            <img
              src={getProfileImageUrl()}
              alt={user?.userName}
              className={styles.avatar}
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
              onChange={handleFileChange} // כאן הפונקציה בשימוש
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
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
