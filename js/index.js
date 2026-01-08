// Import custom confirm dialog
import { showConfirm } from './modules/alert.js';

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
  lucide.createIcons();
}

// Scroll animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => {
  observer.observe(el);
});

// 1. Mouse Parallax Effect (The "Alive" Feeling)
document.addEventListener('mousemove', (e) => {
  const x = (window.innerWidth - e.pageX * 2) / 100;
  const y = (window.innerHeight - e.pageY * 2) / 100;

  document.querySelectorAll('.parallax-blob').forEach(el => {
    const speed = el.getAttribute('data-speed');
    const xPos = x * speed * 100;
    const yPos = y * speed * 100;
    
    // Smooth transition using GSAP
    if (typeof gsap !== 'undefined') {
      gsap.to(el, {
        x: xPos,
        y: yPos,
        duration: 1.5,
        ease: "power2.out"
      });
    }
  });
});

// 2. Custom Cursor & Interaction with fallback detection
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Function to check if custom cursor is actually working
function checkCustomCursorWorking() {
  if (!cursorDot || !cursorOutline) return false;
  
  // Check if elements are in the DOM and have computed styles
  const dotRect = cursorDot.getBoundingClientRect();
  const outlineRect = cursorOutline.getBoundingClientRect();
  
  // Check if elements are actually visible (not hidden by display:none or opacity:0)
  const dotStyle = window.getComputedStyle(cursorDot);
  const outlineStyle = window.getComputedStyle(cursorOutline);
  
  const dotVisible = dotStyle.display !== 'none' && 
                     dotStyle.visibility !== 'hidden' && 
                     parseFloat(dotStyle.opacity) > 0;
  const outlineVisible = outlineStyle.display !== 'none' && 
                          outlineStyle.visibility !== 'hidden' && 
                          parseFloat(outlineStyle.opacity) > 0;
  
  return dotVisible && outlineVisible;
}

if (!isTouchDevice && cursorDot && cursorOutline) {
  // Initialize cursor visibility and position
  cursorDot.style.display = 'block';
  cursorDot.style.opacity = '1';
  cursorDot.style.left = '50%';
  cursorDot.style.top = '50%';
  cursorOutline.style.display = 'block';
  cursorOutline.style.opacity = '1';
  cursorOutline.style.left = '50%';
  cursorOutline.style.top = '50%';
  
  // Check if custom cursor is working after a short delay
  setTimeout(() => {
    if (checkCustomCursorWorking()) {
      // Custom cursor is working - hide default cursor
      document.body.classList.add('custom-cursor-active');
    } else {
      // Custom cursor not working - restore default cursor and hide custom elements
      document.body.classList.remove('custom-cursor-active');
      cursorDot.style.display = 'none';
      cursorOutline.style.display = 'none';
      return; // Exit early, don't set up mouse tracking
    }
  }, 100);
  
  let cursorWorking = true;
  
  window.addEventListener('mousemove', (e) => {
    if (!cursorWorking) return;
    
    cursorDot.style.left = `${e.clientX}px`;
    cursorDot.style.top = `${e.clientY}px`;
    cursorDot.style.display = 'block';
    cursorDot.style.opacity = '1';
    
    // GSAP lag for organic feel
    if (typeof gsap !== 'undefined') {
      gsap.to(cursorOutline, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.2,
        ease: "power2.out"
      });
    } else {
      cursorOutline.style.left = `${e.clientX}px`;
      cursorOutline.style.top = `${e.clientY}px`;
    }
    cursorOutline.style.display = 'block';
    cursorOutline.style.opacity = '1';
    
    // Periodic check to ensure cursor is still working
    if (Math.random() < 0.01) { // Check 1% of the time to avoid performance issues
      if (!checkCustomCursorWorking()) {
        cursorWorking = false;
        document.body.classList.remove('custom-cursor-active');
        cursorDot.style.display = 'none';
        cursorOutline.style.display = 'none';
      }
    }
  });

  // Interactive Element Hover
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (!cursorWorking) return;
      if (typeof gsap !== 'undefined') {
        gsap.to(cursorOutline, { scale: 1.5, backgroundColor: 'rgba(255,255,255,0.1)', duration: 0.3 });
        gsap.to(cursorDot, { scale: 0, duration: 0.3 });
      }
    });
    el.addEventListener('mouseleave', () => {
      if (!cursorWorking) return;
      if (typeof gsap !== 'undefined') {
        gsap.to(cursorOutline, { scale: 1, backgroundColor: 'transparent', duration: 0.3 });
        gsap.to(cursorDot, { scale: 1, duration: 0.3 });
      }
    });
  });
} else if (isTouchDevice) {
  // Hide cursor on touch devices
  if (cursorDot) cursorDot.style.display = 'none';
  if (cursorOutline) cursorOutline.style.display = 'none';
}

// 4. Splatter Effect on Click
window.addEventListener('mousedown', createSplatter);
window.addEventListener('touchstart', (e) => createSplatter(e.touches[0]), {passive: true});

function createSplatter(e) {
  if(e.target.closest('button') || e.target.closest('a')) return;

  const colors = ['#FF0055', '#CCFF00', '#00FFFF'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = Math.random() * 30 + 10;
  
  const splatter = document.createElement('div');
  splatter.classList.add('splatter');
  splatter.style.backgroundColor = color;
  splatter.style.left = `${e.clientX}px`;
  splatter.style.top = `${e.clientY}px`;
  splatter.style.width = `${size}px`;
  splatter.style.height = `${size}px`;
  splatter.style.borderRadius = `${Math.random()*50+30}% ${Math.random()*50+30}% ${Math.random()*50+30}% ${Math.random()*50+30}%`;
  
  document.body.appendChild(splatter);

  if (typeof gsap !== 'undefined') {
    gsap.fromTo(splatter, 
      { scale: 0, opacity: 1, rotation: Math.random() * 90 },
      { scale: Math.random() * 2 + 1, opacity: 0, rotation: 0, duration: 0.8, ease: "power2.out", onComplete: () => splatter.remove() }
    );
  } else {
    setTimeout(() => splatter.remove(), 800);
  }
}

// 5. GSAP Scroll & Reveal Animations
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);

  // Hero Reveal
  const heroTl = gsap.timeline();
  heroTl.to("#hero-subtitle", { y: 0, duration: 0.8, ease: "power3.out", delay: 0.2 })
        .from("#hero-title", { opacity: 0, scale: 0.9, duration: 1, ease: "power2.out" }, "-=0.4")
        .to("#hero-cta", { opacity: 1, y: 0, duration: 0.8 }, "-=0.5");

  // Marquee Infinite Scroll
  const marquee = document.getElementById('marquee');
  if (marquee) {
    gsap.to("#marquee", { xPercent: -50, repeat: -1, duration: 15, ease: "linear" });
  }

  // Floating Phone "Alive" Animation (Vertical Float)
  const boxFloat = document.querySelector(".box-float");
  if (boxFloat) {
    gsap.to(".box-float", {
      y: -20,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }

  // Feature Cards Stagger In
  const featureCards = document.querySelectorAll('.feature-card');
  if (featureCards.length > 0) {
    // Set initial visible state before animation
    featureCards.forEach(card => {
      gsap.set(card, { opacity: 1, y: 0, visibility: 'visible' });
    });
    
    gsap.utils.toArray('.feature-card').forEach((item, i) => {
      gsap.from(item, {
        scrollTrigger: { 
          trigger: ".features", 
          start: "top 85%",
          toggleActions: "play none none none"
        },
        y: 100, 
        opacity: 0, 
        duration: 0.8, 
        delay: i * 0.15, 
        ease: "back.out(1.7)"
      });
    });
  }

  // Charity Section Reveal
  const missionSection = document.getElementById('mission');
  if (missionSection) {
    gsap.from("#mission h2, #mission p", {
      scrollTrigger: { trigger: "#mission", start: "top 75%" },
      y: 30, opacity: 0, duration: 1, stagger: 0.2, ease: "power3.out"
    });
  }
}

// Simple Paint Effect - Paint appears where cursor goes (smooth)
const paintTitle = document.getElementById('hero-title');
const paintOverlay = paintTitle?.querySelector('.spray-paint-overlay');
let paintedAreas = []; // Track painted areas for mask
let isHovering = false;

if (paintTitle) {
  // Create a canvas for the paint mask
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d');
  let maskStyleElement = null;
  let rafId = null;
  
  function updateMaskCanvas() {
    const rect = paintTitle.getBoundingClientRect();
    maskCanvas.width = rect.width;
    maskCanvas.height = rect.height;
    
    // Clear and redraw all painted areas
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    paintedAreas.forEach(area => {
      // Draw soft circular brush strokes with smooth edges
      const gradient = maskCtx.createRadialGradient(area.x, area.y, 0, area.x, area.y, area.size);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(0.3, 'rgba(0,0,0,0.95)');
      gradient.addColorStop(0.6, 'rgba(0,0,0,0.6)');
      gradient.addColorStop(0.8, 'rgba(0,0,0,0.3)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      maskCtx.fillStyle = gradient;
      maskCtx.fillRect(area.x - area.size, area.y - area.size, area.size * 2, area.size * 2);
    });
    
    // Update CSS mask with canvas data URL
    const dataURL = maskCanvas.toDataURL();
    
    if (!maskStyleElement) {
      maskStyleElement = document.createElement('style');
      maskStyleElement.id = 'paint-mask-style';
      document.head.appendChild(maskStyleElement);
    }
    
    // Use the canvas as mask, combined with text shape
    maskStyleElement.textContent = `
      #hero-title::before {
        -webkit-mask-image: url(${dataURL}), linear-gradient(#000 0 0) text, linear-gradient(#000 0 0);
        mask-image: url(${dataURL}), linear-gradient(#000 0 0) text, linear-gradient(#000 0 0);
        -webkit-mask-composite: source-in, source-over;
        mask-composite: intersect, add;
      }
      #hero-title .spray-paint-overlay {
        -webkit-mask-image: url(${dataURL}), linear-gradient(#000 0 0) text, linear-gradient(#000 0 0);
        mask-image: url(${dataURL}), linear-gradient(#000 0 0) text, linear-gradient(#000 0 0);
        -webkit-mask-composite: source-in, source-over;
        mask-composite: intersect, add;
      }
    `;
    
    if (isHovering) {
      rafId = requestAnimationFrame(updateMaskCanvas);
    }
  }
  
  // Update mask to reveal paint where cursor is (smooth)
  function updatePaintMask(x, y) {
    const brushSize = 100; // Size of paint brush in pixels
    
    // Store painted area
    paintedAreas.push({ x, y, size: brushSize });
    
    // Keep only last 150 painted areas for smooth painting
    if (paintedAreas.length > 150) {
      paintedAreas.shift();
    }
    
    // Update mask canvas smoothly
    if (!rafId) {
      rafId = requestAnimationFrame(updateMaskCanvas);
    }
  }
  
  // Mouse move on title - paint where cursor goes
  paintTitle.addEventListener('mousemove', (e) => {
    if (!isHovering) return;
    
    const rect = paintTitle.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update paint mask to reveal paint at cursor position
    updatePaintMask(x, y);
  });
  
  // Hover events
  paintTitle.addEventListener('mouseenter', () => {
    isHovering = true;
    paintedAreas = []; // Reset painted areas
  });
  
  paintTitle.addEventListener('mouseleave', () => {
    isHovering = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    // Keep painted areas visible (don't reset immediately)
  });
}

