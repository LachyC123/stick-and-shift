// Upgrade definitions for Stick & Shift
// 80+ upgrades with rarities, synergies, and real effects

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type UpgradeHook = 'onShot' | 'onPass' | 'onTackle' | 'onSteal' | 'onGoal' | 'onReceive' | 
                          'onDodge' | 'onTick' | 'onMomentStart' | 'onMomentEnd' | 'onDamage' | 
                          'onHit' | 'passive';
export type SynergySet = 'dragFlick' | 'press' | 'trianglePassing' | 'rebound' | 'trickster' | 
                         'tank' | 'speedster' | 'vampire' | 'chaos' | 'precision' | 'guardian' | 
                         'berserker';

export interface UpgradeModifier {
  stat: string;
  value: number;
  isPercent?: boolean;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  synergies: SynergySet[];
  hooks: UpgradeHook[];
  modifiers: UpgradeModifier[];
  effectId: string;  // Used by UpgradeSystem to apply effects
  icon: string;      // Emoji icon for display
  maxStacks?: number; // How many times this can be picked (default 1)
}

export const RARITY_COLORS: Record<Rarity, number> = {
  common: 0x9e9e9e,
  uncommon: 0x4caf50,
  rare: 0x2196f3,
  epic: 0x9c27b0,
  legendary: 0xff9800
};

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  uncommon: 30,
  rare: 15,
  epic: 4,
  legendary: 1
};

export const SYNERGY_NAMES: Record<SynergySet, string> = {
  dragFlick: 'Drag Flick',
  press: 'Press',
  trianglePassing: 'Triangle Passing',
  rebound: 'Rebound',
  trickster: 'Trickster',
  tank: 'Tank',
  speedster: 'Speedster',
  vampire: 'Vampire',
  chaos: 'Chaos',
  precision: 'Precision',
  guardian: 'Guardian',
  berserker: 'Berserker'
};

export const SYNERGY_COLORS: Record<SynergySet, number> = {
  dragFlick: 0xff6b6b,
  press: 0xfeca57,
  trianglePassing: 0x48dbfb,
  rebound: 0xff9ff3,
  trickster: 0x00d2d3,
  tank: 0x576574,
  speedster: 0x54a0ff,
  vampire: 0x8b0000,
  chaos: 0x9b59b6,
  precision: 0x10ac84,
  guardian: 0xf39c12,
  berserker: 0xe74c3c
};

export const UPGRADES: Upgrade[] = [
  // ========== COMMON UPGRADES (20) ==========
  {
    id: 'quickFeet',
    name: 'Quick Feet',
    description: '+10% movement speed',
    rarity: 'common',
    synergies: ['speedster'],
    hooks: ['passive'],
    modifiers: [{ stat: 'speed', value: 10, isPercent: true }],
    effectId: 'speedBoost10',
    icon: '👟',
    maxStacks: 3
  },
  {
    id: 'strongStick',
    name: 'Strong Stick',
    description: '+15% shot power',
    rarity: 'common',
    synergies: ['dragFlick'],
    hooks: ['passive'],
    modifiers: [{ stat: 'shotPower', value: 15, isPercent: true }],
    effectId: 'shotPowerBoost15',
    icon: '🏑',
    maxStacks: 3
  },
  {
    id: 'softHands',
    name: 'Soft Hands',
    description: '+15% ball control',
    rarity: 'common',
    synergies: ['trickster'],
    hooks: ['passive'],
    modifiers: [{ stat: 'control', value: 15, isPercent: true }],
    effectId: 'controlBoost15',
    icon: '🤲',
    maxStacks: 3
  },
  {
    id: 'tackleTraining',
    name: 'Tackle Training',
    description: '+15% tackle success',
    rarity: 'common',
    synergies: ['press'],
    hooks: ['passive'],
    modifiers: [{ stat: 'tackle', value: 15, isPercent: true }],
    effectId: 'tackleBoost15',
    icon: '⚔️',
    maxStacks: 3
  },
  {
    id: 'passingDrills',
    name: 'Passing Drills',
    description: '+15% pass accuracy',
    rarity: 'common',
    synergies: ['trianglePassing'],
    hooks: ['passive'],
    modifiers: [{ stat: 'passPower', value: 15, isPercent: true }],
    effectId: 'passBoost15',
    icon: '📐',
    maxStacks: 3
  },
  {
    id: 'staminaPack',
    name: 'Stamina Pack',
    description: '+20% max stamina',
    rarity: 'common',
    synergies: ['speedster'],
    hooks: ['passive'],
    modifiers: [{ stat: 'stamina', value: 20, isPercent: true }],
    effectId: 'staminaBoost20',
    icon: '💪',
    maxStacks: 3
  },
  {
    id: 'nimbleDodge',
    name: 'Nimble Dodge',
    description: '+10% dodge distance',
    rarity: 'common',
    synergies: ['trickster'],
    hooks: ['passive'],
    modifiers: [{ stat: 'dodge', value: 10, isPercent: true }],
    effectId: 'dodgeBoost10',
    icon: '💨',
    maxStacks: 3
  },
  {
    id: 'turfGrip',
    name: 'Turf Grip',
    description: '+8% speed on your half',
    rarity: 'common',
    synergies: ['guardian'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'homeHalfSpeed',
    icon: '🌱'
  },
  {
    id: 'warmUp',
    name: 'Warm Up',
    description: '+10% all stats for first 10s of moment',
    rarity: 'common',
    synergies: ['press'],
    hooks: ['onMomentStart', 'onTick'],
    modifiers: [],
    effectId: 'warmUpBuff',
    icon: '🔥'
  },
  {
    id: 'coolDown',
    name: 'Cool Down',
    description: '+10% all stats in last 10s of moment',
    rarity: 'common',
    synergies: ['precision'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'coolDownBuff',
    icon: '❄️'
  },
  {
    id: 'reboundReady',
    name: 'Rebound Ready',
    description: '+20% shot power on rebound attempts',
    rarity: 'common',
    synergies: ['rebound'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'reboundShotPower',
    icon: '🔄'
  },
  {
    id: 'pressTrigger',
    name: 'Press Trigger',
    description: '+5% speed when enemy has ball',
    rarity: 'common',
    synergies: ['press'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'pressSpeed',
    icon: '🎯',
    maxStacks: 3
  },
  {
    id: 'thickSkin',
    name: 'Thick Skin',
    description: '-10% stun duration from tackles',
    rarity: 'common',
    synergies: ['tank'],
    hooks: ['onDamage'],
    modifiers: [],
    effectId: 'reducedStun10',
    icon: '🛡️',
    maxStacks: 3
  },
  {
    id: 'quickRecovery',
    name: 'Quick Recovery',
    description: '-15% skill cooldowns',
    rarity: 'common',
    synergies: ['speedster'],
    hooks: ['passive'],
    modifiers: [{ stat: 'cooldowns', value: -15, isPercent: true }],
    effectId: 'reducedCooldowns',
    icon: '⏱️',
    maxStacks: 2
  },
  {
    id: 'firstTouch',
    name: 'First Touch',
    description: '+20% control when receiving passes',
    rarity: 'common',
    synergies: ['trianglePassing'],
    hooks: ['onReceive'],
    modifiers: [],
    effectId: 'receiveControl',
    icon: '✋'
  },
  {
    id: 'hardHitter',
    name: 'Hard Hitter',
    description: 'Shots cause brief slowdown on goalie',
    rarity: 'common',
    synergies: ['dragFlick'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'goalieSlowdown',
    icon: '💥'
  },
  {
    id: 'spaceFinder',
    name: 'Space Finder',
    description: '+10% speed when no enemies nearby',
    rarity: 'common',
    synergies: ['speedster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'openSpaceSpeed',
    icon: '🌌'
  },
  {
    id: 'teamPlayer',
    name: 'Team Player',
    description: '+5% all stats per nearby teammate',
    rarity: 'common',
    synergies: ['trianglePassing'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'teammateBuff',
    icon: '🤝',
    maxStacks: 2
  },
  {
    id: 'adrenaline',
    name: 'Adrenaline',
    description: '+15% speed for 2s after dodge',
    rarity: 'common',
    synergies: ['trickster'],
    hooks: ['onDodge'],
    modifiers: [],
    effectId: 'dodgeSpeedBurst',
    icon: '⚡'
  },
  {
    id: 'persistence',
    name: 'Persistence',
    description: '+2% tackle success per failed tackle (resets on success)',
    rarity: 'common',
    synergies: ['press'],
    hooks: ['onTackle'],
    modifiers: [],
    effectId: 'persistentTackle',
    icon: '🔁'
  },

  // ========== UNCOMMON UPGRADES (20) ==========
  {
    id: 'magnetBall',
    name: 'Magnet Ball',
    description: 'Ball slightly curves toward you when nearby',
    rarity: 'uncommon',
    synergies: ['chaos', 'trickster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'ballMagnet',
    icon: '🧲'
  },
  {
    id: 'trailBlazer',
    name: 'Trail Blazer',
    description: 'Leave speed-boost trail for teammates',
    rarity: 'uncommon',
    synergies: ['speedster', 'trianglePassing'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'speedTrail',
    icon: '🌟'
  },
  {
    id: 'triangleFormation',
    name: 'Triangle Formation',
    description: '+25% pass power in triangles with teammates',
    rarity: 'uncommon',
    synergies: ['trianglePassing'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'trianglePassBoost',
    icon: '🔺'
  },
  {
    id: 'circleSpecialist',
    name: 'Circle Specialist',
    description: '+30% shot power inside the D',
    rarity: 'uncommon',
    synergies: ['dragFlick', 'precision'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'circleShotBoost',
    icon: '⭕'
  },
  {
    id: 'pressureCooker',
    name: 'Pressure Cooker',
    description: '+20% tackle range when pressing',
    rarity: 'uncommon',
    synergies: ['press'],
    hooks: ['onTackle'],
    modifiers: [],
    effectId: 'pressTackleRange',
    icon: '🍳'
  },
  {
    id: 'secondWind',
    name: 'Second Wind',
    description: 'Full stamina restore at half-time of moment',
    rarity: 'uncommon',
    synergies: ['speedster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'halfTimeStamina',
    icon: '🌬️'
  },
  {
    id: 'reboundHunter',
    name: 'Rebound Hunter',
    description: '+50% speed toward loose balls after shots',
    rarity: 'uncommon',
    synergies: ['rebound'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'reboundSpeed',
    icon: '🎯'
  },
  {
    id: 'ironWill',
    name: 'Iron Will',
    description: 'Cannot be stunned for longer than 0.5s',
    rarity: 'uncommon',
    synergies: ['tank', 'berserker'],
    hooks: ['onDamage'],
    modifiers: [],
    effectId: 'stunCap',
    icon: '🏔️'
  },
  {
    id: 'quickPass',
    name: 'Quick Pass',
    description: 'Passes travel 30% faster',
    rarity: 'uncommon',
    synergies: ['trianglePassing', 'speedster'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'fastPass',
    icon: '💨'
  },
  {
    id: 'curveShot',
    name: 'Curve Shot',
    description: 'Shots curve slightly toward goal',
    rarity: 'uncommon',
    synergies: ['trickster', 'precision'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'curvingShot',
    icon: '🌀'
  },
  {
    id: 'vampireTackle',
    name: 'Vampire Tackle',
    description: 'Successful tackles restore stamina',
    rarity: 'uncommon',
    synergies: ['vampire', 'press'],
    hooks: ['onSteal'],
    modifiers: [],
    effectId: 'tackleStaminaRestore',
    icon: '🧛'
  },
  {
    id: 'lastStand',
    name: 'Last Stand',
    description: '+30% all stats when conceding',
    rarity: 'uncommon',
    synergies: ['guardian', 'berserker'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'losingBuff',
    icon: '🛡️'
  },
  {
    id: 'momentumShift',
    name: 'Momentum Shift',
    description: '+5% speed per goal scored (stacks to 3)',
    rarity: 'uncommon',
    synergies: ['speedster'],
    hooks: ['onGoal'],
    modifiers: [],
    effectId: 'goalSpeedStack',
    icon: '📈'
  },
  {
    id: 'slickMoves',
    name: 'Slick Moves',
    description: 'Dodge resets on successful steal',
    rarity: 'uncommon',
    synergies: ['trickster', 'press'],
    hooks: ['onSteal'],
    modifiers: [],
    effectId: 'stealDodgeReset',
    icon: '🎭'
  },
  {
    id: 'powerShot',
    name: 'Power Shot',
    description: 'Hold shoot for up to 50% more power',
    rarity: 'uncommon',
    synergies: ['dragFlick', 'precision'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'chargeShot',
    icon: '🔋'
  },
  {
    id: 'counterPress',
    name: 'Counter Press',
    description: '+40% tackle success within 2s of losing ball',
    rarity: 'uncommon',
    synergies: ['press'],
    hooks: ['onTackle'],
    modifiers: [],
    effectId: 'counterPressTackle',
    icon: '↩️'
  },
  {
    id: 'composure',
    name: 'Composure',
    description: '+20% shot accuracy when unmarked',
    rarity: 'uncommon',
    synergies: ['precision'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'unmarkedShotBoost',
    icon: '😌'
  },
  {
    id: 'leadingPass',
    name: 'Leading Pass',
    description: 'Passes predict teammate movement',
    rarity: 'uncommon',
    synergies: ['trianglePassing', 'precision'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'predictivePass',
    icon: '🎯'
  },
  {
    id: 'deflector',
    name: 'Deflector',
    description: '+20% chance to deflect enemy shots when nearby',
    rarity: 'uncommon',
    synergies: ['guardian', 'rebound'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'shotDeflection',
    icon: '🪃'
  },
  {
    id: 'burstSpeed',
    name: 'Burst Speed',
    description: '+50% acceleration after receiving ball',
    rarity: 'uncommon',
    synergies: ['speedster', 'trianglePassing'],
    hooks: ['onReceive'],
    modifiers: [],
    effectId: 'receiveAccel',
    icon: '🚀'
  },

  // ========== RARE UPGRADES (20) ==========
  {
    id: 'boomerangPass',
    name: 'Boomerang Pass',
    description: 'Missed passes return to you',
    rarity: 'rare',
    synergies: ['chaos', 'trianglePassing'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'boomerangPass',
    icon: '🪃'
  },
  {
    id: 'iceTurf',
    name: 'Ice Turf',
    description: 'Enemies slip occasionally; you slide faster',
    rarity: 'rare',
    synergies: ['chaos', 'speedster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'iceTurfEffect',
    icon: '🧊'
  },
  {
    id: 'luckyDeflection',
    name: 'Lucky Deflection',
    description: '15% chance blocked shots redirect to goal',
    rarity: 'rare',
    synergies: ['chaos', 'rebound'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'luckyDeflect',
    icon: '🍀'
  },
  {
    id: 'dragFlickMaster',
    name: 'Drag Flick Master',
    description: 'Shots from stationary are 50% faster',
    rarity: 'rare',
    synergies: ['dragFlick'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'stationaryShotBoost',
    icon: '🏑'
  },
  {
    id: 'pressGang',
    name: 'Press Gang',
    description: 'Teammates copy your press direction',
    rarity: 'rare',
    synergies: ['press', 'trianglePassing'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'coordPress',
    icon: '👥'
  },
  {
    id: 'doubleDeflection',
    name: 'Double Deflection',
    description: 'Rebounds deal +100% damage and move faster',
    rarity: 'rare',
    synergies: ['rebound'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'superRebound',
    icon: '💫'
  },
  {
    id: 'phantomDodge',
    name: 'Phantom Dodge',
    description: 'Leave decoy on dodge that distracts enemies',
    rarity: 'rare',
    synergies: ['trickster'],
    hooks: ['onDodge'],
    modifiers: [],
    effectId: 'dodgeDecoy',
    icon: '👻'
  },
  {
    id: 'vampireGoal',
    name: 'Vampire Goal',
    description: 'Goals restore full stamina and reduce cooldowns',
    rarity: 'rare',
    synergies: ['vampire'],
    hooks: ['onGoal'],
    modifiers: [],
    effectId: 'goalFullRestore',
    icon: '🩸'
  },
  {
    id: 'berserkerMode',
    name: 'Berserker Mode',
    description: '+5% damage per hit taken (max 50%)',
    rarity: 'rare',
    synergies: ['berserker', 'tank'],
    hooks: ['onDamage'],
    modifiers: [],
    effectId: 'damageStacking',
    icon: '😤'
  },
  {
    id: 'precisionStrike',
    name: 'Precision Strike',
    description: 'Perfect timing shots ignore goalie',
    rarity: 'rare',
    synergies: ['precision', 'dragFlick'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'perfectShot',
    icon: '🎯'
  },
  {
    id: 'guardianAngel',
    name: 'Guardian Angel',
    description: 'Once per moment, auto-block a certain goal',
    rarity: 'rare',
    synergies: ['guardian'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'autoBlock',
    icon: '👼'
  },
  {
    id: 'chainTackle',
    name: 'Chain Tackle',
    description: 'Successful tackles reset tackle cooldown',
    rarity: 'rare',
    synergies: ['press', 'berserker'],
    hooks: ['onSteal'],
    modifiers: [],
    effectId: 'tackleReset',
    icon: '⛓️'
  },
  {
    id: 'oneTouch',
    name: 'One Touch',
    description: 'Instant pass after receive is 30% faster',
    rarity: 'rare',
    synergies: ['trianglePassing', 'speedster'],
    hooks: ['onReceive', 'onPass'],
    modifiers: [],
    effectId: 'oneTouchPass',
    icon: '☝️'
  },
  {
    id: 'aerialThreat',
    name: 'Aerial Threat',
    description: 'Can lob passes over defenders',
    rarity: 'rare',
    synergies: ['trianglePassing', 'trickster'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'lobPass',
    icon: '🎈'
  },
  {
    id: 'reverseHit',
    name: 'Reverse Hit',
    description: 'Can shoot backward with 80% power',
    rarity: 'rare',
    synergies: ['trickster', 'dragFlick'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'backShot',
    icon: '↪️'
  },
  {
    id: 'staminaVampire',
    name: 'Stamina Vampire',
    description: 'Drain enemy stamina on tackles',
    rarity: 'rare',
    synergies: ['vampire', 'press'],
    hooks: ['onSteal'],
    modifiers: [],
    effectId: 'stealStamina',
    icon: '🦇'
  },
  {
    id: 'momentumCarry',
    name: 'Momentum Carry',
    description: 'Keep 50% of speed bonuses between moments',
    rarity: 'rare',
    synergies: ['speedster'],
    hooks: ['onMomentEnd'],
    modifiers: [],
    effectId: 'carrySpeed',
    icon: '📦'
  },
  {
    id: 'shieldDodge',
    name: 'Shield Dodge',
    description: 'Dodge creates brief damage immunity shield',
    rarity: 'rare',
    synergies: ['tank', 'trickster'],
    hooks: ['onDodge'],
    modifiers: [],
    effectId: 'dodgeShield',
    icon: '🛡️'
  },
  {
    id: 'reboundMaster',
    name: 'Rebound Master',
    description: '+40% control on loose balls',
    rarity: 'rare',
    synergies: ['rebound'],
    hooks: ['onReceive'],
    modifiers: [],
    effectId: 'looseBallControl',
    icon: '🎱'
  },
  {
    id: 'pressurePoint',
    name: 'Pressure Point',
    description: 'Tackles slow enemy for 2s',
    rarity: 'rare',
    synergies: ['press', 'tank'],
    hooks: ['onSteal'],
    modifiers: [],
    effectId: 'tackleSlow',
    icon: '📍'
  },

  // ========== EPIC UPGRADES (15) ==========
  {
    id: 'multiball',
    name: 'Multiball',
    description: 'Shots split into 2 balls (second is weaker)',
    rarity: 'epic',
    synergies: ['chaos', 'rebound'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'splitShot',
    icon: '🎱'
  },
  {
    id: 'timeDilation',
    name: 'Time Dilation',
    description: 'Slow time briefly after perfect dodge',
    rarity: 'epic',
    synergies: ['trickster', 'precision'],
    hooks: ['onDodge'],
    modifiers: [],
    effectId: 'slowMo',
    icon: '⏰'
  },
  {
    id: 'triangleMastery',
    name: 'Triangle Mastery',
    description: 'Passes in triangle formation auto-complete',
    rarity: 'epic',
    synergies: ['trianglePassing'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'autoTriangle',
    icon: '📐'
  },
  {
    id: 'pressMachine',
    name: 'Press Machine',
    description: 'Teammates auto-press when you press',
    rarity: 'epic',
    synergies: ['press'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'teamPress',
    icon: '🤖'
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Cannot be tackled while shooting',
    rarity: 'epic',
    synergies: ['tank', 'dragFlick'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'shootImmunity',
    icon: '🦏'
  },
  {
    id: 'vampireLord',
    name: 'Vampire Lord',
    description: 'All attacks heal you',
    rarity: 'epic',
    synergies: ['vampire'],
    hooks: ['onHit'],
    modifiers: [],
    effectId: 'attackLifesteal',
    icon: '🧛‍♂️'
  },
  {
    id: 'chaosField',
    name: 'Chaos Field',
    description: 'Random effects trigger every 5s',
    rarity: 'epic',
    synergies: ['chaos'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'randomEffects',
    icon: '🎰'
  },
  {
    id: 'perfectRebound',
    name: 'Perfect Rebound',
    description: 'Rebounds always go toward goal',
    rarity: 'epic',
    synergies: ['rebound', 'precision'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'guidedRebound',
    icon: '🎯'
  },
  {
    id: 'berserkerRage',
    name: 'Berserker Rage',
    description: '+100% attack speed at low stamina',
    rarity: 'epic',
    synergies: ['berserker'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'lowStaminaSpeed',
    icon: '🔥'
  },
  {
    id: 'guardianWall',
    name: 'Guardian Wall',
    description: 'Create barrier behind you that blocks shots',
    rarity: 'epic',
    synergies: ['guardian'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'shotBarrier',
    icon: '🧱'
  },
  {
    id: 'dragFlickKing',
    name: 'Drag Flick King',
    description: 'PC shots are unblockable',
    rarity: 'epic',
    synergies: ['dragFlick'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'unblockablePC',
    icon: '👑'
  },
  {
    id: 'speedDemon',
    name: 'Speed Demon',
    description: '+50% speed but -30% control',
    rarity: 'epic',
    synergies: ['speedster'],
    hooks: ['passive'],
    modifiers: [
      { stat: 'speed', value: 50, isPercent: true },
      { stat: 'control', value: -30, isPercent: true }
    ],
    effectId: 'speedControl',
    icon: '👹'
  },
  {
    id: 'tricksterKing',
    name: 'Trickster King',
    description: 'Triple dodge charges',
    rarity: 'epic',
    synergies: ['trickster'],
    hooks: ['passive'],
    modifiers: [],
    effectId: 'tripleDodge',
    icon: '🃏'
  },
  {
    id: 'tankMode',
    name: 'Tank Mode',
    description: 'Immune to knockback, +50% stun resist',
    rarity: 'epic',
    synergies: ['tank'],
    hooks: ['passive'],
    modifiers: [],
    effectId: 'knockbackImmune',
    icon: '🛡️'
  },
  {
    id: 'passNetwork',
    name: 'Pass Network',
    description: 'Passes chain automatically between teammates',
    rarity: 'epic',
    synergies: ['trianglePassing', 'precision'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'chainPass',
    icon: '🔗'
  },

  // ========== LEGENDARY UPGRADES (5) ==========
  {
    id: 'avatarState',
    name: 'Avatar State',
    description: '+100% all stats when behind by 2+ goals',
    rarity: 'legendary',
    synergies: ['berserker', 'tank'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'avatarMode',
    icon: '🌟'
  },
  {
    id: 'perfectGame',
    name: 'Perfect Game',
    description: 'First shot each moment is guaranteed goal',
    rarity: 'legendary',
    synergies: ['precision', 'dragFlick'],
    hooks: ['onMomentStart', 'onShot'],
    modifiers: [],
    effectId: 'guaranteedGoal',
    icon: '✨'
  },
  {
    id: 'timeLoop',
    name: 'Time Loop',
    description: 'Once per run: rewind 10s after conceding',
    rarity: 'legendary',
    synergies: ['chaos', 'guardian'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'timeRewind',
    icon: '⏪'
  },
  {
    id: 'infiniteStamina',
    name: 'Infinite Stamina',
    description: 'Stamina never depletes',
    rarity: 'legendary',
    synergies: ['speedster', 'vampire'],
    hooks: ['passive'],
    modifiers: [],
    effectId: 'unlimitedStamina',
    icon: '♾️'
  },
  {
    id: 'goldenStick',
    name: 'Golden Stick',
    description: 'All stats +25%, gain extra upgrade choice',
    rarity: 'legendary',
    synergies: [],
    hooks: ['passive'],
    modifiers: [
      { stat: 'speed', value: 25, isPercent: true },
      { stat: 'stamina', value: 25, isPercent: true },
      { stat: 'control', value: 25, isPercent: true },
      { stat: 'shotPower', value: 25, isPercent: true },
      { stat: 'passPower', value: 25, isPercent: true },
      { stat: 'tackle', value: 25, isPercent: true },
      { stat: 'dodge', value: 25, isPercent: true }
    ],
    effectId: 'goldenBoost',
    icon: '🏆'
  }
];

export function getUpgradeById(id: string): Upgrade | undefined {
  return UPGRADES.find(u => u.id === id);
}

export function getUpgradesByRarity(rarity: Rarity): Upgrade[] {
  return UPGRADES.filter(u => u.rarity === rarity);
}

export function getUpgradesBySynergy(synergy: SynergySet): Upgrade[] {
  return UPGRADES.filter(u => u.synergies.includes(synergy));
}

export function getRandomUpgrades(count: number, momentNumber: number, ownedUpgradeIds: string[]): Upgrade[] {
  // Adjust weights based on moment number (later = more rare)
  const adjustedWeights = { ...RARITY_WEIGHTS };
  if (momentNumber >= 3) {
    adjustedWeights.rare += 5;
    adjustedWeights.epic += 2;
  }
  if (momentNumber >= 6) {
    adjustedWeights.rare += 10;
    adjustedWeights.epic += 5;
    adjustedWeights.legendary += 1;
  }
  if (momentNumber >= 9) {
    adjustedWeights.epic += 5;
    adjustedWeights.legendary += 2;
  }
  
  // Filter available upgrades (not already owned unless stackable)
  const available = UPGRADES.filter(u => {
    const ownedCount = ownedUpgradeIds.filter(id => id === u.id).length;
    const maxStacks = u.maxStacks || 1;
    return ownedCount < maxStacks;
  });
  
  if (available.length === 0) return [];
  
  // Weighted random selection
  const totalWeight = Object.values(adjustedWeights).reduce((a, b) => a + b, 0);
  const selected: Upgrade[] = [];
  const usedIds = new Set<string>();
  
  while (selected.length < count && usedIds.size < available.length) {
    const roll = Math.random() * totalWeight;
    let cumulative = 0;
    let targetRarity: Rarity = 'common';
    
    for (const [rarity, weight] of Object.entries(adjustedWeights)) {
      cumulative += weight;
      if (roll <= cumulative) {
        targetRarity = rarity as Rarity;
        break;
      }
    }
    
    const candidates = available.filter(u => u.rarity === targetRarity && !usedIds.has(u.id));
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      selected.push(pick);
      usedIds.add(pick.id);
    } else {
      // Fallback: pick any available
      const fallback = available.filter(u => !usedIds.has(u.id));
      if (fallback.length > 0) {
        const pick = fallback[Math.floor(Math.random() * fallback.length)];
        selected.push(pick);
        usedIds.add(pick.id);
      }
    }
  }
  
  return selected;
}
