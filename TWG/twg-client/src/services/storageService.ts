import { UserProfile } from '../types/user';
import { ArmyRoster, FactionInfo } from '../types/army';
import { Unit, BattleMap } from '../types/game';
import { FACTIONS, UNIT_TEMPLATES } from '../data/factions';
import { safeStorage } from './supabaseClient';

const USER_STORAGE_KEY = 'sod_user_profile_v1';
const ROSTERS_STORAGE_KEY = 'sod_army_rosters_v1';
const CUSTOM_FACTIONS_KEY = 'sod_custom_factions_v1';
const CUSTOM_UNITS_KEY = 'sod_custom_units_v1';
const MAPS_STORAGE_KEY = 'sod_battle_maps_v1';

const DEFAULT_PROFILE: UserProfile = {
  id: 'usr_guest_01',
  username: 'dusk_commander',
  email: 'commander@convergence.war',
  displayName: 'Dusk Commander',
  avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=DuskCommander',
  role: 'player',
  provider: 'guest',
  crystalShards: 1250,
  aetherCores: 200,
  level: 4,
  xp: 3200,
  unlockedItems: ['board_crimson_foundry', 'dice_brass_steam'],
  equippedBoardSkin: 'board_crimson_foundry',
  equippedDiceSkin: 'dice_brass_steam',
  claimedPassTiers: []
};

function getDefaultPresetArmies(): ArmyRoster[] {
  const allTemplates = UNIT_TEMPLATES;
  const buildRoster = (id: string, name: string, factionId: string, tags: string[], pointsLimit: number): ArmyRoster => {
    const factionTemplates = allTemplates.filter(u => u.factionId === factionId);
    const units: Unit[] = factionTemplates.slice(0, 5).map((u, i) => ({
      ...u,
      id: `${id}_unit_${i}`,
      owner: 'player1' as const,
      position: null,
      tokens: []
    }));
    const totalPoints = units.reduce((sum, u) => sum + (u.points || 0), 0);
    return {
      id,
      name,
      factionId,
      tags,
      maxPoints: pointsLimit,
      totalPoints,
      units,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  return [
    buildRoster('roster_crimson_vanguard', 'Crimson Vanguard Strike', 'crimson_empire', ['Aggro', '500 pts', 'Armored'], 500),
    buildRoster('roster_astraea_dawn', 'Astraea Dawn Vigil', 'daughters_astraea', ['Balanced', '500 pts', 'Mobile'], 500),
    buildRoster('roster_infernal_phalanx', 'Infernal Rift March', 'infernal_crusades', ['Siege', '500 pts', 'Brute'], 500),
    buildRoster('roster_ironclad_bastion', 'Deep Bastion Shieldwall', 'iron_clad_holds', ['Defensive', '500 pts', 'Siege'], 500),
    buildRoster('roster_chronarch_loom', 'Chronarch Loom Wardens', 'chronarch_conclave', ['Elite', '500 pts', 'Ranged'], 500)
  ];
}

export const StorageService = {
  getUserProfile(): UserProfile {
    try {
      const data = safeStorage.getItem(USER_STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    return DEFAULT_PROFILE;
  },

  saveUserProfile(profile: UserProfile): void {
    try {
      safeStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  },

  getRosters(): ArmyRoster[] {
    try {
      const data = safeStorage.getItem(ROSTERS_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((r: ArmyRoster) => ({
            ...r,
            units: (r.units || []).map(u => {
              const tpl = UNIT_TEMPLATES.find(t => t.templateId === u.templateId || t.name === u.name);
              return {
                ...u,
                abilities: (u.abilities && u.abilities.length > 0) ? u.abilities : (tpl?.abilities || []),
                traits: (u.traits && u.traits.length > 0) ? u.traits : (tpl?.traits || [])
              };
            })
          }));
        }
      }
    } catch {
      // ignore
    }
    const presets = getDefaultPresetArmies();
    try {
      safeStorage.setItem(ROSTERS_STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // ignore
    }
    return presets;
  },

  saveRoster(roster: ArmyRoster): void {
    const rosters = this.getRosters();
    const index = rosters.findIndex(r => r.id === roster.id);
    if (index >= 0) {
      rosters[index] = roster;
    } else {
      rosters.push(roster);
    }
    safeStorage.setItem(ROSTERS_STORAGE_KEY, JSON.stringify(rosters));
  },

  deleteRoster(rosterId: string): void {
    const rosters = this.getRosters().filter(r => r.id !== rosterId);
    safeStorage.setItem(ROSTERS_STORAGE_KEY, JSON.stringify(rosters));
  },

  // Admin Custom Factions
  getFactions(): FactionInfo[] {
    try {
      const custom = safeStorage.getItem(CUSTOM_FACTIONS_KEY);
      if (custom) {
        const parsed = JSON.parse(custom);
        // Combine base with custom
        const customIds = new Set(parsed.map((f: FactionInfo) => f.id));
        const nonDuplicateBase = FACTIONS.filter(f => !customIds.has(f.id));
        return [...nonDuplicateBase, ...parsed];
      }
    } catch {
      // ignore
    }
    return FACTIONS;
  },

  assertIsAdmin(): void {
    const profile = this.getUserProfile();
    if (profile.role !== 'admin') {
      throw new Error('AUTH-010 Security Error: Unauthorized action. Only administrators can modify factions and unit templates.');
    }
  },

  saveFaction(faction: FactionInfo): void {
    this.assertIsAdmin();
    try {
      const existing = this.getCustomFactionsOnly();
      const index = existing.findIndex(f => f.id === faction.id);
      if (index >= 0) {
        existing[index] = faction;
      } else {
        existing.push(faction);
      }
      safeStorage.setItem(CUSTOM_FACTIONS_KEY, JSON.stringify(existing));
    } catch (err: any) {
      if (err.message?.includes('AUTH-010')) throw err;
    }
  },

  getCustomFactionsOnly(): FactionInfo[] {
    try {
      const custom = safeStorage.getItem(CUSTOM_FACTIONS_KEY);
      if (custom) return JSON.parse(custom);
    } catch {
      // ignore
    }
    return [];
  },

  deleteFaction(factionId: string): void {
    this.assertIsAdmin();
    try {
      const existing = this.getCustomFactionsOnly().filter(f => f.id !== factionId);
      safeStorage.setItem(CUSTOM_FACTIONS_KEY, JSON.stringify(existing));
    } catch (err: any) {
      if (err.message?.includes('AUTH-010')) throw err;
    }
  },

  // Admin Custom Units
  getUnitTemplates(): Unit[] {
    try {
      const custom = safeStorage.getItem(CUSTOM_UNITS_KEY);
      if (custom) {
        const parsed = JSON.parse(custom);
        const customIds = new Set(parsed.map((u: Unit) => u.templateId));
        const nonDuplicateBase = UNIT_TEMPLATES.filter(u => !customIds.has(u.templateId));
        return [...nonDuplicateBase, ...parsed];
      }
    } catch {
      // ignore
    }
    return UNIT_TEMPLATES;
  },

  saveUnitTemplate(unit: Unit): void {
    this.assertIsAdmin();
    try {
      const existing = this.getCustomUnitsOnly();
      const index = existing.findIndex(u => u.templateId === unit.templateId);
      if (index >= 0) {
        existing[index] = unit;
      } else {
        existing.push(unit);
      }
      safeStorage.setItem(CUSTOM_UNITS_KEY, JSON.stringify(existing));
    } catch (err: any) {
      if (err.message?.includes('AUTH-010')) throw err;
    }
  },

  deleteUnitTemplate(templateId: string): void {
    this.assertIsAdmin();
    try {
      const existing = this.getCustomUnitsOnly().filter(u => u.templateId !== templateId);
      safeStorage.setItem(CUSTOM_UNITS_KEY, JSON.stringify(existing));
    } catch (err: any) {
      if (err.message?.includes('AUTH-010')) throw err;
    }
  },

  getCustomUnitsOnly(): Unit[] {
    try {
      const custom = safeStorage.getItem(CUSTOM_UNITS_KEY);
      if (custom) return JSON.parse(custom);
    } catch {
      // ignore
    }
    return [];
  },

  // Battle Maps Management
  getMaps(): BattleMap[] {
    try {
      const custom = safeStorage.getItem(MAPS_STORAGE_KEY);
      if (custom) {
        const parsed: BattleMap[] = JSON.parse(custom);
        const customIds = new Set(parsed.map(m => m.id));
        const nonDuplicatePresets = PRESET_MAPS.filter(m => !customIds.has(m.id));
        return [...parsed, ...nonDuplicatePresets];
      }
    } catch {
      // ignore
    }
    return PRESET_MAPS;
  },

  getCustomMapsOnly(): BattleMap[] {
    try {
      const custom = safeStorage.getItem(MAPS_STORAGE_KEY);
      if (custom) return JSON.parse(custom);
    } catch {
      // ignore
    }
    return [];
  },

  saveMap(map: BattleMap): boolean {
    try {
      const existing = this.getCustomMapsOnly();
      const index = existing.findIndex(m => m.id === map.id);
      const toSave: BattleMap = { ...map, isCustom: true, createdAt: map.createdAt || new Date().toISOString() };
      if (index >= 0) {
        existing[index] = toSave;
      } else {
        existing.unshift(toSave);
      }
      safeStorage.setItem(MAPS_STORAGE_KEY, JSON.stringify(existing));
      return true;
    } catch (err) {
      console.warn('Failed to save battle map to storage:', err);
      return false;
    }
  },

  deleteMap(mapId: string): void {
    try {
      const existing = this.getCustomMapsOnly().filter(m => m.id !== mapId);
      safeStorage.setItem(MAPS_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // ignore
    }
  }
};

export const PRESET_MAPS: BattleMap[] = [
  {
    id: 'map_crimson_foundry',
    name: 'Crimson Foundry Basin',
    theme: 'Industrial',
    width: 1200,
    height: 800,
    description: 'Soot-blackened iron smelting plants with basalt ridges and heavy defensive watchtowers.',
    deploymentZones: {
      player1: { minX: 0, maxX: 200, minY: 0, maxY: 800, label: 'West Flank' },
      player2: { minX: 1000, maxX: 1200, minY: 0, maxY: 800, label: 'East Flank' }
    },
    objectives: [
      { id: 'obj_center', name: 'Aether Well', x: 600, y: 400, radius: 70, pointsValue: 10 },
      { id: 'obj_north', name: 'Primary Smelter', x: 450, y: 220, radius: 60, pointsValue: 5 },
      { id: 'obj_south', name: 'Slag Trench', x: 750, y: 580, radius: 60, pointsValue: 5 }
    ],
    terrain: [
      { id: 't_wt1', name: 'North Watchtower', type: 'Watchtower', x: 500, y: 150, width: 80, height: 80, coverBonus: 1, blocksLineOfSight: true, color: '#f59e0b' },
      { id: 't_bc1', name: 'Basalt Crag West', type: 'Basalt Crag', x: 340, y: 460, width: 100, height: 70, coverBonus: 1, blocksMovement: true, color: '#475569' },
      { id: 't_bc2', name: 'Basalt Crag East', type: 'Basalt Crag', x: 860, y: 340, width: 90, height: 60, coverBonus: 1, blocksMovement: true, color: '#475569' },
      { id: 't_ruin1', name: 'Shattered Foundry Hall', type: 'Ruins', x: 600, y: 400, width: 140, height: 90, coverBonus: 1, blocksMovement: false, color: '#b91c1c' }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'map_astraea_mire',
    name: 'Astraea Sunken Mire',
    theme: 'Verdant Forest',
    width: 1200,
    height: 800,
    description: 'A flooded holy grove where ancient stone monoliths rise out of murky water.',
    deploymentZones: {
      player1: { minX: 0, maxX: 220, minY: 0, maxY: 800, label: 'Dawn Marsh' },
      player2: { minX: 980, maxX: 1200, minY: 0, maxY: 800, label: 'Dusk Reed' }
    },
    objectives: [
      { id: 'obj_center', name: 'Sunken Reliquary', x: 600, y: 400, radius: 70, pointsValue: 10 },
      { id: 'obj_north', name: 'Verdant Monolith', x: 380, y: 260, radius: 60, pointsValue: 5 },
      { id: 'obj_south', name: 'Lotus Basin', x: 820, y: 540, radius: 60, pointsValue: 5 }
    ],
    terrain: [
      { id: 't_mire1', name: 'Flooded Mire Central', type: 'Flooded Mire', x: 600, y: 400, width: 160, height: 120, coverBonus: 0, blocksMovement: false, color: '#047857' },
      { id: 't_ruin2', name: 'Monolith Pillars', type: 'Ruins', x: 380, y: 260, width: 100, height: 80, coverBonus: 1, color: '#065f46' },
      { id: 't_wt2', name: 'Shrine Watchtower', type: 'Watchtower', x: 720, y: 200, width: 70, height: 70, coverBonus: 1, blocksLineOfSight: true, color: '#f59e0b' },
      { id: 't_barr1', name: 'Timber Barricade', type: 'Barricade', x: 500, y: 560, width: 120, height: 40, coverBonus: 1, color: '#78350f' }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'map_iron_bastion',
    name: 'Iron Citadel Gate',
    theme: 'Gothic Ruins',
    width: 1200,
    height: 800,
    description: 'A colossal mountain fortress gate flanked by elevated firing perches and defensive bunkers.',
    deploymentZones: {
      player1: { minX: 0, maxX: 200, minY: 0, maxY: 800, label: 'Outer Approach' },
      player2: { minX: 1000, maxX: 1200, minY: 0, maxY: 800, label: 'Inner Courtyard' }
    },
    objectives: [
      { id: 'obj_center', name: 'Grand Portcullis', x: 600, y: 400, radius: 80, pointsValue: 10 },
      { id: 'obj_north', name: 'North Ballista Emplacement', x: 420, y: 200, radius: 55, pointsValue: 5 },
      { id: 'obj_south', name: 'South Bunker Core', x: 780, y: 600, radius: 55, pointsValue: 5 }
    ],
    terrain: [
      { id: 't_wt3', name: 'Bastion Sentry Tower', type: 'Watchtower', x: 600, y: 220, width: 90, height: 90, coverBonus: 2, blocksLineOfSight: true, color: '#38bdf8' },
      { id: 't_hg1', name: 'High Rampart Ridge', type: 'High Ground', x: 600, y: 580, width: 180, height: 60, coverBonus: 1, color: '#334155' },
      { id: 't_ruin3', name: 'Outer Defense Wall', type: 'Ruins', x: 450, y: 400, width: 40, height: 160, coverBonus: 1, blocksMovement: true, color: '#64748b' },
      { id: 't_ruin4', name: 'Inner Defense Wall', type: 'Ruins', x: 750, y: 400, width: 40, height: 160, coverBonus: 1, blocksMovement: true, color: '#64748b' }
    ],
    createdAt: new Date().toISOString()
  }
];

