import { CONFIG, GameState } from '../utils/Config.js';
import { Lang } from '../utils/Lang.js';

export class LevelUpScene extends Phaser.Scene {
    constructor() {
        super('LevelUpScene');
    }

    create(data) {
        this.lang = Lang[GameState.lang];
        // data contains { player: PlayerInstance } so we can apply skills
        this.player = data.player;
        const { width, height } = this.scale;
        
        const fontStyle = { fontFamily: '"VMV Sega Genesis", "Kagiraretapikuseru", "Press Start 2P"' };

        // Semi-transparent overlay with Retro Grid
        this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0);
        this.grid = this.add.grid(width/2, height/2, width, height, 80, 80, 0x000000)
            .setAltFillStyle(0x010101)
            .setOutlineStyle(0x222222)
            .setAlpha(0.5);

        // Title
        this.titleText = this.add.text(width / 2, 100, this.lang.LEVEL_UP, {
            ...fontStyle,
            fontSize: '64px',
            fill: '#ffff00',
            stroke: '#ff0000',
            strokeThickness: 4
        }).setOrigin(0.5).setResolution(1);

        this.subText = this.add.text(width / 2, 180, this.lang.CHOOSE_UPGRADE, {
            ...fontStyle,
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(0.5).setResolution(1);

        // Pick 3 random skills (filtering based on conditions)
        const availableSkills = CONFIG.SKILLS.filter(s => !s.condition || s.condition(this.player));
        const skills = Phaser.Utils.Array.Shuffle(availableSkills).slice(0, 3);
        
        this.skillCards = [];
        skills.forEach((skill, index) => {
            this.createSkillCard(width / 2, 300 + (index * 150), skill, fontStyle);
        });

        this.scale.on('resize', this.resize, this);
    }

    createSkillCard(x, y, skill, fontStyle) {
        const bg = this.add.rectangle(0, 0, 400, 120, 0x333333)
            .setInteractive({ useHandCursor: true });
        
        // Hover effect
        bg.setStrokeStyle(2, 0x00ffff);
        bg.on('pointerover', () => bg.setFillStyle(0x444444));
        bg.on('pointerout', () => bg.setFillStyle(0x333333));
        
        // Click handler
        bg.on('pointerdown', () => this.selectSkill(skill));

        // Localization
        const langKey = skill.langKey || skill.id.toUpperCase();
        const name = this.lang[`SKILL_${langKey}`] || skill.name;
        const desc = this.lang[`SKILL_${langKey}_DESC`] || skill.description;

        // Text
        const nameText = this.add.text(0, -20, name, {
            ...fontStyle,
            fontSize: '24px',
            fill: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5).setResolution(1);

        const descText = this.add.text(0, 20, desc, {
            ...fontStyle,
            fontSize: '18px',
            fill: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setResolution(1);

        const container = this.add.container(x, y, [bg, nameText, descText]);
        this.skillCards.push(container);
    }

    selectSkill(skill) {
        // Apply skill to player
        skill.apply(this.player);
        
        // Notify player (optional visual)
        console.log(`Selected skill: ${skill.name}`);

        // Resume game
        this.scene.stop('LevelUpScene');
        this.scene.resume('GameScene');
    }

    resize(gameSize) {
        const { width, height } = gameSize;

        if (this.overlay && this.overlay.setSize) this.overlay.setSize(width, height);
        if (this.grid && this.grid.setPosition) {
            this.grid.setPosition(width/2, height/2);
            // Grid size update usually needs recreating or just ensuring it covers area.
        }

        if (this.titleText) this.titleText.setPosition(width/2, 100);
        if (this.subText) this.subText.setPosition(width/2, 180);

        if (this.skillCards) {
            this.skillCards.forEach((card, index) => {
                if (card && card.setPosition) card.setPosition(width/2, 300 + (index * 150));
            });
        }
    }
}
