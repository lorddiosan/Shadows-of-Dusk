import { UserProfile } from '../types/user';
import { StorageService } from './storageService';

export const AuthService = {
  getCurrentUser(): UserProfile {
    return StorageService.getUserProfile();
  },

  async signInWithGoogle(): Promise<UserProfile> {
    // Simulated Google OAuth Flow with realistic profile payload
    const googleUser: UserProfile = {
      id: 'g_' + Math.random().toString(36).substring(2, 9),
      email: 'alex.commander@gmail.com',
      displayName: 'Alex Vane (Google)',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexGoogle',
      provider: 'google',
      crystalShards: 2500,
      aetherCores: 500,
      level: 10,
      xp: 9500,
      unlockedItems: ['board_crimson_foundry', 'dice_brass_steam', 'board_astraea_isles', 'dice_ethereal_crystal'],
      equippedBoardSkin: 'board_crimson_foundry',
      equippedDiceSkin: 'dice_ethereal_crystal'
    };

    StorageService.saveUserProfile(googleUser);
    return googleUser;
  },

  signOut(): UserProfile {
    const guestUser: UserProfile = {
      id: 'usr_guest_' + Math.random().toString(36).substring(2, 7),
      email: 'guest@dusk.skirmish',
      displayName: 'Guest Commander',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest',
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
  }
};
