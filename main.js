import { BootScene } from './src/scenes/BootScene.js';
import { PreloadScene } from './src/scenes/PreloadScene.js';
import { MenuScene } from './src/scenes/MenuScene.js';
import { GameScene } from './src/scenes/GameScene.js';
import { LevelUpScene } from './src/scenes/LevelUpScene.js';
import { GameOverScene } from './src/scenes/GameOverScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#000000',
    scene: [BootScene, PreloadScene, MenuScene, GameScene, LevelUpScene, GameOverScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false // Disable debug for production look
        }
    },
    pixelArt: true,
    roundPixels: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true
    }
};

const game = new Phaser.Game(config);
