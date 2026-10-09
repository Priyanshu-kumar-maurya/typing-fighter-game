# 🥊 TYPING FIGHTER — Real-Time 1v1 Type Clash Arena (v42)

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-typing--fighter--game.vercel.app-00f0ff?style=for-the-badge)](https://typing-fighter-game.vercel.app)

![Version](https://img.shields.io/badge/Version-v42-brightgreen.svg)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![PWA](https://img.shields.io/badge/PWA-%3C%200.5%20MB%20%E2%80%A2%20100%25%20Offline-purple.svg)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Voice%20%26%20Data-orange.svg)
![MQTT](https://img.shields.io/badge/Chat-Real--Time%20MQTT%20Lobby-ff0055.svg)
![Mobile](https://img.shields.io/badge/Mobile-Android%20%26%20iOS%20Ready-00ff88.svg)

> **Type faster → Hit harder.** A high-octane 1v1 fighting game where typing speed and accuracy directly power combat moves, combos, super abilities, and critical hits in real time. Features **25 AI Campaign Bosses**, **Stickman Martial Arts Combat**, **P2P Live Voice Chat**, and a **Real-Time Global Community Chat & 1-Click 1v1 Challenge System**.

---

## 🌐 Live Demo & Instant Play

👉 **[https://typing-fighter-game.vercel.app](https://typing-fighter-game.vercel.app)**

> ⚡ **Zero Installation Required:** Works instantly in all modern mobile and desktop browsers (Chrome, Safari, Edge, Firefox, Brave). Ultra-fast load times (< 0.5 MB download) with full offline support as an installable Progressive Web App (PWA).

---

## 🎮 Core Game Modes

| Mode | Visual Theme | Description |
| :--- | :--- | :--- |
| 🏆 **vs AI Campaign (25 Stages)** | Cyber / Multi-Arena | Defeat 25 AI bosses scaling smoothly from **15 WPM** (Rookie Bot) to **120 WPM** (Ultimate Typing God). Earn coins and unlock new stages! |
| ⚡ **Stickman 1v1 Clash** | Martial Arts Dojo | Fast-paced ragdoll combat with high knockbacks, aerial combos, dynamic jump attacks, and martial arts physics! |
| 🌐 **Online P2P Multiplayer** | Real-Time Clash | Zero-server WebRTC peer-to-peer matchmaking. Play against friends with live audio voice chat and zero latency across countries! |
| ⌨️ **Local 2-Player (Split Screen)** | Arcade Versus | Two fighters battling on a single keyboard — split typing strings to punch and kick! |

---

## 🌟 What's New in v42

### 💬 Real-Time Public Community Lobby Chat
- **Decentralized Global Lobby:** Connects all online players worldwide over secure MQTT WebSockets (`wss://`).
- **< 100ms Delivery:** Send messages, chat, and react instantly without heavy backend servers.
- **One-Tap Quick Emojis:** Quick reaction bar (`🔥`, `⚔️`, `💥`, `👑`, `😂`, `⚡`, `🚀`, `🥊`).
- **Live Online Fighters Counter:** Real-time presence indicator showing active fighters online.
- **Audio Chimes & Unread Badges:** Pleasant synthesizer notification sound on incoming messages and challenges.

### ⚔️ 1-Click 1v1 Challenge Engine
- **Instant Lobby Challenges:** Tap **`⚔️ POST 1v1 CHALLENGE`** in the chat to auto-generate a room code, register as host, and post a glowing 1v1 Challenge Card to the public chat.
- **1-Click Accept & Fight:** Any player in the chat can tap **`[⚡ ACCEPT & FIGHT NOW]`** to instantly connect as guest and jump straight into the arena — **zero manual room code typing or copy-pasting required!**
- **Automatic Code Detection:** Sharing room codes like `#GAME99` automatically renders a 1-tap join button for chat users.

### 🎨 Clean & Simplified UI Layout
- **Uncluttered Header:** Streamlined navbar with Player Coins (`🪙`), Community Chat (`💬`), Sound Toggle (`🔊`), and Home (`🏠`).
- **Dual Hero Actions:** Direct access with **`⚔️ PLAY NOW`** and **`💬 COMMUNITY CHAT`**.
- **Intuitive Modes Grid:** Clean, prominent 3-mode selection with zero confusing nested menus.
- **Mobile Friendly:** Fully responsive viewport compensation (`dvh`) and touch-safe controls.

---

## ⚡ Battle Skills & Super Abilities

Trigger active super abilities during combat using keyboard shortcuts or on-screen skill dock:

| Key | Skill | Effect | Cooldown |
| :---: | :--- | :--- | :---: |
| **`[1]`** | ⏱️ **Time Freeze** | Freezes AI / opponent timer for 3.5 seconds | 18s |
| **`[2]`** | 🛡️ **Cyber Shield** | Deploys a force shield absorbing the next 2 incoming attacks | 14s |
| **`[3]`** | 🔥 **2x Fury Damage** | Doubles all typing attack damage for 5 seconds | 22s |
| **`[4]`** | 💊 **Health Medkit** | Instantly restores +25 HP to your health bar | 20s |

---

## 🏟️ Procedural Dynamic Arenas

Choose between 4 procedural canvas battle stages with custom particle systems:

1. **🏙️ Cyber City:** Neon skyscrapers, animated digital rain, floating cyan holograms, and laser grids.
2. **⛩️ Shaolin Dojo:** Traditional Japanese temple architecture with drifting cherry blossom sakura petals.
3. **🌋 Lava Inferno:** Volcanic magma chambers with rising burning embers and fiery heat distortion.
4. **🌅 Retro Synthwave:** 80s wireframe mountains, glowing neon horizon, and animated sunset grid.

---

## 🛒 Character Upgrades & Economy

Earn coins by beating campaign bosses and level milestones, or recharge via integrated UPI / Razorpay:

- **🥊 Power Fist (Attack):** Increases base damage per word (+2 to +10 dmg).
- **🛡️ Iron Shield (Defense):** Reduces incoming opponent damage (-8% to -40%).
- **🔥 Fury Engine (Rage Mode):** Triggers double-damage Rage Mode at higher HP thresholds.
- **⚡ Critical Strike (Speed Window):** Extends critical hit speed window for ultra-fast typists.
- **❤️ Vital Core (Health):** Expands maximum health pool from 100 HP up to 140 HP.
- **💚 Combo Heal:** Restores bonus health on 8x combo streaks.

---

## 📱 PWA & Mobile Installation

- **Ultra Lightweight:** Total app footprint is **under 0.5 MB** — downloads in less than a second even on 2G/3G connections.
- **100% Offline Capability:** Service Worker pre-caches all game logic, audio synthesizer, and canvas graphics. All 25 Campaign stages, Stickman mode, and shop work without internet!
- **Android App:** 1-tap "INSTALL FREE" banner prompts native PWA installation to Home Screen.
- **iPhone / iPad:** Integrated iOS Safari step-by-step installation guide (`Share` → `Add to Home Screen`).

---

## 🛡️ Anti-Cheat & Fair Play System

To preserve competitive integrity and prevent automated script abuse:
- **Hardware Event Validation:** Programmatic / synthetic keystrokes (`isTrusted: false`) are rejected.
- **Keystroke Rate Limiting:** Keystrokes exceeding 55 inputs/second are throttled.
- **Paste Prevention:** Copy-pasting text into the combat typing box is blocked.
- **P2P Payload Clamping:** Network messages enforce maximum damage caps per packet.
- **DOM Sanitization:** All chat messages and player handles are sanitized against XSS.

---

## ⌨️ Controls & Shortcuts

| Key | Context | Action |
| :---: | :--- | :--- |
| **`A - Z`** / **`Space`** | During active match | Type word letters to trigger attacks & combos |
| **`1`**, **`2`**, **`3`**, **`4`** | During active match | Activate Battle Skills (Freeze, Shield, 2x Damage, Medkit) |
| **`ESC`** | During match | Pause / Resume current fight *(Never hijacked by letter 'P'!)* |
| **`R`** / **`Space`** | On Game Over / Pause modal | Instant rematch / restart stage |
| **`M`** | Outside active match | Toggle sound synthesizer on / off |

---

## 🛠️ Tech Stack & Philosophy

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | Pure HTML5, CSS3, Vanilla ES6+ | Zero framework bloat, maximum performance, instant startup |
| **Graphics** | HTML5 Canvas 2D API | 60 FPS sprites, particle emitters, screen shakes, hit sparks |
| **Audio** | Web Audio API | Fully synthesized sound effects — zero external MP3/WAV files |
| **P2P Networking** | WebRTC DataChannels + MediaStreams | Serverless peer-to-peer data & real-time voice chat via PeerJS |
| **Public Chat** | MQTT 3.1.1 over WebSockets (WSS) | Decentralized real-time lobby via public broker mesh with fallback |
| **Offline Cache** | Service Worker + Cache API | Dual cache/network-first strategy with auto-updating client reload |
| **Payment Gateway** | UPI QR + Razorpay SDK + Sandbox | Instant coin recharges with sandbox test mode |
| **Hosting** | Vercel CDN | Global edge deployment directly from GitHub `main` branch |

---

## 📂 Project Structure

```
typing-fighter-game/
├── index.html          # Unified app shell: HUD, Canvas arena, chat drawer, modals
├── style.css           # Cyberpunk design system, responsive media queries, animations
├── manifest.json       # PWA manifest: icons, theme colors, standalone display mode
├── sw.js               # Service Worker: offline caching, background update engine (v42)
├── favicon.png         # High-DPI app favicon
├── apple-touch-icon.png# iOS Safari home screen icon
├── icon-192.png        # PWA standard Android icon (192x192)
├── icon-512.png        # PWA high-res splash icon (512x512)
├── vercel.json         # Vercel deployment routing headers
├── package.json        # Project metadata
├── LICENSE             # MIT License
└── js/
    ├── icons.js        # Crisp inline SVG vector icons library
    ├── config.js       # 25 campaign boss configurations, word dictionaries, arenas
    ├── upgrades.js     # Character upgrade trees, coin wallet & progression persistence
    ├── payment.js      # UPI QR generation, Razorpay checkout, sandbox simulation
    ├── auth.js         # Guest & mobile player credentials and localStorage persistence
    ├── audio.js        # Pure Web Audio API synthesizer for combat hits, combos & supers
    ├── renderer.js     # HTML5 Canvas 2D 60FPS engine: animated fighters, particles, arenas
    ├── p2p.js          # WebRTC P2P room engine, rematch lobby, and live microphone voice chat
    ├── combat.js       # Combat calculations, WPM physics, combo multipliers, AI boss loop
    ├── word-engine.js  # Dynamic word pool generator, difficulty scaling, script mode
    ├── ui-manager.js   # Centralized DOM controller: toasts, modals, HUD meter updates
    ├── chat.js         # CommunityChat: MQTT over WebSocket global lobby & 1-click challenges
    └── main.js         # Master game orchestrator: input listeners, mode routing, P2P hooks
```

---

## 🚀 Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/Priyanshu-kumar-maurya/typing-fighter-game.git
cd typing-fighter-game

# 2. Option A: Run directly in browser
# Simply double-click index.html or open with Live Server

# 3. Option B: Run with any local HTTP server (recommended for PWA & Service Worker)
npx serve .
# Or with Python:
python -m http.server 8000
```

Open your browser at `http://localhost:3000` (or `http://localhost:8000`).

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for complete details.

---

## 👤 Author & Maintainer

**Priyanshu Kumar Maurya**  
- **GitHub:** [@Priyanshu-kumar-maurya](https://github.com/Priyanshu-kumar-maurya)  
- **Live Game:** [typing-fighter-game.vercel.app](https://typing-fighter-game.vercel.app)

---

<div align="center">
  <sub>Built with ⚡ HTML5 Canvas • Web Audio API • WebRTC P2P • MQTT WebSocket • Vanilla JS</sub>
</div>
