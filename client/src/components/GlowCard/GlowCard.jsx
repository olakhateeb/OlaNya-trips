// src/components/GlowCard/GlowCard.jsx
import React, { useState } from "react";
import styles from "./GlowCard.module.css";

/**
 * GlowCard component that creates a card with a glow effect on hover
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child elements to render inside the card
 * @param {string} props.className - Additional CSS classes to apply
 * @returns {React.ReactElement} GlowCard component
 */
const GlowCard = ({ children, className = "", ...props }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e) => {
    if (!e.currentTarget) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setPosition({ x, y });
  };

  return (
    <div
      className={`${styles.glowCard} ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      style={{
        "--x": `${position.x}px`,
        "--y": `${position.y}px`,
        "--glow-opacity": isHovering ? "1" : "0"
      }}
      {...props}
    >
      <div className={styles.glowEffect}></div>
      <div className={styles.content}>{children}</div>
    </div>
  );
};

export default GlowCard;
