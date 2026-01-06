// EnemyGoalkeeper entity for Stick & Shift
// Dedicated goalkeeper that stays in ENEMY goal (left side) and blocks shots
// Smaller than outfield players with distinctive helmet/pads appearance

import Phaser from 'phaser';
import * as TUNING from '../data/tuning';

// GK-specific constants
const GK_SCALE = 0.85;  // Smaller than outfield players
const GK_SAVE_RADIUS = 32;  // Slightly larger collision for saves despite smaller sprite
const GK_SPRITE_SIZE = 40;  // Base sprite size before scaling

export class EnemyGoalkeeper extends Phaser.Physics.Arcade.Sprite {
  // References
  private ball?: any;
  private fieldWidth: number = 1200;
  private fieldHeight: number = 700;
  
  // State
  private isLunging: boolean = false;
  private lungeEndTime: number = 0;
  private lungeCooldownUntil: number = 0;
  private lastReactionTime: number = 0;
  
  // Goal area bounds (GK_BOX)
  private goalY: number;
  private goalTopY: number;
  private goalBottomY: number;
  private gkBoxMinX: number;
  private gkBoxMaxX: number;
  
  // Stats for debug
  public saveCount: number = 0;
  public lungeAttempts: number = 0;
  
  // Visual elements
  private helmetGraphic?: Phaser.GameObjects.Graphics;
  private idleTimer: number = 0;
  
  constructor(scene: Phaser.Scene, fieldWidth: number, fieldHeight: number) {
    // Position at LEFT goal (ENEMY defends left side - where player shoots)
    const startX = TUNING.GK_MIN_X + 25;
    const startY = fieldHeight / 2;
    
    super(scene, startX, startY, 'enemy_gk_pro');
    
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
    this.goalY = fieldHeight / 2;
    
    // Define GK_BOX - area where GK stays
    this.gkBoxMinX = TUNING.GK_MIN_X;
    this.gkBoxMaxX = TUNING.GK_MAX_X;
    this.goalTopY = this.goalY - TUNING.GOAL_MOUTH_HEIGHT / 2 - TUNING.GK_Y_MARGIN;
    this.goalBottomY = this.goalY + TUNING.GOAL_MOUTH_HEIGHT / 2 + TUNING.GK_Y_MARGIN;
    
    // Create the GK texture first
    this.createGKTexture(scene);
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Apply scale (smaller than outfield)
    this.setScale(GK_SCALE);
    
    // Physics setup - larger save radius for better blocking
    this.setCircle(GK_SAVE_RADIUS, -GK_SAVE_RADIUS + GK_SPRITE_SIZE/2, -GK_SAVE_RADIUS + GK_SPRITE_SIZE/2 + 5);
    this.setCollideWorldBounds(true);
    this.setImmovable(false);
    this.setDepth(12);  // Above regular players
    
    // Start idle bounce animation
    this.startIdleAnimation(scene);
    
    console.log(`[GK] ENEMY GK spawned at LEFT goal (x=${startX}, y=${startY}), scale=${GK_SCALE}`);
  }
  
  private createGKTexture(scene: Phaser.Scene): void {
    // Check if texture already exists
    if (scene.textures.exists('enemy_gk_pro')) {
      this.setTexture('enemy_gk_pro');
      return;
    }
    
    const graphics = scene.add.graphics();
    const size = GK_SPRITE_SIZE;
    const cx = size / 2;
    const cy = size / 2;
    
    // === LEG PADS (wide, distinctive) ===
    graphics.fillStyle(0x333333, 1);  // Dark gray pads
    graphics.fillRoundedRect(cx - 14, cy + 2, 28, 16, 3);
    
    // Pad highlights
    graphics.fillStyle(0x555555, 1);
    graphics.fillRect(cx - 12, cy + 4, 4, 12);
    graphics.fillRect(cx + 8, cy + 4, 4, 12);
    
    // === BODY (protective chest guard) ===
    graphics.fillStyle(0xff3300, 1);  // Bright orange/red body
    graphics.fillRoundedRect(cx - 10, cy - 8, 20, 18, 4);
    
    // Chest guard pattern
    graphics.lineStyle(2, 0xff6600, 1);
    graphics.strokeRect(cx - 8, cy - 6, 16, 14);
    
    // === GLOVES (bright yellow, extended) ===
    graphics.fillStyle(0xffdd00, 1);  // Bright yellow gloves
    // Left glove (blocker style - wider)
    graphics.fillRoundedRect(cx - 18, cy - 4, 8, 12, 2);
    // Right glove (catching glove - rounder)
    graphics.fillCircle(cx + 16, cy + 2, 6);
    
    // === HELMET (protective, distinctive) ===
    // Helmet base
    graphics.fillStyle(0xff4400, 1);  // Orange helmet
    graphics.fillCircle(cx, cy - 12, 10);
    
    // Face cage/grill
    graphics.lineStyle(1.5, 0x222222, 1);
    graphics.strokeCircle(cx, cy - 12, 8);
    graphics.beginPath();
    graphics.moveTo(cx - 6, cy - 14);
    graphics.lineTo(cx + 6, cy - 14);
    graphics.moveTo(cx - 6, cy - 10);
    graphics.lineTo(cx + 6, cy - 10);
    graphics.moveTo(cx, cy - 16);
    graphics.lineTo(cx, cy - 8);
    graphics.strokePath();
    
    // Helmet top ridge
    graphics.fillStyle(0xff6600, 1);
    graphics.fillRect(cx - 6, cy - 20, 12, 4);
    
    // === STICK (short, visible) ===
    graphics.fillStyle(0x8B4513, 1);  // Brown stick
    graphics.fillRect(cx + 12, cy + 4, 3, 14);
    graphics.fillStyle(0xffffff, 1);  // White tape
    graphics.fillRect(cx + 12, cy + 14, 5, 4);
    
    // === OUTLINE (to make GK pop) ===
    graphics.lineStyle(2, 0x000000, 0.5);
    graphics.strokeCircle(cx, cy - 12, 11);  // Helmet outline
    
    graphics.generateTexture('enemy_gk_pro', size, size);
    graphics.destroy();
    
    this.setTexture('enemy_gk_pro');
  }
  
  private startIdleAnimation(scene: Phaser.Scene): void {
    // Small bounce animation when idle
    scene.tweens.add({
      targets: this,
      y: this.y - 3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  setBall(ball: any): void {
    this.ball = ball;
  }
  
  update(delta: number): void {
    if (!this.ball) return;
    
    const now = this.scene.time.now;
    
    // Check if lunge has ended
    if (this.isLunging && now > this.lungeEndTime) {
      this.isLunging = false;
      this.clearTint();
      this.setScale(GK_SCALE);
    }
    
    // Get ball info
    const ballSpeed = this.ball.getSpeed();
    const ballVel = this.ball.body?.velocity || { x: 0, y: 0 };
    const ballMovingTowardGoal = ballVel.x < -50;  // Moving left toward ENEMY goal (left side)
    
    // Decide behavior
    if (this.shouldLunge(ballSpeed, ballMovingTowardGoal, now)) {
      this.performLunge();
    } else if (!this.isLunging) {
      this.trackBall(delta);
    }
    
    // Keep GK strictly in GK_BOX
    this.constrainPosition();
  }
  
  private shouldLunge(ballSpeed: number, movingToward: boolean, now: number): boolean {
    // Don't lunge if on cooldown or already lunging
    if (this.isLunging) return false;
    if (now < this.lungeCooldownUntil) return false;
    
    // Reaction time check
    if (now - this.lastReactionTime < TUNING.GK_REACTION_MS) return false;
    this.lastReactionTime = now;
    
    // Lunge if ball is fast and heading toward goal
    if (!movingToward) return false;
    if (ballSpeed < TUNING.GK_LUNGE_SPEED_THRESHOLD) return false;
    
    // Check if ball is close enough to goal area
    const distToBall = Phaser.Math.Distance.Between(this.x, this.y, this.ball.x, this.ball.y);
    if (distToBall > 200) return false;
    
    // Check if ball trajectory will cross goal mouth
    const predictedY = this.ball.y + this.ball.body.velocity.y * TUNING.GK_PREDICT_MULT;
    const inGoalPath = predictedY > this.goalTopY && predictedY < this.goalBottomY;
    
    return inGoalPath;
  }
  
  private performLunge(): void {
    if (!this.ball) return;
    
    this.isLunging = true;
    this.lungeAttempts++;
    this.lungeEndTime = this.scene.time.now + TUNING.GK_LUNGE_DURATION;
    this.lungeCooldownUntil = this.scene.time.now + TUNING.GK_LUNGE_COOLDOWN;
    
    // Calculate predicted intercept point
    const predictTime = TUNING.GK_PREDICT_MULT;
    const predX = this.ball.x + this.ball.body.velocity.x * predictTime;
    const predY = this.ball.y + this.ball.body.velocity.y * predictTime;
    
    // Clamp prediction to GK_BOX
    const targetX = Phaser.Math.Clamp(predX, this.gkBoxMinX, this.gkBoxMaxX);
    const targetY = Phaser.Math.Clamp(predY, this.goalTopY, this.goalBottomY);
    
    // Calculate lunge direction
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    
    // Apply lunge velocity
    this.setVelocity(
      (dx / dist) * TUNING.GK_LUNGE_SPEED,
      (dy / dist) * TUNING.GK_LUNGE_SPEED
    );
    
    // Visual feedback - yellow tint during lunge
    this.setTint(0xffff00);
    
    // Squash/stretch effect for lunge (with proper scale)
    this.scene.tweens.add({
      targets: this,
      scaleX: GK_SCALE * 1.25,
      scaleY: GK_SCALE * 0.75,
      duration: TUNING.GK_LUNGE_DURATION / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.setScale(GK_SCALE);
      }
    });
    
    console.log(`[GK] Lunge toward (${Math.round(targetX)}, ${Math.round(targetY)})`);
  }
  
  private trackBall(delta: number): void {
    if (!this.ball) return;
    
    // Calculate target Y based on ball position
    let targetY = this.ball.y;
    
    // If ball is moving, predict where it will be
    const ballVel = this.ball.body?.velocity || { x: 0, y: 0 };
    if (Math.abs(ballVel.x) > 50) {
      targetY = this.ball.y + ballVel.y * 0.15;
    }
    
    // Clamp to goal area
    targetY = Phaser.Math.Clamp(targetY, this.goalTopY, this.goalBottomY);
    
    // Target X - stay near goal line but can come out slightly
    let targetX = TUNING.GK_MIN_X + 15;
    
    // Come out a bit if ball is close
    const distToBall = Phaser.Math.Distance.Between(this.x, this.y, this.ball.x, this.ball.y);
    if (distToBall < 150 && this.ball.x < 200) {
      targetX = Phaser.Math.Clamp(
        Phaser.Math.Linear(TUNING.GK_MIN_X, TUNING.GK_MAX_X, 1 - distToBall / 150),
        TUNING.GK_MIN_X,
        TUNING.GK_MAX_X
      );
    }
    
    // Move toward target
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      const speed = Math.min(TUNING.GK_SPEED, dist * 8);  // Smooth approach
      this.setVelocity(
        (dx / dist) * speed * 0.3,  // Slower X movement
        (dy / dist) * speed
      );
    } else {
      this.setVelocity(0, 0);
    }
  }
  
  private constrainPosition(): void {
    // Keep GK strictly within GK_BOX
    this.x = Phaser.Math.Clamp(this.x, this.gkBoxMinX, this.gkBoxMaxX + 10);
    this.y = Phaser.Math.Clamp(this.y, this.goalTopY, this.goalBottomY);
  }
  
  /**
   * Handle ball collision - deflect the ball
   */
  onBallContact(ball: any): void {
    // Only deflect if ball was moving fast (a shot)
    const ballSpeed = ball.getSpeed();
    if (ballSpeed < 100) return;
    
    this.saveCount++;
    
    // Calculate deflection direction (away from goal)
    const deflectAngle = Math.atan2(ball.y - this.y, ball.x - this.x);
    // Bias deflection to the sides and away from goal
    const finalAngle = deflectAngle + (Math.random() - 0.5) * 0.8 + Math.PI * 0.3;
    
    // Apply deflection
    ball.setVelocity(
      Math.cos(finalAngle) * TUNING.GK_DEFLECT_SPEED,
      Math.sin(finalAngle) * TUNING.GK_DEFLECT_SPEED
    );
    
    // Prevent ball from sticking - brief immunity
    ball.isLoose = true;
    ball.owner = null;
    
    // Visual/audio feedback
    this.showSaveEffect();
    
    console.log(`[GK] SAVE! Total: ${this.saveCount}`);
  }
  
  private showSaveEffect(): void {
    // Flash GK bright
    this.setTint(0x00ff00);
    
    // Quick scale burst for impact
    this.scene.tweens.add({
      targets: this,
      scaleX: GK_SCALE * 1.2,
      scaleY: GK_SCALE * 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.setScale(GK_SCALE);
        this.clearTint();
      }
    });
    
    // Camera shake
    this.scene.cameras.main.shake(120, 0.01);
    
    // Show "SAVE!" text with glove emoji
    const saveText = this.scene.add.text(this.x + 30, this.y - 40, '🧤 SAVE!', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '24px',
      color: '#00ff00',
      stroke: '#003300',
      strokeThickness: 4
    });
    saveText.setOrigin(0.5);
    saveText.setDepth(200);
    
    this.scene.tweens.add({
      targets: saveText,
      y: saveText.y - 50,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => saveText.destroy()
    });
    
    // Play save sound if available
    const audioSystem = (this.scene as any).audioSystem;
    if (audioSystem?.playSteal) {
      audioSystem.playSteal();
    }
  }
  
  /**
   * Reset GK to starting position
   */
  reset(): void {
    this.setPosition(TUNING.GK_MIN_X + 25, this.goalY);
    this.setVelocity(0, 0);
    this.isLunging = false;
    this.lungeEndTime = 0;
    this.lungeCooldownUntil = 0;
    this.clearTint();
    this.setScale(GK_SCALE);
  }
  
  /**
   * Get GK_BOX bounds for debug drawing
   */
  getGKBox(): { minX: number; maxX: number; minY: number; maxY: number } {
    return {
      minX: this.gkBoxMinX,
      maxX: this.gkBoxMaxX,
      minY: this.goalTopY,
      maxY: this.goalBottomY
    };
  }
  
  /**
   * Get current state string for debug
   */
  getStateString(): string {
    return this.isLunging ? 'GK_LUNGE' : 'GK_HOLD';
  }
  
  /**
   * Get debug info
   */
  getDebugInfo(): { saves: number; lunges: number; isLunging: boolean } {
    return {
      saves: this.saveCount,
      lunges: this.lungeAttempts,
      isLunging: this.isLunging
    };
  }
}
