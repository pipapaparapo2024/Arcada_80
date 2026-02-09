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

        // Asteroid Texture (Detailed Irregular Rock)
        if (!this.textures.exists('asteroid')) {
            const gfx = this.make.graphics({x:0, y:0, add:false});
            
            // Base Rock Shape (Irregular Polygon)
            gfx.fillStyle(0x888888, 1);
            gfx.beginPath();
            const points = [
                {x: 16, y: 2}, {x: 26, y: 6}, {x: 30, y: 16}, {x: 24, y: 28}, 
                {x: 12, y: 30}, {x: 2, y: 20}, {x: 4, y: 8}
            ];
            // Scale points to 64x64 (original was 32x32)
            gfx.moveTo(points[0].x * 2, points[0].y * 2);
            points.forEach(p => gfx.lineTo(p.x * 2, p.y * 2));
            gfx.closePath();
            gfx.fillPath();

            // Craters/Details
            gfx.fillStyle(0x666666, 1);
            gfx.fillCircle(20, 20, 8);
            gfx.fillCircle(40, 44, 10);
            gfx.fillCircle(28, 40, 4);
            
            // Highlights
            gfx.fillStyle(0xaaaaaa, 1); 
            gfx.fillCircle(24, 16, 2);
            gfx.fillCircle(36, 40, 4);

            gfx.generateTexture('asteroid', 64, 64);
        }

        // Drone Texture (Futuristic Orb)
        if (!this.textures.exists('drone')) {
            const gfx = this.make.graphics({x:0, y:0, add:false});
            
            // Outer Glow
            gfx.fillStyle(0x00ffff, 0.2);
            gfx.fillCircle(16, 16, 16);
            
            // Core Sphere
            gfx.fillStyle(0x0088ff, 1);
            gfx.fillCircle(16, 16, 8);
            
            // Orbital Ring
            gfx.lineStyle(2, 0xffffff, 0.8);
            gfx.strokeCircle(16, 16, 12);
            
            // Scanner Eye
            gfx.fillStyle(0xffffff, 1);
            gfx.fillCircle(16, 16, 4);
            
            gfx.generateTexture('drone', 32, 32);
        }

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
