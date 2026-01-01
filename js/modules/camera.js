// ================= CAMERA =================
import { dom } from './dom.js';

export function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(s => dom.camera.srcObject = s);
}

