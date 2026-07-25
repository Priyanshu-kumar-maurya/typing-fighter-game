# 🥊 TYPING FIGHTER - Real-Time 1v1 Type Clash Arena

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Build](https://img.shields.io/badge/Status-Production--Ready-brightgreen.svg)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Voice%20%26%20Data-orange.svg)
![PWA](https://img.shields.io/badge/PWA-Enabled-purple.svg)

A high-octane 1v1 Fighting Game designed for laptops, desktops, and mobile devices where typing speed and accuracy directly control combat attacks, combos, and super moves in real time!

---

## 🌟 Key Features

- 🏆 **25-Stage vs AI Campaign Arc**: Progress from 15 WPM up to 120 WPM across 25 scaling Boss Stages.
- 🎯 **Target WPM Requirement Rule**: Pass levels only when meeting the stage WPM target requirement.
- 🌐 **Online P2P WebRTC Multiplayer**: Fight friends over the internet using a 5-digit Room Code.
- 🎙️ **Live P2P Voice Chat**: Real-time microphone audio streaming between online players.
- 📝 **Custom Script & Study Notes Mode**: Practice typing your custom study notes or speeches while fighting!
- ⌨️ **Keystroke Micro-Attacks & Space Indicator**: Every correct letter triggers an instant hit strike; `[ ␣ SPACE ]` pill badge clearly shows spacebar prompts.
- 📱 **Mobile Touch Virtual Keyboard**: Fully responsive canvas layout with native touch keyboard support.
- 🔐 **Guest & Mobile Registration**: Persistent user profiles and level progress saved via `localStorage`.
- 🛡️ **Anti-Cheat & Security**: Hardware event validation (`isTrusted`), rate limiting, paste prevention, and payload damage caps.

---

## 🛠️ Tech Stack

| Component | Technology Used |
| :--- | :--- |
| **Frontend UI** | HTML5, Cyberpunk CSS3 Design System, Google Fonts |
| **Graphics Engine** | HTML5 Canvas 2D API (60 FPS Sprite Rendering, Hit Sparks, Screen Shake) |
| **Audio Synthesizer** | Web Audio API (Zero external MP3 assets) |
| **Multiplayer & Voice** | WebRTC DataChannel & MediaStream via PeerJS |
| **PWA & Offline** | Web App Manifest, Service Worker (`sw.js`) |

---

## 📂 Project Architecture

```
typing-fighter-game/
├── index.html          # Main HTML structure, HUD, overlays, and modals
├── style.css           # Cyberpunk design system, CSS animations, responsive queries
├── manifest.json       # PWA Manifest configuration
├── sw.js               # Service Worker for offline caching
├── package.json        # NPM package metadata
├── LICENSE             # MIT License
├── README.md           # Documentation
└── js/
    ├── config.js       # Dictionaries, 25 Campaign Stages, game settings
    ├── auth.js         # Player login, Guest registration, storage persistence
    ├── audio.js        # Web Audio API retro synthesizer
    ├── renderer.js     # Canvas 2D 60FPS fighting animation engine
    ├── p2p.js          # WebRTC P2P networking & voice chat stream manager
    ├── combat.js       # WPM physics, damage calculations, level qualification
    └── main.js         # Event orchestration, keyboard listeners, toasts, game loop
```

---

## 🚀 Quick Start / Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Priyanshu-kumar-maurya/typing-fighter-game.git
   cd typing-fighter-game
   ```

2. **Run locally**:
   - Simply double click `index.html` in any browser (Chrome, Edge, Firefox, Brave, Safari).
   - Or serve with Node:
     ```bash
     npm start
     ```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
