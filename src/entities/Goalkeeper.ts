// Goalkeeper entity for Stick & Shift
// Reusable goalkeeper that can defend either goal
// Used for both Player GK and Enemy GK

import Phaser from 'phaser';
import * as TUNING from '../data/tuning';

// GK-specific constants
const GK_SCALE = 0.85;
const GK_SAVE_RADIUS = 32;
const GK_SPRITE_SIZE = 40;

export type GoalkeeperTeam = 'player' | 'enemy';

export class Goalkeeper extends Phaser.Physics.Arcade.Sprite {
  // Team and side
  public team: GoalkeeperTeam;
  private defendsRightGoal: boolean;
  
  // References
  private ball?: any;
  private fieldWidth: number;
  private fieldHeight: number;
  
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
  private goalLineX: number;
  
  // Stats for debug
  public saveCount: number = 0;
  public lungeAttempts: number = 0;
  
  constructor(scene: Phaser.Scene, fieldWidth: number, fieldHeight: number, team: GoalkeeperTeam) {
    // Determine which goal to defend based on team
    // PLAYER attacks RIGHT, defends LEFT => Player GK at LEFT goal
    // ENEMY attacks LEFT, defends RIGHT => Enemy GK at RIGHT goal
    const defendsRightGoal = team === 'enemy';
    
    const goalLineX = defendsRightGoal ? fieldWidth - 30 : 30;
    const startX = defendsRightGoal ? goalLineX - 25 : goalLineX + 25;
    const startY = fieldHeight / 2;
    
    const textureKey = team === 'player' ? 'player_gk_pro' : 'enemy_gk_pro';
    
    super(scene, startX, startY, textureKey);
    
    this.team = team;
    this.defendsRightGoal = defendsRightGoal;
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
    this.goalY = fieldHeight / 2;
    this.goalLineX = goalLineX;
    
    // Define GK_BOX based on which side
    if (defendsRightGoal) {
      // RIGHT goal GK_BOX
      this.gkBoxMaxX = goalLineX - TUNING.GK_MIN_X + 30;
      this.gkBoxMinX = goalLineX - TUNING.GK_MAX_X;
    } else {
      // LEFT goal GK_BOX
      this.gkBoxMinX = goalLineX + TUNING.GK_MIN_X - 30;
      this.gkBoxMaxX = goalLineX + TUNING.GK_MAX_X;
    }
    
    this.goalTopY = this.goalY - TUNING.GOAL_MOUTH_HEIGHT / 2 - TUNING.GK_Y_MARGIN;
    this.goalBottomY = this.goalY + TUNING.GOAL_MOUTH_HEIGHT / 2 + TUNING.GK_Y_MARGIN;
    
    // Create the GK texture
    this.createGKTexture(scene, team);
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Apply scale
    this.setScale(GK_SCALE);
    
    // Physics setup
    this.setCircle(GK_SAVE_RADIUS, -GK_SAVE_RADIUS + GK_SPRITE_SIZE/2, -GK_SAVE_RADIUS + GK_SPRITE_SIZE/2 + 5);
    this.setCollideWorldBounds(true);
    this.setImmovable(false);
    this.setDepth(12);
    
    // Start idle animation
    this.startIdleAnimation(scene);
    
    const sideName = defendsRightGoal ? 'RIGHT' : 'LEFT';
    console.log(`[GK] ${team.toUpperCase()} GK spawned at ${sideName} goal (x=${Math.round(startX)}, y=${startY})`);
    console.log(`[GK] ${team} GK_BOX: X[${Math.round(this.gkBoxMinX)}-${Math.round(this.gkBoxMaxX)}], Y[${Math.round(this.goalTopY)}-${Math.round(this.goalBottomY)}]`);
  }
  
  private createGKTexture(scene: Phaser.Scene, team: GoalkeeperTeam): void {
    const textureKey = team === 'player' ? 'player_gk_pro' : 'enemy_gk_pro';
    
    if (scene.textures.exists(textureKey)) {
      this.setTexture(textureKey);
      return;
    }
    
    const graphics = scene.add.graphics();
    const size = GK_SPRITE_SIZE;
    const cx = size / 2;
    const cy = size / 2;
    
    // Team-specific colors
    const bodyColor = team === 'player' ? 0x3498db : 0xff3300;  // Blue for player, orange/red for enemy
    const helmetColor = team === 'player' ? 0x2980b9 : 0xff4400;
    const accentColor = team === 'player' ? 0x5dade2 : 0xff6600;
    
    // === LEG PADS ===
    graphics.fillStyle(0x333333, 1);
    graphics.fillRoundedRect(cx - 14, cy + 2, 28, 16, 3);
    graphics.fillStyle(0x555555, 1);
    graphics.fillRect(cx - 12, cy + 4, 4, 12);
    graphics.fillRect(cx + 8, cy + 4, 4, 12);
    
    // === BODY ===
    graphics.fillStyle(bodyColor, 1);
    graphics.fillRoundedRect(cx - 10, cy - 8, 20, 18, 4);
    graphics.lineStyle(2, accentColor, 1);
    graphics.strokeRect(cx - 8, cy - 6, 16, 14);
    
    // === GLOVES ===
    graphics.fillStyle(0xffdd00, 1);
    graphics.fillRoundedRect(cx - 18, cy - 4, 8, 12, 2);
    graphics.fillCircle(cx + 16, cy + 2, 6);
    
    // === HELMET ===
    graphics.fillStyle(helmetColor, 1);
    graphics.fillCircle(cx, cy - 12, 10);
    
    // Face cage
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
    
    // Helmet ridge
    graphics.fillStyle(accentColor, 1);
    graphics.fillRect(cx - 6, cy - 20, 12, 4);
    
    // === STICK ===
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(cx + 12, cy + 4, 3, 14);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(cx + 12, cy + 14, 5, 4);
    
    // Outline
    graphics.lineStyle(2, 0x000000, 0.5);
    graphics.strokeCircle(cx, cy - 12, 11);
    
    graphics.generateTexture(textureKey, size, size);
    graphics.destroy();
    
    this.setTexture(textureKey);
  }
  
  private startIdleAnimation(scene: Phaser.Scene): void {
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
    
    // Check if lunge ended
    if (this.isLunging && now > this.lungeEndTime) {
      this.isLunging = false;
      this.clearTint();
      this.setScale(GK_SCALE);
    }
    
    // Get ball velocity
    const ballVel = this.ball.body?.velocity || { x: 0, y: 0 };
    
    // Check if ball is moving toward this goal
    const ballMovingTowardGoal = this.defendsRightGoal 
      ? ballVel.x > 50   // Moving right toward right goal
      : ballVel.x < -50; // Moving left toward left goal
    
    const ballSpeed = this.ball.getSpeed ? this.ball.getSpeed() : 
      Math.sqrt(ballVel.x * ballVel.x + ballVel.y * ballVel.y);
    
    // Decide behavior
    if (this.shouldLunge(ballSpeed, ballMovingTowardGoal, now)) {
      this.performLunge();
    } else if (!this.isLunging) {
      this.trackBall(delta);
    }
    
    this.constrainPosition();
  }
  
  private shouldLunge(ballSpeed: number, movingToward: boolean, now: number): boolean {
    if (this.isLunging) return false;
    if (now < this.lungeCooldownUntil) return false;
    if (now - this.lastReactionTime < TUNING.GK_REACTION_MS) return false;
    
    this.lastReactionTime = now;
    
    if (!movingToward) return false;
    if (ballSpeed < TUNING.GK_LUNGE_SPEED_THRESHOLD) return false;
    
    const distToBall = Phaser.Math.Distance.Between(this.x, this.y, this.ball.x, this.ball.y);
    if (distToBall > 200) return false;
    
    // Check ball trajectory
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
    
    // Clamp to GK_BOX
    const targetX = Phaser.Math.Clamp(predX, this.gkBoxMinX, this.gkBoxMaxX);
    const targetY = Phaser.Math.Clamp(predY, this.goalTopY, this.goalBottomY);
    
    // Calculate lunge direction
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    
    this.setVelocity(
      (dx / dist) * TUNING.GK_LUNGE_SPEED,
      (dy / dist) * TUNING.GK_LUNGE_SPEED
    );
    
    this.setTint(0xffff00);
    
    this.scene.tweens.add({
      targets: this,
      scaleX: GK_SCALE * 1.25,
      scaleY: GK_SCALE * 0.75,
      duration: TUNING.GK_LUNGE_DURATION / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.setScale(GK_SCALE)
    });
    
    console.log(`[GK] ${this.team} lunge toward (${Math.round(targetX)}, ${Math.round(targetY)})`);
  }
  
  private trackBall(delta: number): void {
    if (!this.ball) return;
    
    let targetY = this.ball.y;
    const ballVel = this.ball.body?.velocity || { x: 0, y: 0 };
    
    if (Math.abs(ballVel.x) > 50) {
      targetY = this.ball.y + ballVel.y * 0.15;
    }
    
    targetY = Phaser.Math.Clamp(targetY, this.goalTopY, this.goalBottomY);
    
    // X tracking based on which side
    let targetX: number;
    if (this.defendsRightGoal) {
      targetX = this.gkBoxMaxX - 10;
      const distToBall = Phaser.Math.Distance.Between(this.x, this.y, this.ball.x, this.ball.y);
      if (distToBall < 150 && this.ball.x > this.fieldWidth - 250) {
        targetX = Phaser.Math.Clamp(
          Phaser.Math.Linear(this.gkBoxMaxX, this.gkBoxMinX, 1 - distToBall / 150),
          this.gkBoxMinX,
          this.gkBoxMaxX
        );
      }
    } else {
      targetX = this.gkBoxMinX + 10;
      const distToBall = Phaser.Math.Distance.Between(this.x, this.y, this.ball.x, this.ball.y);
      if (distToBall < 150 && this.ball.x < 250) {
        targetX = Phaser.Math.Clamp(
          Phaser.Math.Linear(this.gkBoxMinX, this.gkBoxMaxX, 1 - distToBall / 150),
          this.gkBoxMinX,
          this.gkBoxMaxX
        );
      }
    }
    
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      const speed = Math.min(TUNING.GK_SPEED, dist * 8);
      this.setVelocity(
        (dx / dist) * speed * 0.3,
        (dy / dist) * speed
      );
    } else {
      this.setVelocity(0, 0);
    }
  }
  
  private constrainPosition(): void {
    this.x = Phaser.Math.Clamp(this.x, this.gkBoxMinX - 10, this.gkBoxMaxX + 10);
    this.y = Phaser.Math.Clamp(this.y, this.goalTopY, this.goalBottomY);
  }
  
  /**
   * Handle ball collision - deflect away from goal
   */
  onBallContact(ball: any): void {
    const ballSpeed = ball.getSpeed ? ball.getSpeed() : 
      Math.sqrt(ball.body.velocity.x ** 2 + ball.body.velocity.y ** 2);
    
    if (ballSpeed < 100) return;
    
    this.saveCount++;
    
    // Deflection direction depends on which goal
    const deflectAngle = Math.PI + (Math.random() - 0.5) * 1.2;
    
    if (this.defendsRightGoal) {
      // Deflect left (away from right goal)
      ball.setVelocity(
        -Math.abs(Math.cos(deflectAngle)) * TUNING.GK_DEFLECT_SPEED,
        Math.sin(deflectAngle) * TUNING.GK_DEFLECT_SPEED * 0.8
      );
    } else {
      // Deflect right (away from left goal)
      ball.setVelocity(
        Math.abs(Math.cos(deflectAngle)) * TUNING.GK_DEFLECT_SPEED,
        Math.sin(deflectAngle) * TUNING.GK_DEFLECT_SPEED * 0.8
      );
    }
    
    ball.isLoose = true;
    ball.owner = null;
    
    this.showSaveEffect();
    
    const sideName = this.defendsRightGoal ? 'RIGHT' : 'LEFT';
    console.log(`[GK] ${this.team.toUpperCase()} SAVE at ${sideName} goal! Total saves: ${this.saveCount}`);
  }
  
  private showSaveEffect(): void {
    this.setTint(0x00ff00);
    
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
    
    this.scene.cameras.main.shake(120, 0.01);
    
    const emoji = this.team === 'player' ? '🧤' : '🧤';
    const saveText = this.scene.add.text(this.x + 30, this.y - 40, `${emoji} SAVE!`, {
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
      y: saveText.y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => saveText.destroy()
    });
  }
  
  reset(): void {
    const startX = this.defendsRightGoal 
      ? this.goalLineX - 25 
      : this.goalLineX + 25;
    
    this.setPosition(startX, this.goalY);
    this.setVelocity(0, 0);
    this.isLunging = false;
    this.clearTint();
    this.setScale(GK_SCALE);
  }
  
  getGKBox(): { minX: number; maxX: number; topY: number; bottomY: number } {
    return {
      minX: this.gkBoxMinX,
      maxX: this.gkBoxMaxX,
      topY: this.goalTopY,
      bottomY: this.goalBottomY
    };
  }
  
  getStateString(): string {
    if (this.isLunging) return 'LUNGE';
    return 'HOLD';
  }
}
