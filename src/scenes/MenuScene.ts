// MenuScene for Stick & Shift
// Main menu with Play, Store, Challenges, Settings

import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { CHALLENGES } from '../data/challenges';

export class MenuScene extends Phaser.Scene {
  private audioSystem!: AudioSystem;
  private gemDisplay?: Phaser.GameObjects.Container;
  
  constructor() {
    super({ key: 'MenuScene' });
  }
  
  create(): void {
    // Initialize audio
    this.audioSystem = new AudioSystem(this);
    
    // Resume audio context on first interaction
    this.input.once('pointerdown', () => {
      this.audioSystem.resume();
    });
    
    // Background
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    this.createBackground();
    
    // Title
    this.createTitle();
    
    // Menu buttons
    this.createMenuButtons();
    
    // Gem display
    this.createGemDisplay();
    
    // Fade in
    this.cameras.main.fadeIn(300);
    
    // Version info
    this.add.text(10, this.cameras.main.height - 20, 'v1.0.0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#7f8c8d'
    });
  }
  
  private createBackground(): void {
    // Animated background pattern
    const graphics = this.add.graphics();
    
    // Draw turf-like stripes
    for (let y = 0; y < this.cameras.main.height; y += 40) {
      const shade = y % 80 === 0 ? 0x1e2a1e : 0x1a261a;
      graphics.fillStyle(shade, 0.3);
      graphics.fillRect(0, y, this.cameras.main.width, 40);
    }
    
    // Floating hockey elements
    this.createFloatingElements();
  }
  
  private createFloatingElements(): void {
    const elements = ['🏑', '⚽', '🥅', '🏆'];
    
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * this.cameras.main.width;
      const y = Math.random() * this.cameras.main.height;
      const element = elements[Math.floor(Math.random() * elements.length)];
      
      const text = this.add.text(x, y, element, {
        fontSize: '32px'
      });
      text.setAlpha(0.1);
      
      // Float animation
      this.tweens.add({
        targets: text,
        y: y + 30,
        duration: 2000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      this.tweens.add({
        targets: text,
        x: x + (Math.random() - 0.5) * 50,
        duration: 3000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }
  
  private createTitle(): void {
    const centerX = this.cameras.main.centerX;
    
    // Main title
    const title = this.add.text(centerX, 100, '🏑 STICK & SHIFT', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '56px',
      color: '#f1c40f',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    title.setOrigin(0.5);
    
    // Subtle animation
    this.tweens.add({
      targets: title,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Subtitle
    const subtitle = this.add.text(centerX, 160, 'Field Hockey Roguelike', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#bdc3c7'
    });
    subtitle.setOrigin(0.5);
  }
  
  private createMenuButtons(): void {
    const centerX = this.cameras.main.centerX;
    const startY = 240;
    const spacing = 60;
    
    // Play button
    new Button(this, {
      x: centerX,
      y: startY,
      width: 250,
      height: 55,
      text: '▶ PLAY',
      fontSize: 24,
      style: 'success',
      onClick: () => {
        this.audioSystem.playClick();
        this.cameras.main.fadeOut(300);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('CharacterSelectScene');
        });
      }
    });
    
    // Store button
    new Button(this, {
      x: centerX,
      y: startY + spacing,
      width: 250,
      height: 50,
      text: '🛒 STORE',
      fontSize: 22,
      onClick: () => {
        this.audioSystem.playClick();
        this.cameras.main.fadeOut(300);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('StoreScene');
        });
      }
    });
    
    // Challenges button
    const completedCount = SaveSystem.getInstance().getCompletedChallenges().length;
    const totalCount = CHALLENGES.length;
    
    new Button(this, {
      x: centerX,
      y: startY + spacing * 2,
      width: 250,
      height: 50,
      text: `🎯 CHALLENGES (${completedCount}/${totalCount})`,
      fontSize: 18,
      onClick: () => {
        this.audioSystem.playClick();
        this.showChallenges();
      }
    });
    
    // Controls button - NEW prominent button
    new Button(this, {
      x: centerX,
      y: startY + spacing * 3,
      width: 250,
      height: 50,
      text: '🎮 CONTROLS',
      fontSize: 22,
      onClick: () => {
        this.audioSystem.playClick();
        this.showControls();
      }
    });
    
    // Settings button
    new Button(this, {
      x: centerX,
      y: startY + spacing * 4,
      width: 250,
      height: 50,
      text: '⚙️ SETTINGS',
      fontSize: 22,
      style: 'secondary',
      onClick: () => {
        this.audioSystem.playClick();
        this.showSettings();
      }
    });
  }
  
  private createGemDisplay(): void {
    const gems = SaveSystem.getInstance().getGems();
    
    this.gemDisplay = this.add.container(this.cameras.main.width - 120, 30);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.9);
    bg.fillRoundedRect(-60, -20, 120, 40, 10);
    bg.lineStyle(2, 0xf1c40f, 0.5);
    bg.strokeRoundedRect(-60, -20, 120, 40, 10);
    this.gemDisplay.add(bg);
    
    // Gem icon
    const icon = this.add.text(-40, 0, '💎', { fontSize: '20px' });
    icon.setOrigin(0.5);
    this.gemDisplay.add(icon);
    
    // Gem count
    const count = this.add.text(10, 0, gems.toString(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#f1c40f',
      fontStyle: 'bold'
    });
    count.setOrigin(0.5);
    this.gemDisplay.add(count);
  }
  
  private showChallenges(): void {
    // Create challenges overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    );
    overlay.setInteractive();
    
    const panel = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
    
    // Panel background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRoundedRect(-300, -250, 600, 500, 20);
    bg.lineStyle(3, 0xf39c12, 0.8);
    bg.strokeRoundedRect(-300, -250, 600, 500, 20);
    panel.add(bg);
    
    // Title
    const title = this.add.text(0, -220, '🎯 CHALLENGES', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#f39c12',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    panel.add(title);
    
    // Challenge list
    const completedChallenges = SaveSystem.getInstance().getCompletedChallenges();
    const displayChallenges = CHALLENGES.slice(0, 8);  // Show first 8
    
    displayChallenges.forEach((challenge, i) => {
      const isCompleted = completedChallenges.includes(challenge.id);
      const y = -150 + i * 50;
      
      // Icon
      const icon = this.add.text(-270, y, isCompleted ? '✅' : challenge.icon, {
        fontSize: '24px'
      });
      panel.add(icon);
      
      // Name
      const name = this.add.text(-230, y, challenge.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: isCompleted ? '#27ae60' : '#ffffff',
        fontStyle: isCompleted ? 'normal' : 'bold'
      });
      name.setOrigin(0, 0.5);
      panel.add(name);
      
      // Description
      const desc = this.add.text(-230, y + 18, challenge.description, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#7f8c8d'
      });
      desc.setOrigin(0, 0.5);
      panel.add(desc);
      
      // Reward
      const reward = this.add.text(250, y, `💎 ${challenge.reward.gems}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#f1c40f'
      });
      reward.setOrigin(1, 0.5);
      panel.add(reward);
    });
    
    // Close button
    const closeBtn = new Button(this, {
      x: this.cameras.main.centerX,
      y: this.cameras.main.centerY + 220,
      width: 150,
      height: 45,
      text: 'Close',
      style: 'secondary',
      onClick: () => {
        overlay.destroy();
        panel.destroy();
        closeBtn.destroy();
      }
    });
  }
  
  private showControls(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Create controls overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      width,
      height,
      0x000000,
      0.8
    );
    overlay.setInteractive();
    
    const panel = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
    
    // Panel background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRoundedRect(-250, -220, 500, 440, 20);
    bg.lineStyle(3, 0x3498db, 0.8);
    bg.strokeRoundedRect(-250, -220, 500, 440, 20);
    panel.add(bg);
    
    // Title
    const title = this.add.text(0, -190, '🎮 CONTROLS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#3498db',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    panel.add(title);
    
    // Controls list
    const controls = [
      { key: 'WASD / Arrow Keys', action: 'Move your player' },
      { key: 'SPACE / Left Click', action: 'Shoot the ball (with possession)' },
      { key: 'E', action: 'Pass to nearest teammate' },
      { key: 'Q', action: 'Tackle (lunge to steal ball)' },
      { key: 'SHIFT', action: 'Dodge / Sidestep with i-frames' },
      { key: 'Mouse', action: 'Aim direction' },
      { key: 'ESC / P', action: 'Pause the game' },
      { key: 'H', action: 'Toggle controls help (in-game)' }
    ];
    
    const startY = -130;
    controls.forEach((control, i) => {
      const y = startY + i * 40;
      
      // Key box
      const keyBg = this.add.graphics();
      keyBg.fillStyle(0x2c3e50, 1);
      keyBg.fillRoundedRect(-220, y - 14, 160, 28, 6);
      panel.add(keyBg);
      
      const keyText = this.add.text(-140, y, control.key, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#3498db',
        fontStyle: 'bold'
      });
      keyText.setOrigin(0.5);
      panel.add(keyText);
      
      // Action text
      const actionText = this.add.text(-40, y, control.action, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#ecf0f1'
      });
      actionText.setOrigin(0, 0.5);
      panel.add(actionText);
    });
    
    // Tips
    const tips = this.add.text(0, 160, '💡 TIP: When using keyboard only, shots auto-aim toward the goal!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#f39c12',
      wordWrap: { width: 420 },
      align: 'center'
    });
    tips.setOrigin(0.5);
    panel.add(tips);
    
    // Close button
    const closeBtn = new Button(this, {
      x: this.cameras.main.centerX,
      y: this.cameras.main.centerY + 195,
      width: 150,
      height: 45,
      text: 'Got It!',
      style: 'success',
      onClick: () => {
        this.audioSystem.playClick();
        overlay.destroy();
        panel.destroy();
        closeBtn.destroy();
      }
    });
  }
  
  private showSettings(): void {
    const settings = SaveSystem.getInstance().getSettings();
    
    // Create settings overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    );
    overlay.setInteractive();
    
    const panel = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
    
    // Panel background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRoundedRect(-200, -180, 400, 360, 20);
    bg.lineStyle(3, 0x3498db, 0.8);
    bg.strokeRoundedRect(-200, -180, 400, 360, 20);
    panel.add(bg);
    
    // Title
    const title = this.add.text(0, -150, '⚙️ SETTINGS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#3498db',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    panel.add(title);
    
    // Music volume
    const musicLabel = this.add.text(-150, -80, 'Music Volume:', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffffff'
    });
    panel.add(musicLabel);
    
    const musicValue = this.add.text(120, -80, `${Math.round(settings.musicVolume * 100)}%`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#f1c40f'
    });
    panel.add(musicValue);
    
    // SFX volume
    const sfxLabel = this.add.text(-150, -30, 'SFX Volume:', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffffff'
    });
    panel.add(sfxLabel);
    
    const sfxValue = this.add.text(120, -30, `${Math.round(settings.sfxVolume * 100)}%`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#f1c40f'
    });
    panel.add(sfxValue);
    
    // Screen shake toggle
    const shakeLabel = this.add.text(-150, 20, 'Screen Shake:', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffffff'
    });
    panel.add(shakeLabel);
    
    const shakeValue = this.add.text(120, 20, settings.screenShake ? 'ON' : 'OFF', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: settings.screenShake ? '#27ae60' : '#e74c3c'
    });
    shakeValue.setInteractive({ useHandCursor: true });
    shakeValue.on('pointerdown', () => {
      const newValue = !SaveSystem.getInstance().getSettings().screenShake;
      SaveSystem.getInstance().updateSettings({ screenShake: newValue });
      shakeValue.setText(newValue ? 'ON' : 'OFF');
      shakeValue.setColor(newValue ? '#27ae60' : '#e74c3c');
    });
    panel.add(shakeValue);
    
    // Controls info
    const controlsTitle = this.add.text(0, 80, 'CONTROLS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#bdc3c7',
      fontStyle: 'bold'
    });
    controlsTitle.setOrigin(0.5);
    panel.add(controlsTitle);
    
    const controlsText = this.add.text(0, 120, 
      'WASD/Arrows - Move\n' +
      'SPACE - Shoot\n' +
      'E - Pass\n' +
      'Q - Tackle\n' +
      'SHIFT - Dodge',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#7f8c8d',
        align: 'center'
      }
    );
    controlsText.setOrigin(0.5);
    panel.add(controlsText);
    
    // Close button
    const closeBtn = new Button(this, {
      x: this.cameras.main.centerX,
      y: this.cameras.main.centerY + 155,
      width: 150,
      height: 45,
      text: 'Close',
      style: 'secondary',
      onClick: () => {
        overlay.destroy();
        panel.destroy();
        closeBtn.destroy();
      }
    });
  }
}
