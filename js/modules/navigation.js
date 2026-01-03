// ================= NAVIGATION =================
import { state } from './state.js';
import { dom } from './dom.js';
import { startCamera } from './camera.js';
import { tryLoadFromLocalStorage } from './session.js';
import { join } from './hosting.js';
import { connectToDiscovery, startDiscoveryHost } from './discovery.js';

export function showHostScreen() {
  dom.firstScreen.classList.add("hidden");
  dom.joinScreen.classList.add("hidden");
  dom.backToFirstBtn.classList.add("hidden");
  dom.camera.classList.remove("hidden");
  dom.overlayCanvas.classList.remove("hidden");
  dom.gridCanvas.classList.remove("hidden");
  dom.panel.classList.remove("hidden");
  dom.topBar.classList.remove("hidden");
  startCamera();
  // Try to load saved session from localStorage only when entering host mode
  tryLoadFromLocalStorage();
  // Don't auto-start hosting, let user click Host button
}

export function showJoinScreen() {
  dom.firstScreen.classList.add("hidden");
  dom.joinScreen.classList.remove("hidden");
  dom.backToFirstBtn.classList.remove("hidden");
  dom.sessionsListContainer.classList.add("hidden");
  dom.joinKeyInput.value = "";
  dom.joinKeyInput.focus();
}

export async function doJoin(sessionCode, isPrivate = null) {
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
        isPrivate = foundSession.isPrivate === true ? true : null;
      }
    } catch (err) {
      // If discovery fails, continue with null (unknown privacy status)
      console.log("Could not check discovery service, proceeding with unknown privacy status");
    }
  }
  
  dom.joinScreen.classList.add("hidden");
  dom.sessionsListContainer.classList.add("hidden");
  dom.backToFirstBtn.classList.add("hidden");
  // Show host UI while waiting for stream
  dom.camera.classList.remove("hidden");
  dom.overlayCanvas.classList.remove("hidden");
  dom.gridCanvas.classList.remove("hidden");
  dom.panel.classList.remove("hidden");
  dom.topBar.classList.remove("hidden");
  join(idOrLink, isPrivate);
}

export function browseSessions() {
  // Show loading state
  dom.sessionsListContainer.classList.remove("hidden");
  dom.sessionsList.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.6); padding: 20px;">Loading sessions...</div>';
  
  // Connect to discovery and get sessions (this will try to start as host if needed)
  connectToDiscovery((sessions) => {
    displaySessions(sessions);
  }).catch(err => {
    console.error("Error browsing sessions:", err);
    dom.sessionsList.innerHTML = '<div style="text-align: center; color: rgba(255, 107, 53, 0.8); padding: 20px;">Error loading sessions. Please try again.</div>';
  });
}

function displaySessions(sessions) {
  if (!sessions || sessions.length === 0) {
    dom.sessionsList.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.6); padding: 20px;">No active sessions available</div>';
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
    sessionCode.textContent = session.code;
    
    // Add private indicator if session is private
    if (session.isPrivate) {
      const privateBadge = document.createElement('span');
      privateBadge.className = 'session-private-badge';
      privateBadge.textContent = '🔒 Private';
      privateBadge.style.marginLeft = '8px';
      privateBadge.style.fontSize = '0.85em';
      privateBadge.style.opacity = '0.8';
      sessionCode.appendChild(privateBadge);
    }
    
    const sessionInfo = document.createElement('div');
    sessionInfo.className = 'session-info';
    const timeAgo = Math.floor((Date.now() - session.timestamp) / 1000 / 60);
    sessionInfo.textContent = timeAgo < 1 ? 'Just now' : `${timeAgo} min ago`;
    
    const joinBtn = document.createElement('button');
    joinBtn.className = 'session-join-btn';
    joinBtn.textContent = 'Join';
    joinBtn.onclick = () => doJoin(session.code, session.isPrivate === true ? true : null);
    
    sessionItem.appendChild(sessionCode);
    sessionItem.appendChild(sessionInfo);
    sessionItem.appendChild(joinBtn);
    
    dom.sessionsList.appendChild(sessionItem);
  });
}

export function refreshSessions() {
  browseSessions();
}

export function closeSessionsList() {
  dom.sessionsListContainer.classList.add("hidden");
}

export function initNavigation() {
  // Hide all main UI at start
  dom.camera.classList.add("hidden");
  dom.overlayCanvas.classList.add("hidden");
  dom.gridCanvas.classList.add("hidden");
  dom.panel.classList.add("hidden");
  dom.topBar.classList.add("hidden");
  dom.backToFirstBtn.classList.add("hidden");
  
  // Event listeners
  dom.hostSelectBtn.onclick = showHostScreen;
  dom.joinSelectBtn.onclick = showJoinScreen;
  dom.joinKeyBtn.onclick = () => doJoin();
  dom.joinKeyInput.addEventListener("keydown", e => { 
    if (e.key === "Enter") doJoin(); 
  });
  if (dom.browseSessionsBtn) {
    dom.browseSessionsBtn.onclick = browseSessions;
  }
  if (dom.refreshSessionsBtn) {
    dom.refreshSessionsBtn.onclick = refreshSessions;
  }
  if (dom.closeSessionsListBtn) {
    dom.closeSessionsListBtn.onclick = closeSessionsList;
  }
  dom.backToFirstBtn.onclick = () => {
    dom.joinScreen.classList.add("hidden");
    dom.sessionsListContainer.classList.add("hidden");
    dom.backToFirstBtn.classList.add("hidden");
    dom.firstScreen.classList.remove("hidden");
  };
  
  // Check URL parameters for auto-join
  window.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinId = urlParams.get("join");
    
    if (joinId) {
      // Automatically join if join parameter is in URL
      dom.firstScreen.classList.add("hidden");
      dom.joinScreen.classList.add("hidden");
      dom.camera.classList.remove("hidden");
      dom.overlayCanvas.classList.remove("hidden");
      dom.gridCanvas.classList.remove("hidden");
      dom.panel.classList.remove("hidden");
      dom.topBar.classList.remove("hidden");
      join(joinId);
    }
    // Don't auto-load from localStorage on page load - only when user enters host mode
  });
}

