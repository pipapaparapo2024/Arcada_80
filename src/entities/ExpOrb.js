export class ExpOrb extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, value = 10) {
        super(scene, x, y, 'xp_orb');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.value = value;
        this.isCollected = false;
        
        // Visual polish
        this.setAlpha(0.8);
        this.setBlendMode('ADD');
        
        // Floating animation
        this.scene.tweens.add({
            targets: this,
            y: y - 5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    collect() {
        if (this.isCollected) return 0;
        this.isCollected = true;
        
        // Animation
        this.scene.tweens.add({
            targets: this,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                this.destroy();
            }
        });

        return this.value;
    }
}
