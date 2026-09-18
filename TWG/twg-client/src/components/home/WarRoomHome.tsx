import React, { useState } from 'react';
import { 
  Swords, Shield, Play, Trophy, Users, ChevronRight, 
  Sparkles, Scroll, Flame, ArrowUpRight, Award, Compass,
  Calendar, Clock, CheckCircle2, MessageSquare, ExternalLink,
  Volume2, VolumeX, Eye, X, Check, ArrowRight, Zap, Target, Crosshair
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { FACTIONS } from '../../data/factions';
import { ArmyRoster } from '../../types/army';
import { FactionLogo } from '../common/FactionLogo';
import { WarRoomBackground } from './WarRoomBackground';

interface WarRoomHomeProps {
  onNavigate: (tab: 'play' | 'matchmaking' | 'builder' | 'shop' | 'battlepass' | 'lore' | 'admin') => void;
  onSelectArmyToDeploy: (roster: ArmyRoster) => void;
  onStartMatchmaking?: (roster: ArmyRoster) => void;
  onOpenDuelZone?: () => void;
}

export const WarRoomHome: React.FC<WarRoomHomeProps> = ({
  onNavigate,
  onSelectArmyToDeploy,
  onStartMatchmaking,
  onOpenDuelZone
}) => {
  const factions = StorageService.getFactions();
  const rosters = StorageService.getRosters();
  const [selectedRosterIndex, setSelectedRosterIndex] = useState<number>(0);
  const activeRoster = rosters[selectedRosterIndex] || rosters[0] || null;

  // Selected Champion for Showcase
  const [selectedHeroIndex, setSelectedHeroIndex] = useState<number>(0);

  // Modals / Drawers
  const [showQuestModal, setShowQuestModal] = useState<boolean>(false);
  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);

  // Sample Campaign and Missions stats
  const campaignProgress = 68;
  const dailyTrialsCompleted = 4;
  const dailyTrialsTotal = 7;
  const weeklyConquestsCompleted = 2;
  const weeklyConquestsTotal = 3;

  // Showcase Champions
  const champions = [
    {
      name: 'Grand Warmaster Kaelen Vane',
      title: 'Supreme Commander of the Crimson Legion',
      faction: 'The Crimson Empire',
      factionId: 'crimson_empire',
      symbol: '⚙️🩸',
      role: 'Legendary Leader • Heavy Assault',
      quote: 'Perfection through sacrifice. Humanity must evolve—or be consumed.',
      avatar: '👑',
      accentColor: '#e11d48',
      bgGlow: 'from-red-950/60 via-rose-950/40 to-transparent',
      borderColor: 'border-rose-500/50',
      tagColor: 'bg-rose-950/80 text-rose-300 border-rose-600/50',
      stats: { mv: 6, am: 4, def: 5, range: 18, lives: 5 },
      ability: {
        name: 'Blood-Alchemical Overdrive',
        desc: 'All friendly units gain +1 Movement and ignore difficult terrain this round.'
      }
    },
    {
      name: 'High Marshal Lyssandra',
      title: 'Arch-Justiciar of the First Dawn',
      faction: 'Daughters of Astraea',
      factionId: 'daughters_astraea',
      symbol: '🦅✨',
      role: 'Legendary Leader • Tactical Valkyrie',
      quote: 'We are not born to rule men. We are born to guard the future.',
      avatar: '✨',
      accentColor: '#38bdf8',
      bgGlow: 'from-sky-950/60 via-blue-950/40 to-transparent',
      borderColor: 'border-sky-500/50',
      tagColor: 'bg-sky-950/80 text-sky-300 border-sky-600/50',
      stats: { mv: 7, am: 4, def: 4, range: 24, lives: 4 },
      ability: {
        name: 'Dawn Aegis Aura',
        desc: 'Friendly units gain +1 to Defence saving throws against ranged attacks.'
      }
    },
    {
      name: 'Arch-General Malakor',
      title: 'Warlord of Structured Damnation',
      faction: 'The Infernal Crusades',
      factionId: 'infernal_crusades',
      symbol: '🔥⚔️',
      role: 'Legendary Leader • Hellfire Berserker',
      quote: 'Hell does not invade. It marches.',
      avatar: '🔥',
      accentColor: '#f97316',
      bgGlow: 'from-amber-950/60 via-orange-950/40 to-transparent',
      borderColor: 'border-amber-500/50',
      tagColor: 'bg-amber-950/80 text-amber-300 border-amber-600/50',
      stats: { mv: 5, am: 5, def: 5, range: 0, lives: 6 },
      ability: {
        name: 'Hellfire Shockwave',
        desc: 'All friendly engaging units gain +1 Attack Modifier on melee attacks this turn.'
      }
    },
    {
      name: 'Chronarch Prime Oros',
      title: 'Warden of the Eternal Loom',
      faction: 'The Chronarch Conclave',
      factionId: 'chronarch_conclave',
      symbol: '⏳🔮',
      role: 'Legendary Leader • Temporal Sorcerer',
      quote: 'Time belongs to no one. We merely guard its flow.',
      avatar: '⏳',
      accentColor: '#a855f7',
      bgGlow: 'from-purple-950/60 via-violet-950/40 to-transparent',
      borderColor: 'border-purple-500/50',
      tagColor: 'bg-purple-950/80 text-purple-300 border-purple-600/50',
      stats: { mv: 6, am: 3, def: 4, range: 30, lives: 4 },
      ability: {
        name: 'Temporal Loom Surge',
        desc: 'Instantly reposition a friendly squad up to 4" without triggering reactions.'
      }
    }
  ];

  const currentHero = champions[selectedHeroIndex];

  return (
    <div className="relative w-full min-h-[calc(100vh-50px)] text-[#f4efe6] select-none overflow-hidden flex flex-col justify-between">
      {/* 1. Animated Living Fantasy Background (Floating Islands, Embers, Starlight & Cosmic Rift) */}
      <WarRoomBackground />

      {/* 2. Top Header Bar Section (Marvel Rivals Header Parity) */}
      <div className="relative z-10 w-full px-4 sm:px-10 pt-4 flex items-center justify-between pointer-events-auto">
        {/* Left: Player Prestige / Convergence Badge */}
        <div className="flex items-center space-x-3 bg-black/60 backdrop-blur-md border border-amber-500/30 px-3.5 py-1.5 rounded-xl shadow-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-rose-600 border border-amber-300/60 flex items-center justify-center font-mono font-black text-xs text-white shadow">
            42
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#d49e54] block leading-none font-bold">
              CONVERGENCE COMMANDER
            </span>
            <span className="text-xs font-serif font-black text-white tracking-wide">
              Season 1 • The Ashen Eclipse
            </span>
          </div>
        </div>

        {/* Right: AAA Shadows of Dusk Brand Emblem */}
        <div className="text-right">
          <h1 className="text-2xl sm:text-4xl font-black font-serif tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-rose-100 to-amber-400 drop-shadow-[0_2px_18px_rgba(245,158,11,0.6)] uppercase">
            SHADOWS OF DUSK
          </h1>
          <div className="flex items-center justify-end space-x-2 text-[9px] sm:text-[10px] uppercase font-mono tracking-[0.45em] text-[#d49e54]">
            <span className="w-5 h-[1px] bg-gradient-to-r from-transparent to-[#d49e54]"></span>
            <span>✦ THE WAR GRID ✦</span>
            <span className="w-5 h-[1px] bg-gradient-to-l from-transparent to-[#d49e54]"></span>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace: Left Action Rail + Center-Right Hero Stage */}
      <div className="relative z-10 w-full px-4 sm:px-10 py-4 flex-1 flex flex-col lg:flex-row items-stretch justify-between gap-6 pointer-events-auto">
        
        {/* LEFT COLUMN: Featured Event / Campaign Card + Daily/Weekly Mission Trackers */}
        <div className="w-full lg:w-96 flex flex-col justify-between space-y-4 shrink-0">
          <div className="space-y-4">
            {/* Featured Event / Campaign Card (Marvel Rivals Trapezoid Event Card) */}
            <div className="relative rounded-2xl border-2 border-amber-500/60 bg-gradient-to-b from-[#160d09]/95 via-[#110a07]/90 to-[#070403]/95 p-5 shadow-[0_0_35px_rgba(0,0,0,0.85)] backdrop-blur-md overflow-hidden group hover:border-amber-400 transition duration-300">
              {/* Corner Ribbon Badge */}
              <div className="absolute -top-1 right-3">
                <span className="px-2.5 py-0.5 text-[9px] font-mono font-black uppercase tracking-widest bg-gradient-to-r from-rose-600 to-amber-600 text-white rounded-b-md shadow-md border-b border-x border-amber-400/50">
                  NEW EVENT
                </span>
              </div>

              {/* Event Subtitle */}
              <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.2em] text-[#d49e54] uppercase mb-1">
                <span>✦ SHADOWS OF DUSK × NEXUS</span>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-black font-serif text-white uppercase tracking-wider group-hover:text-amber-300 transition leading-tight">
                THE ASHEN ECLIPSE
              </h2>

              {/* Event Time Countdown */}
              <div className="flex items-center space-x-1.5 text-xs font-mono text-amber-400 font-bold mt-1">
                <Clock className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>⏳ 14D 18H REMAINING</span>
              </div>

              {/* Lore snippet */}
              <p className="text-xs text-zinc-300 font-serif leading-relaxed mt-2.5 line-clamp-2">
                The celestial rift ruptures over the Ashen Vale. Rally your legion before the blood-red moon reaches its zenith.
              </p>

              {/* Campaign Progress Bar */}
              <div className="pt-3">
                <div className="flex justify-between text-[11px] font-mono text-[#d49e54] mb-1">
                  <span>Chapter III Progression</span>
                  <span className="font-bold text-white">{campaignProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-950/80 border border-[#4a3522] overflow-hidden p-0.5">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                    style={{ width: `${campaignProgress}%` }}
                  />
                </div>
              </div>

              {/* Quick Launch Button */}
              <button
                onClick={() => onNavigate('play')}
                className="mt-4 w-full py-2.5 bg-gradient-to-r from-[#9a281e] via-[#c94a29] to-[#9a281e] hover:brightness-110 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(201,74,41,0.5)] border border-[#e07b53]/60 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <span>ENTER CAMPAIGN</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Daily & Weekly Mission Progress Widgets (Marvel Rivals 0/7 & 0/3 exact parity) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Daily Trials Widget */}
              <div 
                onClick={() => setShowQuestModal(true)}
                className="bg-black/75 backdrop-blur-md border border-zinc-700/80 hover:border-amber-400/80 rounded-xl p-3 shadow-xl cursor-pointer group transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono text-zinc-300 uppercase font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>DAILY TRIALS</span>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-400 group-hover:scale-105 transition">
                    {dailyTrialsCompleted}/{dailyTrialsTotal}
                  </span>
                </div>
                {/* 7 Segmented Ticks */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: dailyTrialsTotal }).map((_, i) => (
                    <div 
                      key={`daily_${i}`} 
                      className={`h-1.5 rounded-sm transition-all ${
                        i < dailyTrialsCompleted 
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_6px_rgba(251,191,36,0.6)]' 
                          : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Weekly Conquests Widget */}
              <div 
                onClick={() => setShowQuestModal(true)}
                className="bg-black/75 backdrop-blur-md border border-zinc-700/80 hover:border-sky-400/80 rounded-xl p-3 shadow-xl cursor-pointer group transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono text-zinc-300 uppercase font-bold">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    <span>WEEKLY QUEST</span>
                  </div>
                  <span className="text-xs font-mono font-black text-sky-400 group-hover:scale-105 transition">
                    {weeklyConquestsCompleted}/{weeklyConquestsTotal}
                  </span>
                </div>
                {/* 3 Segmented Ticks */}
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: weeklyConquestsTotal }).map((_, i) => (
                    <div 
                      key={`weekly_${i}`} 
                      className={`h-1.5 rounded-sm transition-all ${
                        i < weeklyConquestsCompleted 
                          ? 'bg-gradient-to-r from-sky-400 to-blue-500 shadow-[0_0_6px_rgba(56,189,248,0.6)]' 
                          : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Roster Indicator Pill */}
          <div 
            onClick={() => setShowRosterModal(true)}
            className="bg-black/70 backdrop-blur-md border border-zinc-800 hover:border-amber-500/60 rounded-xl p-3 flex items-center justify-between cursor-pointer transition shadow-xl group"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-amber-500/40 flex items-center justify-center text-lg shrink-0 shadow">
                🛡️
              </div>
              <div className="truncate">
                <span className="text-[9px] uppercase font-mono tracking-widest text-[#d49e54] block">
                  ACTIVE ROSTER
                </span>
                <span className="text-xs font-bold text-white truncate block font-serif">
                  {activeRoster ? activeRoster.name : 'The Crimson Legion'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-amber-400 group-hover:text-white px-2 py-1 rounded bg-zinc-900 border border-zinc-700 shrink-0">
              Switch ▾
            </span>
          </div>
        </div>

        {/* RIGHT STAGE: Champions of the Convergence Showcase */}
        <div className="flex-1 flex flex-col justify-end items-end space-y-4">
          {/* Active Champion Detail Splash Card */}
          <div className={`w-full max-w-xl bg-gradient-to-b ${currentHero.bgGlow} to-black/85 backdrop-blur-xl border-2 ${currentHero.borderColor} rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.9)] space-y-4 transition-all duration-300`}>
            
            {/* Champion Header */}
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900/90 border-2 border-amber-400/80 flex items-center justify-center text-3xl shadow-xl">
                  {currentHero.avatar}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${currentHero.tagColor}`}>
                      {currentHero.role}
                    </span>
                    <span className="text-xs font-mono text-[#d49e54]">{currentHero.symbol}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black font-serif text-white tracking-wide mt-1">
                    {currentHero.name}
                  </h3>
                  <p className="text-xs text-zinc-400 font-serif italic">
                    {currentHero.title}
                  </p>
                </div>
              </div>

              {/* Faction Emblem */}
              <div className="text-right hidden sm:block">
                <span className="text-[9px] uppercase font-mono text-zinc-500 block">FACTION</span>
                <span className="text-xs font-bold text-amber-300 font-serif">{currentHero.faction}</span>
              </div>
            </div>

            {/* Tactical Quote */}
            <blockquote className="text-xs text-zinc-300 italic font-serif border-l-2 border-amber-500/60 pl-3 py-0.5">
              "{currentHero.quote}"
            </blockquote>

            {/* Tactical Stat Matrix */}
            <div className="grid grid-cols-5 gap-2 text-center font-mono text-xs">
              <div className="bg-black/60 border border-zinc-800 rounded-lg p-1.5">
                <span className="text-[9px] text-zinc-500 block font-bold">MOVE</span>
                <span className="text-sky-400 font-black">{currentHero.stats.mv}"</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 rounded-lg p-1.5">
                <span className="text-[9px] text-zinc-500 block font-bold">ATTACK</span>
                <span className="text-rose-400 font-black">+{currentHero.stats.am}</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 rounded-lg p-1.5">
                <span className="text-[9px] text-zinc-500 block font-bold">DEFENCE</span>
                <span className="text-blue-400 font-black">{currentHero.stats.def}+</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 rounded-lg p-1.5">
                <span className="text-[9px] text-zinc-500 block font-bold">RANGE</span>
                <span className="text-amber-400 font-black">{currentHero.stats.range ? `${currentHero.stats.range}"` : 'Melee'}</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 rounded-lg p-1.5">
                <span className="text-[9px] text-zinc-500 block font-bold">LIVES</span>
                <span className="text-emerald-400 font-black">{currentHero.stats.lives} HP</span>
              </div>
            </div>

            {/* Faction Ability Banner */}
            <div className="bg-black/60 border border-zinc-800/90 rounded-xl p-3 flex items-start space-x-3 text-xs">
              <span className="text-xl">✨</span>
              <div className="flex-1">
                <span className="font-bold text-amber-300 block font-serif">
                  {currentHero.ability.name}
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                  {currentHero.ability.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Champion Selector Avatars (Rooftop Lineup) */}
          <div className="flex items-center space-x-2.5 bg-black/60 backdrop-blur-md border border-zinc-800/80 p-2 rounded-2xl shadow-xl">
            {champions.map((hero, idx) => (
              <button
                key={hero.factionId}
                onClick={() => setSelectedHeroIndex(idx)}
                title={`${hero.name} (${hero.faction})`}
                className={`relative w-12 h-12 rounded-xl transition-all duration-200 flex items-center justify-center text-xl cursor-pointer ${
                  selectedHeroIndex === idx
                    ? 'border-2 border-amber-400 bg-zinc-900 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                    : 'border border-zinc-800 bg-zinc-950/80 hover:border-zinc-600 hover:scale-100 opacity-70 hover:opacity-100'
                }`}
              >
                <span>{hero.avatar}</span>
                {selectedHeroIndex === idx && (
                  <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Bottom Control Bar (Marvel Rivals Style HUD) */}
      <div className="relative z-10 w-full px-4 sm:px-10 pb-5 pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/60 bg-black/40 backdrop-blur-sm pointer-events-auto">
        {/* Bottom Left: Comm-Link & System Watermark */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-black/70 border border-zinc-800 px-3.5 py-1.5 rounded-lg text-xs font-mono text-zinc-400 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
            <span>COMM-LINK ACTIVE • PRESS [ENTER] TO CHAT</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-600 hidden md:block">
            UID: 1689656192 • REGION: US-EAST (VALE) • v0.9.5
          </span>
        </div>

        {/* Bottom Right: Primary Action Launchers */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('builder')}
            className="px-4 py-2.5 bg-zinc-900/90 hover:bg-zinc-800 text-[#d49e54] rounded-xl text-xs font-mono uppercase tracking-wider border border-amber-500/30 hover:border-amber-400 shadow-lg transition cursor-pointer flex items-center space-x-1.5"
          >
            <Shield className="w-4 h-4" />
            <span>Muster Armies</span>
          </button>

          <button
            onClick={() => onNavigate('matchmaking')}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-700 via-rose-700 to-amber-700 hover:brightness-125 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.5)] border border-amber-400/70 flex items-center space-x-2 transition cursor-pointer hover:scale-105"
            title="Open PvP Matchmaking, Ranked Queues & Custom Duels"
          >
            <Crosshair className="w-4 h-4 text-amber-300" />
            <span>MATCHMAKING</span>
          </button>

          <button
            onClick={() => onNavigate('play')}
            className="px-6 py-2.5 bg-gradient-to-r from-[#9a281e] via-[#c94a29] to-[#e05330] hover:brightness-110 text-white font-black text-xs uppercase tracking-[0.15em] rounded-xl shadow-[0_0_30px_rgba(224,83,48,0.7)] border-2 border-amber-400/80 flex items-center space-x-2 transition cursor-pointer hover:scale-105"
          >
            <Swords className="w-4 h-4" />
            <span>SOLO SKIRMISH</span>
          </button>
        </div>
      </div>

      {/* 5. Interactive Quest & Missions Modal */}
      {showQuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-[#110c08] border-2 border-amber-500/70 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400 font-serif font-black text-lg">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>ACTIVE CONVERGENCE QUESTS</span>
              </div>
              <button 
                onClick={() => setShowQuestModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>Daily: Win 3 Ranked or Solo Matches</span>
                  <span className="text-amber-400">2 / 3</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: '66%' }} />
                </div>
                <span className="text-[10px] text-zinc-400">Reward: +250 🩸 Crystal Shards</span>
              </div>

              <div className="bg-zinc-950/80 border border-emerald-600/40 rounded-xl p-3 space-y-1">
                <div className="flex justify-between font-bold text-emerald-300">
                  <span>Daily: Deploy 5 Infantry Squads in Formation</span>
                  <span className="text-emerald-400">✓ COMPLETED</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-full" />
                </div>
                <span className="text-[10px] text-emerald-400">Reward Claimed: +50 💎 Aether Cores</span>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>Weekly: Issue 5 Faction Stratagems</span>
                  <span className="text-sky-400">3 / 5</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400 rounded-full" style={{ width: '60%' }} />
                </div>
                <span className="text-[10px] text-zinc-400">Reward: +500 🩸 Shards • +100 💎 Cores</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowQuestModal(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-lg text-xs font-mono uppercase"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Quick Army Switcher Modal */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#110c08] border-2 border-amber-500/70 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400 font-serif font-black text-lg">
                <Shield className="w-5 h-5 text-amber-400" />
                <span>SELECT ACTIVE ARMY</span>
              </div>
              <button 
                onClick={() => setShowRosterModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {rosters.map((roster, idx) => (
                <div
                  key={roster.id}
                  onClick={() => {
                    setSelectedRosterIndex(idx);
                    setShowRosterModal(false);
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    selectedRosterIndex === idx
                      ? 'bg-amber-950/40 border-amber-500 text-white shadow-md'
                      : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-base">
                      🛡️
                    </div>
                    <div>
                      <h4 className="font-bold text-sm font-serif">{roster.name}</h4>
                      <span className="text-[10px] font-mono text-zinc-400 block">
                        {roster.units.length} units • {roster.totalPoints} pts
                      </span>
                    </div>
                  </div>
                  {selectedRosterIndex === idx && (
                    <Check className="w-4 h-4 text-amber-400" />
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-zinc-800">
              <button
                onClick={() => {
                  setShowRosterModal(false);
                  onNavigate('builder');
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-mono"
              >
                + Create New Army
              </button>
              <button
                onClick={() => setShowRosterModal(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-lg text-xs font-mono uppercase"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

