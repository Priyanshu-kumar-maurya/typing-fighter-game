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

        // Dom Elements
        this.typeInput = document.getElementById('typeInput');
        this.wordDisplay = document.getElementById('wordDisplay');
        this.superReadyBanner = document.getElementById('superReadyBanner');
        this.scriptTextarea = document.getElementById('customScriptTextarea');

        this.init();
    }

    init() {
        // Initialize Renderer
        this.renderer = new ArenaRenderer('gameCanvas');

        // Setup Keydown Listener
        window.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));
        
        // Keep hidden input focused on click/tap anywhere on canvas or typing area
        const focusInput = () => {
            if (this.typeInput) this.typeInput.focus();
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
        document.getElementById('btnSoundToggle').addEventListener('click', () => {
            audio.muted = !audio.muted;
            document.getElementById('btnSoundToggle').innerText = audio.muted ? "🔇 Sound: OFF" : "🔊 Sound: ON";
        });

        // P2P Tab Switchers
        document.getElementById('tabHost').addEventListener('click', () => {
            document.getElementById('tabHost').classList.add('active');
            document.getElementById('tabJoin').classList.remove('active');
            document.getElementById('p2pHostSection').classList.remove('hidden');
            document.getElementById('p2pJoinSection').classList.add('hidden');
        });

        document.getElementById('tabJoin').addEventListener('click', () => {
            document.getElementById('tabJoin').classList.add('active');
            document.getElementById('tabHost').classList.remove('active');
            document.getElementById('p2pJoinSection').classList.remove('hidden');
            document.getElementById('p2pHostSection').classList.add('hidden');
        });

        // P2P Action Buttons
        document.getElementById('btnCreateRoom').addEventListener('click', () => this.handleCreateP2PRoom());
        document.getElementById('btnCopyCode').addEventListener('click', () => this.copyRoomCode());
        document.getElementById('btnJoinRoom').addEventListener('click', () => this.handleJoinP2PRoom());

        // Header buttons
        document.getElementById('btnOpenP2P').addEventListener('click', () => this.openP2PModal());
        document.getElementById('btnOpenArcade').addEventListener('click', () => this.openCampaignModal());

        // Combat Engine GameOver Hook
        combat.onGameOverCallback = (winner) => this.handleGameOver(winner);
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
        const name = document.getElementById('guestNameInput').value;
        const age = document.getElementById('guestAgeInput').value;

        const res = auth.loginAsGuest(name, age);
        if (res.success) {
            this.updateUserHeaderUI();
            this.closeAuthModal();
            this.showMainMenu();
        }
    }

    handleMobileRegister() {
        const name = document.getElementById('regNameInput').value;
        const age = document.getElementById('regAgeInput').value;
        const mobile = document.getElementById('regMobileInput').value;
        const pass = document.getElementById('regPassInput').value;
        const status = document.getElementById('authStatus');

        const res = auth.registerWithMobile(name, age, mobile, pass);
        if (res.success) {
            status.style.color = "#00ff88";
            status.innerText = "Account registered & logged in successfully! 🎉";
            setTimeout(() => {
                this.updateUserHeaderUI();
                this.closeAuthModal();
                this.showMainMenu();
            }, 600);
        } else {
            status.style.color = "#ff0055";
            status.innerText = res.message;
        }
    }

    handleMobileLogin() {
        const mobile = document.getElementById('loginMobileInput').value;
        const pass = document.getElementById('loginPassInput').value;
        const status = document.getElementById('authStatus');

        const res = auth.loginWithMobile(mobile, pass);
        if (res.success) {
            status.style.color = "#00ff88";
            status.innerText = "Welcome back, " + res.user.name + "! 🎉";
            setTimeout(() => {
                this.updateUserHeaderUI();
                this.closeAuthModal();
                this.showMainMenu();
            }, 600);
        } else {
            status.style.color = "#ff0055";
            status.innerText = res.message;
        }
    }

    updateUserHeaderUI() {
        if (!auth.currentUser) return;
        const nameElem = document.getElementById('headerUserName');
        const metaElem = document.getElementById('headerUserMeta');

        const lvl = auth.currentUser.unlockedLevel || combat.unlockedLevel || 1;
        const typeTag = auth.currentUser.type === 'registered' ? '📱 Registered' : '🎮 Guest';

        if (nameElem) nameElem.innerText = auth.currentUser.name;
        if (metaElem) metaElem.innerText = `${typeTag} | Age: ${auth.currentUser.age || 18} | Stage ${lvl}`;

        // Sync unlocked level to combat engine
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
            btn.innerText = isEnabled ? "🎙️ Mic: ON" : "🎙️ Mic: MUTED";
            btn.style.color = isEnabled ? "var(--neon-cyan)" : "#ff0055";
        }
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
            this.setupPlayerUI(1, auth.currentUser.name, "⚡", "#00f0ff");
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
            this.setupPlayerUI(1, auth.currentUser ? auth.currentUser.name : "PLAYER 1", "⚡", "#00f0ff");
            this.setupPlayerUI(2, "PLAYER 2", "🔥", "#ff0055");
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

    handleGlobalKeyDown(e) {
        // ANTI-CHEAT SECURITY: Ensure event is trusted
        if (e.isTrusted === false) {
            console.warn("[ANTI-CHEAT] Fake untrusted keypress blocked!");
            return;
        }

        // Escape key pauses/resumes active game
        if (e.key === 'Escape') {
            if (this.isMatchActive) {
                if (this.isMatchPaused) this.resumeMatch();
                else this.pauseMatch();
            } else {
                this.showMainMenu();
            }
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

            // TRIGGER IMMEDIATE PUNCH / STRIKE ON EVERY SINGLE CORRECT KEYSTROKE! 🥊
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
            document.getElementById('p2Avatar').innerText = avatar;
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
            alert("Please paste or type your custom script text before starting.");
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
            this.pendingGameStart = () => {
                this.closeModals();
                combat.reset('p2p');
                document.getElementById('stageBadge').innerText = `P2P ONLINE`;
                this.setupPlayerUI(1, auth.currentUser ? auth.currentUser.name : "HERO (YOU)", "⚡", "#00f0ff");
                this.setupPlayerUI(2, "FRIEND (ONLINE)", "🎮", "#ff0055");
                this.startMatch();
            };
            this.openContentChoiceModal();
        };

        p2p.onMessageCallback = (data) => {
            const { type, payload } = data;
            if (type === 'KEYSTROKE') {
                // Opponent typed a key! Micro hit animation
                this.renderer.triggerAttack(2, 'light');
            } else if (type === 'ATTACK_COMPLETED') {
                // Friend completed a word attack! Validate damage payload
                const validDamage = Math.min(payload.damage || 0, 50);
                combat.p1.hp = Math.max(0, combat.p1.hp - validDamage);
                this.renderer.triggerAttack(2, payload.isSuper ? 'super' : 'heavy');
                audio.playPunch();
                this.renderer.addFloatingText(this.renderer.f1.x, this.renderer.f1.y - 70, `-${validDamage} HP`, '#ff0055', 28);
                this.updateHUD();
                combat.checkGameOver();
            }
        };

        p2p.onDisconnectCallback = () => {
            alert("Online P2P friend disconnected.");
            this.showMainMenu();
        };
    }

    handleCreateP2PRoom() {
        p2p.createRoom(
            (code) => {
                document.getElementById('roomCodeText').innerText = code;
            },
            (err) => {
                alert("P2P Error: " + err);
            }
        );
    }

    copyRoomCode() {
        const code = document.getElementById('roomCodeText').innerText;
        if (code && code !== '------') {
            navigator.clipboard.writeText(code);
            alert(`Room Code ${code} copied to clipboard! Share with your friend.`);
        }
    }

    handleJoinP2PRoom() {
        const code = document.getElementById('inputRoomCode').value;
        const statusDiv = document.getElementById('p2pJoinStatus');
        if (!code) {
            statusDiv.innerText = "Please enter a valid 5-digit code.";
            return;
        }
        statusDiv.innerHTML = `<span class="spinner"></span> Connecting to Room ${p2p.sanitizeInput(code)}...`;
        p2p.joinRoom(
            code,
            () => {
                statusDiv.innerText = "Connected! Starting battle...";
            },
            (err) => {
                statusDiv.innerText = "Error: " + err;
            }
        );
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

        // Populate Game Over Stats Modal
        if (combat.mode === 'arcade') {
            if (winner === 1) {
                document.getElementById('winnerTitle').innerText = `STAGE ${combat.currentLevel} CLEARED! 🎉`;
                document.getElementById('winnerSubtitle').innerText = combat.currentLevel < CONFIG.CAMPAIGN_LEVELS.length 
                    ? `Target ${combat.bot.baseWPM} WPM Passed! Stage ${combat.currentLevel + 1} Unlocked!` 
                    : "🏆 CONGRATULATIONS! YOU DEFEATED ALL 25 CAMPAIGN BOSSES!";
                if (btnNextLevel) btnNextLevel.classList.remove('hidden');
            } else {
                if (combat.lastDefeatReason && combat.lastDefeatReason.startsWith('WPM_TOO_LOW')) {
                    const reqWPM = combat.lastDefeatReason.split(':')[1];
                    document.getElementById('winnerTitle').innerText = `❌ STAGE ${combat.currentLevel} FAILED!`;
                    document.getElementById('winnerSubtitle').innerText = `⚠️ Speed was ${combat.p1.wpm} WPM. Required speed is ${reqWPM} WPM to pass this Stage!`;
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

        // Rank calculation based on WPM
        let rank = "BEGINNER";
        if (combat.p1.wpm >= 90) rank = "⚡ TYPING GOD";
        else if (combat.p1.wpm >= 70) rank = "🔥 SPEED DEMON";
        else if (combat.p1.wpm >= 50) rank = "⚔️ WARRIOR";
        else if (combat.p1.wpm >= 30) rank = "🥊 STRIKER";
        document.getElementById('statRank').innerText = rank;

        document.getElementById('modalGameOver').classList.remove('hidden');
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

            let badgeHtml = `<span class="level-status-badge status-locked">🔒 LOCKED</span>`;
            if (isCleared) badgeHtml = `<span class="level-status-badge status-cleared">⭐ CLEARED</span>`;
            else if (isUnlocked) badgeHtml = `<span class="level-status-badge status-unlocked">⚔️ UNLOCKED</span>`;

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
