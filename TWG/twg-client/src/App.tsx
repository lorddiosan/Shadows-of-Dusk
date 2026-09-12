import React, { useState, useEffect } from 'react';
import { Navbar } from './components/navigation/Navbar';
import { WarRoomHome } from './components/home/WarRoomHome';
import { Battlefield } from './components/game/Battlefield';
import { ArmyBuilder } from './components/builder/ArmyBuilder';
import { Shop } from './components/shop/Shop';
import { BattlePass } from './components/battlepass/BattlePass';
import { LoreCodex } from './components/codex/LoreCodex';
import { AdminPanel } from './components/admin/AdminPanel';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/auth/ProfileModal';
import { MatchmakingModal } from './components/matchmaking/MatchmakingModal';
import { DuelZoneModal } from './components/matchmaking/DuelZoneModal';
import { AuthService } from './services/authService';
import { StorageService } from './services/storageService';
import { UserProfile, ShopItem } from './types/user';
import { ArmyRoster } from './types/army';

export function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'play' | 'builder' | 'shop' | 'battlepass' | 'lore' | 'admin'>('home');
  const [user, setUser] = useState<UserProfile>(() => AuthService.getCurrentUser());
  const [activeBattleRoster, setActiveBattleRoster] = useState<ArmyRoster | null>(null);
  const [matchmakingRoster, setMatchmakingRoster] = useState<ArmyRoster | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMatchmakingModalOpen, setIsMatchmakingModalOpen] = useState(false);
  const [isDuelZoneOpen, setIsDuelZoneOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // Subscribe to auth state changes from Supabase / AuthService
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChange((updatedUser) => {
      setUser(updatedUser);
    });
    return () => unsubscribe();
  }, []);

  // AUTH-009 / AUTH-010: Route Guard: If user is not admin, kick out of admin tab
  useEffect(() => {
    if (currentTab === 'admin' && user.role !== 'admin') {
      setCurrentTab('home');
    }
  }, [currentTab, user.role]);

  // Sync user profile changes to local storage
  useEffect(() => {
    StorageService.saveUserProfile(user);
  }, [user]);

  const handleSetTab = (tab: 'home' | 'play' | 'builder' | 'shop' | 'battlepass' | 'lore' | 'admin') => {
    // AUTH-009: Prevent non-admin access to admin tab
    if (tab === 'admin' && user.role !== 'admin') {
      setIsAuthModalOpen(true);
      return;
    }
    setCurrentTab(tab);
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
        setTab={handleSetTab}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      <main className={`flex-1 ${currentTab === 'play' ? 'overflow-hidden' : 'pb-16'}`}>
        {currentTab === 'home' && (
          <WarRoomHome
            onNavigate={handleSetTab}
            onSelectArmyToDeploy={(roster) => {
              setActiveBattleRoster(roster);
              setCurrentTab('play');
            }}
            onStartMatchmaking={(roster) => {
              setMatchmakingRoster(roster);
              setIsMatchmakingModalOpen(true);
            }}
            onOpenDuelZone={() => setIsDuelZoneOpen(true)}
          />
        )}

        {currentTab === 'play' && (
          <Battlefield
            key={`battle_${dataVersion}`}
            customRoster={activeBattleRoster}
            boardSkin={user.equippedBoardSkin}
            onReturnHome={() => setCurrentTab('home')}
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

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setIsAuthModalOpen(false);
        }}
      />

      {/* User Profile & Credentials Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onSignOut={async () => {
          const guest = await AuthService.signOut();
          setUser(guest);
          setIsProfileModalOpen(false);
        }}
        onSwitchAccount={() => {
          setIsProfileModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      {/* 1v1 Matchmaking Radar Modal */}
      {isMatchmakingModalOpen && (
        <MatchmakingModal
          isOpen={isMatchmakingModalOpen}
          onClose={() => setIsMatchmakingModalOpen(false)}
          user={user}
          roster={matchmakingRoster || StorageService.getRosters()[0]}
          onMatchFound={() => {
            setActiveBattleRoster(matchmakingRoster || StorageService.getRosters()[0]);
            setIsMatchmakingModalOpen(false);
            setCurrentTab('play');
          }}
        />
      )}

      {/* Duel Zone Arena Modal (UI-007 revised) */}
      <DuelZoneModal
        isOpen={isDuelZoneOpen}
        onClose={() => setIsDuelZoneOpen(false)}
        user={user}
        rosters={StorageService.getRosters()}
        selectedRoster={matchmakingRoster || StorageService.getRosters()[0]}
        onSelectRoster={(roster) => setMatchmakingRoster(roster)}
        onStart1v1Matchmaking={(roster) => {
          setMatchmakingRoster(roster);
          setIsMatchmakingModalOpen(true);
        }}
        onStartAiSkirmish={(roster) => {
          setActiveBattleRoster(roster);
          setCurrentTab('play');
        }}
        onOpenArmyBuilder={() => setCurrentTab('builder')}
      />
    </div>
  );
}

export default App;
