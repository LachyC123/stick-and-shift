// Toast notification system for Stick & Shift
// Shows brief messages that fade out

import Phaser from 'phaser';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
  icon?: string;
}

const TOAST_COLORS: Record<ToastType, number> = {
  info: 0x3498db,
  success: 0x27ae60,
  warning: 0xf39c12,
  error: 0xe74c3c
};

const TOAST_ICONS: Record<ToastType, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌'
};

export class ToastManager {
  private scene: Phaser.Scene;
  private toasts: Toast[] = [];
  private baseY: number = 100;
  private spacing: number = 60;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  show(config: ToastConfig): Toast {
    const toast = new Toast(this.scene, {
      ...config,
      y: this.calculateY(),
      onComplete: () => this.removeToast(toast)
    });
    
    this.toasts.push(toast);
    return toast;
  }
  
  private calculateY(): number {
    return this.baseY + this.toasts.length * this.spacing;
  }
  
  private removeToast(toast: Toast): void {
    const index = this.toasts.indexOf(toast);
    if (index > -1) {
      this.toasts.splice(index, 1);
      // Animate remaining toasts up
      this.toasts.forEach((t, i) => {
        this.scene.tweens.add({
          targets: t,
          y: this.baseY + i * this.spacing,
          duration: 200,
          ease: 'Power2'
        });
      });
    }
  }
  
  // Convenience methods
  info(message: string, icon?: string): Toast {
    return this.show({ message, type: 'info', icon });
  }
  
  success(message: string, icon?: string): Toast {
    return this.show({ message, type: 'success', icon });
  }
  
  warning(message: string, icon?: string): Toast {
    return this.show({ message, type: 'warning', icon });
  }
  
  error(message: string, icon?: string): Toast {
    return this.show({ message, type: 'error', icon });
  }
  
  // Clear all toasts
  clear(): void {
    this.toasts.forEach(t => t.dismiss());
    this.toasts = [];
  }
}

class Toast extends Phaser.GameObjects.Container {
  private onComplete?: () => void;
  
  constructor(scene: Phaser.Scene, config: ToastConfig & { y: number; onComplete?: () => void }) {
    const x = scene.cameras.main.centerX;
    const y = config.y;
    super(scene, x, y);
    
    this.onComplete = config.onComplete;
    
    const type = config.type || 'info';
    const duration = config.duration || 3000;
    const color = TOAST_COLORS[type];
    const icon = config.icon || TOAST_ICONS[type];
    
    // Calculate width based on message
    const tempText = scene.add.text(0, 0, config.message, { fontSize: '16px' });
    const textWidth = tempText.width;
    tempText.destroy();
    
    const width = Math.max(200, textWidth + 80);
    const height = 44;
    
    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(2, color, 0.8);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.add(bg);
    
    // Color accent on left
    const accent = scene.add.graphics();
    accent.fillStyle(color, 1);
    accent.fillRoundedRect(-width / 2, -height / 2, 6, height, { tl: 8, tr: 0, br: 0, bl: 8 });
    this.add(accent);
    
    // Icon
    const iconText = scene.add.text(-width / 2 + 24, 0, icon, {
      fontSize: '18px'
    });
    iconText.setOrigin(0.5);
    this.add(iconText);
    
    // Message
    const message = scene.add.text(8, 0, config.message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ffffff'
    });
    message.setOrigin(0.5);
    this.add(message);
    
    // Set depth
    this.setDepth(500);
    this.setScrollFactor(0);
    
    scene.add.existing(this);
    
    // Animate in
    this.setAlpha(0);
    this.x = x + 200;
    scene.tweens.add({
      targets: this,
      x: x,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });
    
    // Auto dismiss
    scene.time.delayedCall(duration, () => this.dismiss());
  }
  
  dismiss(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.x + 200,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        if (this.onComplete) this.onComplete();
        this.destroy();
      }
    });
  }
}

// Achievement popup (special toast)
export class AchievementPopup extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, title: string, description: string, icon: string = '🏆') {
    const x = scene.cameras.main.centerX;
    const y = 150;
    super(scene, x, y);
    
    const width = 300;
    const height = 80;
    
    // Background with gold border
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    bg.lineStyle(3, 0xf1c40f, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    this.add(bg);
    
    // Glow
    const glow = scene.add.graphics();
    glow.fillStyle(0xf1c40f, 0.2);
    glow.fillRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 14);
    this.add(glow);
    this.sendToBack(glow);
    
    // Icon
    const iconText = scene.add.text(-width / 2 + 40, 0, icon, {
      fontSize: '36px'
    });
    iconText.setOrigin(0.5);
    this.add(iconText);
    
    // Title
    const titleText = scene.add.text(10, -12, title, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#f1c40f',
      fontStyle: 'bold'
    });
    titleText.setOrigin(0.5);
    this.add(titleText);
    
    // Description
    const descText = scene.add.text(10, 14, description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#bdc3c7'
    });
    descText.setOrigin(0.5);
    this.add(descText);
    
    this.setDepth(510);
    this.setScrollFactor(0);
    
    scene.add.existing(this);
    
    // Animate in with fanfare
    this.setAlpha(0);
    this.setScale(0.5);
    this.y = y - 50;
    
    scene.tweens.add({
      targets: this,
      y: y,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });
    
    // Pulse glow
    scene.tweens.add({
      targets: glow,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: 3
    });
    
    // Auto dismiss
    scene.time.delayedCall(4000, () => {
      scene.tweens.add({
        targets: this,
        y: y - 50,
        alpha: 0,
        duration: 300,
        onComplete: () => this.destroy()
      });
    });
  }
}
