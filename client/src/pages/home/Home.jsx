// import React, { useEffect, useState } from "react";

// import PhoneVideoFrame from "../phoneVideoFrame/PhoneVideoFrame";

// import AttractionCard from "../../components/attractionCard/AttractionCard";
// import CampingCard from "../../components/campingCard/CampingCard";
// import TripsCard from "../../components/tripsCard/TripsCard";
// import ImageMask from "../../components/ui/image-mask";
// import { useNavigate } from "react-router-dom";
// import styles from "./home.module.css";

// const Home = () => {
//   const [favorites, setFavorites] = useState({
//     trips: [],
//     camping: [],
//     attractions: [],
//   });
//   const [loading, setLoading] = useState(true);
//   const [campingImages, setCampingImages] = useState([]);
//   const navigate = useNavigate();

//   useEffect(() => {
//     // Fetch admin favorite recommendations
//     const fetchFavorites = async () => {
//       try {
//         setLoading(true);
//         const response = await fetch(
//           "http://localhost:5000/api/favorites/public"
//         );
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         const data = await response.json();

//         // Process the data to ensure proper image URLs
//         const processedFavorites = {
//           trips: (data.trips || []).map((trip) => ({
//             ...trip,
//             trip_img: trip.trip_img
//               ? `http://localhost:5000/uploads/trips/${trip.trip_img}`
//               : undefined,
//           })),
//           camping: (data.camping || []).map((camping) => ({
//             ...camping,
//             camping_img: camping.camping_img
//               ? `http://localhost:5000/uploads/camping/${camping.camping_img}`
//               : undefined,
//           })),
//           attractions: (data.attractions || []).map((attraction) => ({
//             ...attraction,
//             attraction_img: attraction.attraction_img
//               ? `http://localhost:5000/uploads/attractions/${attraction.attraction_img}`
//               : undefined,
//           })),
//         };

//         // Extract camping images for the image mask component
//         const allCampingImages = [];
//         console.log("Camping data:", processedFavorites.camping);
//         processedFavorites.camping.forEach((camp) => {
//           if (camp.camping_img) {
//             // Extract just the filename from the full path
//             const imgName = camp.camping_img.split("/").pop();
//             allCampingImages.push(imgName);
//             console.log("Added image:", imgName);
//           }
//         });
//         console.log("All camping images:", allCampingImages);
//         setCampingImages(allCampingImages);

//         setFavorites(processedFavorites);
//       } catch (error) {
//         console.error("Error fetching admin favorites:", error);
//         // Fallback to empty arrays if favorites API fails
//         setFavorites({
//           trips: [],
//           camping: [],
//           attractions: [],
//         });
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchFavorites();
//   }, []);

//   const handleContactClick = () => {
//     navigate("/contact");
//   };

//   // Accordion Item Component
//   const AccordionItem = ({ item, isActive, onMouseEnter }) => {
//     const [loaded, setLoaded] = useState(false);
//     const [imgSrc, setImgSrc] = useState(item.imageUrl);

//     // Handle image load complete
//     const handleImageLoad = () => {
//       setLoaded(true);
//     };

//     // Handle image error
//     const handleImageError = () => {
//       if (item.fallbackUrl && imgSrc !== item.fallbackUrl) {
//         // Try fallback image first
//         setImgSrc(item.fallbackUrl);
//       } else if (
//         imgSrc !== "https://placehold.co/400x450/2d3748/ffffff?text=Image+Error"
//       ) {
//         // If fallback also fails or doesn't exist, use placeholder
//         setImgSrc(
//           "https://placehold.co/400x450/2d3748/ffffff?text=Image+Error"
//         );
//       }
//     };

//     return (
//       <div
//         className={`
//           ${styles.accordionItem}
//           ${isActive ? styles.accordionItemActive : ""}
//         `}
//         onMouseEnter={onMouseEnter}
//       >
//         <img
//           src={imgSrc}
//           alt={item.title}
//           className={`${styles.accordionItemImage} ${
//             !loaded ? styles.imageLoading : ""
//           }`}
//           onLoad={handleImageLoad}
//           onError={handleImageError}
//           loading="eager"
//           decoding="async"
//         />
//         <div className={styles.accordionItemOverlay}></div>
//         <span
//           className={`
//           ${styles.accordionItemTitle}
//           ${isActive ? styles.accordionItemTitleActive : ""}
//         `}
//         >
//           {item.title}
//         </span>
//       </div>
//     );
//   };

//   // Accordion items data with server images
//   const accordionItems = [
//     {
//       id: 1,
//       title: "טיולים מאורגנים",
//       imageUrl: "http://localhost:5000/uploads/trips/img-trips01.jpg",
//       fallbackUrl: "http://localhost:5000/uploads/trips/img-trips06.jpg",
//     },
//     {
//       id: 2,
//       title: "אטרקציות",
//       imageUrl: "http://localhost:5000/uploads/trips/img-trips05.jpg",
//       fallbackUrl: "http://localhost:5000/uploads/trips/img-trips10.jpg",
//     },
//     {
//       id: 3,
//       title: "קמפינג",
//       imageUrl: "http://localhost:5000/uploads/trips/img-trips09.jpg",
//       fallbackUrl: "http://localhost:5000/uploads/trips/img-trips04.jpg",
//     },
//     {
//       id: 4,
//       title: "טיולי משפחות",
//       imageUrl: "http://localhost:5000/uploads/trips/img-trips13.jpg",
//       fallbackUrl: "http://localhost:5000/uploads/trips/img-trips08.jpg",
//     },
//     {
//       id: 5,
//       title: "חוויות מיוחדות",
//       imageUrl: "http://localhost:5000/uploads/trips/img-trips17.jpg",
//       fallbackUrl: "http://localhost:5000/uploads/trips/img-trips12.jpg",
//     },
//   ];

//   // State for active accordion item
//   const [activeIndex, setActiveIndex] = useState(2);

//   const handleItemHover = (index) => {
//     setActiveIndex(index);
//   };

//   return (
//     <div className={styles.homeContainer}>
//       {/* Interactive Image Accordion Section */}
//       <section className={styles.accordionSection}>
//         <div className={styles.accordionContainer}>
//           {/* Left Side: Text Content */}
//           <div className={styles.accordionTextContent}>
//             <h1 className={styles.accordionHeading}>
//               ברוכים הבאים ל-DO OlaNya Trips
//             </h1>
//             <p className={styles.accordionSubheading}>
//               גלו את פלאי הטבע דרך חוויות הקמפינג והאטרקציות המרגשות שלנו
//             </p>
//             <div className={styles.accordionActions}>
//               <button
//                 className={styles.primaryButton}
//                 onClick={() => navigate("/trips")}
//               >
//                 לחקור טיולים
//               </button>
//               <button
//                 className={styles.accordionSecondaryButton}
//                 onClick={() => navigate("/camping")}
//               >
//                 אתרי קמפינג
//               </button>
//               <button
//                 className={styles.accordionSecondaryButton}
//                 onClick={() => navigate("/attractions")}
//               >
//                 אטרקציות
//               </button>
//             </div>
//           </div>

//           {/* Right Side: Image Accordion */}
//           <div className={styles.accordionWrapper}>
//             <div className={styles.accordionItemsContainer}>
//               {accordionItems.map((item, index) => (
//                 <AccordionItem
//                   key={item.id}
//                   item={item}
//                   isActive={index === activeIndex}
//                   onMouseEnter={() => handleItemHover(index)}
//                 />
//               ))}
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Features Section */}
//       <section className={styles.featuresSection}>
//         <div className={styles.featuresContainer}>
//           <h2 className={styles.sectionTitle}> Do OlaNya Trips למה לבחור ב </h2>
//           <div className={styles.featuresGrid}>
//             <div className={styles.featureCard}>
//               <div className={styles.featureIcon}>
//                 <i className="fas fa-map-marked-alt"></i>
//               </div>
//               <h3>תכנון אישי</h3>
//               <p>
//                 אנחנו נעזור לכם לבנות את הטיול המושלם, בדיוק לפי מה שאתם אוהבים
//               </p>
//             </div>
//             <div className={styles.featureCard}>
//               <div className={styles.featureIcon}>
//                 <i className="fas fa-tent"></i>
//               </div>
//               <h3>ציוד איכותי</h3>
//               <p>ציוד קמפינג מודרני ומתקנים נוחים שיכניסו אתכם לאווירה</p>
//             </div>
//             <div className={styles.featureCard}>
//               <div className={styles.featureIcon}>
//                 <i className="fas fa-hiking"></i>
//               </div>
//               <h3>חוויות בלתי נשכחות</h3>
//               <p>רגעים קסומים וזיכרונות שיישארו איתכם לנצח</p>
//             </div>
//             <div className={styles.featureCard}>
//               <div className={styles.featureIcon}>
//                 <i className="fas fa-heart"></i>
//               </div>
//               <h3>טיול הפתעה</h3>
//               <p>חוויה מרגשת ומלאת הפתעות – בחרו סוג טיול, ואנחנו נדאג לשאר!</p>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Admin Recommended Trips */}
//       {favorites.trips.length > 0 && (
//         <section className={styles.recommendationSection}>
//           <h2>🌟 טיולים שלא תשכחו</h2>
//           <div className={styles.cardsGrid}>
//             {favorites.trips.slice(0, 6).map((trip) => (
//               <TripsCard key={trip.trip_id} {...trip} />
//             ))}
//           </div>
//         </section>
//       )}

//       {/* Admin Recommended Camping Spots */}
//       {favorites.camping.length > 0 && (
//         <section
//           className={`${styles.recommendationSection} ${styles.campingSection}`}
//         >
//           <h2>🏕️ חוויות קמפינג קסומות</h2>
//           <div className={styles.cardsGrid}>
//             {favorites.camping.slice(0, 6).map((camping, index) => (
//               <CampingCard
//                 key={camping.camping_location_name || index}
//                 {...camping}
//               />
//             ))}
//           </div>
//         </section>
//       )}

//       {/* Admin Recommended Attractions */}
//       {favorites.attractions.length > 0 && (
//         <section className={styles.recommendationSection}>
//           <h2>🎯אטרקציות מומלצות</h2>
//           <div className={styles.cardsGrid}>
//             {favorites.attractions.slice(0, 6).map((attraction) => (
//               <AttractionCard key={attraction.attraction_id} {...attraction} />
//             ))}
//           </div>
//         </section>
//       )}

//       {/* Loading State */}
//       {loading && (
//         <section className={styles.recommendationSection}>
//           <div className={styles.loadingContainer}>
//             <p>Loading recommendations...</p>
//           </div>
//         </section>
//       )}

//       {/* No Favorites Message */}
//       {!loading &&
//         favorites.trips.length === 0 &&
//         favorites.camping.length === 0 &&
//         favorites.attractions.length === 0 && (
//           <section className={styles.recommendationSection}>
//             <div className={styles.noFavoritesContainer}>
//               <h2>🌟 Coming Soon</h2>
//               <p>
//                 Our admin team is curating the best recommendations for you!
//               </p>
//             </div>
//           </section>
//         )}

//       {/* Image Mask Gallery */}
//       <section className={styles.imageMaskSection}>
//         <h2>✨ הקסם מתחיל בלילה ✨</h2>
//         <ImageMask images={campingImages} />
//       </section>

//       {/* Contact Button */}
//       <div className={styles.contactContainer} onClick={handleContactClick}>
//         <h3>הטיול הבא שלכם מתחיל כאן 🌿</h3>
//         <p>צרו קשר עם הצוות שלנו ותנו לנו לדאוג לכל הפרטים</p>
//       </div>
//     </div>
//   );
// };

// export default Home;

// src/pages/home/Home.jsx

import React from "react";
import { Link } from "react-router-dom";
import PhoneVideoFrame from "../phoneVideoFrame/PhoneVideoFrame";
import { FaInstagram } from "react-icons/fa"; // ✅ ייבוא אייקון אינסטגרם
import styles from "./home.module.css";

export default function Home() {
  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          {/* ─── טקסט ─── */}
          <div className={styles.heroText}>
            <p className={styles.heroParagraph}>
              ✨ ברוכים הבאים ל־Do OlaNya Trips! ✨ <br />
              📲 אם לא שמעתם עלינו ועל הטיולים שאנחנו מתכננים לכם –{" "}
              <a
                href="https://www.instagram.com/do_olanya_trips/"
                target="_blank"
                rel="noreferrer"
                className={styles.instaLink}
              >
                <FaInstagram className={styles.instaIcon} />
              </a>
              ותראו מה חדש!
              <br />
              <br />
              כאן מחכות לכם חוויות מיוחדות מכל הסוגים:
              <br />
              🏕️ קמפינג בטבע – לינות באוהלים באזורים הכי יפים בארץ
              <br />
              🚶 טיולים מאורגנים – מסלולים מתוכננים עד הפרט הקטן
              <br />
              🎡 אטרקציות ייחודיות – חוויות שתרצו לחזור אליהן שוב
              <br />
              <br />
              💡 אנחנו מתכננים עבורכם את הטיולים עם המון תשומת לב לפרטים הקטנים.
              <br />
              <br />
              🎁 הכרתם את טיול ההפתעה? אם לא — זה הזמן לגלות חוויה ייחודית:
              <br />
              בוחרים סגנון ותקציב, ואנחנו דואגים לכל השאר!
              <br />
              👉{" "}
              <Link to="/surprise" className={styles.surpriseLinkInline}>
                בואו להכיר את טיול ההפתעה →
              </Link>
            </p>
          </div>

          {/* ─── טלפון ─── */}
          <div className={styles.videoWrapper}>
            <PhoneVideoFrame
              sourceType="video"
              videoSrc="/videos/myVideo.mp4"
              autoPlay
              loop
              muted
              controls={true}
              aspectRatio="9 / 19.5"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
