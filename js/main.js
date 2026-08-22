/**
 * @fileoverview GameApp — Main Application Controller
 *
 * Orchestrates all subsystems of Typing Fighter:
 *   ┌─────────────┐  ┌───────────────┐  ┌──────────────┐
 *   │  WordEngine  │  │   UIManager   │  │ ArenaRenderer│
 *   └──────┬──────┘  └──────┬────────┘  └──────┬───────┘
 *          │                │                   │
 *          └────────────────▼───────────────────┘
 *                     GameApp (this file)
 *          ┌─────────────────────────────────────────┐
 *          │ CombatEngine · SoundEngine · AuthManager │
 *          │ P2PNetwork   · CONFIG · ICONS            │
 *          └─────────────────────────────────────────┘
 *
 * External API (called from HTML inline handlers):
 *   game.handleGuestLogin()         game.startArcadeLevel(n)
 *   game.startLocal2PMode()         game.startStickmanMode()
 *   game.pauseMatch()               game.resumeMatch()
 *   game.restartMatch()             game.playNextLevel()
 *   game.toggleSound()              game.toggleMic()
 *   game.toggleFighterSkin()        game.openAuthModal()
 *   game.handleMobileLogin()        game.handleMobileRegister()
 *   game.openP2PModal()             game.closeP2PModal()
 *   game.openCampaignModal()        game.closeCampaignModal()
 *   game.handleUnifiedP2PConnect()  game.toggleP2PReady()
 *   game.p2pShareCustomText()       game.leaveP2PRoom()
 *   game.confirmContentMode(mode)   game.openCustomScriptModal()
 *   game.closeCustomScriptModal()   game.saveAndStartCustomScript()
 *   game.closeContentChoiceModal()  game.showMainMenu()
 *
 * @module GameApp
 */

'use strict';

class GameApp {

    constructor() {
        // ── Subsystem references (set in _init) ───────────────────────────────
        /** @type {ArenaRenderer} */   this.renderer  = null;
        /** @type {WordEngine} */      this.words     = null;
        /** @type {UIManager} */       this.ui        = null;

        // ── Match state ───────────────────────────────────────────────────────
        this.isMatchActive   = false;
        this.isMatchPaused   = false;
        this.matchSeconds    = 0;
        this.matchTimerInterval = null;

        /**
         * Closure stored between openContentChoiceModal and the actual game start.
         * Executed when the player selects their content mode.
         * @type {Function|null}
         */
        this.pendingGameStart = null;

        /**
         * Fighter skin kept across restarts so stickman mode is preserved.
         * @type {'cyber'|'stickman'}
         */
        this.activeSkin = 'cyber';

        // ── Anti-cheat keystroke throttle ─────────────────────────────────────
        /** Minimum milliseconds between accepted keystrokes (≈55 keys/sec max) */
        this.minKeystrokeDeltaMs = 18;
        this.lastKeystrokeTime   = 0;

        // ── P2P ready-up state ────────────────────────────────────────────────
        this.p2pMyReady       = false;
        this.p2pOpponentReady = false;
        this.p2pCountdownTimer = null;

        // ── Cached DOM references ─────────────────────────────────────────────
        this.typeInput       = document.getElementById('typeInput');
        this.wordDisplay     = document.getElementById('wordDisplay');
        this.superReadyBanner = document.getElementById('superReadyBanner');
        this.scriptTextarea  = document.getElementById('customScriptTextarea');

        this._init();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // I. INITIALISATION
    // ═══════════════════════════════════════════════════════════════════════════

    _init() {
        this._runLoadingScreen();

        // Instantiate subsystems in dependency order
        this.renderer = new ArenaRenderer('gameCanvas');
        this.words    = new WordEngine();
        this.ui       = new UIManager(this.renderer);

        // Restore saved custom script from previous session
        const savedScript = localStorage.getItem('tf_custom_script');
        if (savedScript && this.scriptTextarea) {
            this.scriptTextarea.value = savedScript;
        }

        // Attach input listeners
        this._setupKeyboardListeners();
        this._setupMobileViewport();
        this._setupCanvasFocusTrap();

        // Initialise audio context on first user gesture
        window.addEventListener('pointerdown', () => audio.init(), { once: true });

        // Wire up header buttons
        document.getElementById('btnSoundToggle')?.addEventListener('click', () => this.toggleSound());
        document.getElementById('btnConnectP2P')?.addEventListener('click', () => this.handleUnifiedP2PConnect());
        document.getElementById('btnOpenP2P')?.addEventListener('click', () => this.openP2PModal());
        document.getElementById('btnOpenArcade')?.addEventListener('click', () => this.openCampaignModal());

        // Auth screen tab switchers
        this._setupAuthTabs();

        // Combat engine hooks into game-over handler
        combat.onGameOverCallback = winner => this.handleGameOver(winner);

        // P2P network event callbacks
        this._setupP2PCallbacks();

        // Start canvas render loop (60 FPS)
        const loop = () => {
            this.renderer.render();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);

        // Always show the main menu first. Auth is optional — users can play
        // as Guest right away. The auth modal is only shown if they explicitly
        // open it (or when they log out). If a session is already stored, also
        // update the header to show their name/level.
        if (auth.currentUser) {
            this._updateUserHeader();
        }
        this.ui.showModal('modalStart');
    }

    _runLoadingScreen() {
        const bar    = document.getElementById('loadingBar');
        const screen = document.getElementById('loadingScreen');
        if (!bar || !screen) return;

        let pct = 0;
        const interval = setInterval(() => {
            pct += 25;
            bar.style.width = `${pct}%`;
            if (pct >= 100) {
                clearInterval(interval);
                setTimeout(() => screen.classList.add('fade-out'), 300);
            }
        }, 80);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // II. INPUT HANDLING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Global keyboard listener — handles shortcuts and routes game keystrokes.
     * Blocks synthetic (non-trusted) events for anti-cheat protection.
     * @private
     */
    _setupKeyboardListeners() {
        window.addEventListener('keydown', e => {
            // Never intercept events already destined for a text field
            if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;

            // ANTI-CHEAT: Reject programmatic / synthetic key events
            if (e.isTrusted === false) {
                console.warn('[ANTI-CHEAT] Synthetic keypress blocked.');
                return;
            }

            const key = e.key.toUpperCase();

            // ── Global shortcuts (always active) ──────────────────────────────
            if (key === 'M') { this.toggleSound(); return; }

            if (e.key === 'Escape' || key === 'P') {
                this.isMatchActive && !this.isMatchPaused ? this.pauseMatch() : this.resumeMatch();
                return;
            }

            // R / Space — only restart when in-match, paused, or on the game-over screen.
            // Do NOT fire while campaign grid, content-choice, or other menus are open,
            // as that would wipe pendingGameStart and close the campaign launch flow.
            if (key === 'R' || e.code === 'Space') {
                const gameOverOpen = !document.getElementById('modalGameOver')?.classList.contains('hidden');
                const pauseOpen    = !document.getElementById('modalPause')?.classList.contains('hidden');
                if (this.isMatchActive || this.isMatchPaused || gameOverOpen || pauseOpen) {
                    this.restartMatch();
                }
                return;
            }

            if (!this.isMatchActive || this.isMatchPaused) return;

            // ── ANTI-CHEAT: rate-limit accepted keystrokes ────────────────────
            const now = Date.now();
            if (now - this.lastKeystrokeTime < this.minKeystrokeDeltaMs) return;
            this.lastKeystrokeTime = now;

            // Prevent spacebar page scroll during gameplay
            if (e.code === 'Space') e.preventDefault();

            // Accept printable characters and spacebar
            if (e.key === ' ' || (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)) {
                this._processTypedKey(e.key);
            }
        });

        // Mobile: hidden input receives virtual keyboard input
        if (this.typeInput) {
            this.typeInput.addEventListener('input', () => {
                if (!this.isMatchActive || this.isMatchPaused) return;
                const val = this.typeInput.value;
                if (val.length > 0) {
                    this._processTypedKey(val[val.length - 1]);
                    this.typeInput.value = '';
                }
            });
            this.typeInput.addEventListener('paste', e => e.preventDefault());
        }
    }

    /**
     * Tap on canvas or typing card focuses the hidden input (triggers virtual keyboard).
     * @private
     */
    _setupCanvasFocusTrap() {
        const focus = () => {
            if (this.typeInput && this.isMatchActive && !this.isMatchPaused) {
                this.typeInput.focus();
            }
        };
        document.querySelector('.canvas-container')?.addEventListener('click', focus);
        document.querySelector('.canvas-container')?.addEventListener('touchstart', focus, { passive: true });
        document.querySelector('.typing-word-card')?.addEventListener('click', focus);
        document.querySelector('.typing-word-card')?.addEventListener('touchstart', focus, { passive: true });
    }

    /**
     * Detect virtual keyboard open/close via visualViewport on mobile devices.
     * Adds/removes body.keyboard-open CSS class that CSS uses for layout reflow.
     * @private
     */
    _setupMobileViewport() {
        if (!window.visualViewport) return;
        let baseHeight = window.visualViewport.height;
        let timer = null;

        window.visualViewport.addEventListener('resize', () => {
            clearTimeout(timer);
            const diff = baseHeight - window.visualViewport.height;

            if (diff > 120) {
                // Keyboard opened — shrink canvas container via CSS
                document.body.classList.add('keyboard-open');
                timer = setTimeout(() => {
                    document.querySelector('.typing-box-container')?.scrollIntoView({
                        behavior: 'smooth', block: 'end'
                    });
                }, 100);
            } else {
                document.body.classList.remove('keyboard-open');
                baseHeight = window.visualViewport.height;
            }
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                baseHeight = window.visualViewport.height;
                document.body.classList.remove('keyboard-open');
            }, 500);
        });
    }

    /**
     * Validate and process a single typed character against the current word.
     * Correct keystroke → progress word; word complete → fire player attack.
     * Wrong keystroke  → display typo shake, break combo.
     * @private
     * @param {string} key - The pressed character
     */
    _processTypedKey(key) {
        const expected = this.words.currentWord[this.words.typedCharIndex];
        if (!expected) return;

        const isCorrect = key.toLowerCase() === expected.toLowerCase()
            || (key === ' ' && expected === ' ');

        if (isCorrect) {
            combat.registerKey(1, true);
            audio.playKeyPress();

            // Per-keystroke light attack animation for responsive feel
            this.renderer.triggerAttack(1, 'light');
            this.renderer.spawnHitSparks(this.renderer.f2.x, this.renderer.f2.y - 50, '#00f0ff', 'light');

            this.words.typedCharIndex++;

            // Broadcast keystroke progress to P2P opponent
            if (p2p.isConnected) {
                p2p.send('KEYSTROKE', { charIndex: this.words.typedCharIndex });
            }

            if (this.words.typedCharIndex >= this.words.currentWord.length) {
                // Full word completed — execute heavy attack
                this._executePlayerAttack(1, this.words.currentWord);
                this._generateNextWord();
            } else {
                this.words.renderDisplay(this.wordDisplay);
            }
        } else {
            // Wrong key — typo feedback
            combat.registerKey(1, false);
            audio.playError();

            const span = this.wordDisplay?.children[this.words.typedCharIndex];
            if (span) {
                span.classList.add('char-error');
                setTimeout(() => span.classList.remove('char-error'), 250);
            }
        }

        this.ui.updateHUD(combat.p1, combat.p2);
    }

    /**
     * Execute a word-completion attack: compute damage via combat engine,
     * trigger renderer animation, play audio, and broadcast over P2P.
     * @private
     * @param {1|2}   playerNum
     * @param {string} word
     */
    _executePlayerAttack(playerNum, word) {
        const attack   = combat.processWordCompletion(playerNum, word);
        const attacker = playerNum === 1 ? this.renderer.f1 : this.renderer.f2;
        const defender = playerNum === 1 ? this.renderer.f2 : this.renderer.f1;

        // ── Attack animation type ─────────────────────────────────────────────
        const attackType = attack.isSuper   ? 'super'
            : attack.isCritical             ? 'heavy'  // critical = heavy hit anim
            : attack.isHeavy                ? 'heavy'
            :                                 'light';

        this.renderer.triggerAttack(playerNum, attackType);

        // ── Audio feedback ────────────────────────────────────────────────────
        if (attack.isSuper)           audio.playSuper();
        else if (attack.isCritical)   audio.playKick();
        else if (attack.isHeavy)      audio.playKick();
        else                          audio.playPunch();
        if (attack.combo > 1)         audio.playCombo(attack.combo);

        // ── Floating damage text ──────────────────────────────────────────────
        let dmgText, dmgColor, dmgSize;

        if (attack.isSuper) {
            dmgText  = `⚡ SUPER! -${attack.damage}`;
            dmgColor = '#ffe600';
            dmgSize  = 34;
            this.renderer.spawnHitSparks(defender.x, defender.y - 60, '#ffe600', 'super');

        } else if (attack.isCritical) {
            dmgText  = `💥 CRITICAL! -${attack.damage}`;
            dmgColor = '#ff8800';
            dmgSize  = 30;
            // Extra orange sparks at the attacker to show the burst
            this.renderer.spawnHitSparks(attacker.x, attacker.y - 40, '#ff8800', 'heavy');
            this.renderer.spawnHitSparks(defender.x, defender.y - 60, '#ff8800', 'heavy');

        } else if (attack.isRage) {
            dmgText  = `🔥 RAGE! -${attack.damage}`;
            dmgColor = '#ff2222';
            dmgSize  = 28;
            this.renderer.triggerShake(5, 10);

        } else {
            dmgText  = `-${attack.damage} HP`;
            dmgColor = playerNum === 1 ? '#00f0ff' : '#ff0055';
            dmgSize  = 26;
        }

        this.renderer.addFloatingText(defender.x, defender.y - 70, dmgText, dmgColor, dmgSize);

        // ── NEW v28: Combo Heal visual ────────────────────────────────────────
        if (attack.healed > 0) {
            this.renderer.addFloatingText(
                attacker.x, attacker.y - 90,
                `💚 +${attack.healed} HP!`, '#00ff88', 24
            );
        }

        // ── P2P broadcast ─────────────────────────────────────────────────────
        if (p2p.isConnected && playerNum === 1) {
            p2p.send('ATTACK_COMPLETED', {
                word:       word,
                damage:     attack.damage,
                isSuper:    attack.isSuper,
                combo:      attack.combo
            });
        }

        this.ui.updateHUD(combat.p1, combat.p2);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // III. WORD GENERATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Pick the next word and refresh the typing display.
     * Super banner visibility is also toggled here.
     * @private
     */
    _generateNextWord() {
        const difficulty = combat.bot?.difficulty || 'Medium';
        this.words.nextWord(difficulty, combat.p1.superActive);
        this.words.renderDisplay(this.wordDisplay);

        // Super-move banner
        if (this.superReadyBanner) {
            this.superReadyBanner.classList.toggle('hidden', !combat.p1.superActive);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IV. MATCH LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Begin a match: activate timers, reset word engine, focus keyboard.
     * @private — called only after pendingGameStart() sets up the combat state.
     */
    _startMatch() {
        this.isMatchActive  = true;
        this.isMatchPaused  = false;
        this.matchSeconds   = 0;
        this.lastKeystrokeTime = Date.now();

        if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);
        this.matchTimerInterval = setInterval(() => {
            if (!this.isMatchActive || this.isMatchPaused) return;
            this.matchSeconds++;
            const mm = String(Math.floor(this.matchSeconds / 60)).padStart(2, '0');
            const ss = String(this.matchSeconds % 60).padStart(2, '0');
            const el = document.getElementById('matchTime');
            if (el) el.innerText = `${mm}:${ss}`;
        }, 1000);

        this.words.reset();
        this._generateNextWord();
        this.ui.updateHUD(combat.p1, combat.p2);

        if (this.typeInput) {
            this.typeInput.value = '';
            this.typeInput.focus();
        }
    }

    pauseMatch() {
        if (!this.isMatchActive) { this.showMainMenu(); return; }
        this.isMatchPaused = true;
        combat.stopAI();
        this.ui.showModal('modalPause');
    }

    resumeMatch() {
        if (!this.isMatchActive) return;
        this.isMatchPaused = false;
        this.ui.hideModal('modalPause');

        if (combat.mode === 'arcade') {
            combat.startAI(aiHit => this._handleAIAttack(aiHit));
        }
        this.typeInput?.focus();
    }

    /**
     * Restart the current match instantly — same mode, same skin, same content settings.
     * Does NOT re-open the content-choice modal so the R-key / Space shortcut feels snappy.
     */
    restartMatch() {
        this.ui.hideModal('modalGameOver');
        this.ui.hideModal('modalPause');

        if (combat.mode === 'arcade') {
            // Restart the same level directly using the SAME content mode (skip content choice modal)
            // This makes R / Space feel snappy — no extra click needed
            const lvl        = combat.currentLevel;
            const prevContent = this.words.contentMode;
            const prevCustom  = [...this.words.customScriptWords];

            this.ui.closeAllModals();
            this.renderer.setSkinMode('cyber');
            combat.reset('arcade', lvl);

            document.getElementById('stageBadge').innerText = `STAGE ${lvl}/25`;
            this.ui.setupPlayerPanel(1, auth.currentUser?.name || 'HERO',  ICONS.lightning, '#00f0ff');
            this.ui.setupPlayerPanel(2, combat.bot.name, combat.bot.avatar, combat.bot.color);

            // Restore previous content mode (words / custom) without re-asking
            this.words.contentMode       = prevContent;
            this.words.customScriptWords = prevCustom;
            this.words.customScriptIndex = 0;

            this._startMatch();
            combat.startAI(aiHit => this._handleAIAttack(aiHit));
            this.ui.showToast(`Stage ${lvl} Restarted!`, 'info', 1500);
            return;
        }

        // Local / Stickman / P2P: reset combat and restart directly (no modal flow)
        const prevMode    = combat.mode;
        const prevSkin    = this.activeSkin;
        const prevContent = this.words.contentMode;
        const prevCustom  = [...this.words.customScriptWords];

        combat.reset(prevMode);
        this.renderer.setSkinMode(prevSkin);

        // Restore content mode from previous match
        this.words.contentMode       = prevContent;
        this.words.customScriptWords = prevCustom;
        this.words.customScriptIndex = 0;

        if (prevSkin === 'stickman') {
            document.getElementById('stageBadge').innerText = '⚡ STICKMAN CLASH';
            this.ui.setupPlayerPanel(1, auth.currentUser?.name || 'STICKMAN 1', ICONS.stickman, '#00f0ff');
            this.ui.setupPlayerPanel(2, 'STICKMAN 2', ICONS.stickman, '#ff0055');
        } else if (prevMode === 'local2p') {
            document.getElementById('stageBadge').innerText = '1v1 LOCAL';
            this.ui.setupPlayerPanel(1, auth.currentUser?.name || 'PLAYER 1', ICONS.lightning, '#00f0ff');
            this.ui.setupPlayerPanel(2, 'PLAYER 2', ICONS.fire, '#ff0055');
        } else {
            // P2P or fallback
            document.getElementById('stageBadge').innerText = 'P2P ONLINE';
            this.ui.setupPlayerPanel(1, auth.currentUser?.name || 'HERO (YOU)', ICONS.lightning, '#00f0ff');
            this.ui.setupPlayerPanel(2, 'FRIEND (ONLINE)', ICONS.globe, '#ff0055');
        }

        this.ui.closeAllModals();
        this._startMatch();
        this.ui.showToast('Match Restarted!', 'info', 1500);
    }

    playNextLevel() {
        this.ui.hideModal('modalGameOver');
        if (combat.currentLevel < CONFIG.CAMPAIGN_LEVELS.length) {
            this.startArcadeLevel(combat.currentLevel + 1);
        } else {
            this.openCampaignModal();
        }
    }

    // ── AI ATTACK HANDLER ──────────────────────────────────────────────────────

    /**
     * Invoked by CombatEngine's AI timer on each AI attack tick.
     * @private
     * @param {{ attackType: string, damage: number, botName: string }} aiHit
     */
    _handleAIAttack(aiHit) {
        this.renderer.triggerAttack(2, aiHit.attackType);
        this.renderer.addFloatingText(
            this.renderer.f1.x, this.renderer.f1.y - 70,
            `-${aiHit.damage} HP`, '#ff0055', 26
        );
        audio.playPunch();
        this.ui.updateHUD(combat.p1, combat.p2);
    }

    // ── GAME OVER ─────────────────────────────────────────────────────────────

    /** Called by combat.onGameOverCallback */
    handleGameOver(winner) {
        this.isMatchActive  = false;
        this.isMatchPaused  = false;
        if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);

        if (winner === 1) audio.playVictory();
        else              audio.playDefeat();

        // Persist progress for registered players
        if (auth.currentUser) {
            auth.updateProgress(combat.unlockedLevel, combat.p1.wpm, winner === 1);
            this._updateUserHeader();
        }

        // ── NEW v28: Save personal best WPM for this level ────────────────────
        if (combat.mode === 'arcade' && winner === 1 && combat.p1.wpm > 0) {
            const lvl     = combat.currentLevel;
            const key     = `tf_best_wpm_lvl_${lvl}`;
            const oldBest = parseInt(localStorage.getItem(key)) || 0;
            if (combat.p1.wpm > oldBest) {
                localStorage.setItem(key, combat.p1.wpm);
                if (oldBest > 0) {
                    this.ui.showToast(
                        `🏆 New Personal Best! Stage ${lvl}: ${combat.p1.wpm} WPM (was ${oldBest})`,
                        'success', 4000
                    );
                }
            }
        }

        // P2P mode: show lobby for rematch instead of standard game-over screen
        if (combat.mode === 'p2p' && p2p.isConnected) {
            this._openP2PLobby(winner);
            return;
        }

        const targetWPM  = combat.bot?.baseWPM || 15;
        const stageRank  = this._calculateRank(combat.p1.wpm, combat.p1.accuracy, targetWPM);

        this.ui.populateGameOver(winner, combat, stageRank);
        this.ui.showModal('modalGameOver');
    }

    /**
     * @private
     * @param {number} wpm
     * @param {number} acc
     * @param {number} target
     * @returns {string}
     */
    _calculateRank(wpm, acc, target) {
        if (wpm >= target + 15 && acc >= 95) return `${ICONS.lightning} S-RANK`;
        if (wpm >= target +  8 && acc >= 90) return `${ICONS.fire} A-RANK`;
        if (wpm >= target       && acc >= 85) return `${ICONS.shield} B-RANK`;
        return `${ICONS.fist} C-RANK`;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // V. GAME MODES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Start a Campaign (Arcade) stage against a bot opponent.
     * Starts IMMEDIATELY — no content-choice modal, no pendingGameStart closure.
     * Campaign always uses the current words.contentMode (defaults to 'words').
     * This eliminates the intermittent "kabhi kabhi nahi khulta" bug caused by
     * R-key firing while the content-choice modal was open (wiped the closure).
     *
     * If the user has no session, a "Guest Warrior" session is auto-created.
     * @param {number} levelNum - 1-based stage number (1–25)
     */
    startArcadeLevel(levelNum = 1) {
        if (!auth.currentUser) {
            auth.loginAsGuest('Guest Warrior', 18);
            this._updateUserHeader();
        }

        if (levelNum > combat.unlockedLevel) {
            this.ui.showToast(`Stage ${levelNum} is still locked! Clear previous stages first.`, 'error', 3000);
            return;
        }

        // Direct start — no intermediate modal, no closure needed
        this.activeSkin = 'cyber';
        this.ui.closeAllModals();
        this.renderer.setSkinMode('cyber');
        combat.reset('arcade', levelNum);

        document.getElementById('stageBadge').innerText = `STAGE ${levelNum}/25`;
        this.ui.setupPlayerPanel(1, auth.currentUser.name,  ICONS.lightning, '#00f0ff');
        this.ui.setupPlayerPanel(2, combat.bot.name, combat.bot.avatar, combat.bot.color);

        this._startMatch();
        combat.startAI(aiHit => this._handleAIAttack(aiHit));
    }

    /** Start a local 2-player match (same device, same keyboard) */
    startLocal2PMode() {
        this.activeSkin = 'cyber';
        this.pendingGameStart = () => {
            this.ui.closeAllModals();
            this.renderer.setSkinMode('cyber');
            combat.reset('local2p');

            document.getElementById('stageBadge').innerText = '1v1 LOCAL';
            this.ui.setupPlayerPanel(1, auth.currentUser?.name || 'PLAYER 1', ICONS.lightning, '#00f0ff');
            this.ui.setupPlayerPanel(2, 'PLAYER 2', ICONS.fire, '#ff0055');
            this._startMatch();
        };

        this._openContentChoiceModal();
    }

    /**
     * Start the ⚡ STICKMAN CLASH mode — close-quarters stickman fighters,
     * air-launch physics, and ragdoll knockback.
     */
    startStickmanMode() {
        this.activeSkin = 'stickman';
        this.pendingGameStart = () => {
            this.ui.closeAllModals();
            this.renderer.setSkinMode('stickman');
            combat.reset('local2p');

            document.getElementById('stageBadge').innerText = '⚡ STICKMAN CLASH';
            this.ui.setupPlayerPanel(1, auth.currentUser?.name || 'STICKMAN 1', ICONS.stickman, '#00f0ff');
            this.ui.setupPlayerPanel(2, 'STICKMAN 2', ICONS.stickman, '#ff0055');
            this._startMatch();
            this.ui.showToast('⚡ Stickman Clash! Type fast to punch harder!', 'success', 4000);
        };

        this._openContentChoiceModal();
    }

    /**
     * Bring up the mobile virtual keyboard by programmatically focusing the
     * hidden input element.  Called from onclick handlers on the typing card
     * and the "⌨ Tap to Type" button in the mobile layout.
     */
    focusMobileKeyboard() {
        if (!this.typeInput) return;
        this.typeInput.focus();
        this.typeInput.click();
        document.querySelector('.typing-word-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    toggleFighterSkin(forceSkin = null) {
        if (!this.renderer) return;
        const next = forceSkin || (this.renderer.fighterSkin === 'cyber' ? 'stickman' : 'cyber');
        this.activeSkin = next;
        this.renderer.setSkinMode(next);

        const btn = document.getElementById('btnSkinToggle');
        if (btn) {
            btn.innerHTML    = next === 'stickman' ? `${ICONS.stickman} Fighter: STICKMAN` : 'Fighter: CYBER';
            btn.style.color  = next === 'stickman' ? 'var(--neon-yellow)' : 'var(--neon-cyan)';
        }
        this.ui.showToast(
            next === 'stickman' ? '⚡ STICKMAN Fighter Activated!' : 'CYBER Fighter Activated!',
            'success'
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VI. SOUND & HUD CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════

    toggleSound() {
        audio.muted = !audio.muted;
        const btn = document.getElementById('btnSoundToggle');
        if (btn) btn.innerHTML = audio.muted
            ? `${ICONS.volumeOff} Sound: OFF`
            : `${ICONS.volumeOn} Sound: ON`;
        this.ui.showToast(audio.muted ? 'Audio Muted' : 'Audio Enabled', 'info', 1500);
    }

    toggleMic() {
        const isEnabled = p2p.toggleMic();
        const btn = document.getElementById('btnMicToggle');
        if (btn) {
            btn.innerHTML   = isEnabled ? `${ICONS.micOn} Mic: ON` : `${ICONS.micOff} Mic: MUTED`;
            btn.style.color = isEnabled ? 'var(--neon-cyan)' : '#ff0055';
        }
        this.ui.showToast(isEnabled ? 'Microphone Unmuted' : 'Microphone Muted', isEnabled ? 'success' : 'info');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VII. AUTH FLOW
    // ═══════════════════════════════════════════════════════════════════════════

    _setupAuthTabs() {
        const tabs = { tabGuest: 'authGuestSection', tabRegister: 'authRegisterSection', tabLogin: 'authLoginSection' };

        Object.keys(tabs).forEach(tabId => {
            const tabEl = document.getElementById(tabId);
            if (!tabEl) return;
            tabEl.addEventListener('click', () => {
                // Deactivate all tabs and hide all sections
                Object.keys(tabs).forEach(t => {
                    document.getElementById(t)?.classList.remove('active');
                    document.getElementById(tabs[t])?.classList.add('hidden');
                });
                // Activate the clicked tab
                tabEl.classList.add('active');
                document.getElementById(tabs[tabId])?.classList.remove('hidden');
            });
        });
    }

    openAuthModal() {
        const statusEl = document.getElementById('authStatus');
        if (statusEl) statusEl.innerText = '';
        this.ui.showModal('modalAuth');
    }

    closeAuthModal() {
        this.ui.hideModal('modalAuth');
    }

    handleGuestLogin() {
        const name = document.getElementById('guestNameInput')?.value.trim();
        const age  = document.getElementById('guestAgeInput')?.value.trim();

        if (!name) { this.ui.showToast('Please enter your Player Name!', 'error'); return; }
        if (!age)  { this.ui.showToast('Please enter your Age!', 'error'); return; }

        const res = auth.loginAsGuest(name, age);
        if (res.success) {
            this._updateUserHeader();
            this.closeAuthModal();
            this.showMainMenu();
            this.ui.showToast(`Welcome Guest ${res.user.name}!`, 'success');
        }
    }

    handleMobileRegister() {
        const name   = document.getElementById('regNameInput')?.value;
        const age    = document.getElementById('regAgeInput')?.value;
        const mobile = document.getElementById('regMobileInput')?.value;
        const pass   = document.getElementById('regPassInput')?.value;

        if (!name?.trim())   { this.ui.showToast('Please enter your Player Name!', 'error'); return; }
        if (!age?.trim())    { this.ui.showToast('Please enter your Age!', 'error'); return; }
        if (!mobile?.trim()) { this.ui.showToast('Please enter your Mobile Number!', 'error'); return; }
        if (!pass?.trim())   { this.ui.showToast('Please enter a Password!', 'error'); return; }

        const res = auth.registerWithMobile(name, age, mobile, pass);
        if (res.success) {
            this.ui.showToast('Account registered successfully!', 'success');
            this._updateUserHeader();
            this.closeAuthModal();
            this.showMainMenu();
        } else {
            this.ui.showToast(res.message, 'error');
        }
    }

    handleMobileLogin() {
        const mobile = document.getElementById('loginMobileInput')?.value;
        const pass   = document.getElementById('loginPassInput')?.value;

        if (!mobile?.trim() || !pass?.trim()) {
            this.ui.showToast('Please enter Mobile Number and Password!', 'error');
            return;
        }

        const res = auth.loginWithMobile(mobile, pass);
        if (res.success) {
            this.ui.showToast(`Welcome back ${res.user.name}!`, 'success');
            this._updateUserHeader();
            this.closeAuthModal();
            this.showMainMenu();
        } else {
            this.ui.showToast(res.message, 'error');
        }
    }

    /** @private Sync header name/level badge with auth.currentUser */
    _updateUserHeader() {
        if (!auth.currentUser) return;
        const lvl     = auth.currentUser.unlockedLevel || combat.unlockedLevel || 1;
        const typeTag = auth.currentUser.type === 'registered' ? 'Registered' : 'Guest';

        const nameEl = document.getElementById('headerUserName');
        const metaEl = document.getElementById('headerUserMeta');
        if (nameEl) nameEl.innerText = auth.currentUser.name;
        if (metaEl) metaEl.innerText = `${typeTag} | Age: ${auth.currentUser.age || 18} | Stage ${lvl}`;

        combat.unlockedLevel = lvl;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIII. P2P MULTIPLAYER & LOBBY
    // ═══════════════════════════════════════════════════════════════════════════

    /** @private Wire P2P network event callbacks */
    _setupP2PCallbacks() {
        // Both players connect → start battle immediately
        p2p.onConnectCallback = () => {
            this.ui.closeAllModals();
            this.renderer.setSkinMode('cyber');
            combat.reset('p2p');

            document.getElementById('stageBadge').innerText = 'P2P ONLINE';
            this.ui.setupPlayerPanel(1, auth.currentUser?.name || 'HERO (YOU)', ICONS.lightning, '#00f0ff');
            this.ui.setupPlayerPanel(2, 'FRIEND (ONLINE)', ICONS.globe, '#ff0055');
            this._startMatch();
            this.ui.showToast('P2P Online Battle Started! Type to Attack!', 'success');
        };

        // Incoming messages from P2P opponent
        p2p.onMessageCallback = ({ type, payload }) => {
            switch (type) {
                case 'KEYSTROKE':
                    // Guard: only process during an active, unpaused match
                    if (!this.isMatchActive || this.isMatchPaused) return;
                    this.renderer.triggerAttack(2, 'light');
                    break;

                case 'ATTACK_COMPLETED': {
                    // Guard: only process during an active, unpaused match
                    if (!this.isMatchActive || this.isMatchPaused) return;

                    // Damage is already hard-capped at 50 in p2p.js; double-check here
                    const validDamage = Math.min(payload.damage || 0, 50);
                    combat.p1.hp = Math.max(0, combat.p1.hp - validDamage);
                    this.renderer.triggerAttack(2, payload.isSuper ? 'super' : 'heavy');
                    audio.playPunch();
                    this.renderer.addFloatingText(
                        this.renderer.f1.x, this.renderer.f1.y - 70,
                        `-${validDamage} HP`, '#ff0055', 28
                    );
                    this.ui.updateHUD(combat.p1, combat.p2);
                    combat.checkGameOver();
                    break;
                }

                case 'P2P_READY':
                    this.setOpponentReady(true);
                    this.ui.showToast('Friend is READY! Click Ready Up to start!', 'success', 3000);
                    break;

                case 'P2P_UNREADY':
                    this.setOpponentReady(false);
                    if (this.p2pCountdownTimer) {
                        clearInterval(this.p2pCountdownTimer);
                        this.p2pCountdownTimer = null;
                        document.getElementById('p2pCountdown')?.classList.add('hidden');
                        this.ui.showToast('Friend cancelled ready. Waiting...', 'info', 2500);
                    }
                    break;

                case 'P2P_CUSTOM_TEXT': {
                    const ta = document.getElementById('p2pLobbyCustomText');
                    if (ta && payload.text) ta.value = payload.text;
                    const shareStatus = document.getElementById('p2pTextShareStatus');
                    if (shareStatus) shareStatus.innerHTML = `<span style="color:#00f0ff;">✅ Friend shared custom text!</span>`;
                    this.ui.showToast('Friend sent custom typing text!', 'info', 3500);
                    break;
                }
            }
        };

        // Friend disconnected
        p2p.onDisconnectCallback = msg => {
            this.ui.hideModal('modalP2PLobby');
            if (this.p2pCountdownTimer) {
                clearInterval(this.p2pCountdownTimer);
                this.p2pCountdownTimer = null;
            }
            this.ui.showToast(msg || 'Online friend disconnected.', 'error');
            this.showMainMenu();
        };
    }

    /**
     * Handle the unified "CONNECT & START BATTLE" P2P button.
     * Tries HOST first; falls back to GUEST if room already exists.
     */
    handleUnifiedP2PConnect() {
        const inputEl    = document.getElementById('inputUnifiedRoomCode');
        const statusDiv  = document.getElementById('p2pUnifiedStatus');
        const connectBtn = document.getElementById('btnConnectP2P');
        const code       = inputEl?.value.trim() || '';

        if (code.length < 2) {
            this.ui.showToast('Please type a Room Code (min 2 characters).', 'error');
            inputEl?.focus();
            return;
        }

        const clean = p2p.sanitizeInput(code).toUpperCase();
        if (!clean || clean.length < 2) {
            this.ui.showToast('Invalid Room Code. Use letters and numbers only.', 'error');
            return;
        }

        // Disable button to prevent duplicate submissions
        if (connectBtn) {
            connectBtn.disabled  = true;
            connectBtn.innerText = '⏳ Connecting...';
        }
        const resetBtn = () => {
            if (connectBtn) {
                connectBtn.disabled  = false;
                connectBtn.innerHTML = '⚡ CONNECT & START BATTLE';
            }
        };

        if (statusDiv) statusDiv.innerHTML = `<span class="spinner"></span> Registering Room <strong>"${clean}"</strong>...`;

        p2p.connectToRoom(
            clean,
            () => {
                // Guest connected successfully
                if (statusDiv) statusDiv.innerHTML = `<span style="color:#00ff88;font-weight:bold;">✅ CONNECTED! Starting battle...</span>`;
                this.ui.showToast(`Joined Room "${clean}"! Battle starting...`, 'success');
                resetBtn();
            },
            err => {
                if (statusDiv) statusDiv.innerHTML = `<span style="color:#ff0055;">❌ ${this._esc(err)}</span>`;
                this.ui.showToast(err, 'error');
                resetBtn();
            },
            waitingCode => {
                // We are HOST — waiting for friend to join
                if (statusDiv) statusDiv.innerHTML =
                    `🟢 Room <strong style="color:#00f0ff;">${waitingCode}</strong> is LIVE!<br>` +
                    `Tell your friend to enter <strong style="color:#ffe600;">${waitingCode}</strong> and click Connect!<br>` +
                    `<small style="opacity:0.7;">(Waiting for friend to join…)</small>`;
                this.ui.showToast(`Room "${waitingCode}" ready! Waiting for friend...`, 'info', 6000);
                if (connectBtn) {
                    connectBtn.disabled  = false;
                    connectBtn.innerHTML = '❌ Cancel / Change Code';
                }
            }
        );
    }

    // ── P2P REMATCH LOBBY ─────────────────────────────────────────────────────

    /** @private Open the post-game P2P rematch lobby */
    _openP2PLobby(winner) {
        this.p2pMyReady       = false;
        this.p2pOpponentReady = false;
        if (this.p2pCountdownTimer) {
            clearInterval(this.p2pCountdownTimer);
            this.p2pCountdownTimer = null;
        }

        const isWin  = winner === 1;
        const myName = auth.currentUser?.name?.toUpperCase() || 'YOU';

        this.ui.populateP2PLobby(isWin, combat.p1, myName);
        this.ui.updateReadyCard('my',  false);
        this.ui.updateReadyCard('opp', false);

        // Reset ready button to initial state
        const readyBtn = document.getElementById('btnP2PReady');
        if (readyBtn) {
            readyBtn.classList.remove('is-ready-state');
            readyBtn.innerHTML = '⚡ CLICK TO READY UP';
        }

        document.getElementById('p2pCountdown')?.classList.add('hidden');
        const ta = document.getElementById('p2pLobbyCustomText');
        if (ta) ta.value = '';
        const shareStatus = document.getElementById('p2pTextShareStatus');
        if (shareStatus) shareStatus.innerHTML = '';

        this.ui.closeAllModals();
        this.ui.showModal('modalP2PLobby');

        if (isWin) audio.playVictory();
        else        audio.playDefeat();
    }

    /** Toggle own ready state and broadcast to opponent */
    toggleP2PReady() {
        this.p2pMyReady = !this.p2pMyReady;
        this.ui.updateReadyCard('my', this.p2pMyReady);

        const btn = document.getElementById('btnP2PReady');
        if (this.p2pMyReady) {
            btn?.classList.add('is-ready-state');
            if (btn) btn.innerHTML = '✅ READY! (Click to Cancel)';
            p2p.send('P2P_READY', {});
            this.ui.showToast('You are READY! Waiting for friend...', 'success', 2500);
        } else {
            btn?.classList.remove('is-ready-state');
            if (btn) btn.innerHTML = '⚡ CLICK TO READY UP';
            p2p.send('P2P_UNREADY', {});
            if (this.p2pCountdownTimer) {
                clearInterval(this.p2pCountdownTimer);
                this.p2pCountdownTimer = null;
                document.getElementById('p2pCountdown')?.classList.add('hidden');
            }
        }

        this._checkBothReady();
    }

    /** @param {boolean} isReady */
    setOpponentReady(isReady) {
        this.p2pOpponentReady = isReady;
        this.ui.updateReadyCard('opp', isReady);
        this._checkBothReady();
    }

    /**
     * @private
     * When both players are ready, start a 3-second countdown then launch rematch.
     */
    _checkBothReady() {
        if (this.p2pMyReady && this.p2pOpponentReady) {
            if (this.p2pCountdownTimer) return; // Already counting down

            let count = 3;
            const cdEl  = document.getElementById('p2pCountdown');
            const numEl = document.getElementById('p2pCountdownNum');
            cdEl?.classList.remove('hidden');
            if (numEl) numEl.innerText = count;
            this.ui.showToast('Both READY! Starting in 3...', 'success', 3500);

            this.p2pCountdownTimer = setInterval(() => {
                count--;
                if (numEl) numEl.innerText = count;
                if (count <= 0) {
                    clearInterval(this.p2pCountdownTimer);
                    this.p2pCountdownTimer = null;
                    cdEl?.classList.add('hidden');
                    this._startP2PRematch();
                }
            }, 1000);

        } else if (this.p2pCountdownTimer) {
            // One player un-readied — cancel countdown
            clearInterval(this.p2pCountdownTimer);
            this.p2pCountdownTimer = null;
            document.getElementById('p2pCountdown')?.classList.add('hidden');
        }
    }

    /** @private Launch the P2P rematch with lobby settings applied */
    _startP2PRematch() {
        const ta = document.getElementById('p2pLobbyCustomText');
        const customText = ta?.value.trim() || '';

        if (customText.length > 0) {
            this.words.setCustomScript(customText);
        } else {
            this.words.contentMode       = 'words';
            this.words.customScriptWords = [];
        }

        this.p2pMyReady       = false;
        this.p2pOpponentReady = false;

        this.ui.hideModal('modalP2PLobby');
        combat.reset('p2p');
        document.getElementById('stageBadge').innerText = 'P2P ONLINE';
        this.ui.setupPlayerPanel(1, auth.currentUser?.name || 'HERO (YOU)', ICONS.lightning, '#00f0ff');
        this.ui.setupPlayerPanel(2, 'FRIEND (ONLINE)', ICONS.globe, '#ff0055');
        this._startMatch();
        this.ui.showToast('P2P Rematch Started! Type to Attack!', 'success');
    }

    /** Share typed custom text from the lobby textarea to the opponent over P2P */
    p2pShareCustomText() {
        const ta     = document.getElementById('p2pLobbyCustomText');
        const text   = ta?.value.trim() || '';
        const status = document.getElementById('p2pTextShareStatus');

        if (!text) { this.ui.showToast('Please type some custom text first!', 'error', 2000); return; }
        if (!p2p.isConnected) { this.ui.showToast('Not connected to friend!', 'error'); return; }

        p2p.send('P2P_CUSTOM_TEXT', { text });
        if (status) status.innerHTML = `<span style="color:#00ff88;">✅ Custom text sent to friend!</span>`;
        this.ui.showToast('Custom text shared with friend!', 'success', 2500);
    }

    leaveP2PRoom() {
        if (this.p2pCountdownTimer) {
            clearInterval(this.p2pCountdownTimer);
            this.p2pCountdownTimer = null;
        }
        p2p.disconnect();
        this.ui.hideModal('modalP2PLobby');
        this.showMainMenu();
        this.ui.showToast('Left P2P room. See you next time!', 'info');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IX. MODAL ROUTING
    // ═══════════════════════════════════════════════════════════════════════════

    showMainMenu() {
        this.isMatchActive  = false;
        this.isMatchPaused  = false;
        combat.stopAI();
        this.ui.closeAllModals();
        this.ui.showModal('modalStart');
    }

    openP2PModal() {
        this.ui.closeAllModals();
        this.ui.showModal('modalP2P');
    }

    closeP2PModal() {
        this.pendingGameStart = null;
        this.ui.hideModal('modalP2P');
        if (!this.isMatchActive) this.ui.showModal('modalStart');
    }

    openCampaignModal() {
        this.ui.closeAllModals();
        this.ui.renderCampaignGrid(
            CONFIG.CAMPAIGN_LEVELS,
            combat.unlockedLevel,
            lvl => this.startArcadeLevel(lvl)
        );
        this.ui.showModal('modalCampaign');
    }

    closeCampaignModal() {
        this.pendingGameStart = null;
        this.ui.hideModal('modalCampaign');
        if (!this.isMatchActive) this.ui.showModal('modalStart');
    }

    // ── CONTENT CHOICE MODAL ──────────────────────────────────────────────────

    /** @private Show the content-selection modal (words vs custom script) */
    _openContentChoiceModal() {
        this.ui.hideModal('modalStart');
        this.ui.hideModal('modalCampaign');
        this.ui.showModal('modalContentChoice');
    }

    /**
     * Called when player picks a content mode from the choice dialog.
     * @param {'words'|'custom'} mode
     */
    confirmContentMode(mode) {
        this.words.contentMode = mode;
        this.ui.hideModal('modalContentChoice');
        if (this.pendingGameStart) {
            const start = this.pendingGameStart;
            this.pendingGameStart = null;
            start();
        }
    }

    openCustomScriptModal() {
        this.ui.hideModal('modalContentChoice');
        this.ui.showModal('modalCustomScript');
    }

    closeCustomScriptModal() {
        this.pendingGameStart = null;
        this.ui.hideModal('modalCustomScript');
        if (!this.isMatchActive) this.ui.showModal('modalStart');
    }

    closeContentChoiceModal() {
        this.pendingGameStart = null;
        this.ui.hideModal('modalContentChoice');
        if (!this.isMatchActive) this.ui.showModal('modalStart');
    }

    /**
     * Parse custom text from the textarea, persist it, and launch the game.
     * BUG FIX: Previously split the HTML-escaped text, causing entities like
     * &amp; to appear as typed words. Now splits the raw input before escaping.
     */
    saveAndStartCustomScript() {
        const rawText = this.scriptTextarea?.value.trim() || '';
        if (!rawText) {
            this.ui.showToast('Please paste or type a custom text script first.', 'error');
            return;
        }

        // Persist raw text (escaping happens only when text is rendered to DOM)
        localStorage.setItem('tf_custom_script', rawText);

        const accepted = this.words.setCustomScript(rawText);
        if (!accepted) {
            this.ui.showToast('Custom script appears empty — please try again.', 'error');
            return;
        }

        this.ui.hideModal('modalCustomScript');

        if (this.pendingGameStart) {
            const start = this.pendingGameStart;
            this.pendingGameStart = null;
            start();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // X. UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * HTML-escape a string for safe insertion into the DOM.
     * Kept on GameApp for backward compatibility with any inline HTML handlers.
     * @param {string} str
     * @returns {string}
     */
    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, m =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    /** @private Alias for escapeHtml used within this class */
    _esc(str) { return this.escapeHtml(str); }
}

// ── BOOTSTRAP ────────────────────────────────────────────────────────────────

/** @type {GameApp} Global instance — all HTML onclick handlers reference this */
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new GameApp();
});
