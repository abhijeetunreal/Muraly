// ================= JOIN ENTRY POINT =================
// Muraly - AR Mural Maker & Wall Visualization App
// Join-specific entry point for joining AR sessions

import { state } from './modules/state.js';
import { dom } from './modules/dom.js';
import { registerServiceWorker } from './modules/utils.js';
import { join } from './modules/hosting.js';
import { connectToDiscovery } from './modules/discovery.js';
import { showAlert } from './modules/alert.js';

// Display sessions in the list
function displaySessions(sessions) {
  if (!sessions || sessions.length === 0) {
    dom.sessionsList.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.7); padding: 32px; font-size: 14px; line-height: 1.6;">No active sessions available</div>';
    return;
  }
  
  // Sort by timestamp (newest first)
  sessions.sort((a, b) => b.timestamp - a.timestamp);
  
  // Clear and populate list
  dom.sessionsList.innerHTML = '';
  
  sessions.forEach(session => {
    const sessionItem = document.createElement('div');
    sessionItem.className = 'session-item';
    
    const sessionCode = document.createElement('div');
    sessionCode.className = 'session-code';
    
    // Wrap session code text in a span for better layout control
    const codeText = document.createElement('span');
    codeText.textContent = session.code;
    codeText.style.wordBreak = 'break-all';
    sessionCode.appendChild(codeText);
    
    // Add badge for both public and private sessions
    const badge = document.createElement('span');
    if (session.isPrivate) {
      badge.className = 'session-private-badge';
      badge.textContent = '🔒 Private';
    } else {
      badge.className = 'session-public-badge';
      badge.textContent = '🌐 Public';
    }
    sessionCode.appendChild(badge);
    
    const sessionInfo = document.createElement('div');
    sessionInfo.className = 'session-info';
    const timeAgo = Math.floor((Date.now() - session.timestamp) / 1000 / 60);
    const nameText = session.name ? `${session.name} • ` : '';
    sessionInfo.textContent = `${nameText}${timeAgo < 1 ? 'Just now' : `${timeAgo} min ago`}`;
    
    const joinBtn = document.createElement('button');
    joinBtn.className = 'session-join-btn';
    joinBtn.textContent = 'Join';
    joinBtn.onclick = () => doJoin(session.code, session.isPrivate === true ? true : false);
    
    sessionItem.appendChild(sessionCode);
    sessionItem.appendChild(sessionInfo);
    sessionItem.appendChild(joinBtn);
    
    dom.sessionsList.appendChild(sessionItem);
  });
}

// Browse available sessions
function browseSessions() {
  // Ensure sessions list is visible
  dom.sessionsListContainer.classList.remove("hidden");
  // Show loading state
  dom.sessionsList.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.7); padding: 24px; font-size: 14px;">Loading sessions...</div>';
  
  // Connect to discovery and get sessions
  connectToDiscovery((sessions) => {
    displaySessions(sessions);
  }).catch(err => {
    console.error("Error browsing sessions:", err);
    dom.sessionsList.innerHTML = '<div style="text-align: center; color: rgba(255, 107, 53, 0.9); padding: 24px; font-size: 14px;">Error loading sessions. Please try again.</div>';
  });
}

// Refresh sessions list
function refreshSessions() {
  browseSessions();
}

// Close sessions list
function closeSessionsList() {
  dom.sessionsListContainer.classList.add("hidden");
}

// Join a session
async function doJoin(sessionCode, isPrivate = null) {
  // Handle case where event object is passed instead of session code
  if (sessionCode && typeof sessionCode !== 'string') {
    sessionCode = null;
  }
  
  const idOrLink = sessionCode || (dom.joinKeyInput && dom.joinKeyInput.value ? dom.joinKeyInput.value.trim() : '');
  if (!idOrLink) {
    if (dom.joinKeyInput) {
      dom.joinKeyInput.focus();
    }
    return;
  }
  
  // Extract session ID from link if it's a full URL
  let sessionId = idOrLink.trim();
  if (sessionId.includes('?join=')) {
    sessionId = sessionId.split('?join=')[1].split('&')[0];
  } else if (sessionId.includes('join=')) {
    sessionId = sessionId.split('join=')[1].split('&')[0];
  }
  
  // If isPrivate is not explicitly set, try to check discovery service
  if (isPrivate === null && sessionId) {
    try {
      const sessions = await connectToDiscovery();
      const foundSession = sessions.find(s => s.code === sessionId);
      if (foundSession) {
        isPrivate = foundSession.isPrivate === true ? true : false;
      }
    } catch (err) {
      // If discovery fails, continue with null (treat as public for better UX)
      console.log("Could not check discovery service, treating as public session");
      isPrivate = false;
    }
  }
  
  // Hide join screen, show viewer
  dom.joinScreen.classList.add("hidden");
  dom.sessionsListContainer.classList.add("hidden");
  
  // Join the session
  join(idOrLink, isPrivate);
}

// Check URL parameters for auto-join
function checkAutoJoin() {
  const urlParams = new URLSearchParams(window.location.search);
  const joinId = urlParams.get("join");
  
  if (joinId) {
    // Automatically join if join parameter is in URL
    doJoin(joinId);
  } else {
    // Show sessions list by default
    browseSessions();
  }
}

// Initialize the join application
function init() {
  // Set up join button handlers
  if (dom.joinKeyBtn) {
    dom.joinKeyBtn.onclick = () => doJoin();
  }
  
  if (dom.joinKeyInput) {
    dom.joinKeyInput.addEventListener("keydown", e => { 
      if (e.key === "Enter") doJoin(); 
    });
  }
  
  if (dom.browseSessionsBtn) {
    dom.browseSessionsBtn.onclick = browseSessions;
  }
  
  if (dom.refreshSessionsBtn) {
    dom.refreshSessionsBtn.onclick = refreshSessions;
  }
  
  if (dom.closeSessionsListBtn) {
    dom.closeSessionsListBtn.onclick = closeSessionsList;
  }
  
  // Register service worker for PWA
  registerServiceWorker();
  
  // Check for auto-join from URL parameter
  checkAutoJoin();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

