// src/components/attractionCard/AttractionCard.jsx
import React from "react";
import { Link } from "react-router-dom";
import styles from "./attractionCard.module.css";
import GlowCard from "../../components/GlowCard/GlowCard";

const AttractionCard = ({ attraction_id, attraction_name, attraction_img, is_popular, _id }) => {
  // Use _id as fallback if attraction_id is not available
  const id = attraction_id || _id;
  
  // Process image URL - handle both direct paths and comma-separated paths
  let processedImageUrl = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80";
  
  if (attraction_img) {
    // If the image path contains a comma, take the first image
    const imagePath = attraction_img.split(',')[0].trim();
    // Check if the path already includes http or is an absolute path
    if (imagePath.startsWith('http')) {
      processedImageUrl = imagePath;
    } else {
      // The server serves images from /uploads/attractions/ directory
      processedImageUrl = `/uploads/attractions/${imagePath}`;
    }
  }

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src =
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80";
  };

  // Ensure we have a valid ID for navigation
  if (!id) {
    console.warn("AttractionCard missing ID for navigation:", { attraction_name, attraction_img });
  }

  return (
    <Link to={`/attraction/${id}`} className={styles.cardLink}>
      <div className={styles.cardWrapper}>
        <GlowCard className={styles.glowCard}>
          {is_popular && <span className={styles.badge}>Popular</span>}
          <div className={styles.imageContainer}>
            <img
              src={processedImageUrl}
              alt={attraction_name}
              className={styles.image}
              onError={handleImageError}
              loading="lazy"
            />
          </div>
          <div className={styles.nameContainer}>
            <h3 className={styles.title}>{attraction_name}</h3>
          </div>
        </GlowCard>
      </div>
    </Link>
  );
};

export default AttractionCard;
