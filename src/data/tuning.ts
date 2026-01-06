// Tuning constants for Stick & Shift
// Central place for all physics and gameplay tuning values
// Edit these to adjust game feel without hunting through code

// ============================================================
// BALL PHYSICS
// ============================================================

/** Base pass speed in pixels/sec */
export const PASS_SPEED_BASE = 720;
/** Additional speed per passPower stat point */
export const PASS_SPEED_SCALE = 12;
/** Maximum pass speed */
export const PASS_SPEED_MAX = 1100;

/** Base shot speed in pixels/sec */
export const SHOT_SPEED_BASE = 980;
/** Additional speed per shotPower stat point */
export const SHOT_SPEED_SCALE = 18;
/** Maximum shot speed */
export const SHOT_SPEED_MAX = 1500;

/** Ball drag per frame (0.99 = very little drag, 0.95 = heavy drag) */
export const BALL_DRAG = 0.988;
/** Ball velocity is clamped to this maximum */
export const BALL_MAX_SPEED = 1600;
/** Minimum speed before ball stops */
export const BALL_STOP_THRESHOLD = 15;

/** Ball bounce off walls/posts */
export const BALL_BOUNCE = 0.75;
/** Ball bounce off net backboard */
export const BALL_NET_BOUNCE = 0.35;

// ============================================================
// KICK IMPULSE (for tackle drops, steals, etc.)
// ============================================================

/** Minimum random kick speed when ball is dropped */
export const KICK_IMPULSE_MIN = 80;
/** Maximum random kick speed when ball is dropped */
export const KICK_IMPULSE_MAX = 150;

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

/** Tackle lunge distance base in pixels */
export const TACKLE_DISTANCE_BASE = 55;
/** Additional tackle distance per tackle stat */
export const TACKLE_DISTANCE_SCALE = 6;
/** Tackle success base chance (0-1) */
export const TACKLE_SUCCESS_BASE = 0.55;
/** Additional success per tackle stat point */
export const TACKLE_SUCCESS_SCALE = 0.05;

// ============================================================
// COOLDOWNS (in milliseconds)
// ============================================================

export const COOLDOWN_SHOOT = 200;
export const COOLDOWN_PASS = 220;
export const COOLDOWN_TACKLE = 650;
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
export const AI_DECISION_INTERVAL = 220;
/** Pass cooldown for AI */
export const AI_PASS_COOLDOWN = 700;
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
export const CAMERA_SHAKE_GOAL = 0.012;
/** Camera shake duration on goal */
export const CAMERA_SHAKE_GOAL_DURATION = 250;
/** Camera shake on shot */
export const CAMERA_SHAKE_SHOT = 0.004;
export const CAMERA_SHAKE_SHOT_DURATION = 80;
/** Camera shake on tackle */
export const CAMERA_SHAKE_TACKLE = 0.006;
export const CAMERA_SHAKE_TACKLE_DURATION = 100;

// ============================================================
// PASS ASSIST
// ============================================================

/** How much to bend pass direction toward teammate (0-1) */
export const PASS_ASSIST_BLEND = 0.15;
/** Maximum distance to consider for pass assist */
export const PASS_ASSIST_MAX_DIST = 350;

// ============================================================
// SHOT SPIN / CURVE
// ============================================================

/** Base lateral spin amount for shots */
export const SHOT_SPIN_BASE = 0.08;
/** Spin decay per frame */
export const SHOT_SPIN_DECAY = 0.97;
