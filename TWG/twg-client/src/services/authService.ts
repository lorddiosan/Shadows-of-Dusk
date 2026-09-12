import { UserProfile, UserRole } from '../types/user';
import { StorageService } from './storageService';
import { supabase, isLiveSupabaseConfigured } from './supabaseClient';

export const AuthService = {
  getCurrentUser(): UserProfile {
    return StorageService.getUserProfile();
  },

  async signUp(email: string, password: string, displayName?: string, username?: string, role: UserRole = 'player'): Promise<{ user: UserProfile | null; error: Error | null }> {
    try {
      const cleanUsername = username?.trim() || email.split('@')[0];
      const cleanDisplayName = displayName?.trim() || cleanUsername;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
            display_name: cleanDisplayName,
            role
          }
        }
      });

      if (error) return { user: null, error };
      if (!data.user) return { user: null, error: new Error('Failed to create user account') };

      const profile: UserProfile = {
        id: data.user.id,
        email: data.user.email || email,
        username: cleanUsername,
        displayName: cleanDisplayName,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
        role,
        provider: 'supabase',
        crystalShards: 1000,
        aetherCores: 100,
        level: 1,
        xp: 0,
        unlockedItems: ['board_crimson_foundry', 'dice_brass_steam'],
        equippedBoardSkin: 'board_crimson_foundry',
        equippedDiceSkin: 'dice_brass_steam'
      };

      StorageService.saveUserProfile(profile);
      return { user: profile, error: null };
    } catch (err: any) {
      return { user: null, error: err };
    }
  },

  async signIn(email: string, password: string): Promise<{ user: UserProfile | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) return { user: null, error };
      if (!data.user) return { user: null, error: new Error('Failed to sign in') };

      const meta = data.user.user_metadata || {};
      const role: UserRole = meta.role || (email.toLowerCase().includes('admin') ? 'admin' : 'player');
      const cleanUsername = meta.username || email.split('@')[0];
      const cleanDisplayName = meta.display_name || cleanUsername;

      const existingProfile = StorageService.getUserProfile();
      const profile: UserProfile = {
        id: data.user.id,
        email: data.user.email || email,
        username: cleanUsername,
        displayName: cleanDisplayName,
        avatarUrl: meta.avatar_url || existingProfile.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
        role,
        provider: 'supabase',
        crystalShards: existingProfile.crystalShards || 1250,
        aetherCores: existingProfile.aetherCores || 200,
        level: existingProfile.level || 1,
        xp: existingProfile.xp || 0,
        unlockedItems: existingProfile.unlockedItems || ['board_crimson_foundry', 'dice_brass_steam'],
        equippedBoardSkin: existingProfile.equippedBoardSkin || 'board_crimson_foundry',
        equippedDiceSkin: existingProfile.equippedDiceSkin || 'dice_brass_steam'
      };

      StorageService.saveUserProfile(profile);
      return { user: profile, error: null };
    } catch (err: any) {
      return { user: null, error: err };
    }
  },

  async signInWithGoogle(): Promise<{ user: UserProfile | null; error: Error | null }> {
    try {
      if (isLiveSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : ''
          }
        });
        if (error) return { user: null, error };
        return { user: null, error: null };
      }

      // Offline / dev mock Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) return { user: null, error };

      const googleUser: UserProfile = {
        id: 'usr_google_' + Math.random().toString(36).substring(2, 8),
        username: 'google_commander',
        email: 'commander.google@gmail.com',
        displayName: 'Google Commander',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=GoogleCommander',
        role: 'player',
        provider: 'google',
        crystalShards: 1250,
        aetherCores: 200,
        level: 2,
        xp: 1200,
        unlockedItems: ['board_crimson_foundry', 'dice_brass_steam'],
        equippedBoardSkin: 'board_crimson_foundry',
        equippedDiceSkin: 'dice_brass_steam'
      };

      StorageService.saveUserProfile(googleUser);
      return { user: googleUser, error: null };
    } catch (err: any) {
      return { user: null, error: err };
    }
  },

  async signOut(): Promise<UserProfile> {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    const guestUser: UserProfile = {
      id: 'usr_guest_' + Math.random().toString(36).substring(2, 7),
      username: 'guest_commander',
      email: 'guest@dusk.skirmish',
      displayName: 'Guest Commander',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest',
      role: 'player',
      provider: 'guest',
      crystalShards: 500,
      aetherCores: 50,
      level: 1,
      xp: 0,
      unlockedItems: ['dice_brass_steam'],
      equippedBoardSkin: 'board_crimson_foundry',
      equippedDiceSkin: 'dice_brass_steam'
    };
    StorageService.saveUserProfile(guestUser);
    return guestUser;
  },

  async resetPassword(email: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) return { success: false, error };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },

  // One-click demo accounts for quick testing of AUTH-008, AUTH-009, AUTH-010
  async signInAsDemoAdmin(): Promise<UserProfile> {
    const adminUser: UserProfile = {
      id: 'usr_admin_warpath',
      username: 'high_arbiter',
      email: 'admin@warpath.game',
      displayName: 'Grand Overseer (Admin)',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=AdminWarpath',
      role: 'admin',
      provider: 'supabase',
      crystalShards: 99999,
      aetherCores: 9999,
      level: 50,
      xp: 150000,
      unlockedItems: ['board_crimson_foundry', 'dice_brass_steam', 'board_astraea_isles', 'dice_ethereal_crystal'],
      equippedBoardSkin: 'board_crimson_foundry',
      equippedDiceSkin: 'dice_brass_steam'
    };
    StorageService.saveUserProfile(adminUser);
    return adminUser;
  },

  async signInAsDemoPlayer(): Promise<UserProfile> {
    const playerUser: UserProfile = {
      id: 'usr_player_strike',
      username: 'vanguard_operative',
      email: 'commander@warpath.game',
      displayName: 'Vanguard Operative',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=PlayerStrike',
      role: 'player',
      provider: 'supabase',
      crystalShards: 1500,
      aetherCores: 150,
      level: 3,
      xp: 2400,
      unlockedItems: ['board_crimson_foundry', 'dice_brass_steam'],
      equippedBoardSkin: 'board_crimson_foundry',
      equippedDiceSkin: 'dice_brass_steam'
    };
    StorageService.saveUserProfile(playerUser);
    return playerUser;
  },

  onAuthStateChange(callback: (user: UserProfile) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange(async () => {
      const current = AuthService.getCurrentUser();
      callback(current);
    });
    return () => {
      data?.subscription?.unsubscribe();
    };
  }
};
