// RunScene for Stick & Shift
// Main gameplay scene with field hockey action
// Improved: reliable goal detection, tuning constants, proc feedback

import Phaser from 'phaser';
import { Character } from '../data/characters';
import { Player } from '../entities/Player';
import { Ball } from '../entities/Ball';
import { TeammateAI } from '../entities/TeammateAI';
import { EnemyAI } from '../entities/EnemyAI';
import { InputSystem } from '../systems/InputSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { MomentSystem } from '../systems/MomentSystem';
import { UISystem, MomentRecapStats } from '../systems/UISystem';
import { AudioSystem } from '../systems/AudioSystem';
import { AISystem } from '../systems/AISystem';
import { ParticleManager } from '../gfx/Particles';
import { TrailManager } from '../entities/TrailSegment';
import { UpgradeDraftOverlay } from '../ui/UpgradeDraftOverlay';
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
    
    // Initialize particles
    this.particleManager.init();
    
    // Start the run
    this.momentSystem.startRun(10);
    
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
  
  // Debug display state
  private debugDisplayEnabled: boolean = false;
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private debugText?: Phaser.GameObjects.Text;
  
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
    
    const lines = [
      `=== DEBUG (F1 to hide) ===`,
      `Possession: ${possession}`,
      `Last Poss Team: ${lastPossTeam}`,
      ``,
      `Objective: ${momentDef?.objective || objective.type}`,
      `Progress: ${objProgress}/${objTarget}`,
      `Complete: ${objComplete ? 'YES' : 'no'}`,
      `Urgency: ${(objective.urgency * 100).toFixed(0)}%`,
      `Time: ${objective.timeRemaining}s`,
      ``,
      `Player: ${this.player.hasBall ? 'HAS BALL' : 'no ball'}`,
      `  Calling: ${this.player.isCallingForPass ? 'YES' : 'no'}`,
      `  Charging: ${this.player.isCharging ? 'YES ' + Math.floor(this.player.getChargePercentage() * 100) + '%' : 'no'}`,
      `  Stunned: ${this.player.isStunned}`,
      ``,
      `Ball speed: ${Math.floor(this.ball.getSpeed())}`,
      `Ball receiver: ${this.ball.intendedReceiver ? 'set' : 'none'}`
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
    
    // Set entity references
    this.updateEntityReferences();
  }
  
  private createTeammates(count: number): void {
    this.teammates.forEach(t => t.destroy());
    this.teammates = [];
    
    const roles: ('defender' | 'midfielder' | 'forward')[] = ['defender', 'midfielder', 'forward'];
    const positions = [
      { x: 150, y: this.fieldHeight / 2 - 150 },
      { x: 350, y: this.fieldHeight / 2 },
      { x: 500, y: this.fieldHeight / 2 + 100 }
    ];
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const teammate = new TeammateAI(
        this,
        positions[i].x,
        positions[i].y,
        roles[i],
        this.getColorIndex(this.character.color)
      );
      
      teammate.onShoot = (power, angle) => {
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
    const positions = [
      { x: this.fieldWidth - 150, y: this.fieldHeight / 2 },
      { x: this.fieldWidth - 350, y: this.fieldHeight / 2 - 120 },
      { x: this.fieldWidth - 450, y: this.fieldHeight / 2 + 120 },
      { x: this.fieldWidth - 550, y: this.fieldHeight / 2 },
      { x: this.fieldWidth - 300, y: this.fieldHeight / 2 }
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
        difficulty
      );
      
      enemy.onShoot = (power, angle) => {
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
      if (this.ball.isLoose && !this.player.hasBall && !this.player.isStunned) {
        // Check no-recapture window
        if (!this.ball.canBePickedUpBy(this.player)) return;
        
        // Track previous possession for steal detection
        const prevTeam = this.ball.attachTo(this.player);
        this.player.receiveBall();
        
        // Check if this was a steal (interception)
        if (this.ball.wasStolen(prevTeam, 'player')) {
          console.log('[STEAL] Player intercepted ball from enemy');
          this.momentSystem.playerStole();
        }
        
        // Count as completed pass if there was an intended receiver
        if (this.ball.intendedReceiver === this.player) {
          this.momentStats.passesCompleted++;
        }
      }
    });
    
    // Ball pickup by teammates
    this.teammates.forEach(teammate => {
      this.physics.add.overlap(teammate, this.ball, () => {
        if (this.ball.isLoose && !teammate.hasBall && !teammate.isStunned) {
          // Check no-recapture window
          if (!this.ball.canBePickedUpBy(teammate)) return;
          
          // Track previous possession for steal detection
          const prevTeam = this.ball.attachTo(teammate);
          teammate.receiveBall();
          
          // Check if this was a steal (interception by teammate)
          if (this.ball.wasStolen(prevTeam, 'player')) {
            console.log('[STEAL] Teammate intercepted ball from enemy');
            this.momentSystem.playerStole();
          }
          
          // Count as completed pass if intended receiver
          if (this.ball.intendedReceiver === teammate) {
            this.momentStats.passesCompleted++;
          }
        }
      });
    });
    
    // Ball pickup by enemies
    this.enemies.forEach(enemy => {
      this.physics.add.overlap(enemy, this.ball, () => {
        if (this.ball.isLoose && !enemy.hasBall && !enemy.isStunned) {
          // Check no-recapture window
          if (!this.ball.canBePickedUpBy(enemy)) return;
          
          // Track previous possession (for potential future "enemy stole" events)
          this.ball.attachTo(enemy);
          enemy.receiveBall();
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
    
    // GOAL!
    this.scoreGoal(isRightGoal);
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
          this.toastManager.success('OBJECTIVE COMPLETE!');
          this.audioSystem.playGoal();  // Use goal sound for celebration
          this.cameras.main.shake(200, 0.01);
        } else {
          this.toastManager.success(`Steal! ${data.progress}/${data.target}`);
        }
      }
    });
    
    this.momentSystem.on('timerTick', (data: any) => {
      const state = this.momentSystem.getCurrentState();
      if (state) {
        const progress = this.momentSystem.getProgress();
        this.uiSystem.updateFromMomentState(state, progress.current, progress.total);
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
      this.uiSystem.showUpgradeProc(data.upgrade, data.intensity);
    });
    
    this.upgradeSystem.on('upgradeAdded', (upgrade: any) => {
      this.uiSystem.addUpgradeIcon(upgrade.icon, upgrade.name, upgrade.rarity);
    });
  }
  
  private startMoment(): void {
    this.isTransitioning = false;
    this.isGoalScored = false;
    this.goalCooldownUntil = 0;
    this.resetMomentStats();
    
    this.resetPositions();
    
    const moment = this.momentSystem.getCurrentMoment();
    if (!moment) return;
    
    this.createTeammates(moment.teamSize.player - 1);
    this.createEnemies(moment.teamSize.enemy, moment.isBoss);
    this.updateEntityReferences();
    this.setupCollisions();
    
    moment.modifiers.forEach(mod => {
      if (mod.effect === 'reducedControl') {
        this.player.stats.control *= 0.8;
      }
    });
    
    this.momentSystem.startMoment();
    this.upgradeSystem.resetMoment();
    
    // Determine who starts with the ball based on objective
    const enemyStartsWithBall = moment.objective === 'defend' || 
                                 moment.objective === 'survive' ||
                                 moment.objective === 'turnover' ||
                                 moment.objective === 'pressWin';
    
    if (enemyStartsWithBall && this.enemies.length > 0) {
      this.ball.attachTo(this.enemies[0]);
      this.enemies[0].receiveBall();
      this.ball.setLastPossessingTeam('enemy');
      console.log(`[MOMENT] ${moment.objective}: Enemy starts with ball`);
    } else {
      this.ball.attachTo(this.player);
      this.player.receiveBall();
      this.ball.setLastPossessingTeam('player');
    }
    
    this.audioSystem.playWhistle();
  }
  
  private resetPositions(): void {
    this.player.setPosition(200, this.fieldHeight / 2);
    this.player.setVelocity(0, 0);
    this.player.hasBall = false;
    
    this.ball.resetToCenter();
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
      
      if (Math.random() < tackleSuccess) {
        // === SUCCESSFUL TACKLE - IMPACTFUL! ===
        
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
          this.upgradeSystem.trigger('onSteal', {
            player: this.player,
            target: carrier,
            scene: this
          });
          SaveSystem.getInstance().incrementStat('totalSteals');
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
      
      this.upgradeSystem.trigger('onGoal', {
        player: this.player,
        scene: this
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
    
    this.momentStats.totalTime = data.isWon
      ? (this.momentSystem.getCurrentMoment()?.duration || 45)
      : (this.momentSystem.getCurrentMoment()?.duration || 45) - (this.momentSystem.getCurrentState()?.timeRemaining || 0);
    
    this.uiSystem.showMomentComplete(data.isWon);
    
    this.time.delayedCall(2000, () => {
      if (this.momentStats.shotsTaken > 0 || this.momentStats.tacklesWon > 0) {
        this.uiSystem.showMomentRecap(this.momentStats, () => {
          this.proceedAfterMoment();
        });
      } else {
        this.proceedAfterMoment();
      }
    });
  }
  
  private proceedAfterMoment(): void {
    if (this.momentSystem.nextMoment()) {
      this.showUpgradeDraft();
    }
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
        this.upgradeSystem.addUpgrade(upgrade);
        this.audioSystem.playUpgrade();
        this.toastManager.success(`${upgrade.name}`, upgrade.icon);
        
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
    this.time.delayedCall(1000, () => {
      this.cameras.main.fadeOut(500);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('EndRunScene', {
          stats: data.stats,
          reward: data.reward,
          breakdown: data.breakdown,
          upgrades: this.upgradeSystem.getOwnedUpgrades(),
          character: this.character
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
    
    // Update teammates
    this.teammates.forEach((t) => t.update(delta));
    
    // Update enemies
    this.enemies.forEach((e) => e.update(delta));
    
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
    
    // Trigger onTick upgrades
    this.upgradeSystem.trigger('onTick', {
      player: this.player,
      ball: this.ball,
      position: { x: this.player.x, y: this.player.y },
      scene: this
    });
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
