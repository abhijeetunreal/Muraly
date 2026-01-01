// ================= CUSTOM ALERT POPUP =================
// Custom alert popup that matches the app's glassmorphism design

let alertQueue = [];
let isShowingAlert = false;

/**
 * Show a custom alert popup
 * @param {string} message - The message to display
 * @param {string} type - Alert type: 'error', 'warning', 'info', 'success' (default: 'info')
 * @param {number} timeout - Auto-dismiss timeout in milliseconds (0 = no auto-dismiss)
 * @returns {Promise} Resolves when alert is dismissed
 */
export function showAlert(message, type = 'info', timeout = null) {
  return new Promise((resolve) => {
    // Set default timeout based on type
    if (timeout === null) {
      switch (type) {
        case 'error':
          timeout = 10000; // 10 seconds
          break;
        case 'warning':
          timeout = 7000; // 7 seconds
          break;
        case 'info':
        case 'success':
        default:
          timeout = 5000; // 5 seconds
          break;
      }
    }

    const alertData = { message, type, timeout, resolve };
    
    if (isShowingAlert) {
      // Queue the alert if one is already showing
      alertQueue.push(alertData);
      return;
    }

    displayAlert(alertData);
  });
}

function displayAlert({ message, type, timeout, resolve }) {
  isShowingAlert = true;

  // Create alert container if it doesn't exist
  let alertContainer = document.getElementById('customAlertContainer');
  if (!alertContainer) {
    alertContainer = document.createElement('div');
    alertContainer.id = 'customAlertContainer';
    document.body.appendChild(alertContainer);
  }

  // Create alert element
  const alert = document.createElement('div');
  alert.className = `custom-alert custom-alert-${type}`;
  
  // Create icon based on type
  const iconMap = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✓'
  };
  
  // Create content
  alert.innerHTML = `
    <div class="custom-alert-content">
      <span class="custom-alert-icon">${iconMap[type] || iconMap.info}</span>
      <span class="custom-alert-message">${escapeHtml(message)}</span>
      <button class="custom-alert-close" aria-label="Close">×</button>
    </div>
  `;

  // Add to container
  alertContainer.appendChild(alert);

  // Trigger animation
  requestAnimationFrame(() => {
    alert.classList.add('custom-alert-show');
  });

  // Close function
  const closeAlert = () => {
    alert.classList.remove('custom-alert-show');
    alert.classList.add('custom-alert-hide');
    
    setTimeout(() => {
      alert.remove();
      isShowingAlert = false;
      resolve();
      
      // Show next alert in queue if any
      if (alertQueue.length > 0) {
        const nextAlert = alertQueue.shift();
        displayAlert(nextAlert);
      }
    }, 300); // Match CSS animation duration
  };

  // Close button click
  const closeBtn = alert.querySelector('.custom-alert-close');
  closeBtn.addEventListener('click', closeAlert);

  // Auto-dismiss
  if (timeout > 0) {
    const timeoutId = setTimeout(closeAlert, timeout);
    
    // Clear timeout if user clicks close
    closeBtn.addEventListener('click', () => {
      clearTimeout(timeoutId);
    });
  }
}

/**
 * Show a custom confirm dialog
 * @param {string} message - The message to display
 * @param {string} confirmText - Text for confirm button (default: 'OK')
 * @param {string} cancelText - Text for cancel button (default: 'Cancel')
 * @returns {Promise<boolean>} Resolves with true if confirmed, false if cancelled
 */
export function showConfirm(message, confirmText = 'OK', cancelText = 'Cancel') {
  return new Promise((resolve) => {
    // Create confirm container if it doesn't exist
    let confirmContainer = document.getElementById('customConfirmContainer');
    if (!confirmContainer) {
      confirmContainer = document.createElement('div');
      confirmContainer.id = 'customConfirmContainer';
      document.body.appendChild(confirmContainer);
    }

    // Create backdrop overlay
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-confirm-backdrop';
    
    // Create confirm dialog
    const confirm = document.createElement('div');
    confirm.className = 'custom-confirm';
    
    confirm.innerHTML = `
      <div class="custom-confirm-content">
        <span class="custom-confirm-icon">⚠️</span>
        <span class="custom-confirm-message">${escapeHtml(message)}</span>
        <div class="custom-confirm-buttons">
          <button class="custom-confirm-btn custom-confirm-cancel">${escapeHtml(cancelText)}</button>
          <button class="custom-confirm-btn custom-confirm-ok">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    // Add to container
    confirmContainer.appendChild(backdrop);
    confirmContainer.appendChild(confirm);

    // Trigger animation
    requestAnimationFrame(() => {
      backdrop.classList.add('custom-confirm-show');
      confirm.classList.add('custom-confirm-show');
    });

    // Close function
    const closeConfirm = (result) => {
      backdrop.classList.remove('custom-confirm-show');
      confirm.classList.remove('custom-confirm-show');
      backdrop.classList.add('custom-confirm-hide');
      confirm.classList.add('custom-confirm-hide');
      
      setTimeout(() => {
        backdrop.remove();
        confirm.remove();
        resolve(result);
      }, 300); // Match CSS animation duration
    };

    // Button handlers
    const okBtn = confirm.querySelector('.custom-confirm-ok');
    const cancelBtn = confirm.querySelector('.custom-confirm-cancel');
    
    okBtn.addEventListener('click', () => closeConfirm(true));
    cancelBtn.addEventListener('click', () => closeConfirm(false));
    backdrop.addEventListener('click', () => closeConfirm(false));
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

