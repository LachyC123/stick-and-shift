// RunScene for Stick & Shift
// Main gameplay scene with field hockey action
// Improved: goal sensors, instant shooting, AI tactics, radar, controls

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
  private goalHeight = 120;
  
  // Goal sensors (improved detection)
  private leftGoalSensor!: Phaser.GameObjects.Zone;
  private rightGoalSensor!: Phaser.GameObjects.Zone;
  private leftNetZone!: Phaser.GameObjects.Zone;
  private rightNetZone!: Phaser.GameObjects.Zone;
  private leftGoalGraphics!: Phaser.GameObjects.Graphics;
  private rightGoalGraphics!: Phaser.GameObjects.Graphics;
  
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
    
    // Create UI
    this.uiSystem.createGameHUD();
    
    // Initialize particles
    this.particleManager.init();
    
    // Start the run
    this.momentSystem.startRun(10);  // 10 moments
    
    // Check for first-run tutorial
    const saveSystem = SaveSystem.getInstance();
    const hasSeenTutorial = saveSystem.getStat('hasSeenTutorial');
    
    if (!hasSeenTutorial) {
      this.uiSystem.showFirstRunTutorial(() => {
        saveSystem.incrementStat('hasSeenTutorial');
        this.startMoment();
      });
    } else {
      // Start first moment after brief delay
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
    
    // Make systems accessible
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
    
    // 23m lines (simplified)
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
    
    // === LEFT GOAL (player defends) ===
    // Goal sensor - detects actual goals
    this.leftGoalSensor = this.add.zone(8, goalY, 16, this.goalHeight);
    this.physics.add.existing(this.leftGoalSensor, true);
    
    // Net zone - behind goal, for bounces
    this.leftNetZone = this.add.zone(-20, goalY, 30, this.goalHeight + 40);
    this.physics.add.existing(this.leftNetZone, true);
    
    // Visual
    this.leftGoalGraphics = this.add.graphics();
    this.drawGoal(this.leftGoalGraphics, 0, goalY - 60, true);
    
    // === RIGHT GOAL (player attacks) ===
    // Goal sensor
    this.rightGoalSensor = this.add.zone(this.fieldWidth - 8, goalY, 16, this.goalHeight);
    this.physics.add.existing(this.rightGoalSensor, true);
    
    // Net zone
    this.rightNetZone = this.add.zone(this.fieldWidth + 20, goalY, 30, this.goalHeight + 40);
    this.physics.add.existing(this.rightNetZone, true);
    
    // Visual
    this.rightGoalGraphics = this.add.graphics();
    this.drawGoal(this.rightGoalGraphics, this.fieldWidth - 15, goalY - 60, false);
  }
  
  private drawGoal(graphics: Phaser.GameObjects.Graphics, x: number, y: number, isLeft: boolean): void {
    graphics.setDepth(2);
    
    // Posts
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(x, y, 4, 120);  // Left post
    graphics.fillRect(x + 11, y, 4, 120);  // Right post
    graphics.fillRect(x, y - 4, 15, 4);  // Crossbar
    
    // Net (backboard area)
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
      x: graphics.x + (isLeft ? -5 : 5),
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut'
    });
  }
  
  private createEntities(): void {
    // Create player
    this.player = new Player(this, 200, this.fieldHeight / 2, this.character);
    this.player.setUpgradeSystem(this.upgradeSystem);
    
    // Player action callbacks
    this.player.onShoot = (power, angle) => {
      this.audioSystem.playShoot();
      this.ball.shoot(power, angle, this.player);
      this.momentStats.shotsTaken++;
      
      // Check if shot is on target (heading toward goal)
      const targetGoalX = this.fieldWidth;
      if (Math.cos(angle) > 0.3) {
        this.momentStats.shotsOnTarget++;
      }
    };
    
    this.player.onPass = (angle) => {
      this.audioSystem.playPass();
      const passPower = this.player.stats.passPower * 25;
      this.ball.pass(passPower, angle, this.player);
      this.momentStats.passesAttempted++;
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
      // Show "no possession" feedback
      this.uiSystem.showNoPossessionFeedback();
      this.audioSystem.playClick();  // Subtle click sound
    };
    
    // Create ball
    this.ball = new Ball(this, this.fieldWidth / 2, this.fieldHeight / 2);
    
    // Create teammates (will be adjusted per moment)
    this.createTeammates(3);
    
    // Create enemies (will be adjusted per moment)
    this.createEnemies(3);
    
    // Set entity references
    this.updateEntityReferences();
  }
  
  private createTeammates(count: number): void {
    // Clear existing
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
        this.ball.shoot(power, angle, teammate);
      };
      
      teammate.onPass = (angle, target) => {
        const passPower = 200;
        this.ball.pass(passPower, angle, teammate);
      };
      
      teammate.onTackle = (target) => {
        this.attemptTackle(teammate, target);
      };
      
      this.teammates.push(teammate);
    }
  }
  
  private createEnemies(count: number, hasBoss: boolean = false): void {
    // Clear existing
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
        this.ball.shoot(power, angle, enemy);
      };
      
      enemy.onPass = (angle, target) => {
        const passPower = 180;
        this.ball.pass(passPower, angle, enemy);
      };
      
      enemy.onTackle = (target) => {
        this.attemptTackle(enemy, target);
      };
      
      this.enemies.push(enemy);
    }
  }
  
  private updateEntityReferences(): void {
    // Update ball references for all entities
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
        this.ball.attachTo(this.player);
        this.player.receiveBall();
        this.momentStats.passesCompleted++;  // Count successful receives
      }
    });
    
    // Ball pickup by teammates
    this.teammates.forEach(teammate => {
      this.physics.add.overlap(teammate, this.ball, () => {
        if (this.ball.isLoose && !teammate.hasBall && !teammate.isStunned) {
          this.ball.attachTo(teammate);
          teammate.receiveBall();
        }
      });
    });
    
    // Ball pickup by enemies
    this.enemies.forEach(enemy => {
      this.physics.add.overlap(enemy, this.ball, () => {
        if (this.ball.isLoose && !enemy.hasBall && !enemy.isStunned) {
          this.ball.attachTo(enemy);
          enemy.receiveBall();
        }
      });
    });
    
    // === IMPROVED GOAL DETECTION ===
    // Right goal (player scores)
    this.physics.add.overlap(this.ball, this.rightGoalSensor, () => {
      if (!this.isGoalScored && !this.isTransitioning && this.isValidGoal(true)) {
        this.scoreGoal(true);
      }
    });
    
    // Left goal (enemy scores)
    this.physics.add.overlap(this.ball, this.leftGoalSensor, () => {
      if (!this.isGoalScored && !this.isTransitioning && this.isValidGoal(false)) {
        this.scoreGoal(false);
      }
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
  
  // Check if ball qualifies as a goal
  private isValidGoal(isRightGoal: boolean): boolean {
    if (!this.ball.isLoose) return false;
    
    const vel = this.ball.body!.velocity;
    const speed = vel.length();
    
    // Must have minimum speed
    if (speed < 30) return false;
    
    // Must be moving toward the goal
    const movingRight = vel.x > 0;
    const movingLeft = vel.x < 0;
    
    if (isRightGoal && !movingRight) return false;
    if (!isRightGoal && !movingLeft) return false;
    
    // Ball must be within goal height
    const goalY = this.fieldHeight / 2;
    const halfHeight = this.goalHeight / 2;
    if (this.ball.y < goalY - halfHeight || this.ball.y > goalY + halfHeight) {
      return false;
    }
    
    return true;
  }
  
  private bounceFromNet(isLeftNet: boolean): void {
    const vel = this.ball.body!.velocity;
    
    // Bounce outward with dampening
    const bounceVelX = isLeftNet ? Math.abs(vel.x) * 0.4 : -Math.abs(vel.x) * 0.4;
    const bounceVelY = vel.y * 0.5;
    
    this.ball.setVelocity(bounceVelX, bounceVelY);
    
    // Net shake effect
    this.shakeGoalNet(isLeftNet);
  }
  
  private setupEventListeners(): void {
    // Moment events
    this.momentSystem.on('momentStarted', (data: any) => {
      this.toastManager.info(`${data.moment.name}`, data.moment.description);
    });
    
    this.momentSystem.on('momentComplete', (data: any) => {
      this.handleMomentComplete(data);
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
    
    // Upgrade events
    this.upgradeSystem.on('upgradeAdded', (upgrade: any) => {
      this.uiSystem.addUpgradeIcon(upgrade.icon, upgrade.name);
    });
  }
  
  private startMoment(): void {
    this.isTransitioning = false;
    this.isGoalScored = false;
    this.resetMomentStats();
    
    // Reset positions
    this.resetPositions();
    
    // Get moment config
    const moment = this.momentSystem.getCurrentMoment();
    if (!moment) return;
    
    // Setup teams based on moment
    this.createTeammates(moment.teamSize.player - 1);
    this.createEnemies(moment.teamSize.enemy, moment.isBoss);
    this.updateEntityReferences();
    this.setupCollisions();
    
    // Apply modifiers
    moment.modifiers.forEach(mod => {
      if (mod.effect === 'reducedControl') {
        // Wet turf - reduce control
        this.player.stats.control *= 0.8;
      }
    });
    
    // Start the moment
    this.momentSystem.startMoment();
    this.upgradeSystem.resetMoment();
    
    // Give ball to appropriate team
    if (moment.objective === 'defend' || moment.objective === 'survive') {
      // Enemies start with ball
      if (this.enemies.length > 0) {
        this.ball.attachTo(this.enemies[0]);
        this.enemies[0].receiveBall();
      }
    } else {
      // Player team starts with ball
      this.ball.attachTo(this.player);
      this.player.receiveBall();
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
    const tackleRange = 60;
    
    // Find nearest ball carrier
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
      // Tackle success based on stats
      const tackleSuccess = 0.6 + (tackler.stats?.tackle || 5) * 0.04;
      
      if (Math.random() < tackleSuccess) {
        // Successful tackle
        carrier.loseBall();
        carrier.applyStun(300);
        this.ball.drop();
        
        this.particleManager.tackleImpact(carrier.x, carrier.y);
        this.audioSystem.playSteal();
        
        // Track stats
        if (tackler === this.player) {
          this.momentStats.tacklesWon++;
          this.upgradeSystem.trigger('onSteal', {
            player: this.player,
            target: carrier,
            scene: this
          });
          
          SaveSystem.getInstance().incrementStat('totalSteals');
          this.momentSystem.playerStole();
        }
      } else {
        // Failed tackle
        tackler.applyStun(200);
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
    
    // Freeze ball
    this.ball.setVelocity(0, 0);
    
    // Camera shake
    this.cameras.main.shake(200, 0.01);
    
    if (isPlayerGoal) {
      this.momentStats.goalsScored++;
      this.audioSystem.playGoal();
      this.particleManager.goalCelebration(this.fieldWidth - 50, this.fieldHeight / 2);
      this.uiSystem.showGoalNotification(true);
      
      // Shake the net
      this.shakeGoalNet(false);
      
      // Check for rebound
      const isRebound = this.ball.isRebound;
      
      // Check for assist
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
    
    // Reset after freeze period (~900ms)
    this.time.delayedCall(900, () => {
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
    
    // 3..2..1 countdown
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
      delay: 600,
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
          
          // Give ball to player after goal
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
    
    // Calculate total time for possession percentage
    this.momentStats.totalTime = data.isWon ? 
      (this.momentSystem.getCurrentMoment()?.duration || 45) : 
      (this.momentSystem.getCurrentMoment()?.duration || 45) - (this.momentSystem.getCurrentState()?.timeRemaining || 0);
    
    this.uiSystem.showMomentComplete(data.isWon);
    
    this.time.delayedCall(2000, () => {
      // Show recap, then upgrade draft
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
      // Show upgrade draft
      this.showUpgradeDraft();
    }
    // Else run is complete - handled by runComplete event
  }
  
  private showUpgradeDraft(): void {
    const progress = this.momentSystem.getProgress();
    const saveSystem = SaveSystem.getInstance();
    
    // Get meta upgrade bonuses
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
    
    // Get input
    const input = this.inputSystem.getState(this.player.x, this.player.y);
    
    // Handle controls overlay toggle
    if (input.showHelp) {
      this.uiSystem.toggleControlsOverlay();
      return;
    }
    
    // If controls overlay is visible, don't process game input
    if (this.uiSystem.isControlsVisible()) {
      if (input.cancel) {
        this.uiSystem.hideControlsOverlay();
      }
      return;
    }
    
    // Handle pause
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
    
    // Dim background
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    pauseOverlay.add(bg);
    
    // Title
    const title = this.add.text(width / 2, height / 2 - 100, 'PAUSED', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    pauseOverlay.add(title);
    
    // Resume button
    const resumeBtn = this.createPauseButton(width / 2, height / 2, 'RESUME', () => {
      this.togglePause();
    });
    pauseOverlay.add(resumeBtn);
    
    // Controls button
    const controlsBtn = this.createPauseButton(width / 2, height / 2 + 60, 'CONTROLS', () => {
      this.uiSystem.showControlsOverlay();
    });
    pauseOverlay.add(controlsBtn);
    
    // Quit button
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
