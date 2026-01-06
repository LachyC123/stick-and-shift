// AISystem for Stick & Shift
// Manages AI behavior for teammates and enemies
// Improved: team tactics, anti-huddle separation, formation shapes, smarter decisions
// Added: objective awareness, better pressing, improved tackle decisions

import Phaser from 'phaser';
import * as TUNING from '../data/tuning';
import { ObjectiveDescriptor } from './MomentSystem';

export type AIRole = 'defender' | 'midfielder' | 'forward' | 'goalkeeper' | 'sweeper';
export type AIState = 'idle' | 'chase' | 'attack' | 'defend' | 'support' | 'return' | 'press' | 'mark';
export type TeamState = 'attack' | 'defend' | 'transition';

export interface AIConfig {
  role: AIRole;
  aggressiveness: number;  // 0-1
  skill: number;           // 0-1
  speed: number;          // Base speed multiplier
  reactionTime: number;   // MS delay before reactions
}

export interface AIDecision {
  action: 'move' | 'shoot' | 'pass' | 'tackle' | 'dodge' | 'wait' | 'intercept';
  targetX?: number;
  targetY?: number;
  targetEntity?: any;
  priority: number;
  avoidance?: { x: number; y: number };
}

export interface FormationSlot {
  role: AIRole;
  baseX: number;
  baseY: number;
  attackOffset: { x: number; y: number };
  defendOffset: { x: number; y: number };
}

export class AISystem {
  private scene: Phaser.Scene;
  
  // Field dimensions
  private fieldWidth: number = 1200;
  private fieldHeight: number = 700;
  private goalWidth: number = 120;
  
  // Team states
  private playerTeamState: TeamState = 'attack';
  private enemyTeamState: TeamState = 'defend';
  private transitionTimer: number = 0;
  
  // Chase tracking (anti-huddle)
  private playerTeamChasers: Set<any> = new Set();
  private enemyTeamChasers: Set<any> = new Set();
  private primaryChaser: Map<string, any> = new Map();
  
  // Pass cooldown tracking
  private lastPassTime: Map<any, number> = new Map();
  
  // Decision timing
  private lastDecisionTime: Map<any, number> = new Map();
  
  // Failed tackle cooldown (prevents spam)
  private tackleBackoffUntil: Map<any, number> = new Map();
  
  // Current objective for AI adjustments
  private currentObjective: ObjectiveDescriptor = {
    type: 'score',
    timeRemaining: 60,
    targetTeam: 'player',
    urgency: 0
  };
  
  // Dynamic AI difficulty scaling
  private difficultyMultiplier: number = 1.0;
  private momentNumber: number = 1;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  /**
   * Set the current objective descriptor from MomentSystem
   * This allows AI to adapt behavior based on current objective
   */
  setObjective(objective: ObjectiveDescriptor): void {
    this.currentObjective = objective;
  }
  
  /**
   * Set difficulty scaling (increases with moment number)
   */
  setDifficulty(momentNumber: number, isBoss: boolean = false): void {
    this.momentNumber = momentNumber;
    // Gradual difficulty increase: +5% per moment, +20% for boss
    this.difficultyMultiplier = 1.0 + (momentNumber - 1) * 0.05 + (isBoss ? 0.20 : 0);
  }
  
  /**
   * Get adjusted AI aggression based on objective
   */
  private getAdjustedAggression(baseAggression: number): number {
    let adjustment = 0;
    
    switch (this.currentObjective.type) {
      case 'force_turnovers':
        adjustment = 0.25;  // Much more aggressive
        break;
      case 'score':
        // More aggressive when urgent
        adjustment = this.currentObjective.urgency * 0.15;
        break;
      case 'defend':
      case 'hold_possession':
        adjustment = -0.15;  // Less aggressive, more cautious
        break;
      case 'survive':
        adjustment = -0.1;
        break;
    }
    
    // Apply difficulty multiplier
    const adjustedAggression = (baseAggression + adjustment) * this.difficultyMultiplier;
    return Phaser.Math.Clamp(adjustedAggression, 0, 1);
  }
  
  /**
   * Get line of engagement (how high AI pushes) based on objective
   */
  private getLineOfEngagement(isAttacking: boolean): number {
    let baseLine = isAttacking ? 0.55 : 0.35;  // fraction of field
    
    switch (this.currentObjective.type) {
      case 'score':
        if (this.currentObjective.urgency > 0.6) {
          baseLine += 0.12;  // Push higher when urgent
        }
        break;
      case 'defend':
      case 'hold_possession':
        baseLine -= 0.08;  // Stay deeper
        break;
      case 'force_turnovers':
        baseLine += 0.1;  // High press
        break;
    }
    
    return Phaser.Math.Clamp(baseLine, 0.2, 0.85);
  }
  
  // Update team states based on possession
  updateTeamStates(ball: any, player: any, teammates: any[], enemies: any[], delta: number): void {
    const playerTeamHasBall = this.isTeamHasBall(ball, player, teammates);
    const enemyTeamHasBall = this.isEnemyHasBall(ball, enemies);
    
    // Handle transitions
    if (this.transitionTimer > 0) {
      this.transitionTimer -= delta;
      if (this.transitionTimer <= 0) {
        if (this.playerTeamState === 'transition') {
          this.playerTeamState = playerTeamHasBall ? 'attack' : 'defend';
        }
        if (this.enemyTeamState === 'transition') {
          this.enemyTeamState = enemyTeamHasBall ? 'attack' : 'defend';
        }
      }
    } else {
      // Detect possession changes
      if (playerTeamHasBall && this.playerTeamState === 'defend') {
        this.playerTeamState = 'transition';
        this.enemyTeamState = 'transition';
        this.transitionTimer = 1000;
      } else if (enemyTeamHasBall && this.enemyTeamState === 'defend') {
        this.playerTeamState = 'transition';
        this.enemyTeamState = 'transition';
        this.transitionTimer = 1000;
      }
    }
    
    // Clear chasers each frame and recalculate
    this.playerTeamChasers.clear();
    this.enemyTeamChasers.clear();
  }
  
  // Get AI decision for a teammate
  getTeammateDecision(
    entity: any,
    ball: any,
    player: any,
    teammates: any[],
    enemies: any[],
    hasBall: boolean,
    slotIndex: number = 0
  ): AIDecision {
    const config = entity.aiConfig as AIConfig;
    
    // Check decision timing
    if (!this.shouldMakeDecision(entity)) {
      return { action: 'wait', priority: 0 };
    }
    
    // Calculate separation force (anti-huddle)
    const separation = this.calculateSeparation(entity, [player, ...teammates], TUNING.AI_SEPARATION_RADIUS);
    
    let decision: AIDecision;
    
    if (hasBall) {
      decision = this.getOffensiveDecision(entity, ball, player, teammates, enemies, config);
    } else if (ball.owner === null) {
      decision = this.getLooseBallDecision(entity, ball, player, teammates, enemies, config, true, slotIndex);
    } else if (this.isTeamHasBall(ball, player, teammates)) {
      decision = this.getSupportDecision(entity, ball, player, teammates, enemies, config, slotIndex);
    } else {
      decision = this.getDefensiveDecision(entity, ball, player, teammates, enemies, config, slotIndex);
    }
    
    // Apply separation to movement decisions
    if (decision.action === 'move' && decision.targetX !== undefined && decision.targetY !== undefined) {
      decision.targetX += separation.x;
      decision.targetY += separation.y;
      
      // Clamp to field
      decision.targetX = Phaser.Math.Clamp(decision.targetX, 50, this.fieldWidth - 50);
      decision.targetY = Phaser.Math.Clamp(decision.targetY, 50, this.fieldHeight - 50);
    }
    decision.avoidance = separation;
    
    return decision;
  }
  
  // Get AI decision for an enemy
  getEnemyDecision(
    entity: any,
    ball: any,
    player: any,
    teammates: any[],
    enemies: any[],
    hasBall: boolean,
    slotIndex: number = 0
  ): AIDecision {
    const config = entity.aiConfig as AIConfig;
    
    if (!this.shouldMakeDecision(entity)) {
      return { action: 'wait', priority: 0 };
    }
    
    const separation = this.calculateSeparation(entity, enemies, TUNING.AI_SEPARATION_RADIUS);
    
    let decision: AIDecision;
    
    if (hasBall) {
      decision = this.getEnemyOffensiveDecision(entity, ball, player, teammates, enemies, config);
    } else if (ball.owner === null) {
      decision = this.getLooseBallDecision(entity, ball, player, teammates, enemies, config, false, slotIndex);
    } else if (this.isEnemyHasBall(ball, enemies)) {
      decision = this.getEnemySupportDecision(entity, ball, enemies, config, slotIndex);
    } else {
      decision = this.getEnemyDefensiveDecision(entity, ball, player, teammates, config, slotIndex);
    }
    
    if (decision.action === 'move' && decision.targetX !== undefined && decision.targetY !== undefined) {
      decision.targetX += separation.x;
      decision.targetY += separation.y;
      decision.targetX = Phaser.Math.Clamp(decision.targetX, 50, this.fieldWidth - 50);
      decision.targetY = Phaser.Math.Clamp(decision.targetY, 50, this.fieldHeight - 50);
    }
    decision.avoidance = separation;
    
    return decision;
  }
  
  // Check if entity should make a new decision (rate limiting)
  private shouldMakeDecision(entity: any): boolean {
    const lastTime = this.lastDecisionTime.get(entity) || 0;
    const now = this.scene.time.now;
    
    if (now - lastTime >= TUNING.AI_DECISION_INTERVAL) {
      this.lastDecisionTime.set(entity, now);
      return true;
    }
    return false;
  }
  
  // Calculate separation steering force (anti-huddle)
  private calculateSeparation(entity: any, others: any[], radius: number): { x: number; y: number } {
    let separationX = 0;
    let separationY = 0;
    let count = 0;
    
    for (const other of others) {
      if (other === entity || !other.x || !other.y) continue;
      
      const dx = entity.x - other.x;
      const dy = entity.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < radius && dist > 0) {
        const strength = (radius - dist) / radius;
        separationX += (dx / dist) * strength * TUNING.AI_SEPARATION_STRENGTH;
        separationY += (dy / dist) * strength * TUNING.AI_SEPARATION_STRENGTH;
        count++;
      }
    }
    
    if (count > 0) {
      separationX /= count;
      separationY /= count;
    }
    
    return { x: separationX, y: separationY };
  }
  
  // Check if entity can chase ball (with hysteresis)
  private canChaseLooseBall(entity: any, ball: any, allTeam: any[], isPlayerTeam: boolean): boolean {
    const chasers = isPlayerTeam ? this.playerTeamChasers : this.enemyTeamChasers;
    const key = isPlayerTeam ? 'player' : 'enemy';
    
    // Already a chaser
    if (chasers.has(entity)) {
      return true;
    }
    
    // Find distances to ball
    const distances = allTeam.map(t => ({
      entity: t,
      dist: Phaser.Math.Distance.Between(t.x, t.y, ball.x, ball.y)
    }));
    distances.sort((a, b) => a.dist - b.dist);
    
    const myDist = Phaser.Math.Distance.Between(entity.x, entity.y, ball.x, ball.y);
    const myRank = distances.findIndex(d => d.entity === entity);
    
    // Primary chaser with hysteresis
    const currentPrimary = this.primaryChaser.get(key);
    if (currentPrimary && allTeam.includes(currentPrimary)) {
      const primaryDist = Phaser.Math.Distance.Between(currentPrimary.x, currentPrimary.y, ball.x, ball.y);
      
      // Only take over if significantly closer
      if (entity !== currentPrimary && myDist < primaryDist - TUNING.AI_CHASER_HYSTERESIS) {
        this.primaryChaser.set(key, entity);
      }
    } else {
      if (myRank === 0) {
        this.primaryChaser.set(key, entity);
      }
    }
    
    // Allow up to AI_MAX_CHASERS
    if (myRank < TUNING.AI_MAX_CHASERS) {
      chasers.add(entity);
      return true;
    }
    
    return false;
  }
  
  /**
   * Carrier brain for teammate with ball - decide: PASS / SHOOT / DRIBBLE
   */
  private getOffensiveDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig): AIDecision {
    const goalX = this.fieldWidth;
    const goalY = this.fieldHeight / 2;
    
    const distToGoal = Phaser.Math.Distance.Between(entity.x, entity.y, goalX, goalY);
    
    // Count nearby pressure
    const nearbyEnemies = enemies.filter(e =>
      Phaser.Math.Distance.Between(entity.x, entity.y, e.x, e.y) < TUNING.AI_PRESSURE_RADIUS
    );
    const isPressured = nearbyEnemies.length > 0;
    
    const canPass = !this.isOnPassCooldown(entity);
    
    // === CHECK FOR PLAYER CALLING FOR PASS (highest priority) ===
    if (canPass && player.isCallingForPass) {
      const passTarget = this.findBestPassTarget(entity, player, teammates, enemies, true);
      if (passTarget === player) {
        this.setPassCooldown(entity);
        return { action: 'pass', targetEntity: player, priority: 12 };
      }
    }
    
    // === CHECK SHOOTING OPPORTUNITY ===
    if (distToGoal < TUNING.AI_SHOOT_RANGE && config.skill > 0.35) {
      const angleToGoal = Math.atan2(goalY - entity.y, goalX - entity.x);
      const hasGoodAngle = Math.abs(angleToGoal) < TUNING.AI_SHOOT_ANGLE_THRESHOLD;
      
      // Check if shot is clear
      const blockers = enemies.filter(e => {
        const distToEnemy = Phaser.Math.Distance.Between(entity.x, entity.y, e.x, e.y);
        return distToEnemy < 70 && e.x > entity.x;
      });
      
      if (blockers.length === 0 && hasGoodAngle && !isPressured) {
        return { action: 'shoot', targetX: goalX, targetY: goalY, priority: 10 };
      }
    }
    
    // === PASS WHEN PRESSURED ===
    if (isPressured && canPass) {
      const passTarget = this.findBestPassTarget(entity, player, teammates, enemies, true);
      if (passTarget) {
        this.setPassCooldown(entity);
        return { action: 'pass', targetEntity: passTarget, priority: 9 };
      }
    }
    
    // === PASS IF TEAMMATE IS IN BETTER POSITION ===
    if (canPass) {
      const passTarget = this.findBestPassTarget(entity, player, teammates, enemies, true);
      if (passTarget) {
        // Check if teammate is significantly more dangerous
        const myDangerScore = this.getDangerScore(entity, goalX, goalY, enemies);
        const targetDangerScore = this.getDangerScore(passTarget, goalX, goalY, enemies);
        
        // Pass if teammate is clearly better positioned
        if (targetDangerScore > myDangerScore + 15) {
          this.setPassCooldown(entity);
          return { action: 'pass', targetEntity: passTarget, priority: 8 };
        }
      }
    }
    
    // === PASS WHEN OBJECTIVE ENCOURAGES POSSESSION ===
    if (canPass && this.currentObjective.type === 'hold_possession') {
      const passTarget = this.findBestPassTarget(entity, player, teammates, enemies, true);
      if (passTarget && Math.random() < 0.4) {  // 40% chance to pass when safe
        this.setPassCooldown(entity);
        return { action: 'pass', targetEntity: passTarget, priority: 7 };
      }
    }
    
    // === POOR SHOOTING ANGLE - LOOK FOR PASS ===
    if (distToGoal < 280 && canPass) {
      const angleToGoal = Math.atan2(goalY - entity.y, goalX - entity.x);
      const absAngle = Math.abs(angleToGoal);
      
      if (absAngle > TUNING.AI_SHOOT_ANGLE_THRESHOLD) {
        const passTarget = this.findBestPassTarget(entity, player, teammates, enemies, true);
        if (passTarget) {
          this.setPassCooldown(entity);
          return { action: 'pass', targetEntity: passTarget, priority: 7 };
        }
      }
    }
    
    // === DRIBBLE TOWARD GOAL ===
    const moveTarget = this.findDribbleTarget(entity, enemies, goalX, goalY);
    return { action: 'move', targetX: moveTarget.x, targetY: moveTarget.y, priority: 5 };
  }
  
  /**
   * Calculate how "dangerous" a player is (higher = closer to goal, more open)
   */
  private getDangerScore(entity: any, goalX: number, goalY: number, enemies: any[]): number {
    const distToGoal = Phaser.Math.Distance.Between(entity.x, entity.y, goalX, goalY);
    const angleToGoal = Math.atan2(goalY - entity.y, goalX - entity.x);
    
    // Distance score (closer = higher)
    const distScore = (1 - distToGoal / this.fieldWidth) * 50;
    
    // Angle score (central = higher)
    const angleScore = (1 - Math.abs(angleToGoal) / Math.PI) * 30;
    
    // Openness score
    let minEnemyDist = Infinity;
    for (const enemy of enemies) {
      const d = Phaser.Math.Distance.Between(entity.x, entity.y, enemy.x, enemy.y);
      if (d < minEnemyDist) minEnemyDist = d;
    }
    const openScore = Math.min(minEnemyDist / 100, 1) * 20;
    
    return distScore + angleScore + openScore;
  }
  
  private getLooseBallDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig, isPlayerTeam: boolean, slotIndex: number): AIDecision {
    const distToBall = Phaser.Math.Distance.Between(entity.x, entity.y, ball.x, ball.y);
    
    // Role-based chase priority
    let chaseThreshold: number;
    switch (config.role) {
      case 'forward': chaseThreshold = 380; break;
      case 'midfielder': chaseThreshold = 320; break;
      case 'defender': chaseThreshold = 220; break;
      case 'sweeper':
      case 'goalkeeper': chaseThreshold = 150; break;
      default: chaseThreshold = 280;
    }
    
    const allTeam = isPlayerTeam ? [player, ...teammates] : enemies;
    
    if (distToBall < chaseThreshold && this.canChaseLooseBall(entity, ball, allTeam, isPlayerTeam)) {
      // Chase with prediction
      const predictedPos = ball.getPredictedPosition?.(280) || { x: ball.x, y: ball.y };
      return { action: 'move', targetX: predictedPos.x, targetY: predictedPos.y, priority: 9 };
    }
    
    // Not chasing - go to formation position
    const formationPos = this.getFormationPosition(entity, config.role, slotIndex, isPlayerTeam, ball);
    return { action: 'move', targetX: formationPos.x, targetY: formationPos.y, priority: 3 };
  }
  
  /**
   * Off-ball movement when teammate has the ball
   * Creates passing triangles and support positions
   */
  private getSupportDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig, slotIndex: number): AIDecision {
    const ballCarrier = ball.owner || player;
    
    // Role-based support behavior
    const goalX = this.fieldWidth;  // Attack goal
    const allTeammates = [player, ...teammates].filter(t => t !== entity);
    
    let targetPos: { x: number; y: number };
    
    switch (config.role) {
      case 'forward':
        // Make a run ahead into space
        targetPos = this.getForwardRunPosition(entity, ballCarrier, enemies, goalX);
        break;
        
      case 'midfielder':
        // Triangle support - offer a passing angle
        targetPos = this.getTriangleSupportPosition(entity, ballCarrier, allTeammates, enemies, true);
        break;
        
      case 'defender':
      default:
        // Stay behind the ball as safety
        targetPos = this.getDefensiveSupportPosition(entity, ballCarrier, enemies, true);
        break;
    }
    
    // Apply separation from teammates
    targetPos = this.applyTeammateSeparation(targetPos, entity, allTeammates);
    
    return { action: 'move', targetX: targetPos.x, targetY: targetPos.y, priority: 6 };
  }
  
  /**
   * Get position for forward to make a run into space
   */
  private getForwardRunPosition(entity: any, carrier: any, enemies: any[], goalX: number): { x: number; y: number } {
    // Run ahead of the ball toward goal
    let targetX = carrier.x + TUNING.SUPPORT_TRIANGLE_OFFSET * 1.2;
    let targetY = entity.y;
    
    // Find space - avoid enemies
    let bestY = entity.y;
    let bestDist = 0;
    
    for (let testY = 100; testY < this.fieldHeight - 100; testY += 60) {
      let minEnemyDist = Infinity;
      for (const e of enemies) {
        const d = Phaser.Math.Distance.Between(targetX, testY, e.x, e.y);
        if (d < minEnemyDist) minEnemyDist = d;
      }
      if (minEnemyDist > bestDist) {
        bestDist = minEnemyDist;
        bestY = testY;
      }
    }
    
    targetY = Phaser.Math.Linear(entity.y, bestY, 0.3);
    targetX = Phaser.Math.Clamp(targetX, 100, this.fieldWidth - 80);
    
    return { x: targetX, y: targetY };
  }
  
  /**
   * Get triangle support position - form passing triangles
   */
  private getTriangleSupportPosition(
    entity: any, 
    carrier: any, 
    teammates: any[], 
    enemies: any[], 
    isPlayerTeam: boolean
  ): { x: number; y: number } {
    const goalX = isPlayerTeam ? this.fieldWidth : 0;
    const dirToGoal = isPlayerTeam ? 1 : -1;
    
    // Calculate angle from carrier to goal
    const angleToGoal = Math.atan2(this.fieldHeight / 2 - carrier.y, goalX - carrier.x);
    
    // Position at an angle from carrier (triangle vertex)
    // Alternate sides based on entity position
    const offsetAngle = entity.y < carrier.y 
      ? angleToGoal - Math.PI / 4  // Upper triangle
      : angleToGoal + Math.PI / 4;  // Lower triangle
    
    let targetX = carrier.x + Math.cos(offsetAngle) * TUNING.SUPPORT_TRIANGLE_OFFSET;
    let targetY = carrier.y + Math.sin(offsetAngle) * TUNING.SUPPORT_TRIANGLE_OFFSET;
    
    // Ensure we stay ahead for attack or behind for defense
    if (isPlayerTeam) {
      targetX = Math.max(targetX, carrier.x + 30);
    } else {
      targetX = Math.min(targetX, carrier.x - 30);
    }
    
    // Stay in bounds
    targetX = Phaser.Math.Clamp(targetX, 80, this.fieldWidth - 80);
    targetY = Phaser.Math.Clamp(targetY, 80, this.fieldHeight - 80);
    
    return { x: targetX, y: targetY };
  }
  
  /**
   * Defensive support - stay behind ball as outlet
   */
  private getDefensiveSupportPosition(entity: any, carrier: any, enemies: any[], isPlayerTeam: boolean): { x: number; y: number } {
    const behindDir = isPlayerTeam ? -1 : 1;
    
    let targetX = carrier.x + behindDir * 80;
    let targetY = carrier.y + (entity.y > this.fieldHeight / 2 ? -50 : 50);
    
    targetX = Phaser.Math.Clamp(targetX, 60, this.fieldWidth - 60);
    targetY = Phaser.Math.Clamp(targetY, 60, this.fieldHeight - 60);
    
    return { x: targetX, y: targetY };
  }
  
  /**
   * Apply separation from teammates to avoid clustering
   */
  private applyTeammateSeparation(pos: { x: number; y: number }, entity: any, teammates: any[]): { x: number; y: number } {
    let pushX = 0;
    let pushY = 0;
    
    for (const t of teammates) {
      if (t === entity) continue;
      const dx = pos.x - t.x;
      const dy = pos.y - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < TUNING.SUPPORT_MIN_SEPARATION && dist > 0) {
        const push = (TUNING.SUPPORT_MIN_SEPARATION - dist) / TUNING.SUPPORT_MIN_SEPARATION;
        pushX += (dx / dist) * push * 30;
        pushY += (dy / dist) * push * 30;
      }
    }
    
    return {
      x: Phaser.Math.Clamp(pos.x + pushX, 60, this.fieldWidth - 60),
      y: Phaser.Math.Clamp(pos.y + pushY, 60, this.fieldHeight - 60)
    };
  }
  
  private getDefensiveDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig, slotIndex: number): AIDecision {
    const ballCarrier = ball.owner;
    if (!ballCarrier) {
      return this.getLooseBallDecision(entity, ball, player, teammates, enemies, config, true, slotIndex);
    }
    
    const distToCarrier = Phaser.Math.Distance.Between(entity.x, entity.y, ballCarrier.x, ballCarrier.y);
    
    // Assign defensive duties based on proximity
    const allTeam = [player, ...teammates];
    const distancesToCarrier = allTeam.map(t => ({
      entity: t,
      dist: Phaser.Math.Distance.Between(t.x, t.y, ballCarrier.x, ballCarrier.y)
    }));
    distancesToCarrier.sort((a, b) => a.dist - b.dist);
    
    const isClosestDefender = distancesToCarrier[0]?.entity === entity;
    const isSecondDefender = distancesToCarrier[1]?.entity === entity;
    
    // Closest: mark ball carrier
    if (isClosestDefender) {
      // Check if we can tackle
      const canTackle = !this.isTackleOnCooldown(entity) && distToCarrier < TUNING.AI_TACKLE_RANGE;
      
      if (canTackle && config.aggressiveness > 0.4) {
        return { action: 'tackle', targetEntity: ballCarrier, priority: 10 };
      }
      
      // Press the carrier - get between them and goal
      const pressX = ballCarrier.x - 40;
      const pressY = ballCarrier.y + (entity.y > ballCarrier.y ? -20 : 20);
      return { action: 'move', targetX: pressX, targetY: pressY, priority: 8 };
    }
    
    // Second closest: cover passing lane
    if (isSecondDefender) {
      const coverPos = this.getCoverPassingLane(entity, ballCarrier, enemies);
      return { action: 'move', targetX: coverPos.x, targetY: coverPos.y, priority: 7 };
    }
    
    // Others: goalkeeper-lite / hold shape
    if (config.role === 'defender' || config.role === 'sweeper') {
      const lastManPos = this.getLastManPosition(entity, ballCarrier);
      return { action: 'move', targetX: lastManPos.x, targetY: lastManPos.y, priority: 6 };
    }
    
    // Hold formation
    const formationPos = this.getFormationPosition(entity, config.role, slotIndex, true, ball);
    return { action: 'move', targetX: formationPos.x, targetY: formationPos.y, priority: 5 };
  }
  
  /**
   * Enemy carrier brain - decide: PASS / SHOOT / DRIBBLE
   * Enemy teams should also pass to each other, creating team-like play
   */
  private getEnemyOffensiveDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig): AIDecision {
    const goalX = 0;  // Enemy goal is on the left
    const goalY = this.fieldHeight / 2;
    const defenders = [player, ...teammates];
    
    const distToGoal = Phaser.Math.Distance.Between(entity.x, entity.y, goalX, goalY);
    
    // Count nearby pressure
    const nearbyDefenders = defenders.filter(t =>
      Phaser.Math.Distance.Between(entity.x, entity.y, t.x, t.y) < TUNING.AI_PRESSURE_RADIUS
    );
    const isPressured = nearbyDefenders.length > 0;
    
    const canPass = !this.isOnPassCooldown(entity);
    const otherEnemies = enemies.filter(e => e !== entity);
    
    // Get adjusted aggression for shooting
    const aggression = this.getAdjustedAggression(config.aggressiveness);
    
    // === CHECK SHOOTING OPPORTUNITY FIRST (more aggressive shooting) ===
    // INCREASED: Shoot from longer range and wider angles
    const shootRange = TUNING.AI_SHOOT_RANGE + aggression * 80;
    
    if (distToGoal < shootRange) {
      const blockers = defenders.filter(t => {
        const distToDefender = Phaser.Math.Distance.Between(entity.x, entity.y, t.x, t.y);
        return distToDefender < 60 && t.x < entity.x;
      });
      
      const angleToGoal = Math.atan2(goalY - entity.y, goalX - entity.x);
      // More lenient angle check based on aggression
      const angleThreshold = TUNING.AI_SHOOT_ANGLE_THRESHOLD * (1 + aggression * 0.5);
      const hasGoodAngle = Math.abs(Math.abs(angleToGoal) - Math.PI) < angleThreshold;
      
      // Shoot more willingly: fewer blockers needed, or just aggressive
      const shouldShoot = (blockers.length <= 1 && hasGoodAngle) || 
                          (aggression > 0.8 && distToGoal < 300) ||
                          (config.skill > 0.65 && blockers.length === 0);
      
      if (shouldShoot) {
        // Aim slightly randomized within goal area
        const targetY = goalY + (Math.random() - 0.5) * 80;
        return { action: 'shoot', targetX: goalX, targetY, priority: 10 };
      }
    }
    
    // === PASS WHEN PRESSURED ===
    if (isPressured && canPass && otherEnemies.length > 0) {
      const passTarget = this.findBestPassTarget(entity, null, otherEnemies, defenders, false);
      if (passTarget) {
        this.setPassCooldown(entity);
        return { action: 'pass', targetEntity: passTarget, priority: 9 };
      }
    }
    
    // === PASS IF TEAMMATE IN BETTER POSITION ===
    if (canPass && otherEnemies.length > 0) {
      const passTarget = this.findBestPassTarget(entity, null, otherEnemies, defenders, false);
      if (passTarget) {
        // Check if teammate is more dangerous
        const myDangerScore = this.getEnemyDangerScore(entity, goalX, goalY, defenders);
        const targetDangerScore = this.getEnemyDangerScore(passTarget, goalX, goalY, defenders);
        
        if (targetDangerScore > myDangerScore + 12) {
          this.setPassCooldown(entity);
          return { action: 'pass', targetEntity: passTarget, priority: 8 };
        }
      }
    }
    
    // === SWITCH PLAY - pass to switch sides if blocked ===
    if (canPass && otherEnemies.length > 0) {
      // Check if forward path is blocked
      const forwardBlocked = defenders.some(d => 
        d.x < entity.x && 
        Math.abs(d.y - entity.y) < 80 &&
        Phaser.Math.Distance.Between(entity.x, entity.y, d.x, d.y) < 100
      );
      
      if (forwardBlocked) {
        // Find a wide teammate
        const wideTarget = otherEnemies.find(e => 
          Math.abs(e.y - entity.y) > 100 &&
          !this.isPassLaneBlocked(entity, e, defenders)
        );
        
        if (wideTarget) {
          this.setPassCooldown(entity);
          return { action: 'pass', targetEntity: wideTarget, priority: 7 };
        }
      }
    }
    
    // === DRIBBLE TOWARD GOAL ===
    const moveTarget = this.findDribbleTarget(entity, defenders, goalX, goalY);
    return { action: 'move', targetX: moveTarget.x, targetY: moveTarget.y, priority: 5 };
  }
  
  /**
   * Calculate danger score for enemy (toward player goal on left)
   */
  private getEnemyDangerScore(entity: any, goalX: number, goalY: number, defenders: any[]): number {
    const distToGoal = Phaser.Math.Distance.Between(entity.x, entity.y, goalX, goalY);
    
    // Distance score (closer = higher)
    const distScore = (1 - distToGoal / this.fieldWidth) * 50;
    
    // Angle score (central = higher)
    const angleToGoal = Math.atan2(goalY - entity.y, goalX - entity.x);
    const angleScore = (1 - Math.abs(Math.abs(angleToGoal) - Math.PI) / Math.PI) * 30;
    
    // Openness
    let minDefDist = Infinity;
    for (const def of defenders) {
      const d = Phaser.Math.Distance.Between(entity.x, entity.y, def.x, def.y);
      if (d < minDefDist) minDefDist = d;
    }
    const openScore = Math.min(minDefDist / 100, 1) * 20;
    
    return distScore + angleScore + openScore;
  }
  
  /**
   * Enemy off-ball movement when enemy teammate has the ball
   * Creates passing triangles for enemy team
   */
  private getEnemySupportDecision(entity: any, ball: any, enemies: any[], config: AIConfig, slotIndex: number): AIDecision {
    const ballCarrier = ball.owner;
    const otherEnemies = enemies.filter(e => e !== entity && e !== ballCarrier);
    
    // Goal for enemies is on the left (x = 0)
    const goalX = 0;
    
    let targetPos: { x: number; y: number };
    
    switch (config.role) {
      case 'forward':
        // Make a run toward player goal
        targetPos = {
          x: Phaser.Math.Clamp(ballCarrier.x - 100, 100, this.fieldWidth / 2),
          y: entity.y + (entity.y < this.fieldHeight / 2 ? 40 : -40)
        };
        break;
        
      case 'midfielder':
        // Triangle support for enemy team
        targetPos = this.getTriangleSupportPosition(entity, ballCarrier, otherEnemies, [], false);
        break;
        
      case 'defender':
      default:
        // Stay behind as outlet
        targetPos = this.getDefensiveSupportPosition(entity, ballCarrier, [], false);
        break;
    }
    
    // Apply separation
    targetPos = this.applyTeammateSeparation(targetPos, entity, otherEnemies);
    
    return { action: 'move', targetX: targetPos.x, targetY: targetPos.y, priority: 6 };
  }
  
  private getEnemyDefensiveDecision(entity: any, ball: any, player: any, teammates: any[], config: AIConfig, slotIndex: number): AIDecision {
    const ballCarrier = ball.owner;
    if (!ballCarrier) {
      return { action: 'wait', priority: 1 };
    }
    
    const distToCarrier = Phaser.Math.Distance.Between(entity.x, entity.y, ballCarrier.x, ballCarrier.y);
    const allEnemies = this.scene.registry.get('enemies') || [];
    
    // Get adjusted aggression based on objective - MUCH MORE AGGRESSIVE
    const aggression = this.getAdjustedAggression(config.aggressiveness);
    
    // Calculate press range based on aggression and objective - INCREASED
    let pressRange = TUNING.AI_PRESS_DISTANCE * (0.8 + aggression * 0.4);
    
    // Force turnovers = even higher press
    if (this.currentObjective.type === 'force_turnovers') {
      pressRange *= 1.35;
    }
    
    // Find who is closest to carrier (assign pressing duty)
    const allDefenders = allEnemies.length > 0 ? allEnemies : [];
    const distancesToCarrier = allDefenders.map((e: any) => ({
      entity: e,
      dist: Phaser.Math.Distance.Between(e.x, e.y, ballCarrier.x, ballCarrier.y)
    }));
    distancesToCarrier.sort((a: { dist: number }, b: { dist: number }) => a.dist - b.dist);
    
    const isPrimaryPresser = distancesToCarrier[0]?.entity === entity;
    const isSecondaryPresser = distancesToCarrier[1]?.entity === entity;
    
    // Check for tackle backoff (prevents spam after failed tackle)
    const backoffUntil = this.tackleBackoffUntil.get(entity) || 0;
    const isBackingOff = this.scene.time.now < backoffUntil;
    
    if (isPrimaryPresser && distToCarrier < pressRange) {
      // Primary presser: close down HARD and attempt tackle
      
      // Check angle for tackle (must be approaching from good angle)
      const dx = ballCarrier.x - entity.x;
      const dy = ballCarrier.y - entity.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const facingCarrier = Math.abs(dx / dist);  // How much we're facing carrier
      
      // MORE AGGRESSIVE TACKLING - lower thresholds
      const tackleRange = TUNING.AI_TACKLE_RANGE;
      const canTackle = !this.isTackleOnCooldown(entity) && 
                        !isBackingOff &&
                        distToCarrier < tackleRange &&
                        facingCarrier > TUNING.AI_TACKLE_ANGLE_COS;
      
      // MUCH MORE WILLING TO TACKLE
      const willTackle = Math.random() < TUNING.AI_TACKLE_WILLINGNESS * aggression;
      
      if (canTackle && willTackle) {
        return { action: 'tackle', targetEntity: ballCarrier, priority: 10 };
      }
      
      // Contain behavior: approach DIRECTLY to ball carrier (more aggressive)
      const goalX = 0;  // Enemy goal is left
      
      // Close down directly - less contain, more pressure
      const targetX = Phaser.Math.Linear(entity.x, ballCarrier.x, 0.85);
      const targetY = Phaser.Math.Linear(entity.y, ballCarrier.y, 0.85);
      
      return { action: 'move', targetX, targetY, priority: 9 };
    }
    
    if (isSecondaryPresser && distToCarrier < TUNING.AI_SECOND_PRESSER_RADIUS) {
      // Secondary: ALSO close down from a different angle (trap play)
      const dx = ballCarrier.x - entity.x;
      const dy = ballCarrier.y - entity.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const facingCarrier = Math.abs(dx / dist);
      
      // Secondary presser can also tackle if close enough
      const canTackle = !this.isTackleOnCooldown(entity) && 
                        !isBackingOff &&
                        distToCarrier < TUNING.AI_TACKLE_RANGE * 1.1 &&
                        facingCarrier > TUNING.AI_TACKLE_ANGLE_COS;
      
      if (canTackle && Math.random() < TUNING.AI_TACKLE_WILLINGNESS * aggression * 0.7) {
        return { action: 'tackle', targetEntity: ballCarrier, priority: 9 };
      }
      
      // Approach from goal-side (trap angle)
      const trapAngle = Math.atan2(ballCarrier.y - entity.y, ballCarrier.x - entity.x);
      const offset = entity.y > ballCarrier.y ? -40 : 40;
      const targetX = ballCarrier.x - 30;  // Goal-side
      const targetY = ballCarrier.y + offset;
      
      return { action: 'move', targetX, targetY, priority: 8 };
    }
    
    // Others: hold shape or mark - but still be ready to press
    if (config.role === 'defender') {
      // Block shot line
      const shotLinePos = this.getBlockShotLine(entity, ballCarrier);
      return { action: 'move', targetX: shotLinePos.x, targetY: shotLinePos.y, priority: 7 };
    }
    
    // Return to defensive formation
    const lineOfEngagement = this.getLineOfEngagement(false);
    const homePos = this.getFormationPosition(entity, config.role, slotIndex, false, ball);
    homePos.x = Math.min(homePos.x, this.fieldWidth * lineOfEngagement);
    
    return { action: 'move', targetX: homePos.x, targetY: homePos.y, priority: 5 };
  }
  
  /**
   * Get position to block shot line between carrier and goal
   */
  private getBlockShotLine(entity: any, carrier: any): { x: number; y: number } {
    const goalX = 0;  // Enemy goal
    const goalY = this.fieldHeight / 2;
    
    // Stand on line between carrier and goal, closer to carrier
    const t = 0.35;  // Closer to carrier
    const x = Phaser.Math.Linear(carrier.x, goalX, t);
    const y = Phaser.Math.Linear(carrier.y, goalY, t);
    
    return { x: Phaser.Math.Clamp(x, 60, this.fieldWidth - 60), y };
  }
  
  // Helper methods
  private isTeamHasBall(ball: any, player: any, teammates: any[]): boolean {
    if (!ball.owner) return false;
    return ball.owner === player || teammates.includes(ball.owner);
  }
  
  private isEnemyHasBall(ball: any, enemies: any[]): boolean {
    if (!ball.owner) return false;
    return enemies.includes(ball.owner);
  }
  
  private isOnPassCooldown(entity: any): boolean {
    const lastPass = this.lastPassTime.get(entity);
    if (!lastPass) return false;
    return this.scene.time.now - lastPass < TUNING.AI_PASS_COOLDOWN;
  }
  
  private setPassCooldown(entity: any): void {
    this.lastPassTime.set(entity, this.scene.time.now);
  }
  
  private isTackleOnCooldown(entity: any): boolean {
    const backoffUntil = this.tackleBackoffUntil.get(entity) || 0;
    return this.scene.time.now < backoffUntil;
  }
  
  setTackleBackoff(entity: any, duration: number = 800): void {
    this.tackleBackoffUntil.set(entity, this.scene.time.now + duration);
  }
  
  /**
   * Find best pass target using comprehensive scoring
   * Includes player priority when calling for pass
   */
  private findBestPassTarget(entity: any, player: any | null, teammates: any[], enemies: any[], isPlayerTeam: boolean): any {
    // Build candidate list - include player for player team
    const candidates = player 
      ? [player, ...teammates].filter(t => t !== entity && !t.hasBall) 
      : teammates.filter(t => t !== entity && !t.hasBall);
    
    if (candidates.length === 0) return null;
    
    let bestTarget = null;
    let bestScore = -Infinity;
    
    const targetGoalX = isPlayerTeam ? this.fieldWidth : 0;
    
    for (const candidate of candidates) {
      const dist = Phaser.Math.Distance.Between(entity.x, entity.y, candidate.x, candidate.y);
      
      // Distance bounds
      if (dist < TUNING.AI_PASS_MIN_DIST || dist > TUNING.AI_PASS_MAX_DIST) continue;
      
      let score = 50;  // Base score
      
      // === LANE CLEARNESS ===
      const isLaneBlocked = this.isPassLaneBlocked(entity, candidate, enemies);
      if (isLaneBlocked) {
        score -= TUNING.PASS_WEIGHT_LANE * 1.5;  // Heavy penalty for blocked lane
      } else {
        score += TUNING.PASS_WEIGHT_LANE;  // Bonus for clear lane
      }
      
      // === FORWARD PROGRESS ===
      if (isPlayerTeam) {
        if (candidate.x > entity.x) {
          const progressBonus = (candidate.x - entity.x) / 200;  // More bonus for more progress
          score += TUNING.PASS_WEIGHT_PROGRESS * (1 + progressBonus);
        }
      } else {
        if (candidate.x < entity.x) {
          const progressBonus = (entity.x - candidate.x) / 200;
          score += TUNING.PASS_WEIGHT_PROGRESS * (1 + progressBonus);
        }
      }
      
      // === RECEIVER OPENNESS (SPACE) ===
      let minEnemyDist = Infinity;
      for (const enemy of enemies) {
        const enemyDist = Phaser.Math.Distance.Between(candidate.x, candidate.y, enemy.x, enemy.y);
        if (enemyDist < minEnemyDist) minEnemyDist = enemyDist;
      }
      
      if (minEnemyDist > 80) {
        score += TUNING.PASS_WEIGHT_SPACE;  // Very open
      } else if (minEnemyDist > 50) {
        score += TUNING.PASS_WEIGHT_SPACE * 0.6;  // Fairly open
      } else if (minEnemyDist < 30) {
        score -= TUNING.PASS_WEIGHT_SPACE;  // Heavily marked
      }
      
      // === DISTANCE PENALTY ===
      const distDeviation = Math.abs(dist - TUNING.PASS_IDEAL_DISTANCE);
      score -= (distDeviation / 100) * TUNING.PASS_WEIGHT_DISTANCE;
      
      // === PLAYER CALLING FOR PASS BONUS ===
      if (isPlayerTeam && candidate === player && player.isCallingForPass) {
        score += TUNING.PASS_PLAYER_CALL_BONUS;
      }
      
      // === PLAYER IN GOOD POSITION BONUS (even without calling) ===
      if (isPlayerTeam && candidate === player && !isLaneBlocked) {
        // Slight bonus for passing to player when open
        if (minEnemyDist > 60) {
          score += 10;
        }
      }
      
      // === OBJECTIVE-BASED ADJUSTMENTS ===
      if (this.currentObjective.type === 'hold_possession') {
        // Prefer safer, backward passes
        if (isPlayerTeam && candidate.x < entity.x) {
          score += 15;  // Backward pass bonus
        }
      } else if (this.currentObjective.type === 'score' && this.currentObjective.urgency > 0.5) {
        // More aggressive forward passes
        if (isPlayerTeam && candidate.x > entity.x + 50) {
          score += 12;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestTarget = candidate;
      }
    }
    
    return bestScore > TUNING.PASS_SCORE_THRESHOLD ? bestTarget : null;
  }
  
  // Check if pass lane is blocked
  private isPassLaneBlocked(from: any, to: any, enemies: any[]): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return false;
    
    // Normalized direction
    const nx = dx / dist;
    const ny = dy / dist;
    
    for (const enemy of enemies) {
      // Vector from passer to enemy
      const ex = enemy.x - from.x;
      const ey = enemy.y - from.y;
      
      // Project onto pass direction
      const projection = ex * nx + ey * ny;
      
      // Skip if enemy is behind passer or beyond receiver
      if (projection < 0 || projection > dist) continue;
      
      // Perpendicular distance to line
      const perpDist = Math.abs(ex * ny - ey * nx);
      
      if (perpDist < TUNING.AI_LANE_WIDTH) {
        return true;
      }
    }
    
    return false;
  }
  
  // Find dribble target that avoids enemies
  private findDribbleTarget(entity: any, enemies: any[], goalX: number, goalY: number): { x: number; y: number } {
    // Direction to goal
    let dx = goalX - entity.x;
    let dy = goalY - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= dist;
    dy /= dist;
    
    // Check for nearby enemies and adjust direction
    let avoidX = 0;
    let avoidY = 0;
    
    for (const enemy of enemies) {
      const edx = entity.x - enemy.x;
      const edy = entity.y - enemy.y;
      const eDist = Math.sqrt(edx * edx + edy * edy);
      
      if (eDist < 120 && eDist > 0) {
        const strength = (120 - eDist) / 120;
        avoidX += (edx / eDist) * strength;
        avoidY += (edy / eDist) * strength;
      }
    }
    
    // Blend goal direction with avoidance
    const blendedX = dx + avoidX * 0.6;
    const blendedY = dy + avoidY * 0.6;
    const blendLen = Math.sqrt(blendedX * blendedX + blendedY * blendedY) || 1;
    
    return {
      x: entity.x + (blendedX / blendLen) * 60,
      y: entity.y + (blendedY / blendLen) * 60
    };
  }
  
  // Get formation-based position
  private getFormationPosition(entity: any, role: AIRole, slotIndex: number, isPlayerTeam: boolean, ball: any): { x: number; y: number } {
    const ballX = ball?.x || this.fieldWidth / 2;
    
    let baseX: number;
    let baseY: number;
    
    if (isPlayerTeam) {
      switch (role) {
        case 'goalkeeper':
        case 'sweeper':
          baseX = 80;
          baseY = this.fieldHeight / 2;
          break;
        case 'defender':
          baseX = Math.min(ballX - 120, 220);
          baseY = this.fieldHeight / 2 + (slotIndex % 2 === 0 ? -120 : 120);
          break;
        case 'midfielder':
          baseX = Math.max(Math.min(ballX - 40, 550), 200);
          baseY = this.fieldHeight / 2 + (slotIndex % 2 === 0 ? -170 : 170);
          break;
        case 'forward':
          baseX = Math.min(ballX + 120, this.fieldWidth - 180);
          baseY = this.fieldHeight / 2 + (slotIndex % 2 === 0 ? -80 : 80);
          break;
        default:
          baseX = this.fieldWidth * 0.4;
          baseY = this.fieldHeight / 2;
      }
    } else {
      switch (role) {
        case 'goalkeeper':
        case 'sweeper':
          baseX = this.fieldWidth - 80;
          baseY = this.fieldHeight / 2;
          break;
        case 'defender':
          baseX = Math.max(ballX + 120, this.fieldWidth - 220);
          baseY = this.fieldHeight / 2 + (slotIndex % 2 === 0 ? -120 : 120);
          break;
        case 'midfielder':
          baseX = Math.min(Math.max(ballX + 40, 650), this.fieldWidth - 200);
          baseY = this.fieldHeight / 2 + (slotIndex % 2 === 0 ? -170 : 170);
          break;
        case 'forward':
          baseX = Math.max(ballX - 120, 180);
          baseY = this.fieldHeight / 2 + (slotIndex % 2 === 0 ? -80 : 80);
          break;
        default:
          baseX = this.fieldWidth * 0.6;
          baseY = this.fieldHeight / 2;
      }
    }
    
    return {
      x: Phaser.Math.Clamp(baseX, 60, this.fieldWidth - 60),
      y: Phaser.Math.Clamp(baseY, 60, this.fieldHeight - 60)
    };
  }
  
  // Get position that offers a clear passing lane
  private getPassingLanePosition(entity: any, ballCarrier: any, role: AIRole, isPlayerTeam: boolean, enemies: any[]): { x: number; y: number } {
    if (!ballCarrier) {
      return this.getFormationPosition(entity, role, 0, isPlayerTeam, null);
    }
    
    const targetGoalX = isPlayerTeam ? this.fieldWidth : 0;
    
    // Position ahead and to the side
    const offsetX = isPlayerTeam ? 130 : -130;
    const offsetY = (entity.y > this.fieldHeight / 2) ? -110 : 110;
    
    let targetX = ballCarrier.x + offsetX;
    let targetY = ballCarrier.y + offsetY;
    
    // Adjust if lane would be blocked
    if (this.isPassLaneBlocked(ballCarrier, { x: targetX, y: targetY }, enemies)) {
      // Try opposite side
      targetY = ballCarrier.y - offsetY;
    }
    
    return {
      x: Phaser.Math.Clamp(targetX, 80, this.fieldWidth - 80),
      y: Phaser.Math.Clamp(targetY, 80, this.fieldHeight - 80)
    };
  }
  
  // Cover the most dangerous passing lane
  private getCoverPassingLane(entity: any, ballCarrier: any, enemies: any[]): { x: number; y: number } {
    const forwardEnemies = enemies.filter(e => e.x < ballCarrier.x);
    
    if (forwardEnemies.length === 0) {
      return { x: ballCarrier.x - 100, y: this.fieldHeight / 2 };
    }
    
    const nearest = forwardEnemies.reduce((best, e) => {
      const dist = Phaser.Math.Distance.Between(ballCarrier.x, ballCarrier.y, e.x, e.y);
      return dist < best.dist ? { entity: e, dist } : best;
    }, { entity: forwardEnemies[0], dist: Infinity });
    
    // Position between carrier and target
    return {
      x: (ballCarrier.x + nearest.entity.x) / 2,
      y: (ballCarrier.y + nearest.entity.y) / 2
    };
  }
  
  // Last defender position - track goal line
  private getLastManPosition(entity: any, threat: any): { x: number; y: number } {
    const goalX = 10;
    const goalY = this.fieldHeight / 2;
    
    const coverX = Math.max(50, Math.min(threat.x - 90, 160));
    const coverY = goalY + (threat.y - goalY) * 0.35;
    
    return {
      x: Phaser.Math.Clamp(coverX, 40, 200),
      y: Phaser.Math.Clamp(coverY, 240, 460)
    };
  }
  
  // Create AI config for different entity types
  static createDefenderConfig(difficulty: number = 0.5): AIConfig {
    return {
      role: 'defender',
      aggressiveness: 0.4 + difficulty * 0.3,
      skill: 0.4 + difficulty * 0.4,
      speed: 0.85 + difficulty * 0.1,
      reactionTime: 400 - difficulty * 200
    };
  }
  
  static createMidfielderConfig(difficulty: number = 0.5): AIConfig {
    return {
      role: 'midfielder',
      aggressiveness: 0.5 + difficulty * 0.3,
      skill: 0.5 + difficulty * 0.3,
      speed: 0.9 + difficulty * 0.1,
      reactionTime: 350 - difficulty * 150
    };
  }
  
  static createForwardConfig(difficulty: number = 0.5): AIConfig {
    return {
      role: 'forward',
      aggressiveness: 0.6 + difficulty * 0.3,
      skill: 0.6 + difficulty * 0.3,
      speed: 0.95 + difficulty * 0.1,
      reactionTime: 300 - difficulty * 150
    };
  }
  
  static createSweeperConfig(difficulty: number = 0.5): AIConfig {
    return {
      role: 'sweeper',
      aggressiveness: 0.3 + difficulty * 0.2,
      skill: 0.5 + difficulty * 0.3,
      speed: 0.8 + difficulty * 0.1,
      reactionTime: 300 - difficulty * 100
    };
  }
  
  static createBossConfig(bossType: string): AIConfig {
    switch (bossType) {
      case 'pressMachine':
        return {
          role: 'midfielder',
          aggressiveness: 0.95,
          skill: 0.7,
          speed: 1.1,
          reactionTime: 150
        };
      case 'starForward':
        return {
          role: 'forward',
          aggressiveness: 0.8,
          skill: 0.95,
          speed: 1.2,
          reactionTime: 100
        };
      default:
        return AISystem.createForwardConfig(0.8);
    }
  }
}
