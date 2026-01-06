// UpgradeSystem for Stick & Shift
// Manages upgrade effects with event hooks

import Phaser from 'phaser';
import { Upgrade, UpgradeHook, SynergySet, getUpgradeById } from '../data/upgrades';
import { CharacterStats } from '../data/characters';

export interface UpgradeContext {
  player: any;  // Player entity
  ball?: any;   // Ball entity
  target?: any; // Target entity (for tackles, etc.)
  damage?: number;
  position?: { x: number; y: number };
  scene: Phaser.Scene;
}

export interface UpgradeEffect {
  upgradeId: string;
  hook: UpgradeHook;
  callback: (context: UpgradeContext) => void;
}

export class UpgradeSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private ownedUpgrades: Upgrade[] = [];
  private effects: Map<UpgradeHook, UpgradeEffect[]> = new Map();
  private statModifiers: Map<string, number> = new Map();
  private tempModifiers: Map<string, { value: number; expiresAt: number }[]> = new Map();
  private synergyBonuses: Map<SynergySet, number> = new Map();
  
  // Special state trackers
  private stacks: Map<string, number> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private oneTimeUsed: Set<string> = new Set();
  
  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
    this.initializeHooks();
  }
  
  private initializeHooks(): void {
    const hooks: UpgradeHook[] = [
      'onShot', 'onPass', 'onTackle', 'onSteal', 'onGoal', 'onReceive',
      'onDodge', 'onTick', 'onMomentStart', 'onMomentEnd', 'onDamage', 'onHit', 'passive'
    ];
    hooks.forEach(hook => this.effects.set(hook, []));
  }
  
  // Add an upgrade
  addUpgrade(upgrade: Upgrade): void {
    this.ownedUpgrades.push(upgrade);
    
    // Apply passive modifiers
    upgrade.modifiers.forEach(mod => {
      const current = this.statModifiers.get(mod.stat) || 0;
      const value = mod.isPercent ? mod.value : mod.value;
      this.statModifiers.set(mod.stat, current + value);
    });
    
    // Register effect handlers
    upgrade.hooks.forEach(hook => {
      const effect = this.createEffect(upgrade, hook);
      if (effect) {
        this.effects.get(hook)?.push(effect);
      }
    });
    
    // Update synergy bonuses
    upgrade.synergies.forEach(synergy => {
      const count = (this.synergyBonuses.get(synergy) || 0) + 1;
      this.synergyBonuses.set(synergy, count);
    });
    
    this.emit('upgradeAdded', upgrade);
  }
  
  private createEffect(upgrade: Upgrade, hook: UpgradeHook): UpgradeEffect | null {
    const effectId = upgrade.effectId;
    
    // Define effect callbacks based on effectId
    const effectCallbacks: Record<string, (ctx: UpgradeContext) => void> = {
      // Speed effects
      speedBoost10: () => {},  // Handled by stat modifiers
      openSpaceSpeed: (ctx) => {
        // Check if no enemies nearby
        if (ctx.player && this.isInOpenSpace(ctx)) {
          this.addTempModifier('speed', 10, 100);
        }
      },
      pressSpeed: (ctx) => {
        if (ctx.player && !ctx.player.hasBall) {
          this.addTempModifier('speed', 5, 100);
        }
      },
      dodgeSpeedBurst: (ctx) => {
        this.addTempModifier('speed', 15, 2000);
      },
      
      // Shot effects
      circleShot: (ctx) => {
        if (ctx.position && this.isInCircle(ctx.position)) {
          this.addTempModifier('shotPower', 30, 500);
        }
      },
      reboundShotPower: (ctx) => {
        this.addTempModifier('shotPower', 20, 500);
      },
      stationaryShotBoost: (ctx) => {
        if (ctx.player && !ctx.player.isMoving) {
          this.addTempModifier('shotPower', 50, 500);
        }
      },
      chargeShot: (ctx) => {
        // Charge handled in player shoot logic
      },
      curvingShot: (ctx) => {
        // Curve applied in ball physics
        ctx.ball?.setCurve(0.3);
      },
      splitShot: (ctx) => {
        // Create second ball
        this.emit('createProjectile', { ...ctx, power: 0.5 });
      },
      
      // Pass effects
      trianglePassBoost: (ctx) => {
        if (this.checkTriangleFormation(ctx)) {
          this.addTempModifier('passPower', 25, 500);
        }
      },
      fastPass: (ctx) => {
        ctx.ball?.setSpeedMultiplier(1.3);
      },
      boomerangPass: (ctx) => {
        ctx.ball?.setBoomerang(true);
      },
      predictivePass: (ctx) => {
        ctx.ball?.setPredictive(true);
      },
      oneTouchPass: (ctx) => {
        if (ctx.player?.justReceivedBall) {
          this.addTempModifier('passPower', 30, 1000);
        }
      },
      lobPass: (ctx) => {
        ctx.ball?.setAerial(true);
      },
      
      // Tackle effects
      extendedTackle: () => {},  // Handled by stat modifiers
      pressTackleRange: (ctx) => {
        if (!ctx.player?.hasBall) {
          this.addTempModifier('tackleRange', 20, 500);
        }
      },
      counterPressTackle: (ctx) => {
        if (ctx.player?.recentlyLostBall) {
          this.addTempModifier('tackle', 40, 2000);
        }
      },
      tackleReset: () => {
        this.cooldowns.delete('tackle');
      },
      persistentTackle: (ctx) => {
        if (!ctx.target) {  // Failed tackle
          const stacks = (this.stacks.get('persistentTackle') || 0) + 2;
          this.stacks.set('persistentTackle', stacks);
          this.addTempModifier('tackle', stacks, 10000);
        } else {
          this.stacks.set('persistentTackle', 0);
        }
      },
      tackleSlow: (ctx) => {
        ctx.target?.applyDebuff('slow', 2000);
      },
      
      // Steal effects
      magnetSteal: () => {},
      tackleStaminaRestore: (ctx) => {
        ctx.player?.restoreStamina(20);
      },
      stealDodgeReset: () => {
        this.cooldowns.delete('dodge');
      },
      tackleSpeed: (ctx) => {
        this.addTempModifier('speed', 20, 2000);
      },
      stealStamina: (ctx) => {
        ctx.target?.drainStamina(15);
        ctx.player?.restoreStamina(15);
      },
      
      // Dodge effects
      extendedIframes: () => {},
      dodgeDecoy: (ctx) => {
        this.emit('createDecoy', ctx);
      },
      dodgeShield: (ctx) => {
        ctx.player?.addShield(500);
      },
      slowMo: (ctx) => {
        this.scene.time.timeScale = 0.5;
        this.scene.time.delayedCall(500, () => {
          this.scene.time.timeScale = 1;
        });
      },
      
      // Goal effects
      goalSpeedStack: () => {
        const stacks = Math.min((this.stacks.get('goalSpeed') || 0) + 1, 3);
        this.stacks.set('goalSpeed', stacks);
        this.addTempModifier('speed', stacks * 5, 60000);
      },
      goalFullRestore: (ctx) => {
        ctx.player?.restoreStamina(100);
        this.cooldowns.clear();
      },
      
      // Defensive effects
      reducedStun10: () => {},
      stunCap: (ctx) => {
        ctx.player?.setMaxStunDuration(500);
      },
      losingBuff: (ctx) => {
        // Check score in moment system
        this.addTempModifier('all', 30, 100);
      },
      autoBlock: () => {
        if (!this.oneTimeUsed.has('autoBlock')) {
          this.emit('autoBlockGoal');
          this.oneTimeUsed.add('autoBlock');
        }
      },
      knockbackImmune: () => {},
      
      // Tick effects
      ballMagnet: (ctx) => {
        if (ctx.ball && !ctx.player?.hasBall) {
          const dist = Phaser.Math.Distance.Between(
            ctx.player.x, ctx.player.y,
            ctx.ball.x, ctx.ball.y
          );
          if (dist < 100 && dist > 20) {
            ctx.ball.applyMagnet(ctx.player.x, ctx.player.y, 0.02);
          }
        }
      },
      iceTurfEffect: (ctx) => {
        // Apply ice turf physics
        this.emit('iceTurfActive');
      },
      speedTrail: (ctx) => {
        if (ctx.player?.isMoving) {
          this.emit('createSpeedTrail', ctx.position);
        }
      },
      warmUpBuff: (ctx) => {
        // First 10s buff - check moment timer
      },
      coolDownBuff: (ctx) => {
        // Last 10s buff
      },
      teammateBuff: (ctx) => {
        const nearbyCount = this.countNearbyTeammates(ctx);
        this.addTempModifier('all', nearbyCount * 5, 100);
      },
      teamPress: (ctx) => {
        if (ctx.player?.isPressing) {
          this.emit('teammatesPress');
        }
      },
      randomEffects: () => {
        // Random effect every 5s - handled externally
      },
      lowStaminaSpeed: (ctx) => {
        if (ctx.player?.stamina < 30) {
          this.addTempModifier('attackSpeed', 100, 100);
        }
      },
      avatarMode: (ctx) => {
        // Check if behind by 2+ goals
        this.addTempModifier('all', 100, 100);
      },
      
      // Moment effects
      halfTimeStamina: () => {
        // Triggered at moment half
      },
      carrySpeed: () => {
        // 50% of speed bonuses carry over
      },
      guaranteedGoal: () => {
        if (!this.oneTimeUsed.has('guaranteedGoal')) {
          this.emit('guaranteedGoal');
        }
      },
      
      // Passive stat effects
      receiveeControl: () => {},
      homeHalfSpeed: (ctx) => {
        if (ctx.position && ctx.position.x < 600) {
          this.addTempModifier('speed', 8, 100);
        }
      },
      
      // Legendary effects
      unlimitedStamina: () => {},
      timeRewind: () => {
        if (!this.oneTimeUsed.has('timeRewind')) {
          this.emit('timeRewind');
          this.oneTimeUsed.add('timeRewind');
        }
      },
      goldenBoost: () => {},  // Handled by modifiers
      
      // Default
      default: () => {}
    };
    
    const callback = effectCallbacks[effectId] || effectCallbacks.default;
    
    return {
      upgradeId: upgrade.id,
      hook,
      callback
    };
  }
  
  // Trigger a hook
  trigger(hook: UpgradeHook, context: UpgradeContext): void {
    const effects = this.effects.get(hook) || [];
    effects.forEach(effect => {
      try {
        effect.callback(context);
      } catch (e) {
        console.warn(`Error in upgrade effect ${effect.upgradeId}:`, e);
      }
    });
  }
  
  // Get modified stat value
  getModifiedStat(baseStat: number, statName: string): number {
    let modifier = this.statModifiers.get(statName) || 0;
    
    // Add temp modifiers
    const temps = this.tempModifiers.get(statName) || [];
    const now = this.scene.time.now;
    temps.forEach(temp => {
      if (temp.expiresAt > now) {
        modifier += temp.value;
      }
    });
    
    // Clean expired temp modifiers
    this.tempModifiers.set(statName, temps.filter(t => t.expiresAt > now));
    
    return baseStat * (1 + modifier / 100);
  }
  
  // Get all stat modifiers as object
  getAllModifiers(): Record<string, number> {
    const result: Record<string, number> = {};
    this.statModifiers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  
  // Add temporary modifier
  addTempModifier(stat: string, value: number, duration: number): void {
    const temps = this.tempModifiers.get(stat) || [];
    temps.push({
      value,
      expiresAt: this.scene.time.now + duration
    });
    this.tempModifiers.set(stat, temps);
  }
  
  // Check cooldown
  isOnCooldown(action: string): boolean {
    const cd = this.cooldowns.get(action);
    return cd !== undefined && cd > this.scene.time.now;
  }
  
  // Set cooldown
  setCooldown(action: string, duration: number): void {
    // Apply cooldown reduction
    const reduction = this.statModifiers.get('cooldowns') || 0;
    const actualDuration = duration * (1 + reduction / 100);
    this.cooldowns.set(action, this.scene.time.now + actualDuration);
  }
  
  // Get synergy count
  getSynergyCount(synergy: SynergySet): number {
    return this.synergyBonuses.get(synergy) || 0;
  }
  
  // Check if synergy is active (3+ upgrades)
  isSynergyActive(synergy: SynergySet): boolean {
    return this.getSynergyCount(synergy) >= 3;
  }
  
  // Get all active synergies
  getActiveSynergies(): SynergySet[] {
    const active: SynergySet[] = [];
    this.synergyBonuses.forEach((count, synergy) => {
      if (count >= 3) active.push(synergy);
    });
    return active;
  }
  
  // Get owned upgrade IDs
  getOwnedUpgradeIds(): string[] {
    return this.ownedUpgrades.map(u => u.id);
  }
  
  // Get all owned upgrades
  getOwnedUpgrades(): Upgrade[] {
    return [...this.ownedUpgrades];
  }
  
  // Check specific upgrade ownership
  hasUpgrade(upgradeId: string): boolean {
    return this.ownedUpgrades.some(u => u.id === upgradeId);
  }
  
  // Helper methods
  private isInOpenSpace(ctx: UpgradeContext): boolean {
    // Check if no enemies within 150 units
    return true;  // Simplified - actual check would use scene entities
  }
  
  private isInCircle(position: { x: number; y: number }): boolean {
    // Check if position is in shooting circle (D)
    // This is a simplification - real check would use field dimensions
    return position.x < 150 || position.x > 1050;
  }
  
  private checkTriangleFormation(ctx: UpgradeContext): boolean {
    // Check if pass target forms triangle with another teammate
    return true;  // Simplified
  }
  
  private countNearbyTeammates(ctx: UpgradeContext): number {
    // Count teammates within 100 units
    return 1;  // Simplified
  }
  
  // Reset for new run
  reset(): void {
    this.ownedUpgrades = [];
    this.effects.forEach(effects => effects.length = 0);
    this.statModifiers.clear();
    this.tempModifiers.clear();
    this.synergyBonuses.clear();
    this.stacks.clear();
    this.cooldowns.clear();
    this.oneTimeUsed.clear();
  }
  
  // Reset one-time effects for new moment
  resetMoment(): void {
    this.oneTimeUsed.delete('autoBlock');
    this.oneTimeUsed.delete('guaranteedGoal');
  }
}
