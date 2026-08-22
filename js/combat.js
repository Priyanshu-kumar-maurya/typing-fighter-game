// Typing Fighter - Combat Engine & WPM Physics

class CombatEngine {
    constructor() {
        this.mode = 'arcade'; // 'arcade' | 'p2p' | 'local2p' | 'practice'
        this.currentLevel = 1;
        this.unlockedLevel = this.getValidatedUnlockedLevel();
        this.bot = CONFIG.CAMPAIGN_LEVELS[0];
        
        // Player 1 Stats
        this.p1 = {
            hp: 100, maxHp: 100,
            superMeter: 0,
            combo: 0, maxCombo: 0,
            wordsCompleted: 0,
            totalKeystrokes: 0,
            correctKeystrokes: 0,
            errors: 0,
            wpm: 0, rawWpm: 0, accuracy: 100,
            superActive: false
        };

        // Player 2 / AI Stats
        this.p2 = {
            hp: 100, maxHp: 100,
            superMeter: 0,
            combo: 0, maxCombo: 0,
            wordsCompleted: 0,
            totalKeystrokes: 0,
            correctKeystrokes: 0,
            errors: 0,
            wpm: 0, rawWpm: 0, accuracy: 100,
            superActive: false
        };

        this.startTime = null;
        this.aiTimer = null;
        this.wordStartTime = null;
        this.currentWord = "";
        this.onGameOverCallback = null;
        this.lastDefeatReason = "";
    }

    getValidatedUnlockedLevel() {
        const val = parseInt(localStorage.getItem('tf_unlocked_level'));
        if (isNaN(val) || val < 1) return 1;
        return Math.min(val, CONFIG.CAMPAIGN_LEVELS.length);
    }

    reset(mode = 'arcade', levelNum = 1) {
        this.mode = mode;
        this.currentLevel = Math.max(1, Math.min(levelNum, CONFIG.CAMPAIGN_LEVELS.length));
        this.bot = CONFIG.CAMPAIGN_LEVELS[this.currentLevel - 1] || CONFIG.CAMPAIGN_LEVELS[0];
        this.lastDefeatReason = "";

        // ── v29: Vitality upgrade adds bonus Max HP ───────────────────────────
        const bonusHp = (typeof upgrades !== 'undefined') ? upgrades.extraMaxHp : 0;
        const maxHpP1 = 100 + bonusHp;
        const maxHpP2 = mode === 'arcade' ? this.bot.maxHp : 100;

        this.p1 = {
            hp: maxHpP1, maxHp: maxHpP1,
            superMeter: 0, combo: 0, maxCombo: 0,
            wordsCompleted: 0, totalKeystrokes: 0, correctKeystrokes: 0, errors: 0,
            wpm: 0, rawWpm: 0, accuracy: 100, superActive: false
        };

        this.p2 = {
            hp: maxHpP2, maxHp: maxHpP2,
            superMeter: 0, combo: 0, maxCombo: 0,
            wordsCompleted: 0, totalKeystrokes: 0, correctKeystrokes: 0, errors: 0,
            wpm: 0, rawWpm: 0, accuracy: 100, superActive: false
        };

        this.startTime = Date.now();
        this.wordStartTime = Date.now();
        if (this.aiTimer) clearInterval(this.aiTimer);
    }

    unlockNextLevel() {
        if (this.currentLevel >= this.unlockedLevel && this.unlockedLevel < CONFIG.CAMPAIGN_LEVELS.length) {
            this.unlockedLevel = this.currentLevel + 1;
            localStorage.setItem('tf_unlocked_level', this.unlockedLevel);
        }
    }

    startAI(onAIAttack) {
        if (this.mode !== 'arcade') return;
        if (this.aiTimer) clearInterval(this.aiTimer);

        this.aiTimer = setInterval(() => {
            if (this.p1.hp <= 0 || this.p2.hp <= 0) return;

            // Base AI attack
            const isHeavy = Math.random() < (0.25 + (this.currentLevel * 0.02));
            let damage = isHeavy
                ? (8 + Math.floor(this.currentLevel * 0.8))
                : (5 + Math.floor(this.currentLevel * 0.5));

            // ── v29: Defense upgrade reduces incoming damage ───────────────────
            const defMult = (typeof upgrades !== 'undefined') ? upgrades.defenseMultiplier : 1;
            damage = Math.max(1, Math.round(damage * defMult));

            this.p1.hp = Math.max(0, this.p1.hp - damage);

            if (onAIAttack) {
                onAIAttack({
                    attackType: isHeavy ? 'heavy' : 'light',
                    damage:     damage,
                    botName:    this.bot.name
                });
            }

            this.checkGameOver();
        }, this.bot.attackInterval);
    }

    stopAI() {
        if (this.aiTimer) clearInterval(this.aiTimer);
    }

    registerKey(playerNum, isCorrect) {
        const player = playerNum === 1 ? this.p1 : this.p2;
        player.totalKeystrokes++;
        if (isCorrect) {
            player.correctKeystrokes++;
        } else {
            player.errors++;
            player.combo = 0; // Break combo on typo
        }
        this.updateWPM(playerNum);
    }

    updateWPM(playerNum) {
        const player = playerNum === 1 ? this.p1 : this.p2;
        const elapsedMinutes = (Date.now() - this.startTime) / 60000;
        if (elapsedMinutes <= 0) return;

        // Standard WPM formula: (Characters / 5) / Minutes
        player.rawWpm = Math.round((player.totalKeystrokes / 5) / elapsedMinutes);
        player.wpm = Math.round((player.correctKeystrokes / 5) / elapsedMinutes);
        player.accuracy = player.totalKeystrokes > 0 
            ? Math.round((player.correctKeystrokes / player.totalKeystrokes) * 100) 
            : 100;
    }

    processWordCompletion(playerNum, word) {
        const player   = playerNum === 1 ? this.p1 : this.p2;
        const opponent = playerNum === 1 ? this.p2 : this.p1;

        const timeTakenMs  = Date.now() - this.wordStartTime;
        const timeTakenSec = timeTakenMs / 1000;
        this.wordStartTime = Date.now();

        // ── Combo tracking ────────────────────────────────────────────────────
        player.combo++;
        if (player.combo > player.maxCombo) player.maxCombo = player.combo;
        player.wordsCompleted++;

        // ── Combo Damage Multiplier ───────────────────────────────────────────
        let comboMultiplier = 1.0;
        if      (player.combo >= 15) comboMultiplier = 2.0;
        else if (player.combo >= 10) comboMultiplier = 1.6;
        else if (player.combo >=  5) comboMultiplier = 1.3;

        // ── Speed Multiplier based on Word Length & Time ──────────────────────
        const speedBonus = Math.max(1.0, (word.length / Math.max(0.8, timeTakenSec)) * 0.4);

        // ── Critical Hit — use upgrade-adjusted window ─────────────────────────
        const critMs     = (typeof upgrades !== 'undefined') ? upgrades.criticalMs : CONFIG.GAME.CRITICAL_MS;
        const isCritical = timeTakenMs < critMs && word.length >= 4;

        // ── Super move check ──────────────────────────────────────────────────
        const isSuper = player.superActive;
        let baseDmg = isSuper ? CONFIG.GAME.SUPER_DAMAGE : (word.length >= 7 ? 14 : CONFIG.GAME.BASE_DAMAGE);

        // ── v29: Attack upgrade adds flat bonus to base damage ────────────────
        if (!isSuper) baseDmg += (typeof upgrades !== 'undefined') ? upgrades.extraDamage : 0;

        let totalDamage = Math.round(baseDmg * comboMultiplier * speedBonus);

        // Apply Critical Hit (2× multiplier)
        if (isCritical && !isSuper) totalDamage = Math.round(totalDamage * 2);

        // ── Rage Mode — use upgrade-adjusted threshold ────────────────────────
        const rageThresh = (typeof upgrades !== 'undefined') ? upgrades.rageThreshold : CONFIG.GAME.RAGE_HP_RATIO;
        const isRage = playerNum === 1 && (player.hp / player.maxHp) < rageThresh;
        if (isRage) totalDamage = Math.round(totalDamage * 1.5);

        // Security cap
        totalDamage = Math.min(totalDamage, 60);

        // ── Apply damage ──────────────────────────────────────────────────────
        opponent.hp = Math.max(0, opponent.hp - totalDamage);

        // ── Combo Heal — use upgrade-adjusted heal amount ─────────────────────
        let healed = 0;
        if (playerNum === 1 && player.combo > 0 && player.combo % CONFIG.GAME.COMBO_HEAL_EVERY === 0) {
            const baseHeal  = CONFIG.GAME.COMBO_HEAL_AMOUNT;
            const bonusHeal = (typeof upgrades !== 'undefined') ? upgrades.extraComboHeal : 0;
            healed = baseHeal + bonusHeal;
            player.hp = Math.min(player.maxHp, player.hp + healed);
        }

        // ── Charge / consume Super Meter ──────────────────────────────────────
        if (!isSuper) {
            player.superMeter = Math.min(
                CONFIG.GAME.SUPER_METER_MAX,
                player.superMeter + CONFIG.GAME.SUPER_METER_PER_WORD
            );
            if (player.superMeter >= CONFIG.GAME.SUPER_METER_MAX) {
                player.superActive = true;
            }
        } else {
            player.superMeter  = 0;
            player.superActive = false;
        }

        this.updateWPM(playerNum);

        const attackData = {
            attacker:   playerNum,
            word:       word,
            damage:     totalDamage,
            isSuper:    isSuper,
            isCritical: isCritical,
            isRage:     isRage,
            healed:     healed,
            isHeavy:    word.length >= 7,
            combo:      player.combo
        };

        this.checkGameOver();
        return attackData;
    }

    checkGameOver() {
        if (this.p1.hp <= 0 || this.p2.hp <= 0) {
            this.stopAI();

            let winner = 1;

            if (this.p1.hp <= 0) {
                winner = 2;
                this.lastDefeatReason = "HEALTH_DEPLETED";
            } else if (this.mode === 'arcade') {
                // RULE: Must meet or exceed target WPM for this level to pass!
                const targetWPM = this.bot.baseWPM;
                if (this.p1.wpm < targetWPM) {
                    winner = 2; // Player loses due to low WPM!
                    this.p1.hp = 0; // Player dies
                    this.lastDefeatReason = `WPM_TOO_LOW:${targetWPM}`;
                } else {
                    winner = 1;
                    this.unlockNextLevel();
                }
            }

            if (this.onGameOverCallback) {
                this.onGameOverCallback(winner);
            }
            return true;
        }
        return false;
    }
}

const combat = new CombatEngine();
