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

/**
 * Show a choice dialog (e.g., Public/Private)
 * @param {string} message - The message to display
 * @param {string} option1Text - Text for first option (default: 'Public')
 * @param {string} option2Text - Text for second option (default: 'Private')
 * @returns {Promise<string|null>} Resolves with 'option1', 'option2', or null if cancelled
 */
export function showChoiceDialog(message, option1Text = 'Public', option2Text = 'Private') {
  return new Promise((resolve) => {
    // Use the same container as PIN dialog for consistent positioning
    let choiceContainer = document.getElementById('customPinContainer');
    if (!choiceContainer) {
      choiceContainer = document.createElement('div');
      choiceContainer.id = 'customPinContainer';
      document.body.appendChild(choiceContainer);
    }

    // Create backdrop overlay
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-confirm-backdrop';
    
    // Create choice dialog matching PIN dialog structure
    const choice = document.createElement('div');
    choice.className = 'custom-confirm';
    
    choice.innerHTML = `
      <div class="custom-confirm-content">
        <span class="custom-confirm-icon">🔒</span>
        <span class="custom-confirm-message">${escapeHtml(message)}</span>
        <div class="custom-confirm-buttons choice-buttons">
          <button class="choice-option-btn unselected" data-option="option1">${escapeHtml(option1Text)}</button>
          <button class="choice-option-btn selected" data-option="option2">${escapeHtml(option2Text)}</button>
        </div>
      </div>
    `;

    // Add to container
    choiceContainer.appendChild(backdrop);
    choiceContainer.appendChild(choice);

    // Trigger animation
    requestAnimationFrame(() => {
      backdrop.classList.add('custom-confirm-show');
      choice.classList.add('custom-confirm-show');
    });

    // Close function
    const closeChoice = (result) => {
      backdrop.classList.remove('custom-confirm-show');
      choice.classList.remove('custom-confirm-show');
      backdrop.classList.add('custom-confirm-hide');
      choice.classList.add('custom-confirm-hide');
      
      setTimeout(() => {
        backdrop.remove();
        choice.remove();
        resolve(result);
      }, 300); // Match CSS animation duration
    };

    // Button handlers with selection state management
    const option1Btn = choice.querySelector('[data-option="option1"]');
    const option2Btn = choice.querySelector('[data-option="option2"]');
    
    // Handle button clicks with visual feedback
    option1Btn.addEventListener('click', () => {
      option1Btn.classList.add('selected');
      option1Btn.classList.remove('unselected');
      option2Btn.classList.add('unselected');
      option2Btn.classList.remove('selected');
      setTimeout(() => closeChoice('option1'), 150);
    });
    
    option2Btn.addEventListener('click', () => {
      option2Btn.classList.add('selected');
      option2Btn.classList.remove('unselected');
      option1Btn.classList.add('unselected');
      option1Btn.classList.remove('selected');
      setTimeout(() => closeChoice('option2'), 150);
    });
    
    backdrop.addEventListener('click', () => closeChoice(null));
  });
}

/**
 * Show a PIN input dialog
 * @param {string} message - The message to display
 * @param {number} minLength - Minimum PIN length (default: 4)
 * @param {number} maxLength - Maximum PIN length (default: 6)
 * @returns {Promise<string|null>} Resolves with PIN string or null if cancelled
 */
export function showPinInputDialog(message, minLength = 4, maxLength = 6) {
  return new Promise((resolve) => {
    // Create PIN container if it doesn't exist
    let pinContainer = document.getElementById('customPinContainer');
    if (!pinContainer) {
      pinContainer = document.createElement('div');
      pinContainer.id = 'customPinContainer';
      document.body.appendChild(pinContainer);
    }

    // Create backdrop overlay
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-confirm-backdrop';
    
    // Create PIN dialog
    const pinDialog = document.createElement('div');
    pinDialog.className = 'custom-confirm';
    
    pinDialog.innerHTML = `
      <div class="custom-confirm-content">
        <span class="custom-confirm-icon">🔐</span>
        <span class="custom-confirm-message">${escapeHtml(message)}</span>
        <input type="text" 
               class="custom-pin-input" 
               inputmode="numeric" 
               pattern="[0-9]*" 
               maxlength="${maxLength}" 
               placeholder="Enter ${minLength}-${maxLength} digit PIN"
               autocomplete="off">
        <div class="custom-confirm-buttons">
          <button class="custom-confirm-btn custom-confirm-cancel">Cancel</button>
          <button class="custom-confirm-btn custom-confirm-ok">OK</button>
        </div>
      </div>
    `;

    // Add to container
    pinContainer.appendChild(backdrop);
    pinContainer.appendChild(pinDialog);

    // Get input element
    const pinInput = pinDialog.querySelector('.custom-pin-input');
    
    // Focus input
    requestAnimationFrame(() => {
      pinInput.focus();
    });

    // Only allow numeric input
    pinInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // Handle Enter key
    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const okBtn = pinDialog.querySelector('.custom-confirm-ok');
        okBtn.click();
      }
    });

    // Trigger animation
    requestAnimationFrame(() => {
      backdrop.classList.add('custom-confirm-show');
      pinDialog.classList.add('custom-confirm-show');
    });

    // Close function
    const closePinDialog = (result) => {
      backdrop.classList.remove('custom-confirm-show');
      pinDialog.classList.remove('custom-confirm-show');
      backdrop.classList.add('custom-confirm-hide');
      pinDialog.classList.add('custom-confirm-hide');
      
      setTimeout(() => {
        backdrop.remove();
        pinDialog.remove();
        resolve(result);
      }, 300); // Match CSS animation duration
    };

    // Button handlers
    const okBtn = pinDialog.querySelector('.custom-confirm-ok');
    const cancelBtn = pinDialog.querySelector('.custom-confirm-cancel');
    
    okBtn.addEventListener('click', () => {
      const pin = pinInput.value.trim();
      if (pin.length >= minLength && pin.length <= maxLength) {
        closePinDialog(pin);
      } else {
        // Show error feedback
        pinInput.style.borderColor = 'var(--danger, #ff1744)';
        setTimeout(() => {
          pinInput.style.borderColor = '';
          pinInput.focus();
        }, 1000);
      }
    });
    
    cancelBtn.addEventListener('click', () => closePinDialog(null));
    backdrop.addEventListener('click', () => closePinDialog(null));
  });
}

/**
 * Show a name input dialog
 * @param {string} message - The message to display
 * @param {string} placeholder - Placeholder text for input (default: 'Enter your name')
 * @param {number} maxLength - Maximum name length (default: 30)
 * @returns {Promise<string|null>} Resolves with name string or null if cancelled/skipped
 */
export function showNameInputDialog(message, placeholder = 'Enter your name', maxLength = 30) {
  return new Promise((resolve) => {
    // Create name container if it doesn't exist
    let nameContainer = document.getElementById('customNameContainer');
    if (!nameContainer) {
      nameContainer = document.createElement('div');
      nameContainer.id = 'customNameContainer';
      document.body.appendChild(nameContainer);
    }

    // Create backdrop overlay
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-confirm-backdrop';
    
    // Create name dialog
    const nameDialog = document.createElement('div');
    nameDialog.className = 'custom-confirm';
    
    nameDialog.innerHTML = `
      <div class="custom-confirm-content">
        <span class="custom-confirm-icon">👤</span>
        <span class="custom-confirm-message">${escapeHtml(message)}</span>
        <input type="text" 
               class="custom-name-input" 
               maxlength="${maxLength}" 
               placeholder="${escapeHtml(placeholder)}"
               autocomplete="name"
               autofocus>
        <div class="custom-confirm-buttons">
          <button class="custom-confirm-btn custom-confirm-cancel">Skip</button>
          <button class="custom-confirm-btn custom-confirm-ok">OK</button>
        </div>
      </div>
    `;

    // Add to container
    nameContainer.appendChild(backdrop);
    nameContainer.appendChild(nameDialog);

    // Get input element
    const nameInput = nameDialog.querySelector('.custom-name-input');
    
    // Focus input
    requestAnimationFrame(() => {
      nameInput.focus();
    });

    // Sanitize input (remove special characters that might cause issues)
    nameInput.addEventListener('input', (e) => {
      // Allow alphanumeric, spaces, and common name characters
      e.target.value = e.target.value.replace(/[<>\"'&]/g, '');
    });

    // Handle Enter key
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const okBtn = nameDialog.querySelector('.custom-confirm-ok');
        okBtn.click();
      }
    });

    // Trigger animation
    requestAnimationFrame(() => {
      backdrop.classList.add('custom-confirm-show');
      nameDialog.classList.add('custom-confirm-show');
    });

    // Close function
    const closeNameDialog = (result) => {
      backdrop.classList.remove('custom-confirm-show');
      nameDialog.classList.remove('custom-confirm-show');
      backdrop.classList.add('custom-confirm-hide');
      nameDialog.classList.add('custom-confirm-hide');
      
      setTimeout(() => {
        backdrop.remove();
        nameDialog.remove();
        resolve(result);
      }, 300); // Match CSS animation duration
    };

    // Button handlers
    const okBtn = nameDialog.querySelector('.custom-confirm-ok');
    const cancelBtn = nameDialog.querySelector('.custom-confirm-cancel');
    
    okBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      // Allow empty name (user can skip by clicking OK with empty input)
      // Or require at least 1 character - let's allow empty for "skip" functionality
      closeNameDialog(name || null);
    });
    
    cancelBtn.addEventListener('click', () => closeNameDialog(null));
    backdrop.addEventListener('click', () => closeNameDialog(null));
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

