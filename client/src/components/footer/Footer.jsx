//components/ Footer.jsx
import React from "react";
import { Link } from "react-router-dom";

// אייקונים מספריות נכונות
import { FaInstagram, FaHome, FaEnvelope, FaHiking } from "react-icons/fa";
import { GiCampingTent } from "react-icons/gi";
import { MdAttractions } from "react-icons/md";

import styles from "./footer.module.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer} dir="rtl" lang="he">
      <div className={styles.footerContent}>
        {/* ====== אזור: אודות ====== */}
        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>DoTrip</h3>
          <p className={styles.footerDescription}>
            בן לוויה המושלם שלך לתכנון ולחוויית טיולים בלתי־נשכחים.
          </p>
          <div className={styles.socialLinks}>
            <a
              href="https://www.instagram.com/do_olanya_trips/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="אינסטגרם"
              title="Instagram"
            >
              <FaInstagram className={styles.socialIcon} />
            </a>
          </div>
        </div>

        {/* ====== אזור: קישורים מהירים ====== */}
        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>קישורים מהירים</h3>
          <ul className={styles.footerLinks}>
            <li>
              <Link
                to="/"
                className={styles.footerLink}
                aria-label="עמוד הבית"
                title="עמוד הבית"
              >
                <FaHome className={styles.socialIcon} />
              </Link>
            </li>
            <li>
              <Link
                to="/camping"
                className={styles.footerLink}
                aria-label="קמפינג"
                title="קמפינג"
              >
                <GiCampingTent className={styles.socialIcon} />
              </Link>
            </li>
            <li>
              <Link
                to="/trips"
                className={styles.footerLink}
                aria-label="טיולים"
                title="טיולים"
              >
                <FaHiking className={styles.socialIcon} />
              </Link>
            </li>
            <li>
              <Link
                to="/attractions"
                className={styles.footerLink}
                aria-label="אטרקציות"
                title="אטרקציות"
              >
                <MdAttractions className={styles.socialIcon} />
              </Link>
            </li>
            <li>
              <Link
                to="/contact"
                className={styles.footerLink}
                aria-label="צור קשר"
                title="צור קשר"
              >
                <FaEnvelope className={styles.socialIcon} />
              </Link>
            </li>
          </ul>
        </div>

        {/* ====== אזור: צור קשר ====== */}
        <div className={styles.footerSection}>
          <h3 className={styles.footerTitle}>צור קשר</h3>
          <address className={styles.contactInfo}>
            <p>📍 חיפה, ישראל — הטכניון</p>
            <p>📞 ‎+972-50-254-1373</p>
            <p>📞 ‎+972-50-517-9503</p>
            <p>✉️ doolanyatrips@gmail.com</p>
          </address>
        </div>
      </div>

      {/* ====== תחתית ====== */}
      <div className={styles.footerBottom}>
        <p className={styles.copyright}>
          © {currentYear} DoTrip. כל הזכויות שמורות.
        </p>
        {/* אם תרצי להחזיר מדיניות פרטיות/תנאים כאייקונים – נוכל להוסיף כאן */}
      </div>
    </footer>
  );
}
