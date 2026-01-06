// Meta progression definitions for Stick & Shift
// Permanent upgrades purchased with Yellow XP Gems

export interface MetaUpgrade {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  costPerLevel: number[];  // Cost for each level
  effect: {
    type: string;
    valuePerLevel: number[];
  };
  icon: string;
}

export const META_UPGRADES: MetaUpgrade[] = [
  {
    id: 'startingSpeed',
    name: 'Quick Start',
    description: 'Start runs with bonus speed',
    maxLevel: 5,
    costPerLevel: [50, 100, 150, 250, 400],
    effect: { type: 'speed', valuePerLevel: [2, 4, 6, 8, 10] },
    icon: '👟'
  },
  {
    id: 'startingControl',
    name: 'Soft Touch',
    description: 'Start runs with bonus control',
    maxLevel: 5,
    costPerLevel: [50, 100, 150, 250, 400],
    effect: { type: 'control', valuePerLevel: [2, 4, 6, 8, 10] },
    icon: '🤲'
  },
  {
    id: 'startingShotPower',
    name: 'Power Hitter',
    description: 'Start runs with bonus shot power',
    maxLevel: 5,
    costPerLevel: [50, 100, 150, 250, 400],
    effect: { type: 'shotPower', valuePerLevel: [2, 4, 6, 8, 10] },
    icon: '🏑'
  },
  {
    id: 'startingTackle',
    name: 'Ball Hunter',
    description: 'Start runs with bonus tackle',
    maxLevel: 5,
    costPerLevel: [50, 100, 150, 250, 400],
    effect: { type: 'tackle', valuePerLevel: [2, 4, 6, 8, 10] },
    icon: '⚔️'
  },
  {
    id: 'bonusGems',
    name: 'Gem Finder',
    description: 'Earn bonus gems per run',
    maxLevel: 5,
    costPerLevel: [100, 200, 350, 500, 750],
    effect: { type: 'gemBonus', valuePerLevel: [5, 10, 15, 25, 40] },
    icon: '💎'
  },
  {
    id: 'upgradeChoices',
    name: 'More Options',
    description: 'See extra upgrade choices',
    maxLevel: 2,
    costPerLevel: [300, 600],
    effect: { type: 'extraChoices', valuePerLevel: [1, 2] },
    icon: '🎴'
  },
  {
    id: 'rerollCount',
    name: 'Second Chance',
    description: 'Get rerolls for upgrade drafts',
    maxLevel: 3,
    costPerLevel: [150, 300, 500],
    effect: { type: 'rerolls', valuePerLevel: [1, 2, 3] },
    icon: '🔄'
  },
  {
    id: 'healingRate',
    name: 'Quick Recovery',
    description: 'Recover faster between moments',
    maxLevel: 3,
    costPerLevel: [100, 200, 400],
    effect: { type: 'recovery', valuePerLevel: [10, 20, 35] },
    icon: '💚'
  },
  {
    id: 'startingStamina',
    name: 'Endurance',
    description: 'Start runs with bonus stamina',
    maxLevel: 5,
    costPerLevel: [50, 100, 150, 250, 400],
    effect: { type: 'stamina', valuePerLevel: [2, 4, 6, 8, 10] },
    icon: '💪'
  },
  {
    id: 'rarityBoost',
    name: 'Lucky Rolls',
    description: 'Increased rare upgrade chance',
    maxLevel: 3,
    costPerLevel: [200, 400, 700],
    effect: { type: 'rarityBonus', valuePerLevel: [5, 10, 20] },
    icon: '🍀'
  },
  {
    id: 'startingUpgrade',
    name: 'Head Start',
    description: 'Start runs with a random upgrade',
    maxLevel: 2,
    costPerLevel: [500, 1000],
    effect: { type: 'freeUpgrade', valuePerLevel: [1, 2] },
    icon: '🎁'
  },
  {
    id: 'teammateBoost',
    name: 'Team Spirit',
    description: 'Teammates are stronger',
    maxLevel: 3,
    costPerLevel: [150, 300, 500],
    effect: { type: 'teammateStats', valuePerLevel: [5, 10, 15] },
    icon: '🤝'
  }
];

export function getMetaUpgradeById(id: string): MetaUpgrade | undefined {
  return META_UPGRADES.find(m => m.id === id);
}

export function getMetaUpgradeCost(upgrade: MetaUpgrade, currentLevel: number): number {
  if (currentLevel >= upgrade.maxLevel) return Infinity;
  return upgrade.costPerLevel[currentLevel];
}

export function getMetaUpgradeEffect(upgrade: MetaUpgrade, level: number): number {
  if (level <= 0) return 0;
  return upgrade.effect.valuePerLevel[Math.min(level, upgrade.maxLevel) - 1];
}
