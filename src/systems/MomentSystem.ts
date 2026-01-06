// MomentSystem for Stick & Shift
// Manages moment objectives, timing, and progression

import Phaser from 'phaser';
import { MomentDefinition, generateRunMoments, MOMENT_MODIFIERS } from '../data/moments';
import { SaveSystem } from './SaveSystem';

export interface MomentState {
  definition: MomentDefinition;
  timeRemaining: number;
  playerScore: number;
  enemyScore: number;
  isComplete: boolean;
  isWon: boolean;
  objectiveProgress: number;
  objectiveTarget: number;
}

/** Simplified objective descriptor for AI to consume */
export interface ObjectiveDescriptor {
  type: 'score' | 'defend' | 'hold_possession' | 'force_turnovers' | 'pc_score' | 'survive' | 'generic';
  timeRemaining: number;
  targetTeam: 'player' | 'enemy';
  urgency: number;  // 0-1, higher = more urgent (close to objective or low time)
}

export class MomentSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private moments: MomentDefinition[] = [];
  private currentMomentIndex: number = 0;
  private currentState?: MomentState;
  private timer?: Phaser.Time.TimerEvent;
  private tickTimer?: Phaser.Time.TimerEvent;
  
  // Run stats
  private runStats = {
    momentsWon: 0,
    momentsLost: 0,
    goalsScored: 0,
    goalsConceded: 0,
    reboundGoals: 0,
    cleanSheets: 0,
    bossesBeaten: 0
  };
  
  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
  }
  
  // Start a new run with generated moments
  startRun(momentCount: number = 10): void {
    this.moments = generateRunMoments(momentCount);
    this.currentMomentIndex = 0;
    this.runStats = {
      momentsWon: 0,
      momentsLost: 0,
      goalsScored: 0,
      goalsConceded: 0,
      reboundGoals: 0,
      cleanSheets: 0,
      bossesBeaten: 0
    };
    
    this.emit('runStarted', { totalMoments: this.moments.length });
  }
  
  // Get current moment definition
  getCurrentMoment(): MomentDefinition | undefined {
    return this.moments[this.currentMomentIndex];
  }
  
  // Get current moment state
  getCurrentState(): MomentState | undefined {
    return this.currentState;
  }
  
  /**
   * Get a simplified objective descriptor for AI to consume
   * This allows AI to adjust behavior based on current objective
   */
  getObjectiveDescriptor(): ObjectiveDescriptor {
    if (!this.currentState) {
      return {
        type: 'generic',
        timeRemaining: 60,
        targetTeam: 'player',
        urgency: 0
      };
    }
    
    const state = this.currentState;
    const objective = state.definition.objective;
    
    // Map objective types
    let type: ObjectiveDescriptor['type'] = 'generic';
    switch (objective) {
      case 'score':
      case 'multiGoal':
      case 'reboundGoal':
      case 'assist':
        type = 'score';
        break;
      case 'defend':
      case 'survive':
        type = 'defend';
        break;
      case 'penaltyCorner':
      case 'pcBattle':
        type = 'pc_score';
        break;
      case 'turnover':
      case 'pressWin':
        type = 'force_turnovers';
        break;
      case 'possession':
        type = 'hold_possession';
        break;
      default:
        type = 'score';  // Default to scoring
    }
    
    // Calculate urgency (0-1)
    const timeFraction = 1 - (state.timeRemaining / state.definition.duration);
    const progressFraction = state.objectiveTarget > 0 
      ? state.objectiveProgress / state.objectiveTarget 
      : 0;
    const urgency = Math.min(1, timeFraction * 0.6 + (1 - progressFraction) * 0.4);
    
    // Determine target team based on objective
    const isDefensiveObjective = ['defend', 'survive', 'protectInjector'].includes(objective);
    
    return {
      type,
      timeRemaining: state.timeRemaining,
      targetTeam: isDefensiveObjective ? 'enemy' : 'player',
      urgency
    };
  }
  
  // Start the current moment
  startMoment(): void {
    const moment = this.getCurrentMoment();
    if (!moment) return;
    
    // Initialize state based on objective type
    let initialPlayerScore = 0;
    let initialEnemyScore = 0;
    let objectiveTarget = 1;
    
    switch (moment.objective) {
      case 'score':
        objectiveTarget = moment.targetScore || 1;
        break;
      case 'multiGoal':
        objectiveTarget = moment.targetScore || 2;
        break;
      case 'defend':
        initialPlayerScore = moment.defendScore || 1;
        objectiveTarget = 0;  // Don't concede
        break;
      case 'survive':
        objectiveTarget = 0;  // Don't concede
        break;
      case 'penaltyCorner':
        objectiveTarget = moment.targetScore || 1;
        break;
      case 'turnover':
        objectiveTarget = 1;  // Get 1 steal
        break;
      case 'pressWin':
        objectiveTarget = 2;  // Force 2 turnovers
        break;
      case 'reboundGoal':
        objectiveTarget = 1;
        break;
      case 'assist':
        objectiveTarget = 1;
        break;
    }
    
    this.currentState = {
      definition: moment,
      timeRemaining: moment.duration,
      playerScore: initialPlayerScore,
      enemyScore: initialEnemyScore,
      isComplete: false,
      isWon: false,
      objectiveProgress: 0,
      objectiveTarget
    };
    
    // Start timer
    this.startTimer();
    
    this.emit('momentStarted', {
      moment,
      momentNumber: this.currentMomentIndex + 1,
      totalMoments: this.moments.length,
      state: this.currentState
    });
    
    // Apply modifiers
    moment.modifiers.forEach(mod => {
      this.emit('modifierApplied', mod);
    });
  }
  
  private startTimer(): void {
    // Main countdown timer
    this.timer = this.scene.time.addEvent({
      delay: 1000,
      callback: () => this.tick(),
      loop: true
    });
    
    // Game tick for continuous updates
    this.tickTimer = this.scene.time.addEvent({
      delay: 100,
      callback: () => this.emit('gameTick'),
      loop: true
    });
  }
  
  private tick(): void {
    if (!this.currentState || this.currentState.isComplete) return;
    
    this.currentState.timeRemaining--;
    
    this.emit('timerTick', {
      remaining: this.currentState.timeRemaining,
      total: this.currentState.definition.duration
    });
    
    // Check for time-based completion
    if (this.currentState.timeRemaining <= 0) {
      this.checkCompletion();
    }
    
    // Warning sounds at low time
    if (this.currentState.timeRemaining <= 10 && this.currentState.timeRemaining > 0) {
      this.emit('timerWarning', this.currentState.timeRemaining);
    }
  }
  
  // Player scored a goal
  playerScored(isRebound: boolean = false, isFromAssist: boolean = false): void {
    if (!this.currentState || this.currentState.isComplete) return;
    
    this.currentState.playerScore++;
    this.runStats.goalsScored++;
    
    if (isRebound) {
      this.runStats.reboundGoals++;
    }
    
    // Update objective progress based on type
    switch (this.currentState.definition.objective) {
      case 'score':
      case 'multiGoal':
        this.currentState.objectiveProgress++;
        break;
      case 'reboundGoal':
        if (isRebound) {
          this.currentState.objectiveProgress++;
        }
        break;
      case 'assist':
        if (isFromAssist) {
          this.currentState.objectiveProgress++;
        }
        break;
      case 'penaltyCorner':
        this.currentState.objectiveProgress++;
        break;
    }
    
    this.emit('playerScored', {
      score: this.currentState.playerScore,
      isRebound,
      isFromAssist
    });
    
    this.checkCompletion();
  }
  
  // Enemy scored a goal
  enemyScored(): void {
    if (!this.currentState || this.currentState.isComplete) return;
    
    this.currentState.enemyScore++;
    this.runStats.goalsConceded++;
    
    this.emit('enemyScored', {
      score: this.currentState.enemyScore
    });
    
    this.checkCompletion();
  }
  
  /**
   * Player team got a steal/turnover
   * Called when player or teammate takes ball from enemy via tackle or intercept
   */
  playerStole(): void {
    if (!this.currentState || this.currentState.isComplete) return;
    
    const objective = this.currentState.definition.objective;
    
    console.log(`[MOMENT] playerStole() called - objective: ${objective}, progress: ${this.currentState.objectiveProgress}/${this.currentState.objectiveTarget}`);
    
    if (objective === 'turnover') {
      this.currentState.objectiveProgress++;
      console.log(`[MOMENT] Turnover progress: ${this.currentState.objectiveProgress}/${this.currentState.objectiveTarget}`);
      
      // Emit progress event for UI feedback
      this.emit('objectiveProgress', {
        objective: 'turnover',
        progress: this.currentState.objectiveProgress,
        target: this.currentState.objectiveTarget
      });
      
      this.checkCompletion();
    } else if (objective === 'pressWin') {
      // pressWin also counts steals
      this.currentState.objectiveProgress++;
      console.log(`[MOMENT] Press win progress: ${this.currentState.objectiveProgress}/${this.currentState.objectiveTarget}`);
      
      this.emit('objectiveProgress', {
        objective: 'pressWin',
        progress: this.currentState.objectiveProgress,
        target: this.currentState.objectiveTarget
      });
      
      this.checkCompletion();
    }
    
    this.emit('playerStole');
  }
  
  // Check if moment is complete
  private checkCompletion(): void {
    if (!this.currentState || this.currentState.isComplete) return;
    
    const state = this.currentState;
    const moment = state.definition;
    let isComplete = false;
    let isWon = false;
    
    switch (moment.objective) {
      case 'score':
      case 'multiGoal':
      case 'penaltyCorner':
      case 'reboundGoal':
      case 'assist':
        // Win by reaching target score
        if (state.objectiveProgress >= state.objectiveTarget) {
          isComplete = true;
          isWon = true;
        }
        // Lose if time runs out
        if (state.timeRemaining <= 0) {
          isComplete = true;
          isWon = state.objectiveProgress >= state.objectiveTarget;
        }
        break;
        
      case 'defend':
        // Lose if enemy ties or takes lead
        if (state.enemyScore >= state.playerScore) {
          isComplete = true;
          isWon = false;
        }
        // Win if time runs out with lead
        if (state.timeRemaining <= 0) {
          isComplete = true;
          isWon = state.playerScore > state.enemyScore;
        }
        break;
        
      case 'survive':
        // Lose if enemy scores
        if (state.enemyScore > 0) {
          isComplete = true;
          isWon = false;
        }
        // Win if time runs out without conceding
        if (state.timeRemaining <= 0) {
          isComplete = true;
          isWon = state.enemyScore === 0;
        }
        break;
        
      case 'turnover':
        // Win by getting a steal
        if (state.objectiveProgress >= state.objectiveTarget) {
          isComplete = true;
          isWon = true;
          console.log('[MOMENT] Turnover objective COMPLETED - WIN!');
        }
        // Lose if time runs out
        if (state.timeRemaining <= 0) {
          isComplete = true;
          isWon = false;
          console.log('[MOMENT] Turnover objective FAILED - time ran out');
        }
        break;
        
      case 'pressWin':
        // Win by forcing required number of turnovers
        if (state.objectiveProgress >= state.objectiveTarget) {
          isComplete = true;
          isWon = true;
          console.log('[MOMENT] Press Win objective COMPLETED - WIN!');
        }
        // Lose if time runs out
        if (state.timeRemaining <= 0) {
          isComplete = true;
          isWon = false;
          console.log('[MOMENT] Press Win objective FAILED - time ran out');
        }
        break;
    }
    
    if (isComplete) {
      this.completeMoment(isWon);
    }
  }
  
  private completeMoment(isWon: boolean): void {
    if (!this.currentState) return;
    
    this.currentState.isComplete = true;
    this.currentState.isWon = isWon;
    
    // Stop timers
    this.timer?.destroy();
    this.tickTimer?.destroy();
    
    // Update stats
    if (isWon) {
      this.runStats.momentsWon++;
      if (this.currentState.enemyScore === 0) {
        this.runStats.cleanSheets++;
      }
      if (this.currentState.definition.isBoss) {
        this.runStats.bossesBeaten++;
        SaveSystem.getInstance().addUniqueToStat(
          'uniqueBossesDefeated',
          this.currentState.definition.bossType || 'unknown'
        );
      }
    } else {
      this.runStats.momentsLost++;
    }
    
    this.emit('momentComplete', {
      isWon,
      state: this.currentState,
      momentNumber: this.currentMomentIndex + 1,
      isBoss: this.currentState.definition.isBoss
    });
  }
  
  // Advance to next moment
  nextMoment(): boolean {
    this.currentMomentIndex++;
    
    if (this.currentMomentIndex >= this.moments.length) {
      this.endRun();
      return false;
    }
    
    return true;
  }
  
  // End the run
  private endRun(): void {
    // Calculate rewards
    const baseReward = 50;
    const momentWinBonus = this.runStats.momentsWon * 15;
    const bossBonus = this.runStats.bossesBeaten * 50;
    const cleanSheetBonus = this.runStats.cleanSheets * 10;
    const goalBonus = this.runStats.goalsScored * 5;
    
    const totalReward = baseReward + momentWinBonus + bossBonus + cleanSheetBonus + goalBonus;
    
    // Apply meta bonuses
    const gemBonus = SaveSystem.getInstance().getMetaUpgradeLevel('bonusGems');
    const bonusPercent = gemBonus * 5;  // 5% per level
    const finalReward = Math.floor(totalReward * (1 + bonusPercent / 100));
    
    // Update persistent stats
    const saveSystem = SaveSystem.getInstance();
    saveSystem.incrementStat('totalRuns');
    saveSystem.incrementStat('totalMomentsWon', this.runStats.momentsWon);
    saveSystem.incrementStat('totalMomentsLost', this.runStats.momentsLost);
    saveSystem.incrementStat('totalGoals', this.runStats.goalsScored);
    saveSystem.incrementStat('totalBossWins', this.runStats.bossesBeaten);
    saveSystem.incrementStat('cleanSheets', this.runStats.cleanSheets);
    saveSystem.incrementStat('totalReboundGoals', this.runStats.reboundGoals);
    saveSystem.addGems(finalReward);
    
    this.emit('runComplete', {
      stats: this.runStats,
      reward: finalReward,
      breakdown: {
        base: baseReward,
        momentWins: momentWinBonus,
        bosses: bossBonus,
        cleanSheets: cleanSheetBonus,
        goals: goalBonus,
        bonus: finalReward - totalReward
      }
    });
  }
  
  // Get run progress
  getProgress(): { current: number; total: number; percentComplete: number } {
    return {
      current: this.currentMomentIndex + 1,
      total: this.moments.length,
      percentComplete: ((this.currentMomentIndex + 1) / this.moments.length) * 100
    };
  }
  
  // Get run stats
  getRunStats() {
    return { ...this.runStats };
  }
  
  // Check if current moment is a boss
  isBossMoment(): boolean {
    return this.getCurrentMoment()?.isBoss || false;
  }
  
  // Get active modifiers
  getActiveModifiers() {
    return this.getCurrentMoment()?.modifiers || [];
  }
  
  // Clean up
  destroy(): void {
    this.timer?.destroy();
    this.tickTimer?.destroy();
  }
}
