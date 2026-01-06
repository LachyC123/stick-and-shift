// TeammateAI entity for Stick & Shift
// AI-controlled teammate

import Phaser from 'phaser';
import { AISystem, AIConfig, AIDecision, AIRole } from '../systems/AISystem';

export class TeammateAI extends Phaser.Physics.Arcade.Sprite {
  // AI
  public aiConfig: AIConfig;
  public aiSystem: AISystem;
  private currentDecision?: AIDecision;
  private decisionTimer: number = 0;
  
  // State
  public hasBall: boolean = false;
  public isStunned: boolean = false;
  
  // Stats
  private speed: number = 180;
  private tackleRange: number = 40;
  private passRange: number = 300;
  
  // Visual
  private facingAngle: number = 0;
  
  // References
  public player?: any;
  public teammates: TeammateAI[] = [];
  public enemies: any[] = [];
  public ball?: any;
  
  // Callbacks
  public onShoot?: (power: number, angle: number) => void;
  public onPass?: (angle: number, target: any) => void;
  public onTackle?: (target: any) => void;
  
  constructor(scene: Phaser.Scene, x: number, y: number, role: AIRole, colorIndex: number = 0) {
    super(scene, x, y, `player_${colorIndex}`);
    
    // Create AI config based on role
    switch (role) {
      case 'defender':
        this.aiConfig = AISystem.createDefenderConfig(0.5);
        break;
      case 'forward':
        this.aiConfig = AISystem.createForwardConfig(0.5);
        break;
      default:
        this.aiConfig = AISystem.createMidfielderConfig(0.5);
    }
    
    this.aiSystem = new AISystem(scene);
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Physics setup
    this.setCircle(20, 4, 8);
    this.setCollideWorldBounds(true);
    this.setDepth(9);
    
    // Apply speed from config
    this.speed = 180 * this.aiConfig.speed;
  }
  
  update(delta: number): void {
    if (this.isStunned) {
      this.setVelocity(this.body!.velocity.x * 0.9, this.body!.velocity.y * 0.9);
      return;
    }
    
    // Update decision periodically
    this.decisionTimer -= delta;
    if (this.decisionTimer <= 0) {
      this.makeDecision();
      this.decisionTimer = this.aiConfig.reactionTime;
    }
    
    // Execute current decision
    this.executeDecision(delta);
    
    // Update visuals
    this.updateVisuals();
  }
  
  private makeDecision(): void {
    if (!this.ball || !this.player) return;
    
    this.currentDecision = this.aiSystem.getTeammateDecision(
      this,
      this.ball,
      this.player,
      this.teammates,
      this.enemies,
      this.hasBall
    );
  }
  
  private executeDecision(delta: number): void {
    if (!this.currentDecision) return;
    
    const decision = this.currentDecision;
    
    switch (decision.action) {
      case 'move':
        this.moveToward(decision.targetX!, decision.targetY!, delta);
        break;
        
      case 'shoot':
        if (this.hasBall) {
          this.shoot(decision.targetX!, decision.targetY!);
        }
        break;
        
      case 'pass':
        if (this.hasBall && decision.targetEntity) {
          this.pass(decision.targetEntity);
        }
        break;
        
      case 'tackle':
        if (!this.hasBall && decision.targetEntity) {
          this.tackle(decision.targetEntity);
        }
        break;
        
      case 'wait':
        this.setVelocity(0, 0);
        break;
    }
  }
  
  private moveToward(targetX: number, targetY: number, delta: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      const speed = this.speed;
      this.setVelocity(
        (dx / dist) * speed,
        (dy / dist) * speed
      );
      this.facingAngle = Math.atan2(dy, dx);
    } else {
      this.setVelocity(0, 0);
    }
  }
  
  private shoot(targetX: number, targetY: number): void {
    if (!this.hasBall) return;
    
    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const power = 250 + this.aiConfig.skill * 100;
    
    this.hasBall = false;
    
    if (this.onShoot) {
      this.onShoot(power, angle);
    }
  }
  
  private pass(target: any): void {
    if (!this.hasBall || !target) return;
    
    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    
    this.hasBall = false;
    
    if (this.onPass) {
      this.onPass(angle, target);
    }
  }
  
  private tackle(target: any): void {
    if (!target) return;
    
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    
    if (dist < this.tackleRange + 20) {
      if (this.onTackle) {
        this.onTackle(target);
      }
    } else {
      // Move toward target
      this.moveToward(target.x, target.y, 16);
    }
  }
  
  private updateVisuals(): void {
    // Subtle rotation based on facing
    this.rotation = this.facingAngle * 0.1;
  }
  
  // External methods
  receiveBall(): void {
    this.hasBall = true;
  }
  
  loseBall(): void {
    this.hasBall = false;
  }
  
  applyStun(duration: number): void {
    this.isStunned = true;
    
    this.scene.time.delayedCall(duration, () => {
      this.isStunned = false;
    });
    
    // Visual feedback
    this.scene.tweens.add({
      targets: this,
      tint: 0xff0000,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(duration / 200)
    });
  }
  
  applyDebuff(type: string, duration: number): void {
    // Apply debuff effects
    if (type === 'slow') {
      const originalSpeed = this.speed;
      this.speed *= 0.5;
      this.scene.time.delayedCall(duration, () => {
        this.speed = originalSpeed;
      });
    }
  }
  
  drainStamina(amount: number): void {
    // Teammates don't have stamina, but slow them briefly
    const originalSpeed = this.speed;
    this.speed *= 0.8;
    this.scene.time.delayedCall(500, () => {
      this.speed = originalSpeed;
    });
  }
  
  getBallOffset(): { x: number; y: number } {
    return {
      x: this.x + Math.cos(this.facingAngle) * 25,
      y: this.y + Math.sin(this.facingAngle) * 25
    };
  }
  
  getFacingAngle(): number {
    return this.facingAngle;
  }
  
  setReferences(player: any, teammates: TeammateAI[], enemies: any[], ball: any): void {
    this.player = player;
    this.teammates = teammates.filter(t => t !== this);
    this.enemies = enemies;
    this.ball = ball;
  }
}
