// BootScene for Stick & Shift
// Handles loading and texture generation

import Phaser from 'phaser';
import { TextureFactory } from '../gfx/TextureFactory';

export class BootScene extends Phaser.Scene {
  private loadingBar?: Phaser.GameObjects.Graphics;
  private loadingText?: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: 'BootScene' });
  }
  
  preload(): void {
    // Create loading UI
    this.createLoadingUI();
    
    // Track loading progress
    this.load.on('progress', (value: number) => {
      this.updateLoadingBar(value * 0.3);  // First 30% for assets
    });
    
    // No external assets to load - we generate everything at runtime
    // But we simulate a brief load for UX
  }
  
  create(): void {
    // Generate all runtime textures
    this.updateLoadingText('Generating textures...');
    this.updateLoadingBar(0.4);
    
    const textureFactory = new TextureFactory(this);
    textureFactory.generateAll();
    
    this.updateLoadingBar(0.7);
    this.updateLoadingText('Initializing systems...');
    
    // Small delay for visual feedback
    this.time.delayedCall(300, () => {
      this.updateLoadingBar(0.9);
      this.updateLoadingText('Ready!');
      
      this.time.delayedCall(200, () => {
        this.updateLoadingBar(1.0);
        
        // Fade out and start menu
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          // Hide HTML loading element
          const loadingElement = document.getElementById('loading');
          if (loadingElement) {
            loadingElement.style.display = 'none';
          }
          
          this.scene.start('MenuScene');
        });
      });
    });
  }
  
  private createLoadingUI(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    
    // Background
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    
    // Title
    const title = this.add.text(centerX, centerY - 100, '🏑 STICK & SHIFT', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      color: '#f1c40f',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    
    // Subtitle
    const subtitle = this.add.text(centerX, centerY - 50, 'Field Hockey Roguelike', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#bdc3c7'
    });
    subtitle.setOrigin(0.5);
    
    // Loading bar background
    const barWidth = 300;
    const barHeight = 20;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 50;
    
    const barBg = this.add.graphics();
    barBg.fillStyle(0x2c3e50, 1);
    barBg.fillRoundedRect(barX, barY, barWidth, barHeight, 10);
    barBg.lineStyle(2, 0x3498db, 0.5);
    barBg.strokeRoundedRect(barX, barY, barWidth, barHeight, 10);
    
    // Loading bar fill
    this.loadingBar = this.add.graphics();
    
    // Loading text
    this.loadingText = this.add.text(centerX, centerY + 90, 'Loading...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#95a5a6'
    });
    this.loadingText.setOrigin(0.5);
    
    // Update HTML loading bar
    this.updateHtmlLoadingBar(0);
  }
  
  private updateLoadingBar(progress: number): void {
    if (!this.loadingBar) return;
    
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    const barWidth = 300;
    const barHeight = 20;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 50;
    
    this.loadingBar.clear();
    this.loadingBar.fillStyle(0x27ae60, 1);
    this.loadingBar.fillRoundedRect(
      barX + 2,
      barY + 2,
      (barWidth - 4) * progress,
      barHeight - 4,
      8
    );
    
    // Update HTML loading bar too
    this.updateHtmlLoadingBar(progress);
  }
  
  private updateLoadingText(text: string): void {
    if (this.loadingText) {
      this.loadingText.setText(text);
    }
  }
  
  private updateHtmlLoadingBar(progress: number): void {
    const fillElement = document.getElementById('loading-fill');
    if (fillElement) {
      fillElement.style.width = `${progress * 100}%`;
    }
  }
}
