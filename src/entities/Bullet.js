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
        this.setTint(tint || 0xffff00);
        this.damage = damage; 
        this.isEnemyBullet = isEnemy;
        
        this.setRotation(rotation);
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
