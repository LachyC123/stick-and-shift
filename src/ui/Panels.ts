// Panel components for Stick & Shift
// Container panels for UI elements

import Phaser from 'phaser';

export interface PanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  backgroundColor?: number;
  borderColor?: number;
}

export class Panel extends Phaser.GameObjects.Container {
  protected bg: Phaser.GameObjects.Graphics;
  protected titleText?: Phaser.GameObjects.Text;
  protected contentContainer: Phaser.GameObjects.Container;
  protected panelWidth: number;
  protected panelHeight: number;
  
  constructor(scene: Phaser.Scene, config: PanelConfig) {
    super(scene, config.x, config.y);
    
    this.panelWidth = config.width;
    this.panelHeight = config.height;
    
    // Background
    this.bg = scene.add.graphics();
    this.drawBackground(config.backgroundColor || 0x1a1a2e, config.borderColor || 0x3498db);
    this.add(this.bg);
    
    // Title
    if (config.title) {
      this.titleText = scene.add.text(0, -this.panelHeight / 2 + 20, config.title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      this.titleText.setOrigin(0.5);
      this.add(this.titleText);
    }
    
    // Content container
    this.contentContainer = scene.add.container(0, config.title ? 20 : 0);
    this.add(this.contentContainer);
    
    scene.add.existing(this);
  }
  
  protected drawBackground(bgColor: number, borderColor: number): void {
    this.bg.clear();
    
    // Shadow
    this.bg.fillStyle(0x000000, 0.4);
    this.bg.fillRoundedRect(
      -this.panelWidth / 2 + 6,
      -this.panelHeight / 2 + 6,
      this.panelWidth,
      this.panelHeight,
      15
    );
    
    // Main background
    this.bg.fillStyle(bgColor, 0.95);
    this.bg.fillRoundedRect(
      -this.panelWidth / 2,
      -this.panelHeight / 2,
      this.panelWidth,
      this.panelHeight,
      15
    );
    
    // Border
    this.bg.lineStyle(3, borderColor, 0.8);
    this.bg.strokeRoundedRect(
      -this.panelWidth / 2,
      -this.panelHeight / 2,
      this.panelWidth,
      this.panelHeight,
      15
    );
    
    // Inner glow
    this.bg.lineStyle(1, borderColor, 0.3);
    this.bg.strokeRoundedRect(
      -this.panelWidth / 2 + 4,
      -this.panelHeight / 2 + 4,
      this.panelWidth - 8,
      this.panelHeight - 8,
      12
    );
  }
  
  addContent(gameObject: Phaser.GameObjects.GameObject): void {
    this.contentContainer.add(gameObject);
  }
  
  clearContent(): void {
    this.contentContainer.removeAll(true);
  }
  
  // Fade in animation
  fadeIn(duration: number = 300): void {
    this.setAlpha(0);
    this.setScale(0.8);
    
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: duration,
      ease: 'Back.easeOut'
    });
  }
  
  // Fade out animation
  fadeOut(duration: number = 200, onComplete?: () => void): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }
  
  // Slide in from direction
  slideIn(direction: 'left' | 'right' | 'top' | 'bottom', duration: number = 400): void {
    const offsets = {
      left: { x: -400, y: 0 },
      right: { x: 400, y: 0 },
      top: { x: 0, y: -300 },
      bottom: { x: 0, y: 300 }
    };
    
    const offset = offsets[direction];
    const targetX = this.x;
    const targetY = this.y;
    
    this.x += offset.x;
    this.y += offset.y;
    this.setAlpha(0);
    
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      alpha: 1,
      duration: duration,
      ease: 'Power2'
    });
  }
}

// Scrollable panel
export class ScrollablePanel extends Panel {
  private scrollMask: Phaser.GameObjects.Graphics;
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private contentHeight: number = 0;
  private viewportHeight: number;
  
  constructor(scene: Phaser.Scene, config: PanelConfig) {
    super(scene, config);
    
    this.viewportHeight = config.height - 60;  // Account for title and padding
    
    // Create mask for scrolling
    this.scrollMask = scene.add.graphics();
    this.scrollMask.fillStyle(0xffffff);
    this.scrollMask.fillRect(
      config.x - config.width / 2 + 10,
      config.y - config.height / 2 + 50,
      config.width - 20,
      this.viewportHeight
    );
    
    const mask = this.scrollMask.createGeometryMask();
    this.contentContainer.setMask(mask);
    
    // Enable scroll input
    this.setInteractive(new Phaser.Geom.Rectangle(
      -config.width / 2,
      -config.height / 2,
      config.width,
      config.height
    ), Phaser.Geom.Rectangle.Contains);
    
    this.on('wheel', (pointer: Phaser.Input.Pointer, dx: number, dy: number) => {
      this.scroll(dy * 0.5);
    });
  }
  
  scroll(delta: number): void {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, this.maxScrollY);
    this.contentContainer.y = -this.scrollY + (this.titleText ? 20 : 0);
  }
  
  setContentHeight(height: number): void {
    this.contentHeight = height;
    this.maxScrollY = Math.max(0, this.contentHeight - this.viewportHeight);
  }
  
  resetScroll(): void {
    this.scrollY = 0;
    this.contentContainer.y = this.titleText ? 20 : 0;
  }
  
  destroy(fromScene?: boolean): void {
    this.scrollMask.destroy();
    super.destroy(fromScene);
  }
}

// Modal dialog
export class ModalDialog extends Panel {
  private overlay: Phaser.GameObjects.Rectangle;
  private onClose?: () => void;
  
  constructor(scene: Phaser.Scene, config: PanelConfig & { onClose?: () => void }) {
    // Create dark overlay first
    const overlay = scene.add.rectangle(
      scene.cameras.main.centerX,
      scene.cameras.main.centerY,
      scene.cameras.main.width,
      scene.cameras.main.height,
      0x000000,
      0.7
    );
    overlay.setDepth(999);
    overlay.setInteractive();  // Block clicks behind
    
    super(scene, { ...config, x: scene.cameras.main.centerX, y: scene.cameras.main.centerY });
    
    this.overlay = overlay;
    this.onClose = config.onClose;
    this.setDepth(1000);
    
    // Close on overlay click
    overlay.on('pointerdown', () => this.close());
  }
  
  close(): void {
    if (this.onClose) this.onClose();
    
    this.scene.tweens.add({
      targets: [this, this.overlay],
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.overlay.destroy();
        this.destroy();
      }
    });
  }
  
  show(): void {
    this.overlay.setAlpha(0);
    this.setAlpha(0);
    this.setScale(0.8);
    
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 0.7,
      duration: 200
    });
    
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }
}

// HUD panel (fixed, no background)
export class HUDPanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.setScrollFactor(0);  // Fixed to camera
    scene.add.existing(this);
  }
}
