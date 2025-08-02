import React from "react";
import { Link } from "react-router-dom";
import { FaInstagram, FaTwitter, FaTiktok } from "react-icons/fa";
import styles from "./footer.module.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>DoTrip</h3>
          <p className={styles.footerDescription}>
            Your ultimate companion for planning and enjoying unforgettable
            travel experiences.
          </p>
          <div className={styles.socialLinks}>
            <a
              href="https://www.instagram.com/do_olanya_trips/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="Instagram"
            >
              <FaInstagram className={styles.socialIcon} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="Twitter"
            >
              <FaTwitter className={styles.socialIcon} />
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="TikTok"
            >
              <FaTiktok className={styles.socialIcon} />
            </a>
          </div>
        </div>

        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>Quick Links</h3>
          <ul className={styles.footerLinks}>
            <li>
              <Link to="/" className={styles.footerLink}>
                Home
              </Link>
            </li>
            <li>
              <Link to="/camping" className={styles.footerLink}>
                Camping
              </Link>
            </li>
            <li>
              <Link to="/trips" className={styles.footerLink}>
                Trips
              </Link>
            </li>
            <li>
              <Link to="/attractions" className={styles.footerLink}>
                Attractions
              </Link>
            </li>
            <li>
              <Link to="/contact" className={styles.footerLink}>
                Contact Us
              </Link>
            </li>
          </ul>
        </div>

        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>Contact</h3>
          <address className={styles.contactInfo}>
            <p>
              <i className="fas fa-map-marker-alt"></i> Haifa Israel, Technion
            </p>
            <p>
              <i className="fas fa-phone"></i> +97250-2541373
            </p>
            <p>
              <i className="fas fa-phone"></i> +97250-5179503
            </p>
            <p>
              <i className="fas fa-envelope"></i> doolanyatrips@gmail.com
            </p>
          </address>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p className={styles.copyright}>
          &copy; {currentYear} DoTrip. All rights reserved.
        </p>
        <div className={styles.footerBottomLinks}>
          <Link to="/privacy" className={styles.footerBottomLink}>
            Privacy Policy
          </Link>
          <Link to="/terms" className={styles.footerBottomLink}>
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
