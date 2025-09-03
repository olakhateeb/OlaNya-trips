import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import styles from "./favoriteButton.module.css";

function FavoriteButton({ contentType, contentId }) {
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const checkFavorite = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await axios.get(
          `http://localhost:5000/api/favorites/check`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { contentType, contentId }
          }
        );
        setFavorited(res.data.isFavorite);
        setError(false);
      } catch (err) {
        console.error("Error checking favorite:", err.response?.data || err.message);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    checkFavorite();
  }, [contentType, contentId, token]);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token) {
      alert("יש להתחבר כדי להוסיף למועדפים");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/favorites/toggle",
        { contentType, contentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFavorited(res.data.favorited);
      setError(false);
    } catch (err) {
      console.error("Error toggling favorite:", err.response?.data || err.message);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={styles.favoriteButton}><span className={styles.loading}></span></div>;

  return (
    <button
      onClick={handleClick}
      className={styles.favoriteButton}
      title={favorited ? "הסר ממועדפים" : "הוסף למועדפים"}
    >
      {favorited ? <FaHeart className={`${styles.heartIcon} ${styles.favorited}`} /> : <FaRegHeart className={styles.heartIcon} />}
    </button>
  );
}

export default FavoriteButton;
