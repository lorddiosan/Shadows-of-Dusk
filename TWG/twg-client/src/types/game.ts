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
}

export interface WorldPoint {
  x: number;
  y: number;
}

export type FormationType = 'auto' | 'circle' | 'line' | 'grid' | 'stack';

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
  description: string;
  passives: string[];
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
  pendingOriginalTokens?: Token[] | null; // Starting tokens before pending move
}

export type Phase = 'Deployment' | 'Command' | 'Movement' | 'Shooting' | 'Charge' | 'Fight';

export interface Card {
  id: string;
  name: string;
  type: 'General' | 'Faction' | 'Leader';
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
  x: number;
  y: number;
  type: SpecialTileType;
  name: string;
  effectDescription: string;
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

