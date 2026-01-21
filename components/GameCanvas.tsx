import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, GameStats, Player, Token, Particle, Obstacle } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRAVITY,
  JUMP_FORCE,
  GROUND_Y,
  PLAYER_X,
  PLAYER_SIZE,
  INITIAL_SPEED,
  MAX_SPEED,
  PASSIVE_ACCELERATION,
  FOUNDATION_START_DIST,
  TOKEN_SIZE,
  TOKEN_SPAWN_RATE_MIN,
  TOKEN_SPAWN_RATE_MAX,
  SPEED_BOOST,
  PENALTY_ON_MISS,
  PASSIVE_CREEP,
  REWARD_ON_COLLECT,
  OBSTACLE_SPAWN_RATE_MIN,
  OBSTACLE_SPAWN_RATE_MAX,
  MIN_OBSTACLE_GAP,
  PENALTY_ON_HIT,
  SPEED_RESET_ON_HIT,
} from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onStatsUpdate: (stats: GameStats) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, onStatsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  
  // Game State Refs (Mutable for performance)
  const playerRef = useRef<Player>({ y: GROUND_Y - PLAYER_SIZE, vy: 0, isGrounded: true, jumpCount: 0 });
  const tokensRef = useRef<Token[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const frameCountRef = useRef<number>(0);
  const nextSpawnRef = useRef<number>(0);
  const nextObstacleSpawnRef = useRef<number>(0);
  const speedRef = useRef<number>(INITIAL_SPEED);
  const distanceRef = useRef<number>(FOUNDATION_START_DIST);
  const scoreRef = useRef<number>(0);

  // Load Image on Mount
  useEffect(() => {
    const img = new Image();
    // Using the official Red Circle AVAX logo
    img.src = 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png';
    img.onload = () => {
        logoImageRef.current = img;
    };
  }, []);
  
  // Initialize or Reset Game
  const resetGame = useCallback(() => {
    playerRef.current = { y: GROUND_Y - PLAYER_SIZE, vy: 0, isGrounded: true, jumpCount: 0 };
    tokensRef.current = [];
    obstaclesRef.current = [];
    particlesRef.current = [];
    frameCountRef.current = 0;
    nextSpawnRef.current = 0;
    nextObstacleSpawnRef.current = 100; // Start spawning obstacles after initial run
    speedRef.current = INITIAL_SPEED;
    distanceRef.current = FOUNDATION_START_DIST;
    scoreRef.current = 0;
  }, []);

  useEffect(() => {
    if (gameState === GameState.START) {
      resetGame();
    }
  }, [gameState, resetGame]);

  const spawnToken = () => {
    const isAir = Math.random() > 0.5;
    const y = isAir ? GROUND_Y - PLAYER_SIZE - 90 : GROUND_Y - TOKEN_SIZE; // Jump height or ground
    
    // Check overlap with existing obstacles to avoid unfair placement
    const x = CANVAS_WIDTH + 50;
    const hasOverlap = obstaclesRef.current.some(obs => Math.abs(obs.x - x) < 100);
    
    if (!hasOverlap) {
        tokensRef.current.push({
        id: Date.now() + Math.random(),
        x: x,
        y: y,
        width: TOKEN_SIZE,
        height: TOKEN_SIZE,
        collected: false,
        });
    }

    // Token spawn rate stays relatively constant to ensure flow
    nextSpawnRef.current = frameCountRef.current + Math.floor(Math.random() * (TOKEN_SPAWN_RATE_MAX - TOKEN_SPAWN_RATE_MIN) + TOKEN_SPAWN_RATE_MIN);
  };

  const spawnObstacle = () => {
    const type = Math.random() > 0.6 ? 'WALL' : 'SPIKE';
    const width = 40;
    const height = type === 'WALL' ? 60 : 30;
    const y = GROUND_Y - height;
    
    // Check overlap with existing tokens
    const x = CANVAS_WIDTH + 50;
    const hasOverlap = tokensRef.current.some(token => Math.abs(token.x - x) < 100);

    if (!hasOverlap) {
        obstaclesRef.current.push({
            id: Date.now() + Math.random(),
            x: x,
            y: y,
            width,
            height,
            type,
            hit: false
        });
    }

    // Dynamic Difficulty: As score increases, spawn obstacles more frequently
    const difficultyFactor = Math.min(scoreRef.current * 2, 80); // Cap reduction at 80 frames
    const currentMin = Math.max(MIN_OBSTACLE_GAP, OBSTACLE_SPAWN_RATE_MIN - difficultyFactor);
    const currentMax = Math.max(MIN_OBSTACLE_GAP + 20, OBSTACLE_SPAWN_RATE_MAX - difficultyFactor);
    
    nextObstacleSpawnRef.current = frameCountRef.current + Math.floor(Math.random() * (currentMax - currentMin) + currentMin);
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random(),
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color,
      });
    }
  };

  const drawFoundationGuy = (ctx: CanvasRenderingContext2D, x: number, groundY: number) => {
    const scale = 1.4; 
    const w = 70 * scale;
    const h = 110 * scale;
    const y = groundY - h;

    const runCycle = frameCountRef.current * 0.2; 
    const bounce = Math.abs(Math.sin(runCycle * 2)) * 6;
    
    ctx.save();
    ctx.translate(x, y + bounce);

    // --- SHADOW ---
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(w/2, h - bounce, 30, 8, 0, 0, Math.PI*2);
    ctx.fill();

    // --- BACK ARM (The Missing Arm) ---
    // Draw this first so it appears behind the body
    ctx.save();
    ctx.translate(w/2 - 20, 30); // Left shoulder position
    const backArmAngle = Math.sin(runCycle) * 0.8; // Swinging naturally
    ctx.rotate(backArmAngle);
    
    ctx.fillStyle = '#0f172a'; // Darker suit color for depth
    ctx.beginPath();
    ctx.roundRect(-10, 0, 20, 50, 8); // Arm
    ctx.fill();
    
    ctx.fillStyle = '#ffedd5'; // Hand
    ctx.beginPath();
    ctx.arc(0, 50, 12, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // --- LEGS ---
    const drawLeg = (isBack: boolean) => {
        ctx.fillStyle = '#0f172a'; // Pants (Slate 900)
        
        const angle = Math.cos(runCycle + (isBack ? 0 : Math.PI)) * 0.8;
        
        ctx.save();
        ctx.translate(w/2, h - 35);
        ctx.rotate(angle);
        
        // Thigh/Leg
        ctx.beginPath();
        ctx.roundRect(-14, 0, 28, 45, 8);
        ctx.fill();
        
        // Shading on leg
        if (isBack) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fill();
        }

        // Shoe
        ctx.fillStyle = '#020617'; // Almost black
        ctx.beginPath();
        ctx.moveTo(-14, 40);
        ctx.lineTo(16, 40);
        ctx.lineTo(16, 52);
        ctx.lineTo(-16, 52);
        ctx.fill();
        ctx.restore();
    };

    // Draw Back Leg
    drawLeg(true);

    // --- BODY (Torso) ---
    ctx.fillStyle = '#1e293b'; // Suit Jacket (Slate 800)
    
    // Jacket tails
    ctx.beginPath();
    ctx.moveTo(w/2 - 25, h - 45);
    ctx.lineTo(w/2 + 25, h - 45);
    ctx.lineTo(w/2 + 30, h - 70); // Taper up
    ctx.lineTo(w/2 - 30, h - 70);
    ctx.fill();

    // Main Chest
    ctx.beginPath();
    ctx.roundRect(w/2 - 35, 20, 70, h - 60, 16);
    ctx.fill();
    
    // Suit Shading (Side panels)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.moveTo(w/2 + 10, 20);
    ctx.lineTo(w/2 + 35, 20);
    ctx.lineTo(w/2 + 35, h - 40);
    ctx.lineTo(w/2 + 10, h - 40);
    ctx.fill();

    // Suit Lapels / Shirt Area
    ctx.fillStyle = '#f8fafc'; // White Shirt
    ctx.beginPath();
    ctx.moveTo(w/2, 25);
    ctx.lineTo(w/2 - 15, 60);
    ctx.lineTo(w/2 + 15, 60);
    ctx.fill();

    // Tie (Red - Power Tie)
    ctx.fillStyle = '#ef4444'; 
    ctx.beginPath();
    ctx.moveTo(w/2 - 5, 25);
    ctx.lineTo(w/2 + 5, 25);
    const tieSway = Math.sin(runCycle) * 4;
    ctx.lineTo(w/2 + 6 + tieSway, 65); 
    ctx.lineTo(w/2 + tieSway, 75);
    ctx.lineTo(w/2 - 6 + tieSway, 65);
    ctx.fill();

    // Jacket Lapels
    ctx.fillStyle = '#334155'; // Slightly lighter slate for lapel
    ctx.beginPath();
    ctx.moveTo(w/2 - 35, 20);
    ctx.lineTo(w/2 - 15, 60);
    ctx.lineTo(w/2 - 35, 50);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w/2 + 35, 20);
    ctx.lineTo(w/2 + 15, 60);
    ctx.lineTo(w/2 + 35, 50);
    ctx.fill();

    // Draw Front Leg
    drawLeg(false);

    // --- HEAD ---
    const headBob = Math.sin(runCycle * 2) * 2;
    ctx.translate(0, headBob);
    
    // Neck
    ctx.fillStyle = '#ffedd5';
    ctx.fillRect(w/2 - 12, 10, 24, 15);

    // Head Shape
    ctx.fillStyle = '#ffedd5'; // Skin
    ctx.beginPath();
    ctx.roundRect(w/2 - 22, -15, 44, 45, 12);
    }
