import { GameState } from '../utils/Config.js';
import { Bullet } from './Bullet.js';

export const ENEMY_TYPES = {
    CHASER: {
        texture: 'enemy_chaser',
        speed: 100,
        hp: 3,
        score: 100,
        scale: 1
    },
    SPRINTER: {
        texture: 'enemy_sprinter',
        speed: 150,
        hp: 1,
        score: 150,
        scale: 0.8
    },
    SHOOTER: {
        texture: 'enemy_chaser', // Placeholder or use different tint
        speed: 80,
        hp: 5,
        score: 200,
        scale: 1.2,
        canShoot: true,
        fireRate: 2000
    },
    KAMIKAZE: {
        texture: 'enemy_sprinter',
        speed: 300,
        hp: 1,
        score: 300,
        scale: 0.7,
        kamikaze: true
    },
    BOSS: {
        texture: 'enemy_chaser',
        speed: 40,
        hp: 500,
        score: 5000,
        scale: 3,
        canShoot: true,
        fireRate: 1500,
        boss: true
    },
    ASTEROID: {
        texture: 'asteroid', // Ensure this key exists or use fallback
        speed: 20,
        hp: 9999,
        score: 0,
        scale: 2,
        indestructible: true,
        areaDamage: 10
    }
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type) {
        // Ensure type is valid, default to CHASER if undefined or invalid
        const validKey = (type && ENEMY_TYPES[type]) ? type : 'CHASER';
        const config = ENEMY_TYPES[validKey];
        
        super(scene, x, y, config.texture); // Make sure 'asteroid' texture is loaded or use placeholder in Preload
        
        // Add to scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.type = validKey;
        this.config = config;
        
        // Initialize properties
        this.target = null;
        this.hp = config.hp;
        this.baseSpeed = config.speed;
        this.currentSpeed = config.speed;
        this.isKnockedBack = false;
        this.shootTimer = 0;
        
        // Apply scale
        if (config.scale) {
            this.setScale(config.scale);
        }
        
        if (this.config.canShoot) {
            this.setTint(0xff0000); // Visual distinction
        }
        if (this.config.kamikaze) {
            this.setTint(0xffaa00);
        }
        this.isDead = false;
    }

    // Method to reset enemy when reusing from pool
    spawn(x, y, type, speedMultiplier = 1) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.isDead = false;
        
        // Use valid type
        const validKey = (type && ENEMY_TYPES[type]) ? type : 'CHASER';
        this.type = validKey;
        this.config = ENEMY_TYPES[validKey];
        
        this.setTexture(this.config.texture);
        this.hp = this.config.hp;
        this.baseSpeed = this.config.speed;
        this.currentSpeed = this.baseSpeed * speedMultiplier;
        this.shootTimer = 0;
        
        if (this.config.scale) {
            this.setScale(this.config.scale);
        } else {
            this.setScale(1);
        }
        
        this.isKnockedBack = false;
        this.clearTint();
        
        if (this.config.canShoot) {
            this.setTint(0xff0000); 
        }
        if (this.config.kamikaze) {
            this.setTint(0xffaa00);
        }
        if (this.config.boss) {
            this.setTint(0xaa00aa); // Purple for Boss
        }
        
        // Reset body size in case texture size changed
        this.body.setSize(this.width, this.height);
    }

    setTarget(target) {
        this.target = target;
    }

    update(time, delta) {
        if (!this.active) return;
        
        if (this.target && !this.isKnockedBack) {
            // Move towards target
            this.scene.physics.moveToObject(this, this.target, this.currentSpeed);
            
            const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
            this.setRotation(angle);

            // Shooting Logic
            if (this.config.canShoot && time > this.shootTimer) {
                this.shoot(time);
            }
            
            // Kamikaze Logic
            if (this.config.kamikaze) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
                if (dist < 100) {
                    this.explode();
                }
            }
        }
    }
    
    shoot(time) {
        this.shootTimer = time + this.config.fireRate;
        
        // Create bullet (Scene must handle bullet group)
        if (this.scene.enemyBullets) {
            const bullet = this.scene.enemyBullets.get();
            if (bullet) {
                const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
                bullet.fire(this.x, this.y, angle, 400, 10, 0xff0000, true);
            }
        }
    }
    
    explode() {
        // AoE Damage to player
        if (this.scene && this.scene.player) {
            const player = this.scene.player;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (dist < 200) { // Explosion radius
                 player.takeDamage(20); 
                 if (GameState.screenShake) this.scene.cameras.main.shake(200, 0.01);
            }
        }
        
        this.takeDamage(this.hp); // Self-destruct
    }

    takeDamage(amount) {
        if (this.isDead) return false;
        this.hp -= amount;
        
        // Flash red
        this.setTint(0xff0000);
        
        if (this.flashTimer) this.flashTimer.remove();
        this.flashTimer = this.scene.time.delayedCall(100, () => {
            if (this.active && !this.isDead) {
                this.clearTint();
                // Restore type tint
                if (this.config.canShoot) this.setTint(0xff0000);
                if (this.config.kamikaze) this.setTint(0xffaa00);
            }
        });

        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;

        // Play explosion sound only once
        if (this.scene && this.scene.explosionSound) {
             this.scene.explosionSound.play({ volume: GameState.volume / 100 });
        }

        // Spawn particles
        this.createDeathParticles();
        
        // We DO NOT destroy here, we let the Scene handle pooling (setActive/setVisible)
        // based on the return value of takeDamage
    }
    
    createDeathParticles() {
        if (this.scene.debrisEmitter) {
            let color = 0xffffff;
            
            // Determine color based on type
            if (this.config.boss) color = 0xaa00aa;
            else if (this.config.kamikaze) color = 0xffaa00;
            else if (this.config.canShoot) color = 0xff0000;
            else if (this.type === 'SPRINTER') color = 0x00ff00;
            else color = 0x00ffff;
            
            this.scene.debrisEmitter.setParticleTint(color);
            this.scene.debrisEmitter.explode(8, this.x, this.y);
        } else if (this.scene.particleEmitter) {
            this.scene.particleEmitter.explode(10, this.x, this.y);
        }
    }
}
