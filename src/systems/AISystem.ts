// AISystem for Stick & Shift
// Manages AI behavior for teammates and enemies
// Improved: team tactics, anti-huddle separation, formation shapes, smarter decisions

import Phaser from 'phaser';
import * as TUNING from '../data/tuning';

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
  private primaryChaser: Map<string, any> = new Map();  // Track primary chaser with hysteresis
  
  // Pass cooldown tracking
  private lastPassTime: Map<any, number> = new Map();
  
  // Decision timing
  private lastDecisionTime: Map<any, number> = new Map();
  
  // Failed tackle cooldown (prevents spam)
  private tackleBackoffUntil: Map<any, number> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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
  
  private getOffensiveDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig): AIDecision {
    const goalX = this.fieldWidth;
    const goalY = this.fieldHeight / 2;
    
    const distToGoal = Phaser.Math.Distance.Between(entity.x, entity.y, goalX, goalY);
    
    // Check shooting opportunity
    if (distToGoal < TUNING.AI_SHOOT_RANGE && config.skill > 0.35) {
      const angleToGoal = Math.atan2(goalY - entity.y, goalX - entity.x);
      const hasGoodAngle = Math.abs(angleToGoal) < TUNING.AI_SHOOT_ANGLE_THRESHOLD;
      
      // Check if shot is clear
      const blockers = enemies.filter(e => {
        const distToEnemy = Phaser.Math.Distance.Between(entity.x, entity.y, e.x, e.y);
        return distToEnemy < 70 && e.x > entity.x;
      });
      
      if (blockers.length === 0 && hasGoodAngle) {
        return { action: 'shoot', targetX: goalX, targetY: goalY, priority: 10 };
      }
    }
    
    // Check for pressure - pass if needed
    const nearbyEnemies = enemies.filter(e =>
      Phaser.Math.Distance.Between(entity.x, entity.y, e.x, e.y) < TUNING.AI_PRESSURE_RADIUS
    );
    
    const canPass = !this.isOnPassCooldown(entity);
    
    if (nearbyEnemies.length > 0 && canPass) {
      const passTarget = this.findBestPassTarget(entity, player, teammates, enemies, true);
      if (passTarget) {
        this.setPassCooldown(entity);
        return { action: 'pass', targetEntity: passTarget, priority: 8 };
      }
    }
    
    // Poor shooting angle but in range - look for pass
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
    
    // Dribble toward goal - find space
    const moveTarget = this.findDribbleTarget(entity, enemies, goalX, goalY);
    return { action: 'move', targetX: moveTarget.x, targetY: moveTarget.y, priority: 5 };
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
  
  private getSupportDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig, slotIndex: number): AIDecision {
    const ballCarrier = ball.owner || player;
    
    // Get position that offers a passing option
    const supportPos = this.getPassingLanePosition(entity, ballCarrier, config.role, true, enemies);
    
    return { action: 'move', targetX: supportPos.x, targetY: supportPos.y, priority: 6 };
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
  
  private getEnemyOffensiveDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig): AIDecision {
    const goalX = 0;
    const goalY = this.fieldHeight / 2;
    
    const distToGoal = Phaser.Math.Distance.Between(entity.x, entity.y, goalX, goalY);
    
    // Shoot if in range with clear shot
    if (distToGoal < TUNING.AI_SHOOT_RANGE + config.skill * 40) {
      const blockers = [player, ...teammates].filter(t => {
        const distToDefender = Phaser.Math.Distance.Between(entity.x, entity.y, t.x, t.y);
        return distToDefender < 70 && t.x < entity.x;
      });
      
      if (blockers.length === 0 || config.skill > 0.7) {
        return { action: 'shoot', targetX: goalX, targetY: goalY, priority: 10 };
      }
    }
    
    // Check for pressure
    const nearbyDefenders = [player, ...teammates].filter(t =>
      Phaser.Math.Distance.Between(entity.x, entity.y, t.x, t.y) < TUNING.AI_PRESSURE_RADIUS
    );
    
    const canPass = !this.isOnPassCooldown(entity);
    
    if (nearbyDefenders.length > 0 && canPass && enemies.length > 1) {
      const passTarget = this.findBestPassTarget(entity, null, enemies.filter(e => e !== entity), [player, ...teammates], false);
      if (passTarget) {
        this.setPassCooldown(entity);
        return { action: 'pass', targetEntity: passTarget, priority: 8 };
      }
    }
    
    // Dribble toward goal
    const moveTarget = this.findDribbleTarget(entity, [player, ...teammates], goalX, goalY);
    return { action: 'move', targetX: moveTarget.x, targetY: moveTarget.y, priority: 5 };
  }
  
  private getEnemySupportDecision(entity: any, ball: any, enemies: any[], config: AIConfig, slotIndex: number): AIDecision {
    const ballCarrier = ball.owner;
    const supportPos = this.getPassingLanePosition(entity, ballCarrier, config.role, false, []);
    return { action: 'move', targetX: supportPos.x, targetY: supportPos.y, priority: 6 };
  }
  
  private getEnemyDefensiveDecision(entity: any, ball: any, player: any, teammates: any[], config: AIConfig, slotIndex: number): AIDecision {
    const ballCarrier = ball.owner;
    if (!ballCarrier) {
      return { action: 'wait', priority: 1 };
    }
    
    const distToCarrier = Phaser.Math.Distance.Between(entity.x, entity.y, ballCarrier.x, ballCarrier.y);
    
    // Press based on aggressiveness
    const pressRange = 100 + config.aggressiveness * 80;
    
    if (distToCarrier < pressRange) {
      if (distToCarrier < TUNING.AI_TACKLE_RANGE && !this.isTackleOnCooldown(entity)) {
        return { action: 'tackle', targetEntity: ballCarrier, priority: 10 };
      }
      return { action: 'move', targetX: ballCarrier.x, targetY: ballCarrier.y, priority: 8 };
    }
    
    // Return to defensive position
    const homePos = this.getFormationPosition(entity, config.role, slotIndex, false, ball);
    return { action: 'move', targetX: homePos.x, targetY: homePos.y, priority: 4 };
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
  
  // Find best pass target with lane checking
  private findBestPassTarget(entity: any, player: any | null, teammates: any[], enemies: any[], isPlayerTeam: boolean): any {
    const candidates = player ? [player, ...teammates].filter(t => t !== entity && !t.hasBall) : teammates.filter(t => t !== entity && !t.hasBall);
    
    let bestTarget = null;
    let bestScore = -Infinity;
    
    const targetGoalX = isPlayerTeam ? this.fieldWidth : 0;
    
    for (const candidate of candidates) {
      const dist = Phaser.Math.Distance.Between(entity.x, entity.y, candidate.x, candidate.y);
      
      if (dist < TUNING.AI_PASS_MIN_DIST || dist > TUNING.AI_PASS_MAX_DIST) continue;
      
      let score = 50;
      
      // Prefer forward passes
      if (isPlayerTeam) {
        if (candidate.x > entity.x) score += 25;
      } else {
        if (candidate.x < entity.x) score += 25;
      }
      
      // Closer to goal is better
      const toGoalDist = Math.abs(targetGoalX - candidate.x);
      score += (1 - toGoalDist / this.fieldWidth) * 20;
      
      // Prefer medium distance passes
      const idealDist = 140;
      score -= Math.abs(dist - idealDist) * 0.08;
      
      // Check if lane is blocked
      const isLaneBlocked = this.isPassLaneBlocked(entity, candidate, enemies);
      if (isLaneBlocked) score -= 45;
      
      // Penalize if enemy nearby candidate
      const nearbyEnemies = enemies.filter(e =>
        Phaser.Math.Distance.Between(candidate.x, candidate.y, e.x, e.y) < 55
      );
      score -= nearbyEnemies.length * 18;
      
      if (score > bestScore) {
        bestScore = score;
        bestTarget = candidate;
      }
    }
    
    return bestScore > 25 ? bestTarget : null;
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
