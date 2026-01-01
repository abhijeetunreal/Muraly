// ================= DOM ELEMENT REFERENCES =================
// Centralized DOM element access

export const dom = {
  // Screens
  firstScreen: document.getElementById("firstScreen"),
  joinScreen: document.getElementById("joinScreen"),
  
  // Buttons
  hostSelectBtn: document.getElementById("hostSelectBtn"),
  joinSelectBtn: document.getElementById("joinSelectBtn"),
  joinKeyBtn: document.getElementById("joinKeyBtn"),
  browseSessionsBtn: document.getElementById("browseSessionsBtn"),
  refreshSessionsBtn: document.getElementById("refreshSessionsBtn"),
  closeSessionsListBtn: document.getElementById("closeSessionsListBtn"),
  backToFirstBtn: document.getElementById("backToFirstBtn"),
  hostBtn: document.getElementById("hostBtn"),
  sketchBtn: document.getElementById("sketchBtn"),
  imageBtn: document.getElementById("imageBtn"),
  lockBtn: document.getElementById("lockBtn"),
  gridBtn: document.getElementById("gridBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  saveSessionBtn: document.getElementById("saveSessionBtn"),
  loadSessionBtn: document.getElementById("loadSessionBtn"),
  recordTimelapseBtn: document.getElementById("recordTimelapseBtn"),
  copyBtn: document.getElementById("copyBtn"),
  interval1sBtn: document.getElementById("interval1sBtn"),
  
  // Inputs
  joinKeyInput: document.getElementById("joinKeyInput"),
  upload: document.getElementById("upload"),
  opacity: document.getElementById("opacity"),
  shareLinkInput: document.getElementById("shareLinkInput"),
  recordMode: document.getElementById("recordMode"),
  customInterval: document.getElementById("customInterval"),
  
  // Media elements
  camera: document.getElementById("camera"),
  overlayCanvas: document.getElementById("overlayCanvas"),
  gridCanvas: document.getElementById("gridCanvas"),
  remoteVideo: document.getElementById("remoteVideo"),
  remoteVideoContainer: document.getElementById("remoteVideoContainer"),
  
  // Containers
  panel: document.getElementById("panel"),
  topBar: document.getElementById("topBar"),
  shareLinkContainer: document.getElementById("shareLinkContainer"),
  shareId: document.getElementById("shareId"),
  timelapseOptions: document.getElementById("timelapseOptions"),
  sessionsListContainer: document.getElementById("sessionsListContainer"),
  sessionsList: document.getElementById("sessionsList"),
  
  // Canvas contexts (initialized after DOM is ready)
  ctx: null,
  gtx: null
};

// Initialize canvas contexts
if (dom.overlayCanvas && dom.gridCanvas) {
  dom.ctx = dom.overlayCanvas.getContext("2d");
  dom.gtx = dom.gridCanvas.getContext("2d");
}

