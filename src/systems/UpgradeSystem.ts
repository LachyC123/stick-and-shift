// UpgradeSystem for Stick & Shift
// COMPLETE OVERHAUL: Provable upgrade triggering with debug stats
// Single source of truth for all upgrade effects

import Phaser from 'phaser';
import { Upgrade, UpgradeHook, SynergySet, UPGRADES, getUpgradeById, Rarity, SYNERGY_NAMES } from '../data/upgrades';
import { CharacterStats } from '../data/characters';

// ========================================
// TYPES
// ========================================

export interface UpgradeContext {
  player: any;
  ball?: any;
  target?: any;
  scene: Phaser.Scene;
  time?: number;
  delta?: number;
  position?: { x: number; y: number };
  // Computed state (set by RunScene)
  playerHasBall?: boolean;
  playerInAttackingD?: boolean;
  playerInDefendingD?: boolean;
  playerCanShoot?: boolean;
  playerCanPass?: boolean;
  playerIsStationary?: boolean;
  momentTimeRemaining?: number;
  isLosing?: boolean;
  possessionTime?: number;
}

// Legacy types for BuildScreenOverlay compatibility
export interface SynergyStatus {
  synergy: SynergySet;
  name: string;
  count: number;
  tier: number;
  active: boolean;
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
  stat: string;
  value: number;
  expiresAt: number;
  source: 'upgrade' | 'synergy' | 'play' | 'giveAndGo' | 'curse';
}

export interface ProcRecord {
  upgradeId: string;
  upgradeName: string;
  time: number;
}

export interface EventStats {
  tick: number;
  shot: number;
  pass: number;
  tackle: number;
  steal: number;
  receive: number;
  goal: number;
  dodge: number;
  momentStart: number;
  momentEnd: number;
}

// ========================================
// UPGRADE SYSTEM CLASS
// ========================================

export class UpgradeSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  
  // Active upgrades
  private ownedUpgrades: Upgrade[] = [];
  
  // Hooks: Map<eventName, Array<{upgradeId, callback}>>
  private hooks: Map<string, Array<{ upgradeId: string; upgradeName: string; callback: (ctx: UpgradeContext) => void }>> = new Map();
  
  // Stat modifiers (permanent from upgrades)
  private statModifiers: Map<string, number> = new Map();
  
  // Temporary buffs
  private activeBuffs: ActiveBuff[] = [];
  
  // Synergies
  private synergyCounts: Map<SynergySet, number> = new Map();
  private activeSynergyTiers: Map<SynergySet, number> = new Map();
  
  // Proc tracking
  private procCounts: Map<string, number> = new Map();
  private recentProcs: ProcRecord[] = [];
  private readonly MAX_RECENT_PROCS = 10;
  
  // Debug: event counters (reset each second)
  private eventStats: EventStats = { tick: 0, shot: 0, pass: 0, tackle: 0, steal: 0, receive: 0, goal: 0, dodge: 0, momentStart: 0, momentEnd: 0 };
  private lastEventStatsReset: number = 0;
  private eventStatsPerSecond: EventStats = { tick: 0, shot: 0, pass: 0, tackle: 0, steal: 0, receive: 0, goal: 0, dodge: 0, momentStart: 0, momentEnd: 0 };
  
  // Internal cooldowns for upgrades that need them
  private upgradeCooldowns: Map<string, number> = new Map();
  
  // Stacks for stackable effects
  private stacks: Map<string, number> = new Map();
  
  // One-time effects tracker
  private oneTimeUsed: Set<string> = new Set();
  
  // Give-and-Go tracking
  private lastPassTime: number = 0;
  private lastPassTarget: any = null;
  
  // Play calling
  private activePlay: 'press' | 'hold' | 'counter' | null = null;
  private playExpiresAt: number = 0;
  private playCooldownUntil: number = 0;
  
  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
    this.initializeHooks();
    console.log('[UPGRADE_SYSTEM] Initialized');
  }
  
  private initializeHooks(): void {
    const eventNames = ['tick', 'shot', 'pass', 'tackle', 'steal', 'receive', 'goal', 'dodge', 'momentStart', 'momentEnd'];
    eventNames.forEach(name => this.hooks.set(name, []));
  }
  
  // ========================================
  // UPGRADE MANAGEMENT
  // ========================================
  
  pickUpgrade(upgradeId: string): boolean {
    const upgrade = getUpgradeById(upgradeId);
    if (!upgrade) {
      console.error(`[UPGRADE_SYSTEM] Upgrade not found: ${upgradeId}`);
      return false;
    }
    
    console.log(`[UPGRADE_PICK] Picking: ${upgrade.id} - ${upgrade.name}`);
    
    this.ownedUpgrades.push(upgrade);
    
    // Apply stat modifiers
    upgrade.modifiers.forEach(mod => {
      const current = this.statModifiers.get(mod.stat) || 0;
      this.statModifiers.set(mod.stat, current + mod.value);
      console.log(`[UPGRADE_PICK] Modifier: ${mod.stat} += ${mod.value}%`);
    });
    
    // Register hooks
    this.registerUpgradeHooks(upgrade);
    
    // Update synergies
    upgrade.synergies.forEach(synergy => {
      const count = (this.synergyCounts.get(synergy) || 0) + 1;
      this.synergyCounts.set(synergy, count);
      this.checkSynergyActivation(synergy, count);
    });
    
    this.emit('upgradeAdded', upgrade);
    console.log(`[UPGRADE_PICK] Total upgrades: ${this.ownedUpgrades.length}`);
    
    return true;
  }
  
  // Legacy method - calls pickUpgrade
  addUpgrade(upgrade: Upgrade): void {
    this.pickUpgrade(upgrade.id);
  }
  
  private registerUpgradeHooks(upgrade: Upgrade): void {
    // Map hooks to event names
    const hookToEvent: Record<string, string> = {
      'onShot': 'shot',
      'onPass': 'pass',
      'onTackle': 'tackle',
      'onSteal': 'steal',
      'onReceive': 'receive',
      'onGoal': 'goal',
      'onDodge': 'dodge',
      'onTick': 'tick',
      'onMomentStart': 'momentStart',
      'onMomentEnd': 'momentEnd',
      'passive': 'tick'  // Passive effects run on tick
    };
    
    upgrade.hooks.forEach(hook => {
      const eventName = hookToEvent[hook];
      if (!eventName) return;
      
      const callback = this.createCallback(upgrade);
      const hookArray = this.hooks.get(eventName);
      if (hookArray) {
        hookArray.push({
          upgradeId: upgrade.id,
          upgradeName: upgrade.name,
          callback
        });
        console.log(`[UPGRADE_PICK] Registered hook: ${upgrade.id} -> ${eventName}`);
      }
    });
  }
  
  // ========================================
  // EVENT EMISSION - THE CORE
  // ========================================
  
  emitEvent(eventName: string, context: UpgradeContext): void {
    // Track event stats
    if (eventName in this.eventStats) {
      (this.eventStats as any)[eventName]++;
    }
    
    // Update per-second stats
    const now = context.time || this.scene.time.now;
    if (now - this.lastEventStatsReset >= 1000) {
      this.eventStatsPerSecond = { ...this.eventStats };
      this.eventStats = { tick: 0, shot: 0, pass: 0, tackle: 0, steal: 0, receive: 0, goal: 0, dodge: 0, momentStart: 0, momentEnd: 0 };
      this.lastEventStatsReset = now;
    }
    
    // Get hooks for this event
    const hookArray = this.hooks.get(eventName);
    if (!hookArray || hookArray.length === 0) return;
    
    // Execute each hook
    hookArray.forEach(hook => {
      try {
        hook.callback(context);
      } catch (e) {
        console.error(`[UPGRADE_SYSTEM] Error in ${hook.upgradeId}:`, e);
      }
    });
    
    // Check Give-and-Go on pass/receive
    if (eventName === 'pass') {
      this.trackPassForGiveAndGo(context);
    } else if (eventName === 'receive') {
      this.checkGiveAndGo(context);
    }
  }
  
  // Legacy method name
  trigger(hook: string, context: UpgradeContext): void {
    // Map old hook names to event names
    const hookToEvent: Record<string, string> = {
      'onShot': 'shot', 'onPass': 'pass', 'onTackle': 'tackle', 'onSteal': 'steal',
      'onReceive': 'receive', 'onGoal': 'goal', 'onDodge': 'dodge', 'onTick': 'tick',
      'onMomentStart': 'momentStart', 'onMomentEnd': 'momentEnd'
    };
    const eventName = hookToEvent[hook] || hook;
    this.emitEvent(eventName, context);
  }
  
  // ========================================
  // CALLBACK FACTORY - REAL IMPLEMENTATIONS
  // ========================================
  
  private createCallback(upgrade: Upgrade): (ctx: UpgradeContext) => void {
    const effectId = upgrade.effectId;
    const upgradeId = upgrade.id;
    
    // Return the appropriate callback based on effectId
    switch (effectId) {
      // === STAT BOOSTS (passive - handled by modifiers, but log proc) ===
      case 'speedBoost10':
      case 'shotPowerBoost15':
      case 'controlBoost15':
      case 'tackleBoost15':
      case 'passBoost15':
      case 'staminaBoost20':
      case 'dodgeBoost10':
      case 'reducedCooldowns':
      case 'goldenBoost':
        return () => {}; // Already applied via modifiers
      
      // === AUTO HIT IN D (THE KEY UPGRADE) ===
      case 'autoHitInD':
        return (ctx) => {
          if (!ctx.playerHasBall || !ctx.playerInAttackingD || !ctx.playerCanShoot) return;
          
          // Check cooldown
          const cooldownKey = `autoHitInD_cooldown`;
          const lastProc = this.upgradeCooldowns.get(cooldownKey) || 0;
          const now = ctx.time || this.scene.time.now;
          if (now - lastProc < 700) return; // 700ms cooldown
          
          this.upgradeCooldowns.set(cooldownKey, now);
          
          // TRIGGER THE SHOT
          console.log('[AUTO_HIT_IN_D] Triggering auto-shot!');
          this.emit('autoShot', { source: 'autoHitInD' });
          this.procUpgrade(upgradeId, 'Auto Hit in D', 1);
        };
      
      // === CIRCLE SPECIALIST (shot power in D) ===
      case 'circleShotBoost':
        return (ctx) => {
          if (ctx.playerInAttackingD) {
            this.addTempBuff('circleShotBoost', 'shotPower', 30, 500, 'upgrade');
            this.procUpgrade(upgradeId, upgrade.name, 0.8);
          }
        };
      
      // === SPEED EFFECTS ===
      case 'homeHalfSpeed':
        return (ctx) => {
          if (ctx.player && ctx.player.x < 600) {
            this.addTempBuff('homeHalfSpeed', 'speed', 8, 200, 'upgrade');
          }
        };
      
      case 'openSpaceSpeed':
        return (ctx) => {
          if (this.isInOpenSpace(ctx)) {
            this.addTempBuff('openSpaceSpeed', 'speed', 10, 200, 'upgrade');
            this.procUpgrade(upgradeId, upgrade.name, 0.3);
          }
        };
      
      case 'pressSpeed':
        return (ctx) => {
          if (ctx.player && !ctx.playerHasBall) {
            this.addTempBuff('pressSpeed', 'speed', 5, 200, 'upgrade');
          }
        };
      
      case 'dodgeSpeedBurst':
        return (ctx) => {
          this.addTempBuff('dodgeSpeedBurst', 'speed', 15, 2000, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      // === BALL MAGNET ===
      case 'ballMagnet':
      case 'strongBallMagnet':
        return (ctx) => {
          if (!ctx.ball || ctx.playerHasBall) return;
          const dist = Phaser.Math.Distance.Between(ctx.player.x, ctx.player.y, ctx.ball.x, ctx.ball.y);
          const range = effectId === 'strongBallMagnet' ? 150 : 100;
          const strength = effectId === 'strongBallMagnet' ? 0.05 : 0.02;
          if (dist < range && dist > 20 && ctx.ball.isLoose) {
            ctx.ball.applyMagnet?.(ctx.player.x, ctx.player.y, strength);
            this.procUpgrade(upgradeId, upgrade.name, 0.1);
          }
        };
      
      // === SHOT EFFECTS ===
      case 'reboundShotPower':
        return (ctx) => {
          this.addTempBuff('reboundShotPower', 'shotPower', 20, 500, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 0.8);
        };
      
      case 'stationaryShotBoost':
        return (ctx) => {
          if (ctx.playerIsStationary) {
            this.addTempBuff('stationaryShotBoost', 'shotPower', 50, 500, 'upgrade');
            this.procUpgrade(upgradeId, upgrade.name, 1);
          }
        };
      
      case 'enemyDShotPower':
        return (ctx) => {
          if (ctx.playerInAttackingD) {
            this.addTempBuff('enemyDShotPower', 'shotPower', 20, 500, 'upgrade');
            this.procUpgrade(upgradeId, upgrade.name, 0.8);
          }
        };
      
      case 'closeRangeShotBoost':
        return (ctx) => {
          // Close range = within 150px of goal
          const goalX = ctx.player.x > 600 ? 1200 : 0;
          const distToGoal = Math.abs(ctx.player.x - goalX);
          if (distToGoal < 200) {
            this.addTempBuff('closeRangeShotBoost', 'shotSpeed', 30, 500, 'upgrade');
            this.procUpgrade(upgradeId, upgrade.name, 1);
          }
        };
      
      case 'curvingShot':
        return (ctx) => {
          ctx.ball?.addCurve?.(0.3);
          this.procUpgrade(upgradeId, upgrade.name, 0.8);
        };
      
      // === PASS EFFECTS ===
      case 'fastPass':
        return (ctx) => {
          this.addTempBuff('fastPass', 'passSpeed', 30, 500, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 0.6);
        };
      
      case 'trianglePassBoost':
        return (ctx) => {
          this.addTempBuff('trianglePassBoost', 'passPower', 25, 500, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 0.8);
        };
      
      // === TACKLE/STEAL EFFECTS ===
      case 'tackleStaminaRestore':
        return (ctx) => {
          ctx.player?.restoreStamina?.(20);
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      case 'tackleReset':
        return (ctx) => {
          this.emit('cooldownReset', 'tackle');
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      case 'stealDodgeReset':
        return (ctx) => {
          this.emit('cooldownReset', 'dodge');
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      case 'tackleSpeed':
        return (ctx) => {
          this.addTempBuff('tackleSpeed', 'speed', 20, 2000, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      // === RECEIVE EFFECTS ===
      case 'receiveControl':
        return (ctx) => {
          this.addTempBuff('receiveControl', 'control', 20, 1000, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 0.8);
        };
      
      case 'receiveAccel':
        return (ctx) => {
          this.addTempBuff('receiveAccel', 'speed', 50, 1000, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      // === GOAL EFFECTS ===
      case 'goalSpeedStack':
        return (ctx) => {
          const stacks = Math.min((this.stacks.get('goalSpeed') || 0) + 1, 3);
          this.stacks.set('goalSpeed', stacks);
          this.addTempBuff('goalSpeedStack', 'speed', 5 * stacks, 60000, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      case 'goalFullRestore':
        return (ctx) => {
          ctx.player?.restoreStamina?.(100);
          this.emit('allCooldownsReset');
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      // === DODGE EFFECTS ===
      case 'slowMo':
        return (ctx) => {
          this.scene.time.timeScale = 0.5;
          this.scene.time.delayedCall(500, () => { this.scene.time.timeScale = 1; });
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      case 'dodgeShield':
        return (ctx) => {
          ctx.player?.addShield?.(500);
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      // === MOMENT EFFECTS ===
      case 'warmUpBuff':
        return (ctx) => {
          if (ctx.momentTimeRemaining && ctx.momentTimeRemaining > 50) {
            this.addTempBuff('warmUpBuff', 'all', 10, 200, 'upgrade');
          }
        };
      
      case 'coolDownBuff':
        return (ctx) => {
          if (ctx.momentTimeRemaining && ctx.momentTimeRemaining < 10) {
            this.addTempBuff('coolDownBuff', 'all', 10, 200, 'upgrade');
          }
        };
      
      case 'finalSecondsBoost':
        return (ctx) => {
          if (ctx.momentTimeRemaining && ctx.momentTimeRemaining < 15) {
            this.addTempBuff('finalSecondsBoost', 'all', 30, 200, 'upgrade');
          }
        };
      
      case 'losingBuff':
        return (ctx) => {
          if (ctx.isLosing) {
            this.addTempBuff('losingBuff', 'all', 30, 200, 'upgrade');
          }
        };
      
      case 'avatarMode':
        return (ctx) => {
          if (ctx.isLosing) {
            this.addTempBuff('avatarMode', 'all', 100, 200, 'upgrade');
            this.procUpgrade(upgradeId, upgrade.name, 0.5);
          }
        };
      
      // === D-CIRCLE EFFECTS ===
      case 'dCircleRush':
        return (ctx) => {
          if (ctx.playerInDefendingD) {
            this.addTempBuff('dCircleRush', 'speed', 80, 200, 'upgrade');
          }
        };
      
      case 'poacherSpeed':
        return (ctx) => {
          if (ctx.ball && ctx.ball.isLoose && ctx.playerInAttackingD) {
            this.addTempBuff('poacherSpeed', 'speed', 40, 200, 'upgrade');
          }
        };
      
      // === AUTO-BLOCK ===
      case 'autoBlock':
        return (ctx) => {
          if (!this.oneTimeUsed.has('autoBlock')) {
            // Logic would be triggered by goal threat detection
          }
        };
      
      case 'autoBlockShot':
        return (ctx) => {
          // Similar to autoBlock but different trigger
        };
      
      // === TEAMMATE EFFECTS ===
      case 'teammateBuff':
        return (ctx) => {
          const nearby = this.countNearbyTeammates(ctx);
          if (nearby > 0) {
            this.addTempBuff('teammateBuff', 'all', 5 * nearby, 200, 'upgrade');
          }
        };
      
      case 'teamPress':
        return (ctx) => {
          if (!ctx.playerHasBall) {
            this.emit('teammatesPress');
          }
        };
      
      // ========== NEW UPGRADES (PART E - CRITICAL FIX PACK) ==========
      
      // 1) slap_shot_boost - handled via modifiers (passive)
      case 'slapShotBoost':
        return () => {};
      
      // 2) quick_release - shooting reduces next shoot cooldown
      case 'quickReleaseBuff':
        return (ctx) => {
          this.addTempBuff('quickRelease', 'shootCooldown', -25, 2000, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      // 3) curve_drive - shots curve more
      case 'curveDriveShot':
        return (ctx) => {
          ctx.ball?.setSpin?.(0.15);
          this.procUpgrade(upgradeId, upgrade.name, 0.9);
        };
      
      // 4) one_touch_finish - receive in D gives shot buff
      case 'oneTouchFinishBuff':
        return (ctx) => {
          // Check if this is a receive event in the D
          if (ctx.playerInAttackingD) {
            this.addTempBuff('oneTouchFinish', 'shotPower', 20, 1200, 'upgrade');
            this.procUpgrade(upgradeId, upgrade.name, 1);
          }
        };
      
      // 5) d_poacher - +10% speed in D with ball
      case 'dPoacherSpeed':
        return (ctx) => {
          if (ctx.playerHasBall && ctx.playerInAttackingD) {
            this.addTempBuff('dPoacherSpeed', 'speed', 10, 200, 'upgrade');
            this.procUpgrade(upgradeId, upgrade.name, 0.2);
          }
        };
      
      // 6) laser_passes - handled via modifiers (passive)
      case 'laserPasses':
        return () => {};
      
      // 7) give_go_master - extended give-and-go window
      case 'giveGoMasterBuff':
        return (ctx) => {
          // Extend G&G window when passing
          this.addTempBuff('giveGoWindow', 'giveGoWindow', 50, 3000, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 0.6);
        };
      
      // 8) magnetic_first_touch - control buff + magnet on receive
      case 'magneticFirstTouch':
        return (ctx) => {
          this.addTempBuff('magneticFirstTouch', 'control', 30, 2000, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      // 9) interception_gloves - handled via modifiers (passive)
      case 'interceptionGloves':
        return () => {};
      
      // 10) crunch_tackle - handled via modifiers (passive)
      case 'crunchTackle':
        return () => {};
      
      // 11) stun_stick - extra stun on tackle
      case 'stunStickExtra':
        return (ctx) => {
          ctx.target?.applyStun?.(120);
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      // 12) second_wind_moment - restore stamina at moment start
      case 'secondWindMoment':
        return (ctx) => {
          ctx.player?.restoreStamina?.(100);
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      // 13) efficient_dash - handled via modifiers (passive)
      case 'efficientDash':
        return () => {};
      
      // 14) adrenaline_advantage - super advantage on steal
      case 'adrenalineAdvantageBuff':
        return (ctx) => {
          this.addTempBuff('adrenalineSpeed', 'speed', 20, 3000, 'upgrade');
          this.addTempBuff('adrenalinePass', 'passPower', 20, 3000, 'upgrade');
          this.addTempBuff('adrenalineShot', 'shotPower', 20, 3000, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      // 15) pc_drag_flick - PC shots +35% power
      case 'pcDragFlickPower':
        return (ctx) => {
          // Check if in PC mode (would need additional context)
          this.addTempBuff('pcDragFlick', 'shotPower', 35, 500, 'upgrade');
          this.procUpgrade(upgradeId, upgrade.name, 1);
        };
      
      // 16) pc_injector - handled via modifiers (passive)
      case 'pcInjectorBuff':
        return () => {};
      
      // 17) keeper_nerves - shot speed burst in D
      case 'keeperNervesBurst':
        return (ctx) => {
          if (ctx.playerInAttackingD) {
            this.addTempBuff('keeperNerves', 'shotSpeed', 8, 300, 'upgrade');
            this.procUpgrade(upgradeId, upgrade.name, 1);
          }
        };
      
      // 18) rebound_hunter_pro - speed on rebound
      case 'reboundHunterProBurst':
        return (ctx) => {
          if (ctx.ball?.isRebound) {
            this.addTempBuff('reboundHunterPro', 'speed', 50, 1500, 'upgrade');
            this.procUpgrade(upgradeId, upgrade.name, 1);
          }
        };
      
      // 19) iron_body - handled via modifiers (passive)
      case 'ironBody':
        return () => {};
      
      // 20) fragile_genius - handled via modifiers (passive)
      case 'fragileGenius':
        return () => {};
      
      // === DEFAULT ===
      default:
        return () => {};
    }
  }
  
  // ========================================
  // PROC FEEDBACK
  // ========================================
  
  procUpgrade(upgradeId: string, upgradeName: string, intensity: number = 1): void {
    // Track count
    const count = (this.procCounts.get(upgradeId) || 0) + 1;
    this.procCounts.set(upgradeId, count);
    
    // Add to recent procs
    this.recentProcs.push({ upgradeId, upgradeName, time: this.scene.time.now });
    if (this.recentProcs.length > this.MAX_RECENT_PROCS) {
      this.recentProcs.shift();
    }
    
    // Emit for UI
    this.emit('upgradeProc', { upgradeId, upgradeName, intensity, count });
    
    console.log(`[PROC] ${upgradeName} (${upgradeId}) x${count}`);
  }
  
  // ========================================
  // BUFF SYSTEM
  // ========================================
  
  addTempBuff(id: string, stat: string, value: number, duration: number, source: ActiveBuff['source']): void {
    const existing = this.activeBuffs.find(b => b.id === id);
    if (existing) {
      existing.expiresAt = this.scene.time.now + duration;
      existing.value = Math.max(existing.value, value);
      return;
    }
    
    this.activeBuffs.push({
      id,
      name: id,
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
  // SYNERGIES
  // ========================================
  
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
    // Apply synergy stat bonuses
    const bonuses: Record<string, { tier1: Record<string, number>; tier2: Record<string, number> }> = {
      press: { tier1: { tackle: 20, speed: 10 }, tier2: { tackle: 40, speed: 20 } },
      trianglePassing: { tier1: { passPower: 25, control: 15 }, tier2: { passPower: 50, control: 30 } },
      dragFlick: { tier1: { shotPower: 25 }, tier2: { shotPower: 50 } },
      rebound: { tier1: { speed: 20 }, tier2: { speed: 40, shotPower: 20 } },
      trickster: { tier1: { dodge: 20, control: 15 }, tier2: { dodge: 40, control: 30 } },
      sweeper: { tier1: { tackle: 20 }, tier2: { tackle: 40, speed: 20 } },
      speedster: { tier1: { speed: 15 }, tier2: { speed: 30 } },
      poacher: { tier1: { shotPower: 15 }, tier2: { shotPower: 30, speed: 15 } }
    };
    
    const synergyBonuses = bonuses[synergy];
    if (!synergyBonuses) return;
    
    const stats = tier === 2 ? synergyBonuses.tier2 : synergyBonuses.tier1;
    Object.entries(stats).forEach(([stat, value]) => {
      const current = this.statModifiers.get(stat) || 0;
      this.statModifiers.set(stat, current + value);
    });
  }
  
  getSynergyCount(synergy: SynergySet): number {
    return this.synergyCounts.get(synergy) || 0;
  }
  
  isSynergyActive(synergy: SynergySet): boolean {
    return (this.activeSynergyTiers.get(synergy) || 0) > 0;
  }
  
  getSynergyStatuses(): SynergyStatus[] {
    const statuses: SynergyStatus[] = [];
    this.synergyCounts.forEach((count, synergy) => {
      if (count > 0) {
        const tier = this.activeSynergyTiers.get(synergy) || 0;
        statuses.push({
          synergy,
          name: SYNERGY_NAMES[synergy],
          count,
          tier,
          active: tier > 0
        });
      }
    });
    return statuses.sort((a, b) => b.count - a.count);
  }
  
  // ========================================
  // GIVE-AND-GO
  // ========================================
  
  private trackPassForGiveAndGo(ctx: UpgradeContext): void {
    this.lastPassTime = this.scene.time.now;
    this.lastPassTarget = ctx.target;
  }
  
  private checkGiveAndGo(ctx: UpgradeContext): void {
    const now = this.scene.time.now;
    const timeSincePass = now - this.lastPassTime;
    
    if (timeSincePass < 3500 && this.lastPassTarget) {
      // Give-and-Go activated!
      let multiplier = 1;
      if ((this.activeSynergyTiers.get('trianglePassing') || 0) >= 2) {
        multiplier = 2;
      }
      
      this.addTempBuff('giveAndGo', 'speed', 15 * multiplier, 2000, 'giveAndGo');
      this.addTempBuff('giveAndGoControl', 'control', 20 * multiplier, 2000, 'giveAndGo');
      this.addTempBuff('giveAndGoShot', 'shotPower', 15 * multiplier, 2000, 'giveAndGo');
      
      this.emit('giveAndGoActivated', { multiplier });
      console.log('[GIVE_AND_GO] Activated!');
    }
    
    this.lastPassTarget = null;
  }
  
  // ========================================
  // PLAY CALLING
  // ========================================
  
  callPlay(play: 'press' | 'hold' | 'counter'): boolean {
    const now = this.scene.time.now;
    if (now < this.playCooldownUntil) return false;
    
    this.activePlay = play;
    this.playExpiresAt = now + 8000;
    this.playCooldownUntil = now + 20000;
    
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
  // HELPERS
  // ========================================
  
  private isInOpenSpace(ctx: UpgradeContext): boolean {
    const enemies = ctx.scene.registry.get('enemies') || [];
    for (const enemy of enemies) {
      const dist = Phaser.Math.Distance.Between(ctx.player.x, ctx.player.y, enemy.x, enemy.y);
      if (dist < 150) return false;
    }
    return true;
  }
  
  private countNearbyTeammates(ctx: UpgradeContext): number {
    const teammates = ctx.scene.registry.get('teammates') || [];
    let count = 0;
    for (const tm of teammates) {
      const dist = Phaser.Math.Distance.Between(ctx.player.x, ctx.player.y, tm.x, tm.y);
      if (dist < 150) count++;
    }
    return count;
  }
  
  // ========================================
  // EXTERNAL MODIFIERS (for curses)
  // ========================================
  
  addModifier(mod: { stat: string; value: number }): void {
    const current = this.statModifiers.get(mod.stat) || 0;
    this.statModifiers.set(mod.stat, current + mod.value);
    console.log(`[UPGRADE] Added modifier: ${mod.stat} += ${mod.value}`);
  }
  
  addHook(hookDef: { event: string; effect: (ctx: any) => void }): void {
    const hookArray = this.hooks.get(hookDef.event);
    if (hookArray) {
      hookArray.push({
        upgradeId: 'external',
        upgradeName: 'External Effect',
        callback: hookDef.effect
      });
    }
  }
  
  // ========================================
  // DEBUG INFO
  // ========================================
  
  getDebugInfo(): {
    upgradeCount: number;
    upgrades: Array<{ id: string; name: string }>;
    recentProcs: ProcRecord[];
    eventStats: EventStats;
    modifiers: Record<string, number>;
    hookCounts: Record<string, number>;
  } {
    const hookCounts: Record<string, number> = {};
    this.hooks.forEach((arr, key) => {
      hookCounts[key] = arr.length;
    });
    
    return {
      upgradeCount: this.ownedUpgrades.length,
      upgrades: this.ownedUpgrades.map(u => ({ id: u.id, name: u.name })),
      recentProcs: [...this.recentProcs].reverse(),
      eventStats: { ...this.eventStatsPerSecond },
      modifiers: this.getAllModifiers(),
      hookCounts
    };
  }
  
  getTopProcs(limit: number = 5): ProcStats[] {
    const procs: ProcStats[] = [];
    this.procCounts.forEach((count, upgradeId) => {
      const upgrade = this.ownedUpgrades.find(u => u.id === upgradeId);
      if (upgrade && count > 0) {
        procs.push({ 
          upgradeId, 
          upgradeName: upgrade.name, 
          upgradeIcon: upgrade.icon || '⚡',
          count 
        });
      }
    });
    return procs.sort((a, b) => b.count - a.count).slice(0, limit);
  }
  
  getProcCount(upgradeId: string): number {
    return this.procCounts.get(upgradeId) || 0;
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
    this.hooks.forEach(arr => arr.length = 0);
    this.statModifiers.clear();
    this.activeBuffs = [];
    this.synergyCounts.clear();
    this.activeSynergyTiers.clear();
    this.procCounts.clear();
    this.recentProcs = [];
    this.upgradeCooldowns.clear();
    this.stacks.clear();
    this.oneTimeUsed.clear();
    this.lastPassTime = 0;
    this.lastPassTarget = null;
    this.activePlay = null;
    this.playExpiresAt = 0;
    this.playCooldownUntil = 0;
    this.initializeHooks();
  }
  
  resetMoment(): void {
    this.oneTimeUsed.delete('autoBlock');
    this.oneTimeUsed.delete('guaranteedGoal');
    this.procCounts.clear();
    this.recentProcs = [];
  }
}
