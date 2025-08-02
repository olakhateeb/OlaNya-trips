import React, { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./tripsCard.module.css";
import GlowCard from "../GlowCard/GlowCard";

const TripsCard = ({ _id, trip_id, trip_name, trip_img, created_at }) => {
  // Use either _id or trip_id (whichever is available)
  const id = _id || trip_id;
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const isNew = () => {
    if (!created_at) return false;
    const createdDate = new Date(created_at);
    const now = new Date();
    const diffTime = Math.abs(now - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  // Process the image URL to use the correct path
  let processedImageUrl = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80";
  
  if (trip_img && !imageError) {
    // If the image path contains a comma, take the first image
    const imagePath = trip_img.split(',')[0].trim();
    // Check if the path already includes http or is an absolute path
    if (imagePath.startsWith('http')) {
      processedImageUrl = imagePath;
    } else {
      // The server serves images from /uploads/trips/ directory
      processedImageUrl = `/uploads/trips/${imagePath}`;
    }
  }

  return (
    <Link to={`/trip/${id}`} className={styles.cardLink}>
      <div className={styles.cardWrapper}>
        <GlowCard className={styles.glowCard}>
          {isNew() && <span className={styles.badge}>New</span>}
          <div className={styles.imageContainer}>
            <img
              src={processedImageUrl}
              alt={trip_name}
              className={styles.image}
              onError={handleImageError}
              loading="lazy"
            />
          </div>
          <div className={styles.nameContainer}>
            <h3 className={styles.title}>{trip_name}</h3>
          </div>
        </GlowCard>
      </div>
    </Link>
  );
};

export default TripsCard;
