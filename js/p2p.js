// Typing Fighter - WebRTC P2P Multiplayer & Live Voice Chat Manager

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

        this.onMessageCallback = null;
        this.onConnectCallback = null;
        this.onDisconnectCallback = null;
        this.onVoiceStateCallback = null;

        // Standard Google Free STUN Servers for NAT / Mobile 4G/5G Traversal
        this.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ];
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    sanitizeInput(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[^\w\s-]/gi, '').substring(0, 10);
    }

    // Capture Microphone Stream
    async startMicrophone() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn("[Voice Chat] Microphone API not supported.");
                return false;
            }
            this.localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            console.log("[Voice Chat] Microphone captured successfully.");
            return true;
        } catch (e) {
            console.warn("[Voice Chat] Microphone access denied or not available:", e.message);
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

    // Host creates an online game room (supports Custom Room Code or Auto Generated)
    async createRoom(customCode, onSuccess, onError) {
        if (typeof Peer === 'undefined') {
            if (onError) onError("PeerJS network library not loaded. Check internet connection.");
            return;
        }

        // Clean up any previous session
        this.disconnect();

        const cleanCustom = this.sanitizeInput(customCode).toUpperCase();
        this.roomCode = cleanCustom.length >= 3 ? cleanCustom : this.generateRoomCode();
        const peerId = (CONFIG.GAME.P2P_PEER_PREFIX || 'tf_room_') + this.roomCode;
        this.isHost = true;

        // Try getting mic stream
        await this.startMicrophone();

        try {
            this.peer = new Peer(peerId, {
                debug: 1,
                config: { iceServers: this.iceServers }
            });

            this.peer.on('open', (id) => {
                console.log(`[P2P] Room created with Code: ${this.roomCode}`);
                if (onSuccess) onSuccess(this.roomCode);
            });

            this.peer.on('connection', (connection) => {
                // CAPACITY CAP: Max 2 Players allowed in room! Reject 3rd connection if already connected.
                if (this.isConnected && this.conn && this.conn.open) {
                    console.warn('[P2P] 3rd connection rejected: Room Full.');
                    connection.send({
                        type: 'ROOM_FULL',
                        payload: { message: "Room is Full! Maximum 2 players allowed." }
                    });
                    setTimeout(() => connection.close(), 500);
                    return;
                }

                console.log('[P2P] Guest connected to room');
                this.conn = connection;
                this.setupConnectionListeners();
            });

            // Listen for incoming Voice Calls
            this.peer.on('call', (call) => {
                console.log('[Voice Chat] Incoming call received');
                call.answer(this.localAudioStream);
                this.setupVoiceCall(call);
            });

            this.peer.on('disconnected', () => {
                console.warn('[P2P] Signaling broker disconnected. Attempting reconnect...');
                if (this.peer && !this.peer.destroyed) {
                    this.peer.reconnect();
                }
            });

            this.peer.on('error', (err) => {
                console.warn('[P2P Error Handled]', err.type || err.message);
                if (err.type === 'unavailable-id') {
                    if (onError) onError(`Room Code "${this.roomCode}" is already in use by another active host! Choose a different custom code.`);
                } else if (err.type === 'disconnected' || err.message?.includes('Lost connection')) {
                    if (this.peer && !this.peer.destroyed) this.peer.reconnect();
                } else if (!this.isConnected && onError) {
                    onError(err.message || "Failed to create room code.");
                }
            });
        } catch (e) {
            if (onError) onError(e.message);
        }
    }

    // Guest joins an existing online room code
    async joinRoom(code, onSuccess, onError) {
        if (typeof Peer === 'undefined') {
            if (onError) onError("PeerJS library not loaded.");
            return;
        }

        // Clean up any previous session
        this.disconnect();

        const cleanCode = this.sanitizeInput(code).toUpperCase();
        if (cleanCode.length < 3) {
            if (onError) onError("Please enter a valid Room Code (min 3 chars).");
            return;
        }

        this.roomCode = cleanCode;
        const hostPeerId = (CONFIG.GAME.P2P_PEER_PREFIX || 'tf_room_') + cleanCode;
        this.isHost = false;

        // Try getting mic stream
        await this.startMicrophone();

        try {
            this.peer = new Peer({
                debug: 1,
                config: { iceServers: this.iceServers }
            });

            this.peer.on('open', () => {
                console.log(`[P2P] Connecting to Host Room: ${cleanCode}`);
                this.conn = this.peer.connect(hostPeerId, {
                    reliable: true,
                    serialization: 'json'
                });
                this.setupConnectionListeners(onError);

                // Call Host Voice Stream
                if (this.localAudioStream) {
                    const voiceCall = this.peer.call(hostPeerId, this.localAudioStream);
                    this.setupVoiceCall(voiceCall);
                }

                const timeout = setTimeout(() => {
                    if (!this.isConnected && onError) {
                        onError(`Room Code "${cleanCode}" not found or host timed out.`);
                    }
                }, 10000);

                this.conn.on('open', () => {
                    clearTimeout(timeout);
                    if (onSuccess) onSuccess();
                });
            });

            this.peer.on('call', (call) => {
                call.answer(this.localAudioStream);
                this.setupVoiceCall(call);
            });

            this.peer.on('disconnected', () => {
                console.warn('[P2P] Signaling broker disconnected. Attempting reconnect...');
                if (this.peer && !this.peer.destroyed) {
                    this.peer.reconnect();
                }
            });

            this.peer.on('error', (err) => {
                console.warn('[P2P Error Handled]', err.type || err.message);
                if (err.type === 'disconnected' || err.message?.includes('Lost connection')) {
                    if (this.peer && !this.peer.destroyed) this.peer.reconnect();
                } else if (!this.isConnected && onError) {
                    onError(`Unable to connect to Room "${cleanCode}". Ensure host is waiting.`);
                }
            });
        } catch (e) {
            if (onError) onError(e.message);
        }
    }

    setupVoiceCall(call) {
        if (!call) return;
        this.mediaCall = call;
        call.on('stream', (remoteStream) => {
            console.log('[Voice Chat] Remote Voice Stream received!');
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
    }

    setupConnectionListeners(onCustomError) {
        if (!this.conn) return;

        this.conn.on('open', () => {
            this.isConnected = true;
            console.log('[P2P] Data connection fully established!');
            if (this.onConnectCallback) this.onConnectCallback();
        });

        this.conn.on('data', (rawMsg) => {
            if (!rawMsg || typeof rawMsg !== 'object') return;

            // Handle Room Full rejection from Host
            if (rawMsg.type === 'ROOM_FULL') {
                this.isConnected = false;
                if (onCustomError) {
                    onCustomError("Room is Full! Maximum 2 players allowed in this room.");
                } else if (this.onDisconnectCallback) {
                    this.onDisconnectCallback("Room is Full! Maximum 2 players allowed.");
                }
                this.disconnect();
                return;
            }

            const sanitizedMsg = {
                type: String(rawMsg.type || ''),
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
            console.log('[P2P] Connection closed by peer. Room slot freed.');
            if (this.onDisconnectCallback) this.onDisconnectCallback();
        });

        this.conn.on('error', (err) => {
            console.error('[P2P Conn Error]', err);
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

    disconnect() {
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
    }
}

const p2p = new P2PNetwork();
