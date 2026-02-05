export class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        console.log('PreloadScene started');
        
        // Load Images
        this.load.image('player', 'https://labs.phaser.io/assets/sprites/ship.png');
        this.load.image('bullet', 'https://labs.phaser.io/assets/sprites/bullets/bullet1.png');
        this.load.image('enemy_chaser', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
        this.load.image('enemy_sprinter', 'https://labs.phaser.io/assets/sprites/ufo.png');
        this.load.image('background', 'https://labs.phaser.io/assets/skies/space3.png');
        this.load.image('spark', 'https://labs.phaser.io/assets/particles/blue.png'); 
        
        // Load Audio
        this.load.audio('shoot', 'https://labs.phaser.io/assets/audio/SoundEffects/pistol.wav');
        this.load.audio('explosion', 'https://labs.phaser.io/assets/audio/SoundEffects/explosion.mp3');

        // XP Orb - Generate texture programmatically
        const xpGfx = this.make.graphics({ x: 0, y: 0, add: false });
        xpGfx.fillStyle(0x00ffff, 1);
        xpGfx.fillCircle(8, 8, 8); // 16x16 circle
        xpGfx.generateTexture('xp_orb', 16, 16);
    }

    create() {
        this.scene.start('MenuScene');
    }
}
