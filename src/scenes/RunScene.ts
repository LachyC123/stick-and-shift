// RunScene for Stick & Shift
// Main gameplay scene with field hockey action

import Phaser from 'phaser';
import { Character } from '../data/characters';
import { Player } from '../entities/Player';
import { Ball } from '../entities/Ball';
import { TeammateAI } from '../entities/TeammateAI';
import { EnemyAI } from '../entities/EnemyAI';
import { InputSystem } from '../systems/InputSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { MomentSystem } from '../systems/MomentSystem';
import { UISystem } from '../systems/UISystem';
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
  
  // Goal areas
  private leftGoal!: Phaser.GameObjects.Zone;
  private rightGoal!: Phaser.GameObjects.Zone;
  
  // State
  private isPaused = false;
  private isTransitioning = false;
  
  constructor() {
    super({ key: 'RunScene' });
  }
  
  init(data: RunSceneData): void {
    this.character = data.character;
  }
  
  create(): void {
    // Set world bounds
    this.physics.world.setBounds(0, 0, this.fieldWidth, this.fieldHeight);
    
    // Initialize systems
    this.initializeSystems();
    
    // Create field
    this.createField();
    
    // Create goals
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
    
    // Start first moment after brief delay
    this.time.delayedCall(500, () => {
      this.startMoment();
    });
    
    // Camera setup
    this.cameras.main.setBounds(0, 0, this.fieldWidth, this.fieldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
    
    // Fade in
    this.cameras.main.fadeIn(300);
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
    
    // Make audio system accessible to other components
    (this as any).audioSystem = this.audioSystem;
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
    
    // Left goal (player defends)
    this.leftGoal = this.add.zone(10, goalY, this.goalWidth, this.goalHeight);
    this.physics.add.existing(this.leftGoal, true);
    
    // Right goal (player attacks)
    this.rightGoal = this.add.zone(this.fieldWidth - 10, goalY, this.goalWidth, this.goalHeight);
    this.physics.add.existing(this.rightGoal, true);
    
    // Goal visuals
    const leftGoalVisual = this.add.graphics();
    leftGoalVisual.fillStyle(0x333333, 1);
    leftGoalVisual.fillRect(0, goalY - 60, 15, 120);
    leftGoalVisual.lineStyle(4, 0xffffff, 1);
    leftGoalVisual.strokeRect(0, goalY - 60, 15, 120);
    leftGoalVisual.setDepth(2);
    
    // Net pattern
    leftGoalVisual.lineStyle(1, 0xcccccc, 0.5);
    for (let i = 0; i < 12; i++) {
      leftGoalVisual.beginPath();
      leftGoalVisual.moveTo(0, goalY - 60 + i * 10);
      leftGoalVisual.lineTo(15, goalY - 60 + i * 10);
      leftGoalVisual.strokePath();
    }
    
    const rightGoalVisual = this.add.graphics();
    rightGoalVisual.fillStyle(0x333333, 1);
    rightGoalVisual.fillRect(this.fieldWidth - 15, goalY - 60, 15, 120);
    rightGoalVisual.lineStyle(4, 0xffffff, 1);
    rightGoalVisual.strokeRect(this.fieldWidth - 15, goalY - 60, 15, 120);
    rightGoalVisual.setDepth(2);
    
    rightGoalVisual.lineStyle(1, 0xcccccc, 0.5);
    for (let i = 0; i < 12; i++) {
      rightGoalVisual.beginPath();
      rightGoalVisual.moveTo(this.fieldWidth - 15, goalY - 60 + i * 10);
      rightGoalVisual.lineTo(this.fieldWidth, goalY - 60 + i * 10);
      rightGoalVisual.strokePath();
    }
  }
  
  private createEntities(): void {
    // Create player
    this.player = new Player(this, 200, this.fieldHeight / 2, this.character);
    this.player.setUpgradeSystem(this.upgradeSystem);
    
    // Player action callbacks
    this.player.onShoot = (power, angle) => {
      this.audioSystem.playShoot();
      this.ball.shoot(power, angle, this.player);
    };
    
    this.player.onPass = (angle) => {
      this.audioSystem.playPass();
      const passPower = this.player.stats.passPower * 25;
      this.ball.pass(passPower, angle, this.player);
    };
    
    this.player.onTackle = () => {
      this.audioSystem.playTackle();
      this.attemptTackle(this.player);
    };
    
    this.player.onDodge = () => {
      this.audioSystem.playDodge();
      this.particleManager.dodgeEffect(this.player.x, this.player.y, this.player.getFacingAngle());
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
    
    // Goal detection
    this.physics.add.overlap(this.ball, this.rightGoal, () => {
      if (this.ball.isLoose && !this.isTransitioning) {
        this.scoreGoal(true);
      }
    });
    
    this.physics.add.overlap(this.ball, this.leftGoal, () => {
      if (this.ball.isLoose && !this.isTransitioning) {
        this.scoreGoal(false);
      }
    });
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
        
        // Trigger upgrade effects
        if (tackler === this.player) {
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
      }
      
      SaveSystem.getInstance().incrementStat('totalTackles');
    }
  }
  
  private scoreGoal(isPlayerGoal: boolean): void {
    this.isTransitioning = true;
    
    if (isPlayerGoal) {
      this.audioSystem.playGoal();
      this.particleManager.goalCelebration(this.fieldWidth - 50, this.fieldHeight / 2);
      this.uiSystem.showGoalNotification(true);
      
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
      this.audioSystem.playConcede();
      this.uiSystem.showGoalNotification(false);
      this.momentSystem.enemyScored();
    }
    
    // Reset after delay
    this.time.delayedCall(1500, () => {
      if (!this.momentSystem.getCurrentState()?.isComplete) {
        this.resetPositions();
        this.ball.attachTo(this.player);
        this.player.receiveBall();
        this.isTransitioning = false;
      }
    });
  }
  
  private handleMomentComplete(data: any): void {
    this.isTransitioning = true;
    
    this.uiSystem.showMomentComplete(data.isWon);
    
    this.time.delayedCall(2000, () => {
      // Check if run continues
      if (this.momentSystem.nextMoment()) {
        // Show upgrade draft
        this.showUpgradeDraft();
      }
      // Else run is complete - handled by runComplete event
    });
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
    if (this.isPaused || this.isTransitioning) return;
    
    // Get input
    const input = this.inputSystem.getState(this.player.x, this.player.y);
    
    // Handle pause
    if (input.pause) {
      this.togglePause();
      return;
    }
    
    // Update player
    this.player.update(delta, input);
    
    // Update ball
    this.ball.update(delta);
    
    // Update teammates
    this.teammates.forEach(t => t.update(delta));
    
    // Update enemies
    this.enemies.forEach(e => e.update(delta));
    
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
    this.uiSystem.updatePossession(
      this.player.hasBall ||
      this.teammates.some(t => t.hasBall)
    );
    
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
      // Show pause menu
    } else {
      this.physics.resume();
    }
  }
}
