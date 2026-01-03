// ================= STATE MANAGEMENT =================
// Global application state

export const state = {
  // App mode
  appMode: "host",
  renderActive: true,
  
  // Image state
  img: new Image(),
  sketchImg: null,
  mode: "image",
  
  // Transform state
  pos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  scale: 1,
  rot: 0,
  opacityVal: 0.6,
  
  // UI state
  locked: false,
  showGrid: false,
  
  // Viewer state
  viewerZoom: 1,
  viewerPanX: 0,
  viewerPanY: 0,
  
  // Recording state
  mediaRecorder: null,
  recordedChunks: [],
  isRecording: false,
  recordingStream: null,
  recordingCompositeCanvas: null,
  recordingCompositeCtx: null,
  recordingInterval: null,
  recordingMode: "timelapse",
  recordingIntervalSeconds: 1,
  timelapseFrames: [],
  timelapseCaptureInterval: null,
  
  // Hosting state
  peer: null,
  call: null, // Keep for backward compatibility, but use activeConnections instead
  activeConnections: [], // Array of active PeerJS call objects
  participants: [], // Array of participant metadata: { peerId, friendlyName, connectedAt, call, dataConnection }
  participantCounter: 0, // Counter for auto-generating participant names
  hostStream: null,
  isHosting: false,
  canvasStream: null,
  canvasStreamInterval: null,
  resizeHandler: null,
  currentShareCode: null,
  sessionPin: null,
  isPrivateSession: false,
  
  // Gesture state
  g: null,
  mouseG: null,
  isMouseDown: false,
  viewerG: null,
  viewerMouseDown: false,
  viewerMouseStart: { x: 0, y: 0 },
  
  // UI toggle state
  lastTap: 0,
  lastTapPos: { x: 0, y: 0 },
  isDoubleTap: false,
  uiHiddenTime: 0,
  preventGestureUntil: 0
};

