/**
 * @fileoverview PaymentManager — In-Game Payment Gateway & Coin Shop Fulfillment
 *
 * Supports 3 Payment Channels:
 *   1. 💳 Razorpay Standard Checkout (Cards, NetBanking, UPI, Wallets)
 *   2. 📱 Direct UPI & QR Code Gateway (GPay, PhonePe, Paytm, BHIM, Cred)
 *   3. 🧪 Sandbox / Demo Instant Test Pay (For instant development & test plays)
 *
 * Full Transaction Persistence & Digital Receipts stored in localStorage ('tf_transactions').
 *
 * @module PaymentManager
 */

'use strict';

class PaymentManager {

    constructor() {
        /** @type {Object|null} */
        this.activePackage = null;

        /** @type {'upi'|'razorpay'|'sandbox'} */
        this.currentTab = 'upi';

        /** @type {Array<Object>} */
        this.transactions = this._loadTransactions();
        this.usedUTRs = this._loadUsedUTRs();
        this.appIntents = {};
    }

    // ── PERSISTENCE ───────────────────────────────────────────────────────────

    _loadTransactions() {
        try {
            const raw = localStorage.getItem('tf_transactions');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    _saveTransactions() {
        try {
            localStorage.setItem('tf_transactions', JSON.stringify(this.transactions));
        } catch { /* storage full */ }
    }

    _loadUsedUTRs() {
        try {
            const raw = localStorage.getItem('tf_used_utrs');
            return new Set(raw ? JSON.parse(raw) : []);
        } catch {
            return new Set();
        }
    }

    _saveUsedUTRs() {
        try {
            localStorage.setItem('tf_used_utrs', JSON.stringify(Array.from(this.usedUTRs)));
        } catch { /* storage full */ }
    }

    /**
     * NPCI 12-Digit UTR Validator & Anti-Replay Check (from UPIGateway)
     * @param {string} utr
     * @returns {{ valid: boolean, error?: string, sanitized?: string }}
     */
    validateUTR(utr) {
        if (!utr) {
            return { valid: false, error: 'Please enter your 12-digit UPI UTR / Reference number.' };
        }
        const sanitized = String(utr).trim().replace(/[^0-9]/g, '');
        if (sanitized.length !== 12) {
            return {
                valid: false,
                error: `Invalid UTR (${sanitized.length} digits). NPCI requires exactly 12 numeric digits.`,
                sanitized
            };
        }
        if (/^(\d)\1{11}$/.test(sanitized) || sanitized === '123456789012' || sanitized === '012345678901') {
            return {
                valid: false,
                error: 'Invalid dummy UTR! Please enter a genuine 12-digit UPI transaction reference.',
                sanitized
            };
        }
        if (this.usedUTRs && this.usedUTRs.has(sanitized)) {
            return {
                valid: false,
                error: 'This UTR has already been used! Duplicate / replay submission blocked.',
                sanitized
            };
        }
        return { valid: true, sanitized };
    }

    // ── PAYMENT INITIATION ────────────────────────────────────────────────────

    /**
     * Start the payment process for a selected coin package.
     * @param {Object} pkg - Package from CONFIG.COIN_SHOP
     */
    initiatePayment(pkg) {
        if (!pkg) return;
        this.activePackage = pkg;
        this.currentTab = 'upi';

        // Generate UPIGateway NPCI-compliant Intent URI & App Intents (0% MDR)
        const upiId   = CONFIG.PAYMENT.MERCHANT_UPI_ID || 'ky187768@okicici';
        const name    = encodeURIComponent(CONFIG.PAYMENT.MERCHANT_NAME || 'Typing Fighter Arena');
        const note    = encodeURIComponent(`${pkg.label} - ${pkg.coins} Coins`);
        const amount  = Number(pkg.amountInRupees || 49).toFixed(2);
        const txnRef  = `TF${Date.now().toString(36).toUpperCase()}`;

        this.currentOrderId = txnRef;
        this.upiUri = `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR&tn=${note}&tr=${txnRef}&mc=5499`;
        this.appIntents = {
            gpay:    this.upiUri.replace('upi://pay', 'gpay://upi/pay'),
            phonepe: this.upiUri.replace('upi://pay', 'phonepe://pay'),
            paytm:   this.upiUri.replace('upi://pay', 'paytmmp://pay'),
            bhim:    this.upiUri
        };
        this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(this.upiUri)}`;

        // Clear previous UTR input
        const utrInput = document.getElementById('payUtrInput');
        if (utrInput) utrInput.value = '';

        // Render & open payment modal
        if (typeof game !== 'undefined' && game.ui) {
            game.ui.renderPaymentModal(pkg, this);
            game.ui.showModal('modalPayment');
        }
    }

    /**
     * Switch tab inside payment modal (UPI / Razorpay / Sandbox)
     * @param {'upi'|'razorpay'|'sandbox'} tab
     */
    switchTab(tab) {
        this.currentTab = tab;
        const upiSection     = document.getElementById('paySectionUPI');
        const rzpSection     = document.getElementById('paySectionRazorpay');
        const sandboxSection = document.getElementById('paySectionSandbox');

        const btnUpi     = document.getElementById('payTabBtnUPI');
        const btnRzp     = document.getElementById('payTabBtnRazorpay');
        const btnSandbox = document.getElementById('payTabBtnSandbox');

        upiSection?.classList.toggle('hidden', tab !== 'upi');
        rzpSection?.classList.toggle('hidden', tab !== 'razorpay');
        sandboxSection?.classList.toggle('hidden', tab !== 'sandbox');

        btnUpi?.classList.toggle('active', tab === 'upi');
        btnRzp?.classList.toggle('active', tab === 'razorpay');
        btnSandbox?.classList.toggle('active', tab === 'sandbox');
    }

    // ── CHANNEL 1: RAZORPAY STANDARD CHECKOUT ─────────────────────────────────

    /**
     * Open official Razorpay Checkout popup.
     */
    payWithRazorpay() {
        const pkg = this.activePackage;
        if (!pkg) return;

        if (typeof window.Razorpay === 'undefined') {
            game.ui.showToast('Razorpay SDK loading or blocked. You can use Direct UPI or Demo Pay!', 'error', 4000);
            return;
        }

        const user = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser : {};

        const options = {
            key: CONFIG.PAYMENT.RAZORPAY_KEY_ID || 'rzp_test_TYPINGFIGHTER',
            amount: (pkg.amountInRupees || 49) * 100, // Amount in paise
            currency: CONFIG.PAYMENT.CURRENCY || 'INR',
            name: CONFIG.PAYMENT.MERCHANT_NAME || 'Typing Fighter Arena',
            description: `${pkg.label} — ${pkg.coins} Coins Recharge`,
            image: 'favicon.svg',
            prefill: {
                name: user.name || 'Fighter Warrior',
                contact: user.mobile || '9999999999',
                email: 'player@typingfighter.game'
            },
            theme: {
                color: CONFIG.PAYMENT.THEME_COLOR || '#00f0ff'
            },
            handler: (response) => {
                this.completeTransaction({
                    method: 'Razorpay (Cards/NetBanking/UPI)',
                    paymentId: response.razorpay_payment_id || `RZP_${Date.now()}`
                });
            },
            modal: {
                ondismiss: () => {
                    game.ui.showToast('Payment window closed.', 'info', 2500);
                }
            }
        };

        try {
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (response) => {
                game.ui.showToast(`Payment failed: ${response.error?.description || 'Transaction declined'}`, 'error', 4000);
            });
            rzp.open();
        } catch (err) {
            console.warn('[Payment] Razorpay init fallback:', err);
            game.ui.showToast('Razorpay key is in Test Mode. You can also use Instant UPI / Demo Pay!', 'info', 4000);
        }
    }

    // ── CHANNEL 2: DIRECT UPI & QR CODE GATEWAY ───────────────────────────────

    /**
     * Launch UPI intent directly on mobile devices (GPay, PhonePe, Paytm, etc.).
     */
    openUPIAppIntent(app = 'bhim') {
        const targetUri = (this.appIntents && this.appIntents[app]) || this.upiUri;
        if (!targetUri) return;
        window.location.href = targetUri;
        const appLabel = { gpay: 'Google Pay', phonepe: 'PhonePe', paytm: 'Paytm', bhim: 'UPI App' }[app] || 'UPI App';
        game.ui.showToast(`Opening ${appLabel}... Complete payment & enter 12-digit UTR below!`, 'info', 5000);
    }

    /**
     * Copy UPI ID to clipboard.
     */
    copyUPIId() {
        const upiId = CONFIG.PAYMENT.MERCHANT_UPI_ID || 'ky187768@okicici';
        navigator.clipboard.writeText(upiId).then(() => {
            game.ui.showToast(`✅ UPI ID copied: ${upiId}`, 'success', 2500);
        }).catch(() => {
            game.ui.showToast(`UPI ID: ${upiId}`, 'info', 3000);
        });
    }

    /**
     * Confirm UPI payment after user scanned QR code or paid via app.
     * Enforces UPIGateway 12-digit UTR validation & anti-replay check.
     * @param {string} [utr] - 12-digit NPCI UTR number entered by user
     */
    async confirmUPIPayment(utr = '') {
        const pkg = this.activePackage;
        if (!pkg) return;

        const check = this.validateUTR(utr);
        if (!check.valid) {
            game.ui.showToast(`❌ ${check.error}`, 'error', 4000);
            return;
        }

        const cleanUtr = check.sanitized;
        game.ui.showToast('🔍 UPIGateway: Verifying 12-digit UTR...', 'info', 1800);

        // Cross-device anti-replay check via Firebase RTDB (if online)
        const fbUrl = CONFIG.FIREBASE?.databaseURL;
        if (fbUrl && navigator.onLine) {
            try {
                const res = await fetch(`${fbUrl}/used_utrs/${cleanUtr}.json`);
                if (res.ok) {
                    const existing = await res.json();
                    if (existing) {
                        game.ui.showToast('❌ UTR already claimed on another device! Replay blocked.', 'error', 4000);
                        return;
                    }
                    // Reserve UTR in Firebase RTDB
                    await fetch(`${fbUrl}/used_utrs/${cleanUtr}.json`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId: this.currentOrderId || '',
                            amount: pkg.amountInRupees || 49,
                            coins: pkg.coins,
                            timestamp: Date.now()
                        })
                    });
                }
            } catch (e) {
                console.warn('[UPIGateway] Cloud UTR check skipped (offline fallback):', e);
            }
        }

        // Consume UTR locally
        this.usedUTRs.add(cleanUtr);
        this._saveUsedUTRs();

        setTimeout(() => {
            this.completeTransaction({
                method: 'UPIGateway Direct (0% Fee)',
                paymentId: `UPI_UTR_${cleanUtr}`
            });
        }, 900);
    }

    // ── CHANNEL 3: SANDBOX / DEMO INSTANT PAY ─────────────────────────────────

    /**
     * Instant test checkout for demo / developer verification.
     */
    payWithSandbox() {
        const pkg = this.activePackage;
        if (!pkg) return;

        game.ui.showToast('Processing Sandbox Test Payment...', 'info', 1000);

        setTimeout(() => {
            this.completeTransaction({
                method: 'Sandbox / Demo Gateway (Test)',
                paymentId: `DEMO_TEST_${Date.now().toString(36).toUpperCase()}`
            });
        }, 800);
    }

    // ── TRANSACTION FULFILLMENT & RECEIPT ─────────────────────────────────────

    /**
     * Complete the transaction: credit coins, save receipt, play sound, open receipt modal.
     * @param {Object} details
     */
    completeTransaction(details) {
        const pkg = this.activePackage;
        if (!pkg) return;

        const txn = {
            id: details.paymentId || `TF_TXN_${Date.now().toString(36).toUpperCase()}`,
            packageId: pkg.id,
            packageName: pkg.label,
            coins: pkg.coins,
            bonus: pkg.bonus || '',
            amount: pkg.amountInRupees || 49,
            currency: '₹',
            method: details.method || 'Online Payment',
            date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            timestamp: Date.now()
        };

        // 1. Save Transaction Record
        this.transactions.unshift(txn);
        this._saveTransactions();

        // 2. Credit Coins to Player Wallet
        if (typeof upgrades !== 'undefined') {
            upgrades.addCoins(pkg.coins);
        }

        // 3. Audio & UI Refresh
        if (typeof audio !== 'undefined') {
            audio.playVictory();
        }

        if (typeof game !== 'undefined') {
            game._updateCoinDisplay();
            game.ui.renderShop(upgrades);
            game.ui.hideModal('modalPayment');
            game.ui.renderReceiptModal(txn);
            game.ui.showModal('modalReceipt');
            game.ui.showToast(`🎉 Payment Successful! +${pkg.coins} Coins credited!`, 'success', 4500);
        }

        this.activePackage = null;
    }
}

// Global Singleton
const payment = new PaymentManager();
