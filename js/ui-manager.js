/**
 * @fileoverview UIManager
 * Centralises every DOM write in Typing Fighter so that business logic files
 * never touch the DOM directly.  Responsibilities include:
 *   - Toast notification queue
 *   - Modal show / hide routing
 *   - HUD panel updates (HP bars, WPM, combo badge, super meter)
 *   - Player panel setup (name, avatar, renderer fighter color)
 *   - Campaign level grid rendering
 *   - Game-over result population
 *   - P2P lobby panel population and ready-card updates
 *
 * @module UIManager
 */

'use strict';

class UIManager {

    /**
     * @param {ArenaRenderer} renderer - Canvas renderer (needed to sync fighter colors)
     */
    constructor(renderer) {
        /** @type {ArenaRenderer} */
        this.renderer = renderer;

        /**
         * All modal element IDs managed by this class.
         * Closed together by closeAllModals().
         * @private
         * @type {string[]}
         */
        this._modalIds = [
            'modalStart', 'modalP2P', 'modalP2PLobby', 'modalCampaign',
            'modalContentChoice', 'modalCustomScript', 'modalPause',
            'modalAuth', 'modalGameOver'
        ];
    }

    // ── TOAST NOTIFICATIONS ───────────────────────────────────────────────────

    /**
     * Display a self-dismissing toast notification.
     *
     * @param {string}                        message
     * @param {'info'|'success'|'error'}      [type='info']
     * @param {number}                        [duration=3500] ms until auto-dismiss
     */
    showToast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const iconMap = { success: ICONS.star, error: ICONS.cross };
        const icon  = iconMap[type] || ICONS.lightning;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${this._esc(message)}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ── MODAL ROUTING ─────────────────────────────────────────────────────────

    /** Hide every tracked modal at once */
    closeAllModals() {
        this._modalIds.forEach(id => this._el(id)?.classList.add('hidden'));
    }

    /** @param {string} id - Modal element ID */
    showModal(id) { this._el(id)?.classList.remove('hidden'); }

    /** @param {string} id - Modal element ID */
    hideModal(id) { this._el(id)?.classList.add('hidden'); }

    // ── HUD UPDATES ───────────────────────────────────────────────────────────

    /**
     * Synchronise all HUD elements with the current CombatEngine state.
     *
     * @param {Object} p1 - Player-1 stat block from CombatEngine
     * @param {Object} p2 - Player-2 stat block from CombatEngine
     */
    updateHUD(p1, p2) {
        this._refreshPlayerHUD('p1', p1);
        this._refreshPlayerHUD('p2', p2);

        // Mirror HP ratio into the renderer for KO sprite animation
        if (this.renderer) {
            this.renderer.f1.hpPercent = p1.hp / p1.maxHp;
            this.renderer.f2.hpPercent = p2.hp / p2.maxHp;
        }
    }

    /**
     * @private
     * @param {'p1'|'p2'} prefix
     * @param {Object}    stats
     */
    _refreshPlayerHUD(prefix, stats) {
        const hpPct = Math.max(0, (stats.hp / stats.maxHp) * 100);

        this._setText(`${prefix}HpBar`,   'style.width', `${hpPct}%`);
        this._setText(`${prefix}HpText`,  'innerText',   `${stats.hp} / ${stats.maxHp} HP`);
        this._setText(`${prefix}Wpm`,     'innerText',   stats.wpm);
        this._setText(`${prefix}Acc`,     'innerText',   stats.accuracy);
        this._setText(`${prefix}SuperBar`, 'style.width', `${stats.superMeter}%`);
        this._setText(`${prefix}SuperText`, 'innerText',
            stats.superActive ? 'SUPER READY!' : `SUPER: ${stats.superMeter}%`);

        // ── Combo badge — only shown for player 1 ────────────────────────────
        if (prefix === 'p1') {
            const badge = this._el('p1ComboBadge');
            if (badge) {
                if (stats.combo >= 2) {
                    // v28: Fire effect at 10+ combo
                    const isOnFire = stats.combo >= 10;
                    badge.innerText = isOnFire
                        ? `🔥 COMBO x${stats.combo} ON FIRE!`
                        : `COMBO x${stats.combo}`;
                    badge.classList.toggle('combo-on-fire', isOnFire);
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                    badge.classList.remove('combo-on-fire');
                }
            }

            // v28: Rage mode indicator — pulsing red border on word display
            const wordCard = document.querySelector('.typing-word-card');
            if (wordCard) {
                const isRage = stats.hp > 0 && (stats.hp / stats.maxHp) < 0.30;
                wordCard.classList.toggle('rage-mode-active', isRage);
            }
        }
    }

    // ── PLAYER PANEL SETUP ────────────────────────────────────────────────────

    /**
     * Configure a player's name / avatar panel and sync the renderer fighter color.
     *
     * @param {1|2}    playerNum
     * @param {string} name      - Display name (HTML-escaped before insertion)
     * @param {string} avatar    - SVG markup from ICONS
     * @param {string} color     - CSS hex color string
     */
    setupPlayerPanel(playerNum, name, avatar, color) {
        if (playerNum === 1) {
            this._setText('p1Name', 'innerText', this._esc(name));
            if (this.renderer) this.renderer.setFighterColor(1, color);
        } else {
            this._setText('p2Name',   'innerText', this._esc(name));
            this._setText('p2Avatar', 'innerHTML', avatar);
            if (this.renderer) this.renderer.setFighterColor(2, color);
        }
    }

    // ── CAMPAIGN GRID ─────────────────────────────────────────────────────────

    /**
     * Render the 5-column campaign stage selection grid.
     *
     * @param {Object[]} levels        - CONFIG.CAMPAIGN_LEVELS array
     * @param {number}   unlockedLevel - Highest level the player may select
     * @param {Function} onLevelClick  - Called with (levelNum) when a stage card is tapped
     */
    renderCampaignGrid(levels, unlockedLevel, onLevelClick) {
        const grid = this._el('campaignGrid');
        if (!grid) return;
        grid.innerHTML = '';

        levels.forEach(lvl => {
            const isUnlocked = lvl.level <= unlockedLevel;
            const isCleared  = lvl.level <  unlockedLevel;

            // ── NEW v28: Personal best WPM from localStorage ──────────────────
            const bestWpm = isCleared
                ? (parseInt(localStorage.getItem(`tf_best_wpm_lvl_${lvl.level}`)) || 0)
                : 0;
            const bestBadge = bestWpm > 0
                ? `<span class="level-best-wpm">🏆 Best: ${bestWpm} WPM</span>`
                : '';

            let badge = `<span class="level-status-badge status-locked">${ICONS.lock} LOCKED</span>`;
            if (isCleared)       badge = `<span class="level-status-badge status-cleared">${ICONS.star} CLEARED</span>`;
            else if (isUnlocked) badge = `<span class="level-status-badge status-unlocked">${ICONS.unlocked} UNLOCKED</span>`;

            const card = document.createElement('div');
            card.className = `level-card ${isUnlocked ? '' : 'locked'}`;
            card.innerHTML = `
                <div class="level-num">STAGE ${lvl.level}</div>
                <div class="level-avatar">${lvl.avatar}</div>
                <h4>${this._esc(lvl.name)}</h4>
                <div class="level-wpm">${lvl.baseWPM} WPM | ${lvl.maxHp} HP</div>
                ${badge}
                ${bestBadge}
            `;
            if (isUnlocked) card.onclick = () => onLevelClick(lvl.level);
            grid.appendChild(card);
        });
    }

    // ── GAME-OVER MODAL ───────────────────────────────────────────────────────

    /**
     * Populate the game-over result modal with match statistics and rank.
     *
     * @param {number} winner      - 1 = Player 1 won, 2 = Player 2 won
     * @param {Object} combatState - CombatEngine instance
     * @param {string} stageRank   - Pre-computed rank string e.g. "⚡ S-RANK"
     */
    populateGameOver(winner, combatState, stageRank) {
        const isWin = winner === 1;

        if (combatState.mode === 'arcade') {
            if (isWin) {
                const isLast = combatState.currentLevel >= CONFIG.CAMPAIGN_LEVELS.length;
                this._setText('winnerTitle',    'innerText', `STAGE ${combatState.currentLevel} CLEARED!`);
                this._setText('winnerSubtitle', 'innerText', isLast
                    ? 'CONGRATULATIONS! YOU DEFEATED ALL 25 CAMPAIGN BOSSES!'
                    : `Target ${combatState.bot.baseWPM} WPM Passed! Stage ${combatState.currentLevel + 1} Unlocked!`);
                this._el('btnNextLevel')?.classList.remove('hidden');
            } else {
                if (combatState.lastDefeatReason?.startsWith('WPM_TOO_LOW')) {
                    const req = combatState.lastDefeatReason.split(':')[1];
                    this._setText('winnerTitle',    'innerText', `STAGE ${combatState.currentLevel} FAILED!`);
                    this._setText('winnerSubtitle', 'innerText',
                        `Speed was ${combatState.p1.wpm} WPM — required ${req} WPM to pass this stage!`);
                } else {
                    this._setText('winnerTitle',    'innerText', 'DEFEAT! HEALTH DEPLETED!');
                    this._setText('winnerSubtitle', 'innerText', 'Keep practicing your typing speed!');
                }
                this._el('btnNextLevel')?.classList.add('hidden');
            }
        } else {
            this._setText('winnerTitle', 'innerText',
                isWin ? 'VICTORY! YOU WIN!' : 'DEFEAT! OPPONENT WON!');
            this._setText('winnerSubtitle', 'innerText',
                isWin ? 'Sensational typing speed & precision!' : 'Keep practicing your typing speed!');
            this._el('btnNextLevel')?.classList.add('hidden');
        }

        const titleEl = this._el('winnerTitle');
        if (titleEl) titleEl.style.color = isWin ? '#00f0ff' : '#ff0055';

        const p1 = combatState.p1;
        this._setText('statWpm',   'innerHTML', `${p1.wpm} <span class="unit">WPM</span>`);
        this._setText('statAcc',   'innerHTML', `${p1.accuracy}<span class="unit">%</span>`);
        this._setText('statCombo', 'innerText', `${p1.maxCombo}x`);
        this._setText('statRank',  'innerHTML', isWin ? stageRank : `${ICONS.cross} NO RANK`);
    }

    // ── P2P LOBBY PANEL ───────────────────────────────────────────────────────

    /**
     * Fill the P2P rematch lobby with post-game results and player identity.
     *
     * @param {boolean} isWin
     * @param {Object}  p1Stats - Player-1 stat block
     * @param {string}  myName  - Local player's display name
     */
    populateP2PLobby(isWin, p1Stats, myName) {
        this._setText('p2pLobbyResultIcon', 'innerText', isWin ? '🏆' : '💀');

        const title = this._el('p2pLobbyTitle');
        if (title) {
            title.innerText    = isWin ? 'VICTORY!' : 'DEFEAT!';
            title.style.color  = isWin ? 'var(--neon-cyan)' : '#ff0055';
        }

        this._setText('p2pLobbySubtitle', 'innerText', isWin
            ? `You outtyped your friend! WPM: ${p1Stats.wpm}`
            : `Friend was faster this time! WPM: ${p1Stats.wpm}`);

        this._setText('p2pStatWpm',   'innerText', p1Stats.wpm);
        this._setText('p2pStatAcc',   'innerText', `${p1Stats.accuracy}%`);
        this._setText('p2pStatCombo', 'innerText', `${p1Stats.maxCombo}x`);
        this._setText('p2pMyName',    'innerText', myName);
    }

    /**
     * Update a player's ready-state card in the P2P lobby.
     *
     * @param {'my'|'opp'} who
     * @param {boolean}    isReady
     */
    updateReadyCard(who, isReady) {
        const cardId   = who === 'my' ? 'p2pMyReadyCard'   : 'p2pOpponentReadyCard';
        const statusId = who === 'my' ? 'p2pMyStatus'      : 'p2pOpponentStatus';
        const card     = this._el(cardId);
        const status   = this._el(statusId);
        if (!card || !status) return;
        card.className  = `ready-player-card ${isReady ? 'is-ready' : 'not-ready'}`;
        status.innerText = isReady ? '✅ READY!' : (who === 'my' ? 'NOT READY' : 'WAITING...');
    }

    // ── PRIVATE UTILITIES ─────────────────────────────────────────────────────

    /** @private Safely get element by ID */
    _el(id) {
        return document.getElementById(id);
    }

    /**
     * @private
     * Set a property on an element, supporting dot-notation for nested props
     * such as 'style.width'.
     *
     * @param {string} id
     * @param {string} prop
     * @param {string} val
     */
    _setText(id, prop, val) {
        const el = this._el(id);
        if (!el) return;
        const parts = prop.split('.');
        if (parts.length === 2) el[parts[0]][parts[1]] = val;
        else                    el[prop] = val;
    }

    /**
     * @private
     * Escape user-supplied text before inserting into innerHTML.
     * @param {string} str
     * @returns {string}
     */
    _esc(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, m =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }
}
