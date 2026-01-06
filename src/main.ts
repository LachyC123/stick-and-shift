// Main entry point for Stick & Shift
// Field Hockey Roguelike

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { StoreScene } from './scenes/StoreScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { RunScene } from './scenes/RunScene';
import { EndRunScene } from './scenes/EndRunScene';

// Setup early global error catching
function showCriticalError(message: string, details?: string): void {
  console.error('[CRITICAL ERROR]', message, details);
  
  // Don't show overlay if already shown
  if (document.getElementById('critical-error-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'critical-error-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #1a1a2e;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    font-family: Arial, sans-serif;
    text-align: center;
    padding: 20px;
    box-sizing: border-box;
  `;
  
  overlay.innerHTML = `
    <h1 style="color: #e74c3c; margin-bottom: 20px;">❌ Game Failed to Load</h1>
    <p style="color: #bdc3c7; margin-bottom: 10px; max-width: 500px;">${message}</p>
    ${details ? `<pre style="background: #2c3e50; padding: 15px; border-radius: 8px; max-width: 600px; overflow-x: auto; font-size: 12px; color: #e74c3c; text-align: left;">${details}</pre>` : ''}
    <p style="color: #7f8c8d; margin: 20px 0; font-size: 14px;">Press F12 to open DevTools for more info</p>
    <button onclick="location.reload()" style="
      background: #3498db;
      color: white;
      border: none;
      padding: 12px 30px;
      font-size: 16px;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 10px;
    ">🔄 Refresh Page</button>
  `;
  
  document.body.appendChild(overlay);
}

// Early error handlers
window.addEventListener('error', (event) => {
  console.error('[Window Error]', event.message, event.filename, event.lineno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason);
});

// Log game info
console.log('🏑 Stick & Shift - Field Hockey Roguelike');
console.log('📦 Built with Phaser 3 + TypeScript + Vite');
console.log('🚀 Starting game initialization...');

try {
  // Game configuration
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1200,
    height: 700,
    backgroundColor: '#1a1a2e',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      min: {
        width: 800,
        height: 450
      },
      max: {
        width: 1920,
        height: 1080
      }
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    render: {
      pixelArt: false,
      antialias: true,
      antialiasGL: true
    },
    input: {
      keyboard: true,
      mouse: true,
      touch: true
    },
    scene: [
      BootScene,
      MenuScene,
      StoreScene,
      CharacterSelectScene,
      RunScene,
      EndRunScene
    ],
    // Phaser callbacks for additional error handling
    callbacks: {
      preBoot: (game) => {
        console.log('[Phaser] Pre-boot');
      },
      postBoot: (game) => {
        console.log('[Phaser] Post-boot - Game instance created');
      }
    }
  };

  // Create game instance
  console.log('[Main] Creating Phaser game instance...');
  const game = new Phaser.Game(config);

  // Phaser event listeners
  game.events.once('ready', () => {
    console.log('[Phaser] Game ready');
  });

  game.events.once('boot', () => {
    console.log('[Phaser] Game boot');
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    if (game && game.scale) {
      game.scale.refresh();
    }
  });

  // Prevent context menu on right-click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  console.log('[Main] Game instance created successfully');
  
  // Export for debugging
  (window as any).game = game;

} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';
  
  console.error('[Main] Fatal error during game initialization:', error);
  showCriticalError(
    'Failed to initialize game engine.',
    `${errorMessage}\n\n${errorStack}`
  );
}
