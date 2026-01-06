// Tuning constants for Stick & Shift
// Central place for all physics and gameplay tuning values
// Edit these to adjust game feel without hunting through code

// ============================================================
// BALL PHYSICS
// ============================================================

/** Base pass speed in pixels/sec */
export const PASS_SPEED_BASE = 950;
/** Additional speed per passPower stat point */
export const PASS_SPEED_SCALE = 20;
/** Maximum pass speed */
export const PASS_SPEED_MAX = 1400;

/** Base shot speed in pixels/sec */
export const SHOT_SPEED_BASE = 1200;
/** Additional speed per shotPower stat point */
export const SHOT_SPEED_SCALE = 25;
/** Maximum shot speed */
export const SHOT_SPEED_MAX = 1750;

/** Ball drag per frame (0.99 = very little drag, 0.95 = heavy drag) */
export const BALL_DRAG = 0.990;
/** Ball velocity is clamped to this maximum */
export const BALL_MAX_SPEED = 1850;
/** Minimum speed before ball stops */
export const BALL_STOP_THRESHOLD = 12;

/** Ball bounce off walls/posts */
export const BALL_BOUNCE = 0.75;
/** Ball bounce off net backboard */
export const BALL_NET_BOUNCE = 0.35;

// ============================================================
// KICK IMPULSE (for tackle drops, steals, etc.)
// ============================================================

/** Minimum random kick speed when ball is dropped */
export const KICK_IMPULSE_MIN = 180;
/** Maximum random kick speed when ball is dropped */
export const KICK_IMPULSE_MAX = 320;
/** Strong impulse away from tackler on tackle */
export const TACKLE_BALL_POP = 420;

// ============================================================
// PLAYER PHYSICS
// ============================================================

/** Base movement speed multiplier */
export const PLAYER_SPEED_BASE = 200;
/** Acceleration factor (0-1, higher = snappier) */
export const PLAYER_ACCELERATION = 0.18;
/** Friction when not moving (0-1, lower = more slide) */
export const PLAYER_FRICTION = 0.90;

/** Dodge distance base in pixels */
export const DODGE_DISTANCE_BASE = 85;
/** Additional dodge distance per dodge stat */
export const DODGE_DISTANCE_SCALE = 8;
/** Dodge duration in ms */
export const DODGE_DURATION = 180;

// ============================================================
// TACKLE IMPACT
// ============================================================

/** Tackle lunge speed in pixels/sec */
export const TACKLE_LUNGE_SPEED = 520;
/** Tackle lunge distance base in pixels */
export const TACKLE_DISTANCE_BASE = 60;
/** Additional tackle distance per tackle stat */
export const TACKLE_DISTANCE_SCALE = 6;
/** Tackle success base chance (0-1) */
export const TACKLE_SUCCESS_BASE = 0.60;
/** Additional success per tackle stat point */
export const TACKLE_SUCCESS_SCALE = 0.05;

/** Knockback applied to tackled player (no ball) */
export const TACKLE_KNOCKBACK = 340;
/** Knockback applied to tackled player (has ball - stronger) */
export const TACKLE_KNOCKBACK_CARRIER = 480;
/** Stun duration after being tackled */
export const TACKLE_STUN_MS = 220;
/** Hitstop duration (micro-freeze for impact) */
export const TACKLE_HITSTOP_MS = 55;
/** Camera shake on tackle hit */
export const TACKLE_SHAKE = 0.012;
/** Tackle shake duration */
export const TACKLE_SHAKE_DURATION = 120;

// ============================================================
// CHARGED SHOT
// ============================================================

/** Minimum hold time before charge affects power */
export const CHARGE_MIN_MS = 80;
/** Maximum hold time for full charge */
export const CHARGE_MAX_MS = 850;
/** Power multiplier at minimum charge */
export const CHARGE_POWER_MULT_MIN = 1.0;
/** Power multiplier at maximum charge */
export const CHARGE_POWER_MULT_MAX = 1.35;

// ============================================================
// COOLDOWNS (in milliseconds)
// ============================================================

export const COOLDOWN_SHOOT = 180;
export const COOLDOWN_PASS = 180;
export const COOLDOWN_TACKLE = 600;
export const COOLDOWN_DODGE = 850;

// ============================================================
// AI TUNING (AGGRESSIVE SETTINGS FOR CHALLENGING GAMEPLAY)
// ============================================================

/** Separation radius - AI repels within this distance */
export const AI_SEPARATION_RADIUS = 90;
/** Separation force strength multiplier */
export const AI_SEPARATION_STRENGTH = 35;
/** Maximum ball chasers per team (1 = only nearest, 2 = nearest + support) */
export const AI_MAX_CHASERS = 2;
/** Maximum pressers that can actively close down carrier */
export const AI_MAX_PRESSERS = 2;

/** AI reaction time in ms (lower = faster reactions) */
export const AI_REACTION_MS = 120;
/** Distance at which AI starts pressing the ball carrier */
export const AI_PRESS_DISTANCE = 450;
/** Secondary presser radius (larger = more aggressive trap) */
export const AI_SECOND_PRESSER_RADIUS = 380;
/** Distance at which AI attempts tackle */
export const AI_TACKLE_DISTANCE = 70;
/** Tackle range for AI - AI-DEFENSE v3 (larger = more aggressive) */
export const AI_TACKLE_RANGE = 75;
/** Minimum angle alignment for tackle (cos value, lower = more permissive) */
export const AI_TACKLE_ANGLE_COS = 0.1;
/** AI tackle cooldown - AI-DEFENSE v3 (lower = more frequent tackles) */
export const AI_TACKLE_COOLDOWN_MS = 600;
/** Tackle willingness - AI-DEFENSE v3 (1.0 = always attempt when in range) */
export const AI_TACKLE_WILLINGNESS = 1.0;
/** Back-off time after failed tackle (ms) */
export const AI_TACKLE_BACKOFF_MS = 200;
/** Close range multiplier for tackle (if within this % of range, ignore angle) */
export const AI_TACKLE_CLOSE_RANGE_MULT = 0.65;

/** Base AI aggression (0-1) */
export const AI_AGGRESSION = 0.80;
/** Boss AI aggression */
export const AI_AGGRESSION_BOSS = 0.95;
/** How much AI weights the objective (0-1) */
export const AI_OBJECTIVE_WEIGHT = 0.85;

/** Distance to consider "pressured" */
export const AI_PRESSURE_RADIUS = 95;
/** Shooting range from goal - INCREASED for more shots */
export const AI_SHOOT_RANGE = 420;
/** Good shooting angle threshold (cos value - higher = stricter) */
export const AI_SHOOT_ANGLE_COS = 0.55;
/** Good shooting angle threshold (radians from center) */
export const AI_SHOOT_ANGLE_THRESHOLD = Math.PI / 3.5;
/** AI shoot cooldown */
export const AI_SHOOT_COOLDOWN_MS = 700;
/** Minimum pass distance */
export const AI_PASS_MIN_DIST = 70;
/** Maximum pass distance */
export const AI_PASS_MAX_DIST = 400;
/** Lane width for pass blocking check */
export const AI_LANE_WIDTH = 28;
/** Pass cooldown for AI */
export const AI_PASS_COOLDOWN = 520;

/** AI decision interval (ms) - how often AI reconsiders actions */
export const AI_DECISION_INTERVAL = 140;

/** Chaser hysteresis - how much closer another must be to take over as chaser */
export const AI_CHASER_HYSTERESIS = 30;

// ============================================================
// MOMENT SETUP
// ============================================================

/** Time in ms to lock ball possession at moment start (prevents instant recapture) */
export const MOMENT_SETUP_LOCK_MS = 300;
/** Time in ms to prevent crossing center at moment start */
export const MOMENT_POSITION_LOCK_MS = 400;

// ============================================================
// GOAL DETECTION
// ============================================================

/** Minimum ball speed to count as goal (prevents dribble-ins) */
export const GOAL_MIN_SPEED = 25;
/** Goal cooldown - prevent double-scoring (ms) */
export const GOAL_COOLDOWN = 1200;
/** Goal mouth width (actual opening height) */
export const GOAL_MOUTH_HEIGHT = 120;
/** Goal sensor depth (extends behind line to catch fast balls) */
export const GOAL_SENSOR_DEPTH = 24;
/** D-circle (shooting circle) radius */
export const D_CIRCLE_RADIUS = 150;

// ============================================================
// HOCKEY SCORING RULES (D-CIRCLE REQUIREMENT)
// ============================================================

/** Max time between shot and goal for shot to count (ms) */
export const SHOT_TO_GOAL_MAX_MS = 4000;
/** Require shot from inside D to score (hockey rule) */
export const REQUIRE_SHOT_FROM_D = true;

// ============================================================
// ENEMY GOALKEEPER
// ============================================================

/** GK position - min X (near goal line) */
export const GK_MIN_X = 30;
/** GK position - max X (how far out GK can come) */
export const GK_MAX_X = 90;
/** GK position - top boundary relative to goal center */
export const GK_Y_MARGIN = 70;
/** GK base movement speed */
export const GK_SPEED = 220;
/** GK lunge speed (when diving for save) */
export const GK_LUNGE_SPEED = 400;
/** GK lunge duration (ms) */
export const GK_LUNGE_DURATION = 280;
/** GK lunge cooldown (ms) */
export const GK_LUNGE_COOLDOWN = 800;
/** GK reaction time (ms delay before responding to shot) */
export const GK_REACTION_MS = 80;
/** GK block/collision radius */
export const GK_BLOCK_RADIUS = 28;
/** Ball speed threshold to trigger GK lunge */
export const GK_LUNGE_SPEED_THRESHOLD = 200;
/** Prediction lookahead multiplier for GK positioning */
export const GK_PREDICT_MULT = 0.22;
/** Deflection speed multiplier when GK blocks */
export const GK_DEFLECT_SPEED = 300;
/** GK enabled flag */
export const GK_ENABLED = true;

// ============================================================
// HEALTH SYSTEM
// ============================================================

/** Player max health */
export const PLAYER_MAX_HEALTH = 100;
/** Base damage per successful tackle taken */
export const TACKLE_DAMAGE_BASE = 18;
/** Health regen per second (0 = no passive regen) */
export const HEALTH_REGEN_PER_SEC = 0;

// ============================================================
// STAMINA SYSTEM
// ============================================================

/** Player max stamina */
export const PLAYER_MAX_STAMINA = 100;
/** Stamina cost per dash */
export const DASH_STAMINA_COST = 28;
/** Stamina regen per second when not dashing */
export const STAMINA_REGEN_PER_SEC = 18;
/** Reduced regen rate while holding ball */
export const STAMINA_REGEN_BALL_MULT = 0.7;

// ============================================================
// AI DEFENSE PLANNER (TeamDefensePlanner)
// ============================================================

/** How often defense roles are reassigned (ms) */
export const DEFENSE_PLANNER_INTERVAL = 140;
/** Hysteresis time - keep roles for at least this long (ms) */
export const DEFENSE_ROLE_HYSTERESIS = 700;
/** Danger zone distance from own goal (pixels) */
export const DANGER_ZONE_DISTANCE = 350;
/** Central corridor width (pixels) */
export const CENTRAL_CORRIDOR_WIDTH = 350;

/** Last man distance from goal */
export const LAST_MAN_RADIUS_MIN = 100;
export const LAST_MAN_RADIUS_MAX = 170;
/** Shot blocker position on ball->goal line (0-1, 0=at ball, 1=at goal) */
export const SHOT_BLOCKER_POSITION = 0.35;

/** Tackle commit window duration (ms) - AI commits to tackle attempt */
export const TACKLE_COMMIT_DURATION = 250;
/** AI tackle range (increased for harder defense) */
export const AI_TACKLE_RANGE_COMMIT = 75;

// ============================================================
// ADVANTAGE PLAY (after clean tackle)
// ============================================================

/** Advantage buff duration after clean steal (ms) */
export const ADVANTAGE_DURATION = 3000;
/** Speed bonus during advantage (percent) */
export const ADVANTAGE_SPEED_BONUS = 15;
/** Pass speed bonus during advantage (percent) */
export const ADVANTAGE_PASS_BONUS = 20;
/** Shot speed bonus during advantage (percent) */
export const ADVANTAGE_SHOT_BONUS = 15;

// ============================================================
// PENALTY CORNER (PC)
// ============================================================

/** PC setup time before play starts (ms) */
export const PC_SETUP_TIME = 2000;
/** PC injector pass speed */
export const PC_INJECT_SPEED = 800;
/** PC shot power multiplier (drag flick power) */
export const PC_SHOT_POWER_MULT = 1.3;
/** PC circle radius for positioning */
export const PC_CIRCLE_RADIUS = 150;

// ============================================================
// CAMERA / FEEL
// ============================================================

/** Camera shake intensity on goal */
export const CAMERA_SHAKE_GOAL = 0.014;
/** Camera shake duration on goal */
export const CAMERA_SHAKE_GOAL_DURATION = 280;
/** Camera shake on shot */
export const CAMERA_SHAKE_SHOT = 0.005;
export const CAMERA_SHAKE_SHOT_DURATION = 90;
/** Camera shake on tackle (legacy - use TACKLE_SHAKE) */
export const CAMERA_SHAKE_TACKLE = 0.008;
export const CAMERA_SHAKE_TACKLE_DURATION = 100;
/** Camera nudge on pass */
export const CAMERA_SHAKE_PASS = 0.002;
export const CAMERA_SHAKE_PASS_DURATION = 50;

// ============================================================
// PASS ASSIST
// ============================================================

/** How much to bend pass direction toward teammate (0-1) */
export const PASS_ASSIST_BLEND = 0.18;
/** Maximum distance to consider for pass assist */
export const PASS_ASSIST_MAX_DIST = 350;
/** Control radius - can poke pass if ball is within this distance */
export const PASS_CONTROL_RADIUS = 45;

// ============================================================
// AI PASSING SYSTEM
// ============================================================

/** No-recapture window after pass (prevents instant stick-back) */
export const PASS_NO_RECAPTURE_MS = 120;
/** Time ball curves toward intended receiver */
export const PASS_RECEIVE_ASSIST_MS = 280;
/** Receive assist radius - ball curves toward receiver within this distance */
export const PASS_RECEIVE_RADIUS = 60;
/** Receive assist strength (0-1) */
export const PASS_RECEIVE_CURVE = 0.03;

/** Bonus score for player calling for pass */
export const PASS_PLAYER_CALL_BONUS = 35;
/** Duration of "calling for pass" state (ms) */
export const PASS_CALL_DURATION = 1200;

/** Minimum score to consider a pass target valid */
export const PASS_SCORE_THRESHOLD = 20;
/** AI carrier brain decision interval (ms) */
export const CARRIER_BRAIN_INTERVAL = 200;
/** AI pass cooldown per entity (ms) */
export const AI_CARRIER_PASS_COOLDOWN = 650;

/** Weight: lane clearness in pass scoring */
export const PASS_WEIGHT_LANE = 30;
/** Weight: forward progress in pass scoring */
export const PASS_WEIGHT_PROGRESS = 20;
/** Weight: receiver openness (space) in pass scoring */
export const PASS_WEIGHT_SPACE = 25;
/** Weight: distance penalty (per 100px deviation from ideal) */
export const PASS_WEIGHT_DISTANCE = 10;
/** Ideal pass distance */
export const PASS_IDEAL_DISTANCE = 150;

/** Support movement: triangle offset from carrier */
export const SUPPORT_TRIANGLE_OFFSET = 100;
/** Support movement: minimum separation between teammates */
export const SUPPORT_MIN_SEPARATION = 70;

// ============================================================
// SHOT SPIN / CURVE
// ============================================================

/** Base lateral spin amount for shots */
export const SHOT_SPIN_BASE = 0.08;
/** Spin decay per frame */
export const SHOT_SPIN_DECAY = 0.97;
