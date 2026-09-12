// Typing Fighter - HTML5 Canvas 2D Fighter Engine & Visual FX

class ArenaRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.floatingTexts = [];
        this.screenShakeTime = 0;
        this.screenShakeIntensity = 0;
        
        // Fighter positions & animation states
        this.f1 = {
            x: 220, y: 360,
            baseX: 220, baseY: 360, vy: 0, rotation: 0,
            color: '#00f0ff', glow: 'rgba(0, 240, 255, 0.8)',
            state: 'idle', stateTimer: 0,
            facing: 1, hpPercent: 1.0,
            hp: 100, maxHp: 100
        };

        this.f2 = {
            x: 740, y: 360,
            baseX: 740, baseY: 360, vy: 0, rotation: 0,
            color: '#ff0055', glow: 'rgba(255, 0, 85, 0.8)',
            state: 'idle', stateTimer: 0,
            facing: -1, hpPercent: 1.0,
            hp: 100, maxHp: 100
        };

        this.fighterSkin = 'cyber'; // 'cyber' | 'stickman'
        this.arenaTheme = localStorage.getItem('tf_arena_theme') || 'cyber_city';
        this.animFrame = 0;
        this.floatingEmojis = [];
        this.chatBubbles = [];
        this.ambientParticles = [];
        this.initAmbientParticles();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    setSkinMode(skin = 'cyber') {
        this.fighterSkin = skin;
        if (skin === 'stickman') {
            // Close-quarters face-to-face combat stance for stickman mode
            this.f1.baseX = 380;
            this.f2.baseX = 580;
        } else {
            this.f1.baseX = 220;
            this.f2.baseX = 740;
        }
    }

    /**
     * Update a fighter's color and its corresponding glow/shadow color together.
     * Always call this instead of setting f.color directly to keep them in sync.
     *
     * @param {1|2}    playerNum
     * @param {string} color - CSS hex color e.g. '#00f0ff'
     */
    setFighterColor(playerNum, color) {
        const f = playerNum === 1 ? this.f1 : this.f2;
        f.color = color;
        // Derive rgba glow from the hex color with 80% opacity
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        f.glow = `rgba(${r}, ${g}, ${b}, 0.8)`;
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = 960;
        this.canvas.height = 480;
    }

    triggerShake(intensity = 10, duration = 15) {
        this.screenShakeIntensity = intensity;
        this.screenShakeTime = duration;
    }

    triggerAttack(attackerNum, attackType = 'light') {
        const attacker = attackerNum === 1 ? this.f1 : this.f2;
        const defender = attackerNum === 1 ? this.f2 : this.f1;

        attacker.state = attackType === 'super' ? 'attack_super' : (attackType === 'heavy' ? 'attack_heavy' : 'attack_light');
        attacker.stateTimer = 25;

        // Lunge directly into defender's face for up-close combat!
        attacker.x = defender.x - (attacker.facing * 45);

        setTimeout(() => {
            defender.state = 'hurt';
            defender.stateTimer = 25;

            // AIR LAUNCH & HEAVY KNOCKBACK PHYSICS (Stickman game style!)
            if (attackType === 'super') {
                defender.vy = -22; // Flies high into the sky!
                defender.x += defender.facing * -160;
                defender.rotation = defender.facing * -2.5;
                this.triggerShake(20, 15);
            } else if (attackType === 'heavy') {
                defender.vy = -14; // Mid-air launch & knockback
                defender.x += defender.facing * -110;
                defender.rotation = defender.facing * -1.4;
                this.triggerShake(12, 12);
            } else {
                defender.vy = -7; // Pop up jab knockback
                defender.x += defender.facing * -65;
                defender.rotation = defender.facing * -0.5;
                this.triggerShake(6, 8);
            }

            this.spawnHitSparks(defender.x, defender.y - 60, attacker.color, attackType);
        }, 90);
    }

    spawnHitSparks(x, y, color, type) {
        const count = type === 'super' ? 45 : 18;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (type === 'super' ? 14 : 7) + 2;
            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                size: Math.random() * 5 + 2,
                color: color,
                alpha: 1.0,
                life: 1.0,
                decay: Math.random() * 0.05 + 0.03
            });
        }
    }

    addFloatingText(x, y, text, color = '#ffffff', fontSize = 24) {
        this.floatingTexts.push({
            x: x + (Math.random() * 40 - 20),
            y: y - 20,
            text: text,
            color: color,
            fontSize: fontSize,
            alpha: 1.0,
            vy: -2.5
        });
    }

    update() {
        this.animFrame++;

        // Screen Shake decay
        let shakeX = 0, shakeY = 0;
        if (this.screenShakeTime > 0) {
            shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
            shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
            this.screenShakeTime--;
        }

        // Return fighters to base position gradually & apply jump/gravity physics
        [this.f1, this.f2].forEach(f => {
            if (f.stateTimer > 0) {
                f.stateTimer--;
                if (f.stateTimer === 0) f.state = 'idle';
            }

            // GRAVITY & AIR LAUNCH PHYSICS
            // Only simulate when the fighter is airborne (has vertical velocity or is above ground)
            if (f.vy !== 0 || f.y < f.baseY) {
                f.y  += f.vy;
                f.vy += 1.0; // Gravity constant — pulls fighter back to ground

                if (f.y >= f.baseY) {
                    f.y  = f.baseY; // Snap to ground
                    f.vy = 0;       // Zero out velocity on landing
                }
            }

            // Horizontal position lerp back to baseX
            f.x += (f.baseX - f.x) * 0.08;

            // Rotation decay
            f.rotation *= 0.88;
        });

        // Update Particles
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity
            p.life -= p.decay;
        });
        this.particles = this.particles.filter(p => p.life > 0);

        // Update Floating Text
        this.floatingTexts.forEach(ft => {
            ft.y += ft.vy;
            ft.alpha -= 0.025;
        });
        this.floatingTexts = this.floatingTexts.filter(ft => ft.alpha > 0);

        // Update Floating Animated Emojis
        this.floatingEmojis.forEach(fe => {
            fe.y += fe.vy;
            fe.vy *= 0.96;
            fe.scale = Math.min(fe.maxScale, fe.scale + 0.12);
            fe.life -= 0.018;
            fe.alpha = Math.max(0, Math.min(1, fe.life * 1.5));
        });
        this.floatingEmojis = this.floatingEmojis.filter(fe => fe.life > 0);

        // Update In-Arena Chat Speech Bubbles
        this.chatBubbles.forEach(cb => {
            cb.life -= 0.007;
            cb.alpha = Math.max(0, Math.min(1, cb.life * 4));
        });
        this.chatBubbles = this.chatBubbles.filter(cb => cb.life > 0);

        // Update Atmospheric Ambient Particles
        this.updateAmbientParticles();

        return { shakeX, shakeY };
    }

    render() {
        const { shakeX, shakeY } = this.update();
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(shakeX, shakeY);

        // 1. Draw Cyber Arena Stage
        this.drawStage();

        // 2. Draw Fighters & Floating In-Arena Health Bars
        this.drawFighter(this.f1);
        this.drawFighter(this.f2);
        this.drawFighterHpBar(this.f1);
        this.drawFighterHpBar(this.f2);

        // 3. Draw Beam Attack if Super State active
        if (this.f1.state === 'attack_super') this.drawSuperBeam(this.f1, this.f2);
        if (this.f2.state === 'attack_super') this.drawSuperBeam(this.f2, this.f1);

        // 4. Render Particles
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 5. Render Floating Hit Text
        this.floatingTexts.forEach(ft => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.fillStyle = ft.color;
            ctx.font = `900 ${ft.fontSize}px 'Outfit', sans-serif`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });

        // 6. Render Floating Chat Speech Bubbles
        this.drawChatBubbles();

        // 7. Render Floating Animated Emojis
        this.drawFloatingEmojis();

        ctx.restore();
    }

    initAmbientParticles() {
        this.ambientParticles = [];
        const count = 36;
        const w = 960;
        const h = 480;
        for (let i = 0; i < count; i++) {
            this.ambientParticles.push(this.createAmbientParticle(w, h, true));
        }
    }

    createAmbientParticle(w = 960, h = 480, randomizeY = false) {
        const theme = this.arenaTheme || 'cyber_city';
        const startY = randomizeY ? Math.random() * h : (theme === 'lava_inferno' ? h + 10 : -10);
        const startX = Math.random() * w;

        if (theme === 'shaolin_temple') {
            return {
                x: startX,
                y: startY,
                vx: Math.random() * 1.1 + 0.5,
                vy: Math.random() * 0.9 + 0.6,
                size: Math.random() * 5 + 4,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.05,
                color: Math.random() > 0.4 ? '#ffb7c5' : '#ff7799',
                alpha: Math.random() * 0.55 + 0.35,
                type: 'sakura'
            };
        } else if (theme === 'lava_inferno') {
            return {
                x: startX,
                y: startY,
                vx: (Math.random() - 0.5) * 1.6,
                vy: -(Math.random() * 2.2 + 1.2),
                size: Math.random() * 3.5 + 1.5,
                color: Math.random() > 0.6 ? '#ffbb00' : (Math.random() > 0.4 ? '#ff5500' : '#ff2200'),
                alpha: Math.random() * 0.7 + 0.3,
                type: 'ember'
            };
        } else if (theme === 'synthwave_retro') {
            return {
                x: startX,
                y: Math.random() * 350,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                size: Math.random() * 2.5 + 1,
                color: Math.random() > 0.5 ? '#00f0ff' : '#ff00aa',
                alpha: Math.random() * 0.8 + 0.2,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.06 + 0.03,
                type: 'star'
            };
        } else {
            // cyber_city: digital data specks
            return {
                x: startX,
                y: startY,
                vx: (Math.random() - 0.5) * 0.9,
                vy: (Math.random() - 0.5) * 0.9,
                size: Math.random() * 2.5 + 1.2,
                color: Math.random() > 0.5 ? '#00f0ff' : '#a855f7',
                alpha: Math.random() * 0.65 + 0.25,
                type: 'speck'
            };
        }
    }

    updateAmbientParticles() {
        const w = this.canvas ? this.canvas.width : 960;
        const h = this.canvas ? this.canvas.height : 480;

        this.ambientParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.type === 'sakura') {
                p.rot += p.rotSpeed;
                p.x += Math.sin(this.animFrame * 0.04 + p.y * 0.02) * 0.5;
                if (p.y > h + 15 || p.x > w + 20) {
                    Object.assign(p, this.createAmbientParticle(w, h, false));
                    p.y = -10;
                    p.x = Math.random() * w;
                }
            } else if (p.type === 'ember') {
                p.x += Math.sin(this.animFrame * 0.05 + p.y * 0.05) * 0.6;
                p.alpha += (Math.random() - 0.5) * 0.08;
                p.alpha = Math.max(0.15, Math.min(0.95, p.alpha));
                if (p.y < 0) {
                    Object.assign(p, this.createAmbientParticle(w, h, false));
                    p.y = h + 10;
                    p.x = Math.random() * w;
                }
            } else if (p.type === 'star') {
                p.pulse += p.pulseSpeed;
                p.alpha = 0.35 + Math.sin(p.pulse) * 0.45;
                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
            } else {
                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;
            }
        });
    }

    setArenaTheme(theme) {
        if (!CONFIG.ARENA_THEMES || !CONFIG.ARENA_THEMES[theme]) theme = 'cyber_city';
        this.arenaTheme = theme;
        try {
            localStorage.setItem('tf_arena_theme', theme);
        } catch (e) {}
        this.initAmbientParticles();
    }

    drawStage() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const floorY = 380;

        const theme = this.arenaTheme || 'cyber_city';
        if (theme === 'shaolin_temple') {
            this.drawStageShaolinTemple(ctx, w, h, floorY);
        } else if (theme === 'lava_inferno') {
            this.drawStageLavaInferno(ctx, w, h, floorY);
        } else if (theme === 'synthwave_retro') {
            this.drawStageSynthwaveRetro(ctx, w, h, floorY);
        } else {
            this.drawStageCyberCity(ctx, w, h, floorY);
        }

        // Draw atmospheric ambient particles (sakura / embers / stars / specks)
        this.drawAmbientParticles(ctx);
    }

    drawAmbientParticles(ctx) {
        this.ambientParticles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

            if (p.type === 'sakura') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 5;
                ctx.shadowColor = 'rgba(255, 183, 197, 0.6)';
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'ember') {
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 9;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'star') {
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 7;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 5;
                ctx.shadowColor = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }
            ctx.restore();
        });
    }

    // ── THEME 1: CYBER CITY (Default Neon Metropolis) ───────────────────────
    drawStageCyberCity(ctx, w, h, floorY) {
        // Sky Gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0a0a1a');
        bgGrad.addColorStop(0.7, '#12122b');
        bgGrad.addColorStop(1, '#050510');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        // Background Neon City Skyline Silhouettes
        ctx.fillStyle = 'rgba(18, 22, 45, 0.75)';
        const buildings = [
            { x: 40, w: 70, h: 220 }, { x: 130, w: 100, h: 270 },
            { x: 250, w: 80, h: 180 }, { x: 620, w: 90, h: 250 },
            { x: 730, w: 110, h: 280 }, { x: 860, w: 65, h: 190 }
        ];
        buildings.forEach(b => {
            ctx.fillRect(b.x, floorY - b.h, b.w, b.h);
            ctx.fillStyle = (b.x % 3 === 0) ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 0, 85, 0.25)';
            for (let wy = floorY - b.h + 20; wy < floorY - 30; wy += 30) {
                for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 20) {
                    ctx.fillRect(wx, wy, 8, 12);
                }
            }
            ctx.fillStyle = 'rgba(18, 22, 45, 0.75)';
        });

        // Floor Grid Lines
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 40) {
            ctx.moveTo(x, floorY);
            ctx.lineTo(w / 2 + (x - w / 2) * 1.8, h);
        }
        for (let y = floorY; y <= h; y += 15) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();

        // Neon Floor Boundary Line
        ctx.strokeStyle = '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, floorY);
        ctx.lineTo(w, floorY);
        ctx.stroke();

        ctx.restore();
    }

    // ── THEME 2: SHAOLIN TEMPLE (Moonlit Pagoda Dojo) ───────────────────────
    drawStageShaolinTemple(ctx, w, h, floorY) {
        // Night Sky Gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, floorY);
        skyGrad.addColorStop(0, '#060515');
        skyGrad.addColorStop(0.5, '#120b26');
        skyGrad.addColorStop(1, '#0e172a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, floorY);

        ctx.save();
        // Distant Misty Mountains
        ctx.fillStyle = 'rgba(14, 15, 36, 0.85)';
        ctx.beginPath();
        ctx.moveTo(0, floorY);
        ctx.lineTo(0, floorY - 120);
        ctx.quadraticCurveTo(w * 0.2, floorY - 210, w * 0.45, floorY - 140);
        ctx.quadraticCurveTo(w * 0.7, floorY - 240, w, floorY - 150);
        ctx.lineTo(w, floorY);
        ctx.closePath();
        ctx.fill();

        // Giant Luminous Full Moon
        const moonX = w * 0.76;
        const moonY = 120;
        const moonR = 64;

        // Outer Moon Glow
        const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.6, moonX, moonY, moonR * 2.2);
        moonGlow.addColorStop(0, 'rgba(255, 248, 220, 0.35)');
        moonGlow.addColorStop(0.5, 'rgba(255, 220, 140, 0.12)');
        moonGlow.addColorStop(1, 'rgba(255, 220, 140, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Moon Disk
        const moonDisk = ctx.createRadialGradient(moonX - 18, moonY - 18, 5, moonX, moonY, moonR);
        moonDisk.addColorStop(0, '#ffffff');
        moonDisk.addColorStop(0.7, '#fff3cc');
        moonDisk.addColorStop(1, '#fed47e');
        ctx.fillStyle = moonDisk;
        ctx.shadowBlur = 24;
        ctx.shadowColor = 'rgba(255, 230, 160, 0.9)';
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fill();

        // Moon Craters
        ctx.fillStyle = 'rgba(215, 185, 130, 0.22)';
        ctx.shadowBlur = 0;
        const craters = [
            { x: moonX - 22, y: moonY - 15, r: 10 },
            { x: moonX + 15, y: moonY + 12, r: 14 },
            { x: moonX + 26, y: moonY - 18, r: 8 },
            { x: moonX - 10, y: moonY + 24, r: 9 }
        ];
        craters.forEach(c => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Pagoda Silhouettes on Sides
        const drawPagoda = (px, py, scale) => {
            ctx.fillStyle = '#0b0c1c';
            // Pillars
            ctx.fillRect(px - 32 * scale, py - 180 * scale, 8 * scale, 180 * scale);
            ctx.fillRect(px + 24 * scale, py - 180 * scale, 8 * scale, 180 * scale);

            // Tiered curved eaves
            const tiers = [
                { y: py - 180 * scale, w: 85 * scale, h: 22 * scale },
                { y: py - 120 * scale, w: 105 * scale, h: 24 * scale },
                { y: py - 60 * scale,  w: 125 * scale, h: 26 * scale }
            ];
            tiers.forEach(t => {
                ctx.beginPath();
                ctx.moveTo(px - t.w, t.y);
                ctx.quadraticCurveTo(px, t.y - t.h, px + t.w, t.y);
                ctx.lineTo(px + t.w - 12 * scale, t.y + 12 * scale);
                ctx.quadraticCurveTo(px, t.y + 2 * scale, px - t.w + 12 * scale, t.y + 12 * scale);
                ctx.closePath();
                ctx.fill();

                // Hanging Lantern on Pagoda Corner
                const sway = Math.sin(this.animFrame * 0.05 + px) * 4;
                const lx = px + t.w - 8 * scale;
                const ly = t.y + 16 * scale;
                ctx.save();
                ctx.translate(lx, ly);
                ctx.rotate(sway * Math.PI / 180);
                // String
                ctx.strokeStyle = '#ff9900';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, 10);
                ctx.stroke();
                // Glowing Lantern Body
                ctx.fillStyle = '#ff3300';
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#ff9900';
                ctx.beginPath();
                ctx.ellipse(0, 16, 6 * scale, 9 * scale, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        };

        drawPagoda(110, floorY, 1.0);
        drawPagoda(850, floorY, 0.95);

        // Dojo Polished Wooden Plank Floor
        const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
        floorGrad.addColorStop(0, '#1c110a');
        floorGrad.addColorStop(0.6, '#130a05');
        floorGrad.addColorStop(1, '#080402');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, floorY, w, h - floorY);

        // Wooden Plank Seams
        ctx.strokeStyle = 'rgba(255, 170, 70, 0.18)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 60) {
            ctx.moveTo(x, floorY);
            ctx.lineTo(w / 2 + (x - w / 2) * 1.5, h);
        }
        for (let y = floorY + 18; y <= h; y += 22) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();

        // Golden Dojo Boundary Line
        ctx.strokeStyle = '#ff9900';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ff9900';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, floorY);
        ctx.lineTo(w, floorY);
        ctx.stroke();

        ctx.restore();
    }

    // ── THEME 3: LAVA INFERNO (Volcanic Fiery Crags) ─────────────────────────
    drawStageLavaInferno(ctx, w, h, floorY) {
        // Volcanic Cavern Sky Gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, floorY);
        skyGrad.addColorStop(0, '#0c0202');
        skyGrad.addColorStop(0.5, '#260606');
        skyGrad.addColorStop(1, '#1a0303');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, floorY);

        ctx.save();
        // Stalactites hanging from ceiling
        ctx.fillStyle = '#100303';
        const stalactites = [
            { x: 70, w: 40, h: 90 }, { x: 190, w: 30, h: 65 },
            { x: 380, w: 50, h: 80 }, { x: 570, w: 35, h: 70 },
            { x: 780, w: 45, h: 95 }, { x: 890, w: 30, h: 60 }
        ];
        stalactites.forEach(st => {
            ctx.beginPath();
            ctx.moveTo(st.x - st.w / 2, 0);
            ctx.lineTo(st.x, st.h);
            ctx.lineTo(st.x + st.w / 2, 0);
            ctx.closePath();
            ctx.fill();
        });

        // Distant Jagged Volcanic Peaks with Magma Veins
        ctx.fillStyle = '#140404';
        ctx.beginPath();
        ctx.moveTo(0, floorY);
        const peaks = [
            { x: 80, y: floorY - 170 }, { x: 210, y: floorY - 110 },
            { x: 360, y: floorY - 210 }, { x: 510, y: floorY - 130 },
            { x: 670, y: floorY - 230 }, { x: 820, y: floorY - 120 },
            { x: 960, y: floorY - 180 }
        ];
        peaks.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(w, floorY);
        ctx.closePath();
        ctx.fill();

        // Molten Fissures on Volcano Peaks
        ctx.strokeStyle = 'rgba(255, 68, 0, 0.6)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff4400';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        peaks.forEach((p, idx) => {
            if (idx % 2 === 0) {
                ctx.moveTo(p.x, p.y + 10);
                ctx.lineTo(p.x - 12, p.y + 70);
                ctx.lineTo(p.x + 8, p.y + 120);
            }
        });
        ctx.stroke();

        // Molten Magma Reservoir Beneath Floor
        const magmaGrad = ctx.createLinearGradient(0, floorY, 0, h);
        magmaGrad.addColorStop(0, '#1c0404');
        magmaGrad.addColorStop(0.4, '#2d0606');
        magmaGrad.addColorStop(1, '#4a0c02');
        ctx.fillStyle = magmaGrad;
        ctx.fillRect(0, floorY, w, h - floorY);

        // Glowing Magma Cracks on Floor
        ctx.strokeStyle = '#ff5500';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#ff3300';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        // Horizontal glowing veins
        for (let y = floorY + 20; y < h; y += 28) {
            ctx.moveTo(0, y);
            for (let x = 40; x < w; x += 70) {
                ctx.lineTo(x, y + ((x % 3 === 0) ? 6 : -6));
            }
            ctx.lineTo(w, y);
        }
        // Vertical jagged branches
        for (let x = 80; x < w; x += 130) {
            ctx.moveTo(x, floorY);
            ctx.lineTo(x + 15, floorY + 35);
            ctx.lineTo(x - 10, floorY + 70);
            ctx.lineTo(x + 20, h);
        }
        ctx.stroke();

        // Scorching Burning Floor Boundary Line
        const pulse = Math.sin(this.animFrame * 0.08) * 4;
        ctx.strokeStyle = '#ff3300';
        ctx.shadowBlur = 18 + pulse;
        ctx.shadowColor = '#ff2200';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, floorY);
        ctx.lineTo(w, floorY);
        ctx.stroke();

        ctx.restore();
    }

    // ── THEME 4: RETRO SYNTHWAVE (80s Outrun Neon Sunset) ───────────────────
    drawStageSynthwaveRetro(ctx, w, h, floorY) {
        // Classic 80s Sunset Gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, floorY);
        skyGrad.addColorStop(0, '#090014');
        skyGrad.addColorStop(0.35, '#2a0438');
        skyGrad.addColorStop(0.65, '#6a0a4a');
        skyGrad.addColorStop(0.88, '#b81c5c');
        skyGrad.addColorStop(1, '#ff4d6d');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, floorY);

        ctx.save();
        // Giant Retro Horizon Sun
        const sunX = w * 0.5;
        const sunY = floorY;
        const sunR = 100;

        // Sun Gradient (Yellow to Hot Pink)
        const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY);
        sunGrad.addColorStop(0, '#fff44f');
        sunGrad.addColorStop(0.45, '#ff8300');
        sunGrad.addColorStop(0.85, '#ff007f');
        sunGrad.addColorStop(1, '#9b00e8');

        ctx.fillStyle = sunGrad;
        ctx.shadowBlur = 28;
        ctx.shadowColor = '#ff007f';
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR, Math.PI, 0, false);
        ctx.fill();

        // Sun Horizontal Slice Cutouts (Iconic Synthwave Look)
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#10001d';
        const slices = [
            { y: sunY - 45, h: 3 },
            { y: sunY - 33, h: 5 },
            { y: sunY - 20, h: 7 },
            { y: sunY - 8,  h: 9 }
        ];
        slices.forEach(s => {
            ctx.fillRect(sunX - sunR - 10, s.y, (sunR + 10) * 2, s.h);
        });

        // Distant Wireframe Neon Mountains
        const drawMountainRidge = (color, strokeColor, baseY, heightScale) => {
            ctx.fillStyle = color;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.8;
            ctx.shadowBlur = 8;
            ctx.shadowColor = strokeColor;
            ctx.beginPath();
            ctx.moveTo(0, floorY);
            const mPoints = [
                { x: 0, y: baseY },
                { x: 90, y: baseY - 80 * heightScale },
                { x: 180, y: baseY - 30 * heightScale },
                { x: 290, y: baseY - 120 * heightScale },
                { x: 390, y: baseY - 50 * heightScale },
                { x: sunX, y: baseY - 10 * heightScale }, // Dip near sun
                { x: 570, y: baseY - 50 * heightScale },
                { x: 670, y: baseY - 120 * heightScale },
                { x: 780, y: baseY - 30 * heightScale },
                { x: 870, y: baseY - 80 * heightScale },
                { x: w, y: baseY }
            ];
            mPoints.forEach(pt => ctx.lineTo(pt.x, pt.y));
            ctx.lineTo(w, floorY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        };

        drawMountainRidge('rgba(22, 0, 36, 0.9)', '#00f0ff', floorY, 0.75);

        // 3D Perspective Outrun Floor Grid
        const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
        floorGrad.addColorStop(0, '#0c0018');
        floorGrad.addColorStop(1, '#020005');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, floorY, w, h - floorY);

        ctx.strokeStyle = 'rgba(255, 0, 170, 0.28)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        // Perspective radiating lines converging to sun horizon center
        for (let x = -200; x <= w + 200; x += 55) {
            ctx.moveTo(sunX + (x - sunX) * 0.15, floorY);
            ctx.lineTo(x, h);
        }
        // Horizontal grid lines scrolling perspective
        for (let y = floorY + 12; y <= h; y += 18) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();

        // Neon Magenta Floor Boundary Line
        ctx.strokeStyle = '#ff00bb';
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ff00bb';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, floorY);
        ctx.lineTo(w, floorY);
        ctx.stroke();

        ctx.restore();
    }

    drawStickmanFighter(f) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(f.x, f.y);

        const bounce = Math.sin(this.animFrame * 0.18) * 5;
        const color = f.color;
        const glow = f.glow;

        ctx.shadowBlur = 18;
        ctx.shadowColor = glow;

        // Shadow under stickman
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 5, 26, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // KO & Airborne Rotation Physics
        if (f.hpPercent <= 0) {
            ctx.rotate(f.facing * 1.5);
            ctx.translate(0, 35);
        } else if (f.rotation) {
            ctx.rotate(f.rotation);
        } else if (f.state === 'hurt') {
            ctx.rotate(f.facing * -0.35);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const headY = -85 + bounce;
        const neckY = -72 + bounce;
        const waistY = -30 + bounce;

        // 1. STICKMAN HEAD
        ctx.fillStyle = '#090d1a';
        ctx.beginPath();
        ctx.arc(0, headY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing Ninja Headband / Visor
        ctx.fillStyle = color;
        ctx.fillRect(f.facing * 2, headY - 3, f.facing * 12, 5);
        
        // Headband tail flapping
        ctx.beginPath();
        ctx.moveTo(-f.facing * 12, headY - 2);
        ctx.lineTo(-f.facing * 22, headY + Math.sin(this.animFrame * 0.2) * 6);
        ctx.stroke();

        // 2. TORSO
        ctx.beginPath();
        ctx.moveTo(0, neckY);
        ctx.lineTo(0, waistY);
        ctx.stroke();

        // 3. LEGS & KICKS
        ctx.beginPath();
        if (f.y < f.baseY - 15) {
            // Flailing Airborne Knockback Legs!
            ctx.moveTo(0, waistY);
            ctx.lineTo(-20 * f.facing, waistY - 10);
            ctx.lineTo(-30 * f.facing, waistY + 15);

            ctx.moveTo(0, waistY);
            ctx.lineTo(20 * f.facing, waistY - 20);
            ctx.lineTo(35 * f.facing, waistY - 5);
        } else if (f.state === 'attack_heavy') {
            // Flying Side Kick!
            ctx.moveTo(0, waistY);
            ctx.lineTo(40 * f.facing, waistY - 15); // Extended kicking leg
            ctx.moveTo(0, waistY);
            ctx.lineTo(-15 * f.facing, waistY + 20); // Supporting back leg
        } else if (f.state === 'attack_super') {
            // Spinning Dragon Kick!
            ctx.moveTo(0, waistY);
            ctx.lineTo(50 * f.facing, waistY - 35);
            ctx.moveTo(0, waistY);
            ctx.lineTo(-25 * f.facing, waistY + 15);
        } else {
            // Martial Arts Stance Legs
            ctx.moveTo(0, waistY);
            ctx.lineTo(-12 * f.facing, waistY + 15);
            ctx.lineTo(-22 * f.facing, 0);

            ctx.moveTo(0, waistY);
            ctx.lineTo(12 * f.facing, waistY + 15);
            ctx.lineTo(22 * f.facing, 0);
        }
        ctx.stroke();

        // 4. ARMS & PUNCHES
        ctx.beginPath();
        if (f.state === 'attack_light') {
            // Rapid Jab Punch
            ctx.moveTo(0, neckY + 10);
            ctx.lineTo(55 * f.facing, neckY + 10); // Extended fist
            ctx.moveTo(0, neckY + 10);
            ctx.lineTo(15 * f.facing, neckY + 25); // Guard arm
        } else if (f.state === 'attack_super') {
            // Dragon Uppercut
            ctx.moveTo(0, neckY + 10);
            ctx.lineTo(30 * f.facing, neckY - 40); // Skyward Fist
            ctx.moveTo(0, neckY + 10);
            ctx.lineTo(-20 * f.facing, neckY + 20);
        } else {
            // Boxing Guard Arms
            ctx.moveTo(0, neckY + 10);
            ctx.lineTo(18 * f.facing, neckY + 5);
            ctx.lineTo(22 * f.facing, neckY - 15);

            ctx.moveTo(0, neckY + 10);
            ctx.lineTo(-10 * f.facing, neckY + 12);
            ctx.lineTo(-14 * f.facing, neckY - 8);
        }
        ctx.stroke();

        // 5. Energy Fist / Aura Glow on attack
        if (f.state.startsWith('attack')) {
            const attackX = f.state === 'attack_heavy' ? 45 * f.facing : (f.state === 'attack_super' ? 30 * f.facing : 55 * f.facing);
            const attackY = f.state === 'attack_super' ? neckY - 40 : neckY + 10;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(attackX, attackY, f.state === 'attack_super' ? 16 : 9, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Render floating in-arena health bar and numeric HP indicator right above each fighter.
     * Ensures HP is 100% visible on mobile phones, small screens, and soft keyboards.
     * @param {Object} f - Fighter state object
     */
    drawFighterHpBar(f) {
        if (!f || typeof f.hpPercent === 'undefined') return;
        const ctx = this.ctx;
        ctx.save();

        const barW = 110;
        const barH = 13;
        const barX = f.x - barW / 2;
        // Float comfortably above the fighter's head
        const barY = Math.min(f.baseY - 120, f.y - 120);

        // 1. Dark glowing pill background
        ctx.fillStyle = 'rgba(7, 9, 19, 0.88)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(barX, barY, barW, barH, 6);
        } else {
            ctx.rect(barX, barY, barW, barH);
        }
        ctx.fill();
        ctx.stroke();

        // 2. Health Fill (gradient matching fighter theme)
        const pct = Math.max(0, Math.min(1, f.hpPercent));
        const fillW = Math.max(0, barW * pct);
        if (fillW > 0) {
            ctx.fillStyle = f.color;
            ctx.shadowColor = f.glow || f.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(barX, barY, fillW, barH, 6);
            } else {
                ctx.rect(barX, barY, fillW, barH);
            }
            ctx.fill();
        }

        // 3. Crisp Bold HP Text (e.g. "100 / 100 HP")
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#000000';
        ctx.fillStyle = '#ffffff';
        ctx.font = "900 10px 'Orbitron', 'Outfit', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const curHp = typeof f.hp !== 'undefined' ? f.hp : Math.round(100 * pct);
        const maxHp = f.maxHp || 100;
        ctx.fillText(`${curHp}/${maxHp} HP`, f.x, barY + barH / 2 + 1);

        ctx.restore();
    }

    /**
     * Spawn an animated floating emoji reaction above a fighter
     * @param {1|2} playerIndex
     * @param {string} emoji
     */
    triggerEmoji(playerIndex, emoji) {
        const targetFighter = playerIndex === 1 ? this.f1 : this.f2;
        const x = targetFighter.x + (Math.random() - 0.5) * 20;
        const y = Math.min(targetFighter.baseY - 145, targetFighter.y - 145);

        this.floatingEmojis.push({
            x, y,
            vy: -2.8,
            emoji: emoji || '🔥',
            scale: 0.3,
            maxScale: 1.5,
            life: 1.0,
            alpha: 1.0
        });

        // Sparkling burst particles in fighter's neon color
        this.spawnImpactParticles(x, y, targetFighter.color, 8);
    }

    /**
     * Show a comic-style cyberpunk speech bubble above a fighter
     * @param {1|2} playerIndex
     * @param {string} text
     */
    triggerChatBubble(playerIndex, text) {
        const targetFighter = playerIndex === 1 ? this.f1 : this.f2;
        this.chatBubbles = this.chatBubbles.filter(b => b.playerIndex !== playerIndex);

        this.chatBubbles.push({
            playerIndex,
            text: (text || '').substring(0, 35),
            life: 1.0,
            alpha: 1.0,
            color: targetFighter.color
        });
    }

    drawFloatingEmojis() {
        const ctx = this.ctx;
        this.floatingEmojis.forEach(fe => {
            ctx.save();
            ctx.globalAlpha = fe.alpha;
            ctx.translate(fe.x, fe.y);
            ctx.scale(fe.scale, fe.scale);
            ctx.font = '32px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(255, 230, 0, 0.8)';
            ctx.fillText(fe.emoji, 0, 0);
            ctx.restore();
        });
    }

    drawChatBubbles() {
        const ctx = this.ctx;
        this.chatBubbles.forEach(cb => {
            const f = cb.playerIndex === 1 ? this.f1 : this.f2;
            ctx.save();
            ctx.globalAlpha = cb.alpha;

            ctx.font = "800 13px 'Outfit', -apple-system, sans-serif";
            const textMetrics = ctx.measureText(cb.text);
            const padX = 14;
            const padY = 8;
            const bubbleW = textMetrics.width + padX * 2;
            const bubbleH = 28;
            const bubbleX = f.x - bubbleW / 2;
            const bubbleY = Math.min(f.baseY - 175, f.y - 175);

            // Speech bubble background
            ctx.fillStyle = 'rgba(7, 9, 19, 0.94)';
            ctx.strokeStyle = cb.color;
            ctx.lineWidth = 1.8;
            ctx.shadowBlur = 10;
            ctx.shadowColor = cb.color;

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 10);
            } else {
                ctx.rect(bubbleX, bubbleY, bubbleW, bubbleH);
            }
            ctx.fill();
            ctx.stroke();

            // Pointer tail to fighter
            ctx.beginPath();
            ctx.moveTo(f.x - 6, bubbleY + bubbleH);
            ctx.lineTo(f.x, bubbleY + bubbleH + 7);
            ctx.lineTo(f.x + 6, bubbleY + bubbleH);
            ctx.closePath();
            ctx.fillStyle = 'rgba(7, 9, 19, 0.94)';
            ctx.fill();
            ctx.stroke();

            // Speech Text
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cb.text, f.x, bubbleY + bubbleH / 2 + 1);

            ctx.restore();
        });
    }

    drawFighter(f) {
        if (this.fighterSkin === 'stickman') {
            this.drawStickmanFighter(f);
            return;
        }

        const ctx = this.ctx;
        ctx.save();
        ctx.translate(f.x, f.y);

        const bounce = Math.sin(this.animFrame * 0.15) * 4;
        const color = f.color;
        const glow = f.glow;

        ctx.shadowBlur = 15;
        ctx.shadowColor = glow;

        // Shadow under fighter
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 5, 30, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stagger angle if hurt
        if (f.state === 'hurt') {
            ctx.rotate(f.facing * -0.2);
        }

        // KO State
        if (f.hpPercent <= 0) {
            ctx.rotate(f.facing * 1.4);
            ctx.translate(0, 30);
        }

        // Body Structure (Cyberpunk Warrior Vector Sprite)
        // 1. Legs
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';

        ctx.beginPath();
        // Left Leg
        ctx.moveTo(-10 * f.facing, -30 + bounce);
        ctx.lineTo(-20 * f.facing, -10);
        ctx.lineTo(-25 * f.facing, 0);
        // Right Leg
        ctx.moveTo(10 * f.facing, -30 + bounce);
        ctx.lineTo(20 * f.facing, -10);
        ctx.lineTo(25 * f.facing, 0);
        ctx.stroke();

        // 2. Torso Armor
        ctx.fillStyle = '#11162b';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-18 * f.facing, -75 + bounce);
        ctx.lineTo(18 * f.facing, -75 + bounce);
        ctx.lineTo(12 * f.facing, -30 + bounce);
        ctx.lineTo(-12 * f.facing, -30 + bounce);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Core Reactor Glow
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -55 + bounce, 7, 0, Math.PI * 2);
        ctx.fill();

        // 3. Cyber Helmet / Head
        ctx.fillStyle = '#090d1a';
        ctx.beginPath();
        ctx.arc(0, -92 + bounce, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Visor Glow
        ctx.fillStyle = color;
        ctx.fillRect(f.facing * 2, -96 + bounce, f.facing * 12, 6);

        // 4. Arms & Weapon Gauntlets
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        if (f.state.startsWith('attack')) {
            // Punch Extended Forward
            ctx.moveTo(0, -65 + bounce);
            ctx.lineTo(45 * f.facing, -65 + bounce);
            ctx.lineTo(65 * f.facing, -65 + bounce);
        } else {
            // Guard Stance
            ctx.moveTo(-10, -65 + bounce);
            ctx.lineTo(15 * f.facing, -55 + bounce);
            ctx.lineTo(18 * f.facing, -75 + bounce);
        }
        ctx.stroke();

        // Gauntlet Plasma Ball at fist
        const fistX = f.state.startsWith('attack') ? 65 * f.facing : 18 * f.facing;
        const fistY = f.state.startsWith('attack') ? -65 + bounce : -75 + bounce;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(fistX, fistY, f.state.startsWith('attack') ? 12 : 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawSuperBeam(attacker, defender) {
        const ctx = this.ctx;
        ctx.save();

        const startX = attacker.x + (attacker.facing * 60);
        const startY = attacker.y - 65;
        const endX = defender.x;
        const endY = defender.y - 65;

        // Beam Outer Glow
        ctx.strokeStyle = attacker.color;
        ctx.shadowBlur = 30;
        ctx.shadowColor = attacker.color;
        ctx.lineWidth = 35;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Beam Core (White Bright Pulse)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.restore();
    }
}
