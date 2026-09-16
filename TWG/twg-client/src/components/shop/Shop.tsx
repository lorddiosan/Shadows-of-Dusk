import React, { useState } from 'react';
import { ShoppingBag, Sparkles, Check, Gem, Shield, Dice5, Layers, Palette, Wand2 } from 'lucide-react';
import { SHOP_ITEMS } from '../../data/gameContent';
import { ShopItem, UserProfile } from '../../types/user';

interface ShopProps {
  user: UserProfile;
  onPurchase: (item: ShopItem) => void;
  onEquip: (item: ShopItem) => void;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Treasures', icon: Sparkles },
  { id: 'board', label: 'Battlefield Skins', icon: Shield },
  { id: 'dice', label: 'Dice Sets', icon: Dice5 },
  { id: 'card_sleeve', label: 'Card Sleeves', icon: Layers },
  { id: 'token_border', label: 'Unit Borders', icon: Palette },
  { id: 'token_vfx', label: 'Visual Effects', icon: Wand2 }
] as const;

const RARITY_THEMES: Record<string, { badge: string; topBar: string; borderHover: string }> = {
  Mythic: {
    badge: 'bg-gradient-to-r from-purple-950 via-fuchsia-950 to-purple-950 text-purple-200 border-purple-500/70 shadow-[0_0_10px_rgba(168,85,247,0.3)]',
    topBar: 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600',
    borderHover: 'hover:border-purple-500/60 hover:shadow-[0_12px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(168,85,247,0.2)]'
  },
  Epic: {
    badge: 'bg-gradient-to-r from-rose-950 via-red-950 to-rose-950 text-rose-200 border-rose-500/70 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
    topBar: 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-600',
    borderHover: 'hover:border-rose-500/60 hover:shadow-[0_12px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(244,63,94,0.2)]'
  },
  Rare: {
    badge: 'bg-gradient-to-r from-amber-950 via-yellow-950 to-amber-950 text-amber-200 border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.3)]',
    topBar: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600',
    borderHover: 'hover:border-amber-500/60 hover:shadow-[0_12px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.2)]'
  }
};

export const Shop: React.FC<ShopProps> = ({ user, onPurchase, onEquip }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'board' | 'dice' | 'card_sleeve' | 'token_border' | 'token_vfx'>('all');

  const filteredItems = activeCategory === 'all' 
    ? SHOP_ITEMS 
    : SHOP_ITEMS.filter(item => item.category === activeCategory);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 select-none">
      {/* ═══ Header Banner: Imperial Bazaar ═══ */}
      <div className="bg-gradient-to-br from-[#1c152c]/95 via-[#101222]/95 to-[#0a0c16]/95 border border-amber-900/40 shadow-[0_16px_50px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(251,191,36,0.15)] rounded-2xl p-6 md:p-8 relative overflow-hidden backdrop-blur-md">
        {/* Ambient atmospheric flares */}
        <div className="absolute -top-16 -left-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-widest font-mono drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Imperial Bazaar of the Convergence</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mt-1.5 tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              Cosmetic Vault &amp; War Stuffs
            </h1>
            <p className="text-xs text-zinc-300 max-w-xl mt-1.5 leading-relaxed font-sans">
              Enhance your battlefield with authentic faction board themes, weighted clockwork dice, and gilded card sleeves. All cosmetics are cosmetic-only and non-pay-to-win.
            </p>
          </div>

          {/* Jewel Treasury Capsules */}
          <div className="flex items-center space-x-3 bg-gradient-to-r from-[#0d0f1b]/95 via-[#131628]/95 to-[#0d0f1b]/95 border border-amber-900/40 px-5 py-3 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(251,191,36,0.1)] backdrop-blur-md">
            <div className="flex items-center space-x-3 text-rose-300">
              <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]">🩸</span>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block tracking-wider">Shards</span>
                <span className="text-lg font-black font-mono text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.3)]">
                  {user.crystalShards.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="w-px h-10 bg-gradient-to-b from-transparent via-amber-900/50 to-transparent mx-2" />

            <div className="flex items-center space-x-3 text-amber-300">
              <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">💎</span>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block tracking-wider">Aether Cores</span>
                <span className="text-lg font-black font-mono text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]">
                  {user.aetherCores.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Category Filter Chips ═══ */}
      <div className="flex flex-wrap items-center gap-2 border-b border-amber-900/25 pb-3">
        {CATEGORY_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 border cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black border-amber-300 font-black shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                  : 'bg-[#0f111d] hover:bg-[#161a2c] text-zinc-400 hover:text-white border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-zinc-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ Item Catalog Grid ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => {
          const isUnlocked = user.unlockedItems.includes(item.id);
          const isEquipped = 
            (item.category === 'board' && user.equippedBoardSkin === item.id) ||
            (item.category === 'dice' && user.equippedDiceSkin === item.id);

          const canAffordShards = item.priceShards ? user.crystalShards >= item.priceShards : false;
          const canAffordAether = item.priceAether ? user.aetherCores >= item.priceAether : false;

          const rarityTheme = RARITY_THEMES[item.rarity] || RARITY_THEMES['Rare'];

          return (
            <div
              key={item.id}
              className={`bg-gradient-to-br from-[#121526]/95 via-[#0e101d]/95 to-[#080a13]/95 border border-amber-900/35 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 shadow-[0_8px_25px_rgba(0,0,0,0.6)] group relative overflow-hidden hover:-translate-y-1 ${rarityTheme.borderHover}`}
            >
              {/* Top Rarity Colored Highlight Strip */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${rarityTheme.topBar}`} />

              {/* Top Details */}
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full border ${rarityTheme.badge}`}>
                    {item.rarity}
                  </span>
                  <span className="text-[10px] text-amber-700/80 uppercase tracking-widest font-mono font-bold">
                    {item.category.replace('_', ' ')}
                  </span>
                </div>

                {/* Preview Box with Atmospheric Radial Lighting & Frame */}
                <div
                  className="w-full h-38 rounded-xl flex flex-col items-center justify-center border border-amber-500/25 mb-4 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] relative overflow-hidden transition-all duration-300 group-hover:border-amber-500/50"
                  style={{
                    background: `radial-gradient(circle at center, ${item.previewColor}ee 0%, ${item.previewColor}55 45%, rgba(6,8,15,0.95) 100%)`
                  }}
                >
                  <span className="text-6xl filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] group-hover:scale-115 transition-transform duration-300 select-none pointer-events-none">
                    {item.icon}
                  </span>
                  {isEquipped && (
                    <div className="absolute top-2.5 right-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.6)] tracking-widest border border-emerald-300 flex items-center space-x-1">
                      <span>✓</span>
                      <span>ACTIVE</span>
                    </div>
                  )}
                </div>

                <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors tracking-wide">
                  {item.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 min-h-[36px] leading-relaxed font-sans">
                  {item.description}
                </p>
              </div>

              {/* Action Buttons & Pricing */}
              <div className="mt-5 pt-3.5 border-t border-amber-900/20 flex items-center justify-between">
                {isUnlocked ? (
                  isEquipped ? (
                    <button disabled className="w-full py-2 bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-bold font-mono rounded-xl flex items-center justify-center space-x-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)] cursor-default">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Equipped</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onEquip(item)}
                      className="w-full py-2 bg-gradient-to-b from-[#1c1f30] to-[#121422] hover:from-[#262c45] hover:to-[#171a2c] text-amber-300 hover:text-white border border-amber-500/40 hover:border-amber-400 text-xs font-bold font-mono rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-md active:scale-95"
                    >
                      <span>Equip Skin</span>
                    </button>
                  )
                ) : (
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-mono text-xs font-bold">
                      {item.priceShards && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-950/70 border border-rose-700/50 text-rose-300 flex items-center space-x-1 shadow-sm">
                          <span>🩸</span>
                          <span>{item.priceShards.toLocaleString()}</span>
                        </span>
                      )}
                      {item.priceAether && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-700/50 text-amber-300 flex items-center space-x-1 shadow-sm">
                          <span>💎</span>
                          <span>{item.priceAether.toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onPurchase(item)}
                      disabled={!canAffordShards && !canAffordAether}
                      className={`px-4 py-2 rounded-xl text-xs font-black shadow flex items-center space-x-1.5 transition ${
                        canAffordShards || canAffordAether
                          ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:via-amber-300 hover:to-amber-400 text-black border border-amber-300 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.35)] active:scale-95'
                          : 'bg-zinc-800/80 text-zinc-500 border border-zinc-750 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Unlock</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

