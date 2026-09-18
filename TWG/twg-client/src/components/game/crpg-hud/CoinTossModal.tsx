import React, { useState, useEffect, useRef } from 'react';
import { Coins, Sparkles, Swords, Shield, ArrowRight, RotateCcw } from 'lucide-react';

interface CoinTossModalProps {
  isOpen: boolean;
  winner: 'player1' | 'player2';
  playerRole?: 'player1' | 'player2';
  isPvP?: boolean;
  player1Name?: string;
  player2Name?: string;
  onComplete: (winner: 'player1' | 'player2') => void;
  onRetoss?: () => void;
}

export const CoinTossModal: React.FC<CoinTossModalProps> = ({
  isOpen,
  winner,
  playerRole = 'player1',
  isPvP = false,
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  onComplete,
  onRetoss
}) => {
  const [isFlipping, setIsFlipping] = useState<boolean>(true);
  const [displayedWinner, setDisplayedWinner] = useState<'player1' | 'player2'>(winner);
  const [countdown, setCountdown] = useState<number>(3);
  const autoProceedTimerRef = useRef<any>(null);

  // Sync winner prop when updated
  useEffect(() => {
    setDisplayedWinner(winner);
  }, [winner]);

  // Handle flip animation sequence whenever modal opens or retoss occurs
  useEffect(() => {
    if (!isOpen) return;

    setIsFlipping(true);
    setCountdown(3);

    const flipDuration = 1800; // 1.8s flip animation
    const flipTimer = setTimeout(() => {
      setIsFlipping(false);
    }, flipDuration);

    return () => {
      clearTimeout(flipTimer);
      if (autoProceedTimerRef.current) clearInterval(autoProceedTimerRef.current);
    };
  }, [isOpen, displayedWinner]);

  // Countdown auto-proceed after landing
  useEffect(() => {
    if (isFlipping || !isOpen) return;

    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    autoProceedTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [isFlipping, isOpen]);

  // When countdown reaches 0, invoke onComplete
  useEffect(() => {
    if (countdown === 0 && !isFlipping && isOpen) {
      onComplete(displayedWinner);
    }
  }, [countdown, isFlipping, isOpen, displayedWinner, onComplete]);

  if (!isOpen) return null;

  const isWinnerP1 = displayedWinner === 'player1';
  const isMyTurn = isPvP ? (displayedWinner === playerRole) : true;

  // Degrees: 5 full rotations (1800deg) for P1 (front), 5.5 rotations (1980deg) for P2 (back)
  const targetRotation = isWinnerP1 ? 1800 : 1980;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none pointer-events-auto">
      <div className="relative w-full max-w-md bg-[#0d0f17] border-2 border-amber-500/80 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.35)] p-6 md:p-8 flex flex-col items-center text-center overflow-hidden">
        
        {/* Atmospheric background glow */}
        <div className={`absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl opacity-30 transition-colors duration-700 ${
          isFlipping ? 'bg-amber-500' : isWinnerP1 ? 'bg-rose-600' : 'bg-sky-600'
        }`} />
        <div className={`absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-30 transition-colors duration-700 ${
          isFlipping ? 'bg-amber-500' : isWinnerP1 ? 'bg-rose-600' : 'bg-sky-600'
        }`} />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center space-x-2 text-xs font-mono font-bold tracking-widest uppercase text-amber-400 mb-1">
          <Coins className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
          <span>Sector Initiative Protocol</span>
        </div>

        <h2 className="relative z-10 text-xl md:text-2xl font-black text-white tracking-wide uppercase">
          {isFlipping ? 'Tossing Coin in Center of Map...' : 'Deployment Toss Decided!'}
        </h2>

        <p className="relative z-10 text-xs text-zinc-400 max-w-xs mt-1">
          {isFlipping
            ? 'Deciding which commander deploys the first squad onto the battlefield.'
            : 'Armies deploy 1 squad alternating per turn.'}
        </p>

        {/* 3D Coin Flip Container */}
        <div className="relative z-10 my-8 py-2 flex items-center justify-center" style={{ perspective: '1200px' }}>
          <div
            className="w-28 h-28 md:w-32 md:h-32 rounded-full relative transition-transform duration-[1800ms] ease-out shadow-2xl"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipping ? 'rotateY(1440deg) rotateX(20deg)' : `rotateY(${targetRotation}deg) rotateX(0deg)`
            }}
          >
            {/* Front Side: Player 1 (West / Crimson) */}
            <div
              className="absolute inset-0 rounded-full border-4 border-amber-400 bg-gradient-to-br from-rose-700 via-rose-950 to-amber-950 flex flex-col items-center justify-center p-3 shadow-[inset_0_0_20px_rgba(245,158,11,0.6)]"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              <div className="w-16 h-16 rounded-full border border-amber-400/50 flex flex-col items-center justify-center bg-black/40">
                <Swords className="w-7 h-7 text-amber-300 drop-shadow" />
                <span className="text-[10px] font-mono font-black text-amber-200 tracking-wider">WEST</span>
              </div>
              <span className="mt-1 text-[9px] font-mono font-black text-white tracking-widest uppercase">
                PLAYER 1
              </span>
            </div>

            {/* Back Side: Player 2 (East / Azure) */}
            <div
              className="absolute inset-0 rounded-full border-4 border-amber-400 bg-gradient-to-br from-sky-700 via-sky-950 to-indigo-950 flex flex-col items-center justify-center p-3 shadow-[inset_0_0_20px_rgba(245,158,11,0.6)]"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="w-16 h-16 rounded-full border border-amber-400/50 flex flex-col items-center justify-center bg-black/40">
                <Shield className="w-7 h-7 text-sky-300 drop-shadow" />
                <span className="text-[10px] font-mono font-black text-sky-200 tracking-wider">EAST</span>
              </div>
              <span className="mt-1 text-[9px] font-mono font-black text-white tracking-widest uppercase">
                PLAYER 2
              </span>
            </div>
          </div>

          {/* Golden glow ring behind coin */}
          <div className="absolute inset-0 w-32 h-32 md:w-36 md:h-36 rounded-full bg-amber-400/20 blur-xl -z-10 animate-pulse pointer-events-none" />
        </div>

        {/* Winner Announcement Banner */}
        <div className="relative z-10 w-full min-h-[96px] flex flex-col items-center justify-center">
          {isFlipping ? (
            <div className="flex items-center space-x-2 text-amber-400 font-mono text-sm animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span>Coin spinning in midair...</span>
            </div>
          ) : (
            <div className={`w-full p-3.5 rounded-2xl border transition-all duration-300 ${
              isWinnerP1 
                ? 'bg-rose-950/40 border-rose-600/60 shadow-[0_0_20px_rgba(244,63,94,0.25)]' 
                : 'bg-sky-950/40 border-sky-600/60 shadow-[0_0_20px_rgba(14,165,233,0.25)]'
            }`}>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">🏆</span>
                <span className={`text-base md:text-lg font-black tracking-wide uppercase ${
                  isWinnerP1 ? 'text-rose-300' : 'text-sky-300'
                }`}>
                  {isWinnerP1 ? `${player1Name} (Player 1 - West)` : `${player2Name} (Player 2 - East)`} Wins Toss!
                </span>
              </div>

              <p className="text-xs font-medium text-white/90 mt-1">
                {isPvP ? (
                  isMyTurn ? (
                    <span className="text-emerald-400 font-bold">
                      ⚔️ You deploy first! Place your first squad in your zone.
                    </span>
                  ) : (
                    <span className="text-amber-300 font-bold">
                      ⏳ Opponent deploys first! Waiting for opponent to place 1st squad.
                    </span>
                  )
                ) : (
                  isWinnerP1 ? (
                    <span className="text-emerald-400 font-bold">
                      ⚔️ You deploy first! Drag a squad from your Army Tray onto the West zone.
                    </span>
                  ) : (
                    <span className="text-sky-300 font-bold">
                      🤖 Opponent Bot deploys first! Bot will place its first squad.
                    </span>
                  )
                )}
              </p>

              <div className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center justify-center space-x-2">
                <span>Alternation: 1 unit per turn</span>
                <span>•</span>
                <span>Auto-starting in {countdown}s</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Controls */}
        <div className="relative z-10 w-full flex items-center space-x-2.5 mt-5">
          {onRetoss && (
            <button
              onClick={() => {
                if (autoProceedTimerRef.current) clearInterval(autoProceedTimerRef.current);
                onRetoss();
              }}
              disabled={isFlipping}
              className="px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Flip coin again"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-Flip</span>
            </button>
          )}

          <button
            onClick={() => {
              if (autoProceedTimerRef.current) clearInterval(autoProceedTimerRef.current);
              onComplete(displayedWinner);
            }}
            disabled={isFlipping}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 shadow-lg ${
              isFlipping
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                : 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <span>Begin Deployment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
