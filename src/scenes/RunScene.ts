// RunScene for Stick & Shift
// Main gameplay scene with field hockey action
// Improved: reliable goal detection, tuning constants, proc feedback

import Phaser from 'phaser';
import { Character } from '../data/characters';
import { Player } from '../entities/Player';
import { Ball } from '../entities/Ball';
import { TeammateAI } from '../entities/TeammateAI';
import { EnemyAI } from '../entities/EnemyAI';
import { EnemyGoalkeeper } from '../entities/EnemyGoalkeeper';
import { InputSystem } from '../systems/InputSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { MomentSystem } from '../systems/MomentSystem';
import { UISystem, MomentRecapStats } from '../systems/UISystem';
import { AudioSystem } from '../systems/AudioSystem';
import { AISystem } from '../systems/AISystem';
import { ParticleManager } from '../gfx/Particles';
import { TrailManager } from '../entities/TrailSegment';
import { UpgradeDraftOverlay } from '../ui/UpgradeDraftOverlay';
import { BuildScreenOverlay } from '../ui/BuildScreenOverlay';
import { ToastManager } from '../ui/Toast';
import { SaveSystem } from '../systems/SaveSystem';
import * as TUNING from '../data/tuning';

interface RunSceneData {
  character: Character;
}

export class RunScene extends Phaser.Scene {
  // Character
  private character!: Character;
  
  // Entities
  private player!: Player;
  private ball!: Ball;
  private teammates: TeammateAI[] = [];
  private enemies: EnemyAI[] = [];
  private enemyGoalkeeper?: EnemyGoalkeeper;
  
  // Systems
  private inputSystem!: InputSystem;
  private upgradeSystem!: UpgradeSystem;
  private momentSystem!: MomentSystem;
  private uiSystem!: UISystem;
  private audioSystem!: AudioSystem;
  private aiSystem!: AISystem;
  private particleManager!: ParticleManager;
  private trailManager!: TrailManager;
  private toastManager!: ToastManager;
  
  // Field dimensions
  private fieldWidth = 1200;
  private fieldHeight = 700;
  private goalWidth = 40;
  private goalHeight = TUNING.GOAL_MOUTH_HEIGHT;
  
  // Goal sensors (robust detection)
  private leftGoalSensor!: Phaser.GameObjects.Zone;
  private rightGoalSensor!: Phaser.GameObjects.Zone;
  private leftNetZone!: Phaser.GameObjects.Zone;
  private rightNetZone!: Phaser.GameObjects.Zone;
  private leftGoalGraphics!: Phaser.GameObjects.Graphics;
  private rightGoalGraphics!: Phaser.GameObjects.Graphics;
  
  // Goal detection
  private goalCooldownUntil: number = 0;
  private debugGoalSensors: boolean = false;
  private goalSensorDebugGraphics?: Phaser.GameObjects.Graphics;
  
  // State
  private isPaused = false;
  private isTransitioning = false;
  private isGoalScored = false;
  private isCountingDown = false;
  
  // Moment stats tracking
  private momentStats: MomentRecapStats = {
    goalsScored: 0,
    goalsConceded: 0,
    tacklesWon: 0,
    tacklesLost: 0,
    passesCompleted: 0,
    passesAttempted: 0,
    shotsOnTarget: 0,
    shotsTaken: 0,
    possessionTime: 0,
    totalTime: 0
  };
  private lastPossessionCheck: number = 0;
  
  constructor() {
    super({ key: 'RunScene' });
  }
  
  init(data: RunSceneData): void {
    this.character = data.character;
    this.resetMomentStats();
  }
  
  create(): void {
    // Set world bounds
    this.physics.world.setBounds(0, 0, this.fieldWidth, this.fieldHeight);
    
    // Initialize systems
    this.initializeSystems();
    
    // Create field
    this.createField();
    
    // Create goals with improved sensors
    this.createGoals();
    
    // Create entities
    this.createEntities();
    
    // Setup collisions
    this.setupCollisions();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup keyboard for debug
    this.setupDebugKeys();
    
    // Create UI
    this.uiSystem.createGameHUD();
    
    // Add AI-DEFENSE v3 HUD marker (Part A)
    this.createAIDefenseMarker();
    
    // Initialize particles
    this.particleManager.init();
    
    // Start the run
    this.momentSystem.startRun(10);
    
    // Initialize Cup Run HUD display
    const cupState = this.momentSystem.getCupState();
    this.uiSystem.updateCupRun(cupState.playerPoints, cupState.enemyPoints, cupState.pointsToWin);
    console.log('[CUP_RUN_START] Initialized: First to 5');
    
    // Check for first-run tutorial
    const saveSystem = SaveSystem.getInstance();
    const hasSeenTutorial = saveSystem.getStat('hasSeenTutorial');
    
    if (!hasSeenTutorial) {
      this.uiSystem.showFirstRunTutorial(() => {
        saveSystem.incrementStat('hasSeenTutorial');
        this.startMoment();
      });
    } else {
      this.time.delayedCall(500, () => {
        this.startMoment();
      });
    }
    
    // Camera setup
    this.cameras.main.setBounds(0, 0, this.fieldWidth, this.fieldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
    
    // Fade in
    this.cameras.main.fadeIn(300);
    
    // Set top only for UI interactions
    this.input.setTopOnly(true);
  }
  
  private initializeSystems(): void {
    this.inputSystem = new InputSystem(this);
    this.upgradeSystem = new UpgradeSystem(this);
    this.momentSystem = new MomentSystem(this);
    this.uiSystem = new UISystem(this);
    this.audioSystem = new AudioSystem(this);
    this.aiSystem = new AISystem(this);
    this.particleManager = new ParticleManager(this);
    this.trailManager = new TrailManager(this);
    this.toastManager = new ToastManager(this);
    
    (this as any).audioSystem = this.audioSystem;
    (this as any).inputSystem = this.inputSystem;
  }
  
  /**
   * Create the AI-DEFENSE v3 HUD marker (Part A)
   * Always visible during gameplay to confirm new code is running
   */
  // HUD markers for AI Defense and GK
  private gkStatusMarker?: Phaser.GameObjects.Text;
  
  private createAIDefenseMarker(): void {
    const marker = this.add.text(
      this.cameras.main.width - 10,
      10,
      'AI-DEFENSE v3 (tackle-enforced)',
      {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#00ff00',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 }
      }
    );
    marker.setOrigin(1, 0);  // Right-aligned
    marker.setScrollFactor(0);
    marker.setDepth(500);
    
    // GK Status marker (Part B - verification)
    this.gkStatusMarker = this.add.text(
      this.cameras.main.width - 10,
      28,
      'GK: LOADING...',
      {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffff00',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 }
      }
    );
    this.gkStatusMarker.setOrigin(1, 0);
    this.gkStatusMarker.setScrollFactor(0);
    this.gkStatusMarker.setDepth(500);
  }
  
  /**
   * Update GK status marker
   */
  private updateGKStatusMarker(): void {
    if (!this.gkStatusMarker) return;
    
    if (this.enemyGoalkeeper && TUNING.GK_ENABLED) {
      const gkInfo = this.enemyGoalkeeper.getDebugInfo();
      const state = gkInfo.isLunging ? 'LUNGE' : 'HOLD';
      this.gkStatusMarker.setText(`GK: ON (${state}) Saves:${gkInfo.saves}`);
      this.gkStatusMarker.setColor('#00ff00');
    } else if (!TUNING.GK_ENABLED) {
      this.gkStatusMarker.setText('GK: DISABLED');
      this.gkStatusMarker.setColor('#ff6600');
    } else {
      this.gkStatusMarker.setText('GK: OFF');
      this.gkStatusMarker.setColor('#ff0000');
    }
  }
  
  private createField(): void {
    // Turf background with stripes
    for (let y = 0; y < this.fieldHeight; y += 40) {
      const shade = Math.floor(y / 40) % 2 === 0 ? 0x228b22 : 0x1e7b1e;
      const stripe = this.add.rectangle(
        this.fieldWidth / 2,
        y + 20,
        this.fieldWidth,
        40,
        shade
      );
      stripe.setDepth(0);
    }
    
    // Field lines
    const lineGraphics = this.add.graphics();
    lineGraphics.lineStyle(4, 0xffffff, 0.8);
    lineGraphics.setDepth(1);
    
    // Boundary
    lineGraphics.strokeRect(20, 20, this.fieldWidth - 40, this.fieldHeight - 40);
    
    // Center line
    lineGraphics.beginPath();
    lineGraphics.moveTo(this.fieldWidth / 2, 20);
    lineGraphics.lineTo(this.fieldWidth / 2, this.fieldHeight - 20);
    lineGraphics.strokePath();
    
    // Center circle
    lineGraphics.strokeCircle(this.fieldWidth / 2, this.fieldHeight / 2, 60);
    
    // 23m lines
    lineGraphics.beginPath();
    lineGraphics.moveTo(250, 20);
    lineGraphics.lineTo(250, this.fieldHeight - 20);
    lineGraphics.strokePath();
    
    lineGraphics.beginPath();
    lineGraphics.moveTo(this.fieldWidth - 250, 20);
    lineGraphics.lineTo(this.fieldWidth - 250, this.fieldHeight - 20);
    lineGraphics.strokePath();
    
    // Shooting circles (D)
    lineGraphics.strokeCircle(0, this.fieldHeight / 2, 120);
    lineGraphics.strokeCircle(this.fieldWidth, this.fieldHeight / 2, 120);
    
    // Goal areas
    lineGraphics.fillStyle(0x1a5a1a, 0.5);
    lineGraphics.fillRect(0, this.fieldHeight / 2 - 60, 20, 120);
    lineGraphics.fillRect(this.fieldWidth - 20, this.fieldHeight / 2 - 60, 20, 120);
  }
  
  private createGoals(): void {
    const goalY = this.fieldHeight / 2;
    const sensorDepth = TUNING.GOAL_SENSOR_DEPTH;
    
    // === LEFT GOAL (player defends) ===
    // Goal sensor - covers the goal mouth and extends behind goal line
    this.leftGoalSensor = this.add.zone(
      sensorDepth / 2,  // Center x at half the sensor depth
      goalY,
      sensorDepth,
      this.goalHeight
    );
    this.physics.add.existing(this.leftGoalSensor, true);
    
    // Net zone - behind goal for bounces
    this.leftNetZone = this.add.zone(-15, goalY, 30, this.goalHeight + 40);
    this.physics.add.existing(this.leftNetZone, true);
    
    // Visual
    this.leftGoalGraphics = this.add.graphics();
    this.drawGoal(this.leftGoalGraphics, 0, goalY - 60, true);
    
    // === RIGHT GOAL (player attacks) ===
    // Goal sensor
    this.rightGoalSensor = this.add.zone(
      this.fieldWidth - sensorDepth / 2,
      goalY,
      sensorDepth,
      this.goalHeight
    );
    this.physics.add.existing(this.rightGoalSensor, true);
    
    // Net zone
    this.rightNetZone = this.add.zone(this.fieldWidth + 15, goalY, 30, this.goalHeight + 40);
    this.physics.add.existing(this.rightNetZone, true);
    
    // Visual
    this.rightGoalGraphics = this.add.graphics();
    this.drawGoal(this.rightGoalGraphics, this.fieldWidth - 15, goalY - 60, false);
    
    // Debug graphics
    this.goalSensorDebugGraphics = this.add.graphics();
    this.goalSensorDebugGraphics.setDepth(100);
  }
  
  private drawGoal(graphics: Phaser.GameObjects.Graphics, x: number, y: number, isLeft: boolean): void {
    graphics.setDepth(2);
    
    // Posts
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(x, y, 4, 120);
    graphics.fillRect(x + 11, y, 4, 120);
    graphics.fillRect(x, y - 4, 15, 4);
    
    // Net
    graphics.fillStyle(0x333333, 0.9);
    graphics.fillRect(x, y, 15, 120);
    
    // Net pattern
    graphics.lineStyle(1, 0xcccccc, 0.5);
    for (let i = 0; i < 12; i++) {
      graphics.beginPath();
      graphics.moveTo(x, y + i * 10);
      graphics.lineTo(x + 15, y + i * 10);
      graphics.strokePath();
    }
    for (let i = 0; i < 3; i++) {
      graphics.beginPath();
      graphics.moveTo(x + i * 5, y);
      graphics.lineTo(x + i * 5, y + 120);
      graphics.strokePath();
    }
  }
  
  private shakeGoalNet(isLeft: boolean): void {
    const graphics = isLeft ? this.leftGoalGraphics : this.rightGoalGraphics;
    
    this.tweens.add({
      targets: graphics,
      x: graphics.x + (isLeft ? -8 : 8),
      duration: 40,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut'
    });
  }
  
  /**
   * Show big "TURNOVER WON!" banner when steal objective is completed
   */
  private showTurnoverWonBanner(): void {
    const text = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      '🏆 TURNOVER WON! 🏆',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '52px',
        color: '#00ff00',
        fontStyle: 'bold',
        stroke: '#003300',
        strokeThickness: 8,
        shadow: {
          offsetX: 3,
          offsetY: 3,
          color: '#000000',
          blur: 8,
          fill: true
        }
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(500);
    text.setAlpha(0);
    text.setScale(0.5);
    
    // Animate in with punch
    this.tweens.add({
      targets: text,
      alpha: 1,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          onComplete: () => {
            // Hold then fade
            this.time.delayedCall(800, () => {
              this.tweens.add({
                targets: text,
                alpha: 0,
                y: text.y - 50,
                duration: 400,
                onComplete: () => text.destroy()
              });
            });
          }
        });
      }
    });
    
    // Add confetti celebration
    this.particleManager.goalCelebration(
      this.cameras.main.centerX,
      this.cameras.main.centerY
    );
  }
  
  // Debug display state
  private debugDisplayEnabled: boolean = false;
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private debugText?: Phaser.GameObjects.Text;
  
  // F4 D-circle debug
  private debugDCircle: boolean = false;
  private dCircleDebugGraphics?: Phaser.GameObjects.Graphics;
  private dCircleDebugText?: Phaser.GameObjects.Text;
  
  // AI tackle stats (for F9 debug)
  private tackleStats = {
    attempts: 0,
    successes: 0,
    blockedByCooldown: 0,
    blockedByAngle: 0,
    blockedByRange: 0
  };
  
  private setupDebugKeys(): void {
    // G key toggles goal sensor debug view
    this.input.keyboard?.on('keydown-G', () => {
      this.debugGoalSensors = !this.debugGoalSensors;
      this.updateGoalSensorDebug();
      this.toastManager.info(
        this.debugGoalSensors ? 'Goal sensors: ON' : 'Goal sensors: OFF',
        'Debug'
      );
    });
    
    // F1 toggles debug display (possession, objective, AI roles)
    this.input.keyboard?.on('keydown-F1', () => {
      this.debugDisplayEnabled = !this.debugDisplayEnabled;
      this.updateDebugDisplay();
      this.toastManager.info(
        this.debugDisplayEnabled ? 'Debug display: ON' : 'Debug display: OFF',
        'Debug'
      );
    });
    
    // F3 toggles steal moment debug (logs steal events)
    this.input.keyboard?.on('keydown-F3', () => {
      this.debugStealMoment = !this.debugStealMoment;
      this.toastManager.info(
        this.debugStealMoment ? 'Steal debug: ON' : 'Steal debug: OFF',
        'Debug'
      );
      if (this.debugStealMoment) {
        const cupState = this.momentSystem.getCupState();
        const moment = this.momentSystem.getCurrentMoment();
        const state = this.momentSystem.getCurrentState();
        console.log('=== STEAL MOMENT DEBUG ===');
        console.log(`Moment: ${moment?.name || 'none'} (${moment?.objective || 'none'})`);
        console.log(`Ball owner: ${this.ball.owner?.constructor?.name || 'LOOSE'}`);
        console.log(`Ball lastPossessingTeam: ${this.ball.lastPossessingTeam}`);
        console.log(`Objective progress: ${state?.objectiveProgress || 0}/${state?.objectiveTarget || 1}`);
        console.log(`Cup: ${cupState.playerPoints} - ${cupState.enemyPoints}`);
        console.log(`Init moment lock: ${this.isInitializingMoment}`);
        console.log('========================');
      }
    });
    
    // F4 toggles D-circle debug (shows D radius and shot origin info)
    this.input.keyboard?.on('keydown-F4', () => {
      this.debugDCircle = !this.debugDCircle;
      this.toastManager.info(
        this.debugDCircle ? 'D-circle debug: ON' : 'D-circle debug: OFF',
        'Debug'
      );
      this.updateDCircleDebug();
    });
    
    // F7 toggles sandbox test (places player in D with ball)
    this.input.keyboard?.on('keydown-F7', () => {
      this.toggleSandboxTest();
    });
    
    // F8 toggles upgrade debug overlay
    this.input.keyboard?.on('keydown-F8', () => {
      this.debugUpgrades = !this.debugUpgrades;
      this.toastManager.info(
        this.debugUpgrades ? 'Upgrade debug: ON' : 'Upgrade debug: OFF',
        'Debug'
      );
      this.updateUpgradeDebugOverlay();
    });
    
    // F9 toggles AI debug overlay
    this.input.keyboard?.on('keydown-F9', () => {
      this.debugAI = !this.debugAI;
      this.toastManager.info(
        this.debugAI ? 'AI debug: ON' : 'AI debug: OFF',
        'Debug'
      );
      this.updateAIDebugOverlay();
    });
    
    // TAB toggles Build Screen
    this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault();
      this.toggleBuildScreen();
    });
    
    // 1/2/3 for Play Calling
    this.input.keyboard?.on('keydown-ONE', () => this.callPlay('press'));
    this.input.keyboard?.on('keydown-TWO', () => this.callPlay('hold'));
    this.input.keyboard?.on('keydown-THREE', () => this.callPlay('counter'));
  }
  
  // ========================================
  // SANDBOX TEST (F7)
  // ========================================
  
  private sandboxTestActive: boolean = false;
  
  private toggleSandboxTest(): void {
    this.sandboxTestActive = !this.sandboxTestActive;
    
    if (this.sandboxTestActive) {
      console.log('[SANDBOX] Activating test - placing player in D with ball');
      
      // Place player in the attacking D (right side)
      const dX = this.fieldWidth - 150;  // In the D circle
      const dY = this.fieldHeight / 2;
      
      this.player.setPosition(dX, dY);
      this.player.hasBall = true;
      this.player.receiveBall();
      
      // Move ball to player
      this.ball.setPosition(dX + 20, dY);
      this.ball.owner = this.player;
      
      // Move enemies away
      this.enemies.forEach((e, i) => {
        e.setPosition(300 + i * 50, 200 + i * 100);
      });
      
      this.toastManager.info('Sandbox: Player in D with ball', '🧪');
      
      // Log state
      const inD = this.isPointInAttackingD('player', this.player.x, this.player.y);
      console.log(`[SANDBOX] Player at (${this.player.x}, ${this.player.y})`);
      console.log(`[SANDBOX] In attacking D: ${inD}`);
      console.log(`[SANDBOX] Has ball: ${this.player.hasBall}`);
      console.log(`[SANDBOX] Can shoot: ${this.player.canShoot()}`);
    } else {
      this.toastManager.info('Sandbox: Deactivated', '🧪');
    }
  }
  
  // ========================================
  // AI DEBUG OVERLAY (F9)
  // ========================================
  
  private debugAI: boolean = false;
  private aiDebugLabels: Phaser.GameObjects.Text[] = [];
  private aiDebugText?: Phaser.GameObjects.Text;
  private aiDebugGraphics?: Phaser.GameObjects.Graphics;
  
  private updateAIDebugOverlay(): void {
    // Clear old labels
    this.aiDebugLabels.forEach(l => l.destroy());
    this.aiDebugLabels = [];
    
    if (!this.aiDebugGraphics) {
      this.aiDebugGraphics = this.add.graphics();
      this.aiDebugGraphics.setDepth(299);
    }
    this.aiDebugGraphics.clear();
    
    if (!this.debugAI) {
      this.aiDebugText?.setVisible(false);
      return;
    }
    
    // Get defense planner assignments
    const assignments = this.aiSystem.getAllDefenseAssignments();
    
    // Show AI state labels above each AI entity
    [...this.teammates, ...this.enemies].forEach((ai, idx) => {
      const isEnemy = this.enemies.includes(ai as any);
      const assignment = this.aiSystem.getDefenseAssignment(ai);
      
      // Get role from defense planner if available, else from current state
      let displayRole = ai.currentState || 'unknown';
      let displayColor = isEnemy ? '#ff6666' : '#66ff66';
      
      if (assignment) {
        displayRole = assignment.role;
        
        // Color code by defense role
        switch (assignment.role) {
          case 'PRIMARY_PRESSER':
            displayColor = '#ff0000';  // Red - primary presser
            break;
          case 'SECOND_PRESSER':
            displayColor = '#ff8800';  // Orange - second presser
            break;
          case 'SHOT_BLOCKER':
            displayColor = '#ffff00';  // Yellow - shot blocker
            break;
          case 'LAST_MAN':
            displayColor = '#00ffff';  // Cyan - last man / goalkeeper-lite
            break;
          case 'MARKER':
            displayColor = '#ff00ff';  // Magenta - marker
            break;
        }
        
        // Draw line from AI to target
        this.aiDebugGraphics!.lineStyle(2, parseInt(displayColor.replace('#', '0x')), 0.5);
        this.aiDebugGraphics!.beginPath();
        this.aiDebugGraphics!.moveTo(ai.x, ai.y);
        this.aiDebugGraphics!.lineTo(assignment.target.x, assignment.target.y);
        this.aiDebugGraphics!.strokePath();
        
        // Draw target circle
        this.aiDebugGraphics!.fillStyle(parseInt(displayColor.replace('#', '0x')), 0.3);
        this.aiDebugGraphics!.fillCircle(assignment.target.x, assignment.target.y, 10);
        
        // Mark commit mode
        if (assignment.inCommitMode) {
          displayRole += ' [COMMIT]';
        }
      }
      
      const label = this.add.text(ai.x, ai.y - 45, displayRole, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: displayColor,
        backgroundColor: '#000000cc',
        padding: { x: 3, y: 2 },
        align: 'center',
        fontStyle: 'bold'
      });
      label.setOrigin(0.5);
      label.setDepth(300);
      this.aiDebugLabels.push(label);
    });
    
    // Highlight LAST_MAN with special indicator
    [...this.teammates, ...this.enemies].forEach(ai => {
      const assignment = this.aiSystem.getDefenseAssignment(ai);
      if (assignment?.role === 'LAST_MAN') {
        this.aiDebugGraphics!.lineStyle(3, 0x00ffff, 0.8);
        this.aiDebugGraphics!.strokeCircle(ai.x, ai.y, 30);
        
        // Draw goal protection arc
        const isEnemy = this.enemies.includes(ai as any);
        const goalX = isEnemy ? 30 : this.fieldWidth - 30;
        this.aiDebugGraphics!.lineStyle(2, 0x00ffff, 0.3);
        this.aiDebugGraphics!.beginPath();
        this.aiDebugGraphics!.arc(goalX, this.fieldHeight / 2, 100, -Math.PI / 2, Math.PI / 2, !isEnemy);
        this.aiDebugGraphics!.strokePath();
      }
    });
    
    // Create/update summary text
    if (!this.aiDebugText) {
      this.aiDebugText = this.add.text(10, 200, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffff00',
        backgroundColor: '#000000cc',
        padding: { x: 6, y: 4 }
      });
      this.aiDebugText.setScrollFactor(0);
      this.aiDebugText.setDepth(500);
    }
    
    // Build summary
    const ballOwner = this.ball.owner;
    const ballOwnerType = ballOwner 
      ? (this.enemies.includes(ballOwner) ? 'ENEMY' : (ballOwner === this.player ? 'PLAYER' : 'TEAMMATE'))
      : 'LOOSE';
    
    const objective = this.momentSystem.getObjectiveDescriptor();
    const play = this.aiSystem.getActivePlay();
    
    // Find primary presser for tackle debug
    let primaryPresser: any = null;
    let presserDist = Infinity;
    this.enemies.forEach(e => {
      const assignment = this.aiSystem.getDefenseAssignment(e);
      if (assignment?.role === 'PRIMARY_PRESSER') {
        primaryPresser = e;
        presserDist = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      }
    });
    
    // Draw tackle range circle on primary presser
    if (primaryPresser) {
      this.aiDebugGraphics!.lineStyle(2, 0xff0000, 0.6);
      this.aiDebugGraphics!.strokeCircle(primaryPresser.x, primaryPresser.y, TUNING.AI_TACKLE_RANGE);
      
      // Draw close range (no angle check) circle
      this.aiDebugGraphics!.lineStyle(1, 0xff6600, 0.4);
      this.aiDebugGraphics!.strokeCircle(primaryPresser.x, primaryPresser.y, TUNING.AI_TACKLE_RANGE * TUNING.AI_TACKLE_CLOSE_RANGE_MULT);
    }
    
    // Get GK info if available
    const gkInfo = this.enemyGoalkeeper?.getDebugInfo() || { saves: 0, lunges: 0, isLunging: false };
    
    const lines = [
      '=== AI-DEFENSE v3 (tackle-enforced) ===',
      `Ball: ${ballOwnerType}`,
      `Objective: ${objective.type}`,
      `Active Play: ${play || 'none'}`,
      '',
      '--- TACKLE STATS ---',
      `Attempts: ${this.aiSystem.getTackleStats().attempts}`,
      `Successes: ${this.aiSystem.getTackleStats().successes}`,
      `Blocked (CD): ${this.aiSystem.getTackleStats().blockedByCooldown}`,
      `Blocked (Angle): ${this.aiSystem.getTackleStats().blockedByAngle}`,
      `Blocked (Range): ${this.aiSystem.getTackleStats().blockedByRange}`,
      '',
      '--- PRIMARY PRESSER ---',
      primaryPresser ? `Dist: ${Math.round(presserDist)}px` : 'None assigned',
      primaryPresser ? `Range: ${TUNING.AI_TACKLE_RANGE}px` : '',
      primaryPresser ? `CD: ${TUNING.AI_TACKLE_COOLDOWN_MS}ms` : '',
      '',
      '--- GOALKEEPER ---',
      `Saves: ${gkInfo.saves}`,
      `Lunges: ${gkInfo.lunges}`,
      `Lunging: ${gkInfo.isLunging ? 'YES' : 'no'}`,
      '',
      '--- ENEMIES ---',
      ...this.enemies.slice(0, 3).map((e, i) => {
        const state = e.currentState || 'unknown';
        const dist = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
        return `  ${i}: ${state} (${Math.round(dist)}px)`;
      })
    ];
    
    this.aiDebugText.setText(lines.join('\n'));
    this.aiDebugText.setVisible(true);
  }
  
  /**
   * Update D-circle debug overlay (F4)
   * Shows D radius circles and shot origin info
   */
  private updateDCircleDebug(): void {
    if (!this.dCircleDebugGraphics) {
      this.dCircleDebugGraphics = this.add.graphics();
      this.dCircleDebugGraphics.setDepth(98);
    }
    this.dCircleDebugGraphics.clear();
    
    if (!this.debugDCircle) {
      this.dCircleDebugText?.setVisible(false);
      return;
    }
    
    const dRadius = TUNING.D_CIRCLE_RADIUS;
    const goalY = this.fieldHeight / 2;
    
    // Draw LEFT D-circle (enemy goal - where player needs to shoot from)
    this.dCircleDebugGraphics.lineStyle(3, 0x00ff00, 0.6);
    this.dCircleDebugGraphics.beginPath();
    this.dCircleDebugGraphics.arc(30, goalY, dRadius, -Math.PI / 2, Math.PI / 2, false);
    this.dCircleDebugGraphics.strokePath();
    
    // Draw RIGHT D-circle (player goal - where enemy shoots from)
    this.dCircleDebugGraphics.lineStyle(3, 0xff0000, 0.6);
    this.dCircleDebugGraphics.beginPath();
    this.dCircleDebugGraphics.arc(this.fieldWidth - 30, goalY, dRadius, Math.PI / 2, -Math.PI / 2, false);
    this.dCircleDebugGraphics.strokePath();
    
    // Fill attacking D with semi-transparent green
    this.dCircleDebugGraphics.fillStyle(0x00ff00, 0.15);
    this.dCircleDebugGraphics.beginPath();
    this.dCircleDebugGraphics.arc(this.fieldWidth - 30, goalY, dRadius, Math.PI / 2, -Math.PI / 2, false);
    this.dCircleDebugGraphics.fillPath();
    
    // Check if player is in attacking D
    const playerInD = this.isPointInAttackingD('player', this.player.x, this.player.y);
    
    // Highlight player if in D
    if (playerInD) {
      this.dCircleDebugGraphics.lineStyle(4, 0x00ff00, 1);
      this.dCircleDebugGraphics.strokeCircle(this.player.x, this.player.y, 25);
    }
    
    // Create/update info text
    if (!this.dCircleDebugText) {
      this.dCircleDebugText = this.add.text(10, this.cameras.main.height - 100, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#00ffff',
        backgroundColor: '#000000cc',
        padding: { x: 8, y: 6 }
      });
      this.dCircleDebugText.setScrollFactor(0);
      this.dCircleDebugText.setDepth(500);
    }
    
    // Get touch debug info from ball
    const touchInfo = this.ball.getTouchDebugInfo();
    const touchRecent = this.ball.isLastTouchInDRecent();
    
    const lines = [
      '=== D-CIRCLE DEBUG (F4) ===',
      `Player In Attacking D: ${playerInD ? 'YES ✓' : 'NO ✗'}`,
      `D Radius: ${dRadius}px`,
      '',
      '--- LAST TOUCH IN D (GOAL VALIDATION) ---',
      `Team: ${touchInfo.team}`,
      `Kind: ${touchInfo.kind}`,
      `Ms Ago: ${Math.round(touchInfo.msAgo)}`,
      `Recent (<4s): ${touchRecent ? 'YES ✓' : 'NO ✗'}`,
      `Position: (${Math.round(touchInfo.x)}, ${Math.round(touchInfo.y)})`,
      '',
      '--- LEGACY SHOT INFO ---',
      `Shot Team: ${this.ball.lastShotTeam}`,
      `Shot In D: ${this.ball.lastShotFromInsideD ? 'YES' : 'NO'}`,
      '',
      '--- GOAL RULES ---',
      `Require D: ${TUNING.REQUIRE_SHOT_FROM_D ? 'YES' : 'NO'}`,
      `Window: ${TUNING.SHOT_TO_GOAL_MAX_MS}ms`
    ];
    
    this.dCircleDebugText.setText(lines.join('\n'));
    this.dCircleDebugText.setVisible(true);
  }
  
  private debugStealMoment: boolean = false;
  private debugUpgrades: boolean = false;
  private upgradeDebugText?: Phaser.GameObjects.Text;
  private buildScreenOpen: boolean = false;
  private buildScreenOverlay?: any;
  
  private updateUpgradeDebugOverlay(): void {
    if (!this.debugUpgrades) {
      this.upgradeDebugText?.setVisible(false);
      return;
    }
    
    if (!this.upgradeDebugText) {
      this.upgradeDebugText = this.add.text(this.cameras.main.width - 10, 80, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#00ff00',
        backgroundColor: '#000000cc',
        padding: { x: 8, y: 6 }
      });
      this.upgradeDebugText.setOrigin(1, 0);
      this.upgradeDebugText.setScrollFactor(0);
      this.upgradeDebugText.setDepth(500);
    }
    
    const upgrades = this.upgradeSystem.getOwnedUpgrades();
    const cupState = this.momentSystem.getCupState();
    const curseName = this.uiSystem.getActiveCurseName();
    
    // Get debug info from UpgradeSystem
    const debugInfo = this.upgradeSystem.getDebugInfo();
    const topProcs = this.upgradeSystem.getTopProcs(5);
    const modifiers = debugInfo.modifiers;
    
    // Player state
    const playerHasBall = this.player.hasBall;
    const inAttackingD = this.isPointInAttackingD('player', this.player.x, this.player.y);
    const canShoot = this.player.canShoot();
    
    const lines = [
      '=== UPGRADE DEBUG (F8) ===',
      '',
      '--- PLAYER STATE ---',
      `Has Ball: ${playerHasBall}`,
      `In Attacking D: ${inAttackingD}`,
      `Can Shoot: ${canShoot}`,
      '',
      '--- HEALTH / STAMINA ---',
      `Health: ${Math.ceil(this.player.health)}/${this.player.maxHealth}`,
      `Stamina: ${Math.ceil(this.player.stamina)}/${this.player.maxStamina}`,
      `Can Dash: ${this.player.canDash}`,
      `Last Damage: ${this.player.lastDamageAmount} (${Math.round((this.time.now - this.player.lastDamageTime) / 1000)}s ago)`,
      '',
      '--- UPGRADES ---',
      `Active: ${upgrades.length}`,
      ...upgrades.slice(0, 6).map(u => `  • ${u.name}`),
      upgrades.length > 6 ? `  ... +${upgrades.length - 6} more` : '',
      '',
      '--- EVENT STATS/SEC ---',
      `tick: ${debugInfo.eventStats.tick} | shot: ${debugInfo.eventStats.shot}`,
      `pass: ${debugInfo.eventStats.pass} | tackle: ${debugInfo.eventStats.tackle}`,
      `steal: ${debugInfo.eventStats.steal} | receive: ${debugInfo.eventStats.receive}`,
      '',
      '--- HOOKS REGISTERED ---',
      ...Object.entries(debugInfo.hookCounts).filter(([k, v]) => v > 0).map(([k, v]) => `  ${k}: ${v}`),
      '',
      '--- RECENT PROCS ---',
      ...debugInfo.recentProcs.slice(0, 5).map(p => `  ${p.upgradeName}`),
      debugInfo.recentProcs.length === 0 ? '  (none)' : '',
      '',
      '--- TOP PROCS ---',
      ...topProcs.map(p => `  ${p.upgradeName}: ${p.count}x`),
      topProcs.length === 0 ? '  (none)' : '',
      '',
      '--- STAT MODIFIERS ---',
      ...Object.entries(modifiers).slice(0, 6).map(([k, v]) => `  ${k}: +${v}%`),
      Object.keys(modifiers).length === 0 ? '  (none)' : '',
      '',
      '--- CUP RUN ---',
      `You ${cupState.playerPoints} - ${cupState.enemyPoints} Enemy`,
      `Curse: ${curseName || 'none'}`,
    ];
    
    this.upgradeDebugText.setText(lines.filter(l => l).join('\n'));
    this.upgradeDebugText.setVisible(true);
  }
  
  // ========================================
  // BUILD SCREEN (TAB)
  // ========================================
  
  private toggleBuildScreen(): void {
    if (this.buildScreenOpen) {
      this.closeBuildScreen();
    } else {
      this.openBuildScreen();
    }
  }
  
  private openBuildScreen(): void {
    if (this.buildScreenOpen) return;
    
    this.buildScreenOpen = true;
    this.physics.pause();  // Pause gameplay
    
    const cupState = this.momentSystem.getCupState();
    const moment = this.momentSystem.getCurrentMoment();
    const progress = this.momentSystem.getProgress();
    const curseName = this.uiSystem.getActiveCurseName();
    
    // Get curse details if active
    let activeCurse = null;
    if (curseName && cupState.activeCurseId) {
      import('../data/curses').then(({ getCurseById }) => {
        const curse = getCurseById(cupState.activeCurseId!);
        if (curse) {
          activeCurse = {
            name: curse.name,
            boonDescription: curse.boonDescription,
            curseDescription: curse.curseDescription
          };
        }
      });
    }
    
    this.buildScreenOverlay = new BuildScreenOverlay(this, {
      upgradeSystem: this.upgradeSystem,
      character: this.character,
      baseStats: this.character.stats,
      cupPlayerPoints: cupState.playerPoints,
      cupEnemyPoints: cupState.enemyPoints,
      currentMoment: progress.current,
      objectiveText: moment?.description || 'Score!',
      activeCurse: curseName ? {
        name: curseName,
        boonDescription: 'Active curse effect',
        curseDescription: 'Curse penalty active'
      } : null,
      onClose: () => this.closeBuildScreen()
    });
  }
  
  private closeBuildScreen(): void {
    if (!this.buildScreenOpen) return;
    
    this.buildScreenOpen = false;
    this.buildScreenOverlay?.destroy();
    this.buildScreenOverlay = null;
    this.physics.resume();  // Resume gameplay
  }
  
  // ========================================
  // PLAY CALLING (1/2/3)
  // ========================================
  
  private callPlay(play: 'press' | 'hold' | 'counter'): void {
    if (this.buildScreenOpen) return;
    
    const success = this.upgradeSystem.callPlay(play);
    
    if (success) {
      // Show banner
      this.showPlayCalledBanner(play);
      this.audioSystem.playUpgrade();  // Play a sound
      
      // Update AI behavior
      this.applyPlayToAI(play);
      
      // Update HUD
      this.uiSystem.showPlayActive(play, 8000);
    } else {
      // On cooldown
      const state = this.upgradeSystem.getActivePlay();
      const cooldownSec = Math.ceil(state.cooldownRemaining / 1000);
      this.toastManager.info(`Play on cooldown: ${cooldownSec}s`, '⏳');
    }
  }
  
  private showPlayCalledBanner(play: string): void {
    const playNames: Record<string, string> = {
      press: '🏃 PRESS!',
      hold: '🛡️ HOLD!',
      counter: '⚡ COUNTER!'
    };
    
    const banner = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 100,
      playNames[play] || play.toUpperCase(),
      {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    banner.setOrigin(0.5, 0.5);
    banner.setScrollFactor(0);
    banner.setDepth(500);
    banner.setScale(0);
    
    // Animate
    this.tweens.add({
      targets: banner,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(800, () => {
          this.tweens.add({
            targets: banner,
            alpha: 0,
            y: banner.y - 50,
            duration: 400,
            onComplete: () => banner.destroy()
          });
        });
      }
    });
  }
  
  private applyPlayToAI(play: 'press' | 'hold' | 'counter'): void {
    // Emit event for AISystem to pick up
    this.events.emit('playCallChanged', play);
    
    // Also set on AISystem directly
    this.aiSystem.setActivePlay(play);
    
    console.log(`[PLAY] ${play.toUpperCase()} called`);
  }
  
  private updateActiveBuffsUI(): void {
    // Get active buffs from UpgradeSystem
    const buffs = this.upgradeSystem.getActiveBuffs();
    const now = this.time.now;
    
    // Format buffs for UI
    const uiBuffs = buffs.map(buff => ({
      id: buff.id,
      name: buff.name,
      icon: buff.icon,
      timeRemaining: buff.expiresAt - now,
      source: buff.source
    }));
    
    // Update UI
    this.uiSystem.updateActiveBuffs(uiBuffs);
  }
  
  private updateDebugDisplay(): void {
    if (!this.debugDisplayEnabled) {
      this.debugGraphics?.clear();
      this.debugText?.setVisible(false);
      return;
    }
    
    // Create debug elements if needed
    if (!this.debugGraphics) {
      this.debugGraphics = this.add.graphics();
      this.debugGraphics.setDepth(200);
    }
    
    if (!this.debugText) {
      this.debugText = this.add.text(10, 140, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#00ff00',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 4 }
      });
      this.debugText.setScrollFactor(0);
      this.debugText.setDepth(200);
    }
    
    this.debugText.setVisible(true);
    
    // Build debug info
    const objective = this.momentSystem.getObjectiveDescriptor();
    const possession = this.player.hasBall ? 'PLAYER' :
                       this.teammates.some(t => t.hasBall) ? 'TEAMMATE' :
                       this.enemies.some(e => e.hasBall) ? 'ENEMY' : 'LOOSE';
    
    // Get moment state for objective progress
    const momentState = this.momentSystem.getCurrentState();
    const momentDef = this.momentSystem.getCurrentMoment();
    const objProgress = momentState?.objectiveProgress ?? 0;
    const objTarget = momentState?.objectiveTarget ?? 1;
    const objComplete = momentState?.isComplete ?? false;
    const lastPossTeam = this.ball.lastPossessingTeam;
    
    // Determine ball owner name for debug
    let ballOwnerName = 'LOOSE';
    if (this.ball.owner === this.player) {
      ballOwnerName = 'PLAYER';
    } else if (this.teammates.includes(this.ball.owner)) {
      ballOwnerName = `TEAMMATE (${this.ball.owner?.role || '?'})`;
    } else if (this.enemies.includes(this.ball.owner)) {
      ballOwnerName = `ENEMY (${this.ball.owner?.role || '?'})`;
    }
    
    const lines = [
      `=== DEBUG (F1 to hide) ===`,
      `Ball Owner: ${ballOwnerName}`,
      `Ball isLoose: ${this.ball.isLoose}`,
      `Last Poss Team: ${lastPossTeam}`,
      `Init Moment: ${this.isInitializingMoment}`,
      ``,
      `Objective: ${momentDef?.objective || objective.type}`,
      `Progress: ${objProgress}/${objTarget}`,
      `Complete: ${objComplete ? 'YES' : 'no'}`,
      `Time: ${objective.timeRemaining}s`,
      ``,
      `Player: ${this.player.hasBall ? 'HAS BALL' : 'no ball'}`,
      `  Calling: ${this.player.isCallingForPass ? 'YES' : 'no'}`,
      `  Stunned: ${this.player.isStunned}`,
      ``,
      `Ball speed: ${Math.floor(this.ball.getSpeed())}`
    ];
    
    this.debugText.setText(lines.join('\n'));
    
    // Draw "CALLING" above player when calling for pass
    this.debugGraphics.clear();
    if (this.player.isCallingForPass) {
      this.debugGraphics.lineStyle(2, 0x00ff00, 1);
      this.debugGraphics.strokeCircle(this.player.x, this.player.y, 35);
      
      // Draw text above player
      const callText = this.add.text(this.player.x, this.player.y - 45, 'CALLING!', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#00ff00',
        fontStyle: 'bold'
      });
      callText.setOrigin(0.5);
      callText.setDepth(201);
      
      // Remove after a short time
      this.time.delayedCall(100, () => callText.destroy());
    }
  }
  
  /**
   * Show debug line for pass (when F1 debug is on)
   */
  private showPassDebugLine(from: any, to: any): void {
    if (!this.debugDisplayEnabled) return;
    
    const graphics = this.add.graphics();
    graphics.setDepth(150);
    graphics.lineStyle(3, 0x00ff00, 0.8);
    graphics.beginPath();
    graphics.moveTo(from.x, from.y);
    graphics.lineTo(to.x, to.y);
    graphics.strokePath();
    
    // Arrow head
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowSize = 12;
    graphics.fillStyle(0x00ff00, 0.8);
    graphics.fillTriangle(
      to.x, to.y,
      to.x - Math.cos(angle - 0.4) * arrowSize, to.y - Math.sin(angle - 0.4) * arrowSize,
      to.x - Math.cos(angle + 0.4) * arrowSize, to.y - Math.sin(angle + 0.4) * arrowSize
    );
    
    // Fade out and destroy
    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 600,
      onComplete: () => graphics.destroy()
    });
  }
  
  private updateGoalSensorDebug(): void {
    if (!this.goalSensorDebugGraphics) return;
    
    this.goalSensorDebugGraphics.clear();
    
    if (this.debugGoalSensors) {
      const goalY = this.fieldHeight / 2;
      const sensorDepth = TUNING.GOAL_SENSOR_DEPTH;
      
      // Left goal sensor
      this.goalSensorDebugGraphics.lineStyle(3, 0x00ff00, 1);
      this.goalSensorDebugGraphics.strokeRect(
        0,
        goalY - this.goalHeight / 2,
        sensorDepth,
        this.goalHeight
      );
      
      // Right goal sensor
      this.goalSensorDebugGraphics.strokeRect(
        this.fieldWidth - sensorDepth,
        goalY - this.goalHeight / 2,
        sensorDepth,
        this.goalHeight
      );
      
      // Labels
      this.goalSensorDebugGraphics.fillStyle(0x00ff00, 1);
    }
  }
  
  private createEntities(): void {
    // Create player
    this.player = new Player(this, 200, this.fieldHeight / 2, this.character);
    this.player.setUpgradeSystem(this.upgradeSystem);
    
    // Player action callbacks
    this.player.onShoot = (power, angle) => {
      this.audioSystem.playShoot();
      
      // Record shot origin BEFORE the kick (Part B: D-circle scoring rule)
      const isInsideD = this.isPointInAttackingD('player', this.player.x, this.player.y);
      this.ball.recordShotOrigin(this.player.x, this.player.y, 'player', isInsideD);
      
      // === REGISTER TOUCH IN D (Part A FIX) - CRITICAL FOR GOAL VALIDATION ===
      this.ball.registerTouch('player', 'player', this.player.x, this.player.y, 'shot', isInsideD);
      
      // Use the Ball's kick method with the calculated power
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      this.ball.kick(direction, power, TUNING.SHOT_SPIN_BASE * (Math.random() - 0.5), 'shot');
      this.ball.lastShooter = this.player;
      this.ball.lastOwner = this.player;
      this.ball.isLoose = true;
      this.ball.owner = null;
      
      // Track player team possession
      this.ball.setLastPossessingTeam('player');
      
      this.momentStats.shotsTaken++;
      
      // Check if shot is on target
      if (Math.cos(angle) > 0.3) {
        this.momentStats.shotsOnTarget++;
      }
    };
    
    this.player.onPass = (angle, passSpeed, targetPos) => {
      this.audioSystem.playPass();
      
      // Find nearest teammate in pass direction for receive assist
      let intendedTarget = null;
      let bestScore = -Infinity;
      
      for (const t of this.teammates) {
        const dx = t.x - this.player.x;
        const dy = t.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 50 || dist > 400) continue;
        
        const angleToT = Math.atan2(dy, dx);
        const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToT - angle));
        
        if (angleDiff < Math.PI / 6) {  // Within 30 degrees
          const score = 100 - angleDiff * 50 - dist * 0.1;
          if (score > bestScore) {
            bestScore = score;
            intendedTarget = t;
          }
        }
      }
      
      // Use pass method with intended receiver for receive assist
      this.ball.pass(passSpeed, angle, this.player, intendedTarget);
      
      // Track player team possession
      this.ball.setLastPossessingTeam('player');
      
      this.momentStats.passesAttempted++;
      
      // Debug: show pass line
      if (this.debugDisplayEnabled && intendedTarget) {
        this.showPassDebugLine(this.player, intendedTarget);
      }
    };
    
    this.player.onTackle = () => {
      this.audioSystem.playTackle();
      this.attemptTackle(this.player);
    };
    
    this.player.onDodge = () => {
      this.audioSystem.playDodge();
      this.particleManager.dodgeEffect(this.player.x, this.player.y, this.player.getFacingAngle());
    };
    
    this.player.onShootFailed = () => {
      this.uiSystem.showNoPossessionFeedback();
      this.audioSystem.playClick();
    };
    
    // Create ball
    this.ball = new Ball(this, this.fieldWidth / 2, this.fieldHeight / 2);
    
    // Create teammates
    this.createTeammates(3);
    
    // Create enemies
    this.createEnemies(3);
    
    // Create enemy goalkeeper (Part C)
    this.createEnemyGoalkeeper();
    
    // Set entity references
    this.updateEntityReferences();
  }
  
  /**
   * Create enemy goalkeeper (Part C)
   */
  private createEnemyGoalkeeper(): void {
    if (!TUNING.GK_ENABLED) return;
    
    // Destroy old GK if exists
    this.enemyGoalkeeper?.destroy();
    
    // Create new GK
    this.enemyGoalkeeper = new EnemyGoalkeeper(this, this.fieldWidth, this.fieldHeight);
    this.enemyGoalkeeper.setBall(this.ball);
    
    // Setup collision with ball
    this.physics.add.overlap(this.enemyGoalkeeper, this.ball, () => {
      if (this.ball.isLoose && this.ball.getSpeed() > 80) {
        this.enemyGoalkeeper!.onBallContact(this.ball);
      }
    });
    
    console.log('[GK] Enemy goalkeeper created');
  }
  
  private createTeammates(count: number): void {
    this.teammates.forEach(t => t.destroy());
    this.teammates = [];
    
    const roles: ('defender' | 'midfielder' | 'forward')[] = ['defender', 'midfielder', 'forward'];
    const midX = this.fieldWidth / 2;
    const midY = this.fieldHeight / 2;
    
    // Kickoff positions - ALL in left half (player team's half)
    // Spread vertically for good coverage
    const positions = [
      { x: midX - 250, y: midY - 120 },  // Defender - back left
      { x: midX - 180, y: midY + 80 },   // Midfielder - mid left  
      { x: midX - 100, y: midY - 40 }    // Forward - closer to center
    ];
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const teammate = new TeammateAI(
        this,
        positions[i].x,
        positions[i].y,
        roles[i],
        this.getColorIndex(this.character.color),
        this.aiSystem  // Pass shared AISystem
      );
      
      teammate.onShoot = (power, angle) => {
        // Record shot origin BEFORE the kick (Part B: D-circle scoring rule)
        const isInsideD = this.isPointInAttackingD('player', teammate.x, teammate.y);
        this.ball.recordShotOrigin(teammate.x, teammate.y, 'player', isInsideD);
        
        // === REGISTER TOUCH IN D (Part A FIX) ===
        this.ball.registerTouch('player', `teammate_${i}`, teammate.x, teammate.y, 'shot', isInsideD);
        
        const direction = { x: Math.cos(angle), y: Math.sin(angle) };
        this.ball.kick(direction, power, 0, 'shot');
        this.ball.lastShooter = teammate;
        this.ball.lastOwner = teammate;
        this.ball.isLoose = true;
        this.ball.owner = null;
        // Track player team possession
        this.ball.setLastPossessingTeam('player');
      };
      
      teammate.onPass = (angle, target) => {
        this.audioSystem.playPass();
        const passSpeed = TUNING.PASS_SPEED_BASE + 5 * TUNING.PASS_SPEED_SCALE;
        
        // Use pass method with intended receiver for receive assist
        this.ball.pass(passSpeed, angle, teammate, target);
        
        // Track player team possession
        this.ball.setLastPossessingTeam('player');
        
        // Debug: show pass line
        if (this.debugDisplayEnabled && target) {
          this.showPassDebugLine(teammate, target);
        }
      };
      
      teammate.onTackle = (target) => {
        this.attemptTackle(teammate, target);
      };
      
      this.teammates.push(teammate);
    }
  }
  
  private createEnemies(count: number, hasBoss: boolean = false): void {
    this.enemies.forEach(e => e.destroy());
    this.enemies = [];
    
    const roles: ('defender' | 'midfielder' | 'forward')[] = ['defender', 'midfielder', 'forward'];
    const midX = this.fieldWidth / 2;
    const midY = this.fieldHeight / 2;
    
    // Kickoff positions - ALL in right half (enemy team's half)
    // Spread vertically for good coverage
    const positions = [
      { x: midX + 250, y: midY },         // Defender - back center
      { x: midX + 180, y: midY - 100 },   // Midfielder - mid right top
      { x: midX + 100, y: midY + 60 },    // Forward - closer to center
      { x: midX + 220, y: midY + 120 },   // Extra defender
      { x: midX + 150, y: midY - 50 }     // Extra midfielder
    ];
    
    const moment = this.momentSystem.getCurrentMoment();
    const difficulty = moment ? (moment.difficulty - 1) / 4 : 0.5;
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const isBoss = hasBoss && i === 0;
      const enemy = new EnemyAI(
        this,
        positions[i].x,
        positions[i].y,
        roles[i % 3],
        isBoss ? 'boss' : 'normal',
        difficulty,
        this.aiSystem  // Pass shared AISystem
      );
      
      enemy.onShoot = (power, angle) => {
        // Record shot origin BEFORE the kick (Part B: D-circle scoring rule)
        const isInsideD = this.isPointInAttackingD('enemy', enemy.x, enemy.y);
        this.ball.recordShotOrigin(enemy.x, enemy.y, 'enemy', isInsideD);
        
        // === REGISTER TOUCH IN D (Part A FIX) ===
        this.ball.registerTouch('enemy', `enemy_${i}`, enemy.x, enemy.y, 'shot', isInsideD);
        
        const direction = { x: Math.cos(angle), y: Math.sin(angle) };
        this.ball.kick(direction, power, 0, 'shot');
        this.ball.lastShooter = enemy;
        this.ball.lastOwner = enemy;
        this.ball.isLoose = true;
        this.ball.owner = null;
        // Track enemy possession for steal detection
        this.ball.setLastPossessingTeam('enemy');
      };
      
      enemy.onPass = (angle, target) => {
        this.audioSystem.playPass();
        const passSpeed = TUNING.PASS_SPEED_BASE + 4 * TUNING.PASS_SPEED_SCALE;
        
        // Use pass method with intended receiver for receive assist
        this.ball.pass(passSpeed, angle, enemy, target);
        
        // Track enemy possession for steal detection
        this.ball.setLastPossessingTeam('enemy');
        
        // Debug: show pass line
        if (this.debugDisplayEnabled && target) {
          this.showPassDebugLine(enemy, target);
        }
      };
      
      enemy.onTackle = (target) => {
        this.attemptTackle(enemy, target);
      };
      
      this.enemies.push(enemy);
    }
  }
  
  private updateEntityReferences(): void {
    this.teammates.forEach(t => {
      t.setReferences(this.player, this.teammates, this.enemies, this.ball);
    });
    
    this.enemies.forEach(e => {
      e.setReferences(this.player, this.teammates, this.enemies, this.ball);
    });
  }
  
  private getColorIndex(color: number): number {
    const colors = [
      0x3498db, 0xe74c3c, 0x2ecc71, 0x9b59b6, 0xf39c12,
      0x1abc9c, 0xe67e22, 0x8e44ad, 0xf1c40f, 0x16a085,
      0xc0392b, 0x27ae60, 0xd35400, 0x2980b9, 0x8b0000,
      0x00bcd4, 0x673ab7, 0xff5722, 0x34495e, 0xe91e63
    ];
    const index = colors.indexOf(color);
    return index >= 0 ? index : 0;
  }
  
  private setupCollisions(): void {
    // Ball pickup by player
    this.physics.add.overlap(this.player, this.ball, () => {
      // Block pickup during moment initialization
      if (this.isInitializingMoment) return;
      
      if (this.ball.isLoose && !this.player.hasBall && !this.player.isStunned) {
        // Check no-recapture window
        if (!this.ball.canBePickedUpBy(this.player)) return;
        
        // Track previous possession for steal detection
        const prevTeam = this.ball.attachTo(this.player);
        this.player.receiveBall();
        
        // === REGISTER TOUCH IN D (Part A FIX) ===
        const isReceive = this.ball.intendedReceiver === this.player;
        const isIntercept = this.ball.wasStolen(prevTeam, 'player');
        const touchKind = isIntercept ? 'intercept' : (isReceive ? 'receive' : 'dribble');
        const inAttackingD = this.isPointInAttackingD('player', this.player.x, this.player.y);
        this.ball.registerTouch('player', 'player', this.player.x, this.player.y, touchKind, inAttackingD);
        
        // Check if this was a steal (interception)
        if (isIntercept) {
          console.log('[STEAL] Player intercepted ball from enemy');
          this.momentSystem.playerStole();
        }
        
        // Count as completed pass if there was an intended receiver
        if (isReceive) {
          this.momentStats.passesCompleted++;
        }
      }
    });
    
    // Ball pickup by teammates
    this.teammates.forEach((teammate, idx) => {
      this.physics.add.overlap(teammate, this.ball, () => {
        // Block pickup during moment initialization
        if (this.isInitializingMoment) return;
        
        if (this.ball.isLoose && !teammate.hasBall && !teammate.isStunned) {
          // Check no-recapture window
          if (!this.ball.canBePickedUpBy(teammate)) return;
          
          // Track previous possession for steal detection
          const prevTeam = this.ball.attachTo(teammate);
          teammate.receiveBall();
          
          // === REGISTER TOUCH IN D (Part A FIX) ===
          const isReceive = this.ball.intendedReceiver === teammate;
          const isIntercept = this.ball.wasStolen(prevTeam, 'player');
          const touchKind = isIntercept ? 'intercept' : (isReceive ? 'receive' : 'dribble');
          const inAttackingD = this.isPointInAttackingD('player', teammate.x, teammate.y);
          this.ball.registerTouch('player', `teammate_${idx}`, teammate.x, teammate.y, touchKind, inAttackingD);
          
          // Check if this was a steal (interception by teammate)
          if (isIntercept) {
            console.log('[STEAL] Teammate intercepted ball from enemy');
            this.momentSystem.playerStole();
          }
          
          // Count as completed pass if intended receiver
          if (isReceive) {
            this.momentStats.passesCompleted++;
          }
        }
      });
    });
    
    // Ball pickup by enemies
    this.enemies.forEach((enemy, idx) => {
      this.physics.add.overlap(enemy, this.ball, () => {
        // Block pickup during moment initialization
        if (this.isInitializingMoment) return;
        
        if (this.ball.isLoose && !enemy.hasBall && !enemy.isStunned) {
          // Check no-recapture window
          if (!this.ball.canBePickedUpBy(enemy)) return;
          
          // Track previous possession (for potential future "enemy stole" events)
          this.ball.attachTo(enemy);
          enemy.receiveBall();
          
          // === REGISTER TOUCH IN D (Part A FIX) ===
          const isReceive = this.ball.intendedReceiver === enemy;
          const touchKind = isReceive ? 'receive' : 'dribble';
          const inAttackingD = this.isPointInAttackingD('enemy', enemy.x, enemy.y);
          this.ball.registerTouch('enemy', `enemy_${idx}`, enemy.x, enemy.y, touchKind, inAttackingD);
        }
      });
    });
    
    // === ROBUST GOAL DETECTION ===
    // Right goal (player scores)
    this.physics.add.overlap(this.ball, this.rightGoalSensor, () => {
      this.checkGoal(true);
    });
    
    // Left goal (enemy scores)
    this.physics.add.overlap(this.ball, this.leftGoalSensor, () => {
      this.checkGoal(false);
    });
    
    // Net zones - bounce ball back
    this.physics.add.overlap(this.ball, this.rightNetZone, () => {
      if (!this.isGoalScored && this.ball.isLoose) {
        this.bounceFromNet(false);
      }
    });
    
    this.physics.add.overlap(this.ball, this.leftNetZone, () => {
      if (!this.isGoalScored && this.ball.isLoose) {
        this.bounceFromNet(true);
      }
    });
  }
  
  /**
   * Check if a goal should be scored
   * Uses simple rule: ball center in goal mouth + not on cooldown
   */
  private checkGoal(isRightGoal: boolean): void {
    // Skip if already scored or on cooldown
    if (this.isGoalScored || this.isTransitioning) return;
    if (this.time.now < this.goalCooldownUntil) return;
    
    // Ball must be loose
    if (!this.ball.isLoose) return;
    
    // Check ball is within goal mouth Y range
    const goalY = this.fieldHeight / 2;
    const halfHeight = this.goalHeight / 2;
    if (this.ball.y < goalY - halfHeight || this.ball.y > goalY + halfHeight) {
      return;
    }
    
    // Check ball crossed the goal line (using previous position)
    const goalLineX = isRightGoal ? this.fieldWidth - TUNING.GOAL_SENSOR_DEPTH : TUNING.GOAL_SENSOR_DEPTH;
    const crossed = isRightGoal
      ? this.ball.crossedLine(goalLineX, 'right') || this.ball.x >= goalLineX
      : this.ball.crossedLine(goalLineX, 'left') || this.ball.x <= goalLineX;
    
    if (!crossed) return;
    
    // Check minimum speed (prevents dribble-ins)
    const speed = this.ball.getSpeed();
    if (speed < TUNING.GOAL_MIN_SPEED) return;
    
    // === PART A FIX: ROBUST D-CIRCLE SCORING RULE ===
    // Uses lastTouchInD tracking - ANY touch (shot/pass/dribble/receive) in attacking D counts
    const moment = this.momentSystem.getCurrentMoment();
    const scoringObjectives = ['score', 'multiGoal', 'reboundGoal', 'assist', 'giveAndGo', 'penaltyCorner', 'pc_score', 'pcBattle'];
    const isScoringMoment = !moment || scoringObjectives.includes(moment.objective);
    
    // Determine which team is scoring based on goal side
    // Right goal = player team scores, Left goal = enemy team scores
    const scoringTeam = isRightGoal ? 'player' : 'enemy';
    
    // Get touch debug info
    const touchInfo = this.ball.getTouchDebugInfo();
    const msSinceTouch = touchInfo.msAgo;
    const touchInDTeam = this.ball.lastTouchInDTeam;
    const touchRecent = this.ball.isLastTouchInDRecent();
    
    // Debug log EVERY goal attempt
    console.log('[GOAL_CHECK]', {
      scoringTeam,
      lastTouchInDTeam: touchInDTeam,
      msSinceTouch: Math.round(msSinceTouch),
      touchKind: touchInfo.kind,
      touchRecent,
      isScoringMoment,
      requireD: TUNING.REQUIRE_SHOT_FROM_D
    });
    
    if (TUNING.REQUIRE_SHOT_FROM_D && isScoringMoment) {
      // VALIDATE: scoring team must have last touched ball inside their attacking D recently
      const validTouch = touchInDTeam === scoringTeam && touchRecent;
      
      if (!validTouch) {
        // NO GOAL - no valid touch in D
        console.log('[GOAL_CHECK] REJECTED - must touch inside D');
        this.showNoGoalFeedback(isRightGoal, touchInfo.kind, msSinceTouch);
        return;
      }
      
      console.log('[GOAL_CHECK] ALLOWED - valid touch in D');
    }
    
    // GOAL!
    this.scoreGoal(isRightGoal);
  }
  
  /**
   * Show "NO GOAL" feedback when ball entered goal without valid D touch
   */
  private showNoGoalFeedback(isRightGoal: boolean, lastTouchKind: string = 'none', msSinceTouch: number = 0): void {
    console.log(`[NO_GOAL] Must touch inside the D. Last touch: ${lastTouchKind}, ${Math.round(msSinceTouch)}ms ago`);
    
    // Play whistle sound
    this.audioSystem.playWhistle();
    
    // Show floating text
    const text = this.add.text(
      this.ball.x,
      this.ball.y - 30,
      'NO GOAL\nMust touch inside the D',
      {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '22px',
        color: '#ff4444',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    text.setOrigin(0.5);
    text.setDepth(200);
    
    // Animate
    this.tweens.add({
      targets: text,
      y: text.y - 60,
      alpha: 0,
      duration: 1500,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy()
    });
    
    // Brief cooldown to prevent spam
    this.goalCooldownUntil = this.time.now + 800;
    
    // Reset ball to center (simplified reset)
    this.time.delayedCall(500, () => {
      if (!this.isGoalScored) {
        this.ball.resetToCenter();
        this.ball.setPosition(this.fieldWidth / 2, this.fieldHeight / 2);
      }
    });
  }
  
  private bounceFromNet(isLeftNet: boolean): void {
    const vel = this.ball.body!.velocity;
    
    const bounceVelX = isLeftNet ? Math.abs(vel.x) * TUNING.BALL_NET_BOUNCE : -Math.abs(vel.x) * TUNING.BALL_NET_BOUNCE;
    const bounceVelY = vel.y * TUNING.BALL_NET_BOUNCE;
    
    this.ball.setVelocity(bounceVelX, bounceVelY);
    
    this.shakeGoalNet(isLeftNet);
  }
  
  private setupEventListeners(): void {
    this.momentSystem.on('momentStarted', (data: any) => {
      this.toastManager.info(`${data.moment.name}`, data.moment.description);
    });
    
    this.momentSystem.on('momentComplete', (data: any) => {
      this.handleMomentComplete(data);
    });
    
    // Listen for objective progress (e.g., steals counting towards turnover objective)
    this.momentSystem.on('objectiveProgress', (data: any) => {
      if (data.objective === 'turnover' || data.objective === 'pressWin') {
        if (data.progress >= data.target) {
          // BIG celebration for completing steal objective
          this.showTurnoverWonBanner();
          this.audioSystem.playGoal();
          this.cameras.main.shake(250, 0.015);
          
          // Brief hitstop/freeze for impact
          this.time.timeScale = 0.2;
          this.time.delayedCall(150, () => {
            this.time.timeScale = 1.0;
          });
        } else {
          this.toastManager.success(`Steal! ${data.progress}/${data.target}`);
          this.audioSystem.playSteal();
        }
      }
    });
    
    this.momentSystem.on('timerTick', (data: any) => {
      const state = this.momentSystem.getCurrentState();
      if (state) {
        const progress = this.momentSystem.getProgress();
        this.uiSystem.updateFromMomentState(state, progress.current, progress.total);
        
        // Also update Cup Run display
        const cupState = this.momentSystem.getCupState();
        this.uiSystem.updateCupRun(cupState.playerPoints, cupState.enemyPoints, cupState.pointsToWin);
      }
    });
    
    this.momentSystem.on('timerWarning', (seconds: number) => {
      this.audioSystem.playTimer();
    });
    
    this.momentSystem.on('runComplete', (data: any) => {
      this.endRun(data);
    });
    
    // Upgrade proc events
    this.upgradeSystem.on('upgradeProc', (data: any) => {
      // Create a minimal upgrade object for the UI
      const upgrade = { 
        id: data.upgradeId, 
        name: data.upgradeName 
      };
      this.uiSystem.showUpgradeProc(upgrade as any, data.intensity);
      
      // Show proc icon above player head (Part B)
      const iconEmoji = this.getUpgradeIcon(data.upgradeId) || '⚡';
      if (data.intensity >= 0.5) {  // Only show for meaningful procs
        this.uiSystem.showProcIcon(iconEmoji, data.upgradeName, this.player);
      }
      
      console.log(`[UPGRADE_PROC] ${data.upgradeName} (intensity: ${data.intensity})`);
    });
    
    this.upgradeSystem.on('upgradeAdded', (upgrade: any) => {
      this.uiSystem.addUpgradeIcon(upgrade.icon, upgrade.name, upgrade.rarity);
    });
    
    // Synergy activation
    this.upgradeSystem.on('synergyActivated', (data: any) => {
      this.uiSystem.showSynergyActivated(data.name, data.tier);
      this.audioSystem.playUpgrade();
      this.toastManager.success(`${data.name} T${data.tier} activated!`, '⚡');
    });
    
    // Give-and-Go activation
    this.upgradeSystem.on('giveAndGoActivated', (data: any) => {
      this.uiSystem.showGiveAndGo();
      this.toastManager.success('Give & Go!', '🔄');
    });
    
    // Play calling event
    this.upgradeSystem.on('playCalled', (data: any) => {
      this.uiSystem.showPlayActive(data.play, data.duration);
    });
    
    // AUTO SHOT EVENT - triggered by Auto Hit in D upgrade
    this.upgradeSystem.on('autoShot', (data: any) => {
      console.log('[AUTO_SHOT] Event received:', data);
      
      if (this.player.hasBall && this.player.canShoot()) {
        // Calculate aim toward enemy goal
        const goalX = this.fieldWidth - 20;
        const goalY = this.fieldHeight / 2 + (Math.random() - 0.5) * 60;
        const aimAngle = Math.atan2(goalY - this.player.y, goalX - this.player.x);
        
        // Perform the shot
        const success = this.player.tryShoot(aimAngle, 0.3);
        if (success) {
          console.log('[AUTO_SHOT] Shot executed!');
          this.toastManager.success('Auto Hit!', '🎯');
        }
      }
    });
    
    // Cooldown reset events
    this.upgradeSystem.on('cooldownReset', (cooldownType: string) => {
      console.log(`[COOLDOWN_RESET] ${cooldownType}`);
    });
    
    this.upgradeSystem.on('allCooldownsReset', () => {
      console.log('[COOLDOWN_RESET] All cooldowns!');
    });
  }
  
  // Flag to prevent ball pickup during moment initialization
  private isInitializingMoment: boolean = false;
  
  private startMoment(): void {
    this.isTransitioning = false;
    this.isGoalScored = false;
    this.goalCooldownUntil = 0;
    this.isInitializingMoment = true;  // Prevent ball pickups during setup
    this.resetMomentStats();
    
    // Reset player health/stamina at moment start (Part C)
    this.resetPlayerHealth();
    
    const moment = this.momentSystem.getCurrentMoment();
    if (!moment) return;
    
    // Determine who starts with ball BEFORE creating entities
    const enemyStartsWithBall = moment.objective === 'defend' || 
                                 moment.objective === 'survive' ||
                                 moment.objective === 'turnover' ||
                                 moment.objective === 'pressWin';
    
    // Reset all entities to kickoff positions (each team in own half)
    this.resetToKickoffPositions(enemyStartsWithBall);
    
    // Create teammates and enemies with proper kickoff positions
    this.createTeammates(moment.teamSize.player - 1);
    this.createEnemies(moment.teamSize.enemy, moment.isBoss);
    
    // Recreate enemy goalkeeper for each moment (Part C)
    this.createEnemyGoalkeeper();
    
    this.updateEntityReferences();
    this.setupCollisions();
    
    // Apply moment modifiers
    moment.modifiers.forEach(mod => {
      if (mod.effect === 'reducedControl') {
        this.player.stats.control *= 0.8;
      }
    });
    
    this.momentSystem.startMoment();
    this.upgradeSystem.resetMoment();
    
    // === ASSIGN BALL POSSESSION ===
    // This MUST happen after everything else is set up
    if (enemyStartsWithBall && this.enemies.length > 0) {
      // Choose a midfielder or forward to carry the ball (not the defender)
      const carrier = this.enemies.find(e => e.role === 'midfielder' || e.role === 'forward') || this.enemies[0];
      
      // Clear any accidental possession first
      this.player.hasBall = false;
      this.teammates.forEach(t => t.hasBall = false);
      this.enemies.forEach(e => e.hasBall = false);
      
      // Attach ball to enemy carrier
      this.ball.attachTo(carrier);
      carrier.receiveBall();
      this.ball.setLastPossessingTeam('enemy');
      
      // Move ball to carrier's position
      this.ball.setPosition(carrier.x + 15, carrier.y);
      
      console.log(`[MOMENT] ${moment.objective}: Enemy ${carrier.role} starts with ball at (${carrier.x}, ${carrier.y})`);
      
      // Safety assertion
      if (this.player.hasBall || this.teammates.some(t => t.hasBall)) {
        console.warn('[MOMENT] WARNING: Player team has ball when enemy should! Force-correcting...');
        this.player.hasBall = false;
        this.teammates.forEach(t => t.hasBall = false);
      }
    } else {
      // Clear any accidental possession first
      this.player.hasBall = false;
      this.teammates.forEach(t => t.hasBall = false);
      this.enemies.forEach(e => e.hasBall = false);
      
      // Attach ball to player
      this.ball.attachTo(this.player);
      this.player.receiveBall();
      this.ball.setLastPossessingTeam('player');
      
      console.log(`[MOMENT] ${moment.objective}: Player starts with ball`);
    }
    
    // Allow ball pickups again after setup lock delay (prevents instant recapture)
    // Longer delay for steal objectives to ensure enemy has clear possession
    const setupLockMs = (moment.objective === 'turnover' || moment.objective === 'pressWin') 
      ? TUNING.MOMENT_SETUP_LOCK_MS 
      : 100;
    
    this.time.delayedCall(setupLockMs, () => {
      this.isInitializingMoment = false;
      console.log(`[MOMENT] Setup lock released after ${setupLockMs}ms`);
    });
    
    this.audioSystem.playWhistle();
  }
  
  /**
   * Reset all entities to proper kickoff positions
   * Player team on left half, enemy team on right half
   */
  private resetToKickoffPositions(enemyStartsWithBall: boolean): void {
    const midX = this.fieldWidth / 2;
    const midY = this.fieldHeight / 2;
    
    // Player always in left half
    // If enemy starts with ball, player is further back (defensive)
    // If player starts with ball, player is at center
    if (enemyStartsWithBall) {
      this.player.setPosition(midX - 150, midY);  // Defensive position
    } else {
      this.player.setPosition(midX - 30, midY);   // Kickoff position (near center)
    }
    this.player.setVelocity(0, 0);
    this.player.hasBall = false;
    this.player.isStunned = false;
    
    // Reset ball to center (it will be attached to carrier later)
    this.ball.resetToCenter();
    this.ball.setPosition(midX, midY);
  }
  
  /**
   * Reset positions after a goal (kickoff restart)
   * Player team gets the ball after conceding, enemy gets it after scoring
   */
  private resetPositions(): void {
    const midX = this.fieldWidth / 2;
    const midY = this.fieldHeight / 2;
    
    // Clear all possession first
    this.player.hasBall = false;
    this.teammates.forEach(t => {
      t.hasBall = false;
      t.setVelocity(0, 0);
    });
    this.enemies.forEach(e => {
      e.hasBall = false;
      e.setVelocity(0, 0);
    });
    
    // Reset player to center of their half
    this.player.setPosition(midX - 100, midY);
    this.player.setVelocity(0, 0);
    
    // Reset teammates to their half
    const teammatePositions = [
      { x: midX - 200, y: midY - 100 },
      { x: midX - 180, y: midY + 80 },
      { x: midX - 80, y: midY - 20 }
    ];
    this.teammates.forEach((t, i) => {
      const pos = teammatePositions[i] || teammatePositions[0];
      t.setPosition(pos.x, pos.y);
    });
    
    // Reset enemies to their half
    const enemyPositions = [
      { x: midX + 200, y: midY },
      { x: midX + 150, y: midY - 80 },
      { x: midX + 100, y: midY + 60 }
    ];
    this.enemies.forEach((e, i) => {
      const pos = enemyPositions[i] || enemyPositions[0];
      e.setPosition(pos.x, pos.y);
    });
    
    // Reset ball to center
    this.ball.resetToCenter();
    this.ball.setPosition(midX, midY);
  }
  
  private resetMomentStats(): void {
    this.momentStats = {
      goalsScored: 0,
      goalsConceded: 0,
      tacklesWon: 0,
      tacklesLost: 0,
      passesCompleted: 0,
      passesAttempted: 0,
      shotsOnTarget: 0,
      shotsTaken: 0,
      possessionTime: 0,
      totalTime: 0
    };
    this.lastPossessionCheck = this.time.now;
  }
  
  // ========================================
  // HEALTH SYSTEM INTEGRATION (Part C)
  // ========================================
  
  /**
   * Handle player death - moment fails immediately
   */
  private handlePlayerDeath(reason: string): void {
    console.log(`[PLAYER_DEATH] Reason: ${reason}`);
    
    // Show big "INJURED" notification
    this.toastManager.error('INJURED!', '💀 Too many tackles');
    
    // Camera effect
    this.cameras.main.flash(500, 255, 0, 0);
    
    // Fail the moment
    this.momentSystem.failMoment('Player overwhelmed by tackles');
  }
  
  /**
   * Reset player health at moment start
   */
  private resetPlayerHealth(): void {
    this.player.resetHealth();
    this.player.resetStamina();
  }
  
  // ========================================
  // ADVANTAGE PLAY SYSTEM (Part D)
  // ========================================
  
  private advantageActive: boolean = false;
  private advantageExpiresAt: number = 0;
  
  /**
   * Trigger advantage play after clean tackle/steal
   */
  private triggerAdvantagePlay(): void {
    if (this.advantageActive) return;  // Don't stack
    
    this.advantageActive = true;
    this.advantageExpiresAt = this.time.now + TUNING.ADVANTAGE_DURATION;
    
    // Apply buffs via UpgradeSystem
    this.upgradeSystem.addTempBuff('advantage_speed', 'speed', TUNING.ADVANTAGE_SPEED_BONUS, TUNING.ADVANTAGE_DURATION, 'play');
    this.upgradeSystem.addTempBuff('advantage_pass', 'passPower', TUNING.ADVANTAGE_PASS_BONUS, TUNING.ADVANTAGE_DURATION, 'play');
    this.upgradeSystem.addTempBuff('advantage_shot', 'shotPower', TUNING.ADVANTAGE_SHOT_BONUS, TUNING.ADVANTAGE_DURATION, 'play');
    
    // Visual feedback
    this.toastManager.success('ADVANTAGE!', '⚡ Play on!');
    this.audioSystem.playUpgrade();
    
    // Show banner
    this.uiSystem.showPlayActive('advantage', TUNING.ADVANTAGE_DURATION);
    
    console.log('[ADVANTAGE] Triggered for 3 seconds');
    
    // Auto-expire
    this.time.delayedCall(TUNING.ADVANTAGE_DURATION, () => {
      this.advantageActive = false;
      console.log('[ADVANTAGE] Expired');
    });
  }
  
  /**
   * Get the icon emoji for an upgrade by ID (Part B)
   */
  private getUpgradeIcon(upgradeId: string): string {
    const iconMap: Record<string, string> = {
      'autoHitInD': '🎯',
      'speedBoost': '💨',
      'circleSpecialist': '⭕',
      'reboundReady': '🔄',
      'pressSpeed': '🏃',
      'vampireTackle': '🧛',
      'burstSpeed': '🚀',
      'ballMagnet': '🧲',
      'tacklePower': '💪',
      'quickRelease': '⚡',
      'default': '⚡'
    };
    return iconMap[upgradeId] || iconMap['default'];
  }
  
  private attemptTackle(tackler: any, target?: any): void {
    const tackleRange = TUNING.AI_TACKLE_DISTANCE + 10;
    
    let carrier: any = null;
    if (target && target.hasBall) {
      carrier = target;
    } else {
      const allEntities = [this.player, ...this.teammates, ...this.enemies];
      carrier = allEntities.find(e => e.hasBall && e !== tackler);
    }
    
    if (!carrier) return;
    
    const dist = Phaser.Math.Distance.Between(tackler.x, tackler.y, carrier.x, carrier.y);
    
    if (dist < tackleRange) {
      const tackleSuccess = TUNING.TACKLE_SUCCESS_BASE + (tackler.stats?.tackle || 5) * TUNING.TACKLE_SUCCESS_SCALE;
      
      // Track if tackler is AI enemy (for AI-DEFENSE v3 stats)
      const tacklerIsAI = this.enemies.includes(tackler);
      
      if (Math.random() < tackleSuccess) {
        // === SUCCESSFUL TACKLE - IMPACTFUL! ===
        
        // Record AI tackle success (Part A)
        if (tacklerIsAI) {
          this.aiSystem.recordTackleAttempt(true);
        }
        
        // 1) Apply hitstop to both for micro-freeze impact feel
        if (tackler.applyHitstop) tackler.applyHitstop(TUNING.TACKLE_HITSTOP_MS);
        if (carrier.applyHitstop) carrier.applyHitstop(TUNING.TACKLE_HITSTOP_MS);
        
        // 2) Carrier loses ball and gets stunned
        carrier.loseBall();
        carrier.applyStun(TUNING.TACKLE_STUN_MS);
        
        // 3) Apply knockback to carrier - push them AWAY from tackler
        const dx = carrier.x - tackler.x;
        const dy = carrier.y - tackler.y;
        const knockbackForce = TUNING.TACKLE_KNOCKBACK_CARRIER;
        if (carrier.applyKnockback) {
          carrier.applyKnockback(dx, dy, knockbackForce);
        } else if (carrier.body) {
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          carrier.body.velocity.x += (dx / len) * knockbackForce;
          carrier.body.velocity.y += (dy / len) * knockbackForce;
        }
        
        // 4) Ball pops loose with strong impulse AWAY from tackler
        const popDir = { x: dx, y: dy };
        this.ball.kick(popDir, TUNING.TACKLE_BALL_POP, 0, 'tackle');
        this.ball.isLoose = true;
        this.ball.owner = null;
        
        // 5) VFX: spark particles at contact point
        this.particleManager.tackleImpact(
          (tackler.x + carrier.x) / 2,
          (tackler.y + carrier.y) / 2
        );
        
        // Additional spark burst for big hit
        this.particleManager.sparkBurst(carrier.x, carrier.y, 0xffd700, 8);
        
        // 6) Camera shake - chunky!
        this.cameras.main.shake(TUNING.TACKLE_SHAKE_DURATION, TUNING.TACKLE_SHAKE);
        
        // 7) Flash the carrier
        if (carrier.setTint) {
          carrier.setTint(0xffffff);
          this.time.delayedCall(60, () => carrier.clearTint?.());
        }
        
        // 8) Sound
        this.audioSystem.playSteal();
        
        // Determine teams
        const tacklerIsPlayerTeam = tackler === this.player || this.teammates.includes(tackler);
        const carrierIsEnemy = this.enemies.includes(carrier);
        
        // Stats for player
        if (tackler === this.player) {
          this.momentStats.tacklesWon++;
          this.upgradeSystem.emitEvent('steal', {
            player: this.player,
            target: carrier,
            scene: this,
            time: this.time.now
          });
          SaveSystem.getInstance().incrementStat('totalSteals');
          
          // ADVANTAGE PLAY (Part D) - trigger buff after clean steal
          this.triggerAdvantagePlay();
        }
        
        // HEALTH SYSTEM (Part C) - Player takes damage when tackled
        if (carrier === this.player) {
          const damage = TUNING.TACKLE_DAMAGE_BASE;
          const died = this.player.takeDamage(damage, 'tackle');
          
          console.log(`[TACKLE_DAMAGE] Player took ${damage} damage. Health: ${this.player.health}`);
          
          if (died) {
            // Player died - moment fails immediately
            this.handlePlayerDeath('tackled');
            return;
          }
        }
        
        // Check if this is a steal: player team tackled an enemy
        if (tacklerIsPlayerTeam && carrierIsEnemy) {
          console.log(`[STEAL] ${tackler === this.player ? 'Player' : 'Teammate'} tackled enemy`);
          this.momentSystem.playerStole();
          
          // Update ball's last possessing team
          this.ball.setLastPossessingTeam('player');
        }
      } else {
        // Failed tackle - tackler bounces off and gets minor stun
        tackler.applyStun(180);
        
        // Record AI tackle failure (Part A)
        if (tacklerIsAI) {
          this.aiSystem.recordTackleAttempt(false);
        }
        
        // Set tackle backoff so AI doesn't spam tackle attempts
        this.aiSystem.setTackleBackoff(tackler, TUNING.AI_TACKLE_BACKOFF_MS);
        
        // Small knockback to tackler (bounced off)
        const dx = tackler.x - carrier.x;
        const dy = tackler.y - carrier.y;
        if (tackler.applyKnockback) {
          tackler.applyKnockback(dx, dy, TUNING.TACKLE_KNOCKBACK * 0.5);
        }
        
        if (tackler === this.player) {
          this.momentStats.tacklesLost++;
        }
      }
      
      SaveSystem.getInstance().incrementStat('totalTackles');
    }
  }
  
  private scoreGoal(isPlayerGoal: boolean): void {
    this.isGoalScored = true;
    this.isTransitioning = true;
    this.goalCooldownUntil = this.time.now + TUNING.GOAL_COOLDOWN;
    
    // Move ball to safe position
    const safeX = isPlayerGoal ? this.fieldWidth - 30 : 30;
    this.ball.setPosition(safeX, this.fieldHeight / 2);
    this.ball.setVelocity(0, 0);
    
    // Camera shake - stronger for goals
    this.cameras.main.shake(TUNING.CAMERA_SHAKE_GOAL_DURATION, TUNING.CAMERA_SHAKE_GOAL);
    
    if (isPlayerGoal) {
      this.momentStats.goalsScored++;
      this.audioSystem.playGoal();
      this.particleManager.goalCelebration(this.fieldWidth - 50, this.fieldHeight / 2);
      this.uiSystem.showGoalNotification(true);
      
      this.shakeGoalNet(false);
      
      const isRebound = this.ball.isRebound;
      const lastOwner = this.ball.lastOwner;
      const isFromAssist = lastOwner && lastOwner !== this.ball.lastShooter;
      
      this.momentSystem.playerScored(isRebound, isFromAssist);
      
      this.upgradeSystem.emitEvent('goal', {
        player: this.player,
        scene: this,
        time: this.time.now
      });
      
      SaveSystem.getInstance().incrementStat('totalGoals');
      if (isRebound) {
        SaveSystem.getInstance().incrementStat('totalReboundGoals');
      }
      if (isFromAssist) {
        SaveSystem.getInstance().incrementStat('totalAssists');
      }
    } else {
      this.momentStats.goalsConceded++;
      this.audioSystem.playConcede();
      this.uiSystem.showGoalNotification(false);
      this.shakeGoalNet(true);
      this.momentSystem.enemyScored();
    }
    
    // Reset after freeze period
    this.time.delayedCall(850, () => {
      this.showKickoffCountdown();
    });
  }
  
  private showKickoffCountdown(): void {
    if (this.momentSystem.getCurrentState()?.isComplete) {
      this.isGoalScored = false;
      return;
    }
    
    this.isCountingDown = true;
    this.resetPositions();
    
    let count = 3;
    const countdownText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      count.toString(),
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '72px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }
    );
    countdownText.setOrigin(0.5);
    countdownText.setScrollFactor(0);
    countdownText.setDepth(150);
    
    const countdownTimer = this.time.addEvent({
      delay: 550,
      callback: () => {
        count--;
        if (count > 0) {
          countdownText.setText(count.toString());
          this.tweens.add({
            targets: countdownText,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 100,
            yoyo: true
          });
        } else {
          countdownText.destroy();
          this.isGoalScored = false;
          this.isTransitioning = false;
          this.isCountingDown = false;
          
          this.ball.attachTo(this.player);
          this.player.receiveBall();
          
          this.audioSystem.playWhistle();
        }
      },
      repeat: 3
    });
  }
  
  private handleMomentComplete(data: any): void {
    this.isTransitioning = true;
    
    // === DEV LOGGING ===
    console.log(`[MOMENT_RESULT] ${data.isWon ? 'WIN' : 'FAIL'}`);
    
    const cupState = data.cupState;
    if (cupState) {
      console.log(`[CUP_SCORE] You ${cupState.playerPoints} - ${cupState.enemyPoints} Enemy`);
      if (cupState.isEnded) {
        console.log(`[CUP_ENDED] Winner: ${cupState.winner}`);
      }
      if (data.shouldTriggerComebackCurses) {
        console.log(`[COMEBACK_CURSES_TRIGGERED] Deficit: ${cupState.enemyPoints - cupState.playerPoints}`);
      }
    }
    
    this.momentStats.totalTime = data.isWon
      ? (this.momentSystem.getCurrentMoment()?.duration || 45)
      : (this.momentSystem.getCurrentMoment()?.duration || 45) - (this.momentSystem.getCurrentState()?.timeRemaining || 0);
    
    // Show Cup Run score update in HUD immediately
    if (cupState) {
      this.uiSystem.updateCupRun(cupState.playerPoints, cupState.enemyPoints, cupState.pointsToWin);
    }
    
    this.uiSystem.showMomentComplete(data.isWon);
    
    this.time.delayedCall(2000, () => {
      if (this.momentStats.shotsTaken > 0 || this.momentStats.tacklesWon > 0) {
        this.uiSystem.showMomentRecap(this.momentStats, () => {
          this.proceedAfterMoment(data);
        });
      } else {
        this.proceedAfterMoment(data);
      }
    });
  }
  
  private proceedAfterMoment(data?: any): void {
    // Check if Cup Run is over
    const cupState = this.momentSystem.getCupState();
    if (cupState.isEnded) {
      // Run ended via Cup Run - don't proceed
      return;
    }
    
    // Check for Comeback Curses trigger
    if (data?.shouldTriggerComebackCurses) {
      this.showComebackCursesOverlay(() => {
        this.continueAfterCurses();
      });
    } else {
      this.continueAfterCurses();
    }
  }
  
  private continueAfterCurses(): void {
    if (this.momentSystem.nextMoment()) {
      this.showUpgradeDraft();
    }
  }
  
  private showComebackCursesOverlay(onComplete: () => void): void {
    // Import curses dynamically to avoid circular deps
    import('../data/curses').then(({ getRandomCurseOptions }) => {
      const curseOptions = getRandomCurseOptions(2);
      
      // Create overlay
      const overlay = this.add.rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000, 0.85
      );
      overlay.setScrollFactor(0);
      overlay.setDepth(1000);
      
      // Title
      const title = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY - 180,
        '⚡ COMEBACK CURSES ⚡',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '36px',
          color: '#ff6600',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4
        }
      );
      title.setOrigin(0.5);
      title.setScrollFactor(0);
      title.setDepth(1001);
      
      const subtitle = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY - 140,
        "You're down by 2! Choose a curse to gain power...",
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#ffcc00'
        }
      );
      subtitle.setOrigin(0.5);
      subtitle.setScrollFactor(0);
      subtitle.setDepth(1001);
      
      // Create curse cards
      const cardWidth = 280;
      const cardHeight = 200;
      const cardSpacing = 40;
      const startX = this.cameras.main.centerX - (cardWidth + cardSpacing / 2);
      
      const cards: Phaser.GameObjects.Container[] = [];
      
      curseOptions.forEach((curse, index) => {
        const cardX = startX + index * (cardWidth + cardSpacing);
        const cardY = this.cameras.main.centerY + 20;
        
        const cardBg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x331111, 1);
        cardBg.setStrokeStyle(3, 0xff4400);
        
        const icon = this.add.text(0, -70, curse.icon, { fontSize: '40px' });
        icon.setOrigin(0.5);
        
        const name = this.add.text(0, -30, curse.name, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          color: '#ffffff',
          fontStyle: 'bold'
        });
        name.setOrigin(0.5);
        
        const boonText = this.add.text(0, 10, `✓ ${curse.boonDescription}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: '#44ff44',
          wordWrap: { width: cardWidth - 20 }
        });
        boonText.setOrigin(0.5);
        
        const curseText = this.add.text(0, 50, `✗ ${curse.curseDescription}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: '#ff4444',
          wordWrap: { width: cardWidth - 20 }
        });
        curseText.setOrigin(0.5);
        
        const container = this.add.container(cardX, cardY, [cardBg, icon, name, boonText, curseText]);
        container.setScrollFactor(0);
        container.setDepth(1002);
        container.setSize(cardWidth, cardHeight);
        container.setInteractive({ useHandCursor: true });
        
        container.on('pointerover', () => {
          cardBg.setStrokeStyle(4, 0xffff00);
          container.setScale(1.05);
        });
        
        container.on('pointerout', () => {
          cardBg.setStrokeStyle(3, 0xff4400);
          container.setScale(1.0);
        });
        
        container.on('pointerdown', () => {
          console.log(`[CURSE_PICKED] ${curse.id} - ${curse.name}`);
          
          // Apply the curse
          this.momentSystem.setActiveCurse(curse.id);
          this.applyCurse(curse);
          
          // Update UI to show active curse
          this.uiSystem.setActiveCurse(curse.name);
          
          // Cleanup
          overlay.destroy();
          title.destroy();
          subtitle.destroy();
          cards.forEach(c => c.destroy());
          
          // Show toast
          this.toastManager.success(`Comeback Curse: ${curse.name}`, curse.icon);
          this.audioSystem.playUpgrade();
          
          onComplete();
        });
        
        cards.push(container);
      });
    });
  }
  
  private applyCurse(curse: any): void {
    // Apply curse modifiers through upgrade system
    if (curse.modifiers) {
      curse.modifiers.forEach((mod: any) => {
        this.upgradeSystem.addModifier(mod);
      });
    }
    
    // Register curse hooks
    if (curse.hooks) {
      curse.hooks.forEach((hook: any) => {
        this.upgradeSystem.addHook(hook);
      });
    }
    
    console.log(`[CURSE] Applied: ${curse.name}`);
  }
  
  private showUpgradeDraft(): void {
    const progress = this.momentSystem.getProgress();
    const saveSystem = SaveSystem.getInstance();
    
    const extraChoices = saveSystem.getMetaUpgradeLevel('upgradeChoices');
    const rerolls = saveSystem.getMetaUpgradeLevel('rerollCount');
    
    new UpgradeDraftOverlay(this, {
      momentNumber: progress.current,
      ownedUpgradeIds: this.upgradeSystem.getOwnedUpgradeIds(),
      extraChoices,
      rerolls,
      onSelect: (upgrade) => {
        console.log(`[UPGRADE_PICKED] ${upgrade.id} - ${upgrade.name}`);
        console.log(`[UPGRADE_PICKED] Modifiers:`, upgrade.modifiers);
        console.log(`[UPGRADE_PICKED] Hooks:`, upgrade.hooks);
        
        this.upgradeSystem.addUpgrade(upgrade);
        this.audioSystem.playUpgrade();
        this.toastManager.success(`UPGRADE: ${upgrade.name}`, upgrade.icon);
        
        // Log active upgrades count
        const count = this.upgradeSystem.getOwnedUpgrades().length;
        console.log(`[UPGRADE_PICKED] Total active upgrades: ${count}`);
        
        this.time.delayedCall(500, () => {
          this.startMoment();
        });
      },
      onSkip: () => {
        this.startMoment();
      }
    });
  }
  
  private endRun(data: any): void {
    const cupState = this.momentSystem.getCupState();
    const curseName = this.uiSystem.getActiveCurseName();
    
    console.log(`[RUN_END] Cup: ${cupState.playerPoints} - ${cupState.enemyPoints}, Winner: ${cupState.winner}`);
    
    this.time.delayedCall(1000, () => {
      this.cameras.main.fadeOut(500);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('EndRunScene', {
          stats: data.stats,
          reward: data.reward,
          breakdown: data.breakdown,
          upgrades: this.upgradeSystem.getOwnedUpgrades(),
          character: this.character,
          cupRun: {
            playerPoints: cupState.playerPoints,
            enemyPoints: cupState.enemyPoints,
            winner: cupState.winner
          },
          activeCurse: curseName
        });
      });
    });
  }
  
  update(time: number, delta: number): void {
    if (this.isPaused || this.isCountingDown) return;
    
    const input = this.inputSystem.getState(this.player.x, this.player.y);
    
    if (input.showHelp) {
      this.uiSystem.toggleControlsOverlay();
      return;
    }
    
    if (this.uiSystem.isControlsVisible()) {
      if (input.cancel) {
        this.uiSystem.hideControlsOverlay();
      }
      return;
    }
    
    if (input.pause) {
      this.togglePause();
      return;
    }
    
    if (this.isTransitioning) return;
    
    // Update player
    this.player.update(delta, input);
    
    // Update ball
    this.ball.update(delta);
    
    // Update AI system team states
    this.aiSystem.updateTeamStates(this.ball, this.player, this.teammates, this.enemies, delta);
    
    // Pass objective information to AI for adaptive behavior
    const objective = this.momentSystem.getObjectiveDescriptor();
    this.aiSystem.setObjective(objective);
    
    // Update debug display if enabled
    if (this.debugDisplayEnabled) {
      this.updateDebugDisplay();
    }
    
    // Update upgrade debug overlay if enabled
    if (this.debugUpgrades) {
      this.updateUpgradeDebugOverlay();
    }
    
    // Update active buffs UI
    this.updateActiveBuffsUI();
    
    // Update Health & Stamina HUD (Part C)
    this.uiSystem.updateHealth(this.player.health, this.player.maxHealth);
    this.uiSystem.updateStamina(this.player.stamina, this.player.maxStamina, this.player.canDash);
    
    // Update teammates
    this.teammates.forEach((t) => t.update(delta));
    
    // Update enemies
    this.enemies.forEach((e) => e.update(delta));
    
    // Update enemy goalkeeper (Part C)
    this.enemyGoalkeeper?.update(delta);
    
    // Update GK status marker (Part B)
    this.updateGKStatusMarker();
    
    // Update D-circle debug if enabled (Part B)
    if (this.debugDCircle) {
      this.updateDCircleDebug();
    }
    
    // Update trails
    if (this.player.isMoving) {
      const speed = Math.sqrt(
        this.player.body!.velocity.x ** 2 +
        this.player.body!.velocity.y ** 2
      );
      if (speed > 150) {
        this.trailManager.spawn(this.player.x, this.player.y, 'speed');
        this.particleManager.emitSprint(
          this.player.x,
          this.player.y,
          this.player.body!.velocity.x,
          this.player.body!.velocity.y
        );
      }
    }
    this.trailManager.update(delta);
    
    // Update cooldown UI
    const cooldowns = this.player.getCooldowns();
    this.uiSystem.updateCooldown('shoot', cooldowns.shoot);
    this.uiSystem.updateCooldown('pass', cooldowns.pass);
    this.uiSystem.updateCooldown('tackle', cooldowns.tackle);
    this.uiSystem.updateCooldown('dodge', cooldowns.dodge);
    
    // Update possession indicator
    const hasPlayerPossession = this.player.hasBall || this.teammates.some(t => t.hasBall);
    this.uiSystem.updatePossession(hasPlayerPossession);
    
    // Track possession time
    if (hasPlayerPossession) {
      this.momentStats.possessionTime += delta / 1000;
    }
    
    // Update radar
    this.uiSystem.updateRadar(this.player, this.teammates, this.enemies, this.ball);
    
    // Update goal sensor debug if enabled
    if (this.debugGoalSensors) {
      this.updateGoalSensorDebug();
    }
    
    // Update AI debug if enabled
    if (this.debugAI) {
      this.updateAIDebugOverlay();
    }
    
    // Trigger onTick upgrades with FULL CONTEXT
    const playerHasBall = this.player.hasBall;
    const playerInAttackingD = this.isPointInAttackingD('player', this.player.x, this.player.y);
    const playerInDefendingD = this.isPointInDefendingD('player', this.player.x, this.player.y);
    const playerCanShoot = this.player.canShoot();
    const playerCanPass = this.player.canPass();
    const playerIsStationary = !this.player.isMoving || (
      Math.abs(this.player.body?.velocity?.x || 0) < 20 &&
      Math.abs(this.player.body?.velocity?.y || 0) < 20
    );
    
    // Get moment time remaining
    const state = this.momentSystem.getCurrentState();
    const momentTimeRemaining = state?.timeRemaining || 0;
    
    // Check if player is losing
    const cupState = this.momentSystem.getCupState();
    const isLosing = cupState.enemyPoints > cupState.playerPoints;
    
    this.upgradeSystem.emitEvent('tick', {
      player: this.player,
      ball: this.ball,
      scene: this,
      time: time,
      delta: delta,
      playerHasBall,
      playerInAttackingD,
      playerInDefendingD,
      playerCanShoot,
      playerCanPass,
      playerIsStationary,
      momentTimeRemaining,
      isLosing,
      possessionTime: this.momentStats.possessionTime
    });
  }
  
  // ========================================
  // D-CIRCLE HELPERS
  // ========================================
  
  /**
   * Check if a point is in the attacking D-circle for a team
   * For player team: attacking is the RIGHT goal (enemy goal)
   */
  private isPointInAttackingD(team: 'player' | 'enemy', x: number, y: number): boolean {
    const dRadius = TUNING.D_CIRCLE_RADIUS;
    const goalY = this.fieldHeight / 2;
    
    if (team === 'player') {
      // Player attacks right goal (enemy goal at x = fieldWidth)
      const goalX = this.fieldWidth - 30;
      const dist = Phaser.Math.Distance.Between(x, y, goalX, goalY);
      return dist < dRadius && x > this.fieldWidth - dRadius - 50;
    } else {
      // Enemy attacks left goal (player goal at x = 0)
      const goalX = 30;
      const dist = Phaser.Math.Distance.Between(x, y, goalX, goalY);
      return dist < dRadius && x < dRadius + 50;
    }
  }
  
  /**
   * Check if a point is in the defending D-circle for a team
   */
  private isPointInDefendingD(team: 'player' | 'enemy', x: number, y: number): boolean {
    // Defending D is the opposite of attacking D
    return this.isPointInAttackingD(team === 'player' ? 'enemy' : 'player', x, y);
  }
  
  private togglePause(): void {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.physics.pause();
      this.showPauseMenu();
    } else {
      this.physics.resume();
      this.hidePauseMenu();
    }
  }
  
  private showPauseMenu(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const pauseOverlay = this.add.container(0, 0);
    pauseOverlay.setScrollFactor(0);
    pauseOverlay.setDepth(200);
    (this as any).pauseOverlay = pauseOverlay;
    
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    pauseOverlay.add(bg);
    
    const title = this.add.text(width / 2, height / 2 - 100, 'PAUSED', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    pauseOverlay.add(title);
    
    const resumeBtn = this.createPauseButton(width / 2, height / 2, 'RESUME', () => {
      this.togglePause();
    });
    pauseOverlay.add(resumeBtn);
    
    const controlsBtn = this.createPauseButton(width / 2, height / 2 + 60, 'CONTROLS', () => {
      this.uiSystem.showControlsOverlay();
    });
    pauseOverlay.add(controlsBtn);
    
    const quitBtn = this.createPauseButton(width / 2, height / 2 + 120, 'QUIT RUN', () => {
      this.scene.start('MenuScene');
    });
    pauseOverlay.add(quitBtn);
  }
  
  private createPauseButton(x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x2c3e50, 1);
    bg.fillRoundedRect(-100, -20, 200, 40, 8);
    container.add(bg);
    
    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    label.setOrigin(0.5);
    container.add(label);
    
    const hitArea = this.add.rectangle(0, 0, 200, 40, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);
    
    hitArea.on('pointerdown', onClick);
    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x3498db, 1);
      bg.fillRoundedRect(-100, -20, 200, 40, 8);
    });
    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x2c3e50, 1);
      bg.fillRoundedRect(-100, -20, 200, 40, 8);
    });
    
    return container;
  }
  
  private hidePauseMenu(): void {
    const pauseOverlay = (this as any).pauseOverlay;
    if (pauseOverlay) {
      pauseOverlay.destroy();
      (this as any).pauseOverlay = null;
    }
  }
}
