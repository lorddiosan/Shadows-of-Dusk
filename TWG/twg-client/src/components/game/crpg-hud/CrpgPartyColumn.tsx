import React from 'react';
import { Unit } from '../../../types/game';
import { Shield, Swords, Crosshair, Crown, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { getUnitBodiesAndLives } from '../../../engine/formationEngine';

interface CrpgPartyColumnProps {
  playerUnits: Unit[];
  selectedUnitId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectUnit: (unitId: string) => void;
}

export const CrpgPartyColumn: React.FC<CrpgPartyColumnProps> = ({
  playerUnits,
  selectedUnitId,
  isOpen,
  onToggle,
  onSelectUnit,
}) => {
  // Only show living player units
  const livingUnits = playerUnits.filter(u => (u.stats?.lives ?? 0) > 0);

  if (livingUnits.length === 0) return null;

  // Collapsed State: Sleek vertical button on the left edge
  if (!isOpen) {
    return (
      <div className="absolute top-14 left-1 z-30 pointer-events-auto select-none">
        <button
          onClick={onToggle}
          title="Show Forces Column"
          className="flex items-center space-x-1 bg-[#0d0f17]/95 hover:bg-[#161a28] border border-amber-800/60 hover:border-amber-500/80 px-2 py-2 rounded-r-xl shadow-2xl backdrop-blur-md text-amber-300 hover:text-white transition cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-mono font-bold leading-none">{livingUnits.length}</span>
          <ChevronRight className="w-3 h-3 text-amber-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-10 left-3 z-30 flex flex-col items-start space-y-1.5 pointer-events-auto select-none">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400/90 font-bold">
          Forces ({livingUnits.length})
        </span>
        <button
          onClick={onToggle}
          title="Hide Forces Column"
          className="text-zinc-500 hover:text-amber-300 transition cursor-pointer p-0.5 rounded hover:bg-zinc-800/60"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {livingUnits.map((unit, index) => {
        const isSelected = unit.id === selectedUnitId;
        const bl = getUnitBodiesAndLives(unit);
        const hpPct = Math.min(100, Math.max(0, (bl.remainingLives / bl.maxLives) * 100));
        const armorPct = Math.min(100, Math.max(10, ((unit.stats.def + unit.stats.defModifier) / 20) * 100));

        return (
          <React.Fragment key={unit.id}>
            {/* Chained link visual between portraits (DOS2 style) */}
            {index > 0 && (
              <div className="w-1 h-2 bg-gradient-to-b from-amber-700 via-amber-500 to-amber-700 opacity-60 rounded-full shadow ml-6" />
            )}

            <div
              onClick={() => onSelectUnit(unit.id)}
              className={`relative flex items-center bg-[#0d0f17]/95 border-2 rounded-lg p-1 transition-all duration-200 cursor-pointer group shadow-2xl backdrop-blur-md ${
                isSelected
                  ? 'border-amber-400 ring-2 ring-amber-500/50 shadow-[0_0_16px_rgba(251,191,36,0.5)] translate-x-1'
                  : 'border-zinc-700/80 hover:border-amber-600/70 hover:translate-x-0.5'
              }`}
            >
              {/* Left Portrait Box */}
              <div className="relative w-12 h-14 sm:w-14 sm:h-16 rounded bg-black/90 overflow-hidden border border-zinc-700/80 shrink-0">
                {unit.tokenImageUrl ? (
                  <img
                    src={unit.tokenImageUrl}
                    alt={unit.name}
                    className="w-full h-full object-cover object-top filter brightness-95 group-hover:brightness-110 pointer-events-none"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    {unit.avatar || '⚔️'}
                  </div>
                )}

                {/* Attached leader mini indicator */}
                {unit.attachedUnits && unit.attachedUnits.length > 0 && (
                  <div className="absolute top-0.5 left-0.5 bg-purple-950/90 text-purple-300 border border-purple-600 rounded px-1 py-0.2 text-[8px] flex items-center space-x-0.5 shadow">
                    <Crown className="w-2.5 h-2.5 text-amber-400" />
                    <span>Lead</span>
                  </div>
                )}

                {/* Role / Attack Icon Badge */}
                <div className="absolute bottom-0.5 right-0.5 bg-black/80 rounded p-0.5 border border-white/20">
                  {unit.stats.range > 0 ? (
                    <Crosshair className="w-3 h-3 text-sky-400" />
                  ) : (
                    <Swords className="w-3 h-3 text-amber-400" />
                  )}
                </div>
              </div>

              {/* Right Side Vitals (Health Red, Armor Blue, Info) */}
              <div className="ml-2 w-28 sm:w-32 flex flex-col justify-center space-y-1">
                {/* Unit Name */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-200 truncate group-hover:text-amber-300 font-serif">
                    {unit.name}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400">
                    {bl.remainingLives}/{bl.maxLives}
                  </span>
                </div>

                {/* 1. Vitality Bar (Red) */}
                <div className="w-full h-1.5 bg-black/80 rounded-sm overflow-hidden border border-red-950">
                  <div
                    className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-600 transition-all duration-300"
                    style={{ width: `${hpPct}%` }}
                  />
                </div>

                {/* 2. Armor / Shield Bar (Blue / Silver) */}
                <div className="w-full h-1.5 bg-black/80 rounded-sm overflow-hidden border border-blue-950">
                  <div
                    className="h-full bg-gradient-to-r from-blue-700 via-sky-500 to-indigo-600 transition-all duration-300"
                    style={{ width: `${armorPct}%` }}
                  />
                </div>

                {/* Stats Readout */}
                <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 pt-0.5">
                  <span className="flex items-center space-x-0.5">
                    <Shield className="w-2.5 h-2.5 text-blue-400" />
                    <span>{unit.stats.def + unit.stats.defModifier}+</span>
                  </span>
                  <span className="flex items-center space-x-0.5">
                    <Swords className="w-2.5 h-2.5 text-amber-400" />
                    <span>AM:{unit.stats.am}</span>
                  </span>
                  <span className="text-zinc-500">Mv:{unit.stats.mv}</span>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
