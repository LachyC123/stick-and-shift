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
| Shoot | Space or Left Click (tap for quick shot) |
| Charged Shot | Hold Space or Mouse, release for power shot |
| Pass | E |
| Call for Pass | R (request ball from teammates) |
| Tackle | Q |
| Dodge | Shift |
| Aim | Mouse (or auto-aim toward goal if keyboard only) |
| **Build Screen** | **TAB** (view stats, upgrades, synergies) |
| **Call Play: PRESS** | **1** (aggressive pressing for 8s) |
| **Call Play: HOLD** | **2** (safe possession for 8s) |
| **Call Play: COUNTER** | **3** (sit deep, burst on turnover) |
| Pause | Escape or P |
| Toggle Controls | H (in-game) |
| Goal Debug | G (shows goal sensor outlines) |
| Debug Display | F1 (shows possession, objective, AI state, passes) |
| Upgrade Debug | F8 (shows active upgrades, stats, procs) |

> **Tip**: Press R to call for pass! Teammates will prioritize passing to you when the lane is clear.

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

### ⚠️ Important: Configure Pages Source

GitHub Pages **must** be configured to use GitHub Actions as the source, not a branch.

1. Go to your repository **Settings** → **Pages**
2. Under "Build and deployment", change **Source** to **GitHub Actions**
3. Save

If the source is set to a branch (like `gh-pages` or `main`), it will serve the source files instead of the built `dist/` folder.

### Automatic Deployment

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

1. Triggers on push to `main`
2. Builds the project with `GITHUB_PAGES=true`
3. Uploads the `dist/` folder
4. Deploys to GitHub Pages

After configuring the source (above), just push to `main` and the workflow runs automatically.

### Verify the Deployment

After deployment, your game should be at:
```
https://<username>.github.io/stick-and-shift/
```

**If you see errors requesting `/src/main.ts`:** This means the source is wrong. Go to Settings → Pages and change Source to "GitHub Actions".

### Local Build Verification

```bash
# Build with GitHub Pages configuration
GITHUB_PAGES=true npm run build

# Preview the built site
npm run preview

# Verify dist/index.html references assets/*, not /src/main.ts
grep "script.*src" dist/index.html
# Should output: <script ... src="/stick-and-shift/assets/index-XXXXX.js">
```

### Configuration for Different Repository Names

If your repository is named something other than `stick-and-shift`:

1. Update `vite.config.ts`:
   ```typescript
   const repoName = 'your-repo-name';  // Change this line
   ```

2. The deploy workflow uses the same name, so also update `.github/workflows/deploy.yml` if you changed the `REPO_NAME` env var.

### Manual Deployment

```bash
# Build for GitHub Pages
GITHUB_PAGES=true npm run build

# The dist/ folder contains the production build
# Deploy this folder to your hosting provider
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

### v1.5.0 - Upgrades That Work & Phase 1 Features

#### A) Upgrade System Overhaul - GUARANTEED WORKING UPGRADES
- **Validation Audit**: At boot, all upgrades are validated to ensure they have real effects
- Every upgrade must have at least one: stat modifier OR event hook with callback
- Invalid upgrades are logged and excluded from draft pools
- `UpgradeSystem.isUpgradeValid(id)` can check any upgrade
- Console logs `[UPGRADE_AUDIT]` with validation results

#### B) Single Source of Truth for Stats
- `UpgradeSystem.getModifiedStat(base, statName)` is THE way to get final stats
- Player, Ball, and AI all read from UpgradeSystem
- Stat modifiers stack: base stat * (1 + sum of % modifiers / 100)
- Temporary buffs tracked separately with expiration times
- `getFinalStats(baseStats)` returns all stats after modifiers

#### C) Proc Feedback System
- `procUpgrade(id, intensity)` called when upgrades trigger
- Visual toast: "PROC: <name>" with upgrade icon
- Proc counts tracked per moment
- `getTopProcs(5)` returns most-triggered upgrades
- `getRecentProcs()` returns last 10 procs with timestamps

#### D) Build Screen (TAB)
- Press TAB to view full build info mid-game
- Shows: character, trait, downside, final stats
- Cup Run score and current moment objective
- All picked upgrades with proc counts
- Synergy progress (X/5 pips for each)
- Top procs list
- Active curse details (if Comeback Curses triggered)

#### E) Synergy Bonuses - REAL EFFECTS
- Collecting 3 upgrades with same tag = Tier 1 synergy
- Collecting 5 upgrades = Tier 2 synergy (stronger bonuses)
- Synergies apply REAL stat modifiers:
  - PRESS: +20/40% tackle, +10/20% speed
  - TRIANGLE: +25/50% pass power, +15/30% control, 2x Give-and-Go at T2
  - DRAG_FLICK: +25/50% shot power
  - REBOUND: +30/60% rebound speed
  - TRICKSTER: +20/40% dodge, +15/30% control
  - SWEEPER: +20/40% tackle range
- Visual popup when synergy activates
- HUD shows active synergies with tier indicator

#### F) Call Plays (1/2/3 Keys)
- Press 1 = PRESS: Teammates close down aggressively for 8s
- Press 2 = HOLD: Safer passes, wider shape for 8s
- Press 3 = COUNTER: Sit deep, burst forward on turnovers for 8s
- 20 second cooldown between plays
- Visual banner when play is called
- HUD shows active play with countdown timer
- AI aggression modified by active play

#### G) Give-and-Go Bonus
- Pass to teammate, receive return pass within 3.5s
- Activates 2 second buff: +15% speed, +20% control, +15% shot power
- "GIVE & GO!" popup with icon
- TRIANGLE Tier 2 synergy DOUBLES this buff

#### H) Active Buffs HUD
- New HUD row showing active buffs
- Each buff shows icon + countdown ring
- Color-coded by source: purple=upgrade, orange=synergy, blue=play, green=giveAndGo

#### I) How to Add New Upgrades (Guaranteed Functional)

1. Add upgrade to `/src/data/upgrades.ts`:
```typescript
{
  id: 'myUpgrade',
  name: 'My Upgrade',
  description: 'Does something cool',
  rarity: 'rare',
  synergies: ['speedster'],
  hooks: ['onShot'],  // When this triggers
  modifiers: [{ stat: 'shotPower', value: 25, isPercent: true }],  // +25% shot power
  effectId: 'myEffect',  // Must match callback in UpgradeSystem
  icon: '⚡'
}
```

2. If using hooks (not just modifiers), add callback in `UpgradeSystem.getEffectCallback()`:
```typescript
myEffect: (ctx) => {
  this.addTempBuff('myEffect', 'speed', 20, 2000, 'upgrade');
  this.procUpgrade(upgradeId, 1);  // Show proc feedback
}
```

3. **Validation**: On boot, audit will verify your upgrade has either:
   - At least one modifier, OR
   - A hook with a real callback

4. **Testing**: Pick your upgrade in-game, press F8 to see it in debug overlay

---

### v1.3.0 - Gameplay Impact & AI Challenge Update

#### A) Impactful Tackles
- Added tackle impact constants: `TACKLE_KNOCKBACK=340`, `TACKLE_KNOCKBACK_CARRIER=480`
- Knockback pushes tackled players away from the tackler
- `TACKLE_STUN_MS=220` stun duration on successful tackle
- `TACKLE_HITSTOP_MS=55` micro-freeze for satisfying impact feel
- Ball pops loose with strong impulse (`TACKLE_BALL_POP=420`) away from tackler
- Spark particle burst at contact point for visual feedback
- White flash on tackled player for added impact

#### B) Faster Pass & Shot
- Increased `PASS_SPEED_BASE` to 950 and `PASS_SPEED_MAX` to 1400
- Increased `SHOT_SPEED_BASE` to 1200 and `SHOT_SPEED_MAX` to 1750
- Reduced ball drag (`BALL_DRAG=0.990`) for faster travel
- `BALL_MAX_SPEED` raised to 1850 to support powerful shots
- Camera nudge on pass for subtle feedback

#### C) Charged Shot System
- Hold SPACE or mouse button to charge, release to fire
- `CHARGE_MIN_MS=80`, `CHARGE_MAX_MS=850` for timing window
- `CHARGE_POWER_MULT_MAX=1.35` power boost at full charge
- Visual charge bar above player while charging
- Stronger camera shake for charged shots
- Charge canceled on stun or possession loss

#### D) Smarter AI with Objective Awareness
- `ObjectiveDescriptor` passed from MomentSystem to AISystem
- AI adjusts aggression based on objective type (force_turnovers = high press)
- Dynamic line of engagement pushes higher when urgent
- Primary presser assigned to close down ball carrier
- Secondary presser covers passing lanes
- Defenders block shot lines when not actively pressing
- Contains behavior: presser approaches from goal-side to force wide
- Tackle angle check prevents unrealistic tackles from behind
- Difficulty scaling increases with moment number (+5% per moment)

#### E) Debug Display Toggle
- Press `F1` to toggle debug overlay
- Shows: possession state, objective type, urgency %, time remaining
- Displays player charging state and ball speed
- Useful for verifying AI behavior and game state

#### F) Code Quality
- `sparkBurst()` particle effect for tackle impacts
- `applyKnockback()` and `applyHitstop()` methods on Player
- Cleaner separation of objective logic in MomentSystem
- Type-safe objective descriptor interface

---

### v1.4.0 - Team Passing System

#### A) AI Passing to Teammates + Player
- Comprehensive `findBestPassTarget()` with scoring: lane clearness, forward progress, receiver openness, distance
- AI carrier brain evaluates PASS / SHOOT / DRIBBLE every 200ms
- Passes triggered when pressured, teammate in better position, or objective encourages possession
- Player calling bonus: teammates prioritize passing to player when R is pressed
- Pass cooldown (`AI_CARRIER_PASS_COOLDOWN=650ms`) prevents spam

#### B) Call for Pass Input
- Press R to call for pass (sets `isCallingForPass` for 1.2s)
- Visible "CALLING!" indicator above player in debug mode
- Teammates add +35 bonus score when considering player as pass target
- Works even without calling if player is open in a good lane

#### C) Off-Ball Support Movement
- Forward: makes runs into space ahead of ball
- Midfielder: triangle support positions for passing angles
- Defender: stays behind ball as safety outlet
- `applyTeammateSeparation()` prevents clustering
- Dynamic positioning based on ball carrier location

#### D) Enemy Team Passing
- Enemy AI uses same carrier brain logic
- Passes under pressure, switches play when blocked
- `getEnemyDangerScore()` evaluates who is in best position
- Creates realistic team play patterns

#### E) Receive Assist
- `ball.pass()` now tracks intended receiver
- Ball curves slightly toward receiver within `PASS_RECEIVE_RADIUS=60px`
- `PASS_NO_RECAPTURE_MS=120ms` window prevents instant stick-back to passer
- `canBePickedUpBy()` check in all ball pickup handlers

#### F) Debug Visualization
- F1 shows pass completion, calling state
- Green arrow line drawn when pass is made (debug mode)
- "CALLING!" text above player when requesting pass
- Pass lane visualization for debugging

#### G) New Tuning Constants
- `PASS_WEIGHT_LANE=30`, `PASS_WEIGHT_PROGRESS=20`, `PASS_WEIGHT_SPACE=25`
- `PASS_PLAYER_CALL_BONUS=35` for player priority
- `PASS_SCORE_THRESHOLD=20` minimum for valid pass
- `SUPPORT_TRIANGLE_OFFSET=100`, `SUPPORT_MIN_SEPARATION=70`

---

### v1.2.0 - Game Feel & AI Improvements

#### A) Pass + Shoot Physics (Tuning System)
- New `/src/data/tuning.ts` with all physics constants in one place
- `PASS_SPEED_BASE=720`, `SHOT_SPEED_BASE=980` for snappy ball movement
- Ball drag reduced (`BALL_DRAG=0.988`) so shots/passes travel properly
- `ball.kick()` unified method for all ball propulsion
- Visual pass line effect for feedback
- Camera shake on shots and tackles

#### B) Goal Detection (Reliable Scoring)
- Goal sensors now cover full goal mouth with depth behind line
- `ball.crossedLine()` tracks previous position for fast ball crossing detection
- `GOAL_COOLDOWN` prevents double-scoring
- Ball is immediately moved to safe position on goal
- Press `G` to toggle debug view of goal sensor rectangles
- Goals always register if ball enters goal mouth area

#### C) Smarter AI (No More Huddling)
- Lane blocking detection with `AI_LANE_WIDTH` for smarter passing decisions
- Dribble target finding avoids enemies and moves toward goal
- Chaser hysteresis prevents constant switching of ball chaser
- Decision rate-limiting (`AI_DECISION_INTERVAL=220ms`) for consistent behavior
- Tackle backoff prevents spam after failed tackles
- Formation positions adjust based on ball position

#### D) Upgrade Proc Feedback
- `procUpgrade(id, intensity)` method for tracking and showing feedback
- Upgrade icons pulse with rarity-colored glow when they activate
- Toast notification appears for high-intensity procs
- Proc counts tracked per moment for summary
- `getTopProcs(limit)` returns most-used upgrades

#### E) Code Quality
- All tuning constants in one file for easy balancing
- Consistent use of tuning constants across Player, Ball, AI
- TypeScript strict mode compatible

---

### v1.1.1 - Loading Screen Fix

#### Boot Scene Reliability
- Complete rewrite of `BootScene.ts` for fail-safe loading
- Added progress bar with real-time status updates
- Implemented watchdog timer that detects loading stalls (>4 seconds)
- Global error handlers catch and display JS errors and promise rejections
- On-screen error display for debugging (even on GitHub Pages)
- Graceful fallback: if loading stalls, forces transition to menu after warning
- HTML-level loading watchdog as backup before Phaser even loads

#### Error Visibility
- Loading errors now display on-screen in red with clear messages
- Loading stall warnings appear after 5 seconds (HTML level)
- Console logging at every stage for easy debugging
- Fallback texture generation if TextureFactory fails

#### GitHub Pages Support
- Correct base path configuration via `GITHUB_PAGES` env variable
- Updated `deploy.yml` with proper environment variables
- No leading slashes in asset paths (all assets are runtime-generated anyway)

---

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
