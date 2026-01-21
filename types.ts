export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export interface Player {
  y: number;
  vy: number;
  isGrounded: boolean;
  jumpCount: number;
}

export interface Token {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'WALL' | 'SPIKE';
  hit: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface GameStats {
  score: number;
  speed: number;
  distanceToFoundation: number; // 0 means caught
}