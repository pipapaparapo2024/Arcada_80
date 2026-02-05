import { CONFIG } from '../utils/Config.js';

export class XPOrb extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, value) {
        super(scene, x, y, 'xp_orb');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.value = value;
        this.isCollected = false;
        
        this.setCollideWorldBounds(true);
        this.setBounce(0.5);
        this.setDrag(100);
        this.setScale(0.8);
        
        // Visual polish
        this.setAlpha(0.8);
        this.setBlendMode('ADD');
        
        // Floating animation
        this.floatTween = this.scene.tweens.add({
            targets: this,
            y: y - 5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    spawn(x, y, value) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.value = value;
        this.isCollected = false;
        this.setAlpha(0.8);
        this.setScale(0.8);
        
        this.setVelocity(Phaser.Math.Between(-50, 50), Phaser.Math.Between(-50, 50));
        
        if (this.floatTween) this.floatTween.restart();
    }

    collect() {
        if (this.isCollected) return 0;
        this.isCollected = true;
        
        // Disable physics body immediately to prevent multiple overlaps
        this.body.checkCollision.none = true;
        this.setVelocity(0, 0); // Stop moving
        
        // Animation
        this.scene.tweens.add({
            targets: this,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                this.setActive(false);
                this.setVisible(false);
                this.body.checkCollision.none = false; // Reset for spawn
            }
        });

        return this.value;
    }
}