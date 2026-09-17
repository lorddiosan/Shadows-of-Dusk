import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Trophy, Swords, Sparkles, Plus, 
  Search, Flag, Award, Calendar, Clock, ArrowRight, 
  Check, X, AlertCircle, LogOut, ChevronRight, MessageSquare,
  Crown, Star, Layers, Zap, Flame
} from 'lucide-react';
import { Guild, GuildEvent, GuildMember } from '../../types/guild';
import { UserProfile } from '../../types/user';
import { GuildService } from '../../services/guildService';
import { StorageService } from '../../services/storageService';

interface GuildPageProps {
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onNavigate?: (tab: 'home' | 'matchmaking' | 'play' | 'builder' | 'guilds' | 'shop' | 'battlepass' | 'lore' | 'profile' | 'admin') => void;
}

const CREST_PRESETS = ['🛡️', '⚔️', '👑', '🔮', '🩸', '⚙️', '🦅', '🐉', '💀', '🔥', '⚡', '✨'];

export const GuildPage: React.FC<GuildPageProps> = ({
  user,
  onUpdateUser,
  onNavigate
}) => {
  const [guilds, setGuilds] = useState<Guild[]>(() => GuildService.getGuilds());
  const [searchQuery, setSearchQuery] = useState('');
  const [focusFilter, setFocusFilter] = useState<'all' | 'competitive' | 'raids' | 'doctrine' | 'casual'>('all');
  
  // Guild Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createTag, setCreateTag] = useState('');
  const [createCrest, setCreateCrest] = useState('🛡️');
  const [createMotto, setCreateMotto] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createFocus, setCreateFocus] = useState<'competitive' | 'casual' | 'raids' | 'doctrine'>('competitive');
  const [createMinRating, setCreateMinRating] = useState<number>(1000);
  const [createError, setCreateError] = useState<string | null>(null);

  // Guild Hall Tab (for members)
  const [guildHallTab, setGuildHallTab] = useState<'events' | 'members' | 'activity' | 'perks'>('events');
  const [joinedEventIds, setJoinedEventIds] = useState<string[]>([]);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Find user's active guild
  const myGuild = guilds.find(g => g.id === user.guildId || g.members.some(m => m.id === user.id));

  // Sync guilds from storage
  const refreshGuilds = () => {
    setGuilds(GuildService.getGuilds());
  };

  const handleCreateGuild = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createName.trim() || !createTag.trim()) {
      setCreateError('Guild name and a 2-5 letter tag are required');
      return;
    }

    const res = GuildService.createGuild(
      {
        name: createName,
        tag: createTag,
        crest: createCrest,
        motto: createMotto,
        description: createDesc,
        focus: createFocus,
        minRating: createMinRating
      },
      user
    );

    if (res.error) {
      setCreateError(res.error);
      return;
    }

    // Update user's profile with new guild
    const updatedUser: UserProfile = {
      ...user,
      guildId: res.guild.id,
      guildTag: res.guild.tag,
      guildRole: 'leader'
    };
    onUpdateUser(updatedUser);
    StorageService.saveUserProfile(updatedUser);

    refreshGuilds();
    setShowCreateModal(false);
    setActionSuccessMsg(`Commissioned guild [${res.guild.tag}] ${res.guild.name}!`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleJoinGuild = (guild: Guild) => {
    const res = GuildService.joinGuild(guild.id, user);
    if (!res.success) {
      alert(res.error || 'Failed to join guild');
      return;
    }

    const updatedUser: UserProfile = {
      ...user,
      guildId: guild.id,
      guildTag: guild.tag,
      guildRole: 'member'
    };
    onUpdateUser(updatedUser);
    StorageService.saveUserProfile(updatedUser);

    refreshGuilds();
    setActionSuccessMsg(`Successfully joined [${guild.tag}] ${guild.name}!`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleLeaveGuild = () => {
    if (!myGuild) return;
    if (!window.confirm(`Are you sure you want to leave ${myGuild.name}?`)) return;

    GuildService.leaveGuild(myGuild.id, user.id);

    const updatedUser: UserProfile = {
      ...user,
      guildId: undefined,
      guildTag: undefined,
      guildRole: undefined
    };
    onUpdateUser(updatedUser);
    StorageService.saveUserProfile(updatedUser);

    refreshGuilds();
    setActionSuccessMsg('You have departed the guild.');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleRallyForEvent = (event: GuildEvent) => {
    if (joinedEventIds.includes(event.id)) {
      setJoinedEventIds(joinedEventIds.filter(id => id !== event.id));
    } else {
      setJoinedEventIds([...joinedEventIds, event.id]);
    }
  };

  // Filtered Guilds
  const filteredGuilds = guilds.filter(g => {
    const matchesSearch = 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFocus = focusFilter === 'all' || g.focus === focusFilter;
    return matchesSearch && matchesFocus;
  });

  return (
    <div className="min-h-[calc(100vh-60px)] bg-[#090705] text-[#f4efe6] px-4 sm:px-8 py-6 flex flex-col space-y-6 select-none max-w-7xl mx-auto w-full">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2e2319] pb-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#9a281e] via-[#c94a29] to-[#d49e54] flex items-center justify-center shadow-lg border border-[#e07b53]/50">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#d49e54]">
                CONVERGENCE ALLIANCES
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold">
                GUILD CHAMBER
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#f4efe6] font-serif tracking-wide uppercase">
              Guilds &amp; Alliance Events
            </h1>
          </div>
        </div>

        {/* Guild Status Badge & Commission Button */}
        <div className="flex items-center space-x-2.5">
          {myGuild ? (
            <div className="flex items-center space-x-2 bg-black/60 border border-amber-500/50 px-3 py-1.5 rounded-xl text-xs font-mono">
              <span className="text-base">{myGuild.crest}</span>
              <div>
                <span className="text-[9px] text-[#d49e54] block uppercase font-bold">MY GUILD</span>
                <span className="text-xs font-bold text-white font-serif">[{myGuild.tag}] {myGuild.name}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#9a281e] via-[#c94a29] to-[#d49e54] hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(201,74,41,0.5)] border border-[#e07b53]/60 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Commission Guild</span>
            </button>
          )}
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 2. STATE A: USER HAS A GUILD (GUILD HALL OVERVIEW) */}
      {myGuild ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Guild Banner Stage */}
          <div className={`relative rounded-2xl overflow-hidden border-2 border-amber-500/60 shadow-[0_0_40px_rgba(0,0,0,0.8)] bg-gradient-to-r ${myGuild.bannerTheme} p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <div className="relative z-10 flex items-center space-x-5">
              <div className="w-20 h-20 rounded-2xl bg-black/80 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-2xl">
                {myGuild.crest}
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-black/60 text-amber-300 border border-amber-500/50 font-mono font-bold">
                    [{myGuild.tag}]
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-800 font-mono font-bold uppercase">
                    LEVEL {myGuild.level} GUILD
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700 font-mono uppercase">
                    {myGuild.focus}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-wide uppercase">
                  {myGuild.name}
                </h2>
                <p className="text-xs font-serif italic text-zinc-300">
                  "{myGuild.motto}"
                </p>
                <div className="flex items-center space-x-3 text-[11px] font-mono text-[#d49e54] pt-1">
                  <span>{myGuild.members.length} / {myGuild.maxMembers} Commanders</span>
                  <span>•</span>
                  <span>XP: {myGuild.xp.toLocaleString()} / {(myGuild.level * 2000).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3">
              {/* Guild XP Bar */}
              <div className="w-48 bg-black/60 border border-white/10 rounded-xl p-2.5">
                <div className="flex justify-between text-[10px] font-mono text-zinc-300 mb-1">
                  <span>Guild Level {myGuild.level}</span>
                  <span className="text-amber-400 font-bold">{Math.round((myGuild.xp / (myGuild.level * 2000)) * 100)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500" 
                    style={{ width: `${Math.min(100, (myGuild.xp / (myGuild.level * 2000)) * 100)}%` }} 
                  />
                </div>
              </div>

              <button
                onClick={handleLeaveGuild}
                className="px-3.5 py-1.5 bg-rose-950/50 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-xs font-mono transition cursor-pointer flex items-center space-x-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Guild</span>
              </button>
            </div>
          </div>

          {/* Announcement Pinned Callout */}
          {myGuild.announcement && (
            <div className="p-4 rounded-xl bg-[#140e0a] border border-[#3e2e21] flex items-start space-x-3">
              <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-mono uppercase text-[#d49e54] font-bold block">
                  GUILD HIGH DISPATCH
                </span>
                <p className="text-xs text-zinc-200 font-serif leading-relaxed mt-0.5">
                  {myGuild.announcement}
                </p>
              </div>
            </div>
          )}

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center space-x-2 border-b border-[#2e2319] pb-2">
            <button
              onClick={() => setGuildHallTab('events')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition ${
                guildHallTab === 'events'
                  ? 'bg-[#1c140e] text-[#d49e54] border border-[#4a3522] font-bold shadow'
                  : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#140e0a]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Guild Events &amp; Raids ({myGuild.upcomingEvents?.length || 0})</span>
            </button>

            <button
              onClick={() => setGuildHallTab('members')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition ${
                guildHallTab === 'members'
                  ? 'bg-[#1c140e] text-[#d49e54] border border-[#4a3522] font-bold shadow'
                  : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#140e0a]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Roster ({myGuild.members.length})</span>
            </button>

            <button
              onClick={() => setGuildHallTab('activity')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition ${
                guildHallTab === 'activity'
                  ? 'bg-[#1c140e] text-[#d49e54] border border-[#4a3522] font-bold shadow'
                  : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#140e0a]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Activity Log</span>
            </button>

            <button
              onClick={() => setGuildHallTab('perks')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition ${
                guildHallTab === 'perks'
                  ? 'bg-[#1c140e] text-[#d49e54] border border-[#4a3522] font-bold shadow'
                  : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#140e0a]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Perks &amp; Vault</span>
            </button>
          </div>

          {/* TAB 1: GUILD EVENTS & RAIDS */}
          {guildHallTab === 'events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base font-serif text-white uppercase">
                    Upcoming Guild Operations &amp; Season 2 Raids
                  </h3>
                  <p className="text-xs font-mono text-[#a39482]">
                    Register your battle group to secure territory rewards and guild conquest points.
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold">
                  SEASON 2 WAR PREVIEW
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(myGuild.upcomingEvents || []).map(evt => {
                  const isRegistered = joinedEventIds.includes(evt.id);
                  return (
                    <div
                      key={evt.id}
                      className="bg-[#120d09] border border-[#2e2319] hover:border-amber-500/60 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden transition"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                            evt.type === 'siege' 
                              ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                              : evt.type === 'war' 
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-purple-950 text-purple-300 border border-purple-800'
                          }`}>
                            {evt.type.toUpperCase()} OPERATION
                          </span>
                          <span className="text-xs font-mono text-zinc-400 flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{new Date(evt.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        </div>

                        <div>
                          <h4 className="text-lg font-bold font-serif text-white">{evt.title}</h4>
                          <p className="text-xs text-[#a39482] font-mono leading-relaxed mt-1">
                            {evt.description}
                          </p>
                        </div>

                        {/* Rewards Callout */}
                        <div className="bg-black/50 border border-[#2e2319] rounded-xl p-3 flex items-center justify-between text-xs font-mono">
                          <span className="text-[#a39482]">Loot Pool:</span>
                          <div className="flex items-center space-x-3 font-bold">
                            <span className="text-[#e07b53]">🩸 +{evt.rewards.shards}</span>
                            <span className="text-[#d49e54]">💎 +{evt.rewards.cores}</span>
                            {evt.rewards.trophyBadge && <span>{evt.rewards.trophyBadge}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRallyForEvent(evt)}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs font-mono uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-2 ${
                          isRegistered
                            ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                            : 'bg-[#1f1510] hover:bg-[#2b1b14] border border-[#4a3522] hover:border-amber-400 text-[#d49e54] hover:text-white'
                        }`}
                      >
                        {isRegistered ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Roster Registered &bull; Standby</span>
                          </>
                        ) : (
                          <>
                            <Swords className="w-4 h-4" />
                            <span>Rally for Operation</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: MEMBER ROSTER */}
          {guildHallTab === 'members' && (
            <div className="bg-[#120d09] border border-[#2e2319] rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#2e2319] pb-3">
                <h3 className="font-bold text-base font-serif text-white uppercase">
                  Guild High Command Roster ({myGuild.members.length} / {myGuild.maxMembers})
                </h3>
                <span className="text-xs font-mono text-[#d49e54]">
                  Min Rating Requirement: {myGuild.minRating} ELO
                </span>
              </div>

              <div className="space-y-2">
                {myGuild.members.map(member => (
                  <div
                    key={member.id}
                    className="p-3 rounded-xl bg-black/50 border border-[#2e2319] flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={member.avatarUrl}
                        alt={member.displayName}
                        className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-700 object-cover"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h5 className="font-bold text-sm font-serif text-white">{member.displayName}</h5>
                          {member.role === 'leader' && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600 text-[9px] font-mono font-bold">
                              LEADER
                            </span>
                          )}
                          {member.role === 'officer' && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-700 text-[9px] font-mono font-bold">
                              OFFICER
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-[#a39482]">
                          {member.title || 'Guild Commander'} &bull; Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 text-xs font-mono">
                      <div className="text-right">
                        <span className="text-[10px] text-[#a39482] block uppercase">Rating</span>
                        <span className="font-bold text-white">{member.rating} ELO</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#a39482] block uppercase">Contribution</span>
                        <span className="font-bold text-amber-400">{member.contributionPoints.toLocaleString()} XP</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY FEED */}
          {guildHallTab === 'activity' && (
            <div className="bg-[#120d09] border border-[#2e2319] rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="font-bold text-base font-serif text-white uppercase border-b border-[#2e2319] pb-3">
                Recent Guild Operations &amp; Accolades
              </h3>
              <div className="space-y-2">
                {(myGuild.activityFeed || []).map(act => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-black/40 border border-[#2e2319] flex items-center space-x-3 text-xs font-mono"
                  >
                    <span className="text-lg">{act.icon || '📌'}</span>
                    <div className="flex-1">
                      <span className="text-zinc-200">{act.text}</span>
                    </div>
                    <span className="text-[#a39482] text-[10px]">{act.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PERKS & VAULT */}
          {guildHallTab === 'perks' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#120d09] border border-[#2e2319] rounded-2xl p-5 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-600 flex items-center justify-center text-xl">
                  🩸
                </div>
                <h4 className="font-bold text-sm font-serif text-white">Shard Bounties (+10%)</h4>
                <p className="text-xs text-[#a39482] font-mono">
                  Active for all guild commanders across regular skirmishes and campaign chapters.
                </p>
                <span className="text-[10px] text-emerald-400 font-mono font-bold block pt-1">ACTIVE PERK</span>
              </div>

              <div className="bg-[#120d09] border border-[#2e2319] rounded-2xl p-5 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-600 flex items-center justify-center text-xl">
                  ⚔️
                </div>
                <h4 className="font-bold text-sm font-serif text-white">Guild War Banners</h4>
                <p className="text-xs text-[#a39482] font-mono">
                  Custom battlefield standard displayed during continuous canvas skirmishes.
                </p>
                <span className="text-[10px] text-amber-400 font-mono font-bold block pt-1">UNLOCKED (LVL 5)</span>
              </div>

              <div className="bg-[#120d09] border border-[#2e2319] rounded-2xl p-5 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-600 flex items-center justify-center text-xl">
                  🔮
                </div>
                <h4 className="font-bold text-sm font-serif text-white">Raid Armory Slots</h4>
                <p className="text-xs text-[#a39482] font-mono">
                  Unlocks cooperative roster loaning between members during raid encounters.
                </p>
                <span className="text-[10px] text-zinc-500 font-mono block pt-1">UNLOCKED AT LEVEL 8</span>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* 3. STATE B: USER HAS NO GUILD (EXPLORE & COMMISSION VIEW) */
        <div className="space-y-6">
          
          {/* Guild Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#120d09] border border-[#2e2319] rounded-2xl p-4 shadow-xl">
            <div className="flex items-center space-x-2 bg-black/60 border border-[#2e2319] rounded-xl px-3.5 py-2 w-full sm:w-80">
              <Search className="w-4 h-4 text-[#a39482]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search guild name or [TAG]..."
                className="bg-transparent text-xs font-mono text-white outline-none w-full placeholder:text-[#593d28]"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {(['all', 'competitive', 'raids', 'doctrine', 'casual'] as const).map(focus => (
                <button
                  key={focus}
                  onClick={() => setFocusFilter(focus)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition ${
                    focusFilter === focus
                      ? 'bg-amber-950/70 border border-amber-500 text-amber-300 font-bold'
                      : 'bg-black/50 border border-[#2e2319] text-[#a39482] hover:text-white'
                  }`}
                >
                  {focus}
                </button>
              ))}
            </div>
          </div>

          {/* Guild Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGuilds.map(guild => (
              <div
                key={guild.id}
                className="bg-[#120d09] border border-[#2e2319] hover:border-amber-500/60 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden transition group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-black/70 border border-amber-500/40 flex items-center justify-center text-2xl shadow">
                        {guild.crest}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-black/60 text-amber-300 border border-amber-500/50 font-mono font-bold">
                            [{guild.tag}]
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c140e] text-[#d49e54] border border-[#3e2e21] uppercase">
                            LVL {guild.level}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold font-serif text-white mt-0.5">
                          {guild.name}
                        </h3>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 uppercase">
                      {guild.focus}
                    </span>
                  </div>

                  <p className="text-xs text-[#a39482] font-mono leading-relaxed line-clamp-2">
                    {guild.description}
                  </p>

                  <div className="bg-black/50 border border-[#2e2319] rounded-xl p-2.5 flex items-center justify-between text-[11px] font-mono text-[#d49e54]">
                    <span>Roster: <strong className="text-white">{guild.members.length}/{guild.maxMembers}</strong></span>
                    <span>Min Rating: <strong className="text-white">{guild.minRating} ELO</strong></span>
                    <span>Events: <strong className="text-amber-400">{guild.upcomingEvents?.length || 0}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => handleJoinGuild(guild)}
                  className="w-full py-2.5 bg-gradient-to-r from-[#9a281e] via-[#c94a29] to-[#d49e54] hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow border border-[#e07b53]/60 transition cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Guild</span>
                </button>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* 4. Commission New Guild Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="w-full max-w-lg bg-[#110c08] border-2 border-amber-500/70 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#2e2319] pb-3">
              <div className="flex items-center space-x-2 text-amber-400 font-serif font-black text-lg">
                <Shield className="w-5 h-5 text-amber-400" />
                <span>COMMISSION NEW GUILD</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-950 border border-rose-600 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateGuild} className="space-y-4">
              
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-mono text-[#d49e54] uppercase block">Guild Name</label>
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    placeholder="e.g. Ironclad Vanguard"
                    className="w-full bg-black/60 border border-[#2e2319] focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-[#d49e54] uppercase block">Tag [2-5]</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={createTag}
                    onChange={e => setCreateTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="IRON"
                    className="w-full bg-black/60 border border-[#2e2319] focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none text-center font-bold"
                  />
                </div>
              </div>

              {/* Crest selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#d49e54] uppercase block">Guild Crest</label>
                <div className="grid grid-cols-6 gap-2">
                  {CREST_PRESETS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCreateCrest(c)}
                      className={`p-2.5 rounded-xl border text-xl flex items-center justify-center transition cursor-pointer ${
                        createCrest === c
                          ? 'bg-amber-950/80 border-amber-400 shadow-md scale-105'
                          : 'bg-black/50 border-[#2e2319] hover:border-[#4a3522]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#d49e54] uppercase block">Primary Focus</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['competitive', 'raids', 'doctrine', 'casual'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setCreateFocus(f)}
                      className={`py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition ${
                        createFocus === f
                          ? 'bg-amber-950/80 border border-amber-400 text-amber-300 font-bold'
                          : 'bg-black/50 border border-[#2e2319] text-[#a39482]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-[#d49e54] uppercase block">Guild Motto</label>
                <input
                  type="text"
                  value={createMotto}
                  onChange={e => setCreateMotto(e.target.value)}
                  placeholder="e.g. Unbroken steel, unyielding resolve."
                  className="w-full bg-black/60 border border-[#2e2319] focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-[#d49e54] uppercase block">Description</label>
                <textarea
                  value={createDesc}
                  onChange={e => setCreateDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe your guild doctrine and recruitment requirements..."
                  className="w-full bg-black/60 border border-[#2e2319] focus:border-amber-500 rounded-xl p-3 text-xs font-mono text-white outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-[#d49e54] uppercase block">Minimum Rating (ELO)</label>
                <input
                  type="number"
                  value={createMinRating}
                  onChange={e => setCreateMinRating(parseInt(e.target.value) || 0)}
                  className="w-full bg-black/60 border border-[#2e2319] focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-xl text-xs font-mono uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow"
                >
                  Commission Guild
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
