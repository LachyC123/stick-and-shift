// Player entity for Stick & Shift
// Main player-controlled field hockey player
// Improved: unified tryShoot(), visual shot tell, tuning constants, pass assist

import Phaser from 'phaser';
import { Character, CharacterStats } from '../data/characters';
import { InputState } from '../systems/InputSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import * as TUNING from '../data/tuning';

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
  
  // Movement
  private targetVelocityX: number = 0;
  private targetVelocityY: number = 0;
  
  // Visual
  private facingAngle: number = 0;
  private stickGraphics?: Phaser.GameObjects.Graphics;
  private shotLineGraphics?: Phaser.GameObjects.Graphics;
  private passLineGraphics?: Phaser.GameObjects.Graphics;
  
  // Systems
  private upgradeSystem?: UpgradeSystem;
  
  // Callbacks
  public onShoot?: (power: number, angle: number) => void;
  public onPass?: (angle: number, passSpeed: number) => void;
  public onTackle?: () => void;
  public onDodge?: () => void;
  public onShootFailed?: () => void;
  
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
    
    // Pass line graphics
    this.passLineGraphics = scene.add.graphics();
    this.passLineGraphics.setDepth(9);
  }
  
  private getColorIndex(color: number): number {
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
      return;
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
    const speed = this.getModifiedStat('speed') * TUNING.PLAYER_SPEED_BASE / 6;
    
    this.targetVelocityX = input.moveX * speed;
    this.targetVelocityY = input.moveY * speed;
    
    const currentVelX = this.body!.velocity.x;
    const currentVelY = this.body!.velocity.y;
    
    let newVelX = currentVelX;
    let newVelY = currentVelY;
    
    if (this.targetVelocityX !== 0) {
      newVelX += (this.targetVelocityX - currentVelX) * TUNING.PLAYER_ACCELERATION;
    } else {
      newVelX *= TUNING.PLAYER_FRICTION;
    }
    
    if (this.targetVelocityY !== 0) {
      newVelY += (this.targetVelocityY - currentVelY) * TUNING.PLAYER_ACCELERATION;
    } else {
      newVelY *= TUNING.PLAYER_FRICTION;
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
    // Shoot - triggers on keydown OR mouse click
    if (input.shoot) {
      this.tryShoot(input.aimAngle);
    }
    
    // Pass
    if (input.pass && this.hasBall && this.passCooldown <= 0) {
      this.performPass(input.aimAngle);
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
    if (this.shootCooldown > 0) {
      return false;
    }
    
    if (!this.hasBall) {
      if (this.onShootFailed) {
        this.onShootFailed();
      }
      return false;
    }
    
    // Calculate shot speed using tuning constants
    const shotPower = this.getModifiedStat('shotPower');
    const speed = Math.min(
      TUNING.SHOT_SPEED_BASE + shotPower * TUNING.SHOT_SPEED_SCALE,
      TUNING.SHOT_SPEED_MAX
    );
    
    // Apply charge bonus
    const finalSpeed = speed * (0.85 + chargePercent * 0.3);
    
    this.shoot(finalSpeed, aimAngle);
    return true;
  }
  
  private shoot(power: number, angle: number): void {
    this.isShooting = true;
    this.hasBall = false;
    this.shootCooldown = TUNING.COOLDOWN_SHOOT;
    
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
    this.playStickSwing(angle);
    this.playMuzzleFlash(angle, true);
    
    // Camera punch for shot
    this.scene.cameras.main.shake(
      TUNING.CAMERA_SHAKE_SHOT_DURATION,
      TUNING.CAMERA_SHAKE_SHOT
    );
    
    // Body animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.18,
      scaleY: 0.82,
      duration: 70,
      yoyo: true,
      ease: 'Power2',
      onComplete: () => {
        this.isShooting = false;
        this.setScale(1);
      }
    });
  }
  
  /**
   * Perform a pass with proper speed and assist
   */
  private performPass(angle: number): void {
    this.hasBall = false;
    this.passCooldown = TUNING.COOLDOWN_PASS;
    
    // Calculate pass speed using tuning constants
    const passPower = this.getModifiedStat('passPower');
    const speed = Math.min(
      TUNING.PASS_SPEED_BASE + passPower * TUNING.PASS_SPEED_SCALE,
      TUNING.PASS_SPEED_MAX
    );
    
    // Trigger upgrade effects
    this.upgradeSystem?.trigger('onPass', {
      player: this,
      position: { x: this.x, y: this.y },
      scene: this.scene
    });
    
    if (this.onPass) {
      this.onPass(angle, speed);
    }
    
    // Visual pass tell
    this.playPassLine(angle);
    
    // Subtle animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.08,
      scaleY: 0.92,
      duration: 50,
      yoyo: true
    });
  }
  
  private playStickSwing(angle: number): void {
    if (!this.stickGraphics) return;
    
    const startAngle = angle - Math.PI / 3;
    const endAngle = angle + Math.PI / 6;
    const stickLength = 38;
    
    let currentAngle = startAngle;
    const duration = 90;
    const startTime = this.scene.time.now;
    
    const animateStick = () => {
      const elapsed = this.scene.time.now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      currentAngle = Phaser.Math.Linear(startAngle, endAngle, progress);
      
      this.stickGraphics!.clear();
      this.stickGraphics!.lineStyle(5, 0x8b4513, 1);
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
        6
      );
      
      if (progress < 1) {
        this.scene.time.delayedCall(16, animateStick);
      } else {
        this.scene.time.delayedCall(40, () => {
          this.stickGraphics!.clear();
        });
      }
    };
    
    animateStick();
  }
  
  private playMuzzleFlash(angle: number, isShot: boolean): void {
    const graphics = this.shotLineGraphics;
    if (!graphics) return;
    
    const lineLength = isShot ? 70 : 50;
    const lineWidth = isShot ? 8 : 5;
    const color = isShot ? 0xf1c40f : 0x3498db;
    
    const startX = this.x + Math.cos(angle) * 25;
    const startY = this.y + Math.sin(angle) * 25;
    const endX = this.x + Math.cos(angle) * lineLength;
    const endY = this.y + Math.sin(angle) * lineLength;
    
    graphics.clear();
    graphics.lineStyle(lineWidth, color, 0.9);
    graphics.beginPath();
    graphics.moveTo(startX, startY);
    graphics.lineTo(endX, endY);
    graphics.strokePath();
    
    // Impact circle at end
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillCircle(endX, endY, isShot ? 10 : 6);
    
    // Fade out
    const fadeTarget = { alpha: 1 };
    this.scene.tweens.add({
      targets: fadeTarget,
      alpha: 0,
      duration: 80,
      onUpdate: () => {
        graphics.setAlpha(fadeTarget.alpha);
      },
      onComplete: () => {
        graphics.clear();
        graphics.setAlpha(1);
      }
    });
  }
  
  private playPassLine(angle: number): void {
    const graphics = this.passLineGraphics;
    if (!graphics) return;
    
    const lineLength = 55;
    const startX = this.x + Math.cos(angle) * 25;
    const startY = this.y + Math.sin(angle) * 25;
    const endX = this.x + Math.cos(angle) * lineLength;
    const endY = this.y + Math.sin(angle) * lineLength;
    
    graphics.clear();
    graphics.lineStyle(4, 0x2ecc71, 0.8);
    graphics.beginPath();
    graphics.moveTo(startX, startY);
    graphics.lineTo(endX, endY);
    graphics.strokePath();
    
    // Small circle at end
    graphics.fillStyle(0x2ecc71, 0.8);
    graphics.fillCircle(endX, endY, 5);
    
    // Fade out
    const fadeTarget = { alpha: 1 };
    this.scene.tweens.add({
      targets: fadeTarget,
      alpha: 0,
      duration: 120,
      onUpdate: () => {
        graphics.setAlpha(fadeTarget.alpha);
      },
      onComplete: () => {
        graphics.clear();
        graphics.setAlpha(1);
      }
    });
  }
  
  private tackle(): void {
    this.tackleCooldown = TUNING.COOLDOWN_TACKLE;
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
    const lungeDistance = TUNING.TACKLE_DISTANCE_BASE + this.getModifiedStat('tackle') * TUNING.TACKLE_DISTANCE_SCALE;
    const lungeX = Math.cos(this.facingAngle) * lungeDistance;
    const lungeY = Math.sin(this.facingAngle) * lungeDistance;
    
    this.scene.tweens.add({
      targets: this,
      x: this.x + lungeX,
      y: this.y + lungeY,
      duration: 140,
      ease: 'Power2'
    });
    
    // Camera shake on tackle
    this.scene.cameras.main.shake(
      TUNING.CAMERA_SHAKE_TACKLE_DURATION,
      TUNING.CAMERA_SHAKE_TACKLE
    );
  }
  
  private dodge(dirX: number, dirY: number): void {
    this.isDodging = true;
    this.dodgeCooldown = TUNING.COOLDOWN_DODGE;
    this.stamina -= 20;
    
    // Normalize direction
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    dirX /= len;
    dirY /= len;
    
    const dodgeDistance = TUNING.DODGE_DISTANCE_BASE + this.getModifiedStat('dodge') * TUNING.DODGE_DISTANCE_SCALE;
    
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
      duration: TUNING.DODGE_DURATION,
      ease: 'Power2',
      onComplete: () => {
        this.isDodging = false;
      }
    });
    
    // Trail effect
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 80,
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
    const targetRotation = this.facingAngle * 0.1;
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetRotation, 0.1);
    
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
    
    let actualDuration = duration;
    if (this.upgradeSystem) {
      actualDuration = this.upgradeSystem.getModifiedStat(duration, 'stunDuration');
    }
    
    this.scene.time.delayedCall(actualDuration, () => {
      this.isStunned = false;
    });
    
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
    const shield = this.scene.add.sprite(this.x, this.y, 'effect_shield');
    shield.setAlpha(0.7);
    shield.setDepth(11);
    
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
      shoot: this.shootCooldown / TUNING.COOLDOWN_SHOOT,
      pass: this.passCooldown / TUNING.COOLDOWN_PASS,
      tackle: this.tackleCooldown / TUNING.COOLDOWN_TACKLE,
      dodge: this.dodgeCooldown / TUNING.COOLDOWN_DODGE
    };
  }
  
  canShoot(): boolean {
    return this.hasBall && this.shootCooldown <= 0 && !this.isStunned && !this.isDodging;
  }
  
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
    this.passLineGraphics?.destroy();
    super.destroy(fromScene);
  }
}
