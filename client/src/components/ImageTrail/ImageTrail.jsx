import React, { useRef, useEffect } from "react";
import "./ImageTrail.css";

function lerp(a, b, n) {
  return (1 - n) * a + n * b;
}

function getLocalPointerPos(e, rect) {
  let clientX = 0,
    clientY = 0;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function getMouseDistance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

class ImageItem {
  DOM = { el: null, inner: null };
  rect = null;

  constructor(DOM_el) {
    this.DOM.el = DOM_el;
    this.DOM.inner = this.DOM.el.querySelector(".content__img-inner");
    this.getRect();
    this.initEvents();
  }

  initEvents() {
    this.resize = () => {
      this.DOM.el.style.transform = "translate(0, 0)";
      this.DOM.el.style.opacity = "0";
      this.getRect();
    };
    window.addEventListener("resize", this.resize);
  }

  getRect() {
    this.rect = this.DOM.el.getBoundingClientRect();
  }
}

class ImageTrailVariant1 {
  constructor(container) {
    this.container = container;
    this.DOM = { el: container };

    if (container) {
      const images = [...container.querySelectorAll(".content__img")];
      this.images = images.length > 0 ? images.map((img) => new ImageItem(img)) : [];
      this.imagesTotal = this.images.length;
    } else {
      this.images = [];
      this.imagesTotal = 0;
    }

    this.imgPosition = 0;
    this.zIndexVal = 1;
    this.isIdle = true;
    this.threshold = 50; // מרחק תזוזה קטן יותר - רך יותר

    this.mousePos = { x: 0, y: 0 };
    this.lastMousePos = { x: 0, y: 0 };
    this.cacheMousePos = { x: 0, y: 0 };

    const handlePointerMove = (ev) => {
      if (!this.container) return;
      const rect = this.container.getBoundingClientRect();
      this.mousePos = getLocalPointerPos(ev, rect);
    };

    if (container) {
      container.addEventListener("mousemove", handlePointerMove);
      container.addEventListener("touchmove", handlePointerMove);

      const initRender = (ev) => {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.mousePos = getLocalPointerPos(ev, rect);
        this.cacheMousePos = { ...this.mousePos };

        requestAnimationFrame(() => this.render());

        container.removeEventListener("mousemove", initRender);
        container.removeEventListener("touchmove", initRender);
      };
      container.addEventListener("mousemove", initRender);
      container.addEventListener("touchmove", initRender);
    }
  }

  render() {
    const distance = getMouseDistance(this.mousePos, this.lastMousePos);

    // זזים בצורה רכה
    this.cacheMousePos.x = lerp(this.cacheMousePos.x, this.mousePos.x, 0.12);
    this.cacheMousePos.y = lerp(this.cacheMousePos.y, this.mousePos.y, 0.12);

    if (distance > this.threshold) {
      this.showNextImage();
      this.lastMousePos = { ...this.mousePos };
    }

    if (this.isIdle && this.zIndexVal !== 1) {
      this.zIndexVal = 1;
    }

    requestAnimationFrame(() => this.render());
  }

  showNextImage() {
    if (!this.container || !this.images || this.images.length === 0) return;

    const image = this.images[this.imgPosition];
    if (!image || !image.rect) return;

    const imgRect = image.rect;
    const containerRect = this.container.getBoundingClientRect();

    this.isIdle = false;
    this.zIndexVal++;
    image.DOM.el.style.zIndex = this.zIndexVal;

    // מתחילים עם שקיפות 0 והסטת תמונה קלה בהתאם למיקום העכבר
    const translateX = this.cacheMousePos.x - imgRect.width / 2;
    const translateY = this.cacheMousePos.y - imgRect.height / 2;

    image.DOM.el.style.transition = "none";
    image.DOM.el.style.transform = `translate(${translateX}px, ${translateY}px) scale(1)`;
    image.DOM.el.style.opacity = "1";

    // אנימציה עדינה להסטה למרכז התיבה בלי זום
    requestAnimationFrame(() => {
      image.DOM.el.style.transition = "transform 0.8s ease, opacity 0.8s ease";
      image.DOM.el.style.transform = `translate(${(containerRect.width - imgRect.width) / 2}px, ${(containerRect.height - imgRect.height) / 2}px) scale(1)`;
      image.DOM.el.style.opacity = "0";
    });

    // איפוס אחרי האנימציה
    setTimeout(() => {
      this.isIdle = true;
      this.imgPosition = (this.imgPosition + 1) % this.imagesTotal;
    }, 900);
  }

  destroy() {
    this.images.forEach((image) => {
      window.removeEventListener("resize", image.resize);
    });
    this.container = null;
  }
}

export default function ImageTrail({ items = [], variant = 1 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      new variantMap[variant](containerRef.current);
    }
  }, [variant, items]);

  return (
    <div className="content" ref={containerRef}>
      {items.map((item) => (
        <div className="content__img" key={item.key}>
          <div
            className="content__img-inner"
            style={{ backgroundImage: `url(${item.url})` }}
          />
        </div>
      ))}
    </div>
  );
}

const variantMap = {
  1: ImageTrailVariant1,
};
