import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../services/authService';
import { StorageService } from '../../services/storageService';
import { UserProfile } from '../../types/user';
import { Faction, UnitTemplate } from '../../types/game';

describe('AUTH-001 - AUTH-010: Authentication, Profile & Access Control Tests', () => {
  beforeEach(async () => {
    // Reset to a clean guest state before each test
    await AuthService.signOut();
  });

  describe('AUTH-001 - AUTH-007: Basic Auth & Profile Operations', () => {
    it('initializes default session as a guest with player role', () => {
      const user = AuthService.getCurrentUser();
      expect(user).toBeDefined();
      expect(user.role).toBe('player');
      expect(user.provider).toBe('guest');
      expect(user.displayName).toBe('Guest Commander');
    });

    it('registers a new account and signs in with player role (AUTH-001, AUTH-002)', async () => {
      const res = await AuthService.signUp(
        'recruit_test@warpath.game',
        'securePass123!',
        'Vanguard Officer',
        'FrontlineRecruit'
      );

      expect(res.error).toBeNull();
      expect(res.user).toBeDefined();
      expect(res.user?.email).toBe('recruit_test@warpath.game');
      expect(res.user?.role).toBe('player');
      expect(res.user?.username).toBe('FrontlineRecruit');
      expect(res.user?.displayName).toBe('Vanguard Officer');

      // Check current user in AuthService
      const current = AuthService.getCurrentUser();
      expect(current.email).toBe('recruit_test@warpath.game');
    });

    it('supports sign in with existing credentials (AUTH-002)', async () => {
      // First sign up
      await AuthService.signUp('player_test2@warpath.game', 'pass123', 'Player Two', 'PlayerTwo');
      
      // Sign out
      await AuthService.signOut();
      expect(AuthService.getCurrentUser().provider).toBe('guest');

      // Sign in again
      const signedIn = await AuthService.signIn('player_test2@warpath.game', 'pass123');
      expect(signedIn.error).toBeNull();
      expect(signedIn.user?.email).toBe('player_test2@warpath.game');
      expect(signedIn.user?.username).toBe('PlayerTwo');
      expect(AuthService.getCurrentUser().email).toBe('player_test2@warpath.game');
    });

    it('allows signing out and returns to guest account (AUTH-003)', async () => {
      await AuthService.signIn('commander@warpath.game', 'player123');
      expect(AuthService.getCurrentUser().role).toBe('player');

      const guest = await AuthService.signOut();
      expect(guest.provider).toBe('guest');
      expect(guest.role).toBe('player');
      expect(AuthService.getCurrentUser().provider).toBe('guest');
    });

    it('requests password reset without throwing (AUTH-004)', async () => {
      const res = await AuthService.resetPassword('commander@warpath.game');
      expect(res.success).toBe(true);
    });

    it('preserves user profile mutations in storage (AUTH-005, AUTH-006)', () => {
      const user = AuthService.getCurrentUser();
      const updated: UserProfile = {
        ...user,
        crystalShards: 1500,
        aetherCores: 250,
        unlockedItems: ['custom_dice_flame']
      };

      StorageService.saveUserProfile(updated);
      const loaded = StorageService.getUserProfile();
      expect(loaded.crystalShards).toBe(1500);
      expect(loaded.aetherCores).toBe(250);
      expect(loaded.unlockedItems).toContain('custom_dice_flame');
    });

    it('supports Google OAuth sign-in and generates a valid user profile (AUTH-011, AUTH-012)', async () => {
      const res = await AuthService.signInWithGoogle();
      expect(res.error).toBeNull();
      expect(res.user).toBeDefined();
      expect(res.user?.provider).toBe('google');
      expect(res.user?.role).toBe('player');
      expect(res.user?.email).toContain('google');
      expect(res.user?.username).toBeDefined();

      // Verify Google user profile is persisted in storage
      const stored = StorageService.getUserProfile();
      expect(stored.provider).toBe('google');
      expect(stored.id).toBe(res.user?.id);
    });
  });

  describe('AUTH-008 - AUTH-010: Role-Based Access Control & Strict Security Gating', () => {
    it('grants admin role when logging in with admin credentials', async () => {
      const res = await AuthService.signIn('admin@warpath.game', 'admin123');
      expect(res.user?.role).toBe('admin');
      expect(AuthService.getCurrentUser().role).toBe('admin');
    });

    it('enforces AUTH-010: StorageService.assertIsAdmin() throws for non-admin accounts', async () => {
      // Guest / player
      await AuthService.signOut();
      expect(() => StorageService.assertIsAdmin()).toThrowError(/AUTH-010 Security Error/);
    });

    it('enforces AUTH-010: Regular players are strictly blocked from creating or modifying factions', async () => {
      // Set user to regular player
      await AuthService.signOut();
      const regularPlayer: UserProfile = {
        ...AuthService.getCurrentUser(),
        id: 'player_test_id',
        role: 'player'
      };
      StorageService.saveUserProfile(regularPlayer);

      const fakeFaction: Faction = {
        id: 'hacked_faction',
        name: 'Exploit Legion',
        themeColor: '#ff0000',
        lore: 'Should never be allowed',
        rules: []
      };

      // Attempting to save faction as player must throw an explicit error
      expect(() => {
        StorageService.saveFaction(fakeFaction);
      }).toThrowError(/AUTH-010 Security Error/);

      // Verify faction was not created
      const factions = StorageService.getFactions();
      expect(factions.find(f => f.id === 'hacked_faction')).toBeUndefined();
    });

    it('enforces AUTH-010: Regular players are strictly blocked from creating or modifying unit templates', async () => {
      // Set user to regular player
      await AuthService.signOut();
      const regularPlayer: UserProfile = {
        ...AuthService.getCurrentUser(),
        id: 'player_test_id_2',
        role: 'player'
      };
      StorageService.saveUserProfile(regularPlayer);

      const fakeUnit: UnitTemplate = {
        id: 'hacked_unit',
        name: 'God Mode Titan',
        factionId: 'ember_vanguard',
        role: 'Leader',
        baseCost: 0,
        stats: {
          movement: 20,
          wounds: 999,
          save: 1,
          bravery: 12,
          modelCount: 1,
          baseSizeMm: 40
        },
        weapons: [],
        abilities: []
      };

      // Attempting to save unit template as player must throw
      expect(() => {
        StorageService.saveUnitTemplate(fakeUnit);
      }).toThrowError(/AUTH-010 Security Error/);

      // Verify template was not created
      const templates = StorageService.getUnitTemplates();
      expect(templates.find(u => u.id === 'hacked_unit')).toBeUndefined();
    });

    it('enforces AUTH-010: Regular players are strictly blocked from deleting factions or units', async () => {
      await AuthService.signOut();
      const regularPlayer: UserProfile = {
        ...AuthService.getCurrentUser(),
        role: 'player'
      };
      StorageService.saveUserProfile(regularPlayer);

      expect(() => {
        StorageService.deleteFaction('ember_vanguard');
      }).toThrowError(/AUTH-010 Security Error/);

      expect(() => {
        StorageService.deleteUnitTemplate('iron_sentinel');
      }).toThrowError(/AUTH-010 Security Error/);
    });

    it('allows verified admin to perform mutations safely', async () => {
      const res = await AuthService.signIn('admin@warpath.game', 'admin123');
      expect(res.user?.role).toBe('admin');
      expect(AuthService.getCurrentUser().role).toBe('admin');

      const testFaction: Faction = {
        id: 'admin_test_faction',
        name: 'Admin Test Order',
        themeColor: '#7c3aed',
        lore: 'Created legitimately by admin',
        rules: []
      };

      // Admin saving should succeed without throwing
      expect(() => {
        StorageService.saveFaction(testFaction);
      }).not.toThrow();

      // Verify it was saved
      const factions = StorageService.getFactions();
      expect(factions.find(f => f.id === 'admin_test_faction')).toBeDefined();

      // Admin deleting should succeed
      expect(() => {
        StorageService.deleteFaction('admin_test_faction');
      }).not.toThrow();

      const factionsAfterDelete = StorageService.getFactions();
      expect(factionsAfterDelete.find(f => f.id === 'admin_test_faction')).toBeUndefined();
    });
  });
});
