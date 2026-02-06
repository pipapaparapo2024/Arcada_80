import { CONFIG } from '../utils/Config.js';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture = 'bullet') {
        super(scene, x, y, texture);
        this.bounceCount = 0;
        this.isPiercing = false;
        this.hitEnemies = [];
        this.isEnemyBullet = false;
    }

    fire(x, y, rotation, speed, damage, tint, isEnemy = false) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        
        // Set texture based on owner
        if (isEnemy) {
            this.setTexture('bullet_enemy');
        } else {
            this.setTexture('bullet');
        }

        // Apply tint only if provided and not white (0xffffff)
        // If tint is undefined/null, clear it to show original sprite
        if (tint && tint !== 0xffffff) {
            this.setTint(tint);
        } else {
            this.clearTint();
        }

        this.damage = damage; 
        this.isEnemyBullet = isEnemy;
        
        this.setRotation(rotation);
        // Adjust for sprite orientation if needed (assuming sprites point right)
        // If bullet6.png points up, we need rotation + PI/2
        // Let's assume standard Phaser orientation (Right = 0)
        
        this.scene.physics.velocityFromRotation(rotation, speed, this.body.velocity);
        
        // Reset properties
        this.setCollideWorldBounds(false);
        this.setBounce(0);
        this.bounceCount = 0;
        this.isPiercing = false;
        this.hitEnemies = [];
        this.setScale(1);
        this.body.setSize(this.width, this.height);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.body.collideWorldBounds && !this.scene.physics.world.bounds.contains(this.x, this.y)) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}
