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
        this.animFrame = 0;
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

        ctx.restore();
    }

    drawStage() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background Gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0a0a1a');
        bgGrad.addColorStop(0.7, '#12122b');
        bgGrad.addColorStop(1, '#050510');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Cyber Grid Lines on Floor
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.lineWidth = 1;
        const floorY = 380;
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
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, floorY);
        ctx.lineTo(w, floorY);
        ctx.stroke();

        // Background Neon City Skyline Silhouettes
        ctx.fillStyle = 'rgba(18, 22, 45, 0.7)';
        const buildings = [
            { x: 50, w: 70, h: 220 }, { x: 140, w: 100, h: 270 },
            { x: 260, w: 80, h: 180 }, { x: 620, w: 90, h: 250 },
            { x: 730, w: 110, h: 280 }, { x: 860, w: 60, h: 190 }
        ];
        buildings.forEach(b => {
            ctx.fillRect(b.x, floorY - b.h, b.w, b.h);
            // Window glow
            ctx.fillStyle = (b.x % 3 === 0) ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 0, 85, 0.2)';
            for (let wy = floorY - b.h + 20; wy < floorY - 30; wy += 30) {
                for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 20) {
                    ctx.fillRect(wx, wy, 8, 12);
                }
            }
            ctx.fillStyle = 'rgba(18, 22, 45, 0.7)';
        });

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
