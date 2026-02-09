
import { CONFIG } from '../utils/Config.js';
import { Bullet } from './Bullet.js';

export class Drone extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, player, index, total) {
        super(scene, player.x, player.y, 'drone');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.player = player;
        this.orbitAngle = (Math.PI * 2 / total) * index;
        this.orbitDistance = 60;
        this.rotationSpeed = 0.002;
        
        this.fireRate = 1000;
        this.lastFireTime = 0;
        this.damage = 2;
        this.range = 400;

        this.setDepth(player.depth + 1);
    }

    update(time, delta) {
        if (!this.active || !this.player.active) return;

        // Orbit Logic
        this.orbitAngle += this.rotationSpeed * delta;
        this.x = this.player.x + Math.cos(this.orbitAngle) * this.orbitDistance;
        this.y = this.player.y + Math.sin(this.orbitAngle) * this.orbitDistance;
        
        // Rotate to face outward or towards enemy
        this.rotation = this.orbitAngle;

        // Shooting Logic
        if (time > this.lastFireTime + this.fireRate) {
            this.fire(time);
        }
    }

    fire(time) {
        // Find nearest enemy
        let nearest = null;
        let minDist = this.range;

        // Access enemies from scene
        if (this.scene.enemies) {
            this.scene.enemies.getChildren().forEach(enemy => {
                if (!enemy.active) return;
                const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = enemy;
                }
            });
        }

        if (nearest) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, nearest.x, nearest.y);
            
            // Create bullet
            // We can reuse Player's bullet group or create a drone bullet group. 
            // Reusing player's bullets allows them to damage enemies naturally.
            const bullet = this.player.bullets.get();
            if (bullet) {
                bullet.fire(this.x, this.y, angle, 400, this.damage, 0); // speed 400, damage 2, spread 0
                bullet.setTint(0x00ffff); // Cyan bullets for drone
                this.lastFireTime = time;
                
                // Recoil animation (kick back)
                this.x -= Math.cos(angle) * 5;
                this.y -= Math.sin(angle) * 5;
            }
        }
    }
}
