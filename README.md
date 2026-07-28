# 🥊 TYPING FIGHTER — Real-Time 1v1 Type Clash Arena

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-typing--fighter--game.vercel.app-00f0ff?style=for-the-badge)](https://typing-fighter-game.vercel.app)

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen.svg)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Voice%20%26%20Data-orange.svg)
![PWA](https://img.shields.io/badge/PWA-Installable-purple.svg)
![Mobile](https://img.shields.io/badge/Mobile-Responsive-ff0055.svg)

> **Type faster → Hit harder.** A high-octane 1v1 fighting game where your typing speed and accuracy directly control attacks, combos, and super moves — in real time. Play solo vs AI across 25 boss stages, or fight a friend online with live P2P voice chat!

---

## 🌐 Live Demo

👉 **[https://typing-fighter-game.vercel.app](https://typing-fighter-game.vercel.app)**

> Works on **Desktop, Android & iPhone** — no installation needed. Installable as a PWA!

---

## 🎮 Game Modes

| Mode | Description |
| :--- | :--- |
| 🤖 **vs AI Campaign (25 Stages)** | Fight 25 progressively harder AI bosses — from 15 WPM (Rookie Bot) to 120 WPM (Ultimate Typing God) |
| 🌐 **Online P2P Multiplayer** | Battle a friend over the internet using any room code — WebRTC peer-to-peer, no server needed |
| ⌨️ **Local 2-Player** | Two players on the same keyboard, split typing to attack |

---

## 🌟 Features

### ⚔️ Core Gameplay
- **Type to Attack** — every correctly typed word deals damage based on your WPM
- **Combo System** — chain consecutive words for combo multipliers
- **Super Meter** — fill it up by typing, then use POWER WORDS for HYPER DAMAGE
- **Keystroke Micro-Attacks** — every correct letter triggers an instant light strike
- **Target WPM Requirement** — pass campaign levels only by meeting the stage speed target

### 🌐 Online P2P Multiplayer
- **Zero-Setup Room System** — type any code (e.g. `GAME99`, `12345`) → first player becomes host, second joins automatically
- **Host-First Strategy** — reliable WebRTC connection without needing a matchmaking server
- **Live P2P Voice Chat** — real-time microphone streaming between online players
- **Room Protection** — max 2 players per room; 3rd person gets rejected automatically

### 🏟️ P2P Rematch Lobby *(Free Fire Style)*
- After each P2P game ends, a **Rematch Lobby** opens on both screens — NOT the campaign map
- **Ready-Up System** — both players must click ⚡ READY UP to start the next round
- **3-Second Countdown** — auto-starts when both players are ready
- **Cancel Ready** — click again to un-ready, countdown cancels automatically
- **Custom Typing Text** — type your own sentences/study notes for the next round
- **Share Text with Friend** — send your custom text to your opponent via P2P
- **Leave Room Button** — cleanly disconnect and return to main menu

### 📝 Custom Script Mode
- Paste your own study notes, speeches, poems, or any text to practice while fighting
- Applies to all game modes (vs AI, Local 2P, P2P)

### 📱 Mobile & Touch Support
- Fully responsive layout — works perfectly on phones and tablets
- Virtual keyboard trigger button on mobile screens
- Touch-friendly card sizes and button tap targets
- Dynamic viewport height (`dvh`) for browser URL bar compensation

### 🎨 Cyberpunk Design System
- Neon glow UI with cyan (`#00f0ff`), magenta (`#ff0055`), and yellow (`#ffe600`) color palette
- 60 FPS HTML5 Canvas fighting animations (hit sparks, screen shake, floating damage numbers)
- Animated character sprites, super attack effects, combo badges
- Inline SVG vector icons — zero network dependency, 100% crisp at all resolutions
- Google Fonts: **Orbitron** (headings) + **Outfit** (body)

### 🔐 Authentication & Progress
- **Guest Play** — instant play with name + age (no password)
- **Mobile Registration** — persistent account linked to mobile number + password
- Campaign level progress, WPM records, and win/loss saved via `localStorage`
- Stage Rank system: **S-RANK → A → B → C-RANK** based on speed + accuracy

### 🛡️ Anti-Cheat & Security
- Hardware event validation (`isTrusted`)
- Rate limiting — max 55 keystrokes/second
- Paste prevention on typing input
- P2P payload caps — max 50 damage per message
- XSS prevention — HTML escaping on all user inputs

### 📦 PWA (Progressive Web App)
- Installable on home screen (Android + iOS)
- Offline playback via Service Worker cache
- Network-first JS strategy for instant bug fix delivery

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Cyberpunk Design System), Vanilla JavaScript |
| **Graphics Engine** | HTML5 Canvas 2D API — 60 FPS sprites, hit sparks, screen shake |
| **Audio Engine** | Web Audio API — zero external MP3 files, fully synthesized |
| **P2P Multiplayer & Voice** | WebRTC DataChannel + MediaStream via [PeerJS v1.5.4](https://peerjs.com/) |
| **PWA & Offline** | Web App Manifest + Service Worker (Cache-first + Network-first hybrid) |
| **Fonts & Icons** | Google Fonts (Orbitron, Outfit) + Inline SVG icon library (`js/icons.js`) |
| **Hosting** | [Vercel](https://vercel.com/) — auto-deploy from GitHub main branch |

---

## 📂 Project Architecture

```
typing-fighter-game/
├── index.html          # App shell: HUD, arena, all modals (auth, P2P, lobby, campaign)
├── style.css           # Full Cyberpunk design system, animations, mobile media queries
├── manifest.json       # PWA manifest (icons, theme color, display mode)
├── sw.js               # Service Worker: cache-first HTML/CSS, network-first JS
├── favicon.svg         # Vector favicon
├── og-image.svg        # Open Graph social share card
├── vercel.json         # Vercel routing config
├── package.json        # NPM metadata
├── LICENSE             # MIT License
└── js/
    ├── icons.js        # Inline SVG vector icon library (crisp at all resolutions)
    ├── config.js       # 25 campaign boss configs, word dictionaries, game constants
    ├── auth.js         # Guest/registered player login, localStorage persistence
    ├── audio.js        # Web Audio API synthesizer (punch, kick, super, combo sounds)
    ├── renderer.js     # Canvas 2D 60FPS engine: sprites, attacks, particles, shake
    ├── p2p.js          # WebRTC P2P: host-first room engine, voice chat, lobby messages
    ├── combat.js       # WPM physics, damage math, combo multipliers, AI loop, game over
    └── main.js         # Game controller: input, P2P lobby, ready-up system, toast, HUD
```

---

## 🎮 How to Play Online (P2P)

```
1️⃣  Both players open: https://typing-fighter-game.vercel.app
2️⃣  Click "Online P2P Mode" → Enter any Room Code (e.g. GAME99)
3️⃣  First player clicks CONNECT → becomes Host (waits)
4️⃣  Second player enters SAME CODE → clicks CONNECT → joins as Guest
5️⃣  Both are connected → Battle starts instantly! 🥊
6️⃣  After game ends → P2P Rematch Lobby opens on both screens
7️⃣  Both click ⚡ READY UP → 3s countdown → Rematch!
```

> **Note:** Works on different WiFi networks, mobile data (4G/5G), and across countries.  
> Voice chat activates automatically if microphone permission is granted.

---

## 🚀 Local Setup

```bash
# Clone the repo
git clone https://github.com/Priyanshu-kumar-maurya/typing-fighter-game.git
cd typing-fighter-game

# Option 1: Open directly
# Just double-click index.html in Chrome, Edge, Firefox, Brave, or Safari

# Option 2: Serve with Node (for PWA & Service Worker features)
npm start
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **P** / **ESC** | Pause / Resume match |
| **R** | Restart current level |
| **M** | Toggle sound on/off |

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for full details.

---

## 👤 Author

**Priyanshu Kumar Maurya**  
GitHub: [@Priyanshu-kumar-maurya](https://github.com/Priyanshu-kumar-maurya)  
Live: [typing-fighter-game.vercel.app](https://typing-fighter-game.vercel.app)

---

<div align="center">
  <sub>Built with ⚡ WebRTC • HTML5 Canvas • Web Audio API • Pure Vanilla JS</sub>
</div>
