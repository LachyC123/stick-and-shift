// UISystem for Stick & Shift
// Manages HUD, cooldown displays, radar, controls overlay
// Improved: mini radar, controls panel, help button, post-moment recap, proc feedback

import Phaser from 'phaser';
import { MomentState } from './MomentSystem';
import { Upgrade, Rarity, RARITY_COLORS } from '../data/upgrades';

export interface MomentRecapStats {
  goalsScored: number;
  goalsConceded: number;
  tacklesWon: number;
  tacklesLost: number;
  passesCompleted: number;
  passesAttempted: number;
  shotsOnTarget: number;
  shotsTaken: number;
  possessionTime: number;
  totalTime: number;
}

interface UpgradeIconData {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Arc;
  icon: Phaser.GameObjects.Text;
  rarity: Rarity;
  upgradeId?: string;
}

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
  
  // Upgrade display (improved with rarity tracking)
  private upgradeContainer?: Phaser.GameObjects.Container;
  private upgradeIcons: UpgradeIconData[] = [];
  private maxUpgradeIcons: number = 6;
  
  // Mini radar
  private radarContainer?: Phaser.GameObjects.Container;
  private radarBg?: Phaser.GameObjects.Graphics;
  private radarDots: Map<string, Phaser.GameObjects.Arc> = new Map();
  private radarScale: number = 0.12;
  private radarWidth: number = 140;
  private radarHeight: number = 80;
  
  // Help button
  private helpButton?: Phaser.GameObjects.Container;
  
  // Controls overlay
  private controlsOverlay?: Phaser.GameObjects.Container;
  private controlsVisible: boolean = false;
  
  // Pause menu
  private pauseOverlay?: Phaser.GameObjects.Container;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(100);
  }
  
  // Create the game HUD
  createGameHUD(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
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
    this.cooldownContainer = this.scene.add.container(width / 2, height - 60);
    this.cooldownContainer.setScrollFactor(0);
    this.container.add(this.cooldownContainer);
    
    this.createCooldownIcons();
    
    // Upgrade container (left side)
    this.upgradeContainer = this.scene.add.container(20, 150);
    this.upgradeContainer.setScrollFactor(0);
    this.container.add(this.upgradeContainer);
    
    // Create mini radar (bottom right)
    this.createMiniRadar();
    
    // Create help button (top right, below possession)
    this.createHelpButton();
    
    // Create controls overlay (hidden by default)
    this.createControlsOverlay();
  }
  
  private createCooldownIcons(): void {
    if (!this.cooldownContainer) return;
    
    const actions = [
      { key: 'shoot', label: 'SPACE/Click', icon: '🏑' },
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
        fontSize: '9px',
        color: '#bdc3c7'
      });
      label.setOrigin(0.5);
      this.cooldownContainer!.add(label);
      
      this.cooldownIcons.set(action.key, { bg, overlay, label });
    });
  }
  
  private createMiniRadar(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
    this.radarContainer = this.scene.add.container(width - this.radarWidth - 15, height - this.radarHeight - 100);
    this.radarContainer.setScrollFactor(0);
    this.container.add(this.radarContainer);
    
    // Radar background
    this.radarBg = this.scene.add.graphics();
    this.radarBg.fillStyle(0x1a1a2e, 0.7);
    this.radarBg.fillRoundedRect(0, 0, this.radarWidth, this.radarHeight, 5);
    this.radarBg.lineStyle(1, 0x3498db, 0.6);
    this.radarBg.strokeRoundedRect(0, 0, this.radarWidth, this.radarHeight, 5);
    
    // Field markings
    this.radarBg.lineStyle(1, 0x666666, 0.4);
    this.radarBg.beginPath();
    this.radarBg.moveTo(this.radarWidth / 2, 0);
    this.radarBg.lineTo(this.radarWidth / 2, this.radarHeight);
    this.radarBg.strokePath();
    
    // Center circle
    this.radarBg.strokeCircle(this.radarWidth / 2, this.radarHeight / 2, 8);
    
    this.radarContainer.add(this.radarBg);
    
    // Label
    const label = this.scene.add.text(this.radarWidth / 2, -8, 'RADAR', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      color: '#666666'
    });
    label.setOrigin(0.5);
    this.radarContainer.add(label);
  }
  
  // Update radar with entity positions
  updateRadar(player: any, teammates: any[], enemies: any[], ball: any): void {
    if (!this.radarContainer) return;
    
    // Clear old dots
    this.radarDots.forEach(dot => dot.destroy());
    this.radarDots.clear();
    
    const fieldWidth = 1200;
    const fieldHeight = 700;
    
    // Helper to convert world position to radar position
    const toRadar = (x: number, y: number) => ({
      x: (x / fieldWidth) * this.radarWidth,
      y: (y / fieldHeight) * this.radarHeight
    });
    
    // Ball (white)
    if (ball) {
      const ballPos = toRadar(ball.x, ball.y);
      const ballDot = this.scene.add.circle(ballPos.x, ballPos.y, 3, 0xffffff);
      this.radarContainer.add(ballDot);
      this.radarDots.set('ball', ballDot);
    }
    
    // Player (green, larger)
    if (player) {
      const playerPos = toRadar(player.x, player.y);
      const playerDot = this.scene.add.circle(playerPos.x, playerPos.y, 4, 0x27ae60);
      this.radarContainer.add(playerDot);
      this.radarDots.set('player', playerDot);
    }
    
    // Teammates (green, smaller)
    teammates.forEach((t, i) => {
      const pos = toRadar(t.x, t.y);
      const dot = this.scene.add.circle(pos.x, pos.y, 3, 0x2ecc71);
      this.radarContainer!.add(dot);
      this.radarDots.set(`teammate_${i}`, dot);
    });
    
    // Enemies (red)
    enemies.forEach((e, i) => {
      const pos = toRadar(e.x, e.y);
      const dot = this.scene.add.circle(pos.x, pos.y, 3, 0xe74c3c);
      this.radarContainer!.add(dot);
      this.radarDots.set(`enemy_${i}`, dot);
    });
  }
  
  private createHelpButton(): void {
    const width = this.scene.cameras.main.width;
    
    this.helpButton = this.scene.add.container(width - 30, 60);
    this.helpButton.setScrollFactor(0);
    this.container.add(this.helpButton);
    
    const bg = this.scene.add.circle(0, 0, 15, 0x2c3e50);
    bg.setStrokeStyle(2, 0x3498db);
    bg.setInteractive({ useHandCursor: true });
    this.helpButton.add(bg);
    
    const text = this.scene.add.text(0, 0, '?', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5);
    this.helpButton.add(text);
    
    // Click handler
    bg.on('pointerdown', () => {
      this.toggleControlsOverlay();
    });
    
    bg.on('pointerover', () => {
      bg.setFillStyle(0x3498db);
      this.scene.tweens.add({
        targets: this.helpButton,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100
      });
    });
    
    bg.on('pointerout', () => {
      bg.setFillStyle(0x2c3e50);
      this.scene.tweens.add({
        targets: this.helpButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });
  }
  
  private createControlsOverlay(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
    this.controlsOverlay = this.scene.add.container(0, 0);
    this.controlsOverlay.setScrollFactor(0);
    this.controlsOverlay.setDepth(200);
    this.controlsOverlay.setVisible(false);
    
    // Dim background
    const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    bg.setInteractive();
    bg.on('pointerdown', () => this.hideControlsOverlay());
    this.controlsOverlay.add(bg);
    
    // Panel
    const panelWidth = 450;
    const panelHeight = 380;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x1a1a2e, 0.95);
    panel.fillRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 15);
    panel.lineStyle(3, 0x3498db, 1);
    panel.strokeRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 15);
    this.controlsOverlay.add(panel);
    
    // Title
    const title = this.scene.add.text(width / 2, height / 2 - panelHeight / 2 + 30, '🎮 CONTROLS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this.controlsOverlay.add(title);
    
    // Controls list
    const controls = [
      { key: 'WASD / Arrows', action: 'Move' },
      { key: 'SPACE / Left Click', action: 'Shoot (with ball) / Tackle intent' },
      { key: 'E', action: 'Pass to teammate' },
      { key: 'Q', action: 'Tackle (lunge to steal ball)' },
      { key: 'SHIFT', action: 'Dodge / Sidestep' },
      { key: 'Mouse', action: 'Aim direction' },
      { key: 'ESC / P', action: 'Pause game' },
      { key: 'H', action: 'Toggle this help' }
    ];
    
    const startY = height / 2 - panelHeight / 2 + 80;
    controls.forEach((control, i) => {
      const y = startY + i * 32;
      
      // Key
      const keyBg = this.scene.add.graphics();
      keyBg.fillStyle(0x2c3e50, 1);
      keyBg.fillRoundedRect(width / 2 - 200, y - 10, 140, 26, 5);
      this.controlsOverlay!.add(keyBg);
      
      const keyText = this.scene.add.text(width / 2 - 130, y, control.key, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#3498db',
        fontStyle: 'bold'
      });
      keyText.setOrigin(0.5);
      this.controlsOverlay!.add(keyText);
      
      // Action
      const actionText = this.scene.add.text(width / 2 + 30, y, control.action, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#ecf0f1'
      });
      actionText.setOrigin(0, 0.5);
      this.controlsOverlay!.add(actionText);
    });
    
    // Tips section
    const tipsY = height / 2 + panelHeight / 2 - 60;
    const tips = this.scene.add.text(width / 2, tipsY, '💡 TIP: Aim toward goal for auto-aim assist when using keyboard only', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#f39c12',
      wordWrap: { width: panelWidth - 40 },
      align: 'center'
    });
    tips.setOrigin(0.5);
    this.controlsOverlay.add(tips);
    
    // Close button
    const closeBtn = this.scene.add.text(width / 2, height / 2 + panelHeight / 2 - 25, '[ Click anywhere to close ]', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#7f8c8d'
    });
    closeBtn.setOrigin(0.5);
    this.controlsOverlay.add(closeBtn);
  }
  
  toggleControlsOverlay(): void {
    if (this.controlsVisible) {
      this.hideControlsOverlay();
    } else {
      this.showControlsOverlay();
    }
  }
  
  showControlsOverlay(): void {
    if (!this.controlsOverlay) return;
    this.controlsOverlay.setVisible(true);
    this.controlsVisible = true;
    
    // Animate in
    this.controlsOverlay.setAlpha(0);
    this.scene.tweens.add({
      targets: this.controlsOverlay,
      alpha: 1,
      duration: 200
    });
  }
  
  hideControlsOverlay(): void {
    if (!this.controlsOverlay) return;
    
    this.scene.tweens.add({
      targets: this.controlsOverlay,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.controlsOverlay!.setVisible(false);
        this.controlsVisible = false;
      }
    });
  }
  
  isControlsVisible(): boolean {
    return this.controlsVisible;
  }
  
  // Show first-run tutorial
  showFirstRunTutorial(onDismiss: () => void): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
    const tutorial = this.scene.add.container(0, 0);
    tutorial.setScrollFactor(0);
    tutorial.setDepth(250);
    
    // Semi-transparent background
    const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    tutorial.add(bg);
    
    // Panel
    const panelWidth = 500;
    const panelHeight = 350;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x1a1a2e, 0.95);
    panel.fillRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 15);
    panel.lineStyle(3, 0xf39c12, 1);
    panel.strokeRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 15);
    tutorial.add(panel);
    
    // Title
    const title = this.scene.add.text(width / 2, height / 2 - 140, '🏑 WELCOME TO STICK & SHIFT!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#f39c12',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    tutorial.add(title);
    
    // Quick controls
    const controlsText = this.scene.add.text(width / 2, height / 2 - 50, 
      'QUICK CONTROLS:\n\n' +
      '⬆️⬇️⬅️➡️  WASD / Arrows = Move\n' +
      '🏑  SPACE / Click = Shoot\n' +
      '📐  E = Pass\n' +
      '⚔️  Q = Tackle\n' +
      '💨  SHIFT = Dodge', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ecf0f1',
      align: 'center',
      lineSpacing: 6
    });
    controlsText.setOrigin(0.5);
    tutorial.add(controlsText);
    
    // Dismiss button
    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0x27ae60, 1);
    btnBg.fillRoundedRect(width / 2 - 80, height / 2 + 100, 160, 45, 10);
    tutorial.add(btnBg);
    
    const btnText = this.scene.add.text(width / 2, height / 2 + 122, "LET'S GO!", {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    btnText.setOrigin(0.5);
    tutorial.add(btnText);
    
    // Make interactive
    const hitArea = this.scene.add.rectangle(width / 2, height / 2 + 122, 160, 45, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    tutorial.add(hitArea);
    
    hitArea.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: tutorial,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          tutorial.destroy();
          onDismiss();
        }
      });
    });
    
    hitArea.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x2ecc71, 1);
      btnBg.fillRoundedRect(width / 2 - 80, height / 2 + 100, 160, 45, 10);
    });
    
    hitArea.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x27ae60, 1);
      btnBg.fillRoundedRect(width / 2 - 80, height / 2 + 100, 160, 45, 10);
    });
    
    // Auto-dismiss after 6 seconds
    this.scene.time.delayedCall(6000, () => {
      if (tutorial.active) {
        this.scene.tweens.add({
          targets: tutorial,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (tutorial.active) {
              tutorial.destroy();
              onDismiss();
            }
          }
        });
      }
    });
  }
  
  // Show moment recap
  showMomentRecap(stats: MomentRecapStats, onContinue: () => void): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
    const recap = this.scene.add.container(0, 0);
    recap.setScrollFactor(0);
    recap.setDepth(180);
    
    // Background
    const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    recap.add(bg);
    
    // Panel
    const panelWidth = 350;
    const panelHeight = 280;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x1a1a2e, 0.95);
    panel.fillRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 12);
    panel.lineStyle(2, 0x3498db, 1);
    panel.strokeRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 12);
    recap.add(panel);
    
    // Title
    const title = this.scene.add.text(width / 2, height / 2 - panelHeight / 2 + 25, '📊 MOMENT RECAP', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#3498db',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    recap.add(title);
    
    // Stats
    const statsList = [
      { label: 'Goals', value: `${stats.goalsScored} - ${stats.goalsConceded}` },
      { label: 'Shots', value: `${stats.shotsOnTarget}/${stats.shotsTaken}` },
      { label: 'Passes', value: `${stats.passesCompleted}/${stats.passesAttempted}` },
      { label: 'Tackles', value: `${stats.tacklesWon} won` },
      { label: 'Possession', value: `${Math.round((stats.possessionTime / stats.totalTime) * 100)}%` }
    ];
    
    const startY = height / 2 - panelHeight / 2 + 65;
    statsList.forEach((stat, i) => {
      const y = startY + i * 32;
      
      const label = this.scene.add.text(width / 2 - 100, y, stat.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#bdc3c7'
      });
      recap.add(label);
      
      const value = this.scene.add.text(width / 2 + 100, y, stat.value, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      value.setOrigin(1, 0);
      recap.add(value);
    });
    
    // Continue button
    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0x3498db, 1);
    btnBg.fillRoundedRect(width / 2 - 70, height / 2 + panelHeight / 2 - 55, 140, 40, 8);
    recap.add(btnBg);
    
    const btnText = this.scene.add.text(width / 2, height / 2 + panelHeight / 2 - 35, 'CONTINUE', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    btnText.setOrigin(0.5);
    recap.add(btnText);
    
    const hitArea = this.scene.add.rectangle(width / 2, height / 2 + panelHeight / 2 - 35, 140, 40, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    recap.add(hitArea);
    
    hitArea.on('pointerdown', () => {
      recap.destroy();
      onContinue();
    });
    
    hitArea.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x2980b9, 1);
      btnBg.fillRoundedRect(width / 2 - 70, height / 2 + panelHeight / 2 - 55, 140, 40, 8);
    });
    
    hitArea.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x3498db, 1);
      btnBg.fillRoundedRect(width / 2 - 70, height / 2 + panelHeight / 2 - 55, 140, 40, 8);
    });
    
    // Animate in
    recap.setAlpha(0);
    this.scene.tweens.add({
      targets: recap,
      alpha: 1,
      duration: 300
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
      case 'giveAndGo':
        objectiveText = `Give-and-go goal (${state.objectiveProgress}/${state.objectiveTarget})`;
        break;
      case 'possession':
        objectiveText = `Hold possession: ${Math.round(state.objectiveProgress)}s / ${state.objectiveTarget}s`;
        break;
      case 'pressWin':
        objectiveText = `Force turnovers (${state.objectiveProgress}/${state.objectiveTarget})`;
        break;
    }
    this.updateObjective(objectiveText);
  }
  
  // Add upgrade icon to display
  addUpgradeIcon(icon: string, name: string, rarity: Rarity = 'common'): void {
    if (!this.upgradeContainer) return;
    
    // Remove oldest if at max
    if (this.upgradeIcons.length >= this.maxUpgradeIcons) {
      const oldest = this.upgradeIcons.shift();
      oldest?.container.destroy();
      this.repositionUpgradeIcons();
    }
    
    const index = this.upgradeIcons.length;
    const y = index * 38;
    
    const container = this.scene.add.container(0, y);
    this.upgradeContainer.add(container);
    
    // Background with rarity color
    const rarityColor = RARITY_COLORS[rarity] || 0x3498db;
    const bg = this.scene.add.circle(15, 0, 17, 0x1a1a2e, 0.9);
    bg.setStrokeStyle(2, rarityColor);
    container.add(bg);
    
    // Icon
    const iconText = this.scene.add.text(15, 0, icon, {
      fontSize: '18px'
    });
    iconText.setOrigin(0.5);
    container.add(iconText);
    
    // Store reference
    this.upgradeIcons.push({
      container,
      bg,
      icon: iconText,
      rarity,
      upgradeId: name  // Use name as ID for now
    });
    
    // Entrance animation
    container.setAlpha(0);
    container.setScale(0.5);
    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
    
    // Tooltip on hover
    bg.setInteractive();
    bg.on('pointerover', () => {
      // Could show tooltip with name
    });
  }
  
  private repositionUpgradeIcons(): void {
    this.upgradeIcons.forEach((iconData, index) => {
      this.scene.tweens.add({
        targets: iconData.container,
        y: index * 38,
        duration: 150,
        ease: 'Power2'
      });
    });
  }
  
  // Show upgrade proc feedback
  showUpgradeProc(upgrade: Upgrade, intensity: number = 1): void {
    // Find the upgrade icon if it exists
    const iconData = this.upgradeIcons.find(i => i.upgradeId === upgrade.name);
    
    // Pulse the icon if found
    if (iconData) {
      this.pulseUpgradeIcon(iconData, intensity);
    }
    
    // Show toast for significant procs
    if (intensity >= 0.7) {
      this.showProcToast(upgrade.name, upgrade.icon, intensity);
    }
    
    // Play proc sound (handled externally)
  }
  
  private pulseUpgradeIcon(iconData: UpgradeIconData, intensity: number): void {
    const { container, bg } = iconData;
    
    // Glow effect
    const glowColor = RARITY_COLORS[iconData.rarity] || 0x3498db;
    
    // Scale pulse
    this.scene.tweens.add({
      targets: container,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 100,
      yoyo: true,
      ease: 'Power2'
    });
    
    // Flash the border
    const originalWidth = bg.lineWidth;
    bg.setStrokeStyle(4, glowColor);
    
    this.scene.time.delayedCall(200, () => {
      bg.setStrokeStyle(2, glowColor);
    });
  }
  
  private showProcToast(name: string, icon: string, intensity: number): void {
    const width = this.scene.cameras.main.width;
    
    const toastText = this.scene.add.text(
      width - 20,
      140 + this.upgradeIcons.length * 38,
      `${icon} ${name}!`,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: intensity >= 1 ? '14px' : '12px',
        color: intensity >= 1 ? '#f1c40f' : '#ecf0f1',
        fontStyle: intensity >= 1 ? 'bold' : 'normal'
      }
    );
    toastText.setOrigin(1, 0.5);
    toastText.setScrollFactor(0);
    toastText.setDepth(110);
    
    // Animate in and out
    toastText.setAlpha(0);
    toastText.x += 30;
    
    this.scene.tweens.add({
      targets: toastText,
      alpha: 1,
      x: toastText.x - 30,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.scene.tweens.add({
          targets: toastText,
          alpha: 0,
          x: toastText.x - 20,
          duration: 300,
          delay: 800,
          onComplete: () => toastText.destroy()
        });
      }
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
  
  // Show "no possession" feedback
  showNoPossessionFeedback(): void {
    const text = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY + 100,
      'No ball!',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#e74c3c',
        stroke: '#000000',
        strokeThickness: 3
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(120);
    
    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 30,
      duration: 600,
      onComplete: () => text.destroy()
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
    this.radarDots.clear();
    this.controlsOverlay?.destroy();
  }
}
