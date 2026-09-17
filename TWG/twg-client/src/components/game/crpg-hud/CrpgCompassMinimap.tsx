import React from 'react';
import { Unit, POI, Phase } from '../../../types/game';
import { ZoomIn, ZoomOut, Compass } from 'lucide-react';

interface CrpgCompassMinimapProps {
  units: Unit[];
  pois: POI[];
  selectedUnitId: string | null;
  round: number;
  phase: Phase;
  mapName?: string;
  gridWidth: number;
  gridHeight: number;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSelectUnit: (unitId: string) => void;
}

export const CrpgCompassMinimap: React.FC<CrpgCompassMinimapProps> = ({
  units,
  pois,
  selectedUnitId,
  round,
  phase,
  mapName = 'Crucible Sector',
  gridWidth = 24,
  gridHeight = 16,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onSelectUnit,
}) => {
  const selectedUnit = units.find(u => u.id === selectedUnitId);
  const coordX = selectedUnit?.position ? Math.round(selectedUnit.position.x * 20) : 316;
  const coordY = selectedUnit?.position ? Math.round(selectedUnit.position.y * 20) : 58;

  const mapW = gridWidth || 24;
  const mapH = gridHeight || 16;

  return (
    <div className="absolute top-2 right-3 z-30 flex flex-col items-center pointer-events-auto select-none">
      {/* Sector & Round Header Badge */}
      <div className="flex flex-col items-center mb-1">
        <span className="text-[9px] uppercase font-mono tracking-widest text-amber-500 font-bold drop-shadow">
          ROUND {round} • {phase.toUpperCase()}
        </span>
        <span className="text-[8px] font-mono text-zinc-400">
          {mapName}
        </span>
      </div>

      {/* Circular Compass Frame */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-amber-800/80 bg-[#080a10] shadow-[0_4px_24px_rgba(0,0,0,0.9),inset_0_0_15px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden group">
        {/* Compass Cardinal Points Ring */}
        <div className="absolute inset-0 rounded-full border border-amber-600/40 pointer-events-none flex items-center justify-center">
          <span className="absolute top-0.5 text-[8px] font-mono font-black text-amber-400">N</span>
          <span className="absolute bottom-0.5 text-[8px] font-mono font-black text-amber-700">S</span>
          <span className="absolute left-1 text-[8px] font-mono font-black text-amber-700">W</span>
          <span className="absolute right-1 text-[8px] font-mono font-black text-amber-700">E</span>
        </div>

        {/* Radar Map Canvas Overlay */}
        <svg className="w-20 h-20 sm:w-24 sm:h-24 overflow-visible" viewBox={`0 0 ${mapW} ${mapH}`}>
          {/* Subtle Grid Lines */}
          <rect x="0" y="0" width={mapW} height={mapH} fill="#0d111a" opacity="0.8" rx="2" />
          <line x1={mapW / 2} y1="0" x2={mapW / 2} y2={mapH} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,1" />
          <line x1="0" y1={mapH / 2} x2={mapW} y2={mapH / 2} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,1" />

          {/* Objectives (POIs) */}
          {pois.map(poi => (
            <g key={poi.id}>
              <circle cx={poi.x} cy={poi.y} r="0.9" fill="#f59e0b" opacity="0.6" className="animate-pulse" />
              <circle cx={poi.x} cy={poi.y} r="0.4" fill="#fbbf24" />
            </g>
          ))}

          {/* Units */}
          {units.filter(u => !!u.position && (u.stats?.lives ?? 0) > 0).map(u => {
            if (!u.position) return null;
            const isSelected = u.id === selectedUnitId;
            const isP1 = u.owner === 'player1';

            return (
              <g
                key={u.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectUnit(u.id);
                }}
                className="cursor-pointer"
              >
                {isSelected && (
                  <circle
                    cx={u.position.x}
                    cy={u.position.y}
                    r="1.4"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="0.5"
                    className="animate-ping"
                  />
                )}
                <circle
                  cx={u.position.x}
                  cy={u.position.y}
                  r={isSelected ? "0.9" : "0.7"}
                  fill={isP1 ? "#38bdf8" : "#f43f5e"}
                  stroke={isSelected ? "#fbbf24" : "#0f172a"}
                  strokeWidth="0.3"
                />
              </g>
            );
          })}
        </svg>

        {/* Outer Bevel Sheen */}
        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 pointer-events-none" />
      </div>

      {/* Coordinates readout & Zoom buttons (DOS2 style) */}
      <div className="flex items-center space-x-2 mt-1 bg-black/80 border border-amber-900/50 rounded-full px-2.5 py-0.5 shadow">
        <span className="text-[9px] font-mono text-amber-300 font-bold">
          x:{coordX} y:{coordY}
        </span>
        <span className="text-zinc-600">│</span>
        <button
          onClick={onZoomIn}
          title="Zoom In"
          className="text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
        <button
          onClick={onZoomOut}
          title="Zoom Out"
          className="text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <ZoomOut className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
