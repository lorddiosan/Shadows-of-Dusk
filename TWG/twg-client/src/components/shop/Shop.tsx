import React, { useState } from 'react';
import { ShoppingBag, Sparkles, Check, Gem } from 'lucide-react';
import { SHOP_ITEMS } from '../../data/gameContent';
import { ShopItem, UserProfile } from '../../types/user';

interface ShopProps {
  user: UserProfile;
  onPurchase: (item: ShopItem) => void;
  onEquip: (item: ShopItem) => void;
}

export const Shop: React.FC<ShopProps> = ({ user, onPurchase, onEquip }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'board' | 'dice' | 'card_sleeve' | 'token_border' | 'token_vfx'>('all');

  const filteredItems = activeCategory === 'all' 
    ? SHOP_ITEMS 
    : SHOP_ITEMS.filter(item => item.category === activeCategory);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-zinc-950 to-rose-950 border border-amber-900/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              <span>Imperial Bazaar of the Convergence</span>
            </div>
            <h1 className="text-3xl font-black text-white mt-1">Cosmetic Vault & War Stuffs</h1>
            <p className="text-xs text-zinc-300 max-w-lg mt-1">
              Enhance your battlefield with authentic faction board themes, weighted clockwork dice, and gilded card sleeves. All cosmetics are non-pay-to-win.
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-zinc-950/80 border border-amber-800/60 px-5 py-3 rounded-xl shadow-lg">
            <div className="flex items-center space-x-2 text-rose-300">
              <span className="text-lg">🩸</span>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase block font-mono">Shards</span>
                <span className="text-base font-black font-mono">{user.crystalShards.toLocaleString()}</span>
              </div>
            </div>
            <div className="w-[1px] h-8 bg-zinc-800"></div>
            <div className="flex items-center space-x-2 text-amber-300">
              <span className="text-lg">💎</span>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase block font-mono">Aether Cores</span>
                <span className="text-base font-black font-mono">{user.aetherCores.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
        {(['all', 'board', 'dice', 'card_sleeve', 'token_border', 'token_vfx'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeCategory === cat
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/60'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {cat === 'all'
              ? 'All Items'
              : cat === 'board'
              ? 'Battlefield Skins'
              : cat === 'dice'
              ? 'Dice Sets'
              : cat === 'card_sleeve'
              ? 'Card Sleeves'
              : cat === 'token_border'
              ? 'Unit Borders'
              : 'Visual Effects (VFX)'}
          </button>
        ))}
      </div>

      {/* Item Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => {
          const isUnlocked = user.unlockedItems.includes(item.id);
          const isEquipped = 
            (item.category === 'board' && user.equippedBoardSkin === item.id) ||
            (item.category === 'dice' && user.equippedDiceSkin === item.id);

          const canAffordShards = item.priceShards ? user.crystalShards >= item.priceShards : false;
          const canAffordAether = item.priceAether ? user.aetherCores >= item.priceAether : false;

          return (
            <div
              key={item.id}
              className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700 transition shadow-lg group relative overflow-hidden"
            >
              {/* Top Details */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    item.rarity === 'Mythic' ? 'bg-purple-950 text-purple-300 border border-purple-700' :
                    item.rarity === 'Epic' ? 'bg-rose-950 text-rose-300 border border-rose-700' :
                    'bg-zinc-800 text-zinc-300'
                  }`}>
                    {item.rarity}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                    {item.category}
                  </span>
                </div>

                {/* Preview Box */}
                <div
                  className="w-full h-36 rounded-xl flex flex-col items-center justify-center border border-zinc-800/80 mb-4 shadow-inner relative"
                  style={{ backgroundColor: item.previewColor }}
                >
                  <span className="text-5xl group-hover:scale-110 transition duration-200">{item.icon}</span>
                  {isEquipped && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded shadow">
                      ACTIVE
                    </div>
                  )}
                </div>

                <h3 className="text-base font-bold text-white">{item.name}</h3>
                <p className="text-xs text-zinc-400 mt-1 min-h-[36px]">{item.description}</p>
              </div>

              {/* Action Buttons & Pricing */}
              <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                {isUnlocked ? (
                  isEquipped ? (
                    <button disabled className="w-full py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 cursor-default">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Equipped</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onEquip(item)}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <span>Equip Skin</span>
                    </button>
                  )
                ) : (
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-mono text-sm font-bold">
                      {item.priceShards && (
                        <span className="text-rose-400 flex items-center">
                          🩸 {item.priceShards}
                        </span>
                      )}
                      {item.priceAether && (
                        <span className="text-amber-400 flex items-center ml-2">
                          💎 {item.priceAether}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onPurchase(item)}
                      disabled={!canAffordShards && !canAffordAether}
                      className={`px-4 py-2 rounded-xl text-xs font-bold shadow flex items-center space-x-1 transition ${
                        canAffordShards || canAffordAether
                          ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-amber-950/50'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
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
