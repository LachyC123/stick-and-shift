// Ball entity for Stick & Shift
// Field hockey ball with physics and ownership
// Improved: central tuning, kick() method, better physics

import Phaser from 'phaser';
import * as TUNING from '../data/tuning';

export type PossessionTeam = 'player' | 'enemy' | 'none';
export type PossessionReason = 'tackle' | 'intercept' | 'pickup' | 'passReceive' | 'kickoff' | 'goal';

export class Ball extends Phaser.Physics.Arcade.Sprite {
  // Ownership
  public owner: any = null;  // Player, TeammateAI, or EnemyAI
  
  // State
  public isLoose: boolean = true;
  public isAerial: boolean = false;
  public lastOwner: any = null;
  public lastShooter: any = null;
  public isRebound: boolean = false;
  
  // Possession tracking for steal detection
  public lastPossessingTeam: PossessionTeam = 'none';
  
  // Shot origin tracking (for D-circle scoring rule) - LEGACY
  public lastShotTeam: PossessionTeam = 'none';
  public lastShotFromInsideD: boolean = false;
  public lastShotTime: number = 0;
  public lastShotX: number = 0;
  public lastShotY: number = 0;
  
  // === ROBUST D-CIRCLE TOUCH TRACKING (Part A - FIX) ===
  // Tracks ANY touch in the attacking D (shot, pass, dribble, deflect, receive, tackle)
  public lastTouchInDTeam: PossessionTeam = 'none';
  public lastTouchInDTime: number = 0;
  public lastTouchInDKind: string = 'none';  // shot/pass/dribble/deflect/receive/tackle/intercept
  public lastTouchInDX: number = 0;
  public lastTouchInDY: number = 0;
  public lastToucherId: string = '';
  
  // Pass targeting for assist logic
  public intendedReceiver: any = null;
  public passStartTime: number = 0;
  public noRecaptureUntil: number = 0;  // Passer can't pick up until this time
  
  // Position tracking for goal crossing detection
  public prevX: number = 0;
  public prevY: number = 0;
  
  // Special effects
  private curveAmount: number = 0;
  private spinAmount: number = 0;
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
    this.setBounce(TUNING.BALL_BOUNCE);
    this.setCollideWorldBounds(true);
    this.setDrag(30);  // Low drag, we handle friction manually
    this.setMaxVelocity(TUNING.BALL_MAX_SPEED, TUNING.BALL_MAX_SPEED);
    this.setDepth(15);
    
    // Store initial position
    this.prevX = x;
    this.prevY = y;
    
    // Trail effect
    this.trail = scene.add.graphics();
    this.trail.setDepth(14);
  }
  
  update(delta: number): void {
    // Store previous position for crossing detection
    this.prevX = this.x;
    this.prevY = this.y;
    
    // Handle ownership
    if (this.owner) {
      this.followOwner();
    } else {
      this.updatePhysics(delta);
      
      // Apply pass receive assist
      this.applyReceiveAssist();
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
    const bobble = Math.sin(this.scene.time.now * 0.012) * 2.5;
    
    this.setPosition(offset.x + bobble * 0.5, offset.y + bobble * 0.3);
    this.setVelocity(0, 0);
    this.isLoose = false;
  }
  
  private updatePhysics(delta: number): void {
    const vel = this.body!.velocity;
    const speed = vel.length();
    
    // Apply custom drag/friction
    if (speed > TUNING.BALL_STOP_THRESHOLD) {
      this.setVelocity(vel.x * TUNING.BALL_DRAG, vel.y * TUNING.BALL_DRAG);
    }
    
    // Apply spin/curve if set
    if (this.spinAmount !== 0 && speed > 50) {
      const perpX = -vel.y / speed;
      const perpY = vel.x / speed;
      this.setVelocity(
        vel.x + perpX * this.spinAmount * speed,
        vel.y + perpY * this.spinAmount * speed
      );
      // Decay spin
      this.spinAmount *= TUNING.SHOT_SPIN_DECAY;
      if (Math.abs(this.spinAmount) < 0.001) {
        this.spinAmount = 0;
      }
    }
    
    // Apply legacy curve if set
    if (this.curveAmount !== 0 && speed > 50) {
      const perpX = -vel.y / speed;
      const perpY = vel.x / speed;
      this.setVelocity(
        vel.x + perpX * this.curveAmount * speed * 0.05,
        vel.y + perpY * this.curveAmount * speed * 0.05
      );
      this.curveAmount *= 0.98;
    }
    
    // Clamp to max speed
    if (speed > TUNING.BALL_MAX_SPEED) {
      const scale = TUNING.BALL_MAX_SPEED / speed;
      this.setVelocity(vel.x * scale, vel.y * scale);
    }
    
    // Stop if very slow
    if (speed < TUNING.BALL_STOP_THRESHOLD) {
      this.setVelocity(0, 0);
    }
  }
  
  private updateTrail(): void {
    const speed = this.body!.velocity.length();
    
    // Only show trail when moving fast
    if (speed > 150) {
      this.trailPoints.unshift({ x: this.x, y: this.y, alpha: 1 });
    }
    
    // Limit trail length
    if (this.trailPoints.length > 12) {
      this.trailPoints.pop();
    }
    
    // Fade trail points
    this.trailPoints.forEach((p) => {
      p.alpha *= 0.82;
    });
    
    // Remove faded points
    this.trailPoints = this.trailPoints.filter(p => p.alpha > 0.05);
    
    // Draw trail
    this.trail.clear();
    this.trailPoints.forEach((point, i) => {
      const size = 7 * (1 - i / this.trailPoints.length);
      this.trail.fillStyle(0xffffff, point.alpha * 0.6);
      this.trail.fillCircle(point.x, point.y, size);
    });
  }
  
  private checkRebound(): void {
    const vel = this.body!.velocity;
    if (this.lastShooter && vel.length() > 50) {
      this.isRebound = true;
    }
    
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
      vel.x + dx * 0.025,
      vel.y + dy * 0.025
    );
  }
  
  /**
   * Unified kick method for shooting, passing, and any ball propulsion
   * @param direction Normalized direction vector
   * @param speed Speed in pixels/sec
   * @param spin Optional lateral spin (positive = right curve)
   * @param reason What caused this kick
   */
  kick(
    direction: { x: number; y: number },
    speed: number,
    spin: number = 0,
    reason: 'pass' | 'shot' | 'tackle' | 'drop' = 'shot'
  ): void {
    // Normalize direction
    const len = Math.sqrt(direction.x * direction.x + direction.y * direction.y) || 1;
    const dirX = direction.x / len;
    const dirY = direction.y / len;
    
    // Apply speed multiplier from upgrades
    const finalSpeed = Math.min(speed * this.speedMultiplier, TUNING.BALL_MAX_SPEED);
    
    // Set velocity
    this.setVelocity(dirX * finalSpeed, dirY * finalSpeed);
    
    // Apply spin for shots
    if (spin !== 0) {
      this.spinAmount = spin;
    }
    
    // Clear trail for fresh start
    if (reason === 'shot') {
      this.trailPoints = [];
    }
    
    // Reset multiplier
    this.speedMultiplier = 1;
  }
  
  // Shoot the ball (uses kick internally)
  shoot(power: number, angle: number, shooter: any): void {
    this.owner = null;
    this.lastOwner = shooter;
    this.lastShooter = shooter;
    this.isLoose = true;
    
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const spin = TUNING.SHOT_SPIN_BASE * (Math.random() - 0.5) * 2;
    
    this.kick(direction, power, spin, 'shot');
  }
  
  /**
   * Record shot origin for D-circle scoring validation
   * Called by RunScene when any shot is taken
   */
  recordShotOrigin(shooterX: number, shooterY: number, team: PossessionTeam, isInsideD: boolean): void {
    this.lastShotTeam = team;
    this.lastShotFromInsideD = isInsideD;
    this.lastShotTime = this.scene.time.now;
    this.lastShotX = shooterX;
    this.lastShotY = shooterY;
    
    // Debug log
    console.log(`[SHOT_ORIGIN] Team: ${team}, InD: ${isInsideD}, Pos: (${Math.round(shooterX)}, ${Math.round(shooterY)})`);
  }
  
  /**
   * Check if the last shot was recent enough to count for a goal
   */
  isLastShotRecent(): boolean {
    return this.scene.time.now - this.lastShotTime < TUNING.SHOT_TO_GOAL_MAX_MS;
  }
  
  /**
   * Clear shot origin (e.g., after goal or reset)
   */
  clearShotOrigin(): void {
    this.lastShotTeam = 'none';
    this.lastShotFromInsideD = false;
    this.lastShotTime = 0;
    this.lastShotX = 0;
    this.lastShotY = 0;
  }
  
  /**
   * === ROBUST D-CIRCLE TOUCH REGISTRATION (Part A) ===
   * Call this whenever ANY entity touches the ball (shot, pass, receive, dribble, tackle, deflect)
   * The goal scoring gate uses lastTouchInD to validate goals
   * 
   * @param toucherTeam - 'player' or 'enemy'
   * @param toucherId - unique identifier for the toucher
   * @param x - position of toucher when touching
   * @param y - position of toucher when touching
   * @param kind - type of touch: 'shot'|'pass'|'dribble'|'receive'|'tackle'|'deflect'|'intercept'
   * @param isInAttackingD - whether toucher is in their ATTACKING D
   */
  registerTouch(
    toucherTeam: PossessionTeam,
    toucherId: string,
    x: number,
    y: number,
    kind: string,
    isInAttackingD: boolean
  ): void {
    // Always update general touch info
    const now = this.scene.time.now;
    
    // If this touch is in the attacking D, record it as potential goal-scoring touch
    if (isInAttackingD) {
      this.lastTouchInDTeam = toucherTeam;
      this.lastTouchInDTime = now;
      this.lastTouchInDKind = kind;
      this.lastTouchInDX = x;
      this.lastTouchInDY = y;
      this.lastToucherId = toucherId;
      
      console.log(`[TOUCH_IN_D] Team: ${toucherTeam}, Kind: ${kind}, Pos: (${Math.round(x)}, ${Math.round(y)})`);
    }
  }
  
  /**
   * Check if last touch in D was recent enough for goal validation
   */
  isLastTouchInDRecent(): boolean {
    return this.scene.time.now - this.lastTouchInDTime < TUNING.SHOT_TO_GOAL_MAX_MS;
  }
  
  /**
   * Clear all touch tracking (e.g., on goal or reset)
   */
  clearTouchTracking(): void {
    this.lastTouchInDTeam = 'none';
    this.lastTouchInDTime = 0;
    this.lastTouchInDKind = 'none';
    this.lastTouchInDX = 0;
    this.lastTouchInDY = 0;
    this.lastToucherId = '';
  }
  
  /**
   * Get debug info for touch tracking
   */
  getTouchDebugInfo(): { team: PossessionTeam; kind: string; msAgo: number; x: number; y: number } {
    return {
      team: this.lastTouchInDTeam,
      kind: this.lastTouchInDKind,
      msAgo: this.scene.time.now - this.lastTouchInDTime,
      x: this.lastTouchInDX,
      y: this.lastTouchInDY
    };
  }
  
  // Pass the ball (uses kick internally)
  pass(power: number, angle: number, passer: any, intendedReceiver?: any): void {
    this.owner = null;
    this.lastOwner = passer;
    this.isLoose = true;
    
    // Set pass targeting for receive assist
    this.intendedReceiver = intendedReceiver || null;
    this.passStartTime = this.scene.time.now;
    this.noRecaptureUntil = this.scene.time.now + TUNING.PASS_NO_RECAPTURE_MS;
    
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    
    this.kick(direction, power, 0, 'pass');
    
    // Set boomerang if enabled
    if (this.isBoomerang) {
      this.boomerangOrigin = { x: passer.x, y: passer.y };
    }
  }
  
  /**
   * Check if entity can pick up the ball (respects no-recapture window)
   */
  canBePickedUpBy(entity: any): boolean {
    // If no-recapture is active and entity is the passer, block it
    if (this.scene.time.now < this.noRecaptureUntil && entity === this.lastOwner) {
      return false;
    }
    return true;
  }
  
  /**
   * Apply receive assist - curve ball toward intended receiver
   * Called each frame during pass travel
   */
  applyReceiveAssist(): void {
    if (!this.intendedReceiver || !this.isLoose) return;
    
    const timeSincePass = this.scene.time.now - this.passStartTime;
    if (timeSincePass > TUNING.PASS_RECEIVE_ASSIST_MS) {
      // Assist window expired
      this.intendedReceiver = null;
      return;
    }
    
    const receiver = this.intendedReceiver;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, receiver.x, receiver.y);
    
    if (dist < TUNING.PASS_RECEIVE_RADIUS && dist > 10) {
      // Curve toward receiver
      const dx = receiver.x - this.x;
      const dy = receiver.y - this.y;
      const vel = this.body!.velocity;
      
      this.setVelocity(
        vel.x + dx * TUNING.PASS_RECEIVE_CURVE,
        vel.y + dy * TUNING.PASS_RECEIVE_CURVE
      );
    }
  }
  
  // Attach to new owner
  /**
   * Attach ball to a new owner
   * Returns the previous possessing team for steal detection
   */
  attachTo(newOwner: any): PossessionTeam {
    const prevTeam = this.lastPossessingTeam;
    
    this.lastOwner = this.owner;
    this.owner = newOwner;
    this.isLoose = false;
    this.isRebound = false;
    this.lastShooter = null;
    
    // Update possession team tracking
    if (newOwner) {
      this.lastPossessingTeam = this.getTeamOf(newOwner);
    }
    
    // Clear pass targeting
    this.intendedReceiver = null;
    this.noRecaptureUntil = 0;
    
    // Reset special effects
    this.curveAmount = 0;
    this.spinAmount = 0;
    this.isBoomerang = false;
    this.boomerangOrigin = undefined;
    this.isPredictive = false;
    this.magnetTarget = undefined;
    
    return prevTeam;
  }
  
  /**
   * Get which team an entity belongs to
   * Player and TeammateAI are 'player' team, EnemyAI is 'enemy' team
   */
  getTeamOf(entity: any): PossessionTeam {
    if (!entity) return 'none';
    
    // Check if it's an enemy (has enemyType property or specific constructor name)
    if (entity.enemyType !== undefined || entity.constructor?.name === 'EnemyAI') {
      return 'enemy';
    }
    
    // Check if it's player or teammate
    if (entity.character !== undefined || entity.constructor?.name === 'Player' || 
        entity.constructor?.name === 'TeammateAI' || entity.aiConfig?.role !== undefined) {
      // TeammateAI has aiConfig but no enemyType, Player has character
      if (entity.enemyType === undefined) {
        return 'player';
      }
    }
    
    return 'none';
  }
  
  /**
   * Check if possession changed from enemy to player team (a steal)
   */
  wasStolen(prevTeam: PossessionTeam, newTeam: PossessionTeam): boolean {
    return prevTeam === 'enemy' && newTeam === 'player';
  }
  
  /**
   * Set the last possessing team (for initialization)
   */
  setLastPossessingTeam(team: PossessionTeam): void {
    this.lastPossessingTeam = team;
  }
  
  // Drop ball (tackle, etc.)
  drop(): void {
    this.lastOwner = this.owner;
    this.owner = null;
    this.isLoose = true;
    
    // Small random velocity
    const randomAngle = Math.random() * Math.PI * 2;
    const randomSpeed = TUNING.KICK_IMPULSE_MIN + Math.random() * (TUNING.KICK_IMPULSE_MAX - TUNING.KICK_IMPULSE_MIN);
    this.setVelocity(
      Math.cos(randomAngle) * randomSpeed,
      Math.sin(randomAngle) * randomSpeed
    );
  }
  
  // Reset to center
  resetToCenter(): void {
    this.setPosition(600, 350);
    this.setVelocity(0, 0);
    this.owner = null;
    this.lastOwner = null;
    this.lastShooter = null;
    this.isLoose = true;
    this.isRebound = false;
    this.prevX = 600;
    this.prevY = 350;
    
    // Reset possession tracking (ball is neutral until kickoff)
    this.lastPossessingTeam = 'none';
    
    // Clear shot origin tracking
    this.clearShotOrigin();
    
    // Clear touch tracking (Part A fix)
    this.clearTouchTracking();
    
    // Clear trail
    this.trailPoints = [];
    this.trail.clear();
    
    // Reset special effects
    this.curveAmount = 0;
    this.spinAmount = 0;
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
  
  setSpin(amount: number): void {
    this.spinAmount = amount;
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
  
  // Get current speed
  getSpeed(): number {
    return this.body!.velocity.length();
  }
  
  // Check if ball crossed a vertical line (for goal detection)
  crossedLine(lineX: number, direction: 'left' | 'right'): boolean {
    if (direction === 'right') {
      return this.prevX < lineX && this.x >= lineX;
    } else {
      return this.prevX > lineX && this.x <= lineX;
    }
  }
  
  destroy(fromScene?: boolean): void {
    this.trail.destroy();
    super.destroy(fromScene);
  }
}
