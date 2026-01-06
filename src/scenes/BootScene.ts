// BootScene for Stick & Shift
// MINIMAL, FAIL-SAFE loading scene - NEVER hangs, always shows errors

import Phaser from 'phaser';
import { TextureFactory } from '../gfx/TextureFactory';

export class BootScene extends Phaser.Scene {
  // UI elements
  private loadingBar!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  
  // Tracking
  private lastFile: string = 'none';
  private lastProgress: number = 0;
  private lastProgressTime: number = 0;
  private errors: string[] = [];
  private hasStartedMenu: boolean = false;
  private watchdogInterval?: number;
  
  constructor() {
    super({ key: 'BootScene' });
  }
  
  init(): void {
    console.log('[BootScene] init');
    this.lastProgressTime = Date.now();
    this.hasStartedMenu = false;
    this.errors = [];
    
    // Clear HTML loading watchdog - Phaser has taken over
    if (typeof (window as any).__clearLoadingWatchdog === 'function') {
      (window as any).__clearLoadingWatchdog();
      console.log('[BootScene] Cleared HTML loading watchdog');
    }
    
    // Setup global error handlers FIRST
    this.setupErrorHandlers();
  }
  
  preload(): void {
    console.log('[BootScene] preload start');
    
    // Create UI immediately
    this.createUI();
    this.updateStatus('Starting loader...');
    
    // Setup loader events
    this.load.on('progress', (value: number) => {
      console.log('[Loader] progress:', value);
      this.lastProgress = value;
      this.lastProgressTime = Date.now();
      this.updateBar(value * 0.5); // First 50% for loading
    });
    
    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      console.log('[Loader] fileprogress:', file.key);
      this.lastFile = file.key;
      this.lastProgressTime = Date.now();
      this.updateStatus(`Loading: ${file.key}`);
    });
    
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      const msg = `Load error: ${file.key} (${file.url || 'unknown'})`;
      console.error('[Loader]', msg);
      this.addError(msg);
    });
    
    this.load.on('complete', () => {
      console.log('[Loader] complete');
      this.updateStatus('Loader complete');
      this.updateBar(0.5);
    });
    
    // NOTE: We don't load any external files - all textures are generated at runtime
    // Check if there are files to load
    const totalFiles = this.load.totalToLoad;
    console.log('[BootScene] Total files to load:', totalFiles);
    
    if (totalFiles === 0) {
      // No files to load - immediately mark as ready
      console.log('[BootScene] No files to load, skipping loader');
      this.updateBar(0.5);
      this.updateStatus('No assets to load');
    }
  }
  
  create(): void {
    console.log('[BootScene] create start');
    
    // Start watchdog timer
    this.startWatchdog();
    
    // Generate textures
    this.updateStatus('Generating textures...');
    this.updateBar(0.6);
    
    try {
      const factory = new TextureFactory(this);
      factory.generateAll();
      console.log('[BootScene] Textures generated');
      this.updateStatus('Textures ready');
      this.updateBar(0.9);
    } catch (e) {
      const msg = `Texture error: ${e instanceof Error ? e.message : String(e)}`;
      console.error('[BootScene]', msg);
      this.addError(msg);
      // Create fallback textures
      this.createFallbackTextures();
    }
    
    // Complete and transition
    this.updateBar(1.0);
    this.updateStatus('Ready!');
    
    // Use native setTimeout for reliability
    setTimeout(() => {
      this.startMenuScene();
    }, 300);
  }
  
  private createUI(): void {
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2;
    
    // Background
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    
    // Title
    this.add.text(cx, cy - 120, '🏑 STICK & SHIFT', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      color: '#f1c40f',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Subtitle
    this.add.text(cx, cy - 70, 'Field Hockey Roguelike', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#bdc3c7'
    }).setOrigin(0.5);
    
    // Loading bar background
    const barWidth = 300;
    const barHeight = 24;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x2c3e50, 1);
    barBg.fillRoundedRect(cx - barWidth/2, cy, barWidth, barHeight, 12);
    barBg.lineStyle(2, 0x3498db, 0.8);
    barBg.strokeRoundedRect(cx - barWidth/2, cy, barWidth, barHeight, 12);
    
    // Loading bar fill
    this.loadingBar = this.add.graphics();
    
    // Loading text
    this.loadingText = this.add.text(cx, cy + 50, 'Loading...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ecf0f1'
    }).setOrigin(0.5);
    
    // Status text (smaller, for debug info)
    this.statusText = this.add.text(cx, cy + 80, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#7f8c8d'
    }).setOrigin(0.5);
    
    // Error text (big, red, visible)
    this.errorText = this.add.text(cx, cy + 130, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#e74c3c',
      align: 'center',
      wordWrap: { width: width - 40 }
    }).setOrigin(0.5, 0);
  }
  
  private updateBar(progress: number): void {
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2;
    const barWidth = 300;
    const barHeight = 24;
    const fillWidth = (barWidth - 8) * Math.min(progress, 1);
    
    this.loadingBar.clear();
    if (fillWidth > 0) {
      this.loadingBar.fillStyle(0x27ae60, 1);
      this.loadingBar.fillRoundedRect(
        cx - barWidth/2 + 4,
        cy + 4,
        fillWidth,
        barHeight - 8,
        8
      );
    }
    
    // Update percentage text
    this.loadingText.setText(`Loading... ${Math.round(progress * 100)}%`);
    
    // Update HTML loading bar if it exists
    const htmlFill = document.getElementById('loading-fill');
    if (htmlFill) {
      htmlFill.style.width = `${progress * 100}%`;
    }
  }
  
  private updateStatus(text: string): void {
    console.log('[Status]', text);
    if (this.statusText) {
      this.statusText.setText(text);
    }
    this.lastProgressTime = Date.now();
  }
  
  private addError(msg: string): void {
    this.errors.push(msg);
    this.showErrors();
  }
  
  private showErrors(): void {
    if (this.errorText && this.errors.length > 0) {
      this.errorText.setText('⚠️ ERRORS:\n' + this.errors.slice(-5).join('\n'));
    }
  }
  
  private setupErrorHandlers(): void {
    // Catch JS errors
    window.addEventListener('error', (e) => {
      const msg = `JS Error: ${e.message} at ${e.filename}:${e.lineno}`;
      console.error('[Global Error]', msg);
      this.addError(msg);
    });
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      const msg = `Promise rejected: ${e.reason}`;
      console.error('[Unhandled Rejection]', msg);
      this.addError(msg);
    });
  }
  
  private startWatchdog(): void {
    const STALL_THRESHOLD = 4000; // 4 seconds without progress = stalled
    
    this.watchdogInterval = window.setInterval(() => {
      const elapsed = Date.now() - this.lastProgressTime;
      
      if (elapsed > STALL_THRESHOLD && !this.hasStartedMenu) {
        console.warn('[Watchdog] Loading stalled!', {
          lastFile: this.lastFile,
          lastProgress: this.lastProgress,
          elapsed
        });
        
        this.addError(`Loading stalled after ${(elapsed/1000).toFixed(1)}s (last: ${this.lastFile})`);
        
        // Force transition to menu after showing error briefly
        setTimeout(() => {
          if (!this.hasStartedMenu) {
            console.log('[Watchdog] Force-starting MenuScene');
            this.startMenuScene();
          }
        }, 1000);
      }
    }, 250);
  }
  
  private stopWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = undefined;
    }
  }
  
  private startMenuScene(): void {
    if (this.hasStartedMenu) {
      console.log('[BootScene] Already started MenuScene, skipping');
      return;
    }
    
    this.hasStartedMenu = true;
    this.stopWatchdog();
    
    console.log('[BootScene] Starting MenuScene');
    
    // Hide HTML loading element
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
    
    try {
      this.scene.start('MenuScene');
      console.log('[BootScene] MenuScene started successfully');
    } catch (e) {
      const msg = `Failed to start MenuScene: ${e instanceof Error ? e.message : String(e)}`;
      console.error('[BootScene]', msg);
      this.addError(msg);
      // Show error on screen permanently
      this.statusText.setText('FATAL: Could not start game');
    }
  }
  
  private createFallbackTextures(): void {
    console.log('[BootScene] Creating fallback textures');
    
    try {
      const g = this.add.graphics();
      
      // Player textures (simple colored circles)
      for (let i = 0; i < 20; i++) {
        g.clear();
        g.fillStyle(0x3498db, 1);
        g.fillCircle(24, 24, 20);
        g.lineStyle(2, 0x2980b9, 1);
        g.strokeCircle(24, 24, 20);
        g.generateTexture(`player_${i}`, 48, 48);
      }
      
      g.clear();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(24, 24, 20);
      g.generateTexture('player_selected', 48, 48);
      
      // Enemy textures
      ['enemy_defender', 'enemy_mid', 'enemy_forward', 'enemy_boss', 'enemy_orange'].forEach(key => {
        g.clear();
        g.fillStyle(0xe74c3c, 1);
        g.fillCircle(24, 24, 20);
        g.generateTexture(key, 48, 48);
      });
      
      // Ball
      g.clear();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(10, 10, 8);
      g.generateTexture('ball', 20, 20);
      
      // Ball trail
      g.clear();
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(6, 6, 5);
      g.generateTexture('ball_trail', 12, 12);
      
      // Particles
      g.clear();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 6);
      g.generateTexture('particle_sprint', 16, 16);
      g.generateTexture('particle_dust', 12, 12);
      g.generateTexture('particle_burst', 32, 32);
      g.generateTexture('particle_star', 20, 20);
      
      // Confetti
      for (let i = 0; i < 6; i++) {
        g.clear();
        g.fillStyle([0xff6b6b, 0xfeca57, 0x48dbfb, 0xff9ff3, 0x00d2d3, 0x54a0ff][i], 1);
        g.fillRect(0, 0, 8, 4);
        g.generateTexture(`confetti_${i}`, 8, 4);
      }
      
      // Effects
      g.clear();
      g.fillStyle(0x48dbfb, 0.5);
      g.fillCircle(24, 24, 20);
      g.generateTexture('effect_shield', 48, 48);
      g.generateTexture('effect_tackle', 64, 64);
      g.generateTexture('effect_dodge', 40, 32);
      g.generateTexture('effect_goal', 128, 128);
      
      // UI textures
      g.clear();
      g.fillStyle(0x3498db, 1);
      g.fillRoundedRect(0, 0, 200, 50, 10);
      g.generateTexture('btn_normal', 208, 58);
      g.generateTexture('btn_hover', 208, 58);
      g.generateTexture('btn_pressed', 208, 58);
      g.generateTexture('btn_disabled', 208, 58);
      
      g.clear();
      g.fillStyle(0x1a1a2e, 0.9);
      g.fillRoundedRect(0, 0, 300, 200, 15);
      g.generateTexture('panel', 310, 210);
      
      // Cards
      ['common', 'uncommon', 'rare', 'epic', 'legendary'].forEach(rarity => {
        g.clear();
        g.fillStyle(0x1e1e2e, 1);
        g.fillRoundedRect(0, 0, 160, 220, 10);
        g.generateTexture(`card_${rarity}`, 160, 220);
      });
      
      // Icons
      g.clear();
      g.fillStyle(0xf1c40f, 1);
      g.fillCircle(16, 16, 12);
      g.generateTexture('icon_gem', 32, 32);
      g.generateTexture('icon_timer', 32, 32);
      g.generateTexture('cooldown_bg', 32, 32);
      
      // Pitch textures
      g.clear();
      g.fillStyle(0x228b22, 1);
      g.fillRect(0, 0, 64, 64);
      g.generateTexture('turf', 64, 64);
      
      g.clear();
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 100, 4);
      g.generateTexture('line_h', 100, 4);
      g.generateTexture('line_v', 4, 100);
      
      g.clear();
      g.lineStyle(4, 0xffffff, 1);
      g.strokeCircle(100, 100, 96);
      g.generateTexture('circle', 200, 200);
      g.generateTexture('d_right', 80, 150);
      g.generateTexture('d_left', 80, 150);
      
      // Goals
      g.clear();
      g.fillStyle(0x333333, 1);
      g.fillRect(0, 0, 40, 120);
      g.generateTexture('goal_left', 40, 120);
      g.generateTexture('goal_right', 40, 120);
      
      g.destroy();
      console.log('[BootScene] Fallback textures created');
    } catch (e) {
      console.error('[BootScene] Failed to create fallback textures:', e);
    }
  }
}
