import { CONFIG } from '../utils/Config.js';

export const POWERUP_TYPES = {
    HEAL: { color: 0x00ff00, label: 'HP', duration: 0 },
    SHIELD: { color: 0x00ffff, label: 'SHIELD', duration: 5000 },
    AMMO: { color: 0xffff00, label: 'AMMO', duration: 0 },
    MAGNET: { color: 0xff00ff, label: 'MAGNET', duration: 10000 }
};

export class Powerup extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type) {
        super(scene, x, y, 'bullet'); // Reusing bullet texture or shape
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.spawn(x, y, type);
    }

    spawn(x, y, type) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        
        // Random type if not provided
        if (!type) {
            const keys = Object.keys(POWERUP_TYPES);
            this.typeKey = keys[Phaser.Math.Between(0, keys.length - 1)];
        } else {
            this.typeKey = type;
        }
        
        this.config = POWERUP_TYPES[this.typeKey];
        
        this.setTint(this.config.color);
        this.setScale(1.5);
        
        // Float animation
        this.scene.tweens.add({
            targets: this,
            y: y - 10,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        // Despawn timer
        this.despawnTimer = this.scene.time.delayedCall(10000, () => {
            this.setActive(false);
            this.setVisible(false);
        });
    }

    collect(player) {
        if (!this.active) return;
        
        this.setActive(false);
        this.setVisible(false);
        if (this.despawnTimer) this.despawnTimer.remove();
        
        // Effect
        switch (this.typeKey) {
            case 'HEAL':
                player.hp = Math.min(player.hp + 20, player.maxHp);
                player.emit('hpChanged', player.hp, player.maxHp);
                break;
            case 'AMMO':
                player.ammo = CONFIG.PLAYER.AMMO_MAX;
                player.emit('ammoChanged', player.ammo);
                break;
            case 'SHIELD':
                player.invulnerable = true;
                player.setTint(0x00ffff);
                this.scene.time.delayedCall(this.config.duration, () => {
                    player.invulnerable = false;
                    player.clearTint();
                });
                break;
            case 'MAGNET':
                // Handled in GameScene/Player logic?
                // Or set a flag on player
                player.magnetActive = true;
                this.scene.time.delayedCall(this.config.duration, () => {
                    player.magnetActive = false;
                });
                break;
        }
        
        // Visual
        const text = this.scene.add.text(this.x, this.y, this.config.label, {
            font: '20px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: text, y: this.y - 50, alpha: 0, duration: 1000,
            onComplete: () => text.destroy()
        });
    }
}
