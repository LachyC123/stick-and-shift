// Player entity for Stick & Shift
// Main player-controlled field hockey player
// Improved: unified tryShoot(), visual shot tell, better cooldowns

import Phaser from 'phaser';
import { Character, CharacterStats } from '../data/characters';
import { InputState } from '../systems/InputSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';

export class Player extends Phaser.Physics.Arcade.Sprite {
  // Character data
  public character: Character;
  public stats: CharacterStats;
  
  // State
  public hasBall: boolean = false;
  public isMoving: boolean = false;
  public isStunned: boolean = false;
  public isShooting: boolean = false;
  public isDodging: boolean = false;
  public justReceivedBall: boolean = false;
  public recentlyLostBall: boolean = false;
  
  // Stamina
  public stamina: number = 100;
  public maxStamina: number = 100;
  
  // Cooldowns (in ms)
  private shootCooldown: number = 0;
  private passCooldown: number = 0;
  private tackleCooldown: number = 0;
  private dodgeCooldown: number = 0;
  
  // Cooldown durations
  private readonly SHOOT_COOLDOWN_MS = 220;
  private readonly PASS_COOLDOWN_MS = 250;
  private readonly TACKLE_COOLDOWN_MS = 700;
  private readonly DODGE_COOLDOWN_MS = 900;
  
  // Movement
  private targetVelocityX: number = 0;
  private targetVelocityY: number = 0;
  private acceleration: number = 800;
  private friction: number = 0.92;
  private baseSpeed: number = 200;
  
  // Visual
  private facingAngle: number = 0;
  private stickGraphics?: Phaser.GameObjects.Graphics;
  private shotLineGraphics?: Phaser.GameObjects.Graphics;
  
  // Systems
  private upgradeSystem?: UpgradeSystem;
  
  // Callbacks
  public onShoot?: (power: number, angle: number) => void;
  public onPass?: (angle: number) => void;
  public onTackle?: () => void;
  public onDodge?: () => void;
  public onShootFailed?: () => void;  // Called when shoot pressed but no ball
  
  constructor(scene: Phaser.Scene, x: number, y: number, character: Character) {
    super(scene, x, y, `player_0`);
    
    this.character = character;
    this.stats = { ...character.stats };
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Physics setup
    this.setCollideWorldBounds(true);
    this.setCircle(20, 4, 8);
    this.setDrag(100);
    this.setDepth(10);
    
    // Apply character color by choosing appropriate texture
    const colorIndex = this.getColorIndex(character.color);
    this.setTexture(`player_${colorIndex}`);
    
    // Create stick graphics for swing animation
    this.stickGraphics = scene.add.graphics();
    this.stickGraphics.setDepth(11);
    
    // Shot line graphics
    this.shotLineGraphics = scene.add.graphics();
    this.shotLineGraphics.setDepth(9);
  }
  
  private getColorIndex(color: number): number {
    // Map character colors to texture indices
    const colors = [
      0x3498db, 0xe74c3c, 0x2ecc71, 0x9b59b6, 0xf39c12,
      0x1abc9c, 0xe67e22, 0x8e44ad, 0xf1c40f, 0x16a085,
      0xc0392b, 0x27ae60, 0xd35400, 0x2980b9, 0x8b0000,
      0x00bcd4, 0x673ab7, 0xff5722, 0x34495e, 0xe91e63
    ];
    const index = colors.indexOf(color);
    return index >= 0 ? index : 0;
  }
  
  setUpgradeSystem(system: UpgradeSystem): void {
    this.upgradeSystem = system;
  }
  
  // Get modified stat value
  private getModifiedStat(statName: keyof CharacterStats): number {
    const baseStat = this.stats[statName];
    if (this.upgradeSystem) {
      return this.upgradeSystem.getModifiedStat(baseStat, statName);
    }
    return baseStat;
  }
  
  // Update each frame
  update(delta: number, input: InputState): void {
    // Update cooldowns
    this.updateCooldowns(delta);
    
    // Handle stun
    if (this.isStunned) {
      this.setVelocity(this.body!.velocity.x * 0.9, this.body!.velocity.y * 0.9);
      return;
    }
    
    // Handle dodging
    if (this.isDodging) {
      return;  // Movement is handled by dodge tween
    }
    
    // Process input
    this.processMovement(input, delta);
    this.processActions(input);
    
    // Update visuals
    this.updateVisuals(input);
    
    // Regenerate stamina
    this.regenerateStamina(delta);
  }
  
  private processMovement(input: InputState, delta: number): void {
    const speed = this.getModifiedStat('speed') * this.baseSpeed / 6;
    
    // Calculate target velocity from input
    this.targetVelocityX = input.moveX * speed;
    this.targetVelocityY = input.moveY * speed;
    
    // Apply acceleration toward target velocity
    const currentVelX = this.body!.velocity.x;
    const currentVelY = this.body!.velocity.y;
    
    let newVelX = currentVelX;
    let newVelY = currentVelY;
    
    if (this.targetVelocityX !== 0) {
      newVelX += (this.targetVelocityX - currentVelX) * 0.15;
    } else {
      newVelX *= this.friction;
    }
    
    if (this.targetVelocityY !== 0) {
      newVelY += (this.targetVelocityY - currentVelY) * 0.15;
    } else {
      newVelY *= this.friction;
    }
    
    this.setVelocity(newVelX, newVelY);
    
    this.isMoving = input.isMoving;
    
    // Update facing angle based on movement or aim
    if (input.isMoving) {
      this.facingAngle = Math.atan2(input.moveY, input.moveX);
    } else if (input.hasMouseMoved) {
      this.facingAngle = input.aimAngle;
    }
  }
  
  private processActions(input: InputState): void {
    // Shoot - triggers on keydown OR mouse click (instant)
    if (input.shoot) {
      this.tryShoot(input.aimAngle);
    }
    
    // Pass
    if (input.pass && this.hasBall && this.passCooldown <= 0) {
      this.pass(input.aimAngle);
    }
    
    // Tackle
    if (input.tackle && !this.hasBall && this.tackleCooldown <= 0) {
      this.tackle();
    }
    
    // Dodge
    if (input.dodge && this.dodgeCooldown <= 0 && this.stamina >= 20) {
      this.dodge(input.moveX || Math.cos(input.aimAngle), input.moveY || Math.sin(input.aimAngle));
    }
  }
  
  /**
   * Unified shoot method - call this from anywhere
   * Returns true if shot was taken, false if blocked
   */
  tryShoot(aimAngle: number, chargePercent: number = 0): boolean {
    // Check cooldown
    if (this.shootCooldown > 0) {
      return false;
    }
    
    // Check possession
    if (!this.hasBall) {
      // No ball - give feedback
      if (this.onShootFailed) {
        this.onShootFailed();
      }
      return false;
    }
    
    // Calculate power
    const basePower = this.getModifiedStat('shotPower') * 30;
    const power = basePower * (0.8 + chargePercent * 0.4);  // 80-120% based on charge
    
    this.shoot(power, aimAngle);
    return true;
  }
  
  private shoot(power: number, angle: number): void {
    this.isShooting = true;
    this.hasBall = false;
    this.shootCooldown = this.SHOOT_COOLDOWN_MS;
    
    // Trigger upgrade effects
    this.upgradeSystem?.trigger('onShot', {
      player: this,
      position: { x: this.x, y: this.y },
      scene: this.scene
    });
    
    if (this.onShoot) {
      this.onShoot(power, angle);
    }
    
    // === Visual shot tell ===
    // 1. Stick swing animation
    this.playStickSwing(angle);
    
    // 2. Shot line/muzzle flash
    this.playMuzzleFlash(angle);
    
    // 3. Body animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 0.85,
      duration: 80,
      yoyo: true,
      ease: 'Power2',
      onComplete: () => {
        this.isShooting = false;
        this.setScale(1);
      }
    });
  }
  
  private playStickSwing(angle: number): void {
    if (!this.stickGraphics) return;
    
    const startAngle = angle - Math.PI / 3;
    const endAngle = angle + Math.PI / 6;
    const stickLength = 35;
    
    let currentAngle = startAngle;
    const duration = 100;
    const startTime = this.scene.time.now;
    
    const animateStick = () => {
      const elapsed = this.scene.time.now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      currentAngle = Phaser.Math.Linear(startAngle, endAngle, progress);
      
      this.stickGraphics!.clear();
      this.stickGraphics!.lineStyle(4, 0x8b4513, 1);
      this.stickGraphics!.beginPath();
      this.stickGraphics!.moveTo(this.x, this.y);
      this.stickGraphics!.lineTo(
        this.x + Math.cos(currentAngle) * stickLength,
        this.y + Math.sin(currentAngle) * stickLength
      );
      this.stickGraphics!.strokePath();
      
      // Stick head
      this.stickGraphics!.fillStyle(0x333333, 1);
      this.stickGraphics!.fillCircle(
        this.x + Math.cos(currentAngle) * stickLength,
        this.y + Math.sin(currentAngle) * stickLength,
        5
      );
      
      if (progress < 1) {
        this.scene.time.delayedCall(16, animateStick);
      } else {
        this.scene.time.delayedCall(50, () => {
          this.stickGraphics!.clear();
        });
      }
    };
    
    animateStick();
  }
  
  private playMuzzleFlash(angle: number): void {
    if (!this.shotLineGraphics) return;
    
    const lineLength = 60;
    const endX = this.x + Math.cos(angle) * lineLength;
    const endY = this.y + Math.sin(angle) * lineLength;
    
    this.shotLineGraphics.clear();
    this.shotLineGraphics.lineStyle(6, 0xf1c40f, 0.8);
    this.shotLineGraphics.beginPath();
    this.shotLineGraphics.moveTo(this.x + Math.cos(angle) * 25, this.y + Math.sin(angle) * 25);
    this.shotLineGraphics.lineTo(endX, endY);
    this.shotLineGraphics.strokePath();
    
    // Impact circle at end
    this.shotLineGraphics.fillStyle(0xffffff, 0.8);
    this.shotLineGraphics.fillCircle(endX, endY, 8);
    
    // Fade out
    const fadeTarget = { alpha: 1 };
    this.scene.tweens.add({
      targets: fadeTarget,
      alpha: 0,
      duration: 100,
      onUpdate: () => {
        this.shotLineGraphics!.setAlpha(fadeTarget.alpha);
      },
      onComplete: () => {
        this.shotLineGraphics!.clear();
        this.shotLineGraphics!.setAlpha(1);
      }
    });
  }
  
  private pass(angle: number): void {
    this.hasBall = false;
    this.passCooldown = this.PASS_COOLDOWN_MS;
    
    // Trigger upgrade effects
    this.upgradeSystem?.trigger('onPass', {
      player: this,
      position: { x: this.x, y: this.y },
      scene: this.scene
    });
    
    if (this.onPass) {
      this.onPass(angle);
    }
    
    // Subtle animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.05,
      scaleY: 0.95,
      duration: 60,
      yoyo: true
    });
  }
  
  private tackle(): void {
    this.tackleCooldown = this.TACKLE_COOLDOWN_MS;
    this.stamina -= 15;
    
    // Trigger upgrade effects
    this.upgradeSystem?.trigger('onTackle', {
      player: this,
      position: { x: this.x, y: this.y },
      scene: this.scene
    });
    
    if (this.onTackle) {
      this.onTackle();
    }
    
    // Lunge forward
    const lungeDistance = 50 + this.getModifiedStat('tackle') * 5;
    const lungeX = Math.cos(this.facingAngle) * lungeDistance;
    const lungeY = Math.sin(this.facingAngle) * lungeDistance;
    
    this.scene.tweens.add({
      targets: this,
      x: this.x + lungeX,
      y: this.y + lungeY,
      duration: 150,
      ease: 'Power2'
    });
  }
  
  private dodge(dirX: number, dirY: number): void {
    this.isDodging = true;
    this.dodgeCooldown = this.DODGE_COOLDOWN_MS;
    this.stamina -= 20;
    
    // Normalize direction
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    dirX /= len;
    dirY /= len;
    
    const dodgeDistance = 80 + this.getModifiedStat('dodge') * 8;
    
    // Trigger upgrade effects
    this.upgradeSystem?.trigger('onDodge', {
      player: this,
      position: { x: this.x, y: this.y },
      scene: this.scene
    });
    
    if (this.onDodge) {
      this.onDodge();
    }
    
    // Dodge tween
    this.scene.tweens.add({
      targets: this,
      x: this.x + dirX * dodgeDistance,
      y: this.y + dirY * dodgeDistance,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.isDodging = false;
      }
    });
    
    // Trail effect
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 100,
      yoyo: true
    });
  }
  
  private updateCooldowns(delta: number): void {
    const dt = delta;
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.passCooldown = Math.max(0, this.passCooldown - dt);
    this.tackleCooldown = Math.max(0, this.tackleCooldown - dt);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
  }
  
  private regenerateStamina(delta: number): void {
    if (!this.isMoving) {
      const regenRate = 15 * (this.getModifiedStat('stamina') / 6);
      this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * (delta / 1000));
    }
  }
  
  private updateVisuals(input: InputState): void {
    // Rotate slightly based on facing direction
    const targetRotation = this.facingAngle * 0.1;
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetRotation, 0.1);
    
    // Bobble effect when moving with ball
    if (this.hasBall && this.isMoving) {
      const bobble = Math.sin(this.scene.time.now * 0.02) * 2;
      this.y += bobble * 0.1;
    }
  }
  
  // External methods
  receiveBall(): void {
    this.hasBall = true;
    this.justReceivedBall = true;
    
    this.upgradeSystem?.trigger('onReceive', {
      player: this,
      position: { x: this.x, y: this.y },
      scene: this.scene
    });
    
    // Reset flag after short delay
    this.scene.time.delayedCall(1000, () => {
      this.justReceivedBall = false;
    });
  }
  
  loseBall(): void {
    this.hasBall = false;
    this.recentlyLostBall = true;
    
    this.scene.time.delayedCall(2000, () => {
      this.recentlyLostBall = false;
    });
  }
  
  applyStun(duration: number): void {
    this.isStunned = true;
    
    // Apply reduction from upgrades
    let actualDuration = duration;
    if (this.upgradeSystem) {
      actualDuration = this.upgradeSystem.getModifiedStat(duration, 'stunDuration');
    }
    
    this.scene.time.delayedCall(actualDuration, () => {
      this.isStunned = false;
    });
    
    // Visual feedback
    this.scene.tweens.add({
      targets: this,
      tint: 0xff0000,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(actualDuration / 200)
    });
  }
  
  restoreStamina(amount: number): void {
    this.stamina = Math.min(this.maxStamina, this.stamina + amount);
  }
  
  addShield(duration: number): void {
    // Visual shield effect
    const shield = this.scene.add.sprite(this.x, this.y, 'effect_shield');
    shield.setAlpha(0.7);
    shield.setDepth(11);
    
    // Follow player
    const followEvent = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        shield.setPosition(this.x, this.y);
      },
      loop: true
    });
    
    this.scene.time.delayedCall(duration, () => {
      followEvent.destroy();
      this.scene.tweens.add({
        targets: shield,
        alpha: 0,
        duration: 200,
        onComplete: () => shield.destroy()
      });
    });
  }
  
  // Get cooldown percentages for UI
  getCooldowns(): { shoot: number; pass: number; tackle: number; dodge: number } {
    return {
      shoot: this.shootCooldown / this.SHOOT_COOLDOWN_MS,
      pass: this.passCooldown / this.PASS_COOLDOWN_MS,
      tackle: this.tackleCooldown / this.TACKLE_COOLDOWN_MS,
      dodge: this.dodgeCooldown / this.DODGE_COOLDOWN_MS
    };
  }
  
  // Check if can shoot (for UI feedback)
  canShoot(): boolean {
    return this.hasBall && this.shootCooldown <= 0 && !this.isStunned && !this.isDodging;
  }
  
  // Get ball position offset (where ball should be when carrying)
  getBallOffset(): { x: number; y: number } {
    const offset = 25;
    return {
      x: this.x + Math.cos(this.facingAngle) * offset,
      y: this.y + Math.sin(this.facingAngle) * offset
    };
  }
  
  getFacingAngle(): number {
    return this.facingAngle;
  }
  
  destroy(fromScene?: boolean): void {
    this.stickGraphics?.destroy();
    this.shotLineGraphics?.destroy();
    super.destroy(fromScene);
  }
}
