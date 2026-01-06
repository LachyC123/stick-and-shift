// TextureFactory - Runtime texture generation for Stick & Shift
// Creates stylized 2D art without external assets

import Phaser from 'phaser';

export class TextureFactory {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  // Generate all game textures
  generateAll(): void {
    this.generatePlayerTextures();
    this.generateEnemyTextures();
    this.generateBallTexture();
    this.generateGoalTextures();
    this.generatePitchTextures();
    this.generateUITextures();
    this.generateParticleTextures();
    this.generateEffectTextures();
  }
  
  // Player sprite with jersey, stick, and outline
  private generatePlayerTextures(): void {
    const colors = [
      0x3498db, 0xe74c3c, 0x2ecc71, 0x9b59b6, 0xf39c12,
      0x1abc9c, 0xe67e22, 0x8e44ad, 0xf1c40f, 0x16a085,
      0xc0392b, 0x27ae60, 0xd35400, 0x2980b9, 0x8b0000,
      0x00bcd4, 0x673ab7, 0xff5722, 0x34495e, 0xe91e63
    ];
    
    colors.forEach((color, index) => {
      this.createPlayerSprite(`player_${index}`, color, false);
    });
    
    // Create selected/highlighted version
    this.createPlayerSprite('player_selected', 0xffffff, true);
  }
  
  private createPlayerSprite(key: string, color: number, isSelected: boolean): void {
    const size = 48;
    const graphics = this.scene.add.graphics();
    
    // Shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(size / 2 + 2, size - 6, 28, 12);
    
    // Body - rounded rectangle (jersey)
    const bodyColor = color;
    graphics.fillStyle(bodyColor, 1);
    graphics.fillRoundedRect(size / 2 - 12, 8, 24, 28, 6);
    
    // Jersey highlight
    graphics.fillStyle(0xffffff, 0.2);
    graphics.fillRoundedRect(size / 2 - 10, 10, 8, 24, 4);
    
    // Jersey shadow
    graphics.fillStyle(0x000000, 0.2);
    graphics.fillRoundedRect(size / 2 + 2, 10, 8, 24, 4);
    
    // Head - circle
    graphics.fillStyle(0xf5d5c8, 1);  // Skin tone
    graphics.fillCircle(size / 2, 10, 10);
    
    // Head outline
    graphics.lineStyle(2, 0x333333, 1);
    graphics.strokeCircle(size / 2, 10, 10);
    
    // Body outline
    graphics.lineStyle(2, 0x333333, 1);
    graphics.strokeRoundedRect(size / 2 - 12, 8, 24, 28, 6);
    
    // Legs
    graphics.fillStyle(0x2c3e50, 1);
    graphics.fillRoundedRect(size / 2 - 10, 34, 8, 12, 3);
    graphics.fillRoundedRect(size / 2 + 2, 34, 8, 12, 3);
    
    // Hockey stick
    graphics.lineStyle(4, 0x8b4513, 1);  // Wood brown
    graphics.beginPath();
    graphics.moveTo(size / 2 + 14, 12);
    graphics.lineTo(size / 2 + 20, 40);
    graphics.lineTo(size / 2 + 28, 42);
    graphics.strokePath();
    
    // Stick head
    graphics.fillStyle(0x333333, 1);
    graphics.fillRoundedRect(size / 2 + 17, 38, 14, 6, 2);
    
    // Selection glow
    if (isSelected) {
      graphics.lineStyle(3, 0xffff00, 0.8);
      graphics.strokeCircle(size / 2, size / 2, size / 2 - 4);
    }
    
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }
  
  // Enemy sprites with different silhouette
  private generateEnemyTextures(): void {
    const enemyColors = [
      { key: 'enemy_defender', color: 0x7f8c8d },
      { key: 'enemy_mid', color: 0x95a5a6 },
      { key: 'enemy_forward', color: 0xbdc3c7 },
      { key: 'enemy_boss', color: 0xff6b6b },
      { key: 'enemy_orange', color: 0xff9500 }
    ];
    
    enemyColors.forEach(({ key, color }) => {
      this.createEnemySprite(key, color, key === 'enemy_boss' || key === 'enemy_orange');
    });
  }
  
  private createEnemySprite(key: string, color: number, isBoss: boolean): void {
    const size = isBoss ? 56 : 48;
    const graphics = this.scene.add.graphics();
    
    // Shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(size / 2 + 2, size - 6, isBoss ? 36 : 28, 12);
    
    // Body - more angular than player
    graphics.fillStyle(color, 1);
    graphics.fillRect(size / 2 - 14, 10, 28, 26);
    
    // Shoulder pads (angular)
    graphics.fillStyle(color, 1);
    graphics.fillTriangle(
      size / 2 - 14, 10,
      size / 2 - 20, 18,
      size / 2 - 14, 26
    );
    graphics.fillTriangle(
      size / 2 + 14, 10,
      size / 2 + 20, 18,
      size / 2 + 14, 26
    );
    
    // Body shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRect(size / 2, 12, 12, 22);
    
    // Head - slightly menacing
    graphics.fillStyle(0x555555, 1);
    graphics.fillCircle(size / 2, 10, 10);
    
    // Eyes (glowing for boss)
    if (isBoss) {
      graphics.fillStyle(0xff0000, 1);
      graphics.fillCircle(size / 2 - 4, 9, 3);
      graphics.fillCircle(size / 2 + 4, 9, 3);
    } else {
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(size / 2 - 4, 9, 2);
      graphics.fillCircle(size / 2 + 4, 9, 2);
    }
    
    // Outline
    graphics.lineStyle(2, 0x1a1a1a, 1);
    graphics.strokeRect(size / 2 - 14, 10, 28, 26);
    graphics.strokeCircle(size / 2, 10, 10);
    
    // Legs
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRect(size / 2 - 10, 34, 8, 12);
    graphics.fillRect(size / 2 + 2, 34, 8, 12);
    
    // Hockey stick (enemy style)
    graphics.lineStyle(4, 0x4a4a4a, 1);
    graphics.beginPath();
    graphics.moveTo(size / 2 - 14, 14);
    graphics.lineTo(size / 2 - 22, 40);
    graphics.lineTo(size / 2 - 30, 42);
    graphics.strokePath();
    
    // Stick head
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRoundedRect(size / 2 - 33, 38, 14, 6, 2);
    
    // Boss aura
    if (isBoss) {
      graphics.lineStyle(3, 0xff0000, 0.5);
      graphics.strokeCircle(size / 2, size / 2, size / 2 - 2);
    }
    
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }
  
  // Field hockey ball
  private generateBallTexture(): void {
    const size = 20;
    const graphics = this.scene.add.graphics();
    
    // Shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(size / 2 + 1, size / 2 + 3, 14, 8);
    
    // Ball base
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(size / 2, size / 2 - 2, 8);
    
    // Dimple pattern (simplified)
    graphics.fillStyle(0xe0e0e0, 1);
    graphics.fillCircle(size / 2 - 3, size / 2 - 4, 2);
    graphics.fillCircle(size / 2 + 2, size / 2 - 1, 2);
    graphics.fillCircle(size / 2 - 1, size / 2, 1.5);
    
    // Highlight
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillCircle(size / 2 - 3, size / 2 - 5, 3);
    
    // Outline
    graphics.lineStyle(1.5, 0x999999, 1);
    graphics.strokeCircle(size / 2, size / 2 - 2, 8);
    
    graphics.generateTexture('ball', size, size);
    graphics.destroy();
    
    // Ball trail
    const trailGraphics = this.scene.add.graphics();
    trailGraphics.fillStyle(0xffffff, 0.5);
    trailGraphics.fillCircle(6, 6, 5);
    trailGraphics.generateTexture('ball_trail', 12, 12);
    trailGraphics.destroy();
  }
  
  // Goal posts and net
  private generateGoalTextures(): void {
    // Left goal
    this.createGoalTexture('goal_left', true);
    // Right goal
    this.createGoalTexture('goal_right', false);
  }
  
  private createGoalTexture(key: string, isLeft: boolean): void {
    const width = 40;
    const height = 120;
    const graphics = this.scene.add.graphics();
    
    // Backboard
    graphics.fillStyle(0x2d2d2d, 1);
    if (isLeft) {
      graphics.fillRect(0, 0, 8, height);
    } else {
      graphics.fillRect(width - 8, 0, 8, height);
    }
    
    // Net pattern
    graphics.lineStyle(1, 0xcccccc, 0.7);
    const netStart = isLeft ? 8 : 0;
    const netEnd = isLeft ? width : width - 8;
    
    // Horizontal lines
    for (let y = 5; y < height; y += 10) {
      graphics.beginPath();
      graphics.moveTo(netStart, y);
      graphics.lineTo(netEnd, y);
      graphics.strokePath();
    }
    
    // Diagonal lines (net mesh)
    for (let i = 0; i < 20; i++) {
      graphics.beginPath();
      graphics.moveTo(netStart, i * 10);
      graphics.lineTo(netEnd, i * 10 + 20);
      graphics.strokePath();
      
      graphics.beginPath();
      graphics.moveTo(netStart, i * 10 + 20);
      graphics.lineTo(netEnd, i * 10);
      graphics.strokePath();
    }
    
    // Posts
    graphics.fillStyle(0xffffff, 1);
    const postX = isLeft ? width - 6 : 0;
    graphics.fillRect(postX, 0, 6, 4);       // Top post
    graphics.fillRect(postX, height - 4, 6, 4);  // Bottom post
    graphics.fillRect(postX, 0, 6, height);  // Back post
    
    // Post outlines
    graphics.lineStyle(2, 0x333333, 1);
    graphics.strokeRect(postX, 0, 6, 4);
    graphics.strokeRect(postX, height - 4, 6, 4);
    
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }
  
  // Pitch textures
  private generatePitchTextures(): void {
    // Turf base with stripes
    this.createTurfTexture();
    // White line texture
    this.createLineTexture();
    // Circle (for D)
    this.createCircleTexture();
  }
  
  private createTurfTexture(): void {
    const width = 64;
    const height = 64;
    const graphics = this.scene.add.graphics();
    
    // Base green
    graphics.fillStyle(0x228b22, 1);
    graphics.fillRect(0, 0, width, height);
    
    // Stripe pattern (alternating slightly different greens)
    graphics.fillStyle(0x1e7b1e, 1);
    for (let y = 0; y < height; y += 16) {
      graphics.fillRect(0, y, width, 8);
    }
    
    // Subtle noise/texture dots
    graphics.fillStyle(0x1a6b1a, 0.3);
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      graphics.fillCircle(x, y, 1);
    }
    
    graphics.generateTexture('turf', width, height);
    graphics.destroy();
  }
  
  private createLineTexture(): void {
    const graphics = this.scene.add.graphics();
    
    // Horizontal line
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 100, 4);
    graphics.generateTexture('line_h', 100, 4);
    
    // Vertical line
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 100);
    graphics.generateTexture('line_v', 4, 100);
    
    graphics.destroy();
  }
  
  private createCircleTexture(): void {
    const size = 200;
    const graphics = this.scene.add.graphics();
    
    // D/Circle outline
    graphics.lineStyle(4, 0xffffff, 1);
    graphics.strokeCircle(size / 2, size / 2, size / 2 - 4);
    
    graphics.generateTexture('circle', size, size);
    graphics.destroy();
    
    // Half circle for shooting circle (D)
    const dGraphics = this.scene.add.graphics();
    dGraphics.lineStyle(4, 0xffffff, 1);
    dGraphics.beginPath();
    dGraphics.arc(0, 75, 75, -Math.PI / 2, Math.PI / 2, false);
    dGraphics.strokePath();
    dGraphics.generateTexture('d_right', 80, 150);
    
    dGraphics.clear();
    dGraphics.lineStyle(4, 0xffffff, 1);
    dGraphics.beginPath();
    dGraphics.arc(80, 75, 75, Math.PI / 2, -Math.PI / 2, false);
    dGraphics.strokePath();
    dGraphics.generateTexture('d_left', 80, 150);
    
    dGraphics.destroy();
  }
  
  // UI textures
  private generateUITextures(): void {
    // Button backgrounds
    this.createButtonTexture('btn_normal', 0x3498db, 0x2980b9);
    this.createButtonTexture('btn_hover', 0x5dade2, 0x3498db);
    this.createButtonTexture('btn_pressed', 0x2471a3, 0x1a5276);
    this.createButtonTexture('btn_disabled', 0x7f8c8d, 0x566573);
    
    // Panel background
    this.createPanelTexture();
    
    // Card backgrounds for upgrades
    this.createCardTextures();
    
    // Icons
    this.createIconTextures();
  }
  
  private createButtonTexture(key: string, color1: number, color2: number): void {
    const width = 200;
    const height = 50;
    const graphics = this.scene.add.graphics();
    
    // Shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRoundedRect(4, 4, width, height, 10);
    
    // Button body
    graphics.fillStyle(color1, 1);
    graphics.fillRoundedRect(0, 0, width, height, 10);
    
    // Bottom darker part (3D effect)
    graphics.fillStyle(color2, 1);
    graphics.fillRoundedRect(0, height / 2, width, height / 2, { tl: 0, tr: 0, bl: 10, br: 10 });
    
    // Highlight
    graphics.fillStyle(0xffffff, 0.2);
    graphics.fillRoundedRect(4, 4, width - 8, height / 3, 6);
    
    // Border
    graphics.lineStyle(2, 0xffffff, 0.3);
    graphics.strokeRoundedRect(0, 0, width, height, 10);
    
    graphics.generateTexture(key, width + 8, height + 8);
    graphics.destroy();
  }
  
  private createPanelTexture(): void {
    const width = 300;
    const height = 200;
    const graphics = this.scene.add.graphics();
    
    // Shadow
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillRoundedRect(6, 6, width, height, 15);
    
    // Panel body
    graphics.fillStyle(0x1a1a2e, 0.95);
    graphics.fillRoundedRect(0, 0, width, height, 15);
    
    // Border
    graphics.lineStyle(3, 0x3498db, 0.8);
    graphics.strokeRoundedRect(0, 0, width, height, 15);
    
    // Inner glow
    graphics.lineStyle(1, 0x5dade2, 0.3);
    graphics.strokeRoundedRect(4, 4, width - 8, height - 8, 12);
    
    graphics.generateTexture('panel', width + 10, height + 10);
    graphics.destroy();
  }
  
  private createCardTextures(): void {
    const rarities = [
      { key: 'card_common', color: 0x9e9e9e },
      { key: 'card_uncommon', color: 0x4caf50 },
      { key: 'card_rare', color: 0x2196f3 },
      { key: 'card_epic', color: 0x9c27b0 },
      { key: 'card_legendary', color: 0xff9800 }
    ];
    
    rarities.forEach(({ key, color }) => {
      this.createCardTexture(key, color);
    });
  }
  
  private createCardTexture(key: string, glowColor: number): void {
    const width = 160;
    const height = 220;
    const graphics = this.scene.add.graphics();
    
    // Outer glow
    graphics.fillStyle(glowColor, 0.3);
    graphics.fillRoundedRect(0, 0, width, height, 12);
    
    // Card body
    graphics.fillStyle(0x1e1e2e, 1);
    graphics.fillRoundedRect(4, 4, width - 8, height - 8, 10);
    
    // Top accent bar
    graphics.fillStyle(glowColor, 1);
    graphics.fillRoundedRect(4, 4, width - 8, 8, { tl: 10, tr: 10, bl: 0, br: 0 });
    
    // Border
    graphics.lineStyle(2, glowColor, 0.8);
    graphics.strokeRoundedRect(4, 4, width - 8, height - 8, 10);
    
    // Inner highlight
    graphics.fillStyle(0xffffff, 0.05);
    graphics.fillRoundedRect(8, 16, width - 16, 60, 6);
    
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }
  
  private createIconTextures(): void {
    const iconSize = 32;
    
    // Gem icon
    const gemGraphics = this.scene.add.graphics();
    gemGraphics.fillStyle(0xf1c40f, 1);
    gemGraphics.beginPath();
    gemGraphics.moveTo(iconSize / 2, 2);
    gemGraphics.lineTo(iconSize - 4, iconSize / 3);
    gemGraphics.lineTo(iconSize / 2, iconSize - 4);
    gemGraphics.lineTo(4, iconSize / 3);
    gemGraphics.closePath();
    gemGraphics.fillPath();
    gemGraphics.lineStyle(2, 0xd4ac0d, 1);
    gemGraphics.strokePath();
    gemGraphics.fillStyle(0xffffff, 0.4);
    gemGraphics.fillTriangle(iconSize / 2, 6, iconSize - 8, iconSize / 3, iconSize / 2, iconSize / 2);
    gemGraphics.generateTexture('icon_gem', iconSize, iconSize);
    gemGraphics.destroy();
    
    // Timer icon
    const timerGraphics = this.scene.add.graphics();
    timerGraphics.fillStyle(0xecf0f1, 1);
    timerGraphics.fillCircle(iconSize / 2, iconSize / 2, iconSize / 2 - 2);
    timerGraphics.lineStyle(2, 0x2c3e50, 1);
    timerGraphics.strokeCircle(iconSize / 2, iconSize / 2, iconSize / 2 - 2);
    timerGraphics.lineStyle(2, 0xe74c3c, 1);
    timerGraphics.beginPath();
    timerGraphics.moveTo(iconSize / 2, iconSize / 2);
    timerGraphics.lineTo(iconSize / 2, 6);
    timerGraphics.strokePath();
    timerGraphics.beginPath();
    timerGraphics.moveTo(iconSize / 2, iconSize / 2);
    timerGraphics.lineTo(iconSize - 8, iconSize / 2);
    timerGraphics.strokePath();
    timerGraphics.generateTexture('icon_timer', iconSize, iconSize);
    timerGraphics.destroy();
    
    // Cooldown circle
    const cdGraphics = this.scene.add.graphics();
    cdGraphics.fillStyle(0x333333, 0.7);
    cdGraphics.fillCircle(16, 16, 14);
    cdGraphics.lineStyle(2, 0xffffff, 0.5);
    cdGraphics.strokeCircle(16, 16, 14);
    cdGraphics.generateTexture('cooldown_bg', 32, 32);
    cdGraphics.destroy();
  }
  
  // Particle textures
  private generateParticleTextures(): void {
    // Sprint trail particle
    const sprintGraphics = this.scene.add.graphics();
    sprintGraphics.fillStyle(0xffffff, 1);
    sprintGraphics.fillCircle(8, 8, 6);
    sprintGraphics.generateTexture('particle_sprint', 16, 16);
    sprintGraphics.destroy();
    
    // Dust particle
    const dustGraphics = this.scene.add.graphics();
    dustGraphics.fillStyle(0x8b7355, 1);
    dustGraphics.fillCircle(6, 6, 4);
    dustGraphics.generateTexture('particle_dust', 12, 12);
    dustGraphics.destroy();
    
    // Confetti particles (various colors)
    const confettiColors = [0xff6b6b, 0xfeca57, 0x48dbfb, 0xff9ff3, 0x00d2d3, 0x54a0ff];
    confettiColors.forEach((color, i) => {
      const confettiGraphics = this.scene.add.graphics();
      confettiGraphics.fillStyle(color, 1);
      confettiGraphics.fillRect(0, 0, 8, 4);
      confettiGraphics.generateTexture(`confetti_${i}`, 8, 4);
      confettiGraphics.destroy();
    });
    
    // Star particle
    const starGraphics = this.scene.add.graphics();
    starGraphics.fillStyle(0xf1c40f, 1);
    this.drawStar(starGraphics, 10, 10, 5, 10, 4);
    starGraphics.generateTexture('particle_star', 20, 20);
    starGraphics.destroy();
    
    // Impact burst
    const burstGraphics = this.scene.add.graphics();
    burstGraphics.fillStyle(0xffffff, 1);
    burstGraphics.fillCircle(16, 16, 12);
    burstGraphics.fillStyle(0xf1c40f, 1);
    burstGraphics.fillCircle(16, 16, 8);
    burstGraphics.generateTexture('particle_burst', 32, 32);
    burstGraphics.destroy();
  }
  
  private drawStar(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    
    graphics.beginPath();
    graphics.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      graphics.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      graphics.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    
    graphics.lineTo(cx, cy - outerRadius);
    graphics.closePath();
    graphics.fillPath();
  }
  
  // Effect textures
  private generateEffectTextures(): void {
    // Tackle effect
    const tackleGraphics = this.scene.add.graphics();
    tackleGraphics.lineStyle(4, 0xff6b6b, 1);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const innerR = 15;
      const outerR = 30;
      tackleGraphics.beginPath();
      tackleGraphics.moveTo(32 + Math.cos(angle) * innerR, 32 + Math.sin(angle) * innerR);
      tackleGraphics.lineTo(32 + Math.cos(angle) * outerR, 32 + Math.sin(angle) * outerR);
      tackleGraphics.strokePath();
    }
    tackleGraphics.generateTexture('effect_tackle', 64, 64);
    tackleGraphics.destroy();
    
    // Dodge effect (motion blur)
    const dodgeGraphics = this.scene.add.graphics();
    for (let i = 0; i < 5; i++) {
      dodgeGraphics.fillStyle(0x48dbfb, 0.6 - i * 0.1);
      dodgeGraphics.fillEllipse(30 - i * 6, 16, 12 - i * 2, 28 - i * 4);
    }
    dodgeGraphics.generateTexture('effect_dodge', 40, 32);
    dodgeGraphics.destroy();
    
    // Goal flash
    const goalGraphics = this.scene.add.graphics();
    goalGraphics.fillStyle(0xf1c40f, 0.5);
    goalGraphics.fillCircle(64, 64, 64);
    goalGraphics.fillStyle(0xffffff, 0.3);
    goalGraphics.fillCircle(64, 64, 40);
    goalGraphics.generateTexture('effect_goal', 128, 128);
    goalGraphics.destroy();
    
    // Shield effect
    const shieldGraphics = this.scene.add.graphics();
    shieldGraphics.lineStyle(4, 0x3498db, 0.8);
    shieldGraphics.strokeCircle(24, 24, 20);
    shieldGraphics.lineStyle(2, 0x5dade2, 0.5);
    shieldGraphics.strokeCircle(24, 24, 16);
    shieldGraphics.generateTexture('effect_shield', 48, 48);
    shieldGraphics.destroy();
  }
}
