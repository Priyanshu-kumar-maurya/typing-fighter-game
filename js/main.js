// Typing Fighter - Main Game Controller & Anti-Cheat Engine

class GameApp {
    constructor() {
        this.renderer = null;
        this.currentWord = "";
        this.typedCharIndex = 0;
        this.isMatchActive = false;
        this.isMatchPaused = false;
        this.matchTimerInterval = null;
        this.matchSeconds = 0;

        // Anti-Cheat & Security parameters
        this.lastKeystrokeTime = 0;
        this.minKeystrokeDeltaMs = 18; // Max 55 Keystrokes/sec

        // Content Mode
        this.contentMode = 'words'; // 'words' | 'custom'
        this.customScriptWords = [];
        this.customScriptIndex = 0;
        this.pendingGameStart = null;

        // P2P Lobby Ready-Up State
        this.p2pMyReady = false;
        this.p2pOpponentReady = false;
        this.p2pCountdownTimer = null;
        this.p2pLobbyWinner = 1;

        // Dom Elements
        this.typeInput = document.getElementById('typeInput');
        this.wordDisplay = document.getElementById('wordDisplay');
        this.superReadyBanner = document.getElementById('superReadyBanner');
        this.scriptTextarea = document.getElementById('customScriptTextarea');

        this.init();
    }

    init() {
        // Run Cyberpunk Loading Bar Animation on Launch
        this.runLoadingScreen();

        // Initialize Renderer
        this.renderer = new ArenaRenderer('gameCanvas');

        // Setup Keydown Listener
        window.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));
        
        // Keep hidden input focused on click/tap anywhere on canvas or typing area
        const focusInput = () => {
            if (this.typeInput && this.isMatchActive && !this.isMatchPaused) {
                this.typeInput.focus();
            }
        };
        document.querySelector('.canvas-container').addEventListener('click', focusInput);
        document.querySelector('.canvas-container').addEventListener('touchstart', focusInput);
        document.querySelector('.typing-word-card').addEventListener('click', focusInput);
        document.querySelector('.typing-word-card').addEventListener('touchstart', focusInput);

        // Mobile Touch Virtual Keyboard listener
        if (this.typeInput) {
            this.typeInput.addEventListener('input', (e) => {
                if (!this.isMatchActive || this.isMatchPaused) return;
                const val = this.typeInput.value;
                if (val.length > 0) {
                    const char = val[val.length - 1];
                    this.processTypedKey(char);
                    this.typeInput.value = "";
                }
            });
            this.typeInput.addEventListener('paste', (e) => e.preventDefault());
        }

        // Audio initialization on first user interaction
        window.addEventListener('pointerdown', () => audio.init(), { once: true });

        // ── MOBILE KEYBOARD DETECTION ─────────────────────────────────────────
        // When the virtual keyboard opens, viewport height shrinks.
        // We add body.keyboard-open so CSS can adapt the layout.
        if (window.visualViewport) {
            let baseHeight = window.visualViewport.height;
            let keyboardTimer = null;

            window.visualViewport.addEventListener('resize', () => {
                clearTimeout(keyboardTimer);
                const currentH = window.visualViewport.height;
                const diff = baseHeight - currentH;

                // Keyboard opened (height shrank by more than 120px)
                if (diff > 120) {
                    document.body.classList.add('keyboard-open');
                    // Scroll typing box into view smoothly
                    keyboardTimer = setTimeout(() => {
                        const typingBox = document.querySelector('.typing-box-container');
                        if (typingBox) typingBox.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 100);
                } else {
                    document.body.classList.remove('keyboard-open');
                    baseHeight = currentH;
                }
            });

            // Update baseHeight when orientation changes
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    baseHeight = window.visualViewport.height;
                    document.body.classList.remove('keyboard-open');
                }, 500);
            });
        }

        // Load saved custom script if available
        const savedScript = localStorage.getItem('tf_custom_script');
        if (savedScript && this.scriptTextarea) {
            this.scriptTextarea.value = this.escapeHtml(savedScript);
        }

        // Setup Auth Tab Switchers
        this.setupAuthUI();

        // Check active login session on launch
        if (auth.currentUser) {
            this.updateUserHeaderUI();
            document.getElementById('modalStart').classList.remove('hidden');
            document.getElementById('modalAuth').classList.add('hidden');
        } else {
            // Show Auth modal first on application startup
            document.getElementById('modalStart').classList.add('hidden');
            document.getElementById('modalAuth').classList.remove('hidden');
        }

        // Setup P2P Network Handlers
        this.setupP2PListeners();

        // Game loop ticker for smooth 60 FPS rendering
        const loop = () => {
            this.renderer.render();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);

        // Sound Toggle Button
        document.getElementById('btnSoundToggle').addEventListener('click', () => this.toggleSound());

        // UNIFIED AUTO-MATCH P2P BUTTON
        const btnConnectP2P = document.getElementById('btnConnectP2P');
        if (btnConnectP2P) {
            btnConnectP2P.addEventListener('click', () => this.handleUnifiedP2PConnect());
        }

        // Header buttons
        document.getElementById('btnOpenP2P').addEventListener('click', () => this.openP2PModal());
        document.getElementById('btnOpenArcade').addEventListener('click', () => this.openCampaignModal());

        // Combat Engine GameOver Hook
        combat.onGameOverCallback = (winner) => this.handleGameOver(winner);
    }

    runLoadingScreen() {
        const bar = document.getElementById('loadingBar');
        const screen = document.getElementById('loadingScreen');
        if (!bar || !screen) return;

        let pct = 0;
        const interval = setInterval(() => {
            pct += 25;
            bar.style.width = `${pct}%`;
            if (pct >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    screen.classList.add('fade-out');
                }, 300);
            }
        }, 80);
    }

    focusMobileKeyboard() {
        if (this.typeInput) {
            this.typeInput.focus();
            this.typeInput.click();
            const card = document.querySelector('.typing-word-card');
            if (card && card.scrollIntoView) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    // TOAST NOTIFICATIONS SYSTEM (REPLACES NATIVE BROWSER ALERT)
    showToast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let icon = ICONS.lightning;
        if (type === 'success') icon = ICONS.star;
        if (type === 'error') icon = ICONS.cross;

        toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${this.escapeHtml(message)}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    toggleSound() {
        audio.muted = !audio.muted;
        const btn = document.getElementById('btnSoundToggle');
        if (btn) btn.innerHTML = audio.muted ? `${ICONS.volumeOff} Sound: OFF` : `${ICONS.volumeOn} Sound: ON`;
        this.showToast(audio.muted ? "Audio Muted" : "Audio Enabled", "info", 1500);
    }

    // AUTH & PLAYER PROFILE UI HANDLERS
    setupAuthUI() {
        const tabGuest = document.getElementById('tabGuest');
        const tabRegister = document.getElementById('tabRegister');
        const tabLogin = document.getElementById('tabLogin');

        const secGuest = document.getElementById('authGuestSection');
        const secRegister = document.getElementById('authRegisterSection');
        const secLogin = document.getElementById('authLoginSection');

        if (tabGuest) {
            tabGuest.addEventListener('click', () => {
                tabGuest.classList.add('active'); tabRegister.classList.remove('active'); tabLogin.classList.remove('active');
                secGuest.classList.remove('hidden'); secRegister.classList.add('hidden'); secLogin.classList.add('hidden');
            });
        }

        if (tabRegister) {
            tabRegister.addEventListener('click', () => {
                tabRegister.classList.add('active'); tabGuest.classList.remove('active'); tabLogin.classList.remove('active');
                secRegister.classList.remove('hidden'); secGuest.classList.add('hidden'); secLogin.classList.add('hidden');
            });
        }

        if (tabLogin) {
            tabLogin.addEventListener('click', () => {
                tabLogin.classList.add('active'); tabGuest.classList.remove('active'); tabRegister.classList.remove('active');
                secLogin.classList.remove('hidden'); secGuest.classList.add('hidden'); secRegister.classList.add('hidden');
            });
        }
    }

    openAuthModal() {
        document.getElementById('authStatus').innerText = "";
        document.getElementById('modalAuth').classList.remove('hidden');
    }

    closeAuthModal() {
        document.getElementById('modalAuth').classList.add('hidden');
    }

    handleGuestLogin() {
        const nameInput = document.getElementById('guestNameInput');
        const ageInput = document.getElementById('guestAgeInput');

        const name = nameInput ? nameInput.value.trim() : "";
        const age = ageInput ? ageInput.value.trim() : "";

        if (!name) {
            this.showToast("Please enter your Player Name!", "error");
            if (nameInput) nameInput.focus();
            return;
        }

        if (!age) {
            this.showToast("Please enter your Age!", "error");
            if (ageInput) ageInput.focus();
            return;
        }

        const res = auth.loginAsGuest(name, age);
        if (res.success) {
            this.updateUserHeaderUI();
            this.closeAuthModal();
            this.showMainMenu();
            this.showToast(`Welcome Guest ${res.user.name}!`, "success");
        }
    }

    handleMobileRegister() {
        const name = document.getElementById('regNameInput').value;
        const age = document.getElementById('regAgeInput').value;
        const mobile = document.getElementById('regMobileInput').value;
        const pass = document.getElementById('regPassInput').value;

        if (!name.trim()) {
            this.showToast("Please enter your Player Name!", "error");
            return;
        }
        if (!age.trim()) {
            this.showToast("Please enter your Age!", "error");
            return;
        }

        const res = auth.registerWithMobile(name, age, mobile, pass);
        if (res.success) {
            this.showToast("Account registered successfully!", "success");
            this.updateUserHeaderUI();
            this.closeAuthModal();
            this.showMainMenu();
        } else {
            this.showToast(res.message, "error");
        }
    }

    handleMobileLogin() {
        const mobile = document.getElementById('loginMobileInput').value;
        const pass = document.getElementById('loginPassInput').value;

        if (!mobile.trim() || !pass.trim()) {
            this.showToast("Please enter Mobile Number and Password!", "error");
            return;
        }

        const res = auth.loginWithMobile(mobile, pass);
        if (res.success) {
            this.showToast(`Welcome back ${res.user.name}!`, "success");
            this.updateUserHeaderUI();
            this.closeAuthModal();
            this.showMainMenu();
        } else {
            this.showToast(res.message, "error");
        }
    }

    updateUserHeaderUI() {
        if (!auth.currentUser) return;
        const nameElem = document.getElementById('headerUserName');
        const metaElem = document.getElementById('headerUserMeta');

        const lvl = auth.currentUser.unlockedLevel || combat.unlockedLevel || 1;
        const typeTag = auth.currentUser.type === 'registered' ? 'Registered' : 'Guest';

        if (nameElem) nameElem.innerText = auth.currentUser.name;
        if (metaElem) metaElem.innerText = `${typeTag} | Age: ${auth.currentUser.age || 18} | Stage ${lvl}`;

        combat.unlockedLevel = lvl;
    }

    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, (m) => {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    }

    toggleMic() {
        const isEnabled = p2p.toggleMic();
        const btn = document.getElementById('btnMicToggle');
        if (btn) {
            btn.innerHTML = isEnabled ? `${ICONS.micOn} Mic: ON` : `${ICONS.micOff} Mic: MUTED`;
            btn.style.color = isEnabled ? "var(--neon-cyan)" : "#ff0055";
        }
        this.showToast(isEnabled ? "Microphone Unmuted" : "Microphone Muted", isEnabled ? "success" : "info");
    }

    startArcadeLevel(levelNum = 1) {
        if (!auth.currentUser) {
            this.openAuthModal();
            return;
        }
        if (levelNum > combat.unlockedLevel) return;

        this.pendingGameStart = () => {
            this.closeModals();
            combat.reset('arcade', levelNum);
            document.getElementById('stageBadge').innerText = `STAGE ${levelNum}/25`;
            this.setupPlayerUI(1, auth.currentUser.name, ICONS.lightning, "#00f0ff");
            this.setupPlayerUI(2, combat.bot.name, combat.bot.avatar, combat.bot.color);
            this.startMatch();

            combat.startAI((aiAttack) => {
                this.renderer.triggerAttack(2, aiAttack.attackType);
                this.renderer.addFloatingText(this.renderer.f1.x, this.renderer.f1.y - 70, `-${aiAttack.damage} HP`, '#ff0055', 26);
                audio.playPunch();
                this.updateHUD();
            });
        };

        this.openContentChoiceModal();
    }

    startLocal2PMode() {
        this.pendingGameStart = () => {
            this.closeModals();
            combat.reset('local2p');
            document.getElementById('stageBadge').innerText = `1v1 LOCAL`;
            this.setupPlayerUI(1, auth.currentUser ? auth.currentUser.name : "PLAYER 1", ICONS.lightning, "#00f0ff");
            this.setupPlayerUI(2, "PLAYER 2", ICONS.fire, "#ff0055");
            this.startMatch();
        };

        this.openContentChoiceModal();
    }

    startMatch() {
        this.isMatchActive = true;
        this.isMatchPaused = false;
        this.matchSeconds = 0;
        this.customScriptIndex = 0;
        this.lastKeystrokeTime = Date.now();
        if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);

        this.matchTimerInterval = setInterval(() => {
            if (!this.isMatchActive || this.isMatchPaused) return;
            this.matchSeconds++;
            const mins = String(Math.floor(this.matchSeconds / 60)).padStart(2, '0');
            const secs = String(this.matchSeconds % 60).padStart(2, '0');
            document.getElementById('matchTime').innerText = `${mins}:${secs}`;
        }, 1000);

        this.generateNewWord();
        this.updateHUD();
        if (this.typeInput) {
            this.typeInput.value = "";
            this.typeInput.focus();
        }
    }

    pauseMatch() {
        if (!this.isMatchActive) {
            this.showMainMenu();
            return;
        }
        this.isMatchPaused = true;
        combat.stopAI();
        document.getElementById('modalPause').classList.remove('hidden');
    }

    resumeMatch() {
        this.isMatchPaused = false;
        document.getElementById('modalPause').classList.add('hidden');
        if (combat.mode === 'arcade') {
            combat.startAI((aiAttack) => {
                this.renderer.triggerAttack(2, aiAttack.attackType);
                this.renderer.addFloatingText(this.renderer.f1.x, this.renderer.f1.y - 70, `-${aiAttack.damage} HP`, '#ff0055', 26);
                audio.playPunch();
                this.updateHUD();
            });
        }
        if (this.typeInput) this.typeInput.focus();
    }

    generateNewWord() {
        this.typedCharIndex = 0;

        if (combat.p1.superActive) {
            // Pick a Super Power Word
            const list = CONFIG.WORDS.POWER_WORDS;
            this.currentWord = list[Math.floor(Math.random() * list.length)];
            this.superReadyBanner.classList.remove('hidden');
        } else {
            this.superReadyBanner.classList.add('hidden');

            if (this.contentMode === 'custom' && this.customScriptWords.length > 0) {
                // Use sequential word/phrase from custom user script!
                this.currentWord = this.customScriptWords[this.customScriptIndex % this.customScriptWords.length];
                this.customScriptIndex++;
            } else {
                // Random Words Mode
                const diff = combat.bot ? combat.bot.difficulty : 'Medium';
                let list = CONFIG.WORDS.EASY;
                if (diff === 'Medium' || diff === 'Hard') list = list.concat(CONFIG.WORDS.MEDIUM);
                if (diff === 'Expert' || diff === 'NIGHTMARE' || diff === 'BOSS' || diff === 'SUPER BOSS' || diff === 'GOD MODE') list = list.concat(CONFIG.WORDS.HARD);

                this.currentWord = list[Math.floor(Math.random() * list.length)];
            }
        }

        this.renderWordDisplay();
    }

    renderWordDisplay() {
        if (!this.wordDisplay) return;
        this.wordDisplay.innerHTML = "";

        for (let i = 0; i < this.currentWord.length; i++) {
            const char = this.currentWord[i];
            const span = document.createElement('span');

            if (char === ' ') {
                span.className = 'char-space';
            } else {
                span.innerText = char;
            }

            if (i < this.typedCharIndex) {
                span.classList.add('char-correct');
            } else if (i === this.typedCharIndex) {
                span.classList.add('char-current');
            } else {
                span.classList.add('char-untyped');
            }

            this.wordDisplay.appendChild(span);
        }
    }

    // KEYBOARD SHORTCUTS SYSTEM (P, M, R, ESC)
    handleGlobalKeyDown(e) {
        // DO NOT INTERFERE when user is typing inside ANY input box or textarea!
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            return;
        }

        // ANTI-CHEAT SECURITY: Ensure event is trusted
        if (e.isTrusted === false) {
            console.warn("[ANTI-CHEAT] Fake untrusted keypress blocked!");
            return;
        }

        // Global Shortcuts: M (Mute), P (Pause), R (Restart when game active/paused)
        const keyUpper = e.key.toUpperCase();

        if (keyUpper === 'M') {
            this.toggleSound();
            return;
        }

        if (e.key === 'Escape' || keyUpper === 'P') {
            if (this.isMatchActive) {
                if (this.isMatchPaused) this.resumeMatch();
                else this.pauseMatch();
            } else {
                this.showMainMenu();
            }
            return;
        }

        if (keyUpper === 'R' && (this.isMatchActive || !document.getElementById('modalGameOver').classList.contains('hidden') || this.isMatchPaused)) {
            this.restartMatch();
            this.showToast("Match Restarted!", "info", 1500);
            return;
        }

        if (!this.isMatchActive || this.isMatchPaused) {
            if (e.code === 'Space' && !document.getElementById('modalGameOver').classList.contains('hidden')) {
                this.restartMatch();
            }
            return;
        }

        // ANTI-CHEAT SECURITY: Rate-limit keypress interval (max 55 keys/sec)
        const now = Date.now();
        if (now - this.lastKeystrokeTime < this.minKeystrokeDeltaMs) {
            return;
        }
        this.lastKeystrokeTime = now;

        // Prevent space bar page scrolling during active gameplay
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
        }

        // Handle single character / key input including spacebar
        if (e.key === ' ' || (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)) {
            this.processTypedKey(e.key);
        }
    }

    processTypedKey(key) {
        const expectedChar = this.currentWord[this.typedCharIndex];
        
        // Case insensitive match & Space match
        if (key.toLowerCase() === expectedChar.toLowerCase() || (key === ' ' && expectedChar === ' ')) {
            // Correct Keypress
            combat.registerKey(1, true);
            audio.playKeyPress();

            // TRIGGER IMMEDIATE PUNCH / STRIKE ON EVERY SINGLE CORRECT KEYSTROKE!
            this.renderer.triggerAttack(1, 'light');
            this.renderer.spawnHitSparks(this.renderer.f2.x, this.renderer.f2.y - 50, '#00f0ff', 'light');

            this.typedCharIndex++;

            if (p2p.isConnected) {
                p2p.send('KEYSTROKE', { charIndex: this.typedCharIndex });
            }

            if (this.typedCharIndex >= this.currentWord.length) {
                // Word Completed! Launch Full Heavy Combo / Plasma Strike
                this.executePlayerAttack(1, this.currentWord);
                this.generateNewWord();
            } else {
                this.renderWordDisplay();
            }
        } else {
            // Typo / Wrong key
            combat.registerKey(1, false);
            audio.playError();
            
            // Visual Shake on Error
            const span = this.wordDisplay.children[this.typedCharIndex];
            if (span) {
                span.classList.add('char-error');
                setTimeout(() => span.classList.remove('char-error'), 250);
            }
        }

        this.updateHUD();
    }

    executePlayerAttack(playerNum, word) {
        const attack = combat.processWordCompletion(playerNum, word);
        const defender = playerNum === 1 ? this.renderer.f2 : this.renderer.f1;

        // Trigger Canvas Heavy Combo Animation
        const attackType = attack.isSuper ? 'super' : (attack.isHeavy ? 'heavy' : 'heavy');
        this.renderer.triggerAttack(playerNum, attackType);

        // Sound FX
        if (attack.isSuper) audio.playSuper();
        else if (attack.isHeavy) audio.playKick();
        else audio.playPunch();

        // Audio Combo feedback
        if (attack.combo > 1) audio.playCombo(attack.combo);

        // Floating Damage Number
        const dmgText = attack.isSuper ? `SUPER HIT! -${attack.damage}` : `-${attack.damage} HP`;
        const color = attack.isSuper ? '#ffe600' : (playerNum === 1 ? '#00f0ff' : '#ff0055');
        this.renderer.addFloatingText(defender.x, defender.y - 70, dmgText, color, attack.isSuper ? 34 : 26);

        // Send over P2P network if connected
        if (p2p.isConnected && playerNum === 1) {
            p2p.send('ATTACK_COMPLETED', {
                word: word,
                damage: attack.damage,
                isSuper: attack.isSuper,
                combo: attack.combo
            });
        }

        this.updateHUD();
    }

    updateHUD() {
        // Player 1 HUD
        const hpP1 = (combat.p1.hp / combat.p1.maxHp) * 100;
        document.getElementById('p1HpBar').style.width = `${Math.max(0, hpP1)}%`;
        document.getElementById('p1HpText').innerText = `${combat.p1.hp} / ${combat.p1.maxHp} HP`;
        document.getElementById('p1Wpm').innerText = combat.p1.wpm;
        document.getElementById('p1Acc').innerText = combat.p1.accuracy;
        document.getElementById('p1SuperBar').style.width = `${combat.p1.superMeter}%`;
        document.getElementById('p1SuperText').innerText = combat.p1.superActive ? "SUPER READY!" : `SUPER: ${combat.p1.superMeter}%`;
        this.renderer.f1.hpPercent = combat.p1.hp / combat.p1.maxHp;

        // Combo Badge
        const comboBadge = document.getElementById('p1ComboBadge');
        if (combat.p1.combo >= 2) {
            comboBadge.innerText = `COMBO x${combat.p1.combo}`;
            comboBadge.classList.remove('hidden');
        } else {
            comboBadge.classList.add('hidden');
        }

        // Player 2 HUD
        const hpP2 = (combat.p2.hp / combat.p2.maxHp) * 100;
        document.getElementById('p2HpBar').style.width = `${Math.max(0, hpP2)}%`;
        document.getElementById('p2HpText').innerText = `${combat.p2.hp} / ${combat.p2.maxHp} HP`;
        document.getElementById('p2Wpm').innerText = combat.p2.wpm;
        document.getElementById('p2Acc').innerText = combat.p2.accuracy;
        document.getElementById('p2SuperBar').style.width = `${combat.p2.superMeter}%`;
        document.getElementById('p2SuperText').innerText = `SUPER: ${combat.p2.superMeter}%`;
        this.renderer.f2.hpPercent = combat.p2.hp / combat.p2.maxHp;
    }

    setupPlayerUI(playerNum, name, avatar, color) {
        if (playerNum === 1) {
            document.getElementById('p1Name').innerText = this.escapeHtml(name);
            this.renderer.f1.color = color;
        } else {
            document.getElementById('p2Name').innerText = this.escapeHtml(name);
            document.getElementById('p2Avatar').innerHTML = avatar;
            this.renderer.f2.color = color;
        }
    }

    // CONTENT MODE DIALOG & CUSTOM SCRIPT HANDLERS
    openContentChoiceModal() {
        document.getElementById('modalStart').classList.add('hidden');
        document.getElementById('modalCampaign').classList.add('hidden');
        document.getElementById('modalContentChoice').classList.remove('hidden');
    }

    confirmContentMode(mode) {
        this.contentMode = mode;
        document.getElementById('modalContentChoice').classList.add('hidden');
        if (this.pendingGameStart) {
            const callback = this.pendingGameStart;
            this.pendingGameStart = null;
            callback();
        }
    }

    openCustomScriptModal() {
        document.getElementById('modalContentChoice').classList.add('hidden');
        document.getElementById('modalCustomScript').classList.remove('hidden');
    }

    closeCustomScriptModal() {
        this.pendingGameStart = null;
        document.getElementById('modalCustomScript').classList.add('hidden');
        if (!this.isMatchActive) {
            document.getElementById('modalStart').classList.remove('hidden');
        }
    }

    saveAndStartCustomScript() {
        const rawText = this.scriptTextarea ? this.scriptTextarea.value.trim() : "";
        if (!rawText) {
            this.showToast("Please paste or type custom text script first.", "error");
            return;
        }

        const safeText = this.escapeHtml(rawText);

        // Save custom script to localStorage
        localStorage.setItem('tf_custom_script', safeText);

        // Parse custom text into clean words / short phrases
        this.customScriptWords = safeText.split(/\s+/).filter(w => w.length > 0);
        this.contentMode = 'custom';

        document.getElementById('modalCustomScript').classList.add('hidden');

        if (this.pendingGameStart) {
            const callback = this.pendingGameStart;
            this.pendingGameStart = null;
            callback();
        }
    }

    closeContentChoiceModal() {
        this.pendingGameStart = null;
        document.getElementById('modalContentChoice').classList.add('hidden');
        if (!this.isMatchActive) {
            document.getElementById('modalStart').classList.remove('hidden');
        }
    }

    // P2P Multiplayer Networking Integration
    setupP2PListeners() {
        p2p.onConnectCallback = () => {
            // INSTANT BATTLE LAUNCH: Close all modals and start fight immediately on both devices!
            this.closeModals();
            combat.reset('p2p');
            document.getElementById('stageBadge').innerText = `P2P ONLINE`;
            this.setupPlayerUI(1, auth.currentUser ? auth.currentUser.name : "HERO (YOU)", ICONS.lightning, "#00f0ff");
            this.setupPlayerUI(2, "FRIEND (ONLINE)", ICONS.globe, "#ff0055");
            this.startMatch();
            this.showToast("P2P Online Battle Started! Type to Attack!", "success");
        };

        p2p.onMessageCallback = (data) => {
            const { type, payload } = data;

            // ── GAME messages ────────────────────────────────────────────────
            if (type === 'KEYSTROKE') {
                this.renderer.triggerAttack(2, 'light');
            } else if (type === 'ATTACK_COMPLETED') {
                const validDamage = Math.min(payload.damage || 0, 50);
                combat.p1.hp = Math.max(0, combat.p1.hp - validDamage);
                this.renderer.triggerAttack(2, payload.isSuper ? 'super' : 'heavy');
                audio.playPunch();
                this.renderer.addFloatingText(this.renderer.f1.x, this.renderer.f1.y - 70, `-${validDamage} HP`, '#ff0055', 28);
                this.updateHUD();
                combat.checkGameOver();

            // ── LOBBY / READY-UP messages ────────────────────────────────────
            } else if (type === 'P2P_READY') {
                this.setOpponentReady(true);
                this.showToast('Friend is READY! Click Ready Up to start!', 'success', 3000);
            } else if (type === 'P2P_UNREADY') {
                this.setOpponentReady(false);
                if (this.p2pCountdownTimer) {
                    clearInterval(this.p2pCountdownTimer);
                    this.p2pCountdownTimer = null;
                    const cd = document.getElementById('p2pCountdown');
                    if (cd) cd.classList.add('hidden');
                    this.showToast('Friend cancelled ready. Waiting...', 'info', 2500);
                }
            } else if (type === 'P2P_CUSTOM_TEXT') {
                // Friend shared custom text — load it
                const textarea = document.getElementById('p2pLobbyCustomText');
                if (textarea && payload.text) textarea.value = payload.text;
                const shareStatus = document.getElementById('p2pTextShareStatus');
                if (shareStatus) shareStatus.innerHTML = `<span style="color:#00f0ff;">✅ Friend shared custom text! Using it for next round.</span>`;
                this.showToast('Friend sent you custom typing text!', 'info', 3500);
            }
        };

        p2p.onDisconnectCallback = (msg) => {
            // Close lobby if open
            const lobby = document.getElementById('modalP2PLobby');
            if (lobby) lobby.classList.add('hidden');
            if (this.p2pCountdownTimer) {
                clearInterval(this.p2pCountdownTimer);
                this.p2pCountdownTimer = null;
            }
            this.showToast(msg || "Online P2P friend disconnected.", "error");
            this.showMainMenu();
        };
    }

    handleUnifiedP2PConnect() {
        const inputElem = document.getElementById('inputUnifiedRoomCode');
        const code = inputElem ? inputElem.value.trim() : "";
        const statusDiv = document.getElementById('p2pUnifiedStatus');
        const connectBtn = document.getElementById('btnConnectP2P');

        if (!code || code.length < 2) {
            this.showToast("Please type a Room Code (min 2 characters).", "error");
            if (inputElem) inputElem.focus();
            return;
        }

        const clean = p2p.sanitizeInput(code).toUpperCase();
        if (!clean || clean.length < 2) {
            this.showToast("Invalid Room Code. Use letters and numbers only.", "error");
            return;
        }

        // Disable button to prevent double-click
        if (connectBtn) {
            connectBtn.disabled = true;
            connectBtn.innerText = '⏳ Connecting...';
        }

        const resetBtn = () => {
            if (connectBtn) {
                connectBtn.disabled = false;
                connectBtn.innerHTML = '⚡ CONNECT & START BATTLE';
            }
        };

        if (statusDiv) statusDiv.innerHTML = `<span class="spinner"></span> Registering Room <strong>"${clean}"</strong>...`;

        p2p.connectToRoom(
            clean,
            () => {
                // Guest joined successfully
                if (statusDiv) statusDiv.innerHTML = `<span style="color:#00ff88; font-weight:bold;">✅ CONNECTED! Starting battle...</span>`;
                this.showToast(`Joined Room "${clean}"! Battle starting...`, "success");
                resetBtn();
            },
            (err) => {
                if (statusDiv) statusDiv.innerHTML = `<span style="color:#ff0055;">❌ ${this.escapeHtml(err)}</span>`;
                this.showToast(err, "error");
                resetBtn();
            },
            (waitingCode) => {
                // We are HOST — waiting for friend
                if (statusDiv) statusDiv.innerHTML =
                    `🟢 Room <strong style="color:#00f0ff;">${waitingCode}</strong> is LIVE!<br>` +
                    `Tell your friend to enter code <strong style="color:#ffe600;">${waitingCode}</strong> and click Connect!<br>` +
                    `<small style="opacity:0.7;">(Waiting for friend to join...)</small>`;
                this.showToast(`Room "${waitingCode}" ready! Waiting for friend...`, "info", 6000);
                // Reset button so host can cancel if needed
                if (connectBtn) {
                    connectBtn.disabled = false;
                    connectBtn.innerHTML = '❌ Cancel / Change Code';
                }
            }
        );
    }

    calculateStageRank(wpm, accuracy, targetWPM) {
        if (wpm >= targetWPM + 15 && accuracy >= 95) return `${ICONS.lightning} S-RANK`;
        if (wpm >= targetWPM + 8 && accuracy >= 90) return `${ICONS.fire} A-RANK`;
        if (wpm >= targetWPM && accuracy >= 85) return `${ICONS.shield} B-RANK`;
        return `${ICONS.fist} C-RANK`;
    }

    handleGameOver(winner) {
        this.isMatchActive = false;
        this.isMatchPaused = false;
        if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);

        if (winner === 1) audio.playVictory();
        else audio.playDefeat();

        const btnNextLevel = document.getElementById('btnNextLevel');

        // Save Auth User Progress
        if (auth.currentUser) {
            auth.updateProgress(combat.unlockedLevel, combat.p1.wpm, winner === 1);
            this.updateUserHeaderUI();
        }

        // Calculate Stage Rank
        const targetWPM = combat.bot ? combat.bot.baseWPM : 15;
        const stageRank = this.calculateStageRank(combat.p1.wpm, combat.p1.accuracy, targetWPM);

        // ── P2P MODE: Show P2P Rematch Lobby instead of normal game over ──
        if (combat.mode === 'p2p' && p2p.isConnected) {
            this.openP2PLobby(winner);
            return;
        }

        // Populate Game Over Stats Modal (Arcade & Local)
        if (combat.mode === 'arcade') {
            if (winner === 1) {
                document.getElementById('winnerTitle').innerText = `STAGE ${combat.currentLevel} CLEARED!`;
                document.getElementById('winnerSubtitle').innerText = combat.currentLevel < CONFIG.CAMPAIGN_LEVELS.length 
                    ? `Target ${combat.bot.baseWPM} WPM Passed! Stage ${combat.currentLevel + 1} Unlocked!` 
                    : "CONGRATULATIONS! YOU DEFEATED ALL 25 CAMPAIGN BOSSES!";
                if (btnNextLevel) btnNextLevel.classList.remove('hidden');
            } else {
                if (combat.lastDefeatReason && combat.lastDefeatReason.startsWith('WPM_TOO_LOW')) {
                    const reqWPM = combat.lastDefeatReason.split(':')[1];
                    document.getElementById('winnerTitle').innerText = `STAGE ${combat.currentLevel} FAILED!`;
                    document.getElementById('winnerSubtitle').innerText = `Speed was ${combat.p1.wpm} WPM. Required speed is ${reqWPM} WPM to pass this Stage!`;
                } else {
                    document.getElementById('winnerTitle').innerText = `DEFEAT! HEALTH DEPLETED!`;
                    document.getElementById('winnerSubtitle').innerText = `Keep practicing your typing speed!`;
                }
                if (btnNextLevel) btnNextLevel.classList.add('hidden');
            }
        } else {
            document.getElementById('winnerTitle').innerText = winner === 1 ? "VICTORY! YOU WIN!" : "DEFEAT! OPPONENT WON!";
            document.getElementById('winnerSubtitle').innerText = winner === 1 ? "Sensational typing speed & precision!" : "Keep practicing your typing speed!";
            if (btnNextLevel) btnNextLevel.classList.add('hidden');
        }

        document.getElementById('winnerTitle').style.color = winner === 1 ? "#00f0ff" : "#ff0055";

        document.getElementById('statWpm').innerHTML = `${combat.p1.wpm} <span class="unit">WPM</span>`;
        document.getElementById('statAcc').innerHTML = `${combat.p1.accuracy}<span class="unit">%</span>`;
        document.getElementById('statCombo').innerText = `${combat.p1.maxCombo}x`;
        document.getElementById('statRank').innerHTML = winner === 1 ? stageRank : `${ICONS.cross} NO RANK`;

        document.getElementById('modalGameOver').classList.remove('hidden');
    }

    // ── P2P REMATCH LOBBY ─────────────────────────────────────────────────────

    openP2PLobby(winner) {
        this.p2pLobbyWinner = winner;
        this.p2pMyReady = false;
        this.p2pOpponentReady = false;
        if (this.p2pCountdownTimer) {
            clearInterval(this.p2pCountdownTimer);
            this.p2pCountdownTimer = null;
        }

        // Populate result
        const isWin = winner === 1;
        document.getElementById('p2pLobbyResultIcon').innerText = isWin ? '🏆' : '💀';
        document.getElementById('p2pLobbyTitle').innerText = isWin ? 'VICTORY!' : 'DEFEAT!';
        document.getElementById('p2pLobbyTitle').style.color = isWin ? 'var(--neon-cyan)' : '#ff0055';
        document.getElementById('p2pLobbySubtitle').innerText = isWin
            ? `You outtyped your friend! WPM: ${combat.p1.wpm}`
            : `Friend was faster this time! WPM: ${combat.p1.wpm}`;

        // Stats
        document.getElementById('p2pStatWpm').innerText = combat.p1.wpm;
        document.getElementById('p2pStatAcc').innerText = `${combat.p1.accuracy}%`;
        document.getElementById('p2pStatCombo').innerText = `${combat.p1.maxCombo}x`;

        // Player name
        const myName = auth.currentUser ? auth.currentUser.name.toUpperCase() : 'YOU';
        document.getElementById('p2pMyName').innerText = myName;

        // Reset ready states
        this._updateReadyUI('my', false);
        this._updateReadyUI('opp', false);

        // Reset ready button
        const readyBtn = document.getElementById('btnP2PReady');
        if (readyBtn) {
            readyBtn.classList.remove('is-ready-state');
            readyBtn.innerHTML = '⚡ CLICK TO READY UP';
        }

        // Hide countdown
        const cd = document.getElementById('p2pCountdown');
        if (cd) cd.classList.add('hidden');

        // Clear custom text area
        const textarea = document.getElementById('p2pLobbyCustomText');
        if (textarea) textarea.value = '';
        const shareStatus = document.getElementById('p2pTextShareStatus');
        if (shareStatus) shareStatus.innerHTML = '';

        // Show lobby
        this.closeModals();
        document.getElementById('modalP2PLobby').classList.remove('hidden');

        if (isWin) audio.playVictory();
        else audio.playDefeat();
    }

    _updateReadyUI(who, isReady) {
        const card = document.getElementById(who === 'my' ? 'p2pMyReadyCard' : 'p2pOpponentReadyCard');
        const status = document.getElementById(who === 'my' ? 'p2pMyStatus' : 'p2pOpponentStatus');
        if (!card || !status) return;
        if (isReady) {
            card.className = 'ready-player-card is-ready';
            status.innerText = '✅ READY!';
        } else {
            card.className = 'ready-player-card not-ready';
            status.innerText = who === 'my' ? 'NOT READY' : 'WAITING...';
        }
    }

    toggleP2PReady() {
        this.p2pMyReady = !this.p2pMyReady;
        this._updateReadyUI('my', this.p2pMyReady);

        const readyBtn = document.getElementById('btnP2PReady');
        if (this.p2pMyReady) {
            readyBtn.classList.add('is-ready-state');
            readyBtn.innerHTML = '✅ READY! (Click to Cancel)';
            p2p.send('P2P_READY', {});
            this.showToast('You are READY! Waiting for friend...', 'success', 2500);
        } else {
            readyBtn.classList.remove('is-ready-state');
            readyBtn.innerHTML = '⚡ CLICK TO READY UP';
            p2p.send('P2P_UNREADY', {});
            // Cancel countdown if running
            if (this.p2pCountdownTimer) {
                clearInterval(this.p2pCountdownTimer);
                this.p2pCountdownTimer = null;
                const cd = document.getElementById('p2pCountdown');
                if (cd) cd.classList.add('hidden');
            }
        }

        this.checkBothReady();
    }

    setOpponentReady(isReady) {
        this.p2pOpponentReady = isReady;
        this._updateReadyUI('opp', isReady);
        this.checkBothReady();
    }

    checkBothReady() {
        if (this.p2pMyReady && this.p2pOpponentReady) {
            // Both ready! Start countdown
            if (this.p2pCountdownTimer) return; // Already counting

            let count = 3;
            const cd = document.getElementById('p2pCountdown');
            const num = document.getElementById('p2pCountdownNum');
            if (cd) cd.classList.remove('hidden');
            if (num) num.innerText = count;

            this.showToast('Both READY! Starting in 3...', 'success', 3500);

            this.p2pCountdownTimer = setInterval(() => {
                count--;
                if (num) num.innerText = count;
                if (count <= 0) {
                    clearInterval(this.p2pCountdownTimer);
                    this.p2pCountdownTimer = null;
                    if (cd) cd.classList.add('hidden');
                    this.startP2PRematch();
                }
            }, 1000);
        } else if (this.p2pCountdownTimer) {
            // Someone unreadied — cancel countdown
            clearInterval(this.p2pCountdownTimer);
            this.p2pCountdownTimer = null;
            const cd = document.getElementById('p2pCountdown');
            if (cd) cd.classList.add('hidden');
        }
    }

    startP2PRematch() {
        // Read custom text from lobby textarea
        const textarea = document.getElementById('p2pLobbyCustomText');
        const customText = textarea ? textarea.value.trim() : '';

        if (customText.length > 0) {
            this.customScriptWords = customText.split(/\s+/).filter(w => w.length > 0);
            this.contentMode = 'custom';
            this.customScriptIndex = 0;
        } else {
            this.contentMode = 'words';
            this.customScriptWords = [];
        }

        // Reset ready state
        this.p2pMyReady = false;
        this.p2pOpponentReady = false;

        // Close lobby and restart match
        document.getElementById('modalP2PLobby').classList.add('hidden');
        combat.reset('p2p');
        document.getElementById('stageBadge').innerText = `P2P ONLINE`;
        this.setupPlayerUI(1, auth.currentUser ? auth.currentUser.name : "HERO (YOU)", ICONS.lightning, "#00f0ff");
        this.setupPlayerUI(2, "FRIEND (ONLINE)", ICONS.globe, "#ff0055");
        this.startMatch();
        this.showToast('P2P Rematch Started! Type to Attack!', 'success');
    }

    p2pShareCustomText() {
        const textarea = document.getElementById('p2pLobbyCustomText');
        const text = textarea ? textarea.value.trim() : '';
        const shareStatus = document.getElementById('p2pTextShareStatus');

        if (!text) {
            this.showToast('Please type some custom text first!', 'error', 2000);
            return;
        }
        if (!p2p.isConnected) {
            this.showToast('Not connected to friend!', 'error');
            return;
        }

        p2p.send('P2P_CUSTOM_TEXT', { text: text });
        if (shareStatus) shareStatus.innerHTML = `<span style="color:#00ff88;">✅ Custom text sent to friend!</span>`;
        this.showToast('Custom text shared with friend!', 'success', 2500);
    }

    leaveP2PRoom() {
        if (this.p2pCountdownTimer) {
            clearInterval(this.p2pCountdownTimer);
            this.p2pCountdownTimer = null;
        }
        p2p.disconnect();
        document.getElementById('modalP2PLobby').classList.add('hidden');
        this.showMainMenu();
        this.showToast('Left P2P room. See you next time!', 'info');
    }

    playNextLevel() {
        document.getElementById('modalGameOver').classList.add('hidden');
        if (combat.currentLevel < CONFIG.CAMPAIGN_LEVELS.length) {
            this.startArcadeLevel(combat.currentLevel + 1);
        } else {
            this.openCampaignModal();
        }
    }

    renderCampaignGrid() {
        const grid = document.getElementById('campaignGrid');
        if (!grid) return;
        grid.innerHTML = "";

        CONFIG.CAMPAIGN_LEVELS.forEach(lvl => {
            const isUnlocked = lvl.level <= combat.unlockedLevel;
            const isCleared = lvl.level < combat.unlockedLevel;

            const card = document.createElement('div');
            card.className = `level-card ${isUnlocked ? '' : 'locked'}`;

            let badgeHtml = `<span class="level-status-badge status-locked">${ICONS.lock} LOCKED</span>`;
            if (isCleared) badgeHtml = `<span class="level-status-badge status-cleared">${ICONS.star} CLEARED</span>`;
            else if (isUnlocked) badgeHtml = `<span class="level-status-badge status-unlocked">${ICONS.unlocked} UNLOCKED</span>`;

            card.innerHTML = `
                <div class="level-num">STAGE ${lvl.level}</div>
                <div class="level-avatar">${lvl.avatar}</div>
                <h4>${this.escapeHtml(lvl.name)}</h4>
                <div class="level-wpm">${lvl.baseWPM} WPM | ${lvl.maxHp} HP</div>
                ${badgeHtml}
            `;

            if (isUnlocked) {
                card.onclick = () => this.startArcadeLevel(lvl.level);
            }

            grid.appendChild(card);
        });
    }

    restartMatch() {
        document.getElementById('modalGameOver').classList.add('hidden');
        document.getElementById('modalPause').classList.add('hidden');
        if (combat.mode === 'arcade') this.startArcadeLevel(combat.currentLevel);
        else if (combat.mode === 'local2p') this.startLocal2PMode();
        else this.startArcadeLevel(1);
    }

    showMainMenu() {
        this.isMatchActive = false;
        this.isMatchPaused = false;
        combat.stopAI();
        this.closeModals();
        document.getElementById('modalStart').classList.remove('hidden');
    }

    openP2PModal() {
        this.closeModals();
        document.getElementById('modalP2P').classList.remove('hidden');
    }

    closeP2PModal() {
        this.pendingGameStart = null;
        document.getElementById('modalP2P').classList.add('hidden');
        if (!this.isMatchActive) {
            document.getElementById('modalStart').classList.remove('hidden');
        }
    }

    openCampaignModal() {
        this.closeModals();
        this.renderCampaignGrid();
        document.getElementById('modalCampaign').classList.remove('hidden');
    }

    closeCampaignModal() {
        this.pendingGameStart = null;
        document.getElementById('modalCampaign').classList.add('hidden');
        if (!this.isMatchActive) {
            document.getElementById('modalStart').classList.remove('hidden');
        }
    }

    closeModals() {
        this.pendingGameStart = null;
        document.getElementById('modalStart').classList.add('hidden');
        document.getElementById('modalP2P').classList.add('hidden');
        document.getElementById('modalP2PLobby').classList.add('hidden');
        document.getElementById('modalCampaign').classList.add('hidden');
        document.getElementById('modalContentChoice').classList.add('hidden');
        document.getElementById('modalCustomScript').classList.add('hidden');
        document.getElementById('modalPause').classList.add('hidden');
        document.getElementById('modalAuth').classList.add('hidden');
        document.getElementById('modalGameOver').classList.add('hidden');
    }
}

let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new GameApp();
});
