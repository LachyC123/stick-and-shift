// SaveSystem for Stick & Shift
// Handles persistent data storage using localStorage

const SAVE_KEY = 'stick_and_shift_save';
const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  gems: number;
  unlockedCharacters: string[];
  completedChallenges: string[];
  metaUpgradeLevels: Record<string, number>;
  stats: GameStats;
  settings: GameSettings;
  lastPlayedCharacter?: string;
}

export interface GameStats {
  totalRuns: number;
  totalMomentsWon: number;
  totalMomentsLost: number;
  totalGoals: number;
  totalReboundGoals: number;
  totalTackles: number;
  totalSteals: number;
  totalPasses: number;
  totalAssists: number;
  totalDodges: number;
  totalBossWins: number;
  totalGemsEarned: number;
  cleanSheets: number;
  perfectMoments: number;
  uniqueCharactersPlayed: string[];
  uniqueBossesDefeated: string[];
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  showDamageNumbers: boolean;
}

const DEFAULT_SAVE: SaveData = {
  version: SAVE_VERSION,
  gems: 0,
  unlockedCharacters: ['alex', 'maya'],  // Starter characters
  completedChallenges: [],
  metaUpgradeLevels: {},
  stats: {
    totalRuns: 0,
    totalMomentsWon: 0,
    totalMomentsLost: 0,
    totalGoals: 0,
    totalReboundGoals: 0,
    totalTackles: 0,
    totalSteals: 0,
    totalPasses: 0,
    totalAssists: 0,
    totalDodges: 0,
    totalBossWins: 0,
    totalGemsEarned: 0,
    cleanSheets: 0,
    perfectMoments: 0,
    uniqueCharactersPlayed: [],
    uniqueBossesDefeated: []
  },
  settings: {
    musicVolume: 0.5,
    sfxVolume: 0.7,
    screenShake: true,
    showDamageNumbers: true
  }
};

export class SaveSystem {
  private static instance: SaveSystem;
  private data: SaveData;
  
  private constructor() {
    this.data = this.load();
  }
  
  static getInstance(): SaveSystem {
    if (!SaveSystem.instance) {
      SaveSystem.instance = new SaveSystem();
    }
    return SaveSystem.instance;
  }
  
  private load(): SaveData {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SaveData;
        
        // Version migration
        if (parsed.version < SAVE_VERSION) {
          return this.migrate(parsed);
        }
        
        // Merge with defaults to handle new fields
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.warn('Failed to load save data, using defaults:', error);
    }
    
    return { ...DEFAULT_SAVE };
  }
  
  private migrate(oldData: SaveData): SaveData {
    // Handle version migrations here
    console.log(`Migrating save from version ${oldData.version} to ${SAVE_VERSION}`);
    
    // For now, just merge with defaults
    return this.mergeWithDefaults({
      ...oldData,
      version: SAVE_VERSION
    });
  }
  
  private mergeWithDefaults(data: Partial<SaveData>): SaveData {
    return {
      ...DEFAULT_SAVE,
      ...data,
      stats: { ...DEFAULT_SAVE.stats, ...(data.stats || {}) },
      settings: { ...DEFAULT_SAVE.settings, ...(data.settings || {}) }
    };
  }
  
  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }
  
  // Gems
  getGems(): number {
    return this.data.gems;
  }
  
  addGems(amount: number): void {
    this.data.gems += amount;
    this.data.stats.totalGemsEarned += amount;
    this.save();
  }
  
  spendGems(amount: number): boolean {
    if (this.data.gems >= amount) {
      this.data.gems -= amount;
      this.save();
      return true;
    }
    return false;
  }
  
  // Characters
  getUnlockedCharacters(): string[] {
    return [...this.data.unlockedCharacters];
  }
  
  isCharacterUnlocked(characterId: string): boolean {
    return this.data.unlockedCharacters.includes(characterId);
  }
  
  unlockCharacter(characterId: string): void {
    if (!this.data.unlockedCharacters.includes(characterId)) {
      this.data.unlockedCharacters.push(characterId);
      this.save();
    }
  }
  
  // Challenges
  getCompletedChallenges(): string[] {
    return [...this.data.completedChallenges];
  }
  
  isChallengeCompleted(challengeId: string): boolean {
    return this.data.completedChallenges.includes(challengeId);
  }
  
  completeChallenge(challengeId: string): void {
    if (!this.data.completedChallenges.includes(challengeId)) {
      this.data.completedChallenges.push(challengeId);
      this.save();
    }
  }
  
  // Meta upgrades
  getMetaUpgradeLevel(upgradeId: string): number {
    return this.data.metaUpgradeLevels[upgradeId] || 0;
  }
  
  setMetaUpgradeLevel(upgradeId: string, level: number): void {
    this.data.metaUpgradeLevels[upgradeId] = level;
    this.save();
  }
  
  // Stats
  getStats(): GameStats {
    return { ...this.data.stats };
  }
  
  incrementStat(stat: keyof GameStats, amount: number = 1): void {
    const current = this.data.stats[stat];
    if (typeof current === 'number') {
      (this.data.stats[stat] as number) += amount;
      this.save();
    }
  }
  
  addUniqueToStat(stat: 'uniqueCharactersPlayed' | 'uniqueBossesDefeated', value: string): void {
    if (!this.data.stats[stat].includes(value)) {
      this.data.stats[stat].push(value);
      this.save();
    }
  }
  
  // Settings
  getSettings(): GameSettings {
    return { ...this.data.settings };
  }
  
  updateSettings(settings: Partial<GameSettings>): void {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
  }
  
  // Last played character
  getLastPlayedCharacter(): string | undefined {
    return this.data.lastPlayedCharacter;
  }
  
  setLastPlayedCharacter(characterId: string): void {
    this.data.lastPlayedCharacter = characterId;
    this.save();
  }
  
  // Reset (for testing)
  reset(): void {
    this.data = { ...DEFAULT_SAVE };
    this.save();
  }
  
  // Export/Import for backup
  exportSave(): string {
    return JSON.stringify(this.data);
  }
  
  importSave(saveString: string): boolean {
    try {
      const parsed = JSON.parse(saveString) as SaveData;
      this.data = this.mergeWithDefaults(parsed);
      this.save();
      return true;
    } catch {
      return false;
    }
  }
}
