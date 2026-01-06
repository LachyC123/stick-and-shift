// AISystem for Stick & Shift
// Manages AI behavior for teammates and enemies

import Phaser from 'phaser';

export type AIRole = 'defender' | 'midfielder' | 'forward' | 'goalkeeper';
export type AIState = 'idle' | 'chase' | 'attack' | 'defend' | 'support' | 'return' | 'press';

export interface AIConfig {
  role: AIRole;
  aggressiveness: number;  // 0-1
  skill: number;           // 0-1
  speed: number;          // Base speed multiplier
  reactionTime: number;   // MS delay before reactions
}

export interface AIDecision {
  action: 'move' | 'shoot' | 'pass' | 'tackle' | 'dodge' | 'wait';
  targetX?: number;
  targetY?: number;
  targetEntity?: any;
  priority: number;
}

export class AISystem {
  private scene: Phaser.Scene;
  
  // Field dimensions
  private fieldWidth: number = 1200;
  private fieldHeight: number = 700;
  private goalWidth: number = 120;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  // Get AI decision for a teammate
  getTeammateDecision(
    entity: any,
    ball: any,
    player: any,
    teammates: any[],
    enemies: any[],
    hasBall: boolean
  ): AIDecision {
    const config = entity.aiConfig as AIConfig;
    
    if (hasBall) {
      return this.getOffensiveDecision(entity, ball, player, teammates, enemies, config);
    } else if (ball.owner === null) {
      return this.getLooseBallDecision(entity, ball, player, teammates, enemies, config);
    } else if (this.isTeamHasBall(ball, player, teammates)) {
      return this.getSupportDecision(entity, ball, player, teammates, enemies, config);
    } else {
      return this.getDefensiveDecision(entity, ball, player, teammates, enemies, config);
    }
  }
  
  // Get AI decision for an enemy
  getEnemyDecision(
    entity: any,
    ball: any,
    player: any,
    teammates: any[],
    enemies: any[],
    hasBall: boolean
  ): AIDecision {
    const config = entity.aiConfig as AIConfig;
    
    if (hasBall) {
      return this.getEnemyOffensiveDecision(entity, ball, player, teammates, enemies, config);
    } else if (ball.owner === null) {
      return this.getLooseBallDecision(entity, ball, player, teammates, enemies, config);
    } else if (this.isEnemyHasBall(ball, enemies)) {
      return this.getEnemySupportDecision(entity, ball, enemies, config);
    } else {
      return this.getEnemyDefensiveDecision(entity, ball, player, teammates, config);
    }
  }
  
  private getOffensiveDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig): AIDecision {
    const goalX = this.fieldWidth;  // Enemy goal
    const goalY = this.fieldHeight / 2;
    
    // Check if in shooting range
    const distToGoal = Phaser.Math.Distance.Between(entity.x, entity.y, goalX, goalY);
    
    if (distToGoal < 200 && config.skill > 0.5) {
      // Shoot if in range and skilled
      return { action: 'shoot', targetX: goalX, targetY: goalY, priority: 10 };
    }
    
    // Check for passing options
    const nearbyEnemies = enemies.filter(e => 
      Phaser.Math.Distance.Between(entity.x, entity.y, e.x, e.y) < 100
    );
    
    if (nearbyEnemies.length > 1 && config.skill > 0.3) {
      // Under pressure, look for pass
      const passTarget = this.findBestPassTarget(entity, player, teammates, enemies);
      if (passTarget) {
        return { action: 'pass', targetEntity: passTarget, priority: 8 };
      }
    }
    
    // Dribble toward goal
    const moveTarget = this.getOffensivePosition(entity, config.role, goalX, goalY);
    return { action: 'move', targetX: moveTarget.x, targetY: moveTarget.y, priority: 5 };
  }
  
  private getLooseBallDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig): AIDecision {
    const distToBall = Phaser.Math.Distance.Between(entity.x, entity.y, ball.x, ball.y);
    
    // Chase the ball based on role
    const chaseThreshold = config.role === 'forward' ? 300 : config.role === 'midfielder' ? 400 : 250;
    
    if (distToBall < chaseThreshold) {
      return { action: 'move', targetX: ball.x, targetY: ball.y, priority: 9 };
    }
    
    // Return to position
    const homePos = this.getHomePosition(entity, config.role, false);
    return { action: 'move', targetX: homePos.x, targetY: homePos.y, priority: 3 };
  }
  
  private getSupportDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig): AIDecision {
    // Find good supporting position
    const supportPos = this.getSupportPosition(entity, ball.owner || player, config.role, true);
    return { action: 'move', targetX: supportPos.x, targetY: supportPos.y, priority: 6 };
  }
  
  private getDefensiveDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig): AIDecision {
    const ballCarrier = ball.owner;
    if (!ballCarrier) {
      return this.getLooseBallDecision(entity, ball, player, teammates, enemies, config);
    }
    
    const distToCarrier = Phaser.Math.Distance.Between(entity.x, entity.y, ballCarrier.x, ballCarrier.y);
    
    // Press if close and aggressive
    if (distToCarrier < 150 && config.aggressiveness > 0.5) {
      // Try to tackle
      if (distToCarrier < 50) {
        return { action: 'tackle', targetEntity: ballCarrier, priority: 10 };
      }
      return { action: 'move', targetX: ballCarrier.x, targetY: ballCarrier.y, priority: 8 };
    }
    
    // Cover goal
    const coverPos = this.getCoverPosition(entity, ballCarrier, config.role);
    return { action: 'move', targetX: coverPos.x, targetY: coverPos.y, priority: 5 };
  }
  
  private getEnemyOffensiveDecision(entity: any, ball: any, player: any, teammates: any[], enemies: any[], config: AIConfig): AIDecision {
    const goalX = 0;  // Player's goal
    const goalY = this.fieldHeight / 2;
    
    const distToGoal = Phaser.Math.Distance.Between(entity.x, entity.y, goalX, goalY);
    
    // Shoot if in range
    if (distToGoal < 180 + config.skill * 50) {
      return { action: 'shoot', targetX: goalX, targetY: goalY, priority: 10 };
    }
    
    // Check for pressure
    const nearbyDefenders = [player, ...teammates].filter(t => 
      Phaser.Math.Distance.Between(entity.x, entity.y, t.x, t.y) < 80
    );
    
    if (nearbyDefenders.length > 0 && enemies.length > 1) {
      // Pass to teammate
      const passTarget = this.findBestEnemyPassTarget(entity, enemies);
      if (passTarget) {
        return { action: 'pass', targetEntity: passTarget, priority: 8 };
      }
    }
    
    // Dribble
    const moveTarget = this.getEnemyOffensivePosition(entity, config.role);
    return { action: 'move', targetX: moveTarget.x, targetY: moveTarget.y, priority: 5 };
  }
  
  private getEnemySupportDecision(entity: any, ball: any, enemies: any[], config: AIConfig): AIDecision {
    const ballCarrier = ball.owner;
    const supportPos = this.getSupportPosition(entity, ballCarrier, config.role, false);
    return { action: 'move', targetX: supportPos.x, targetY: supportPos.y, priority: 6 };
  }
  
  private getEnemyDefensiveDecision(entity: any, ball: any, player: any, teammates: any[], config: AIConfig): AIDecision {
    const ballCarrier = ball.owner;
    if (!ballCarrier) {
      return { action: 'wait', priority: 1 };
    }
    
    const distToCarrier = Phaser.Math.Distance.Between(entity.x, entity.y, ballCarrier.x, ballCarrier.y);
    
    // Press based on aggressiveness
    if (distToCarrier < 100 + config.aggressiveness * 100) {
      if (distToCarrier < 50) {
        return { action: 'tackle', targetEntity: ballCarrier, priority: 10 };
      }
      return { action: 'move', targetX: ballCarrier.x, targetY: ballCarrier.y, priority: 8 };
    }
    
    // Return to defensive position
    const homePos = this.getHomePosition(entity, config.role, true);
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
  
  private findBestPassTarget(entity: any, player: any, teammates: any[], enemies: any[]): any {
    const candidates = [player, ...teammates].filter(t => t !== entity);
    
    let bestTarget = null;
    let bestScore = -Infinity;
    
    candidates.forEach(candidate => {
      const dist = Phaser.Math.Distance.Between(entity.x, entity.y, candidate.x, candidate.y);
      const toGoalDist = this.fieldWidth - candidate.x;
      
      // Score based on distance and position
      let score = (1 - dist / 500) * 50;  // Prefer closer
      score += (1 - toGoalDist / this.fieldWidth) * 30;  // Prefer forward
      
      // Penalize if covered
      const coveringEnemies = enemies.filter(e => 
        Phaser.Math.Distance.Between(candidate.x, candidate.y, e.x, e.y) < 60
      );
      score -= coveringEnemies.length * 20;
      
      if (score > bestScore) {
        bestScore = score;
        bestTarget = candidate;
      }
    });
    
    return bestScore > 0 ? bestTarget : null;
  }
  
  private findBestEnemyPassTarget(entity: any, enemies: any[]): any {
    const candidates = enemies.filter(e => e !== entity);
    
    let bestTarget = null;
    let bestScore = -Infinity;
    
    candidates.forEach(candidate => {
      const dist = Phaser.Math.Distance.Between(entity.x, entity.y, candidate.x, candidate.y);
      const toGoalDist = candidate.x;  // Closer to player's goal is better
      
      let score = (1 - dist / 500) * 50;
      score += (1 - toGoalDist / this.fieldWidth) * 30;
      
      if (score > bestScore) {
        bestScore = score;
        bestTarget = candidate;
      }
    });
    
    return bestScore > 0 ? bestTarget : null;
  }
  
  private getHomePosition(entity: any, role: AIRole, isEnemy: boolean): { x: number; y: number } {
    const midX = this.fieldWidth / 2;
    const midY = this.fieldHeight / 2;
    
    const positions: Record<AIRole, { x: number; y: number }> = {
      goalkeeper: { x: isEnemy ? this.fieldWidth - 50 : 50, y: midY },
      defender: { x: isEnemy ? this.fieldWidth - 200 : 200, y: midY + (Math.random() - 0.5) * 200 },
      midfielder: { x: midX + (isEnemy ? 100 : -100), y: midY + (Math.random() - 0.5) * 300 },
      forward: { x: isEnemy ? 300 : this.fieldWidth - 300, y: midY + (Math.random() - 0.5) * 200 }
    };
    
    return positions[role];
  }
  
  private getOffensivePosition(entity: any, role: AIRole, goalX: number, goalY: number): { x: number; y: number } {
    // Move toward goal with some variation
    const dx = goalX - entity.x;
    const dy = goalY - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const speed = 5;
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
  
  private getSupportPosition(entity: any, ballCarrier: any, role: AIRole, isTeammate: boolean): { x: number; y: number } {
    if (!ballCarrier) {
      return this.getHomePosition(entity, role, !isTeammate);
    }
    
    // Position for receiving pass
    const offsetX = isTeammate ? 100 : -100;
    const offsetY = (entity.y > this.fieldHeight / 2) ? -80 : 80;
    
    return {
      x: Phaser.Math.Clamp(ballCarrier.x + offsetX, 50, this.fieldWidth - 50),
      y: Phaser.Math.Clamp(ballCarrier.y + offsetY, 50, this.fieldHeight - 50)
    };
  }
  
  private getCoverPosition(entity: any, threat: any, role: AIRole): { x: number; y: number } {
    // Position between threat and goal
    const goalX = 0;
    const goalY = this.fieldHeight / 2;
    
    const coverX = threat.x * 0.3 + goalX * 0.7;
    const coverY = threat.y * 0.5 + goalY * 0.5;
    
    return { x: coverX, y: coverY };
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
