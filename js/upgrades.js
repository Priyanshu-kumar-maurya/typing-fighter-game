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
                attack:   this._clamp(u.attack,   0, 5),
                defense:  this._clamp(u.defense,  0, 5),
                fury:     this._clamp(u.fury,     0, 3),
                critical: this._clamp(u.critical, 0, 2),
                vitality: this._clamp(u.vitality, 0, 4),
                combo:    this._clamp(u.combo,    0, 3),
            };
        } catch {
            this._reset();
        }
    }

    _reset() {
        this.coins    = 0;
        this.upgrades = { attack: 0, defense: 0, fury: 0, critical: 0, vitality: 0, combo: 0 };
    }

    _save() {
        try {
            localStorage.setItem('tf_player_stats', JSON.stringify({
                coins:    this.coins,
                upgrades: this.upgrades
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

    /** Extra base damage (⚔️ Attack upgrade) */
    get extraDamage()       { return this.upgrades.attack   * 2; }

    /** Multiplier applied to AI damage (🛡️ Defense upgrade, < 1 = reduction) */
    get defenseMultiplier() { return 1 - (this.upgrades.defense  * 0.08); }

    /** HP fraction below which Rage Mode activates (🔥 Fury upgrade) */
    get rageThreshold()     { return 0.30 + (this.upgrades.fury      * 0.05); }

    /** Critical hit window in ms (💥 Critical upgrade) */
    get criticalMs()        { return CONFIG.GAME.CRITICAL_MS + (this.upgrades.critical * 200); }

    /** Extra Max HP added at match start (❤️ Vitality upgrade) */
    get extraMaxHp()        { return this.upgrades.vitality * 10; }

    /** Extra HP healed per combo heal event (💚 Combo upgrade) */
    get extraComboHeal()    { return this.upgrades.combo    * 2; }
}

// Global singleton — available to combat.js, main.js, ui-manager.js
const upgrades = new UpgradeSystem();
