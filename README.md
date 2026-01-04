# MURALY

**Free AR Mural Maker & Wall Visualization App**

[![Free](https://img.shields.io/badge/Price-Free-brightgreen)](https://muraly.codefrydev.in/)
[![No Installation](https://img.shields.io/badge/Installation-None-blue)](https://muraly.codefrydev.in/)
[![Browser](https://img.shields.io/badge/Platform-Web-orange)](https://muraly.codefrydev.in/)

Visualize murals and wall art in real spaces using augmented reality. Muraly is a completely free, non-profit web application that allows you to see your artwork projected onto real walls in real-time using your device's camera. Perfect for planning and previewing before painting.

## 🌟 Features

### AR Visualization
See your murals projected onto real walls in real-time using your device's camera. Perfect for planning and previewing before painting.

### Image & Sketch Mode
Upload any image and switch between full-color and sketch modes. Convert designs to outlines for easy tracing and reference.

### Intuitive Touch Controls
Move, scale, rotate, and adjust opacity with simple touch gestures. Lock positions when you're ready to start painting.

### Multi-Device Sharing
Share your AR session with multiple devices simultaneously! One host can broadcast to unlimited viewers on phones, tablets, and computers - all in real-time. Perfect for teams, clients, and remote collaboration.

### Save & Load Sessions
Save your mural configurations and load them later. Never lose your work and pick up exactly where you left off. Sessions are saved both locally and as downloadable JSON files.

### Video Recording
Record timelapse or full video of your mural creation process. Perfect for documenting your work and sharing progress.

### Session Discovery
Browse and join active AR sessions. Support for both public and private sessions with simple 3-character codes.

## 🚀 Getting Started

### No Installation Required
Muraly works directly in your browser - no downloads, no installations, no subscriptions.

1. **Visit the Application**
   - Go to [muraly.codefrydev.in](https://muraly.codefrydev.in/)
   - Click "Launch App" to start

2. **Grant Camera Permissions**
   - Allow camera access when prompted (required for AR visualization)

3. **Upload Your Design**
   - Click the upload button
   - Select an image file (JPG, PNG, etc.)
   - Your image will appear overlaid on the camera feed

4. **Position & Adjust**
   - Use touch gestures to move, scale, and rotate
   - Adjust opacity slider to see through to the wall
   - Toggle between image and sketch modes
   - Lock position when ready to start painting

## 📖 Usage Guide

### Basic Workflow

1. **Upload an Image**
   - Tap the upload button
   - Select your mural design from your device
   - The image will appear on your camera view

2. **Position Your Mural**
   - **Drag** to move the image
   - **Pinch** to zoom in/out
   - **Rotate** with two-finger rotation gesture
   - Use the **opacity slider** to adjust transparency

3. **Switch Modes**
   - Toggle between **Image Mode** (full color) and **Sketch Mode** (outline)
   - Sketch mode is perfect for tracing and reference

4. **Lock Position**
   - Once positioned, tap the lock button to prevent accidental moves
   - Unlock when you need to adjust again

5. **Share with Others**
   - Tap "Host" to start sharing your session
   - Share the 3-character code with others
   - They can join via the join page or by entering the code

### Advanced Features

#### Recording
- **Timelapse Recording**: Capture frames at custom intervals (default: 1 second)
- **Full Video Recording**: Record continuous video of your session
- Videos are automatically downloaded when recording stops

#### Session Management
- **Save Session**: Saves current image, position, scale, rotation, opacity, and mode
- **Load Session**: Restore a previously saved session from a JSON file
- Sessions are also saved to browser localStorage automatically

#### Multi-Device Sharing
- **Host a Session**: Start hosting to share your AR view with others
- **Join a Session**: Enter a 3-character code or browse available sessions
- **Public Sessions**: Visible to anyone browsing
- **Private Sessions**: Only accessible with the exact code

## 🏗️ Project Structure

```
Muraly/
├── index.html              # Landing page
├── muraly.html             # Main AR application
├── join.html               # Join session page
├── hoist.html             # Host session page
├── js/
│   ├── muraly.js          # Main application entry point
│   ├── index.js           # Landing page scripts
│   ├── join.js            # Join session logic
│   ├── hoist.js           # Host session logic
│   └── modules/
│       ├── state.js       # Application state management
│       ├── dom.js         # DOM element references
│       ├── canvas.js      # Canvas initialization
│       ├── camera.js      # Camera handling
│       ├── image.js       # Image upload and processing
│       ├── gestures.js    # Touch gesture handling
│       ├── navigation.js  # Navigation and routing
│       ├── ui-controls.js # UI control handlers
│       ├── renderer.js    # Rendering loop
│       ├── session.js     # Session save/load
│       ├── recording.js   # Video recording functionality
│       ├── viewer.js     # Viewer mode for joined sessions
│       ├── hosting/       # Multi-device sharing
│       │   ├── core.js    # Core hosting logic
│       │   ├── join.js    # Join session logic
│       │   ├── control.js # Host controls
│       │   ├── stream.js  # Stream management
│       │   └── participants.js # Participant management
│       └── ...
├── styles/
│   ├── base/              # Base styles (reset, typography, variables)
│   ├── components/        # Component styles
│   ├── layouts/          # Layout styles
│   └── utilities/        # Utility classes
└── assets/               # Static assets
```

## 🛠️ Technology Stack

### Core Technologies
- **HTML5** - Structure and semantic markup
- **CSS3** - Styling with custom properties and animations
- **JavaScript (ES6+)** - Modern JavaScript with modules
- **Canvas API** - Image rendering and overlay
- **WebRTC** - Real-time multi-device sharing
- **MediaRecorder API** - Video recording

### Libraries & Frameworks
- **Tailwind CSS** - Utility-first CSS framework
- **GSAP (GreenSock)** - Animation library
- **Lucide Icons** - Icon library

### Browser APIs Used
- **getUserMedia** - Camera access
- **Canvas API** - Image rendering
- **MediaRecorder API** - Video recording
- **WebRTC** - Peer-to-peer connections
- **localStorage** - Session persistence
- **File API** - Image upload and session file handling

## 🌐 Browser Requirements

### Minimum Requirements
- Modern browser with ES6 module support
- Camera access permissions
- JavaScript enabled
- HTML5 support

### Recommended Browsers
- **Chrome/Edge** (latest version) - Full feature support
- **Firefox** (latest version) - Full feature support
- **Safari** (iOS 11+ / macOS 10.13+) - Full feature support

### Feature Support
- **AR Visualization**: Requires camera access
- **Video Recording**: Requires MediaRecorder API support
- **Multi-Device Sharing**: Requires WebRTC support

## 📱 Device Support

- **Mobile Devices**: Full support on iOS and Android
- **Tablets**: Optimized for tablet interfaces
- **Desktop**: Works on Windows, macOS, and Linux
- **Touch Gestures**: Optimized for touch interfaces
- **Mouse/Keyboard**: Full desktop support

## 🎨 Key Capabilities

- Upload any image format (JPG, PNG, etc.)
- Adjust image opacity for better visibility
- Switch between image and sketch modes
- Pinch to zoom and rotate with gestures
- Drag to reposition your mural
- Toggle grid overlay for alignment
- Lock position to prevent accidental moves
- Share to unlimited devices with simple 3-character codes
- No installation - works instantly in any browser
- Completely free - no payments or subscriptions
- Record timelapse with custom intervals
- Export full video recordings
- Works on mobile and desktop

## 🤝 About

Muraly is a **non-profit initiative** supported by **Codefrydev** and **Agurutwa Foundation**.

### Our Mission
We believe expression is a human right. Muraly is completely free because creativity shouldn't have a price tag. However, education is a privilege many can't afford.

### Partnership with Agurutwa
We've partnered with **Agurutwa**, a social service organization dedicated to providing free education to underprivileged children. While you paint the virtual world, help us build the real one. Every donation goes directly to books, uniforms, and teachers for kids in need.

## 📄 License & Credits

- **Developed by**: Codefrydev
- **In partnership with**: Agurutwa Foundation
- **License**: Free for all use
- **Contact**: codefrydev@gmail.com

## 🔗 Links

- **Live Application**: [muraly.codefrydev.in](https://muraly.codefrydev.in/)
- **Privacy Policy**: [privacy-policy.html](privacy-policy.html)
- **Terms & Conditions**: [terms-and-conditions.html](terms-and-conditions.html)

## 📝 Notes

- All data is processed locally in your browser
- No server-side storage of images or sessions
- Camera access is required for AR features
- Sessions can be saved locally or exported as JSON files
- Multi-device sharing uses WebRTC peer-to-peer connections

---

**Built with ❤️ by Codefrydev and Agurutwa Foundation**

*Painting the world, one wall at a time.*

