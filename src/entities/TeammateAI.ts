// TeammateAI entity for Stick & Shift
// AI-controlled teammate

import Phaser from 'phaser';
import { AISystem, AIConfig, AIDecision, AIRole } from '../systems/AISystem';

export class TeammateAI extends Phaser.Physics.Arcade.Sprite {
  // AI
  public aiConfig: AIConfig;
  public aiSystem!: AISystem;  // Will be set externally from RunScene
  private currentDecision?: AIDecision;
  private decisionTimer: number = 0;
  public currentState: string = 'idle';  // For debug display
  
  // Stuck detection
  private lastPosition: { x: number; y: number } = { x: 0, y: 0 };
  private stuckTime: number = 0;
  private readonly STUCK_THRESHOLD_MS = 600;
  private readonly STUCK_SPEED_THRESHOLD = 5;
  
  // State
  public hasBall: boolean = false;
  public isStunned: boolean = false;
  
  // Stats
  public speed: number = 180;
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
  
  constructor(scene: Phaser.Scene, x: number, y: number, role: AIRole, colorIndex: number = 0, sharedAISystem?: AISystem) {
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
    
    // Use shared AISystem if provided, otherwise create local one
    this.aiSystem = sharedAISystem || new AISystem(scene);
    
    // Initialize stuck detection
    this.lastPosition = { x, y };
    this.stuckTime = 0;
    
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
    
    // Stuck detection - if AI is barely moving for too long, force new decision
    const speed = Math.sqrt(this.body!.velocity.x ** 2 + this.body!.velocity.y ** 2);
    const distMoved = Phaser.Math.Distance.Between(this.x, this.y, this.lastPosition.x, this.lastPosition.y);
    
    if (speed < this.STUCK_SPEED_THRESHOLD && distMoved < 3) {
      this.stuckTime += delta;
      if (this.stuckTime > this.STUCK_THRESHOLD_MS) {
        // Force a new decision immediately
        this.decisionTimer = 0;
        this.stuckTime = 0;
        this.currentDecision = undefined;  // Clear stale decision
      }
    } else {
      this.stuckTime = 0;
    }
    this.lastPosition = { x: this.x, y: this.y };
    
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
    if (!this.currentDecision) {
      this.currentState = 'no_decision';
      return;
    }
    
    const decision = this.currentDecision;
    
    // Update current state for debug
    if (this.hasBall) {
      this.currentState = 'CARRIER';
    } else if (decision.action === 'tackle') {
      this.currentState = 'PRESS';
    } else if (decision.priority >= 7) {
      this.currentState = 'DEFEND';
    } else if (decision.priority >= 5) {
      this.currentState = 'SUPPORT';
    } else {
      this.currentState = 'SHAPE';
    }
    
    switch (decision.action) {
      case 'move':
        this.currentState = this.hasBall ? 'CARRIER' : (decision.priority >= 6 ? 'SUPPORT' : 'MOVE');
        this.moveToward(decision.targetX!, decision.targetY!, delta);
        break;
        
      case 'shoot':
        this.currentState = 'SHOOT';
        if (this.hasBall) {
          this.shoot(decision.targetX!, decision.targetY!);
        }
        break;
        
      case 'pass':
        this.currentState = 'PASS';
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
    
    // Stronger shot power for teammates + close range detection
    const distToTarget = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
    const closeRange = distToTarget < 150;
    const basePower = 1000 + this.aiConfig.skill * 150;  // Much stronger
    const power = closeRange ? basePower * 0.9 : basePower;
    
    // Less inaccuracy at close range
    const inaccuracy = closeRange ? 0.1 : 0.2;
    const finalAngle = angle + (Math.random() - 0.5) * inaccuracy;
    
    this.hasBall = false;
    
    console.log(`[TEAMMATE SHOOT] closeRange=${closeRange} power=${Math.round(power)}`);
    
    if (this.onShoot) {
      this.onShoot(power, finalAngle);
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
