import { CRTPipeline } from '../pipelines/CRTPipeline.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    create() {
        console.log('BootScene started');

        // Register Custom Pipelines
        const renderer = this.game.renderer;
        // Check if WebGL
        if (renderer.pipelines) {
            renderer.pipelines.addPostPipeline('CRTPipeline', CRTPipeline);
        }

        this.scene.start('PreloadScene');
    }
}