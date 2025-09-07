// AboutCampingSection.jsx
import React, { useState, useEffect, useRef } from "react";
import { useCallback } from "react";
import {
  Tent,
  MapPin,
  Clock,
  Droplets,
  Shield,
  Car,
  Dog,
  Heart,
  Utensils,
  Compass,
  Sun,
  ArrowRight,
  Zap,
  Star,
  CheckCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { Trees } from "lucide-react";
import { Sparkle } from "lucide-react";
import ImageCarousel from "../ImageCarousel/ImageCarousel";
import ImageModal from "../ImageModal/ImageModal";
import styles from "./aboutCampingSection.module.css";

const AboutCampingSection = ({ camping, showReviews = true }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const sectionRef = useRef(null);

  // Initialize component when camping data changes
  useEffect(() => {
    // No debug logging in production
  }, [camping]);

  // Use Intersection Observer instead of framer-motion
  useEffect(() => {
    const sectionObserver = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      sectionObserver.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) sectionObserver.unobserve(sectionRef.current);
    };
  }, []);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Define camping features based on the camping data
  const campingFeatures = [
    {
      icon: <Tent className="w-6 h-6" />,
      secondaryIcon: (
        <Sparkle className="w-4 h-4 absolute -top-1 -right-1 text-[#96c6c2]" />
      ),
      title: "קמפינג",
      description:
        "חוויית קמפינג מושלמת בטבע, רחוק מהמולת העיר. התחברו לטבע ותיהנו מהשקט והשלווה.",
      position: "right",
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      secondaryIcon: (
        <CheckCircle className="w-4 h-4 absolute -top-1 -right-1 text-[#96c6c2]" />
      ),
      title: "מיקום",
      description:
        camping.camping_location ||
        "מיקום מושלם בלב הטבע, עם נוף מרהיב ואווירה שקטה ורגועה.",
      position: "right",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      secondaryIcon: (
        <Star className="w-4 h-4 absolute -top-1 -right-1 text-[#96c6c2]" />
      ),
      title: "משך זמן",
      description:
        camping.camping_duration ||
        "זמן מושלם לחופשה קצרה או ארוכה, בהתאם לצרכים שלכם.",
      position: "right",
    },
    {
      icon: <Trees className="w-6 h-6" />,
      secondaryIcon: (
        <Sparkle className="w-4 h-4 absolute -top-1 -right-1 text-[#96c6c2]" />
      ),
      title: "סביבה",
      description:
        camping.camping_environment ||
        "סביבה טבעית מרהיבה עם נוף פנורמי ואוויר צח.",
      position: "left",
    },
    {
      icon: <Droplets className="w-6 h-6" />,
      secondaryIcon: (
        <CheckCircle className="w-4 h-4 absolute -top-1 -right-1 text-[#96c6c2]" />
      ),
      title: "גישה למים",
      description: camping.water_access
        ? "גישה נוחה למקורות מים טבעיים ונקיים."
        : "הביאו מים משלכם לחוויה מושלמת.",
      position: "left",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      secondaryIcon: (
        <Star className="w-4 h-4 absolute -top-1 -right-1 text-[#96c6c2]" />
      ),
      title: "בטיחות",
      description: "אזור בטוח ומאובטח לקמפינג, מתאים למשפחות וקבוצות.",
      position: "left",
    },
  ];

  return (
    <section
      id="about-camping-section"
      ref={sectionRef}
      className={styles.aboutSection}
    >
      {/* Decorative background elements */}
      <div className={styles.bgElement1} />
      <div className={styles.bgElement2} />
      <div className={styles.floatingDot1} />
      <div className={styles.floatingDot2} />

      <div className={`${styles.container} ${isInView ? styles.visible : ""}`}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>
            <Zap className="w-4 h-4" />
            גלו את הקמפינג
          </span>
          <h2 className={styles.sectionTitle}>על המקום</h2>
          <div className={styles.titleUnderline}></div>
        </div>

        <p className={styles.sectionDescription}>
          {camping.camping_description
            ? camping.camping_description.split("\n")[0]
            : "חוויית קמפינג מושלמת בטבע, רחוק מהמולת העיר. התחברו לטבע ותיהנו מהשקט והשלווה."}
        </p>

        <Trees className={styles.featureIcon} />

        <div className={styles.featuresGrid}>
          {/* Left Column */}
          <div className={styles.featuresColumn}>
            {campingFeatures
              .filter((feature) => feature.position === "left")
              .map((feature, index) => (
                <ServiceItem
                  key={`left-${index}`}
                  icon={feature.icon}
                  secondaryIcon={feature.secondaryIcon}
                  title={feature.title}
                  description={feature.description}
                  delay={index * 0.2}
                  direction="left"
                />
              ))}
          </div>

          {/* Center Image */}
          <div className={styles.centerImageContainer}>
            <div className={styles.imageWrapper}>
              <div className={styles.mainImage}>
                {camping.images && camping.images.length > 0 ? (
                  <>
                    <ImageCarousel
                      images={camping.images}
                      altText={camping.camping_location_name}
                    />
                  </>
                ) : (
                  <>
                    <div
                      className={styles.fallbackImageContainer}
                      onClick={() => {
                        setSelectedImage(
                          "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1170&q=80"
                        );
                        setShowModal(true);
                      }}
                    >
                      <img
                        src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1170&q=80"
                        alt={camping.camping_location_name}
                        className={styles.campingImage}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className={styles.imageBorder}></div>

              {/* Floating accent elements */}
              <div className={styles.accentElement1}></div>
              <div className={styles.accentElement2}></div>

              {/* Additional decorative elements */}
              <div className={styles.decorDot1}></div>
              <div className={styles.decorDot2}></div>
            </div>
          </div>

          {/* Right Column */}
          <div className={styles.featuresColumn}>
            {campingFeatures
              .filter((feature) => feature.position === "right")
              .map((feature, index) => (
                <ServiceItem
                  key={`right-${index}`}
                  icon={feature.icon}
                  secondaryIcon={feature.secondaryIcon}
                  title={feature.title}
                  description={feature.description}
                  delay={index * 0.2}
                  direction="right"
                />
              ))}
          </div>
        </div>
      </div>

      {/* Image Modal for enlarged view */}
      <ImageModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        imageUrl={selectedImage}
      />
    </section>
  );
};

// Service Item Component
const ServiceItem = ({
  icon,
  secondaryIcon,
  title,
  description,
  delay,
  direction,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const itemRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => {
      if (itemRef.current) observer.unobserve(itemRef.current);
    };
  }, []);

  return (
    <div
      ref={itemRef}
      className={`${styles.serviceItem} ${styles[`direction-${direction}`]} ${
        isVisible ? styles.visible : ""
      }`}
    >
      <div className={styles.serviceHeader}>
        <div className={styles.serviceIcon}>
          {icon}
          {secondaryIcon}
        </div>
        <h3 className={styles.serviceTitle}>{title}</h3>
      </div>
      <p className={styles.serviceDescription}>{description}</p>
    </div>
  );
};

export default AboutCampingSection;
