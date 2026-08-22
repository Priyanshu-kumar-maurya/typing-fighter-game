// Typing Fighter - Configuration & Dictionary Data

const CONFIG = {
    GAME: {
        MAX_HP: 100,
        BASE_DAMAGE: 10,
        SUPER_DAMAGE: 35,
        SUPER_METER_MAX: 100,
        SUPER_METER_PER_WORD: 25,
        DEFAULT_WPM_TARGET: 15,
        P2P_PEER_PREFIX: 'tf_room_',

        // v28 — New mechanics
        /** Type a word faster than this (ms) → Critical Hit (2× damage) */
        CRITICAL_MS: 1000,
        /** HP below this fraction (0–1) → Rage Mode (1.5× damage) */
        RAGE_HP_RATIO: 0.30,
        /** Heal player every N consecutive words typed */
        COMBO_HEAL_EVERY: 8,
        /** HP recovered per heal event */
        COMBO_HEAL_AMOUNT: 3
    },

    // ── CHARACTER UPGRADE TREES ───────────────────────────────────────────────
    // Each upgrade has: name, icon, desc, maxLevel, costs[] (one per level)
    UPGRADES: {
        attack:   {
            name: 'Power Fist',    icon: '⚔️',
            desc: '+2 Attack Damage per level. Destroy enemies faster!',
            maxLevel: 5,
            costs: [100, 200, 400, 800, 1600]
        },
        defense:  {
            name: 'Iron Shield',   icon: '🛡️',
            desc: '-8% AI Damage taken per level. Survive longer!',
            maxLevel: 5,
            costs: [150, 300, 600, 1200, 2400]
        },
        fury:     {
            name: 'Fury Engine',   icon: '🔥',
            desc: 'Rage Mode triggers at +5% HP threshold per level!',
            maxLevel: 3,
            costs: [200, 400, 800]
        },
        critical: {
            name: 'Critical Eye',  icon: '💥',
            desc: '+200ms Critical Hit window. Land Crits more easily!',
            maxLevel: 2,
            costs: [250, 500]
        },
        vitality: {
            name: 'Vital Core',    icon: '❤️',
            desc: '+10 Max HP per level. More room to make mistakes!',
            maxLevel: 4,
            costs: [200, 400, 800, 1600]
        },
        combo:    {
            name: 'Combo Rush',    icon: '💚',
            desc: '+2 HP healed per Combo Heal event. Stay in the fight!',
            maxLevel: 3,
            costs: [150, 300, 600]
        }
    },

    // ── COIN SHOP PACKAGES ────────────────────────────────────────────────────
    COIN_SHOP: [
        { id: 'coins_500',  coins: 500,  price: '₹49',  label: 'Starter Pack',  icon: '💰', bonus: '' },
        { id: 'coins_1200', coins: 1200, price: '₹99',  label: 'Pro Pack',      icon: '💎', bonus: '+200 BONUS' },
        { id: 'coins_3000', coins: 3000, price: '₹199', label: 'Elite Pack',    icon: '👑', bonus: '+600 BONUS' },
        { id: 'coins_7500', coins: 7500, price: '₹399', label: 'God Pack',      icon: '⚡', bonus: '+1500 BONUS' }
    ],

    // 25 PROGRESSIVE CAMPAIGN BOSS STAGES (15 WPM to 120 WPM)
    CAMPAIGN_LEVELS: [
        { level: 1, name: "Rookie Bot", baseWPM: 15, maxHp: 100, attackInterval: 4500, avatar: ICONS.robot, color: '#00f0ff', difficulty: 'Easy' },
        { level: 2, name: "Iron Striker", baseWPM: 18, maxHp: 110, attackInterval: 4200, avatar: ICONS.fist, color: '#00f0ff', difficulty: 'Easy' },
        { level: 3, name: "Cypher Drone", baseWPM: 22, maxHp: 120, attackInterval: 4000, avatar: ICONS.robot, color: '#00f0ff', difficulty: 'Easy' },
        { level: 4, name: "Vector Fighter", baseWPM: 25, maxHp: 130, attackInterval: 3800, avatar: ICONS.lightning, color: '#00f0ff', difficulty: 'Easy' },
        { level: 5, name: "Neon Brawler", baseWPM: 28, maxHp: 140, attackInterval: 3600, avatar: ICONS.fist, color: '#00ff88', difficulty: 'Medium' },
        { level: 6, name: "Laser Lynx", baseWPM: 32, maxHp: 150, attackInterval: 3400, avatar: ICONS.lightning, color: '#00ff88', difficulty: 'Medium' },
        { level: 7, name: "Plasma Phantom", baseWPM: 35, maxHp: 160, attackInterval: 3200, avatar: ICONS.fire, color: '#00ff88', difficulty: 'Medium' },
        { level: 8, name: "Cyber Samurai", baseWPM: 40, maxHp: 170, attackInterval: 3000, avatar: ICONS.shield, color: '#00ff88', difficulty: 'Medium' },
        { level: 9, name: "Shadow Assassin", baseWPM: 45, maxHp: 180, attackInterval: 2800, avatar: ICONS.user, color: '#00ff88', difficulty: 'Medium' },
        { level: 10, name: "Titan Crusher", baseWPM: 50, maxHp: 200, attackInterval: 2600, avatar: ICONS.fist, color: '#ffe600', difficulty: 'Hard' },
        { level: 11, name: "Hyper Dynamo", baseWPM: 55, maxHp: 210, attackInterval: 2500, avatar: ICONS.lightning, color: '#ffe600', difficulty: 'Hard' },
        { level: 12, name: "Quantum Reaper", baseWPM: 60, maxHp: 220, attackInterval: 2400, avatar: ICONS.fire, color: '#ffe600', difficulty: 'Hard' },
        { level: 13, name: "Vortex Warrior", baseWPM: 65, maxHp: 230, attackInterval: 2300, avatar: ICONS.fist, color: '#ffe600', difficulty: 'Hard' },
        { level: 14, name: "Nexus Commander", baseWPM: 70, maxHp: 240, attackInterval: 2200, avatar: ICONS.shield, color: '#ffe600', difficulty: 'Hard' },
        { level: 15, name: "Apex Demon", baseWPM: 75, maxHp: 250, attackInterval: 2000, avatar: ICONS.fire, color: '#ff0055', difficulty: 'Expert' },
        { level: 16, name: "Inferno Warlord", baseWPM: 80, maxHp: 260, attackInterval: 1900, avatar: ICONS.fire, color: '#ff0055', difficulty: 'Expert' },
        { level: 17, name: "Overclock Prime", baseWPM: 85, maxHp: 270, attackInterval: 1800, avatar: ICONS.lightning, color: '#ff0055', difficulty: 'Expert' },
        { level: 18, name: "Zero Absolute", baseWPM: 90, maxHp: 280, attackInterval: 1700, avatar: ICONS.shield, color: '#ff0055', difficulty: 'Expert' },
        { level: 19, name: "Cosmic Sentinel", baseWPM: 95, maxHp: 290, attackInterval: 1600, avatar: ICONS.star, color: '#ff0055', difficulty: 'Expert' },
        { level: 20, name: "Sovereign God", baseWPM: 100, maxHp: 300, attackInterval: 1500, avatar: ICONS.trophy, color: '#aa00ff', difficulty: 'NIGHTMARE' },
        { level: 21, name: "Chronos Master", baseWPM: 105, maxHp: 310, attackInterval: 1400, avatar: ICONS.lightning, color: '#aa00ff', difficulty: 'NIGHTMARE' },
        { level: 22, name: "Omega Destroyer", baseWPM: 110, maxHp: 320, attackInterval: 1300, avatar: ICONS.fire, color: '#aa00ff', difficulty: 'BOSS' },
        { level: 23, name: "Infinity Knight", baseWPM: 115, maxHp: 330, attackInterval: 1200, avatar: ICONS.shield, color: '#aa00ff', difficulty: 'SUPER BOSS' },
        { level: 24, name: "Oblivion King", baseWPM: 118, maxHp: 340, attackInterval: 1100, avatar: ICONS.fire, color: '#aa00ff', difficulty: 'SUPER BOSS' },
        { level: 25, name: "Ultimate Typing God", baseWPM: 120, maxHp: 350, attackInterval: 1000, avatar: ICONS.trophy, color: '#ffe600', difficulty: 'GOD MODE' }
    ],

    // TYPING PROMPT DICTIONARIES (Huge collection of real-life words & phrases)
    WORDS: {
        EASY: [
            "focus", "learn", "think", "trust", "brave", "power", "climb", "dream",
            "happy", "smile", "quick", "sharp", "light", "shine", "vital", "boost",
            "speed", "clash", "spark", "pulse", "drive", "skill", "force", "value",
            "honor", "grace", "crest", "noble", "flame", "storm", "chase", "reach",
            "grasp", "glide", "swift", "smart", "bold", "super", "magic", "prime",
            "level", "arena", "clear", "guard", "pivot", "craft", "build", "punch",
            "strike", "shield", "victory", "champion", "energy", "hero", "blitz"
        ],
        MEDIUM: [
            "friendship", "courage", "champion", "patience", "creativity", "wisdom",
            "ambition", "harmony", "journey", "inspire", "synergy", "mindset",
            "database", "network", "software", "hardware", "bandwidth", "future",
            "algorithm", "innovation", "interface", "developer", "encrypt", "velocity",
            "stamina", "warrior", "assassin", "victory", "impact", "counter",
            "plasma", "critical", "overdrive", "recovery", "progress", "momentum",
            "resilience", "discipline", "potential", "exploring", "knowledge",
            "discovery", "solution", "technique", "strategy", "strength", "overclock"
        ],
        HARD: [
            "stay focused", "never give up", "keep pushing", "think positive",
            "believe in yourself", "action speaks louder", "chase your dreams",
            "make it happen", "lead with honor", "practice makes perfect",
            "master your mind", "continuous learning", "embrace challenge",
            "unstoppable energy", "determination", "annihilation", "cybernetics",
            "overclocked", "mastermind", "supernova", "extraordinary",
            "transformation", "breakthrough", "perseverance", "accomplishment",
            "unshakeable discipline", "revolutionary power", "supreme victory"
        ],
        POWER_WORDS: [
            "HYPER PUNCH", "PLASMA BEAM", "MEGA COMBO", "ULTIMATE KO",
            "TURBO STRIKE", "CYBER DESTROYER", "GOD SLAM", "DRAGON KNOCKOUT",
            "PHOENIX RISING", "THUNDER STRIKE", "LIGHTSPEED BATTLE"
        ]
    }
};
