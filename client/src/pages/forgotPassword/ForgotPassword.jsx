//forgot password.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../../services/api";
import styles from "./ForgotPassword.module.css";

// Define the ForgotPassword component
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); //הטופס
  const [error, setError] = useState("");

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // איפוס הודעת השגאיה

    // בדיקת אם לא הוזנה כתובת מייל מציג שגיאה
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsSubmitting(true);

    // שולח בקשה לשרת דרך הפונקציה forgotPassword
    try {
      // Send email string directly, not as an object
      const response = await forgotPassword(email);
      if (response.data.success) {
        navigate("/verify", { state: { email } });
        return;
      } else {
        setError(response.data.message || "Error sending verification code");
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError(
        err.response?.data?.message || "Server error, please try again later"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h2 className={styles.title}>Reset Password</h2>
        <p className={styles.subtitle}>
          Enter your email address to receive a verification code.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="Enter your email"
              required
              disabled={isSubmitting}
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          {/* כפתור לשליחת הטופס*/}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending code..." : "Send Verification Code"}
          </button>
        </form>
      </div>
    </div>
  );
}
