// Particle effects for Stick & Shift
// Creates visual juice with particle emitters

import Phaser from 'phaser';

export class ParticleManager {
  private scene: Phaser.Scene;
  private emitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  // Initialize all particle emitters
  init(): void {
    this.createSprintEmitter();
    this.createDustEmitter();
    this.createConfettiEmitter();
    this.createStarEmitter();
    this.createBurstEmitter();
  }
  
  private createSprintEmitter(): void {
    const particles = this.scene.add.particles(0, 0, 'particle_sprint', {
      speed: { min: 20, max: 50 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 300,
      blendMode: 'ADD',
      frequency: -1  // Manual emission
    });
    particles.setDepth(5);
    this.emitters.set('sprint', particles);
  }
  
  private createDustEmitter(): void {
    const particles = this.scene.add.particles(0, 0, 'particle_dust', {
      speed: { min: 30, max: 80 },
      angle: { min: -150, max: -30 },
      scale: { start: 0.8, end: 0.2 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 400,
      gravityY: 100,
      frequency: -1
    });
    particles.setDepth(4);
    this.emitters.set('dust', particles);
  }
  
  private createConfettiEmitter(): void {
    // Create multiple emitters for different colored confetti
    for (let i = 0; i < 6; i++) {
      const particles = this.scene.add.particles(0, 0, `confetti_${i}`, {
        speed: { min: 100, max: 300 },
        angle: { min: -120, max: -60 },
        scale: { start: 1.5, end: 0.5 },
        alpha: { start: 1, end: 0.5 },
        rotate: { min: 0, max: 360 },
        lifespan: 2000,
        gravityY: 200,
        frequency: -1
      });
      particles.setDepth(100);
      this.emitters.set(`confetti_${i}`, particles);
    }
  }
  
  private createStarEmitter(): void {
    const particles = this.scene.add.particles(0, 0, 'particle_star', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      lifespan: 600,
      frequency: -1
    });
    particles.setDepth(50);
    this.emitters.set('star', particles);
  }
  
  private createBurstEmitter(): void {
    const particles = this.scene.add.particles(0, 0, 'particle_burst', {
      speed: { min: 100, max: 200 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 300,
      blendMode: 'ADD',
      frequency: -1
    });
    particles.setDepth(50);
    this.emitters.set('burst', particles);
  }
  
  // Emit sprint trail particles at position
  emitSprint(x: number, y: number, velocityX: number, velocityY: number): void {
    const emitter = this.emitters.get('sprint');
    if (emitter) {
      emitter.setPosition(x, y);
      emitter.setParticleSpeed(-velocityX * 0.3, -velocityY * 0.3);
      emitter.emitParticle(1);
    }
  }
  
  // Emit dust particles (for tackles, slides)
  emitDust(x: number, y: number, count: number = 5): void {
    const emitter = this.emitters.get('dust');
    if (emitter) {
      emitter.setPosition(x, y);
      emitter.emitParticle(count);
    }
  }
  
  // Emit confetti (for goals)
  emitConfetti(x: number, y: number, count: number = 50): void {
    const particlesPerColor = Math.ceil(count / 6);
    for (let i = 0; i < 6; i++) {
      const emitter = this.emitters.get(`confetti_${i}`);
      if (emitter) {
        emitter.setPosition(x, y);
        emitter.emitParticle(particlesPerColor);
      }
    }
  }
  
  // Emit stars (for power-ups, special events)
  emitStars(x: number, y: number, count: number = 8): void {
    const emitter = this.emitters.get('star');
    if (emitter) {
      emitter.setPosition(x, y);
      emitter.emitParticle(count);
    }
  }
  
  // Emit burst (for impacts)
  emitBurst(x: number, y: number, count: number = 6): void {
    const emitter = this.emitters.get('burst');
    if (emitter) {
      emitter.setPosition(x, y);
      emitter.emitParticle(count);
    }
  }
  
  // Goal celebration effect
  goalCelebration(x: number, y: number): void {
    // Multiple bursts of confetti
    const delay = [0, 100, 200];
    delay.forEach((d, i) => {
      this.scene.time.delayedCall(d, () => {
        this.emitConfetti(x + (i - 1) * 50, y, 30);
        this.emitStars(x, y, 5);
      });
    });
    
    // Big burst
    this.emitBurst(x, y, 10);
    
    // Screen shake
    this.scene.cameras.main.shake(200, 0.01);
    
    // Flash effect
    const flash = this.scene.add.image(x, y, 'effect_goal');
    flash.setAlpha(0.8);
    flash.setScale(0.5);
    flash.setDepth(90);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    
    this.scene.tweens.add({
      targets: flash,
      scale: 3,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });
  }
  
  // Tackle impact effect
  tackleImpact(x: number, y: number): void {
    this.emitDust(x, y, 8);
    this.emitBurst(x, y, 4);
    
    // Show tackle effect sprite
    const effect = this.scene.add.image(x, y, 'effect_tackle');
    effect.setAlpha(0.8);
    effect.setScale(0.5);
    effect.setDepth(45);
    
    this.scene.tweens.add({
      targets: effect,
      scale: 1.5,
      alpha: 0,
      rotation: Math.PI / 4,
      duration: 300,
      ease: 'Power2',
      onComplete: () => effect.destroy()
    });
    
    // Small screen shake
    this.scene.cameras.main.shake(100, 0.005);
  }
  
  // Dodge effect
  dodgeEffect(x: number, y: number, angle: number): void {
    const effect = this.scene.add.image(x, y, 'effect_dodge');
    effect.setAlpha(0.7);
    effect.setRotation(angle);
    effect.setDepth(44);
    
    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      scale: 1.5,
      duration: 250,
      ease: 'Power2',
      onComplete: () => effect.destroy()
    });
  }
  
  // Power-up pickup effect
  powerUpEffect(x: number, y: number): void {
    this.emitStars(x, y, 12);
    
    // Expanding ring
    const ring = this.scene.add.graphics();
    ring.lineStyle(4, 0xf1c40f, 1);
    ring.strokeCircle(0, 0, 10);
    ring.setPosition(x, y);
    ring.setDepth(50);
    
    this.scene.tweens.add({
      targets: ring,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => ring.destroy()
    });
  }
  
  // Clean up all emitters
  destroy(): void {
    this.emitters.forEach(emitter => emitter.destroy());
    this.emitters.clear();
  }
}
