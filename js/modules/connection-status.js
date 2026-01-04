// ================= CONNECTION STATUS TRACKER =================
// Tracks connection progress with elapsed time, stage, and timeout countdown

import { SESSION_TIMEOUT } from './discovery.js';

let statusTracker = null;

export class ConnectionStatusTracker {
  constructor(timeoutMs = SESSION_TIMEOUT) {
    this.startTime = Date.now();
    this.timeoutMs = timeoutMs;
    this.currentStage = "Initializing...";
    this.updateInterval = null;
    this.warning30sShown = false;
    this.warning10sShown = false;
    this.onStatusUpdate = null;
    this.onTimeout = null;
    this.onWarning = null;
    this.isActive = true;
  }

  setStage(stage) {
    this.currentStage = stage;
    this.update();
  }

  setStatusUpdateCallback(callback) {
    this.onStatusUpdate = callback;
  }

  setTimeoutCallback(callback) {
    this.onTimeout = callback;
  }

  setWarningCallback(callback) {
    this.onWarning = callback;
  }

  start() {
    this.isActive = true;
    this.update();
    // Update every second
    this.updateInterval = setInterval(() => {
      if (this.isActive) {
        this.update();
      }
    }, 1000);
  }

  update() {
    if (!this.isActive) return;

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const remaining = Math.max(0, Math.floor((this.timeoutMs / 1000) - elapsed));
    
    // Check for warnings
    if (remaining <= 10 && !this.warning10sShown) {
      this.warning10sShown = true;
      if (this.onWarning) {
        this.onWarning(10);
      }
    } else if (remaining <= 30 && !this.warning30sShown) {
      this.warning30sShown = true;
      if (this.onWarning) {
        this.onWarning(30);
      }
    }

    // Check for timeout
    if (remaining <= 0) {
      this.stop();
      if (this.onTimeout) {
        this.onTimeout();
      }
      return;
    }

    // Format time strings
    const elapsedStr = this.formatTime(elapsed);
    const remainingStr = this.formatTime(remaining);

    // Call status update callback
    if (this.onStatusUpdate) {
      this.onStatusUpdate({
        stage: this.currentStage,
        elapsed: elapsed,
        elapsedStr: elapsedStr,
        remaining: remaining,
        remainingStr: remainingStr,
        isWarning: remaining <= 30
      });
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  stop() {
    this.isActive = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  destroy() {
    this.stop();
    this.onStatusUpdate = null;
    this.onTimeout = null;
    this.onWarning = null;
  }
}

export function createStatusTracker(timeoutMs = SESSION_TIMEOUT) {
  if (statusTracker) {
    statusTracker.destroy();
  }
  statusTracker = new ConnectionStatusTracker(timeoutMs);
  return statusTracker;
}

export function getStatusTracker() {
  return statusTracker;
}

export function destroyStatusTracker() {
  if (statusTracker) {
    statusTracker.destroy();
    statusTracker = null;
  }
}

