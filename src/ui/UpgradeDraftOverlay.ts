// Upgrade Draft Overlay for Stick & Shift
// Shows 3 upgrade cards to pick from after each moment

import Phaser from 'phaser';
import { Upgrade, RARITY_COLORS, SYNERGY_COLORS, SYNERGY_NAMES, getRandomUpgrades } from '../data/upgrades';
import { Button } from './Button';

export interface UpgradeDraftConfig {
  momentNumber: number;
  ownedUpgradeIds: string[];
  extraChoices: number;
  rerolls: number;
  onSelect: (upgrade: Upgrade) => void;
  onSkip?: () => void;
}

export class UpgradeDraftOverlay extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Rectangle;
  private cards: UpgradeCard[] = [];
  private currentUpgrades: Upgrade[] = [];
  private config: UpgradeDraftConfig;
  private rerollsRemaining: number;
  private rerollButton?: Button;
  private skipButton?: Button;
  
  constructor(scene: Phaser.Scene, config: UpgradeDraftConfig) {
    super(scene, 0, 0);
    
    this.config = config;
    this.rerollsRemaining = config.rerolls;
    
    // Dark overlay
    this.overlay = scene.add.rectangle(
      scene.cameras.main.centerX,
      scene.cameras.main.centerY,
      scene.cameras.main.width,
      scene.cameras.main.height,
      0x000000,
      0.85
    );
    this.overlay.setDepth(200);
    this.add(this.overlay);
    
    // Title
    const title = scene.add.text(
      scene.cameras.main.centerX,
      80,
      '⚡ CHOOSE YOUR UPGRADE ⚡',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        color: '#f1c40f',
        fontStyle: 'bold'
      }
    );
    title.setOrigin(0.5);
    title.setDepth(201);
    this.add(title);
    
    // Subtitle
    const subtitle = scene.add.text(
      scene.cameras.main.centerX,
      120,
      `Moment ${config.momentNumber} Complete!`,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#bdc3c7'
      }
    );
    subtitle.setOrigin(0.5);
    subtitle.setDepth(201);
    this.add(subtitle);
    
    // Generate and show upgrades
    this.generateUpgrades();
    
    // Reroll button
    if (this.rerollsRemaining > 0) {
      this.rerollButton = new Button(scene, {
        x: scene.cameras.main.centerX - 100,
        y: scene.cameras.main.height - 80,
        width: 150,
        height: 40,
        text: `🔄 Reroll (${this.rerollsRemaining})`,
        fontSize: 16,
        style: 'secondary',
        onClick: () => this.reroll()
      });
      this.rerollButton.setDepth(201);
      this.add(this.rerollButton);
    }
    
    // Skip button (optional)
    if (config.onSkip) {
      this.skipButton = new Button(scene, {
        x: scene.cameras.main.centerX + 100,
        y: scene.cameras.main.height - 80,
        width: 150,
        height: 40,
        text: 'Skip',
        fontSize: 16,
        style: 'danger',
        onClick: () => {
          this.hide();
          config.onSkip!();
        }
      });
      this.skipButton.setDepth(201);
      this.add(this.skipButton);
    }
    
    this.setDepth(200);
    scene.add.existing(this);
    
    // Animate in
    this.show();
  }
  
  private generateUpgrades(): void {
    const choiceCount = 3 + this.config.extraChoices;
    this.currentUpgrades = getRandomUpgrades(
      choiceCount,
      this.config.momentNumber,
      this.config.ownedUpgradeIds
    );
    
    this.displayCards();
  }
  
  private displayCards(): void {
    // Clear existing cards
    this.cards.forEach(card => card.destroy());
    this.cards = [];
    
    const cardWidth = 180;
    const cardSpacing = 30;
    const totalWidth = this.currentUpgrades.length * cardWidth + (this.currentUpgrades.length - 1) * cardSpacing;
    const startX = this.scene.cameras.main.centerX - totalWidth / 2 + cardWidth / 2;
    
    this.currentUpgrades.forEach((upgrade, index) => {
      const card = new UpgradeCard(
        this.scene,
        startX + index * (cardWidth + cardSpacing),
        this.scene.cameras.main.centerY,
        upgrade,
        () => this.selectUpgrade(upgrade)
      );
      card.setDepth(202);
      this.cards.push(card);
      this.add(card);
      
      // Stagger animation
      card.setAlpha(0);
      card.setScale(0.5);
      this.scene.tweens.add({
        targets: card,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        delay: index * 100,
        ease: 'Back.easeOut'
      });
    });
  }
  
  private reroll(): void {
    if (this.rerollsRemaining <= 0) return;
    
    this.rerollsRemaining--;
    
    // Animate cards out
    this.cards.forEach((card, i) => {
      this.scene.tweens.add({
        targets: card,
        alpha: 0,
        y: card.y - 50,
        duration: 200,
        delay: i * 50,
        onComplete: () => {
          if (i === this.cards.length - 1) {
            this.generateUpgrades();
          }
        }
      });
    });
    
    // Update button
    if (this.rerollButton) {
      if (this.rerollsRemaining > 0) {
        this.rerollButton.setText(`🔄 Reroll (${this.rerollsRemaining})`);
      } else {
        this.rerollButton.setDisabled(true);
        this.rerollButton.setText('No Rerolls');
      }
    }
  }
  
  private selectUpgrade(upgrade: Upgrade): void {
    // Highlight selected card
    this.cards.forEach(card => {
      if (card.upgrade.id === upgrade.id) {
        this.scene.tweens.add({
          targets: card,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 200,
          ease: 'Back.easeOut'
        });
      } else {
        this.scene.tweens.add({
          targets: card,
          alpha: 0.3,
          duration: 200
        });
      }
    });
    
    // Delay then close
    this.scene.time.delayedCall(500, () => {
      this.hide();
      this.config.onSelect(upgrade);
    });
  }
  
  private show(): void {
    this.overlay.setAlpha(0);
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 0.85,
      duration: 300
    });
  }
  
  private hide(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
      onComplete: () => this.destroy()
    });
  }
}

// Individual upgrade card
class UpgradeCard extends Phaser.GameObjects.Container {
  public upgrade: Upgrade;
  private bg: Phaser.GameObjects.Graphics;
  private glowTween?: Phaser.Tweens.Tween;
  
  constructor(scene: Phaser.Scene, x: number, y: number, upgrade: Upgrade, onClick: () => void) {
    super(scene, x, y);
    
    this.upgrade = upgrade;
    
    const width = 170;
    const height = 260;
    const rarityColor = RARITY_COLORS[upgrade.rarity];
    
    // Glow effect
    const glow = scene.add.graphics();
    glow.fillStyle(rarityColor, 0.3);
    glow.fillRoundedRect(-width / 2 - 8, -height / 2 - 8, width + 16, height + 16, 16);
    this.add(glow);
    
    // Pulsing glow animation
    this.glowTween = scene.tweens.add({
      targets: glow,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Card background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x1e1e2e, 1);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    this.bg.lineStyle(3, rarityColor, 1);
    this.bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    this.add(this.bg);
    
    // Top accent
    const accent = scene.add.graphics();
    accent.fillStyle(rarityColor, 1);
    accent.fillRoundedRect(-width / 2, -height / 2, width, 6, { tl: 12, tr: 12, bl: 0, br: 0 });
    this.add(accent);
    
    // Icon
    const icon = scene.add.text(0, -height / 2 + 50, upgrade.icon, {
      fontSize: '48px'
    });
    icon.setOrigin(0.5);
    this.add(icon);
    
    // Name
    const name = scene.add.text(0, -height / 2 + 100, upgrade.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width - 20 }
    });
    name.setOrigin(0.5);
    this.add(name);
    
    // Rarity label
    const rarityLabel = scene.add.text(0, -height / 2 + 125, upgrade.rarity.toUpperCase(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#' + rarityColor.toString(16).padStart(6, '0'),
      fontStyle: 'bold'
    });
    rarityLabel.setOrigin(0.5);
    this.add(rarityLabel);
    
    // Description
    const desc = scene.add.text(0, -height / 2 + 165, upgrade.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#bdc3c7',
      align: 'center',
      wordWrap: { width: width - 24 }
    });
    desc.setOrigin(0.5, 0);
    this.add(desc);
    
    // Synergy tags
    if (upgrade.synergies.length > 0) {
      const synergyY = height / 2 - 30;
      const synergiesText = upgrade.synergies.slice(0, 2).map(s => SYNERGY_NAMES[s]).join(' • ');
      const synergy = scene.add.text(0, synergyY, synergiesText, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#' + SYNERGY_COLORS[upgrade.synergies[0]].toString(16).padStart(6, '0'),
        align: 'center'
      });
      synergy.setOrigin(0.5);
      this.add(synergy);
    }
    
    // Interactive
    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });
    
    this.on('pointerover', () => {
      scene.tweens.add({
        targets: this,
        y: y - 10,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Power2'
      });
    });
    
    this.on('pointerout', () => {
      scene.tweens.add({
        targets: this,
        y: y,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Power2'
      });
    });
    
    this.on('pointerdown', onClick);
    
    scene.add.existing(this);
  }
  
  destroy(fromScene?: boolean): void {
    if (this.glowTween) {
      this.glowTween.stop();
    }
    super.destroy(fromScene);
  }
}
