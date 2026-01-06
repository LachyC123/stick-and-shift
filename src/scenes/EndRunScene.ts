// EndRunScene for Stick & Shift
// Shows run results and rewards

import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { AudioSystem } from '../systems/AudioSystem';
import { Character } from '../data/characters';
import { Upgrade, RARITY_COLORS, SYNERGY_NAMES } from '../data/upgrades';
import { SaveSystem } from '../systems/SaveSystem';

interface EndRunData {
  stats: {
    momentsWon: number;
    momentsLost: number;
    goalsScored: number;
    goalsConceded: number;
    reboundGoals: number;
    cleanSheets: number;
    bossesBeaten: number;
  };
  reward: number;
  breakdown: {
    base: number;
    momentWins: number;
    bosses: number;
    cleanSheets: number;
    goals: number;
    bonus: number;
  };
  upgrades: Upgrade[];
  character: Character;
}

export class EndRunScene extends Phaser.Scene {
  private audioSystem!: AudioSystem;
  private runData!: EndRunData;
  
  constructor() {
    super({ key: 'EndRunScene' });
  }
  
  init(data: EndRunData): void {
    this.runData = data;
  }
  
  create(): void {
    this.audioSystem = new AudioSystem(this);
    
    // Background
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    
    // Determine if run was successful
    const isSuccess = this.runData.stats.momentsWon > this.runData.stats.momentsLost;
    
    // Title
    this.createTitle(isSuccess);
    
    // Stats panel
    this.createStatsPanel();
    
    // Rewards panel
    this.createRewardsPanel();
    
    // Upgrades collected
    this.createUpgradesPanel();
    
    // Action buttons
    this.createButtons();
    
    // Fade in
    this.cameras.main.fadeIn(500);
    
    // Play appropriate sound
    if (isSuccess) {
      this.audioSystem.playGoal();
    } else {
      this.audioSystem.playConcede();
    }
  }
  
  private createTitle(isSuccess: boolean): void {
    const centerX = this.cameras.main.centerX;
    
    // Result title
    const titleText = isSuccess ? '🏆 RUN COMPLETE!' : '💔 RUN OVER';
    const titleColor = isSuccess ? '#f1c40f' : '#e74c3c';
    
    const title = this.add.text(centerX, 50, titleText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '42px',
      color: titleColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    title.setOrigin(0.5);
    
    // Character info
    const charInfo = this.add.text(centerX, 95, `Played as ${this.runData.character.name}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#bdc3c7'
    });
    charInfo.setOrigin(0.5);
    
    // Animate title
    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  private createStatsPanel(): void {
    const panelX = 200;
    const panelY = 150;
    const panelWidth = 300;
    const panelHeight = 280;
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x2c3e50, 0.9);
    bg.fillRoundedRect(panelX - panelWidth / 2, panelY, panelWidth, panelHeight, 15);
    bg.lineStyle(2, 0x3498db, 0.5);
    bg.strokeRoundedRect(panelX - panelWidth / 2, panelY, panelWidth, panelHeight, 15);
    
    // Title
    const title = this.add.text(panelX, panelY + 25, '📊 STATS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#3498db',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    
    // Stats list
    const stats = [
      { label: 'Moments Won', value: this.runData.stats.momentsWon, color: '#27ae60' },
      { label: 'Moments Lost', value: this.runData.stats.momentsLost, color: '#e74c3c' },
      { label: 'Goals Scored', value: this.runData.stats.goalsScored, color: '#f1c40f' },
      { label: 'Goals Conceded', value: this.runData.stats.goalsConceded, color: '#e67e22' },
      { label: 'Rebound Goals', value: this.runData.stats.reboundGoals, color: '#9b59b6' },
      { label: 'Clean Sheets', value: this.runData.stats.cleanSheets, color: '#1abc9c' },
      { label: 'Bosses Beaten', value: this.runData.stats.bossesBeaten, color: '#e74c3c' }
    ];
    
    stats.forEach((stat, i) => {
      const y = panelY + 60 + i * 30;
      
      this.add.text(panelX - 120, y, stat.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#bdc3c7'
      });
      
      this.add.text(panelX + 100, y, stat.value.toString(), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: stat.color,
        fontStyle: 'bold'
      }).setOrigin(1, 0);
    });
  }
  
  private createRewardsPanel(): void {
    const panelX = this.cameras.main.width - 200;
    const panelY = 150;
    const panelWidth = 300;
    const panelHeight = 280;
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x2c3e50, 0.9);
    bg.fillRoundedRect(panelX - panelWidth / 2, panelY, panelWidth, panelHeight, 15);
    bg.lineStyle(2, 0xf1c40f, 0.5);
    bg.strokeRoundedRect(panelX - panelWidth / 2, panelY, panelWidth, panelHeight, 15);
    
    // Title
    const title = this.add.text(panelX, panelY + 25, '💎 REWARDS', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#f1c40f',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    
    // Breakdown
    const breakdown = [
      { label: 'Base Reward', value: this.runData.breakdown.base },
      { label: 'Moment Wins', value: this.runData.breakdown.momentWins },
      { label: 'Boss Wins', value: this.runData.breakdown.bosses },
      { label: 'Clean Sheets', value: this.runData.breakdown.cleanSheets },
      { label: 'Goals', value: this.runData.breakdown.goals },
      { label: 'Bonus', value: this.runData.breakdown.bonus }
    ];
    
    breakdown.forEach((item, i) => {
      const y = panelY + 60 + i * 28;
      
      this.add.text(panelX - 120, y, item.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#bdc3c7'
      });
      
      this.add.text(panelX + 100, y, `+${item.value}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: item.value > 0 ? '#f1c40f' : '#7f8c8d'
      }).setOrigin(1, 0);
    });
    
    // Divider
    const dividerY = panelY + 230;
    this.add.graphics().lineStyle(1, 0xf1c40f, 0.5).lineBetween(
      panelX - 120, dividerY,
      panelX + 100, dividerY
    );
    
    // Total
    this.add.text(panelX - 120, dividerY + 10, 'TOTAL', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    
    const totalText = this.add.text(panelX + 100, dividerY + 10, `💎 ${this.runData.reward}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#f1c40f',
      fontStyle: 'bold'
    });
    totalText.setOrigin(1, 0);
    
    // Animate total
    this.tweens.add({
      targets: totalText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
    
    // Show new total gems
    const newTotal = SaveSystem.getInstance().getGems();
    this.add.text(panelX, panelY + panelHeight - 20, `Total Gems: ${newTotal}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#7f8c8d'
    }).setOrigin(0.5);
  }
  
  private createUpgradesPanel(): void {
    const panelX = this.cameras.main.centerX;
    const panelY = 460;
    const panelWidth = 700;
    const panelHeight = 120;
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x2c3e50, 0.9);
    bg.fillRoundedRect(panelX - panelWidth / 2, panelY, panelWidth, panelHeight, 15);
    bg.lineStyle(2, 0x9b59b6, 0.5);
    bg.strokeRoundedRect(panelX - panelWidth / 2, panelY, panelWidth, panelHeight, 15);
    
    // Title
    this.add.text(panelX, panelY + 20, `⚡ UPGRADES COLLECTED (${this.runData.upgrades.length})`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#9b59b6',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Upgrade icons
    const maxDisplay = 12;
    const upgradesToShow = this.runData.upgrades.slice(0, maxDisplay);
    const iconSize = 40;
    const startX = panelX - (Math.min(upgradesToShow.length, 12) * (iconSize + 10)) / 2 + iconSize / 2;
    
    upgradesToShow.forEach((upgrade, i) => {
      const x = startX + i * (iconSize + 10);
      const y = panelY + 70;
      
      // Icon background
      const rarityColor = RARITY_COLORS[upgrade.rarity];
      const iconBg = this.add.circle(x, y, iconSize / 2, 0x1a1a2e);
      iconBg.setStrokeStyle(2, rarityColor);
      
      // Icon
      const icon = this.add.text(x, y, upgrade.icon, {
        fontSize: '20px'
      });
      icon.setOrigin(0.5);
      
      // Tooltip on hover
      iconBg.setInteractive();
      iconBg.on('pointerover', () => {
        this.showUpgradeTooltip(x, panelY - 10, upgrade);
      });
      iconBg.on('pointerout', () => {
        this.hideUpgradeTooltip();
      });
    });
    
    // Show count if more
    if (this.runData.upgrades.length > maxDisplay) {
      this.add.text(panelX + 320, panelY + 70, `+${this.runData.upgrades.length - maxDisplay} more`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#7f8c8d'
      }).setOrigin(0, 0.5);
    }
    
    // Show synergies
    const synergyCounts = new Map<string, number>();
    this.runData.upgrades.forEach(u => {
      u.synergies.forEach(s => {
        synergyCounts.set(s, (synergyCounts.get(s) || 0) + 1);
      });
    });
    
    const activeSynergies = Array.from(synergyCounts.entries())
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    
    if (activeSynergies.length > 0) {
      const synergyText = activeSynergies.map(([name, count]) => 
        `${SYNERGY_NAMES[name as keyof typeof SYNERGY_NAMES]} (${count})`
      ).join('  •  ');
      
      this.add.text(panelX, panelY + 100, `Active Synergies: ${synergyText}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#27ae60'
      }).setOrigin(0.5);
    }
  }
  
  private tooltipContainer?: Phaser.GameObjects.Container;
  
  private showUpgradeTooltip(x: number, y: number, upgrade: Upgrade): void {
    this.hideUpgradeTooltip();
    
    this.tooltipContainer = this.add.container(x, y);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-80, -50, 160, 50, 8);
    bg.lineStyle(1, RARITY_COLORS[upgrade.rarity], 0.8);
    bg.strokeRoundedRect(-80, -50, 160, 50, 8);
    this.tooltipContainer.add(bg);
    
    const name = this.add.text(0, -40, upgrade.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    name.setOrigin(0.5);
    this.tooltipContainer.add(name);
    
    const desc = this.add.text(0, -22, upgrade.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#bdc3c7',
      align: 'center',
      wordWrap: { width: 150 }
    });
    desc.setOrigin(0.5);
    this.tooltipContainer.add(desc);
    
    this.tooltipContainer.setDepth(100);
  }
  
  private hideUpgradeTooltip(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = undefined;
    }
  }
  
  private createButtons(): void {
    const centerX = this.cameras.main.centerX;
    const y = this.cameras.main.height - 60;
    
    // Play again button
    new Button(this, {
      x: centerX - 120,
      y: y,
      width: 180,
      height: 50,
      text: '🔄 Play Again',
      fontSize: 18,
      style: 'success',
      onClick: () => {
        this.audioSystem.playClick();
        this.cameras.main.fadeOut(300);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('CharacterSelectScene');
        });
      }
    });
    
    // Main menu button
    new Button(this, {
      x: centerX + 120,
      y: y,
      width: 180,
      height: 50,
      text: '🏠 Main Menu',
      fontSize: 18,
      style: 'secondary',
      onClick: () => {
        this.audioSystem.playClick();
        this.cameras.main.fadeOut(300);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('MenuScene');
        });
      }
    });
  }
}
