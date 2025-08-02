import axios from "axios";

const API_URL = "http://localhost:5000/api";

export const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

// פונקציות קריאה ל-API
export const signup = async (userData) => {
  console.log("Sending signup request with data:", userData);
  try {
    const response = await axiosInstance.post("/auth/signup", userData);
    console.log("Signup response:", response.data);
    return response;
  } catch (error) {
    console.error("Signup error details:", {
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

//login
export const login = async (credentials) => {
  try {
    console.log("Sending login request with credentials:", {
      ...credentials,
      password: credentials.password ? "***" : "undefined",
    });
    const response = await axiosInstance.post("/auth/login", credentials);
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
//forgot password
export const forgotPassword = async (email) => {
  try {
    console.log("Sending password reset request for email:", email);
    const response = await axiosInstance.post("/auth/forgot-password", {
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
//verify code
export const verifyCode = async ({ email, code }) => {
  try {
    console.log("Verifying code for email:", email);
    const response = await axiosInstance.post("/auth/verifyCode", {
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
    const response = await axiosInstance.post("/auth/resetPassword", {
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

// Contact Us
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

// Profile
export const getCurrentUser = () => axiosInstance.get("/auth/profile");

export const updateMyProfile = (userId, formData) => {
  const token = localStorage.getItem("token");

  // Ensure we're using idNumber instead of _id
  const userData = { ...formData };
  delete userData._id; // Remove _id if it exists

  console.log("Sending update request with data:", {
    userId,
    userData,
    hasToken: !!token,
  });

  // Create a cancel token source for the request
  const source = axios.CancelToken.source();

  // Set a timeout for the request (30 seconds)
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
      timeout: 30000, // 30 seconds timeout
      cancelToken: source.token,
      withCredentials: true, // Include credentials (cookies) with the request
    })
    .then((response) => {
      clearTimeout(timeout);
      console.log("Update profile response:", response);
      return response;
    })
    .catch((error) => {
      console.log(error);
      clearTimeout(timeout);
      if (axios.isCancel(error)) {
        console.error("Request canceled:", error.message);
      } else {
        console.error("Error in updateMyProfile:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          code: error.code,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            timeout: error.config?.timeout,
            headers: error.config?.headers,
          },
        });
      }
      return Promise.reject(error);
    });
};

//update password
export const updatePassword = (userId, data) =>
  axiosInstance.put(`/users/${userId}/password`, data);

// שינוי סיסמה למשתמש אחר (למשל על ידי אדמין)
export const updatePasswordByUserId = (userId, passwords) => {
  const token = localStorage.getItem("token");

  // ודא שה userId הוא מחרוזת ולא אובייקט
  const cleanId = typeof userId === "object" ? userId._id || userId.id : userId;

  return axiosInstance.put(`/users/${cleanId}/password`, passwords, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

//camping spots
export const getCampingSpots = (params = {}) => {
  return axiosInstance.get("/camping/spots", { params });
};

export const getCampingSpotById = (id) => {
  return axiosInstance.get(`/camping/spots/${id}`);
};

// שליפת קמפינג לפי שם (לשימוש בעמוד CampingDetails)
export const getCampingByName = async (campingName) => {
  try {
    const response = await axiosInstance.get(
      `/camping/name/${encodeURIComponent(campingName)}`
    );
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

// attractions

// שליפת כל האטרקציות
export const getAttractions = (params = {}) => {
  return axiosInstance.get("/attractions", { params });
};

// שליפת אטרקציה לפי מזהה
export const getAttractionById = async (id) => {
  const res = await axiosInstance.get(`/attractions/${id}`);
  return res.data;
};

// יצירת אטרקציה חדשה
export const createAttraction = async (attractionData) => {
  try {
    const response = await axiosInstance.post("/attractions", attractionData);
    return response.data;
  } catch (error) {
    console.error("Error creating attraction:", error);
    throw error;
  }
};

// עדכון אטרקציה קיימת
export const updateAttraction = async (id, updatedData) => {
  try {
    const response = await axiosInstance.put(`/attractions/${id}`, updatedData);
    return response.data;
  } catch (error) {
    console.error("Error updating attraction:", error);
    throw error;
  }
};

// מחיקת אטרקציה
export const deleteAttraction = async (id) => {
  try {
    const response = await axiosInstance.delete(`/attractions/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting attraction:", error);
    throw error;
  }
};

// trips

//שליפת כל הטיולים
export const getTrips = (params = {}) => {
  return axiosInstance.get("/trips", { params });
};

//שליפת טיול לפי מזהה
export const getTripById = (id) => {
  return axiosInstance.get(`/trips/${id}`);
};

// יצירת טיול חדש
export const createTrip = async (tripData) => {
  try {
    const response = await axiosInstance.post("/trips", tripData);
    return response.data;
  } catch (error) {
    console.error("Error creating attraction:", error);
    throw error;
  }
};

// עדכון טיול קיים
export const updateTrip = async (id, updatedData) => {
  try {
    const response = await axiosInstance.put(`/trips/${id}`, updatedData);
    return response.data;
  } catch (error) {
    console.error("Error updating attraction:", error);
    throw error;
  }
};
export const createSurpriseTrip = (travelerId) => {
  return axiosInstance.post("/surprise-trip", { travelerId });
};
// מחיקת טיול
export const deleteTrip = async (id) => {
  try {
    const response = await axiosInstance.delete(`/trips/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting attraction:", error);
    throw error;
  }
};

// upload profile image
export const uploadProfileImage = async (userId, file) => {
  try {
    const formData = new FormData();
    formData.append("profileImage", file);

    console.log(`Uploading image for user ${userId}`, {
      file: file.name,
      size: file.size,
      type: file.type,
    });

    // Get the token directly to ensure it's included
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token not found. Please log in again.");
    }

    // Use the axiosInstance which already includes the base URL
    const response = await axiosInstance.post(
      `/users/${userId}/upload-image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        timeout: 30000, // 30 seconds timeout
      }
    );

    console.log("Upload successful:", response.data);

    // Update the user in localStorage with the new image URL
    if (response.data.success && response.data.imageUrl) {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          user.profileImage = response.data.imageUrl;
          localStorage.setItem("user", JSON.stringify(user));
          console.log("Updated user profile image in localStorage");
        }
      } catch (e) {
        console.error("Error updating localStorage:", e);
      }
    }

    return response;
  } catch (error) {
    console.error("Upload profile image error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      },
    });

    // Return a consistent error response
    return {
      data: {
        success: false,
        message:
          error.response?.data?.message || "Failed to upload profile image",
        error: error.message,
      },
    };
  }
};

// Admin Reports API

// Get user reports
export const getUserReports = async (userType = 'all') => {
  try {
    const response = await axiosInstance.get('/reports/users', { 
      params: { userType } 
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user reports:', error);
    throw error;
  }
};

// Get user activity reports
export const getUserActivityReports = async () => {
  try {
    const response = await axiosInstance.get('/reports/activity');
    return response.data;
  } catch (error) {
    console.error('Error fetching user activity reports:', error);
    throw error;
  }
};
