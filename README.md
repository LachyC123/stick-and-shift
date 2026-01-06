# 🏑 Stick & Shift

**A Field Hockey Roguelike Game**

Stick & Shift is a fast-paced, top-down field hockey roguelike built with Phaser 3, TypeScript, and Vite. Progress through "moments" (short gameplay segments), collect upgrades, unlock characters, and build powerful synergies to dominate the field!

![Stick & Shift](https://img.shields.io/badge/Game-Field%20Hockey%20Roguelike-green)
![Built with](https://img.shields.io/badge/Built%20with-Phaser%203%20%2B%20TypeScript-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎮 Features

- **Roguelike Gameplay**: Each run consists of 8-12 "moments" with unique objectives
- **140+ Upgrades**: Build powerful synergies across 18 different upgrade sets
- **20 Playable Characters**: Each with unique traits and playstyles
- **17+ Moment Types**: Various objectives including new Give-and-Go, Possession Hold, and Press Win modes
- **Boss Moments**: Face challenging boss teams every 3rd moment
- **Field Hockey Action**: Dribble, pass, shoot, tackle, and dodge your way to victory
- **Smart AI**: Teammates spread out, offer passing options, and play realistic tactics
- **Meta Progression**: Spend gems to unlock characters and permanent upgrades
- **Mini Radar**: Track all players and ball position at a glance
- **Challenges**: Complete challenges to earn rewards and unlock content

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (20+ recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/stick-and-shift.git
cd stick-and-shift

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will open automatically in your browser at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

The production build will be in the `dist/` folder.

## 🎯 Controls

| Action | Key |
|--------|-----|
| Move | WASD or Arrow Keys |
| Shoot | Space or Left Click (instant trigger) |
| Pass | E |
| Tackle | Q |
| Dodge | Shift |
| Aim | Mouse (or auto-aim toward goal if keyboard only) |
| Pause | Escape or P |
| Toggle Controls | H (in-game) |

> **Tip**: Shooting triggers instantly on keydown/click - no need to hold!

## 🏆 Game Structure

### Moments

Each run consists of multiple "moments" - short 30-60 second gameplay segments with specific objectives:

- **Score Goals**: Score a target number of goals
- **Defend Lead**: Protect your lead for the duration
- **Survive**: Don't concede any goals
- **Penalty Corner**: Score from set pieces
- **Turnover**: Win the ball back quickly
- And more!

### Boss Moments

Every 3rd moment features a challenging boss team:

- **The Press Machine**: Relentless pressing attack
- **PC Monster Team**: Deadly penalty corner specialists  
- **Star Forward**: Elite striker with special abilities
- **Rain Game**: Slippery conditions modifier

### Upgrades

After each moment, choose from 3 upgrade cards. Build synergies for bonus effects:

- 🔥 **Drag Flick** - Powerful shooting builds
- 🏃 **Press** - Aggressive tackling and pressing
- 🔺 **Triangle Passing** - Team play and assists
- 🔄 **Rebound** - Capitalize on deflections
- 🎭 **Trickster** - Dodge and skill moves
- 🛡️ **Tank** - Damage resistance
- ⚡ **Speedster** - Movement and stamina
- 🧛 **Vampire** - Lifesteal effects
- 🎰 **Chaos** - Random powerful effects
- 🎯 **Precision** - Accuracy bonuses
- 🏰 **Guardian** - Defensive abilities
- 😤 **Berserker** - High risk, high reward
- ↩️ **Counter-Press** - Win the ball back immediately
- ⏳ **Possession** - Keep the ball, build advantages
- 🧤 **Sweeper-Keeper** - Last-line defense
- 🌧️ **Weather** - Thrive in wet/slippery conditions
- 🦅 **Poacher** - Clinical finishing in the box
- 🎈 **Aerial** - Lob passes and volleys

## 📁 Project Structure

```
/
├── index.html              # Entry HTML
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript config
├── src/
│   ├── main.ts             # Game entry point
│   ├── scenes/
│   │   ├── BootScene.ts    # Loading and texture generation
│   │   ├── MenuScene.ts    # Main menu
│   │   ├── StoreScene.ts   # Character/upgrade shop
│   │   ├── CharacterSelectScene.ts
│   │   ├── RunScene.ts     # Main gameplay
│   │   └── EndRunScene.ts  # Results screen
│   ├── systems/
│   │   ├── SaveSystem.ts   # localStorage persistence
│   │   ├── AudioSystem.ts  # Sound effects
│   │   ├── InputSystem.ts  # Keyboard/mouse input
│   │   ├── UpgradeSystem.ts # Upgrade effects
│   │   ├── MomentSystem.ts # Game flow
│   │   ├── UISystem.ts     # HUD management
│   │   └── AISystem.ts     # Enemy/teammate AI
│   ├── entities/
│   │   ├── Player.ts       # Player-controlled character
│   │   ├── Ball.ts         # Field hockey ball
│   │   ├── TeammateAI.ts   # AI teammates
│   │   ├── EnemyAI.ts      # AI opponents
│   │   ├── Projectile.ts   # Special shots
│   │   └── TrailSegment.ts # Visual effects
│   ├── data/
│   │   ├── characters.ts   # 20 character definitions
│   │   ├── upgrades.ts     # 80+ upgrade definitions
│   │   ├── challenges.ts   # Challenge definitions
│   │   ├── moments.ts      # Moment definitions
│   │   └── meta.ts         # Meta progression
│   ├── gfx/
│   │   ├── TextureFactory.ts # Runtime texture generation
│   │   └── Particles.ts    # Particle effects
│   └── ui/
│       ├── Button.ts       # Button component
│       ├── Panels.ts       # Panel components
│       ├── UpgradeDraftOverlay.ts
│       └── Toast.ts        # Notifications
└── .github/workflows/
    └── deploy.yml          # GitHub Pages deployment
```

## 🌐 Deploy to GitHub Pages

### Automatic Deployment

The repository includes a GitHub Actions workflow that automatically deploys to GitHub Pages when you push to the `main` branch.

1. Go to your repository **Settings** > **Pages**
2. Under "Build and deployment", select **GitHub Actions** as the source
3. Push to `main` and the workflow will build and deploy automatically

### Manual Deployment

```bash
# Build the project
npm run build

# The dist/ folder contains the production build
# Deploy this folder to your hosting provider
```

### Configuration

The `vite.config.ts` automatically sets the correct base path for GitHub Pages when the `GITHUB_ACTIONS` environment variable is set.

If your repository is named something other than `stick-and-shift`, update the base path in `vite.config.ts`:

```typescript
base: process.env.GITHUB_ACTIONS ? '/your-repo-name/' : '/',
```

## 🎨 Adding New Content

### Adding New Characters

Edit `src/data/characters.ts`:

```typescript
{
  id: 'newCharacter',
  name: 'New Character',
  role: 'midfielder',
  description: 'Description here',
  stats: { speed: 6, stamina: 6, control: 6, shotPower: 6, passPower: 6, tackle: 6, dodge: 6 },
  trait: { name: 'Trait Name', description: 'What it does', effect: 'effectId' },
  downside: { name: 'Downside Name', description: 'The catch', effect: 'effectId' },
  unlockCost: 200,  // 0 for starter characters
  color: 0x3498db   // Hex color
}
```

### Adding New Upgrades

Edit `src/data/upgrades.ts`:

```typescript
{
  id: 'newUpgrade',
  name: 'New Upgrade',
  description: 'What it does',
  rarity: 'rare',  // common, uncommon, rare, epic, legendary
  synergies: ['speedster', 'trickster'],  // Synergy tags
  hooks: ['onShot', 'onTick'],  // When effects trigger
  modifiers: [{ stat: 'speed', value: 10, isPercent: true }],
  effectId: 'customEffect',
  icon: '⚡',
  maxStacks: 1  // How many times it can be picked
}
```

Then add the effect handler in `src/systems/UpgradeSystem.ts` in the `effectCallbacks` object.

### Adding New Challenges

Edit `src/data/challenges.ts`:

```typescript
{
  id: 'newChallenge',
  name: 'Challenge Name',
  description: 'What to do',
  requirement: { type: 'goals', count: 50 },
  reward: { gems: 200, unlockCharacter: 'characterId' },
  tier: 2,
  icon: '🎯'
}
```

## 🛠️ Technologies

- **[Phaser 3](https://phaser.io/)** - Game framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Vite](https://vitejs.dev/)** - Build tool
- **Runtime Textures** - No external art dependencies

## 📄 License

MIT License - feel free to use this project as a base for your own games!

## 🙏 Acknowledgments

- Phaser community for the excellent game framework
- Field hockey for being an awesome sport

## 📋 CHANGELOG

### v1.1.0 - Major Improvements Update

#### A) Shoot Button / Input Reliability
- Unified shooting into `player.tryShoot()` method
- Shoot now triggers instantly on SPACE keydown and mouse click
- Added 220ms cooldown with HUD pie-chart indicator
- "No possession" feedback (toast + sound) when shooting without ball
- Aim assist for keyboard-only play (defaults toward goal)
- Visual shot tell: stick swing animation + muzzle flash line

#### B) Goal Reactivity / Scoring Feel
- Implemented proper goal sensors with speed + direction validation
- Goals only count when ball is moving toward goal line with sufficient speed
- Added 900ms freeze + camera shake + confetti burst on goals
- Kickoff countdown (3-2-1) after goals
- Net shake effect on goals and saves

#### C) AI That Doesn't Huddle
- Added separation steering (anti-huddle force) between teammates
- Only 2 players max can chase loose balls (primary + support)
- Formation-based positioning by role (defender/mid/forward)
- Team state machine: ATTACK/DEFEND/TRANSITION
- Improved passing logic with lane-checking and cooldowns
- Last-man defender tracks goal-center line

#### D) Clearer Controls Instructions
- Added prominent "🎮 CONTROLS" button in main menu
- Controls overlay accessible via pause menu and H key
- First-run tutorial overlay for new players
- Help button "?" on HUD to reopen controls

#### E) New Content
- **+60 new upgrades** (140+ total) with 6 new synergy sets:
  - Counter-Press, Possession, Sweeper-Keeper, Weather, Poacher, Aerial
- **5 new moment types**:
  - Give-and-Go (pass-receive-score combo)
  - Hold Possession (keep ball for 25s)
  - Press Win (force 2 turnovers)
  - Protect the Injector (survive 3v5 pressure)
  - PC Battle (first to score in penalty corner duel)
- **Mini radar** showing all players and ball positions
- **Post-moment recap** with stats (goals, tackles, passes, possession %)
- Auto-aim assist setting in save data

#### F) Quality & Polish
- Fixed input handling: UI interactions don't steal pitch clicks
- Proper `input.setTopOnly(true)` for UI layering
- Cooldown icons show pie-chart fill
- Pause menu with Resume/Controls/Quit options
- Clean restart without transient object leaks

---

Made with ❤️ and 🏑

**Controls Reminder**: WASD to move, Space to shoot, E to pass, Q to tackle, Shift to dodge!
