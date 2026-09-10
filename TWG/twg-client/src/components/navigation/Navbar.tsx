import React from 'react';
import { Swords, Shield, ShoppingBag, Award, BookOpen, Settings, Compass, Home } from 'lucide-react';
import { UserProfile } from '../../types/user';

interface NavbarProps {
  currentTab: 'home' | 'play' | 'builder' | 'shop' | 'battlepass' | 'lore' | 'admin';
  setTab: (tab: 'home' | 'play' | 'builder' | 'shop' | 'battlepass' | 'lore' | 'admin') => void;
  user: UserProfile;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setTab,
  user
}) => {
  return (
    <header className="w-full bg-[#110e0b] border-b border-[#2e2319] sticky top-0 z-50 px-3 py-2 flex items-center justify-between shadow-lg select-none">
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

      {/* Main Tabs */}
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
          <span>War Room</span>
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
          onClick={() => setTab('admin')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
            currentTab === 'admin'
              ? 'bg-[#297e4a] text-white shadow-md border border-[#4ab575]/60'
              : 'text-[#a39482] hover:text-[#f4efe6] hover:bg-[#241710]'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>
      </nav>

      {/* Currencies & Mode */}
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

        <div className="flex items-center space-x-1.5 bg-[#241710] border border-[#593d28] px-2 py-1 rounded-md text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-bold text-[#f4efe6] font-mono">Command</span>
        </div>
      </div>
    </header>
  );
};
