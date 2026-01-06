// UISystem for Stick & Shift
// Manages HUD, cooldown displays, and UI state

import Phaser from 'phaser';
import { MomentState } from './MomentSystem';

export class UISystem {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  
  // HUD Elements
  private timerText?: Phaser.GameObjects.Text;
  private timerBg?: Phaser.GameObjects.Graphics;
  private scoreText?: Phaser.GameObjects.Text;
  private objectiveText?: Phaser.GameObjects.Text;
  private momentText?: Phaser.GameObjects.Text;
  private possessionIndicator?: Phaser.GameObjects.Graphics;
  private possessionText?: Phaser.GameObjects.Text;
  
  // Cooldown displays
  private cooldownContainer?: Phaser.GameObjects.Container;
  private cooldownIcons: Map<string, { bg: Phaser.GameObjects.Arc; overlay: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }> = new Map();
  
  // Upgrade display
  private upgradeContainer?: Phaser.GameObjects.Container;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(100);
  }
  
  // Create the game HUD
  createGameHUD(): void {
    const width = this.scene.cameras.main.width;
    
    // Timer background
    this.timerBg = this.scene.add.graphics();
    this.timerBg.fillStyle(0x1a1a2e, 0.8);
    this.timerBg.fillRoundedRect(width / 2 - 60, 10, 120, 50, 10);
    this.timerBg.lineStyle(2, 0x3498db, 0.8);
    this.timerBg.strokeRoundedRect(width / 2 - 60, 10, 120, 50, 10);
    this.container.add(this.timerBg);
    
    // Timer text
    this.timerText = this.scene.add.text(width / 2, 35, '0:00', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.timerText.setOrigin(0.5);
    this.container.add(this.timerText);
    
    // Score display
    this.scoreText = this.scene.add.text(width / 2, 70, '0 - 0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#ecf0f1'
    });
    this.scoreText.setOrigin(0.5);
    this.container.add(this.scoreText);
    
    // Objective text
    this.objectiveText = this.scene.add.text(width / 2, 100, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#f1c40f',
      align: 'center'
    });
    this.objectiveText.setOrigin(0.5);
    this.container.add(this.objectiveText);
    
    // Moment counter (top left)
    this.momentText = this.scene.add.text(20, 20, 'Moment 1/10', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#bdc3c7'
    });
    this.container.add(this.momentText);
    
    // Possession indicator (top right)
    this.possessionIndicator = this.scene.add.graphics();
    this.container.add(this.possessionIndicator);
    
    this.possessionText = this.scene.add.text(width - 20, 20, 'POSSESSION', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#bdc3c7'
    });
    this.possessionText.setOrigin(1, 0);
    this.container.add(this.possessionText);
    
    // Cooldown container (bottom center)
    this.cooldownContainer = this.scene.add.container(width / 2, this.scene.cameras.main.height - 60);
    this.cooldownContainer.setScrollFactor(0);
    this.container.add(this.cooldownContainer);
    
    this.createCooldownIcons();
    
    // Upgrade container (left side)
    this.upgradeContainer = this.scene.add.container(20, 150);
    this.upgradeContainer.setScrollFactor(0);
    this.container.add(this.upgradeContainer);
  }
  
  private createCooldownIcons(): void {
    if (!this.cooldownContainer) return;
    
    const actions = [
      { key: 'shoot', label: 'SPACE', icon: '🏑' },
      { key: 'pass', label: 'E', icon: '📐' },
      { key: 'tackle', label: 'Q', icon: '⚔️' },
      { key: 'dodge', label: 'SHIFT', icon: '💨' }
    ];
    
    const spacing = 70;
    const startX = -((actions.length - 1) * spacing) / 2;
    
    actions.forEach((action, i) => {
      const x = startX + i * spacing;
      
      // Background circle
      const bg = this.scene.add.circle(x, 0, 25, 0x2c3e50);
      bg.setStrokeStyle(2, 0x3498db);
      this.cooldownContainer!.add(bg);
      
      // Cooldown overlay
      const overlay = this.scene.add.graphics();
      this.cooldownContainer!.add(overlay);
      
      // Icon
      const icon = this.scene.add.text(x, -5, action.icon, {
        fontSize: '20px'
      });
      icon.setOrigin(0.5);
      this.cooldownContainer!.add(icon);
      
      // Key label
      const label = this.scene.add.text(x, 20, action.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#bdc3c7'
      });
      label.setOrigin(0.5);
      this.cooldownContainer!.add(label);
      
      this.cooldownIcons.set(action.key, { bg, overlay, label });
    });
  }
  
  // Update timer display
  updateTimer(seconds: number, total: number): void {
    if (!this.timerText || !this.timerBg) return;
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
    
    // Color based on time remaining
    if (seconds <= 10) {
      this.timerText.setColor('#e74c3c');
      // Pulse effect
      if (seconds > 0) {
        this.scene.tweens.add({
          targets: this.timerText,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 100,
          yoyo: true
        });
      }
    } else if (seconds <= 30) {
      this.timerText.setColor('#f39c12');
    } else {
      this.timerText.setColor('#ffffff');
    }
  }
  
  // Update score display
  updateScore(playerScore: number, enemyScore: number): void {
    if (!this.scoreText) return;
    
    this.scoreText.setText(`${playerScore} - ${enemyScore}`);
    
    // Flash on score change
    this.scene.tweens.add({
      targets: this.scoreText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 150,
      yoyo: true
    });
  }
  
  // Update objective display
  updateObjective(text: string): void {
    if (!this.objectiveText) return;
    this.objectiveText.setText(text);
  }
  
  // Update moment counter
  updateMomentCounter(current: number, total: number, isBoss: boolean = false): void {
    if (!this.momentText) return;
    
    const prefix = isBoss ? '⚠️ BOSS - ' : '';
    this.momentText.setText(`${prefix}Moment ${current}/${total}`);
    
    if (isBoss) {
      this.momentText.setColor('#e74c3c');
    } else {
      this.momentText.setColor('#bdc3c7');
    }
  }
  
  // Update possession indicator
  updatePossession(hasPlayerPossession: boolean): void {
    if (!this.possessionIndicator || !this.possessionText) return;
    
    const width = this.scene.cameras.main.width;
    
    this.possessionIndicator.clear();
    this.possessionIndicator.fillStyle(hasPlayerPossession ? 0x27ae60 : 0xe74c3c, 1);
    this.possessionIndicator.fillCircle(width - 40, 45, 10);
    
    this.possessionText.setText(hasPlayerPossession ? 'YOUR BALL' : 'ENEMY BALL');
    this.possessionText.setColor(hasPlayerPossession ? '#27ae60' : '#e74c3c');
  }
  
  // Update cooldown display
  updateCooldown(action: string, percentage: number): void {
    const icon = this.cooldownIcons.get(action);
    if (!icon) return;
    
    const { bg, overlay } = icon;
    
    overlay.clear();
    
    if (percentage > 0 && percentage < 1) {
      // Draw cooldown pie
      overlay.fillStyle(0x000000, 0.7);
      overlay.slice(
        bg.x,
        bg.y,
        25,
        Phaser.Math.DegToRad(-90),
        Phaser.Math.DegToRad(-90 + 360 * (1 - percentage)),
        true
      );
      overlay.fillPath();
    }
    
    // Update background color
    if (percentage === 0) {
      bg.setFillStyle(0x2c3e50);
      bg.setStrokeStyle(2, 0x3498db);
    } else {
      bg.setFillStyle(0x1a1a1a);
      bg.setStrokeStyle(2, 0x7f8c8d);
    }
  }
  
  // Update from moment state
  updateFromMomentState(state: MomentState, currentMoment: number, totalMoments: number): void {
    this.updateTimer(state.timeRemaining, state.definition.duration);
    this.updateScore(state.playerScore, state.enemyScore);
    this.updateMomentCounter(currentMoment, totalMoments, state.definition.isBoss);
    
    // Build objective text
    let objectiveText = '';
    switch (state.definition.objective) {
      case 'score':
        objectiveText = `Score ${state.objectiveTarget} goal${state.objectiveTarget > 1 ? 's' : ''} (${state.objectiveProgress}/${state.objectiveTarget})`;
        break;
      case 'multiGoal':
        objectiveText = `Score ${state.objectiveTarget} goals (${state.objectiveProgress}/${state.objectiveTarget})`;
        break;
      case 'defend':
        objectiveText = 'Defend your lead!';
        break;
      case 'survive':
        objectiveText = "Don't concede!";
        break;
      case 'penaltyCorner':
        objectiveText = `Score from penalty corner (${state.objectiveProgress}/${state.objectiveTarget})`;
        break;
      case 'turnover':
        objectiveText = 'Win the ball back!';
        break;
      case 'reboundGoal':
        objectiveText = `Score a rebound goal (${state.objectiveProgress}/${state.objectiveTarget})`;
        break;
      case 'assist':
        objectiveText = `Score from an assist (${state.objectiveProgress}/${state.objectiveTarget})`;
        break;
    }
    this.updateObjective(objectiveText);
  }
  
  // Add upgrade icon to display
  addUpgradeIcon(icon: string, name: string): void {
    if (!this.upgradeContainer) return;
    
    const index = this.upgradeContainer.length;
    const y = index * 35;
    
    const bg = this.scene.add.circle(15, y, 15, 0x1a1a2e, 0.8);
    bg.setStrokeStyle(1, 0x3498db);
    this.upgradeContainer.add(bg);
    
    const iconText = this.scene.add.text(15, y, icon, {
      fontSize: '16px'
    });
    iconText.setOrigin(0.5);
    this.upgradeContainer.add(iconText);
    
    // Tooltip on hover
    bg.setInteractive();
    bg.on('pointerover', () => {
      // Show tooltip
    });
  }
  
  // Show goal notification
  showGoalNotification(isPlayerGoal: boolean): void {
    const text = isPlayerGoal ? '⚽ GOAL!' : '😞 CONCEDED';
    const color = isPlayerGoal ? '#27ae60' : '#e74c3c';
    
    const notification = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      text,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '64px',
        color: color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }
    );
    notification.setOrigin(0.5);
    notification.setScrollFactor(0);
    notification.setDepth(150);
    
    // Animate
    notification.setScale(0);
    this.scene.tweens.add({
      targets: notification,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: notification,
          alpha: 0,
          y: notification.y - 50,
          duration: 500,
          delay: 500,
          onComplete: () => notification.destroy()
        });
      }
    });
  }
  
  // Show moment complete notification
  showMomentComplete(isWon: boolean): void {
    const overlay = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      isWon ? 0x27ae60 : 0xe74c3c,
      0.3
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(140);
    
    const text = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      isWon ? '✓ MOMENT WON!' : '✗ MOMENT LOST',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(141);
    
    // Animate
    text.setScale(0);
    this.scene.tweens.add({
      targets: text,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });
    
    // Fade out after delay
    this.scene.time.delayedCall(1500, () => {
      this.scene.tweens.add({
        targets: [overlay, text],
        alpha: 0,
        duration: 300,
        onComplete: () => {
          overlay.destroy();
          text.destroy();
        }
      });
    });
  }
  
  // Clean up
  destroy(): void {
    this.container.destroy();
    this.cooldownIcons.clear();
  }
}
