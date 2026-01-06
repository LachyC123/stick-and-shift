// TrailSegment entity for Stick & Shift
// Visual trail effects for speed boosts and abilities

import Phaser from 'phaser';

export type TrailType = 'speed' | 'dodge' | 'power';

export class TrailSegment extends Phaser.GameObjects.Ellipse {
  private age: number = 0;
  private maxAge: number;
  private fadeSpeed: number;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: TrailType = 'speed'
  ) {
    // Configure based on type
    let color = 0xffffff;
    let width = 16;
    let height = 8;
    
    switch (type) {
      case 'speed':
        color = 0x3498db;
        width = 20;
        height = 10;
        break;
      case 'dodge':
        color = 0x48dbfb;
        width = 24;
        height = 12;
        break;
      case 'power':
        color = 0xf1c40f;
        width = 18;
        height = 8;
        break;
    }
    
    super(scene, x, y, width, height, color, 0.6);
    
    this.maxAge = 300;  // 300ms lifetime
    this.fadeSpeed = 1 / this.maxAge;
    
    // Add to scene
    scene.add.existing(this);
    this.setDepth(5);
  }
  
  update(delta: number): boolean {
    this.age += delta;
    
    // Fade out
    const remaining = 1 - (this.age / this.maxAge);
    this.setAlpha(remaining * 0.6);
    this.setScale(remaining);
    
    // Check if should be destroyed
    if (this.age >= this.maxAge) {
      this.destroy();
      return false;
    }
    
    return true;
  }
}

// Trail manager for efficient trail creation
export class TrailManager {
  private scene: Phaser.Scene;
  private trails: TrailSegment[] = [];
  private lastSpawnTime: number = 0;
  private spawnInterval: number = 30;  // ms between trail segments
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  // Spawn trail segment at position
  spawn(x: number, y: number, type: TrailType = 'speed'): void {
    const now = this.scene.time.now;
    
    if (now - this.lastSpawnTime < this.spawnInterval) {
      return;  // Too soon
    }
    
    this.lastSpawnTime = now;
    
    const segment = new TrailSegment(this.scene, x, y, type);
    this.trails.push(segment);
  }
  
  // Update all trails
  update(delta: number): void {
    this.trails = this.trails.filter(trail => trail.update(delta));
  }
  
  // Clear all trails
  clear(): void {
    this.trails.forEach(trail => trail.destroy());
    this.trails = [];
  }
  
  // Set spawn rate
  setSpawnInterval(interval: number): void {
    this.spawnInterval = interval;
  }
}

// Speed boost zone (created by Trail Blazer upgrade)
export class SpeedZone extends Phaser.GameObjects.Zone {
  private visual: Phaser.GameObjects.Ellipse;
  private lifespan: number = 3000;
  private age: number = 0;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 60, 40);
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this, true);  // Static body
    
    // Visual representation
    this.visual = scene.add.ellipse(x, y, 60, 40, 0x3498db, 0.3);
    this.visual.setStrokeStyle(2, 0x5dade2, 0.5);
    this.visual.setDepth(3);
  }
  
  update(delta: number): boolean {
    this.age += delta;
    
    // Pulse effect
    const pulse = 1 + Math.sin(this.age * 0.01) * 0.1;
    this.visual.setScale(pulse);
    
    // Fade out
    if (this.age > this.lifespan * 0.7) {
      const remaining = (this.lifespan - this.age) / (this.lifespan * 0.3);
      this.visual.setAlpha(remaining * 0.3);
    }
    
    // Check if should be destroyed
    if (this.age >= this.lifespan) {
      this.visual.destroy();
      this.destroy();
      return false;
    }
    
    return true;
  }
  
  // Apply speed boost to entity
  applyBoost(entity: any): void {
    // Handled by overlap callback in RunScene
  }
}
