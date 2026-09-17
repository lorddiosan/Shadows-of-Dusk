import React, { useState } from 'react';
import { 
  User, Shield, Swords, Crown, Sparkles, Award, 
  Flame, Zap, Trophy, Check, Edit3, Palette, Save, 
  RotateCcw, Lock, ExternalLink, Image, Star, Eye,
  CheckCircle2, Compass, Layers, Radio, LogOut
} from 'lucide-react';
import { UserProfile } from '../../types/user';
import { ArmyRoster } from '../../types/army';
import { FactionLogo } from '../common/FactionLogo';
import { StorageService } from '../../services/storageService';
import { AuthService } from '../../services/authService';
import { FACTIONS } from '../../data/factions';

interface ProfilePageProps {
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  rosters?: ArmyRoster[];
  onNavigate?: (tab: 'home' | 'matchmaking' | 'play' | 'builder' | 'shop' | 'battlepass' | 'lore' | 'profile' | 'admin') => void;
  onSignOut?: () => void;
  onSwitchAccount?: () => void;
  onOpenAuth?: () => void;
}

// Preset Themes for Banner Header
const BANNER_THEMES = [
  {
    id: 'crimson_flame',
    name: 'Crimson Flame',
    gradient: 'from-red-950 via-rose-900 to-amber-950',
    accentBorder: 'border-rose-500/60',
    glow: 'rgba(225,29,72,0.3)',
    icon: '🔥'
  },
  {
    id: 'celestial_dawn',
    name: 'Celestial Dawn',
    gradient: 'from-amber-950 via-yellow-900 to-amber-800',
    accentBorder: 'border-amber-400/60',
    glow: 'rgba(245,158,11,0.3)',
    icon: '☀️'
  },
  {
    id: 'void_abyss',
    name: 'Void Abyss',
    gradient: 'from-purple-950 via-indigo-950 to-zinc-950',
    accentBorder: 'border-purple-500/60',
    glow: 'rgba(168,85,247,0.3)',
    icon: '🔮'
  },
  {
    id: 'obsidian_forge',
    name: 'Obsidian Forge',
    gradient: 'from-zinc-950 via-stone-900 to-orange-950',
    accentBorder: 'border-orange-500/60',
    glow: 'rgba(249,115,22,0.3)',
    icon: '⚙️'
  },
  {
    id: 'emerald_vale',
    name: 'Emerald Vale',
    gradient: 'from-emerald-950 via-teal-950 to-zinc-950',
    accentBorder: 'border-emerald-500/60',
    glow: 'rgba(16,185,129,0.3)',
    icon: '🌿'
  }
];

// Preset Avatar Frames
const AVATAR_FRAMES = [
  { id: 'frame_steel', name: 'Standard Iron', borderClass: 'border-zinc-600', ringColor: 'ring-zinc-700/50', badge: '🛡️' },
  { id: 'frame_gold', name: 'Gilded Laurel', borderClass: 'border-amber-400 ring-2 ring-amber-400/40', ringColor: 'ring-amber-400', badge: '👑' },
  { id: 'frame_crimson', name: 'Bloodfire Spikes', borderClass: 'border-rose-600 ring-2 ring-rose-500/50', ringColor: 'ring-rose-500', badge: '🩸' },
  { id: 'frame_void', name: 'Runic Shadow', borderClass: 'border-purple-500 ring-2 ring-purple-500/50', ringColor: 'ring-purple-500', badge: '✨' },
  { id: 'frame_cyber', name: 'Aether Core', borderClass: 'border-cyan-400 ring-2 ring-cyan-400/50', ringColor: 'ring-cyan-400', badge: '⚡' }
];

// Preset Honor Badges
const HONOR_BADGES = [
  { id: 'badge_crown', icon: '👑', label: 'Grand Warmaster' },
  { id: 'badge_swords', icon: '⚔️', label: 'First Blood' },
  { id: 'badge_shield', icon: '🛡️', label: 'Bulwark of Astraea' },
  { id: 'badge_fire', icon: '🔥', label: 'Hellfire Conqueror' },
  { id: 'badge_trophy', icon: '🏆', label: 'Convergence Champion' },
  { id: 'badge_star', icon: '⭐', label: 'Apex Vanguard' },
  { id: 'badge_spider', icon: '🕷️', label: 'Shadow Weaver' },
  { id: 'badge_crystal', icon: '💎', label: 'Aether Prodigy' }
];

// Preset Titles
const PRESET_TITLES = [
  'Grand Warmaster',
  'High Justiciar',
  'Void Stalker',
  'Iron Juggernaut',
  'Lord of Embers',
  'Apex Duelist',
  'Aether Tactician',
  'Crimson Marshal',
  'Silent Shadowblade',
  'Convergence Veteran'
];

// Preset Avatar Presets
const AVATAR_PRESETS = [
  { id: 'av_bot1', name: 'Iron Automaton', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=IronAutomaton' },
  { id: 'av_bot2', name: 'Crimson Warmachine', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CrimsonWarmachine' },
  { id: 'av_bot3', name: 'Aether Sentinel', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AetherSentinel' },
  { id: 'av_adv1', name: 'Lord Commander', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=LordCommander' },
  { id: 'av_adv2', name: 'Astraea Paladin', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AstraeaPaladin' },
  { id: 'av_adv3', name: 'Shadow Mage', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ShadowMage' },
  { id: 'av_adv4', name: 'Ironclad Barbarian', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=IroncladBarbarian' },
  { id: 'av_lor1', name: 'Sorceress of Dusk', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=SorceressDusk' },
  { id: 'av_lor2', name: 'High Inquisitor', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=HighInquisitor' }
];

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onUpdateUser,
  rosters = [],
  onNavigate,
  onSignOut,
  onSwitchAccount,
  onOpenAuth
}) => {
  // Local form state for live customization
  const [displayName, setDisplayName] = useState(user.displayName || 'Commander');
  const [username, setUsername] = useState(user.username || 'commander');
  const [title, setTitle] = useState(user.title || 'Grand Warmaster');
  const [customTitleInput, setCustomTitleInput] = useState('');
  const [bio, setBio] = useState(user.bio || 'Honor in steel, victory in discipline. The Convergence answers to no tyrant.');
  const [factionAlignment, setFactionAlignment] = useState(user.factionAlignment || 'crimson_empire');
  const [bannerTheme, setBannerTheme] = useState(user.bannerTheme || 'crimson_flame');
  const [avatarFrame, setAvatarFrame] = useState(user.avatarFrame || 'frame_gold');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || AVATAR_PRESETS[0].url);
  const [badgeIcon, setBadgeIcon] = useState(user.badgeIcon || '👑');
  const [equippedBoardSkin, setEquippedBoardSkin] = useState(user.equippedBoardSkin || 'board_crimson_foundry');
  const [equippedDiceSkin, setEquippedDiceSkin] = useState(user.equippedDiceSkin || 'dice_brass_steam');

  // Customization Section Navigation Tab
  const [activeTab, setActiveTab] = useState<'identity' | 'visuals' | 'cosmetics' | 'stats'>('identity');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active theme object
  const currentTheme = BANNER_THEMES.find(t => t.id === bannerTheme) || BANNER_THEMES[0];
  const currentFrame = AVATAR_FRAMES.find(f => f.id === avatarFrame) || AVATAR_FRAMES[1];

  const handleSaveProfile = () => {
    const updated: UserProfile = {
      ...user,
      displayName: displayName.trim() || user.displayName,
      username: username.trim() || user.username,
      title: customTitleInput.trim() || title,
      bio: bio.trim(),
      factionAlignment,
      bannerTheme,
      avatarFrame,
      avatarUrl,
      badgeIcon,
      equippedBoardSkin,
      equippedDiceSkin
    };

    onUpdateUser(updated);
    StorageService.saveUserProfile(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetToDefault = () => {
    setDisplayName(user.displayName || 'Commander');
    setUsername(user.username || 'commander');
    setTitle(user.title || 'Grand Warmaster');
    setCustomTitleInput('');
    setBio(user.bio || 'Honor in steel, victory in discipline. The Convergence answers to no tyrant.');
    setFactionAlignment(user.factionAlignment || 'crimson_empire');
    setBannerTheme(user.bannerTheme || 'crimson_flame');
    setAvatarFrame(user.avatarFrame || 'frame_gold');
    setAvatarUrl(user.avatarUrl || AVATAR_PRESETS[0].url);
    setBadgeIcon(user.badgeIcon || '👑');
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-[#090705] text-[#f4efe6] px-4 sm:px-8 py-6 flex flex-col space-y-6 select-none max-w-7xl mx-auto w-full">
      
      {/* 1. Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2e2319] pb-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#9a281e] via-[#c94a29] to-[#d49e54] flex items-center justify-center shadow-lg border border-[#e07b53]/50">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#d49e54]">
                WARPATH HIGH COMMAND
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold">
                DOSSIER STUDIO
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#f4efe6] font-serif tracking-wide uppercase">
              Commander Profile &amp; Customization
            </h1>
          </div>
        </div>

        {/* Action Controls: Save & Reset */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl bg-[#16100c] hover:bg-[#20150f] border border-[#3e2e21] hover:border-[#a39482] text-xs font-mono text-[#a39482] hover:text-white transition cursor-pointer flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleSaveProfile}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#9a281e] via-[#c94a29] to-[#d49e54] hover:brightness-110 text-white text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(201,74,41,0.5)] border border-[#e07b53]/60 transition cursor-pointer flex items-center space-x-1.5"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. LIVE PROFILE CARD PREVIEW BANNER (Customizable Stage) */}
      <div className={`relative rounded-2xl overflow-hidden border-2 ${currentTheme.accentBorder} shadow-[0_0_40px_rgba(0,0,0,0.8)] bg-gradient-to-r ${currentTheme.gradient} transition-all duration-300`}>
        
        {/* Background glow and subtle particle overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        {/* Content of Banner */}
        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* Avatar with Frame & Badges */}
          <div className="flex items-center space-x-5">
            <div className="relative">
              <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-black/80 border-2 ${currentFrame.borderClass} shadow-2xl relative transition-all`}>
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Equipped Honor Badge Icon */}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-[#1c140e] border-2 border-amber-400 flex items-center justify-center text-base shadow-xl" title="Equipped Honor Badge">
                {badgeIcon}
              </div>
            </div>

            {/* Title, Name & Faction */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-black/60 text-amber-300 border border-amber-500/50 font-mono font-bold uppercase tracking-wider flex items-center space-x-1 shadow">
                  <span>{currentTheme.icon}</span>
                  <span>{customTitleInput || title}</span>
                </span>
                
                {user.role === 'admin' && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-mono font-bold flex items-center space-x-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>ADMINISTRATOR</span>
                  </span>
                )}

                <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c140e] text-[#d49e54] border border-[#593d28] font-mono">
                  LVL {user.level || 4} COMMANDER
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white font-serif tracking-wide uppercase drop-shadow-md">
                {displayName}
              </h2>

              <p className="text-xs font-mono text-[#d49e54]">
                @{username} • Allegiance: <span className="font-bold text-white capitalize">{factionAlignment.replace('_', ' ')}</span>
              </p>

              {/* Bio / Doctrine Quote */}
              <p className="text-xs sm:text-sm text-zinc-300 font-serif italic max-w-xl line-clamp-2 leading-relaxed pt-1">
                "{bio}"
              </p>
            </div>
          </div>

          {/* Right Stats Callout in Banner */}
          <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
            <div className="text-left md:text-right bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-lg">
              <span className="text-[10px] font-mono uppercase text-[#d49e54] tracking-wider block font-bold">
                VANGUARD RANK
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-white">
                1,480 <span className="text-xs text-amber-400">MMR</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 block font-bold">
                42W - 18L (70% WR)
              </span>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-[#e07b53]">🩸 {user.crystalShards.toLocaleString()}</span>
              <span className="text-white/20">|</span>
              <span className="text-[#d49e54]">💎 {user.aetherCores.toLocaleString()}</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Customization Suite Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#2e2319] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('identity')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition shrink-0 ${
            activeTab === 'identity'
              ? 'bg-[#1c140e] text-[#d49e54] border border-[#4a3522] font-bold shadow'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#140e0a]'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Identity &amp; Persona</span>
        </button>

        <button
          onClick={() => setActiveTab('visuals')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition shrink-0 ${
            activeTab === 'visuals'
              ? 'bg-[#1c140e] text-[#d49e54] border border-[#4a3522] font-bold shadow'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#140e0a]'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Theme &amp; Avatar Frames</span>
        </button>

        <button
          onClick={() => setActiveTab('cosmetics')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition shrink-0 ${
            activeTab === 'cosmetics'
              ? 'bg-[#1c140e] text-[#d49e54] border border-[#4a3522] font-bold shadow'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#140e0a]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Battlefield Cosmetics</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition shrink-0 ${
            activeTab === 'stats'
              ? 'bg-[#1c140e] text-[#d49e54] border border-[#4a3522] font-bold shadow'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#140e0a]'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Career Record</span>
        </button>
      </div>

      {/* 4. TAB CONTENT PANELS */}

      {/* TAB 1: IDENTITY & PERSONA */}
      {activeTab === 'identity' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#120d09] border border-[#2e2319] rounded-2xl p-6 shadow-xl animate-in fade-in duration-150">
          
          {/* Column A: Names and Title */}
          <div className="space-y-4">
            <h3 className="font-bold text-base font-serif text-white uppercase border-b border-[#2e2319] pb-2 flex items-center space-x-2">
              <User className="w-4 h-4 text-[#d49e54]" />
              <span>Commander Identification</span>
            </h3>

            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#d49e54] uppercase block">
                Display Name (Battlefield Call-Sign)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={32}
                placeholder="e.g. Grand Warmaster Kaelen"
                className="w-full bg-black/60 border border-[#2e2319] focus:border-[#d49e54] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none"
              />
            </div>

            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#d49e54] uppercase block">
                Command Handle (@Username)
              </label>
              <div className="flex items-center bg-black/60 border border-[#2e2319] rounded-xl px-3.5 py-2.5">
                <span className="text-xs font-mono text-zinc-500 mr-1">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  maxLength={24}
                  placeholder="commander_vane"
                  className="w-full bg-transparent text-sm font-mono text-white outline-none"
                />
              </div>
            </div>

            {/* Honorific Title Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-[#d49e54] uppercase block">
                Honorific Title
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_TITLES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTitle(t);
                      setCustomTitleInput('');
                    }}
                    className={`p-2 rounded-xl text-left text-xs font-mono transition border ${
                      title === t && !customTitleInput
                        ? 'bg-amber-950/70 border-amber-500 text-white font-bold'
                        : 'bg-black/50 border-[#2e2319] text-[#a39482] hover:text-white hover:border-[#4a3522]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Custom Title Write-in */}
              <div className="pt-1">
                <input
                  type="text"
                  value={customTitleInput}
                  onChange={(e) => setCustomTitleInput(e.target.value)}
                  placeholder="Or enter custom title..."
                  maxLength={28}
                  className="w-full bg-black/60 border border-[#2e2319] focus:border-[#d49e54] rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Column B: Bio and Allegiance */}
          <div className="space-y-4">
            <h3 className="font-bold text-base font-serif text-white uppercase border-b border-[#2e2319] pb-2 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-[#d49e54]" />
              <span>Doctrine &amp; Allegiance</span>
            </h3>

            {/* Motto / Bio Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#d49e54] uppercase block">
                Personal Doctrine / Battle Cry
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={180}
                placeholder="Declare your battle ethos..."
                className="w-full bg-black/60 border border-[#2e2319] focus:border-[#d49e54] rounded-xl p-3 text-xs font-serif text-white outline-none leading-relaxed resize-none"
              />
              <div className="text-right text-[10px] font-mono text-zinc-500">
                {bio.length}/180 chars
              </div>
            </div>

            {/* Faction Allegiance Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-[#d49e54] uppercase block">
                Primary Faction Alignment
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {FACTIONS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFactionAlignment(f.id)}
                    className={`p-2.5 rounded-xl border flex items-center space-x-2.5 transition text-left ${
                      factionAlignment === f.id
                        ? 'bg-amber-950/60 border-amber-500 text-white shadow-md'
                        : 'bg-black/50 border-[#2e2319] text-[#a39482] hover:border-[#4a3522] hover:text-white'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
                      <FactionLogo faction={{ id: f.id }} size="xs" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold font-serif truncate">{f.name}</div>
                      <div className="text-[9px] font-mono text-[#a39482] truncate">{f.title || f.strengths?.[0] || 'Faction'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: VISUALS (AVATAR, FRAMES, BANNER THEMES, BADGES) */}
      {activeTab === 'visuals' && (
        <div className="space-y-6 bg-[#120d09] border border-[#2e2319] rounded-2xl p-6 shadow-xl animate-in fade-in duration-150">
          
          {/* Section A: Banner Theme Selection */}
          <div className="space-y-3">
            <h3 className="font-bold text-base font-serif text-white uppercase border-b border-[#2e2319] pb-2 flex items-center space-x-2">
              <Palette className="w-4 h-4 text-[#d49e54]" />
              <span>Header Banner Theme</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {BANNER_THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setBannerTheme(theme.id)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-2 transition relative overflow-hidden group cursor-pointer ${
                    bannerTheme === theme.id
                      ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg scale-105'
                      : 'border-[#2e2319] hover:border-[#4a3522]'
                  }`}
                >
                  <div className={`w-full h-12 rounded-lg bg-gradient-to-r ${theme.gradient} flex items-center justify-center text-xl shadow`}>
                    {theme.icon}
                  </div>
                  <span className="text-xs font-mono font-bold text-white text-center">
                    {theme.name}
                  </span>
                  {bannerTheme === theme.id && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section B: Avatar Presets */}
          <div className="space-y-3">
            <h3 className="font-bold text-base font-serif text-white uppercase border-b border-[#2e2319] pb-2 flex items-center space-x-2">
              <Image className="w-4 h-4 text-[#d49e54]" />
              <span>Commander Portrait</span>
            </h3>

            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
              {AVATAR_PRESETS.map(av => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => setAvatarUrl(av.url)}
                  className={`relative p-1.5 rounded-xl border flex flex-col items-center space-y-1 transition cursor-pointer ${
                    avatarUrl === av.url
                      ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/50 shadow-lg scale-105'
                      : 'bg-black/50 border-[#2e2319] hover:border-[#4a3522]'
                  }`}
                >
                  <img
                    src={av.url}
                    alt={av.name}
                    className="w-14 h-14 rounded-lg bg-zinc-900 object-cover"
                  />
                  <span className="text-[10px] font-mono text-zinc-300 truncate w-full text-center">
                    {av.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom URL Option */}
            <div className="pt-2">
              <label className="text-[11px] font-mono text-[#a39482] uppercase block mb-1">
                Custom Avatar Image URL
              </label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full bg-black/60 border border-[#2e2319] focus:border-[#d49e54] rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
              />
            </div>
          </div>

          {/* Section C: Avatar Frames */}
          <div className="space-y-3">
            <h3 className="font-bold text-base font-serif text-white uppercase border-b border-[#2e2319] pb-2 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-[#d49e54]" />
              <span>Avatar Border &amp; Frame</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {AVATAR_FRAMES.map(frame => (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => setAvatarFrame(frame.id)}
                  className={`p-3 rounded-xl border flex items-center space-x-3 transition cursor-pointer ${
                    avatarFrame === frame.id
                      ? 'bg-amber-950/70 border-amber-400 shadow-lg'
                      : 'bg-black/50 border-[#2e2319] hover:border-[#4a3522]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-zinc-900 border-2 ${frame.borderClass} flex items-center justify-center text-lg`}>
                    {frame.badge}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold font-serif text-white block">{frame.name}</span>
                    <span className="text-[10px] font-mono text-[#a39482]">Equip Frame</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section D: Featured Honor Badges */}
          <div className="space-y-3">
            <h3 className="font-bold text-base font-serif text-white uppercase border-b border-[#2e2319] pb-2 flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#d49e54]" />
              <span>Featured Honor Badge</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {HONOR_BADGES.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBadgeIcon(b.icon)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center space-y-1 transition cursor-pointer ${
                    badgeIcon === b.icon
                      ? 'bg-amber-950/80 border-amber-400 shadow-md scale-105 text-white'
                      : 'bg-black/50 border-[#2e2319] text-[#a39482] hover:border-[#4a3522]'
                  }`}
                >
                  <span className="text-2xl">{b.icon}</span>
                  <span className="text-[10px] font-mono text-center truncate w-full">{b.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: BATTLEFIELD COSMETICS (Board, Dice Skins) */}
      {activeTab === 'cosmetics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#120d09] border border-[#2e2319] rounded-2xl p-6 shadow-xl animate-in fade-in duration-150">
          
          {/* Board Skin Customization */}
          <div className="space-y-4">
            <h3 className="font-bold text-base font-serif text-white uppercase border-b border-[#2e2319] pb-2 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#d49e54]" />
              <span>Equipped Board Terrain Skin</span>
            </h3>

            <div className="space-y-2.5">
              {[
                { id: 'classic_grid', name: 'Standard Continuous Grid', desc: 'Default tactical terrain with high-contrast grid lines', icon: '🗺️', rarity: 'Common' },
                { id: 'board_crimson_foundry', name: 'Crimson Foundry Slag', desc: 'Volcanic magma channels and blackened basalt plates', icon: '🌋', rarity: 'Epic' },
                { id: 'board_ashen_vale', name: 'Ashen Vale Forest', desc: 'Overgrown ruins and ancient stone altars covered in moss', icon: '🌲', rarity: 'Rare' },
                { id: 'board_void_nebula', name: 'Void Singularity', desc: 'Astral event horizon with shimmering starlight dust', icon: '🌌', rarity: 'Mythic' }
              ].map(board => (
                <div
                  key={board.id}
                  onClick={() => setEquippedBoardSkin(board.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                    equippedBoardSkin === board.id
                      ? 'bg-amber-950/60 border-amber-400 shadow-md text-white'
                      : 'bg-black/50 border-[#2e2319] hover:border-[#4a3522] text-[#a39482]'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xl">
                      {board.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm font-serif text-white">{board.name}</h4>
                      <p className="text-[11px] text-[#a39482] font-mono">{board.desc}</p>
                    </div>
                  </div>
                  
                  {equippedBoardSkin === board.id ? (
                    <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-mono font-bold uppercase">
                      EQUIPPED
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-[#d49e54] hover:text-white">
                      Equip
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dice Skin Customization */}
          <div className="space-y-4">
            <h3 className="font-bold text-base font-serif text-white uppercase border-b border-[#2e2319] pb-2 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#d49e54]" />
              <span>Equipped Combat Dice Skin</span>
            </h3>

            <div className="space-y-2.5">
              {[
                { id: 'default_dice', name: 'Classic Dusk Bone', desc: 'Standard carved ivory dice with blackened pips', icon: '🎲', rarity: 'Common' },
                { id: 'dice_brass_steam', name: 'Brass Steampunk Chrono', desc: 'Gear-etched brass dice with ticking rotational animation', icon: '⚙️', rarity: 'Rare' },
                { id: 'dice_bloodstone', name: 'Crimson Bloodstone', desc: 'Deep ruby gem with pulsing fiery critical flashes', icon: '🩸', rarity: 'Epic' },
                { id: 'dice_celestial', name: 'Astraea Gilded Star', desc: 'Gold leaf and lapis lazuli adorned holy dice', icon: '✨', rarity: 'Mythic' }
              ].map(dice => (
                <div
                  key={dice.id}
                  onClick={() => setEquippedDiceSkin(dice.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                    equippedDiceSkin === dice.id
                      ? 'bg-amber-950/60 border-amber-400 shadow-md text-white'
                      : 'bg-black/50 border-[#2e2319] hover:border-[#4a3522] text-[#a39482]'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xl">
                      {dice.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm font-serif text-white">{dice.name}</h4>
                      <p className="text-[11px] text-[#a39482] font-mono">{dice.desc}</p>
                    </div>
                  </div>
                  
                  {equippedDiceSkin === dice.id ? (
                    <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-mono font-bold uppercase">
                      EQUIPPED
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-[#d49e54] hover:text-white">
                      Equip
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Link to Shop for More Cosmetics */}
            {onNavigate && (
              <div className="p-3 bg-black/40 border border-[#2e2319] rounded-xl flex items-center justify-between">
                <span className="text-xs font-mono text-[#a39482]">Looking for more cosmetics &amp; skins?</span>
                <button
                  onClick={() => onNavigate('shop')}
                  className="text-xs font-mono text-[#d49e54] hover:text-white font-bold flex items-center space-x-1"
                >
                  <span>Visit Market</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 4: CAREER STATS & TELEMETRY */}
      {activeTab === 'stats' && (
        <div className="space-y-6 bg-[#120d09] border border-[#2e2319] rounded-2xl p-6 shadow-xl animate-in fade-in duration-150">
          
          {/* Level Progression Banner */}
          <div className="bg-black/60 border border-[#2e2319] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping mr-1" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Level {user.level || 4} Commander Progression
                </span>
              </div>
              <span className="text-xs font-mono text-[#d49e54] font-bold">
                {user.xp || 3200} / 5,000 XP
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-zinc-950 border border-[#3e2e21] overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                style={{ width: `${Math.min(100, Math.round(((user.xp || 3200) / 5000) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-1">
              <span>Current Level Reward Claimed</span>
              <span>Next Level Reward: +200 💎 Aether Cores • Epic Title</span>
            </div>
          </div>

          {/* Grid of Key Combat Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-black/60 border border-[#2e2319] rounded-xl p-4 text-center">
              <span className="text-[10px] font-mono uppercase text-[#a39482] block">Competitive ELO</span>
              <span className="text-2xl font-black font-mono text-white">1,480</span>
              <span className="text-[10px] font-mono text-amber-400 block mt-0.5">Vanguard Division</span>
            </div>

            <div className="bg-black/60 border border-[#2e2319] rounded-xl p-4 text-center">
              <span className="text-[10px] font-mono uppercase text-[#a39482] block">Battles Fought</span>
              <span className="text-2xl font-black font-mono text-white">60</span>
              <span className="text-[10px] font-mono text-emerald-400 block mt-0.5">42 Wins • 18 Defeats</span>
            </div>

            <div className="bg-black/60 border border-[#2e2319] rounded-xl p-4 text-center">
              <span className="text-[10px] font-mono uppercase text-[#a39482] block">Win Rate</span>
              <span className="text-2xl font-black font-mono text-emerald-400">70.0%</span>
              <span className="text-[10px] font-mono text-zinc-500 block mt-0.5">Global Top 8%</span>
            </div>

            <div className="bg-black/60 border border-[#2e2319] rounded-xl p-4 text-center">
              <span className="text-[10px] font-mono uppercase text-[#a39482] block">Current Streak</span>
              <span className="text-2xl font-black font-mono text-rose-400 flex items-center justify-center">
                <Flame className="w-5 h-5 mr-1 text-rose-500 fill-rose-500" /> 5
              </span>
              <span className="text-[10px] font-mono text-rose-300 block mt-0.5">Best Streak: 9</span>
            </div>
          </div>

          {/* Account Security, Role Clearance & Account Switching Panel */}
          <div className="border-t border-[#2e2319] pt-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-sm font-serif text-white uppercase tracking-wider">
                  Account Clearance &amp; Authentication Control
                </h4>
              </div>

              {user.role === 'admin' ? (
                <span className="px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-500 text-amber-300 font-mono font-bold text-xs flex items-center space-x-1.5 shadow">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>SYSTEM ADMINISTRATOR (UNRESTRICTED)</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-750 text-zinc-300 font-mono font-bold text-xs flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  <span>STANDARD PLAYER CLEARANCE</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Box 1: Current Session Info */}
              <div className="bg-black/50 border border-[#2e2319] rounded-xl p-3.5 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#a39482] block">Current Session</span>
                  <div className="text-xs font-mono font-bold text-white mt-0.5 truncate">{user.email}</div>
                  <span className="text-[10px] font-mono text-[#d49e54] block">Provider: {user.provider.toUpperCase()}</span>
                </div>
                {user.role === 'admin' && onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('admin')}
                    className="w-full py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:brightness-110 text-white font-mono text-xs font-bold rounded-lg shadow transition cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Enter Admin Console ↵</span>
                  </button>
                )}
              </div>

              {/* Box 2: Instant Role Switch (Demo Admin / Player) */}
              <div className="bg-black/50 border border-[#2e2319] rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-mono uppercase text-[#a39482] block">Instant Role Access (Testing)</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      const admin = await AuthService.signInAsDemoAdmin();
                      onUpdateUser(admin);
                      StorageService.saveUserProfile(admin);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2000);
                    }}
                    className="p-2 rounded-lg bg-rose-950/50 hover:bg-rose-900 border border-rose-700/80 text-left transition cursor-pointer group"
                  >
                    <div className="flex items-center space-x-1 text-[11px] font-bold text-rose-300 font-mono">
                      <span>👑</span>
                      <span>Admin</span>
                    </div>
                    <span className="text-[9px] text-rose-400 block font-mono">Unlock Admin Side</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const player = await AuthService.signInAsDemoPlayer();
                      onUpdateUser(player);
                      StorageService.saveUserProfile(player);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2000);
                    }}
                    className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left transition cursor-pointer group"
                  >
                    <div className="flex items-center space-x-1 text-[11px] font-bold text-zinc-300 font-mono">
                      <span>🛡️</span>
                      <span>Player</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 block font-mono">Standard Gated</span>
                  </button>
                </div>
              </div>

              {/* Box 3: Switch Account & Sign Out Actions */}
              <div className="bg-black/50 border border-[#2e2319] rounded-xl p-3.5 flex flex-col justify-between space-y-2">
                <span className="text-[10px] font-mono uppercase text-[#a39482] block">Account Credentials</span>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => onSwitchAccount ? onSwitchAccount() : onOpenAuth && onOpenAuth()}
                    className="w-full py-1.5 px-3 bg-zinc-850 hover:bg-zinc-750 border border-zinc-700 text-xs font-bold font-mono text-zinc-200 hover:text-white rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Switch Account / Sign In</span>
                  </button>

                  {onSignOut && (
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="w-full py-1.5 px-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 text-xs font-bold font-mono rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
