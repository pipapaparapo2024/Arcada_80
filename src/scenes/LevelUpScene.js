import { CONFIG } from '../utils/Config.js';

export class LevelUpScene extends Phaser.Scene {
    constructor() {
        super('LevelUpScene');
    }

    create(data) {
        // data contains { player: PlayerInstance } so we can apply skills
        this.player = data.player;
        const { width, height } = this.scale;
        
        // Semi-transparent overlay with Retro Grid
        this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0);
        this.add.grid(width/2, height/2, width, height, 80, 80, 0x000000)
            .setAltFillStyle(0x010101)
            .setOutlineStyle(0x222222)
            .setAlpha(0.5);

        // Title
        this.add.text(width / 2, 100, 'LEVEL UP!', {
            font: '64px Arial',
            fill: '#ffff00',
            stroke: '#ff0000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(width / 2, 180, 'Choose an upgrade:', {
            font: '32px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Pick 3 random skills (filtering based on conditions)
        const availableSkills = CONFIG.SKILLS.filter(s => !s.condition || s.condition(this.player));
        const skills = Phaser.Utils.Array.Shuffle(availableSkills).slice(0, 3);
        
        skills.forEach((skill, index) => {
            this.createSkillCard(width / 2, 300 + (index * 150), skill);
        });
    }

    createSkillCard(x, y, skill) {
        const bg = this.add.rectangle(x, y, 400, 120, 0x333333)
            .setInteractive({ useHandCursor: true });
        
        // Hover effect
        bg.setStrokeStyle(2, 0x00ffff);
        bg.on('pointerover', () => bg.setFillStyle(0x444444));
        bg.on('pointerout', () => bg.setFillStyle(0x333333));
        
        // Click handler
        bg.on('pointerdown', () => this.selectSkill(skill));

        // Text
        this.add.text(x, y - 20, skill.name, {
            font: '24px Arial',
            fill: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(x, y + 20, skill.description, {
            font: '18px Arial',
            fill: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
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
}
