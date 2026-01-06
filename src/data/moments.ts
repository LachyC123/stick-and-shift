// Moment definitions for Stick & Shift
// Each moment is a 30-60s gameplay segment with a specific objective

export type MomentObjective = 'score' | 'defend' | 'survive' | 'penaltyCorner' | 
                               'turnover' | 'reboundGoal' | 'multiGoal' | 'assist' |
                               'giveAndGo' | 'possession' | 'pressWin' | 'protectInjector' | 'pcBattle';

export interface MomentModifier {
  id: string;
  name: string;
  description: string;
  effect: string;
}

export interface MomentDefinition {
  id: string;
  name: string;
  description: string;
  objective: MomentObjective;
  duration: number;  // Seconds
  targetScore?: number;  // Goals to score
  defendScore?: number;  // Goals to prevent
  isBoss: boolean;
  bossType?: 'pressMachine' | 'pcMonster' | 'starForward' | 'rainGame';
  difficulty: 1 | 2 | 3 | 4 | 5;
  teamSize: { player: number; enemy: number };
  modifiers: MomentModifier[];
  spawnPattern?: string;
}

export const MOMENT_MODIFIERS: Record<string, MomentModifier> = {
  wetTurf: {
    id: 'wetTurf',
    name: 'Wet Turf',
    description: 'Slippery surface, reduced control',
    effect: 'reducedControl'
  },
  pressIntense: {
    id: 'pressIntense',
    name: 'Intense Press',
    description: 'Enemies press aggressively',
    effect: 'aggressiveAI'
  },
  pcExpert: {
    id: 'pcExpert',
    name: 'PC Experts',
    description: 'Enemy has deadly penalty corners',
    effect: 'strongPC'
  },
  starPlayer: {
    id: 'starPlayer',
    name: 'Star Player',
    description: 'One elite enemy with enhanced abilities',
    effect: 'eliteEnemy'
  },
  shortTime: {
    id: 'shortTime',
    name: 'Short Time',
    description: 'Less time to complete objective',
    effect: 'reducedTime'
  },
  extraGoals: {
    id: 'extraGoals',
    name: 'High Score',
    description: 'Need more goals to win',
    effect: 'extraGoals'
  },
  outnumbered: {
    id: 'outnumbered',
    name: 'Outnumbered',
    description: 'Face more enemies',
    effect: 'moreEnemies'
  },
  noSaves: {
    id: 'noSaves',
    name: 'No Goalie',
    description: 'Play without a goalkeeper',
    effect: 'noGoalie'
  }
};

export const MOMENTS: MomentDefinition[] = [
  // ========== STANDARD MOMENTS ==========
  {
    id: 'scoreOne',
    name: 'Quick Goal',
    description: 'Score 1 goal to win',
    objective: 'score',
    duration: 45,
    targetScore: 1,
    isBoss: false,
    difficulty: 1,
    teamSize: { player: 4, enemy: 3 },
    modifiers: []
  },
  {
    id: 'scoreTwo',
    name: 'Double Trouble',
    description: 'Score 2 goals to win',
    objective: 'multiGoal',
    duration: 60,
    targetScore: 2,
    isBoss: false,
    difficulty: 2,
    teamSize: { player: 4, enemy: 4 },
    modifiers: []
  },
  {
    id: 'defendLead',
    name: 'Hold the Line',
    description: 'Defend your 1-goal lead for 40s',
    objective: 'defend',
    duration: 40,
    defendScore: 1,
    isBoss: false,
    difficulty: 2,
    teamSize: { player: 4, enemy: 4 },
    modifiers: []
  },
  {
    id: 'survival2v3',
    name: 'Survival Mode',
    description: "Don't concede in a 2v3 for 30s",
    objective: 'survive',
    duration: 30,
    isBoss: false,
    difficulty: 3,
    teamSize: { player: 2, enemy: 3 },
    modifiers: [MOMENT_MODIFIERS.outnumbered]
  },
  {
    id: 'penaltyCornerBasic',
    name: 'Penalty Corner',
    description: 'Score from 3 penalty corner attempts',
    objective: 'penaltyCorner',
    duration: 45,
    targetScore: 1,
    isBoss: false,
    difficulty: 2,
    teamSize: { player: 5, enemy: 5 },
    modifiers: []
  },
  {
    id: 'turnoverChallenge',
    name: 'Win It Back',
    description: 'Steal the ball within 20s',
    objective: 'turnover',
    duration: 20,
    isBoss: false,
    difficulty: 2,
    teamSize: { player: 3, enemy: 3 },
    modifiers: []
  },
  {
    id: 'reboundGoal',
    name: 'Rebound Hunter',
    description: 'Score a rebound goal',
    objective: 'reboundGoal',
    duration: 50,
    targetScore: 1,
    isBoss: false,
    difficulty: 3,
    teamSize: { player: 4, enemy: 4 },
    modifiers: []
  },
  {
    id: 'assistGoal',
    name: 'Team Play',
    description: 'Score a goal from an assist',
    objective: 'assist',
    duration: 45,
    targetScore: 1,
    isBoss: false,
    difficulty: 2,
    teamSize: { player: 4, enemy: 3 },
    modifiers: []
  },
  {
    id: 'quickScore',
    name: 'Speed Run',
    description: 'Score 1 goal in 30s',
    objective: 'score',
    duration: 30,
    targetScore: 1,
    isBoss: false,
    difficulty: 3,
    teamSize: { player: 4, enemy: 4 },
    modifiers: [MOMENT_MODIFIERS.shortTime]
  },
  {
    id: 'wetDefend',
    name: 'Rainy Defense',
    description: 'Defend a lead on wet turf',
    objective: 'defend',
    duration: 35,
    defendScore: 1,
    isBoss: false,
    difficulty: 3,
    teamSize: { player: 4, enemy: 4 },
    modifiers: [MOMENT_MODIFIERS.wetTurf]
  },
  {
    id: 'threeGoals',
    name: 'Hat Trick',
    description: 'Score 3 goals to win',
    objective: 'multiGoal',
    duration: 75,
    targetScore: 3,
    isBoss: false,
    difficulty: 4,
    teamSize: { player: 4, enemy: 5 },
    modifiers: [MOMENT_MODIFIERS.extraGoals]
  },
  {
    id: 'noGoalieSurvive',
    name: 'Open Goal',
    description: 'Survive 25s without a goalie',
    objective: 'survive',
    duration: 25,
    isBoss: false,
    difficulty: 4,
    teamSize: { player: 3, enemy: 4 },
    modifiers: [MOMENT_MODIFIERS.noSaves]
  },

  // ========== NEW MOMENT TYPES ==========
  {
    id: 'giveAndGo',
    name: 'Give and Go',
    description: 'Pass, receive, then score in one play',
    objective: 'giveAndGo',
    duration: 50,
    targetScore: 1,
    isBoss: false,
    difficulty: 3,
    teamSize: { player: 4, enemy: 3 },
    modifiers: []
  },
  {
    id: 'holdPossession',
    name: 'Keep Ball',
    description: 'Hold possession for 25 seconds total',
    objective: 'possession',
    duration: 50,
    isBoss: false,
    difficulty: 3,
    teamSize: { player: 4, enemy: 4 },
    modifiers: []
  },
  {
    id: 'pressWin',
    name: 'Press Win',
    description: 'Force 2 turnovers in 40 seconds',
    objective: 'pressWin',
    duration: 40,
    isBoss: false,
    difficulty: 3,
    teamSize: { player: 4, enemy: 3 },
    modifiers: [MOMENT_MODIFIERS.pressIntense]
  },
  {
    id: 'protectInjector',
    name: 'Protect the Injector',
    description: 'Survive intense pressure for 35s',
    objective: 'survive',
    duration: 35,
    isBoss: false,
    difficulty: 4,
    teamSize: { player: 3, enemy: 5 },
    modifiers: [MOMENT_MODIFIERS.pressIntense, MOMENT_MODIFIERS.outnumbered]
  },
  {
    id: 'pcBattle',
    name: 'PC Battle',
    description: 'Win the penalty corner duel (score first in 3 PCs)',
    objective: 'pcBattle',
    duration: 60,
    targetScore: 1,
    isBoss: false,
    difficulty: 3,
    teamSize: { player: 5, enemy: 5 },
    modifiers: []
  },

  // ========== BOSS MOMENTS ==========
  {
    id: 'bossPressMachine',
    name: 'The Press Machine',
    description: 'Face a team that never stops pressing',
    objective: 'score',
    duration: 60,
    targetScore: 2,
    isBoss: true,
    bossType: 'pressMachine',
    difficulty: 4,
    teamSize: { player: 4, enemy: 5 },
    modifiers: [MOMENT_MODIFIERS.pressIntense]
  },
  {
    id: 'bossPCMonster',
    name: 'PC Monster Team',
    description: 'Survive vs elite penalty corner specialists',
    objective: 'defend',
    duration: 50,
    defendScore: 2,
    isBoss: true,
    bossType: 'pcMonster',
    difficulty: 4,
    teamSize: { player: 5, enemy: 5 },
    modifiers: [MOMENT_MODIFIERS.pcExpert]
  },
  {
    id: 'bossStarForward',
    name: 'Star Forward',
    description: 'Stop the elite striker with dodge and killer shot',
    objective: 'survive',
    duration: 45,
    isBoss: true,
    bossType: 'starForward',
    difficulty: 5,
    teamSize: { player: 4, enemy: 4 },
    modifiers: [MOMENT_MODIFIERS.starPlayer]
  },
  {
    id: 'bossRainGame',
    name: 'Rain Game',
    description: 'Score 2 goals on wet, slippery turf',
    objective: 'multiGoal',
    duration: 70,
    targetScore: 2,
    isBoss: true,
    bossType: 'rainGame',
    difficulty: 4,
    teamSize: { player: 4, enemy: 4 },
    modifiers: [MOMENT_MODIFIERS.wetTurf]
  }
];

export function getMomentById(id: string): MomentDefinition | undefined {
  return MOMENTS.find(m => m.id === id);
}

export function getStandardMoments(): MomentDefinition[] {
  return MOMENTS.filter(m => !m.isBoss);
}

export function getBossMoments(): MomentDefinition[] {
  return MOMENTS.filter(m => m.isBoss);
}

export function generateRunMoments(momentCount: number = 10): MomentDefinition[] {
  const standardMoments = getStandardMoments();
  const bossMoments = getBossMoments();
  const run: MomentDefinition[] = [];
  
  for (let i = 0; i < momentCount; i++) {
    // Every 3rd moment (index 2, 5, 8, 11) is a boss moment
    if ((i + 1) % 3 === 0 && bossMoments.length > 0) {
      const bossIndex = Math.floor(Math.random() * bossMoments.length);
      run.push(bossMoments[bossIndex]);
    } else {
      // Pick a standard moment based on difficulty progression
      const targetDifficulty = Math.min(1 + Math.floor(i / 2), 4);
      const candidates = standardMoments.filter(m => 
        m.difficulty <= targetDifficulty + 1 && m.difficulty >= targetDifficulty - 1
      );
      if (candidates.length > 0) {
        const index = Math.floor(Math.random() * candidates.length);
        run.push(candidates[index]);
      } else {
        run.push(standardMoments[Math.floor(Math.random() * standardMoments.length)]);
      }
    }
  }
  
  return run;
}
