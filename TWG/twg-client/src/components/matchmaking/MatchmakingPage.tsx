import React, { useState, useEffect, useRef } from 'react';
import { 
  Swords, Shield, Trophy, Users, Zap, Globe, Bot, 
  ChevronRight, Radio, CheckCircle, AlertTriangle, X, 
  Flame, Award, ArrowRight, Play, Copy, Check, Sparkles,
  RefreshCw, Clock, History, BarChart3, Crosshair, ChevronDown,
  MapPin, Eye, Compass, Flag, Crown, Layers, ShieldCheck, UserCheck
} from 'lucide-react';
import { UserProfile } from '../../types/user';
import { ArmyRoster } from '../../types/army';
import { BattleMap } from '../../types/game';
import { FactionLogo } from '../common/FactionLogo';
import { MatchmakingService } from '../../services/matchmakingService';
import { StorageService, PRESET_MAPS } from '../../services/storageService';
import { vfxDispatcher } from '../../services/audioVfxService';

export type MatchQueueMode = 
  | 'ranked' 
  | 'casual' 
  | '2v2' 
  | '3way' 
  | '4ffa' 
  | 'tournament_solo' 
  | 'tournament_2v2' 
  | 'tournament_guild' 
  | 'ai' 
  | 'custom';

export type ModeCategory = 'all' | '1v1' | '2v2' | '3way' | '4ffa' | 'tournaments';

export interface MatchedCommander {
  id: string;
  name: string;
  faction: string;
  rating: number;
  avatar: string;
  roleOrTeam?: string;
  color?: string;
  isUser?: boolean;
}

interface MatchmakingPageProps {
  user: UserProfile;
  rosters: ArmyRoster[];
  activeRoster: ArmyRoster;
  onSelectRoster: (roster: ArmyRoster) => void;
  onDeployToBattle: (roster: ArmyRoster, opponent?: any, mapId?: string) => void;
  onNavigate: (tab: 'home' | 'play' | 'matchmaking' | 'builder' | 'shop' | 'battlepass' | 'lore' | 'admin') => void;
}

const REGIONS = [
  { id: 'us_east', name: 'Convergence Prime (US-East)', ping: '24ms', flag: '⚡' },
  { id: 'eu_west', name: 'Astraea Citadel (EU-West)', ping: '38ms', flag: '🛡️' },
  { id: 'asia_pac', name: 'Ember Rift (Asia-Pacific)', ping: '105ms', flag: '🔥' }
];

export const MatchmakingPage: React.FC<MatchmakingPageProps> = ({
  user,
  rosters,
  activeRoster,
  onSelectRoster,
  onDeployToBattle,
  onNavigate
}) => {
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0].id);
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);
  const [isRosterDropdownOpen, setIsRosterDropdownOpen] = useState(false);
  
  // Navigation Subtab & Mode Filter
  const [subTab, setSubTab] = useState<'modes' | 'leaderboard' | 'history'>('modes');
  const [modeFilter, setModeFilter] = useState<ModeCategory>('all');

  // Battle Modes & Queue State
  const [queueState, setQueueState] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [searchMode, setSearchMode] = useState<MatchQueueMode>('ranked');
  const [searchTime, setSearchTime] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Active queue target map & matched players
  const [activeQueueMap, setActiveQueueMap] = useState<BattleMap | null>(null);
  const [matchedCommanders, setMatchedCommanders] = useState<MatchedCommander[]>([]);

  // Modals
  const [previewMap, setPreviewMap] = useState<BattleMap | null>(null);
  const [tournamentModalType, setTournamentModalType] = useState<'solo' | '2v2' | 'guild' | null>(null);

  // AI Skirmish options
  const [aiDifficulty, setAiDifficulty] = useState<'recruit' | 'veteran' | 'apex'>('veteran');

  // Custom Duel Room
  const [customRoomCode, setCustomRoomCode] = useState<string>('VALE-8842');
  const [customInputCode, setCustomInputCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  const timerRef = useRef<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const fallbackMatchTimerRef = useRef<any>(null);

  const allMaps = StorageService.getMaps();
  const currentRegion = REGIONS.find(r => r.id === selectedRegion) || REGIONS[0];

  // Helper to lookup map by ID or fallback
  const getMapById = (mapId: string): BattleMap => {
    return allMaps.find(m => m.id === mapId) || PRESET_MAPS.find(m => m.id === mapId) || PRESET_MAPS[0];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (fallbackMatchTimerRef.current) clearTimeout(fallbackMatchTimerRef.current);
      if (unsubscribeRef.current) unsubscribeRef.current();
      MatchmakingService.leaveQueue(user.id);
    };
  }, [user.id]);

  const handleStartMatchmaking = async (mode: MatchQueueMode, targetMapId?: string) => {
    if (!activeRoster) return;
    
    const targetMap = targetMapId ? getMapById(targetMapId) : PRESET_MAPS[0];
    setActiveQueueMap(targetMap);
    setSearchMode(mode);
    setQueueState('searching');
    setSearchTime(0);
    setErrorMsg(null);
    setMatchedCommanders([]);
    setCountdown(3);

    // Start search elapsed timer
    timerRef.current = setInterval(() => {
      setSearchTime(t => t + 1);
    }, 1000);

    // Simulated multi-commander matching (adapted per mode)
    fallbackMatchTimerRef.current = setTimeout(() => {
      const userCommander: MatchedCommander = {
        id: user.id,
        name: user.displayName || 'You (Commander)',
        faction: activeRoster?.factionName || 'Convergence Vanguard',
        rating: 1480,
        avatar: '👑',
        roleOrTeam: mode === '2v2' || mode === 'tournament_2v2' ? 'Team Alpha (P1)' : mode === '4ffa' ? 'NW Citadel (P1)' : mode === '3way' ? 'Zenith Apex (P1)' : 'Challenger',
        color: '#f43f5e',
        isUser: true
      };

      let rosterPool: MatchedCommander[] = [];

      if (mode === '2v2' || mode === 'tournament_2v2') {
        rosterPool = [
          userCommander,
          { id: 'p2', name: 'Inquisitor Raven', faction: 'The Silver Vanguard', rating: 1465, avatar: '🛡️', roleOrTeam: 'Team Alpha (P3)', color: '#10b981' },
          { id: 'p3', name: 'Warmaster Cynthia', faction: 'The Crimson Empire', rating: 1490, avatar: '⚔️', roleOrTeam: 'Team Omega (P2)', color: '#0ea5e9' },
          { id: 'p4', name: 'Iron-Juggernaut Brak', faction: 'The Ironclad Legion', rating: 1440, avatar: '⚙️', roleOrTeam: 'Team Omega (P4)', color: '#f59e0b' }
        ];
      } else if (mode === '3way') {
        rosterPool = [
          userCommander,
          { id: 'p2', name: 'Arch-Magus Vorrak', faction: 'The Eldritch Coven', rating: 1520, avatar: '🔮', roleOrTeam: 'Obsidian Trench (P2)', color: '#0ea5e9' },
          { id: 'p3', name: 'Shadowblade Lyra', faction: 'The Obsidian Enclave', rating: 1495, avatar: '🗡️', roleOrTeam: 'Cinder Basin (P3)', color: '#10b981' }
        ];
      } else if (mode === '4ffa') {
        rosterPool = [
          userCommander,
          { id: 'p2', name: 'Warmaster Cynthia', faction: 'The Crimson Empire', rating: 1490, avatar: '⚔️', roleOrTeam: 'SE Redoubt (P2)', color: '#0ea5e9' },
          { id: 'p3', name: 'Arch-Magus Vorrak', faction: 'The Eldritch Coven', rating: 1520, avatar: '🔮', roleOrTeam: 'NE Citadel (P3)', color: '#10b981' },
          { id: 'p4', name: 'Forge-Baron Kroll', faction: 'The Ironclad Legion', rating: 1440, avatar: '⚙️', roleOrTeam: 'SW Outpost (P4)', color: '#f59e0b' }
        ];
      } else if (mode === 'tournament_solo') {
        rosterPool = [
          userCommander,
          { id: 'p2', name: 'Grand Warmaster Vane', faction: 'The Crimson Empire', rating: 1650, avatar: '🥇', roleOrTeam: 'Round 1 Opponent (Seed #2)', color: '#0ea5e9' }
        ];
      } else if (mode === 'tournament_guild') {
        rosterPool = [
          userCommander,
          { id: 'p2', name: 'Archon Ignatius [Knights of Dawn]', faction: 'The Ember Dominion', rating: 1580, avatar: '🏰', roleOrTeam: 'Guild War Matchup', color: '#0ea5e9' }
        ];
      } else {
        // Standard 1v1
        const mockOpponents = [
          { id: 'p2', name: 'Warmaster Cynthia', faction: 'The Silver Vanguard', rating: 1475, avatar: '🛡️', roleOrTeam: 'Opponent', color: '#0ea5e9' },
          { id: 'p2', name: 'Arch-Magus Vorrak', faction: 'The Eldritch Coven', rating: 1520, avatar: '🔮', roleOrTeam: 'Opponent', color: '#0ea5e9' },
          { id: 'p2', name: 'Iron-Juggernaut Brak', faction: 'The Ironclad Legion', rating: 1410, avatar: '⚙️', roleOrTeam: 'Opponent', color: '#0ea5e9' },
          { id: 'p2', name: 'Shadowblade Lyra', faction: 'The Obsidian Enclave', rating: 1495, avatar: '🗡️', roleOrTeam: 'Opponent', color: '#0ea5e9' }
        ];
        const randomOpp = mockOpponents[Math.floor(Math.random() * mockOpponents.length)];
        rosterPool = [userCommander, randomOpp];
      }

      triggerMultiMatchFound(rosterPool, targetMap);
    }, 5500);
  };

  const triggerMultiMatchFound = (commanders: MatchedCommander[], map: BattleMap) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (fallbackMatchTimerRef.current) clearTimeout(fallbackMatchTimerRef.current);
    setMatchedCommanders(commanders);
    setQueueState('matched');

    vfxDispatcher.triggerAbility(
      { x: window.innerWidth / 2, y: window.innerHeight / 2 }, 
      '⚔️', 
      'COMMANDERS INTERCEPTED!', 
      'gain_cp'
    );

    let currentCount = 3;
    const countInterval = setInterval(() => {
      currentCount -= 1;
      setCountdown(currentCount);
      if (currentCount <= 0) {
        clearInterval(countInterval);
        const opponent = commanders.find(c => !c.isUser) || commanders[1];
        onDeployToBattle(activeRoster, opponent, map.id);
      }
    }, 1000);
  };

  const handleCancelQueue = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (fallbackMatchTimerRef.current) clearTimeout(fallbackMatchTimerRef.current);
    if (unsubscribeRef.current) unsubscribeRef.current();
    MatchmakingService.leaveQueue(user.id);
    setQueueState('idle');
    setSearchTime(0);
    setMatchedCommanders([]);
  };

  const handleLaunchAiBattle = () => {
    if (!activeRoster) return;
    const standardMap = PRESET_MAPS[0];
    onDeployToBattle(activeRoster, {
      name: `Automaton Core [${aiDifficulty.toUpperCase()}]`,
      faction: 'Synthesized AI Opponent',
      rating: aiDifficulty === 'recruit' ? 1100 : aiDifficulty === 'veteran' ? 1450 : 1800,
      avatar: '🤖'
    }, standardMap.id);
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(customRoomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleJoinCustomRoom = () => {
    if (!customInputCode.trim()) return;
    const coliseumMap = getMapById('map_apex_championship_stadium');
    triggerMultiMatchFound([
      { id: user.id, name: user.displayName || 'You', faction: activeRoster?.factionName || 'Faction', rating: 1480, avatar: '👑', isUser: true, roleOrTeam: 'Host' },
      { id: 'c_guest', name: `Challenger (${customInputCode.toUpperCase()})`, faction: 'Convergence Syndicate', rating: 1460, avatar: '🗝️', roleOrTeam: 'Challenger' }
    ], coliseumMap);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-[#0a0806] text-[#f4efe6] px-4 sm:px-8 py-6 flex flex-col space-y-6 select-none">
      
      {/* 1. Header & Server Latency Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2e2319] pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#9a281e] via-[#c94a29] to-[#d49e54] flex items-center justify-center shadow-lg border border-[#e07b53]/50">
            <Crosshair className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#d49e54]">
                WARPATH MULTIPLAYER COMMAND
              </span>
              <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-400 border border-emerald-700/60 font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
                CONVERGENCE ACTIVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#f4efe6] font-serif tracking-wide uppercase">
              Matchmaking &amp; Duel Zone
            </h1>
          </div>
        </div>

        {/* Region & Navigation Controls */}
        <div className="flex items-center space-x-3">
          {/* Server Convergence Region Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsRegionMenuOpen(!isRegionMenuOpen)}
              className="flex items-center space-x-2.5 px-3.5 py-2 rounded-xl bg-[#16100c] border border-[#3e2e21] hover:border-[#d49e54]/60 text-xs font-mono text-[#d49e54] transition cursor-pointer shadow-md"
            >
              <Globe className="w-4 h-4 text-[#d49e54]" />
              <span>{currentRegion.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-emerald-400 border border-emerald-900/50">
                {currentRegion.ping}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#a39482]" />
            </button>

            {isRegionMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#140e0a] border border-[#3e2e21] rounded-xl shadow-2xl overflow-hidden z-30 py-1 font-mono text-xs">
                <div className="px-3 py-2 text-[10px] uppercase text-[#a39482] border-b border-[#2e2319] flex justify-between items-center">
                  <span>SELECT REGION ROUTING</span>
                  <span className="text-emerald-400">99.9% UPTIME</span>
                </div>
                {REGIONS.map(reg => (
                  <button
                    key={reg.id}
                    onClick={() => {
                      setSelectedRegion(reg.id);
                      setIsRegionMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-[#241710] transition ${
                      selectedRegion === reg.id ? 'text-[#d49e54] bg-[#1c120c] font-bold' : 'text-[#f4efe6]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-base">{reg.flag}</span>
                      <span>{reg.name}</span>
                    </div>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/60 text-emerald-400 font-mono">
                      {reg.ping}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('home')}
            className="px-3 py-2 rounded-xl bg-[#16100c] border border-[#3e2e21] hover:border-[#a39482] text-xs font-mono text-[#a39482] hover:text-white transition cursor-pointer"
          >
            War Room ↵
          </button>
        </div>
      </div>

      {/* 2. Commander Battle Dossier & Active Roster Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Commander Stats Card */}
        <div className="bg-[#120d09] border border-[#2e2319] rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-[#9a281e]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#1c140e] border-2 border-[#d49e54]/60 flex items-center justify-center text-3xl shadow-inner">
              👑
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-[#d49e54] uppercase tracking-wider font-bold">
                  {user.displayName || 'Commander'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#241710] text-amber-400 border border-[#593d28] font-mono">
                  S1 Vanguard
                </span>
              </div>
              <h3 className="text-lg font-black text-white font-serif">1,480 ELO RATING</h3>
              <div className="flex items-center space-x-3 text-[11px] font-mono text-[#a39482] mt-0.5">
                <span className="text-emerald-400 font-bold">42W - 18L (70%)</span>
                <span>•</span>
                <span className="text-amber-400 font-bold flex items-center">
                  <Flame className="w-3 h-3 mr-0.5 text-rose-500 fill-rose-500" /> 5 Streak
                </span>
              </div>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-mono text-[#a39482] uppercase">Armory Vault</div>
            <div className="text-xs font-mono text-[#f4efe6] font-bold">🩸 {user.crystalShards} Shards</div>
            <div className="text-xs font-mono text-[#d49e54] font-bold">💎 {user.aetherCores} Cores</div>
          </div>
        </div>

        {/* Active Army Roster Selector Card */}
        <div className="lg:col-span-2 bg-[#120d09] border border-[#2e2319] rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <div className="flex items-center space-x-3.5 overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-[#1c140e] border border-[#d49e54]/50 flex items-center justify-center text-2xl shrink-0 shadow">
              <FactionLogo faction={{ id: activeRoster?.factionId || 'crimson_empire' }} size="sm" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#d49e54]">
                  ACTIVE COMBAT ROSTER
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  DEPLOYMENT READY
                </span>
              </div>
              <h4 className="text-base font-bold text-white font-serif truncate">
                {activeRoster ? activeRoster.name : 'Vanguard Battlegroup'}
              </h4>
              <p className="text-xs text-[#a39482] font-mono">
                {activeRoster?.units?.length || 0} Units • {activeRoster?.totalPoints || 0} / {activeRoster?.maxPoints || 500} pts • {activeRoster?.factionName || 'Universal'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            {/* Quick Switch Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsRosterDropdownOpen(!isRosterDropdownOpen)}
                className="px-3 py-2 rounded-xl bg-[#1c140e] border border-[#3e2e21] hover:border-[#d49e54] text-xs font-mono text-[#d49e54] flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Switch Army</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isRosterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#140e0a] border border-[#3e2e21] rounded-xl shadow-2xl z-30 py-1 font-mono text-xs">
                  <div className="px-3 py-1.5 text-[10px] uppercase text-[#a39482] border-b border-[#2e2319]">
                    Select Deployment Roster
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {rosters.map(r => (
                      <button
                        key={r.id}
                        onClick={() => {
                          onSelectRoster(r);
                          setIsRosterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#241710] transition ${
                          activeRoster?.id === r.id ? 'text-[#d49e54] bg-[#1c120c] font-bold' : 'text-[#f4efe6]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate font-serif">{r.name}</div>
                          <div className="text-[10px] text-[#a39482]">{r.totalPoints} pts • {r.units.length} units</div>
                        </div>
                        {activeRoster?.id === r.id && <Check className="w-4 h-4 text-[#d49e54] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate('builder')}
              className="px-3 py-2 rounded-xl bg-[#1c140e] border border-[#3e2e21] hover:border-amber-500 text-xs font-mono text-[#a39482] hover:text-white transition cursor-pointer"
            >
              Army Builder ⚙
            </button>
          </div>
        </div>
      </div>

      {/* 3. Live Radar / Searching Banner (If in Queue or Matched) */}
      {queueState !== 'idle' && (
        <div className="bg-[#110e16] border-2 border-[#9a281e] rounded-2xl p-6 shadow-[0_0_50px_rgba(154,40,30,0.4)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute -inset-[50%] bg-[radial-gradient(circle_at_center,rgba(201,74,41,0.25)_0%,transparent_70%)] animate-pulse" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            
            {/* Radar Animation Graphic */}
            <div className="flex items-center space-x-6">
              <div className="relative w-32 h-32 rounded-full border border-[#c94a29]/40 bg-black/60 flex items-center justify-center shadow-[inset_0_0_25px_rgba(201,74,41,0.3)] shrink-0">
                <div className="absolute w-24 h-24 rounded-full border border-[#c94a29]/25" />
                <div className="absolute w-16 h-16 rounded-full border border-[#c94a29]/30" />
                <div className="absolute w-8 h-8 rounded-full border border-[#c94a29]/40" />
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-[1px] bg-[#c94a29]/30" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-full w-[1px] bg-[#c94a29]/30" />
                </div>

                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(201,74,41,0.5)_90deg,transparent_90deg)] animate-[spin_3s_linear_infinite]" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#e05330] shadow-[0_0_15px_rgba(224,83,48,0.9)] animate-ping" />
              </div>

              {/* Status Text & Timer */}
              <div>
                {queueState === 'searching' ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider animate-pulse">
                      <Radio className="w-4 h-4 animate-spin text-[#c94a29]" />
                      <span>
                        SEARCHING FOR OPPONENTS [{searchMode.toUpperCase()}]...
                      </span>
                    </div>
                    <div className="text-4xl font-black font-mono text-white tracking-widest">
                      {formatTime(searchTime)}
                    </div>
                    <p className="text-xs text-[#a39482] font-mono">
                      Engaging Arena: <span className="text-[#d49e54] font-bold">{activeQueueMap?.name || 'Crimson Foundry'}</span> • Region Relay Active
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>CHALLENGERS INTERCEPTED</span>
                    </div>
                    <div className="text-3xl font-black font-serif text-white uppercase tracking-wide">
                      COMBAT GROUP ASSEMBLED!
                    </div>
                    <p className="text-xs text-[#d49e54] font-mono">
                      Deploying to <span className="text-white font-bold">{activeQueueMap?.name}</span> in <span className="font-bold text-lg text-white">{countdown}s</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Matched Commanders Slot List */}
            <div className="flex flex-wrap items-center gap-2.5">
              {queueState === 'matched' && matchedCommanders.length > 0 ? (
                matchedCommanders.map((cmd) => (
                  <div 
                    key={cmd.id}
                    className={`border rounded-xl p-3 flex items-center space-x-3 shadow-lg animate-in zoom-in-95 ${
                      cmd.isUser 
                        ? 'bg-amber-950/40 border-amber-500/80' 
                        : 'bg-[#1c140e] border-[#4a3522]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-[#3e2e21] flex items-center justify-center text-xl">
                      {cmd.avatar}
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider font-bold block" style={{ color: cmd.color || '#d49e54' }}>
                        {cmd.roleOrTeam || 'COMMANDER'}
                      </span>
                      <h5 className="font-bold text-xs font-serif text-white">{cmd.name}</h5>
                      <span className="text-[10px] font-mono text-[#a39482] block truncate max-w-[140px]">
                        {cmd.faction}
                      </span>
                    </div>
                  </div>
                ))
              ) : queueState === 'searching' ? (
                <button
                  onClick={handleCancelQueue}
                  className="px-5 py-2.5 bg-[#1f1510] hover:bg-[#2b1b14] border border-[#4a3522] hover:border-rose-500 text-rose-300 font-mono text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel Search</span>
                </button>
              ) : null}
            </div>

          </div>

          {errorMsg && (
            <div className="mt-3 p-3 bg-rose-950/80 border border-rose-600 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Sub-Navigation Tabs & Mode Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2e2319] pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSubTab('modes')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition ${
              subTab === 'modes'
                ? 'bg-[#1c140e] text-[#d49e54] border border-[#4a3522] font-bold shadow'
                : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#140e0a]'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Combat Modes &amp; Arenas</span>
          </button>

          <button
            onClick={() => setSubTab('leaderboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition ${
              subTab === 'leaderboard'
                ? 'bg-[#1c140e] text-[#d49e54] border border-[#4a3522] font-bold shadow'
                : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#140e0a]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Convergence Leaderboard</span>
          </button>

          <button
            onClick={() => setSubTab('history')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition ${
              subTab === 'history'
                ? 'bg-[#1c140e] text-[#d49e54] border border-[#4a3522] font-bold shadow'
                : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#140e0a]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Skirmish History</span>
          </button>
        </div>

        {/* Filter Pills for Combat Modes */}
        {subTab === 'modes' && (
          <div className="flex items-center flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All Modes' },
              { id: '1v1', label: '1v1 Duels' },
              { id: '2v2', label: '2v2 Teams' },
              { id: '3way', label: '3-Way Tri-Clash' },
              { id: '4ffa', label: '4-Player FFA' },
              { id: 'tournaments', label: '🏆 Tournaments' },
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setModeFilter(pill.id as ModeCategory)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition cursor-pointer ${
                  modeFilter === pill.id
                    ? 'bg-[#d49e54] text-black font-black shadow-md'
                    : 'bg-[#140e0a] text-[#a39482] hover:text-white border border-[#2e2319]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. TAB 1: COMBAT MODES GRID */}
      {subTab === 'modes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          
          {/* MODE 1: RANKED 1v1 LADDER */}
          {(modeFilter === 'all' || modeFilter === '1v1') && (
            <div className="bg-[#120d09] border border-[#2e2319] hover:border-[#c94a29]/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group transition">
              <div className="absolute top-0 right-0 w-28 h-28 bg-[#9a281e]/15 rounded-bl-full pointer-events-none group-hover:scale-110 transition duration-300" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#9a281e] to-[#c94a29] flex items-center justify-center text-white shadow-md">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                    1v1 COMPETITIVE
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-serif text-white tracking-wide">
                    Ranked 1v1 Duel
                  </h3>
                  <p className="text-xs text-[#a39482] font-mono leading-relaxed mt-1">
                    High-stakes tactical ladder. Matched against commanders of equal MMR. Win to climb the Vanguard tier and claim seasonal relics.
                  </p>
                </div>

                {/* Recommended Map Badge */}
                <div className="bg-[#1c140e] border border-[#3e2e21] rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[9px] font-mono text-[#a39482] uppercase block">Engineered Arena</span>
                      <span className="text-xs font-bold text-white truncate block">Crimson Foundry Basin</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewMap(getMapById('map_crimson_foundry'))}
                    className="p-1.5 text-xs text-[#d49e54] hover:text-white bg-black/40 rounded-lg border border-[#3e2e21] hover:border-[#d49e54] transition"
                    title="Inspect Map Specs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-black/50 border border-[#2e2319] rounded-xl p-2.5 text-[11px] font-mono text-[#d49e54] space-y-1">
                  <div className="flex justify-between">
                    <span>Rating Stakes:</span>
                    <span className="font-bold text-white">±25 MMR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Turn Clock:</span>
                    <span className="font-bold text-white">90s Dynamic</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartMatchmaking('ranked', 'map_crimson_foundry')}
                disabled={queueState !== 'idle'}
                className="w-full py-3 bg-gradient-to-r from-[#9a281e] via-[#c94a29] to-[#9a281e] hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(201,74,41,0.5)] border border-[#e07b53]/60 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                <span>Enter 1v1 Queue</span>
              </button>
            </div>
          )}

          {/* MODE 2: 2v2 ALLIED FRONT (TEAM BATTLE) */}
          {(modeFilter === 'all' || modeFilter === '2v2') && (
            <div className="bg-[#120d09] border border-[#2e2319] hover:border-emerald-500/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group transition">
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition duration-300" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-800 to-teal-600 flex items-center justify-center text-white shadow-md">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                    2v2 ALLIED DUO (4 PLAYERS)
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-serif text-white tracking-wide">
                    2v2 Allied Front
                  </h3>
                  <p className="text-xs text-[#a39482] font-mono leading-relaxed mt-1">
                    Coordinate tactical formations with an allied commander. Share command points, control the central causeway, and flank the enemy bastions.
                  </p>
                </div>

                {/* Recommended Map Badge */}
                <div className="bg-[#1c140e] border border-[#3e2e21] rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[9px] font-mono text-[#a39482] uppercase block">Engineered Arena (1600x1000)</span>
                      <span className="text-xs font-bold text-white truncate block">Twin Bastions of Convergence</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewMap(getMapById('map_convergance_coliseum_2v2'))}
                    className="p-1.5 text-xs text-emerald-400 hover:text-white bg-black/40 rounded-lg border border-[#3e2e21] hover:border-emerald-500 transition"
                    title="Inspect Map Specs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-black/50 border border-[#2e2319] rounded-xl p-2.5 text-[11px] font-mono text-emerald-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Team Setup:</span>
                    <span className="font-bold text-white">Team Alpha vs Team Omega</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Key Objective:</span>
                    <span className="font-bold text-white">Central Span (15 VP)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartMatchmaking('2v2', 'map_convergance_coliseum_2v2')}
                disabled={queueState !== 'idle'}
                className="w-full py-3 bg-gradient-to-r from-emerald-800 to-teal-700 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500/60 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Find 2v2 Team Match</span>
              </button>
            </div>
          )}

          {/* MODE 3: 3-WAY TRI-CLASH (RADIAL BATTLE ROYALE) */}
          {(modeFilter === 'all' || modeFilter === '3way') && (
            <div className="bg-[#120d09] border border-[#2e2319] hover:border-orange-500/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group transition">
              <div className="absolute top-0 right-0 w-28 h-28 bg-orange-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition duration-300" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-800 to-amber-600 flex items-center justify-center text-white shadow-md">
                    <Flame className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-950 text-orange-300 border border-orange-800 font-bold">
                    3-WAY RADIAL (3 PLAYERS)
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-serif text-white tracking-wide">
                    3-Way Tri-Clash
                  </h3>
                  <p className="text-xs text-[#a39482] font-mono leading-relaxed mt-1">
                    Three-corner tactical storm. Deployed in a 120° equilateral triad. Fight simultaneously across two flanks while vying for the Crown Spire.
                  </p>
                </div>

                {/* Recommended Map Badge */}
                <div className="bg-[#1c140e] border border-[#3e2e21] rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[9px] font-mono text-[#a39482] uppercase block">Engineered Arena (1400x1200)</span>
                      <span className="text-xs font-bold text-white truncate block">Trinity Spire Crater</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewMap(getMapById('map_trinity_spire_3way'))}
                    className="p-1.5 text-xs text-orange-400 hover:text-white bg-black/40 rounded-lg border border-[#3e2e21] hover:border-orange-500 transition"
                    title="Inspect Map Specs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-black/50 border border-[#2e2319] rounded-xl p-2.5 text-[11px] font-mono text-orange-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Deployments:</span>
                    <span className="font-bold text-white">Zenith • Obsidian • Cinder</span>
                  </div>
                  <div className="flex justify-between">
                    <span>King of the Hill:</span>
                    <span className="font-bold text-white">Crown Spire (20 VP)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartMatchmaking('3way', 'map_trinity_spire_3way')}
                disabled={queueState !== 'idle'}
                className="w-full py-3 bg-gradient-to-r from-orange-800 to-amber-700 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-500/60 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                <span>Enter 3-Way Tri-Clash</span>
              </button>
            </div>
          )}

          {/* MODE 4: 4-PLAYER FREE-FOR-ALL (QUADRANT DEATHMATCH) */}
          {(modeFilter === 'all' || modeFilter === '4ffa') && (
            <div className="bg-[#120d09] border border-[#2e2319] hover:border-purple-500/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group transition">
              <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition duration-300" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-800 to-indigo-600 flex items-center justify-center text-white shadow-md">
                    <Crown className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                    4-PLAYER QUADRANT (4 PLAYERS)
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-serif text-white tracking-wide">
                    4-Player Free-For-All
                  </h3>
                  <p className="text-xs text-[#a39482] font-mono leading-relaxed mt-1">
                    Chaotic 4-way battle royale. Four commanders spawn in separate corner redoubts. Eliminate rivals and seize the central convergence monument.
                  </p>
                </div>

                {/* Recommended Map Badge */}
                <div className="bg-[#1c140e] border border-[#3e2e21] rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[9px] font-mono text-[#a39482] uppercase block">Engineered Arena (1400x1400)</span>
                      <span className="text-xs font-bold text-white truncate block">Ashen Crossroads</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewMap(getMapById('map_quadrant_ruins_4ffa'))}
                    className="p-1.5 text-xs text-purple-400 hover:text-white bg-black/40 rounded-lg border border-[#3e2e21] hover:border-purple-500 transition"
                    title="Inspect Map Specs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-black/50 border border-[#2e2319] rounded-xl p-2.5 text-[11px] font-mono text-purple-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Layout:</span>
                    <span className="font-bold text-white">4 Corner Strongholds</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nexus Objective:</span>
                    <span className="font-bold text-white">Central Relic (20 VP)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartMatchmaking('4ffa', 'map_quadrant_ruins_4ffa')}
                disabled={queueState !== 'idle'}
                className="w-full py-3 bg-gradient-to-r from-purple-800 to-indigo-700 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] border border-purple-500/60 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                <span>Enter 4-Player FFA</span>
              </button>
            </div>
          )}

          {/* TOURNAMENT 1: SOLO APEX CHAMPIONSHIP */}
          {(modeFilter === 'all' || modeFilter === 'tournaments') && (
            <div className="bg-[#120d09] border border-amber-500/50 hover:border-amber-400 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group transition">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/15 rounded-bl-full pointer-events-none group-hover:scale-110 transition duration-300" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-black font-black shadow-md">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500 font-bold">
                    8-PLAYER SOLO BRACKET
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-serif text-white tracking-wide">
                    Solo Apex Championship
                  </h3>
                  <p className="text-xs text-[#a39482] font-mono leading-relaxed mt-1">
                    Single elimination 8-commander tournament. Battle through Quarterfinals, Semifinals, and the Grand Apex Final to win the Championship Relic.
                  </p>
                </div>

                {/* Recommended Map Badge */}
                <div className="bg-[#1c140e] border border-[#3e2e21] rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[9px] font-mono text-[#a39482] uppercase block">Engineered Stadium (1200x800)</span>
                      <span className="text-xs font-bold text-white truncate block">Grand Apex Coliseum</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewMap(getMapById('map_apex_championship_stadium'))}
                    className="p-1.5 text-xs text-amber-400 hover:text-white bg-black/40 rounded-lg border border-[#3e2e21] hover:border-amber-500 transition"
                    title="Inspect Map Specs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-black/50 border border-[#2e2319] rounded-xl p-2.5 text-[11px] font-mono text-amber-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Prize Pool:</span>
                    <span className="font-bold text-white">2,500 Gold + Grand Relic</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bracket Structure:</span>
                    <span className="font-bold text-white">3 Rounds Knockout</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setTournamentModalType('solo')}
                  className="flex-1 py-3 bg-[#1f1510] hover:bg-[#2b1b14] border border-[#4a3522] hover:border-amber-400 text-amber-400 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  View Bracket
                </button>
                <button
                  onClick={() => handleStartMatchmaking('tournament_solo', 'map_apex_championship_stadium')}
                  disabled={queueState !== 'idle'}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:brightness-110 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-amber-400 transition cursor-pointer"
                >
                  Enter Cup
                </button>
              </div>
            </div>
          )}

          {/* TOURNAMENT 2: 2v2 DUO WORLD CUP */}
          {(modeFilter === 'all' || modeFilter === 'tournaments') && (
            <div className="bg-[#120d09] border border-sky-500/50 hover:border-sky-400 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group transition">
              <div className="absolute top-0 right-0 w-28 h-28 bg-sky-500/15 rounded-bl-full pointer-events-none group-hover:scale-110 transition duration-300" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-700 to-blue-500 flex items-center justify-center text-white shadow-md">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-500 font-bold">
                    8-TEAM 2v2 BRACKET
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-serif text-white tracking-wide">
                    2v2 Duo World Cup
                  </h3>
                  <p className="text-xs text-[#a39482] font-mono leading-relaxed mt-1">
                    Eight dynamic partner duos clash for supremacy. Team synergy, coordinated charges, and synchronized command traits win the crown.
                  </p>
                </div>

                {/* Recommended Map Badge */}
                <div className="bg-[#1c140e] border border-[#3e2e21] rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[9px] font-mono text-[#a39482] uppercase block">Engineered Stadium</span>
                      <span className="text-xs font-bold text-white truncate block">Grand Apex Coliseum (Duo)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewMap(getMapById('map_apex_championship_stadium'))}
                    className="p-1.5 text-xs text-sky-400 hover:text-white bg-black/40 rounded-lg border border-[#3e2e21] hover:border-sky-500 transition"
                    title="Inspect Map Specs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-black/50 border border-[#2e2319] rounded-xl p-2.5 text-[11px] font-mono text-sky-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Prize Pool:</span>
                    <span className="font-bold text-white">5,000 Gold + Duo Wings</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Teams:</span>
                    <span className="font-bold text-white">8 Duos (16 Players)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setTournamentModalType('2v2')}
                  className="flex-1 py-3 bg-[#1f1510] hover:bg-[#2b1b14] border border-[#4a3522] hover:border-sky-400 text-sky-400 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  View Bracket
                </button>
                <button
                  onClick={() => handleStartMatchmaking('tournament_2v2', 'map_apex_championship_stadium')}
                  disabled={queueState !== 'idle'}
                  className="flex-1 py-3 bg-gradient-to-r from-sky-700 to-blue-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.3)] border border-sky-400 transition cursor-pointer"
                >
                  Enter Duo Cup
                </button>
              </div>
            </div>
          )}

          {/* TOURNAMENT 3: GUILD ALLIANCE WAR (TEAM TOURNAMENT) */}
          {(modeFilter === 'all' || modeFilter === 'tournaments') && (
            <div className="bg-[#120d09] border border-rose-500/50 hover:border-rose-400 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group transition">
              <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/15 rounded-bl-full pointer-events-none group-hover:scale-110 transition duration-300" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-700 to-red-600 flex items-center justify-center text-white shadow-md">
                    <Flag className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500 font-bold">
                    GUILD WAR TOURNAMENT
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-serif text-white tracking-wide">
                    Guild Alliance War
                  </h3>
                  <p className="text-xs text-[#a39482] font-mono leading-relaxed mt-1">
                    Guild vs Guild clan championship. Deploy your highest-ranking roster to earn massive Guild XP, unlock citadel relics, and rank on the Guild Leaderboard.
                  </p>
                </div>

                {/* Recommended Map Badge */}
                <div className="bg-[#1c140e] border border-[#3e2e21] rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[9px] font-mono text-[#a39482] uppercase block">Engineered Stadium</span>
                      <span className="text-xs font-bold text-white truncate block">Grand Apex Coliseum (Guild)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewMap(getMapById('map_apex_championship_stadium'))}
                    className="p-1.5 text-xs text-rose-400 hover:text-white bg-black/40 rounded-lg border border-[#3e2e21] hover:border-rose-500 transition"
                    title="Inspect Map Specs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-black/50 border border-[#2e2319] rounded-xl p-2.5 text-[11px] font-mono text-rose-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Guild Vault Reward:</span>
                    <span className="font-bold text-white">10,000 XP + War Banner</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span className="font-bold text-white">8 Guild Champions</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setTournamentModalType('guild')}
                  className="flex-1 py-3 bg-[#1f1510] hover:bg-[#2b1b14] border border-[#4a3522] hover:border-rose-400 text-rose-400 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  View Bracket
                </button>
                <button
                  onClick={() => handleStartMatchmaking('tournament_guild', 'map_apex_championship_stadium')}
                  disabled={queueState !== 'idle'}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-700 to-red-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.3)] border border-rose-400 transition cursor-pointer"
                >
                  Guild Deploy
                </button>
              </div>
            </div>
          )}

          {/* MODE: QUICK CASUAL SKIRMISH */}
          {(modeFilter === 'all' || modeFilter === '1v1') && (
            <div className="bg-[#120d09] border border-[#2e2319] hover:border-amber-500/70 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center text-white shadow-md">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1f1510] text-[#d49e54] border border-[#4a3522] font-bold">
                    UNRANKED SKIRMISH
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-serif text-white tracking-wide">
                    Quick Skirmish
                  </h3>
                  <p className="text-xs text-[#a39482] font-mono leading-relaxed mt-1">
                    Fast unranked match against any available commander in the region. Test experimental unit synergies and firing deck tactics.
                  </p>
                </div>

                <div className="bg-[#1c140e] border border-[#3e2e21] rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[9px] font-mono text-[#a39482] uppercase block">Verdant Arena</span>
                      <span className="text-xs font-bold text-white truncate block">Astraea Sunken Mire</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewMap(getMapById('map_astraea_mire'))}
                    className="p-1.5 text-xs text-emerald-400 hover:text-white bg-black/40 rounded-lg border border-[#3e2e21] hover:border-emerald-500 transition"
                    title="Inspect Map Specs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleStartMatchmaking('casual', 'map_astraea_mire')}
                disabled={queueState !== 'idle'}
                className="w-full py-3 bg-[#1f1510] hover:bg-[#2b1b14] hover:text-white border border-[#4a3522] hover:border-amber-400/80 disabled:opacity-50 text-[#d49e54] font-bold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Find Casual Skirmish</span>
              </button>
            </div>
          )}

          {/* MODE: SOLO AI SPARRING */}
          {modeFilter === 'all' && (
            <div className="bg-[#120d09] border border-[#2e2319] hover:border-sky-500/70 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-800 to-sky-600 flex items-center justify-center text-white shadow-md">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                    OFFLINE READY
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-serif text-white tracking-wide">
                    Solo AI Practice
                  </h3>
                  <p className="text-xs text-[#a39482] font-mono leading-relaxed mt-1">
                    Immediate skirmish against intelligent tactical bots without queue delay. Master transport capacity, firing decks, and charge phases.
                  </p>
                </div>

                {/* Difficulty Selection */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-[#a39482] uppercase">AI Difficulty</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['recruit', 'veteran', 'apex'] as const).map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setAiDifficulty(lvl)}
                        className={`py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition ${
                          aiDifficulty === lvl
                            ? 'bg-sky-950 border border-sky-400 text-sky-200 font-bold'
                            : 'bg-black/60 border border-[#2e2319] text-[#a39482] hover:text-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLaunchAiBattle}
                className="w-full py-3 bg-gradient-to-r from-sky-900 to-blue-800 hover:brightness-110 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.3)] border border-sky-500/50 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Launch AI Skirmish</span>
              </button>
            </div>
          )}

          {/* MODE: CUSTOM DUEL ROOM */}
          {modeFilter === 'all' && (
            <div className="bg-[#120d09] border border-[#2e2319] hover:border-purple-500/70 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden group transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-800 to-purple-600 flex items-center justify-center text-white shadow-md">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                    DIRECT PEER
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-serif text-white tracking-wide">
                    Custom Duel Room
                  </h3>
                  <p className="text-xs text-[#a39482] font-mono leading-relaxed mt-1">
                    Generate a private room code or enter an invitation key to duel a specific commander with custom battlefield rules.
                  </p>
                </div>

                {/* Room Code & Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-black/60 border border-[#2e2319] rounded-xl px-3 py-2 text-xs font-mono">
                    <span className="text-[#a39482]">Your Code:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-purple-300">{customRoomCode}</span>
                      <button
                        onClick={handleCopyRoomCode}
                        className="p-1 text-[#a39482] hover:text-white transition"
                        title="Copy Code"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      placeholder="ENTER ROOM CODE"
                      value={customInputCode}
                      onChange={(e) => setCustomInputCode(e.target.value.toUpperCase())}
                      className="w-full bg-black/60 border border-[#2e2319] focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder:text-[#593d28] outline-none"
                    />
                    <button
                      onClick={handleJoinCustomRoom}
                      className="px-3 py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-600 text-purple-200 text-xs font-mono font-bold rounded-xl transition cursor-pointer shrink-0"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setCustomRoomCode('VALE-' + Math.floor(1000 + Math.random() * 9000));
                  const coliseumMap = getMapById('map_apex_championship_stadium');
                  triggerMultiMatchFound([
                    { id: user.id, name: user.displayName || 'You', faction: activeRoster?.factionName || 'Faction', rating: 1480, avatar: '👑', isUser: true, roleOrTeam: 'Host' },
                    { id: 'c_guest', name: 'Challenger (Custom Lobby)', faction: 'Shadows of Dusk', rating: 1500, avatar: '🗝️', roleOrTeam: 'Guest' }
                  ], coliseumMap);
                }}
                className="w-full py-3 bg-[#1a1220] hover:bg-[#251830] border border-purple-800/80 text-purple-300 font-bold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center space-x-2"
              >
                <Users className="w-4 h-4" />
                <span>Host Custom Match</span>
              </button>
            </div>
          )}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: INTERACTIVE MAP BLUEPRINT PREVIEW MODAL                          */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {previewMap && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#140e0a] border-2 border-[#d49e54]/70 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-[#2e2319] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#d49e54]">
                    TACTICAL MAP BLUEPRINT
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700 font-mono font-bold">
                    {previewMap.theme}
                  </span>
                </div>
                <h3 className="text-2xl font-black font-serif text-white">{previewMap.name}</h3>
                <p className="text-xs text-[#a39482] font-mono mt-0.5">
                  Dimensions: <span className="text-white font-bold">{previewMap.width} × {previewMap.height} px</span> • Max Players: <span className="text-amber-400 font-bold">{previewMap.maxPlayers || 2}</span>
                </p>
              </div>
              <button
                onClick={() => setPreviewMap(null)}
                className="p-1.5 text-[#a39482] hover:text-white bg-black/40 border border-[#3e2e21] rounded-xl hover:border-rose-500 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SVG Schematic Minimap */}
            <div className="relative w-full aspect-[16/10] bg-[#07090e] border border-[#3e2e21] rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              <svg 
                viewBox={`0 0 ${previewMap.width} ${previewMap.height}`}
                className="w-full h-full"
              >
                {/* Background Grid Pattern */}
                <defs>
                  <pattern id="modal-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#221810" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#modal-grid)" />

                {/* Deployment Zones */}
                {previewMap.deploymentZones.player1 && (
                  <g>
                    <rect
                      x={previewMap.deploymentZones.player1.minX}
                      y={previewMap.deploymentZones.player1.minY}
                      width={previewMap.deploymentZones.player1.maxX - previewMap.deploymentZones.player1.minX}
                      height={previewMap.deploymentZones.player1.maxY - previewMap.deploymentZones.player1.minY}
                      fill="rgba(244, 63, 94, 0.18)"
                      stroke="#f43f5e"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={previewMap.deploymentZones.player1.minX + 15}
                      y={previewMap.deploymentZones.player1.minY + 25}
                      fill="#fda4af"
                      fontSize="14"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {previewMap.deploymentZones.player1.label || 'Player 1 Zone'}
                    </text>
                  </g>
                )}

                {previewMap.deploymentZones.player2 && (
                  <g>
                    <rect
                      x={previewMap.deploymentZones.player2.minX}
                      y={previewMap.deploymentZones.player2.minY}
                      width={previewMap.deploymentZones.player2.maxX - previewMap.deploymentZones.player2.minX}
                      height={previewMap.deploymentZones.player2.maxY - previewMap.deploymentZones.player2.minY}
                      fill="rgba(14, 165, 233, 0.18)"
                      stroke="#0ea5e9"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={previewMap.deploymentZones.player2.minX + 15}
                      y={previewMap.deploymentZones.player2.minY + 25}
                      fill="#7dd3fc"
                      fontSize="14"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {previewMap.deploymentZones.player2.label || 'Player 2 Zone'}
                    </text>
                  </g>
                )}

                {previewMap.deploymentZones.player3 && (
                  <g>
                    <rect
                      x={previewMap.deploymentZones.player3.minX}
                      y={previewMap.deploymentZones.player3.minY}
                      width={previewMap.deploymentZones.player3.maxX - previewMap.deploymentZones.player3.minX}
                      height={previewMap.deploymentZones.player3.maxY - previewMap.deploymentZones.player3.minY}
                      fill="rgba(16, 185, 129, 0.18)"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={previewMap.deploymentZones.player3.minX + 15}
                      y={previewMap.deploymentZones.player3.minY + 25}
                      fill="#6ee7b7"
                      fontSize="14"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {previewMap.deploymentZones.player3.label || 'Player 3 Zone'}
                    </text>
                  </g>
                )}

                {previewMap.deploymentZones.player4 && (
                  <g>
                    <rect
                      x={previewMap.deploymentZones.player4.minX}
                      y={previewMap.deploymentZones.player4.minY}
                      width={previewMap.deploymentZones.player4.maxX - previewMap.deploymentZones.player4.minX}
                      height={previewMap.deploymentZones.player4.maxY - previewMap.deploymentZones.player4.minY}
                      fill="rgba(245, 158, 11, 0.18)"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={previewMap.deploymentZones.player4.minX + 15}
                      y={previewMap.deploymentZones.player4.minY + 25}
                      fill="#fde68a"
                      fontSize="14"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {previewMap.deploymentZones.player4.label || 'Player 4 Zone'}
                    </text>
                  </g>
                )}

                {/* Terrain Features */}
                {previewMap.terrain?.map(t => (
                  <g key={t.id}>
                    <rect
                      x={t.x}
                      y={t.y}
                      width={t.width}
                      height={t.height}
                      fill={t.color || '#475569'}
                      opacity="0.6"
                      rx="4"
                    />
                    <text
                      x={t.x + t.width / 2}
                      y={t.y + t.height / 2 + 4}
                      fill="#ffffff"
                      fontSize="10"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {t.type}
                    </text>
                  </g>
                ))}

                {/* Objectives */}
                {previewMap.objectives?.map(obj => (
                  <g key={obj.id}>
                    <circle
                      cx={obj.x}
                      cy={obj.y}
                      r={obj.radius}
                      fill="rgba(212, 158, 84, 0.2)"
                      stroke="#d49e54"
                      strokeWidth="2"
                    />
                    <circle
                      cx={obj.x}
                      cy={obj.y}
                      r="6"
                      fill="#d49e54"
                    />
                    <text
                      x={obj.x}
                      y={obj.y - obj.radius - 6}
                      fill="#fbbf24"
                      fontSize="12"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      ★ {obj.name} ({obj.pointsValue} VP)
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <p className="text-xs text-[#a39482] font-mono leading-relaxed">
              {previewMap.description}
            </p>

            <div className="flex items-center justify-between border-t border-[#2e2319] pt-4">
              <span className="text-xs font-mono text-[#d49e54]">
                Objectives: <span className="text-white font-bold">{previewMap.objectives.length} Strategic Points</span>
              </span>
              <button
                onClick={() => {
                  const mapId = previewMap.id;
                  setPreviewMap(null);
                  const modeToQueue = previewMap.recommendedMode === '2v2' ? '2v2' : previewMap.recommendedMode === '3way' ? '3way' : previewMap.recommendedMode === '4ffa' ? '4ffa' : 'ranked';
                  handleStartMatchmaking(modeToQueue, mapId);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-[#9a281e] to-[#c94a29] hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Deploy in this Arena
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: TOURNAMENT BRACKET MODAL                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {tournamentModalType && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#140e0a] border-2 border-amber-500/80 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-[#2e2319] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                    CONVERGENCE CHAMPIONSHIP BRACKET
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500 font-mono font-bold">
                    SEASON 1 FINALS
                  </span>
                </div>
                <h3 className="text-2xl font-black font-serif text-white">
                  {tournamentModalType === 'solo' 
                    ? 'Solo Apex Championship (8 Commanders)' 
                    : tournamentModalType === '2v2' 
                    ? '2v2 Duo World Cup (8 Teams / 16 Commanders)' 
                    : 'Guild Alliance War (8 Guild Syndicates)'}
                </h3>
                <p className="text-xs text-[#a39482] font-mono mt-0.5">
                  Single Elimination Knockout • Map: <span className="text-[#d49e54] font-bold">Grand Apex Coliseum</span>
                </p>
              </div>
              <button
                onClick={() => setTournamentModalType(null)}
                className="p-1.5 text-[#a39482] hover:text-white bg-black/40 border border-[#3e2e21] rounded-xl hover:border-rose-500 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 8-Team Bracket Graphic */}
            <div className="grid grid-cols-3 gap-4 font-mono text-xs">
              {/* Round 1: Quarterfinals */}
              <div className="space-y-3">
                <div className="text-[10px] uppercase text-[#a39482] font-bold border-b border-[#2e2319] pb-1">
                  Quarterfinals (Round 1)
                </div>
                {[
                  { match: 'QF 1', p1: 'Grand Warmaster Vane', p2: 'Iron-Juggernaut Brak', score: '42 - 18', winner: 1 },
                  { match: 'QF 2', p1: 'Warmaster Cynthia', p2: 'Arch-Magus Vorrak', score: '38 - 35', winner: 1 },
                  { match: 'QF 3', p1: 'High Justiciar Althea', p2: 'Shadowblade Lyra', score: '45 - 20', winner: 1 },
                  { match: 'QF 4', p1: user.displayName || 'You (Commander)', p2: 'Void-Caller Malakor', score: 'Awaiting', isUserMatch: true }
                ].map((m, idx) => (
                  <div key={idx} className={`p-2.5 rounded-xl border ${m.isUserMatch ? 'bg-amber-950/40 border-amber-500 shadow-md' : 'bg-[#1c140e] border-[#3e2e21]'}`}>
                    <div className="flex justify-between text-[9px] text-[#a39482] mb-1">
                      <span>{m.match}</span>
                      <span className={m.isUserMatch ? 'text-amber-400 font-bold' : 'text-emerald-400'}>{m.score}</span>
                    </div>
                    <div className={`text-[11px] truncate ${m.winner === 1 ? 'font-bold text-white' : 'text-[#a39482]'}`}>
                      1. {m.p1}
                    </div>
                    <div className={`text-[11px] truncate ${m.winner === 2 ? 'font-bold text-white' : 'text-[#a39482]'}`}>
                      2. {m.p2}
                    </div>
                  </div>
                ))}
              </div>

              {/* Round 2: Semifinals */}
              <div className="space-y-3 flex flex-col justify-around">
                <div className="text-[10px] uppercase text-[#a39482] font-bold border-b border-[#2e2319] pb-1">
                  Semifinals (Round 2)
                </div>
                <div className="p-3 rounded-xl bg-[#1c140e] border border-[#3e2e21] space-y-1">
                  <div className="flex justify-between text-[9px] text-[#a39482]">
                    <span>SF 1</span>
                    <span className="text-amber-400 font-bold">READY</span>
                  </div>
                  <div className="font-bold text-white text-[11px]">Grand Warmaster Vane</div>
                  <div className="text-[#a39482] text-[11px]">Warmaster Cynthia</div>
                </div>

                <div className="p-3 rounded-xl bg-[#1c140e] border border-[#3e2e21] space-y-1">
                  <div className="flex justify-between text-[9px] text-[#a39482]">
                    <span>SF 2</span>
                    <span className="text-amber-400 font-bold">AWAITING QF 4</span>
                  </div>
                  <div className="font-bold text-white text-[11px]">High Justiciar Althea</div>
                  <div className="text-amber-300 text-[11px]">Winner of QF 4 (You)</div>
                </div>
              </div>

              {/* Round 3: Championship Final */}
              <div className="space-y-3 flex flex-col justify-center">
                <div className="text-[10px] uppercase text-amber-400 font-bold border-b border-amber-900 pb-1 flex items-center space-x-1">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Grand Apex Final</span>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-b from-[#241710] to-[#140e0a] border-2 border-amber-500 shadow-xl space-y-2 text-center">
                  <div className="text-2xl">🏆</div>
                  <h5 className="font-bold font-serif text-white text-sm">Championship Trophy Dais</h5>
                  <p className="text-[10px] text-[#a39482]">
                    Winner takes 2,500 Gold &amp; Grand Apex Crest
                  </p>
                  <div className="pt-2 text-[11px] font-mono text-amber-300 font-bold">
                    Awaiting Finalists
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#2e2319] pt-4">
              <div className="text-xs font-mono text-[#a39482]">
                Registered: <span className="text-amber-400 font-bold">7 / 8 Contestants</span> • Seat #8 Reserved for You
              </div>
              <button
                onClick={() => {
                  const targetType = tournamentModalType;
                  setTournamentModalType(null);
                  const queueMode = targetType === '2v2' ? 'tournament_2v2' : targetType === 'guild' ? 'tournament_guild' : 'tournament_solo';
                  handleStartMatchmaking(queueMode, 'map_apex_championship_stadium');
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer"
              >
                Register Roster &amp; Enter Tournament
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 6. TAB 2: CONVERGENCE LEADERBOARD */}
      {subTab === 'leaderboard' && (
        <div className="bg-[#120d09] border border-[#2e2319] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#2e2319] pb-3">
            <div>
              <h3 className="font-bold text-lg font-serif text-white uppercase">
                Season 1: Ashen Convergence Ladder
              </h3>
              <p className="text-xs text-[#a39482] font-mono">
                Top 10 High Marshals ranked by competitive MMR
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400">
              Season resets in 14 days
            </span>
          </div>

          <div className="space-y-2">
            {[
              { rank: 1, name: 'Grand Warmaster Vane', faction: 'The Crimson Empire', elo: 2180, winrate: '82%', icon: '🥇' },
              { rank: 2, name: 'High Justiciar Althea', faction: 'The Silver Vanguard', elo: 2095, winrate: '79%', icon: '🥈' },
              { rank: 3, name: 'Void-Caller Malakor', faction: 'The Shadow Weaver Cult', elo: 2040, winrate: '76%', icon: '🥉' },
              { rank: 4, name: 'Archon Ignatius', faction: 'The Ember Dominion', elo: 1980, winrate: '73%', icon: '4' },
              { rank: 5, name: 'Forge-Baron Kroll', faction: 'The Ironclad Legion', elo: 1945, winrate: '71%', icon: '5' },
              { rank: 6, name: 'Mistress of Whispers', faction: 'The Obsidian Enclave', elo: 1910, winrate: '69%', icon: '6' },
              { rank: 7, name: 'Brother Thaddeus', faction: 'The Silver Vanguard', elo: 1875, winrate: '68%', icon: '7' },
              { rank: 8, name: 'Commander Cynthia', faction: 'The Crimson Empire', elo: 1840, winrate: '66%', icon: '8' },
              { rank: 9, name: user.displayName || 'You (Commander)', faction: activeRoster?.factionName || 'Universal', elo: 1480, winrate: '70%', icon: '⚔️', isUser: true },
            ].map(entry => (
              <div
                key={entry.rank}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                  (entry as any).isUser
                    ? 'bg-amber-950/40 border-amber-500 shadow-md text-white'
                    : 'bg-black/50 border-[#2e2319] text-[#f4efe6]'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1c140e] border border-[#3e2e21] flex items-center justify-center font-mono font-black text-sm">
                    {entry.icon}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm font-serif">{entry.name}</h5>
                    <span className="text-[11px] font-mono text-[#a39482]">{entry.faction}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-6 font-mono text-xs">
                  <span className="text-emerald-400 font-bold">{entry.winrate} WR</span>
                  <span className="text-amber-400 font-black text-sm">{entry.elo} MMR</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. TAB 3: SKIRMISH HISTORY */}
      {subTab === 'history' && (
        <div className="bg-[#120d09] border border-[#2e2319] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-[#2e2319] pb-3">
            <h3 className="font-bold text-lg font-serif text-white uppercase">
              Recent Combat Operations
            </h3>
            <p className="text-xs text-[#a39482] font-mono">
              Last 5 encounters recorded by orbital telemetry
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              { id: 'm1', mode: 'Ranked 1v1', opponent: 'Arch-Magus Vorrak', faction: 'The Eldritch Coven', result: 'VICTORY', score: '38 - 14', eloChange: '+25', time: '2 hours ago' },
              { id: 'm2', mode: 'Ranked 1v1', opponent: 'Warmaster Cynthia', faction: 'The Silver Vanguard', result: 'VICTORY', score: '42 - 29', eloChange: '+22', time: '5 hours ago' },
              { id: 'm3', mode: 'Casual Skirmish', opponent: 'Iron-Juggernaut Brak', faction: 'The Ironclad Legion', result: 'DEFEAT', score: '18 - 35', eloChange: '0', time: 'Yesterday' },
              { id: 'm4', mode: 'Solo AI', opponent: 'Automaton Veteran', faction: 'Synthesized AI', result: 'VICTORY', score: '50 - 12', eloChange: '+10', time: '2 days ago' },
            ].map(h => (
              <div
                key={h.id}
                className="p-3.5 rounded-xl bg-black/50 border border-[#2e2319] flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-black ${
                    h.result === 'VICTORY'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {h.result}
                  </span>
                  <div>
                    <h5 className="font-bold text-xs font-serif text-white">
                      vs {h.opponent} <span className="text-[10px] font-mono text-[#a39482]">({h.faction})</span>
                    </h5>
                    <span className="text-[10px] font-mono text-[#a39482]">{h.mode} • {h.time}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-5 font-mono text-xs">
                  <span className="text-[#a39482]">{h.score} pts</span>
                  <span className={`font-bold ${h.eloChange.startsWith('+') ? 'text-emerald-400' : 'text-[#a39482]'}`}>
                    {h.eloChange} MMR
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
