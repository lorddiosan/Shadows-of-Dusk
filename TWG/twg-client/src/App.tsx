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
import { MatchmakingPage } from './components/matchmaking/MatchmakingPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { GuildPage } from './components/guild/GuildPage';
import { AuthService } from './services/authService';
import { StorageService } from './services/storageService';
import { UserProfile, ShopItem } from './types/user';
import { ArmyRoster } from './types/army';

const VALID_TABS = ['home', 'matchmaking', 'play', 'builder', 'guilds', 'shop', 'battlepass', 'lore', 'profile', 'admin'] as const;
type TabType = typeof VALID_TABS[number];

function getInitialTab(): TabType {
  try {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (VALID_TABS.includes(hash as TabType)) {
        return hash as TabType;
      }
      const saved = localStorage.getItem('twg_active_tab');
      if (saved && VALID_TABS.includes(saved as TabType)) {
        return saved as TabType;
      }
    }
  } catch {
    // fallback
  }
  return 'home';
}

export function App() {
  const [currentTab, setCurrentTab] = useState<TabType>(getInitialTab);
  const [user, setUser] = useState<UserProfile>(() => AuthService.getCurrentUser());
  const [activeBattleRoster, setActiveBattleRoster] = useState<ArmyRoster | null>(null);
  const [matchmakingRoster, setMatchmakingRoster] = useState<ArmyRoster | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMatchmakingModalOpen, setIsMatchmakingModalOpen] = useState(false);
  const [isDuelZoneOpen, setIsDuelZoneOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [activeBattleMapId, setActiveBattleMapId] = useState<string | undefined>(undefined);
  const [pvpBattleConfig, setPvpBattleConfig] = useState<{
    isPvP?: boolean;
    matchId?: string;
    playerRole?: 'player1' | 'player2';
    opponentRoster?: ArmyRoster;
    opponentCommander?: any;
    coinWinner?: 'player1' | 'player2';
  } | null>(null);

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

  // Sync tab with URL hash and localStorage without triggering hashchange loops
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const targetHash = `#${currentTab}`;
        if (window.location.hash !== targetHash) {
          window.history.replaceState(null, '', targetHash);
        }
        localStorage.setItem('twg_active_tab', currentTab);
      }
    } catch {
      // ignore
    }
  }, [currentTab]);

  // Listen for browser back/forward and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      try {
        const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
        if (VALID_TABS.includes(hash as TabType)) {
          if (hash === 'admin' && user.role !== 'admin') {
            setIsAuthModalOpen(true);
            setCurrentTab('home');
          } else {
            setCurrentTab(prev => (prev === hash ? prev : (hash as TabType)));
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user.role]);

  // Sync user profile changes to local storage
  useEffect(() => {
    StorageService.saveUserProfile(user);
  }, [user]);

  const handleSetTab = (tab: TabType) => {
    // AUTH-009: Prevent non-admin access to admin tab
    if (tab === 'admin' && user.role !== 'admin') {
      setIsAuthModalOpen(true);
      return;
    }
    setCurrentTab(tab);
    try {
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `#${tab}`);
        localStorage.setItem('twg_active_tab', tab);
      }
    } catch {
      // ignore
    }
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
    if (user.claimedPassTiers?.includes(tier)) return;
    setUser(prev => ({
      ...prev,
      crystalShards: prev.crystalShards + (tier * 50),
      aetherCores: isPremium && tier % 5 === 0 ? prev.aetherCores + 100 : prev.aetherCores,
      claimedPassTiers: [...(prev.claimedPassTiers || []), tier]
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

  const rostersList = StorageService.getRosters();
  const fallbackPresetRoster: ArmyRoster = {
    id: 'roster_fallback',
    name: 'Convergence Battlegroup',
    factionId: 'crimson_empire',
    factionName: 'Crimson Empire',
    totalPoints: 500,
    maxPoints: 500,
    units: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const activeRosterForMatchmaking = matchmakingRoster || activeBattleRoster || rostersList[0] || fallbackPresetRoster;

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col selection:bg-rose-600 selection:text-white">
      <Navbar
        currentTab={currentTab}
        setTab={handleSetTab}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      <main className={`flex-1 ${currentTab === 'play' || currentTab === 'home' ? 'overflow-hidden' : 'pb-16'}`}>
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
            onOpenDuelZone={() => handleSetTab('matchmaking')}
          />
        )}

        {currentTab === 'play' && (
          <Battlefield
            key={`battle_${dataVersion}_${activeBattleMapId || 'default'}_${pvpBattleConfig?.matchId || 'local'}`}
            customRoster={activeBattleRoster}
            boardSkin={user.equippedBoardSkin}
            initialMapId={activeBattleMapId}
            isPvP={pvpBattleConfig?.isPvP}
            matchId={pvpBattleConfig?.matchId}
            playerRole={pvpBattleConfig?.playerRole}
            opponentRoster={pvpBattleConfig?.opponentRoster}
            opponentCommander={pvpBattleConfig?.opponentCommander}
            coinWinner={pvpBattleConfig?.coinWinner}
            onReturnHome={() => {
              setPvpBattleConfig(null);
              setCurrentTab('home');
            }}
          />
        )}

        {currentTab === 'matchmaking' && (
          <MatchmakingPage
            user={user}
            rosters={rostersList}
            activeRoster={activeRosterForMatchmaking}
            onSelectRoster={(roster) => setMatchmakingRoster(roster)}
            onDeployToBattle={(roster, opponent, mapId, pvpConfig) => {
              setActiveBattleRoster(roster);
              if (mapId) setActiveBattleMapId(mapId);
              setPvpBattleConfig({
                isPvP: pvpConfig?.isPvP ?? false,
                matchId: pvpConfig?.matchId,
                playerRole: pvpConfig?.playerRole,
                opponentRoster: pvpConfig?.opponentRoster,
                opponentCommander: opponent,
                coinWinner: pvpConfig?.coinWinner
              });
              setCurrentTab('play');
            }}
            onNavigate={handleSetTab}
          />
        )}

        {currentTab === 'builder' && (
          <ArmyBuilder
            key={`builder_${dataVersion}`}
            onDeployRosterToBattle={handleDeployRosterToBattle}
          />
        )}

        {currentTab === 'guilds' && (
          <GuildPage
            user={user}
            onUpdateUser={(updated) => setUser(updated)}
            onNavigate={handleSetTab}
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

        {currentTab === 'profile' && (
          <ProfilePage
            user={user}
            onUpdateUser={(updated) => setUser(updated)}
            rosters={StorageService.getRosters()}
            onNavigate={handleSetTab}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onSwitchAccount={() => setIsAuthModalOpen(true)}
            onSignOut={async () => {
              const guest = await AuthService.signOut();
              setUser(guest);
            }}
          />
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
        onOpenAdmin={() => {
          setIsProfileModalOpen(false);
          handleSetTab('admin');
        }}
        onOpenFullProfile={() => {
          setIsProfileModalOpen(false);
          handleSetTab('profile');
        }}
        onQuickAdminLogin={async () => {
          const admin = await AuthService.signInAsDemoAdmin();
          setUser(admin);
        }}
        onQuickPlayerLogin={async () => {
          const player = await AuthService.signInAsDemoPlayer();
          setUser(player);
        }}
      />

      {/* 1v1 Matchmaking Radar Modal */}
      {isMatchmakingModalOpen && (
        <MatchmakingModal
          isOpen={isMatchmakingModalOpen}
          onClose={() => setIsMatchmakingModalOpen(false)}
          user={user}
          roster={activeRosterForMatchmaking}
          onMatchFound={() => {
            setActiveBattleRoster(activeRosterForMatchmaking);
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
        rosters={rostersList}
        selectedRoster={activeRosterForMatchmaking}
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
