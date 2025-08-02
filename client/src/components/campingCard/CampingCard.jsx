import React from "react";
import { Link } from "react-router-dom";
import styles from "./campingCard.module.css";
import GlowCard from "../../components/GlowCard/GlowCard";

const CampingCard = ({ camping_id, _id, camping_location_name, camping_img, is_featured }) => {
  // Use either _id or camping_id (whichever is available)
  const id = _id || camping_id;
  // Process the image URL to use the correct path
  let imageUrl = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80";
  
  if (camping_img) {
    // If the image path contains a comma, take the first image
    const imagePath = camping_img.split(',')[0].trim();
    // Check if the path already includes http or is an absolute path
    if (imagePath.startsWith('http')) {
      imageUrl = imagePath;
    } else {
      // The server serves images from /uploads/camping/ directory
      imageUrl = `/uploads/camping/${imagePath}`;
    }
  }

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src =
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80";
  };

  // Ensure we have a location name for the route
  const locationName = camping_location_name || "";
  const encodedName = encodeURIComponent(locationName);

  return (
    <Link to={`/camping-detail/${encodedName}`} className={styles.cardLink}>
      <div className={styles.cardWrapper}>
        <GlowCard className={styles.glowCard}>
          {is_featured && <span className={styles.badge}>Featured</span>}
          <div className={styles.imageContainer}>
            <img
              src={imageUrl}
              alt={camping_location_name}
              className={styles.image}
              onError={handleImageError}
              loading="lazy"
            />
          </div>
          <div className={styles.nameContainer}>
            <h3 className={styles.title}>{camping_location_name}</h3>
          </div>
        </GlowCard>
      </div>
    </Link>
  );
};

export default CampingCard;
