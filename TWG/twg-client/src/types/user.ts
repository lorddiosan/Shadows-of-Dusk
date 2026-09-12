export type UserRole = 'player' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  displayName: string;
  avatarUrl: string;
  role: UserRole;
  provider: 'supabase' | 'google' | 'guest';
  crystalShards: number;  // Standard earnable currency
  aetherCores: number;    // Premium currency
  level: number;
  xp: number;
  unlockedItems: string[];
  equippedBoardSkin: string;
  equippedDiceSkin: string;
}

export interface BattlePassTier {
  tier: number;
  xpRequired: number;
  freeReward: {
    id: string;
    name: string;
    type: 'shards' | 'aether' | 'cosmetic' | 'title';
    amount?: number;
    icon: string;
  };
  premiumReward: {
    id: string;
    name: string;
    type: 'shards' | 'aether' | 'cosmetic' | 'dice' | 'board' | 'title';
    amount?: number;
    icon: string;
  };
}

export interface ShopItem {
  id: string;
  name: string;
  category: 'board' | 'dice' | 'card_sleeve' | 'avatar';
  description: string;
  priceShards?: number;
  priceAether?: number;
  previewColor: string;
  icon: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Mythic';
}
