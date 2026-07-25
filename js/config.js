// Typing Fighter - Game Configuration & Dictionaries

const CONFIG = {
    // Word Dictionaries categorized by difficulty and theme
    WORDS: {
        EASY: [
            "code", "fast", "punch", "kick", "hero", "fight", "dash", "combo", "power", "blast",
            "speed", "strike", "block", "dodge", "flame", "light", "spark", "rush", "shock", "slash",
            "storm", "force", "clash", "arena", "blade", "pulse", "cyber", "neon", "steel", "guard"
        ],
        MEDIUM: [
            "hyperdrive", "lightning", "cyberpunk", "overdrive", "adrenaline", "counterstrike", "supercharged",
            "headshot", "vanguard", "shadowblade", "blitzkrieg", "firestorm", "nanotech", "destruction",
            "momentum", "precision", "armageddon", "domination", "knockout", "invincible", "thunderbolt"
        ],
        HARD: [
            "quantum leap", "orbital strike", "synaptic pulse", "chronos trigger", "plasma beam",
            "tactical overload", "supersonic velocity", "subzero fatality", "spectral execution",
            "cybernetic enhancement", "transcendence mode", "hyperbolic chamber", "electromagnetic surge"
        ],
        POWER_WORDS: [
            "SUPERNOVA", "METEOR STRIKE", "KAMEHAMEHA", "FINAL FLASH", "DRAGON ASCENT",
            "OBLIVION BEAM", "HYPER COMBO", "QUANTUM CRUSH", "SOLAR FLARE", "THUNDER GOD"
        ]
    },

    // 25 Arcade Campaign Levels (Starts at 15 WPM up to 120 WPM)
    CAMPAIGN_LEVELS: [
        { level: 1, name: "ROOKIE BOT", title: "Stage 1", avatar: "🤖", difficulty: "Novice", baseWPM: 15, attackInterval: 3800, color: "#00f0ff", maxHp: 90 },
        { level: 2, name: "CYBER SPARK", title: "Stage 2", avatar: "⚡", difficulty: "Novice", baseWPM: 18, attackInterval: 3500, color: "#00f0ff", maxHp: 95 },
        { level: 3, name: "NEON CADET", title: "Stage 3", avatar: "🎮", difficulty: "Easy", baseWPM: 22, attackInterval: 3200, color: "#00ff88", maxHp: 100 },
        { level: 4, name: "SHADOW RECRUIT", title: "Stage 4", avatar: "🥷", difficulty: "Easy", baseWPM: 25, attackInterval: 3000, color: "#00ff88", maxHp: 105 },
        { level: 5, name: "IRON STRIKER", title: "Stage 5", avatar: "🥊", difficulty: "Easy", baseWPM: 29, attackInterval: 2800, color: "#00ff88", maxHp: 110 },
        { level: 6, name: "LASER SENTINEL", title: "Stage 6", avatar: "🤖", difficulty: "Medium", baseWPM: 33, attackInterval: 2600, color: "#ffaa00", maxHp: 115 },
        { level: 7, name: "DISTRICT NINJA", title: "Stage 7", avatar: "🥷", difficulty: "Medium", baseWPM: 37, attackInterval: 2400, color: "#ffaa00", maxHp: 120 },
        { level: 8, name: "NEON ASSASSIN", title: "Stage 8", avatar: "⚡", difficulty: "Medium", baseWPM: 41, attackInterval: 2200, color: "#ffaa00", maxHp: 125 },
        { level: 9, name: "CYBER PHANTOM", title: "Stage 9", avatar: "👻", difficulty: "Medium", baseWPM: 45, attackInterval: 2000, color: "#ffaa00", maxHp: 130 },
        { level: 10, name: "COMMANDER BLITZ", title: "Stage 10 Boss", avatar: "🛡️", difficulty: "BOSS", baseWPM: 49, attackInterval: 1850, color: "#ff0055", maxHp: 140 },
        { level: 11, name: "HYPER VENOM", title: "Stage 11", avatar: "🐍", difficulty: "Hard", baseWPM: 53, attackInterval: 1750, color: "#ff0055", maxHp: 145 },
        { level: 12, name: "PLASMA HUNTER", title: "Stage 12", avatar: "🎯", difficulty: "Hard", baseWPM: 57, attackInterval: 1650, color: "#ff0055", maxHp: 150 },
        { level: 13, name: "VALKYRIE SPEED", title: "Stage 13", avatar: "🗡️", difficulty: "Hard", baseWPM: 61, attackInterval: 1550, color: "#ff0055", maxHp: 155 },
        { level: 14, name: "SUPERSONIC CHRONO", title: "Stage 14", avatar: "⏳", difficulty: "Hard", baseWPM: 65, attackInterval: 1450, color: "#ff0055", maxHp: 160 },
        { level: 15, name: "VOID OVERLORD", title: "Stage 15 Boss", avatar: "🐉", difficulty: "BOSS", baseWPM: 70, attackInterval: 1350, color: "#9d00ff", maxHp: 170 },
        { level: 16, name: "MECHA KAISER", title: "Stage 16", avatar: "🦾", difficulty: "Expert", baseWPM: 75, attackInterval: 1250, color: "#9d00ff", maxHp: 175 },
        { level: 17, name: "SPECTRAL SHADOW", title: "Stage 17", avatar: "👤", difficulty: "Expert", baseWPM: 80, attackInterval: 1150, color: "#9d00ff", maxHp: 180 },
        { level: 18, name: "QUANTUM TITAN", title: "Stage 18", avatar: "🌌", difficulty: "Expert", baseWPM: 85, attackInterval: 1080, color: "#9d00ff", maxHp: 185 },
        { level: 19, name: "SYNAPIC GOD", title: "Stage 19", avatar: "🧠", difficulty: "Expert", baseWPM: 90, attackInterval: 1000, color: "#9d00ff", maxHp: 190 },
        { level: 20, name: "APEX OVERLORD", title: "Stage 20 Boss", avatar: "👑", difficulty: "SUPER BOSS", baseWPM: 95, attackInterval: 920, color: "#ffe600", maxHp: 200 },
        { level: 21, name: "SPEED DEMON REX", title: "Stage 21", avatar: "🦖", difficulty: "NIGHTMARE", baseWPM: 100, attackInterval: 850, color: "#ffe600", maxHp: 210 },
        { level: 22, name: "HYPERDRIVE OMEGA", title: "Stage 22", avatar: "💥", difficulty: "NIGHTMARE", baseWPM: 105, attackInterval: 800, color: "#ffe600", maxHp: 220 },
        { level: 23, name: "CHRONOS PRIME", title: "Stage 23", avatar: "⏱️", difficulty: "NIGHTMARE", baseWPM: 110, attackInterval: 750, color: "#ffe600", maxHp: 230 },
        { level: 24, name: "INFINITY WARRIOR", title: "Stage 24", avatar: "♾️", difficulty: "NIGHTMARE", baseWPM: 115, attackInterval: 700, color: "#ffe600", maxHp: 240 },
        { level: 25, name: "ULTIMATE TYPING GOD", title: "Stage 25 FINAL BOSS", avatar: "⚡👑⚡", difficulty: "GOD MODE", baseWPM: 120, attackInterval: 650, color: "#ffe600", maxHp: 250 }
    ],

    // Player Fighter Profiles
    FIGHTERS: {
        P1: {
            name: "CYBER WARRIOR",
            color: "#00f0ff",
            glowColor: "rgba(0, 240, 255, 0.6)",
            accentColor: "#7000ff"
        },
        P2: {
            name: "NEON DEMON",
            color: "#ff0055",
            glowColor: "rgba(255, 0, 85, 0.6)",
            accentColor: "#ff9900"
        }
    },

    // Gameplay Physics Parameters
    GAME: {
        BASE_DAMAGE: 8,
        SUPER_METER_MAX: 100,
        SUPER_METER_PER_WORD: 15,
        SUPER_DAMAGE: 35,
        COMBO_TIMEDOWN: 4000,
        P2P_PEER_PREFIX: "tf-arena-"
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
