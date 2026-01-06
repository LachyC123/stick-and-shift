// BuildScreenOverlay for Stick & Shift
// Shows character info, stats, upgrades, synergies, and procs
// Toggle with TAB key

import Phaser from 'phaser';
import { UpgradeSystem, SynergyStatus, ProcStats, ActiveBuff } from '../systems/UpgradeSystem';
import { Character, CharacterStats } from '../data/characters';
import { Upgrade, RARITY_COLORS, SYNERGY_COLORS, SYNERGY_NAMES, SynergySet } from '../data/upgrades';

interface BuildScreenConfig {
  upgradeSystem: UpgradeSystem;
  character: Character;
  baseStats: CharacterStats;
  cupPlayerPoints: number;
  cupEnemyPoints: number;
  currentMoment: number;
  objectiveText: string;
  activeCurse?: { name: string; boonDescription: string; curseDescription: string } | null;
  onClose: () => void;
}

export class BuildScreenOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private config: BuildScreenConfig;
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private isDragging: boolean = false;
  
  constructor(scene: Phaser.Scene, config: BuildScreenConfig) {
    this.scene = scene;
    this.config = config;
    
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(2000);
    
    this.createOverlay();
    this.setupInput();
  }
  
  private createOverlay(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
    // Dark background
    const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f, 0.95);
    this.container.add(bg);
    
    // Header
    this.createHeader();
    
    // Left panel: Character + Stats
    this.createCharacterPanel();
    
    // Center panel: Upgrades list
    this.createUpgradesPanel();
    
    // Right panel: Synergies + Procs
    this.createSynergyPanel();
    
    // Active Curse (if any)
    if (this.config.activeCurse) {
      this.createCursePanel();
    }
    
    // Close hint
    const closeHint = this.scene.add.text(width - 20, height - 20, 'Press TAB or ESC to close', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#7f8c8d'
    });
    closeHint.setOrigin(1, 1);
    this.container.add(closeHint);
  }
  
  private createHeader(): void {
    const width = this.scene.cameras.main.width;
    
    // Title
    const title = this.scene.add.text(width / 2, 30, '📋 BUILD SCREEN', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      color: '#ffffff'
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);
    
    // Cup score
    const cupScore = this.scene.add.text(width / 2, 60, 
      `🏆 CUP: You ${this.config.cupPlayerPoints} — ${this.config.cupEnemyPoints} Enemy`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#f39c12'
    });
    cupScore.setOrigin(0.5, 0.5);
    this.container.add(cupScore);
    
    // Current moment
    const momentText = this.scene.add.text(width / 2, 85, 
      `Moment ${this.config.currentMoment} • ${this.config.objectiveText}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#95a5a6'
    });
    momentText.setOrigin(0.5, 0.5);
    this.container.add(momentText);
    
    // Divider
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x34495e, 0.5);
    divider.lineBetween(50, 105, width - 50, 105);
    this.container.add(divider);
  }
  
  private createCharacterPanel(): void {
    const x = 30;
    const y = 130;
    const panelWidth = 280;
    
    // Panel background
    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.8);
    panelBg.fillRoundedRect(x, y, panelWidth, 320, 10);
    panelBg.lineStyle(2, 0x3498db, 0.5);
    panelBg.strokeRoundedRect(x, y, panelWidth, 320, 10);
    this.container.add(panelBg);
    
    // Character name
    const charName = this.scene.add.text(x + panelWidth / 2, y + 20, this.config.character.name, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '20px',
      color: '#ffffff'
    });
    charName.setOrigin(0.5, 0.5);
    this.container.add(charName);
    
    // Role
    const role = this.scene.add.text(x + panelWidth / 2, y + 45, this.config.character.role.toUpperCase(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#95a5a6'
    });
    role.setOrigin(0.5, 0.5);
    this.container.add(role);
    
    // Trait
    const traitLabel = this.scene.add.text(x + 15, y + 70, `✨ ${this.config.character.trait.name}:`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#2ecc71'
    });
    this.container.add(traitLabel);
    
    const traitText = this.scene.add.text(x + 15, y + 88, this.config.character.trait.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#bdc3c7',
      wordWrap: { width: panelWidth - 30 }
    });
    this.container.add(traitText);
    
    // Downside
    const downsideLabel = this.scene.add.text(x + 15, y + 120, `⚠️ ${this.config.character.downside.name}:`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#e74c3c'
    });
    this.container.add(downsideLabel);
    
    const downsideText = this.scene.add.text(x + 15, y + 138, this.config.character.downside.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#bdc3c7',
      wordWrap: { width: panelWidth - 30 }
    });
    this.container.add(downsideText);
    
    // Stats section
    const statsLabel = this.scene.add.text(x + panelWidth / 2, y + 175, '📊 STATS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#f39c12'
    });
    statsLabel.setOrigin(0.5, 0.5);
    this.container.add(statsLabel);
    
    // Final stats
    const finalStats = this.config.upgradeSystem.getFinalStats(this.config.baseStats);
    const modifiers = this.config.upgradeSystem.getAllModifiers();
    
    const statNames: (keyof CharacterStats)[] = ['speed', 'stamina', 'control', 'shotPower', 'passPower', 'tackle', 'dodge'];
    const statLabels = ['Speed', 'Stamina', 'Control', 'Shot Power', 'Pass Power', 'Tackle', 'Dodge'];
    
    let statY = y + 195;
    statNames.forEach((stat, i) => {
      const base = this.config.baseStats[stat];
      const final = Math.round(finalStats[stat]);
      const mod = modifiers[stat] || 0;
      const modColor = mod > 0 ? '#2ecc71' : (mod < 0 ? '#e74c3c' : '#95a5a6');
      const modText = mod !== 0 ? ` (${mod > 0 ? '+' : ''}${mod}%)` : '';
      
      const statText = this.scene.add.text(x + 15, statY, 
        `${statLabels[i]}: ${final}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#ecf0f1'
      });
      this.container.add(statText);
      
      if (modText) {
        const modLabel = this.scene.add.text(x + 140, statY, modText, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: modColor
        });
        this.container.add(modLabel);
      }
      
      // Stat bar
      const barBg = this.scene.add.graphics();
      barBg.fillStyle(0x2c3e50, 1);
      barBg.fillRoundedRect(x + 200, statY + 2, 60, 10, 3);
      this.container.add(barBg);
      
      const barFill = this.scene.add.graphics();
      const fillWidth = Math.min(60, (final / 15) * 60);
      barFill.fillStyle(mod > 0 ? 0x2ecc71 : 0x3498db, 1);
      barFill.fillRoundedRect(x + 200, statY + 2, fillWidth, 10, 3);
      this.container.add(barFill);
      
      statY += 18;
    });
  }
  
  private createUpgradesPanel(): void {
    const x = 330;
    const y = 130;
    const panelWidth = 350;
    const panelHeight = 420;
    
    // Panel background
    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.8);
    panelBg.fillRoundedRect(x, y, panelWidth, panelHeight, 10);
    panelBg.lineStyle(2, 0x9b59b6, 0.5);
    panelBg.strokeRoundedRect(x, y, panelWidth, panelHeight, 10);
    this.container.add(panelBg);
    
    // Title
    const upgrades = this.config.upgradeSystem.getOwnedUpgrades();
    const title = this.scene.add.text(x + panelWidth / 2, y + 20, 
      `🎴 UPGRADES (${upgrades.length})`, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '16px',
      color: '#ffffff'
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);
    
    // Upgrade list
    let itemY = y + 50;
    const itemHeight = 50;
    
    if (upgrades.length === 0) {
      const noUpgrades = this.scene.add.text(x + panelWidth / 2, y + 100, 
        'No upgrades yet', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#7f8c8d'
      });
      noUpgrades.setOrigin(0.5, 0.5);
      this.container.add(noUpgrades);
    } else {
      // Show up to 7 upgrades in view
      const visibleCount = Math.min(upgrades.length, 7);
      for (let i = 0; i < visibleCount; i++) {
        const upgrade = upgrades[i];
        this.createUpgradeCard(x + 10, itemY, panelWidth - 20, itemHeight - 5, upgrade);
        itemY += itemHeight;
      }
      
      if (upgrades.length > 7) {
        const more = this.scene.add.text(x + panelWidth / 2, itemY + 10, 
          `+ ${upgrades.length - 7} more...`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#7f8c8d'
        });
        more.setOrigin(0.5, 0.5);
        this.container.add(more);
      }
    }
  }
  
  private createUpgradeCard(x: number, y: number, width: number, height: number, upgrade: Upgrade): void {
    const rarityColor = RARITY_COLORS[upgrade.rarity];
    const procCount = this.config.upgradeSystem.getProcCount(upgrade.id);
    
    // Card background
    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x2c3e50, 0.8);
    cardBg.fillRoundedRect(x, y, width, height, 6);
    cardBg.lineStyle(2, rarityColor, 0.8);
    cardBg.strokeRoundedRect(x, y, width, height, 6);
    this.container.add(cardBg);
    
    // Icon
    const icon = this.scene.add.text(x + 25, y + height / 2, upgrade.icon, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px'
    });
    icon.setOrigin(0.5, 0.5);
    this.container.add(icon);
    
    // Name
    const name = this.scene.add.text(x + 50, y + 10, upgrade.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#ffffff'
    });
    this.container.add(name);
    
    // Description
    const desc = this.scene.add.text(x + 50, y + 28, upgrade.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#95a5a6',
      wordWrap: { width: width - 100 }
    });
    this.container.add(desc);
    
    // Proc count
    if (procCount > 0) {
      const procText = this.scene.add.text(x + width - 15, y + height / 2, `×${procCount}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#f39c12'
      });
      procText.setOrigin(1, 0.5);
      this.container.add(procText);
    }
    
    // Rarity indicator
    const rarityDot = this.scene.add.circle(x + width - 35, y + 10, 5, rarityColor);
    this.container.add(rarityDot);
  }
  
  private createSynergyPanel(): void {
    const x = 700;
    const y = 130;
    const panelWidth = 280;
    
    // Panel background
    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.8);
    panelBg.fillRoundedRect(x, y, panelWidth, 200, 10);
    panelBg.lineStyle(2, 0xf39c12, 0.5);
    panelBg.strokeRoundedRect(x, y, panelWidth, 200, 10);
    this.container.add(panelBg);
    
    // Title
    const title = this.scene.add.text(x + panelWidth / 2, y + 20, '⚡ SYNERGIES', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '16px',
      color: '#ffffff'
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);
    
    // Synergy list
    const synergies = this.config.upgradeSystem.getSynergyStatuses();
    let synergyY = y + 50;
    
    if (synergies.length === 0) {
      const noSynergies = this.scene.add.text(x + panelWidth / 2, y + 80, 
        'No synergies yet', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#7f8c8d'
      });
      noSynergies.setOrigin(0.5, 0.5);
      this.container.add(noSynergies);
    } else {
      const visibleCount = Math.min(synergies.length, 5);
      for (let i = 0; i < visibleCount; i++) {
        const synergy = synergies[i];
        const color = SYNERGY_COLORS[synergy.synergy] || 0xffffff;
        const tierText = synergy.tier > 0 ? ` T${synergy.tier}` : '';
        
        // Pip indicators (3 for T1, 5 for T2)
        const pips = this.scene.add.graphics();
        for (let p = 0; p < 5; p++) {
          const pipColor = p < synergy.count ? color : 0x34495e;
          pips.fillStyle(pipColor, 1);
          pips.fillCircle(x + 15 + p * 14, synergyY + 10, 5);
        }
        this.container.add(pips);
        
        // Name
        const nameText = this.scene.add.text(x + 90, synergyY, 
          `${synergy.name}${tierText}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '13px',
          color: synergy.active ? '#ffffff' : '#7f8c8d'
        });
        this.container.add(nameText);
        
        // Count
        const countText = this.scene.add.text(x + panelWidth - 15, synergyY, 
          `${synergy.count}/5`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#95a5a6'
        });
        countText.setOrigin(1, 0);
        this.container.add(countText);
        
        synergyY += 28;
      }
    }
    
    // Procs panel
    this.createProcsPanel(x, y + 220);
  }
  
  private createProcsPanel(x: number, y: number): void {
    const panelWidth = 280;
    
    // Panel background
    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.8);
    panelBg.fillRoundedRect(x, y, panelWidth, 150, 10);
    panelBg.lineStyle(2, 0xe74c3c, 0.5);
    panelBg.strokeRoundedRect(x, y, panelWidth, 150, 10);
    this.container.add(panelBg);
    
    // Title
    const title = this.scene.add.text(x + panelWidth / 2, y + 20, '🔥 TOP PROCS', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '14px',
      color: '#ffffff'
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);
    
    // Top procs
    const procs = this.config.upgradeSystem.getTopProcs(5);
    let procY = y + 45;
    
    if (procs.length === 0) {
      const noProcs = this.scene.add.text(x + panelWidth / 2, y + 75, 
        'No procs yet', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#7f8c8d'
      });
      noProcs.setOrigin(0.5, 0.5);
      this.container.add(noProcs);
    } else {
      procs.forEach((proc, i) => {
        const rank = this.scene.add.text(x + 15, procY, `${i + 1}.`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#7f8c8d'
        });
        this.container.add(rank);
        
        const icon = this.scene.add.text(x + 35, procY, proc.upgradeIcon, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px'
        });
        this.container.add(icon);
        
        const name = this.scene.add.text(x + 55, procY, proc.upgradeName, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#ecf0f1'
        });
        this.container.add(name);
        
        const count = this.scene.add.text(x + panelWidth - 15, procY, `×${proc.count}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#f39c12'
        });
        count.setOrigin(1, 0);
        this.container.add(count);
        
        procY += 22;
      });
    }
  }
  
  private createCursePanel(): void {
    const width = this.scene.cameras.main.width;
    const x = 30;
    const y = 470;
    const panelWidth = 280;
    
    if (!this.config.activeCurse) return;
    
    // Panel background
    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x2c1810, 0.9);
    panelBg.fillRoundedRect(x, y, panelWidth, 100, 10);
    panelBg.lineStyle(2, 0xff6600, 0.8);
    panelBg.strokeRoundedRect(x, y, panelWidth, 100, 10);
    this.container.add(panelBg);
    
    // Title
    const title = this.scene.add.text(x + panelWidth / 2, y + 20, 
      `⚡ CURSE: ${this.config.activeCurse.name}`, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '14px',
      color: '#ff6600'
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);
    
    // Boon
    const boon = this.scene.add.text(x + 10, y + 40, 
      `✅ ${this.config.activeCurse.boonDescription}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#2ecc71',
      wordWrap: { width: panelWidth - 20 }
    });
    this.container.add(boon);
    
    // Curse
    const curse = this.scene.add.text(x + 10, y + 70, 
      `❌ ${this.config.activeCurse.curseDescription}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#e74c3c',
      wordWrap: { width: panelWidth - 20 }
    });
    this.container.add(curse);
  }
  
  private setupInput(): void {
    // Close on TAB or ESC
    this.scene.input.keyboard?.on('keydown-TAB', () => {
      this.close();
    });
    this.scene.input.keyboard?.on('keydown-ESC', () => {
      this.close();
    });
    
    // Click outside to close
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check if click is on close area (outside panels)
    });
  }
  
  private close(): void {
    this.container.destroy();
    this.config.onClose();
  }
  
  destroy(): void {
    this.container.destroy();
  }
}
