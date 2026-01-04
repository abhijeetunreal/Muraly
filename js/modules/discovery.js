// ================= SESSION DISCOVERY =================
// Peer-to-peer session discovery using a fixed discovery peer

const DISCOVERY_PEER_ID = 'DISCOVERY';
export const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

let discoveryPeer = null;
let discoveryDataConnection = null;
let sessionRegistry = new Map(); // code -> {code, timestamp, name?, isPrivate?}
let isDiscoveryHost = false;
let discoveryCleanupInterval = null;

// Cleanup old sessions periodically
function cleanupOldSessions() {
  const now = Date.now();
  for (const [code, session] of sessionRegistry.entries()) {
    if (now - session.timestamp > SESSION_TIMEOUT) {
      sessionRegistry.delete(code);
      console.log(`Removed stale session: ${code}`);
    }
  }
}

// Start as discovery host (maintains the registry)
export function startDiscoveryHost() {
  if (discoveryPeer) {
    return; // Already started
  }

  console.log('Attempting to start as discovery host...');

  discoveryPeer = new Peer(DISCOVERY_PEER_ID, {
    debug: 0, // Reduce debug noise
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  });

  discoveryPeer.on('open', (id) => {
    console.log('Discovery host ready:', id);
    isDiscoveryHost = true; // Only set to true after successful open
    
    // Start cleanup interval
    discoveryCleanupInterval = setInterval(cleanupOldSessions, 30000); // Every 30 seconds
  });

  discoveryPeer.on('connection', (dataConnection) => {
    console.log('Discovery connection received from:', dataConnection.peer);
    
    dataConnection.on('open', () => {
      console.log('Discovery data channel open');
    });

    dataConnection.on('data', (data) => {
      try {
        const message = JSON.parse(data);
        handleDiscoveryMessage(message, dataConnection);
      } catch (err) {
        console.error('Error parsing discovery message:', err);
      }
    });

    dataConnection.on('close', () => {
      console.log('Discovery connection closed');
    });

    dataConnection.on('error', (err) => {
      console.error('Discovery connection error:', err);
    });
  });

  discoveryPeer.on('error', (err) => {
    // If ID is taken, we're not the host - that's expected, not an error
    if (err.type === 'peer-unavailable' || err.message?.includes('ID is taken') || err.type === 'unavailable-id' || err.type === 'socket-error') {
      // Silently handle - this is expected when discovery peer already exists
      isDiscoveryHost = false;
      // Don't stop the peer yet - let it clean up naturally
      // The error handler will prevent it from being used as host
    } else {
      // Only log actual unexpected errors
      console.warn('Discovery peer error (non-critical):', err.type || err.message);
    }
  });
}

// Stop discovery host
export function stopDiscoveryHost() {
  if (discoveryCleanupInterval) {
    clearInterval(discoveryCleanupInterval);
    discoveryCleanupInterval = null;
  }

  if (discoveryDataConnection) {
    discoveryDataConnection.close();
    discoveryDataConnection = null;
  }

  if (discoveryPeer) {
    discoveryPeer.destroy();
    discoveryPeer = null;
  }

  isDiscoveryHost = false;
  sessionRegistry.clear();
}

// Handle messages from clients
function handleDiscoveryMessage(message, dataConnection) {
  switch (message.type) {
    case 'register':
      // Register a new session
      // Explicitly convert to boolean to preserve true values
      // Handle undefined/null/false explicitly
      const isPrivateValue = message.isPrivate === true ? true : false;
      const sessionData = {
        code: message.code,
        timestamp: message.timestamp || Date.now(),
        name: message.name || null,
        isPrivate: isPrivateValue
      };
      console.log('[DISCOVERY] Received registration request:', {
        code: message.code,
        name: message.name,
        isPrivate: message.isPrivate,
        isPrivateConverted: isPrivateValue,
        type: typeof message.isPrivate
      });
      sessionRegistry.set(message.code, sessionData);
      console.log('[DISCOVERY] Registered session:', message.code, sessionData.isPrivate ? '(private)' : '(public)');
      console.log('[DISCOVERY] Session registry entry:', sessionRegistry.get(message.code));
      
      // Send confirmation
      dataConnection.send(JSON.stringify({
        type: 'register_ack',
        code: message.code,
        success: true
      }));
      break;

    case 'unregister':
      // Unregister a session
      sessionRegistry.delete(message.code);
      console.log('Unregistered session:', message.code);
      break;

    case 'list':
      // Send list of active sessions
      const sessions = Array.from(sessionRegistry.values())
        .filter(session => Date.now() - session.timestamp < SESSION_TIMEOUT)
        .map(session => ({
          code: session.code,
          timestamp: session.timestamp,
          name: session.name || null,
          isPrivate: session.isPrivate === true ? true : false // Explicit ternary
        }));
      
      console.log('[DISCOVERY] Building session list response:', sessions.length, 'sessions');
      sessions.forEach((session, index) => {
        console.log(`[DISCOVERY] Session ${index + 1}:`, {
          code: session.code,
          name: session.name,
          isPrivate: session.isPrivate,
          type: typeof session.isPrivate
        });
      });
      
      dataConnection.send(JSON.stringify({
        type: 'list_response',
        sessions: sessions
      }));
      console.log('[DISCOVERY] Sent session list:', sessions.length, 'sessions');
      break;

    default:
      console.warn('Unknown discovery message type:', message.type);
  }
}

// Connect to discovery peer as client
export function connectToDiscovery(onSessionsReceived) {
  return new Promise((resolve, reject) => {
    // First, try to start as host (in case no one else is)
    startDiscoveryHost();
    
    // Wait a bit to see if we become the host (give it time to initialize or error)
    setTimeout(() => {
      if (isDiscoveryHost) {
        // We're the host, return our registry
        console.log('[DISCOVERY] We are the discovery host, returning local registry');
        console.log('[DISCOVERY] Registry size:', sessionRegistry.size);
        const sessions = Array.from(sessionRegistry.values())
          .filter(session => Date.now() - session.timestamp < SESSION_TIMEOUT)
          .map(session => ({
            code: session.code,
            timestamp: session.timestamp,
            name: session.name || null,
            isPrivate: session.isPrivate === true ? true : false // Explicit ternary
          }));
        
        console.log('[DISCOVERY] Returning sessions from local registry:', sessions);
        sessions.forEach((session, index) => {
          console.log(`[DISCOVERY] Local session ${index + 1}:`, {
            code: session.code,
            name: session.name,
            isPrivate: session.isPrivate,
            type: typeof session.isPrivate
          });
        });
        
        if (onSessionsReceived) {
          onSessionsReceived(sessions);
        }
        resolve(sessions);
        return;
      }

      // Connect as client
      const clientPeer = new Peer({
        debug: 0, // Reduce debug noise
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      clientPeer.on('open', () => {
        console.log('Connecting to discovery peer as client...');
        
        try {
          const dataConnection = clientPeer.connect(DISCOVERY_PEER_ID, {
            reliable: true
          });

          dataConnection.on('open', () => {
            console.log('Connected to discovery peer');
            discoveryDataConnection = dataConnection;

            // Request session list
            dataConnection.send(JSON.stringify({ type: 'list' }));

            // Listen for responses
            dataConnection.on('data', (data) => {
              try {
                const message = JSON.parse(data);
                if (message.type === 'list_response') {
                  console.log('Received session list:', message.sessions);
                  if (onSessionsReceived) {
                    onSessionsReceived(message.sessions);
                  }
                  resolve(message.sessions);
                  
                  // Close connection after receiving list
                  setTimeout(() => {
                    dataConnection.close();
                    clientPeer.destroy();
                  }, 1000);
                }
              } catch (err) {
                console.error('Error parsing discovery response:', err);
              }
            });
          });

          dataConnection.on('error', (err) => {
            console.error('Discovery data connection error:', err);
            reject(err);
          });

          dataConnection.on('close', () => {
            console.log('Discovery data connection closed');
          });

        } catch (err) {
          console.error('Error connecting to discovery peer:', err);
          reject(err);
        }
      });

      clientPeer.on('error', (err) => {
        console.error('Client peer error:', err);
        // If discovery peer doesn't exist, we become the host
        if (err.type === 'peer-unavailable' || err.message?.includes('Could not connect')) {
          console.log('Discovery peer not found, starting as host...');
          stopDiscoveryHost();
          startDiscoveryHost();
          
          // Return empty list since we're the first
          const sessions = [];
          if (onSessionsReceived) {
            onSessionsReceived(sessions);
          }
          resolve(sessions);
        } else {
          reject(err);
        }
      });
    }, 500);
  });
}

// Register a session with discovery service
export function registerSession(code, name, isPrivate = false) {
  console.log('[DISCOVERY] registerSession called with:', {
    code: code,
    name: name,
    isPrivate: isPrivate,
    isDiscoveryHost: isDiscoveryHost
  });
  
  if (isDiscoveryHost) {
    // We're the host, add directly
    // Explicitly convert to boolean to preserve true values
    const isPrivateValue = isPrivate === true ? true : false;
    const sessionData = {
      code: code,
      timestamp: Date.now(),
      name: name || null,
      isPrivate: isPrivateValue
    };
    sessionRegistry.set(code, sessionData);
    console.log('[DISCOVERY] Registered session locally:', code, isPrivateValue ? '(private)' : '(public)');
    console.log('[DISCOVERY] Local registry entry:', sessionRegistry.get(code));
    return Promise.resolve();
  }

  // Connect and register
  return new Promise((resolve, reject) => {
    const clientPeer = new Peer({
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    clientPeer.on('open', () => {
      try {
        const dataConnection = clientPeer.connect(DISCOVERY_PEER_ID, {
          reliable: true
        });

        dataConnection.on('open', () => {
          // Send registration
          const registrationMessage = {
            type: 'register',
            code: code,
            timestamp: Date.now(),
            name: name,
            isPrivate: isPrivate
          };
          console.log('[DISCOVERY] Sending registration message to discovery peer:', registrationMessage);
          dataConnection.send(JSON.stringify(registrationMessage));

          // Wait for acknowledgment
          dataConnection.on('data', (data) => {
            try {
              const message = JSON.parse(data);
              if (message.type === 'register_ack' && message.code === code) {
                console.log('Session registered:', code);
                resolve();
                
                // Keep connection open for unregister later
                // Store it for cleanup
                setTimeout(() => {
                  // Close after a short delay
                  dataConnection.close();
                  clientPeer.destroy();
                }, 100);
              }
            } catch (err) {
              console.error('Error parsing registration ack:', err);
            }
          });
        });

        dataConnection.on('error', (err) => {
          console.error('Registration connection error:', err);
          // If discovery peer doesn't exist, start as host and register
          if (err.type === 'peer-unavailable' || err.message?.includes('Could not connect')) {
            startDiscoveryHost();
            registerSession(code, name, isPrivate).then(resolve).catch(reject);
          } else {
            reject(err);
          }
        });

      } catch (err) {
        console.error('Error creating registration connection:', err);
        reject(err);
      }
    });

    clientPeer.on('error', (err) => {
      console.error('Registration peer error:', err);
      // If discovery peer doesn't exist, start as host
      if (err.type === 'peer-unavailable' || err.message?.includes('Could not connect')) {
        startDiscoveryHost();
        registerSession(code, name, isPrivate).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

// Unregister a session
export function unregisterSession(code) {
  if (isDiscoveryHost) {
    // We're the host, remove directly
    sessionRegistry.delete(code);
    console.log('Unregistered session locally:', code);
    return;
  }

  // Try to connect and unregister (best effort, don't block)
  const clientPeer = new Peer({
    debug: 0,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  });

  clientPeer.on('open', () => {
    try {
      const dataConnection = clientPeer.connect(DISCOVERY_PEER_ID, {
        reliable: true
      });

      dataConnection.on('open', () => {
        dataConnection.send(JSON.stringify({
          type: 'unregister',
          code: code
        }));
        
        setTimeout(() => {
          dataConnection.close();
          clientPeer.destroy();
        }, 500);
      });
    } catch (err) {
      // Silently fail
      clientPeer.destroy();
    }
  });

  clientPeer.on('error', () => {
    // Silently fail
    clientPeer.destroy();
  });
}

