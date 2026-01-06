// Character definitions for Stick & Shift
// Each character has unique stats, a trait (passive bonus), and a downside

export interface CharacterStats {
  speed: number;       // Movement speed (1-10)
  stamina: number;     // How long skills last / regen (1-10)
  control: number;     // Ball control, reduces bobble (1-10)
  shotPower: number;   // Shot speed and force (1-10)
  passPower: number;   // Pass accuracy and speed (1-10)
  tackle: number;      // Tackle success rate (1-10)
  dodge: number;       // Dodge distance and i-frames (1-10)
}

export interface Character {
  id: string;
  name: string;
  role: 'forward' | 'midfielder' | 'defender' | 'goalkeeper';
  description: string;
  stats: CharacterStats;
  trait: {
    name: string;
    description: string;
    effect: string; // Key used by UpgradeSystem to apply effects
  };
  downside: {
    name: string;
    description: string;
    effect: string;
  };
  unlockCost: number;  // Yellow XP Gems required (0 = starter)
  color: number;       // Primary jersey color
}

export const CHARACTERS: Character[] = [
  // === STARTER CHARACTERS (Unlocked by default) ===
  {
    id: 'alex',
    name: 'Alex Chen',
    role: 'midfielder',
    description: 'A balanced all-rounder with no major weaknesses.',
    stats: { speed: 6, stamina: 6, control: 6, shotPower: 6, passPower: 6, tackle: 6, dodge: 5 },
    trait: { name: 'Versatile', description: '+5% to all stats', effect: 'versatile' },
    downside: { name: 'Jack of All', description: 'No stat can exceed 8', effect: 'statCap8' },
    unlockCost: 0,
    color: 0x3498db
  },
  {
    id: 'maya',
    name: 'Maya Santos',
    role: 'forward',
    description: 'Lightning fast striker with a killer instinct.',
    stats: { speed: 9, stamina: 5, control: 5, shotPower: 7, passPower: 4, tackle: 3, dodge: 7 },
    trait: { name: 'Speed Demon', description: 'Sprint costs no stamina', effect: 'freeSprintStamina' },
    downside: { name: 'Glass Cannon', description: 'Takes 50% longer to recover from tackles', effect: 'slowTackleRecovery' },
    unlockCost: 0,
    color: 0xe74c3c
  },
  
  // === UNLOCKABLE CHARACTERS ===
  {
    id: 'bruno',
    name: 'Bruno Weber',
    role: 'defender',
    description: 'Rock-solid defender who never gives up.',
    stats: { speed: 4, stamina: 8, control: 5, shotPower: 5, passPower: 6, tackle: 9, dodge: 3 },
    trait: { name: 'Iron Wall', description: '+30% tackle range', effect: 'extendedTackle' },
    downside: { name: 'Heavy Feet', description: '-20% dodge distance', effect: 'shortDodge' },
    unlockCost: 100,
    color: 0x2ecc71
  },
  {
    id: 'priya',
    name: 'Priya Sharma',
    role: 'midfielder',
    description: 'Master of the drag flick and aerial play.',
    stats: { speed: 5, stamina: 6, control: 8, shotPower: 8, passPower: 7, tackle: 4, dodge: 5 },
    trait: { name: 'Drag Flick Master', description: 'Shots from circles have +40% power', effect: 'circleShot' },
    downside: { name: 'Set Piece Only', description: '-15% shot power outside circles', effect: 'weakOpenShot' },
    unlockCost: 150,
    color: 0x9b59b6
  },
  {
    id: 'james',
    name: 'James O\'Brien',
    role: 'forward',
    description: 'Tricky winger who loves to dribble.',
    stats: { speed: 7, stamina: 5, control: 9, shotPower: 5, passPower: 5, tackle: 4, dodge: 8 },
    trait: { name: 'Silky Skills', description: 'Double dodge i-frames', effect: 'extendedIframes' },
    downside: { name: 'Show-off', description: 'Passes have 10% chance to bobble', effect: 'passError' },
    unlockCost: 200,
    color: 0xf39c12
  },
  {
    id: 'lin',
    name: 'Lin Xiaoming',
    role: 'midfielder',
    description: 'Vision and passing genius.',
    stats: { speed: 5, stamina: 6, control: 7, shotPower: 4, passPower: 10, tackle: 5, dodge: 5 },
    trait: { name: 'Quarterback', description: 'Passes auto-target teammates', effect: 'autoTargetPass' },
    downside: { name: 'Weak Shot', description: '-25% shot power', effect: 'weakShot' },
    unlockCost: 250,
    color: 0x1abc9c
  },
  {
    id: 'sarah',
    name: 'Sarah Mitchell',
    role: 'defender',
    description: 'Aggressive defender with great interceptions.',
    stats: { speed: 6, stamina: 7, control: 5, shotPower: 5, passPower: 5, tackle: 8, dodge: 4 },
    trait: { name: 'Interceptor', description: '+50% steal radius when ball is loose', effect: 'magnetSteal' },
    downside: { name: 'Reckless', description: 'Missed tackles have longer cooldown', effect: 'longTackleCd' },
    unlockCost: 175,
    color: 0xe67e22
  },
  {
    id: 'kofi',
    name: 'Kofi Asante',
    role: 'forward',
    description: 'Powerful striker with thunderous shots.',
    stats: { speed: 5, stamina: 6, control: 5, shotPower: 10, passPower: 5, tackle: 4, dodge: 4 },
    trait: { name: 'Cannon Foot', description: 'Shots can knock back goalies', effect: 'knockbackShot' },
    downside: { name: 'Slow Windup', description: 'Shots take 20% longer to charge', effect: 'slowShot' },
    unlockCost: 300,
    color: 0x8e44ad
  },
  {
    id: 'emma',
    name: 'Emma de Vries',
    role: 'goalkeeper',
    description: 'Exceptional goalkeeper with quick reflexes.',
    stats: { speed: 4, stamina: 7, control: 6, shotPower: 6, passPower: 7, tackle: 6, dodge: 6 },
    trait: { name: 'Cat Reflexes', description: '+40% save radius when in goal', effect: 'expandedGoal' },
    downside: { name: 'Stay Home', description: '-30% speed outside D', effect: 'slowOutsideD' },
    unlockCost: 350,
    color: 0xf1c40f
  },
  {
    id: 'raj',
    name: 'Raj Patel',
    role: 'midfielder',
    description: 'Tireless runner who never stops pressing.',
    stats: { speed: 7, stamina: 10, control: 5, shotPower: 5, passPower: 6, tackle: 6, dodge: 5 },
    trait: { name: 'Engine', description: 'Stamina regens 2x faster', effect: 'fastStamina' },
    downside: { name: 'Tunnel Vision', description: '-15% tackle success from behind', effect: 'weakBackTackle' },
    unlockCost: 200,
    color: 0x16a085
  },
  {
    id: 'olivia',
    name: 'Olivia Hart',
    role: 'forward',
    description: 'Lucky striker who finds the net somehow.',
    stats: { speed: 6, stamina: 5, control: 5, shotPower: 6, passPower: 5, tackle: 4, dodge: 6 },
    trait: { name: 'Lucky Star', description: '15% chance for deflected shots to score', effect: 'luckyDeflect' },
    downside: { name: 'Inconsistent', description: 'Stats vary ±15% each moment', effect: 'statVariance' },
    unlockCost: 400,
    color: 0xc0392b
  },
  {
    id: 'diego',
    name: 'Diego Fernandez',
    role: 'midfielder',
    description: 'Aggressive tackler who wins the ball.',
    stats: { speed: 6, stamina: 6, control: 4, shotPower: 5, passPower: 5, tackle: 9, dodge: 5 },
    trait: { name: 'Ball Hunter', description: 'Successful tackles give brief speed boost', effect: 'tackleSpeed' },
    downside: { name: 'Foul Prone', description: '10% chance tackles give opponent free hit', effect: 'foulRisk' },
    unlockCost: 225,
    color: 0x27ae60
  },
  {
    id: 'yuki',
    name: 'Yuki Tanaka',
    role: 'forward',
    description: 'Quick thinker with exceptional awareness.',
    stats: { speed: 7, stamina: 5, control: 7, shotPower: 6, passPower: 7, tackle: 4, dodge: 7 },
    trait: { name: 'Sixth Sense', description: 'See enemy positions on minimap', effect: 'minimap' },
    downside: { name: 'Fragile', description: 'Stunned 25% longer from tackles', effect: 'longStun' },
    unlockCost: 275,
    color: 0xd35400
  },
  {
    id: 'hans',
    name: 'Hans Mueller',
    role: 'defender',
    description: 'Tactical genius who reads the game.',
    stats: { speed: 5, stamina: 7, control: 6, shotPower: 5, passPower: 8, tackle: 7, dodge: 4 },
    trait: { name: 'Playmaker', description: 'Passes to forwards give them brief buff', effect: 'passBuff' },
    downside: { name: 'Slow Turner', description: '-20% rotation speed', effect: 'slowTurn' },
    unlockCost: 325,
    color: 0x2980b9
  },
  {
    id: 'zara',
    name: 'Zara Mohammed',
    role: 'midfielder',
    description: 'Acrobatic midfielder with flashy moves.',
    stats: { speed: 7, stamina: 5, control: 6, shotPower: 6, passPower: 5, tackle: 5, dodge: 9 },
    trait: { name: 'Acrobat', description: 'Dodge can be chained twice', effect: 'doubleDodge' },
    downside: { name: 'Showboat', description: 'Stamina drains faster', effect: 'fastStaminaDrain' },
    unlockCost: 450,
    color: 0x9b59b6
  },
  {
    id: 'marcus',
    name: 'Marcus Johnson',
    role: 'forward',
    description: 'Physical presence in the circle.',
    stats: { speed: 4, stamina: 8, control: 5, shotPower: 8, passPower: 4, tackle: 7, dodge: 3 },
    trait: { name: 'Tank', description: 'Cannot be knocked back while shooting', effect: 'stableShot' },
    downside: { name: 'Sluggish', description: '-25% acceleration', effect: 'slowAccel' },
    unlockCost: 350,
    color: 0x34495e
  },
  {
    id: 'anja',
    name: 'Anja Petrov',
    role: 'defender',
    description: 'Long-range specialist from the back.',
    stats: { speed: 5, stamina: 6, control: 5, shotPower: 7, passPower: 9, tackle: 6, dodge: 4 },
    trait: { name: 'Long Ball', description: '+50% pass range', effect: 'longPass' },
    downside: { name: 'Short Stick', description: '-20% tackle range', effect: 'shortTackle' },
    unlockCost: 280,
    color: 0xe91e63
  },
  {
    id: 'tom',
    name: 'Tom Williams',
    role: 'midfielder',
    description: 'Penalty corner expert.',
    stats: { speed: 5, stamina: 6, control: 7, shotPower: 8, passPower: 7, tackle: 5, dodge: 5 },
    trait: { name: 'PC Specialist', description: '+50% power on penalty corners', effect: 'pcPower' },
    downside: { name: 'Set Piece Only', description: '-10% stats in open play', effect: 'weakOpenPlay' },
    unlockCost: 375,
    color: 0x00bcd4
  },
  {
    id: 'nina',
    name: 'Nina Johansson',
    role: 'forward',
    description: 'Ice cold finisher under pressure.',
    stats: { speed: 6, stamina: 5, control: 7, shotPower: 7, passPower: 5, tackle: 4, dodge: 6 },
    trait: { name: 'Clutch', description: '+30% shot power when behind', effect: 'clutchShot' },
    downside: { name: 'Complacent', description: '-15% all stats when leading', effect: 'leadDebuff' },
    unlockCost: 425,
    color: 0x673ab7
  },
  {
    id: 'ben',
    name: 'Ben O\'Connor',
    role: 'goalkeeper',
    description: 'Sweeper keeper who loves to roam.',
    stats: { speed: 7, stamina: 6, control: 6, shotPower: 5, passPower: 7, tackle: 7, dodge: 5 },
    trait: { name: 'Sweeper', description: 'Full speed anywhere on field', effect: 'fullSpeed' },
    downside: { name: 'Wanderer', description: '-25% save rate in goal', effect: 'weakInGoal' },
    unlockCost: 500,
    color: 0xff5722
  }
];

export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find(c => c.id === id);
}

export function getStarterCharacters(): Character[] {
  return CHARACTERS.filter(c => c.unlockCost === 0);
}

export function getUnlockableCharacters(): Character[] {
  return CHARACTERS.filter(c => c.unlockCost > 0);
}
