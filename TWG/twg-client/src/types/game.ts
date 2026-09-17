export type UnitRole = 
  | 'Legendary Leader' 
  | 'Leader' 
  | 'Battleline' 
  | 'Infantry / Mounted' 
  | 'Vehicle / Monster';

export type UnitType = 'Infantry' | 'Vehicle' | 'Monster' | 'Character';

export type UnitSize = 'Small' | 'Medium' | 'Large' | 'Huge' | 'Colossal';

export type BaseShape = 'circle' | 'square' | 'oval' | 'rectangle';

export interface StatBlock {
  mv: number;         // Movement (squares per Movement phase)
  baseMv?: number;    // Permanent base movement for round reset
  def: number;        // Defence (Toughness-equivalent)
  baseDef: number;    // Permanent base for caps (+-3)
  defModifier: number;// Temporary modifier for next turn (-3 to +3)
  am: number;         // Attack Modifier
  lives: number;      // Total squad HP / pool of lives
  maxLives: number;   // Maximum squad lives
  modelCount: number; // Pre-defined number of models in unit
  hpPerModel: number; // HP per model: Math.ceil(lives / modelCount)
  cp: number;         // Control Power
  range: number;      // 0 for Melee-only, >0 for ranged squares
  size?: UnitSize;    // Size category
  baseRadius?: number;// Explicit base radius in pixels at 100% zoom
  baseShape?: BaseShape; // Configurable base shape
  baseWidth?: number;    // Base width in pixels (for square/rect/oval)
  baseHeight?: number;   // Base height in pixels (for square/rect/oval)
  carryCapacity?: number;// Vehicle model transport capacity (e.g. 6 models)
  meleeAttacks?: number; // Number of melee attacks per model (default 1)
  meleeDamageDice?: string; // Melee damage die: 'd3' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' (default 'd3')
  rangedAttacks?: number; // Number of ranged attacks per model (default 1 if range > 0, else 0)
  rangedDamageDice?: string; // Ranged damage die: 'd3' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' (default 'd3')
  armorSave?: number; // Defense armor save threshold on 1d6 (e.g. 2 for 2+, 3 for 3+, 4 for 4+; defaults to 9 - def)
}

export interface WorldPoint {
  x: number;
  y: number;
}

export type FormationType = 'auto' | 'circle' | 'line' | 'grid' | 'stack';

// DESIGN-007 & CODE-026: Ability Builder Schema
export type AbilityAffects = 'self' | 'attached' | 'target' | 'area' | 'all_friendly' | 'all_allies' | 'all_enemy';
export type AbilityType = 'passive' | 'active';
export type AbilityTiming = 'any_time' | 'deployment' | 'command' | 'movement' | 'action' | 'shooting' | 'charge' | 'fight' | 'round_end';
export type AbilityCost = 'free' | 'gain_1_cp' | 'once_per_game' | 'once_per_round' | 'once_per_activation' | '1_cp' | '2_cp';
export type AbilityDuration = 'instant' | 'end_of_phase' | 'end_of_round' | 'permanent';

export type CardTheme = 'gold' | 'crimson' | 'amethyst' | 'sapphire' | 'emerald' | 'void' | 'steel';
export type CardRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface UnitAbility {
  id: string;
  name: string;
  type: AbilityType;
  affects: AbilityAffects;
  activationTiming?: AbilityTiming;
  cost: AbilityCost;
  effect: string;
  effectType?: 'stat_modifier' | 'damage' | 'movement' | 'reroll' | 'defense' | 'heal' | 'custom';
  duration: AbilityDuration;
  triggerCondition?: string;
  summary?: string;
  icon?: string;
  gainsCP?: boolean;
  vfxType?: 'ballistic' | 'laser' | 'plasma' | 'slash' | 'crush' | 'arcane' | 'blood' | 'holy' | 'command';
  cardTheme?: CardTheme;
  cardRarity?: CardRarity;
  cardArtworkUrl?: string;
  actionButtonText?: string;
  quote?: string;
}

export interface Token {
  id: string;              // Unique token instance id (e.g. 'tok_u1_0')
  unitId: string;          // Parent Unit ID
  currentLives: number;    // Current lives remaining on this individual unit model
  maxLives: number;        // Maximum / initial lives of this individual unit model
  x: number;               // Continuous world coordinate X
  y: number;               // Continuous world coordinate Y
  offsetX: number;         // Relative offset from Unit center in formation
  offsetY: number;         // Relative offset from Unit center in formation
  turnStartPos?: WorldPoint; // Position at the start of the current turn/movement to prevent staggered relay exploit
  rotation: number;        // Rotation in degrees (0 - 360)
  size: number;            // Token diameter / primary size in pixels (e.g. 40)
  radius?: number;         // Token base radius in pixels (e.g. 20)
  baseShape?: BaseShape;   // Base shape: circle, square, oval, rectangle
  baseWidth?: number;      // Explicit width in pixels
  baseHeight?: number;     // Explicit height in pixels
  isLeaderToken?: boolean; // Highlighted model if an attached Leader
  sprite?: string;         // Token avatar / icon
  tokenImageUrl?: string;  // Custom uploaded token image (base64 or URL)
  selected?: boolean;      // Driven by parent Unit selection
  offendingCoherency?: boolean; // Highlighted red if model breaks squad coherency
}

export interface Unit {
  id: string;
  templateId: string;
  name: string;
  factionId: string;
  type: UnitType;
  role: UnitRole;
  size?: UnitSize;
  baseRadius?: number;
  baseShape?: BaseShape;
  baseWidth?: number;
  baseHeight?: number;
  stats: StatBlock;
  points: number;
  avatar: string;
  tokenImageUrl?: string;         // Custom uploaded token image (PNG/JPG/WebP base64/URL)
  borderStyle?: string;           // Custom cosmetic border/frame style (e.g. 'border_gold', 'border_cyber_neon')
  vfxEffect?: string;             // Custom cosmetic visual effect / aura (e.g. 'vfx_ethereal_glow', 'vfx_void_flame')
  description: string;
  passives: string[];
  abilities?: UnitAbility[];      // Configured Unit Abilities (DESIGN-007 / CODE-026)
  traits?: string[];              // Tactical traits (e.g. 'Infiltrator', 'Flying', 'Leader', 'Transport', 'Scout')
  tempTraits?: string[];          // Temporary status traits (e.g. 'On Fire', 'Poisoned', 'Stunned', 'Frozen', 'Acid Corroded')
  canDeployOutsideZone?: boolean; // Trait: allows deployment outside deployment zone
  inStrategicReserve?: boolean;   // Placed in Strategic Reserves (Round 2+ Movement deploy)
  embarkedIn?: string | null;     // ID of the vehicle/transport this unit is loaded inside
  attachedTo?: string | null;     // ID of bodyguard unit this Leader is attached to
  attachedUnits?: string[];       // IDs of Leader units attached to this bodyguard unit
  transportCapacity?: number;     // Number of infantry units this vehicle can carry (e.g. 1 or 2)
  carryCapacity?: number;         // Model capacity for transports (e.g. 6 models)
  owner: 'player1' | 'player2';
  position: WorldPoint | null;
  formation?: FormationType;
  tokens?: Token[];
  hasMoved: boolean;
  hasShot: boolean;
  hasCharged: boolean;
  hasFought: boolean;
  advantageStacks: number;
  disadvantageStacks: number;
  sizeClass?: 'Small' | 'Medium' | 'Large' | 'Huge'; // Size classification for collision & structure rules
  currentLevel?: number | null; // Multi-level structure floor (null = ground/outside, 1 = L1, 2 = L2...)
  occupyingStructureId?: string | null; // ID of structure unit currently occupies
  isPendingMoveConfirm?: boolean; // In staged movement awaiting Confirm Move
  isPendingDeploymentConfirm?: boolean; // In staged deployment awaiting Confirm Placement
  pendingOriginalPosition?: WorldPoint | null; // Starting position before pending move
  pendingOriginalTokens?: Token[] | null; // Starting token positions before pending move
  hasCustomTokenPositions?: boolean; // True if tokens were positioned via manual placement mode
  isPendingDisembarkConfirm?: boolean; // In staged disembark placement awaiting Confirm Disembark (RULE-002)
  disembarkingFromVehicleId?: string | null; // ID of vehicle unit is currently disembarking from
  lastEmbarkPhase?: Phase | null; // Last phase this unit embarked (RULE-001)
  lastEmbarkRound?: number | null; // Round number when unit embarked
  lastDisembarkPhase?: Phase | null; // Last phase this unit disembarked (RULE-001)
  lastDisembarkRound?: number | null; // Round number when unit disembarked
  actionsRemaining?: number; // Actions remaining in the current Action Phase (default 2)
  maxActions?: number; // Total actions available per Action Phase (default 2)
  issuedStratagemsThisTurn?: string[]; // Stratagem IDs issued to this unit during current turn/round
}

export type Phase = 'Deployment' | 'Command' | 'Movement' | 'Action' | 'Scoring' | 'Shooting' | 'Charge' | 'Fight';

export interface Card {
  id: string;
  name: string;
  type: 'General' | 'Faction' | 'Leader' | 'FieldEffect' | 'SecondaryMission';
  factionId?: string;
  description: string;
  objectiveText?: string;
  passiveReward?: string;
  onReplaceTrigger?: string;
  pointsValue?: number;
}

export interface POI {
  id: string;
  name: string;
  type: 'Basic' | 'Special';
  x: number;
  y: number;
  radius: number;
  multiplier: number;
}

export type SpecialTileType = 'HighGround' | 'Water' | 'AcidPool' | 'InfernalRift' | 'AncientRuin';

export interface SpecialTile {
  id?: string;
  x: number;
  y: number;
  type: SpecialTileType;
  name: string;
  effectDescription: string;
  radius?: number;          // Zone of effect radius in pixels (default: 80-110px)
  emoji?: string;           // Display emoji icon (e.g. 🌊, 🌋, 🧪, 🌫️, 🔮, 🏔️)
  isTemporary?: boolean;    // Flag for temporary event hazards
  durationRounds?: number;  // Initial duration in rounds
  activeRemaining?: number; // Rounds remaining before hazard expires
  color?: string;           // Custom zone color
}

export interface GameEvent {
  id: string;
  name: string;
  triggerFormula: string;
  description: string;
  cooldownRounds: number;
  currentCooldown: number;
  durationRounds: number;
  activeRemaining: number;
}

export interface CombatLogEntry {
  id: string;
  round: number;
  phase: Phase;
  source: string;
  message: string;
  type: 'info' | 'combat' | 'event' | 'score' | 'charge';
  timestamp: string;
}

export interface GameState {
  matchId: string;
  round: number;
  phase: Phase;
  initiativeWinner: 'player1' | 'player2';
  activePlayer: 'player1' | 'player2';
  player1Score: number;
  player2Score: number;
  player1Kills: number;
  player2Kills: number;
  gridWidth: number;
  gridHeight: number;
  pois: POI[];
  specialTiles: SpecialTile[];
  units: Unit[];
  player1CardPool: Card[];
  player1ActiveCards: Card[];
  player2CardPool: Card[];
  player2ActiveCards: Card[];
  activeEvents: GameEvent[];
  eventHistory: string[];
  isGameOver: boolean;
  winner: 'player1' | 'player2' | 'draw' | null;
  winReason?: string;
  logs: CombatLogEntry[];
  player1VotedEnd: boolean;
  player2VotedEnd: boolean;
  player1CP?: number;
  player2CP?: number;
  deployingPlayer?: 'player1' | 'player2';
  deploymentCoinFlipWinner?: 'player1' | 'player2';
  currentMap?: BattleMap;
}

export type TerrainType = 'Watchtower' | 'Basalt Crag' | 'Flooded Mire' | 'Ruins' | 'Barricade' | 'High Ground';

export interface TerrainFeature {
  id: string;
  name: string;
  type: TerrainType;
  x: number; // Continuous world coordinate X
  y: number; // Continuous world coordinate Y
  width: number;
  height: number;
  rotation?: number;
  coverBonus?: number; // e.g. +1 def
  blocksMovement?: boolean;
  blocksLineOfSight?: boolean;
  color?: string;
  icon?: string;
}

export interface MapObjective {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;      // Capture radius in pixels (default: 60)
  pointsValue: number; // Victory points awarded (e.g. 5)
}

export interface DeploymentZoneConfig {
  player1: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    label?: string;
  };
  player2: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    label?: string;
  };
}

export type PaintedZoneType = 'Impassable' | 'DifficultTerrain' | 'DeploymentP1' | 'DeploymentP2' | 'ObjectiveArea';

export interface PaintedZone {
  id: string;
  name: string;
  zoneType: PaintedZoneType;
  shape: 'rect' | 'polygon';
  points?: WorldPoint[]; // For polygon brush shapes
  bounds?: { x: number; y: number; width: number; height: number }; // For rect shapes
  color?: string;
  movementPenalty?: number; // e.g. -2 squares or 2x cost for DifficultTerrain
  objectiveRadius?: number; // In px
  objectivePoints?: number;
  label?: string;
}

export interface StructureLevel {
  levelNumber: number; // 1 = Ground, 2 = Floor 1, etc.
  name: string;        // "Ground Floor (L1)", "L2 Balcony", "L3 Rooftop"
  walkableBounds?: { x: number; y: number; width: number; height: number };
  hasStairs?: boolean;
  stairsLocation?: WorldPoint;
  coverBonus?: number;
}

export interface MultiLevelStructure {
  id: string;
  name: string;
  type: 'Building' | 'Ruins' | 'Watchtower' | 'Bunker';
  x: number;
  y: number;
  width: number;
  height: number;
  totalLevels: number; // 1 to 5
  levels: StructureLevel[];
  blocksLineOfSight: boolean;
  blocksLargeUnits: boolean; // Vehicles & Huge units cannot pass through freely
  coverBonus: number;
  color?: string;
  icon?: string;
}

export interface BattleMap {
  id: string;
  name: string;
  theme: 'Wasteland' | 'Industrial' | 'Gothic Ruins' | 'Verdant Forest' | 'Volcanic';
  width: number;  // Tabletop canvas width (e.g. 1200)
  height: number; // Tabletop canvas height (e.g. 800)
  gridWidthInches?: number;  // Width in inches (e.g. 24, 36, 48)
  gridHeightInches?: number; // Height in inches (e.g. 16, 24, 32)
  backgroundImageUrl?: string; // Scaled base terrain texture
  coherencyDistanceInches?: number; // Coherency distance (default 2 inches)
  deploymentZones: DeploymentZoneConfig;
  objectives: MapObjective[];
  terrain: TerrainFeature[];
  paintedZones?: PaintedZone[]; // Painted obstacles & custom zones
  structures?: MultiLevelStructure[]; // Multi-level structures (1-5 floors)
  description?: string;
  createdAt?: string;
  isCustom?: boolean;
  isPreset?: boolean;
}

export interface TraitDefinition {
  id: string;
  name: string;
  icon: string;
  category: 'Deployment' | 'Movement' | 'Command' | 'Combat' | 'Special';
  summary: string;
  mechanicalRule: string;
  isMVP: boolean;
}

export const CORE_TRAIT_DEFINITIONS: Record<string, TraitDefinition> = {
  Infiltrator: {
    id: 'Infiltrator',
    name: 'Infiltrator',
    icon: '🕵️',
    category: 'Deployment',
    summary: 'Forward deployment anywhere outside opponent zones',
    mechanicalRule: 'Bypasses friendly deployment zone limits. Can deploy anywhere on the continuous VTT canvas beyond standard deployment flanks.',
    isMVP: true
  },
  Flying: {
    id: 'Flying',
    name: 'Flying',
    icon: '🦅',
    category: 'Movement',
    summary: 'Ignores intervening units & ground terrain during move/charge',
    mechanicalRule: 'Can move across intervening friendly and enemy models without being blocked by swept base collision. Does not trigger ground structure traversal blocks.',
    isMVP: true
  },
  Leader: {
    id: 'Leader',
    name: 'Leader',
    icon: '👑',
    category: 'Command',
    summary: 'Attaches to and commands compatible infantry squads',
    mechanicalRule: 'Eligible to attach to a friendly bodyguard infantry squad during the Deployment Phase, sharing wounds and making commander strikes.',
    isMVP: true
  },
  Transport: {
    id: 'Transport',
    name: 'Transport',
    icon: '🚜',
    category: 'Special',
    summary: 'Carries infantry squads across the battlefield',
    mechanicalRule: 'Provides embarkation capacity for up to 6 models (or 1 full infantry squad). Allows staged disembarkation within 3" during Movement phase.',
    isMVP: true
  },
  Scout: {
    id: 'Scout',
    name: 'Scout',
    icon: '🔭',
    category: 'Deployment',
    summary: 'Early reconnaissance positioning advantage',
    mechanicalRule: 'Gains free 3" forward repositioning during Round 1 Command Phase.',
    isMVP: true
  },
  Stealth: {
    id: 'Stealth',
    name: 'Stealth',
    icon: '👤',
    category: 'Combat',
    summary: 'Concealment against ranged target acquisition',
    mechanicalRule: '+1 Defense against enemy ranged attacks originating from more than 6 grid squares (300px) away.',
    isMVP: false
  },
  'Heavy Armor': {
    id: 'Heavy Armor',
    name: 'Heavy Armor',
    icon: '🛡️',
    category: 'Combat',
    summary: 'Reinforced bulk resistant to light armor-piercing damage',
    mechanicalRule: 'Reduces incoming Armor Penetration penalties by 1 (minimum 0).',
    isMVP: false
  },
  'Rapid Fire': {
    id: 'Rapid Fire',
    name: 'Rapid Fire',
    icon: '⚡',
    category: 'Combat',
    summary: 'High projectile volume allowing re-rolls of hit misses',
    mechanicalRule: 'When conducting ranged attacks, the unit may re-roll ranged hit rolls of 1.',
    isMVP: true
  },
  Berserk: {
    id: 'Berserk',
    name: 'Berserk',
    icon: '🪓',
    category: 'Combat',
    summary: 'Ferocious frenzy when taking casualties or damage',
    mechanicalRule: 'Gains +1 Attack Modifier (AM) in melee when below maximum lives or model count.',
    isMVP: true
  },
  Teleport: {
    id: 'Teleport',
    name: 'Teleport',
    icon: '🌀',
    category: 'Movement',
    summary: 'Phase-shifts across the battlefield bypassing all obstacles',
    mechanicalRule: 'Once per match during the Movement phase, can instantly reposition up to 6" without traversing intervening terrain.',
    isMVP: false
  },
  Psionic: {
    id: 'Psionic',
    name: 'Psionic',
    icon: '🔮',
    category: 'Special',
    summary: 'Channels etheric warp energy to buff allies or generate CP',
    mechanicalRule: 'Can channel warp resonance abilities to bolster allied defense or generate +1 bonus Command Power.',
    isMVP: true
  },
  Regeneration: {
    id: 'Regeneration',
    name: 'Regeneration',
    icon: '🩸',
    category: 'Special',
    summary: 'Restores lost lives automatically at the start of battle rounds',
    mechanicalRule: 'At the start of the friendly Command Phase, unit restores 1 lost life up to its starting maximum.',
    isMVP: false
  },
  Sniper: {
    id: 'Sniper',
    name: 'Sniper',
    icon: '🎯',
    category: 'Combat',
    summary: 'Precision targeting that can bypass bodyguard escorts',
    mechanicalRule: 'When firing at an attached squad within line of sight, can allocate attacks directly against the Leader model.',
    isMVP: true
  },
  Cavalry: {
    id: 'Cavalry',
    name: 'Cavalry / Mounted',
    icon: '🐎',
    category: 'Movement',
    summary: 'Swift momentum providing speed and crushing charge bonuses',
    mechanicalRule: 'Gains +2 base Movement and adds +1 to charge distance rolls.',
    isMVP: false
  },
  Unyielding: {
    id: 'Unyielding',
    name: 'Unyielding',
    icon: '🗿',
    category: 'Command',
    summary: 'Undaunted garrison presence that dominates control zones',
    mechanicalRule: 'Provides +1 bonus Control Power (CP) when contesting Points of Interest (POIs).',
    isMVP: true
  }
};


