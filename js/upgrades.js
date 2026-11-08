/**
 * @fileoverview UpgradeSystem — Persistent Coin & Character Progression
 *
 * Manages the player's coin wallet and 6 character upgrade trees.
 * All state is persisted in localStorage under 'tf_player_stats'.
 *
 * Upgrade Trees:
 *   attack   (5 lvl) — +2 base attack damage per level
 *   defense  (5 lvl) — -8% incoming AI damage per level
 *   fury     (3 lvl) — Rage Mode activates at +5% HP per level
 *   critical (2 lvl) — +200ms Critical Hit window per level
 *   vitality (4 lvl) — +10 Max HP per level
 *   combo    (3 lvl) — +2 HP from Combo Heal per level
 *
 * @module UpgradeSystem
 */

'use strict';

class UpgradeSystem {

    constructor() {
        this._load();
    }

    // ── PERSISTENCE ───────────────────────────────────────────────────────────

    _load() {
        try {
            const raw  = localStorage.getItem('tf_player_stats');
            const data = raw ? JSON.parse(raw) : {};

            this.coins = Math.max(0, Math.floor(Number(data.coins) || 0));

            const u = data.upgrades || {};
            this.upgrades = {
                attack:   this._clamp(u.attack,   0, CONFIG.UPGRADES?.attack?.maxLevel || 10),
                defense:  this._clamp(u.defense,  0, CONFIG.UPGRADES?.defense?.maxLevel || 10),
                fury:     this._clamp(u.fury,     0, CONFIG.UPGRADES?.fury?.maxLevel || 6),
                critical: this._clamp(u.critical, 0, CONFIG.UPGRADES?.critical?.maxLevel || 6),
                vitality: this._clamp(u.vitality, 0, CONFIG.UPGRADES?.vitality?.maxLevel || 10),
                combo:    this._clamp(u.combo,    0, CONFIG.UPGRADES?.combo?.maxLevel || 6),
            };

            this.unlockedTitles = Array.isArray(data.unlockedTitles) && data.unlockedTitles.length > 0
                ? data.unlockedTitles : ['novice'];
            this.activeTitle = data.activeTitle || 'novice';
            this.unlockedArenas = Array.isArray(data.unlockedArenas) && data.unlockedArenas.length > 0
                ? data.unlockedArenas : ['cyber_city'];
            this.bonusHp = Math.max(0, Math.floor(Number(data.bonusHp) || 0));
        } catch {
            this._reset();
        }
    }

    _reset() {
        this.coins          = 0;
        this.upgrades       = { attack: 0, defense: 0, fury: 0, critical: 0, vitality: 0, combo: 0 };
        this.unlockedTitles = ['novice'];
        this.activeTitle    = 'novice';
        this.unlockedArenas = ['cyber_city'];
        this.bonusHp        = 0;
    }

    _save() {
        try {
            localStorage.setItem('tf_player_stats', JSON.stringify({
                coins:          this.coins,
                upgrades:       this.upgrades,
                unlockedTitles: this.unlockedTitles,
                activeTitle:    this.activeTitle,
                unlockedArenas: this.unlockedArenas,
                bonusHp:        this.bonusHp
            }));
        } catch { /* storage full — ignore */ }
    }

    _clamp(val, min, max) {
        const n = Math.floor(Number(val) || 0);
        return Math.max(min, Math.min(max, n));
    }

    // ── PUBLIC COIN API ───────────────────────────────────────────────────────

    /**
     * Award coins to the player.
     * @param {number} amount - Number of coins to add
     * @returns {number} New total
     */
    addCoins(amount) {
        this.coins += Math.max(0, Math.round(amount));
        this._save();
        return this.coins;
    }

    /**
     * Deduct coins from the player.
     * @param {number} amount
     * @returns {boolean} true if successful, false if insufficient balance
     */
    spendCoins(amount) {
        if (this.coins < amount) return false;
        this.coins -= amount;
        this._save();
        return true;
    }

    // ── UPGRADE PURCHASE ──────────────────────────────────────────────────────

    /**
     * Attempt to buy the next level of an upgrade.
     * @param {string} key - Upgrade key
     * @returns {{ ok: boolean, reason?: string, newLevel?: number }}
     */
    purchaseUpgrade(key) {
        const def = CONFIG.UPGRADES[key];
        if (!def) return { ok: false, reason: 'Unknown upgrade.' };

        const curLvl = this.upgrades[key] ?? 0;
        if (curLvl >= def.maxLevel) return { ok: false, reason: `Already at MAX Level!` };

        const cost = def.costs[curLvl];
        if (!this.spendCoins(cost)) {
            return { ok: false, reason: `Need ${cost} 🪙 coins! (You have ${this.coins})` };
        }

        this.upgrades[key] = curLvl + 1;
        this._save();
        return { ok: true, newLevel: this.upgrades[key] };
    }

    // ── EFFECTIVE STAT GETTERS ────────────────────────────────────────────────
    //  These are read by combat.js to apply upgraded values in match.

    /** Extra base damage (⚔️ Attack upgrade: +2 per level, up to +20) */
    get extraDamage()       { return (this.upgrades.attack || 0) * 2; }

    /** Multiplier applied to AI damage (🛡️ Defense upgrade: -7% per lvl, min 0.30) */
    get defenseMultiplier() { return Math.max(0.30, 1 - ((this.upgrades.defense || 0) * 0.07)); }

    /** HP fraction below which Rage Mode activates (🔥 Fury upgrade) */
    get rageThreshold()     { return Math.min(0.65, 0.30 + ((this.upgrades.fury || 0) * 0.05)); }

    /** Critical hit window in ms (💥 Critical upgrade) */
    get criticalMs()        { return CONFIG.GAME.CRITICAL_MS + ((this.upgrades.critical || 0) * 150); }

    /** Extra Max HP added at match start (❤️ Vitality upgrade + Lucky Spin HP bonus) */
    get extraMaxHp()        { return ((this.upgrades.vitality || 0) * 10) + (this.bonusHp || 0); }

    /** Extra HP healed per combo heal event (💚 Combo upgrade) */
    get extraComboHeal()    { return (this.upgrades.combo || 0) * 2; }

    // ── VIP TITLES API ────────────────────────────────────────────────────────
    getActiveTitleMeta() {
        const list = CONFIG.VIP_TITLES || [];
        const found = list.find(t => t.id === this.activeTitle);
        return found || list[0] || { id: 'novice', name: 'NOVICE', icon: '🔰', color: '#94a3b8' };
    }

    unlockTitle(titleId) {
        const title = (CONFIG.VIP_TITLES || []).find(t => t.id === titleId);
        if (!title) return { ok: false, reason: 'Unknown Title' };
        if (this.unlockedTitles.includes(titleId)) return { ok: false, reason: 'Already unlocked!' };
        if (!this.spendCoins(title.cost)) {
            return { ok: false, reason: `Need ${title.cost.toLocaleString()} 🪙 coins to unlock ${title.name}!` };
        }
        this.unlockedTitles.push(titleId);
        this.activeTitle = titleId;
        this._save();
        return { ok: true, title };
    }

    equipTitle(titleId) {
        if (!this.unlockedTitles.includes(titleId)) return { ok: false, reason: 'Title not unlocked yet!' };
        this.activeTitle = titleId;
        this._save();
        return { ok: true, activeTitle: this.activeTitle };
    }

    // ── ARENAS API ────────────────────────────────────────────────────────────
    isArenaUnlocked(arenaId) {
        if (!arenaId || arenaId === 'cyber_city') return true;
        return this.unlockedArenas.includes(arenaId);
    }

    unlockArena(arenaId) {
        const arena = CONFIG.ARENA_THEMES?.[arenaId];
        if (!arena) return { ok: false, reason: 'Unknown Arena theme' };
        if (this.isArenaUnlocked(arenaId)) return { ok: false, reason: 'Already unlocked!' };
        const cost = arena.cost || 0;
        if (!this.spendCoins(cost)) {
            return { ok: false, reason: `Need ${cost.toLocaleString()} 🪙 coins to unlock ${arena.name}!` };
        }
        this.unlockedArenas.push(arenaId);
        this._save();
        return { ok: true, arena };
    }

    // ── LUCKY SPIN WHEEL API ──────────────────────────────────────────────────
    spinLuckyWheel(isSuper = false) {
        const cost = isSuper ? CONFIG.LUCKY_SPIN.SUPER_SPIN_COST : CONFIG.LUCKY_SPIN.SPIN_COST;
        if (!this.spendCoins(cost)) {
            return { ok: false, reason: `Need ${cost.toLocaleString()} 🪙 coins to spin!` };
        }

        const prizes = CONFIG.LUCKY_SPIN.PRIZES;
        const totalWeight = prizes.reduce((acc, p) => acc + (p.weight || 1), 0);
        let rand = Math.random() * totalWeight;
        let chosen = prizes[0];

        for (const p of prizes) {
            if (rand < (p.weight || 1)) {
                chosen = p;
                break;
            }
            rand -= (p.weight || 1);
        }

        let rewardMsg = '';
        if (chosen.type === 'coins') {
            const wonAmount = isSuper ? chosen.value * 2 : chosen.value;
            this.addCoins(wonAmount);
            rewardMsg = `Won +${wonAmount.toLocaleString()} 🪙 Coins!`;
        } else if (chosen.type === 'title') {
            if (!this.unlockedTitles.includes(chosen.id)) {
                this.unlockedTitles.push(chosen.id);
            }
            this.activeTitle = chosen.id;
            rewardMsg = `Unlocked Title: [${chosen.value}]!`;
        } else if (chosen.type === 'boost_hp') {
            const addHp = isSuper ? chosen.value * 2 : chosen.value;
            this.bonusHp = (this.bonusHp || 0) + addHp;
            rewardMsg = `Permanent +${addHp} Max HP Booster!`;
        }

        this._save();
        return { ok: true, prize: chosen, rewardMsg, remainingCoins: this.coins };
    }
}

// Global singleton — available to combat.js, main.js, ui-manager.js
const upgrades = new UpgradeSystem();
