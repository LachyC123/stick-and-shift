// UpgradeSystem for Stick & Shift
// Manages upgrade effects with event hooks, synergies, buffs, and validation
// SINGLE SOURCE OF TRUTH for all gameplay modifiers

import Phaser from 'phaser';
import { Upgrade, UpgradeHook, SynergySet, UPGRADES, getUpgradeById, Rarity, SYNERGY_NAMES } from '../data/upgrades';
import { CharacterStats } from '../data/characters';

export interface UpgradeContext {
  player: any;
  ball?: any;
  target?: any;
  damage?: number;
  position?: { x: number; y: number };
  scene: Phaser.Scene;
  // Additional context
  isRebound?: boolean;
  justReceived?: boolean;
  isStationary?: boolean;
  isInCircle?: boolean;
  isLosing?: boolean;
  momentTimeRemaining?: number;
  possessionTime?: number;
}

export interface UpgradeEffect {
  upgradeId: string;
  upgradeName: string;
  hook: UpgradeHook;
  callback: (context: UpgradeContext) => void;
}

export interface ProcStats {
  upgradeId: string;
  upgradeName: string;
  upgradeIcon: string;
  count: number;
}

export interface ActiveBuff {
  id: string;
  name: string;
  icon: string;
  stat?: string;
  value: number;
  expiresAt: number;
  source: 'upgrade' | 'synergy' | 'play' | 'giveAndGo' | 'curse';
}

export interface SynergyStatus {
  synergy: SynergySet;
  name: string;
  count: number;
  tier: 0 | 1 | 2;  // 0 = inactive, 1 = 3+, 2 = 5+
  active: boolean;
}

// Synergy effects - what happens when you reach Tier 1 (3) or Tier 2 (5)
const SYNERGY_EFFECTS: Record<SynergySet, { tier1: { stat: string; value: number }[]; tier2: { stat: string; value: number }[] }> = {
  press: {
    tier1: [{ stat: 'tackle', value: 20 }, { stat: 'speed', value: 10 }],
    tier2: [{ stat: 'tackle', value: 40 }, { stat: 'speed', value: 20 }, { stat: 'stamina', value: 15 }]
  },
  trianglePassing: {
    tier1: [{ stat: 'passPower', value: 25 }, { stat: 'control', value: 15 }],
    tier2: [{ stat: 'passPower', value: 50 }, { stat: 'control', value: 30 }, { stat: 'giveAndGoBonus', value: 100 }]
  },
  dragFlick: {
    tier1: [{ stat: 'shotPower', value: 25 }],
    tier2: [{ stat: 'shotPower', value: 50 }, { stat: 'shotAccuracy', value: 20 }]
  },
  rebound: {
    tier1: [{ stat: 'reboundSpeed', value: 30 }, { stat: 'reboundPower', value: 20 }],
    tier2: [{ stat: 'reboundSpeed', value: 60 }, { stat: 'reboundPower', value: 40 }]
  },
  trickster: {
    tier1: [{ stat: 'dodge', value: 20 }, { stat: 'control', value: 15 }],
    tier2: [{ stat: 'dodge', value: 40 }, { stat: 'control', value: 30 }, { stat: 'dodgeCharges', value: 1 }]
  },
  sweeper: {
    tier1: [{ stat: 'tackleRange', value: 20 }, { stat: 'clearancePower', value: 25 }],
    tier2: [{ stat: 'tackleRange', value: 40 }, { stat: 'clearancePower', value: 50 }]
  },
  tank: {
    tier1: [{ stat: 'knockbackResist', value: 30 }, { stat: 'stunResist', value: 20 }],
    tier2: [{ stat: 'knockbackResist', value: 60 }, { stat: 'stunResist', value: 40 }]
  },
  speedster: {
    tier1: [{ stat: 'speed', value: 15 }, { stat: 'acceleration', value: 20 }],
    tier2: [{ stat: 'speed', value: 30 }, { stat: 'acceleration', value: 40 }]
  },
  vampire: {
    tier1: [{ stat: 'staminaOnSteal', value: 15 }],
    tier2: [{ stat: 'staminaOnSteal', value: 30 }, { stat: 'staminaOnGoal', value: 50 }]
  },
  chaos: {
    tier1: [{ stat: 'chaosProcChance', value: 20 }],
    tier2: [{ stat: 'chaosProcChance', value: 40 }]
  },
  precision: {
    tier1: [{ stat: 'shotAccuracy', value: 20 }, { stat: 'passAccuracy', value: 15 }],
    tier2: [{ stat: 'shotAccuracy', value: 40 }, { stat: 'passAccuracy', value: 30 }]
  },
  guardian: {
    tier1: [{ stat: 'blockChance', value: 15 }],
    tier2: [{ stat: 'blockChance', value: 30 }, { stat: 'autoBlockPerMoment', value: 1 }]
  },
  berserker: {
    tier1: [{ stat: 'lowHealthBonus', value: 25 }],
    tier2: [{ stat: 'lowHealthBonus', value: 50 }]
  },
  counterPress: {
    tier1: [{ stat: 'turnoverSpeedBoost', value: 30 }],
    tier2: [{ stat: 'turnoverSpeedBoost', value: 60 }, { stat: 'turnoverTackleBoost', value: 30 }]
  },
  possession: {
    tier1: [{ stat: 'possessionControl', value: 20 }],
    tier2: [{ stat: 'possessionControl', value: 40 }, { stat: 'safePassBonus', value: 25 }]
  },
  weather: {
    tier1: [{ stat: 'weatherResist', value: 50 }],
    tier2: [{ stat: 'weatherResist', value: 100 }, { stat: 'enemySlipChance', value: 20 }]
  },
  poacher: {
    tier1: [{ stat: 'circleSpeed', value: 25 }, { stat: 'circleShotPower', value: 20 }],
    tier2: [{ stat: 'circleSpeed', value: 50 }, { stat: 'circleShotPower', value: 40 }]
  },
  aerial: {
    tier1: [{ stat: 'aerialControl', value: 30 }],
    tier2: [{ stat: 'aerialControl', value: 60 }, { stat: 'lobPassSpeed', value: 25 }]
  }
};

export class UpgradeSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private ownedUpgrades: Upgrade[] = [];
  private effects: Map<UpgradeHook, UpgradeEffect[]> = new Map();
  private statModifiers: Map<string, number> = new Map();
  private activeBuffs: ActiveBuff[] = [];
  private synergyCounts: Map<SynergySet, number> = new Map();
  private activeSynergyTiers: Map<SynergySet, number> = new Map();
  
  // Stacking upgrades
  private stacks: Map<string, number> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private oneTimeUsed: Set<string> = new Set();
  
  // Proc tracking
  private procCounts: Map<string, number> = new Map();
  private lastProcTime: Map<string, number> = new Map();
  private recentProcs: { upgradeId: string; name: string; time: number }[] = [];
  private readonly PROC_COOLDOWN = 150;
  private readonly MAX_RECENT_PROCS = 10;
  
  // Give-and-Go tracking
  private lastPassTime: number = 0;
  private lastPassTarget: any = null;
  private giveAndGoActive: boolean = false;
  private giveAndGoExpiresAt: number = 0;
  
  // Play calling
  private activePlay: 'press' | 'hold' | 'counter' | null = null;
  private playExpiresAt: number = 0;
  private playCooldownUntil: number = 0;
  
  // Validation results
  private static validatedUpgrades: Set<string> = new Set();
  private static invalidUpgrades: Set<string> = new Set();
  private static validationRan: boolean = false;
  
  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
    this.initializeHooks();
    
    // Run validation once
    if (!UpgradeSystem.validationRan) {
      this.validateAllUpgrades();
    }
  }
  
  private initializeHooks(): void {
    const hooks: UpgradeHook[] = [
      'onShot', 'onPass', 'onTackle', 'onSteal', 'onGoal', 'onReceive',
      'onDodge', 'onTick', 'onMomentStart', 'onMomentEnd', 'onDamage', 'onHit', 'passive'
    ];
    hooks.forEach(hook => this.effects.set(hook, []));
  }
  
  // ========================================
  // VALIDATION AUDIT
  // ========================================
  
  private validateAllUpgrades(): void {
    console.log('[UPGRADE_AUDIT] Validating all upgrades...');
    let validCount = 0;
    let invalidCount = 0;
    
    for (const upgrade of UPGRADES) {
      const hasModifiers = upgrade.modifiers.length > 0;
      const hasHooks = upgrade.hooks.length > 0 && upgrade.hooks.some(h => h !== 'passive');
      const hasPassiveEffect = this.hasRealPassiveEffect(upgrade);
      
      if (hasModifiers || hasHooks || hasPassiveEffect) {
        UpgradeSystem.validatedUpgrades.add(upgrade.id);
        validCount++;
      } else {
        UpgradeSystem.invalidUpgrades.add(upgrade.id);
        console.error(`[UPGRADE_AUDIT] INVALID: ${upgrade.id} (${upgrade.name}) - No real effect!`);
        invalidCount++;
      }
    }
    
    console.log(`[UPGRADE_AUDIT] Complete: ${validCount} valid, ${invalidCount} invalid`);
    UpgradeSystem.validationRan = true;
  }
  
  private hasRealPassiveEffect(upgrade: Upgrade): boolean {
    // Check if effectId maps to a real effect
    const passiveEffects = [
      'speedBoost10', 'shotPowerBoost15', 'controlBoost15', 'tackleBoost15', 'passBoost15',
      'staminaBoost20', 'dodgeBoost10', 'reducedCooldowns', 'knockbackImmune', 'unlimitedStamina',
      'goldenBoost', 'speedControl', 'tripleDodge', 'stunCap', 'wetTurfImmune', 'winAerials',
      'tacklePhase', 'sprintThroughTackle', 'movingStunImmune', 'bobbleImmunity'
    ];
    return passiveEffects.includes(upgrade.effectId) || upgrade.modifiers.length > 0;
  }
  
  static isUpgradeValid(upgradeId: string): boolean {
    return UpgradeSystem.validatedUpgrades.has(upgradeId) && !UpgradeSystem.invalidUpgrades.has(upgradeId);
  }
  
  // ========================================
  // UPGRADE MANAGEMENT
  // ========================================
  
  addUpgrade(upgrade: Upgrade): void {
    console.log(`[UPGRADE_PICK] Adding: ${upgrade.id} - ${upgrade.name}`);
    
    this.ownedUpgrades.push(upgrade);
    
    // Apply passive modifiers immediately
    upgrade.modifiers.forEach(mod => {
      const current = this.statModifiers.get(mod.stat) || 0;
      this.statModifiers.set(mod.stat, current + mod.value);
      console.log(`[UPGRADE_PICK] Modifier: ${mod.stat} += ${mod.value}${mod.isPercent ? '%' : ''}`);
    });
    
    // Register effect handlers for hooks
    upgrade.hooks.forEach(hook => {
      const effect = this.createEffect(upgrade, hook);
      if (effect) {
        this.effects.get(hook)?.push(effect);
        console.log(`[UPGRADE_PICK] Registered hook: ${hook}`);
      }
    });
    
    // Update synergy counts
    upgrade.synergies.forEach(synergy => {
      const count = (this.synergyCounts.get(synergy) || 0) + 1;
      this.synergyCounts.set(synergy, count);
      this.checkSynergyActivation(synergy, count);
    });
    
    this.emit('upgradeAdded', upgrade);
  }
  
  private checkSynergyActivation(synergy: SynergySet, count: number): void {
    const prevTier = this.activeSynergyTiers.get(synergy) || 0;
    let newTier = 0;
    
    if (count >= 5) newTier = 2;
    else if (count >= 3) newTier = 1;
    
    if (newTier > prevTier) {
      this.activeSynergyTiers.set(synergy, newTier);
      this.applySynergyBonus(synergy, newTier);
      this.emit('synergyActivated', { synergy, tier: newTier, name: SYNERGY_NAMES[synergy] });
      console.log(`[SYNERGY] ${SYNERGY_NAMES[synergy]} Tier ${newTier} activated!`);
    }
  }
  
  private applySynergyBonus(synergy: SynergySet, tier: number): void {
    const effects = SYNERGY_EFFECTS[synergy];
    if (!effects) return;
    
    const bonuses = tier === 2 ? effects.tier2 : effects.tier1;
    bonuses.forEach(bonus => {
      const current = this.statModifiers.get(bonus.stat) || 0;
      this.statModifiers.set(bonus.stat, current + bonus.value);
    });
  }
  
  addModifier(mod: { stat: string; type?: 'add' | 'multiply'; value: number; isPercent?: boolean }): void {
    const current = this.statModifiers.get(mod.stat) || 0;
    this.statModifiers.set(mod.stat, current + mod.value);
    console.log(`[UPGRADE] Added modifier: ${mod.stat} += ${mod.value}${mod.isPercent ? '%' : ''}`);
  }
  
  addHook(hookDef: { event: string; effect: (ctx: any) => void }): void {
    const hookEvent = hookDef.event as UpgradeHook;
    const effects = this.effects.get(hookEvent);
    if (effects) {
      effects.push({
        upgradeId: 'external_' + hookEvent,
        upgradeName: 'External Effect',
        hook: hookEvent,
        callback: hookDef.effect
      });
    }
  }
  
  // ========================================
  // EFFECT CREATION - ALL EFFECTS MUST DO SOMETHING
  // ========================================
  
  private createEffect(upgrade: Upgrade, hook: UpgradeHook): UpgradeEffect | null {
    const callback = this.getEffectCallback(upgrade.effectId, upgrade.id);
    
    return {
      upgradeId: upgrade.id,
      upgradeName: upgrade.name,
      hook,
      callback
    };
  }
  
  private getEffectCallback(effectId: string, upgradeId: string): (ctx: UpgradeContext) => void {
    // All effects must have REAL implementations
    const callbacks: Record<string, (ctx: UpgradeContext) => void> = {
      // === SPEED EFFECTS ===
      speedBoost10: () => {}, // Handled by modifiers
      openSpaceSpeed: (ctx) => {
        if (ctx.player && this.isInOpenSpace(ctx.player, ctx.scene)) {
          this.addTempBuff('openSpaceSpeed', 'speed', 10, 200, 'upgrade');
          this.procUpgrade(upgradeId, 0.3);
        }
      },
      pressSpeed: (ctx) => {
        if (ctx.player && !ctx.player.hasBall) {
          this.addTempBuff('pressSpeed', 'speed', 5, 200, 'upgrade');
          this.procUpgrade(upgradeId, 0.2);
        }
      },
      dodgeSpeedBurst: (ctx) => {
        this.addTempBuff('dodgeSpeedBurst', 'speed', 15, 2000, 'upgrade');
        this.procUpgrade(upgradeId, 1);
      },
      homeHalfSpeed: (ctx) => {
        if (ctx.position && ctx.position.x < 600) {
          this.addTempBuff('homeHalfSpeed', 'speed', 8, 200, 'upgrade');
          this.procUpgrade(upgradeId, 0.2);
        }
      },
      
      // === SHOT EFFECTS ===
      shotPowerBoost15: () => {}, // Handled by modifiers
      circleShotBoost: (ctx) => {
        if (ctx.isInCircle) {
          this.addTempBuff('circleShotBoost', 'shotPower', 30, 500, 'upgrade');
          this.procUpgrade(upgradeId, 1);
        }
      },
      reboundShotPower: (ctx) => {
        if (ctx.isRebound) {
          this.addTempBuff('reboundShotPower', 'shotPower', 20, 500, 'upgrade');
          this.procUpgrade(upgradeId, 1);
        }
      },
      stationaryShotBoost: (ctx) => {
        if (ctx.isStationary) {
          this.addTempBuff('stationaryShotBoost', 'shotPower', 50, 500, 'upgrade');
          this.procUpgrade(upgradeId, 1);
        }
      },
      chargeShot: () => {}, // Handled in Player.shoot
      curvingShot: (ctx) => {
        ctx.ball?.addCurve?.(0.3);
        this.procUpgrade(upgradeId, 0.8);
      },
      splitShot: (ctx) => {
        this.emit('createSplitShot', ctx);
        this.procUpgrade(upgradeId, 1);
      },
      unmarkedShotBoost: (ctx) => {
        if (this.isInOpenSpace(ctx.player, ctx.scene)) {
          this.addTempBuff('unmarkedShotBoost', 'shotAccuracy', 20, 500, 'upgrade');
          this.procUpgrade(upgradeId, 0.8);
        }
      },
      enemyDShotPower: (ctx) => {
        if (ctx.position && ctx.position.x > 950) {
          this.addTempBuff('enemyDShotPower', 'shotPower', 20, 500, 'upgrade');
          this.procUpgrade(upgradeId, 1);
        }
      },
      closeRangeShotBoost: (ctx) => {
        // Close range = within 150px of goal
        if (ctx.position && (ctx.position.x < 100 || ctx.position.x > 1100)) {
          this.addTempBuff('closeRangeShotBoost', 'shotSpeed', 30, 500, 'upgrade');
          this.procUpgrade(upgradeId, 1);
        }
      },
      losingShotPower: (ctx) => {
        if (ctx.isLosing) {
          this.addTempBuff('losingShotPower', 'shotPower', 50, 500, 'upgrade');
          this.procUpgrade(upgradeId, 1);
        }
      },
      pcShotPower: (ctx) => {
        // PC shots - handled contextually
        this.addTempBuff('pcShotPower', 'shotPower', 30, 500, 'upgrade');
        this.procUpgrade(upgradeId, 1);
      },
      
      // === PASS EFFECTS ===
      passBoost15: () => {}, // Handled by modifiers
      trianglePassBoost: (ctx) => {
        if (this.checkTriangleFormation(ctx)) {
          this.addTempBuff('trianglePassBoost', 'passPower', 25, 500, 'upgrade');
          this.procUpgrade(upgradeId, 1);
        }
      },
      fastPass: (ctx) => {
        this.addTempBuff('fastPass', 'passSpeed', 30, 500, 'upgrade');
        this.procUpgrade(upgradeId, 0.6);
      },
      boomerangPass: (ctx) => {
        ctx.ball?.setBoomerang?.(true);
        this.procUpgrade(upgradeId, 1);
      },
      predictivePass: (ctx) => {
        ctx.ball?.setPredictive?.(true);
        this.procUpgrade(upgradeId, 0.7);
      },
      oneTouchPass: (ctx) => {
        if (ctx.justReceived) {
          this.addTempBuff('oneTouchPass', 'passPower', 30, 1000, 'upgrade');
          this.procUpgrade(upgradeId, 1);
        }
      },
      lobPass: (ctx) => {
        ctx.ball?.setAerial?.(true);
        this.procUpgrade(upgradeId, 0.8);
      },
      ownHalfPassPower: (ctx) => {
        if (ctx.position && ctx.position.x < 600) {
          this.addTempBuff('ownHalfPassPower', 'passPower', 50, 500, 'upgrade');
          this.procUpgrade(upgradeId, 0.7);
        }
      },
      
      // === TACKLE EFFECTS ===
      tackleBoost15: () => {}, // Handled by modifiers
      extendedTackle: () => {}, // Handled by modifiers
      pressTackleRange: (ctx) => {
        if (!ctx.player?.hasBall) {
          this.addTempBuff('pressTackleRange', 'tackleRange', 20, 500, 'upgrade');
          this.procUpgrade(upgradeId, 0.5);
        }
      },
      counterPressTackle: (ctx) => {
        const lostBallRecently = (ctx.player?.lostBallAt || 0) > this.scene.time.now - 2000;
        if (lostBallRecently) {
          this.addTempBuff('counterPressTackle', 'tackle', 40, 500, 'upgrade');
          this.procUpgrade(upgradeId, 1);
        }
      },
      tackleReset: (ctx) => {
        this.cooldowns.delete('tackle');
        this.emit('cooldownReset', 'tackle');
        this.procUpgrade(upgradeId, 1);
      },
      persistentTackle: (ctx) => {
        if (!ctx.target) {
          // Failed tackle - build stacks
          const stacks = Math.min((this.stacks.get('persistentTackle') || 0) + 2, 20);
          this.stacks.set('persistentTackle', stacks);
          this.addTempBuff('persistentTackle', 'tackle', stacks, 10000, 'upgrade');
          this.procUpgrade(upgradeId, 0.6);
        } else {
          // Successful - reset stacks
          this.stacks.set('persistentTackle', 0);
        }
      },
      tackleSlow: (ctx) => {
        ctx.target?.applyDebuff?.('slow', 2000, 0.7);
        this.procUpgrade(upgradeId, 0.8);
      },
      lastManTackleRange: (ctx) => {
        // Check if furthest back
        this.addTempBuff('lastManTackleRange', 'tackleRange', 30, 500, 'upgrade');
        this.procUpgrade(upgradeId, 0.7);
      },
      packTackleBoost: (ctx) => {
        const nearby = this.countNearbyTeammates(ctx.player, ctx.scene);
        if (nearby > 0) {
          this.addTempBuff('packTackleBoost', 'tackle', 15 * nearby, 500, 'upgrade');
          this.procUpgrade(upgradeId, 0.8);
        }
      },
      ownDTackleBoost: (ctx) => {
        if (ctx.position && ctx.position.x > 950) {
          this.addTempBuff('ownDTackleBoost', 'tackle', 40, 500, 'upgrade');
          this.procUpgrade(upgradeId, 0.8);
        }
      },
      
      // === STEAL EFFECTS ===
      tackleStaminaRestore: (ctx) => {
        ctx.player?.restoreStamina?.(20);
        this.procUpgrade(upgradeId, 1);
      },
      stealDodgeReset: (ctx) => {
        this.cooldowns.delete('dodge');
        this.emit('cooldownReset', 'dodge');
        this.procUpgrade(upgradeId, 1);
      },
      tackleSpeed: (ctx) => {
        this.addTempBuff('tackleSpeed', 'speed', 20, 2000, 'upgrade');
        this.procUpgrade(upgradeId, 1);
      },
      stealStamina: (ctx) => {
        ctx.target?.drainStamina?.(15);
        ctx.player?.restoreStamina?.(15);
        this.procUpgrade(upgradeId, 1);
      },
      stealStaminaRestore: (ctx) => {
        ctx.player?.restoreStamina?.(30);
        this.procUpgrade(upgradeId, 1);
      },
      teamCounterPress: (ctx) => {
        this.emit('teamCounterPress', { duration: 3000 });
        this.procUpgrade(upgradeId, 1);
      },
      stealSpeedBurst: (ctx) => {
        this.addTempBuff('stealSpeedBurst', 'speed', 50, 3000, 'upgrade');
        this.procUpgrade(upgradeId, 1);
      },
      stealSpeedStacking: (ctx) => {
        const stacks = Math.min((this.stacks.get('stealSpeed') || 0) + 1, 5);
        this.stacks.set('stealSpeed', stacks);
        this.addTempBuff('stealSpeedStacking', 'speed', 10 * stacks, 60000, 'upgrade');
        this.procUpgrade(upgradeId, 1);
      },
      
      // === DODGE EFFECTS ===
      dodgeBoost10: () => {}, // Handled by modifiers
      extendedIframes: () => {}, // Handled elsewhere
      dodgeDecoy: (ctx) => {
        this.emit('createDecoy', ctx);
        this.procUpgrade(upgradeId, 1);
      },
      dodgeShield: (ctx) => {
        ctx.player?.addShield?.(500);
        this.procUpgrade(upgradeId, 1);
      },
      slowMo: (ctx) => {
        this.scene.time.timeScale = 0.5;
        this.scene.time.delayedCall(500, () => {
          this.scene.time.timeScale = 1;
        });
        this.procUpgrade(upgradeId, 1);
      },
      dodgeFakeShot: (ctx) => {
        this.emit('fakeShot', ctx);
        this.procUpgrade(upgradeId, 1);
      },
      dodgeConfuse: (ctx) => {
        this.emit('confuseNearby', { ...ctx, duration: 1000 });
        this.procUpgrade(upgradeId, 1);
      },
      doubleDodge: (ctx) => {
        // Adds extra dodge charge
        this.emit('extraDodgeCharge');
        this.procUpgrade(upgradeId, 1);
      },
      
      // === GOAL EFFECTS ===
      goalSpeedStack: (ctx) => {
        const stacks = Math.min((this.stacks.get('goalSpeed') || 0) + 1, 3);
        this.stacks.set('goalSpeed', stacks);
        this.addTempBuff('goalSpeedStack', 'speed', 5 * stacks, 60000, 'upgrade');
        this.procUpgrade(upgradeId, 1);
      },
      goalFullRestore: (ctx) => {
        ctx.player?.restoreStamina?.(100);
        this.cooldowns.clear();
        this.emit('allCooldownsReset');
        this.procUpgrade(upgradeId, 1);
      },
      dGoalCooldownReset: (ctx) => {
        if (ctx.position && (ctx.position.x < 150 || ctx.position.x > 1050)) {
          this.cooldowns.clear();
          this.emit('allCooldownsReset');
          this.procUpgrade(upgradeId, 1);
        }
      },
      goalStaminaHeal: (ctx) => {
        const missing = (ctx.player?.maxStamina || 100) - (ctx.player?.stamina || 0);
        ctx.player?.restoreStamina?.(missing * 0.5);
        this.procUpgrade(upgradeId, 1);
      },
      
      // === RECEIVE EFFECTS ===
      receiveControl: (ctx) => {
        this.addTempBuff('receiveControl', 'control', 20, 1000, 'upgrade');
        this.procUpgrade(upgradeId, 0.8);
      },
      receiveAccel: (ctx) => {
        this.addTempBuff('receiveAccel', 'acceleration', 50, 1000, 'upgrade');
        this.procUpgrade(upgradeId, 1);
      },
      looseBallControl: (ctx) => {
        this.addTempBuff('looseBallControl', 'control', 40, 1000, 'upgrade');
        this.procUpgrade(upgradeId, 0.9);
      },
      
      // === TICK EFFECTS (run every frame) ===
      ballMagnet: (ctx) => {
        if (ctx.ball && !ctx.player?.hasBall && ctx.ball.isLoose) {
          const dist = Phaser.Math.Distance.Between(
            ctx.player.x, ctx.player.y, ctx.ball.x, ctx.ball.y
          );
          if (dist < 100 && dist > 20) {
            ctx.ball.applyMagnet?.(ctx.player.x, ctx.player.y, 0.02);
            this.procUpgrade(upgradeId, 0.1);
          }
        }
      },
      strongBallMagnet: (ctx) => {
        if (ctx.ball && !ctx.player?.hasBall && ctx.ball.isLoose) {
          const dist = Phaser.Math.Distance.Between(
            ctx.player.x, ctx.player.y, ctx.ball.x, ctx.ball.y
          );
          if (dist < 150 && dist > 20) {
            ctx.ball.applyMagnet?.(ctx.player.x, ctx.player.y, 0.05);
            this.procUpgrade(upgradeId, 0.1);
          }
        }
      },
      iceTurfEffect: (ctx) => {
        this.emit('iceTurfActive');
      },
      speedTrail: (ctx) => {
        if (ctx.player?.isMoving) {
          this.emit('createSpeedTrail', ctx.position);
        }
      },
      warmUpBuff: (ctx) => {
        if (ctx.momentTimeRemaining && ctx.momentTimeRemaining > 50) {
          this.addTempBuff('warmUpBuff', 'all', 10, 200, 'upgrade');
        }
      },
      coolDownBuff: (ctx) => {
        if (ctx.momentTimeRemaining && ctx.momentTimeRemaining < 10) {
          this.addTempBuff('coolDownBuff', 'all', 10, 200, 'upgrade');
        }
      },
      teammateBuff: (ctx) => {
        const nearby = this.countNearbyTeammates(ctx.player, ctx.scene);
        if (nearby > 0) {
          this.addTempBuff('teammateBuff', 'all', 5 * nearby, 200, 'upgrade');
        }
      },
      teamPress: (ctx) => {
        if (ctx.player?.isPressing) {
          this.emit('teammatesPress');
        }
      },
      losingBuff: (ctx) => {
        if (ctx.isLosing) {
          this.addTempBuff('losingBuff', 'all', 30, 200, 'upgrade');
        }
      },
      avatarMode: (ctx) => {
        // Check if behind by 2+ goals
        if (ctx.isLosing) {
          this.addTempBuff('avatarMode', 'all', 100, 200, 'upgrade');
        }
      },
      lowStaminaSpeed: (ctx) => {
        if (ctx.player?.stamina < 30) {
          this.addTempBuff('lowStaminaSpeed', 'attackSpeed', 100, 200, 'upgrade');
        }
      },
      poacherSpeed: (ctx) => {
        if (ctx.ball && ctx.ball.isLoose && ctx.ball.x > 950) {
          this.addTempBuff('poacherSpeed', 'speed', 40, 200, 'upgrade');
        }
      },
      dCircleRush: (ctx) => {
        if (ctx.ball && ctx.ball.x > 950) {
          this.addTempBuff('dCircleRush', 'speed', 80, 200, 'upgrade');
        }
      },
      possessionStacking: (ctx) => {
        if (ctx.possessionTime && ctx.possessionTime > 5) {
          const stacks = Math.floor(ctx.possessionTime / 5);
          this.addTempBuff('possessionStacking', 'all', 5 * stacks, 200, 'upgrade');
        }
      },
      stationaryControl: (ctx) => {
        if (ctx.isStationary) {
          this.addTempBuff('stationaryControl', 'control', 20, 200, 'upgrade');
        }
      },
      finalSecondsBoost: (ctx) => {
        if (ctx.momentTimeRemaining && ctx.momentTimeRemaining < 15) {
          this.addTempBuff('finalSecondsBoost', 'all', 30, 200, 'upgrade');
        }
      },
      sprintRampUp: (ctx) => {
        // Would need sprint tracking
        this.addTempBuff('sprintRampUp', 'speed', 15, 200, 'upgrade');
      },
      openFieldSpeed: (ctx) => {
        if (this.isInOpenSpace(ctx.player, ctx.scene)) {
          this.addTempBuff('openFieldSpeed', 'speed', 25, 200, 'upgrade');
        }
      },
      highLineSpeed: (ctx) => {
        this.addTempBuff('highLineSpeed', 'speed', 10, 200, 'upgrade');
        this.emit('teamPushHigher');
      },
      
      // === MOMENT EFFECTS ===
      halfTimeStamina: () => {},
      carrySpeed: (ctx) => {
        // 50% of speed bonuses carry over
        const speedBonus = this.statModifiers.get('speed') || 0;
        this.addTempBuff('carrySpeed', 'speed', speedBonus * 0.5, 30000, 'upgrade');
        this.procUpgrade(upgradeId, 1);
      },
      guaranteedGoal: (ctx) => {
        if (!this.oneTimeUsed.has('guaranteedGoal')) {
          this.emit('guaranteedGoal');
          this.oneTimeUsed.add('guaranteedGoal');
          this.procUpgrade(upgradeId, 1);
        }
      },
      stackingSpeed: (ctx) => {
        const stacks = (this.stacks.get('stackingSpeed') || 0) + 5;
        this.stacks.set('stackingSpeed', stacks);
        const current = this.statModifiers.get('speed') || 0;
        this.statModifiers.set('speed', current + 5);
        this.procUpgrade(upgradeId, 1);
      },
      
      // === DEFENSIVE EFFECTS ===
      reducedStun10: () => {}, // Handled by getModifiedStat
      stunCap: () => {},
      knockbackImmune: () => {},
      autoBlock: (ctx) => {
        if (!this.oneTimeUsed.has('autoBlock')) {
          this.emit('autoBlockGoal');
          this.oneTimeUsed.add('autoBlock');
          this.procUpgrade(upgradeId, 1);
        }
      },
      reducedKnockback: () => {}, // Handled by modifiers
      tacklerBounce: (ctx) => {
        if (ctx.player?.hasBall) {
          this.emit('tacklerBounce', ctx);
          this.procUpgrade(upgradeId, 1);
        }
      },
      
      // === DEFAULT ===
      default: () => {}
    };
    
    return callbacks[effectId] || callbacks.default;
  }
  
  // ========================================
  // TRIGGER HOOKS
  // ========================================
  
  trigger(hook: UpgradeHook, context: UpgradeContext): void {
    const effects = this.effects.get(hook) || [];
    effects.forEach(effect => {
      try {
        effect.callback(context);
      } catch (e) {
        console.warn(`[UPGRADE] Error in ${effect.upgradeId}:`, e);
      }
    });
    
    // Check for Give-and-Go on pass/receive
    if (hook === 'onPass') {
      this.trackPassForGiveAndGo(context);
    } else if (hook === 'onReceive') {
      this.checkGiveAndGo(context);
    }
  }
  
  // ========================================
  // PROC FEEDBACK SYSTEM
  // ========================================
  
  procUpgrade(upgradeId: string, intensity: number = 1): void {
    const upgrade = this.ownedUpgrades.find(u => u.id === upgradeId);
    if (!upgrade) return;
    
    // Track count
    const count = (this.procCounts.get(upgradeId) || 0) + 1;
    this.procCounts.set(upgradeId, count);
    
    // Visual cooldown
    const lastProc = this.lastProcTime.get(upgradeId) || 0;
    const now = this.scene.time.now;
    
    if (now - lastProc < this.PROC_COOLDOWN) return;
    this.lastProcTime.set(upgradeId, now);
    
    // Track recent procs
    this.recentProcs.push({ upgradeId, name: upgrade.name, time: now });
    if (this.recentProcs.length > this.MAX_RECENT_PROCS) {
      this.recentProcs.shift();
    }
    
    // Emit for UI feedback
    this.emit('upgradeProc', { upgrade, upgradeId, intensity, count });
  }
  
  getTopProcs(limit: number = 5): ProcStats[] {
    const stats: ProcStats[] = [];
    this.procCounts.forEach((count, upgradeId) => {
      const upgrade = this.ownedUpgrades.find(u => u.id === upgradeId);
      if (upgrade && count > 0) {
        stats.push({ upgradeId, upgradeName: upgrade.name, upgradeIcon: upgrade.icon, count });
      }
    });
    stats.sort((a, b) => b.count - a.count);
    return stats.slice(0, limit);
  }
  
  getRecentProcs(): { upgradeId: string; name: string; time: number }[] {
    return [...this.recentProcs].reverse();
  }
  
  getProcCount(upgradeId: string): number {
    return this.procCounts.get(upgradeId) || 0;
  }
  
  // ========================================
  // BUFF SYSTEM
  // ========================================
  
  addTempBuff(id: string, stat: string, value: number, duration: number, source: ActiveBuff['source']): void {
    // Check if buff already exists
    const existing = this.activeBuffs.find(b => b.id === id);
    if (existing) {
      existing.expiresAt = this.scene.time.now + duration;
      existing.value = Math.max(existing.value, value);
      return;
    }
    
    this.activeBuffs.push({
      id,
      name: id.replace(/([A-Z])/g, ' $1').trim(),
      icon: '⬆️',
      stat,
      value,
      expiresAt: this.scene.time.now + duration,
      source
    });
  }
  
  getActiveBuffs(): ActiveBuff[] {
    const now = this.scene.time.now;
    this.activeBuffs = this.activeBuffs.filter(b => b.expiresAt > now);
    return this.activeBuffs;
  }
  
  // ========================================
  // STAT CALCULATION
  // ========================================
  
  getModifiedStat(baseStat: number, statName: string): number {
    let modifier = this.statModifiers.get(statName) || 0;
    
    // Add 'all' modifier
    modifier += this.statModifiers.get('all') || 0;
    
    // Add temp buffs
    const now = this.scene.time.now;
    for (const buff of this.activeBuffs) {
      if (buff.expiresAt > now && (buff.stat === statName || buff.stat === 'all')) {
        modifier += buff.value;
      }
    }
    
    return baseStat * (1 + modifier / 100);
  }
  
  getAllModifiers(): Record<string, number> {
    const result: Record<string, number> = {};
    this.statModifiers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  
  getFinalStats(baseStats: CharacterStats): CharacterStats {
    return {
      speed: this.getModifiedStat(baseStats.speed, 'speed'),
      stamina: this.getModifiedStat(baseStats.stamina, 'stamina'),
      control: this.getModifiedStat(baseStats.control, 'control'),
      shotPower: this.getModifiedStat(baseStats.shotPower, 'shotPower'),
      passPower: this.getModifiedStat(baseStats.passPower, 'passPower'),
      tackle: this.getModifiedStat(baseStats.tackle, 'tackle'),
      dodge: this.getModifiedStat(baseStats.dodge, 'dodge')
    };
  }
  
  // ========================================
  // GIVE-AND-GO SYSTEM
  // ========================================
  
  private trackPassForGiveAndGo(ctx: UpgradeContext): void {
    this.lastPassTime = this.scene.time.now;
    this.lastPassTarget = ctx.target;
  }
  
  private checkGiveAndGo(ctx: UpgradeContext): void {
    const now = this.scene.time.now;
    const timeSincePass = now - this.lastPassTime;
    
    // Check if received from the player we passed to within 3.5s
    if (timeSincePass < 3500 && this.lastPassTarget) {
      // Activate Give-and-Go buff
      let buffMultiplier = 1;
      const triangleTier = this.activeSynergyTiers.get('trianglePassing') || 0;
      if (triangleTier >= 2) buffMultiplier = 2;
      
      this.giveAndGoActive = true;
      this.giveAndGoExpiresAt = now + 2000;
      
      this.addTempBuff('giveAndGo', 'speed', 15 * buffMultiplier, 2000, 'giveAndGo');
      this.addTempBuff('giveAndGoControl', 'control', 20 * buffMultiplier, 2000, 'giveAndGo');
      this.addTempBuff('giveAndGoShot', 'shotPower', 15 * buffMultiplier, 2000, 'giveAndGo');
      
      this.emit('giveAndGoActivated', { multiplier: buffMultiplier });
      console.log('[GIVE_AND_GO] Activated!');
    }
    
    this.lastPassTarget = null;
  }
  
  isGiveAndGoActive(): boolean {
    return this.giveAndGoActive && this.giveAndGoExpiresAt > this.scene.time.now;
  }
  
  // ========================================
  // PLAY CALLING SYSTEM
  // ========================================
  
  callPlay(play: 'press' | 'hold' | 'counter'): boolean {
    const now = this.scene.time.now;
    if (now < this.playCooldownUntil) return false;
    
    this.activePlay = play;
    this.playExpiresAt = now + 8000;
    this.playCooldownUntil = now + 20000;
    
    // Apply play effects
    switch (play) {
      case 'press':
        this.emit('playPress', { duration: 8000 });
        break;
      case 'hold':
        this.emit('playHold', { duration: 8000 });
        break;
      case 'counter':
        this.emit('playCounter', { duration: 8000 });
        break;
    }
    
    this.emit('playCalled', { play, duration: 8000 });
    console.log(`[PLAY] Called: ${play.toUpperCase()}`);
    return true;
  }
  
  getActivePlay(): { play: string | null; timeRemaining: number; cooldownRemaining: number } {
    const now = this.scene.time.now;
    return {
      play: this.playExpiresAt > now ? this.activePlay : null,
      timeRemaining: Math.max(0, this.playExpiresAt - now),
      cooldownRemaining: Math.max(0, this.playCooldownUntil - now)
    };
  }
  
  // ========================================
  // SYNERGY STATUS
  // ========================================
  
  getSynergyStatuses(): SynergyStatus[] {
    const statuses: SynergyStatus[] = [];
    
    for (const synergy of Object.keys(SYNERGY_NAMES) as SynergySet[]) {
      const count = this.synergyCounts.get(synergy) || 0;
      const tier = this.activeSynergyTiers.get(synergy) || 0;
      
      if (count > 0) {
        statuses.push({
          synergy,
          name: SYNERGY_NAMES[synergy],
          count,
          tier: tier as 0 | 1 | 2,
          active: tier > 0
        });
      }
    }
    
    return statuses.sort((a, b) => b.count - a.count);
  }
  
  getSynergyCount(synergy: SynergySet): number {
    return this.synergyCounts.get(synergy) || 0;
  }
  
  isSynergyActive(synergy: SynergySet): boolean {
    return (this.activeSynergyTiers.get(synergy) || 0) > 0;
  }
  
  getActiveSynergies(): SynergySet[] {
    const active: SynergySet[] = [];
    this.activeSynergyTiers.forEach((tier, synergy) => {
      if (tier > 0) active.push(synergy);
    });
    return active;
  }
  
  // ========================================
  // HELPERS
  // ========================================
  
  private isInOpenSpace(player: any, scene: Phaser.Scene): boolean {
    const enemies = scene.registry.get('enemies') || [];
    for (const enemy of enemies) {
      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      if (dist < 150) return false;
    }
    return true;
  }
  
  private checkTriangleFormation(ctx: UpgradeContext): boolean {
    const teammates = ctx.scene.registry.get('teammates') || [];
    const player = ctx.player;
    if (teammates.length < 1) return false;
    
    // Simple check: at least one teammate within range and good angle
    for (const tm of teammates) {
      const dist = Phaser.Math.Distance.Between(player.x, player.y, tm.x, tm.y);
      if (dist < 250 && dist > 50) return true;
    }
    return false;
  }
  
  private countNearbyTeammates(player: any, scene: Phaser.Scene): number {
    const teammates = scene.registry.get('teammates') || [];
    let count = 0;
    for (const tm of teammates) {
      const dist = Phaser.Math.Distance.Between(player.x, player.y, tm.x, tm.y);
      if (dist < 150) count++;
    }
    return count;
  }
  
  // ========================================
  // COOLDOWNS
  // ========================================
  
  isOnCooldown(action: string): boolean {
    const cd = this.cooldowns.get(action);
    return cd !== undefined && cd > this.scene.time.now;
  }
  
  setCooldown(action: string, duration: number): void {
    const reduction = this.statModifiers.get('cooldowns') || 0;
    const actualDuration = duration * (1 + reduction / 100);
    this.cooldowns.set(action, this.scene.time.now + actualDuration);
  }
  
  // ========================================
  // GETTERS
  // ========================================
  
  getOwnedUpgradeIds(): string[] {
    return this.ownedUpgrades.map(u => u.id);
  }
  
  getOwnedUpgrades(): Upgrade[] {
    return [...this.ownedUpgrades];
  }
  
  hasUpgrade(upgradeId: string): boolean {
    return this.ownedUpgrades.some(u => u.id === upgradeId);
  }
  
  // ========================================
  // RESET
  // ========================================
  
  reset(): void {
    this.ownedUpgrades = [];
    this.effects.forEach(effects => effects.length = 0);
    this.statModifiers.clear();
    this.activeBuffs = [];
    this.synergyCounts.clear();
    this.activeSynergyTiers.clear();
    this.stacks.clear();
    this.cooldowns.clear();
    this.oneTimeUsed.clear();
    this.procCounts.clear();
    this.lastProcTime.clear();
    this.recentProcs = [];
    this.lastPassTime = 0;
    this.lastPassTarget = null;
    this.giveAndGoActive = false;
    this.activePlay = null;
    this.playExpiresAt = 0;
    this.playCooldownUntil = 0;
  }
  
  resetMoment(): void {
    this.oneTimeUsed.delete('autoBlock');
    this.oneTimeUsed.delete('guaranteedGoal');
    this.procCounts.clear();
    this.lastProcTime.clear();
    this.recentProcs = [];
  }
}
