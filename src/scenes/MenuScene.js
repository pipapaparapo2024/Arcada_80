import { CONFIG, GameState } from '../utils/Config.js';
import { Lang } from '../utils/Lang.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        this.createUI();
        // this.scale.on('resize', this.resize, this);

        // Audio Context Unlock
        this.input.once('pointerdown', () => {
            if (this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
        });
    }

    resize(gameSize) {
        // this.createUI();
    }

    createUI() {
        // Clear existing UI
        this.children.removeAll();

        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;
        const strings = Lang[GameState.lang];

        // Background
        this.add.rectangle(0, 0, width, height, 0x111111).setOrigin(0);
        this.add.grid(centerX, centerY, width, height, 80, 80, 0x000000).setAltFillStyle(0x010101).setOutlineStyle(0x222222);

        // Title
        this.add.text(centerX, centerY - 200, 'ARCADA SHOOTER', {
            font: '64px Arial',
            fill: '#ffffff',
            stroke: '#00ffff',
            strokeThickness: 6
        }).setOrigin(0.5);

        // High Score
        this.add.text(centerX, centerY - 120, `${strings.HIGH_SCORE}: ${GameState.highScore}`, {
            font: '32px Arial',
            fill: '#ffff00'
        }).setOrigin(0.5);

        // Difficulty Selection
        this.add.text(centerX, centerY - 50, strings.SELECT_DIFFICULTY, {
            font: '24px Arial',
            fill: '#aaaaaa'
        }).setOrigin(0.5);

        this.createDifficultyButtons(centerX, centerY);

        // Volume Settings
        this.volumeText = this.add.text(centerX, centerY + 150, `${strings.VOLUME}: ${GameState.volume}%`, {
            font: '24px Arial',
            fill: '#aaaaaa'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.volumeText.on('pointerdown', () => this.toggleVolume());
        this.volumeText.on('pointerover', () => this.volumeText.setFill('#ffffff'));
        this.volumeText.on('pointerout', () => this.volumeText.setFill('#aaaaaa'));

        // Screen Shake Settings
        const shakeText = GameState.screenShake ? 'ON' : 'OFF';
        this.shakeText = this.add.text(centerX, centerY + 200, `Screen Shake: ${shakeText}`, {
            font: '24px Arial',
            fill: '#aaaaaa'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.shakeText.on('pointerdown', () => {
            const newState = !GameState.screenShake;
            GameState.saveShake(newState);
            this.shakeText.setText(`Screen Shake: ${newState ? 'ON' : 'OFF'}`);
        });
        this.shakeText.on('pointerover', () => this.shakeText.setFill('#ffffff'));
        this.shakeText.on('pointerout', () => this.shakeText.setFill('#aaaaaa'));

        // Instructions
        this.add.text(centerX, height - 100, strings.START_GAME, {
            font: '24px Arial',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Start Button
        const startBtn = this.add.rectangle(centerX, centerY + 250, 300, 60, 0x00ff00)
            .setInteractive({ useHandCursor: true });
        
        const startText = this.add.text(centerX, centerY + 250, strings.START_GAME, {
            font: '28px Arial',
            fill: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        startBtn.on('pointerover', () => startBtn.setFillStyle(0x00dd00));
        startBtn.on('pointerout', () => startBtn.setFillStyle(0x00ff00));
        startBtn.on('pointerdown', () => this.startGame());

        // Language Toggle (Bottom Right)
        const langText = GameState.lang.toUpperCase();
        const camW = this.cameras.main.width;
        const camH = this.cameras.main.height;
        
        const langBtn = this.add.text(camW - 50, camH - 50, langText, {
            font: '32px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(1, 1).setInteractive({ useHandCursor: true });

        langBtn.on('pointerdown', () => this.toggleLang());
        langBtn.on('pointerover', () => langBtn.setFill('#ffff00'));
        langBtn.on('pointerout', () => langBtn.setFill('#ffffff'));
    }

    createDifficultyButtons(x, y) {
        const diffs = Object.keys(CONFIG.DIFFICULTY);
        const startY = y;
        const strings = Lang[GameState.lang];
        
        this.diffButtons = [];

        diffs.forEach((key, index) => {
            const diff = CONFIG.DIFFICULTY[key];
            // Default select NORMAL if not already set, or match current state
            const isSelected = (diff.name === GameState.difficulty.name);
            
            const btnX = x + (index - 1) * 160;
            const btnY = startY + 50;

            const bg = this.add.rectangle(btnX, btnY, 140, 50, isSelected ? 0x00aaaa : 0x333333)
                .setInteractive({ useHandCursor: true });
            
            const text = this.add.text(btnX, btnY, strings['DIFF_' + key], {
                font: '20px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);

            bg.on('pointerdown', () => this.selectDifficulty(key, bg));

            this.diffButtons.push({ key, bg, text });
        });
    }

    selectDifficulty(key, selectedBg) {
        // Reset all buttons
        this.diffButtons.forEach(btn => {
            btn.bg.setFillStyle(0x333333);
        });

        // Highlight selected
        selectedBg.setFillStyle(0x00aaaa);
        
        // Update Global State
        GameState.saveDifficulty(CONFIG.DIFFICULTY[key]);
    }

    toggleVolume() {
        let vol = GameState.volume;
        // Cyclic: 100 -> 0 -> 25 -> 50 -> 100
        if (vol === 100) vol = 0;
        else if (vol === 0) vol = 25;
        else if (vol === 25) vol = 50;
        else vol = 100;

        GameState.saveVolume(vol);
        const strings = Lang[GameState.lang];
        this.volumeText.setText(`${strings.VOLUME}: ${vol}%`);
    }

    toggleLang() {
        const newLang = GameState.lang === 'en' ? 'ru' : 'en';
        GameState.saveLang(newLang);
        this.createUI(); // Re-render with new language
    }

    startGame() {
        this.scene.start('GameScene');
    }
}
