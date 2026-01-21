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
    ctx.fill();

    // Hair (Slicked back)
    ctx.fillStyle = '#94a3b8'; // Grey/White hair
    ctx.beginPath();
    ctx.moveTo(w/2 - 22, 10);
    ctx.quadraticCurveTo(w/2 - 25, -20, w/2 + 25, -10);
    ctx.lineTo(w/2 + 22, 10);
    ctx.lineTo(w/2 + 22, -15);
    ctx.quadraticCurveTo(w/2, -25, w/2 - 22, -15);
    ctx.fill();

    // Sunglasses
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(w/2 - 20, 0, 18, 12, 3);
    ctx.roundRect(w/2 + 2, 0, 18, 12, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; // Reflection
    ctx.beginPath();
    ctx.moveTo(w/2 - 15, 2);
    ctx.lineTo(w/2 - 5, 2);
    ctx.lineTo(w/2 - 18, 10);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w/2 - 2, 5);
    ctx.lineTo(w/2 + 2, 5);
    ctx.stroke();

    // Scowl
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w/2, 22, 8, 0.8 * Math.PI, 0.2 * Math.PI, true);
    ctx.stroke();

    ctx.translate(0, -headBob);

    // --- FRONT ARM & BAG (The Bag Arm) ---
    // Right arm extending FORWARD (to the right)
    
    ctx.save();
    // Shoulder position
    ctx.translate(w/2 + 25, 30); 
    
    // Arm Rotation: Pointing mostly forward (0 degrees) with slight bob
    const armBob = Math.sin(runCycle) * 0.1;
    ctx.rotate(-0.1 + armBob); 

    // Arm
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(0, -8, 50, 20, 8); // Extended arm
    ctx.fill();
    
    // Hand
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.arc(55, 2, 16, 0, Math.PI*2);
    ctx.fill();

    // The Bag - Hanging from the hand
    ctx.translate(55, 5); // Move to hand
    
    // Bag sway - lags behind movement
    const bagSway = Math.sin(runCycle) * 0.4 + 0.2; 
    ctx.rotate(bagSway);

    // Bag Neck (held in hand)
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.lineTo(15, 20); // Widens down
    ctx.lineTo(-15, 20);
    ctx.fill();

    // Main Bag Body
    ctx.beginPath();
    ctx.ellipse(0, 50, 50, 45, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Bag Logo (The Image)
    if (logoImageRef.current) {
        ctx.save();
        ctx.clip(); // Clip to bag shape (optional, but circle is safer)
        const logoSize = 60;
        ctx.drawImage(logoImageRef.current, -logoSize/2, 50 - logoSize/2, logoSize, logoSize);
        ctx.restore();
    } else {
        // Fallback logo if image fails
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 50, 25, 0, Math.PI*2);
        ctx.fill();
    }

    ctx.restore(); // Restore Arm
    ctx.restore(); // Restore Foundation Guy
  };

  // Helper to draw the Dokyo character
  const drawDokyo = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, lookingBack: boolean) => {
      const bob = Math.sin(frameCountRef.current * 0.5) * 2;
      const breathing = Math.sin(frameCountRef.current * 0.1) * 0.5;
      
      const hoodieColor = '#f8fafc';
      const hoodieShadow = '#cbd5e1';
      const voidColor = '#0f172a';
      const headbandColor = '#f97316';
      
      const centerX = x + size / 2;
      const headY = y + size * 0.35 + bob;
      const bodyY = y + size * 0.5 + bob;

      // Legs
      ctx.fillStyle = '#334155';
      const runCycle = frameCountRef.current * 0.8;
      const leftLegY = Math.sin(runCycle) * 5;
      const rightLegY = Math.sin(runCycle + Math.PI) * 5;
      
      if (!playerRef.current.isGrounded) {
         ctx.fillRect(centerX - 8, y + size - 8, 6, 8);
         ctx.fillRect(centerX + 2, y + size - 5, 6, 8);
      } else {
         ctx.beginPath();
         ctx.roundRect(centerX - 8, y + size - 10 + leftLegY, 6, 10, 2);
         ctx.roundRect(centerX + 2, y + size - 10 + rightLegY, 6, 10, 2);
         ctx.fill();
      }

      // Hoodie Body
      ctx.fillStyle = hoodieColor;
      ctx.beginPath();
      ctx.moveTo(centerX - size/2 + 2, bodyY - 5);
      ctx.lineTo(centerX + size/2 - 2, bodyY - 5);
      ctx.quadraticCurveTo(centerX + size/2 + 2, bodyY + size/2, centerX + size/2, bodyY + size/2);
      ctx.lineTo(centerX - size/2, bodyY + size/2);
      ctx.quadraticCurveTo(centerX - size/2 - 2, bodyY + size/2, centerX - size/2 + 2, bodyY - 5);
      ctx.fill();
      
      // Pocket
      ctx.fillStyle = hoodieShadow;
      ctx.beginPath();
      ctx.roundRect(centerX - 10, bodyY + size/4, 20, 8, 3);
      ctx.fill();

      // Head
      ctx.fillStyle = hoodieColor;
      ctx.beginPath();
      ctx.ellipse(centerX, headY, size/2 + 1, size/2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Face
      ctx.fillStyle = voidColor;
      ctx.beginPath();
      ctx.ellipse(centerX, headY + 2, size/3, size/3 + 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Headband
      ctx.fillStyle = headbandColor;
      ctx.beginPath();
      ctx.roundRect(centerX - size/3 - 1, headY - 10, size * 0.7, 5, 2);
      ctx.fill();
      const wind = Math.sin(frameCountRef.current * 0.3) * 3;
      ctx.beginPath();
      ctx.moveTo(centerX - size/3, headY - 8);
      ctx.lineTo(centerX - size/2 - 8, headY - 6 + wind);
      ctx.lineTo(centerX - size/2 - 8, headY - 12 + wind);
      ctx.closePath();
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#0ea5e9';
      ctx.shadowBlur = 12;
      const eyeY = headY + 2;
      let eyeOffsetX = lookingBack ? -5 : 5;
      const blink = Math.random() > 0.98;
      if (!blink) {
          ctx.beginPath();
          ctx.ellipse(centerX - 5 + eyeOffsetX, eyeY, 3, 4 + breathing, lookingBack ? 0.2 : -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(centerX + 5 + eyeOffsetX, eyeY, 3, 4 + breathing, lookingBack ? -0.2 : 0.2, 0, Math.PI * 2);
          ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Drawstrings
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      const stringSway = Math.cos(frameCountRef.current * 0.2) * 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 6, headY + 14);
      ctx.quadraticCurveTo(centerX - 8 + stringSway, headY + 22, centerX - 6 + stringSway, headY + 28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX + 6, headY + 14);
      ctx.quadraticCurveTo(centerX + 8 + stringSway, headY + 22, centerX + 6 + stringSway, headY + 28);
      ctx.stroke();
  };

  const update = () => {
    if (gameState !== GameState.PLAYING) return;

    frameCountRef.current++;

    if (speedRef.current < MAX_SPEED) {
        speedRef.current += PASSIVE_ACCELERATION;
    }

    // Player Physics
    const player = playerRef.current;
    player.vy += GRAVITY;
    player.y += player.vy;

    if (player.y + PLAYER_SIZE >= GROUND_Y) {
      player.y = GROUND_Y - PLAYER_SIZE;
      player.vy = 0;
      player.isGrounded = true;
      player.jumpCount = 0;
    } else {
      player.isGrounded = false;
    }

    // Spawning
    if (frameCountRef.current >= nextSpawnRef.current) {
      spawnToken();
    }
    if (frameCountRef.current >= nextObstacleSpawnRef.current) {
        spawnObstacle();
    }

    // Update Tokens
    const tokens = tokensRef.current;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      token.x -= speedRef.current;

      if (
        !token.collected &&
        PLAYER_X < token.x + token.width &&
        PLAYER_X + PLAYER_SIZE > token.x &&
        player.y < token.y + token.height &&
        player.y + PLAYER_SIZE > token.y
      ) {
        token.collected = true;
        scoreRef.current += 1;
        speedRef.current += SPEED_BOOST; 
        if (speedRef.current > MAX_SPEED) speedRef.current = MAX_SPEED; 
        
        distanceRef.current += REWARD_ON_COLLECT;
        spawnParticles(token.x + TOKEN_SIZE / 2, token.y + TOKEN_SIZE / 2, '#EF4444', 10);
      }

      if (!token.collected && token.x + token.width < 0) {
        distanceRef.current -= PENALTY_ON_MISS;
        spawnParticles(50, GROUND_Y - 50, '#FF0000', 5);
        tokens.splice(i, 1);
      } else if (token.collected && token.x < -100) {
        tokens.splice(i, 1);
      }
    }

    // Update Obstacles
    const obstacles = obstaclesRef.current;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= speedRef.current;

        if (
            !obs.hit &&
            PLAYER_X < obs.x + obs.width &&
            PLAYER_X + PLAYER_SIZE > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + PLAYER_SIZE > obs.y
        ) {
            obs.hit = true;
            distanceRef.current -= PENALTY_ON_HIT;
            speedRef.current = Math.max(INITIAL_SPEED, speedRef.current * SPEED_RESET_ON_HIT);
            spawnParticles(PLAYER_X + PLAYER_SIZE/2, player.y + PLAYER_SIZE/2, '#94a3b8', 20);
        }

        if (obs.x + obs.width < -100) {
            obstacles.splice(i, 1);
        }
    }

    // Update Foundation Distance
    distanceRef.current -= PASSIVE_CREEP;
    if (distanceRef.current > 150) distanceRef.current = 150; 

    if (distanceRef.current <= 0) {
      setGameState(GameState.GAME_OVER);
    }

    // Update Particles
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
      if (p.life <= 0) particles.splice(i, 1);
    }

    onStatsUpdate({
      score: scoreRef.current,
      speed: speedRef.current,
      distanceToFoundation: Math.max(0, Math.floor(distanceRef.current)),
    });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Floor Grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    const gridOffset = (frameCountRef.current * speedRef.current) % 100;
    ctx.beginPath();
    for (let i = 0; i < CANVAS_WIDTH + 100; i += 100) {
      const x = i - gridOffset;
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x - 50, CANVAS_HEIGHT);
    }
    ctx.stroke();

    // Ground
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    ctx.fillStyle = '#E84142';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 4);

    // Obstacles
    obstaclesRef.current.forEach(obs => {
        if (obs.hit) return;

        ctx.fillStyle = obs.type === 'WALL' ? '#64748b' : '#9f1239';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;

        if (obs.type === 'WALL') {
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('FUD', obs.x + 8, obs.y + 30);
        } else {
            ctx.beginPath();
            ctx.moveTo(obs.x, obs.y + obs.height);
            ctx.lineTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    });

    // Foundation Guy
    const maxSafeDist = 150;
    const foundationX = (1 - (distanceRef.current / maxSafeDist)) * (PLAYER_X + 20) - 100;
    
    if (foundationX > -200) {
        drawFoundationGuy(ctx, foundationX, GROUND_Y);
    }

    // Player
    const isLookingBack = distanceRef.current < 40;
    drawDokyo(ctx, PLAYER_X, playerRef.current.y, PLAYER_SIZE, isLookingBack);

    // Tokens
    tokensRef.current.forEach(token => {
      if (token.collected) return;
      
      const size = token.width;
      if (logoImageRef.current) {
        // Draw Image Token
        ctx.drawImage(logoImageRef.current, token.x, token.y, size, size);
      } else {
        // Fallback
        const centerX = token.x + size / 2;
        const centerY = token.y + size / 2;
        ctx.fillStyle = '#E84142';
        ctx.beginPath();
        ctx.arc(centerX, centerY, size/2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A', centerX, centerY + 2);
      }
    });

    // Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });
  };

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    update();
    draw(ctx);

    if (gameState === GameState.PLAYING || gameState === GameState.START) {
       requestRef.current = requestAnimationFrame(loop);
    }
  }, [gameState, setGameState, onStatsUpdate]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (gameState === GameState.PLAYING) {
          const player = playerRef.current;
          if (player.isGrounded) {
             player.vy = JUMP_FORCE;
             player.isGrounded = false;
             player.jumpCount = 1;
          } else if (player.jumpCount < 2) {
             player.vy = JUMP_FORCE * 0.8;
             player.jumpCount++;
          }
        }
      }
    };
    
    const handleTouch = () => {
       if (gameState === GameState.PLAYING) {
          const player = playerRef.current;
          if (player.isGrounded) {
             player.vy = JUMP_FORCE;
             player.isGrounded = false;
             player.jumpCount = 1;
          } else if (player.jumpCount < 2) {
             player.vy = JUMP_FORCE * 0.8;
             player.jumpCount++;
          }
       }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouch);
    window.addEventListener('mousedown', handleTouch);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('mousedown', handleTouch);
    };
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-auto max-w-4xl border-4 border-slate-700 rounded-lg shadow-2xl bg-slate-900"
    />
  );
};

export default GameCanvas;