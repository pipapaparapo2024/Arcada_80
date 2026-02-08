import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Powerup } from '../entities/Powerup.js';
import { Bullet } from '../entities/Bullet.js';
import { XPOrb } from '../entities/XPOrb.js';
import { CONFIG, GameState } from '../utils/Config.js';
import { Lang } from '../utils/Lang.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        // Safety Check: Ensure critical assets exist
        const criticalTextures = ['player', 'bullet', 'enemy_chaser', 'enemy_sprinter', 'background', 'spark', 'fire', 'xp_orb'];
        criticalTextures.forEach(key => {
            if (!this.textures.exists(key)) {
                console.warn(`Texture '${key}' missing! Generating placeholder.`);
                const gfx = this.make.graphics({x:0, y:0, add:false});
                gfx.fillStyle(0xff00ff, 1);
                gfx.fillRect(0, 0, 32, 32);
                gfx.generateTexture(key, 32, 32);
            }
        });

        // Safety Check: Ensure audio assets exist
        const criticalAudio = ['shoot', 'explosion', 'bgm'];
        criticalAudio.forEach(key => {
            if (!this.cache.audio.exists(key)) {
                console.warn(`Audio '${key}' missing! Disabling sound for this key.`);
                // Create a dummy sound object if needed, or just handle it in usage
            }
        });

        // Localization
        this.lang = Lang[GameState.lang];

        // CRT Shader (Safe Check)
        if (this.game.renderer.pipelines && this.game.renderer.pipelines.has('CRTPipeline')) {
            this.cameras.main.setPostPipeline('CRTPipeline');
        } else {
            // Fallback: Simple scanline overlay using a tileSprite
            // We create a 1x2 texture with one transparent and one semi-transparent black pixel
            if (!this.textures.exists('scanlines')) {
                const graphics = this.make.graphics({x: 0, y: 0, add: false});
                graphics.fillStyle(0x000000, 0.2); // Dark line
                graphics.fillRect(0, 0, 4, 2);
                graphics.fillStyle(0x000000, 0);   // Transparent line
                graphics.fillRect(0, 2, 4, 2);
                graphics.generateTexture('scanlines', 4, 4);
            }
            
            this.scanlines = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'scanlines')
                .setOrigin(0, 0)
                .setScrollFactor(0)
                .setDepth(1000)
                .setAlpha(0.5);

            // Vignette (simple radial gradient overlay)
        if (!this.textures.exists('vignette')) {
            const vig = this.make.graphics({x:0, y:0, add: false});
            vig.fillStyle(0x000000, 1);
            vig.fillRect(0,0,800,600);
            const texture = vig.generateTexture('vignette_base', 800, 600);
        }
        
        // Add Vignette Overlay using an image with a mask or just a dark border
        // Since we can't easily make a radial gradient texture without canvas manipulation,
        // we'll use a "hole" approach with a big thick border
        const vignette = this.add.graphics();
        vignette.setScrollFactor(0).setDepth(999);
        vignette.fillStyle(0x000000, 0.3);
        // Draw 4 rectangles to form a frame? Or just one big rect with low alpha?
        // User wants "vignetting in corners". 
        // Let's try to make a radial texture on the fly
        if (!this.textures.exists('vignette_texture')) {
            const canvas = this.textures.createCanvas('vignette_texture', 800, 600);
            const ctx = canvas.context;
            const grd = ctx.createRadialGradient(400, 300, 200, 400, 300, 500);
            grd.addColorStop(0, "transparent");
            grd.addColorStop(1, "black");
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 800, 600);
            canvas.refresh();
        }
        this.add.image(400, 300, 'vignette_texture').setScrollFactor(0).setDepth(999).setAlpha(0.6);
        }

        // HUD Container
        this.hudContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

        // Apply difficulty settings
        this.difficulty = GameState.difficulty;
        
        // World bounds - Keep fixed game world or adapt?
        // For an arcade shooter, usually a fixed arena is better, but user said "adaptive".
        // Let's keep the logical world bounds fixed (1600x1200) but allow the camera to see what fits.
        this.physics.world.setBounds(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
        this.physics.world.on('worldbounds', this.handleBulletHitWorld, this);
        
        // Parallax Backgrounds
        this.starsBg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-2);
        
        // Second layer (Nebula/Stars) - Commented out to fix "line in middle" issue and improve performance
        /* 
        this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setAlpha(0.5)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(-1); 
        */
        
        // Player
        this.player = new Player(this, CONFIG.GAME_WIDTH/2, CONFIG.GAME_HEIGHT/2);
        
        // Danger Zone Warning Overlay
        this.dangerOverlay = this.add.graphics();
        this.dangerOverlay.setScrollFactor(1); // World space
        this.dangerOverlay.setDepth(100);
        
        // Static Noise Overlay (for damage effect)
        this.noiseOverlay = this.add.tileSprite(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 'noise')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setAlpha(0)
            .setDepth(2000) // Above UI? Or below pause menu? Pause is 2000. Let's say 1900.
            .setBlendMode(Phaser.BlendModes.ADD);

        // Draw the boundary permanently so player knows where it is
        this.drawWorldBounds();
        
        this.player.on('dangerZone', (active) => this.updateDangerZone(active));
        this.player.on('abilityUsed', (ability) => this.handleAbilityUsed(ability));
        this.player.on('damage', () => {
            // Static Noise Flash
            this.noiseOverlay.setAlpha(0.3);
            this.noiseOverlay.tilePositionX = Math.random() * 100;
            this.noiseOverlay.tilePositionY = Math.random() * 100;
            
            this.tweens.add({
                targets: this.noiseOverlay,
                alpha: 0,
                duration: 200,
                ease: 'Power2'
            });
            
            // Screen Shake
            this.cameras.main.shake(200, 0.02);
        });
        
        // Combo System
        this.combo = 0;
        this.comboMultiplier = 1;
        this.lastKillTime = 0;
        this.comboTimerEvent = null;

        this.comboText = this.add.text(this.scale.width - 20, 100, '', {
            fontFamily: '"VMV Sega Genesis", "Kagiraretapikuseru", "Press Start 2P"',
            fontSize: '32px',
            color: '#ff00ff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(100).setResolution(1);
        
        this.score = 0;
        this.isGameOver = false;

        // Camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

        // Enemies Group
        this.enemies = this.physics.add.group({
            classType: Enemy,
            runChildUpdate: true,
            maxSize: 100
        });

        // Enemy Bullets Group
        this.enemyBullets = this.physics.add.group({
            classType: Bullet,
            runChildUpdate: true,
            maxSize: 50
        });

        // Powerups Group
        this.powerups = this.physics.add.group({
            classType: Powerup,
            runChildUpdate: false // Powerups use tween/timer
        });

        // XP Orbs Group
        this.xpOrbs = this.physics.add.group({
            classType: XPOrb,
            runChildUpdate: true,
            maxSize: 200
        });

        // Particle Manager
        this.particleEmitter = this.add.particles(0, 0, 'spark', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            frequency: -1
        });
        
        this.bossActive = false; // Boss flag
        this.bossLevels = [5, 10, 15]; // Boss spawn levels
        this.spawnedBossLevels = []; // Track spawned bosses

        // Spawning Logic
        this.enemySpawnDelay = 2000;
        this.baseEnemySpeedMultiplier = this.difficulty.speedMult;
        this.currentEnemySpeedMultiplier = this.baseEnemySpeedMultiplier;
        this.difficultyTimer = 0;

        // Enemy Spawn Timer
        this.spawnEvent = this.time.addEvent({
            delay: this.enemySpawnDelay,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // Collisions
        this.physics.add.overlap(this.player.bullets, this.enemies, this.handleBulletHitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.handleEnemyOverlap, null, this); 
        this.physics.add.overlap(this.player, this.powerups, this.handlePlayerHitPowerup, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.handleEnemyBulletHitPlayer, null, this);
        this.physics.add.overlap(this.player, this.xpOrbs, this.handlePlayerHitOrb, null, this);
        
        // UI
        this.createUI();

        // Pause System
        this.isPaused = false;
        this.createPauseUI();

        // Keyboard & Input
        this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
        this.game.events.on('blur', () => this.togglePause(true));
        
        // Events
        this.events.on('resume', () => {
            this.input.keyboard.resetKeys();
        });
        
        // this.scale.on('resize', this.resize, this);

        // Sound Effects (Safe Volume)
        const vol = (GameState.volume || 0) / 100;
        
            // Safe Audio Adding
            const addSoundSafe = (key, config) => {
                if (this.cache.audio.exists(key)) {
                    return this.sound.add(key, config);
                }
                return { play: () => {}, stop: () => {} }; // Dummy sound object
            };

        this.shootSound = addSoundSafe('shoot', { volume: vol });
        this.explosionSound = addSoundSafe('explosion', { volume: vol });
        this.bgm = addSoundSafe('bgm', { volume: vol * 0.5, loop: true });
        
        if (GameState.volume > 0) {
            this.bgm.play();
        }

        // Engine Trail
        this.trailEmitter = this.add.particles(0, 0, 'fire', {
            speed: { min: 50, max: 100 },
            lifespan: 300,
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            frequency: 50,
            angle: { min: 0, max: 360 }
        });
        this.trailEmitter.startFollow(this.player);

        // Debris Emitter (for enemy death)
        this.debrisEmitter = this.add.particles(0, 0, 'pixel', {
            lifespan: 500,
            speed: { min: 100, max: 200 },
            scale: { start: 3, end: 0 },
            rotate: { min: 0, max: 360 },
            alpha: { start: 1, end: 0 },
            emitting: false
        });
    }

    createPauseUI() {
        const { width, height } = this.scale;
        
        this.pauseGroup = this.add.container(width/2, height/2).setDepth(2000).setVisible(false).setScrollFactor(0);
        
        this.pauseOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
        
        const pauseText = this.add.text(0, -50, this.lang.PAUSE, {
            font: '64px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);
        
        const pauseSub = this.add.text(0, 50, this.lang.PAUSE_SUB, {
            font: '32px Arial', fill: '#cccccc', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        
        this.pauseGroup.add([this.pauseOverlay, pauseText, pauseSub]);
    }

    togglePause(forcePause = false) {
        if (this.isGameOver) return;
        
        // If forcePause is true, we only pause, don't toggle to unpause
        if (forcePause && this.isPaused) return;

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.physics.pause();
            this.time.paused = true; // Pause game time events
            this.pauseGroup.setVisible(true);
            
            // Add resume listener with a small delay to avoid instant resume
            setTimeout(() => {
                if (this.isPaused) {
                    const resumeHandler = () => {
                        this.resumeGame();
                        this.input.keyboard.off('keydown', resumeHandler);
                        this.input.off('pointerdown', resumeHandler);
                    };
                    this.input.keyboard.once('keydown', resumeHandler);
                    this.input.once('pointerdown', resumeHandler);
                }
            }, 200);
        } else {
            this.resumeGame();
        }
    }

    resumeGame() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.physics.resume();
        this.time.paused = false;
        this.pauseGroup.setVisible(false);
    }

    update(time, delta) {
        if (this.isPaused) return;

        // Sync UI strictly with data
        if (this.hpText) this.hpText.setText(`HP: ${Math.max(0, Math.ceil(this.player.hp))}`);

        if (this.isGameOver) {
            this.trailEmitter.stop(); // Stop trail on death
            if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
                if (this.bgm && this.bgm.stop) this.bgm.stop();
                this.scene.restart();
            }
            return;
        }

        this.player.update(time, delta);
        
        // Magnet Logic
        if (this.player.magnetActive) {
            this.xpOrbs.getChildren().forEach(orb => {
                if (orb.active) {
                    this.physics.moveToObject(orb, this.player, 400);
                }
            });
        }
        
        // Update Trail
        // Calculate offset based on player rotation (engine is at the back)
        const rad = this.player.rotation;
        const offset = 30; // Distance behind ship
        const offX = Math.cos(rad) * -offset;
        const offY = Math.sin(rad) * -offset;
        
        // Update follow offset so particles emit from the engine
        this.trailEmitter.followOffset.set(offX, offY);
        
        // Parallax
        this.starsBg.tilePositionX = Math.round(this.starsBg.tilePositionX + 0.1);
        this.starsBg.tilePositionY = Math.round(this.starsBg.tilePositionY + 0.05);
        // this.background.tilePositionX += 0.5;
        // this.background.tilePositionY += 0.2;
        
        // Difficulty Timer
        this.difficultyTimer += delta;
        if (this.difficultyTimer >= 30000) {
            this.increaseDifficulty();
            this.difficultyTimer = 0;
        }
        
        // Boss Spawn Logic (Every 5 Levels)
        if (this.player && this.player.level % 5 === 0 && !this.spawnedBossLevels.includes(this.player.level)) {
            this.spawnBoss();
            this.spawnedBossLevels.push(this.player.level);
        }
        
        // Combo Timer
        if (this.combo > 0) {
            this.comboTimer -= delta;
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
            this.updateComboUI();
        }
        
        this.updateAbilityUI(time);
    }

    updateAbilityUI(time) {
        if (!this.player.activeAbility) {
            this.abilityBarBg.setVisible(false);
            this.abilityBarFill.setVisible(false);
            this.abilityIcon.setText('');
            return;
        }

        this.abilityBarBg.setVisible(true);
        this.abilityBarFill.setVisible(true);
        this.abilityIcon.setText('Q');

        const cooldownEnd = this.player.abilityCooldownTimer;
        const totalCooldown = this.player.activeAbility.cooldown;
        
        if (time >= cooldownEnd) {
            // Ready
            this.abilityBarFill.width = 200;
            this.abilityBarFill.setFillStyle(0x00ff00);
            
            if (!this.abilityReadyFlashed) {
                this.abilityReadyFlashed = true;
                this.tweens.add({
                    targets: this.abilityBarFill,
                    alpha: 0.2,
                    duration: 200,
                    yoyo: true,
                    repeat: 1
                });
            }
        } else {
            // Cooling down
            this.abilityReadyFlashed = false;
            const remaining = cooldownEnd - time;
            const progress = 1 - (remaining / totalCooldown);
            this.abilityBarFill.width = 200 * progress;
            this.abilityBarFill.setFillStyle(0xffff00);
            this.abilityBarFill.setAlpha(1);
        }
    }

    createUI() {
        const { width, height } = this.scale;
        
        const fontStyle = { fontFamily: '"VMV Sega Genesis", "Kagiraretapikuseru", "Press Start 2P"' };

        // Scanlines (CRT Effect)
        this.scanlines = this.add.tileSprite(0, 0, width, height, 'scanlines')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setAlpha(0.1)
            .setDepth(1900);

        // Ammo
        this.ammoText = this.add.text(10, 10, `${this.lang.AMMO}: ${CONFIG.PLAYER.AMMO_MAX}`, { 
            ...fontStyle, fontSize: '10px', fill: '#ffffff', stroke: '#000000', strokeThickness: 2 
        }).setScrollFactor(0).setResolution(1);
        
        this.reloadText = this.add.text(width/2, height/2, this.lang.RELOADING, { 
            ...fontStyle, fontSize: '16px', fill: '#ff0000', stroke: '#000000', strokeThickness: 3 
        }).setScrollFactor(0).setOrigin(0.5).setVisible(false).setResolution(1);

        // HP
        this.hpText = this.add.text(10, 25, `HP: ${CONFIG.PLAYER.HP}`, { 
            ...fontStyle, fontSize: '10px', fill: '#00ff00', stroke: '#000000', strokeThickness: 2 
        }).setScrollFactor(0).setResolution(1);

        // Ability Cooldown Bar
        this.abilityBarBg = this.add.rectangle(10, 45, 100, 6, 0x333333).setScrollFactor(0).setOrigin(0, 0);
        this.abilityBarFill = this.add.rectangle(10, 45, 0, 6, 0x00ff00).setScrollFactor(0).setOrigin(0, 0);
        this.abilityIcon = this.add.text(115, 42, '', { ...fontStyle, fontSize: '8px', fill: '#ffffff' }).setScrollFactor(0).setResolution(1);

        // Score
        this.scoreText = this.add.text(10, 60, `${this.lang.SCORE}: 0`, { 
            ...fontStyle, fontSize: '10px', fill: '#ffff00', stroke: '#000000', strokeThickness: 2 
        }).setScrollFactor(0).setResolution(1);

        // Combo
        this.comboText = this.add.text(10, 75, '', { 
            ...fontStyle, fontSize: '12px', fill: '#00ffff', stroke: '#000000', strokeThickness: 4 
        }).setScrollFactor(0).setResolution(1);

        // XP Bar
        const barY = height - 15;
        this.xpBarBg = this.add.rectangle(width/2, barY, width - 20, 10, 0x000000).setScrollFactor(0).setStrokeStyle(1, 0x333333);
        this.xpBarFill = this.add.rectangle(10, barY, 0, 10, 0x00ffff).setScrollFactor(0).setOrigin(0, 0.5);
        this.levelText = this.add.text(width/2, barY - 12, `${this.lang.LEVEL} 1`, {
            ...fontStyle, fontSize: '8px', fill: '#00ffff', stroke: '#000000', strokeThickness: 2
        }).setScrollFactor(0).setOrigin(0.5).setResolution(1);

        // Game Over
        this.gameOverText = this.add.text(width/2, height/2, this.lang.GAME_OVER, { 
            ...fontStyle, fontSize: '24px', fill: '#ff0000', align: 'center', stroke: '#000000', strokeThickness: 4
        }).setScrollFactor(0).setOrigin(0.5).setVisible(false).setResolution(1);

        // Listeners
        this.player.on('ammoChanged', (ammo) => this.ammoText.setText(`${this.lang.AMMO}: ${ammo}/${CONFIG.PLAYER.AMMO_MAX}`));
        this.player.on('reloadStart', () => this.reloadText.setVisible(true));
        this.player.on('reloadComplete', () => this.reloadText.setVisible(false));
        this.player.on('hpChanged', (hp, max) => this.hpText.setText(`HP: ${Math.ceil(hp)}`));
        this.player.on('xpChanged', (xp, next, level) => {
            this.currentXpPercent = Phaser.Math.Clamp(xp / next, 0, 1);
            this.xpBarFill.width = (this.scale.width - 20) * this.currentXpPercent;
            this.levelText.setText(`${this.lang.LEVEL} ${level}`);
        });
        
        // Init UI
        this.currentXpPercent = 0;
        this.player.emit('xpChanged', 0, CONFIG.XP.BASE_REQ, 1);
    }

    resize(gameSize) {
        const { width, height } = gameSize;

        // Camera
        this.cameras.main.setViewport(0, 0, width, height);

        // Scanlines
        if (this.scanlines) this.scanlines.setSize(width, height);
        
        // Noise Overlay
        if (this.noiseOverlay) this.noiseOverlay.setSize(width, height);

        // Backgrounds
        this.starsBg.setPosition(width/2, height/2).setSize(width, height);
        // this.background.setPosition(width/2, height/2).setSize(width, height);
        
        // Danger Zone
        this.updateDangerZone(false); // Clear and reset size (it will redraw on next update if active)

        // UI
        if (this.ammoText) this.ammoText.setPosition(10, 10);
        if (this.hpText) this.hpText.setPosition(10, 40);
        
        if (this.abilityBarBg) this.abilityBarBg.setPosition(10, 75);
        if (this.abilityBarFill) this.abilityBarFill.setPosition(10, 75);
        if (this.abilityIcon) this.abilityIcon.setPosition(220, 70);

        if (this.scoreText) this.scoreText.setPosition(10, 100);
        if (this.comboText) this.comboText.setPosition(10, 130);
        
        if (this.reloadText) this.reloadText.setPosition(width/2, height/2);
        if (this.gameOverText) this.gameOverText.setPosition(width/2, height/2);
        
        // XP Bar
        const barY = height - 30;
        if (this.xpBarBg) {
             this.xpBarBg.setPosition(width/2, barY);
             this.xpBarBg.width = width - 40;
        }
        if (this.xpBarFill) {
             this.xpBarFill.setPosition(20, barY);
             this.xpBarFill.width = (width - 40) * this.currentXpPercent;
        }
        if (this.levelText) this.levelText.setPosition(width/2, barY - 25);

        // Pause UI
        if (this.pauseGroup) {
             this.pauseOverlay.setSize(width, height);
             this.pauseGroup.setPosition(width/2, height/2);
        }
    }
    
    drawWorldBounds() {
        this.dangerOverlay.clear();
        this.dangerOverlay.lineStyle(4, 0xff0000, 0.3);
        this.dangerOverlay.strokeRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    }

    updateDangerZone(active) {
        // Redraw base bounds
        this.drawWorldBounds();
        
        const fontStyle = { fontFamily: '"VMV Sega Genesis", "Kagiraretapikuseru", "Press Start 2P"' };

        if (active) {
            const alpha = 0.5 + Math.sin(this.time.now / 100) * 0.3;
            this.dangerOverlay.lineStyle(10, 0xff0000, alpha);
            this.dangerOverlay.strokeRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
            
            // Warning Text
            if (!this.warningText) {
                this.warningText = this.add.text(CONFIG.GAME_WIDTH/2, CONFIG.GAME_HEIGHT/2, 'WARNING: OUT OF ZONE!', {
                    ...fontStyle, fontSize: '16px', fill: '#ff0000', stroke: '#000000', strokeThickness: 4, align: 'center'
                }).setOrigin(0.5).setScrollFactor(0).setDepth(2000).setResolution(1);
                
                this.tweens.add({
                    targets: this.warningText, alpha: 0.2, duration: 500, yoyo: true, loop: -1
                });
            }
            this.warningText.setVisible(true);
            this.warningText.setPosition(CONFIG.GAME_WIDTH/2, CONFIG.GAME_HEIGHT/2);

            // Damage Timer
            if (!this.outOfBoundsTimer) {
                this.outOfBoundsTimer = this.time.addEvent({
                    delay: 500,
                    callback: () => {
                        if (this.isGameOver || this.isPaused) return;
                        this.player.takeDamage(5);
                        this.cameras.main.flash(100, 255, 0, 0);
                    },
                    loop: true
                });
            }
        } else {
            // Clear warning
            if (this.warningText) this.warningText.setVisible(false);
            
            // Stop timer
            if (this.outOfBoundsTimer) {
                this.outOfBoundsTimer.remove();
                this.outOfBoundsTimer = null;
            }
        }
    }

    updateComboUI() {
        if (this.combo > 0) {
            this.comboText.setText(`${this.lang.COMBO} x${this.comboMultiplier} (${Math.ceil(this.comboTimer/100)})`);
            this.comboText.setScale(1 + (this.comboMultiplier * 0.1));
        } else {
            this.comboText.setText('');
        }
    }

    increaseCombo() {
        this.updateCombo();
    }

    resetCombo() {
        this.combo = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
        this.updateComboUI();
    }

    spawnEnemy() {
        if (this.isGameOver || this.isPaused || this.bossActive) return;

        const enemy = this.enemies.get();
        if (enemy) {
            const cam = this.cameras.main;
            let x, y;
            const side = Phaser.Math.Between(0, 3);
            const padding = 100;
            
            switch (side) {
                case 0: x = Phaser.Math.Between(cam.worldView.x, cam.worldView.right); y = cam.worldView.y - padding; break;
                case 1: x = cam.worldView.right + padding; y = Phaser.Math.Between(cam.worldView.y, cam.worldView.bottom); break;
                case 2: x = Phaser.Math.Between(cam.worldView.x, cam.worldView.right); y = cam.worldView.bottom + padding; break;
                case 3: x = cam.worldView.x - padding; y = Phaser.Math.Between(cam.worldView.y, cam.worldView.bottom); break;
            }

            const type = (Math.random() < 0.3) ? 'SPRINTER' : 'CHASER';
            // Random type based on difficulty/time?
            // Let's mix it up
            const rand = Math.random();
            let enemyType = 'CHASER';
            if (rand < 0.2) enemyType = 'SPRINTER';
            else if (rand < 0.35) enemyType = 'SHOOTER';
            else if (rand < 0.45) enemyType = 'KAMIKAZE';
            else if (rand < 0.50) enemyType = 'ASTEROID';
            
            enemy.spawn(x, y, enemyType, this.currentEnemySpeedMultiplier);
            
            if (enemyType === 'ASTEROID') {
                 // Drift towards center or random direction
                 const angle = Phaser.Math.Angle.Between(x, y, CONFIG.GAME_WIDTH/2, CONFIG.GAME_HEIGHT/2) + Phaser.Math.FloatBetween(-0.5, 0.5);
                 this.physics.velocityFromRotation(angle, enemy.currentSpeed, enemy.body.velocity);
                 enemy.setAngularVelocity(Phaser.Math.Between(-50, 50));
                 enemy.setTarget(null);
            } else {
                 enemy.setTarget(this.player);
            }
        }
    }

    increaseDifficulty() {
        this.enemySpawnDelay = Math.max(500, this.enemySpawnDelay * 0.9);
        this.spawnEvent.delay = this.enemySpawnDelay;
        this.baseEnemySpeedMultiplier *= 1.05;
        this.currentEnemySpeedMultiplier = this.baseEnemySpeedMultiplier;
        
        const text = this.add.text(this.scale.width/2, this.scale.height/2 - 100, this.lang.BOSS_WARNING, { 
            fontFamily: '"VMV Sega Genesis", "Kagiraretapikuseru", "Press Start 2P"', fontSize: '50px', fill: '#ff0000', stroke: '#ffffff', strokeThickness: 6 
        }).setOrigin(0.5).setScrollFactor(0).setResolution(1);
        
        this.tweens.add({
            targets: text, alpha: 0, scale: 1.5, duration: 3000,
            onComplete: () => text.destroy()
        });
    }

    handleBulletHitEnemy(bullet, enemy) {
        if (!bullet.active || !enemy.active) return;
        
        if (bullet.isPiercing) {
            if (bullet.hitEnemies.includes(enemy)) return;
            bullet.hitEnemies.push(enemy);
        } else {
            bullet.setActive(false);
            bullet.setVisible(false);
            if (bullet.body) bullet.body.stop();
            bullet.setPosition(-100, -100);
        }

        const died = enemy.takeDamage(bullet.damage || 1, bullet.x, bullet.y);
        
        if (died) {
            // Check if it was a boss
            if (enemy.config.boss) {
                this.bossActive = false;
                // Add big explosion or effect
                if (GameState.screenShake) this.cameras.main.shake(500, 0.05);
            }

            enemy.setActive(false);
            enemy.setVisible(false);
            if (enemy.body) enemy.body.stop();
            enemy.setPosition(-200, -200);
            
            // Safety check for sound stop if requested by user logic
            if (this.enemyExplosionSound && this.enemyExplosionSound.stop) {
                 this.enemyExplosionSound.stop();
            }

            this.score += enemy.config.score * this.difficulty.scoreMult * this.comboMultiplier;
            this.scoreText.setText(`${this.lang.SCORE}: ${Math.floor(this.score)}`);
            this.updateCombo(); // Changed from increaseCombo to updateCombo
            
            this.player.gainXp(CONFIG.XP.ORB_VALUE);
            this.player.onKill();

            const xpText = this.add.text(enemy.x, enemy.y, `+${CONFIG.XP.ORB_VALUE * this.comboMultiplier}`, {
                fontFamily: '"VMV Sega Genesis", "Kagiraretapikuseru", "Press Start 2P"', fontSize: '20px', fill: '#00ffff', stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setResolution(1);
            
            this.tweens.add({
                targets: xpText, y: enemy.y - 50, alpha: 0, duration: 1000,
                onComplete: () => xpText.destroy()
            });

            // Removed manual explosion sound play here as it is now handled in Enemy.die()
            // if (GameState.volume > 0) this.explosionSound.play();
            
            if (GameState.screenShake) this.cameras.main.shake(100, 0.005);
            this.particleEmitter.emitParticleAt(enemy.x, enemy.y, 10);
            
            // Shockwave Effect
            const shockwave = this.add.image(enemy.x, enemy.y, 'shockwave');
            shockwave.setBlendMode('ADD');
            shockwave.setAlpha(0.8);
            this.tweens.add({
                targets: shockwave,
                scale: 3,
                alpha: 0,
                duration: 300,
                onComplete: () => shockwave.destroy()
            });

            // Chance to drop powerup
            if (Math.random() < 0.1) { // 10% chance
                const powerup = this.powerups.get();
                if (powerup) {
                    powerup.spawn(enemy.x, enemy.y);
                }
            }
        }
    }

    handlePlayerHitPowerup(player, powerup) {
        if (!powerup.active) return;
        powerup.collect(player);
        if (GameState.volume > 0) {
             // Play pickup sound if available
        }
    }

    handlePlayerHitOrb(player, orb) {
        if (!orb.active) return;
        const value = orb.collect();
        if (value > 0) {
            player.gainXp(value);
            // Play XP sound
        }
    }

    spawnBoss() {
        if (this.bossActive) return;
        
        // Find a free enemy or create one
        const boss = this.enemies.get();
        if (boss) {
            this.bossActive = true;
            // Spawn boss: x, y, type, level
            // We use 'BOSS' type which should be handled in Enemy.js
            boss.spawn(CONFIG.GAME_WIDTH/2, -100, 'BOSS', this.player.level);
            boss.setTarget(this.player); // Ensure boss tracks player
            boss.setScale(3); // Explicitly set scale as requested
            
            // Boss warning
            const text = this.add.text(this.scale.width/2, this.scale.height/2, 'BOSS APPROACHING!', {
                fontFamily: '"VMV Sega Genesis", "Kagiraretapikuseru", "Press Start 2P"', 
                fontSize: '32px',
                fill: '#ff0000', 
                stroke: '#ffffff', 
                strokeThickness: 6
            }).setOrigin(0.5).setScrollFactor(0).setResolution(1);
            
            // Text effect
            this.tweens.add({
                targets: text,
                alpha: 0,
                scale: 1.2,
                duration: 3000,
                onComplete: () => text.destroy()
            });
        }
    }

    handleEnemyBulletHitPlayer(player, bullet) {
        if (!bullet.active || !bullet.visible) return;
        
        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.body.stop();
        bullet.setPosition(-100, -100);
        
        const damage = bullet.damage || 5;
        player.takeDamage(damage);
        this.cameras.main.flash(100, 100, 0, 0);
    }

    handleBulletHitWorld(body, up, down, left, right) {
        const bullet = body.gameObject;
        if (!bullet || !bullet.bounceCount) return;

        bullet.bounceCount--;
        // Phaser handles the bounce velocity automatically if setBounce(1) is used
        if (bullet.bounceCount <= 0) {
            bullet.setCollideWorldBounds(false);
            bullet.setBounce(0);
        }
    }

    handleEnemyOverlap(player, enemy) {
        if (!enemy.active || this.isGameOver) return;
        
        // Asteroid Logic (Indestructible)
        if (enemy.config.indestructible) {
             const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
             player.setVelocity(Math.cos(angle) * 800, Math.sin(angle) * 800);
             player.takeDamage(enemy.config.areaDamage || 20);
             if (GameState.screenShake) this.cameras.main.shake(200, 0.02);
             return;
        }

        const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
        const bounceForce = 200;
        enemy.setVelocity(Math.cos(angle) * bounceForce, Math.sin(angle) * bounceForce);
        
        const damage = 10 * this.difficulty.damageMult;
        const currentHp = player.hp;
        player.takeDamage(damage);
        
        if (player.hp < currentHp) {
             this.cameras.main.flash(100, 100, 0, 0);
             // Reset Combo on damage?
             this.resetCombo();
        }
    }
    
    handleAbilityUsed(ability) {
        if (ability.id === 'nova_blast') {
            const radius = ability.radius;
            const circle = this.add.circle(this.player.x, this.player.y, 0, 0xffff00, 0.5);
            this.tweens.add({
                targets: circle, radius: radius, alpha: 0, duration: 500,
                onComplete: () => circle.destroy()
            });
            if (GameState.screenShake) this.cameras.main.shake(300, 0.02);

            this.enemies.getChildren().forEach(enemy => {
                if (!enemy.active) return;
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                if (dist <= radius) {
                    const died = enemy.takeDamage(ability.damage, this.player.x, this.player.y);
                    if (died) {
                        enemy.setActive(false);
                        enemy.setVisible(false);
                        if (enemy.body) enemy.body.stop();
                    }
                }
            });
        }
    }

    triggerLevelUp() {
        this.scene.pause();
        this.scene.launch('LevelUpScene', { player: this.player });
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        this.player.setTint(0x555555);
        
        console.log('Game Over triggered. Stats:', {
            score: this.score,
            highscore: GameState.highScore,
            level: this.player ? this.player.level : 1
        });

        // Pass data to GameOverScene
        this.scene.start('GameOverScene', { 
            score: this.score, 
            highscore: GameState.highScore, 
            level: this.player ? this.player.level : 1 
        });
    }

    updateCombo() {
        const now = this.time.now;
        // Reset if more than 2 seconds passed since last kill
        if (now - this.lastKillTime > 2000) {
            this.combo = 0;
            this.comboMultiplier = 1;
        }

        this.combo++;
        this.lastKillTime = now;
        this.comboTimer = 2000; // Visual timer

        // Update Multiplier based on strict thresholds
        if (this.combo >= 30) this.comboMultiplier = 4;
        else if (this.combo >= 15) this.comboMultiplier = 3;
        else if (this.combo >= 5) this.comboMultiplier = 2;
        else this.comboMultiplier = 1;

        // Show large multiplier text if changed
        this.updateComboUI();
    }
}
