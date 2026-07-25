// Typing Fighter - Configuration & Dictionary Data

const CONFIG = {
    GAME: {
        MAX_HP: 100,
        BASE_DAMAGE: 10,
        SUPER_DAMAGE: 35,
        SUPER_METER_MAX: 100,
        SUPER_METER_PER_WORD: 25,
        DEFAULT_WPM_TARGET: 15
    },

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

    // TYPING PROMPT DICTIONARIES
    WORDS: {
        EASY: [
            "jab", "kick", "dash", "punch", "block", "combo", "strike", "clash",
            "fight", "speed", "power", "cyber", "arena", "blade", "spark", "boost"
        ],
        MEDIUM: [
            "counter", "plasma", "hyper", "critical", "overdrive", "warrior",
            "assassin", "lightning", "velocity", "victory", "impact", "stamina"
        ],
        HARD: [
            "devastation", "obliteration", "invincible", "retaliation",
            "annihilation", "cybernetics", "overclocked", "mastermind", "supernova"
        ],
        POWER_WORDS: [
            "HYPER PUNCH", "PLASMA BEAM", "MEGA COMBO", "ULTIMATE KO",
            "TURBO STRIKE", "CYBER DESTROYER", "GOD SLAM"
        ]
    }
};
