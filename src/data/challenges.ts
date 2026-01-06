// Challenges system for Stick & Shift
// Tracks player achievements and unlocks rewards

export type ChallengeCategory = 'scoring' | 'defense' | 'skill' | 'special';
export type ChallengeRewardType = 'upgrade' | 'character' | 'cosmetic' | 'xp';

export interface ChallengeReward {
  gems: number;
  xp?: number;
  upgradeId?: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  category: ChallengeCategory;
  target: number;  // Number to reach for completion
  reward: ChallengeReward;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ChallengeProgress {
  challengeId: string;
  currentValue: number;
  completed: boolean;
  completedAt?: number;
  claimed: boolean;
}

// Define all challenges
export const CHALLENGES: Challenge[] = [
  // === SCORING CHALLENGES ===
  {
    id: 'first_goal',
    name: 'First Blood',
    description: 'Score your first goal',
    category: 'scoring',
    target: 1,
    reward: { gems: 50 },
    icon: '⚽',
    difficulty: 'easy'
  },
  {
    id: 'score_3_match',
    name: 'Hat Trick',
    description: 'Score 3 goals in a single match',
    category: 'scoring',
    target: 3,
    reward: { gems: 150 },
    icon: '🎩',
    difficulty: 'medium'
  },
  {
    id: 'score_5_match',
    name: 'Superstar',
    description: 'Score 5 goals in a single match',
    category: 'scoring',
    target: 5,
    reward: { gems: 300, upgradeId: 'slap_shot_boost' },
    icon: '⭐',
    difficulty: 'hard'
  },
  {
    id: 'total_goals_10',
    name: 'Goal Getter',
    description: 'Score 10 total goals',
    category: 'scoring',
    target: 10,
    reward: { gems: 100 },
    icon: '🥅',
    difficulty: 'easy'
  },
  {
    id: 'total_goals_50',
    name: 'Prolific Scorer',
    description: 'Score 50 total goals',
    category: 'scoring',
    target: 50,
    reward: { gems: 500 },
    icon: '🏆',
    difficulty: 'medium'
  },
  
  // === DEFENSE CHALLENGES ===
  {
    id: 'first_tackle',
    name: 'First Tackle',
    description: 'Win your first tackle',
    category: 'defense',
    target: 1,
    reward: { gems: 30 },
    icon: '⚔️',
    difficulty: 'easy'
  },
  {
    id: 'tackle_5_match',
    name: 'Tackle Machine',
    description: 'Win 5 tackles in a single match',
    category: 'defense',
    target: 5,
    reward: { gems: 100 },
    icon: '🛡️',
    difficulty: 'medium'
  },
  {
    id: 'total_tackles_25',
    name: 'Ball Winner',
    description: 'Win 25 total tackles',
    category: 'defense',
    target: 25,
    reward: { gems: 200, upgradeId: 'crunch_tackle' },
    icon: '💪',
    difficulty: 'medium'
  },
  {
    id: 'clean_sheet',
    name: 'Clean Sheet',
    description: 'Complete a moment without conceding',
    category: 'defense',
    target: 1,
    reward: { gems: 100 },
    icon: '🧤',
    difficulty: 'medium'
  },
  
  // === SKILL CHALLENGES ===
  {
    id: 'assist_first',
    name: 'Team Player',
    description: 'Get your first assist',
    category: 'skill',
    target: 1,
    reward: { gems: 50 },
    icon: '🤝',
    difficulty: 'easy'
  },
  {
    id: 'total_assists_10',
    name: 'Playmaker',
    description: 'Get 10 total assists',
    category: 'skill',
    target: 10,
    reward: { gems: 200 },
    icon: '📐',
    difficulty: 'medium'
  },
  {
    id: 'dodge_10_match',
    name: 'Untouchable',
    description: 'Dodge 10 times in a single match',
    category: 'skill',
    target: 10,
    reward: { gems: 100 },
    icon: '💨',
    difficulty: 'medium'
  },
  {
    id: 'win_no_dash',
    name: 'Conservative',
    description: 'Win a moment without dashing',
    category: 'skill',
    target: 1,
    reward: { gems: 150 },
    icon: '🚶',
    difficulty: 'hard'
  },
  
  // === SPECIAL CHALLENGES ===
  {
    id: 'rebound_goal',
    name: 'Rebound King',
    description: 'Score a rebound goal',
    category: 'special',
    target: 1,
    reward: { gems: 100 },
    icon: '🔄',
    difficulty: 'medium'
  },
  {
    id: 'comeback',
    name: 'Comeback Kid',
    description: 'Win after being 2 goals down',
    category: 'special',
    target: 1,
    reward: { gems: 200 },
    icon: '🔥',
    difficulty: 'hard'
  },
  {
    id: 'perfect_moment',
    name: 'Perfect Moment',
    description: 'Complete a moment with 3+ goals and 0 conceded',
    category: 'special',
    target: 1,
    reward: { gems: 300, upgradeId: 'fragile_genius' },
    icon: '✨',
    difficulty: 'hard'
  }
];

/**
 * Get a challenge by ID
 */
export function getChallengeById(id: string): Challenge | undefined {
  return CHALLENGES.find(c => c.id === id);
}

/**
 * Get challenges by category
 */
export function getChallengesByCategory(category: ChallengeCategory): Challenge[] {
  return CHALLENGES.filter(c => c.category === category);
}

/**
 * Get challenges by difficulty
 */
export function getChallengesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Challenge[] {
  return CHALLENGES.filter(c => c.difficulty === difficulty);
}
