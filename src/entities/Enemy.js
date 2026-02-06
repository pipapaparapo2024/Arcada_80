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
        hp: 100,
        score: 5000,
        scale: 5,
        canShoot: true,
        fireRate: 1000,
        boss: true
    }
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type) {
        // Ensure type is valid, default to CHASER if undefined or invalid
        const validKey = (type && ENEMY_TYPES[type]) ? type : 'CHASER';
        const config = ENEMY_TYPES[validKey];
        
        super(scene, x, y, config.texture);
        
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
    }

    // Method to reset enemy when reusing from pool
    spawn(x, y, type, speedMultiplier = 1) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        
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
        this.takeDamage(100, this.x, this.y); // Self-destruct
        // Deal damage to player if close? Handled by collision overlap in scene
        // But we can force it here?
        // Better to let scene collision handle it, but for AoE we might need custom logic.
        // For now, it just dies and deals contact damage via existing overlap.
    }

    takeDamage(amount) {
        this.hp -= amount;
        
        // Flash red
        this.setTint(0xff0000);
        if (this.flashTimer) this.flashTimer.remove();
        this.flashTimer = this.scene.time.delayedCall(100, () => {
            if (this.active) this.clearTint();
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        // Play explosion sound only once
        if (this.scene && this.scene.explosionSound) {
             this.scene.explosionSound.play();
        }

        // Spawn particles
        // ... (particle logic)
        
        // Notify scene
        if (this.scene.updateCombo) {
            this.scene.updateCombo();
        }
        
        // Chance to drop powerup or XP
        // ...

        this.destroy();
    }
    
    createDeathParticles() {
        // Simple particle effect using the enemy's texture or a particle texture
        // We'll use the 'spark' texture we loaded, tinted to the enemy's color?
        // Or just use the enemy texture scaled down?
        // Let's use a particle emitter manager created in the scene, or create a temp one here.
        // Creating a manager every death is expensive. Ideally, the scene handles this.
        // But for now, let's just emit a simple burst if the scene has an emitter.
        
        if (this.scene.particleEmitter) {
            this.scene.particleEmitter.explode(10, this.x, this.y);
        }
    }
}
