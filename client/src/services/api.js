// services/api.js
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 5000,
  headers: {}, // לא קובעים Content-Type גלובלי
});

/** Helper: לזהות FormData */
const isFormData = (v) =>
  typeof FormData !== "undefined" && v instanceof FormData;

/** === Interceptors === */
axiosInstance.interceptors.request.use(
  (config) => {
    // Auth header אם יש טוקן
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Content-Type: אם זה FormData – לא לשים כלום, הדפדפן יוסיף boundary
    if (isFormData(config.data)) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    } else {
      // אחרת JSON
      if (!config.headers["Content-Type"] && !config.headers["content-type"]) {
        config.headers["Content-Type"] = "application/json";
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

/* =========================
   Users
   ========================= */
export const signup = async (userData) => {
  console.log("Sending signup request with data:", userData);

  try {
    // שולח את כל ה־userData כמו שהוא (כולל confirmPassword)
    const res = await axiosInstance.post("/users/signup", userData);
    console.log("Signup response:", res.data);
    return res.data; // מחזיר רק את גוף התשובה
  } catch (error) {
    console.error("Signup error details:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
      },
    });

    // זורק שגיאה עם הודעת השרת אם קיימת
    throw new Error(error.response?.data?.message || "Signup failed");
  }
};

export const login = async (credentials) => {
  try {
    console.log("Sending login request with credentials:", {
      ...credentials,
      password: credentials.password ? "***" : "undefined",
    });
    const response = await axiosInstance.post("/users/login", credentials);
    console.log("Login response:", {
      status: response.status,
      data: response.data,
      hasToken: !!response.data?.token,
      hasUser: !!response.data?.user,
    });
    return response;
  } catch (error) {
    console.error("Login API error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
      },
    });
    throw error;
  }
};

export const forgotPassword = async (email) => {
  try {
    console.log("Sending password reset request for email:", email);
    const response = await axiosInstance.post("/users/forgot-password", {
      email: email.email || email,
    });
    console.log("Password reset email sent successfully");
    return response;
  } catch (error) {
    console.error("Forgot password error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
      },
    });
    throw error;
  }
};

export const verifyCode = async ({ email, code }) => {
  try {
    console.log("Verifying code for email:", email);
    const response = await axiosInstance.post("/users/verify-code", {
      email,
      code,
    });
    console.log("Code verification successful");
    return response;
  } catch (error) {
    console.error("Verify code error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

export const resetPassword = async ({ email, newPassword }) => {
  try {
    console.log("Resetting password for email:", email);
    const response = await axiosInstance.post("/users/reset-password", {
      email,
      newPassword,
    });
    console.log("Password reset successful");
    return response;
  } catch (error) {
    console.error("Reset password error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

export const getCurrentUser = () => axiosInstance.get("/users/profile");

export const updateMyProfile = (userId, formData) => {
  const token = localStorage.getItem("token");

  const userData = { ...formData };
  delete userData._id;

  // ודא שזה profilePicture, לא profileImage
  if (formData.profileImage && !formData.profilePicture) {
    userData.profilePicture = formData.profileImage;
    delete userData.profileImage;
  }

  const source = axios.CancelToken.source();
  const timeout = setTimeout(() => {
    source.cancel("Request timed out after 30 seconds");
  }, 30000);

  return axiosInstance
    .put(`/users/${userId}`, userData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Requested-With": "XMLHttpRequest",
      },
      timeout: 30000,
      cancelToken: source.token,
      withCredentials: true,
    })
    .then((response) => {
      clearTimeout(timeout);
      console.log("Update profile response:", response);
      return response;
    })
    .catch((error) => {
      clearTimeout(timeout);
      console.error("Error in updateMyProfile:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      return Promise.reject(error);
    });
};

export const updatePassword = (userId, data) =>
  axiosInstance.put(`/users/${userId}/change-password`, data);

export const updatePasswordByUserId = (userId, passwords) => {
  const token = localStorage.getItem("token");
  const cleanId = typeof userId === "object" ? userId._id || userId.id : userId;

  return axiosInstance.put(`/users/${cleanId}/change-password`, passwords, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const uploadProfileImage = async (userId, file) => {
  try {
    const formData = new FormData();
    formData.append("profilePicture", file);

    const token = localStorage.getItem("token");
    if (!token) throw new Error("Authentication token not found.");

    const response = await axiosInstance.post(
      `/users/${userId}/upload-image`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        timeout: 30000,
      }
    );

    console.log("Upload successful:", response.data);

    // עדכון localStorage
    if (response.data.success && response.data.imageUrl) {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        user.profilePicture = response.data.imageUrl;
        localStorage.setItem("user", JSON.stringify(user));
      }
    }
    window.location.reload();
    return response;
  } catch (error) {
    console.error("Upload profile image error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
};

/* =========================
   Contact
   ========================= */
export const sendContactMessage = async (contactData) => {
  console.log("Sending contact message:", contactData);
  try {
    const response = await axiosInstance.post("/contact", contactData);
    console.log("Contact message sent:", response.data);
    return response;
  } catch (error) {
    console.error("Contact message error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

/* =========================
   Camping
   ========================= */
export const getCampingSpots = (params = {}) =>
  axiosInstance.get("/camping/spots", { params });

export const getCampingSpotById = (id) =>
  axiosInstance.get(`/camping/spots/${id}`);

// לפי שם (CampingDetails)
export const getCampingByName = async (campingName) => {
  try {
    const response = await axiosInstance.get(
      `/camping/name/${encodeURIComponent(campingName)}`
    );

    console.log("Camping data received:", response.data);

    // Fallback: המרה למערך תמונות אם צריך
    if (response.data && !response.data.images && response.data.camping_img) {
      if (response.data.camping_img.includes(",")) {
        response.data.images = response.data.camping_img
          .split(",")
          .map((img) => img.trim());
      } else {
        response.data.images = [response.data.camping_img];
      }
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching camping by name:", {
      name: campingName,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

// יצירה/עדכון – אפשר להשאיר ללא headers כי האינטרספטור מזהה FormData
export const createCamping = (formData) =>
  axiosInstance.post("/admin/camping", formData);

export const updateCamping = (id, formData) =>
  axiosInstance.put(`/admin/camping/${id}`, formData);

/* =========================
   Attractions
   ========================= */
export const getAttractions = (params = {}) =>
  axiosInstance.get("/attractions", { params });

export const getAttractionById = async (id) => {
  const res = await axiosInstance.get(`/attractions/${id}`);
  return res.data;
};

// ===== Attractions (Admin) =====
export const createAttraction = async (formData) => {
  const res = await axiosInstance.post("/admin/attractions", formData);
  return res.data;
};

export const updateAttraction = async (id, formData) => {
  const res = await axiosInstance.put(`/admin/attractions/${id}`, formData);
  return res.data;
};

/* =========================
   Trips
   ========================= */
export const getTrips = (params = {}) =>
  axiosInstance.get("/trips", { params }); // אפשר להשאיר ציבורי לרשימה

// יצירת טיול (Admin)
export const createTrip = async (tripData) => {
  try {
    const res = await axiosInstance.post("/admin/trips", tripData);
    return res.data;
  } catch (error) {
    console.error("Error creating trip:", error);
    throw error;
  }
};

// עדכון טיול (Admin)
export const updateTrip = async (id, updatedData) => {
  try {
    const res = await axiosInstance.put(`/admin/trips/${id}`, updatedData);
    return res.data;
  } catch (error) {
    console.error("Error updating trip:", error);
    throw error;
  }
};

// פרטי טיול/אטרקציה (Admin) — יישור לשימוש ב-axiosInstance
export const getTripDetails = async (tripId) => {
  try {
    const res = await axiosInstance.get(`/admin/trips/${tripId}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching trip details:", error);
    throw error;
  }
};

export const getAttractionDetails = async (attractionId) => {
  try {
    const res = await axiosInstance.get(`/admin/attractions/${attractionId}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching attraction details:", error);
    throw error;
  }
};

/* =========================
   Surprise Trip
   ========================= */
export const createSurpriseTrip = (travelerId) =>
  axiosInstance.post("/surprise-trip", { travelerId });

/* =========================
   Admin
   ========================= */
/* ========= Users ========= */

export async function getAllUsers() {
  const res = await axiosInstance.get("/admin/users");
  // ה-AdminUsers.jsx מצפה למערך נטו:
  return Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];
  // מחזיר מערך של משתמשים
  // const res = await axiosInstance.get("/admin/users");
  // const data = res?.data;
  // return Array.isArray(data) ? data : [];
}

export async function getUserDetails(idNumber) {
  // מחזיר אובייקט משתמש בודד
  const res = await axiosInstance.get(`/admin/users/${idNumber}`);
  return res?.data || null;
}

export async function updateUserRole(idNumber, role) {
  // עדכון תפקיד
  const res = await axiosInstance.put(`/admin/users/${idNumber}/role`, {
    role,
  });
  return res?.data;
}

export async function getOrdersReport(params = {}) {
  return axiosInstance.get("/admin/reports/orders", { params });
}

export async function exportOrdersReport(params = {}) {
  return axiosInstance.get("/admin/reports/orders/export", {
    params,
    responseType: "blob",
  });
}

/* =========================
   Favorites
   ========================= */
export const getUserFavorites = async (userId) => {
  try {
    console.log(`Fetching favorites for user ${userId}`);
    const response = await axiosInstance.get(`/favorites/user/${userId}`);
    console.log("User favorites response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching user favorites:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const removeFavorite = async ({ userId, contentType, contentId }) => {
  try {
    console.log(
      `Removing favorite: ${contentType} ${contentId} for user ${userId}`
    );
    const response = await axiosInstance.post("/favorites/toggle", {
      userId,
      contentType,
      contentId,
    });
    console.log("Remove favorite response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error removing favorite:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const toggleFavorite = async (itemId, itemType, isFavorite) => {
  try {
    console.log("🌟 API: Toggling favorite:", { itemId, itemType, isFavorite });
    const response = await axiosInstance.post("/admin/favorites", {
      itemId,
      itemType,
      isFavorite,
    });
    console.log("✅ API: Favorite toggled:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ API: Error toggling favorite:", error);
    throw error;
  }
};

export const getFavorites = async () => {
  try {
    console.log("🔍 API: Fetching favorites...");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const response = await axiosInstance.get(
      `/favorites/user/${user.id || user.idNumber}`
    );
    console.log("✅ API: Favorites fetched:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ API: Error fetching favorites:", error);
    throw error;
  }
};

export const getFavoritesForHomePage = async () => {
  try {
    console.log("🔍 API: Fetching favorites for home page...");
    const response = await axiosInstance.get("/favorites/public");
    console.log("✅ API: Public favorites fetched:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ API: Error fetching public favorites:", error);
    throw error;
  }
};

/* =========================
   Reviews
   ========================= */
const normalizeReviewsPayload = (data) => {
  const list = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.reviews)
    ? data.reviews
    : Array.isArray(data)
    ? data
    : [];

  const meta =
    data?.meta && typeof data.meta.reviews_count === "number"
      ? { reviews_count: data.meta.reviews_count }
      : { reviews_count: list.length };

  return { list, meta };
};

export const getReviewsFull = async (type, id, params = {}) => {
  const res = await axiosInstance.get(`/reviews/${type}/${id}`, { params });
  return normalizeReviewsPayload(res.data);
};

export const getReviews = async (type, id, params = {}) => {
  const { list } = await getReviewsFull(type, id, params);
  return list;
};

export const upsertReview = async (type, id, data) => {
  const res = await axiosInstance.post(`/reviews/${type}/${id}`, data);
  return res.data;
};

export const deleteMyReview = async (type, id) => {
  const res = await axiosInstance.delete(`/reviews/${type}/${id}`);
  return res.data;
};

export const getMyReview = async (type, id) => {
  const res = await axiosInstance.get(`/reviews/${type}/${id}/mine`);
  return res.data || null;
};

export const updateReview = async (type, id, data) => {
  const res = await axiosInstance.put(`/reviews/${type}/${id}`, data);
  return res.data;
};

/* =========================
   Search
   ========================= */
export const searchAll = async (rawFilters = {}, limit = 50) => {
  const payload = {};

  if (rawFilters.q && rawFilters.q.trim()) {
    payload.q = rawFilters.q.trim();
  }
  if (rawFilters.region && rawFilters.region !== "all") {
    payload.region = rawFilters.region;
  }

  const boolKeys = [
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
    // "night_camping",
  ];
  boolKeys.forEach((k) => {
    if (rawFilters[k] === true) payload[k] = true;
  });

  payload.limit = Math.min(Number(limit) || 50, 200);

  return axiosInstance.get("/search", { params: payload });
};

/* =========================
   Admin (עוד)
   ========================= */
export const getUserReports = async (userType = "all") => {
  try {
    const response = await axiosInstance.get("/reports/users", {
      params: { userType },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching user reports:", error);
    throw error;
  }
};

export const getUserActivityReports = async () => {
  try {
    const response = await axiosInstance.get("/reports/activity");
    return response.data;
  } catch (error) {
    console.error("Error fetching user activity reports:", error);
    throw error;
  }
};

// === Reviews (admin) ===
export async function adminDeleteReview(entityType, reviewId) {
  if (!reviewId) throw new Error("Missing reviewId");
  // אין /api בתחילת הנתיב כי baseURL כבר על /api
  const res = await axiosInstance.delete(
    `/reviews/${entityType}/admin/${reviewId}`
  );
  return res.data;
}

// מחיקה בודדת (כבר יש לך):
export async function adminDeleteOneImage(entity, id, token, keepFile = false) {
  const url = `/admin/${entity}/${encodeURIComponent(
    id
  )}/images/${encodeURIComponent(token)}?keepFile=${
    keepFile ? "true" : "false"
  }`;
  const res = await axiosInstance.delete(url);
  return res.data;
}

// ✅ חדש: מחיקה מרובה
export async function adminDeleteImages(entity, id, tokens, keepFile = false) {
  const url = `/admin/${entity}/${encodeURIComponent(
    id
  )}/images/delete?keepFile=${keepFile ? "true" : "false"}`;
  const res = await axiosInstance.post(url, { tokens });
  return res.data;
}
