import { BootScene } from './src/scenes/BootScene.js';
import { PreloadScene } from './src/scenes/PreloadScene.js';
import { MenuScene } from './src/scenes/MenuScene.js';
import { GameScene } from './src/scenes/GameScene.js';
import { LevelUpScene } from './src/scenes/LevelUpScene.js';
import { GameOverScene } from './src/scenes/GameOverScene.js';

const config = {
    type: Phaser.AUTO,
    width: 1600,
    height: 1200,
    parent: 'game-container',
    backgroundColor: '#000000',
    scene: [BootScene, PreloadScene, MenuScene, GameScene, LevelUpScene, GameOverScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);
