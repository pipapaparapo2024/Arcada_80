import { GameState } from '../utils/Config.js';
import { Lang } from '../utils/Lang.js';

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        console.log('GameOver Data:', data);
        this.score = data.score || 0;
        this.level = data.level || 1;
        this.highScore = data.highscore || GameState.highScore;
        this.newHighScore = this.score > GameState.highScore;
        
        if (this.newHighScore) {
            GameState.saveHighScore(this.score);
            this.highScore = this.score;
        }
    }

    create() {
        const { width, height } = this.scale;
        const lang = Lang[GameState.lang];

        // Dark Overlay
        this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);

        // Title
        this.add.text(width/2, height/2 - 150, lang.GAME_OVER, {
            font: '64px Arial', fill: '#ff0000', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        // Stats
        const statsText = `
${lang.SCORE}: ${Math.floor(this.score)}
${lang.HIGH_SCORE}: ${this.highScore}
${lang.LEVEL}: ${this.level}
        `;

        this.add.text(width/2, height/2, statsText, {
            font: '32px Arial', fill: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        if (this.newHighScore) {
            this.add.text(width/2, height/2 + 100, 'NEW HIGH SCORE!', {
                font: '32px Arial', fill: '#ffff00', fontStyle: 'bold'
            }).setOrigin(0.5).setAlpha(0).setScale(1.5)
            .setTint(0xffff00);
            
            // Simple tween for new high score
            this.tweens.add({
                targets: this.children.list[this.children.list.length-1],
                alpha: 1,
                scale: 1,
                duration: 500,
                ease: 'Back.out'
            });
        }

        // Restart Prompt
        const restartText = this.add.text(width/2, height/2 + 200, 'PRESS SPACE OR CLICK TO RESTART', {
            font: '24px Arial', fill: '#aaaaaa'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: restartText,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // Input to restart
        this.input.keyboard.once('keydown-SPACE', () => this.restart());
        this.input.once('pointerdown', () => this.restart());
    }

    restart() {
        this.scene.start('GameScene');
    }
}
