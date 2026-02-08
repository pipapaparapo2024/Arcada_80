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
        
        const fontStyle = { fontFamily: '"VMV Sega Genesis", "Kagiraretapikuseru", "Press Start 2P"' };

        // Background
        this.add.rectangle(0, 0, width, height, 0x111111).setOrigin(0);
        this.add.grid(centerX, centerY, width, height, 40, 40, 0x000000).setAltFillStyle(0x010101).setOutlineStyle(0x222222);
        
        // Scanlines
        if (!this.textures.exists('scanlines')) {
            const graphics = this.make.graphics({x: 0, y: 0, add: false});
            graphics.fillStyle(0x000000, 0.2); 
            graphics.fillRect(0, 0, 4, 2);
            graphics.fillStyle(0x000000, 0);   
            graphics.fillRect(0, 2, 4, 2);
            graphics.generateTexture('scanlines', 4, 4);
        }
        this.add.tileSprite(0, 0, width, height, 'scanlines').setOrigin(0).setAlpha(0.1);

        // Title
        this.add.text(centerX, centerY - 80, 'ARCADA SHOOTER', {
            ...fontStyle,
            fontSize: '24px',
            fill: '#ffffff',
            stroke: '#00ffff',
            strokeThickness: 4
        }).setOrigin(0.5).setResolution(1);

        // High Score
        this.add.text(centerX, centerY - 50, `${strings.HIGH_SCORE}: ${GameState.highScore}`, {
            ...fontStyle,
            fontSize: '10px',
            fill: '#ffff00'
        }).setOrigin(0.5).setResolution(1);

        // Difficulty Selection
        this.add.text(centerX, centerY - 20, strings.SELECT_DIFFICULTY, {
            ...fontStyle,
            fontSize: '8px',
            fill: '#aaaaaa'
        }).setOrigin(0.5).setResolution(1);

        this.createDifficultyButtons(centerX, centerY, fontStyle);

        // Volume Settings
        this.volumeText = this.add.text(centerX, centerY + 60, `${strings.VOLUME}: ${GameState.volume}%`, {
            ...fontStyle,
            fontSize: '8px',
            fill: '#aaaaaa'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setResolution(1);

        this.volumeText.on('pointerdown', () => this.toggleVolume());
        this.volumeText.on('pointerover', () => this.volumeText.setFill('#ffffff'));
        this.volumeText.on('pointerout', () => this.volumeText.setFill('#aaaaaa'));

        // Screen Shake Settings
        const shakeText = GameState.screenShake ? 'ON' : 'OFF';
        this.shakeText = this.add.text(centerX, centerY + 80, `Screen Shake: ${shakeText}`, {
            ...fontStyle,
            fontSize: '8px',
            fill: '#aaaaaa'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setResolution(1);

        this.shakeText.on('pointerdown', () => {
            const newState = !GameState.screenShake;
            GameState.saveShake(newState);
            this.shakeText.setText(`Screen Shake: ${newState ? 'ON' : 'OFF'}`);
        });
        this.shakeText.on('pointerover', () => this.shakeText.setFill('#ffffff'));
        this.shakeText.on('pointerout', () => this.shakeText.setFill('#aaaaaa'));

        // Start Button
        const startBtn = this.add.rectangle(centerX, centerY + 110, 150, 30, 0x00ff00)
            .setInteractive({ useHandCursor: true });
        
        const startText = this.add.text(centerX, centerY + 110, strings.START_GAME, {
            ...fontStyle,
            fontSize: '12px',
            fill: '#000000'
        }).setOrigin(0.5).setResolution(1);

        startBtn.on('pointerover', () => startBtn.setFillStyle(0x00dd00));
        startBtn.on('pointerout', () => startBtn.setFillStyle(0x00ff00));
        startBtn.on('pointerdown', () => this.startGame());

        // Language Toggle (Bottom Right)
        const langText = GameState.lang.toUpperCase();
        
        const langBtn = this.add.text(this.cameras.main.width - 60, this.cameras.main.height - 40, langText, {
            ...fontStyle,
            fontSize: '10px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 1).setInteractive({ useHandCursor: true }).setResolution(1);

        langBtn.on('pointerdown', () => this.toggleLang());
        langBtn.on('pointerover', () => langBtn.setFill('#ffff00'));
        langBtn.on('pointerout', () => langBtn.setFill('#ffffff'));
    }

    createDifficultyButtons(x, y, fontStyle) {
        const diffs = Object.keys(CONFIG.DIFFICULTY);
        const startY = y;
        const strings = Lang[GameState.lang];
        
        this.diffButtons = [];

        diffs.forEach((key, index) => {
            const diff = CONFIG.DIFFICULTY[key];
            // Default select NORMAL if not already set, or match current state
            const isSelected = (diff.name === GameState.difficulty.name);
            
            const btnX = x + (index - 1) * 60; // Reduced spacing
            const btnY = startY + 10;

            const bg = this.add.rectangle(btnX, btnY, 50, 20, isSelected ? 0x00aaaa : 0x333333)
                .setInteractive({ useHandCursor: true });
            
            const text = this.add.text(btnX, btnY, strings['DIFF_' + key], {
                ...fontStyle,
                fontSize: '8px',
                fill: '#ffffff'
            }).setOrigin(0.5).setResolution(1);

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
