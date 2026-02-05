import { CONFIG } from '../utils/Config.js';
import { Weapon } from './Weapon.js';
import { Bullet } from './Bullet.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setCollideWorldBounds(false); // Enable Danger Zone
        this.setDrag(200); 
        
        this.keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            reload: Phaser.Input.Keyboard.KeyCodes.R,
            dash: Phaser.Input.Keyboard.KeyCodes.SPACE,
            ability: Phaser.Input.Keyboard.KeyCodes.Q // Ability Key
        });

        this.bullets = scene.physics.add.group({
            classType: Bullet,
            maxSize: 50,
            runChildUpdate: true
        });
        
        // Weapon System
        this.weapon = new Weapon(scene, this, 'pistol');
        this.activeAbility = null;
        this.abilityCooldownTimer = 0;

        // Base Stats
        this.stats = {
            speed: CONFIG.PLAYER.SPEED,
            fireRate: CONFIG.PLAYER.FIRE_RATE,
            doubleShotChance: 0,
            vampirism: false,
            kills: 0
        };

        // State
        this.hp = CONFIG.PLAYER.HP;
        this.maxHp = CONFIG.PLAYER.HP;
        this.xp = 0;
        this.level = 1;
        this.xpToNextLevel = CONFIG.XP.BASE_REQ;
        
        this.ammo = CONFIG.PLAYER.AMMO_MAX;
        this.isReloading = false;
        this.isDashing = false;
        this.canDash = true;
        this.invulnerable = false;
        this.magnetActive = false;

        // Health Bar
        this.hpBar = scene.add.graphics();
        this.updateHpBar();
        
        // Breathing Tween (Scale)
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.05,
            scaleY: 0.95,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    update(time, delta) {
        this.updateHpBar();
        
        this.handleReload();
        this.handleDash(time);
        
        if (!this.isDashing) {
            this.handleMovement();
        }
        
        this.handleRotation();
        this.handleShooting(time);
        this.checkDangerZone(delta);
        this.handleAbility(time);
    }

    checkDangerZone(delta) {
        const bounds = this.scene.physics.world.bounds;
        const inBounds = bounds.contains(this.x, this.y);
        
        if (!inBounds) {
            // Take damage over time
            const dmg = CONFIG.DANGER_ZONE.DAMAGE_PER_SEC * (delta / 1000);
            this.takeDamage(dmg, true); // true = silent damage (no screen shake)
            
            // Pushback (Softened)
            const centerX = bounds.width / 2;
            const centerY = bounds.height / 2;
            const angle = Phaser.Math.Angle.Between(this.x, this.y, centerX, centerY);
            
            // Reduced pushback to avoid teleportation feel
            this.body.velocity.x += Math.cos(angle) * (CONFIG.DANGER_ZONE.PUSHBACK_FORCE * 0.1) * (delta/16);
            this.body.velocity.y += Math.sin(angle) * (CONFIG.DANGER_ZONE.PUSHBACK_FORCE * 0.1) * (delta/16);

            this.emit('dangerZone', true);
        } else {
            this.emit('dangerZone', false);
        }
    }

    handleMovement() {
        if (this.isDashing) return;

        const speed = this.stats.speed;
        this.body.setVelocity(0);

        if (this.keys.left.isDown) this.body.setVelocityX(-speed);
        if (this.keys.right.isDown) this.body.setVelocityX(speed);
        if (this.keys.up.isDown) this.body.setVelocityY(-speed);
        if (this.keys.down.isDown) this.body.setVelocityY(speed);

        if (this.body.velocity.x !== 0 && this.body.velocity.y !== 0) {
            this.body.velocity.normalize().scale(speed);
        }
    }

    handleRotation() {
        const pointer = this.scene.input.activePointer;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
        this.setRotation(angle + Math.PI / 2);
    }

    handleShooting(time) {
        if (this.scene.input.activePointer.isDown && !this.isReloading && this.ammo > 0) {
             if (this.weapon.fire(time)) {
                 this.ammo--;
                 this.emit('ammoChanged', this.ammo);
                 this.emit('shoot');
                 
                 if (this.ammo <= 0) {
                     this.reload();
                 }
             }
        } else if (this.scene.input.activePointer.isDown && this.ammo <= 0 && !this.isReloading) {
            this.reload();
        }
    }

    handleAbility(time) {
        if (this.keys.ability.isDown && this.activeAbility && time > this.abilityCooldownTimer) {
            this.activateAbility(time);
        }
    }

    activateAbility(time) {
        this.abilityCooldownTimer = time + this.activeAbility.cooldown;
        this.emit('abilityUsed', this.activeAbility);
    }

    handleDash(time) {
        if (this.keys.dash.isDown && this.canDash && !this.isDashing) {
            this.isDashing = true;
            this.canDash = false;
            
            // Dash towards mouse
            const pointer = this.scene.input.activePointer;
            const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
            
            this.scene.physics.velocityFromRotation(angle, CONFIG.PLAYER.DASH_SPEED, this.body.velocity);
            
            this.scene.time.delayedCall(CONFIG.PLAYER.DASH_DURATION, () => {
                this.isDashing = false;
                this.body.setVelocity(0);
            });

            this.scene.time.delayedCall(CONFIG.PLAYER.DASH_COOLDOWN, () => {
                this.canDash = true;
            });
        }
    }

    handleReload() {
        if (Phaser.Input.Keyboard.JustDown(this.keys.reload) && !this.isReloading && this.ammo < CONFIG.PLAYER.AMMO_MAX) {
            this.reload();
        }
    }

    reload() {
        this.isReloading = true;
        this.scene.time.delayedCall(CONFIG.PLAYER.RELOAD_TIME, () => {
            this.ammo = CONFIG.PLAYER.AMMO_MAX;
            this.isReloading = false;
            this.emit('ammoChanged', this.ammo);
        });
    }

    takeDamage(amount, silent = false) {
        if (this.invulnerable && !silent) return;

        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        
        this.updateHpBar();

        if (!silent) {
            this.invulnerable = true;
            this.setTint(0xff0000);
            this.scene.time.delayedCall(CONFIG.PLAYER.INVULNERABILITY_TIME, () => {
                this.invulnerable = false;
                this.clearTint();
            });
        }

        if (this.hp <= 0) {
            this.scene.gameOver();
        }
    }

    updateHpBar() {
        this.hpBar.clear();
        this.hpBar.fillStyle(0x000000);
        this.hpBar.fillRect(this.x - 32, this.y - 50, 64, 8);
        
        const hpPercent = this.hp / this.maxHp;
        this.hpBar.fillStyle(hpPercent < 0.3 ? 0xff0000 : 0x00ff00);
        this.hpBar.fillRect(this.x - 32, this.y - 50, 64 * hpPercent, 8);
    }
    
    gainXp(amount) {
        this.xp += amount;
        
        if (this.xp >= this.xpToNextLevel) {
            this.levelUp();
        }
        
        this.emit('xpChanged', this.xp, this.xpToNextLevel, this.level);
    }

    levelUp() {
        this.xp -= this.xpToNextLevel;
        this.level++;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * CONFIG.XP.GROWTH_FACTOR);
        
        this.scene.triggerLevelUp();
    }
    
    equipWeapon(weaponId) {
        this.weapon = new Weapon(this.scene, this, weaponId);
    }
    
    equipAbility(abilityConfig) {
        this.activeAbility = abilityConfig;
    }
    
    onKill() {
        this.stats.kills++;
        if (this.stats.vampirism && this.stats.kills % 5 === 0) {
            this.hp = Math.min(this.hp + 1, this.maxHp);
            this.updateHpBar();
        }
    }
}