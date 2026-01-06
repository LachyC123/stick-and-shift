// EnemyGoalkeeper entity for Stick & Shift
// Dedicated goalkeeper that stays in goal and blocks shots
// Part C: Enemy Goalkeeper implementation

import Phaser from 'phaser';
import * as TUNING from '../data/tuning';

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
  
  // Goal area bounds
  private goalY: number;
  private goalTopY: number;
  private goalBottomY: number;
  
  // Stats for debug
  public saveCount: number = 0;
  public lungeAttempts: number = 0;
  
  // Visual feedback
  private gloveSprite?: Phaser.GameObjects.Sprite;
  
  constructor(scene: Phaser.Scene, fieldWidth: number, fieldHeight: number) {
    // Position at left goal (enemy defends left)
    const startX = TUNING.GK_MIN_X + 20;
    const startY = fieldHeight / 2;
    
    super(scene, startX, startY, 'enemy_gk');
    
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
    this.goalY = fieldHeight / 2;
    this.goalTopY = this.goalY - TUNING.GOAL_MOUTH_HEIGHT / 2 - TUNING.GK_Y_MARGIN;
    this.goalBottomY = this.goalY + TUNING.GOAL_MOUTH_HEIGHT / 2 + TUNING.GK_Y_MARGIN;
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Physics setup - solid body, not sensor
    this.setCircle(TUNING.GK_BLOCK_RADIUS, 0, 4);
    this.setCollideWorldBounds(true);
    this.setImmovable(false);  // Can be pushed slightly but will return
    this.setDepth(10);
    this.setTint(0xff6600);  // Orange tint to distinguish from regular enemies
    
    // Create texture if it doesn't exist
    if (!scene.textures.exists('enemy_gk')) {
      this.createGKTexture(scene);
    }
  }
  
  private createGKTexture(scene: Phaser.Scene): void {
    // Create a distinctive GK appearance
    const graphics = scene.add.graphics();
    
    // Body (larger, different color)
    graphics.fillStyle(0xff4400, 1);
    graphics.fillCircle(24, 28, 22);
    
    // Gloves indicator
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(8, 28, 6);
    graphics.fillCircle(40, 28, 6);
    
    // Head
    graphics.fillStyle(0xffccaa, 1);
    graphics.fillCircle(24, 12, 10);
    
    graphics.generateTexture('enemy_gk', 48, 56);
    graphics.destroy();
    
    this.setTexture('enemy_gk');
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
      this.setTint(0xff6600);
    }
    
    // Get ball info
    const ballSpeed = this.ball.getSpeed();
    const ballVel = this.ball.body?.velocity || { x: 0, y: 0 };
    const ballMovingTowardGoal = ballVel.x < -50;  // Moving left toward GK's goal
    
    // Decide behavior
    if (this.shouldLunge(ballSpeed, ballMovingTowardGoal, now)) {
      this.performLunge();
    } else if (!this.isLunging) {
      this.trackBall(delta);
    }
    
    // Keep GK in bounds
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
    
    // Clamp prediction to goal area
    const targetX = Phaser.Math.Clamp(predX, TUNING.GK_MIN_X, TUNING.GK_MAX_X);
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
    
    // Visual feedback
    this.setTint(0xffff00);  // Yellow during lunge
    
    // Scale effect
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.3,
      scaleY: 0.8,
      duration: TUNING.GK_LUNGE_DURATION / 2,
      yoyo: true,
      ease: 'Quad.easeOut'
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
    // Keep GK within goal area
    this.x = Phaser.Math.Clamp(this.x, TUNING.GK_MIN_X - 10, TUNING.GK_MAX_X + 20);
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
    // Flash GK
    this.setTint(0x00ff00);
    this.scene.time.delayedCall(200, () => {
      this.setTint(0xff6600);
    });
    
    // Camera shake
    this.scene.cameras.main.shake(100, 0.008);
    
    // Show "SAVE!" text
    const saveText = this.scene.add.text(this.x, this.y - 50, 'SAVE!', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      color: '#00ff00',
      stroke: '#003300',
      strokeThickness: 4
    });
    saveText.setOrigin(0.5);
    saveText.setDepth(200);
    
    this.scene.tweens.add({
      targets: saveText,
      y: saveText.y - 40,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => saveText.destroy()
    });
    
    // Play save sound if available
    const audioSystem = (this.scene as any).audioSystem;
    if (audioSystem?.playSteal) {
      audioSystem.playSteal();  // Reuse steal sound for save
    }
  }
  
  /**
   * Reset GK to starting position
   */
  reset(): void {
    this.setPosition(TUNING.GK_MIN_X + 20, this.goalY);
    this.setVelocity(0, 0);
    this.isLunging = false;
    this.lungeEndTime = 0;
    this.lungeCooldownUntil = 0;
    this.clearTint();
    this.setTint(0xff6600);
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
