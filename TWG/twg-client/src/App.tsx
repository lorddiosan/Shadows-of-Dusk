import React, { useState, useEffect } from 'react';
import { Navbar } from './components/navigation/Navbar';
import { WarRoomHome } from './components/home/WarRoomHome';
import { Battlefield } from './components/game/Battlefield';
import { ArmyBuilder } from './components/builder/ArmyBuilder';
import { Shop } from './components/shop/Shop';
import { BattlePass } from './components/battlepass/BattlePass';
import { LoreCodex } from './components/codex/LoreCodex';
import { AdminPanel } from './components/admin/AdminPanel';
import { AuthService } from './services/authService';
import { StorageService } from './services/storageService';
import { UserProfile, ShopItem } from './types/user';
import { ArmyRoster } from './types/army';

export function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'play' | 'builder' | 'shop' | 'battlepass' | 'lore' | 'admin'>('home');
  const [user, setUser] = useState<UserProfile>(() => AuthService.getCurrentUser());
  const [activeBattleRoster, setActiveBattleRoster] = useState<ArmyRoster | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  // Sync user profile changes to local storage
  useEffect(() => {
    StorageService.saveUserProfile(user);
  }, [user]);

  const handleGoogleSignIn = async () => {
    const signedInUser = await AuthService.signInWithGoogle();
    setUser(signedInUser);
  };

  const handleSignOut = () => {
    const guest = AuthService.signOut();
    setUser(guest);
  };

  const handleDeployRosterToBattle = (roster: ArmyRoster) => {
    setActiveBattleRoster(roster);
    setCurrentTab('play');
  };

  const handlePurchaseShopItem = (item: ShopItem) => {
    if (user.unlockedItems.includes(item.id)) return;

    let shardsCost = item.priceShards || 0;
    let aetherCost = item.priceAether || 0;

    if (user.crystalShards >= shardsCost && user.aetherCores >= aetherCost) {
      setUser(prev => ({
        ...prev,
        crystalShards: prev.crystalShards - shardsCost,
        aetherCores: prev.aetherCores - aetherCost,
        unlockedItems: [...prev.unlockedItems, item.id]
      }));
    }
  };

  const handleEquipShopItem = (item: ShopItem) => {
    setUser(prev => ({
      ...prev,
      equippedBoardSkin: item.category === 'board' ? item.id : prev.equippedBoardSkin,
      equippedDiceSkin: item.category === 'dice' ? item.id : prev.equippedDiceSkin
    }));
  };

  const handleClaimBattlePassReward = (tier: number, isPremium: boolean) => {
    setUser(prev => ({
      ...prev,
      crystalShards: prev.crystalShards + (tier * 50),
      aetherCores: isPremium && tier % 5 === 0 ? prev.aetherCores + 100 : prev.aetherCores
    }));
  };

  const handleUpgradeToPremium = () => {
    if (user.aetherCores >= 500 && !user.unlockedItems.includes('premium_pass_s1')) {
      setUser(prev => ({
        ...prev,
        aetherCores: prev.aetherCores - 500,
        unlockedItems: [...prev.unlockedItems, 'premium_pass_s1']
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col selection:bg-rose-600 selection:text-white">
      <Navbar
        currentTab={currentTab}
        setTab={setCurrentTab}
        user={user}
      />

      <main className={`flex-1 ${currentTab === 'play' ? 'overflow-hidden' : 'pb-16'}`}>
        {currentTab === 'home' && (
          <WarRoomHome
            onNavigate={setCurrentTab}
            onSelectArmyToDeploy={(roster) => {
              setActiveBattleRoster(roster);
              setCurrentTab('play');
            }}
          />
        )}

        {currentTab === 'play' && (
          <Battlefield
            key={`battle_${dataVersion}`}
            customRoster={activeBattleRoster}
            boardSkin={user.equippedBoardSkin}
          />
        )}

        {currentTab === 'builder' && (
          <ArmyBuilder
            key={`builder_${dataVersion}`}
            onDeployRosterToBattle={handleDeployRosterToBattle}
          />
        )}

        {currentTab === 'battlepass' && (
          <BattlePass
            user={user}
            onClaimReward={handleClaimBattlePassReward}
            onUpgradeToPremium={handleUpgradeToPremium}
          />
        )}

        {currentTab === 'shop' && (
          <Shop
            user={user}
            onPurchase={handlePurchaseShopItem}
            onEquip={handleEquipShopItem}
          />
        )}

        {currentTab === 'lore' && (
          <LoreCodex />
        )}

        {currentTab === 'admin' && (
          <AdminPanel
            onDataChanged={() => setDataVersion(v => v + 1)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
