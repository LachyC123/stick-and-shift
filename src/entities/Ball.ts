// Ball entity for Stick & Shift
// Field hockey ball with physics and ownership

import Phaser from 'phaser';

export class Ball extends Phaser.Physics.Arcade.Sprite {
  // Ownership
  public owner: any = null;  // Player, TeammateAI, or EnemyAI
  
  // Physics
  private baseSpeed: number = 400;
  private friction: number = 0.985;
  private bounceAmount: number = 0.8;
  
  // State
  public isLoose: boolean = true;
  public isAerial: boolean = false;
  public lastOwner: any = null;
  public lastShooter: any = null;
  public isRebound: boolean = false;
  
  // Special effects
  private curveAmount: number = 0;
  private isBoomerang: boolean = false;
  private boomerangOrigin?: { x: number; y: number };
  private isPredictive: boolean = false;
  private speedMultiplier: number = 1;
  private magnetTarget?: { x: number; y: number };
  
  // Visual
  private trail: Phaser.GameObjects.Graphics;
  private trailPoints: { x: number; y: number; alpha: number }[] = [];
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'ball');
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Physics setup
    this.setCircle(8, 2, 2);
    this.setBounce(this.bounceAmount);
    this.setCollideWorldBounds(true);
    this.setDrag(50);
    this.setDepth(15);
    
    // Trail effect
    this.trail = scene.add.graphics();
    this.trail.setDepth(14);
  }
  
  update(delta: number): void {
    // Handle ownership
    if (this.owner) {
      this.followOwner();
    } else {
      this.updatePhysics(delta);
    }
    
    // Update trail
    this.updateTrail();
    
    // Check for rebound
    this.checkRebound();
    
    // Handle boomerang
    if (this.isBoomerang && this.boomerangOrigin && this.isLoose) {
      this.handleBoomerang();
    }
    
    // Handle magnet effect
    if (this.magnetTarget) {
      this.handleMagnet();
    }
  }
  
  private followOwner(): void {
    if (!this.owner) return;
    
    // Get offset position from owner
    const offset = this.owner.getBallOffset?.() || { x: this.owner.x + 25, y: this.owner.y };
    
    // Apply slight bobble for dribbling feel
    const bobble = Math.sin(this.scene.time.now * 0.01) * 2;
    
    this.setPosition(offset.x + bobble * 0.5, offset.y + bobble * 0.3);
    this.setVelocity(0, 0);
    this.isLoose = false;
  }
  
  private updatePhysics(delta: number): void {
    // Apply friction
    const vel = this.body!.velocity;
    this.setVelocity(vel.x * this.friction, vel.y * this.friction);
    
    // Apply curve if set
    if (this.curveAmount !== 0) {
      const speed = vel.length();
      if (speed > 50) {
        const perpX = -vel.y / speed;
        const perpY = vel.x / speed;
        this.setVelocity(
          vel.x + perpX * this.curveAmount * speed * 0.05,
          vel.y + perpY * this.curveAmount * speed * 0.05
        );
        // Decay curve
        this.curveAmount *= 0.98;
      }
    }
    
    // Stop if very slow
    if (vel.length() < 10) {
      this.setVelocity(0, 0);
    }
  }
  
  private updateTrail(): void {
    const speed = this.body!.velocity.length();
    
    // Only show trail when moving fast
    if (speed > 100) {
      this.trailPoints.unshift({ x: this.x, y: this.y, alpha: 1 });
    }
    
    // Limit trail length
    if (this.trailPoints.length > 10) {
      this.trailPoints.pop();
    }
    
    // Fade trail points
    this.trailPoints.forEach((p, i) => {
      p.alpha *= 0.85;
    });
    
    // Remove faded points
    this.trailPoints = this.trailPoints.filter(p => p.alpha > 0.05);
    
    // Draw trail
    this.trail.clear();
    this.trailPoints.forEach((point, i) => {
      const size = 6 * (1 - i / this.trailPoints.length);
      this.trail.fillStyle(0xffffff, point.alpha * 0.5);
      this.trail.fillCircle(point.x, point.y, size);
    });
  }
  
  private checkRebound(): void {
    // Check if ball bounced off goal backboard
    const vel = this.body!.velocity;
    if (this.lastShooter && vel.length() > 50) {
      // Ball is still moving after a shot - could be rebound
      this.isRebound = true;
    }
    
    // Reset after ball slows
    if (vel.length() < 30) {
      this.scene.time.delayedCall(500, () => {
        this.isRebound = false;
        this.lastShooter = null;
      });
    }
  }
  
  private handleBoomerang(): void {
    if (!this.boomerangOrigin) return;
    
    const vel = this.body!.velocity;
    if (vel.length() < 100) {
      // Ball slowing down, return to origin
      const dx = this.boomerangOrigin.x - this.x;
      const dy = this.boomerangOrigin.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 30) {
        this.setVelocity(dx * 2, dy * 2);
      } else {
        this.isBoomerang = false;
        this.boomerangOrigin = undefined;
      }
    }
  }
  
  private handleMagnet(): void {
    if (!this.magnetTarget) return;
    
    const dx = this.magnetTarget.x - this.x;
    const dy = this.magnetTarget.y - this.y;
    
    const vel = this.body!.velocity;
    this.setVelocity(
      vel.x + dx * 0.02,
      vel.y + dy * 0.02
    );
  }
  
  // Shoot the ball
  shoot(power: number, angle: number, shooter: any): void {
    this.owner = null;
    this.lastOwner = shooter;
    this.lastShooter = shooter;
    this.isLoose = true;
    
    const speed = power * this.speedMultiplier;
    this.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    
    // Reset special states
    this.speedMultiplier = 1;
  }
  
  // Pass the ball
  pass(power: number, angle: number, passer: any): void {
    this.owner = null;
    this.lastOwner = passer;
    this.isLoose = true;
    
    const speed = power * 0.7 * this.speedMultiplier;  // Passes are slower
    this.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    
    // Set boomerang if enabled
    if (this.isBoomerang) {
      this.boomerangOrigin = { x: passer.x, y: passer.y };
    }
    
    this.speedMultiplier = 1;
  }
  
  // Attach to new owner
  attachTo(newOwner: any): void {
    this.lastOwner = this.owner;
    this.owner = newOwner;
    this.isLoose = false;
    this.isRebound = false;
    this.lastShooter = null;
    
    // Reset special effects
    this.curveAmount = 0;
    this.isBoomerang = false;
    this.boomerangOrigin = undefined;
    this.isPredictive = false;
    this.magnetTarget = undefined;
  }
  
  // Drop ball (tackle, etc.)
  drop(): void {
    this.lastOwner = this.owner;
    this.owner = null;
    this.isLoose = true;
    
    // Small random velocity
    const randomAngle = Math.random() * Math.PI * 2;
    const randomSpeed = 50 + Math.random() * 50;
    this.setVelocity(
      Math.cos(randomAngle) * randomSpeed,
      Math.sin(randomAngle) * randomSpeed
    );
  }
  
  // Reset to center
  resetToCenter(): void {
    this.setPosition(600, 350);  // Center of field
    this.setVelocity(0, 0);
    this.owner = null;
    this.lastOwner = null;
    this.lastShooter = null;
    this.isLoose = true;
    this.isRebound = false;
    
    // Clear trail
    this.trailPoints = [];
    this.trail.clear();
    
    // Reset special effects
    this.curveAmount = 0;
    this.isBoomerang = false;
    this.boomerangOrigin = undefined;
    this.isPredictive = false;
    this.magnetTarget = undefined;
    this.speedMultiplier = 1;
  }
  
  // Special effect setters
  setCurve(amount: number): void {
    this.curveAmount = amount;
  }
  
  setBoomerang(enabled: boolean): void {
    this.isBoomerang = enabled;
  }
  
  setPredictive(enabled: boolean): void {
    this.isPredictive = enabled;
  }
  
  setAerial(enabled: boolean): void {
    this.isAerial = enabled;
    if (enabled) {
      // Brief aerial animation
      this.scene.tweens.add({
        targets: this,
        scaleY: 1.5,
        duration: 200,
        yoyo: true
      });
    }
  }
  
  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }
  
  applyMagnet(targetX: number, targetY: number, strength: number): void {
    this.magnetTarget = { x: targetX, y: targetY };
    
    // Clear magnet after short time
    this.scene.time.delayedCall(100, () => {
      this.magnetTarget = undefined;
    });
  }
  
  // Check if ball was just shot (for rebound detection)
  wasRecentlyShot(): boolean {
    return this.lastShooter !== null && this.body!.velocity.length() > 100;
  }
  
  // Get predicted position
  getPredictedPosition(timeAhead: number): { x: number; y: number } {
    const vel = this.body!.velocity;
    return {
      x: this.x + vel.x * timeAhead * 0.001,
      y: this.y + vel.y * timeAhead * 0.001
    };
  }
  
  destroy(fromScene?: boolean): void {
    this.trail.destroy();
    super.destroy(fromScene);
  }
}
