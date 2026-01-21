export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;

export const GRAVITY = 0.6;
export const JUMP_FORCE = -12;
export const GROUND_Y = 380;
export const PLAYER_X = 350; // Moved closer to center so we can see the chaser
export const PLAYER_SIZE = 40;

export const INITIAL_SPEED = 6;
export const MAX_SPEED = 25; // Increased max speed
export const SPEED_BOOST = 0.5;
export const PASSIVE_ACCELERATION = 0.001; // Speed increases slowly every frame

export const FOUNDATION_START_DIST = 100; // Abstract units of distance
export const FOUNDATION_CATCH_THRESHOLD = 0;
export const PENALTY_ON_MISS = 15; // Foundation gains this much distance if you miss
export const REWARD_ON_COLLECT = 2; // You gain this much distance if you collect
export const PASSIVE_CREEP = 0.05; // Foundation slowly catches up every frame

export const TOKEN_SIZE = 30;
export const TOKEN_SPAWN_RATE_MIN = 60; // Frames
export const TOKEN_SPAWN_RATE_MAX = 120; // Frames

// Obstacles start easier but get harder
export const OBSTACLE_SPAWN_RATE_MIN = 100;
export const OBSTACLE_SPAWN_RATE_MAX = 200;
export const MIN_OBSTACLE_GAP = 40; // Minimum frames between obstacles at max difficulty
export const PENALTY_ON_HIT = 30; // Large distance loss on hit
export const SPEED_RESET_ON_HIT = 0.75; // Retain 75% speed or drop to initial