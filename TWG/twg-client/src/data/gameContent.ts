import { Card, GameEvent, POI, SpecialTile } from '../types/game';
import { BattlePassTier, ShopItem } from '../types/user';

// Draft v0.4 Cards: 6 General + Faction/Leader specific
export const GENERAL_CARDS: Card[] = [
  {
    id: 'gen_attrition',
    name: 'Tactical Attrition',
    type: 'General',
    description: 'Relentless offensive pressure.',
    objectiveText: 'Gain 1 point each time an enemy model loses 1 L (2 points if the target is a Character).',
    passiveReward: '+1 point per model L lost, +2 if Character.'
  },
  {
    id: 'gen_territory',
    name: 'Hold the High Spires',
    type: 'General',
    description: 'Control the focal points of the convergence.',
    objectiveText: 'Contest at least 2 Points of Interest at the end of the round.',
    passiveReward: '+2 victory points on round end if controlling 2+ POIs.'
  },
  {
    id: 'gen_linebreaker',
    name: 'Vanguard Breakthrough',
    type: 'General',
    description: 'Deep penetration into hostile territory.',
    objectiveText: 'Have at least 2 units in the enemy deployment half at end of round.',
    passiveReward: '+2 points per round achieved.'
  },
  {
    id: 'gen_headhunter',
    name: 'Slay the Warlord',
    type: 'General',
    description: 'Decapitate enemy command structure.',
    objectiveText: 'Destroy an enemy Character or Leader.',
    passiveReward: '+4 bonus victory points upon enemy Leader demise.'
  },
  {
    id: 'gen_iron_resolve',
    name: 'Unbreakable Bastion',
    type: 'General',
    description: 'Preserve your veteran battle cadre.',
    objectiveText: 'Lose no friendly models during this entire round.',
    passiveReward: '+2 points if 0 friendly models lost in the round.'
  },
  {
    id: 'gen_coordinated_strike',
    name: 'Combined Arms Doctrine',
    type: 'General',
    description: 'Synchronized ranged and melee combat.',
    objectiveText: 'Successfully resolve both a Ranged attack and an Engagement in the Action Phase in the same round.',
    passiveReward: '+1 bonus point per round.'
  }
];

// Secondary Tactical Mission Cards (Achieved via Action Phase "Mission Action")
export const SECONDARY_MISSION_CARDS: Card[] = [
  {
    id: 'sec_teleport_homer',
    name: 'Deploy Teleport Homers',
    type: 'SecondaryMission',
    description: 'Plant high-frequency recall transponders deep behind enemy lines.',
    objectiveText: 'An Infantry unit performs a Mission Action in the enemy deployment half. (+3 VP)',
    pointsValue: 3
  },
  {
    id: 'sec_investigate_archeotech',
    name: 'Investigate Ancient Archeotech',
    type: 'SecondaryMission',
    description: 'Analyze strange resonance patterns surrounding sacred monoliths and ancient ruins.',
    objectiveText: 'A unit performs a Mission Action within 60px of any Point of Interest or Special Tile. (+2 VP)',
    pointsValue: 2
  },
  {
    id: 'sec_establish_signal_array',
    name: 'Establish Signal Array',
    type: 'SecondaryMission',
    description: 'Raise battlefield communication relays on elevated terrain overlooks.',
    objectiveText: 'A unit performs a Mission Action while positioned on High Ground (Watchtower / Basalt Crag). (+2 VP)',
    pointsValue: 2
  },
  {
    id: 'sec_contain_rift',
    name: 'Contain the Infernal Rift',
    type: 'SecondaryMission',
    description: 'Channel stabilization wards into volatile dimensional tears.',
    objectiveText: 'A unit performs a Mission Action within 80px of a Rift Fracture. (+3 VP)',
    pointsValue: 3
  },
  {
    id: 'sec_dredge_mire',
    name: 'Scout the Shifting Mires',
    type: 'SecondaryMission',
    description: 'Chart treacherous wetland paths and recover sunken relics before the waters shift.',
    objectiveText: 'An Infantry unit performs a Mission Action in or adjacent to Flooded Mire. (+3 VP)',
    pointsValue: 3
  },
  {
    id: 'sec_sabotage_core',
    name: 'Sabotage Central Nexus',
    type: 'SecondaryMission',
    description: 'Disrupt the core aetheric energy flow in the heart of the battlefield.',
    objectiveText: 'A unit performs a Mission Action on the center Point of Interest. (+3 VP)',
    pointsValue: 3
  }
];

// Random Field Hazard & Environmental Effect Cards (Can shift terrain tiles & alter board hazards)
export const FIELD_EFFECT_CARDS: Card[] = [
  {
    id: 'field_shifting_mires',
    name: 'Shifting Mires Surge',
    type: 'FieldEffect',
    description: 'Subterranean tides surge through the wetlands.',
    objectiveText: 'The Flooded Mire and Sunken Crypt Trench dynamically shift to new coordinates across the battlefield!'
  },
  {
    id: 'field_rift_migration',
    name: 'Dimensional Rift Migration',
    type: 'FieldEffect',
    description: 'Unstable fault lines tear open at a new dimensional fracture.',
    objectiveText: 'The Rift Fracture relocates to a new focal coordinate on the battlefield.'
  },
  {
    id: 'field_tectonic_fault',
    name: 'Tectonic Tremor',
    type: 'FieldEffect',
    description: 'A violent tremor shakes the earth, altering high ground vantage points.',
    objectiveText: 'Watchtowers and crags shift elevations and positions.'
  },
  {
    id: 'field_acid_monsoon',
    name: 'Corrosive Acid Monsoon',
    type: 'FieldEffect',
    description: 'Chemical deluge sweeps over open terrain.',
    objectiveText: 'All units outside structures suffer 1 Life damage unless CP + Def > 6.'
  },
  {
    id: 'field_dense_fog',
    name: 'Convergence Mists',
    type: 'FieldEffect',
    description: 'Thick violet fog rolls in, blinding long-range spotters.',
    objectiveText: 'All ranged attacks suffer -2 squares maximum range for 2 rounds.'
  },
  {
    id: 'field_mana_flare',
    name: 'Aetherial Aurora Flare',
    type: 'FieldEffect',
    description: 'A wave of ambient magic washes over the battleline.',
    objectiveText: 'All units restore 1 CP and gain 1 Advantage stack on their next action.'
  }
];

export const FACTION_CARDS: Record<string, Card[]> = {
  crimson_empire: [
    {
      id: 'crimson_alchemic_overdrive',
      name: 'Alchemic Reactor Overdrive',
      type: 'Faction',
      factionId: 'crimson_empire',
      description: 'Vent raw crimson steam to overload pistons.',
      objectiveText: 'Friendly Vehicles gain +2 Movement and +1 AM this round.',
      onReplaceTrigger: 'When replaced: All Infantry on board cannot move for 1 turn due to blinding steam.'
    },
    {
      id: 'crimson_divine_harvest',
      name: 'Harvest the Flawed Reality',
      type: 'Faction',
      factionId: 'crimson_empire',
      description: 'Extract divine crystal essence from defeated foes.',
      objectiveText: 'Each killed enemy unit generates +1 bonus victory point.',
      onReplaceTrigger: 'When replaced: Warmaster heals 1 lost Life.'
    }
  ],
  daughters_astraea: [
    {
      id: 'astraea_first_dawn',
      name: 'Sanctuary of the First Dawn',
      type: 'Faction',
      factionId: 'daughters_astraea',
      description: 'The ancient goddess shields her daughters.',
      objectiveText: 'All friendly units in POI radii gain +2 Def.',
      onReplaceTrigger: 'When replaced: All enemy units contesting POIs suffer Disadvantage for 1 turn.'
    },
    {
      id: 'astraea_swift_patrol',
      name: 'Astraean Wind Riders',
      type: 'Faction',
      factionId: 'daughters_astraea',
      description: 'Lightning maneuvers across the archipelago.',
      objectiveText: 'All units gain +2 Movement. Engagement moves gain +2 squares.',
      onReplaceTrigger: 'When replaced: Instant reposition 1 unit by 2 squares.'
    }
  ],
  infernal_crusades: [
    {
      id: 'infernal_dread_tithe',
      name: 'Brimstone Terrors',
      type: 'Faction',
      factionId: 'infernal_crusades',
      description: 'The discipline of Hell breaks mortal resolve.',
      objectiveText: 'Enemy units have their CP halved (rounded down) against your debuffs.',
      onReplaceTrigger: 'When replaced: Cause 1 automatic damage to closest enemy model.'
    }
  ],
  chronarch_conclave: [
    {
      id: 'chronarch_temporal_loop',
      name: 'Chronal Stasis Field',
      type: 'Faction',
      factionId: 'chronarch_conclave',
      description: 'Lock time in an inescapable nexus.',
      objectiveText: 'Delay enemy active initiative bonus; reroll one failed combat dice per phase.',
      onReplaceTrigger: 'When replaced: Force enemy to skip their next action activation.'
    }
  ]
};

// Draft v0.4 Events: Acid Rain, Flooding, Mana Surge, Great Shattering, Shifting Mires, Rift Migration
export const GAME_EVENTS: GameEvent[] = [
  {
    id: 'acid_rain',
    name: 'Acid Rain',
    triggerFormula: '2/100 * (round * 1.5 - 1)',
    description: 'Corrosive chemical downpour sweeps the field. All units with Def < 4 lose 1 L for 2 rounds. Resisted if CP + Def > 6.',
    cooldownRounds: 4,
    currentCooldown: 0,
    durationRounds: 2,
    activeRemaining: 0
  },
  {
    id: 'flooding',
    name: 'Flooding',
    triggerFormula: '1/100 * (round * 2 - 1)',
    description: 'Subterranean waters burst through the fault lines. All non-Character units lose 1 Def for 5 rounds.',
    cooldownRounds: 10,
    currentCooldown: 0,
    durationRounds: 5,
    activeRemaining: 0
  },
  {
    id: 'shifting_mires',
    name: 'Shifting Mires',
    triggerFormula: '1.5/100 * (round * 2 - 1)',
    description: 'A subterranean deluge shifts the Flooded Mire and Sunken Crypt Trench to new locations across the battlefield!',
    cooldownRounds: 6,
    currentCooldown: 0,
    durationRounds: 2,
    activeRemaining: 0
  },
  {
    id: 'rift_migration',
    name: 'Rift Migration',
    triggerFormula: '1/100 * (round * 2 - 1)',
    description: 'Tectonic aether currents cause the Infernal Rift Fracture to relocate to a new fault line!',
    cooldownRounds: 8,
    currentCooldown: 0,
    durationRounds: 3,
    activeRemaining: 0
  },
  {
    id: 'mana_surge',
    name: 'Mana Surge',
    triggerFormula: '0.5/100 * (round * 3 - 1)',
    description: 'Volatile magical convergence detonates. All Characters lose 1 L. Resisted if CP + 1d3 > 5; on resist, gain +1 AM for 3 rounds instead.',
    cooldownRounds: 8,
    currentCooldown: 0,
    durationRounds: 3,
    activeRemaining: 0
  },
  {
    id: 'great_shattering',
    name: 'Great Shattering',
    triggerFormula: '1/100 * (round * 1.5 - 1)',
    description: 'Tectonic rupture splits the reality fabric. All units have Movement reduced by 2 for 4 rounds.',
    cooldownRounds: 12,
    currentCooldown: 0,
    durationRounds: 4,
    activeRemaining: 0
  }
];

// Map layout: Continuous 1200x800 battlefield VTT canvas
export const DEFAULT_POIS: POI[] = [
  { id: 'poi_north', name: 'Altar of the First Dawn', type: 'Basic', x: 250, y: 250, radius: 1.5, multiplier: 1 },
  { id: 'poi_center', name: 'Convergence Nexus Core', type: 'Special', x: 600, y: 400, radius: 1.5, multiplier: 2 },
  { id: 'poi_south', name: 'Infernal Brimstone Well', type: 'Basic', x: 950, y: 550, radius: 1.5, multiplier: 1 }
];

export const DEFAULT_SPECIAL_TILES: SpecialTile[] = [
  { id: 'tile_watchtower', x: 200, y: 150, type: 'HighGround', name: 'Crumbling Watchtower', effectDescription: 'Advantage on ranged Shooting attacks', radius: 80, emoji: '🏰' },
  { id: 'tile_crag', x: 1000, y: 150, type: 'HighGround', name: 'Basalt Crag', effectDescription: 'Advantage on ranged Shooting attacks', radius: 80, emoji: '🏔️' },
  { id: 'tile_mire', x: 500, y: 500, type: 'Water', name: 'Flooded Mire', effectDescription: 'Disadvantage to Infantry movement and melee', radius: 95, emoji: '🌊' },
  { id: 'tile_trench', x: 700, y: 500, type: 'Water', name: 'Sunken Crypt Trench', effectDescription: 'Disadvantage to Infantry movement and melee', radius: 95, emoji: '🌊' },
  { id: 'tile_rift', x: 600, y: 300, type: 'InfernalRift', name: 'Rift Fracture', effectDescription: 'Dangerous terrain: unstable energy', radius: 100, emoji: '🌋' }
];

// Shop Catalog
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'board_crimson_foundry',
    name: 'Crimson Alchemical Foundry',
    category: 'board',
    description: 'Industrial steam pipes, red crystal veins, and brass gears.',
    priceShards: 800,
    previewColor: '#7f1d1d',
    icon: '🏭',
    rarity: 'Epic'
  },
  {
    id: 'board_astraea_isles',
    name: 'Astraean Sunlit Archipelago',
    category: 'board',
    description: 'White marble ruins, sapphire reefs, and sacred laurel banners.',
    priceShards: 800,
    previewColor: '#0369a1',
    icon: '🏛️',
    rarity: 'Epic'
  },
  {
    id: 'board_abyssal_rift',
    name: 'Infernal Ash Wastes',
    category: 'board',
    description: 'Cracked molten obsidian and subterranean embers from Below Realms.',
    priceShards: 1200,
    priceAether: 350,
    previewColor: '#431407',
    icon: '🌋',
    rarity: 'Mythic'
  },
  {
    id: 'dice_brass_steam',
    name: 'Clockwork Brass Dice',
    category: 'dice',
    description: 'Hand-machined brass d6 with steam vents and engraved gear pips.',
    priceShards: 450,
    previewColor: '#d97706',
    icon: '🎲',
    rarity: 'Rare'
  },
  {
    id: 'dice_ethereal_crystal',
    name: 'Time Crystal Prisms',
    category: 'dice',
    description: 'Shimmering violet polyhedrals forged by the Chronarchs.',
    priceAether: 250,
    previewColor: '#9333ea',
    icon: '🔮',
    rarity: 'Mythic'
  },
  {
    id: 'sleeve_first_dawn',
    name: 'First Dawn Gilded Sleeves',
    category: 'card_sleeve',
    description: 'Luminous gold and azure card borders.',
    priceShards: 300,
    previewColor: '#0284c7',
    icon: '🎴',
    rarity: 'Rare'
  },
  // Token Border Cosmetics
  {
    id: 'border_gold',
    name: 'Gilded Imperial Halo',
    category: 'token_border',
    description: 'A radiant golden filigree frame worthy of veteran champions.',
    priceShards: 400,
    previewColor: '#eab308',
    icon: '👑',
    rarity: 'Rare'
  },
  {
    id: 'border_cyber_neon',
    name: 'Cybernetic Neon Rim',
    category: 'token_border',
    description: 'Pulsing cyan energy ring with high-frequency telemetry markings.',
    priceShards: 500,
    previewColor: '#06b6d4',
    icon: '💠',
    rarity: 'Epic'
  },
  {
    id: 'border_crimson_spike',
    name: 'Barbed Bloodplate Frame',
    category: 'token_border',
    description: 'Jagged crimson spikes forged in the heart of the foundry.',
    priceShards: 450,
    previewColor: '#dc2626',
    icon: '🩸',
    rarity: 'Rare'
  },
  {
    id: 'border_void_rune',
    name: 'Abyssal Void Runes',
    category: 'token_border',
    description: 'Etched runes of the Outer Darkness glowing with violet malice.',
    priceAether: 200,
    previewColor: '#a855f7',
    icon: '🔮',
    rarity: 'Mythic'
  },
  // Token VFX Cosmetics
  {
    id: 'vfx_ethereal_glow',
    name: 'Ethereal Soulmist Glow',
    category: 'token_vfx',
    description: 'A soft spiritual luminescence trailing in the unit wake.',
    priceShards: 350,
    previewColor: '#38bdf8',
    icon: '✨',
    rarity: 'Rare'
  },
  {
    id: 'vfx_void_flame',
    name: 'Voidfire Incandescence',
    category: 'token_vfx',
    description: 'Dark purple flames licking around the perimeter of the unit.',
    priceShards: 600,
    previewColor: '#9333ea',
    icon: '🔥',
    rarity: 'Epic'
  },
  {
    id: 'vfx_lightning_aura',
    name: 'Static Tempest Aura',
    category: 'token_vfx',
    description: 'Crackling electrical arcs dancing continuously around the token.',
    priceAether: 250,
    previewColor: '#facc15',
    icon: '⚡',
    rarity: 'Mythic'
  },
  {
    id: 'vfx_blood_mist',
    name: 'Crimson War Vapour',
    category: 'token_vfx',
    description: 'A sinister red vapor that shrouds models in terrifying presence.',
    priceShards: 500,
    previewColor: '#ef4444',
    icon: '💨',
    rarity: 'Epic'
  }
];

// Battle Pass Track (30 Tiers previewing sample progression)
export const BATTLEPASS_TIERS: BattlePassTier[] = Array.from({ length: 30 }, (_, i) => {
  const tier = i + 1;
  return {
    tier,
    xpRequired: 1000,
    freeReward: {
      id: `free_${tier}`,
      name: tier % 5 === 0 ? 'Crystal Cache' : `${tier * 50} Crystal Shards`,
      type: tier % 5 === 0 ? 'aether' : 'shards',
      amount: tier % 5 === 0 ? 50 : tier * 50,
      icon: tier % 5 === 0 ? '💎' : '🪙'
    },
    premiumReward: {
      id: `prem_${tier}`,
      name: tier === 30 ? 'Mythic Chronarch Dice Set' : tier % 10 === 0 ? 'Convergence Board Skin' : tier % 5 === 0 ? 'Aether Core Pouch' : 'Exclusive Card Sleeve',
      type: tier === 30 ? 'dice' : tier % 10 === 0 ? 'board' : tier % 5 === 0 ? 'aether' : 'cosmetic',
      amount: tier % 5 === 0 ? 150 : undefined,
      icon: tier === 30 ? '🎲' : tier % 10 === 0 ? '🗺️' : tier % 5 === 0 ? '💎' : '🎴'
    }
  };
});
