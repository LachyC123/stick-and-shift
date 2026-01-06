// Main entry point for Stick & Shift
// Field Hockey Roguelike

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { StoreScene } from './scenes/StoreScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { RunScene } from './scenes/RunScene';
import { EndRunScene } from './scenes/EndRunScene';

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
  ]
};

// Create game instance
const game = new Phaser.Game(config);

// Handle window resize
window.addEventListener('resize', () => {
  game.scale.refresh();
});

// Prevent context menu on right-click
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// Log game info
console.log('🏑 Stick & Shift - Field Hockey Roguelike');
console.log('📦 Built with Phaser 3 + TypeScript + Vite');

export default game;
