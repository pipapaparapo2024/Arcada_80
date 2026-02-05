export class XPOrb extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, value) {
        super(scene, x, y, 'xp_orb');
        this.value = value;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setCollideWorldBounds(true);
        this.setBounce(0.5);
        this.setDrag(100);
        this.setScale(0.8);
    }

    spawn(x, y, value) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.value = value;
        
        // Random velocity
        this.setVelocity(Phaser.Math.Between(-50, 50), Phaser.Math.Between(-50, 50));
    }

    collect() {
        this.setActive(false);
        this.setVisible(false);
        this.body.stop();
        // Return to pool logic handled by group
    }
    
    update(time, delta) {
        // Magnet logic handled by Scene or here if we pass player
    }
}