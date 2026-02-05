export class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        console.log('PreloadScene started');
        
        // Fix CORS issues
        this.load.crossOrigin = 'anonymous';
        this.load.baseURL = ''; // Ensure no double base path issues

        // Handle loading errors
        this.load.on('loaderror', (file) => {
            console.error('Asset load failed:', file.key, file.src);
            // We'll generate fallbacks in create() or GameScene if needed,
            // but logging is critical for debugging.
        });

        // Load Images
        this.load.image('player', 'https://labs.phaser.io/assets/sprites/ship.png');
        this.load.image('bullet', 'https://labs.phaser.io/assets/sprites/bullets/bullet1.png');
        this.load.image('enemy_chaser', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
        this.load.image('enemy_sprinter', 'https://labs.phaser.io/assets/sprites/ufo.png');
        this.load.image('background', 'https://labs.phaser.io/assets/skies/space3.png');
        this.load.image('spark', 'https://labs.phaser.io/assets/particles/blue.png'); 
        this.load.image('fire', 'https://labs.phaser.io/assets/particles/fire.png');
        
        // Load Audio
        this.load.audio('shoot', 'https://labs.phaser.io/assets/audio/SoundEffects/pistol.wav');
        this.load.audio('explosion', 'https://labs.phaser.io/assets/audio/SoundEffects/explosion.mp3');
        this.load.audio('bgm', 'https://labs.phaser.io/assets/audio/tech/Asylum.mp3');

        // XP Orb - Generate texture programmatically
        const xpGfx = this.make.graphics({ x: 0, y: 0, add: false });
        xpGfx.fillStyle(0x00ffff, 1);
        xpGfx.fillCircle(8, 8, 8); // 16x16 circle
        xpGfx.generateTexture('xp_orb', 16, 16);

        // Shockwave Texture
        const swGfx = this.make.graphics({ x: 0, y: 0, add: false });
        swGfx.lineStyle(4, 0xffffff, 1);
        swGfx.strokeCircle(32, 32, 30);
        swGfx.generateTexture('shockwave', 64, 64);
    }

    create() {
        this.scene.start('MenuScene');
    }
}
