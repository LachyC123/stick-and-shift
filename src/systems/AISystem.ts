// AISystem for Stick & Shift
// Manages AI behavior for teammates and enemies
// Improved: team tactics, anti-huddle separation, formation shapes, state machine

import Phaser from 'phaser';

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
  avoidance?: { x: number; y: number };  // Separation force
}

export interface FormationSlot {
  role: AIRole;
  baseX: number;  // 0-1 relative to field
  baseY: number;  // 0-1 relative to field
  attackOffset: { x: number; y: number };
  defendOffset: { x: number; y: number };
}

// Standard formation layouts
const FORMATIONS = {
  '3-team': [
    { role: 'defender' as AIRole, baseX: 0.2, baseY: 0.5, attackOffset: { x: 0.15, y: 0 }, defendOffset: { x: -0.1, y: 0 } },
    { role: 'midfielder' as AIRole, baseX: 0.4, baseY: 0.3, attackOffset: { x: 0.2, y: 0 }, defendOffset: { x: -0.05, y: 0 } },
    { role: 'forward' as AIRole, baseX: 0.6, baseY: 0.7, attackOffset: { x: 0.25, y: 0 }, defendOffset: { x: 0, y: 0 } }
  ],
  '4-team': [
    { role: 'defender' as AIRole, baseX: 0.15, baseY: 0.5, attackOffset: { x: 0.1, y: 0 }, defendOffset: { x: -0.05, y: 0 } },
    { role: 'midfielder' as AIRole, baseX: 0.35, baseY: 0.25, attackOffset: { x: 0.2, y: 0.05 }, defendOffset: { x: -0.05, y: 0 } },
    { role: 'midfielder' as AIRole, baseX: 0.35, baseY: 0.75, attackOffset: { x: 0.2, y: -0.05 }, defendOffset: { x: -0.05, y: 0 } },
    { role: 'forward' as AIRole, baseX: 0.55, baseY: 0.5, attackOffset: { x: 0.3, y: 0 }, defendOffset: { x: 0.05, y: 0 } }
  ]
};

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
  private maxChasers: number = 2;  // Only 1 primary + 1 support can chase
  
  // Pass cooldown tracking
  private lastPassTime: Map<any, number> = new Map();
  private passCooldownMs: number = 800;
  
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
        // End transition
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
        this.transitionTimer = 1200;  // 1.2s transition
      } else if (enemyTeamHasBall && this.enemyTeamState === 'defend') {
        this.playerTeamState = 'transition';
        this.enemyTeamState = 'transition';
        this.transitionTimer = 1200;
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
    
    // Calculate separation force (anti-huddle)
    const separation = this.calculateSeparation(entity, [player, ...teammates], 80);
    
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
    
    // Calculate separation force (anti-huddle)
    const separation = this.calculateSeparation(entity, enemies, 80);
    
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
    
    // Apply separation to movement decisions
    if (decision.action === 'move' && decision.targetX !== undefined && decision.targetY !== undefined) {
      decision.targetX += separation.x;
      decision.targetY += separation.y;
    }
    decision.avoidance = separation;
    
    return decision;
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
        // Push away, stronger when closer
        const strength = (radius - dist) / radius;
        separationX += (dx / dist) * strength * 30;
        separationY += (dy / dist) * strength * 30;
        count++;
      }
    }
    
    if (count > 0) {
      separationX /= count;
      separationY /= count;
    }
    
    return { x: separationX, y: separationY };
  }
  
  // Check if this entity should be a chaser (anti-huddle chase limit)
  private canChaseLooseBall(entity: any, isPlayerTeam: boolean): boolean {
    const chasers = isPlayerTeam ? this.playerTeamChasers : this.enemyTeamChasers;
    
    if (chasers.size < this.maxChasers) {
      chasers.add(entity);
      return true;
    }
    
    // Check if already in chasers
    return chasers.has(entity);
  }
  
  private getOffensiveDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig): AIDecision {
    const goalX = this.fieldWidth;  // Enemy goal
    const goalY = this.fieldHeight / 2;
    
    // Check if in shooting range
    const distToGoal = Phaser.Math.Distance.Between(entity.x, entity.y, goalX, goalY);
    
    // Good shooting position (inside D circle, facing goal)
    if (distToGoal < 180 && config.skill > 0.4) {
      // Check if have clear shot
      const blockers = enemies.filter(e => {
        const distToEnemy = Phaser.Math.Distance.Between(entity.x, entity.y, e.x, e.y);
        return distToEnemy < 80 && e.x > entity.x;  // Enemy between us and goal
      });
      
      if (blockers.length === 0) {
        return { action: 'shoot', targetX: goalX, targetY: goalY, priority: 10 };
      }
    }
    
    // Check for pressure - pass if needed
    const nearbyEnemies = enemies.filter(e => 
      Phaser.Math.Distance.Between(entity.x, entity.y, e.x, e.y) < 80
    );
    
    const canPass = !this.isOnPassCooldown(entity);
    
    if (nearbyEnemies.length > 0 && canPass) {
      // Under pressure, look for pass
      const passTarget = this.findBestPassTarget(entity, player, teammates, enemies);
      if (passTarget) {
        this.setPassCooldown(entity);
        return { action: 'pass', targetEntity: passTarget, priority: 8 };
      }
    }
    
    // Poor shooting angle but in range - pass
    if (distToGoal < 250 && canPass) {
      // Check shooting angle
      const angleToGoal = Math.atan2(goalY - entity.y, goalX - entity.x);
      const absAngle = Math.abs(angleToGoal);
      
      if (absAngle > Math.PI / 4) {  // Wide angle
        const passTarget = this.findBestPassTarget(entity, player, teammates, enemies);
        if (passTarget) {
          this.setPassCooldown(entity);
          return { action: 'pass', targetEntity: passTarget, priority: 7 };
        }
      }
    }
    
    // Dribble toward goal
    const moveTarget = this.getOffensivePosition(entity, config.role, goalX, goalY);
    return { action: 'move', targetX: moveTarget.x, targetY: moveTarget.y, priority: 5 };
  }
  
  private getLooseBallDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig, isPlayerTeam: boolean, slotIndex: number): AIDecision {
    const distToBall = Phaser.Math.Distance.Between(entity.x, entity.y, ball.x, ball.y);
    
    // Role-based chase priority
    let chaseThreshold: number;
    switch (config.role) {
      case 'forward': chaseThreshold = 350; break;
      case 'midfielder': chaseThreshold = 300; break;
      case 'defender': chaseThreshold = 200; break;
      default: chaseThreshold = 250;
    }
    
    // Boost chase priority if closest to ball
    const allTeam = isPlayerTeam ? [player, ...teammates] : enemies;
    const teamDistances = allTeam.map(t => ({
      entity: t,
      dist: Phaser.Math.Distance.Between(t.x, t.y, ball.x, ball.y)
    }));
    teamDistances.sort((a, b) => a.dist - b.dist);
    
    const isClosest = teamDistances[0]?.entity === entity;
    const isSecondClosest = teamDistances[1]?.entity === entity;
    
    // Only closest 2 players should chase
    if ((isClosest || isSecondClosest) && distToBall < chaseThreshold) {
      if (this.canChaseLooseBall(entity, isPlayerTeam)) {
        // Chase the ball with prediction
        const predictedBallPos = ball.getPredictedPosition?.(300) || { x: ball.x, y: ball.y };
        return { action: 'move', targetX: predictedBallPos.x, targetY: predictedBallPos.y, priority: 9 };
      }
    }
    
    // Not chasing - go to formation position
    const formationPos = this.getFormationPosition(entity, config.role, slotIndex, isPlayerTeam, ball);
    return { action: 'move', targetX: formationPos.x, targetY: formationPos.y, priority: 3 };
  }
  
  private getSupportDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig, slotIndex: number): AIDecision {
    const ballCarrier = ball.owner || player;
    
    // Get position that offers a passing option
    const supportPos = this.getPassingLanePosition(entity, ballCarrier, config.role, true, enemies);
    
    // Check if in good receiving position
    const distToCarrier = Phaser.Math.Distance.Between(entity.x, entity.y, ballCarrier.x, ballCarrier.y);
    const isClear = !this.isInCoveringShadow(entity, ballCarrier, enemies);
    
    // Signal for ball if open and in good position
    if (distToCarrier > 80 && distToCarrier < 200 && isClear && entity.x > ballCarrier.x) {
      // Could show visual indicator for open pass
    }
    
    return { action: 'move', targetX: supportPos.x, targetY: supportPos.y, priority: 6 };
  }
  
  private getDefensiveDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig, slotIndex: number): AIDecision {
    const ballCarrier = ball.owner;
    if (!ballCarrier) {
      return this.getLooseBallDecision(entity, ball, player, teammates, enemies, config, true, slotIndex);
    }
    
    const distToCarrier = Phaser.Math.Distance.Between(entity.x, entity.y, ballCarrier.x, ballCarrier.y);
    
    // Assign defensive duties based on slot
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
      if (distToCarrier < 45 && config.aggressiveness > 0.4) {
        return { action: 'tackle', targetEntity: ballCarrier, priority: 10 };
      }
      // Press the carrier
      return { action: 'move', targetX: ballCarrier.x, targetY: ballCarrier.y, priority: 8 };
    }
    
    // Second closest: cover passing lane
    if (isSecondDefender) {
      const coverPos = this.getCoverPassingLane(entity, ballCarrier, enemies);
      return { action: 'move', targetX: coverPos.x, targetY: coverPos.y, priority: 7 };
    }
    
    // Others: goalkeeper-lite / hold shape
    if (config.role === 'defender' || config.role === 'sweeper') {
      // Last man - track goal-center line
      const lastManPos = this.getLastManPosition(entity, ballCarrier);
      return { action: 'move', targetX: lastManPos.x, targetY: lastManPos.y, priority: 6 };
    }
    
    // Hold formation
    const formationPos = this.getFormationPosition(entity, config.role, slotIndex, true, ball);
    return { action: 'move', targetX: formationPos.x, targetY: formationPos.y, priority: 5 };
  }
  
  private getEnemyOffensiveDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig): AIDecision {
    const goalX = 0;  // Player's goal
    const goalY = this.fieldHeight / 2;
    
    const distToGoal = Phaser.Math.Distance.Between(entity.x, entity.y, goalX, goalY);
    
    // Shoot if in range with clear shot
    if (distToGoal < 200 + config.skill * 50) {
      const blockers = [player, ...teammates].filter(t => {
        const distToDefender = Phaser.Math.Distance.Between(entity.x, entity.y, t.x, t.y);
        return distToDefender < 80 && t.x < entity.x;
      });
      
      if (blockers.length === 0 || config.skill > 0.7) {
        return { action: 'shoot', targetX: goalX, targetY: goalY, priority: 10 };
      }
    }
    
    // Check for pressure
    const nearbyDefenders = [player, ...teammates].filter(t => 
      Phaser.Math.Distance.Between(entity.x, entity.y, t.x, t.y) < 80
    );
    
    const canPass = !this.isOnPassCooldown(entity);
    
    if (nearbyDefenders.length > 0 && canPass && enemies.length > 1) {
      const passTarget = this.findBestEnemyPassTarget(entity, enemies, [player, ...teammates]);
      if (passTarget) {
        this.setPassCooldown(entity);
        return { action: 'pass', targetEntity: passTarget, priority: 8 };
      }
    }
    
    // Dribble toward goal
    const moveTarget = this.getEnemyOffensivePosition(entity, config.role);
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
    if (distToCarrier < 100 + config.aggressiveness * 80) {
      if (distToCarrier < 45) {
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
    return this.scene.time.now - lastPass < this.passCooldownMs;
  }
  
  private setPassCooldown(entity: any): void {
    this.lastPassTime.set(entity, this.scene.time.now);
  }
  
  // Check if entity is in covering shadow (blocked passing lane)
  private isInCoveringShadow(entity: any, ballCarrier: any, enemies: any[]): boolean {
    const dx = entity.x - ballCarrier.x;
    const dy = entity.y - ballCarrier.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    for (const enemy of enemies) {
      // Check if enemy is between carrier and receiver
      const dxE = enemy.x - ballCarrier.x;
      const dyE = enemy.y - ballCarrier.y;
      const distE = Math.sqrt(dxE * dxE + dyE * dyE);
      
      if (distE < dist && distE > 20) {
        // Check angle alignment
        const dot = (dx * dxE + dy * dyE) / (dist * distE);
        if (dot > 0.85) {  // Within ~30 degrees
          return true;
        }
      }
    }
    return false;
  }
  
  private findBestPassTarget(entity: any, player: any, teammates: any[], enemies: any[]): any {
    const candidates = [player, ...teammates].filter(t => t !== entity && !t.hasBall);
    
    let bestTarget = null;
    let bestScore = -Infinity;
    
    for (const candidate of candidates) {
      const dist = Phaser.Math.Distance.Between(entity.x, entity.y, candidate.x, candidate.y);
      
      // Skip if too close or too far
      if (dist < 60 || dist > 400) continue;
      
      const toGoalDist = this.fieldWidth - candidate.x;
      
      // Score based on multiple factors
      let score = 50;
      
      // Prefer forward passes
      if (candidate.x > entity.x) score += 25;
      
      // Prefer closer to goal
      score += (1 - toGoalDist / this.fieldWidth) * 20;
      
      // Prefer medium distance passes
      const idealDist = 150;
      score -= Math.abs(dist - idealDist) * 0.1;
      
      // Penalize if covered
      const isCovered = this.isInCoveringShadow(candidate, entity, enemies);
      if (isCovered) score -= 40;
      
      // Penalize if enemy nearby
      const nearbyEnemies = enemies.filter(e => 
        Phaser.Math.Distance.Between(candidate.x, candidate.y, e.x, e.y) < 50
      );
      score -= nearbyEnemies.length * 15;
      
      if (score > bestScore) {
        bestScore = score;
        bestTarget = candidate;
      }
    }
    
    return bestScore > 30 ? bestTarget : null;
  }
  
  private findBestEnemyPassTarget(entity: any, enemies: any[], defenders: any[]): any {
    const candidates = enemies.filter(e => e !== entity && !e.hasBall);
    
    let bestTarget = null;
    let bestScore = -Infinity;
    
    for (const candidate of candidates) {
      const dist = Phaser.Math.Distance.Between(entity.x, entity.y, candidate.x, candidate.y);
      
      if (dist < 60 || dist > 400) continue;
      
      const toGoalDist = candidate.x;  // Closer to player's goal is better
      
      let score = 50;
      
      // Prefer forward passes (toward player's goal)
      if (candidate.x < entity.x) score += 25;
      
      score += (1 - toGoalDist / this.fieldWidth) * 20;
      
      // Check if covered
      const isCovered = this.isInCoveringShadow(candidate, entity, defenders);
      if (isCovered) score -= 40;
      
      if (score > bestScore) {
        bestScore = score;
        bestTarget = candidate;
      }
    }
    
    return bestScore > 30 ? bestTarget : null;
  }
  
  // Get formation-based position
  private getFormationPosition(entity: any, role: AIRole, slotIndex: number, isPlayerTeam: boolean, ball: any): { x: number; y: number } {
    const ballX = ball?.x || this.fieldWidth / 2;
    
    // Base positions by role
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
          baseX = Math.min(ballX - 100, 250);
          baseY = this.fieldHeight / 2 + (slotIndex % 2 === 0 ? -100 : 100);
          break;
        case 'midfielder':
          baseX = ballX - 50;
          baseY = this.fieldHeight / 2 + (slotIndex % 2 === 0 ? -150 : 150);
          break;
        case 'forward':
          baseX = Math.min(ballX + 100, this.fieldWidth - 200);
          baseY = this.fieldHeight / 2;
          break;
        default:
          baseX = this.fieldWidth * 0.4;
          baseY = this.fieldHeight / 2;
      }
    } else {
      // Enemy team - mirror positions
      switch (role) {
        case 'goalkeeper':
        case 'sweeper':
          baseX = this.fieldWidth - 80;
          baseY = this.fieldHeight / 2;
          break;
        case 'defender':
          baseX = Math.max(ballX + 100, this.fieldWidth - 250);
          baseY = this.fieldHeight / 2 + (slotIndex % 2 === 0 ? -100 : 100);
          break;
        case 'midfielder':
          baseX = ballX + 50;
          baseY = this.fieldHeight / 2 + (slotIndex % 2 === 0 ? -150 : 150);
          break;
        case 'forward':
          baseX = Math.max(ballX - 100, 200);
          baseY = this.fieldHeight / 2;
          break;
        default:
          baseX = this.fieldWidth * 0.6;
          baseY = this.fieldHeight / 2;
      }
    }
    
    // Clamp to field
    baseX = Phaser.Math.Clamp(baseX, 60, this.fieldWidth - 60);
    baseY = Phaser.Math.Clamp(baseY, 60, this.fieldHeight - 60);
    
    return { x: baseX, y: baseY };
  }
  
  private getHomePosition(entity: any, role: AIRole, isEnemy: boolean): { x: number; y: number } {
    return this.getFormationPosition(entity, role, 0, !isEnemy, null);
  }
  
  private getOffensivePosition(entity: any, role: AIRole, goalX: number, goalY: number): { x: number; y: number } {
    const dx = goalX - entity.x;
    const dy = goalY - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    
    const speed = 4;
    return {
      x: entity.x + (dx / dist) * speed + (Math.random() - 0.5) * 2,
      y: entity.y + (dy / dist) * speed + (Math.random() - 0.5) * 2
    };
  }
  
  private getEnemyOffensivePosition(entity: any, role: AIRole): { x: number; y: number } {
    const goalX = 0;
    const goalY = this.fieldHeight / 2;
    return this.getOffensivePosition(entity, role, goalX, goalY);
  }
  
  // Get position that offers a clear passing lane
  private getPassingLanePosition(entity: any, ballCarrier: any, role: AIRole, isPlayerTeam: boolean, enemies: any[]): { x: number; y: number } {
    if (!ballCarrier) {
      return this.getFormationPosition(entity, role, 0, isPlayerTeam, null);
    }
    
    const targetGoalX = isPlayerTeam ? this.fieldWidth : 0;
    
    // Position ahead and to the side
    const offsetX = isPlayerTeam ? 120 : -120;
    const offsetY = (entity.y > this.fieldHeight / 2) ? -100 : 100;
    
    let targetX = ballCarrier.x + offsetX;
    let targetY = ballCarrier.y + offsetY;
    
    // Clamp
    targetX = Phaser.Math.Clamp(targetX, 80, this.fieldWidth - 80);
    targetY = Phaser.Math.Clamp(targetY, 80, this.fieldHeight - 80);
    
    return { x: targetX, y: targetY };
  }
  
  // Cover the most dangerous passing lane
  private getCoverPassingLane(entity: any, ballCarrier: any, enemies: any[]): { x: number; y: number } {
    // Find nearest enemy forward of the ball
    const forwardEnemies = enemies.filter(e => e.x < ballCarrier.x);
    
    if (forwardEnemies.length === 0) {
      return { x: ballCarrier.x - 100, y: this.fieldHeight / 2 };
    }
    
    // Find the most dangerous passing target
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
    const goalX = 10;  // Player's goal
    const goalY = this.fieldHeight / 2;
    
    // Stay between threat and goal center
    const coverX = Math.max(50, Math.min(threat.x - 80, 150));
    const coverY = goalY + (threat.y - goalY) * 0.3;
    
    return {
      x: Phaser.Math.Clamp(coverX, 40, 200),
      y: Phaser.Math.Clamp(coverY, 250, 450)
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
