// import React, { useState, useEffect, useCallback, useRef } from "react";
// import styles from "./imageCarousel.module.css";
// import ImageModal from "../ImageModal/ImageModal";

// const ImageCarousel = ({ images, altText, basePath = 'camping' }) => {
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [isTransitioning, setIsTransitioning] = useState(false);
//   const [showModal, setShowModal] = useState(false);
//   const [selectedImage, setSelectedImage] = useState("");
//   const carouselRef = useRef(null);
//   const touchStartX = useRef(0);
//   const touchEndX = useRef(0);

//   // Function to go to next slide - defined with useCallback to avoid dependency issues
//   const nextSlide = useCallback(() => {
//     if (!images || images.length <= 1 || isTransitioning) return;

//     setIsTransitioning(true);
//     setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
//     setTimeout(() => setIsTransitioning(false), 500); // Match this with CSS transition time
//   }, [images, isTransitioning]);

//   // Function to go to previous slide
//   const prevSlide = useCallback(() => {
//     if (!images || images.length <= 1 || isTransitioning) return;

//     setIsTransitioning(true);
//     setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
//     setTimeout(() => setIsTransitioning(false), 500); // Match this with CSS transition time
//   }, [images, isTransitioning]);

//   // Auto-advance slides - always called unconditionally
//   useEffect(() => {
//     // Only set up interval if we have multiple images
//     if (images && images.length > 1) {
//       const interval = setInterval(() => {
//         if (!isTransitioning) {
//           nextSlide();
//         }
//       }, 5000);
//       return () => clearInterval(interval);
//     }
//   }, [images, nextSlide, isTransitioning]);

//   // Keyboard navigation
//   useEffect(() => {
//     const handleKeyDown = (e) => {
//       // Only handle keyboard events if carousel is visible in viewport
//       if (!carouselRef.current) return;

//       const rect = carouselRef.current.getBoundingClientRect();
//       const isVisible = (
//         rect.top >= 0 &&
//         rect.left >= 0 &&
//         rect.bottom <= window.innerHeight &&
//         rect.right <= window.innerWidth
//       );

//       if (!isVisible) return;

//       // Handle RTL layout - arrows are reversed
//       if (e.key === "ArrowLeft") {
//         nextSlide(); // In RTL, left arrow moves to next slide
//       } else if (e.key === "ArrowRight") {
//         prevSlide(); // In RTL, right arrow moves to previous slide
//       } else if (e.key === "Escape" && showModal) {
//         closeModal();
//       }
//     };

//     window.addEventListener("keydown", handleKeyDown);
//     return () => window.removeEventListener("keydown", handleKeyDown);
//   }, [nextSlide, prevSlide, showModal]);

//   // Touch events for swipe gestures
//   const handleTouchStart = (e) => {
//     touchStartX.current = e.touches[0].clientX;
//   };

//   const handleTouchMove = (e) => {
//     touchEndX.current = e.touches[0].clientX;
//   };

//   const handleTouchEnd = () => {
//     if (!isTransitioning) {
//       // Calculate swipe distance
//       const swipeDistance = touchEndX.current - touchStartX.current;

//       // Minimum swipe distance to trigger slide change (px)
//       const minSwipeDistance = 50;

//       if (swipeDistance > minSwipeDistance) {
//         // Swiped right in LTR, which is previous in RTL
//         prevSlide();
//       } else if (swipeDistance < -minSwipeDistance) {
//         // Swiped left in LTR, which is next in RTL
//         nextSlide();
//       }
//     }
//   };

//   // Handle single image or no images
//   if (!images || images.length === 0) {
//     return null;
//   }

//   // Determine if provided path is absolute
//   const isAbsoluteUrl = (url) => /^https?:\/\//i.test(url) || url.startsWith('data:');

//   // Build image URL from filename or passthrough absolute URL
//   const buildUrl = (img) => (isAbsoluteUrl(img)
//     ? img
//     : `http://localhost:5000/uploads/${basePath}/${img}`);

//   // Open modal with full-size image
//   const openModal = (image) => {
//     setSelectedImage(buildUrl(image));
//     setShowModal(true);
//   };

//   // Close modal
//   const closeModal = () => {
//     setShowModal(false);
//   };

//   // Placeholder image for loading errors
//   const placeholderImage = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1170&q=80';

//   // Handle image error
//   const handleImageError = (e) => {
//     console.log('Image failed to load:', e.target.src);
//     e.target.onerror = null;
//     e.target.src = placeholderImage;
//     // Add a class to indicate this is a placeholder
//     e.target.classList.add(styles.placeholderImage);
//   };

//   if (images.length === 1) {
//     return (
//       <>
//         <div className={styles.singleImageContainer}>
//           <img
//             src={buildUrl(images[0])}
//             srcSet={`${buildUrl(images[0])} 1x`}
//             sizes="(max-width: 768px) 100vw, 900px"
//             alt={altText || "Camping image"}
//             className={styles.singleImage}
//             loading="eager"
//             onClick={() => openModal(images[0])}
//             onError={handleImageError}
//           />
//         </div>
//         {showModal && (
//           <ImageModal
//             imageUrl={selectedImage}
//             altText={altText}
//             onClose={closeModal}
//             isOpen={showModal}
//           />
//         )}
//       </>
//     );
//   }

//   // Render carousel for multiple images
//   return (
//     <>
//     <div
//       className={styles.carouselContainer}
//       ref={carouselRef}
//     >
//       <div className={styles.carouselTrack}>
//         {images.map((image, index) => (
//          <div
//          key={index}
//          className={`${styles.slideItem} ${
//            (index === images.length - 1 && images.length % 3 === 1) ? styles.lastSingle : ""
//          }`}
//        >
//          <img
//            src={buildUrl(image)}
//            alt={`${altText || "Camping"} - Image ${index + 1}`}
//            className={styles.carouselImage}
//            onClick={() => openModal(image)}
//            onError={handleImageError}
//          />
//        </div>

//         ))}
//       </div>
//     </div>
//     {showModal && (
//       <ImageModal
//         imageUrl={selectedImage}
//         altText={altText}
//         onClose={closeModal}
//         isOpen={showModal}
//       />
//     )}
//     </>
//   );
// };

// export default ImageCarousel;

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import styles from "./imageCarousel.module.css";
import ImageModal from "../ImageModal/ImageModal";

const API_ORIGIN = "http://localhost:5000";
// עדיף להחזיק פלייסהולדר אצלך בשרת (ודא שהקובץ קיים)
const PLACEHOLDER = `${API_ORIGIN}/uploads/misc/placeholder.jpg`;

const firstFromCsv = (val = "") => {
  const s = String(val || "").trim();
  if (!s) return "";
  // תופס מקרה של פסיקים או ירידת שורה
  return s.split(/[\n,]/)[0].trim();
};

const isAbsoluteUrl = (url = "") =>
  /^https?:\/\//i.test(url) || url.startsWith("data:");

/**
 * מנרמל נתיב תמונה:
 * - אם URL מלא / data-uri -> מחזיר כמו שהוא
 * - אם מתחיל ב-/uploads -> מוסיף דומיין
 * - אחרת מניח שזה שם קובץ ומרכיב לפי basePath
 */
const normalizeImagePath = (raw = "", basePath = "camping") => {
  const first = firstFromCsv(raw);
  if (!first) return "";

  if (isAbsoluteUrl(first)) return first;
  if (first.startsWith("/uploads/")) return `${API_ORIGIN}${first}`;

  // שם קובץ בלבד
  return `${API_ORIGIN}/uploads/${basePath}/${first}`;
};

const ImageCarousel = ({ images, altText, basePath = "camping" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const carouselRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // ננקה את מערך התמונות כבר בהתחלה
  const cleanedImages = useMemo(() => {
    if (!images) return [];
    // תומך גם אם בטעות עבר מחרוזת אחת ארוכה
    const arr = Array.isArray(images) ? images : [images];
    return arr.map((img) => firstFromCsv(img)).filter(Boolean);
  }, [images]);

  const nextSlide = useCallback(() => {
    if (cleanedImages.length <= 1 || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) =>
      prevIndex === cleanedImages.length - 1 ? 0 : prevIndex + 1
    );
    setTimeout(() => setIsTransitioning(false), 500);
  }, [cleanedImages.length, isTransitioning]);

  const prevSlide = useCallback(() => {
    if (cleanedImages.length <= 1 || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? cleanedImages.length - 1 : prevIndex - 1
    );
    setTimeout(() => setIsTransitioning(false), 500);
  }, [cleanedImages.length, isTransitioning]);

  useEffect(() => {
    if (cleanedImages.length > 1) {
      const interval = setInterval(() => {
        if (!isTransitioning) nextSlide();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [cleanedImages.length, nextSlide, isTransitioning]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!carouselRef.current) return;
      const rect = carouselRef.current.getBoundingClientRect();
      const isVisible =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth;

      if (!isVisible) return;

      if (e.key === "ArrowLeft") {
        nextSlide();
      } else if (e.key === "ArrowRight") {
        prevSlide();
      } else if (e.key === "Escape" && showModal) {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, showModal]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!isTransitioning) {
      const swipeDistance = touchEndX.current - touchStartX.current;
      const minSwipeDistance = 50;
      if (swipeDistance > minSwipeDistance) {
        prevSlide();
      } else if (swipeDistance < -minSwipeDistance) {
        nextSlide();
      }
    }
  };

  if (!cleanedImages.length) return null;

  const buildUrl = (img) => normalizeImagePath(img, basePath);

  const openModal = (image) => {
    setSelectedImage(buildUrl(image));
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleImageError = (e) => {
    console.warn("Image failed to load:", e.currentTarget.src);
    e.currentTarget.onerror = null;
    e.currentTarget.src = PLACEHOLDER;
    e.currentTarget.classList.add(styles.placeholderImage);
  };

  if (cleanedImages.length === 1) {
    return (
      <>
        <div
          className={styles.singleImageContainer}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          ref={carouselRef}
        >
          <img
            src={buildUrl(cleanedImages[0])}
            srcSet={`${buildUrl(cleanedImages[0])} 1x`}
            sizes="(max-width: 768px) 100vw, 900px"
            alt={altText || "Image"}
            className={styles.singleImage}
            loading="eager"
            onClick={() => openModal(cleanedImages[0])}
            onError={handleImageError}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
        </div>
        {showModal && (
          <ImageModal
            imageUrl={selectedImage}
            altText={altText}
            onClose={closeModal}
            isOpen={showModal}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className={styles.carouselContainer}
        ref={carouselRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.carouselTrack}>
          {cleanedImages.map((image, index) => (
            <div
              key={index}
              className={`${styles.slideItem} ${
                index === cleanedImages.length - 1 &&
                cleanedImages.length % 3 === 1
                  ? styles.lastSingle
                  : ""
              }`}
            >
              <img
                src={buildUrl(image)}
                alt={`${altText || "Image"} - ${index + 1}`}
                className={styles.carouselImage}
                onClick={() => openModal(image)}
                onError={handleImageError}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <ImageModal
          imageUrl={selectedImage}
          altText={altText}
          onClose={closeModal}
          isOpen={showModal}
        />
      )}
    </>
  );
};

export default ImageCarousel;
