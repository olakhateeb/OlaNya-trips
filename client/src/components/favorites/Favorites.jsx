import React, { useState, useEffect } from "react";
import { FaTrash, FaHeart } from "react-icons/fa";
import styles from "./Favorites.module.css";
import { Link } from "react-router-dom";
import axios from "axios";

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  // Get user ID and token from localStorage
  const userStr = localStorage.getItem("user");
  const token = localStorage.getItem("token");
  const userId = userStr ? JSON.parse(userStr).idNumber : null;

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!userId) return setLoading(false);

      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:5000/api/favorites/user`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });

        const allFavorites = [];
        const { trips, camping, attractions } = response.data;

        trips?.forEach(trip =>
          allFavorites.push({
            content_type: "trip",
            content_id: trip.trip_id,
            title: trip.trip_name,
            image: trip.trip_img,
            location: trip.location,
          })
        );

        camping?.forEach(camp =>
          allFavorites.push({
            content_type: "camping",
            content_id: camp.camping_location_name,
            title: camp.camping_location_name,
            image: camp.camping_img,
            location: camp.region,
          })
        );

        attractions?.forEach(attr =>
          allFavorites.push({
            content_type: "attraction",
            content_id: attr.attraction_id,
            title: attr.attraction_name,
            image: attr.attraction_img,
            location: attr.location,
          })
        );

        setFavorites(allFavorites);
        setError(null);
      } catch (err) {
        console.error("Error fetching favorites:", err);
        setError("אירעה שגיאה בטעינת המועדפים.");
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [userId, token]);

  const handleRemoveFavorite = async (contentType, contentId) => {
    try {
      if (!userId) return;

      await axios.post(
        "http://localhost:5000/api/favorites/toggle",
        {
          userId: userId,        // must match DB column 'user_idNumber'
          contentType: contentType,
          contentId: contentId,
        },
        {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }
      );

      setFavorites(favorites.filter(
        f => !(f.content_type === contentType && f.content_id === contentId)
      ));
    } catch (err) {
      console.error("Error toggling favorite:", err);
      setError("אירעה שגיאה בעדכון המועדפים.");
    }
  };

  const getItemTypeName = type => {
    switch (type) {
      case "trip": return "טיול";
      case "camping": return "קמפינג";
      case "attraction": return "אטרקציה";
      default: return "פריט";
    }
  };

  const getItemLink = item => {
    switch (item.content_type) {
      case "trip": return `/trip/${item.content_id}`;
      case "camping": return `/camping/${item.content_id}`;
      case "attraction": return `/attraction/${item.content_id}`;
      default: return "#";
    }
  };

  const filteredFavorites = activeFilter === "all"
    ? favorites
    : favorites.filter(item => item.content_type === activeFilter);

  if (loading) return <div className={styles.loadingContainer}>טוען מועדפים...</div>;
  if (error) return <div className={styles.errorContainer}>{error}</div>;
  if (favorites.length === 0) return <div className={styles.emptyContainer}>אין פריטים מועדפים</div>;

  return (
    <div className={styles.favoritesContainer}>
      <div className={styles.filterContainer}>
        {["all", "trip", "camping", "attraction"].map(f => (
          <button
            key={f}
            className={`${styles.filterButton} ${activeFilter === f ? styles.active : ""}`}
            onClick={() => setActiveFilter(f)}
          >
            {f === "all" ? "הכל" : getItemTypeName(f)}
          </button>
        ))}
      </div>

      <div className={styles.favoritesGrid}>
        {filteredFavorites.map(item => (
          <div key={`${item.content_type}-${item.content_id}`} className={styles.favoriteCard}>
            <Link to={getItemLink(item)} className={styles.cardLink}>
              <img
                src={item.image?.split(",")[0] || "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80"}
                alt={item.title}
                className={styles.itemImage}
              />
              <span className={styles.itemType}>{getItemTypeName(item.content_type)}</span>
              <h3 className={styles.itemTitle}>{item.title}</h3>
              {item.location && <p className={styles.itemLocation}>{item.location}</p>}
            </Link>
            <button className={styles.removeButton} onClick={() => handleRemoveFavorite(item.content_type, item.content_id)}>
              <FaTrash />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Favorites;
