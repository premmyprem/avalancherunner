import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState, GameStats } from './types';
import { Zap, AlertTriangle, Coins, TrendingDown } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    speed: 0,
    distanceToFoundation: 100,
  });

  const handleStatsUpdate = (newStats: GameStats) => {
    // Only update if changed significantly to avoid render thrashing, or just pass through
    // For small apps, passing through is fine.
    setStats(newStats);
  };

  const startGame = () => {
    setGameState(GameState.PLAYING);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative">
      
      {/* Header / Title */}
      <header className="absolute top-4 w-full text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white italic tracking-tighter">
          AVALANCHE RUNNER
        </h1>
        <p className="text-slate-400 text-sm mt-1">THE DUMP IS COMING</p>
      </header>

      {/* Game Container */}
      <div className="relative w-full max-w-4xl aspect-[16/9] flex items-center justify-center">
        <GameCanvas 
          gameState={gameState} 
          setGameState={setGameState} 
          onStatsUpdate={handleStatsUpdate} 
        />

        {/* HUD Layer (Only visible when playing or Start) */}
        {gameState === GameState.PLAYING && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            <div className="flex flex-col gap-2">
              <div className="bg-slate-900/80 backdrop-blur border border-red-500/50 p-2 rounded-lg flex items-center gap-2 text-white shadow-lg">
                <Coins className="text-yellow-400 w-5 h-5" />
                <span className="font-mono text-xl font-bold">{stats.score} AVAX</span>
              </div>
              <div className="bg-slate-900/80 backdrop-blur border border-blue-500/50 p-2 rounded-lg flex items-center gap-2 text-white shadow-lg">
                <Zap className="text-blue-400 w-5 h-5" />
                <span className="font-mono text-xl font-bold">{stats.speed.toFixed(1)} m/s</span>
              </div>
            </div>

            <div className="bg-slate-900/90 backdrop-blur border-2 border-red-600 p-3 rounded-xl flex flex-col items-end text-white shadow-xl shadow-red-900/20">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
                <span className="text-xs uppercase font-bold tracking-widest">Foundation Distance</span>
              </div>
              <div className="w-48 h-4 bg-slate-800 rounded-full overflow-hidden relative">
                <div 
                  className={`h-full transition-all duration-200 ${stats.distanceToFoundation < 30 ? 'bg-red-600 animate-pulse' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, stats.distanceToFoundation)}%` }}
                />
              </div>
              <span className="font-mono text-2xl font-black mt-1">
                {stats.distanceToFoundation}m
              </span>
            </div>
          </div>
        )}

        {/* Start Screen Overlay */}
        {gameState === GameState.START && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-600 shadow-2xl text-center max-w-md">
              <TrendingDown className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">Avoid The Dump!</h2>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Collect <span className="text-red-400 font-bold">AVAX</span> to gain speed.
                <br />
                Jump over <span className="text-slate-400 font-bold">FUD Walls</span> and Spikes.
                <br />
                Miss a token or hit a wall, and the <span className="text-red-600 font-bold">Foundation</span> gets closer.
              </p>
              <button
                onClick={startGame}
                className="bg-red-600 hover:bg-red-700 text-white text-xl font-bold py-3 px-8 rounded-full transition-transform transform hover:scale-105 active:scale-95 shadow-lg shadow-red-600/30"
              >
                START RUNNING
              </button>
              <p className="mt-4 text-xs text-slate-500">Press Space or Click to Jump. Double Jump available.</p>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-red-900/90 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-lg animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-sm shadow-2xl text-center border-4 border-black max-w-lg transform rotate-1">
              <h2 className="text-5xl font-black text-red-600 mb-4 uppercase tracking-tighter">
                DUMPED ON!
              </h2>
              <div className="w-full h-1 bg-gray-200 mb-4"></div>
              <p className="text-2xl font-bold text-slate-800 mb-2">
                $30M sent to Coinbase!
              </p>
              <p className="text-slate-500 mb-8 italic">
                You collected {stats.score} AVAX before the liquidation.
              </p>
              
              <button
                onClick={() => setGameState(GameState.START)}
                className="bg-black text-white text-lg font-bold py-4 px-10 hover:bg-slate-800 transition-colors uppercase tracking-widest"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-slate-600 text-xs">
        Disclaimer: This is a parody game. Not financial advice.
      </div>
    </div>
  );
};

export default App;