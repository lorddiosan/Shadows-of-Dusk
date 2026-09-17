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
    supportedModes: ['1v1', 'tournament'],
    recommendedMode: '1v1',
    maxPlayers: 2,
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
    supportedModes: ['1v1', 'tournament'],
    recommendedMode: '1v1',
    maxPlayers: 2,
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
    supportedModes: ['1v1', 'tournament'],
    recommendedMode: '1v1',
    maxPlayers: 2,
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
  },
  {
    id: 'map_convergance_coliseum_2v2',
    name: 'Twin Bastions of Convergence (2v2)',
    theme: 'Gothic Ruins',
    width: 1600,
    height: 1000,
    supportedModes: ['2v2', 'tournament'],
    recommendedMode: '2v2',
    maxPlayers: 4,
    description: 'A sprawling 1600x1000 battlefield engineered for 2v2 allied operations. Features dual northern and southern deployment perches, a contested center bridge, and twin fortified bastions.',
    deploymentZones: {
      player1: { minX: 0, maxX: 260, minY: 0, maxY: 460, label: 'Team Alpha (P1) - North Bastion' },
      player3: { minX: 0, maxX: 260, minY: 540, maxY: 1000, label: 'Team Alpha (P3) - South Bastion' },
      player2: { minX: 1340, maxX: 1600, minY: 0, maxY: 460, label: 'Team Omega (P2) - North Redoubt' },
      player4: { minX: 1340, maxX: 1600, minY: 540, maxY: 1000, label: 'Team Omega (P4) - South Redoubt' },
      teamA: { minX: 0, maxX: 260, minY: 0, maxY: 1000, label: 'Team Alpha Front' },
      teamB: { minX: 1340, maxX: 1600, minY: 0, maxY: 1000, label: 'Team Omega Front' }
    },
    objectives: [
      { id: 'obj_bridge', name: 'High Convergence Span', x: 800, y: 500, radius: 85, pointsValue: 15 },
      { id: 'obj_n_spire', name: 'North Power Conduit', x: 800, y: 180, radius: 65, pointsValue: 10 },
      { id: 'obj_s_spire', name: 'South Catacomb Vault', x: 800, y: 820, radius: 65, pointsValue: 10 },
      { id: 'obj_w_depot', name: 'Alpha Supply Cache', x: 420, y: 500, radius: 55, pointsValue: 5 },
      { id: 'obj_e_depot', name: 'Omega Supply Cache', x: 1180, y: 500, radius: 55, pointsValue: 5 }
    ],
    terrain: [
      { id: 't_bridge1', name: 'Center Bridge Arch', type: 'Ruins', x: 740, y: 460, width: 120, height: 80, coverBonus: 1, blocksMovement: false, color: '#854d0e' },
      { id: 't_alpha_tow1', name: 'Alpha North Watchtower', type: 'Watchtower', x: 320, y: 220, width: 80, height: 80, coverBonus: 2, blocksLineOfSight: true, color: '#f59e0b' },
      { id: 't_alpha_tow2', name: 'Alpha South Watchtower', type: 'Watchtower', x: 320, y: 780, width: 80, height: 80, coverBonus: 2, blocksLineOfSight: true, color: '#f59e0b' },
      { id: 't_omega_tow1', name: 'Omega North Sentry', type: 'Watchtower', x: 1200, y: 220, width: 80, height: 80, coverBonus: 2, blocksLineOfSight: true, color: '#38bdf8' },
      { id: 't_omega_tow2', name: 'Omega South Sentry', type: 'Watchtower', x: 1200, y: 780, width: 80, height: 80, coverBonus: 2, blocksLineOfSight: true, color: '#38bdf8' },
      { id: 't_crag_mid1', name: 'Central Basalt Ridge N', type: 'Basalt Crag', x: 620, y: 320, width: 110, height: 60, coverBonus: 1, blocksMovement: true, color: '#475569' },
      { id: 't_crag_mid2', name: 'Central Basalt Ridge S', type: 'Basalt Crag', x: 980, y: 680, width: 110, height: 60, coverBonus: 1, blocksMovement: true, color: '#475569' }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'map_trinity_spire_3way',
    name: 'Trinity Spire Crater (3-Way Battle)',
    theme: 'Volcanic',
    width: 1400,
    height: 1200,
    supportedModes: ['3way', 'tournament'],
    recommendedMode: '3way',
    maxPlayers: 3,
    description: 'A massive 1400x1200 volcanic caldera built for 3-way triangular warfare. Three factions deploy in a 120° triad around the central King-of-the-Hill Aether Spire.',
    deploymentZones: {
      player1: { minX: 450, maxX: 950, minY: 0, maxY: 220, label: 'Zenith Apex (Commander 1)' },
      player2: { minX: 950, maxX: 1400, minY: 920, maxY: 1200, label: 'Obsidian Trench (Commander 2)' },
      player3: { minX: 0, maxX: 450, minY: 920, maxY: 1200, label: 'Cinder Basin (Commander 3)' }
    },
    objectives: [
      { id: 'obj_tri_center', name: 'King of the Hill - Crown Spire', x: 700, y: 640, radius: 90, pointsValue: 20 },
      { id: 'obj_tri_ne', name: 'Pyre Siphon East', x: 1060, y: 440, radius: 60, pointsValue: 8 },
      { id: 'obj_tri_nw', name: 'Pyre Siphon West', x: 340, y: 440, radius: 60, pointsValue: 8 },
      { id: 'obj_tri_s', name: 'Magma Basin Siphon', x: 700, y: 1040, radius: 60, pointsValue: 8 }
    ],
    terrain: [
      { id: 't_volc_spire', name: 'Crater Aether Spire', type: 'Ruins', x: 650, y: 590, width: 100, height: 100, coverBonus: 2, blocksLineOfSight: true, color: '#dc2626' },
      { id: 't_crag_n', name: 'Zenith Rampart', type: 'High Ground', x: 620, y: 280, width: 160, height: 50, coverBonus: 1, color: '#7f1d1d' },
      { id: 't_crag_se', name: 'Obsidian Monolith', type: 'Basalt Crag', x: 920, y: 780, width: 100, height: 80, coverBonus: 1, blocksMovement: true, color: '#334155' },
      { id: 't_crag_sw', name: 'Cinder Monolith', type: 'Basalt Crag', x: 380, y: 780, width: 100, height: 80, coverBonus: 1, blocksMovement: true, color: '#334155' }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'map_quadrant_ruins_4ffa',
    name: 'Ashen Crossroads (4-Player FFA)',
    theme: 'Wasteland',
    width: 1400,
    height: 1400,
    supportedModes: ['4ffa', 'tournament'],
    recommendedMode: '4ffa',
    maxPlayers: 4,
    description: 'A vast 1400x1400 four-quadrant colosseum for intense 4-player free-for-all deathmatches. Each commander controls a corner stronghold converging on the central monument.',
    deploymentZones: {
      player1: { minX: 0, maxX: 300, minY: 0, maxY: 300, label: 'North-West Citadel (P1)' },
      player2: { minX: 1100, maxX: 1400, minY: 1100, maxY: 1400, label: 'South-East Citadel (P2)' },
      player3: { minX: 1100, maxX: 1400, minY: 0, maxY: 300, label: 'North-East Citadel (P3)' },
      player4: { minX: 0, maxX: 300, minY: 1100, maxY: 1400, label: 'South-West Citadel (P4)' }
    },
    objectives: [
      { id: 'obj_nexus', name: 'Central Convergence Nexus', x: 700, y: 700, radius: 85, pointsValue: 20 },
      { id: 'obj_card_n', name: 'Northern Relic Arch', x: 700, y: 250, radius: 55, pointsValue: 6 },
      { id: 'obj_card_s', name: 'Southern Relic Arch', x: 700, y: 1150, radius: 55, pointsValue: 6 },
      { id: 'obj_card_w', name: 'Western Relic Arch', x: 250, y: 700, radius: 55, pointsValue: 6 },
      { id: 'obj_card_e', name: 'Eastern Relic Arch', x: 1150, y: 700, radius: 55, pointsValue: 6 }
    ],
    terrain: [
      { id: 't_cross_hub', name: 'Colosseum Grand Dais', type: 'Ruins', x: 640, y: 640, width: 120, height: 120, coverBonus: 1, color: '#ca8a04' },
      { id: 't_barr_nw', name: 'NW Angle Trench', type: 'Barricade', x: 420, y: 420, width: 100, height: 35, coverBonus: 1, color: '#78350f' },
      { id: 't_barr_ne', name: 'NE Angle Trench', type: 'Barricade', x: 880, y: 420, width: 100, height: 35, coverBonus: 1, color: '#78350f' },
      { id: 't_barr_se', name: 'SE Angle Trench', type: 'Barricade', x: 880, y: 940, width: 100, height: 35, coverBonus: 1, color: '#78350f' },
      { id: 't_barr_sw', name: 'SW Angle Trench', type: 'Barricade', x: 420, y: 940, width: 100, height: 35, coverBonus: 1, color: '#78350f' },
      { id: 't_tower_n', name: 'North Vantage Tower', type: 'Watchtower', x: 700, y: 430, width: 70, height: 70, coverBonus: 2, blocksLineOfSight: true, color: '#eab308' },
      { id: 't_tower_s', name: 'South Vantage Tower', type: 'Watchtower', x: 700, y: 970, width: 70, height: 70, coverBonus: 2, blocksLineOfSight: true, color: '#eab308' }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'map_apex_championship_stadium',
    name: 'Grand Apex Coliseum (Tournament Championship)',
    theme: 'Gothic Ruins',
    width: 1200,
    height: 800,
    supportedModes: ['tournament', '1v1', '2v2'],
    recommendedMode: 'tournament',
    maxPlayers: 4,
    description: 'Esports-grade symmetrical tournament stadium with standardized sightlines, cover, and dual podiums engineered for Solo, 2v2, and Team tournament brackets.',
    deploymentZones: {
      player1: { minX: 0, maxX: 200, minY: 0, maxY: 800, label: 'Challenger Gate (Alpha)' },
      player2: { minX: 1000, maxX: 1200, minY: 0, maxY: 800, label: 'Champion Gate (Omega)' },
      player3: { minX: 0, maxX: 200, minY: 420, maxY: 800, label: 'Challenger Duo Gate' },
      player4: { minX: 1000, maxX: 1200, minY: 420, maxY: 800, label: 'Champion Duo Gate' },
      teamA: { minX: 0, maxX: 200, minY: 0, maxY: 800, label: 'Challenger Bracket Front' },
      teamB: { minX: 1000, maxX: 1200, minY: 0, maxY: 800, label: 'Champion Bracket Front' }
    },
    objectives: [
      { id: 'obj_apex_trophy', name: 'Apex Championship Pedestal', x: 600, y: 400, radius: 75, pointsValue: 12 },
      { id: 'obj_apex_flank_n', name: 'Crown Flank North', x: 600, y: 160, radius: 50, pointsValue: 6 },
      { id: 'obj_apex_flank_s', name: 'Crown Flank South', x: 600, y: 640, radius: 50, pointsValue: 6 }
    ],
    terrain: [
      { id: 't_apex_p1', name: 'Symmetrical Obelisk West', type: 'Ruins', x: 380, y: 360, width: 60, height: 80, coverBonus: 1, blocksMovement: true, color: '#64748b' },
      { id: 't_apex_p2', name: 'Symmetrical Obelisk East', type: 'Ruins', x: 760, y: 360, width: 60, height: 80, coverBonus: 1, blocksMovement: true, color: '#64748b' },
      { id: 't_apex_wt1', name: 'Championship Sentry North', type: 'Watchtower', x: 560, y: 260, width: 80, height: 80, coverBonus: 2, blocksLineOfSight: true, color: '#d49e54' },
      { id: 't_apex_wt2', name: 'Championship Sentry South', type: 'Watchtower', x: 560, y: 540, width: 80, height: 80, coverBonus: 2, blocksLineOfSight: true, color: '#d49e54' }
    ],
    createdAt: new Date().toISOString()
  }
];


