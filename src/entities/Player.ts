// Player entity for Stick & Shift
// Main player-controlled field hockey player
// Improved: charged shots, better passing, knockback on tackle

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
  public isCharging: boolean = false;
  public isHitstop: boolean = false;
  
  // Stamina
  public stamina: number = 100;
  public maxStamina: number = 100;
  
  // Cooldowns (in ms)
  private shootCooldown: number = 0;
  private passCooldown: number = 0;
  private tackleCooldown: number = 0;
  private dodgeCooldown: number = 0;
  
  // Charge shot state
  private chargeStartTime: number = 0;
  private chargeGraphics?: Phaser.GameObjects.Graphics;
  
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
  public onPass?: (angle: number, passSpeed: number, targetPos?: { x: number; y: number }) => void;
  public onTackle?: () => void;
  public onDodge?: () => void;
  public onShootFailed?: () => void;
  public onPassFailed?: () => void;
  
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
    
    // Apply character color
    const colorIndex = this.getColorIndex(character.color);
    this.setTexture(`player_${colorIndex}`);
    
    // Graphics
    this.stickGraphics = scene.add.graphics();
    this.stickGraphics.setDepth(11);
    
    this.shotLineGraphics = scene.add.graphics();
    this.shotLineGraphics.setDepth(9);
    
    this.passLineGraphics = scene.add.graphics();
    this.passLineGraphics.setDepth(9);
    
    this.chargeGraphics = scene.add.graphics();
    this.chargeGraphics.setDepth(12);
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
  
  private getModifiedStat(statName: keyof CharacterStats): number {
    const baseStat = this.stats[statName];
    if (this.upgradeSystem) {
      return this.upgradeSystem.getModifiedStat(baseStat, statName);
    }
    return baseStat;
  }
  
  update(delta: number, input: InputState): void {
    this.updateCooldowns(delta);
    
    // Handle hitstop (freeze movement briefly)
    if (this.isHitstop) {
      return;
    }
    
    // Handle stun
    if (this.isStunned) {
      this.setVelocity(this.body!.velocity.x * 0.92, this.body!.velocity.y * 0.92);
      this.cancelCharge();
      return;
    }
    
    if (this.isDodging) {
      return;
    }
    
    this.processMovement(input, delta);
    this.processActions(input);
    this.updateVisuals(input);
    this.updateChargeUI();
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
    
    if (input.isMoving) {
      this.facingAngle = Math.atan2(input.moveY, input.moveX);
    } else if (input.hasMouseMoved) {
      this.facingAngle = input.aimAngle;
    }
  }
  
  private processActions(input: InputState): void {
    // === CHARGED SHOT ===
    // Start charging on press
    if (input.shoot && this.hasBall && this.shootCooldown <= 0) {
      this.startCharge();
    }
    
    // Release shot on key/mouse up
    if (this.isCharging) {
      if (input.shootReleased || (!input.shootHeld && !input.mouseDown)) {
        this.releaseChargedShot(input.aimAngle);
      } else if (!this.hasBall) {
        // Lost ball while charging - cancel
        this.cancelCharge();
      }
    }
    
    // Quick tap shot (instant release)
    if (input.shoot && !this.isCharging && this.hasBall && this.shootCooldown <= 0) {
      // Already handled above - starts charge
    }
    
    // === PASS ===
    if (input.pass && this.passCooldown <= 0) {
      this.tryPass(input.aimAngle);
    }
    
    // === TACKLE ===
    if (input.tackle && !this.hasBall && this.tackleCooldown <= 0) {
      this.tackle();
    }
    
    // === DODGE ===
    if (input.dodge && this.dodgeCooldown <= 0 && this.stamina >= 20) {
      this.dodge(input.moveX || Math.cos(input.aimAngle), input.moveY || Math.sin(input.aimAngle));
    }
  }
  
  // === CHARGE SHOT SYSTEM ===
  
  private startCharge(): void {
    if (this.isCharging) return;
    this.isCharging = true;
    this.chargeStartTime = this.scene.time.now;
  }
  
  private getChargePercent(): number {
    if (!this.isCharging) return 0;
    const elapsed = this.scene.time.now - this.chargeStartTime;
    const t = Phaser.Math.Clamp(
      (elapsed - TUNING.CHARGE_MIN_MS) / (TUNING.CHARGE_MAX_MS - TUNING.CHARGE_MIN_MS),
      0, 1
    );
    return t;
  }
  
  private getChargePowerMult(): number {
    const t = this.getChargePercent();
    return Phaser.Math.Linear(TUNING.CHARGE_POWER_MULT_MIN, TUNING.CHARGE_POWER_MULT_MAX, t);
  }
  
  private releaseChargedShot(aimAngle: number): void {
    if (!this.hasBall) {
      this.cancelCharge();
      return;
    }
    
    const powerMult = this.getChargePowerMult();
    this.cancelCharge();
    
    // Calculate shot speed
    const shotPower = this.getModifiedStat('shotPower');
    const baseSpeed = TUNING.SHOT_SPEED_BASE + shotPower * TUNING.SHOT_SPEED_SCALE;
    const finalSpeed = Math.min(baseSpeed * powerMult, TUNING.SHOT_SPEED_MAX);
    
    this.shoot(finalSpeed, aimAngle, powerMult > 1.1);
  }
  
  cancelCharge(): void {
    this.isCharging = false;
    this.chargeStartTime = 0;
    this.chargeGraphics?.clear();
  }
  
  private updateChargeUI(): void {
    if (!this.chargeGraphics) return;
    this.chargeGraphics.clear();
    
    if (!this.isCharging) return;
    
    const pct = this.getChargePercent();
    if (pct <= 0) return;
    
    // Draw charge bar above player
    const barWidth = 36;
    const barHeight = 6;
    const x = this.x - barWidth / 2;
    const y = this.y - 38;
    
    // Background
    this.chargeGraphics.fillStyle(0x333333, 0.8);
    this.chargeGraphics.fillRect(x, y, barWidth, barHeight);
    
    // Fill
    const fillColor = pct >= 0.9 ? 0xf1c40f : 0x3498db;
    this.chargeGraphics.fillStyle(fillColor, 1);
    this.chargeGraphics.fillRect(x + 1, y + 1, (barWidth - 2) * pct, barHeight - 2);
    
    // Border
    this.chargeGraphics.lineStyle(1, 0xffffff, 0.8);
    this.chargeGraphics.strokeRect(x, y, barWidth, barHeight);
  }
  
  // === SHOOTING ===
  
  tryShoot(aimAngle: number, chargePercent: number = 0): boolean {
    if (this.shootCooldown > 0) return false;
    
    if (!this.hasBall) {
      this.onShootFailed?.();
      return false;
    }
    
    const shotPower = this.getModifiedStat('shotPower');
    const speed = Math.min(
      TUNING.SHOT_SPEED_BASE + shotPower * TUNING.SHOT_SPEED_SCALE,
      TUNING.SHOT_SPEED_MAX
    );
    
    const finalSpeed = speed * (TUNING.CHARGE_POWER_MULT_MIN + chargePercent * (TUNING.CHARGE_POWER_MULT_MAX - TUNING.CHARGE_POWER_MULT_MIN));
    
    this.shoot(Math.min(finalSpeed, TUNING.SHOT_SPEED_MAX), aimAngle, chargePercent > 0.5);
    return true;
  }
  
  private shoot(power: number, angle: number, isCharged: boolean = false): void {
    this.isShooting = true;
    this.hasBall = false;
    this.shootCooldown = TUNING.COOLDOWN_SHOOT;
    
    this.upgradeSystem?.trigger('onShot', {
      player: this,
      position: { x: this.x, y: this.y },
      scene: this.scene
    });
    
    this.onShoot?.(power, angle);
    
    // Visual feedback
    this.playStickSwing(angle);
    this.playMuzzleFlash(angle, true);
    
    // Stronger shake for charged shots
    const shakeIntensity = isCharged ? TUNING.CAMERA_SHAKE_SHOT * 1.5 : TUNING.CAMERA_SHAKE_SHOT;
    this.scene.cameras.main.shake(TUNING.CAMERA_SHAKE_SHOT_DURATION, shakeIntensity);
    
    // Body animation
    this.scene.tweens.add({
      targets: this,
      scaleX: isCharged ? 1.22 : 1.15,
      scaleY: isCharged ? 0.78 : 0.85,
      duration: 60,
      yoyo: true,
      ease: 'Power2',
      onComplete: () => {
        this.isShooting = false;
        this.setScale(1);
      }
    });
  }
  
  // === PASSING ===
  
  tryPass(aimAngle: number): boolean {
    if (this.passCooldown > 0) return false;
    
    if (!this.hasBall) {
      this.onPassFailed?.();
      return false;
    }
    
    this.performPass(aimAngle);
    return true;
  }
  
  private performPass(angle: number): void {
    this.hasBall = false;
    this.passCooldown = TUNING.COOLDOWN_PASS;
    
    const passPower = this.getModifiedStat('passPower');
    const speed = Math.min(
      TUNING.PASS_SPEED_BASE + passPower * TUNING.PASS_SPEED_SCALE,
      TUNING.PASS_SPEED_MAX
    );
    
    this.upgradeSystem?.trigger('onPass', {
      player: this,
      position: { x: this.x, y: this.y },
      scene: this.scene
    });
    
    this.onPass?.(angle, speed);
    
    // Visual
    this.playPassLine(angle);
    
    // Small camera nudge
    this.scene.cameras.main.shake(TUNING.CAMERA_SHAKE_PASS_DURATION, TUNING.CAMERA_SHAKE_PASS);
    
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 0.9,
      duration: 45,
      yoyo: true
    });
  }
  
  // === TACKLE ===
  
  private tackle(): void {
    this.tackleCooldown = TUNING.COOLDOWN_TACKLE;
    this.stamina -= 15;
    
    this.upgradeSystem?.trigger('onTackle', {
      player: this,
      position: { x: this.x, y: this.y },
      scene: this.scene
    });
    
    this.onTackle?.();
    
    // Lunge forward with speed
    const lungeDistance = TUNING.TACKLE_DISTANCE_BASE + this.getModifiedStat('tackle') * TUNING.TACKLE_DISTANCE_SCALE;
    const lungeX = Math.cos(this.facingAngle) * lungeDistance;
    const lungeY = Math.sin(this.facingAngle) * lungeDistance;
    
    this.scene.tweens.add({
      targets: this,
      x: this.x + lungeX,
      y: this.y + lungeY,
      duration: 120,
      ease: 'Power2'
    });
  }
  
  // === DODGE ===
  
  private dodge(dirX: number, dirY: number): void {
    this.isDodging = true;
    this.dodgeCooldown = TUNING.COOLDOWN_DODGE;
    this.stamina -= 20;
    
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    dirX /= len;
    dirY /= len;
    
    const dodgeDistance = TUNING.DODGE_DISTANCE_BASE + this.getModifiedStat('dodge') * TUNING.DODGE_DISTANCE_SCALE;
    
    this.upgradeSystem?.trigger('onDodge', {
      player: this,
      position: { x: this.x, y: this.y },
      scene: this.scene
    });
    
    this.onDodge?.();
    
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
    
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 80,
      yoyo: true
    });
  }
  
  // === VISUAL EFFECTS ===
  
  private playStickSwing(angle: number): void {
    if (!this.stickGraphics) return;
    
    const startAngle = angle - Math.PI / 3;
    const endAngle = angle + Math.PI / 6;
    const stickLength = 38;
    
    let currentAngle = startAngle;
    const duration = 80;
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
    
    const lineLength = isShot ? 75 : 50;
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
    
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillCircle(endX, endY, isShot ? 10 : 6);
    
    const fadeTarget = { alpha: 1 };
    this.scene.tweens.add({
      targets: fadeTarget,
      alpha: 0,
      duration: 70,
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
    
    const lineLength = 60;
    const startX = this.x + Math.cos(angle) * 25;
    const startY = this.y + Math.sin(angle) * 25;
    const endX = this.x + Math.cos(angle) * lineLength;
    const endY = this.y + Math.sin(angle) * lineLength;
    
    graphics.clear();
    graphics.lineStyle(5, 0x2ecc71, 0.9);
    graphics.beginPath();
    graphics.moveTo(startX, startY);
    graphics.lineTo(endX, endY);
    graphics.strokePath();
    
    graphics.fillStyle(0x2ecc71, 0.9);
    graphics.fillCircle(endX, endY, 6);
    
    const fadeTarget = { alpha: 1 };
    this.scene.tweens.add({
      targets: fadeTarget,
      alpha: 0,
      duration: 100,
      onUpdate: () => {
        graphics.setAlpha(fadeTarget.alpha);
      },
      onComplete: () => {
        graphics.clear();
        graphics.setAlpha(1);
      }
    });
  }
  
  // === UTILITIES ===
  
  private updateCooldowns(delta: number): void {
    this.shootCooldown = Math.max(0, this.shootCooldown - delta);
    this.passCooldown = Math.max(0, this.passCooldown - delta);
    this.tackleCooldown = Math.max(0, this.tackleCooldown - delta);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);
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
  
  // === EXTERNAL METHODS ===
  
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
    this.cancelCharge();
    
    this.scene.time.delayedCall(2000, () => {
      this.recentlyLostBall = false;
    });
  }
  
  applyStun(duration: number): void {
    this.isStunned = true;
    this.cancelCharge();
    
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
      duration: 80,
      yoyo: true,
      repeat: Math.floor(actualDuration / 160)
    });
  }
  
  applyHitstop(duration: number): void {
    this.isHitstop = true;
    this.scene.time.delayedCall(duration, () => {
      this.isHitstop = false;
    });
  }
  
  applyKnockback(dirX: number, dirY: number, force: number): void {
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    const vel = this.body!.velocity;
    this.setVelocity(
      vel.x + (dirX / len) * force,
      vel.y + (dirY / len) * force
    );
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
  
  canPass(): boolean {
    return this.hasBall && this.passCooldown <= 0 && !this.isStunned && !this.isDodging;
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
  
  getChargePercentage(): number {
    return this.getChargePercent();
  }
  
  destroy(fromScene?: boolean): void {
    this.stickGraphics?.destroy();
    this.shotLineGraphics?.destroy();
    this.passLineGraphics?.destroy();
    this.chargeGraphics?.destroy();
    super.destroy(fromScene);
  }
}
