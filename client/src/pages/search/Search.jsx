import React, { useEffect, useState } from "react";
import TripsCard from "../../components/tripsCard/TripsCard";
import CampingCard from "../../components/campingCard/CampingCard";
import AttractionCard from "../../components/attractionCard/AttractionCard";
import SearchForm from "../../components/searchForm/SearchForm";

import styles from "./search.module.css";
import { FaHiking, FaCampground, FaMapMarkedAlt } from "react-icons/fa";

const Search = () => {
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [filteredCampings, setFilteredCampings] = useState([]);
  const [filteredAttractions, setFilteredAttractions] = useState([]);

  const [allTrips, setAllTrips] = useState([]);
  const [allCampings, setAllCampings] = useState([]);
  const [allAttractions, setAllAttractions] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchPerformed, setSearchPerformed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [tripRes, campRes, attrRes] = await Promise.all([
          fetch("http://localhost:5000/api/trips")
            .then(res => {
              if (!res.ok) throw new Error(`Failed to fetch trips: ${res.status}`);
              return res.json();
            }),
          fetch("http://localhost:5000/api/camping/spots")
            .then(res => {
              if (!res.ok) throw new Error(`Failed to fetch camping spots: ${res.status}`);
              return res.json();
            }),
          fetch("http://localhost:5000/api/attractions")
            .then(res => {
              if (!res.ok) throw new Error(`Failed to fetch attractions: ${res.status}`);
              return res.json();
            }),
        ]);

        setAllTrips(tripRes);
        setFilteredTrips(tripRes);
        setAllCampings(campRes);
        setFilteredCampings(campRes);
        setAllAttractions(attrRes);
        setFilteredAttractions(attrRes);
      } catch (error) {
        console.error("Error loading data:", error);
        setError(error.message || "Failed to load data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = async (criteria) => {
    console.log("Search criteria:", criteria);
    setSearchPerformed(true);
    setIsLoading(true);
    setError(null);

    try {
      // Build query string from criteria
      const queryParams = new URLSearchParams();
      
      // Add all criteria to query params
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });
      
      // Make request to server-side search API
      const response = await fetch(`http://localhost:5000/api/search?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update state with filtered results from server
      setFilteredTrips(data.trips || []);
      setFilteredCampings(data.campings || []);
      setFilteredAttractions(data.attractions || []);
    } catch (error) {
      console.error("Error during search:", error);
      setError(error.message || "Failed to perform search. Please try again.");
      
      // Reset to empty results on error
      setFilteredTrips([]);
      setFilteredCampings([]);
      setFilteredAttractions([]);
    } finally {
      // Finish loading
      setTimeout(() => {
        setIsLoading(false);
      }, 600); // Keep the loading delay for better UX
    }
  };

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <h1>חיפוש טיולים, קמפינג ואטרקציות</h1>
        <p className={styles.headerDescription}>מצא את ההרפתקה הבאה שלך לפי הקריטריונים שלך</p>
      </div>

      <div className={styles.searchFormWrapper}>
        <SearchForm onSearch={handleSearch} />
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loader}></div>
          <p>טוען הרפתקאות...</p>
        </div>
      ) : error ? (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.retryButton}>
            נסה שוב
          </button>
        </div>
      ) : (
        <div className={styles.resultsContainer}>
          {!searchPerformed ? (
            <div className={styles.initialState}>
              <div className={styles.searchPrompt}>
                <FaMapMarkedAlt className={styles.promptIcon} />
                <h2>בחר קריטריונים לחיפוש</h2>
                <p>השתמש בטופס החיפוש למעלה כדי למצוא את המקומות המתאימים לך</p>
              </div>
            </div>
          ) : filteredTrips.length === 0 && 
              filteredCampings.length === 0 && 
              filteredAttractions.length === 0 ? (
            <div className={styles.noResults}>
              <p>לא נמצאו תוצאות עבור החיפוש שלך. נסה לשנות את הסינון.</p>
            </div>
          ) : (
            <div className={styles.searchResults}>
              <div className={styles.resultsHeader}>
                <h2>תוצאות החיפוש שלך</h2>
                <p>נמצאו {filteredTrips.length + filteredCampings.length + filteredAttractions.length} תוצאות</p>
              </div>
              
              {filteredTrips.length > 0 && (
                <section className={styles.resultSection}>
                  <h2 className={styles.sectionTitle}>
                    <FaHiking className={styles.sectionIcon} /> טיולים ({filteredTrips.length})
                  </h2>
                  <div className={styles.grid}>
                    {filteredTrips.map((trip, idx) => (
                      <TripsCard key={idx} {...trip} />
                    ))}
                  </div>
                </section>
              )}

              {filteredCampings.length > 0 && (
                <section className={styles.resultSection}>
                  <h2 className={styles.sectionTitle}>
                    <FaCampground className={styles.sectionIcon} /> קמפינג ({filteredCampings.length})
                  </h2>
                  <div className={styles.grid}>
                    {filteredCampings.map((camp, idx) => (
                      <CampingCard key={idx} {...camp} />
                    ))}
                  </div>
                </section>
              )}

              {filteredAttractions.length > 0 && (
                <section className={styles.resultSection}>
                  <h2 className={styles.sectionTitle}>
                    <FaMapMarkedAlt className={styles.sectionIcon} /> אטרקציות ({filteredAttractions.length})
                  </h2>
                  <div className={styles.grid}>
                    {filteredAttractions.map((attr, idx) => (
                      <AttractionCard key={idx} {...attr} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
