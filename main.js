import { BootScene } from './src/scenes/BootScene.js';
import { PreloadScene } from './src/scenes/PreloadScene.js';
import { MenuScene } from './src/scenes/MenuScene.js';
import { GameScene } from './src/scenes/GameScene.js';
import { LevelUpScene } from './src/scenes/LevelUpScene.js';

const config = {
    type: Phaser.AUTO,
    width: 1600,
    height: 1200,
    parent: document.body,
    backgroundColor: '#000000',
    scene: [BootScene, PreloadScene, MenuScene, GameScene, LevelUpScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);
