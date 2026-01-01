// ================= IMAGE =================
import { state } from './state.js';
import { dom } from './dom.js';

export function makeSketch() {
  if (!state.img.complete || state.img.naturalWidth === 0) {
    // Wait for image to be fully loaded
    state.img.onload = makeSketch;
    return;
  }
  const c = document.createElement("canvas");
  c.width = state.img.width;
  c.height = state.img.height;
  const cx = c.getContext("2d");
  cx.drawImage(state.img, 0, 0);
  const d = cx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const g = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 3;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = g > 150 ? 255 : 0;
  }
  cx.putImageData(d, 0, 0);
  state.sketchImg = new Image();
  state.sketchImg.onload = function() {
    // Sketch image loaded, render will pick it up
  };
  state.sketchImg.src = c.toDataURL();
}

export function initImageUpload() {
  dom.upload.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Clear any existing image first
    if (state.img.src && state.img.src.startsWith('blob:')) {
      URL.revokeObjectURL(state.img.src);
    }
    
    // Load new image
    const objectURL = URL.createObjectURL(file);
    state.img.onload = function() {
      // Ensure image is fully loaded before making sketch
      if (state.img.complete && state.img.naturalWidth > 0) {
        makeSketch();
      }
    };
    state.img.onerror = function() {
      alert("Error loading image. Please try a different image file.");
      dom.upload.value = ""; // Reset file input
    };
    state.img.src = objectURL;
  };
}

