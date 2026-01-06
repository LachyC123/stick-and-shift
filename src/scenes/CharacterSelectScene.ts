// CharacterSelectScene for Stick & Shift
// Select character before starting a run

import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { CHARACTERS, Character, getCharacterById } from '../data/characters';

export class CharacterSelectScene extends Phaser.Scene {
  private audioSystem!: AudioSystem;
  private selectedCharacter?: Character;
  private characterCards: Map<string, Phaser.GameObjects.Container> = new Map();
  private detailsPanel?: Phaser.GameObjects.Container;
  private playButton?: Button;
  
  constructor() {
    super({ key: 'CharacterSelectScene' });
  }
  
  create(): void {
    this.audioSystem = new AudioSystem(this);
    
    // Background
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    
    // Header
    this.createHeader();
    
    // Character grid
    this.createCharacterGrid();
    
    // Details panel
    this.createDetailsPanel();
    
    // Select last played or first unlocked
    const lastPlayed = SaveSystem.getInstance().getLastPlayedCharacter();
    const unlockedCharacters = SaveSystem.getInstance().getUnlockedCharacters();
    
    if (lastPlayed && unlockedCharacters.includes(lastPlayed)) {
      this.selectCharacter(getCharacterById(lastPlayed)!);
    } else if (unlockedCharacters.length > 0) {
      this.selectCharacter(getCharacterById(unlockedCharacters[0])!);
    }
    
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
    const title = this.add.text(this.cameras.main.centerX, 40, 'SELECT YOUR PLAYER', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      color: '#f1c40f',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
  }
  
  private createCharacterGrid(): void {
    const unlockedCharacters = SaveSystem.getInstance().getUnlockedCharacters();
    const allCharacters = CHARACTERS;
    
    const cardsPerRow = 5;
    const cardWidth = 100;
    const cardHeight = 130;
    const startX = 80;
    const startY = 100;
    const gapX = 20;
    const gapY = 20;
    
    allCharacters.forEach((character, index) => {
      const isUnlocked = unlockedCharacters.includes(character.id);
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);
      
      const card = this.createCharacterCard(character, x, y, cardWidth, cardHeight, isUnlocked);
      this.characterCards.set(character.id, card);
    });
  }
  
  private createCharacterCard(
    character: Character,
    x: number,
    y: number,
    width: number,
    height: number,
    isUnlocked: boolean
  ): Phaser.GameObjects.Container {
    const card = this.add.container(x, y);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(isUnlocked ? 0x2c3e50 : 0x1a1a1a, 1);
    bg.fillRoundedRect(0, 0, width, height, 10);
    bg.lineStyle(2, isUnlocked ? character.color : 0x444444, 0.8);
    bg.strokeRoundedRect(0, 0, width, height, 10);
    card.add(bg);
    
    // Color accent
    if (isUnlocked) {
      const accent = this.add.graphics();
      accent.fillStyle(character.color, 1);
      accent.fillRoundedRect(0, 0, width, 5, { tl: 10, tr: 10, bl: 0, br: 0 });
      card.add(accent);
    }
    
    // Character preview
    if (isUnlocked) {
      const preview = this.add.circle(width / 2, 45, 25, character.color);
      card.add(preview);
      
      // Role icon
      const roleIcons: Record<string, string> = {
        forward: '⚡',
        midfielder: '🔄',
        defender: '🛡️',
        goalkeeper: '🧤'
      };
      const roleIcon = this.add.text(width / 2, 45, roleIcons[character.role] || '●', {
        fontSize: '18px'
      });
      roleIcon.setOrigin(0.5);
      card.add(roleIcon);
    } else {
      // Locked icon
      const locked = this.add.text(width / 2, 45, '🔒', {
        fontSize: '24px'
      });
      locked.setOrigin(0.5);
      card.add(locked);
    }
    
    // Name
    const name = this.add.text(width / 2, 85, character.name.split(' ')[0], {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: isUnlocked ? '#ffffff' : '#666666',
      fontStyle: 'bold'
    });
    name.setOrigin(0.5);
    card.add(name);
    
    // Role
    const role = this.add.text(width / 2, 102, character.role.toUpperCase(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      color: isUnlocked ? '#bdc3c7' : '#444444'
    });
    role.setOrigin(0.5);
    card.add(role);
    
    // Unlock cost if locked
    if (!isUnlocked) {
      const cost = this.add.text(width / 2, 118, `💎 ${character.unlockCost}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#7f8c8d'
      });
      cost.setOrigin(0.5);
      card.add(cost);
    }
    
    // Interactive
    if (isUnlocked) {
      const hitZone = this.add.zone(width / 2, height / 2, width, height).setInteractive({ useHandCursor: true });
      card.add(hitZone);
      
      hitZone.on('pointerover', () => {
        if (this.selectedCharacter?.id !== character.id) {
          this.tweens.add({
            targets: card,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 100
          });
        }
      });
      
      hitZone.on('pointerout', () => {
        if (this.selectedCharacter?.id !== character.id) {
          this.tweens.add({
            targets: card,
            scaleX: 1,
            scaleY: 1,
            duration: 100
          });
        }
      });
      
      hitZone.on('pointerdown', () => {
        this.audioSystem.playClick();
        this.selectCharacter(character);
      });
    }
    
    return card;
  }
  
  private selectCharacter(character: Character): void {
    // Deselect previous
    if (this.selectedCharacter) {
      const prevCard = this.characterCards.get(this.selectedCharacter.id);
      if (prevCard) {
        this.tweens.add({
          targets: prevCard,
          scaleX: 1,
          scaleY: 1,
          duration: 100
        });
      }
    }
    
    this.selectedCharacter = character;
    
    // Highlight selected
    const card = this.characterCards.get(character.id);
    if (card) {
      this.tweens.add({
        targets: card,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100
      });
    }
    
    // Update details panel
    this.updateDetailsPanel(character);
    
    // Enable play button
    if (this.playButton) {
      this.playButton.setDisabled(false);
    }
  }
  
  private createDetailsPanel(): void {
    const panelX = 650;
    const panelY = 100;
    const panelWidth = 350;
    const panelHeight = 450;
    
    this.detailsPanel = this.add.container(panelX, panelY);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(0, 0, panelWidth, panelHeight, 15);
    bg.lineStyle(2, 0x3498db, 0.5);
    bg.strokeRoundedRect(0, 0, panelWidth, panelHeight, 15);
    this.detailsPanel.add(bg);
    
    // Placeholder text
    const placeholder = this.add.text(panelWidth / 2, panelHeight / 2, 'Select a character', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#7f8c8d'
    });
    placeholder.setOrigin(0.5);
    placeholder.setName('placeholder');
    this.detailsPanel.add(placeholder);
    
    // Play button
    this.playButton = new Button(this, {
      x: panelX + panelWidth / 2,
      y: panelY + panelHeight + 40,
      width: 200,
      height: 50,
      text: '▶ START RUN',
      fontSize: 20,
      style: 'success',
      disabled: true,
      onClick: () => {
        if (this.selectedCharacter) {
          this.startRun();
        }
      }
    });
  }
  
  private updateDetailsPanel(character: Character): void {
    if (!this.detailsPanel) return;
    
    // Clear existing content (except background)
    const toRemove = this.detailsPanel.getAll().filter((obj: any) => 
      obj.name !== 'bg' && obj.type !== 'Graphics'
    );
    toRemove.forEach((obj: any) => obj.destroy());
    
    const panelWidth = 350;
    
    // Character name
    const name = this.add.text(panelWidth / 2, 30, character.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    name.setOrigin(0.5);
    this.detailsPanel.add(name);
    
    // Role
    const role = this.add.text(panelWidth / 2, 55, character.role.toUpperCase(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#' + character.color.toString(16).padStart(6, '0')
    });
    role.setOrigin(0.5);
    this.detailsPanel.add(role);
    
    // Description
    const desc = this.add.text(panelWidth / 2, 85, character.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#bdc3c7',
      align: 'center',
      wordWrap: { width: panelWidth - 40 }
    });
    desc.setOrigin(0.5);
    this.detailsPanel.add(desc);
    
    // Stats
    const statsY = 130;
    const stats = [
      { name: 'Speed', value: character.stats.speed },
      { name: 'Stamina', value: character.stats.stamina },
      { name: 'Control', value: character.stats.control },
      { name: 'Shot Power', value: character.stats.shotPower },
      { name: 'Pass Power', value: character.stats.passPower },
      { name: 'Tackle', value: character.stats.tackle },
      { name: 'Dodge', value: character.stats.dodge }
    ];
    
    stats.forEach((stat, i) => {
      const y = statsY + i * 28;
      
      // Stat name
      const statName = this.add.text(20, y, stat.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#bdc3c7'
      });
      this.detailsPanel!.add(statName);
      
      // Stat bar background
      const barBg = this.add.graphics();
      barBg.fillStyle(0x2c3e50, 1);
      barBg.fillRoundedRect(120, y - 2, 150, 16, 4);
      this.detailsPanel!.add(barBg);
      
      // Stat bar fill
      const barFill = this.add.graphics();
      const fillWidth = (stat.value / 10) * 146;
      const fillColor = stat.value >= 8 ? 0x27ae60 : stat.value >= 5 ? 0xf39c12 : 0xe74c3c;
      barFill.fillStyle(fillColor, 1);
      barFill.fillRoundedRect(122, y, fillWidth, 12, 3);
      this.detailsPanel!.add(barFill);
      
      // Stat value
      const statValue = this.add.text(285, y, stat.value.toString(), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#ffffff'
      });
      statValue.setOrigin(0, 0);
      this.detailsPanel!.add(statValue);
    });
    
    // Trait
    const traitY = statsY + stats.length * 28 + 20;
    const traitTitle = this.add.text(20, traitY, '✨ TRAIT', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#27ae60',
      fontStyle: 'bold'
    });
    this.detailsPanel.add(traitTitle);
    
    const traitName = this.add.text(20, traitY + 18, character.trait.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.detailsPanel.add(traitName);
    
    const traitDesc = this.add.text(20, traitY + 36, character.trait.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#95a5a6',
      wordWrap: { width: panelWidth - 40 }
    });
    this.detailsPanel.add(traitDesc);
    
    // Downside
    const downsideY = traitY + 70;
    const downsideTitle = this.add.text(20, downsideY, '⚠️ DOWNSIDE', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#e74c3c',
      fontStyle: 'bold'
    });
    this.detailsPanel.add(downsideTitle);
    
    const downsideName = this.add.text(20, downsideY + 18, character.downside.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.detailsPanel.add(downsideName);
    
    const downsideDesc = this.add.text(20, downsideY + 36, character.downside.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#95a5a6',
      wordWrap: { width: panelWidth - 40 }
    });
    this.detailsPanel.add(downsideDesc);
  }
  
  private startRun(): void {
    if (!this.selectedCharacter) return;
    
    // Save last played
    SaveSystem.getInstance().setLastPlayedCharacter(this.selectedCharacter.id);
    SaveSystem.getInstance().addUniqueToStat('uniqueCharactersPlayed', this.selectedCharacter.id);
    
    this.audioSystem.playMomentStart();
    
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('RunScene', { character: this.selectedCharacter });
    });
  }
}
