export class CRTPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game: game,
            renderTarget: true,
            fragShader: `
                precision mediump float;

                uniform sampler2D uMainSampler;
                uniform float uTime;
                
                varying vec2 outTexCoord;

                void main() {
                    vec2 uv = outTexCoord;

                    // Barrel Distortion
                    vec2 dc = abs(0.5 - uv);
                    vec2 dist = dc * dc;
                    
                    uv.x -= 0.5; 
                    uv.x *= 1.0 + (dist.y * 0.2); 
                    uv.x += 0.5;
                    
                    uv.y -= 0.5; 
                    uv.y *= 1.0 + (dist.x * 0.2); 
                    uv.y += 0.5;

                    // Black out of bounds
                    if (uv.y > 1.0 || uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0) {
                        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        return;
                    }

                    // Chromatic Aberration
                    float r = texture2D(uMainSampler, uv + vec2(0.003, 0.0)).r;
                    float g = texture2D(uMainSampler, uv).g;
                    float b = texture2D(uMainSampler, uv + vec2(-0.003, 0.0)).b;
                    
                    vec3 color = vec3(r, g, b);

                    // Scanlines
                    float scanline = sin(uv.y * 1200.0) * 0.04;
                    color -= scanline;

                    // Vignette
                    float vignette = 1.0 - dot(dc, dc) * 1.5;
                    color *= vignette;
                    
                    // Static Noise
                    float noise = fract(sin(dot(uv * uTime, vec2(12.9898, 78.233))) * 43758.5453) * 0.05;
                    color += noise;

                    // Muted Colors (Retro Feel)
                    color *= 0.9; // Slight darkening
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
    }
}