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
        
        const fontStyle = { fontFamily: '"VMV Sega Genesis", "Kagiraretapikuseru", "Press Start 2P"' };

        // Dark Overlay
        this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);

        // Title
        this.add.text(width/2, height/2 - 150, lang.GAME_OVER, {
            ...fontStyle, fontSize: '64px', fill: '#ff0000', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setResolution(1);

        // Stats
        const statsText = `
${lang.SCORE}: ${Math.floor(this.score)}
${lang.HIGH_SCORE}: ${this.highScore}
${lang.LEVEL}: ${this.level}
        `;

        this.add.text(width/2, height/2, statsText, {
            ...fontStyle, fontSize: '32px', fill: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setResolution(1);

        if (this.newHighScore) {
            this.add.text(width/2, height/2 + 100, 'NEW HIGH SCORE!', {
                ...fontStyle, fontSize: '32px', fill: '#ffff00', fontStyle: 'bold'
            }).setOrigin(0.5).setAlpha(0).setScale(1.5)
            .setTint(0xffff00).setResolution(1);
            
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
            ...fontStyle, fontSize: '24px', fill: '#aaaaaa'
        }).setOrigin(0.5).setResolution(1);

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
