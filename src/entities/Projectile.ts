// Projectile entity for Stick & Shift
// For special shots and abilities

import Phaser from 'phaser';

export type ProjectileType = 'shot' | 'orangeBlast' | 'powerShot';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  public projectileType: ProjectileType;
  public damage: number;
  public owner: any;
  
  private lifespan: number;
  private age: number = 0;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    speed: number,
    type: ProjectileType = 'shot',
    owner: any = null
  ) {
    // Use ball texture or create custom
    super(scene, x, y, 'ball');
    
    this.projectileType = type;
    this.owner = owner;
    
    // Configure based on type
    switch (type) {
      case 'shot':
        this.damage = 1;
        this.lifespan = 2000;
        this.setScale(1);
        break;
      case 'orangeBlast':
        this.damage = 2;
        this.lifespan = 3000;
        this.setScale(1.5);
        this.setTint(0xff9500);
        speed *= 0.6;  // Slower but bigger
        break;
      case 'powerShot':
        this.damage = 1;
        this.lifespan = 1500;
        this.setScale(1.2);
        this.setTint(0xf1c40f);
        break;
    }
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Physics setup
    this.setCircle(8);
    this.setDepth(16);
    
    // Set velocity
    this.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
  }
  
  update(delta: number): void {
    this.age += delta;
    
    // Check lifespan
    if (this.age >= this.lifespan) {
      this.destroy();
      return;
    }
    
    // Fade out near end of life
    if (this.age > this.lifespan * 0.8) {
      const remaining = (this.lifespan - this.age) / (this.lifespan * 0.2);
      this.setAlpha(remaining);
    }
    
    // Type-specific updates
    switch (this.projectileType) {
      case 'orangeBlast':
        // Pulsing effect
        const pulse = 1 + Math.sin(this.age * 0.01) * 0.2;
        this.setScale(1.5 * pulse);
        break;
    }
  }
  
  // Called when hitting something
  onHit(target: any): void {
    // Visual effect
    const burst = this.scene.add.circle(this.x, this.y, 20, 0xffffff, 0.8);
    burst.setDepth(50);
    
    this.scene.tweens.add({
      targets: burst,
      scale: 2,
      alpha: 0,
      duration: 200,
      onComplete: () => burst.destroy()
    });
    
    this.destroy();
  }
}
