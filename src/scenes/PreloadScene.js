export class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        console.log('PreloadScene started');
        
        // Fix CORS issues (not needed for local assets, but good for hygiene)
        // this.load.crossOrigin = 'anonymous';
        this.load.baseURL = ''; // Ensure no double base path issues

        // Handle loading errors
        this.load.on('loaderror', (file) => {
            console.error('Asset load failed:', file.key, file.src);
            // We'll generate fallbacks in create() or GameScene if needed,
            // but logging is critical for debugging.
        });

        // Load Images
        this.load.image('player', './assets/sprites/ship.png');
        this.load.image('bullet', './assets/sprites/bullets/bullet1.png');
        this.load.image('enemy_chaser', './assets/sprites/phaser-dude.png');
        this.load.image('enemy_sprinter', './assets/sprites/ufo.png');
        this.load.image('background', './assets/skies/space3.png');
        this.load.image('spark', './assets/particles/blue.png'); 
        this.load.image('fire', './assets/particles/fire.png');
        
        // Load Audio
        this.load.audio('shoot', './assets/audio/SoundEffects/pistol.wav');
        this.load.audio('explosion', './assets/audio/SoundEffects/explosion.mp3');
        this.load.audio('bgm', './assets/audio/tech/Asylum.mp3');

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
