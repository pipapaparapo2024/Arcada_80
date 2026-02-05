import { CONFIG } from '../utils/Config.js';

export class Weapon {
    constructor(scene, player, configId) {
        this.scene = scene;
        this.player = player;
        this.config = CONFIG.WEAPONS[configId.toUpperCase()];
        this.lastFired = 0;
        
        // Weapon state
        this.level = 1;
    }

    canFire(time) {
        return time > this.lastFired + this.config.fireRate;
    }

    fire(time) {
        if (!this.canFire(time)) return false;

        this.lastFired = time;
        this.scene.cameras.main.shake(50, 0.005 * (this.config.recoil / 200));

        switch (this.config.id) {
            case 'shotgun':
                this.fireShotgun();
                break;
            case 'laser':
                this.fireLaser();
                break;
            case 'ricochet':
                this.fireRicochet();
                break;
            case 'pistol':
            default:
                this.fireStandard();
                break;
        }

        // Play sound (if available, distinct sounds would be great, but we might reuse 'shoot' with pitch changes)
        if (this.scene.shootSound && this.scene.volume > 0) {
            let detune = 0;
            if (this.config.id === 'shotgun') detune = -500;
            if (this.config.id === 'laser') detune = 1000;
            if (this.config.id === 'ricochet') detune = 500;
            
            this.scene.shootSound.play({ detune: detune, volume: this.scene.volume / 100 });
        }

        return true;
    }

    fireStandard() {
        const bullet = this.player.bullets.get(this.player.x, this.player.y);
        if (bullet) {
            const angle = this.player.rotation - Math.PI / 2;
            const spread = (Math.random() - 0.5) * this.config.spread;
            
            bullet.fire(this.player.x, this.player.y, angle + spread, this.config.speed, this.config.damage, this.config.color);
        }
    }

    fireShotgun() {
        const count = this.config.count;
        const baseAngle = this.player.rotation - Math.PI / 2;
        
        for (let i = 0; i < count; i++) {
            const bullet = this.player.bullets.get(this.player.x, this.player.y);
            if (bullet) {
                // Spread evenly
                const spread = (i - (count - 1) / 2) * this.config.spread;
                bullet.fire(this.player.x, this.player.y, baseAngle + spread, this.config.speed, this.config.damage, this.config.color);
            }
        }
        
        // Apply recoil to player
        const recoilX = Math.cos(baseAngle) * -this.config.recoil;
        const recoilY = Math.sin(baseAngle) * -this.config.recoil;
        this.player.body.setVelocity(
            this.player.body.velocity.x + recoilX, 
            this.player.body.velocity.y + recoilY
        );
    }

    fireLaser() {
        // Laser acts as a high speed piercing projectile
        const bullet = this.player.bullets.get(this.player.x, this.player.y);
        if (bullet) {
            const angle = this.player.rotation - Math.PI / 2;
            bullet.fire(this.player.x, this.player.y, angle, this.config.speed * 2, this.config.damage, this.config.color);
            bullet.isPiercing = true; // Need to handle this in GameScene
            
            // Visual scale
            bullet.setScale(2, 0.5); 
            bullet.body.setSize(bullet.width, bullet.height);
        }
    }

    fireRicochet() {
        const bullet = this.player.bullets.get(this.player.x, this.player.y);
        if (bullet) {
            const angle = this.player.rotation - Math.PI / 2;
            bullet.fire(this.player.x, this.player.y, angle, this.config.speed, this.config.damage, this.config.color);
            
            // Enable bounce
            bullet.setCollideWorldBounds(true);
            bullet.setBounce(1);
            bullet.bounceCount = 3; // Custom property
        }
    }
}