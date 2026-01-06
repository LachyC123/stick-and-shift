// StoreScene for Stick & Shift
// Buy characters and meta upgrades with gems

import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { CHARACTERS, Character } from '../data/characters';
import { META_UPGRADES, getMetaUpgradeCost, getMetaUpgradeEffect } from '../data/meta';
import { ToastManager } from '../ui/Toast';

export class StoreScene extends Phaser.Scene {
  private audioSystem!: AudioSystem;
  private toastManager!: ToastManager;
  private gemText?: Phaser.GameObjects.Text;
  private currentTab: 'characters' | 'meta' = 'characters';
  private contentContainer?: Phaser.GameObjects.Container;
  
  constructor() {
    super({ key: 'StoreScene' });
  }
  
  create(): void {
    this.audioSystem = new AudioSystem(this);
    this.toastManager = new ToastManager(this);
    
    // Background
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    
    // Header
    this.createHeader();
    
    // Tabs
    this.createTabs();
    
    // Content container
    this.contentContainer = this.add.container(0, 0);
    
    // Show initial tab
    this.showCharactersTab();
    
    // Fade in
    this.cameras.main.fadeIn(300);
  }
  
  private createHeader(): void {
    // Back button
    new Button(this, {
      x: 80,
      y: 40,
      width: 100,
      height: 40,
      text: '← Back',
      fontSize: 16,
      style: 'secondary',
      onClick: () => {
        this.audioSystem.playClick();
        this.cameras.main.fadeOut(300);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('MenuScene');
        });
      }
    });
    
    // Title
    const title = this.add.text(this.cameras.main.centerX, 40, '🛒 STORE', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '36px',
      color: '#f1c40f',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    
    // Gem display
    this.createGemDisplay();
  }
  
  private createGemDisplay(): void {
    const gems = SaveSystem.getInstance().getGems();
    
    const container = this.add.container(this.cameras.main.width - 100, 40);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x2c3e50, 0.9);
    bg.fillRoundedRect(-60, -20, 120, 40, 10);
    bg.lineStyle(2, 0xf1c40f, 0.5);
    bg.strokeRoundedRect(-60, -20, 120, 40, 10);
    container.add(bg);
    
    const icon = this.add.text(-40, 0, '💎', { fontSize: '20px' });
    icon.setOrigin(0.5);
    container.add(icon);
    
    this.gemText = this.add.text(10, 0, gems.toString(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#f1c40f',
      fontStyle: 'bold'
    });
    this.gemText.setOrigin(0.5);
    container.add(this.gemText);
  }
  
  private updateGemDisplay(): void {
    if (this.gemText) {
      this.gemText.setText(SaveSystem.getInstance().getGems().toString());
    }
  }
  
  private createTabs(): void {
    const tabY = 100;
    
    // Characters tab
    new Button(this, {
      x: this.cameras.main.centerX - 100,
      y: tabY,
      width: 150,
      height: 40,
      text: 'Characters',
      fontSize: 16,
      style: this.currentTab === 'characters' ? 'primary' : 'secondary',
      onClick: () => {
        this.currentTab = 'characters';
        this.showCharactersTab();
      }
    });
    
    // Meta upgrades tab
    new Button(this, {
      x: this.cameras.main.centerX + 100,
      y: tabY,
      width: 150,
      height: 40,
      text: 'Meta Upgrades',
      fontSize: 16,
      style: this.currentTab === 'meta' ? 'primary' : 'secondary',
      onClick: () => {
        this.currentTab = 'meta';
        this.showMetaTab();
      }
    });
  }
  
  private showCharactersTab(): void {
    this.clearContent();
    
    const unlockedCharacters = SaveSystem.getInstance().getUnlockedCharacters();
    const buyableCharacters = CHARACTERS.filter(c => 
      c.unlockCost > 0 && !unlockedCharacters.includes(c.id)
    );
    
    // Title
    const title = this.add.text(this.cameras.main.centerX, 160, 'Unlock New Characters', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#bdc3c7'
    });
    title.setOrigin(0.5);
    this.contentContainer?.add(title);
    
    // Character cards
    const cardsPerRow = 4;
    const cardWidth = 180;
    const cardHeight = 240;
    const startX = this.cameras.main.centerX - ((Math.min(buyableCharacters.length, cardsPerRow) - 1) * (cardWidth + 20)) / 2;
    const startY = 200;
    
    buyableCharacters.forEach((character, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const x = startX + col * (cardWidth + 20);
      const y = startY + row * (cardHeight + 20);
      
      this.createCharacterCard(character, x, y, cardWidth, cardHeight);
    });
    
    // Show unlocked count
    const unlockedText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.height - 50,
      `Unlocked: ${unlockedCharacters.length} / ${CHARACTERS.length}`,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#7f8c8d'
      }
    );
    unlockedText.setOrigin(0.5);
    this.contentContainer?.add(unlockedText);
  }
  
  private createCharacterCard(character: Character, x: number, y: number, width: number, height: number): void {
    const gems = SaveSystem.getInstance().getGems();
    const canAfford = gems >= character.unlockCost;
    
    const card = this.add.container(x, y);
    this.contentContainer?.add(card);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x2c3e50, 1);
    bg.fillRoundedRect(-width / 2, -20, width, height, 12);
    bg.lineStyle(2, canAfford ? 0x27ae60 : 0x7f8c8d, 0.8);
    bg.strokeRoundedRect(-width / 2, -20, width, height, 12);
    card.add(bg);
    
    // Color accent
    const accent = this.add.graphics();
    accent.fillStyle(character.color, 1);
    accent.fillRoundedRect(-width / 2, -20, width, 8, { tl: 12, tr: 12, bl: 0, br: 0 });
    card.add(accent);
    
    // Character icon/preview
    const preview = this.add.circle(0, 40, 30, character.color);
    card.add(preview);
    
    // Name
    const name = this.add.text(0, 90, character.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    name.setOrigin(0.5);
    card.add(name);
    
    // Role
    const role = this.add.text(0, 110, character.role.toUpperCase(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#bdc3c7'
    });
    role.setOrigin(0.5);
    card.add(role);
    
    // Trait
    const trait = this.add.text(0, 135, `✨ ${character.trait.name}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#27ae60'
    });
    trait.setOrigin(0.5);
    card.add(trait);
    
    // Downside
    const downside = this.add.text(0, 155, `⚠️ ${character.downside.name}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#e74c3c'
    });
    downside.setOrigin(0.5);
    card.add(downside);
    
    // Cost
    const cost = this.add.text(0, 185, `💎 ${character.unlockCost}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: canAfford ? '#f1c40f' : '#7f8c8d',
      fontStyle: 'bold'
    });
    cost.setOrigin(0.5);
    card.add(cost);
    
    // Buy button
    if (canAfford) {
      const buyZone = this.add.zone(0, 100, width, height).setInteractive({ useHandCursor: true });
      card.add(buyZone);
      
      buyZone.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x34495e, 1);
        bg.fillRoundedRect(-width / 2, -20, width, height, 12);
        bg.lineStyle(3, 0x27ae60, 1);
        bg.strokeRoundedRect(-width / 2, -20, width, height, 12);
      });
      
      buyZone.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0x2c3e50, 1);
        bg.fillRoundedRect(-width / 2, -20, width, height, 12);
        bg.lineStyle(2, 0x27ae60, 0.8);
        bg.strokeRoundedRect(-width / 2, -20, width, height, 12);
      });
      
      buyZone.on('pointerdown', () => {
        this.buyCharacter(character, card);
      });
    }
  }
  
  private buyCharacter(character: Character, card: Phaser.GameObjects.Container): void {
    const saveSystem = SaveSystem.getInstance();
    
    if (saveSystem.spendGems(character.unlockCost)) {
      saveSystem.unlockCharacter(character.id);
      
      this.audioSystem.playUpgrade();
      this.toastManager.success(`Unlocked ${character.name}!`, '🎉');
      
      // Animate card
      this.tweens.add({
        targets: card,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        yoyo: true,
        onComplete: () => {
          this.tweens.add({
            targets: card,
            alpha: 0,
            y: card.y - 30,
            duration: 300,
            onComplete: () => {
              card.destroy();
              this.updateGemDisplay();
            }
          });
        }
      });
    } else {
      this.audioSystem.playError();
      this.toastManager.error('Not enough gems!');
    }
  }
  
  private showMetaTab(): void {
    this.clearContent();
    
    // Title
    const title = this.add.text(this.cameras.main.centerX, 160, 'Permanent Upgrades', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#bdc3c7'
    });
    title.setOrigin(0.5);
    this.contentContainer?.add(title);
    
    // Meta upgrade list
    const startY = 200;
    const spacing = 70;
    
    META_UPGRADES.slice(0, 6).forEach((upgrade, index) => {
      const y = startY + index * spacing;
      this.createMetaUpgradeRow(upgrade, y);
    });
  }
  
  private createMetaUpgradeRow(upgrade: any, y: number): void {
    const saveSystem = SaveSystem.getInstance();
    const currentLevel = saveSystem.getMetaUpgradeLevel(upgrade.id);
    const isMaxed = currentLevel >= upgrade.maxLevel;
    const cost = isMaxed ? Infinity : getMetaUpgradeCost(upgrade, currentLevel);
    const gems = saveSystem.getGems();
    const canAfford = gems >= cost;
    
    const row = this.add.container(this.cameras.main.centerX, y);
    this.contentContainer?.add(row);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x2c3e50, 0.8);
    bg.fillRoundedRect(-350, -25, 700, 60, 10);
    row.add(bg);
    
    // Icon
    const icon = this.add.text(-320, 0, upgrade.icon, { fontSize: '28px' });
    icon.setOrigin(0.5);
    row.add(icon);
    
    // Name
    const name = this.add.text(-260, -10, upgrade.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    row.add(name);
    
    // Description
    const desc = this.add.text(-260, 10, upgrade.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#7f8c8d'
    });
    row.add(desc);
    
    // Level indicator
    let levelText = '';
    for (let i = 0; i < upgrade.maxLevel; i++) {
      levelText += i < currentLevel ? '●' : '○';
    }
    const level = this.add.text(150, 0, levelText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#f1c40f'
    });
    level.setOrigin(0.5);
    row.add(level);
    
    // Effect preview
    if (!isMaxed) {
      const nextEffect = getMetaUpgradeEffect(upgrade, currentLevel + 1);
      const effectText = this.add.text(230, 0, `+${nextEffect}%`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#27ae60'
      });
      effectText.setOrigin(0.5);
      row.add(effectText);
    }
    
    // Buy button
    if (isMaxed) {
      const maxedText = this.add.text(300, 0, 'MAXED', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#7f8c8d'
      });
      maxedText.setOrigin(0.5);
      row.add(maxedText);
    } else {
      const buyBtn = new Button(this, {
        x: this.cameras.main.centerX + 300,
        y: y,
        width: 80,
        height: 35,
        text: `💎 ${cost}`,
        fontSize: 14,
        style: canAfford ? 'success' : 'secondary',
        disabled: !canAfford,
        onClick: () => {
          if (saveSystem.spendGems(cost)) {
            saveSystem.setMetaUpgradeLevel(upgrade.id, currentLevel + 1);
            this.audioSystem.playUpgrade();
            this.toastManager.success(`${upgrade.name} upgraded!`);
            this.updateGemDisplay();
            this.showMetaTab();  // Refresh
          }
        }
      });
    }
  }
  
  private clearContent(): void {
    this.contentContainer?.removeAll(true);
  }
}
