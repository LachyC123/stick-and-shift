// AISystem for Stick & Shift
// COMPLETE OVERHAUL: TeamDefensePlanner, role assignments, goalkeeper-lite
// Genuinely challenging defense that stops free goals

import Phaser from 'phaser';
import * as TUNING from '../data/tuning';
import { ObjectiveDescriptor } from './MomentSystem';

export type AIRole = 'defender' | 'midfielder' | 'forward' | 'goalkeeper' | 'sweeper';
export type AIState = 'idle' | 'chase' | 'attack' | 'defend' | 'support' | 'return' | 'press' | 'mark';
export type TeamState = 'attack' | 'defend' | 'transition';

// Defense roles for TeamDefensePlanner
export type DefenseRole = 'PRIMARY_PRESSER' | 'SECOND_PRESSER' | 'SHOT_BLOCKER' | 'LAST_MAN' | 'MARKER' | 'SUPPORT';

export interface AIConfig {
  role: AIRole;
  aggressiveness: number;
  skill: number;
  speed: number;
  reactionTime: number;
}

export interface AIDecision {
  action: 'move' | 'shoot' | 'pass' | 'tackle' | 'dodge' | 'wait' | 'intercept' | 'block';
  targetX?: number;
  targetY?: number;
  targetEntity?: any;
  priority: number;
  avoidance?: { x: number; y: number };
}

export interface DefenseAssignment {
  entity: any;
  role: DefenseRole;
  target: { x: number; y: number };
  assignedAt: number;
  inCommitMode: boolean;
  commitUntil: number;
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
  
  // Defense planner assignments
  private enemyDefenseAssignments: Map<any, DefenseAssignment> = new Map();
  private teammateDefenseAssignments: Map<any, DefenseAssignment> = new Map();
  private lastPlannerUpdate: number = 0;
  
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
  
  // AI-DEFENSE v3: Tackle statistics for F9 debug
  private tackleStats = {
    attempts: 0,
    successes: 0,
    blockedByCooldown: 0,
    blockedByAngle: 0,
    blockedByRange: 0
  };
  
  // Stuck detection
  private entityLastPositions: Map<any, { x: number; y: number; time: number }> = new Map();
  
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
  
  // Active play calling (1/2/3 keys)
  private activePlay: 'press' | 'hold' | 'counter' | null = null;
  private playExpiresAt: number = 0;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  // ========================================
  // OBJECTIVE & PLAY MANAGEMENT
  // ========================================
  
  setObjective(objective: ObjectiveDescriptor): void {
    this.currentObjective = objective;
  }
  
  setActivePlay(play: 'press' | 'hold' | 'counter'): void {
    this.activePlay = play;
    this.playExpiresAt = this.scene.time.now + 8000;
  }
  
  getActivePlay(): 'press' | 'hold' | 'counter' | null {
    if (this.scene.time.now > this.playExpiresAt) {
      this.activePlay = null;
    }
    return this.activePlay;
  }
  
  setDifficulty(momentNumber: number, isBoss: boolean = false): void {
    this.momentNumber = momentNumber;
    this.difficultyMultiplier = 1.0 + (momentNumber - 1) * 0.05 + (isBoss ? 0.20 : 0);
  }
  
  // ========================================
  // TEAM DEFENSE PLANNER (Part A)
  // ========================================
  
  /**
   * Main entry point - run defense planner and update team states
   */
  updateTeamStates(ball: any, player: any, teammates: any[], enemies: any[], delta: number): void {
    const playerTeamHasBall = this.isTeamHasBall(ball, player, teammates);
    const enemyTeamHasBall = this.isEnemyHasBall(ball, enemies);
    
    // Handle state transitions
    this.handleTransitions(playerTeamHasBall, enemyTeamHasBall, delta);
    
    // Run defense planner periodically
    const now = this.scene.time.now;
    if (now - this.lastPlannerUpdate >= TUNING.DEFENSE_PLANNER_INTERVAL) {
      this.lastPlannerUpdate = now;
      
      // Update enemy defense (when player team has ball)
      if (playerTeamHasBall) {
        this.runDefensePlanner(enemies, ball, player, teammates, false);
      }
      
      // Update teammate defense (when enemy has ball)
      if (enemyTeamHasBall) {
        this.runDefensePlanner(teammates, ball, player, enemies, true);
      }
    }
    
    // Clear chasers
    this.playerTeamChasers.clear();
    this.enemyTeamChasers.clear();
  }
  
  /**
   * The core defense planner - assigns roles with hysteresis
   */
  private runDefensePlanner(
    defenders: any[],
    ball: any,
    player: any,
    attackers: any[],
    isPlayerTeam: boolean
  ): void {
    const carrier = ball.owner;
    if (!carrier) return;
    
    const assignments = isPlayerTeam ? this.teammateDefenseAssignments : this.enemyDefenseAssignments;
    const now = this.scene.time.now;
    
    // Calculate distances to carrier for all defenders
    const distanceData = defenders.map(d => ({
      entity: d,
      dist: Phaser.Math.Distance.Between(d.x, d.y, carrier.x, carrier.y),
      currentAssignment: assignments.get(d)
    }));
    distanceData.sort((a, b) => a.dist - b.dist);
    
    // Check if we need to reassign (hysteresis check)
    const needsReassign = distanceData.some(d => {
      const current = d.currentAssignment;
      if (!current) return true;
      if (now - current.assignedAt < TUNING.DEFENSE_ROLE_HYSTERESIS) return false;
      return true;
    });
    
    // Get goal position for this team
    const goalX = isPlayerTeam ? this.fieldWidth - 30 : 30;
    const goalY = this.fieldHeight / 2;
    
    // Check if in danger zone
    const carrierDistToGoal = Phaser.Math.Distance.Between(carrier.x, carrier.y, goalX, goalY);
    const isInDangerZone = carrierDistToGoal < TUNING.DANGER_ZONE_DISTANCE;
    
    // Assign roles based on team size and proximity
    const numDefenders = defenders.length;
    
    for (let i = 0; i < distanceData.length; i++) {
      const { entity, dist, currentAssignment } = distanceData[i];
      
      // Skip if current assignment is valid and within hysteresis
      if (currentAssignment && now - currentAssignment.assignedAt < TUNING.DEFENSE_ROLE_HYSTERESIS) {
        // Update target position even if role is locked
        this.updateDefenseTarget(currentAssignment, carrier, goalX, goalY, attackers, isInDangerZone, isPlayerTeam);
        continue;
      }
      
      let role: DefenseRole;
      let target: { x: number; y: number };
      
      if (i === 0) {
        // PRIMARY PRESSER - closest defender
        role = 'PRIMARY_PRESSER';
        target = { x: carrier.x, y: carrier.y };
      } else if (i === 1 && numDefenders >= 2) {
        // SECOND PRESSER or SHOT BLOCKER
        if (isInDangerZone || numDefenders <= 2) {
          role = 'SHOT_BLOCKER';
          target = this.getShotBlockerPosition(carrier, goalX, goalY);
        } else {
          role = 'SECOND_PRESSER';
          target = this.getSecondPresserPosition(carrier, goalX, goalY);
        }
      } else if (i === numDefenders - 1 || (i === 2 && numDefenders === 3)) {
        // LAST_MAN - furthest back / last defender
        role = 'LAST_MAN';
        target = this.getLastManPosition(carrier, ball, goalX, goalY, isInDangerZone);
      } else {
        // Additional defenders - MARKER or SHOT_BLOCKER
        const unmarkedAttacker = this.findUnmarkedAttacker(entity, attackers, carrier, assignments);
        if (unmarkedAttacker) {
          role = 'MARKER';
          target = this.getMarkingPosition(unmarkedAttacker, goalX, goalY);
        } else {
          role = 'SHOT_BLOCKER';
          target = this.getShotBlockerPosition(carrier, goalX, goalY);
        }
      }
      
      // Check if entering commit mode for tackles
      const inCommitMode = role === 'PRIMARY_PRESSER' && dist < TUNING.AI_TACKLE_RANGE_COMMIT + 20;
      
      assignments.set(entity, {
        entity,
        role,
        target,
        assignedAt: now,
        inCommitMode,
        commitUntil: inCommitMode ? now + TUNING.TACKLE_COMMIT_DURATION : 0
      });
    }
  }
  
  /**
   * Update target position for existing assignment
   */
  private updateDefenseTarget(
    assignment: DefenseAssignment,
    carrier: any,
    goalX: number,
    goalY: number,
    attackers: any[],
    isInDangerZone: boolean,
    isPlayerTeam: boolean
  ): void {
    const now = this.scene.time.now;
    
    switch (assignment.role) {
      case 'PRIMARY_PRESSER':
        assignment.target = { x: carrier.x, y: carrier.y };
        // Update commit mode
        const dist = Phaser.Math.Distance.Between(
          assignment.entity.x, assignment.entity.y, carrier.x, carrier.y
        );
        if (dist < TUNING.AI_TACKLE_RANGE_COMMIT + 20 && !assignment.inCommitMode) {
          assignment.inCommitMode = true;
          assignment.commitUntil = now + TUNING.TACKLE_COMMIT_DURATION;
        }
        if (now > assignment.commitUntil) {
          assignment.inCommitMode = false;
        }
        break;
        
      case 'SECOND_PRESSER':
        assignment.target = this.getSecondPresserPosition(carrier, goalX, goalY);
        break;
        
      case 'SHOT_BLOCKER':
        assignment.target = this.getShotBlockerPosition(carrier, goalX, goalY);
        break;
        
      case 'LAST_MAN':
        const ball = this.scene.registry.get('ball');
        assignment.target = this.getLastManPosition(carrier, ball, goalX, goalY, isInDangerZone);
        break;
        
      case 'MARKER':
        // Keep marking same target
        break;
    }
  }
  
  // ========================================
  // POSITION CALCULATIONS
  // ========================================
  
  /**
   * Get position for second presser (trap angle from goal-side)
   */
  private getSecondPresserPosition(carrier: any, goalX: number, goalY: number): { x: number; y: number } {
    const angleToGoal = Math.atan2(goalY - carrier.y, goalX - carrier.x);
    const trapOffset = 80;
    
    // Position at an angle that cuts off escape to goal
    return {
      x: carrier.x + Math.cos(angleToGoal) * trapOffset,
      y: carrier.y + Math.sin(angleToGoal) * trapOffset
    };
  }
  
  /**
   * Get position on ball->goal line for shot blocking
   */
  private getShotBlockerPosition(carrier: any, goalX: number, goalY: number): { x: number; y: number } {
    const t = TUNING.SHOT_BLOCKER_POSITION;
    return {
      x: Phaser.Math.Linear(carrier.x, goalX, t),
      y: Phaser.Math.Linear(carrier.y, goalY, t)
    };
  }
  
  /**
   * Get LAST_MAN / goalkeeper-lite position
   * Always between ball and goal center, tracks ball movement
   */
  private getLastManPosition(
    carrier: any,
    ball: any,
    goalX: number,
    goalY: number,
    isInDangerZone: boolean
  ): { x: number; y: number } {
    // Use ball position for more responsive tracking
    const trackX = ball?.x ?? carrier.x;
    const trackY = ball?.y ?? carrier.y;
    
    // Calculate direction from ball to goal
    const dx = goalX - trackX;
    const dy = goalY - trackY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    
    // Tighter positioning when in danger zone
    const radius = isInDangerZone ? TUNING.LAST_MAN_RADIUS_MIN : TUNING.LAST_MAN_RADIUS_MAX;
    
    // Position between ball and goal
    let posX = goalX - (dx / dist) * radius;
    let posY = goalY - (dy / dist) * radius * 0.5;  // Stay more central vertically
    
    // Track ball Y position
    posY = Phaser.Math.Linear(posY, trackY, 0.3);
    
    // Clamp to reasonable area
    posX = Phaser.Math.Clamp(posX, 50, this.fieldWidth - 50);
    posY = Phaser.Math.Clamp(posY, 150, this.fieldHeight - 150);
    
    return { x: posX, y: posY };
  }
  
  /**
   * Get goal-side marking position
   */
  private getMarkingPosition(attacker: any, goalX: number, goalY: number): { x: number; y: number } {
    const t = 0.25;  // 25% of way toward goal
    return {
      x: Phaser.Math.Linear(attacker.x, goalX, t),
      y: attacker.y
    };
  }
  
  /**
   * Find an attacker not being marked by closer defenders
   */
  private findUnmarkedAttacker(
    defender: any,
    attackers: any[],
    carrier: any,
    assignments: Map<any, DefenseAssignment>
  ): any {
    for (const attacker of attackers) {
      if (attacker === carrier) continue;
      
      let isMarked = false;
      assignments.forEach(a => {
        if (a.role === 'MARKER') {
          const aTarget = a.target;
          const distToAttacker = Phaser.Math.Distance.Between(aTarget.x, aTarget.y, attacker.x, attacker.y);
          if (distToAttacker < 50) isMarked = true;
        }
      });
      
      if (!isMarked) return attacker;
    }
    return null;
  }
  
  // ========================================
  // AI DECISION GETTERS
  // ========================================
  
  /**
   * PART 3: Get defender-specific decision (stay back, protect D)
   */
  private getDefenderDecision(
    entity: any,
    ball: any,
    player: any,
    teammates: any[],
    enemies: any[],
    isPlayerTeam: boolean,
    hasBall: boolean
  ): AIDecision {
    // Defender's own goal position
    const ownGoalX = isPlayerTeam ? 30 : this.fieldWidth - 30;
    const ownGoalY = this.fieldHeight / 2;
    
    // If has ball, play it safe - pass to teammate or clear
    if (hasBall) {
      const allTeammates = isPlayerTeam ? teammates : enemies.filter(e => e !== entity);
      const safePassTarget = allTeammates.find(t => {
        // Find teammate that's not too far forward
        const tDistToOwnGoal = Math.abs(t.x - ownGoalX);
        return tDistToOwnGoal > 150;  // Not in own D
      });
      
      if (safePassTarget && !this.isOnPassCooldown(entity)) {
        console.log(`[DEFENDER] Safe clearance pass`);
        this.setPassCooldown(entity);
        return { action: 'pass', targetEntity: safePassTarget, priority: 10 };
      }
      
      // Just dribble out of danger zone
      const clearX = isPlayerTeam ? entity.x + 80 : entity.x - 80;
      return { action: 'move', targetX: clearX, targetY: entity.y, priority: 8 };
    }
    
    // Defensive line position (20-40% from own goal)
    const defensiveLineX = isPlayerTeam 
      ? ownGoalX + this.fieldWidth * 0.25  // ~25% from left goal
      : ownGoalX - this.fieldWidth * 0.25; // ~25% from right goal
    
    // Max forward position (defender shouldn't push too far)
    const maxForwardX = isPlayerTeam 
      ? this.fieldWidth * 0.55  // Don't go past midfield much
      : this.fieldWidth * 0.45;
    
    // Find most dangerous attacker (ball carrier or closest to own D)
    const attackers = isPlayerTeam ? enemies : [player, ...teammates];
    const ownDRadius = TUNING.D_CIRCLE_RADIUS;
    
    let mostDangerous = ball.owner;
    let minDistToOwnD = Infinity;
    
    for (const attacker of attackers) {
      const distToOwnGoal = Phaser.Math.Distance.Between(attacker.x, attacker.y, ownGoalX, ownGoalY);
      if (distToOwnGoal < minDistToOwnD) {
        minDistToOwnD = distToOwnGoal;
        mostDangerous = attacker;
      }
    }
    
    // If attacker is in own D, close down aggressively!
    if (mostDangerous && minDistToOwnD < ownDRadius) {
      const dist = Phaser.Math.Distance.Between(entity.x, entity.y, mostDangerous.x, mostDangerous.y);
      console.log(`[DEFENDER] Attacker in D! Closing down aggressively`);
      
      if (dist < 50 && mostDangerous.hasBall) {
        return { action: 'tackle', targetEntity: mostDangerous, priority: 15 };
      }
      return { action: 'move', targetX: mostDangerous.x, targetY: mostDangerous.y, priority: 14 };
    }
    
    // Position: Stay goal-side of ball, between ball and own goal
    const targetX = isPlayerTeam
      ? Math.min(Math.max(ball.x - 60, ownGoalX + 80), maxForwardX)
      : Math.max(Math.min(ball.x + 60, ownGoalX - 80), maxForwardX);
    
    // Track Y based on ball and most dangerous attacker
    let targetY = ball.y;
    if (mostDangerous) {
      targetY = (ball.y + mostDangerous.y) / 2;
    }
    targetY = Phaser.Math.Clamp(targetY, 100, this.fieldHeight - 100);
    
    console.log(`[DEFENDER] Holding position at (${Math.round(targetX)}, ${Math.round(targetY)})`);
    return { action: 'move', targetX: targetX, targetY: targetY, priority: 8 };
  }
  
  /**
   * Get decision for enemy AI
   */
  getEnemyDecision(
    entity: any,
    ball: any,
    player: any,
    teammates: any[],
    enemies: any[],
    hasBall: boolean,
    slotIndex: number = 0
  ): AIDecision {
    // === PART 3: Check if this entity is the assigned defender ===
    if (this.isAssignedDefender(entity, false)) {
      // Defender uses special positioning logic
      return this.getDefenderDecision(entity, ball, player, teammates, enemies, false, hasBall);
    }
    
    // Check for defense assignment first
    const assignment = this.enemyDefenseAssignments.get(entity);
    
    if (hasBall) {
      return this.getOffensiveDecision(entity, ball, player, teammates, enemies, false);
    }
    
    if (ball.owner === null) {
      return this.getLooseBallDecision(entity, ball, player, teammates, enemies, false, slotIndex);
    }
    
    if (this.isEnemyHasBall(ball, enemies)) {
      return this.getSupportDecision(entity, ball, enemies, false, slotIndex);
    }
    
    // Use defense planner assignment
    if (assignment) {
      return this.executeDefenseAssignment(entity, assignment, ball, player, teammates);
    }
    
    // Fallback - move to formation
    const formationPos = this.getFormationPosition(entity, entity.aiConfig?.role || 'midfielder', slotIndex, false, ball);
    return { action: 'move', targetX: formationPos.x, targetY: formationPos.y, priority: 3 };
  }
  
  /**
   * Get decision for teammate AI
   */
  getTeammateDecision(
    entity: any,
    ball: any,
    player: any,
    teammates: any[],
    enemies: any[],
    hasBall: boolean,
    slotIndex: number = 0
  ): AIDecision {
    // === PART 3: Check if this entity is the assigned defender ===
    if (this.isAssignedDefender(entity, true)) {
      // Defender uses special positioning logic
      return this.getDefenderDecision(entity, ball, player, teammates, enemies, true, hasBall);
    }
    
    const assignment = this.teammateDefenseAssignments.get(entity);
    
    if (hasBall) {
      return this.getTeammateOffensiveDecision(entity, ball, player, teammates, enemies);
    }
    
    if (ball.owner === null) {
      return this.getLooseBallDecision(entity, ball, player, teammates, enemies, true, slotIndex);
    }
    
    if (this.isTeamHasBall(ball, player, teammates)) {
      return this.getTeammateSupportDecision(entity, ball, player, teammates, enemies, slotIndex);
    }
    
    // Use defense planner assignment
    if (assignment) {
      return this.executeDefenseAssignment(entity, assignment, ball, enemies[0], enemies);
    }
    
    // Fallback
    const formationPos = this.getFormationPosition(entity, entity.aiConfig?.role || 'midfielder', slotIndex, true, ball);
    return { action: 'move', targetX: formationPos.x, targetY: formationPos.y, priority: 3 };
  }
  
  /**
   * Execute a defense assignment from the planner
   */
  private executeDefenseAssignment(
    entity: any,
    assignment: DefenseAssignment,
    ball: any,
    carrier: any,
    attackers: any[]
  ): AIDecision {
    const dist = Phaser.Math.Distance.Between(entity.x, entity.y, carrier.x, carrier.y);
    const now = this.scene.time.now;
    
    switch (assignment.role) {
      case 'PRIMARY_PRESSER':
        // AI-DEFENSE v3: Aggressive tackle enforcement
        // In commit mode or within tackle range - attempt tackle with willingness check
        if (assignment.inCommitMode || dist < TUNING.AI_TACKLE_RANGE) {
          // Check cooldown
          if (this.isTackleOnCooldown(entity)) {
            this.recordTackleBlocked('cooldown');
          } else if (dist < TUNING.AI_TACKLE_RANGE_COMMIT) {
            // Close range - check if VERY close (ignore angle)
            const isVeryClose = dist < TUNING.AI_TACKLE_RANGE * TUNING.AI_TACKLE_CLOSE_RANGE_MULT;
            
            // Calculate angle check
            const dx = carrier.x - entity.x;
            const dy = carrier.y - entity.y;
            const vel = entity.body?.velocity || { x: 0, y: 0 };
            const velMag = Math.sqrt(vel.x * vel.x + vel.y * vel.y) || 1;
            const dotProduct = (dx * vel.x + dy * vel.y) / (dist * velMag);
            const angleOK = isVeryClose || dotProduct > TUNING.AI_TACKLE_ANGLE_COS;
            
            if (!angleOK) {
              this.recordTackleBlocked('angle');
            } else if (Math.random() < TUNING.AI_TACKLE_WILLINGNESS) {
              // Tackle attempt!
              return { action: 'tackle', targetEntity: carrier, priority: 10 };
            }
          } else {
            this.recordTackleBlocked('range');
          }
        }
        // Sprint directly at carrier
        return { action: 'move', targetX: carrier.x, targetY: carrier.y, priority: 9 };
        
      case 'SECOND_PRESSER':
        // Also try to tackle if close - AI-DEFENSE v3
        if (dist < TUNING.AI_TACKLE_RANGE) {
          if (this.isTackleOnCooldown(entity)) {
            this.recordTackleBlocked('cooldown');
          } else if (Math.random() < TUNING.AI_TACKLE_WILLINGNESS * 0.8) {  // Slightly less aggressive
            return { action: 'tackle', targetEntity: carrier, priority: 9 };
          }
        }
        return { action: 'move', targetX: assignment.target.x, targetY: assignment.target.y, priority: 8 };
        
      case 'SHOT_BLOCKER':
        // Move to shot-blocking position
        // On shot event, will lunge
        return { action: 'move', targetX: assignment.target.x, targetY: assignment.target.y, priority: 7 };
        
      case 'LAST_MAN':
        // Stay in goal protection position
        return { action: 'move', targetX: assignment.target.x, targetY: assignment.target.y, priority: 8 };
        
      case 'MARKER':
        return { action: 'move', targetX: assignment.target.x, targetY: assignment.target.y, priority: 6 };
        
      default:
        return { action: 'move', targetX: assignment.target.x, targetY: assignment.target.y, priority: 5 };
    }
  }
  
  // ========================================
  // OFFENSIVE DECISIONS
  // ========================================
  
  /**
   * Enemy carrier brain - SHOOT / PASS / DRIBBLE
   */
  // Track how long each entity has been in D with possession (for stall timeout)
  private inDPossessionTime: Map<any, number> = new Map();
  private lastFinishCheckTime: Map<any, number> = new Map();
  private entityStuckCounter: Map<any, number> = new Map();
  
  // === PART 3: DEFENDER ROLE TRACKING ===
  private playerTeamDefender: any = null;
  private enemyTeamDefender: any = null;
  
  /**
   * HELPER: Check if position is inside the attacking D circle
   */
  public isInsideAttackingD(x: number, y: number, isPlayerTeam: boolean): boolean {
    const goalX = isPlayerTeam ? this.fieldWidth - 30 : 30;
    const goalY = this.fieldHeight / 2;
    const distToGoal = Phaser.Math.Distance.Between(x, y, goalX, goalY);
    return distToGoal <= TUNING.D_CIRCLE_RADIUS;
  }
  
  /**
   * PART 3: Assign one defender per team
   * Called once at match start
   */
  assignDefenders(teammates: any[], enemies: any[]): void {
    // For player team: pick slowest or first available
    if (teammates.length > 0) {
      // Pick the one with lowest speed stat or first in array
      this.playerTeamDefender = teammates.reduce((slowest, t) => {
        const tSpeed = t.stats?.speed || t.speed || 100;
        const slowestSpeed = slowest.stats?.speed || slowest.speed || 100;
        return tSpeed < slowestSpeed ? t : slowest;
      }, teammates[0]);
      if (this.playerTeamDefender) {
        this.playerTeamDefender.assignedRole = 'DEFENDER';
        console.log(`[DEFENDER] Player team defender assigned: ${this.playerTeamDefender.id || 'teammate'}`);
      }
    }
    
    // For enemy team: pick slowest or first available  
    if (enemies.length > 0) {
      this.enemyTeamDefender = enemies.reduce((slowest, e) => {
        const eSpeed = e.stats?.speed || e.speed || 100;
        const slowestSpeed = slowest.stats?.speed || slowest.speed || 100;
        return eSpeed < slowestSpeed ? e : slowest;
      }, enemies[0]);
      if (this.enemyTeamDefender) {
        this.enemyTeamDefender.assignedRole = 'DEFENDER';
        console.log(`[DEFENDER] Enemy team defender assigned: ${this.enemyTeamDefender.id || 'enemy'}`);
      }
    }
  }
  
  /**
   * Check if entity is the assigned defender for their team
   */
  isAssignedDefender(entity: any, isPlayerTeam: boolean): boolean {
    return isPlayerTeam 
      ? entity === this.playerTeamDefender 
      : entity === this.enemyTeamDefender;
  }
  
  private getOffensiveDecision(
    entity: any,
    ball: any,
    player: any,
    teammates: any[],
    enemies: any[],
    isPlayerTeam: boolean
  ): AIDecision {
    const goalX = isPlayerTeam ? this.fieldWidth - 30 : 30;
    const goalY = this.fieldHeight / 2;
    const goalLineX = isPlayerTeam ? this.fieldWidth - 30 : 30;
    const defenders = isPlayerTeam ? enemies : [player, ...teammates];
    const teamMates = isPlayerTeam ? teammates : enemies.filter(e => e !== entity);
    
    const distToGoal = Phaser.Math.Distance.Between(entity.x, entity.y, goalX, goalY);
    const distToGoalLine = Math.abs(entity.x - goalLineX);
    const now = this.scene.time.now;
    
    // === STRICT D-CHECK: MUST BE INSIDE D TO SHOOT ===
    const dRadius = TUNING.D_CIRCLE_RADIUS;
    const inAttackingD = this.isInsideAttackingD(entity.x, entity.y, isPlayerTeam);
    
    // Track time in D with possession
    if (inAttackingD) {
      const prevTime = this.inDPossessionTime.get(entity) || 0;
      this.inDPossessionTime.set(entity, prevTime + 16);
    } else {
      this.inDPossessionTime.set(entity, 0);
    }
    
    const timeInD = this.inDPossessionTime.get(entity) || 0;
    
    // Detect if stuck (velocity near 0 but trying to move)
    const isStuck = entity.body && 
      Math.abs(entity.body.velocity.x) < 5 && 
      Math.abs(entity.body.velocity.y) < 5;
    
    if (isStuck && inAttackingD) {
      const stuckCount = (this.entityStuckCounter.get(entity) || 0) + 1;
      this.entityStuckCounter.set(entity, stuckCount);
    } else {
      this.entityStuckCounter.set(entity, 0);
    }
    
    const stuckTooLong = (this.entityStuckCounter.get(entity) || 0) > 15;
    
    // === FINISH CONDITIONS (FORCED ACTION) ===
    const isCloseRange = inAttackingD && distToGoalLine < TUNING.AI_FINISH_GOAL_LINE_DIST;
    const isVeryCloseRange = inAttackingD && distToGoalLine < TUNING.AI_FINISH_CLOSE_RANGE;
    const stallTimedOut = timeInD > TUNING.AI_FINISH_STALL_TIMEOUT;
    const atGoalLine = distToGoalLine < 25;
    
    // ENTER FINISH STATE when any condition met
    const shouldFinish = inAttackingD && (isVeryCloseRange || stallTimedOut || stuckTooLong || atGoalLine);
    
    if (shouldFinish) {
      console.log(`[AI FINISH] enter finish state - inD=${inAttackingD} closeRange=${isVeryCloseRange} stall=${stallTimedOut} stuck=${stuckTooLong} atGoalLine=${atGoalLine}`);
      
      // Reset timers
      this.inDPossessionTime.set(entity, 0);
      this.entityStuckCounter.set(entity, 0);
      
      // Check for blockers
      const blockers = defenders.filter(d => {
        const distToD = Phaser.Math.Distance.Between(entity.x, entity.y, d.x, d.y);
        return distToD < 60 && Math.abs(d.x - goalX) < Math.abs(entity.x - goalX);
      });
      
      // Find teammates in D for potential pass
      const teammatesInD = teamMates.filter(t => {
        const tDistToGoal = Phaser.Math.Distance.Between(t.x, t.y, goalX, goalY);
        return tDistToGoal < dRadius && t !== entity;
      });
      
      let reason = 'closeRange';
      if (stallTimedOut) reason = 'stallTimeout';
      if (stuckTooLong) reason = 'stuck';
      if (atGoalLine) reason = 'atGoalLine';
      
      // Decision: Pass if heavily blocked AND teammate in D, otherwise SHOOT
      if (blockers.length >= 2 && teammatesInD.length > 0 && !this.isOnPassCooldown(entity)) {
        const passTarget = teammatesInD[0];
        console.log(`[AI FINISH] action=pass reason=${reason} blockers=${blockers.length}`);
        this.setPassCooldown(entity);
        return { action: 'pass', targetEntity: passTarget, priority: 15 };
      }
      
      // Lateral strafe then shoot if at goal line
      if (atGoalLine) {
        // Strafe Y by 20-40px then shoot
        const strafeY = entity.y + (entity.y > goalY ? -30 : 30);
        const clampedStrafeY = Phaser.Math.Clamp(strafeY, 100, this.fieldHeight - 100);
        console.log(`[AI FINISH] action=strafeShoot reason=${reason} strafeY=${Math.round(clampedStrafeY)}`);
        // Small lateral move + immediate shoot target
        return { action: 'shoot', targetX: goalX, targetY: goalY + (Math.random() - 0.5) * 50, priority: 15 };
      }
      
      // DEFAULT: Force immediate shot to corner
      const targetY = goalY + (Math.random() > 0.5 ? -40 : 40);
      console.log(`[AI FINISH] action=shoot reason=${reason} distToGoal=${Math.round(distToGoal)}`);
      return { action: 'shoot', targetX: goalX, targetY: targetY, priority: 15 };
    }
    
    // === Regular offensive logic (not in finish state) ===
    
    // Check pressure
    const nearbyDefenders = defenders.filter(d =>
      Phaser.Math.Distance.Between(entity.x, entity.y, d.x, d.y) < TUNING.AI_PRESSURE_RADIUS
    );
    const isPressured = nearbyDefenders.length > 0;
    
    // ======================================================
    // PART 1: STRICT D-CHECK - NO SHOOT OUTSIDE D (EVER!)
    // ======================================================
    if (inAttackingD && distToGoal < TUNING.AI_SHOOT_RANGE) {
      // Inside D - can consider shooting
      const blockers = defenders.filter(d => {
        const distToD = Phaser.Math.Distance.Between(entity.x, entity.y, d.x, d.y);
        return distToD < 80 && Math.abs(d.x - goalX) < Math.abs(entity.x - goalX);
      });
      
      const angleToGoal = Math.atan2(goalY - entity.y, goalX - entity.x);
      const hasGoodAngle = isPlayerTeam
        ? Math.abs(angleToGoal) < TUNING.AI_SHOOT_ANGLE_THRESHOLD
        : Math.abs(Math.abs(angleToGoal) - Math.PI) < TUNING.AI_SHOOT_ANGLE_THRESHOLD;
      
      if (blockers.length <= 1 && hasGoodAngle) {
        console.log(`[AI] Taking shot: inside D (dist=${Math.round(distToGoal)})`);
        return { action: 'shoot', targetX: goalX, targetY: goalY + (Math.random() - 0.5) * 60, priority: 10 };
      }
    } else if (!inAttackingD) {
      // === OUTSIDE D - CANNOT SHOOT, MUST ENTER D OR PASS ===
      console.log(`[AI] Shot blocked: outside D (dist=${Math.round(distToGoal)}) -> switching to PASS/DRIVE`);
      
      // Find teammates inside D or closer to D
      const teammateInD = teamMates.find(t => this.isInsideAttackingD(t.x, t.y, isPlayerTeam));
      const teammateCloserToD = teamMates.find(t => {
        const tDistToGoal = Phaser.Math.Distance.Between(t.x, t.y, goalX, goalY);
        return tDistToGoal < distToGoal;
      });
      
      // Option 1: Pass to teammate in D (best option)
      if (teammateInD && !this.isOnPassCooldown(entity)) {
        const laneBlocked = this.isPassLaneBlocked(entity, teammateInD, defenders);
        if (!laneBlocked) {
          console.log(`[AI] Passing into D to teammate`);
          this.setPassCooldown(entity);
          return { action: 'pass', targetEntity: teammateInD, priority: 11 };
        }
      }
      
      // Option 2: Pass to teammate closer to D
      if (teammateCloserToD && isPressured && !this.isOnPassCooldown(entity)) {
        const laneBlocked = this.isPassLaneBlocked(entity, teammateCloserToD, defenders);
        if (!laneBlocked) {
          console.log(`[AI] Passing to teammate closer to D`);
          this.setPassCooldown(entity);
          return { action: 'pass', targetEntity: teammateCloserToD, priority: 9 };
        }
      }
      
      // Option 3: Drive toward D entry point (ENTER_D behavior)
      const dEntryPoint = this.getDEntryPoint(entity, goalX, goalY, isPlayerTeam);
      console.log(`[AI] Driving toward D entry at (${Math.round(dEntryPoint.x)}, ${Math.round(dEntryPoint.y)})`);
      return { action: 'move', targetX: dEntryPoint.x, targetY: dEntryPoint.y, priority: 8 };
    }
    
    // PASS if pressured (fallback)
    if (isPressured && !this.isOnPassCooldown(entity) && teamMates.length > 0) {
      const target = this.findBestPassTarget(entity, teamMates, defenders, isPlayerTeam);
      if (target) {
        this.setPassCooldown(entity);
        return { action: 'pass', targetEntity: target, priority: 9 };
      }
    }
    
    // DRIBBLE toward D (not goal line!)
    const dEntryTarget = this.getDEntryPoint(entity, goalX, goalY, isPlayerTeam);
    return { action: 'move', targetX: dEntryTarget.x, targetY: dEntryTarget.y, priority: 5 };
  }
  
  /**
   * PART 2: Get D entry point for carrier to drive into
   */
  private getDEntryPoint(entity: any, goalX: number, goalY: number, isPlayerTeam: boolean): { x: number; y: number } {
    // Entry points at edges of D circle
    const dRadius = TUNING.D_CIRCLE_RADIUS - 20;  // Slightly inside D
    
    // Decide which side to enter based on entity's Y position
    const enterFromTop = entity.y < goalY;
    const entryY = enterFromTop ? goalY - dRadius * 0.5 : goalY + dRadius * 0.5;
    
    // Entry X is at the edge of D
    const entryX = isPlayerTeam 
      ? this.fieldWidth - 30 - dRadius * 0.8
      : 30 + dRadius * 0.8;
    
    return { x: entryX, y: entryY };
  }
  
  /**
   * Teammate with ball - prioritize passing to player
   */
  private getTeammateOffensiveDecision(
    entity: any,
    ball: any,
    player: any,
    teammates: any[],
    enemies: any[]
  ): AIDecision {
    const goalX = this.fieldWidth - 30;
    const goalY = this.fieldHeight / 2;
    
    // Check if player is calling for pass
    if (player.isCallingForPass && !this.isOnPassCooldown(entity)) {
      const laneBlocked = this.isPassLaneBlocked(entity, player, enemies);
      if (!laneBlocked) {
        this.setPassCooldown(entity);
        return { action: 'pass', targetEntity: player, priority: 12 };
      }
    }
    
    return this.getOffensiveDecision(entity, ball, player, teammates, enemies, true);
  }
  
  // ========================================
  // SUPPORT DECISIONS
  // ========================================
  
  private getSupportDecision(
    entity: any,
    ball: any,
    teamMates: any[],
    isPlayerTeam: boolean,
    slotIndex: number
  ): AIDecision {
    const carrier = ball.owner;
    if (!carrier) {
      return this.getFormationDecision(entity, isPlayerTeam, slotIndex, ball);
    }
    
    const goalX = isPlayerTeam ? this.fieldWidth - 30 : 30;
    
    // Get triangle support position
    const supportPos = this.getTriangleSupportPosition(entity, carrier, teamMates, isPlayerTeam);
    
    return { action: 'move', targetX: supportPos.x, targetY: supportPos.y, priority: 6 };
  }
  
  private getTeammateSupportDecision(
    entity: any,
    ball: any,
    player: any,
    teammates: any[],
    enemies: any[],
    slotIndex: number
  ): AIDecision {
    const carrier = ball.owner;
    if (!carrier) {
      return this.getFormationDecision(entity, true, slotIndex, ball);
    }
    
    const supportPos = this.getTriangleSupportPosition(entity, carrier, [player, ...teammates], true);
    
    return { action: 'move', targetX: supportPos.x, targetY: supportPos.y, priority: 6 };
  }
  
  private getTriangleSupportPosition(
    entity: any,
    carrier: any,
    teamMates: any[],
    isPlayerTeam: boolean
  ): { x: number; y: number } {
    const goalX = isPlayerTeam ? this.fieldWidth - 30 : 30;
    const goalY = this.fieldHeight / 2;
    const dirToGoal = isPlayerTeam ? 1 : -1;
    
    // === PART 2: Prioritize getting into the D as passing option ===
    const carrierDistToGoal = Phaser.Math.Distance.Between(carrier.x, carrier.y, goalX, goalY);
    const entityDistToGoal = Phaser.Math.Distance.Between(entity.x, entity.y, goalX, goalY);
    const dRadius = TUNING.D_CIRCLE_RADIUS;
    
    // If carrier is outside D but close, support should move INTO D for a pass
    if (carrierDistToGoal > dRadius && carrierDistToGoal < dRadius * 2.5) {
      // Move to D entry point (near post / far post)
      const entryY = entity.y < goalY ? goalY - dRadius * 0.4 : goalY + dRadius * 0.4;
      const entryX = isPlayerTeam 
        ? this.fieldWidth - 30 - dRadius * 0.6
        : 30 + dRadius * 0.6;
      
      console.log(`[SUPPORT] Moving into D as pass option`);
      return { x: entryX, y: entryY };
    }
    
    // Standard triangle support
    const angleToGoal = Math.atan2(goalY - carrier.y, goalX - carrier.x);
    const offsetAngle = entity.y < carrier.y
      ? angleToGoal - Math.PI / 4
      : angleToGoal + Math.PI / 4;
    
    let targetX = carrier.x + Math.cos(offsetAngle) * TUNING.SUPPORT_TRIANGLE_OFFSET;
    let targetY = carrier.y + Math.sin(offsetAngle) * TUNING.SUPPORT_TRIANGLE_OFFSET;
    
    // Stay ahead for attack, behind for defense
    if (isPlayerTeam) {
      targetX = Math.max(targetX, carrier.x + 30);
    } else {
      targetX = Math.min(targetX, carrier.x - 30);
    }
    
    return {
      x: Phaser.Math.Clamp(targetX, 80, this.fieldWidth - 80),
      y: Phaser.Math.Clamp(targetY, 80, this.fieldHeight - 80)
    };
  }
  
  // ========================================
  // LOOSE BALL DECISIONS
  // ========================================
  
  private getLooseBallDecision(
    entity: any,
    ball: any,
    player: any,
    teammates: any[],
    enemies: any[],
    isPlayerTeam: boolean,
    slotIndex: number
  ): AIDecision {
    const distToBall = Phaser.Math.Distance.Between(entity.x, entity.y, ball.x, ball.y);
    const role = entity.aiConfig?.role || 'midfielder';
    
    let chaseThreshold: number;
    switch (role) {
      case 'forward': chaseThreshold = 380; break;
      case 'midfielder': chaseThreshold = 320; break;
      case 'defender': chaseThreshold = 220; break;
      default: chaseThreshold = 280;
    }
    
    const allTeam = isPlayerTeam ? [player, ...teammates] : enemies;
    
    if (distToBall < chaseThreshold && this.canChaseLooseBall(entity, ball, allTeam, isPlayerTeam)) {
      const predictedPos = ball.getPredictedPosition?.(280) || { x: ball.x, y: ball.y };
      return { action: 'move', targetX: predictedPos.x, targetY: predictedPos.y, priority: 9 };
    }
    
    return this.getFormationDecision(entity, isPlayerTeam, slotIndex, ball);
  }
  
  // ========================================
  // HELPER METHODS
  // ========================================
  
  private getFormationDecision(entity: any, isPlayerTeam: boolean, slotIndex: number, ball: any): AIDecision {
    const pos = this.getFormationPosition(entity, entity.aiConfig?.role || 'midfielder', slotIndex, isPlayerTeam, ball);
    return { action: 'move', targetX: pos.x, targetY: pos.y, priority: 3 };
  }
  
  private getFormationPosition(entity: any, role: AIRole, slotIndex: number, isPlayerTeam: boolean, ball: any): { x: number; y: number } {
    const ballX = ball?.x || this.fieldWidth / 2;
    let baseX: number;
    let baseY: number;
    
    if (isPlayerTeam) {
      switch (role) {
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
  
  private handleTransitions(playerTeamHasBall: boolean, enemyTeamHasBall: boolean, delta: number): void {
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
  }
  
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
   * AI-DEFENSE v3: Record a tackle attempt
   */
  recordTackleAttempt(success: boolean): void {
    this.tackleStats.attempts++;
    if (success) {
      this.tackleStats.successes++;
    }
  }
  
  /**
   * AI-DEFENSE v3: Record blocked tackle reason
   */
  recordTackleBlocked(reason: 'cooldown' | 'angle' | 'range'): void {
    switch (reason) {
      case 'cooldown':
        this.tackleStats.blockedByCooldown++;
        break;
      case 'angle':
        this.tackleStats.blockedByAngle++;
        break;
      case 'range':
        this.tackleStats.blockedByRange++;
        break;
    }
  }
  
  /**
   * Get tackle stats for F9 debug overlay
   */
  getTackleStats(): { attempts: number; successes: number; blockedByCooldown: number; blockedByAngle: number; blockedByRange: number } {
    return { ...this.tackleStats };
  }
  
  private canChaseLooseBall(entity: any, ball: any, allTeam: any[], isPlayerTeam: boolean): boolean {
    const chasers = isPlayerTeam ? this.playerTeamChasers : this.enemyTeamChasers;
    
    if (chasers.has(entity)) return true;
    
    const distances = allTeam.map(t => ({
      entity: t,
      dist: Phaser.Math.Distance.Between(t.x, t.y, ball.x, ball.y)
    }));
    distances.sort((a, b) => a.dist - b.dist);
    
    const myRank = distances.findIndex(d => d.entity === entity);
    
    if (myRank < TUNING.AI_MAX_CHASERS) {
      chasers.add(entity);
      return true;
    }
    
    return false;
  }
  
  private findBestPassTarget(
    entity: any,
    teamMates: any[],
    enemies: any[],
    isPlayerTeam: boolean
  ): any {
    if (teamMates.length === 0) return null;
    
    let bestTarget = null;
    let bestScore = -Infinity;
    
    const goalX = isPlayerTeam ? this.fieldWidth : 0;
    
    for (const tm of teamMates) {
      if (tm === entity) continue;
      
      const dist = Phaser.Math.Distance.Between(entity.x, entity.y, tm.x, tm.y);
      if (dist < TUNING.AI_PASS_MIN_DIST || dist > TUNING.AI_PASS_MAX_DIST) continue;
      
      let score = 50;
      
      // Lane check
      if (this.isPassLaneBlocked(entity, tm, enemies)) {
        score -= 40;
      } else {
        score += 20;
      }
      
      // Forward progress
      if (isPlayerTeam && tm.x > entity.x) score += 15;
      if (!isPlayerTeam && tm.x < entity.x) score += 15;
      
      // Openness
      let minEnemyDist = Infinity;
      for (const e of enemies) {
        const d = Phaser.Math.Distance.Between(tm.x, tm.y, e.x, e.y);
        if (d < minEnemyDist) minEnemyDist = d;
      }
      if (minEnemyDist > 80) score += 20;
      
      if (score > bestScore) {
        bestScore = score;
        bestTarget = tm;
      }
    }
    
    return bestScore > TUNING.PASS_SCORE_THRESHOLD ? bestTarget : null;
  }
  
  private isPassLaneBlocked(from: any, to: any, enemies: any[]): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return false;
    
    const nx = dx / dist;
    const ny = dy / dist;
    
    for (const enemy of enemies) {
      const ex = enemy.x - from.x;
      const ey = enemy.y - from.y;
      const projection = ex * nx + ey * ny;
      if (projection < 0 || projection > dist) continue;
      const perpDist = Math.abs(ex * ny - ey * nx);
      if (perpDist < TUNING.AI_LANE_WIDTH) return true;
    }
    
    return false;
  }
  
  private findDribbleTarget(entity: any, enemies: any[], goalX: number, goalY: number): { x: number; y: number } {
    let dx = goalX - entity.x;
    let dy = goalY - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= dist;
    dy /= dist;
    
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
    
    const blendedX = dx + avoidX * 0.6;
    const blendedY = dy + avoidY * 0.6;
    const blendLen = Math.sqrt(blendedX * blendedX + blendedY * blendedY) || 1;
    
    return {
      x: entity.x + (blendedX / blendLen) * 60,
      y: entity.y + (blendedY / blendLen) * 60
    };
  }
  
  // ========================================
  // DEBUG GETTERS
  // ========================================
  
  getDefenseAssignment(entity: any): DefenseAssignment | undefined {
    return this.enemyDefenseAssignments.get(entity) || this.teammateDefenseAssignments.get(entity);
  }
  
  getAllDefenseAssignments(): { enemies: DefenseAssignment[]; teammates: DefenseAssignment[] } {
    return {
      enemies: Array.from(this.enemyDefenseAssignments.values()),
      teammates: Array.from(this.teammateDefenseAssignments.values())
    };
  }
  
  // ========================================
  // STATIC CONFIGS
  // ========================================
  
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
        return { role: 'midfielder', aggressiveness: 0.95, skill: 0.7, speed: 1.1, reactionTime: 150 };
      case 'starForward':
        return { role: 'forward', aggressiveness: 0.8, skill: 0.95, speed: 1.2, reactionTime: 100 };
      default:
        return AISystem.createForwardConfig(0.8);
    }
  }
}
