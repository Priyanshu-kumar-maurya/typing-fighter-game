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

    // Host creates an online game room
    async createRoom(onSuccess, onError) {
        if (typeof Peer === 'undefined') {
            if (onError) onError("PeerJS network library not loaded. Check internet connection.");
            return;
        }

        this.roomCode = this.generateRoomCode();
        const peerId = CONFIG.GAME.P2P_PEER_PREFIX + this.roomCode;
        this.isHost = true;

        // Try getting mic stream
        await this.startMicrophone();

        try {
            this.peer = new Peer(peerId, { debug: 1 });

            this.peer.on('open', (id) => {
                console.log(`[P2P] Room created with Code: ${this.roomCode}`);
                if (onSuccess) onSuccess(this.roomCode);
            });

            this.peer.on('connection', (connection) => {
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

            this.peer.on('error', (err) => {
                console.error('[P2P Error]', err);
                if (err.type === 'unavailable-id') {
                    this.createRoom(onSuccess, onError);
                } else if (onError) {
                    onError(err.message || "Failed to create room");
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

        const cleanCode = this.sanitizeInput(code).toUpperCase();
        this.roomCode = cleanCode;
        const hostPeerId = CONFIG.GAME.P2P_PEER_PREFIX + cleanCode;
        this.isHost = false;

        // Try getting mic stream
        await this.startMicrophone();

        try {
            this.peer = new Peer({ debug: 1 });

            this.peer.on('open', () => {
                console.log(`[P2P] Connecting to Host Room: ${cleanCode}`);
                this.conn = this.peer.connect(hostPeerId, { reliable: true });
                this.setupConnectionListeners();

                // Call Host Voice Stream
                if (this.localAudioStream) {
                    const voiceCall = this.peer.call(hostPeerId, this.localAudioStream);
                    this.setupVoiceCall(voiceCall);
                }

                const timeout = setTimeout(() => {
                    if (!this.isConnected && onError) {
                        onError("Room Code not found or host timed out.");
                    }
                }, 8000);

                this.conn.on('open', () => {
                    clearTimeout(timeout);
                    if (onSuccess) onSuccess();
                });
            });

            this.peer.on('call', (call) => {
                call.answer(this.localAudioStream);
                this.setupVoiceCall(call);
            });

            this.peer.on('error', (err) => {
                console.error('[P2P Error]', err);
                if (onError) onError("Unable to connect to room code. Ensure host is waiting.");
            });
        } catch (e) {
            if (onError) onError(e.message);
        }
    }

    setupVoiceCall(call) {
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

    setupConnectionListeners() {
        if (!this.conn) return;

        this.conn.on('open', () => {
            this.isConnected = true;
            console.log('[P2P] Data connection fully established!');
            if (this.onConnectCallback) this.onConnectCallback();
        });

        this.conn.on('data', (rawMsg) => {
            if (!rawMsg || typeof rawMsg !== 'object') return;

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
            console.log('[P2P] Connection closed by peer.');
            if (this.onDisconnectCallback) this.onDisconnectCallback();
        });

        this.conn.on('error', (err) => {
            console.error('[P2P Conn Error]', err);
        });
    }

    send(type, payload = {}) {
        if (this.conn && this.isConnected) {
            this.conn.send({
                type: type,
                senderIsHost: this.isHost,
                payload: payload,
                timestamp: Date.now()
            });
        }
    }

    disconnect() {
        if (this.mediaCall) this.mediaCall.close();
        if (this.localAudioStream) {
            this.localAudioStream.getTracks().forEach(track => track.stop());
        }
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
        this.isConnected = false;
        this.isVoiceConnected = false;
        this.conn = null;
        this.peer = null;
    }
}

const p2p = new P2PNetwork();
