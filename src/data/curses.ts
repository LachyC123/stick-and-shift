// Comeback Curses for Stick & Shift
// Each curse has a boon (positive) and a curse (negative) effect
// Triggered when player is down by 2+ points in Cup Run

import { UpgradeModifier } from './upgrades';

export interface CurseHook {
  event: string;
  effect: (ctx: any) => void;
}

export interface CurseDefinition {
  id: string;
  name: string;
  boonDescription: string;
  curseDescription: string;
  icon: string;
  
  // Effects applied through UpgradeSystem
  modifiers?: UpgradeModifier[];
  hooks?: CurseHook[];
}

export const CURSES: CurseDefinition[] = [
  // ========== OFFENSIVE CURSES ==========
  {
    id: 'glassCannonCurse',
    name: 'Glass Cannon',
    boonDescription: '+40% shot power',
    curseDescription: 'Tackles stun you 50% longer',
    icon: '💥',
    modifiers: [
      { stat: 'shotPower', value: 40, isPercent: true }
    ]
  },
  {
    id: 'desperateStrikerCurse',
    name: 'Desperate Striker',
    boonDescription: 'Goals worth double progress',
    curseDescription: '-25% movement speed',
    icon: '⚽',
    modifiers: [
      { stat: 'speed', value: -25, isPercent: true },
      { stat: 'goalValue', value: 100, isPercent: true }
    ]
  },
  {
    id: 'berserkerCurse',
    name: 'Berserker',
    boonDescription: '+30% tackle power and range',
    curseDescription: 'Cooldowns are 40% longer',
    icon: '🔥',
    modifiers: [
      { stat: 'tackleRange', value: 30, isPercent: true },
      { stat: 'tacklePower', value: 30, isPercent: true },
      { stat: 'cooldowns', value: 40, isPercent: true }
    ]
  },
  {
    id: 'recklessPasserCurse',
    name: 'Reckless Passer',
    boonDescription: '+50% pass speed',
    curseDescription: 'Ball control reduced by 30%',
    icon: '💨',
    modifiers: [
      { stat: 'passSpeed', value: 50, isPercent: true },
      { stat: 'control', value: -30, isPercent: true }
    ]
  },
  
  // ========== DEFENSIVE CURSES ==========
  {
    id: 'lastStandCurse',
    name: 'Last Stand',
    boonDescription: 'Immune to stun for 1s after tackle',
    curseDescription: 'Enemies press 30% harder',
    icon: '🛡️',
    modifiers: [
      { stat: 'stunImmunityAfterTackle', value: 1000 }
    ]
  },
  {
    id: 'panicDefenseCurse',
    name: 'Panic Defense',
    boonDescription: 'Dodge cooldown reduced by 40%',
    curseDescription: 'Stamina drains 25% faster',
    icon: '😰',
    modifiers: [
      { stat: 'dodgeCooldown', value: -40, isPercent: true },
      { stat: 'staminaDrain', value: 25, isPercent: true }
    ]
  },
  {
    id: 'ironWillCurse',
    name: 'Iron Will',
    boonDescription: 'Cannot be stunned below 50% stamina',
    curseDescription: 'Shot accuracy reduced by 20%',
    icon: '💪',
    modifiers: [
      { stat: 'shotAccuracy', value: -20, isPercent: true },
      { stat: 'lowStaminaStunImmunity', value: 1 }
    ]
  },
  
  // ========== UTILITY CURSES ==========
  {
    id: 'timeBenderCurse',
    name: 'Time Bender',
    boonDescription: '+10 seconds to each moment',
    curseDescription: 'Enemies move 15% faster',
    icon: '⏰',
    modifiers: [
      { stat: 'momentDuration', value: 10 },
      { stat: 'enemySpeed', value: 15, isPercent: true }
    ]
  },
  {
    id: 'gamblerCurse',
    name: "Gambler's Curse",
    boonDescription: '50% chance to crit on shots (2x power)',
    curseDescription: '25% chance shots go wide',
    icon: '🎲',
    modifiers: [
      { stat: 'shotCritChance', value: 50 },
      { stat: 'shotWildChance', value: 25 }
    ]
  },
  {
    id: 'magnetCurse',
    name: 'Magnetic Misfortune',
    boonDescription: 'Ball curves toward you when nearby',
    curseDescription: 'Enemies target you more aggressively',
    icon: '🧲',
    modifiers: [
      { stat: 'ballMagnet', value: 30 },
      { stat: 'enemyTargetPriority', value: 50, isPercent: true }
    ]
  },
  {
    id: 'slipperyTurfCurse',
    name: 'Slippery Turf',
    boonDescription: '+20% movement speed',
    curseDescription: 'Reduced friction - harder to stop',
    icon: '🧊',
    modifiers: [
      { stat: 'speed', value: 20, isPercent: true },
      { stat: 'friction', value: -30, isPercent: true }
    ]
  },
  
  // ========== TEAM CURSES ==========
  {
    id: 'loneWolfCurse',
    name: 'Lone Wolf',
    boonDescription: '+50% stats when no teammate nearby',
    curseDescription: 'Teammates move 20% slower',
    icon: '🐺',
    modifiers: [
      { stat: 'teammateSpeed', value: -20, isPercent: true },
      { stat: 'loneWolfBonus', value: 50, isPercent: true }
    ]
  },
  {
    id: 'teamSacrificeCurse',
    name: 'Team Sacrifice',
    boonDescription: 'Teammates tackle more aggressively',
    curseDescription: 'You cannot tackle for 3s after teammate does',
    icon: '🤝',
    modifiers: [
      { stat: 'teammateTackleAggression', value: 50, isPercent: true },
      { stat: 'tackleDelayAfterTeammate', value: 3000 }
    ]
  },
  {
    id: 'captainCurse',
    name: "Captain's Burden",
    boonDescription: 'All passes to you are perfectly accurate',
    curseDescription: 'Your passes have 20% chance to be intercepted',
    icon: '👑',
    modifiers: [
      { stat: 'receiveAccuracy', value: 100 },
      { stat: 'passInterceptChance', value: 20 }
    ]
  },
  
  // ========== MOMENTUM CURSES ==========
  {
    id: 'adrenalineCurse',
    name: 'Adrenaline Rush',
    boonDescription: '+100% speed for 3s after stealing',
    curseDescription: '-30% speed when enemy has ball',
    icon: '⚡',
    modifiers: [
      { stat: 'stealSpeedBoost', value: 100, isPercent: true },
      { stat: 'stealSpeedBoostDuration', value: 3000 },
      { stat: 'speedWhenDefending', value: -30, isPercent: true }
    ]
  },
  {
    id: 'momentumCurse',
    name: 'Momentum Curse',
    boonDescription: 'Each successful pass gives +5% speed (stacks)',
    curseDescription: 'Lose all stacks and get stunned on turnover',
    icon: '📈',
    modifiers: [
      { stat: 'passStackSpeedBonus', value: 5, isPercent: true },
      { stat: 'turnoverPenalty', value: 1 }
    ]
  },
  {
    id: 'underDogCurse',
    name: 'Underdog Spirit',
    boonDescription: '+15% all stats per point behind',
    curseDescription: 'Lose bonus when ahead or tied',
    icon: '🐕',
    modifiers: [
      { stat: 'underdogBonusPerPoint', value: 15, isPercent: true }
    ]
  }
];

/**
 * Get random curse options (no duplicates)
 */
export function getRandomCurseOptions(count: number = 2, excludeIds: string[] = []): CurseDefinition[] {
  const available = CURSES.filter(c => !excludeIds.includes(c.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get a curse by ID
 */
export function getCurseById(id: string): CurseDefinition | undefined {
  return CURSES.find(c => c.id === id);
}
