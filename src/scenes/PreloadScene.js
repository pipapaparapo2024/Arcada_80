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
        this.load.image('bullet', './assets/sprites/bullets/bullet6.png');
        this.load.image('bullet_enemy', './assets/sprites/bullets/bullet2.png');
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

        // Asteroid Texture (Placeholder)
        const asteroidGfx = this.make.graphics({ x: 0, y: 0, add: false });
        asteroidGfx.fillStyle(0x888888, 1);
        asteroidGfx.fillCircle(32, 32, 30);
        asteroidGfx.fillStyle(0x666666, 1);
        asteroidGfx.fillCircle(20, 20, 8);
        asteroidGfx.fillCircle(40, 40, 12);
        asteroidGfx.generateTexture('asteroid', 64, 64);

        // Scanlines Texture
        const scanGfx = this.make.graphics({ x: 0, y: 0, add: false });
        scanGfx.fillStyle(0x000000, 0.3);
        scanGfx.fillRect(0, 0, 2, 1);
        scanGfx.fillStyle(0x000000, 0);
        scanGfx.fillRect(0, 1, 2, 1);
        scanGfx.generateTexture('scanlines', 2, 2);

        // Pixel Texture (for debris)
        const pixelGfx = this.make.graphics({ x: 0, y: 0, add: false });
        pixelGfx.fillStyle(0xffffff, 1);
        pixelGfx.fillRect(0, 0, 2, 2); // 2x2 for better visibility
        pixelGfx.generateTexture('pixel', 2, 2);

        // Noise Texture (for static)
        if (!this.textures.exists('noise')) {
            const noiseSize = 64;
            const canvas = this.textures.createCanvas('noise', noiseSize, noiseSize);
            const ctx = canvas.context;
            const idata = ctx.createImageData(noiseSize, noiseSize);
            const buffer = new Uint32Array(idata.data.buffer);
            for (let i = 0; i < buffer.length; i++) {
                if (Math.random() < 0.5) {
                    buffer[i] = 0xffffffff; // White
                } else {
                    buffer[i] = 0xff000000; // Black
                }
            }
            ctx.putImageData(idata, 0, 0);
            canvas.refresh();
        }
    }

    create() {
        console.log('PreloadScene complete. Starting MenuScene.');
        this.scene.start('MenuScene');
    }
}
