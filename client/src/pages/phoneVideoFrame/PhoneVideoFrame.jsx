import React from "react";
import styles from "./phoneVideoFrame.module.css";

/**
 * PhoneVideoFrame
 * props:
 * - sourceType: "video" | "iframe"   // ברירת מחדל: "video"
 * - videoSrc: string                 // למצב video: קובץ מקומי או URL מלא ל-MP4
 * - poster: string                   // תמונת פוסטר לוידאו (אופציונלי)
 * - iframeUrl: string                // למצב iframe: כתובת הטמעה (YouTube/Vimeo/Instagram oEmbed וכו')
 * - aspectRatio: string              // יחס רוחב-גובה של המסך, למשל "9 / 19.5" או "16 / 9" (ברירת מחדל: iPhone-like)
 * - autoPlay: boolean                // ברירת מחדל true
 * - loop: boolean                    // ברירת מחדל true
 * - muted: boolean                   // ברירת מחדל true (חיוני לאוטופליי בדפדפנים)
 * - controls: boolean                // ברירת מחדל false
 * - allowFullScreen: boolean         // ברירת מחדל true (ל-iframe)
 */
export default function PhoneVideoFrame({
  sourceType = "video",
  videoSrc = "",
  poster = "",
  iframeUrl = "",
  aspectRatio = "9 / 19.5",
  autoPlay = true,
  loop = true,
  muted = true,
  controls = false,
  allowFullScreen = true,
}) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.phone}>
        {/* מסך הטלפון */}
        <div className={styles.screen} style={{ aspectRatio: aspectRatio }}>
          {sourceType === "iframe" && iframeUrl ? (
            <iframe
              className={styles.media}
              src={iframeUrl}
              title="Embedded player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen={allowFullScreen}
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <video
              className={styles.media}
              src={videoSrc}
              poster={poster || undefined}
              playsInline
              autoPlay={autoPlay}
              loop={loop}
              muted={muted}
              controls={controls}
            />
          )}
        </div>

        {/* נוץ' (notch) */}
        <div className={styles.notch} />

        {/* כפתורי צד דקורטיביים */}
        <div className={styles.buttonsLeft}>
          <span />
          <span />
        </div>
        <div className={styles.buttonsRight}>
          <span />
        </div>
      </div>
    </div>
  );
}
