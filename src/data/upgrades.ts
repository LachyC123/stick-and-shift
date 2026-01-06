// Upgrade definitions for Stick & Shift
// 80+ upgrades with rarities, synergies, and real effects

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type UpgradeHook = 'onShot' | 'onPass' | 'onTackle' | 'onSteal' | 'onGoal' | 'onReceive' | 
                          'onDodge' | 'onTick' | 'onMomentStart' | 'onMomentEnd' | 'onDamage' | 
                          'onHit' | 'passive';
export type SynergySet = 'dragFlick' | 'press' | 'trianglePassing' | 'rebound' | 'trickster' | 
                         'tank' | 'speedster' | 'vampire' | 'chaos' | 'precision' | 'guardian' | 
                         'berserker' | 'counterPress' | 'possession' | 'sweeper' | 'weather' | 
                         'poacher' | 'aerial';

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
  berserker: 'Berserker',
  counterPress: 'Counter-Press',
  possession: 'Possession',
  sweeper: 'Sweeper-Keeper',
  weather: 'Weather Master',
  poacher: 'Poacher',
  aerial: 'Aerial Threat'
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
  berserker: 0xe74c3c,
  counterPress: 0xff7675,
  possession: 0x74b9ff,
  sweeper: 0x636e72,
  weather: 0x81ecec,
  poacher: 0xfdcb6e,
  aerial: 0xa29bfe
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
    id: 'autoHitInD',
    name: 'Auto Hit in D',
    description: 'Automatically shoot when in the D with ball',
    rarity: 'rare',
    synergies: ['dragFlick', 'precision', 'poacher'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'autoHitInD',
    icon: '🎯'
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
  },

  // ========== NEW UPGRADES - COUNTER-PRESS SET ==========
  {
    id: 'instantReaction',
    name: 'Instant Reaction',
    description: '+50% speed for 1.5s after losing ball',
    rarity: 'uncommon',
    synergies: ['counterPress', 'speedster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'lostBallSpeedBurst',
    icon: '⚡'
  },
  {
    id: 'packHunter',
    name: 'Pack Hunter',
    description: '+15% tackle success per nearby teammate',
    rarity: 'uncommon',
    synergies: ['counterPress', 'press'],
    hooks: ['onTackle'],
    modifiers: [],
    effectId: 'packTackleBoost',
    icon: '🐺'
  },
  {
    id: 'turnoverArtist',
    name: 'Turnover Artist',
    description: 'Steals restore 30% stamina',
    rarity: 'rare',
    synergies: ['counterPress', 'vampire'],
    hooks: ['onSteal'],
    modifiers: [],
    effectId: 'stealStaminaRestore',
    icon: '🎭'
  },
  {
    id: 'gegenpressing',
    name: 'Gegenpressing',
    description: 'Team auto-presses for 3s after turnover',
    rarity: 'epic',
    synergies: ['counterPress', 'press'],
    hooks: ['onSteal'],
    modifiers: [],
    effectId: 'teamCounterPress',
    icon: '🔄'
  },

  // ========== NEW UPGRADES - POSSESSION SET ==========
  {
    id: 'calmControl',
    name: 'Calm Control',
    description: '+20% control when stationary',
    rarity: 'common',
    synergies: ['possession'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'stationaryControl',
    icon: '🧘',
    maxStacks: 2
  },
  {
    id: 'patientPlay',
    name: 'Patient Play',
    description: '+5% all stats per 5s of possession',
    rarity: 'uncommon',
    synergies: ['possession', 'trianglePassing'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'possessionStacking',
    icon: '⏳'
  },
  {
    id: 'keepBall',
    name: 'Keep Ball',
    description: 'Passes have 20% chance to reset cooldowns',
    rarity: 'uncommon',
    synergies: ['possession', 'trianglePassing'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'passCooldownReset',
    icon: '🔁'
  },
  {
    id: 'tikaTaka',
    name: 'Tika-Taka',
    description: 'Back-to-back passes increase speed by 10% each',
    rarity: 'rare',
    synergies: ['possession', 'speedster'],
    hooks: ['onPass', 'onReceive'],
    modifiers: [],
    effectId: 'passingMomentum',
    icon: '⚽'
  },
  {
    id: 'metronome',
    name: 'Metronome',
    description: 'Perfect pass timing gives +50% pass power',
    rarity: 'rare',
    synergies: ['possession', 'precision'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'timedPassBonus',
    icon: '🎵'
  },
  {
    id: 'possessionMaster',
    name: 'Possession Master',
    description: 'Cannot be tackled while ball is bobbing',
    rarity: 'epic',
    synergies: ['possession', 'tank'],
    hooks: ['passive'],
    modifiers: [],
    effectId: 'bobbleImmunity',
    icon: '👑'
  },

  // ========== NEW UPGRADES - SWEEPER-KEEPER SET ==========
  {
    id: 'lastLine',
    name: 'Last Line',
    description: '+30% tackle range when furthest back',
    rarity: 'uncommon',
    synergies: ['sweeper', 'guardian'],
    hooks: ['onTackle'],
    modifiers: [],
    effectId: 'lastManTackleRange',
    icon: '🧱'
  },
  {
    id: 'clearancePower',
    name: 'Clearance Power',
    description: '+50% pass power in own half',
    rarity: 'common',
    synergies: ['sweeper'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'ownHalfPassPower',
    icon: '🦵',
    maxStacks: 2
  },
  {
    id: 'interceptor',
    name: 'Interceptor',
    description: '25% chance to auto-intercept nearby passes',
    rarity: 'rare',
    synergies: ['sweeper', 'guardian'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'autoIntercept',
    icon: '🖐️'
  },
  {
    id: 'rushOut',
    name: 'Rush Out',
    description: '+80% speed when ball in your D-circle',
    rarity: 'rare',
    synergies: ['sweeper', 'speedster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'dCircleRush',
    icon: '🏃'
  },
  {
    id: 'sweeperKeeper',
    name: 'Sweeper Keeper',
    description: 'Auto-block one shot per moment when near goal',
    rarity: 'epic',
    synergies: ['sweeper', 'guardian'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'autoBlockShot',
    icon: '🧤'
  },

  // ========== NEW UPGRADES - WEATHER SET ==========
  {
    id: 'rainDancer',
    name: 'Rain Dancer',
    description: 'No control penalty on wet turf',
    rarity: 'uncommon',
    synergies: ['weather', 'trickster'],
    hooks: ['passive'],
    modifiers: [],
    effectId: 'wetTurfImmune',
    icon: '🌧️'
  },
  {
    id: 'iceSkater',
    name: 'Ice Skater',
    description: '+20% speed on slippery surfaces',
    rarity: 'uncommon',
    synergies: ['weather', 'speedster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'slipSpeedBoost',
    icon: '⛸️'
  },
  {
    id: 'mudRunner',
    name: 'Mud Runner',
    description: 'Enemies slip 30% more often near you',
    rarity: 'rare',
    synergies: ['weather', 'chaos'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'enemySlipAura',
    icon: '🦶'
  },
  {
    id: 'stormChaser',
    name: 'Storm Chaser',
    description: '+15% all stats during weather modifiers',
    rarity: 'rare',
    synergies: ['weather'],
    hooks: ['onMomentStart', 'onTick'],
    modifiers: [],
    effectId: 'weatherStatsBoost',
    icon: '⛈️'
  },
  {
    id: 'weatherMaster',
    name: 'Weather Master',
    description: 'Create slippery zone around you that affects enemies',
    rarity: 'epic',
    synergies: ['weather', 'chaos'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'slipZoneAura',
    icon: '🌀'
  },

  // ========== NEW UPGRADES - POACHER SET ==========
  {
    id: 'boxPresence',
    name: 'Box Presence',
    description: '+20% shot power inside enemy D',
    rarity: 'common',
    synergies: ['poacher', 'dragFlick'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'enemyDShotPower',
    icon: '📦',
    maxStacks: 2
  },
  {
    id: 'goalPoacher',
    name: 'Goal Poacher',
    description: '+40% speed toward loose balls in enemy D',
    rarity: 'uncommon',
    synergies: ['poacher', 'rebound'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'poacherSpeed',
    icon: '🦅'
  },
  {
    id: 'tapIn',
    name: 'Tap In Specialist',
    description: 'Shots at close range are 30% faster',
    rarity: 'uncommon',
    synergies: ['poacher', 'precision'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'closeRangeShotBoost',
    icon: '👆'
  },
  {
    id: 'secondBall',
    name: 'Second Ball',
    description: '+60% chance to reach rebounds first',
    rarity: 'rare',
    synergies: ['poacher', 'rebound'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'reboundPriority',
    icon: '2️⃣'
  },
  {
    id: 'finisher',
    name: 'Clinical Finisher',
    description: 'Goals from inside D restore all cooldowns',
    rarity: 'rare',
    synergies: ['poacher', 'precision'],
    hooks: ['onGoal'],
    modifiers: [],
    effectId: 'dGoalCooldownReset',
    icon: '🎯'
  },
  {
    id: 'poachingInstinct',
    name: 'Poaching Instinct',
    description: 'Teleport to rebound position after teammate shots',
    rarity: 'epic',
    synergies: ['poacher', 'chaos'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'reboundTeleport',
    icon: '✨'
  },

  // ========== NEW UPGRADES - AERIAL SET ==========
  {
    id: 'chipPass',
    name: 'Chip Pass',
    description: 'Passes can go over one defender',
    rarity: 'uncommon',
    synergies: ['aerial', 'trianglePassing'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'chipPassDefender',
    icon: '🎈'
  },
  {
    id: 'loftedShot',
    name: 'Lofted Shot',
    description: 'Hold shoot for aerial shot that dips at goal',
    rarity: 'rare',
    synergies: ['aerial', 'dragFlick'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'dippingShot',
    icon: '🌈'
  },
  {
    id: 'volleyMaster',
    name: 'Volley Master',
    description: '+40% power on first-touch shots from aerials',
    rarity: 'rare',
    synergies: ['aerial', 'precision'],
    hooks: ['onReceive', 'onShot'],
    modifiers: [],
    effectId: 'volleyPowerBoost',
    icon: '🦶'
  },
  {
    id: 'aerialDominance',
    name: 'Aerial Dominance',
    description: 'Always win aerial balls',
    rarity: 'epic',
    synergies: ['aerial', 'tank'],
    hooks: ['passive'],
    modifiers: [],
    effectId: 'winAerials',
    icon: '🏆'
  },

  // ========== NEW UPGRADES - DRAG FLICK EXTENDED ==========
  {
    id: 'pcSpecialist',
    name: 'PC Specialist',
    description: '+30% shot power from penalty corners',
    rarity: 'uncommon',
    synergies: ['dragFlick'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'pcShotPower',
    icon: '🎯'
  },
  {
    id: 'lowFlick',
    name: 'Low Flick',
    description: 'Shots from stationary go under blockers',
    rarity: 'rare',
    synergies: ['dragFlick', 'precision'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'lowShotPenetration',
    icon: '⬇️'
  },
  {
    id: 'windUp',
    name: 'Wind Up',
    description: 'Standing still charges shot power (max +50%)',
    rarity: 'rare',
    synergies: ['dragFlick', 'precision'],
    hooks: ['onTick', 'onShot'],
    modifiers: [],
    effectId: 'stationaryCharge',
    icon: '🌀'
  },
  {
    id: 'topCorner',
    name: 'Top Corner',
    description: '20% of shots become unsaveable',
    rarity: 'epic',
    synergies: ['dragFlick', 'precision'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'unsaveableShot',
    icon: '📐'
  },

  // ========== NEW UPGRADES - PRESS EXTENDED ==========
  {
    id: 'highLine',
    name: 'High Line',
    description: 'Team pushes higher, +10% team speed',
    rarity: 'uncommon',
    synergies: ['press'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'highLineSpeed',
    icon: '⬆️'
  },
  {
    id: 'trapSetter',
    name: 'Trap Setter',
    description: 'Enemies near sideline lose 15% speed',
    rarity: 'rare',
    synergies: ['press', 'guardian'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'sidelineTrap',
    icon: '🕸️'
  },
  {
    id: 'relentless',
    name: 'Relentless',
    description: 'No stamina cost when pressing',
    rarity: 'rare',
    synergies: ['press', 'speedster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'freePressing',
    icon: '♾️'
  },
  {
    id: 'suffocate',
    name: 'Suffocate',
    description: 'Enemies with ball lose 5% control per second',
    rarity: 'epic',
    synergies: ['press'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'pressureControlDrain',
    icon: '😤'
  },

  // ========== NEW UPGRADES - TRICKSTER EXTENDED ==========
  {
    id: 'fakeShot',
    name: 'Fake Shot',
    description: 'Dodge creates fake shot animation',
    rarity: 'uncommon',
    synergies: ['trickster'],
    hooks: ['onDodge'],
    modifiers: [],
    effectId: 'dodgeFakeShot',
    icon: '🎭'
  },
  {
    id: 'nutmeg',
    name: 'Nutmeg Master',
    description: '15% chance to phase through tackles',
    rarity: 'rare',
    synergies: ['trickster', 'tank'],
    hooks: ['passive'],
    modifiers: [],
    effectId: 'tacklePhase',
    icon: '🥜'
  },
  {
    id: 'stepOver',
    name: 'Step Over',
    description: 'Dodge confuses nearby enemies for 1s',
    rarity: 'rare',
    synergies: ['trickster'],
    hooks: ['onDodge'],
    modifiers: [],
    effectId: 'dodgeConfuse',
    icon: '💫'
  },
  {
    id: 'elastico',
    name: 'Elastico',
    description: 'Double-tap dodge for quick direction change',
    rarity: 'epic',
    synergies: ['trickster', 'speedster'],
    hooks: ['onDodge'],
    modifiers: [],
    effectId: 'doubleDodge',
    icon: '🔀'
  },

  // ========== NEW UPGRADES - REBOUND EXTENDED ==========
  {
    id: 'deflectionKing',
    name: 'Deflection King',
    description: 'Blocked shots gain +30% power',
    rarity: 'uncommon',
    synergies: ['rebound'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'blockedShotPowerGain',
    icon: '👑'
  },
  {
    id: 'anticipation',
    name: 'Anticipation',
    description: 'See shot trajectory before it happens',
    rarity: 'rare',
    synergies: ['rebound', 'guardian'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'shotPrediction',
    icon: '👁️'
  },
  {
    id: 'ricochets',
    name: 'Ricochets',
    description: 'Shots bounce off players toward goal',
    rarity: 'epic',
    synergies: ['rebound', 'chaos'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'playerBounceToGoal',
    icon: '🔄'
  },

  // ========== NEW UPGRADES - GUARDIAN EXTENDED ==========
  {
    id: 'goalkeeper',
    name: 'Goalkeeper',
    description: '+40% tackle success in own D',
    rarity: 'uncommon',
    synergies: ['guardian', 'sweeper'],
    hooks: ['onTackle'],
    modifiers: [],
    effectId: 'ownDTackleBoost',
    icon: '🧤'
  },
  {
    id: 'shotBlocker',
    name: 'Shot Blocker',
    description: '+30% body size when blocking shots',
    rarity: 'rare',
    synergies: ['guardian', 'tank'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'enlargeForBlock',
    icon: '🚧'
  },
  {
    id: 'clearanceBot',
    name: 'Clearance Bot',
    description: 'Auto-clear balls in your D toward enemy half',
    rarity: 'rare',
    synergies: ['guardian', 'sweeper'],
    hooks: ['onReceive'],
    modifiers: [],
    effectId: 'autoClearance',
    icon: '🤖'
  },

  // ========== NEW UPGRADES - SPEEDSTER EXTENDED ==========
  {
    id: 'afterburner',
    name: 'Afterburner',
    description: '+30% speed after 2s of sprinting',
    rarity: 'uncommon',
    synergies: ['speedster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'sprintRampUp',
    icon: '🔥'
  },
  {
    id: 'quickBreak',
    name: 'Quick Break',
    description: '+50% speed for 3s after steals',
    rarity: 'rare',
    synergies: ['speedster', 'counterPress'],
    hooks: ['onSteal'],
    modifiers: [],
    effectId: 'stealSpeedBurst',
    icon: '💨'
  },
  {
    id: 'breakaway',
    name: 'Breakaway',
    description: '+25% speed when no enemies ahead',
    rarity: 'rare',
    synergies: ['speedster', 'poacher'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'openFieldSpeed',
    icon: '🏃‍♂️'
  },
  {
    id: 'speedDemonMk2',
    name: 'Speed Demon Mk2',
    description: 'Max speed increases by 5% per moment',
    rarity: 'epic',
    synergies: ['speedster'],
    hooks: ['onMomentEnd'],
    modifiers: [],
    effectId: 'stackingSpeed',
    icon: '🚀'
  },

  // ========== NEW UPGRADES - TANK EXTENDED ==========
  {
    id: 'immovable',
    name: 'Immovable',
    description: '-50% knockback from all sources',
    rarity: 'uncommon',
    synergies: ['tank'],
    hooks: ['onDamage'],
    modifiers: [],
    effectId: 'reducedKnockback',
    icon: '🗿'
  },
  {
    id: 'brickWall',
    name: 'Brick Wall',
    description: 'Enemies bounce off you when you have ball',
    rarity: 'rare',
    synergies: ['tank', 'possession'],
    hooks: ['onDamage'],
    modifiers: [],
    effectId: 'tacklerBounce',
    icon: '🧱'
  },
  {
    id: 'bullRush',
    name: 'Bull Rush',
    description: 'Sprint through tackles with 30% chance',
    rarity: 'rare',
    synergies: ['tank', 'speedster'],
    hooks: ['passive'],
    modifiers: [],
    effectId: 'sprintThroughTackle',
    icon: '🐂'
  },
  {
    id: 'juggernaut',
    name: 'Juggernaut',
    description: 'Immune to stuns while moving',
    rarity: 'epic',
    synergies: ['tank', 'berserker'],
    hooks: ['passive'],
    modifiers: [],
    effectId: 'movingStunImmune',
    icon: '🦏'
  },

  // ========== NEW UPGRADES - VAMPIRE EXTENDED ==========
  {
    id: 'lifeSteal',
    name: 'Life Steal',
    description: 'Tackles restore 10% stamina',
    rarity: 'common',
    synergies: ['vampire', 'press'],
    hooks: ['onTackle'],
    modifiers: [],
    effectId: 'tackleStaminaGain',
    icon: '🩸',
    maxStacks: 2
  },
  {
    id: 'drainTouch',
    name: 'Drain Touch',
    description: 'Contact with enemies drains their stamina',
    rarity: 'rare',
    synergies: ['vampire', 'tank'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'contactStaminaDrain',
    icon: '✋'
  },
  {
    id: 'soulSiphon',
    name: 'Soul Siphon',
    description: 'Goals heal 50% of missing stamina',
    rarity: 'rare',
    synergies: ['vampire'],
    hooks: ['onGoal'],
    modifiers: [],
    effectId: 'goalStaminaHeal',
    icon: '👻'
  },
  {
    id: 'bloodlust',
    name: 'Bloodlust',
    description: 'Each steal increases speed by 10% (stacks 5x)',
    rarity: 'epic',
    synergies: ['vampire', 'berserker'],
    hooks: ['onSteal'],
    modifiers: [],
    effectId: 'stealSpeedStacking',
    icon: '🩸'
  },

  // ========== NEW UPGRADES - BERSERKER EXTENDED ==========
  {
    id: 'rageBuildup',
    name: 'Rage Buildup',
    description: '+3% power per tackle taken (max 30%)',
    rarity: 'uncommon',
    synergies: ['berserker'],
    hooks: ['onDamage'],
    modifiers: [],
    effectId: 'damagePowerStack',
    icon: '😠'
  },
  {
    id: 'frenzy',
    name: 'Frenzy',
    description: '+20% attack speed when below 30% stamina',
    rarity: 'rare',
    synergies: ['berserker', 'speedster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'lowStaminaAttackSpeed',
    icon: '🔴'
  },
  {
    id: 'desperateShot',
    name: 'Desperate Shot',
    description: '+50% shot power when losing',
    rarity: 'rare',
    synergies: ['berserker', 'dragFlick'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'losingShotPower',
    icon: '😤'
  },
  {
    id: 'unhinged',
    name: 'Unhinged',
    description: 'Random stat boosts every 5s',
    rarity: 'epic',
    synergies: ['berserker', 'chaos'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'randomStatBoosts',
    icon: '🃏'
  },

  // ========== NEW UPGRADES - CHAOS EXTENDED ==========
  {
    id: 'ballMagnetPlus',
    name: 'Ball Magnet+',
    description: 'Stronger ball attraction effect',
    rarity: 'rare',
    synergies: ['chaos', 'trickster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'strongBallMagnet',
    icon: '🧲'
  },
  {
    id: 'teleportBall',
    name: 'Teleport Ball',
    description: '10% chance passes teleport to target',
    rarity: 'rare',
    synergies: ['chaos', 'trianglePassing'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'instantPass',
    icon: '✨'
  },
  {
    id: 'mirrorImage',
    name: 'Mirror Image',
    description: 'Create decoy that confuses AI',
    rarity: 'epic',
    synergies: ['chaos', 'trickster'],
    hooks: ['onDodge'],
    modifiers: [],
    effectId: 'createDecoy',
    icon: '👥'
  },

  // ========== NEW UPGRADES - PRECISION EXTENDED ==========
  {
    id: 'perfectPass',
    name: 'Perfect Pass',
    description: 'Passes that hit targets exactly give +10% speed',
    rarity: 'uncommon',
    synergies: ['precision', 'trianglePassing'],
    hooks: ['onPass'],
    modifiers: [],
    effectId: 'accuratePassBonus',
    icon: '🎯'
  },
  {
    id: 'sniper',
    name: 'Sniper',
    description: '+25% shot accuracy from distance',
    rarity: 'rare',
    synergies: ['precision', 'dragFlick'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'longRangeShotAccuracy',
    icon: '🔭'
  },
  {
    id: 'clutchPlayer',
    name: 'Clutch Player',
    description: '+30% all stats in final 15s',
    rarity: 'rare',
    synergies: ['precision'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'finalSecondsBoost',
    icon: '⏰'
  },
  {
    id: 'sureShot',
    name: 'Sure Shot',
    description: 'First shot after receiving is guaranteed on target',
    rarity: 'epic',
    synergies: ['precision', 'poacher'],
    hooks: ['onReceive', 'onShot'],
    modifiers: [],
    effectId: 'firstTouchOnTarget',
    icon: '💯'
  },

  // ========== 20 NEW UPGRADES (PART E - CRITICAL FIX PACK) ==========
  
  // 1) slap_shot_boost - +18% shot speed
  {
    id: 'slap_shot_boost',
    name: 'Slap Shot Boost',
    description: '+18% shot speed - feel the power!',
    rarity: 'uncommon',
    synergies: ['dragFlick', 'precision'],
    hooks: ['passive'],
    modifiers: [{ stat: 'shotPower', value: 18, isPercent: true }],
    effectId: 'slapShotBoost',
    icon: '🏒',
    maxStacks: 2
  },
  
  // 2) quick_release - shoot cooldown reduction after shooting
  {
    id: 'quick_release',
    name: 'Quick Release',
    description: 'Shooting reduces next shoot cooldown by 25% for 2s',
    rarity: 'rare',
    synergies: ['dragFlick', 'speedster'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'quickReleaseBuff',
    icon: '⚡'
  },
  
  // 3) curve_drive - shots curve/spin more
  {
    id: 'curve_drive',
    name: 'Curve Drive',
    description: 'Shots curve toward goal + visible spin effect',
    rarity: 'uncommon',
    synergies: ['trickster', 'precision'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'curveDriveShot',
    icon: '🌀'
  },
  
  // 4) one_touch_finish - receive in D = next shot +20% speed
  {
    id: 'one_touch_finish',
    name: 'One Touch Finish',
    description: 'Receive ball inside D → next shot within 1.2s gets +20% speed',
    rarity: 'rare',
    synergies: ['poacher', 'precision'],
    hooks: ['onReceive', 'onShot'],
    modifiers: [],
    effectId: 'oneTouchFinishBuff',
    icon: '☝️'
  },
  
  // 5) d_poacher - +10% speed when in D with ball
  {
    id: 'd_poacher',
    name: 'D Poacher',
    description: '+10% speed when in attacking D with ball',
    rarity: 'uncommon',
    synergies: ['poacher', 'speedster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'dPoacherSpeed',
    icon: '🎯'
  },
  
  // 6) laser_passes - +20% pass speed
  {
    id: 'laser_passes',
    name: 'Laser Passes',
    description: '+20% pass speed - crisp and accurate',
    rarity: 'uncommon',
    synergies: ['trianglePassing', 'speedster'],
    hooks: ['passive'],
    modifiers: [{ stat: 'passPower', value: 20, isPercent: true }],
    effectId: 'laserPasses',
    icon: '💫',
    maxStacks: 2
  },
  
  // 7) give_go_master - improved give-and-go
  {
    id: 'give_go_master',
    name: 'Give & Go Master',
    description: 'Give-and-go window extended + stronger speed buff',
    rarity: 'rare',
    synergies: ['trianglePassing', 'speedster'],
    hooks: ['onPass', 'onReceive'],
    modifiers: [],
    effectId: 'giveGoMasterBuff',
    icon: '🔄'
  },
  
  // 8) magnetic_first_touch - better control on receive
  {
    id: 'magnetic_first_touch',
    name: 'Magnetic First Touch',
    description: '+30% control for 2s after receiving + ball magnetism',
    rarity: 'uncommon',
    synergies: ['possession', 'trickster'],
    hooks: ['onReceive'],
    modifiers: [],
    effectId: 'magneticFirstTouch',
    icon: '🧲'
  },
  
  // 9) interception_gloves - larger intercept radius
  {
    id: 'interception_gloves',
    name: 'Interception Gloves',
    description: '+15% intercept/pickup radius',
    rarity: 'uncommon',
    synergies: ['guardian', 'sweeper'],
    hooks: ['passive'],
    modifiers: [{ stat: 'interceptRadius', value: 15, isPercent: true }],
    effectId: 'interceptionGloves',
    icon: '🧤'
  },
  
  // 10) crunch_tackle - +25% tackle knockback
  {
    id: 'crunch_tackle',
    name: 'Crunch Tackle',
    description: '+25% tackle knockback - send them flying!',
    rarity: 'uncommon',
    synergies: ['press', 'berserker'],
    hooks: ['passive'],
    modifiers: [{ stat: 'tackleKnockback', value: 25, isPercent: true }],
    effectId: 'crunchTackle',
    icon: '💪',
    maxStacks: 2
  },
  
  // 11) stun_stick - +120ms stun on tackles
  {
    id: 'stun_stick',
    name: 'Stun Stick',
    description: 'Successful tackles add +120ms stun duration',
    rarity: 'rare',
    synergies: ['press', 'tank'],
    hooks: ['onSteal'],
    modifiers: [],
    effectId: 'stunStickExtra',
    icon: '⚡'
  },
  
  // 12) second_wind - restore stamina at moment start
  {
    id: 'second_wind_moment',
    name: 'Second Wind',
    description: 'Restore full stamina at moment start (once per moment)',
    rarity: 'uncommon',
    synergies: ['speedster'],
    hooks: ['onMomentStart'],
    modifiers: [],
    effectId: 'secondWindMoment',
    icon: '🌬️'
  },
  
  // 13) efficient_dash - dash stamina -30%
  {
    id: 'efficient_dash',
    name: 'Efficient Dash',
    description: 'Dash stamina cost reduced by 30%',
    rarity: 'uncommon',
    synergies: ['speedster', 'trickster'],
    hooks: ['passive'],
    modifiers: [{ stat: 'dashCost', value: -30, isPercent: true }],
    effectId: 'efficientDash',
    icon: '💨',
    maxStacks: 2
  },
  
  // 14) adrenaline_advantage - stronger advantage buff on steal
  {
    id: 'adrenaline_advantage',
    name: 'Adrenaline Advantage',
    description: 'Steal triggers 3s SUPER advantage (+20% speed/pass/shot)',
    rarity: 'rare',
    synergies: ['counterPress', 'speedster'],
    hooks: ['onSteal'],
    modifiers: [],
    effectId: 'adrenalineAdvantageBuff',
    icon: '🔥'
  },
  
  // 15) pc_drag_flick - PC shots +35% power
  {
    id: 'pc_drag_flick',
    name: 'PC Drag Flick',
    description: 'Penalty corner shots have +35% power',
    rarity: 'rare',
    synergies: ['dragFlick'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'pcDragFlickPower',
    icon: '🏑'
  },
  
  // 16) pc_injector - PC pass speed +25%, stopper control +15%
  {
    id: 'pc_injector',
    name: 'PC Injector',
    description: 'PC injection pass +25% speed, stopper control +15%',
    rarity: 'uncommon',
    synergies: ['dragFlick', 'trianglePassing'],
    hooks: ['onPass', 'onReceive'],
    modifiers: [
      { stat: 'pcPassSpeed', value: 25, isPercent: true },
      { stat: 'pcControl', value: 15, isPercent: true }
    ],
    effectId: 'pcInjectorBuff',
    icon: '💉'
  },
  
  // 17) keeper_nerves - shots in D get small speed burst vs GK
  {
    id: 'keeper_nerves',
    name: 'Keeper Nerves',
    description: 'Shots from inside D get +8% speed burst (beats GK reaction)',
    rarity: 'rare',
    synergies: ['poacher', 'precision'],
    hooks: ['onShot'],
    modifiers: [],
    effectId: 'keeperNervesBurst',
    icon: '😰'
  },
  
  // 18) rebound_hunter_pro - burst speed on GK save/rebound
  {
    id: 'rebound_hunter_pro',
    name: 'Rebound Hunter Pro',
    description: 'On ball deflection/rebound: +50% speed for 1.5s',
    rarity: 'rare',
    synergies: ['rebound', 'speedster'],
    hooks: ['onTick'],
    modifiers: [],
    effectId: 'reboundHunterProBurst',
    icon: '🦅'
  },
  
  // 19) iron_body - tackle damage -25%
  {
    id: 'iron_body',
    name: 'Iron Body',
    description: 'Take 25% less damage from tackles',
    rarity: 'uncommon',
    synergies: ['tank'],
    hooks: ['passive'],
    modifiers: [{ stat: 'tackleDamageReduction', value: 25, isPercent: true }],
    effectId: 'ironBody',
    icon: '🛡️',
    maxStacks: 2
  },
  
  // 20) fragile_genius - +25% shot speed, +20% tackle damage taken
  {
    id: 'fragile_genius',
    name: 'Fragile Genius',
    description: '+25% shot speed BUT +20% tackle damage taken',
    rarity: 'rare',
    synergies: ['dragFlick', 'berserker'],
    hooks: ['passive'],
    modifiers: [
      { stat: 'shotPower', value: 25, isPercent: true },
      { stat: 'tackleDamageTaken', value: 20, isPercent: true }
    ],
    effectId: 'fragileGenius',
    icon: '🧠'
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
