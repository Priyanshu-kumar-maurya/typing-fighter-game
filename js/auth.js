// Typing Fighter - Player Authentication & Profile Persistence System

/**
 * Deterministic FNV-32a hash of a string.
 * Used to store passwords in a non-reversible form so plain text
 * is NEVER written to localStorage.
 * @param {string} str
 * @returns {string} 8-character hex hash
 */
function _hashPassword(str) {
    let h = 0x811c9dc5 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h  = Math.imul(h, 0x01000193) >>> 0;
    }
    return (h >>> 0).toString(16).padStart(8, '0');
}

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.loadSession();
    }

    // Load accounts DB from localStorage
    getAccountsDB() {
        try {
            const db = localStorage.getItem('tf_user_accounts');
            return db ? JSON.parse(db) : {};
        } catch (e) {
            return {};
        }
    }

    saveAccountsDB(db) {
        localStorage.setItem('tf_user_accounts', JSON.stringify(db));
    }

    // Load active player session
    loadSession() {
        try {
            const sess = localStorage.getItem('tf_current_user');
            if (sess) {
                const u = JSON.parse(sess);
                // Validate that the stored object has the expected shape
                // before trusting it — prevents DevTools-injected payloads
                if (u && typeof u.name === 'string' && typeof u.type === 'string') {
                    // Cap unlocked level to the valid campaign range (1–25)
                    u.unlockedLevel = Math.min(Math.max(parseInt(u.unlockedLevel) || 1, 1), 25);
                    this.currentUser = u;
                }
            }
        } catch (e) {
            this.currentUser = null;
        }
    }

    saveSession() {
        if (this.currentUser) {
            localStorage.setItem('tf_current_user', JSON.stringify(this.currentUser));
            
            // Also sync progress into main DB if registered user
            if (this.currentUser.mobile) {
                const db = this.getAccountsDB();
                db[this.currentUser.mobile] = this.currentUser;
                this.saveAccountsDB(db);
            }

            // Sync unlocked level to combat engine
            localStorage.setItem('tf_unlocked_level', this.currentUser.unlockedLevel || 1);
        }
    }

    // Guest Registration (Name & Age)
    loginAsGuest(name, age) {
        const cleanName = name.trim().substring(0, 15) || "Guest Warrior";
        const parsedAge = parseInt(age) || 18;

        this.currentUser = {
            id: 'guest_' + Date.now(),
            name: cleanName,
            age: parsedAge,
            type: 'guest',
            mobile: null,
            unlockedLevel: 1,
            highWpm: 0,
            matchesPlayed: 0,
            matchesWon: 0,
            createdAt: new Date().toISOString()
        };

        this.saveSession();
        return { success: true, user: this.currentUser };
    }

    // Mobile Registration
    registerWithMobile(name, age, mobile, password) {
        const cleanName = name.trim().substring(0, 15);
        const parsedAge = parseInt(age) || 18;
        const cleanMobile = mobile.trim().replace(/\D/g, '');
        const cleanPass = password.trim();

        if (!cleanName) return { success: false, message: "Please enter your name." };
        if (cleanMobile.length !== 10) return { success: false, message: "Please enter a valid 10-digit mobile number." };
        if (cleanPass.length < 6) return { success: false, message: "Password must be at least 6 characters." };

        const db = this.getAccountsDB();
        if (db[cleanMobile]) {
            return { success: false, message: "Mobile number is already registered! Please Login instead." };
        }

        const newUser = {
            id: 'user_' + cleanMobile,
            name: cleanName,
            age: parsedAge,
            mobile: cleanMobile,
            password: _hashPassword(cleanPass), // FNV-32a hash — plain text never stored
            type: 'registered',
            unlockedLevel: 1,
            highWpm: 0,
            matchesPlayed: 0,
            matchesWon: 0,
            createdAt: new Date().toISOString()
        };

        db[cleanMobile] = newUser;
        this.saveAccountsDB(db);

        this.currentUser = newUser;
        this.saveSession();
        return { success: true, user: this.currentUser };
    }

    // Mobile Login
    loginWithMobile(mobile, password) {
        const cleanMobile = mobile.trim().replace(/\D/g, '');
        const cleanPass = password.trim();

        const db = this.getAccountsDB();
        const user = db[cleanMobile];

        if (!user) {
            return { success: false, message: "Mobile number not found! Please Register first." };
        }

        if (user.password !== _hashPassword(cleanPass)) {
            return { success: false, message: "Incorrect password! Please check and try again." };
        }

        this.currentUser = user;
        this.saveSession();
        return { success: true, user: this.currentUser };
    }

    // Save Progress (Level unlock, WPM stats)
    updateProgress(newUnlockedLevel, wpm = 0, isWin = false) {
        if (!this.currentUser) return;

        if (newUnlockedLevel > (this.currentUser.unlockedLevel || 1)) {
            this.currentUser.unlockedLevel = newUnlockedLevel;
        }

        if (wpm > (this.currentUser.highWpm || 0)) {
            this.currentUser.highWpm = wpm;
        }

        this.currentUser.matchesPlayed = (this.currentUser.matchesPlayed || 0) + 1;
        if (isWin) {
            this.currentUser.matchesWon = (this.currentUser.matchesWon || 0) + 1;
        }

        this.saveSession();
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('tf_current_user');
    }
}

const auth = new AuthManager();
