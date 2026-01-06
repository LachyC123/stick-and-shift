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
// AI TUNING
// ============================================================

/** Separation radius - AI repels within this distance */
export const AI_SEPARATION_RADIUS = 90;
/** Separation force strength multiplier */
export const AI_SEPARATION_STRENGTH = 35;
/** Maximum ball chasers per team (1 = only nearest, 2 = nearest + support) */
export const AI_MAX_CHASERS = 2;

/** Distance at which AI starts pressing the ball carrier */
export const AI_PRESS_DISTANCE = 260;
/** Distance at which AI attempts tackle */
export const AI_TACKLE_DISTANCE = 52;
/** Minimum angle alignment for tackle (cos value, 0.2 = ~78 degrees) */
export const AI_TACKLE_ANGLE_COS = 0.2;
/** AI tackle cooldown */
export const AI_TACKLE_COOLDOWN_MS = 650;
/** AI decision/reaction interval */
export const AI_REACTION_MS = 160;
/** Base AI aggression (0-1) */
export const AI_AGGRESSION = 0.75;
/** How much AI weights the objective (0-1) */
export const AI_OBJECTIVE_WEIGHT = 0.85;

/** Distance to consider "pressured" */
export const AI_PRESSURE_RADIUS = 85;
/** Shooting range from goal */
export const AI_SHOOT_RANGE = 220;
/** Good shooting angle threshold (radians from center) */
export const AI_SHOOT_ANGLE_THRESHOLD = Math.PI / 4;
/** Minimum pass distance */
export const AI_PASS_MIN_DIST = 70;
/** Maximum pass distance */
export const AI_PASS_MAX_DIST = 400;
/** Lane width for pass blocking check */
export const AI_LANE_WIDTH = 28;

/** AI decision interval (ms) - how often AI reconsiders actions */
export const AI_DECISION_INTERVAL = 180;
/** Pass cooldown for AI */
export const AI_PASS_COOLDOWN = 600;
/** Tackle range for AI */
export const AI_TACKLE_RANGE = 50;

/** Chaser hysteresis - how much closer another must be to take over as chaser */
export const AI_CHASER_HYSTERESIS = 30;

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
// SHOT SPIN / CURVE
// ============================================================

/** Base lateral spin amount for shots */
export const SHOT_SPIN_BASE = 0.08;
/** Spin decay per frame */
export const SHOT_SPIN_DECAY = 0.97;
