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
    objectiveText: 'Successfully resolve both a Shooting attack and a Charge in the same round.',
    passiveReward: '+1 bonus point per round.'
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
      objectiveText: 'All units gain +2 Movement. Charge rolls of 3-4 count as full movement.',
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
      onReplaceTrigger: 'When replaced: Force enemy to skip their next shooting activation.'
    }
  ]
};

// Draft v0.4 Events: Acid Rain, Flooding, Mana Surge, Great Shattering
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
  { x: 200, y: 150, type: 'HighGround', name: 'Crumbling Watchtower', effectDescription: 'Advantage on ranged Shooting attacks' },
  { x: 1000, y: 150, type: 'HighGround', name: 'Basalt Crag', effectDescription: 'Advantage on ranged Shooting attacks' },
  { x: 500, y: 500, type: 'Water', name: 'Flooded Mire', effectDescription: 'Disadvantage to Infantry movement and melee' },
  { x: 700, y: 500, type: 'Water', name: 'Sunken Crypt Trench', effectDescription: 'Disadvantage to Infantry movement and melee' },
  { x: 600, y: 300, type: 'InfernalRift', name: 'Rift Fracture', effectDescription: 'Dangerous terrain: unstable energy' }
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
