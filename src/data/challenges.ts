// Challenge definitions for Stick & Shift
// Completing challenges awards gems and can unlock characters

export interface Challenge {
  id: string;
  name: string;
  description: string;
  requirement: {
    type: 'momentWins' | 'goals' | 'reboundGoals' | 'tackles' | 'passes' | 
          'bossWins' | 'cleanSheets' | 'perfectMoments' | 'synergyBuild' |
          'characterRuns' | 'totalRuns' | 'gemTotal' | 'upgradeCount' |
          'dodges' | 'steals' | 'assists';
    count: number;
    condition?: string;  // Additional condition (e.g., "with Press build")
  };
  reward: {
    gems: number;
    unlockCharacter?: string;  // Character ID to unlock
    unlockMeta?: string;       // Meta upgrade ID to unlock
  };
  tier: 1 | 2 | 3;  // Difficulty tier
  icon: string;
}

export const CHALLENGES: Challenge[] = [
  // ========== TIER 1 - BEGINNER CHALLENGES ==========
  {
    id: 'firstWin',
    name: 'First Blood',
    description: 'Win your first moment',
    requirement: { type: 'momentWins', count: 1 },
    reward: { gems: 25 },
    tier: 1,
    icon: '🎯'
  },
  {
    id: 'scorer',
    name: 'Goal Getter',
    description: 'Score 10 total goals',
    requirement: { type: 'goals', count: 10 },
    reward: { gems: 50 },
    tier: 1,
    icon: '⚽'
  },
  {
    id: 'tackler',
    name: 'Ball Winner',
    description: 'Make 20 successful tackles',
    requirement: { type: 'tackles', count: 20 },
    reward: { gems: 50 },
    tier: 1,
    icon: '⚔️'
  },
  {
    id: 'passer',
    name: 'Playmaker',
    description: 'Complete 50 passes',
    requirement: { type: 'passes', count: 50 },
    reward: { gems: 50 },
    tier: 1,
    icon: '📐'
  },
  {
    id: 'runner',
    name: 'Marathon Runner',
    description: 'Complete 5 runs',
    requirement: { type: 'totalRuns', count: 5 },
    reward: { gems: 75 },
    tier: 1,
    icon: '🏃'
  },
  {
    id: 'firstBoss',
    name: 'Boss Slayer',
    description: 'Win your first boss moment',
    requirement: { type: 'bossWins', count: 1 },
    reward: { gems: 100 },
    tier: 1,
    icon: '👹'
  },
  {
    id: 'dodger',
    name: 'Untouchable',
    description: 'Perform 30 dodges',
    requirement: { type: 'dodges', count: 30 },
    reward: { gems: 50 },
    tier: 1,
    icon: '💨'
  },
  {
    id: 'helper',
    name: 'Team Player',
    description: 'Get 10 assists',
    requirement: { type: 'assists', count: 10 },
    reward: { gems: 50 },
    tier: 1,
    icon: '🤝'
  },

  // ========== TIER 2 - INTERMEDIATE CHALLENGES ==========
  {
    id: 'momentStreak',
    name: 'Hot Streak',
    description: 'Win 3 moments without conceding',
    requirement: { type: 'cleanSheets', count: 3 },
    reward: { gems: 150, unlockCharacter: 'bruno' },
    tier: 2,
    icon: '🔥'
  },
  {
    id: 'reboundKing',
    name: 'Rebound King',
    description: 'Score 5 rebound goals',
    requirement: { type: 'reboundGoals', count: 5 },
    reward: { gems: 150 },
    tier: 2,
    icon: '🔄'
  },
  {
    id: 'perfectMoment',
    name: 'Perfect Moment',
    description: 'Win a moment with 3+ goal difference',
    requirement: { type: 'perfectMoments', count: 1 },
    reward: { gems: 100 },
    tier: 2,
    icon: '✨'
  },
  {
    id: 'bossMaster',
    name: 'Boss Master',
    description: 'Win 5 boss moments',
    requirement: { type: 'bossWins', count: 5 },
    reward: { gems: 200, unlockCharacter: 'kofi' },
    tier: 2,
    icon: '👑'
  },
  {
    id: 'pressBuild',
    name: 'Press Gang',
    description: 'Win a Boss Moment with 3+ Press upgrades',
    requirement: { type: 'synergyBuild', count: 1, condition: 'press' },
    reward: { gems: 200, unlockCharacter: 'sarah' },
    tier: 2,
    icon: '🏃'
  },
  {
    id: 'dragFlickBuild',
    name: 'Flick Master',
    description: 'Win a Boss Moment with 3+ Drag Flick upgrades',
    requirement: { type: 'synergyBuild', count: 1, condition: 'dragFlick' },
    reward: { gems: 200, unlockCharacter: 'priya' },
    tier: 2,
    icon: '🏑'
  },
  {
    id: 'stealMaster',
    name: 'Steal Master',
    description: 'Get 50 steals',
    requirement: { type: 'steals', count: 50 },
    reward: { gems: 150 },
    tier: 2,
    icon: '🥷'
  },
  {
    id: 'hundredGoals',
    name: 'Century',
    description: 'Score 100 total goals',
    requirement: { type: 'goals', count: 100 },
    reward: { gems: 250, unlockCharacter: 'olivia' },
    tier: 2,
    icon: '💯'
  },

  // ========== TIER 3 - EXPERT CHALLENGES ==========
  {
    id: 'triangleBuild',
    name: 'Triangle Master',
    description: 'Win a run with 5+ Triangle Passing upgrades',
    requirement: { type: 'synergyBuild', count: 1, condition: 'trianglePassing' },
    reward: { gems: 300, unlockCharacter: 'lin' },
    tier: 3,
    icon: '🔺'
  },
  {
    id: 'speedsterBuild',
    name: 'Speed Demon',
    description: 'Win a run with 5+ Speedster upgrades',
    requirement: { type: 'synergyBuild', count: 1, condition: 'speedster' },
    reward: { gems: 300, unlockCharacter: 'raj' },
    tier: 3,
    icon: '⚡'
  },
  {
    id: 'vampireBuild',
    name: 'Bloodthirst',
    description: 'Win a run with 4+ Vampire upgrades',
    requirement: { type: 'synergyBuild', count: 1, condition: 'vampire' },
    reward: { gems: 350, unlockCharacter: 'zara' },
    tier: 3,
    icon: '🧛'
  },
  {
    id: 'chaosBuild',
    name: 'Chaos Lord',
    description: 'Win a run with 4+ Chaos upgrades',
    requirement: { type: 'synergyBuild', count: 1, condition: 'chaos' },
    reward: { gems: 350, unlockCharacter: 'yuki' },
    tier: 3,
    icon: '🎰'
  },
  {
    id: 'allBosses',
    name: 'Boss Collector',
    description: 'Beat all 4 boss types at least once',
    requirement: { type: 'bossWins', count: 4, condition: 'unique' },
    reward: { gems: 400, unlockCharacter: 'emma' },
    tier: 3,
    icon: '🏆'
  },
  {
    id: 'perfectRun',
    name: 'Perfect Run',
    description: 'Complete a run without losing any moment',
    requirement: { type: 'momentWins', count: 12, condition: 'noloss' },
    reward: { gems: 500, unlockCharacter: 'ben' },
    tier: 3,
    icon: '⭐'
  },
  {
    id: 'allCharacters',
    name: 'Full Roster',
    description: 'Play a run with 10 different characters',
    requirement: { type: 'characterRuns', count: 10 },
    reward: { gems: 300 },
    tier: 3,
    icon: '👥'
  },
  {
    id: 'gemHoarder',
    name: 'Gem Hoarder',
    description: 'Accumulate 5000 total gems earned',
    requirement: { type: 'gemTotal', count: 5000 },
    reward: { gems: 500, unlockCharacter: 'marcus' },
    tier: 3,
    icon: '💎'
  },
  {
    id: 'guardianBuild',
    name: 'Fortress',
    description: 'Win a run with 4+ Guardian upgrades',
    requirement: { type: 'synergyBuild', count: 1, condition: 'guardian' },
    reward: { gems: 350, unlockCharacter: 'hans' },
    tier: 3,
    icon: '🏰'
  },
  {
    id: 'berserkerBuild',
    name: 'Berserker',
    description: 'Win a run with 4+ Berserker upgrades',
    requirement: { type: 'synergyBuild', count: 1, condition: 'berserker' },
    reward: { gems: 350, unlockCharacter: 'diego' },
    tier: 3,
    icon: '😤'
  },
  {
    id: 'reboundBuild',
    name: 'Rebound Specialist',
    description: 'Win a run with 4+ Rebound upgrades and 10+ rebound goals',
    requirement: { type: 'synergyBuild', count: 1, condition: 'rebound' },
    reward: { gems: 400, unlockCharacter: 'anja' },
    tier: 3,
    icon: '🔄'
  },
  {
    id: 'tankBuild',
    name: 'Immovable Object',
    description: 'Win a run with 4+ Tank upgrades',
    requirement: { type: 'synergyBuild', count: 1, condition: 'tank' },
    reward: { gems: 350 },
    tier: 3,
    icon: '🛡️'
  },
  {
    id: 'tricksterBuild',
    name: 'Master Trickster',
    description: 'Win a run with 5+ Trickster upgrades',
    requirement: { type: 'synergyBuild', count: 1, condition: 'trickster' },
    reward: { gems: 350, unlockCharacter: 'james' },
    tier: 3,
    icon: '🎭'
  },
  {
    id: 'precisionBuild',
    name: 'Surgeon',
    description: 'Win a run with 4+ Precision upgrades',
    requirement: { type: 'synergyBuild', count: 1, condition: 'precision' },
    reward: { gems: 350, unlockCharacter: 'nina' },
    tier: 3,
    icon: '🎯'
  },
  {
    id: 'pcSpecialist',
    name: 'PC Specialist',
    description: 'Score 20 goals from penalty corners',
    requirement: { type: 'goals', count: 20, condition: 'pc' },
    reward: { gems: 400, unlockCharacter: 'tom' },
    tier: 3,
    icon: '🏑'
  }
];

export function getChallengeById(id: string): Challenge | undefined {
  return CHALLENGES.find(c => c.id === id);
}

export function getChallengesByTier(tier: 1 | 2 | 3): Challenge[] {
  return CHALLENGES.filter(c => c.tier === tier);
}

export function getIncompleteChallenges(completedIds: string[]): Challenge[] {
  return CHALLENGES.filter(c => !completedIds.includes(c.id));
}
