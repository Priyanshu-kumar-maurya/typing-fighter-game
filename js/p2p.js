// Typing Fighter - WebRTC P2P Multiplayer & Live Voice Chat Manager (Auto-Match Engine)

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

        // Standard Google & Twilio Free STUN Servers for NAT / Mobile 4G/5G Traversal
        this.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ];

        // Clean up peer on page unload/close
        window.addEventListener('beforeunload', () => this.disconnect());
    }

    sanitizeInput(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[^\w\s-]/gi, '').substring(0, 12);
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

    // UNIFIED AUTO-MATCH: Both friends type ANY SAME code and click CONNECT!
    async connectToRoom(code, onSuccess, onError, onWaitingHost) {
        if (typeof Peer === 'undefined') {
            if (onError) onError("PeerJS library not loaded. Check internet connection.");
            return;
        }

        this.disconnect();

        const cleanCode = this.sanitizeInput(code).toUpperCase();
        if (cleanCode.length < 2) {
            if (onError) onError("Please type a Room Code (min 2 characters).");
            return;
        }

        this.roomCode = cleanCode;
        const hostPeerId = (CONFIG.GAME.P2P_PEER_PREFIX || 'tf_room_') + cleanCode;

        // Capture Mic stream
        await this.startMicrophone();

        try {
            // debug: 0 silences internal PeerJS console logs during room probing
            const tempPeer = new Peer({
                debug: 0,
                config: { iceServers: this.iceServers }
            });

            let joinSucceeded = false;
            let joinAttempted = false;

            tempPeer.on('open', () => {
                console.log(`[Auto-Match] Checking if Room "${cleanCode}" exists...`);
                joinAttempted = true;
                const conn = tempPeer.connect(hostPeerId, { reliable: true, serialization: 'json' });

                const joinTimeout = setTimeout(() => {
                    if (!joinSucceeded) {
                        console.log(`[Auto-Match] Room "${cleanCode}" is not active yet. Creating Room as Host...`);
                        tempPeer.destroy();
                        this.becomeHost(cleanCode, onSuccess, onError, onWaitingHost);
                    }
                }, 1200);

                conn.on('open', () => {
                    joinSucceeded = true;
                    clearTimeout(joinTimeout);
                    console.log(`[Auto-Match] Joined existing Room "${cleanCode}" as Guest!`);
                    this.peer = tempPeer;
                    this.conn = conn;
                    this.isHost = false;
                    this.setupConnectionListeners(onError);

                    if (this.localAudioStream) {
                        const voiceCall = this.peer.call(hostPeerId, this.localAudioStream);
                        this.setupVoiceCall(voiceCall);
                    }

                    if (onSuccess) onSuccess();
                });

                tempPeer.on('error', (err) => {
                    if (!joinSucceeded) {
                        clearTimeout(joinTimeout);
                        tempPeer.destroy();
                        this.becomeHost(cleanCode, onSuccess, onError, onWaitingHost);
                    }
                });
            });

            tempPeer.on('error', (err) => {
                if (!joinAttempted && !joinSucceeded) {
                    tempPeer.destroy();
                    this.becomeHost(cleanCode, onSuccess, onError, onWaitingHost);
                }
            });
        } catch (e) {
            this.becomeHost(cleanCode, onSuccess, onError, onWaitingHost);
        }
    }

    async becomeHost(cleanCode, onSuccess, onError, onWaitingHost) {
        this.roomCode = cleanCode;
        const peerId = (CONFIG.GAME.P2P_PEER_PREFIX || 'tf_room_') + cleanCode;
        this.isHost = true;

        try {
            this.peer = new Peer(peerId, {
                debug: 0,
                config: { iceServers: this.iceServers }
            });

            this.peer.on('open', (id) => {
                console.log(`[Auto-Match] Room "${cleanCode}" created. Waiting for friend to type "${cleanCode}"...`);
                if (onWaitingHost) onWaitingHost(cleanCode);
            });

            this.peer.on('connection', (connection) => {
                if (this.isConnected && this.conn && this.conn.open) {
                    connection.send({
                        type: 'ROOM_FULL',
                        payload: { message: `Room "${cleanCode}" is Full (2/2 players fighting).` }
                    });
                    setTimeout(() => connection.close(), 500);
                    return;
                }

                console.log('[Auto-Match] Friend connected to your room!');
                this.conn = connection;
                this.setupConnectionListeners();
            });

            this.peer.on('call', (call) => {
                console.log('[Voice Chat] Incoming call received');
                call.answer(this.localAudioStream);
                this.setupVoiceCall(call);
            });

            this.peer.on('disconnected', () => {
                if (this.peer && !this.peer.destroyed) this.peer.reconnect();
            });

            this.peer.on('error', (err) => {
                console.warn('[P2P Error Handled]', err.type || err.message);
                if (err.type === 'unavailable-id') {
                    if (onError) onError(`Room "${cleanCode}" is currently full. Pick a different room code!`);
                } else if (err.type === 'disconnected' || err.message?.includes('Lost connection')) {
                    if (this.peer && !this.peer.destroyed) this.peer.reconnect();
                } else if (!this.isConnected && onError) {
                    onError(err.message || "Failed to create room.");
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
                    onCustomError(rawMsg.payload?.message || "Room is Full! Maximum 2 players allowed.");
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
