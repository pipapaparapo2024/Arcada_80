import { Player } from '../entities/Player.js';
import { Enemy, ENEMY_TYPES } from '../entities/Enemy.js';
import { Powerup } from '../entities/Powerup.js';
import { Bullet } from '../entities/Bullet.js';
import { CONFIG, GameState } from '../utils/Config.js';
import { Lang } from '../utils/Lang.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        // Localization
        this.lang = Lang[GameState.lang];

        // CRT Shader
        if (this.game.renderer.pipelines && this.game.renderer.pipelines.has('CRTPipeline')) {
            this.cameras.main.setPostPipeline('CRTPipeline');
        }

        // Apply difficulty settings
        this.difficulty = GameState.difficulty;
        
        // World bounds - Keep fixed game world or adapt?
        // For an arcade shooter, usually a fixed arena is better, but user said "adaptive".
        // Let's keep the logical world bounds fixed (1600x1200) but allow the camera to see what fits.
        this.physics.world.setBounds(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
        this.physics.world.on('worldbounds', this.handleBulletHitWorld, this);
        
        // Parallax Background
        this.starsBg = this.add.tileSprite(
            this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 'background'
        ).setScrollFactor(0).setAlpha(0.5).setDepth(-2);

        this.background = this.add.tileSprite(
            this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 'background'
        ).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setDepth(-1);
        
        // Player
        this.player = new Player(this, CONFIG.GAME_WIDTH/2, CONFIG.GAME_HEIGHT/2);
        
        // Danger Zone Warning Overlay
        this.dangerOverlay = this.add.graphics();
        this.dangerOverlay.setScrollFactor(1); // World space
        this.dangerOverlay.setDepth(100);
        
        // Draw the boundary permanently so player knows where it is
        this.drawWorldBounds();
        
        this.player.on('dangerZone', (active) => this.updateDangerZone(active));
        this.player.on('abilityUsed', (ability) => this.handleAbilityUsed(ability));
        
        // Combo System
        this.combo = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
        
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

        // Particle Manager
        this.particleEmitter = this.add.particles(0, 0, 'spark', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            frequency: -1
        });

        // Spawning Logic
        this.enemySpawnDelay = 2000;
        this.baseEnemySpeedMultiplier = this.difficulty.speedMult;
        this.currentEnemySpeedMultiplier = this.baseEnemySpeedMultiplier;
        this.difficultyTimer = 0;

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
        this.physics.world.on('worldbounds', this.handleBulletHitWorld, this); // Re-binding listener if needed, but it's already bound earlier. 
        // Actually, enemy bullets might also hit world bounds.
        // We need to ensure 'worldbounds' event is fired for enemy bullets too.
        // In Bullet.js we set collideWorldBounds(false) by default but we check manually in preUpdate.
        
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
            // Resuming from another scene (like LevelUp)
        });
        
        this.scale.on('resize', this.resize, this);

        // Sound Effects
        this.shootSound = this.sound.add('shoot', { volume: GameState.volume / 100 });
        this.explosionSound = this.sound.add('explosion', { volume: GameState.volume / 100 });
        this.bgm = this.sound.add('bgm', { volume: GameState.volume / 100 * 0.5, loop: true });
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
            angle: { min: 0, max: 360 } // Initial spray, updated in update
        });
        this.trailEmitter.startFollow(this.player);
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

        if (this.isGameOver) {
            this.trailEmitter.stop(); // Stop trail on death
            if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
                this.bgm.stop();
                this.scene.restart();
            }
            return;
        }

        this.player.update(time, delta);
        
        // Update Trail
        // Calculate offset based on player rotation (engine is at the back)
        const rad = this.player.rotation;
        const offset = 30; // Distance behind ship
        const offX = Math.cos(rad) * -offset;
        const offY = Math.sin(rad) * -offset;
        
        // Update follow offset so particles emit from the engine
        this.trailEmitter.followOffset.set(offX, offY);
        
        // Direct particles opposite to player rotation
        // angle property in emitter config is absolute, so we set it here
        // We want particles to shoot BACKWARDS relative to ship
        // Ship faces 'rad', so backwards is rad + PI
        // Particle emitter angle is in degrees usually for the config object, but setAngle might take degrees?
        // setAngle takes value? Phaser 3 docs: emitter.angle is a property? No, it's an Ops.
        // We probably need to update the processor?
        // Actually, just setting the emitter to follow and offset is enough for position.
        // For direction, if speed > 0, they fly out.
        // If we want them to fly OUT from the engine in a cone, we set angle.
        // The 'angle' property in config can be a number or object.
        // To update it runtime:
        // this.trailEmitter.setAngle({ min: ..., max: ... })?
        // Or just:
        // this.trailEmitter.angle.start = ...
        // Let's keep it simple: just position is enough for now. The 'fire' texture looks like a ball.
        
        // Parallax
        this.starsBg.tilePositionX += 0.1;
        this.starsBg.tilePositionY += 0.05;
        this.background.tilePositionX += 0.5;
        this.background.tilePositionY += 0.2;
        
        // Difficulty Timer
        this.difficultyTimer += delta;
        if (this.difficultyTimer >= 30000) {
            this.increaseDifficulty();
            this.difficultyTimer = 0;
        }
        
        // Combo Timer
        if (this.combo > 0) {
            this.comboTimer -= delta;
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
            this.updateComboUI();
        }
    }

    createUI() {
        const { width, height } = this.scale;

        // Ammo
        this.ammoText = this.add.text(10, 10, `${this.lang.AMMO}: ${CONFIG.PLAYER.AMMO_MAX}`, { 
            font: '24px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 2 
        }).setScrollFactor(0);
        
        this.reloadText = this.add.text(width/2, height/2, this.lang.RELOADING, { 
            font: '32px Arial', fill: '#ff0000', stroke: '#000000', strokeThickness: 3 
        }).setScrollFactor(0).setOrigin(0.5).setVisible(false);

        // HP
        this.hpText = this.add.text(10, 40, `HP: ${CONFIG.PLAYER.HP}`, { 
            font: '24px Arial', fill: '#00ff00', stroke: '#000000', strokeThickness: 2 
        }).setScrollFactor(0);

        // Score
        this.scoreText = this.add.text(10, 70, `${this.lang.SCORE}: 0`, { 
            font: '24px Arial', fill: '#ffff00', stroke: '#000000', strokeThickness: 2 
        }).setScrollFactor(0);

        // Combo
        this.comboText = this.add.text(10, 100, '', { 
            font: '28px Arial', fill: '#00ffff', stroke: '#000000', strokeThickness: 4 
        }).setScrollFactor(0);

        // XP Bar
        const barY = height - 30;
        this.xpBarBg = this.add.rectangle(width/2, barY, width - 40, 20, 0x000000).setScrollFactor(0).setStrokeStyle(2, 0x333333);
        this.xpBarFill = this.add.rectangle(20, barY, 0, 20, 0x00ffff).setScrollFactor(0).setOrigin(0, 0.5);
        this.levelText = this.add.text(width/2, barY - 25, `${this.lang.LEVEL} 1`, {
            font: '20px Arial', fill: '#00ffff', stroke: '#000000', strokeThickness: 4
        }).setScrollFactor(0).setOrigin(0.5);

        // Game Over
        this.gameOverText = this.add.text(width/2, height/2, this.lang.GAME_OVER, { 
            font: '48px Arial', fill: '#ff0000', align: 'center', stroke: '#000000', strokeThickness: 4
        }).setScrollFactor(0).setOrigin(0.5).setVisible(false);

        // Listeners
        this.player.on('ammoChanged', (ammo) => this.ammoText.setText(`${this.lang.AMMO}: ${ammo}/${CONFIG.PLAYER.AMMO_MAX}`));
        this.player.on('reloadStart', () => this.reloadText.setVisible(true));
        this.player.on('reloadComplete', () => this.reloadText.setVisible(false));
        this.player.on('hpChanged', (hp, max) => this.hpText.setText(`HP: ${Math.ceil(hp)}`));
        this.player.on('xpChanged', (xp, next, level) => {
            this.currentXpPercent = Phaser.Math.Clamp(xp / next, 0, 1);
            this.xpBarFill.width = (this.scale.width - 40) * this.currentXpPercent;
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

        // Backgrounds
        this.starsBg.setPosition(width/2, height/2).setSize(width, height);
        this.background.setPosition(width/2, height/2).setSize(width, height);
        
        // Danger Zone
        this.updateDangerZone(false); // Clear and reset size (it will redraw on next update if active)

        // UI
        if (this.ammoText) this.ammoText.setPosition(10, 10);
        if (this.hpText) this.hpText.setPosition(10, 40);
        if (this.scoreText) this.scoreText.setPosition(10, 70);
        if (this.comboText) this.comboText.setPosition(10, 100);
        
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
        
        if (active) {
            const alpha = 0.5 + Math.sin(this.time.now / 100) * 0.3;
            this.dangerOverlay.lineStyle(10, 0xff0000, alpha);
            this.dangerOverlay.strokeRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
            
            // Optional: Draw 'DANGER' text or arrows?
            // For now, pulsing border is good.
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
        this.combo++;
        this.comboTimer = CONFIG.COMBO.RESET_TIME;
        
        const newMult = 1 + Math.floor(this.combo / CONFIG.COMBO.MULTIPLIER_STEP);
        if (newMult > this.comboMultiplier) {
            this.comboMultiplier = newMult;
            const text = this.add.text(this.scale.width/2, 200, `${this.comboMultiplier}x ${this.lang.COMBO}!`, {
                font: '64px Arial', fill: '#ffff00', stroke: '#ff0000', strokeThickness: 6
            }).setOrigin(0.5).setScrollFactor(0);
            
            this.tweens.add({
                targets: text, scale: 1.5, alpha: 0, duration: 1000,
                onComplete: () => text.destroy()
            });
        }
    }

    resetCombo() {
        this.combo = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
        this.updateComboUI();
    }

    spawnEnemy() {
        if (this.isGameOver || this.isPaused) return;

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
            
            enemy.spawn(x, y, enemyType, this.currentEnemySpeedMultiplier);
            enemy.setTarget(this.player);
        }
    }

    increaseDifficulty() {
        this.enemySpawnDelay = Math.max(500, this.enemySpawnDelay * 0.9);
        this.spawnEvent.delay = this.enemySpawnDelay;
        this.baseEnemySpeedMultiplier *= 1.05;
        this.currentEnemySpeedMultiplier = this.baseEnemySpeedMultiplier;
        
        const text = this.add.text(this.scale.width/2, this.scale.height/2 - 100, this.lang.BOSS_WARNING, { 
            font: '50px Arial', fill: '#ff0000', stroke: '#ffffff', strokeThickness: 6 
        }).setOrigin(0.5).setScrollFactor(0);
        
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
            bullet.body.stop();
            bullet.setPosition(-100, -100);
        }

        const died = enemy.takeDamage(bullet.damage || 1, bullet.x, bullet.y);
        
        if (died) {
            enemy.setActive(false);
            enemy.setVisible(false);
            enemy.body.stop();
            enemy.setPosition(-200, -200);
            
            this.score += enemy.config.score * this.difficulty.scoreMult * this.comboMultiplier;
            this.scoreText.setText(`${this.lang.SCORE}: ${Math.floor(this.score)}`);
            this.increaseCombo();
            
            this.player.gainXp(CONFIG.XP.ORB_VALUE);
            this.player.onKill();

            const xpText = this.add.text(enemy.x, enemy.y, `+${CONFIG.XP.ORB_VALUE * this.comboMultiplier}`, {
                font: '20px Arial', fill: '#00ffff', stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: xpText, y: enemy.y - 50, alpha: 0, duration: 1000,
                onComplete: () => xpText.destroy()
            });

            if (GameState.volume > 0) this.explosionSound.play();
            this.cameras.main.shake(100, 0.005);
            this.particleEmitter.emitParticleAt(enemy.x, enemy.y, 10);
            
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
        if (ability.id === 'time_slow') {
            this.currentEnemySpeedMultiplier = this.baseEnemySpeedMultiplier * ability.factor;
            this.cameras.main.setTint(0xaaaaff);
            
            this.time.delayedCall(ability.duration, () => {
                this.currentEnemySpeedMultiplier = this.baseEnemySpeedMultiplier;
                this.cameras.main.clearTint();
            });
        } else if (ability.id === 'nova_blast') {
            const radius = ability.radius;
            const circle = this.add.circle(this.player.x, this.player.y, 0, 0xffff00, 0.5);
            this.tweens.add({
                targets: circle, radius: radius, alpha: 0, duration: 500,
                onComplete: () => circle.destroy()
            });
            this.cameras.main.shake(300, 0.02);

            this.enemies.getChildren().forEach(enemy => {
                if (!enemy.active) return;
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                if (dist <= radius) {
                    const died = enemy.takeDamage(ability.damage, this.player.x, this.player.y);
                    if (died) {
                        enemy.setActive(false);
                        enemy.setVisible(false);
                        enemy.body.stop();
                        enemy.setPosition(-200, -200);
                        this.particleEmitter.emitParticleAt(enemy.x, enemy.y, 10);
                        this.increaseCombo();
                        this.player.gainXp(CONFIG.XP.ORB_VALUE);
                    } else {
                        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                        enemy.body.velocity.x += Math.cos(angle) * ability.force;
                        enemy.body.velocity.y += Math.sin(angle) * ability.force;
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
        this.isGameOver = true;
        this.physics.pause();
        this.player.setTint(0x555555);
        this.gameOverText.setVisible(true);
        GameState.saveHighScore(Math.floor(this.score));
    }
}
