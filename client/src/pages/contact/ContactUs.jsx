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
        <h1>Meet the Team</h1>
        <p>Get to know the people behind DoOlanyaTrips</p>
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
            <h2>Our Story</h2>
            <p>
              We are Ola and Dania – two partners and close friends who came
              together out of a shared passion for travel, adventure, and the
              desire to make information easily accessible, organized, and
              unique. After many days of thinking, we wanted to come up with a
              special and original idea – something that doesn't already exist
              in Israel. We noticed that while there is a lot of information
              about trips, camping, and attractions, it's often scattered,
              unreliable, and confusing. That's why we decided to create a
              website that brings all the information into one place: hiking
              trails, camping sites, attractions, parking availability, nearby
              restaurants, accessibility, opening hours, and more. But what
              truly sets our website apart is a unique surprise-trip feature:
              the user signs up, and we send them the trip details by email –
              without revealing the destination. The location remains a surprise
              until the journey begins, turning the entire experience into an
              exciting adventure! We hope you enjoy our website and love the
              idea behind it. For more information or questions, feel free to
              contact us!
            </p>
          </div>
        </div>

        {/* Contact Section */}
        <div className={styles.contactSection}>
          <div className={styles.contactInfo}>
            <h2>Get In Touch</h2>
            <p>Have questions or feedback? We'd love to hear from you!</p>

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
                <span>+972 50-254-1373</span>
              </div>

              <div className={styles.contactItem}>
                <div className={styles.contactIcon}>
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                </div>
                <span>Olanya, Israel</span>
              </div>
            </div>

            <div className={styles.socialMedia}>
              <h3>Follow Us</h3>
              <div className={styles.socialIcons}>
                <a
                  href="https://www.instagram.com/do_olanya_trips/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <FontAwesomeIcon icon={faInstagram} />
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <FontAwesomeIcon icon={faFacebook} />
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                >
                  <FontAwesomeIcon icon={faTiktok} />
                </a>
              </div>
            </div>
          </div>

          <div className={styles.contactForm}>
            <h2>Send Us a Message</h2>
            {submitStatus === "success" ? (
              <div className={styles.successMessage}>
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  className={styles.successIcon}
                />
                <p>Thank you for your message! We'll get back to you soon.</p>
                <button
                  onClick={() => setSubmitStatus(null)}
                  className={styles.backButton}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">Your Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your name"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message">Your Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="5"
                    placeholder="How can we help you?"
                  />
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <FontAwesomeIcon
                        icon={faPaperPlane}
                        className={styles.buttonIcon}
                      />
                      Send Message
                    </>
                  )}
                </button>

                {submitStatus === "error" && (
                  <p className={styles.errorMessage}>
                    Oops! Something went wrong. Please try again.
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
