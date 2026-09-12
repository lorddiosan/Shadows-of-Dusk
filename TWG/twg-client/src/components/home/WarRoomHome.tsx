import React from 'react';
import { 
  Swords, Shield, Play, Trophy, Users, ChevronRight, 
  Sparkles, Scroll, Flame, ArrowUpRight, Award, Compass 
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { FACTIONS } from '../../data/factions';
import { ArmyRoster } from '../../types/army';
import { FactionLogo } from '../common/FactionLogo';

interface WarRoomHomeProps {
  onNavigate: (tab: 'play' | 'builder' | 'shop' | 'battlepass' | 'lore' | 'admin') => void;
  onSelectArmyToDeploy: (roster: ArmyRoster) => void;
}

export const WarRoomHome: React.FC<WarRoomHomeProps> = ({
  onNavigate,
  onSelectArmyToDeploy
}) => {
  const factions = StorageService.getFactions();
  const rosters = StorageService.getRosters();
  const activeRoster = rosters[0] || null;

  // Sample default campaign stats matching screenshot
  const campaignProgress = 68;

  return (
    <div className="w-full min-h-[calc(100vh-50px)] bg-[#0a0705] text-[#f4efe6] px-4 py-6 sm:px-10 space-y-8 select-none overflow-x-hidden">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between border-b border-[#2e2319] pb-4">
        <div>
          <div className="flex items-center space-x-2 text-[#d49e54] font-mono text-[11px] uppercase tracking-[0.25em]">
            <span>EMBERFALL</span>
            <span>✦</span>
            <span>WAR ROOM</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-wide text-[#f4efe6] font-serif uppercase mt-1">
            War Room
          </h1>
          <p className="text-xs text-[#a39482] italic font-serif">
            Plan your conquest. Shape the tide of war across the convergence.
          </p>
        </div>

        <button
          onClick={() => onNavigate('play')}
          className="px-6 py-2.5 bg-gradient-to-r from-[#9a281e] to-[#c94a29] hover:from-[#b03024] hover:to-[#e05330] text-white font-bold text-xs uppercase tracking-widest rounded-md shadow-[0_0_20px_rgba(201,74,41,0.4)] border border-[#e07b53]/50 flex items-center space-x-2 transition cursor-pointer"
        >
          <Swords className="w-4 h-4" />
          <span>Seek Battle</span>
        </button>
      </div>

      {/* Featured Campaign Banner (As seen in your screenshot: "Chapter III - Active Campaign: The Ember Tide") */}
      <div className="relative rounded-xl border border-[#4a3522] bg-gradient-to-r from-[#17100b] via-[#241710] to-[#120c08] p-6 sm:p-8 shadow-2xl overflow-hidden group">
        {/* Ambient fire glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#a83818]/25 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute -right-8 -bottom-8 text-9xl opacity-10 font-serif select-none pointer-events-none">
          🏰
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center space-x-2 text-[10px] uppercase font-mono tracking-[0.2em] text-[#d49e54]">
            <Flame className="w-3.5 h-3.5 text-[#e05330]" />
            <span>Chapter III • Active Campaign</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-[#fdf8f0] font-serif tracking-wide uppercase">
            The Ember Tide
          </h2>

          <p className="text-xs sm:text-sm text-[#c7b7a3] leading-relaxed font-serif">
            Rally your forces at the Ashen Gates. The enemy marches beneath a blood-red moon, and the ash falls like snow upon the vale. Hold the convergence nexus or perish.
          </p>

          {/* Progress Bar */}
          <div className="pt-2 max-w-md">
            <div className="flex justify-between text-[11px] font-mono mb-1 text-[#d49e54]">
              <span>Campaign Progress</span>
              <span className="font-bold">{campaignProgress}% Complete</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#2a1d15] border border-[#4a3522] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#d49e54] via-[#e05330] to-[#ff7a50] shadow-[0_0_10px_rgba(224,83,48,0.7)]"
                style={{ width: `${campaignProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('play')}
              className="px-5 py-2.5 bg-[#9a281e] hover:bg-[#b03024] text-white font-bold text-xs uppercase tracking-wider rounded border border-[#d49e54]/50 shadow-lg flex items-center space-x-2 transition cursor-pointer"
            >
              <span>Continue Campaign</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-xs text-[#a39482] font-mono px-3 py-2 rounded bg-[#100a07] border border-[#332216]">
              <Trophy className="w-3.5 h-3.5 text-[#d49e54]" />
              <span>Weekly Quest: Win 3 Ranked Battles (2 / 3)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: "Muster of Arms" & Force Selection (Matching Screenshot layout) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#d49e54] block">Your Forces</span>
            <h3 className="text-xl font-bold font-serif text-white tracking-wide uppercase">Muster of Arms</h3>
          </div>

          <button
            onClick={() => onNavigate('builder')}
            className="text-xs text-[#d49e54] hover:text-[#f4efe6] font-mono uppercase tracking-wider flex items-center space-x-1"
          >
            <span>Manage Armies</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Armies List (4 cols) */}
          <div className="lg:col-span-4 space-y-2.5">
            {factions.slice(0, 3).map((f, i) => (
              <div
                key={f.id}
                onClick={() => onNavigate('builder')}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-center space-x-3.5 ${
                  i === 0
                    ? 'bg-gradient-to-r from-[#2a1a12] to-[#1a120d] border-[#9a4a2b] shadow-xl ring-1 ring-[#c94a29]/40'
                    : 'bg-[#140e0a] border-[#2e2117] hover:border-[#4a3522]'
                }`}
              >
                <div className="w-11 h-11 rounded-lg bg-[#241710] border border-[#593d28] flex items-center justify-center text-2xl shadow-inner overflow-hidden p-1">
                  <FactionLogo faction={f} size="md" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white font-serif tracking-wide truncate">{f.name}</h4>
                    {i === 0 && <span className="text-[9px] font-mono uppercase text-[#d49e54] font-bold">Active</span>}
                  </div>
                  <span className="text-[11px] text-[#a39482] font-mono block">
                    {12 + i * 4} units • {500 + i * 250} power
                  </span>
                </div>
              </div>
            ))}

            <button
              onClick={() => onNavigate('builder')}
              className="w-full py-3 rounded-xl border border-dashed border-[#4a3522] text-[#d49e54] hover:text-white hover:border-[#d49e54] text-xs font-mono uppercase tracking-wider transition flex items-center justify-center space-x-1.5"
            >
              <span>+ Raise a New Army</span>
            </button>
          </div>

          {/* Selected Force Detail Sheet (8 cols) */}
          <div className="lg:col-span-8 bg-[#140e0a] border border-[#3d2a1d] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#2e2117] pb-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-[#6b1e15] to-[#c94a29] border-2 border-[#d49e54] flex items-center justify-center text-3xl shadow-lg">
                  ⚙️
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#d49e54] block">Selected Army</span>
                  <h4 className="text-2xl font-black font-serif text-white uppercase tracking-wide">The Crimson Legion</h4>
                  <p className="text-xs text-[#a39482] italic font-serif">"Perfection through sacrifice. Humanity must evolve."</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-[#a39482] block">Army Power</span>
                <span className="text-2xl font-black font-mono text-[#d49e54]">7,420</span>
                <span className="text-[10px] text-emerald-400 block font-mono">Skirmish Ready</span>
              </div>
            </div>

            {/* Categorized Lineup Preview */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a120d] border border-[#332216]">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">👑</span>
                  <div>
                    <span className="font-bold text-white block">Warmaster Kaelen Vane</span>
                    <span className="text-[10px] text-[#d49e54]">Legendary Leader • 4 Lives (1 model)</span>
                  </div>
                </div>
                <span className="text-[#d49e54] font-bold">150 pts</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a120d] border border-[#332216]">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">🛡️</span>
                  <div>
                    <span className="font-bold text-white block">Blood-Alchemic Vanguard</span>
                    <span className="text-[10px] text-sky-400">Battleline Unit • 5 Lives (5 models @ 1 HP each)</span>
                  </div>
                </div>
                <span className="text-[#d49e54] font-bold">70 pts</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a120d] border border-[#332216]">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">🚜</span>
                  <div>
                    <span className="font-bold text-white block">Ironclad Siege Crawler</span>
                    <span className="text-[10px] text-purple-400">Vehicle / Monster • 3 Lives (1 model)</span>
                  </div>
                </div>
                <span className="text-[#d49e54] font-bold">180 pts</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#2e2117]">
              <span className="text-[11px] text-[#a39482] font-mono">16 / 25 models mustered</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => onNavigate('builder')}
                  className="px-4 py-2 bg-[#241710] hover:bg-[#332216] text-[#d49e54] rounded-lg text-xs font-mono uppercase tracking-wider border border-[#4a3522] transition"
                >
                  Edit Roster
                </button>
                <button
                  onClick={() => onNavigate('play')}
                  className="px-5 py-2 bg-gradient-to-r from-[#9a281e] to-[#c94a29] hover:from-[#b03024] hover:to-[#e05330] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow transition"
                >
                  Deploy Army
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
