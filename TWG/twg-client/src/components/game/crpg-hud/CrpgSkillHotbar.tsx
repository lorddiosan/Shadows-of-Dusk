import React from 'react';
import { Unit, Phase, FormationType } from '../../../types/game';
import { 
  Move, Target, Flame, Swords, Sparkles, Users, UserPlus, UserMinus, 
  Truck, Zap, Dice6, Lock, Unlock, Check, RotateCcw, MessageSquare, 
  BookOpen, Layers, Settings, HelpCircle, Box, ZoomIn, ZoomOut, ChevronDown
} from 'lucide-react';

interface CrpgSkillHotbarProps {
  selectedUnit: Unit | null;
  targetUnit: Unit | null;
  phase: Phase;
  activePlayer: 'player1' | 'player2';
  onToggleHotbar?: () => void;
  
  // Handlers for Slot Actions
  onConfirmMove?: () => void;
  onResetMove?: () => void;
  onExecuteShooting?: () => void;
  onExecuteCharge?: () => void;
  onExecuteFight?: () => void;
  onExecuteEngagement?: () => void;
  onExecuteMissionAction?: () => void;
  onChangeFormation?: (formation: FormationType) => void;
  onOpenAttachModal?: () => void;
  onDetachLeader?: () => void;
  onOpenEmbarkModal?: () => void;
  onConfirmDeployment?: () => void;
  onCancelDeployment?: () => void;
  onConfirmDisembark?: () => void;
  onCancelDisembark?: () => void;
  
  // Drawer / Dock Toggles
  onToggleArmyTray: () => void;
  onToggleReserves: () => void;
  onToggleCommand: () => void;
  onToggleDiceDrawer: () => void;
  onToggleEventsDrawer: () => void;
  onToggleSecondaryDeck?: () => void;
  onToggleAbilitiesDock: () => void;
  
  // Zoom Controls
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  
  // Right Sidebar Tab Toggles
  activeRightTab: 'chat' | 'journal' | 'cards' | 'settings';
  showRightSidebar: boolean;
  onSelectRightTab: (tab: 'chat' | 'journal' | 'cards' | 'settings') => void;
  onToggleRightSidebar: () => void;

  // Active Tool
  activeTool: 'select' | 'move' | 'measure' | 'target' | 'inspect';
  onSelectTool: (tool: 'select' | 'move' | 'measure' | 'target' | 'inspect') => void;

  // Ability count
  readyAbilitiesCount: number;

  // Firing deck / embark status
  canShootEmbarked?: boolean;
}

export const CrpgSkillHotbar: React.FC<CrpgSkillHotbarProps> = ({
  selectedUnit,
  targetUnit,
  phase,
  activePlayer,
  onConfirmMove,
  onResetMove,
  onExecuteShooting,
  onExecuteCharge,
  onExecuteFight,
  onExecuteEngagement,
  onExecuteMissionAction,
  onChangeFormation,
  onOpenAttachModal,
  onDetachLeader,
  onOpenEmbarkModal,
  onConfirmDeployment,
  onCancelDeployment,
  onConfirmDisembark,
  onCancelDisembark,
  onToggleArmyTray,
  onToggleReserves,
  onToggleCommand,
  onToggleDiceDrawer,
  onToggleEventsDrawer,
  onToggleSecondaryDeck,
  onToggleAbilitiesDock,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  activeRightTab,
  showRightSidebar,
  onSelectRightTab,
  onToggleRightSidebar,
  activeTool,
  onSelectTool,
  readyAbilitiesCount,
  onToggleHotbar,
  canShootEmbarked,
}) => {
  const [isLocked, setIsLocked] = React.useState(true);

  const isOwner = selectedUnit?.owner === activePlayer;
  const remActions = selectedUnit?.actionsRemaining ?? 2;
  const hasActions = remActions > 0;
  const isEmbarked = !!selectedUnit?.embarkedIn;

  // Formation cycler
  const formations: FormationType[] = ['circle', 'line', 'grid', 'stack', 'auto'];
  const handleCycleFormation = () => {
    if (!selectedUnit || !onChangeFormation) return;
    const currentIdx = formations.indexOf(selectedUnit.formation || 'circle');
    const nextFormation = formations[(currentIdx + 1) % formations.length];
    onChangeFormation(nextFormation);
  };

  return (
    <div className="w-full bg-[#0a0c13] border-t-2 border-amber-900/60 shadow-[0_-4px_24px_rgba(0,0,0,0.9)] flex items-center justify-between px-2 py-1.5 z-40 select-none">
      {/* ── Left Utility Keybind Buttons ([E], [I], [K], [G], [T], [M], Zoom, Lock) ── */}
      <div className="flex items-center space-x-1 shrink-0">
        <button
          onClick={onToggleReserves}
          title="[E] Strategic Reserves"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#131622] hover:bg-[#1c2135] border border-amber-900/50 flex flex-col items-center justify-center text-amber-300 transition cursor-pointer"
        >
          <Box className="w-3.5 h-3.5" />
          <span className="text-[7px] font-mono text-zinc-500 font-bold leading-none">E</span>
        </button>

        <button
          onClick={onToggleArmyTray}
          title="[I] Army Tray (Deploy Units)"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#131622] hover:bg-[#1c2135] border border-amber-900/50 flex flex-col items-center justify-center text-amber-300 transition cursor-pointer"
        >
          <Users className="w-3.5 h-3.5" />
          <span className="text-[7px] font-mono text-zinc-500 font-bold leading-none">I</span>
        </button>

        <button
          onClick={onToggleCommand}
          title="[K] Command Phase & Stratagems"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#131622] hover:bg-[#1c2135] border border-amber-900/50 flex flex-col items-center justify-center text-purple-300 transition cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="text-[7px] font-mono text-zinc-500 font-bold leading-none">K</span>
        </button>

        <button
          onClick={onToggleEventsDrawer}
          title="[G] Field Hazards & Events"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#131622] hover:bg-[#1c2135] border border-amber-900/50 flex flex-col items-center justify-center text-rose-300 transition cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5" />
          <span className="text-[7px] font-mono text-zinc-500 font-bold leading-none">G</span>
        </button>

        {onToggleSecondaryDeck && (
          <button
            onClick={onToggleSecondaryDeck}
            title="[T] Secondary Mission Objectives Deck"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#131622] hover:bg-[#1c2135] border border-amber-900/50 flex flex-col items-center justify-center text-amber-400 transition cursor-pointer"
          >
            <Target className="w-3.5 h-3.5" />
            <span className="text-[7px] font-mono text-zinc-500 font-bold leading-none">T</span>
          </button>
        )}

        <button
          onClick={() => onSelectTool(activeTool === 'measure' ? 'select' : 'measure')}
          title="[M] Range Ruler / Measure Tool"
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded border flex flex-col items-center justify-center transition cursor-pointer ${
            activeTool === 'measure'
              ? 'bg-amber-600 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
              : 'bg-[#131622] hover:bg-[#1c2135] border-amber-900/50 text-amber-300'
          }`}
        >
          <span className="text-xs">📏</span>
          <span className="text-[7px] font-mono text-zinc-500 font-bold leading-none">M</span>
        </button>

        <button
          onClick={() => onSelectTool(activeTool === 'inspect' ? 'select' : 'inspect')}
          title="[?] Inspection Tool - Hover over units, terrain, hazards & objectives"
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded border flex flex-col items-center justify-center transition cursor-pointer ${
            activeTool === 'inspect'
              ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-pulse'
              : 'bg-[#131622] hover:bg-[#1c2135] border-amber-900/50 text-amber-300 hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="text-[7px] font-mono text-zinc-500 font-bold leading-none">?</span>
        </button>

        {/* Zoom Controls */}
        {onZoomIn && (
          <button
            onClick={onZoomIn}
            title="Zoom In"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#10121c] border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        )}

        {onZoomOut && (
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#10121c] border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        )}

        {onResetZoom && zoomLevel !== undefined && (
          <button
            onClick={onResetZoom}
            title="Reset Zoom to 100%"
            className="px-1.5 h-7 sm:h-8 rounded bg-[#10121c] border border-zinc-800 flex items-center justify-center text-[9px] font-mono font-bold text-zinc-400 hover:text-amber-300 transition cursor-pointer"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
        )}

        <button
          onClick={() => setIsLocked(!isLocked)}
          title={isLocked ? "Hotbar Locked" : "Hotbar Unlocked"}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#10121c] border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
        >
          {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3 text-amber-400" />}
        </button>
      </div>

      <div className="w-px h-6 bg-gradient-to-b from-transparent via-amber-900/40 to-transparent mx-1.5 shrink-0" />

      {/* ── Main Action Hotbar Grid (Slots 1..0 + Recessed Tiles) ── */}
      <div className="flex-1 flex items-center justify-center space-x-1 sm:space-x-1.5 overflow-x-auto py-0.5">
        {/* Slot 1: Move / Confirm Move */}
        <div className="relative group">
          {selectedUnit?.isPendingDeploymentConfirm ? (
            <div className="flex items-center space-x-1">
              <button
                onClick={onConfirmDeployment}
                title="Confirm Placement (Key 1)"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-emerald-700 hover:bg-emerald-600 border-2 border-emerald-400 text-white flex flex-col items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.5)] cursor-pointer animate-pulse"
              >
                <Check className="w-5 h-5" />
                <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black">1</span>
              </button>
              {onCancelDeployment && (
                <button
                  onClick={onCancelDeployment}
                  title="Return to Tray"
                  className="w-7 h-10 sm:w-8 sm:h-11 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-amber-400 flex items-center justify-center shadow cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : selectedUnit?.isPendingMoveConfirm ? (
            <div className="flex items-center space-x-1">
              <button
                onClick={onConfirmMove}
                title="Confirm Move (Key 1)"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-emerald-700 hover:bg-emerald-600 border-2 border-emerald-400 text-white flex flex-col items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.5)] cursor-pointer animate-pulse"
              >
                <Check className="w-5 h-5" />
                <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black">1</span>
              </button>
              {onResetMove && (
                <button
                  onClick={onResetMove}
                  title="Reset Move"
                  className="w-7 h-10 sm:w-8 sm:h-11 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-amber-400 flex items-center justify-center shadow cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : selectedUnit?.isPendingDisembarkConfirm ? (
            <div className="flex items-center space-x-1">
              <button
                onClick={onConfirmDisembark}
                title="Confirm Disembark (Key 1)"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-emerald-700 hover:bg-emerald-600 border-2 border-emerald-400 text-white flex flex-col items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.5)] cursor-pointer animate-pulse"
              >
                <Check className="w-5 h-5" />
                <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black">1</span>
              </button>
              {onCancelDisembark && (
                <button
                  onClick={onCancelDisembark}
                  title="Cancel Disembark"
                  className="w-7 h-10 sm:w-8 sm:h-11 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-amber-400 flex items-center justify-center shadow cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              disabled={!selectedUnit || !isOwner || isEmbarked}
              onClick={() => onSelectTool('move')}
              title={
                isEmbarked
                  ? 'Cannot Move - Unit is Embarked inside Transport'
                  : `Move (Key 1) - Mv: ${selectedUnit?.stats.mv || 5} sq`
              }
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${
                selectedUnit && isOwner && !isEmbarked
                  ? 'bg-gradient-to-b from-[#1b253b] to-[#0f1624] border-sky-500/70 hover:border-sky-400 text-sky-200 cursor-pointer shadow hover:scale-105'
                  : 'bg-[#0f1118] border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
              }`}
            >
              <Move className="w-4 h-4" />
              <span className="text-[7px] font-mono uppercase font-bold text-sky-300 leading-none">
                {selectedUnit?.stats.mv ? `${selectedUnit.stats.mv}sq` : 'Move'}
              </span>
              <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-zinc-400">1</span>
            </button>
          )}
        </div>

        {/* Slot 2: Shoot */}
        <div className="relative group">
          {(() => {
            const canShoot = selectedUnit && isOwner && hasActions && (selectedUnit.stats.range > 0) && (!isEmbarked || !!canShootEmbarked);
            const shootTitle = isEmbarked
              ? (canShootEmbarked
                  ? `🔫 Firing Deck Shoot (Key 2) - Range: ${selectedUnit?.stats.range} sq from Transport`
                  : 'Shoot (Key 2) - Embarked (Transport lacks Firing Deck)')
              : (selectedUnit?.stats.range && selectedUnit.stats.range > 0
                  ? `Shoot (Key 2) - Range: ${selectedUnit.stats.range} sq`
                  : 'Shoot (Key 2) - Melee Only');

            return (
              <button
                disabled={!canShoot}
                onClick={onExecuteShooting}
                title={shootTitle}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${
                  canShoot
                    ? isEmbarked
                      ? 'bg-gradient-to-b from-[#3a2512] to-[#1c1208] border-amber-500 hover:border-amber-400 text-amber-200 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:scale-105'
                      : 'bg-gradient-to-b from-[#2b1b22] to-[#180f14] border-rose-500/80 hover:border-rose-400 text-rose-200 cursor-pointer shadow hover:scale-105'
                    : 'bg-[#0f1118] border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                }`}
              >
                <Target className="w-4 h-4" />
                <span className="text-[7px] font-mono uppercase font-bold text-rose-300 leading-none">
                  {selectedUnit?.stats.range ? `${selectedUnit.stats.range}sq` : '0sq'}
                </span>
                {isEmbarked && canShootEmbarked && (
                  <span className="text-[6px] font-mono uppercase text-amber-400 font-black leading-none">DECK</span>
                )}
                <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-zinc-400">2</span>
              </button>
            );
          })()}
        </div>

        {/* Slot 3: Charge / Engage */}
        <div className="relative group">
          <button
            disabled={!selectedUnit || !isOwner || !hasActions || isEmbarked}
            onClick={phase === 'Action' ? onExecuteEngagement : onExecuteCharge}
            title={
              isEmbarked
                ? 'Cannot Engage - Unit is Embarked inside Transport'
                : 'Charge / Engage (Key 3) - Costs 1 Action'
            }
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${
              selectedUnit && isOwner && hasActions && !isEmbarked
                ? 'bg-gradient-to-b from-[#332211] to-[#1c1208] border-amber-500/80 hover:border-amber-400 text-amber-200 cursor-pointer shadow hover:scale-105'
                : 'bg-[#0f1118] border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-[7px] font-mono uppercase font-bold text-amber-300 leading-none">Engage</span>
            <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-zinc-400">3</span>
          </button>
        </div>

        {/* Slot 4: Fight (Melee) */}
        <div className="relative group">
          <button
            disabled={!selectedUnit || !isOwner || !hasActions || isEmbarked}
            onClick={onExecuteFight}
            title={
              isEmbarked
                ? 'Cannot Fight - Unit is Embarked inside Transport'
                : 'Fight (Key 4) - Melee Combat'
            }
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${
              selectedUnit && isOwner && hasActions && !isEmbarked
                ? 'bg-gradient-to-b from-[#3a1515] to-[#1a0808] border-red-500/80 hover:border-red-400 text-red-200 cursor-pointer shadow hover:scale-105'
                : 'bg-[#0f1118] border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Swords className="w-4 h-4 text-red-400" />
            <span className="text-[7px] font-mono uppercase font-bold text-red-300 leading-none">Fight</span>
            <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-zinc-400">4</span>
          </button>
        </div>

        {/* Slot 5: Mission Action */}
        <div className="relative group">
          <button
            disabled={!selectedUnit || !isOwner || !hasActions || isEmbarked}
            onClick={onExecuteMissionAction}
            title={
              isEmbarked
                ? 'Cannot Score Mission - Unit is Embarked inside Transport'
                : 'Mission Action (Key 5) - Objective POI Score'
            }
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${
              selectedUnit && isOwner && hasActions && !isEmbarked
                ? 'bg-gradient-to-b from-[#0e2a1b] to-[#07170e] border-emerald-500/80 hover:border-emerald-400 text-emerald-200 cursor-pointer shadow hover:scale-105'
                : 'bg-[#0f1118] border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-[7px] font-mono uppercase font-bold text-emerald-300 leading-none">Mission</span>
            <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-zinc-400">5</span>
          </button>
        </div>

        {/* Slot 6: Formation Switcher */}
        <div className="relative group">
          <button
            disabled={!selectedUnit || !isOwner || isEmbarked}
            onClick={handleCycleFormation}
            title={
              isEmbarked
                ? 'Cannot Change Formation - Unit is Embarked inside Transport'
                : `Cycle Formation (Key 6) - Current: ${selectedUnit?.formation || 'circle'}`
            }
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${
              selectedUnit && isOwner && !isEmbarked
                ? 'bg-gradient-to-b from-[#1b1c2e] to-[#0d0e17] border-indigo-500/80 hover:border-indigo-400 text-indigo-200 cursor-pointer shadow hover:scale-105'
                : 'bg-[#0f1118] border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-300" />
            <span className="text-[7px] font-mono uppercase font-bold text-indigo-300 leading-none truncate max-w-[36px]">
              {selectedUnit?.formation || 'Form'}
            </span>
            <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-zinc-400">6</span>
          </button>
        </div>

        {/* Slot 7: Attach / Detach Leader */}
        <div className="relative group">
          {selectedUnit?.attachedUnits && selectedUnit.attachedUnits.length > 0 ? (
            <button
              onClick={onDetachLeader}
              title="Detach Leader (Key 7)"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-purple-900/80 hover:bg-purple-800 border-2 border-purple-400 text-purple-200 flex flex-col items-center justify-center shadow cursor-pointer transition hover:scale-105"
            >
              <UserMinus className="w-4 h-4" />
              <span className="text-[7px] font-mono uppercase font-bold leading-none">Detach</span>
              <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-purple-300">7</span>
            </button>
          ) : (
            <button
              disabled={!selectedUnit || !isOwner || phase !== 'Deployment'}
              onClick={onOpenAttachModal}
              title="Attach Leader (Key 7)"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${
                selectedUnit && isOwner && phase === 'Deployment'
                  ? 'bg-purple-950/80 hover:bg-purple-900 border-purple-500 text-purple-200 cursor-pointer shadow hover:scale-105'
                  : 'bg-[#0f1118] border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span className="text-[7px] font-mono uppercase font-bold leading-none">Leader</span>
              <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-zinc-400">7</span>
            </button>
          )}
        </div>

        {/* Slot 8: Transport (Embark / Disembark) */}
        <div className="relative group">
          <button
            disabled={!selectedUnit || !isOwner}
            onClick={onOpenEmbarkModal}
            title="Transport Embark / Disembark (Key 8)"
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${
              selectedUnit && isOwner
                ? 'bg-sky-950/80 hover:bg-sky-900 border-sky-500 text-sky-200 cursor-pointer shadow hover:scale-105'
                : 'bg-[#0f1118] border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span className="text-[7px] font-mono uppercase font-bold leading-none">Trnsprt</span>
            <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-zinc-400">8</span>
          </button>
        </div>

        {/* Slot 9: Tactical & Faction Abilities */}
        <div className="relative group">
          <button
            onClick={onToggleAbilitiesDock}
            title="Abilities Cards Hand (Key 9)"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-b from-[#2b210f] to-[#171107] border border-amber-400 text-amber-300 hover:brightness-110 flex flex-col items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.35)] cursor-pointer transition hover:scale-105"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-[7px] font-mono uppercase font-bold leading-none">
              {readyAbilitiesCount > 0 ? `${readyAbilitiesCount} Rdy` : 'Abil'}
            </span>
            <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-amber-400">9</span>
          </button>
        </div>

        {/* Slot 0: Virtual Dice Tray */}
        <div className="relative group">
          <button
            onClick={onToggleDiceDrawer}
            title="Roll Dice Tray (Key 0)"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-b from-[#221c2c] to-[#120f18] border border-amber-600/70 text-amber-200 hover:brightness-110 flex flex-col items-center justify-center shadow cursor-pointer transition hover:scale-105"
          >
            <Dice6 className="w-4 h-4 text-amber-300" />
            <span className="text-[7px] font-mono uppercase font-bold leading-none">Dice</span>
            <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-zinc-400">0</span>
          </button>
        </div>

        {/* Recessed Empty Stone Slots (Classic DOS2 Aesthetic) */}
        {['-', '=', '[', ']'].map((keyLabel) => (
          <div
            key={keyLabel}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0c0e15] border border-zinc-800/80 shadow-inner flex items-center justify-center relative opacity-40 hover:opacity-75 transition hidden md:flex"
          >
            <div className="w-4 h-4 rounded-sm border border-zinc-800/50" />
            <span className="absolute bottom-0.5 right-1 text-[7px] font-mono text-zinc-600 font-bold">{keyLabel}</span>
          </div>
        ))}
      </div>

      <div className="w-px h-6 bg-gradient-to-b from-transparent via-amber-900/40 to-transparent mx-1.5 shrink-0" />

      {/* ── Right Utility Buttons (Chat, Journal, Cards, Settings) ── */}
      <div className="flex items-center space-x-1 shrink-0">
        <button
          onClick={() => {
            onSelectRightTab('chat');
            if (!showRightSidebar) onToggleRightSidebar();
          }}
          title="Chat & Combat Log"
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded border flex items-center justify-center transition cursor-pointer ${
            showRightSidebar && activeRightTab === 'chat'
              ? 'bg-rose-900/60 border-rose-500 text-white shadow'
              : 'bg-[#131622] hover:bg-[#1c2135] border-zinc-800 text-zinc-400'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => {
            onSelectRightTab('journal');
            if (!showRightSidebar) onToggleRightSidebar();
          }}
          title="Force Dossiers / Journal"
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded border flex items-center justify-center transition cursor-pointer ${
            showRightSidebar && activeRightTab === 'journal'
              ? 'bg-amber-900/60 border-amber-500 text-white shadow'
              : 'bg-[#131622] hover:bg-[#1c2135] border-zinc-800 text-zinc-400'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => {
            onSelectRightTab('cards');
            if (!showRightSidebar) onToggleRightSidebar();
          }}
          title="Tactical Cards Hand"
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded border flex items-center justify-center transition cursor-pointer ${
            showRightSidebar && activeRightTab === 'cards'
              ? 'bg-purple-900/60 border-purple-500 text-white shadow'
              : 'bg-[#131622] hover:bg-[#1c2135] border-zinc-800 text-zinc-400'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => {
            onSelectRightTab('settings');
            if (!showRightSidebar) onToggleRightSidebar();
          }}
          title="Map & System Settings"
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded border flex items-center justify-center transition cursor-pointer ${
            showRightSidebar && activeRightTab === 'settings'
              ? 'bg-zinc-700/60 border-zinc-500 text-white shadow'
              : 'bg-[#131622] hover:bg-[#1c2135] border-zinc-800 text-zinc-400'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {onToggleHotbar && (
          <button
            onClick={onToggleHotbar}
            title="Hide Action Hotbar"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#131622] hover:bg-[#1c2135] border border-amber-900/50 flex flex-col items-center justify-center text-zinc-400 hover:text-amber-300 transition cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span className="text-[7px] font-mono text-zinc-500 font-bold leading-none">Hide</span>
          </button>
        )}
      </div>
    </div>
  );
};
