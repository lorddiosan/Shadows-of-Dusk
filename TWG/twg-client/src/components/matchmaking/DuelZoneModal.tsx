import React, { useState } from 'react';
import { 
  X, Swords, Bot, Trophy, Users, Shield, Zap, Globe, 
  ChevronRight, Lock, Sparkles, Flame, Compass, Radio 
} from 'lucide-react';
import { ArmyRoster } from '../../types/army';
import { UserProfile } from '../../types/user';
import { FactionLogo } from '../common/FactionLogo';

interface DuelZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  rosters: ArmyRoster[];
  selectedRoster: ArmyRoster;
  onSelectRoster: (roster: ArmyRoster) => void;
  onStart1v1Matchmaking: (roster: ArmyRoster) => void;
  onStartAiSkirmish: (roster: ArmyRoster) => void;
  onOpenArmyBuilder: () => void;
}

const REGIONS = [
  { id: 'us_east', name: 'Convergence Prime (US-East)', ping: '24ms', flag: '⚡' },
  { id: 'eu_west', name: 'Astraea Citadel (EU-West)', ping: '38ms', flag: '🛡️' },
  { id: 'asia_pac', name: 'Ember Rift (Asia-Pacific)', ping: '105ms', flag: '🔥' }
];

export const DuelZoneModal: React.FC<DuelZoneModalProps> = ({
  isOpen,
  onClose,
  user,
  rosters,
  selectedRoster,
  onSelectRoster,
  onStart1v1Matchmaking,
  onStartAiSkirmish,
  onOpenArmyBuilder
}) => {
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0].id);
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);

  if (!isOpen) return null;

  const currentRegion = REGIONS.find(r => r.id === selectedRegion) || REGIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 select-none overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#0e0c0a] border border-[#2e2319] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#2e2319] bg-[#140e0a] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#9a281e] to-[#d49e54] flex items-center justify-center shadow-md border border-[#c94a29]/50">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#d49e54]">WARPATH DUEL ZONE</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 font-mono">
                  ONLINE
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#f4efe6] font-serif tracking-wide uppercase">
                Combat Arena & Skirmish
              </h2>
            </div>
          </div>

          {/* Region Selector & Close */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRegionMenuOpen(!isRegionMenuOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#1c140e] border border-[#3e2e21] hover:border-[#d49e54]/50 text-xs font-mono text-[#d49e54] transition cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#d49e54]" />
                <span className="hidden sm:inline">{currentRegion.name}</span>
                <span className="sm:hidden">{currentRegion.id.toUpperCase()}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-emerald-400">
                  {currentRegion.ping}
                </span>
              </button>

              {isRegionMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#140e0a] border border-[#3e2e21] rounded-xl shadow-xl overflow-hidden z-20 py-1 font-mono text-xs">
                  <div className="px-3 py-1.5 text-[10px] uppercase text-[#a39482] border-b border-[#2e2319]">
                    Select Server Convergence
                  </div>
                  {REGIONS.map(reg => (
                    <button
                      key={reg.id}
                      onClick={() => { setSelectedRegion(reg.id); setIsRegionMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#2e2319]/60 transition ${
                        selectedRegion === reg.id ? 'text-[#d49e54] bg-[#241710]' : 'text-[#f4efe6]'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{reg.flag}</span>
                        <span>{reg.name}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400">{reg.ping}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#a39482] hover:text-white hover:bg-[#241710] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Armed Roster Bar */}
        <div className="px-5 py-3 bg-[#17100b] border-b border-[#2e2319] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#241710] border border-[#3e2e21] flex items-center justify-center overflow-hidden">
              <FactionLogo faction={{ id: selectedRoster.factionId }} size="sm" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#a39482] font-mono block">Deploying Roster</span>
              <span className="font-bold text-[#f4efe6] font-serif">{selectedRoster.name}</span>
              <span className="ml-2 font-mono text-[11px] text-[#d49e54]">({selectedRoster.totalPoints}/{selectedRoster.maxPoints} pts)</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {rosters.length > 1 && (
              <select
                value={selectedRoster.id}
                onChange={e => {
                  const target = rosters.find(r => r.id === e.target.value);
                  if (target) onSelectRoster(target);
                }}
                className="bg-[#100b08] border border-[#3e2e21] rounded-lg px-2.5 py-1 text-xs text-[#d49e54] font-mono focus:outline-none focus:border-[#d49e54]"
              >
                {rosters.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.totalPoints} pts)
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => { onClose(); onOpenArmyBuilder(); }}
              className="px-2.5 py-1 bg-[#241710] hover:bg-[#342217] border border-[#4a3525] rounded-lg text-xs font-mono text-[#f4efe6] transition cursor-pointer"
            >
              Builder
            </button>
          </div>
        </div>

        {/* Modal Body: Category Rows */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          
          {/* CATEGORY 1: REAL & ACTIVE MODES */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#d49e54] font-mono">
                Active Skirmish Modes (Live)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Tile 1: 1v1 Quick Match (PVP) */}
              <div 
                onClick={() => { onClose(); onStart1v1Matchmaking(selectedRoster); }}
                className="group relative p-5 rounded-2xl bg-gradient-to-b from-[#1c120c] to-[#140c08] border border-[#3e291b] hover:border-[#c94a29] transition-all duration-200 cursor-pointer shadow-lg hover:shadow-rose-950/20 hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-[#2e1710] border border-[#592c1f] flex items-center justify-center text-rose-400 group-hover:scale-105 transition">
                    <Radio className="w-6 h-6 text-rose-400 animate-pulse" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/80 font-mono font-bold tracking-wider uppercase">
                    1v1 PVP Queue
                  </span>
                </div>

                <div className="my-4">
                  <h4 className="text-lg font-bold text-[#f4efe6] font-serif group-hover:text-rose-400 transition">
                    1v1 Quick Match
                  </h4>
                  <p className="text-xs text-[#a39482] mt-1 leading-relaxed">
                    Enter the matchmaking queue with your armed roster. First-available pairing with live radar telemetry.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#2e2319] flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <span>⚡ Instant Search</span>
                  </span>
                  <span className="text-rose-400 group-hover:translate-x-1 transition flex items-center space-x-1 font-bold">
                    <span>Initiate Scan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Tile 2: Skirmish vs AI */}
              <div 
                onClick={() => { onClose(); onStartAiSkirmish(selectedRoster); }}
                className="group relative p-5 rounded-2xl bg-gradient-to-b from-[#1c120c] to-[#140c08] border border-[#3e291b] hover:border-[#d49e54] transition-all duration-200 cursor-pointer shadow-lg hover:shadow-amber-950/20 hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-[#2b1f14] border border-[#543b24] flex items-center justify-center text-[#d49e54] group-hover:scale-105 transition">
                    <Bot className="w-6 h-6 text-[#d49e54]" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-[#d49e54] border border-[#593d28] font-mono font-bold tracking-wider uppercase">
                    Solo Practice
                  </span>
                </div>

                <div className="my-4">
                  <h4 className="text-lg font-bold text-[#f4efe6] font-serif group-hover:text-[#d49e54] transition">
                    Skirmish vs AI
                  </h4>
                  <p className="text-xs text-[#a39482] mt-1 leading-relaxed">
                    Test strategies, tactical movements, and trait synergies against the Cogitator AI on the battlefield.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#2e2319] flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-400 flex items-center space-x-1">
                    <span>🤖 Offline Ready</span>
                  </span>
                  <span className="text-[#d49e54] group-hover:translate-x-1 transition flex items-center space-x-1 font-bold">
                    <span>Deploy Bot Match</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* CATEGORY 2: ROADMAP & FUTURE MODES (PREVIEWS / LOCKED) */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Lock className="w-3.5 h-3.5 text-[#6e5d4e]" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7767] font-mono">
                Roadmap Arena Modes (Season 1 & Beyond)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Tile 3: Ranked Ladder */}
              <div className="p-4 rounded-xl bg-[#120d09]/70 border border-[#261910] opacity-75 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Trophy className="w-4 h-4 text-[#8a7767]" />
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-700 font-mono">
                      BACKLOG // S1
                    </span>
                  </div>
                  <h5 className="font-bold text-sm text-[#c4b5a5] font-serif">Ranked Ladder</h5>
                  <p className="text-[11px] text-[#7a6b5c] mt-1">
                    Competitive ELO/MMR rating, seasonal division tiers, and cosmetic crest rewards.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1c140e] flex items-center justify-between text-[10px] font-mono text-[#6e5d4e]">
                  <span>Status: Post-MVP</span>
                  <span className="flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </span>
                </div>
              </div>

              {/* Tile 4: 2v2 Tag Convergence */}
              <div className="p-4 rounded-xl bg-[#120d09]/70 border border-[#261910] opacity-75 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-4 h-4 text-[#8a7767]" />
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-700 font-mono">
                      FUTURE
                    </span>
                  </div>
                  <h5 className="font-bold text-sm text-[#c4b5a5] font-serif">2v2 Tag Clash</h5>
                  <p className="text-[11px] text-[#7a6b5c] mt-1">
                    Four commanders in allied cooperative battles across an expanded convergence warboard.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1c140e] flex items-center justify-between text-[10px] font-mono text-[#6e5d4e]">
                  <span>Status: Milestone 2</span>
                  <span className="flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </span>
                </div>
              </div>

              {/* Tile 5: Tournament Arena */}
              <div className="p-4 rounded-xl bg-[#120d09]/70 border border-[#261910] opacity-75 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Sparkles className="w-4 h-4 text-[#8a7767]" />
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-700 font-mono">
                      FUTURE
                    </span>
                  </div>
                  <h5 className="font-bold text-sm text-[#c4b5a5] font-serif">Tournament Bracket</h5>
                  <p className="text-[11px] text-[#7a6b5c] mt-1">
                    Automated single-elimination weekend cups with live brackets and spectator telemetry.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1c140e] flex items-center justify-between text-[10px] font-mono text-[#6e5d4e]">
                  <span>Status: Roadmap</span>
                  <span className="flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#140e0a] border-t border-[#2e2319] flex items-center justify-between text-xs text-[#a39482] font-mono">
          <span>Matchmaking Engine v1.2</span>
          <span>Warpath: Shadows of Dusk</span>
        </div>

      </div>
    </div>
  );
};
