/**
 * @fileoverview WordEngine
 * Manages all typing-prompt logic for Typing Fighter:
 *   - Difficulty-aware word selection from CONFIG.WORDS dictionary
 *   - Custom user script parsing (raw text → word list)
 *   - Anti-repetition rolling history buffer (last 40 words are excluded)
 *   - Character-level DOM rendering with correct/current/untyped markers
 *
 * @module WordEngine
 */

'use strict';

class WordEngine {

    constructor() {
        /** @type {'words'|'custom'} Active content source */
        this.contentMode = 'words';

        /** @type {string[]} Words parsed from the user's custom script */
        this.customScriptWords = [];

        /** Current index into the custom script word list (cycles) */
        this.customScriptIndex = 0;

        /**
         * Rolling history buffer — words added here are excluded from random
         * selection until the buffer is full and resets (~40-word cooldown).
         * @type {string[]}
         */
        this.recentHistory = [];

        /** The word currently being typed by the active player */
        this.currentWord = '';

        /** How many characters of currentWord have been correctly typed */
        this.typedCharIndex = 0;
    }

    // ── PUBLIC API ────────────────────────────────────────────────────────────

    /**
     * Reset state for the start of a new match.
     * Clears history and resets the custom-script cursor.
     */
    reset() {
        this.customScriptIndex = 0;
        this.recentHistory     = [];
        this.typedCharIndex    = 0;
        this.currentWord       = '';
    }

    /**
     * Load a custom user-provided text as the word source.
     * Splits on whitespace; HTML entities are NOT escaped here
     * (the raw text is used so the player types what they see).
     *
     * @param  {string}  rawText - Pasted or typed text from the user
     * @returns {boolean} true if the script was accepted (non-empty)
     */
    setCustomScript(rawText) {
        const words = String(rawText).trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) return false;
        this.customScriptWords   = words;
        this.contentMode         = 'custom';
        this.customScriptIndex   = 0;
        return true;
    }

    /**
     * Generate and store the next word/prompt based on current game context.
     *
     * Priority order:
     *   1. Super Power Words  (when player's super meter is charged)
     *   2. Custom Script      (when user loaded their own text)
     *   3. Random Dictionary  (anti-repeating, difficulty-scaled)
     *
     * @param  {string}  difficulty   - Bot difficulty tag ('Easy','Medium','Hard',…)
     * @param  {boolean} isSuperReady - Whether player's super move is charged
     * @returns {string} The chosen word (also stored as this.currentWord)
     */
    nextWord(difficulty, isSuperReady) {
        this.typedCharIndex = 0;

        if (isSuperReady) {
            return this._pick(CONFIG.WORDS.POWER_WORDS);
        }

        if (this.contentMode === 'custom' && this.customScriptWords.length > 0) {
            const word = this.customScriptWords[this.customScriptIndex % this.customScriptWords.length];
            this.customScriptIndex++;
            return (this.currentWord = word);
        }

        return this._pickFromDictionary(difficulty);
    }

    /**
     * Render the current word into a DOM container element.
     * Each character becomes a <span> with one of three CSS classes:
     *   .char-correct  → already typed correctly
     *   .char-current  → the next character to type (blinking cursor)
     *   .char-untyped  → not yet reached
     *   .char-space    → a space character (displayed as visual gap)
     *
     * @param {HTMLElement} container - Element to render spans into
     */
    renderDisplay(container) {
        if (!container) return;
        container.innerHTML = '';

        for (let i = 0; i < this.currentWord.length; i++) {
            const ch   = this.currentWord[i];
            const span = document.createElement('span');

            if (ch === ' ') {
                span.className = 'char-space';
            } else {
                span.innerText = ch;
                if (i < this.typedCharIndex)     span.className = 'char-correct';
                else if (i === this.typedCharIndex) span.className = 'char-current';
                else                              span.className = 'char-untyped';
            }

            container.appendChild(span);
        }
    }

    // ── PRIVATE HELPERS ───────────────────────────────────────────────────────

    /**
     * Pick a random word from the dictionary, scaled by difficulty,
     * while excluding recently-used words.
     *
     * @private
     * @param {string} difficulty
     */
    _pickFromDictionary(difficulty) {
        // Build difficulty-scaled word pool
        let pool = [...CONFIG.WORDS.EASY, ...CONFIG.WORDS.MEDIUM]; // Medium is always included

        const hardTiers = ['Hard', 'Expert', 'NIGHTMARE', 'BOSS', 'SUPER BOSS', 'GOD MODE'];
        if (hardTiers.includes(difficulty)) {
            pool = pool.concat(CONFIG.WORDS.HARD);
        }

        // Filter out recent words; reset buffer when exhausted
        let available = pool.filter(w => !this.recentHistory.includes(w));
        if (available.length === 0) {
            this.recentHistory = [];
            available = pool;
        }

        const word = available[Math.floor(Math.random() * available.length)];

        // Push to rolling buffer (max 40 entries)
        this.recentHistory.push(word);
        if (this.recentHistory.length > 40) this.recentHistory.shift();

        return (this.currentWord = word);
    }

    /**
     * Pick a random entry from an array and store it as currentWord.
     * @private
     * @param {string[]} arr
     */
    _pick(arr) {
        return (this.currentWord = arr[Math.floor(Math.random() * arr.length)]);
    }
}
