import React from 'react';
import { Unit, Phase } from '../../../types/game';
import { ChevronUp, ChevronDown, Trophy, Shield, Swords } from 'lucide-react';

interface CrpgInitiativeQueueProps {
  units?: Unit[];
  selectedUnitId?: string | null;
  activePlayer: 'player1' | 'player2';
  round: number;
  phase: Phase;
  player1Score?: number;
  player2Score?: number;
  player1CP?: number;
  player2CP?: number;
  isOpen: boolean;
  onToggle: () => void;
  onSelectUnit?: (unitId: string) => void;
}

export const CrpgInitiativeQueue: React.FC<CrpgInitiativeQueueProps> = ({
  activePlayer,
  round,
  phase,
  player1Score = 0,
  player2Score = 0,
  player1CP = 3,
  player2CP = 3,
  isOpen,
  onToggle,
}) => {
  // FORMAT 1: Reduced / Minimized Format
  if (!isOpen) {
    return (
      <div className="group/score absolute top-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none">
        <div
          className="flex items-center space-x-2.5 bg-[#0a0c14]/95 hover:bg-[#0a0c14]/25 border border-amber-800/60 hover:border-amber-800/25 px-3.5 py-1 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.85)] backdrop-blur-md hover:backdrop-blur-none transition-all duration-200"
        >
          {/* Score details fade on mouse hover */}
          <div className="flex items-center space-x-2 transition-opacity duration-200 group-hover/score:opacity-25">
            {/* Player 1 Score Chip */}
            <div className="flex items-center space-x-1.5">
              <span className="text-rose-400 font-mono font-black text-xs drop-shadow">
                ⚔️ P1: {player1Score} VP
              </span>
              <span className="text-rose-400/60 font-mono text-[10px]">({player1CP} CP)</span>
            </div>

            <span className="text-amber-500/60 font-black text-[10px] px-0.5">VS</span>

            {/* Player 2 Score Chip */}
            <div className="flex items-center space-x-1.5">
              <span className="text-sky-400 font-mono font-black text-xs drop-shadow">
                P2: {player2Score} VP 🛡️
              </span>
              <span className="text-sky-400/60 font-mono text-[10px]">({player2CP} CP)</span>
            </div>

            <span className="text-zinc-600 font-mono text-[9px]">│</span>

            {/* Round & Phase Pill */}
            <div className="flex items-center space-x-1 font-mono text-[10px] text-amber-300 font-bold uppercase">
              <span>R{round} • {phase}</span>
            </div>
          </div>

          {/* Expand Button - Stays shown on buttons */}
          <button
            onClick={onToggle}
            title="Expand tactical scoreboard"
            className="p-1 px-2 rounded-full bg-amber-950/80 hover:bg-amber-600 border border-amber-700/60 text-amber-300 hover:text-black transition cursor-pointer flex items-center space-x-1 text-[9px] font-mono shadow opacity-90 hover:!opacity-100"
          >
            <span>Scoreboard</span>
            <ChevronDown className="w-3 h-3 text-amber-400 hover:text-black transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  // FORMAT 2: Shown / Expanded Format
  return (
    <div className="group/score absolute top-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="bg-[#0a0c16]/98 hover:bg-[#0a0c16]/25 border-2 border-amber-600/70 hover:border-amber-600/25 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.9),0_0_20px_rgba(245,158,11,0.15)] backdrop-blur-xl hover:backdrop-blur-none px-5 py-2.5 flex flex-col items-center space-y-2 max-w-lg min-w-[360px] sm:min-w-[420px] transition-all duration-200">
        {/* Top Header with Round, Phase and Reduce Button */}
        <div className="flex items-center justify-between w-full border-b border-zinc-800 pb-1.5">
          <div className="flex items-center space-x-2 font-mono transition-opacity duration-200 group-hover/score:opacity-25">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-black uppercase text-amber-300 tracking-wider drop-shadow">
              ROUND {round} • {phase.toUpperCase()} PHASE
            </span>
          </div>

          <button
            onClick={onToggle}
            className="p-1 px-2.5 rounded-lg bg-zinc-900/90 hover:bg-amber-600 border border-zinc-700 hover:border-amber-400 text-zinc-300 hover:text-black transition cursor-pointer flex items-center space-x-1 text-[10px] font-mono shadow-md opacity-90 hover:!opacity-100"
            title="Reduce to minimal scoreboard"
          >
            <span>Reduce</span>
            <ChevronUp className="w-3.5 h-3.5 text-amber-400 hover:text-black" />
          </button>
        </div>

        {/* Scores Versus Block - fades on panel hover */}
        <div className="flex items-center justify-between w-full px-2 space-x-4 transition-opacity duration-200 group-hover/score:opacity-25">
          {/* Player 1 (West Force) */}
          <div className={`flex items-center space-x-2.5 p-2 rounded-xl transition ${
            activePlayer === 'player1'
              ? 'bg-rose-950/40 border border-rose-700/60 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
              : 'bg-zinc-900/30'
          }`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-900 to-red-950 border border-rose-500/60 flex items-center justify-center text-sm shadow">
              ⚔️
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-white text-xs">Player 1 (West)</span>
                {activePlayer === 'player1' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" title="Active Turn" />
                )}
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-mono">
                <span className="text-rose-400 font-black text-sm">{player1Score} <span className="text-[10px] font-normal text-zinc-400">VP</span></span>
                <span className="text-zinc-600">•</span>
                <span className="text-amber-300 font-bold">{player1CP} <span className="text-[10px] font-normal text-zinc-400">CP</span></span>
              </div>
            </div>
          </div>

          {/* Versus Seal */}
          <div className="flex flex-col items-center">
            <span className="text-amber-500 font-serif font-black text-[11px] tracking-widest px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 shadow">
              VS
            </span>
          </div>

          {/* Player 2 (East Force / Bot) */}
          <div className={`flex items-center space-x-2.5 p-2 rounded-xl transition text-right ${
            activePlayer === 'player2'
              ? 'bg-sky-950/40 border border-sky-700/60 shadow-[0_0_12px_rgba(56,189,248,0.15)]'
              : 'bg-zinc-900/30'
          }`}>
            <div>
              <div className="flex items-center justify-end space-x-1.5">
                {activePlayer === 'player2' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" title="Active Turn" />
                )}
                <span className="font-bold text-white text-xs">Player 2 (East)</span>
              </div>
              <div className="flex items-center justify-end space-x-2 text-[11px] font-mono">
                <span className="text-amber-300 font-bold">{player2CP} <span className="text-[10px] font-normal text-zinc-400">CP</span></span>
                <span className="text-zinc-600">•</span>
                <span className="text-sky-400 font-black text-sm">{player2Score} <span className="text-[10px] font-normal text-zinc-400">VP</span></span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-900 to-blue-950 border border-sky-500/60 flex items-center justify-center text-sm shadow">
              🛡️
            </div>
          </div>
        </div>

        {/* Tactical Rules & POI Scoring Footer - fades on panel hover */}
        <div className="w-full pt-1.5 border-t border-zinc-850 flex items-center justify-between text-[9px] font-mono text-zinc-400 transition-opacity duration-200 group-hover/score:opacity-20">
          <span className="flex items-center space-x-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>POIs: (Winner CP - Loser CP) × Multiplier</span>
          </span>
          <span>Kills: +1 VP (+2 Leader)</span>
        </div>
      </div>
    </div>
  );
};
