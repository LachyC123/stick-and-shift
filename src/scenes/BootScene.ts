// BootScene for Stick & Shift
// Handles loading and texture generation
// With robust error handling, watchdog timer, and debug overlay

import Phaser from 'phaser';
import { TextureFactory } from '../gfx/TextureFactory';

// Debug state for error tracking
interface DebugState {
  stage: string;
  progress: number;
  lastFile: string;
  errors: string[];
  startTime: number;
}

export class BootScene extends Phaser.Scene {
  private loadingBar?: Phaser.GameObjects.Graphics;
  private loadingText?: Phaser.GameObjects.Text;
  private debugState: DebugState;
  private watchdogTimer?: Phaser.Time.TimerEvent;
  private hasTransitioned: boolean = false;
  private errorOverlay?: HTMLDivElement;
  
  constructor() {
    super({ key: 'BootScene' });
    
    this.debugState = {
      stage: 'init',
      progress: 0,
      lastFile: 'none',
      errors: [],
      startTime: Date.now()
    };
  }
  
  init(): void {
    // Setup global error handlers
    this.setupGlobalErrorHandlers();
    
    // Reset state
    this.hasTransitioned = false;
    this.debugState = {
      stage: 'init',
      progress: 0,
      lastFile: 'none',
      errors: [],
      startTime: Date.now()
    };
    
    console.log('[BootScene] Initializing...');
  }
  
  preload(): void {
    try {
      this.debugState.stage = 'preload';
      console.log('[BootScene] Preload started');
      
      // Create loading UI
      this.createLoadingUI();
      
      // Setup loader error handling
      this.load.on('loaderror', (file: Phaser.Loader.File) => {
        const errorMsg = `LOAD ERROR: ${file.key} - ${file.src || 'unknown source'}`;
        console.error('[BootScene]', errorMsg);
        this.debugState.errors.push(errorMsg);
        this.debugState.lastFile = `ERROR: ${file.key}`;
      });
      
      this.load.on('filecomplete', (key: string) => {
        this.debugState.lastFile = key;
        console.log('[BootScene] Loaded:', key);
      });
      
      this.load.on('progress', (value: number) => {
        this.debugState.progress = value * 0.3;
        this.updateLoadingBar(value * 0.3);
      });
      
      // The complete event - Phaser's loader is done
      // Note: We generate textures at runtime, so no actual files to load
      this.load.once('complete', () => {
        console.log('[BootScene] Loader complete');
        this.debugState.stage = 'loader-complete';
      });
      
      // Start watchdog timer - if we're stuck for 6 seconds, show error
      this.startWatchdog();
      
    } catch (error) {
      const errorMsg = `Preload error: ${error instanceof Error ? error.message : String(error)}`;
      console.error('[BootScene]', errorMsg);
      this.debugState.errors.push(errorMsg);
      this.showErrorOverlay();
    }
  }
  
  create(): void {
    try {
      this.debugState.stage = 'create';
      console.log('[BootScene] Create started');
      
      // Generate all runtime textures (wrapped in try/catch)
      this.updateLoadingText('Generating textures...');
      this.updateLoadingBar(0.4);
      this.debugState.progress = 0.4;
      
      this.generateTexturesSafe();
      
      this.updateLoadingBar(0.7);
      this.debugState.progress = 0.7;
      this.updateLoadingText('Initializing systems...');
      this.debugState.stage = 'systems';
      
      // Transition to menu - no async waits, direct call after short delay
      this.updateLoadingBar(0.9);
      this.debugState.progress = 0.9;
      this.updateLoadingText('Ready!');
      
      // Use a simple timeout instead of delayedCall for reliability
      setTimeout(() => {
        this.completeLoading();
      }, 400);
      
    } catch (error) {
      const errorMsg = `Create error: ${error instanceof Error ? error.message : String(error)}`;
      console.error('[BootScene]', errorMsg, error);
      this.debugState.errors.push(errorMsg);
      this.showErrorOverlay();
    }
  }
  
  private generateTexturesSafe(): void {
    try {
      this.debugState.stage = 'textures';
      console.log('[BootScene] Generating textures...');
      
      const textureFactory = new TextureFactory(this);
      textureFactory.generateAll();
      
      console.log('[BootScene] Textures generated successfully');
      
    } catch (error) {
      const errorMsg = `Texture generation error: ${error instanceof Error ? error.message : String(error)}`;
      console.error('[BootScene]', errorMsg, error);
      this.debugState.errors.push(errorMsg);
      
      // Create minimal fallback textures so the game can still run
      this.createFallbackTextures();
    }
  }
  
  private createFallbackTextures(): void {
    console.log('[BootScene] Creating fallback textures...');
    
    try {
      const graphics = this.add.graphics();
      
      // Create minimal player texture
      for (let i = 0; i < 20; i++) {
        graphics.clear();
        graphics.fillStyle(0x3498db, 1);
        graphics.fillCircle(24, 24, 20);
        graphics.generateTexture(`player_${i}`, 48, 48);
      }
      
      // Create minimal enemy textures
      const enemyKeys = ['enemy_defender', 'enemy_mid', 'enemy_forward', 'enemy_boss', 'enemy_orange'];
      enemyKeys.forEach(key => {
        graphics.clear();
        graphics.fillStyle(0xe74c3c, 1);
        graphics.fillCircle(24, 24, 20);
        graphics.generateTexture(key, 48, 48);
      });
      
      // Create ball texture
      graphics.clear();
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(10, 10, 8);
      graphics.generateTexture('ball', 20, 20);
      
      graphics.destroy();
      console.log('[BootScene] Fallback textures created');
      
    } catch (fallbackError) {
      console.error('[BootScene] Failed to create fallback textures:', fallbackError);
    }
  }
  
  private completeLoading(): void {
    if (this.hasTransitioned) {
      console.log('[BootScene] Already transitioned, skipping');
      return;
    }
    
    this.hasTransitioned = true;
    this.debugState.stage = 'transitioning';
    console.log('[BootScene] Completing loading, transitioning to MenuScene...');
    
    // Stop watchdog
    if (this.watchdogTimer) {
      this.watchdogTimer.destroy();
      this.watchdogTimer = undefined;
    }
    
    // Hide HTML loading element
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    
    this.updateLoadingBar(1.0);
    this.debugState.progress = 1.0;
    
    // Direct transition - no camera fade dependency
    try {
      console.log('[BootScene] Starting MenuScene...');
      this.scene.start('MenuScene');
      console.log('[BootScene] MenuScene started successfully');
    } catch (error) {
      const errorMsg = `Scene transition error: ${error instanceof Error ? error.message : String(error)}`;
      console.error('[BootScene]', errorMsg, error);
      this.debugState.errors.push(errorMsg);
      this.showErrorOverlay();
    }
  }
  
  private startWatchdog(): void {
    const WATCHDOG_TIMEOUT = 8000; // 8 seconds
    
    // Use native setTimeout for reliability (not Phaser's timer)
    const watchdogId = setTimeout(() => {
      if (!this.hasTransitioned) {
        console.error('[BootScene] Watchdog triggered! Loading stuck.');
        this.debugState.errors.push(`Loading stuck after ${WATCHDOG_TIMEOUT}ms`);
        this.showErrorOverlay();
      }
    }, WATCHDOG_TIMEOUT);
    
    // Also create a Phaser timer as backup
    try {
      this.watchdogTimer = this.time.delayedCall(WATCHDOG_TIMEOUT, () => {
        if (!this.hasTransitioned) {
          console.error('[BootScene] Phaser watchdog triggered!');
          this.debugState.errors.push('Phaser watchdog: Loading stuck');
          this.showErrorOverlay();
        }
      });
    } catch (e) {
      console.warn('[BootScene] Could not create Phaser watchdog timer:', e);
    }
    
    // Clear native timeout when scene is destroyed
    this.events.once('shutdown', () => {
      clearTimeout(watchdogId);
    });
    
    this.events.once('destroy', () => {
      clearTimeout(watchdogId);
    });
  }
  
  private setupGlobalErrorHandlers(): void {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      const errorMsg = `Runtime error: ${event.message} at ${event.filename}:${event.lineno}`;
      console.error('[Global Error]', errorMsg, event.error);
      this.debugState.errors.push(errorMsg);
      
      // Show overlay if we haven't transitioned yet
      if (!this.hasTransitioned) {
        this.showErrorOverlay();
      }
    });
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const errorMsg = `Unhandled Promise rejection: ${event.reason}`;
      console.error('[Unhandled Rejection]', errorMsg);
      this.debugState.errors.push(errorMsg);
      
      if (!this.hasTransitioned) {
        this.showErrorOverlay();
      }
    });
  }
  
  private showErrorOverlay(): void {
    // Only show once
    if (this.errorOverlay) return;
    
    console.log('[BootScene] Showing error overlay');
    
    // Create fullscreen error overlay
    this.errorOverlay = document.createElement('div');
    this.errorOverlay.id = 'error-overlay';
    this.errorOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(26, 26, 46, 0.98);
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
      padding: 20px;
      box-sizing: border-box;
    `;
    
    const elapsedTime = ((Date.now() - this.debugState.startTime) / 1000).toFixed(1);
    
    this.errorOverlay.innerHTML = `
      <h1 style="color: #e74c3c; margin-bottom: 20px; font-size: 28px;">⚠️ Loading Error</h1>
      
      <div style="background: #2c3e50; padding: 20px; border-radius: 10px; max-width: 600px; width: 100%; margin-bottom: 20px;">
        <h3 style="color: #f39c12; margin-top: 0;">Debug Info:</h3>
        <table style="width: 100%; color: #bdc3c7; font-size: 14px;">
          <tr><td style="padding: 5px 10px 5px 0;"><strong>Stage:</strong></td><td>${this.debugState.stage}</td></tr>
          <tr><td style="padding: 5px 10px 5px 0;"><strong>Progress:</strong></td><td>${(this.debugState.progress * 100).toFixed(0)}%</td></tr>
          <tr><td style="padding: 5px 10px 5px 0;"><strong>Last file:</strong></td><td>${this.debugState.lastFile}</td></tr>
          <tr><td style="padding: 5px 10px 5px 0;"><strong>Elapsed:</strong></td><td>${elapsedTime}s</td></tr>
        </table>
      </div>
      
      ${this.debugState.errors.length > 0 ? `
        <div style="background: #3d1515; padding: 20px; border-radius: 10px; max-width: 600px; width: 100%; margin-bottom: 20px; border: 1px solid #e74c3c;">
          <h3 style="color: #e74c3c; margin-top: 0;">Errors (${this.debugState.errors.length}):</h3>
          <ul style="margin: 0; padding-left: 20px; max-height: 150px; overflow-y: auto; font-size: 12px; color: #ff9999;">
            ${this.debugState.errors.map(err => `<li style="margin: 5px 0; word-break: break-word;">${err}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div style="color: #95a5a6; font-size: 14px; text-align: center; margin-bottom: 20px;">
        <p>📋 Open DevTools console (F12) for more details</p>
        <p>Try refreshing the page or clearing browser cache</p>
      </div>
      
      <div style="display: flex; gap: 15px;">
        <button onclick="location.reload()" style="
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 30px;
          font-size: 16px;
          border-radius: 8px;
          cursor: pointer;
        ">🔄 Refresh Page</button>
        
        <button onclick="document.getElementById('error-overlay').style.display='none'" style="
          background: #7f8c8d;
          color: white;
          border: none;
          padding: 12px 30px;
          font-size: 16px;
          border-radius: 8px;
          cursor: pointer;
        ">✕ Close</button>
      </div>
    `;
    
    document.body.appendChild(this.errorOverlay);
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
      (barWidth - 4) * Math.min(progress, 1),
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
    this.debugState.stage = text;
  }
  
  private updateHtmlLoadingBar(progress: number): void {
    const fillElement = document.getElementById('loading-fill');
    if (fillElement) {
      fillElement.style.width = `${Math.min(progress, 1) * 100}%`;
    }
  }
}
