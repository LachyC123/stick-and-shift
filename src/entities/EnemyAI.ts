// EnemyAI entity for Stick & Shift
// AI-controlled enemy player

import Phaser from 'phaser';
import { AISystem, AIConfig, AIDecision, AIRole } from '../systems/AISystem';

export type EnemyType = 'normal' | 'boss' | 'orange';

export class EnemyAI extends Phaser.Physics.Arcade.Sprite {
  // AI
  public aiConfig: AIConfig;
  public aiSystem: AISystem;
  private currentDecision?: AIDecision;
  private decisionTimer: number = 0;
  
  // Type
  public enemyType: EnemyType;
  public role: AIRole;
  
  // State
  public hasBall: boolean = false;
  public isStunned: boolean = false;
  
  // Stats
  private speed: number = 160;
  private tackleRange: number = 40;
  private shotPower: number = 280;
  
  // Visual
  private facingAngle: number = Math.PI;  // Face left by default
  
  // References
  public player?: any;
  public playerTeammates: any[] = [];
  public enemyTeammates: EnemyAI[] = [];
  public ball?: any;
  
  // Callbacks
  public onShoot?: (power: number, angle: number) => void;
  public onPass?: (angle: number, target: any) => void;
  public onTackle?: (target: any) => void;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    role: AIRole,
    enemyType: EnemyType = 'normal',
    difficulty: number = 0.5
  ) {
    // Choose texture based on type
    let textureKey = 'enemy_mid';
    switch (role) {
      case 'defender':
        textureKey = 'enemy_defender';
        break;
      case 'forward':
        textureKey = 'enemy_forward';
        break;
    }
    if (enemyType === 'boss') {
      textureKey = 'enemy_boss';
    } else if (enemyType === 'orange') {
      textureKey = 'enemy_orange';
    }
    
    super(scene, x, y, textureKey);
    
    this.enemyType = enemyType;
    this.role = role;
    
    // Create AI config based on role and type
    if (enemyType === 'boss') {
      this.aiConfig = AISystem.createBossConfig('starForward');
    } else {
      switch (role) {
        case 'defender':
          this.aiConfig = AISystem.createDefenderConfig(difficulty);
          break;
        case 'forward':
          this.aiConfig = AISystem.createForwardConfig(difficulty);
          break;
        default:
          this.aiConfig = AISystem.createMidfielderConfig(difficulty);
      }
    }
    
    this.aiSystem = new AISystem(scene);
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Physics setup
    const size = enemyType === 'boss' ? 24 : 20;
    this.setCircle(size, enemyType === 'boss' ? 4 : 4, enemyType === 'boss' ? 4 : 8);
    this.setCollideWorldBounds(true);
    this.setDepth(9);
    
    // Apply stats from config
    this.speed = 160 * this.aiConfig.speed;
    this.shotPower = 250 + this.aiConfig.skill * 100;
    
    // Boss modifiers
    if (enemyType === 'boss') {
      this.speed *= 1.2;
      this.shotPower *= 1.3;
      this.tackleRange *= 1.2;
    }
    
    // Orange monster
    if (enemyType === 'orange') {
      this.speed *= 0.8;  // Slower but tankier
    }
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
    
    this.currentDecision = this.aiSystem.getEnemyDecision(
      this,
      this.ball,
      this.player,
      this.playerTeammates,
      this.enemyTeammates,
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
      this.setVelocity(
        (dx / dist) * this.speed,
        (dy / dist) * this.speed
      );
      this.facingAngle = Math.atan2(dy, dx);
    } else {
      this.setVelocity(0, 0);
    }
  }
  
  private shoot(targetX: number, targetY: number): void {
    if (!this.hasBall) return;
    
    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    
    // Add some inaccuracy based on skill
    const inaccuracy = (1 - this.aiConfig.skill) * 0.3;
    const finalAngle = angle + (Math.random() - 0.5) * inaccuracy;
    
    this.hasBall = false;
    
    if (this.onShoot) {
      this.onShoot(this.shotPower, finalAngle);
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
    
    // Boss pulsing effect
    if (this.enemyType === 'boss') {
      const pulse = 1 + Math.sin(this.scene.time.now * 0.005) * 0.05;
      this.setScale(pulse);
    }
  }
  
  // External methods
  receiveBall(): void {
    this.hasBall = true;
  }
  
  loseBall(): void {
    this.hasBall = false;
  }
  
  applyStun(duration: number): void {
    // Bosses have reduced stun
    const actualDuration = this.enemyType === 'boss' ? duration * 0.5 : duration;
    
    // Orange monsters have even more stun resistance
    const finalDuration = this.enemyType === 'orange' ? actualDuration * 0.3 : actualDuration;
    
    this.isStunned = true;
    
    this.scene.time.delayedCall(finalDuration, () => {
      this.isStunned = false;
    });
    
    // Visual feedback
    this.scene.tweens.add({
      targets: this,
      tint: 0xffff00,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(finalDuration / 200)
    });
  }
  
  applyDebuff(type: string, duration: number): void {
    if (type === 'slow') {
      const originalSpeed = this.speed;
      this.speed *= 0.6;
      this.scene.time.delayedCall(duration, () => {
        this.speed = originalSpeed;
      });
      
      // Visual
      this.setTint(0x3498db);
      this.scene.time.delayedCall(duration, () => {
        this.clearTint();
      });
    }
  }
  
  drainStamina(amount: number): void {
    // Enemies slow down briefly
    const originalSpeed = this.speed;
    this.speed *= 0.7;
    this.scene.time.delayedCall(800, () => {
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
  
  setReferences(player: any, playerTeammates: any[], enemyTeammates: EnemyAI[], ball: any): void {
    this.player = player;
    this.playerTeammates = playerTeammates;
    this.enemyTeammates = enemyTeammates.filter(e => e !== this);
    this.ball = ball;
  }
  
  // Boss special abilities
  bossAbility(): void {
    if (this.enemyType !== 'boss') return;
    
    // Example: burst of speed
    const originalSpeed = this.speed;
    this.speed *= 1.5;
    
    this.scene.time.delayedCall(1000, () => {
      this.speed = originalSpeed;
    });
    
    // Visual
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 4
    });
  }
}
