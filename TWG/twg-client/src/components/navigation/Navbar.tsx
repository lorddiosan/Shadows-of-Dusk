import React from 'react';
import { Swords, Shield, ShoppingBag, Award, BookOpen, Settings, Compass, Home, Crosshair, User, Users } from 'lucide-react';
import { UserProfile } from '../../types/user';

interface NavbarProps {
  currentTab: 'home' | 'matchmaking' | 'play' | 'builder' | 'guilds' | 'shop' | 'battlepass' | 'lore' | 'profile' | 'admin';
  setTab: (tab: 'home' | 'matchmaking' | 'play' | 'builder' | 'guilds' | 'shop' | 'battlepass' | 'lore' | 'profile' | 'admin') => void;
  user: UserProfile;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setTab,
  user,
  onOpenAuth,
  onOpenProfile
}) => {
  return (
    <header className={`w-full sticky top-0 z-50 px-3 py-2 flex items-center justify-between shadow-lg select-none transition-colors duration-300 ${
      currentTab === 'home'
        ? 'bg-black/60 backdrop-blur-md border-b border-white/10'
        : 'bg-[#110e0b] border-b border-[#2e2319]'
    }`}>
      {/* Brand Title / Home link */}
      <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setTab('home')}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#9a281e] to-[#c94a29] flex items-center justify-center shadow-md border border-[#e07b53]/40">
          <span className="text-base">⚔️</span>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-black text-sm tracking-wider text-[#f4efe6] uppercase font-serif">WARPATH</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#241710] text-[#d49e54] border border-[#593d28] font-mono">Dusk Core</span>
          </div>
        </div>
      </div>

      {/* Main Tabs (Configured: Home Page -> Matchmaking -> Battlefield -> Armies -> Guilds -> ...) */}
      <nav className="flex items-center space-x-1 sm:space-x-1.5">
        <button
          onClick={() => setTab('home')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
            currentTab === 'home'
              ? 'bg-[#9a281e] text-white shadow-md border border-[#c94a29]/60'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#241710]'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setTab('matchmaking')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
            currentTab === 'matchmaking'
              ? 'bg-[#9a281e] text-white shadow-md border border-[#c94a29]/60'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#241710]'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Matchmaking</span>
        </button>

        <button
          onClick={() => setTab('play')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
            currentTab === 'play'
              ? 'bg-[#9a281e] text-white shadow-md border border-[#c94a29]/60'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#241710]'
          }`}
        >
          <Swords className="w-3.5 h-3.5" />
          <span>Battlefield</span>
        </button>

        <button
          onClick={() => setTab('builder')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
            currentTab === 'builder'
              ? 'bg-[#9a281e] text-white shadow-md border border-[#c94a29]/60'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#241710]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Armies</span>
        </button>

        <button
          onClick={() => setTab('guilds')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
            currentTab === 'guilds'
              ? 'bg-[#9a281e] text-white shadow-md border border-[#c94a29]/60'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#241710]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Guilds</span>
        </button>

        <button
          onClick={() => setTab('battlepass')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
            currentTab === 'battlepass'
              ? 'bg-[#c97229] text-white shadow-md border border-[#e07b53]/60'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#241710]'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Battle Pass</span>
        </button>

        <button
          onClick={() => setTab('shop')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
            currentTab === 'shop'
              ? 'bg-[#9a281e] text-white shadow-md border border-[#c94a29]/60'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#241710]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Market</span>
        </button>

        <button
          onClick={() => setTab('lore')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
            currentTab === 'lore'
              ? 'bg-[#6a297e] text-white shadow-md border border-[#9a4ab5]/60'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#241710]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Codex</span>
        </button>

        <button
          onClick={() => setTab('profile')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
            currentTab === 'profile'
              ? 'bg-[#9a281e] text-white shadow-md border border-[#c94a29]/60'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#241710]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile</span>
        </button>

        {/* AUTH-009: Admin Tab strictly gated to role === 'admin' */}
        {user.role === 'admin' && (
          <button
            onClick={() => setTab('admin')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
              currentTab === 'admin'
                ? 'bg-[#297e4a] text-white shadow-md border border-[#4ab575]/60'
                : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#241710]'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 font-mono font-bold">CROWN</span>
          </button>
        )}
      </nav>

      {/* Currencies & User Profile Button */}
      <div className="flex items-center space-x-2.5">
        <div className="flex items-center space-x-2 bg-[#17100b] border border-[#332216] px-2.5 py-1 rounded-md text-[11px] font-mono">
          <div className="flex items-center space-x-1 text-[#e07b53]">
            <span>🩸</span>
            <span className="font-bold">{user.crystalShards.toLocaleString()}</span>
          </div>
          <span className="text-[#593d28]">|</span>
          <div className="flex items-center space-x-1 text-[#d49e54]">
            <span>💎</span>
            <span className="font-bold">{user.aetherCores.toLocaleString()}</span>
          </div>
        </div>

        {/* User Badge / Authentication Trigger */}
        <button
          type="button"
          onClick={onOpenProfile || onOpenAuth}
          className="flex items-center space-x-2 bg-[#241710] hover:bg-[#332216] border border-[#593d28] hover:border-[#e07b53]/60 px-2 py-1 rounded-lg transition cursor-pointer group"
          title="Open Commander Profile / Security"
        >
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-700 object-cover"
          />
          <div className="text-left hidden sm:block">
            <span className="text-xs font-bold text-[#f4efe6] group-hover:text-amber-300 transition block leading-none font-mono">
              {user.displayName.split(' ')[0]}
            </span>
            <span className={`text-[8px] font-mono block uppercase font-bold ${
              user.role === 'admin' ? 'text-amber-400' : 'text-zinc-400'
            }`}>
              {user.role === 'admin' ? '👑 Admin' : '🛡️ Player'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
