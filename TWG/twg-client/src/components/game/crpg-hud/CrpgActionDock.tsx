import React from 'react';
import { Unit, Phase } from '../../../types/game';
import { Zap, ArrowRight, Shield, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { getUnitBodiesAndLives } from '../../../engine/formationEngine';

interface CrpgActionDockProps {
  selectedUnit: Unit | null;
  activePlayer: 'player1' | 'player2';
  phase: Phase;
  round?: number;
  isOpen?: boolean;
  onToggle?: () => void;
  onAdvancePhase: () => void;
  onExecuteBotAction: () => void;
}

export const CrpgActionDock: React.FC<CrpgActionDockProps> = ({
  selectedUnit,
  activePlayer,
  phase,
  round = 1,
  isOpen = true,
  onToggle,
  onAdvancePhase,
  onExecuteBotAction,
}) => {
  const isPlayerTurn = activePlayer === 'player1';

  // Calculate lives & vitals of selected unit (or active squad)
  const bl = selectedUnit ? getUnitBodiesAndLives(selectedUnit) : { remainingLives: 10, maxLives: 10 };
  const hpPct = Math.min(100, Math.max(0, (bl.remainingLives / bl.maxLives) * 100));

  const defStat = selectedUnit ? (selectedUnit.stats.def + selectedUnit.stats.defModifier) : 6;
  const armorPct = Math.min(100, Math.max(15, (defStat / 20) * 100));

  const remActions = selectedUnit?.actionsRemaining ?? 2;
  const maxActions = selectedUnit?.maxActions ?? 2;

  // FORMAT: Collapsed / Hidden — Keeps who's turn it is clearly visible
  if (!isOpen) {
    return (
      <div className="group/dock flex items-center space-x-2 select-none pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
        <div className={`flex items-center space-x-2.5 px-4 py-1.5 rounded-full border shadow-2xl backdrop-blur-md hover:backdrop-blur-none transition-all duration-200 ${
          isPlayerTurn
            ? 'bg-gradient-to-r from-[#0c0e17]/98 via-[#131b2e]/98 to-[#0c0e17]/98 hover:from-[#0c0e17]/25 hover:via-[#131b2e]/25 hover:to-[#0c0e17]/25 border-sky-400/60 hover:border-sky-400/25 shadow-[0_0_20px_rgba(56,189,248,0.35)]'
            : 'bg-gradient-to-r from-[#0c0e17]/98 via-[#2a1218]/98 to-[#0c0e17]/98 hover:from-[#0c0e17]/25 hover:via-[#2a1218]/25 hover:to-[#0c0e17]/25 border-rose-500/60 hover:border-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
        }`}>
          {/* Who's Turn Indicator - fades on dock hover */}
          <div className="flex items-center space-x-2 transition-opacity duration-200 group-hover/dock:opacity-25">
            <span className={`w-2.5 h-2.5 rounded-full ${isPlayerTurn ? 'bg-sky-400' : 'bg-rose-500'} animate-pulse`} />
            <span className="font-serif font-black text-xs uppercase tracking-wider text-white drop-shadow">
              {isPlayerTurn ? 'YOUR TURN' : 'BOT TURN'}
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-300">
              • R{round} {phase.toUpperCase()}
            </span>
          </div>

          <span className="text-zinc-600 font-mono text-[9px] transition-opacity duration-200 group-hover/dock:opacity-25">│</span>

          {/* Turn / Phase Advance Quick Action - STAYS SHOWN ON BUTTONS */}
          {!isPlayerTurn ? (
            <button
              onClick={onExecuteBotAction}
              className="px-2.5 py-0.5 rounded bg-sky-700 hover:bg-sky-500 text-white font-mono text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer shadow opacity-90 hover:!opacity-100"
              title="Execute Bot Action"
            >
              <span>Bot Action</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={onAdvancePhase}
              className="px-2.5 py-0.5 rounded bg-amber-600 hover:bg-amber-400 text-black font-mono text-[10px] font-black flex items-center space-x-1 transition cursor-pointer shadow opacity-90 hover:!opacity-100"
              title="Advance to next phase or turn"
            >
              <span>End Phase</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {/* Expand Vitals Dock Button - STAYS SHOWN ON BUTTONS */}
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1 px-1.5 rounded-md bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-amber-300 transition cursor-pointer flex items-center space-x-0.5 text-[9px] font-mono opacity-90 hover:!opacity-100"
              title="Expand Vitals & Action Dock"
            >
              <span>Vitals</span>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // FORMAT: Expanded / Shown Action Dock
  return (
    <div className="group/dock flex flex-col items-center select-none pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* 1. Floating "[ YOUR TURN ]" Banner with Collapse Toggle */}
      <div className="mb-1 flex items-center space-x-2">
        <div className={`flex items-center space-x-2 px-4 py-0.5 rounded-full border shadow-xl backdrop-blur-md hover:backdrop-blur-none transition-all duration-200 ${
          isPlayerTurn
            ? 'bg-gradient-to-r from-sky-950/80 via-blue-900/90 to-sky-950/80 hover:from-sky-950/25 hover:via-blue-900/25 hover:to-sky-950/25 border-sky-400/60 hover:border-sky-400/25 shadow-[0_0_16px_rgba(56,189,248,0.3)]'
            : 'bg-gradient-to-r from-rose-950/80 via-red-900/90 to-rose-950/80 hover:from-rose-950/25 hover:via-red-900/25 hover:to-rose-950/25 border-rose-500/60 hover:border-rose-500/25 shadow-[0_0_16px_rgba(244,63,94,0.3)]'
        }`}>
          <div className="flex items-center space-x-1.5 transition-opacity duration-200 group-hover/dock:opacity-25">
            <span className={`text-[10px] font-mono ${isPlayerTurn ? 'text-sky-300' : 'text-rose-300'}`}>[</span>
            <span className="text-[11px] font-serif font-black tracking-widest uppercase text-white drop-shadow">
              {isPlayerTurn ? 'YOUR TURN' : 'ENEMY TURN'}
            </span>
            <span className="text-[9px] font-mono text-amber-300 font-bold ml-1">
              • R{round} {phase.toUpperCase()}
            </span>
            <span className={`text-[10px] font-mono ${isPlayerTurn ? 'text-sky-300' : 'text-rose-300'}`}>]</span>
          </div>

          {onToggle && (
            <button
              onClick={onToggle}
              className="ml-1 p-0.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer opacity-90 hover:!opacity-100"
              title="Collapse Action Dock (Keep Turn Indicator)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Action Points (AP) Pips & Dual Vitals Bar with END PHASE / TURN button */}
      <div className="flex items-center space-x-3 bg-gradient-to-t from-[#0c0e17]/98 via-[#131724]/95 to-[#0b0c13]/98 hover:from-[#0c0e17]/25 hover:via-[#131724]/25 hover:to-[#0b0c13]/25 px-5 py-2 rounded-t-2xl border-t-2 border-x-2 border-amber-900/60 hover:border-amber-900/25 shadow-[0_-8px_30px_rgba(0,0,0,0.85)] backdrop-blur-md hover:backdrop-blur-none transition-all duration-200">
        {/* Left: Action Points Pips - fades on dock hover */}
        <div className="flex flex-col items-center mr-2 transition-opacity duration-200 group-hover/dock:opacity-25">
          <div className="flex items-center space-x-1 mb-0.5">
            {[...Array(6)].map((_, i) => {
              const isAvailable = i < remActions;
              const isSlotActive = i < maxActions;

              return (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                    !isSlotActive
                      ? 'border-zinc-800 bg-zinc-950/60 opacity-30'
                      : isAvailable
                      ? 'border-cyan-400 bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                      : 'border-zinc-700 bg-zinc-900 shadow-inner'
                  }`}
                  title={isAvailable ? 'Available Action Point' : 'Spent Action Point'}
                />
              );
            })}
          </div>
          <span className="text-[8px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
            {remActions} / {maxActions} AP
          </span>
        </div>

        {/* Center: Dual Vitals Bar (Red Vitality & Blue Armor) - fades on dock hover */}
        <div className="w-56 sm:w-72 flex flex-col space-y-1 transition-opacity duration-200 group-hover/dock:opacity-25">
          {/* Top: Vitality / Health Bar */}
          <div className="relative w-full h-3 bg-black/90 rounded border border-red-900/80 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-red-800 via-rose-600 to-red-500 transition-all duration-300"
              style={{ width: `${hpPct}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] font-mono text-white drop-shadow font-bold">
              <span className="flex items-center space-x-1">
                <Heart className="w-2.5 h-2.5 text-red-300 fill-red-400" />
                <span>Vitality</span>
              </span>
              <span>{bl.remainingLives} / {bl.maxLives}</span>
            </div>
          </div>

          {/* Bottom: Armor / Shield Bar */}
          <div className="relative w-full h-2.5 bg-black/90 rounded border border-blue-900/80 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-800 via-sky-600 to-indigo-500 transition-all duration-300"
              style={{ width: `${armorPct}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-2 text-[8px] font-mono text-sky-200 drop-shadow font-bold">
              <span className="flex items-center space-x-1">
                <Shield className="w-2 h-2 text-sky-300" />
                <span>Armor Def {defStat}+</span>
              </span>
              <span>AM: {selectedUnit?.stats.am ?? 3}</span>
            </div>
          </div>
        </div>

        {/* Right: END PHASE / TURN Button - STAYS SHOWN ON BUTTONS */}
        <div>
          {!isPlayerTurn ? (
            <button
              onClick={onExecuteBotAction}
              className="px-4 py-2 bg-gradient-to-b from-sky-700 via-sky-800 to-sky-950 hover:from-sky-600 hover:to-sky-900 border-2 border-sky-400/80 rounded-lg text-white font-serif font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(56,189,248,0.3)] cursor-pointer flex items-center space-x-1.5 transition active:scale-95 opacity-90 hover:!opacity-100"
            >
              <span>BOT ACTION</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onAdvancePhase}
              className="px-4 py-2 bg-gradient-to-b from-[#1b263b] via-[#101b2b] to-[#0a111b] hover:from-[#243350] hover:to-[#142338] border-2 border-amber-400/90 rounded-lg text-amber-200 hover:text-amber-100 font-serif font-black text-xs uppercase tracking-wider shadow-[0_0_16px_rgba(251,191,36,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] cursor-pointer flex items-center space-x-1.5 transition active:scale-95 opacity-90 hover:!opacity-100"
            >
              <span>END PHASE / TURN</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
