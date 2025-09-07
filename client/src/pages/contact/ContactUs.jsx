// client/src/components/ContactUs.jsx
import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCheckCircle,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import {
  faInstagram,
  faFacebook,
  faTiktok,
} from "@fortawesome/free-brands-svg-icons";
import styles from "./ContactUs.module.css";
import { sendContactMessage } from "../../services/api"; // adjust path if needed

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  //שליחת הטופס
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    console.log(">>> Sending from form:", formData);
    try {
      const response = await sendContactMessage(formData);
      console.log("<<< Frontend received:", response.data);
      if (response.data.success) {
        setSubmitStatus("success");
        setFormData({ name: "", email: "", message: "" });
      } else {
        throw new Error(response.data.message || "Send failed");
      }
    } catch (err) {
      console.error("<<< Error in frontend:", err);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.contactContainer}>
      <div className={styles.heroSection}>
      <h3> הצוות שלנו</h3>
      <p>אנשים שאוהבים לטייל, לחוות ולהפוך כל טיול לזיכרון משותף</p>

      </div>

      <div className={styles.contentWrapper}>
        {/* About Section */}
        <div className={styles.aboutSection}>
          <div className={styles.teamImage}>
            <img
              src="http://localhost:5000/uploads/OlaDanya.jpg"
              alt="Team"
              className={styles.teamPhoto}
            />
          </div>

          <div className={styles.aboutText}>
            <h2>הסיפור שלנו</h2>
            
            <p>
              אנחנו עולא ודאניה שותפות וחברות קרובות שחוברו יחד מתוך תשוקה משותפת לטיולים, הרפתקאות, והרצון להנגיש מידע בצורה מסודרת, נגישה וייחודית. אחרי הרבה מחשבות, רצינו ליצור משהו מיוחד וחדש – משהו שאין עדיין בישראל.  
              שמנו לב שלמרות שיש הרבה מידע על טיולים, קמפינג ואטרקציות, הוא לעיתים קרובות מפוזר, לא מדויק ומבלבל. לכן החלטנו ליצור אתר שמרכז את כל המידע במקום אחד: מסלולי טיול, חניוני קמפינג, אטרקציות, חניות,  נגישות, שעות פתיחה ועוד.  

              מה שמייחד את האתר שלנו באמת הוא הפיצ’ר של טיול הפתעה: המשתמש נרשם, ואנחנו שולחות לו את פרטי הטיול במייל – מבלי לחשוף את היעד מראש. המיקום נשאר הפתעה עד שהמסע מתחיל, והחוויה כולה הופכת להרפתקה מרגשת!  

              אנחנו מקוות שתהנו מהאתר שלנו ושהרעיון ימצא חן בעיניכם. למידע נוסף או שאלות, נשמח שתיצרו איתנו קשר!
              </p>

            
          </div>
        </div>

        {/* Contact Section */}
        <div className={styles.contactSection}>
          <div className={styles.contactInfo}>
            <h2>צרו קשר</h2>
            <p>יש לכם שאלות או משוב? אנחנו שמחים לשמוע ממכם!</p>

            <div className={styles.contactDetails}>
              <div className={styles.contactItem}>
                <div className={styles.contactIcon}>
                  <FontAwesomeIcon icon={faEnvelope} />
                </div>
                <span>doolanyatrips@gmail.com</span>
              </div>

              <div className={styles.contactItem}>
                <div className={styles.contactIcon}>
                  <FontAwesomeIcon icon={faPhone} />
                </div>
                <span>050-254-1373</span>
                <span>050-517-9503</span>
              </div>

              <div className={styles.contactItem}>
                <div className={styles.contactIcon}>
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                </div>
                <span>אולניה, ישראל</span>
              </div>
            </div>

            <div className={styles.socialMedia}>
              <h3>עקבו אחרינו</h3>
              <div className={styles.socialIcons}>
                <a
                  href="https://www.instagram.com/do_olanya_trips/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <FontAwesomeIcon icon={faInstagram} />
                </a>
                
              </div>
            </div>
          </div>

          <div className={styles.contactForm}>
            <h2>שלחו לנו הודעה</h2>
            {submitStatus === "success" ? (
              <div className={styles.successMessage}>
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  className={styles.successIcon}
                />
                <p>תודה על ההודעה! נחזור אליכם בקרוב.</p>
                <button
                  onClick={() => setSubmitStatus(null)}
                  className={styles.backButton}
                >
                  שלחו הודעה נוספת
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">שם מלא</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="הכניסו את שמכם"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">כתובת אימייל</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="הכניסו את האימייל שלכם"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message">ההודעה שלכם</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="5"
                    placeholder="איך נוכל לעזור?"
                  />
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "שולח..."
                  ) : (
                    <>
                      <FontAwesomeIcon
                        icon={faPaperPlane}
                        className={styles.buttonIcon}
                      />
                      שלחו הודעה
                    </>
                  )}
                </button>

                {submitStatus === "error" && (
                  <p className={styles.errorMessage}>
                    אופס! משהו השתבש. נסו שוב בבקשה.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
