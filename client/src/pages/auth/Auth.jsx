import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup, login } from "../../services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import classes from "./Auth.module.css";

/**
 * function for login and signup
 * @returns
 */
const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    idNumber: "",
    address: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();

  /**
   *    function to handle form input changes
   */
  const validateForm = () => {
    const newErrors = {};

    // Common validations for both login and register
    // בדיקת אם הערך ריק אחרי הסרת רווחים
    if (!formData.userName.trim()) {
      newErrors.userName = "Username is required";
    }

    // בדיקת אם המשתמש במצב הרשמה
    if (!isLogin) {
      if (!formData.email) {
        newErrors.email = "Email is required";
        //בדיקת תקינות של כתובת מייל
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Email is invalid";
      }

      //בדיקת אם המשתמש מלא את השדות האילו
      if (!formData.phone) {
        newErrors.phone = "Phone number is required";
      }

      if (!formData.idNumber) {
        newErrors.idNumber = "ID number is required";
      }

      if (!formData.address) {
        newErrors.address = "Address is required";
      }
    }

    // בדיקת אם המשתמש לא מזין את הסיסמא
    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 3 || formData.password.length > 8) {
      newErrors.password = "Password must be between 3 and 8 characters";
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.password)) {
      newErrors.password = "Password must contain only letters and numbers";
    } else if (!/[A-Za-z]/.test(formData.password)) {
      newErrors.password = "Password must include at least one letter";
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = "Password must include at least one number";
    }

    // Additional validations for registration
    if (!isLogin) {
      if (!formData.email) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Email is invalid";
      }

      //phone validation
      if (!formData.phone) {
        newErrors.phone = "Phone number is required";
      }

      // Confirm password (only on register)
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }

      // ID number validation
      if (!formData.idNumber) {
        newErrors.idNumber = "ID number is required";
      }
    }
    //שגיאות שיבצעו למשתמש כדי לתקן
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // function to handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      // עדכון הנתונים במשתמש
      ...prev,
      [name]: value,
    }));
  };
  // function to validate form inputs
  const handleSubmit = async (e) => {
    e.preventDefault(); //מונע מהדפדפן לרענו את הדף כששולחים את הטופס
    setApiError("");

    //validate form inputs
    if (!validateForm()) return;

    try {
      if (!isLogin) {
        // Handle registration
        // Remove confirmPassword from userData before sending it to the API
        const { confirmPassword, ...userData } = formData;
        //שולח את נתוני המשתמש לשרת דרך פונקציית ההרשמה שמבצעת קריאה ל API
        const response = await signup(userData);

        if (response.data.success) {
          // Show success message and switch to login
          setApiError("Registration successful! Please log in.");
          // Reset form fields and switch to login page
          setIsLogin(true);
          setFormData((prev) => ({
            ...prev,
            password: "",
            confirmPassword: "",
          }));
        }
      } else {
        // Handle login
        const response = await login({
          userName: formData.userName,
          password: formData.password,
        });

        console.log("Login response:", response.data);
        if (response.data.token && response.data.user) {
          // Store the token
          // שומר את הטוקן המקומית  כדי לזהות את המשתמש בבקשות עתידיות.
          localStorage.setItem("token", response.data.token);

          // Prepare user data for storage
          const userData = {
            _id: response.data.user.idNumber,
            userName: response.data.user.userName,
            email: response.data.user.email,
            phone: response.data.user.phone,
            address: response.data.user.address,
            role: response.data.user.role,
            profileImage: response.data.user.profileImage || "",
          };

          console.log("Storing user data:", userData);
          // שמירת פרטי המשתמש
          localStorage.setItem("user", JSON.stringify(userData));

          // Refresh the page to ensure all components get the updated user data
          window.location.href = "/home";
        } else {
          console.error("Missing token or user data in response");
          setApiError(
            "Login successful but user data is missing. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      setApiError(
        error.response?.data?.message ||
          error.message ||
          "An error occurred. Please try again."
      );
    }
  };

  //מחליפה בין התחברות להרשמה 
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setApiError("");
  };

  return (
    <div className={classes.authContainer}>
      {/*login or register */}
      <h2>{isLogin ? "Login" : "Register"}</h2>
      {apiError && <div className={classes.error}>{apiError}</div>}

      <form onSubmit={handleSubmit} className={classes.authForm}>
        <div className={classes.formGroup}>
          {/* קליטת שם משתמש וסיסמה  */}
          <label htmlFor="userName">Username</label>
          <input
            type="text"
            id="userName"
            name="userName"
            value={formData.userName}
            onChange={handleChange}
            className={errors.userName ? classes.errorInput : ""}
          />
          {errors.userName && (
            <span className={classes.errorText}>{errors.userName}</span>
          )}
        </div>

          {/* אם המשתמש במצב ברשמה מציגים לו את שאר השדים שצריך לקלוט  */}
        {!isLogin && (
          <>
            <div className={classes.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? classes.errorInput : ""}
              />
              {errors.email && (
                <span className={classes.errorText}>{errors.email}</span>
              )}
            </div>

            <div className={classes.formGroup}>
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={errors.phone ? classes.errorInput : ""}
              />
              {errors.phone && (
                <span className={classes.errorText}>{errors.phone}</span>
              )}
            </div>

            <div className={classes.formGroup}>
              <label htmlFor="idNumber">ID Number</label>
              <input
                type="text"
                id="idNumber"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                className={errors.idNumber ? classes.errorInput : ""}
              />
              {errors.idNumber && (
                <span className={classes.errorText}>{errors.idNumber}</span>
              )}
            </div>

            <div className={classes.formGroup}>
              <label htmlFor="address">Address</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={errors.address ? classes.errorInput : ""}
              />
              {errors.address && (
                <span className={classes.errorText}>{errors.address}</span>
              )}
            </div>
          </>
        )}

        <div className={classes.formGroup}>
          <label htmlFor="password">Password</label>
          <div className={classes.passwordInputContainer}>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`${errors.password ? classes.errorInput : ""} ${
                classes.passwordInput
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={classes.togglePassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
            </button>
          </div>
          {errors.password && (
            <span className={classes.errorText}>{errors.password}</span>
          )}
        </div>

        {!isLogin && (
          <div className={classes.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className={classes.passwordInputContainer}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`${
                  errors.confirmPassword ? classes.errorInput : ""
                } ${classes.passwordInput}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={classes.togglePassword}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                <FontAwesomeIcon
                  icon={showConfirmPassword ? faEyeSlash : faEye}
                />
              </button>
            </div>
            {errors.confirmPassword && (
              <span className={classes.errorText}>
                {errors.confirmPassword}
              </span>
            )}
          </div>
        )}

        <button type="submit" className={classes.submitButton}>
          {isLogin ? "Login" : "Register"}
        </button>

        {isLogin && (
          <div className={classes.forgotPassword}>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className={classes.forgotPasswordButton}
            >
              Forgot Password?
            </button>
          </div>
        )}
      </form>

      <p className={classes.toggleMode}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button
          type="button"
          onClick={toggleMode}
          className={classes.toggleButton}
        >
          {isLogin ? "Register" : "Login"}
        </button>
      </p>
    </div>
  );
};

export default Auth;
