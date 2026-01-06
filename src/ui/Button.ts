// Button component for Stick & Shift
// Interactive button with animations and sound

import Phaser from 'phaser';

export interface ButtonConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
  fontSize?: number;
  onClick?: () => void;
  disabled?: boolean;
  style?: 'primary' | 'secondary' | 'danger' | 'success';
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private bgGlow: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private isDisabled: boolean = false;
  private isHovered: boolean = false;
  private isPressed: boolean = false;
  private onClick?: () => void;
  private originalScale: number = 1;
  private colors: { normal: number; hover: number; pressed: number; disabled: number };
  
  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    super(scene, config.x, config.y);
    
    const width = config.width || 200;
    const height = config.height || 50;
    this.onClick = config.onClick;
    this.isDisabled = config.disabled || false;
    
    // Color schemes
    const colorSchemes = {
      primary: { normal: 0x3498db, hover: 0x5dade2, pressed: 0x2471a3, disabled: 0x7f8c8d },
      secondary: { normal: 0x95a5a6, hover: 0xbdc3c7, pressed: 0x7f8c8d, disabled: 0x566573 },
      danger: { normal: 0xe74c3c, hover: 0xec7063, pressed: 0xc0392b, disabled: 0x7f8c8d },
      success: { normal: 0x27ae60, hover: 0x2ecc71, pressed: 0x1e8449, disabled: 0x7f8c8d }
    };
    this.colors = colorSchemes[config.style || 'primary'];
    
    // Glow background
    this.bgGlow = scene.add.rectangle(0, 3, width + 4, height + 4, 0x000000, 0.3);
    this.bgGlow.setOrigin(0.5);
    this.add(this.bgGlow);
    
    // Main background
    this.bg = scene.add.rectangle(0, 0, width, height, this.isDisabled ? this.colors.disabled : this.colors.normal);
    this.bg.setOrigin(0.5);
    this.bg.setStrokeStyle(2, 0xffffff, 0.3);
    this.add(this.bg);
    
    // Highlight
    const highlight = scene.add.rectangle(0, -height / 4, width - 10, height / 3, 0xffffff, 0.15);
    highlight.setOrigin(0.5);
    this.add(highlight);
    
    // Label
    this.label = scene.add.text(0, 0, config.text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${config.fontSize || 18}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.label.setOrigin(0.5);
    this.add(this.label);
    
    // Make interactive
    this.setSize(width, height);
    this.setInteractive({ useHandCursor: !this.isDisabled });
    
    // Event handlers
    this.on('pointerover', this.onPointerOver, this);
    this.on('pointerout', this.onPointerOut, this);
    this.on('pointerdown', this.onPointerDown, this);
    this.on('pointerup', this.onPointerUp, this);
    
    scene.add.existing(this);
  }
  
  private onPointerOver(): void {
    if (this.isDisabled) return;
    
    this.isHovered = true;
    this.bg.setFillStyle(this.colors.hover);
    
    // Scale up animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 100,
      ease: 'Power2'
    });
  }
  
  private onPointerOut(): void {
    if (this.isDisabled) return;
    
    this.isHovered = false;
    this.isPressed = false;
    this.bg.setFillStyle(this.colors.normal);
    
    // Scale back
    this.scene.tweens.add({
      targets: this,
      scaleX: this.originalScale,
      scaleY: this.originalScale,
      duration: 100,
      ease: 'Power2'
    });
  }
  
  private onPointerDown(): void {
    if (this.isDisabled) return;
    
    this.isPressed = true;
    this.bg.setFillStyle(this.colors.pressed);
    
    // Press animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 50,
      ease: 'Power2'
    });
    
    // Play click sound if audio system exists
    if ((this.scene as any).audioSystem) {
      (this.scene as any).audioSystem.playClick();
    }
  }
  
  private onPointerUp(): void {
    if (this.isDisabled || !this.isPressed) return;
    
    this.isPressed = false;
    this.bg.setFillStyle(this.isHovered ? this.colors.hover : this.colors.normal);
    
    // Bounce back
    this.scene.tweens.add({
      targets: this,
      scaleX: this.isHovered ? 1.05 : this.originalScale,
      scaleY: this.isHovered ? 1.05 : this.originalScale,
      duration: 100,
      ease: 'Back.easeOut'
    });
    
    // Trigger callback
    if (this.onClick) {
      this.onClick();
    }
  }
  
  setDisabled(disabled: boolean): this {
    this.isDisabled = disabled;
    this.bg.setFillStyle(disabled ? this.colors.disabled : this.colors.normal);
    this.setInteractive({ useHandCursor: !disabled });
    this.label.setAlpha(disabled ? 0.5 : 1);
    return this;
  }
  
  setText(text: string): this {
    this.label.setText(text);
    return this;
  }
  
  setCallback(callback: () => void): this {
    this.onClick = callback;
    return this;
  }
  
  // Pulse animation for attention
  pulse(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut'
    });
  }
  
  // Shake animation for errors
  shake(): void {
    const originalX = this.x;
    this.scene.tweens.add({
      targets: this,
      x: originalX + 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.x = originalX;
      }
    });
  }
}

// Icon button variant
export class IconButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Arc;
  private icon: Phaser.GameObjects.Text;
  private onClick?: () => void;
  private isDisabled: boolean = false;
  
  constructor(scene: Phaser.Scene, x: number, y: number, icon: string, onClick?: () => void, size: number = 40) {
    super(scene, x, y);
    
    this.onClick = onClick;
    
    // Background circle
    this.bg = scene.add.circle(0, 0, size / 2, 0x3498db);
    this.bg.setStrokeStyle(2, 0xffffff, 0.3);
    this.add(this.bg);
    
    // Icon (emoji or text)
    this.icon = scene.add.text(0, 0, icon, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${size * 0.5}px`
    });
    this.icon.setOrigin(0.5);
    this.add(this.icon);
    
    // Make interactive
    this.setSize(size, size);
    this.setInteractive({ useHandCursor: true });
    
    this.on('pointerover', () => {
      if (!this.isDisabled) {
        this.bg.setFillStyle(0x5dade2);
        scene.tweens.add({
          targets: this,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 100
        });
      }
    });
    
    this.on('pointerout', () => {
      if (!this.isDisabled) {
        this.bg.setFillStyle(0x3498db);
        scene.tweens.add({
          targets: this,
          scaleX: 1,
          scaleY: 1,
          duration: 100
        });
      }
    });
    
    this.on('pointerdown', () => {
      if (!this.isDisabled && this.onClick) {
        scene.tweens.add({
          targets: this,
          scaleX: 0.9,
          scaleY: 0.9,
          duration: 50,
          yoyo: true
        });
        this.onClick();
      }
    });
    
    scene.add.existing(this);
  }
  
  setDisabled(disabled: boolean): this {
    this.isDisabled = disabled;
    this.bg.setFillStyle(disabled ? 0x7f8c8d : 0x3498db);
    this.icon.setAlpha(disabled ? 0.5 : 1);
    return this;
  }
}
