export const CONFIG = {
    // Game Settings
    GAME_WIDTH: 1600,
    GAME_HEIGHT: 1200,
    
    // Difficulty Settings
    DIFFICULTY: {
        EASY: { name: 'Easy', damageMult: 0.5, speedMult: 0.8, scoreMult: 0.5 },
        NORMAL: { name: 'Normal', damageMult: 1.0, speedMult: 1.0, scoreMult: 1.0 },
        HARDCORE: { name: 'Hardcore', damageMult: 2.0, speedMult: 1.3, scoreMult: 2.0 }
    },
    
    // Default Difficulty
    DEFAULT_DIFFICULTY: 'NORMAL',

    // Player Base Stats
    PLAYER: {
        SPEED: 300,
        HP: 100,
        AMMO_MAX: 30,
        FIRE_RATE: 200, // ms
        RELOAD_TIME: 1000,
        DASH_SPEED: 600,
        DASH_DURATION: 200,
        DASH_COOLDOWN: 1000,
        INVULNERABILITY_TIME: 1000 // Increased for better feel
    },

    // Danger Zone
    DANGER_ZONE: {
        DAMAGE_PER_SEC: 5,
        WARNING_MARGIN: 100, // Distance from edge to start warning
        PUSHBACK_FORCE: 50
    },

    // Combo System
    COMBO: {
        RESET_TIME: 3000, // ms
        MULTIPLIER_STEP: 5 // Every 5 kills increases multiplier
    },

    // Weapons Configuration
    WEAPONS: {
        PISTOL: {
            id: 'pistol',
            name: 'Pistol',
            fireRate: 200,
            damage: 1,
            speed: 600,
            spread: 0.1,
            count: 1,
            recoil: 200,
            color: 0xffff00
        },
        SHOTGUN: {
            id: 'shotgun',
            name: 'Shotgun',
            fireRate: 800,
            damage: 1,
            speed: 500,
            spread: 0.5, // Wide spread
            count: 5,
            recoil: 400,
            color: 0xffaa00
        },
        LASER: {
            id: 'laser',
            name: 'Laser',
            fireRate: 1000, // Charge time implied by fire rate
            damage: 5, // High damage
            speed: 1200,
            spread: 0,
            count: 1,
            recoil: 100,
            piercing: true,
            color: 0x00ffff
        },
        RICOCHET: {
            id: 'ricochet',
            name: 'Ricochet',
            fireRate: 300,
            damage: 1,
            speed: 500,
            spread: 0.2,
            count: 1,
            recoil: 200,
            bounce: true,
            color: 0xff00ff
        }
    },

    // Active Abilities
    ABILITIES: {
        TIME_SLOW: {
            id: 'time_slow',
            name: 'Time Slow',
            cooldown: 15000,
            duration: 5000,
            factor: 0.3 // Enemy speed multiplier
        },
        NOVA_BLAST: {
            id: 'nova_blast',
            name: 'Nova Blast',
            cooldown: 10000,
            radius: 300,
            damage: 10,
            force: 500
        }
    },

    // Skills (Legacy + New)
    SKILLS: [
        { 
            id: 'rapid_fire', 
            name: 'Rapid Fire', 
            description: 'Fire Rate +15%', 
            apply: (player) => { player.stats.fireRate *= 0.85; } 
        },
        { 
            id: 'speed_boots', 
            name: 'Speed Boots', 
            description: 'Move Speed +10%', 
            apply: (player) => { player.stats.speed *= 1.1; } 
        },
        {
            id: 'max_hp',
            langKey: 'TITAN_HEALTH',
            name: 'Titan Health',
            description: 'Max HP +20',
            apply: (player) => { player.maxHp += 20; player.heal(20); }
        },
        // New Weapons
        {
            id: 'weapon_shotgun',
            name: 'Shotgun',
            description: 'Weapon: Spread Shot',
            condition: (player) => player.weapon.config.id !== 'shotgun',
            apply: (player) => { player.equipWeapon('shotgun'); }
        },
        {
            id: 'weapon_laser',
            name: 'Laser Beam',
            description: 'Weapon: Piercing Beam',
            condition: (player) => player.weapon.config.id !== 'laser',
            apply: (player) => { player.equipWeapon('laser'); }
        },
        {
            id: 'weapon_ricochet',
            name: 'Ricochet',
            description: 'Weapon: Bouncing Bullets',
            condition: (player) => player.weapon.config.id !== 'ricochet',
            apply: (player) => { player.equipWeapon('ricochet'); }
        },
        // Active Abilities
        {
            id: 'ability_time_slow',
            name: 'Time Slow',
            description: 'Ability (Q): Slow Motion',
            condition: (player) => !player.activeAbility || player.activeAbility.id !== 'time_slow',
            apply: (player) => { player.equipAbility(CONFIG.ABILITIES.TIME_SLOW); }
        },
        {
            id: 'ability_nova',
            name: 'Nova Blast',
            description: 'Ability (Q): Area Blast',
            condition: (player) => !player.activeAbility || player.activeAbility.id !== 'nova_blast',
            apply: (player) => { player.equipAbility(CONFIG.ABILITIES.NOVA_BLAST); }
        }
    ],

    // XP System
    XP: {
        BASE_REQ: 100,
        GROWTH_FACTOR: 1.2,
        ORB_VALUE: 20
    }
};

// Global State container
export const GameState = {
    difficulty: CONFIG.DIFFICULTY.NORMAL,
    highScore: parseInt(localStorage.getItem('arcade_highscore')) || 0,
    volume: parseInt(localStorage.getItem('arcade_volume')) || 100,
    lang: localStorage.getItem('arcade_lang') || 'en',
    
    saveHighScore(score) {
        if (score > this.highScore) {
            this.highScore = score;
            localStorage.setItem('arcade_highscore', score);
        }
    },

    saveVolume(volume) {
        this.volume = volume;
        localStorage.setItem('arcade_volume', volume);
    },

    saveLang(lang) {
        this.lang = lang;
        localStorage.setItem('arcade_lang', lang);
    }
};