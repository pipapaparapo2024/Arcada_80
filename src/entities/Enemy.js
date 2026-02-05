export const ENEMY_TYPES = {
    CHASER: {
        texture: 'enemy_chaser',
        speed: 100,
        hp: 3,
        score: 100,
        scale: 1 // Default scale
    },
    SPRINTER: {
        texture: 'enemy_sprinter',
        speed: 150, // 1.5x
        hp: 1,
        score: 150,
        scale: 0.8 // Smaller
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
        
        // Apply scale
        if (config.scale) {
            this.setScale(config.scale);
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
        
        if (this.config.scale) {
            this.setScale(this.config.scale);
        } else {
            this.setScale(1);
        }
        
        this.isKnockedBack = false;
        this.clearTint();
        
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
            
            // Rotate towards target (phaser-dude faces front, so usually no rotation needed or flipX)
            // But if we want it to "look" at player, we might rotate it?
            // Phaser Dude is a platformer sprite (front facing). Rotating it looks weird.
            // But 'ufo' (sprinter) is round.
            // Let's rotate anyway as requested, but maybe add offset if needed.
            // For now, standard rotation.
            const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
            this.setRotation(angle);
        }
    }

    takeDamage(damage, sourceX, sourceY) {
        this.hp -= damage;
        
        // Flash white
        this.setTintFill(0xffffff);

        this.scene.time.delayedCall(100, () => {
            if (this.active) this.clearTint();
        });

        // Knockback
        this.isKnockedBack = true;
        const angle = Phaser.Math.Angle.Between(sourceX, sourceY, this.x, this.y);
        this.scene.physics.velocityFromRotation(angle, 150, this.body.velocity); 

        this.scene.time.delayedCall(200, () => {
            if (this.active) this.isKnockedBack = false;
        });

        if (this.hp <= 0) {
            this.createDeathParticles();
            return true; // Died
        }
        return false; // Alive
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
