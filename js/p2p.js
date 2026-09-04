// Typing Fighter - WebRTC P2P Multiplayer & Live Voice Chat Manager (Reliable Room Engine v2)

class P2PNetwork {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.mediaCall = null;
        this.localAudioStream = null;
        this.isHost = false;
        this.roomCode = null;
        this.isConnected = false;
        this.isMicMuted = false;
        this.isVoiceConnected = false;
        this._connectingLock = false;  // Prevent double-clicks

        this.onMessageCallback = null;
        this.onConnectCallback = null;
        this.onDisconnectCallback = null;
        this.onVoiceStateCallback = null;

        // Standard Google & Twilio Free STUN Servers for NAT / Mobile 4G/5G Traversal
        this.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ];

        // PeerJS Cloud Server Config — uses peerjs.com free hosted signaling server
        this.peerConfig = {
            debug: 0, // Never log WebRTC internals in production (was leaking peer IDs)
            config: { iceServers: this.iceServers }
        };

        /**
         * Per-message-type rate-limit tracker.
         * Tracks the last accepted timestamp for each message type
         * so an attacker cannot flood a specific message type.
         * @type {Object.<string, number>}
         */
        this._lastMsgTime = {};

        /** Allowlist of valid incoming message types — unknown types are silently dropped */
        this._validMsgTypes = new Set([
            'KEYSTROKE', 'ATTACK_COMPLETED', 'P2P_READY', 'P2P_UNREADY',
            'P2P_CUSTOM_TEXT', 'P2P_GAME_OVER', 'ROOM_FULL',
            'CHAT_MESSAGE', 'EMOJI_REACTION'
        ]);

        /** Minimum milliseconds between ATTACK_COMPLETED messages from one opponent */
        this.ATTACK_RATE_LIMIT_MS = 300;

        window.addEventListener('beforeunload', () => this.disconnect());
    }

    sanitizeInput(str) {
        if (typeof str !== 'string') return '';
        // Allow alphanumeric and hyphens, max 12 chars
        return str.replace(/[^\w-]/gi, '').substring(0, 12);
    }

    // Capture Microphone Stream (non-blocking — game works even without mic)
    async startMicrophone() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn("[Voice Chat] Microphone API not supported.");
                return false;
            }
            this.localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            console.log("[Voice Chat] Microphone captured.");
            return true;
        } catch (e) {
            console.warn("[Voice Chat] Mic denied or unavailable:", e.message);
            return false;
        }
    }

    toggleMic() {
        if (this.localAudioStream) {
            const audioTrack = this.localAudioStream.getAudioTracks()[0];
            if (audioTrack) {
                this.isMicMuted = !this.isMicMuted;
                audioTrack.enabled = !this.isMicMuted;
                if (this.onVoiceStateCallback) this.onVoiceStateCallback(this.isMicMuted);
                return !this.isMicMuted;
            }
        }
        return false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MAIN ENTRY POINT: Both players type the same room code and click Connect.
    //
    // Strategy:
    //   1. Try to BECOME HOST by registering peerId = PREFIX + code.
    //   2. If that fails with "unavailable-id" → the room already exists →
    //      BECOME GUEST and connect to the host's peerId.
    //
    // This is a single Peer creation per user — no wasteful probe step.
    // ─────────────────────────────────────────────────────────────────────────
    async connectToRoom(code, onSuccess, onError, onWaitingHost) {
        if (typeof Peer === 'undefined') {
            if (onError) onError("PeerJS library not loaded. Please check your internet connection.");
            return;
        }

        if (this._connectingLock) {
            console.warn("[P2P] Already connecting — ignoring duplicate call.");
            return;
        }
        this._connectingLock = true;

        // Full cleanup before starting fresh
        this.disconnect();

        const cleanCode = this.sanitizeInput(code).toUpperCase();
        if (cleanCode.length < 2) {
            this._connectingLock = false;
            if (onError) onError("Please enter a Room Code (minimum 2 characters).");
            return;
        }

        this.roomCode = cleanCode;

        // Start mic in background (doesn't block game if denied)
        this.startMicrophone().then(() => {
            console.log("[P2P] Mic setup complete (or skipped).");
        });

        // Try to register as HOST first
        this._tryBecomeHost(cleanCode, onSuccess, onError, onWaitingHost);
    }

    // ─── Step 1: Attempt Host Registration ───────────────────────────────────
    _tryBecomeHost(cleanCode, onSuccess, onError, onWaitingHost) {
        const hostPeerId = (CONFIG.GAME.P2P_PEER_PREFIX || 'tf_room_') + cleanCode;
        console.log(`[P2P] Attempting to register as Host with PeerID: "${hostPeerId}"`);

        try {
            this.peer = new Peer(hostPeerId, this.peerConfig);
        } catch (e) {
            this._connectingLock = false;
            if (onError) onError("Failed to initialize WebRTC. Try refreshing the page.");
            return;
        }

        let hostRegistered = false;

        // HOST REGISTERED SUCCESSFULLY
        this.peer.on('open', (id) => {
            hostRegistered = true;
            this.isHost = true;
            console.log(`[P2P] ✅ HOST registered. Room Code: "${cleanCode}" | PeerID: "${id}"`);
            this._connectingLock = false;
            if (onWaitingHost) onWaitingHost(cleanCode);
        });

        // FRIEND CONNECTED TO OUR HOST ROOM
        this.peer.on('connection', (connection) => {
            // Block 3rd player (only 2 per room, check if fully established)
            if (this.isConnected && this.conn) {
                console.warn("[P2P] Room full — rejecting 3rd connection attempt.");
                try {
                    connection.on('open', () => {
                        connection.send({
                            type: 'ROOM_FULL',
                            payload: { message: `Room "${cleanCode}" is Full (2/2 players). Choose a different code!` }
                        });
                        setTimeout(() => connection.close(), 600);
                    });
                } catch (e) {}
                return;
            }

            console.log('[P2P] ✅ Friend connected to our HOST room! Waiting for channel open...');
            this.conn = connection;
            // isConnected will be set to true inside setupConnectionListeners on 'open' event
            this.setupConnectionListeners(onError, false);
            // onConnectCallback is fired inside setupConnectionListeners on 'open'
        });

        // HOST: Handle incoming voice calls
        this.peer.on('call', (call) => {
            console.log('[Voice Chat] Incoming voice call from friend.');
            if (this.localAudioStream) {
                call.answer(this.localAudioStream);
            } else {
                call.answer(null); // Answer without audio if mic denied
            }
            this.setupVoiceCall(call);
        });

        // HOST: Handle errors
        this.peer.on('error', (err) => {
            console.warn('[P2P Host Error]', err.type, err.message);

            if (err.type === 'unavailable-id') {
                // Room already exists! Switch to GUEST mode
                console.log(`[P2P] Room "${cleanCode}" already exists → joining as GUEST.`);
                this.peer.destroy();
                this.peer = null;
                this._becomeGuest(cleanCode, onSuccess, onError);
            } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
                this._connectingLock = false;
                if (onError) onError(`Connection error (${err.type}). Check internet & try again.`);
            } else if (err.type === 'disconnected') {
                // Try to reconnect signaling server
                if (this.peer && !this.peer.destroyed) {
                    try { this.peer.reconnect(); } catch(e) {}
                }
            } else {
                this._connectingLock = false;
                if (!hostRegistered && onError) {
                    onError(`Network error: ${err.message || err.type}. Please try again.`);
                }
            }
        });

        this.peer.on('disconnected', () => {
            if (this.peer && !this.peer.destroyed) {
                try { this.peer.reconnect(); } catch(e) {}
            }
        });
    }

    // ─── Step 2: Join as Guest (triggered when host's PeerID already taken) ──
    _becomeGuest(cleanCode, onSuccess, onError) {
        const hostPeerId = (CONFIG.GAME.P2P_PEER_PREFIX || 'tf_room_') + cleanCode;
        console.log(`[P2P] Joining as GUEST → connecting to Host PeerID: "${hostPeerId}"`);

        try {
            // Guest uses a random PeerJS ID (no fixed ID needed)
            this.peer = new Peer(this.peerConfig);
        } catch (e) {
            this._connectingLock = false;
            if (onError) onError("Failed to initialize WebRTC for guest. Try refreshing.");
            return;
        }

        this.peer.on('open', (myId) => {
            console.log(`[P2P] GUEST peer opened with ID: "${myId}". Connecting to host...`);
            this.isHost = false;

            // Connect to host's data channel
            const conn = this.peer.connect(hostPeerId, {
                reliable: true,
                serialization: 'json',
                metadata: { role: 'guest', code: cleanCode }
            });

            this.conn = conn;

            let connectTimeout = setTimeout(() => {
                this._connectingLock = false;
                if (!this.isConnected) {
                    if (onError) onError(`Could not reach Room "${cleanCode}". Make sure your friend has opened the same code first!`);
                    this.disconnect();
                }
            }, 8000); // 8s timeout for mobile networks

            conn.on('open', () => {
                clearTimeout(connectTimeout);
                this.isConnected = true;
                this._connectingLock = false;
                console.log(`[P2P] ✅ GUEST connected to Room "${cleanCode}"!`);

                // Setup data/close/error listeners (alreadyOpen=true — skips open handler)
                this.setupConnectionListeners(onError, true);

                // Initiate voice call to host
                if (this.localAudioStream) {
                    const voiceCall = this.peer.call(hostPeerId, this.localAudioStream);
                    this.setupVoiceCall(voiceCall);
                }

                // Show status update in modal
                if (onSuccess) onSuccess();

                // 🔥 CRITICAL FIX: Fire battle start immediately for GUEST
                // (setupConnectionListeners' conn.on('open') never fires since conn is already open)
                if (this.onConnectCallback) this.onConnectCallback();
            });

            conn.on('error', (err) => {
                clearTimeout(connectTimeout);
                this._connectingLock = false;
                console.error('[P2P Guest Conn Error]', err);
                if (onError) onError(`Failed to connect to room. ${err.message || ''}`);
            });
        });

        this.peer.on('error', (err) => {
            this._connectingLock = false;
            console.error('[P2P Guest Peer Error]', err.type, err.message);
            if (onError) onError(`Guest connection error (${err.type}). Try again.`);
        });

        this.peer.on('disconnected', () => {
            if (this.peer && !this.peer.destroyed) {
                try { this.peer.reconnect(); } catch(e) {}
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    setupVoiceCall(call) {
        if (!call) return;
        this.mediaCall = call;

        call.on('stream', (remoteStream) => {
            console.log('[Voice Chat] ✅ Remote voice stream received!');
            this.isVoiceConnected = true;
            let audioElem = document.getElementById('remoteVoiceAudio');
            if (!audioElem) {
                audioElem = document.createElement('audio');
                audioElem.id = 'remoteVoiceAudio';
                audioElem.autoplay = true;
                document.body.appendChild(audioElem);
            }
            audioElem.srcObject = remoteStream;
            audioElem.play().catch(e => console.warn("Audio autoplay blocked:", e));
        });

        call.on('error', (err) => {
            console.warn('[Voice Call Error]', err);
        });
    }

    // alreadyOpen: true when called from guest after conn is already open
    // HOST calls this with alreadyOpen=false (open event fires naturally)
    setupConnectionListeners(onCustomError, alreadyOpen = false) {
        if (!this.conn) return;

        // Only register open listener for HOST — guest fires onConnectCallback directly
        if (!alreadyOpen) {
            this.conn.on('open', () => {
                this.isConnected = true;
                console.log('[P2P] ✅ Data channel fully open (HOST)!');
                if (this.onConnectCallback) this.onConnectCallback();
            });
        }

        this.conn.on('data', (rawMsg) => {
            if (!rawMsg || typeof rawMsg !== 'object') return;

            // Room Full rejection (pre-connection, no allowlist check needed)
            if (rawMsg.type === 'ROOM_FULL') {
                this.isConnected = false;
                const msg = rawMsg.payload?.message || "Room is Full! Max 2 players per room.";
                if (onCustomError) {
                    onCustomError(msg);
                } else if (this.onDisconnectCallback) {
                    this.onDisconnectCallback(msg);
                }
                this.disconnect();
                return;
            }

            const msgType = String(rawMsg.type || '');

            // SECURITY: Drop any message type not on the allowlist
            if (!this._validMsgTypes.has(msgType)) {
                console.warn(`[P2P Security] Unknown message type "${msgType}" — dropped.`);
                return;
            }

            // ── LOBBY / REMATCH messages (safe passthrough) ──────────────────────
            if (msgType === 'P2P_READY' || msgType === 'P2P_UNREADY') {
                if (this.onMessageCallback) {
                    this.onMessageCallback({ type: msgType, senderIsHost: Boolean(rawMsg.senderIsHost), payload: {} });
                }
                return;
            }
            if (msgType === 'P2P_CUSTOM_TEXT') {
                // Sanitize: max 2000 chars, strip html tags
                const safeText = String(rawMsg.payload?.text || '').replace(/<[^>]*>/g, '').substring(0, 2000);
                if (this.onMessageCallback) {
                    this.onMessageCallback({ type: msgType, senderIsHost: Boolean(rawMsg.senderIsHost), payload: { text: safeText } });
                }
                return;
            }
            if (msgType === 'P2P_GAME_OVER') {
                if (this.onMessageCallback) {
                    this.onMessageCallback({ type: msgType, senderIsHost: Boolean(rawMsg.senderIsHost), payload: {} });
                }
                return;
            }

            // ── Live In-Game Chat Messages ─────────────────────────────────────────
            if (msgType === 'CHAT_MESSAGE') {
                if (this.onMessageCallback) {
                    const text = String(rawMsg.payload?.text || '').substring(0, 60);
                    const sender = String(rawMsg.payload?.sender || 'Opponent').substring(0, 20);
                    this.onMessageCallback({
                        type: 'CHAT_MESSAGE',
                        senderIsHost: Boolean(rawMsg.senderIsHost),
                        payload: { text, sender }
                    });
                }
                return;
            }

            // ── Live In-Game Emoji Reactions / Taunts ──────────────────────────────
            if (msgType === 'EMOJI_REACTION') {
                if (this.onMessageCallback) {
                    const emoji = String(rawMsg.payload?.emoji || '🔥').substring(0, 8);
                    this.onMessageCallback({
                        type: 'EMOJI_REACTION',
                        senderIsHost: Boolean(rawMsg.senderIsHost),
                        payload: { emoji }
                    });
                }
                return;
            }

            // ── GAME messages (strict sanitization + rate-limiting) ───────────────
            const now = Date.now();

            // RATE LIMIT: ATTACK_COMPLETED max once per 300ms — flood protection
            if (msgType === 'ATTACK_COMPLETED') {
                const last = this._lastMsgTime['ATTACK_COMPLETED'] || 0;
                if (now - last < this.ATTACK_RATE_LIMIT_MS) {
                    console.warn('[P2P Security] ATTACK_COMPLETED rate-limited — dropped.');
                    return;
                }
                this._lastMsgTime['ATTACK_COMPLETED'] = now;
            }

            // RATE LIMIT: KEYSTROKE max 60/sec (one per ~16ms)
            if (msgType === 'KEYSTROKE') {
                const last = this._lastMsgTime['KEYSTROKE'] || 0;
                if (now - last < 16) return;
                this._lastMsgTime['KEYSTROKE'] = now;
            }

            const sanitizedMsg = {
                type: msgType,
                senderIsHost: Boolean(rawMsg.senderIsHost),
                payload: {
                    damage: Math.max(0, Math.min(parseInt(rawMsg.payload?.damage || 0), 50)),
                    isSuper: Boolean(rawMsg.payload?.isSuper),
                    combo: Math.max(0, Math.min(parseInt(rawMsg.payload?.combo || 0), 100))
                }
            };

            if (this.onMessageCallback) {
                this.onMessageCallback(sanitizedMsg);
            }
        });

        this.conn.on('close', () => {
            this.isConnected = false;
            this.conn = null;
            console.log('[P2P] Connection closed. Room slot freed.');
            if (this.onDisconnectCallback) this.onDisconnectCallback();
        });

        this.conn.on('error', (err) => {
            console.error('[P2P Connection Error]', err);
        });
    }

    send(type, payload = {}) {
        if (this.conn && this.isConnected) {
            try {
                this.conn.send({
                    type: type,
                    senderIsHost: this.isHost,
                    payload: payload,
                    timestamp: Date.now()
                });
            } catch (e) {
                console.warn("[P2P Send Error]", e.message);
            }
        }
    }

    sendChatMessage(text, senderName) {
        return this.send('CHAT_MESSAGE', {
            text: (text || '').substring(0, 60),
            sender: senderName || 'Player'
        });
    }

    sendEmojiReaction(emoji) {
        return this.send('EMOJI_REACTION', {
            emoji: (emoji || '🔥').substring(0, 8)
        });
    }

    disconnect() {
        this._connectingLock = false;
        if (this.mediaCall) {
            try { this.mediaCall.close(); } catch (e) {}
            this.mediaCall = null;
        }
        if (this.localAudioStream) {
            try { this.localAudioStream.getTracks().forEach(track => track.stop()); } catch (e) {}
            this.localAudioStream = null;
        }
        if (this.conn) {
            try { this.conn.close(); } catch (e) {}
            this.conn = null;
        }
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }
        this.isConnected = false;
        this.isVoiceConnected = false;
        this.isHost = false;
        this.roomCode = null;
    }
}

const p2p = new P2PNetwork();
