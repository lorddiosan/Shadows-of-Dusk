import React, { useState, useEffect, useRef } from 'react';
import { 
  Swords, Shield, Compass, Sparkles, AlertTriangle, Dice6, 
  RotateCcw, Trophy, Check, ArrowRight, Zap, Target, Flame, Eye,
  Layers, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, RefreshCw, X, Play, Move, ZoomIn, ZoomOut,
  Maximize2, Send, MessageSquare, BookOpen, Volume2, Settings,
  HelpCircle, UserCheck, Plus, Circle, Box, Truck, UserPlus, UserMinus,
  Users, Boxes, FolderOpen, Tag, MapPin
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Unit, Phase, Card, POI, SpecialTile, GameEvent, 
  CombatLogEntry, GameState, WorldPoint, FormationType, BattleMap, Token,
  UnitAbility, CardTheme, CardRarity 
} from '../../types/game';
import { ArmyRoster } from '../../types/army';
import { DEFAULT_POIS, DEFAULT_SPECIAL_TILES, GAME_EVENTS, GENERAL_CARDS, FACTION_CARDS, SECONDARY_MISSION_CARDS, FIELD_EFFECT_CARDS } from '../../data/gameContent';
import { resolveCombat, rollCharge, CombatResult, checkTypeAdvantage, getAbilityUsageLimit, checkAbilityActivation, AbilityUsageLimit } from '../../engine/combatEngine';
import { calculatePOIScores, checkWinConditions } from '../../engine/scoringEngine';
import { checkAndTriggerEvents, relocateSpecialTiles } from '../../engine/eventsEngine';
import { StorageService, PRESET_MAPS } from '../../services/storageService';
import { TabletopCanvas, getTraitBadgeInfo } from './TabletopCanvas';
import { vttDragBridge } from '../../services/dragBridge';
import { vfxDispatcher } from '../../services/audioVfxService';
import { FactionLogo } from '../common/FactionLogo';
import { 
  gridDistance, worldDistance, moveUnit, setUnitFormation, 
  syncUnitTokens, applyDamageToTokens, isInsideDeploymentZone, 
  canUnitDeployOutsideZone, DEFAULT_GRID_SIZE,
  canAttachLeader, canEmbark, canEmbarkWithDistance, findValidDisembarkPosition,
  validateNormalMovementEnemyProximity, setUnitMutualState, getUnitBaseDimensions,
  validateUnitCoherency, moveIndividualToken, checkPathCrossesStructure,
  fitFormationToZone, checkUniversalTokenCollisions, validateModelMovementDistance,
  getUnitCollisionRadius, isUnitInShootingRange, isUnitInMeleeRange,
  getUnitsModelDistance, findValidMovePositionForBot, findNearestNonOverlappingPosition,
  checkPathCrossesUnits, validateDisembarkPlacement, getUnitBodiesAndLives,
  executeAbandonShipProtocol
} from '../../engine/formationEngine';

interface BattlefieldProps {
  customRoster?: ArmyRoster | null;
  boardSkin: string;
  onReturnHome?: () => void;
}

const PHASES_ORDER: Phase[] = ['Deployment', 'Command', 'Movement', 'Action', 'Scoring'];

const CARD_THEME_STYLES: Record<CardTheme, {
  bg: string;
  border: string;
  glow: string;
  headerText: string;
  accentText: string;
  ribbonBg: string;
  buttonBg: string;
  innerShadow: string;
}> = {
  gold: {
    bg: 'bg-gradient-to-b from-[#2a1d09] via-[#171309] to-[#0c0a07]',
    border: 'border-amber-400',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.35)]',
    headerText: 'text-amber-100',
    accentText: 'text-amber-300',
    ribbonBg: 'bg-amber-950/80 border-amber-500/50',
    buttonBg: 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black',
    innerShadow: 'from-amber-500/10'
  },
  crimson: {
    bg: 'bg-gradient-to-b from-[#330c14] via-[#1a080c] to-[#0d0406]',
    border: 'border-rose-500',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.35)]',
    headerText: 'text-rose-100',
    accentText: 'text-rose-300',
    ribbonBg: 'bg-rose-950/80 border-rose-500/50',
    buttonBg: 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 text-white',
    innerShadow: 'from-rose-500/10'
  },
  amethyst: {
    bg: 'bg-gradient-to-b from-[#280c36] via-[#15071d] to-[#0a030e]',
    border: 'border-purple-400',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.35)]',
    headerText: 'text-purple-100',
    accentText: 'text-purple-300',
    ribbonBg: 'bg-purple-950/80 border-purple-500/50',
    buttonBg: 'bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 text-white',
    innerShadow: 'from-purple-500/10'
  },
  sapphire: {
    bg: 'bg-gradient-to-b from-[#0b2238] via-[#071320] to-[#040b12]',
    border: 'border-sky-400',
    glow: 'shadow-[0_0_20px_rgba(56,189,248,0.35)]',
    headerText: 'text-sky-100',
    accentText: 'text-sky-300',
    ribbonBg: 'bg-sky-950/80 border-sky-500/50',
    buttonBg: 'bg-gradient-to-r from-sky-500 via-sky-400 to-sky-500 text-black',
    innerShadow: 'from-sky-500/10'
  },
  emerald: {
    bg: 'bg-gradient-to-b from-[#092c1c] via-[#05180f] to-[#030d08]',
    border: 'border-emerald-400',
    glow: 'shadow-[0_0_20px_rgba(52,211,153,0.35)]',
    headerText: 'text-emerald-100',
    accentText: 'text-emerald-300',
    ribbonBg: 'bg-emerald-950/80 border-emerald-500/50',
    buttonBg: 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 text-black',
    innerShadow: 'from-emerald-500/10'
  },
  void: {
    bg: 'bg-gradient-to-b from-[#180828] via-[#0d0416] to-[#06020c]',
    border: 'border-fuchsia-400',
    glow: 'shadow-[0_0_20px_rgba(232,121,249,0.35)]',
    headerText: 'text-fuchsia-100',
    accentText: 'text-fuchsia-300',
    ribbonBg: 'bg-fuchsia-950/80 border-fuchsia-500/50',
    buttonBg: 'bg-gradient-to-r from-fuchsia-600 via-fuchsia-500 to-fuchsia-600 text-white',
    innerShadow: 'from-fuchsia-500/10'
  },
  steel: {
    bg: 'bg-gradient-to-b from-[#222730] via-[#14171d] to-[#0b0c0f]',
    border: 'border-zinc-400',
    glow: 'shadow-[0_0_20px_rgba(161,161,170,0.35)]',
    headerText: 'text-zinc-100',
    accentText: 'text-zinc-300',
    ribbonBg: 'bg-zinc-800/80 border-zinc-500/50',
    buttonBg: 'bg-gradient-to-r from-zinc-300 via-zinc-100 to-zinc-300 text-black',
    innerShadow: 'from-zinc-500/10'
  }
};

const CARD_RARITY_BADGES: Record<CardRarity, { label: string; badge: string }> = {
  Common: { label: 'Common', badge: 'bg-zinc-800/90 text-zinc-300 border-zinc-650' },
  Uncommon: { label: 'Uncommon', badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-600' },
  Rare: { label: 'Rare', badge: 'bg-sky-950/90 text-sky-300 border-sky-500' },
  Epic: { label: 'Epic', badge: 'bg-purple-950/90 text-purple-200 border-purple-400' },
  Legendary: { label: 'Legendary', badge: 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black font-black border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]' }
};

export const createInitialGameState = (customRoster?: ArmyRoster | null): GameState => {
  const allTemplates = StorageService.getUnitTemplates();

  const ensureValidLives = (u: any): Unit => {
    const lives = Math.max(1, Number(u.stats?.lives) || 5);
    const modelCount = Math.max(1, Number(u.stats?.modelCount) || 1);
    const tpl = allTemplates.find(t => t.templateId === u.templateId || t.name === u.name);
    return {
      ...u,
      tokenImageUrl: u.tokenImageUrl,
      abilities: (u.abilities && u.abilities.length > 0) ? u.abilities : (tpl?.abilities || []),
      traits: (u.traits && u.traits.length > 0) ? u.traits : (tpl?.traits || []),
      stats: {
        ...u.stats,
        lives,
        maxLives: Math.max(lives, Number(u.stats?.maxLives) || lives),
        modelCount,
        hpPerModel: Math.max(1, Math.floor(lives / modelCount)),
        baseMv: u.stats?.baseMv ?? u.stats?.mv ?? 5
      }
    };
  };

  // Player 1 Units (Reserves)
  const baseP1 = customRoster 
    ? customRoster.units.map(u => syncUnitTokens(ensureValidLives({ ...u, owner: 'player1' as const, position: null, formation: 'circle' as const, transportCapacity: u.type === 'Vehicle' ? (u.transportCapacity || 1) : undefined })))
    : allTemplates.filter(u => u.factionId === 'crimson_empire').slice(0, 5).map((u, i) => syncUnitTokens(ensureValidLives({
        ...u,
        id: `p1_unit_${i}`,
        owner: 'player1' as const,
        position: null,
        formation: 'circle' as const,
        transportCapacity: u.type === 'Vehicle' ? 1 : undefined
      })));

  // Player 2 Units (Reserves)
  const baseP2 = allTemplates.filter(u => u.factionId === 'daughters_astraea').slice(0, 5).map((u, i) => syncUnitTokens(ensureValidLives({
    ...u,
    id: `p2_unit_${i}`,
    owner: 'player2' as const,
    position: null,
    formation: 'circle' as const,
    transportCapacity: u.type === 'Vehicle' ? 1 : undefined
  })));

  // Coin flip for deployment phase (alternating 1 unit per turn)
  const deploymentCoinFlip: 'player1' | 'player2' = Math.random() >= 0.5 ? 'player1' : 'player2';

  // Initiative roll (Section 2)
  const p1InitRoll = Math.floor(Math.random() * 6) + 1;
  const p2InitRoll = Math.floor(Math.random() * 6) + 1;
  const initWinner: 'player1' | 'player2' = p1InitRoll >= p2InitRoll ? 'player1' : 'player2';

  const p1AllCards = [...SECONDARY_MISSION_CARDS, ...FIELD_EFFECT_CARDS, ...GENERAL_CARDS, ...(FACTION_CARDS['crimson_empire'] || [])];
  const p2AllCards = [...SECONDARY_MISSION_CARDS, ...FIELD_EFFECT_CARDS, ...GENERAL_CARDS, ...(FACTION_CARDS['daughters_astraea'] || [])];

  const initialMaps = StorageService.getMaps();
  const initialMap = initialMaps[0] || PRESET_MAPS[0];
  const initialPois: POI[] = initialMap && initialMap.objectives.length > 0 ? initialMap.objectives.map(obj => ({
    id: obj.id,
    name: obj.name,
    type: (obj.name.toLowerCase().includes('core') || obj.name.toLowerCase().includes('well') || (obj.pointsValue && obj.pointsValue >= 10)) ? 'Special' as const : 'Basic' as const,
    x: obj.x,
    y: obj.y,
    radius: obj.radius || 70,
    multiplier: (obj.name.toLowerCase().includes('core') || obj.name.toLowerCase().includes('well') || (obj.pointsValue && obj.pointsValue >= 10)) ? 2 : 1
  })) : DEFAULT_POIS;

  return {
    matchId: `match_${Date.now()}`,
    round: 1,
    phase: 'Deployment',
    initiativeWinner: initWinner,
    activePlayer: deploymentCoinFlip,
    deployingPlayer: deploymentCoinFlip,
    deploymentCoinFlipWinner: deploymentCoinFlip,
    player1Score: 0,
    player2Score: 0,
    player1Kills: 0,
    player2Kills: 0,
    gridWidth: 24,
    gridHeight: 16,
    currentMap: initialMap,
    pois: initialPois,
    specialTiles: DEFAULT_SPECIAL_TILES,
    units: [...baseP1, ...baseP2],
    player1CardPool: p1AllCards,
    player1ActiveCards: p1AllCards.slice(0, 4),
    player2CardPool: p2AllCards,
    player2ActiveCards: p2AllCards.slice(0, 4),
    activeEvents: [...GAME_EVENTS],
    eventHistory: [],
    isGameOver: false,
    winner: null,
    logs: [
      {
        id: 'log_0',
        round: 1,
        phase: 'Deployment',
        source: 'System',
        message: `Match Initialized! 🪙 Deployment Coin Flip: ${deploymentCoinFlip === 'player1' ? 'Player 1 (West)' : 'Player 2 (East)'} won and deploys first! Players alternate placing 1 unit per turn.`,
        type: 'info',
        timestamp: new Date().toLocaleTimeString()
      }
    ],
    player1VotedEnd: false,
    player2VotedEnd: false,
    player1CP: 3,
    player2CP: 3
  };
};

export const Battlefield: React.FC<BattlefieldProps> = ({ customRoster, boardSkin, onReturnHome }) => {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(customRoster));

  // UI-003: Ability Cards Dock State
  const [abilitiesDockOpen, setAbilitiesDockOpen] = useState<boolean>(false);
  const [usedAbilitiesThisRound, setUsedAbilitiesThisRound] = useState<Record<string, number>>({});
  const [usedAbilitiesThisGame, setUsedAbilitiesThisGame] = useState<Record<string, boolean>>({});

  const handleRestartMatch = () => {
    setGameState(createInitialGameState(customRoster));
    setSelectedUnitId(null);
    setTargetUnitId(null);
    setRecentCombatResult(null);
    setUsedAbilitiesThisRound({});
    setUsedAbilitiesThisGame({});
    setAbilitiesDockOpen(false);
  };

  // Reset once-per-round abilities whenever round changes
  const prevRoundRef = useRef<number>(gameState.round);
  useEffect(() => {
    if (gameState.round !== prevRoundRef.current) {
      setUsedAbilitiesThisRound({});
      prevRoundRef.current = gameState.round;
    }
  }, [gameState.round]);

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [targetUnitId, setTargetUnitId] = useState<string | null>(null);
  const [recentCombatResult, setRecentCombatResult] = useState<CombatResult | null>(null);
  const [showCardDrawer, setShowCardDrawer] = useState<boolean>(false);
  const [cardDrawerTab, setCardDrawerTab] = useState<'missions' | 'field_hazards'>('missions');
  const [draggedUnitId, setDraggedUnitId] = useState<string | null>(null);
  
  // Slide-out drawers for Army Tray, Dice Tray, Command Phase, Strategic Reserves, and Embarked Units
  // UI-004: Closed by default to keep tactical canvas clean and spacious
  const [armyTrayDrawerOpen, setArmyTrayDrawerOpen] = useState<boolean>(false);
  const [diceDrawerOpen, setDiceDrawerOpen] = useState<boolean>(false);
  const [commandDrawerOpen, setCommandDrawerOpen] = useState<boolean>(false);
  const [reservesDrawerOpen, setReservesDrawerOpen] = useState<boolean>(false);
  const [embarkedDrawerOpen, setEmbarkedDrawerOpen] = useState<boolean>(false);

  // UI-004: Right Sidebar collapse toggle (enables full-width tactical canvas)
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);

  // BUG-026: Deployment error toast & Bot action status indicators
  const [deploymentErrorNotice, setDeploymentErrorNotice] = useState<string | null>(null);
  const [abandonShipNotice, setAbandonShipNotice] = useState<string | null>(null);
  const [isBotDeploying, setIsBotDeploying] = useState<boolean>(false);
  const [isDeployStagingMinimized, setIsDeployStagingMinimized] = useState<boolean>(false);

  // Modals for Leader Attachment and Transport Embarking
  const [attachModalUnitId, setAttachModalUnitId] = useState<string | null>(null);
  const [embarkModalUnitId, setEmbarkModalUnitId] = useState<string | null>(null);

  // Leader-attachment warning popup on deployment
  const [leaderWarningState, setLeaderWarningState] = useState<{
    leaderId: string;
    pendingDropPos?: WorldPoint;
    pendingAction: 'drop' | 'flank' | 'advance_turn';
  } | null>(null);

  // "Done deploying" indicator banner
  const [doneDeployingNotice, setDoneDeployingNotice] = useState<string | null>(null);

  // Pre-battle Army & Map Selection Modal State
  const [showArmySelectionModal, setShowArmySelectionModal] = useState<boolean>(() => !customRoster);
  const [selectedRosterId, setSelectedRosterId] = useState<string>(() => {
    const rosters = StorageService.getRosters();
    return customRoster?.id || rosters[0]?.id || '';
  });
  const [selectedMapId, setSelectedMapId] = useState<string>(() => {
    const maps = StorageService.getMaps();
    return maps[0]?.id || 'map_crimson_foundry';
  });
  const [armySearchTerm, setArmySearchTerm] = useState<string>('');
  const [armyFactionFilter, setArmyFactionFilter] = useState<string>('All');
  const [armyTagFilter, setArmyTagFilter] = useState<string>('All');
  const [isAutoSim, setIsAutoSim] = useState<boolean>(false);
  const [botSelectedNotice, setBotSelectedNotice] = useState<string | null>(null);

  // Dice Tray State
  const [diceCount, setDiceCount] = useState<number>(2);
  const [diceSides, setDiceSides] = useState<number>(6);
  const [diceThreshold, setDiceThreshold] = useState<number>(4);
  const [diceResults, setDiceResults] = useState<number[]>([4, 6]);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [diceHistory, setDiceHistory] = useState<Array<{
    id: string;
    notation: string;
    rolls: number[];
    sum: number;
    successes?: number;
    timestamp: string;
  }>>([
    { id: 'roll_init', notation: '2d6', rolls: [4, 6], sum: 10, successes: 2, timestamp: 'Start' }
  ]);

  // VTT UI Controls
  const [activeTool, setActiveTool] = useState<'select' | 'move' | 'measure' | 'target' | 'inspect'>('select');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [chatInput, setChatInput] = useState<string>('');
  const [rightTab, setRightTab] = useState<'chat' | 'journal' | 'cards' | 'settings'>('chat');

  // VTT Keyboard Shortcut Switcher for Tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        setActiveTool('inspect');
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'm' || e.key === 'M') {
        setActiveTool('measure');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedUnit = gameState.units.find(u => u.id === selectedUnitId && u.stats.lives > 0) || null;
  const targetUnit = gameState.units.find(u => u.id === targetUnitId && u.stats.lives > 0) || null;

  const p1Reserves = gameState.units.filter(u => u.owner === 'player1' && !u.position && u.stats.lives > 0);
  const p2Reserves = gameState.units.filter(u => u.owner === 'player2' && !u.position && u.stats.lives > 0);

  const addLog = (message: string, type: 'info' | 'combat' | 'event' | 'score' | 'charge', source: string = 'GM') => {
    setGameState(prev => ({
      ...prev,
      logs: [
        {
          id: `log_${Date.now()}_${Math.random()}`,
          round: prev.round,
          phase: prev.phase,
          source,
          message,
          type,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.logs.slice(0, 75)
      ]
    }));
  };

  // Chat send handler (supports /roll 1d20, /roll 1d6, /roll 2d6)
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const msg = chatInput.trim();
    if (msg.startsWith('/roll') || msg.startsWith('/r ')) {
      const parts = msg.split(' ');
      const dice = parts[1] || '1d6';
      let sides = 6;
      let count = 1;
      if (dice.includes('d')) {
        const [c, s] = dice.split('d');
        count = parseInt(c) || 1;
        sides = parseInt(s) || 6;
      }
      const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
      const sum = rolls.reduce((a, b) => a + b, 0);
      addLog(`🎲 Rolled ${dice}: [${rolls.join(', ')}] = ${sum}`, 'combat', 'Dice');
    } else {
      addLog(msg, 'info', 'GM');
    }
    setChatInput('');
  };

  // Valid targets for shooting / charge / fight
  const getValidTargetUnits = (): Unit[] => {
    if (!selectedUnit || selectedUnit.owner !== gameState.activePlayer) return [];
    const isAttachedLeader = !!selectedUnit.attachedTo;
    const hostSquad = isAttachedLeader ? gameState.units.find(u => u.id === selectedUnit.attachedTo) : null;
    const effectivePos = selectedUnit.position || hostSquad?.position;
    if (!effectivePos) return [];

    const enemyOwner = selectedUnit.owner === 'player1' ? 'player2' : 'player1';
    const enemies = gameState.units.filter(u => u.owner === enemyOwner && u.position && u.stats.lives > 0);

    if (gameState.phase === 'Action') {
      const remActions = selectedUnit.actionsRemaining ?? 2;
      if (remActions <= 0) return [];

      const attachedLeaders = (selectedUnit.attachedUnits || [])
        .map(id => gameState.units.find(u => u.id === id))
        .filter((l): l is Unit => !!l && (l.stats?.lives ?? 0) > 0);
      const rangedAttachedLeaders = attachedLeaders.filter(l => l.stats.range > 0);

      const canSquadShoot = selectedUnit.stats.range > 0;
      const canLeaderShoot = isAttachedLeader
        ? (selectedUnit.stats.range > 0)
        : (rangedAttachedLeaders.length > 0);
      const canShoot = canSquadShoot || canLeaderShoot;

      const maxRange = Math.max(
        canSquadShoot ? selectedUnit.stats.range : 0,
        isAttachedLeader
          ? (canLeaderShoot ? selectedUnit.stats.range : 0)
          : (rangedAttachedLeaders.reduce((max, l) => Math.max(max, l.stats.range), 0))
      );

      const measuringUnit: Unit = {
        ...(isAttachedLeader && hostSquad ? hostSquad : selectedUnit),
        stats: {
          ...(isAttachedLeader && hostSquad ? hostSquad.stats : selectedUnit.stats),
          range: maxRange
        }
      };

      return enemies.filter(e => {
        // 1. In Melee range (for Fight)
        const inMelee = isUnitInMeleeRange(selectedUnit, e, DEFAULT_GRID_SIZE);
        // 2. In Shooting range (for Shoot)
        const inShoot = canShoot && isUnitInShootingRange(measuringUnit, e, DEFAULT_GRID_SIZE);
        // 3. In Engagement range (for Engage: dist > 0.3 and <= mv + 0.3)
        const { minModelDistPx } = getUnitsModelDistance(selectedUnit, e);
        const dist = minModelDistPx / DEFAULT_GRID_SIZE;
        const inEngagement = dist > 0.3 && dist <= (selectedUnit.stats.mv + 0.3);

        return inMelee || inShoot || inEngagement;
      });
    }

    if (gameState.phase === 'Shooting') {
      const attachedLeaders = (selectedUnit.attachedUnits || [])
        .map(id => gameState.units.find(u => u.id === id))
        .filter((l): l is Unit => !!l && (l.stats?.lives ?? 0) > 0);
      const rangedAttachedLeaders = attachedLeaders.filter(l => l.stats.range > 0 && !l.hasShot);

      const canSquadShoot = selectedUnit.stats.range > 0 && !selectedUnit.hasShot;
      const canLeaderShoot = isAttachedLeader
        ? (selectedUnit.stats.range > 0 && !selectedUnit.hasShot)
        : (rangedAttachedLeaders.length > 0);

      if (!canSquadShoot && !canLeaderShoot) return [];

      const maxRange = Math.max(
        canSquadShoot ? selectedUnit.stats.range : 0,
        isAttachedLeader
          ? (canLeaderShoot ? selectedUnit.stats.range : 0)
          : (rangedAttachedLeaders.reduce((max, l) => Math.max(max, l.stats.range), 0))
      );

      const measuringUnit: Unit = {
        ...(isAttachedLeader && hostSquad ? hostSquad : selectedUnit),
        stats: {
          ...(isAttachedLeader && hostSquad ? hostSquad.stats : selectedUnit.stats),
          range: maxRange
        }
      };

      return enemies.filter(e => isUnitInShootingRange(measuringUnit, e, DEFAULT_GRID_SIZE));
    }

    if (gameState.phase === 'Charge') {
      if (selectedUnit.hasCharged) return [];
      return enemies.filter(e => {
        const { minModelDistPx } = getUnitsModelDistance(selectedUnit, e);
        const dist = minModelDistPx / DEFAULT_GRID_SIZE;
        return dist > 0.3 && dist <= (selectedUnit.stats.mv + 0.3);
      });
    }

    if (gameState.phase === 'Fight') {
      if (selectedUnit.hasFought) return [];
      return enemies.filter(e => isUnitInMeleeRange(selectedUnit, e, DEFAULT_GRID_SIZE));
    }

    return [];
  };

  const validTargets = getValidTargetUnits();

  // Load and Hydrate Selected Armies & Map for Player 1 and Player 2 (Bot)
  const handleConfirmArmySelection = (p1Roster?: ArmyRoster, autoSimMode: boolean = isAutoSim, mapIdToUse: string = selectedMapId) => {
    const allRosters = StorageService.getRosters();
    const allMaps = StorageService.getMaps();
    const chosenP1 = p1Roster || allRosters.find(r => r.id === selectedRosterId) || allRosters[0];
    if (!chosenP1) return;

    const chosenMap = allMaps.find(m => m.id === mapIdToUse) || allMaps[0];
    const mapPois: POI[] = chosenMap && chosenMap.objectives.length > 0 ? chosenMap.objectives.map(obj => ({
      id: obj.id,
      name: obj.name,
      type: (obj.name.toLowerCase().includes('core') || obj.name.toLowerCase().includes('well') || (obj.pointsValue && obj.pointsValue >= 10)) ? 'Special' as const : 'Basic' as const,
      x: obj.x,
      y: obj.y,
      radius: obj.radius || 70,
      multiplier: (obj.name.toLowerCase().includes('core') || obj.name.toLowerCase().includes('well') || (obj.pointsValue && obj.pointsValue >= 10)) ? 2 : 1
    })) : DEFAULT_POIS;

    // Pick Bot opponent army for Player 2 (matched points from an opposing faction)
    const opposingRosters = allRosters.filter(r => r.factionId !== chosenP1.factionId);
    let botRoster = opposingRosters.length > 0
      ? opposingRosters.reduce((closest, curr) => 
          Math.abs(curr.totalPoints - chosenP1.totalPoints) < Math.abs(closest.totalPoints - chosenP1.totalPoints) ? curr : closest
        , opposingRosters[0])
      : allRosters.find(r => r.id !== chosenP1.id) || chosenP1;

    const allTemplates = StorageService.getUnitTemplates();
    const ensureValidLives = (u: any): Unit => {
      const lives = Math.max(1, Number(u.stats?.lives) || 5);
      const modelCount = Math.max(1, Number(u.stats?.modelCount) || 1);
      const tpl = allTemplates.find(t => t.templateId === u.templateId || t.name === u.name);
      return {
        ...u,
        tokenImageUrl: u.tokenImageUrl,
        carryCapacity: u.carryCapacity ?? u.stats?.carryCapacity,
        abilities: (u.abilities && u.abilities.length > 0) ? u.abilities : (tpl?.abilities || []),
        traits: (u.traits && u.traits.length > 0) ? u.traits : (tpl?.traits || []),
        stats: {
          ...u.stats,
          lives,
          maxLives: Math.max(lives, Number(u.stats?.maxLives) || lives),
          modelCount,
          hpPerModel: Math.max(1, Math.floor(lives / modelCount)),
          baseMv: u.stats?.baseMv ?? u.stats?.mv ?? 5,
          carryCapacity: u.carryCapacity ?? u.stats?.carryCapacity
        }
      };
    };

    // Map Player 1 units: all undeployed in Army Tray
    const hydratedP1 = chosenP1.units.map((u, i) => syncUnitTokens(ensureValidLives({
      ...u,
      id: `p1_${u.id || i}_${Date.now()}`,
      owner: 'player1' as const,
      position: null,
      tokens: [],
      formation: u.formation || 'circle',
      transportCapacity: u.type === 'Vehicle' ? (u.transportCapacity || 1) : undefined
    })));

    // Map Player 2 units: all undeployed in Army Tray
    const hydratedP2 = botRoster.units.map((u, i) => syncUnitTokens(ensureValidLives({
      ...u,
      id: `p2_${u.id || i}_${Date.now()}`,
      owner: 'player2' as const,
      position: null,
      tokens: [],
      formation: u.formation || 'circle',
      transportCapacity: u.type === 'Vehicle' ? (u.transportCapacity || 1) : undefined
    })));

    // Deployment coin flip
    const deploymentCoinFlip: 'player1' | 'player2' = Math.random() >= 0.5 ? 'player1' : 'player2';

    const p1AllCards = [...SECONDARY_MISSION_CARDS, ...FIELD_EFFECT_CARDS, ...GENERAL_CARDS, ...(FACTION_CARDS[chosenP1.factionId] || [])];
    const p2AllCards = [...SECONDARY_MISSION_CARDS, ...FIELD_EFFECT_CARDS, ...GENERAL_CARDS, ...(FACTION_CARDS[botRoster.factionId] || [])];

    const matchLogs: CombatLogEntry[] = [
      {
        id: `log_init_${Date.now()}`,
        round: 1,
        phase: 'Deployment',
        source: 'Deployment Matrix',
        message: `⚔️ Force Assembled: Player 1 commanded by "${chosenP1.name}" (${chosenP1.totalPoints} pts, ${hydratedP1.length} squads).`,
        type: 'info',
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: `log_map_${Date.now() + 1}`,
        round: 1,
        phase: 'Deployment',
        source: 'Sector Architect',
        message: `🗺️ Sector Selected: "${chosenMap?.name || 'Convergence Arena'}" (${chosenMap?.theme || 'Industrial'} theme, ${chosenMap?.objectives.length || 0} objectives, ${chosenMap?.terrain.length || 0} terrain features).`,
        type: 'info',
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: `log_bot_${Date.now() + 2}`,
        round: 1,
        phase: 'Deployment',
        source: 'AI Opponent',
        message: `🤖 Opponent Bot has selected: "${botRoster.name}" (${botRoster.totalPoints} pts, ${hydratedP2.length} squads).`,
        type: 'event',
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: `log_flip_${Date.now() + 3}`,
        round: 1,
        phase: 'Deployment',
        source: 'Deployment Matrix',
        message: `🪙 Deployment Coin Flip: ${deploymentCoinFlip === 'player1' ? 'Player 1 (West)' : 'Player 2 (East / Bot)'} won and deploys first! Players alternate placing 1 unit per turn.`,
        type: 'info',
        timestamp: new Date().toLocaleTimeString()
      }
    ];

    setGameState(prev => ({
      ...prev,
      matchId: `match_${Date.now()}`,
      round: 1,
      phase: 'Deployment',
      activePlayer: deploymentCoinFlip,
      deployingPlayer: deploymentCoinFlip,
      deploymentCoinFlipWinner: deploymentCoinFlip,
      currentMap: chosenMap,
      pois: mapPois,
      units: [...hydratedP1, ...hydratedP2],
      player1CardPool: p1AllCards,
      player1ActiveCards: p1AllCards.slice(0, 4),
      player2CardPool: p2AllCards,
      player2ActiveCards: p2AllCards.slice(0, 4),
      player1Score: 0,
      player2Score: 0,
      player1Kills: 0,
      player2Kills: 0,
      logs: matchLogs
    }));

    setSelectedUnitId(null);
    setTargetUnitId(null);
    setShowArmySelectionModal(false);
    setArmyTrayDrawerOpen(false);

    setBotSelectedNotice(`Bot selected: "${botRoster.name}" (${botRoster.totalPoints} pts)`);
    setTimeout(() => setBotSelectedNotice(null), 4500);
  };

  // Alternating Deployment Turn State Machine
  const progressDeploymentAlternation = (currentDeployer: 'player1' | 'player2', currentUnits: Unit[]) => {
    const p1Remaining = currentUnits.filter(u => u.owner === 'player1' && !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo && u.stats.lives > 0).length;
    const p2Remaining = currentUnits.filter(u => u.owner === 'player2' && !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo && u.stats.lives > 0).length;

    if (p1Remaining === 0 && p2Remaining === 0) {
      // Both players have zero units left to deploy! Advance to Round 1 Command Phase
      setDoneDeployingNotice('🏁 All forces deployed or held in Strategic Reserves! Advancing to Round 1 Command Phase.');
      setTimeout(() => setDoneDeployingNotice(null), 4500);

      setGameState(prev => ({
        ...prev,
        round: 1,
        phase: 'Command',
        activePlayer: 'player1',
        deployingPlayer: undefined,
        player1CP: (prev.player1CP ?? 3) + 1,
        units: currentUnits,
        logs: [
          {
            id: `log_${Date.now()}`,
            round: 1,
            phase: 'Command',
            source: 'Deployment Matrix',
            message: '🏁 All forces deployed or placed in Strategic Reserve! Round 1 Commencing — Player 1: Command Phase (+1 CP).',
            type: 'info',
            timestamp: new Date().toLocaleTimeString()
          },
          ...prev.logs.slice(0, 74)
        ]
      }));
      return;
    }

    // Check if the current deployer just finished all their units
    const currentDeployerRemaining = currentDeployer === 'player1' ? p1Remaining : p2Remaining;
    if (currentDeployerRemaining === 0) {
      setDoneDeployingNotice(`✅ ${currentDeployer === 'player1' ? 'Player 1' : 'Player 2'} has finished deploying! Passing turn to opponent.`);
      setTimeout(() => setDoneDeployingNotice(null), 4000);
    }

    let nextDeployer: 'player1' | 'player2';
    if (currentDeployer === 'player1') {
      nextDeployer = p2Remaining > 0 ? 'player2' : 'player1';
    } else {
      nextDeployer = p1Remaining > 0 ? 'player1' : 'player2';
    }

    setGameState(prev => ({
      ...prev,
      activePlayer: nextDeployer,
      deployingPlayer: nextDeployer,
      units: currentUnits,
      logs: [
        {
          id: `log_${Date.now()}`,
          round: prev.round,
          phase: 'Deployment',
          source: 'Deployment Matrix',
          message: `Deployment Turn: ${nextDeployer === 'player1' ? 'Player 1 (West)' : 'Player 2 (East / Bot)'}. Tray remaining: P1 (${p1Remaining}), P2 (${p2Remaining}).`,
          type: 'info',
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.logs.slice(0, 74)
      ]
    }));
  };

  // Hold an undeployed unit in Strategic Reserve during Deployment
  const handleHoldInStrategicReserve = (unitId: string) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit) return;
    if (gameState.phase !== 'Deployment') {
      addLog('Units can only be placed into Strategic Reserve during Deployment.', 'info');
      return;
    }
    const currentDeployer = gameState.deployingPlayer || gameState.activePlayer;
    if (unit.owner !== currentDeployer) {
      addLog(`It is ${currentDeployer === 'player1' ? 'Player 1' : 'Player 2'}'s turn to deploy!`, 'info');
      return;
    }

    const updatedUnits = gameState.units.map(u => u.id === unitId ? setUnitMutualState(u, 'reserve') : u);
    addLog(`📦 ${unit.name} held back in Strategic Reserves (Deployable from Round 2+ Movement Phase).`, 'event');
    progressDeploymentAlternation(unit.owner, updatedUnits);
  };

  // Deploy a unit from Strategic Reserve (Round 2+ Movement Phase Only)
  const handleDeployFromReserve = (unitId: string) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit || !unit.inStrategicReserve) return;
    if (gameState.phase !== 'Movement') {
      addLog('⛔ Reserve units may ONLY enter the battlefield during the Movement Phase!', 'info');
      return;
    }
    if (gameState.round < 2) {
      addLog('⛔ Strategic Reserves can only arrive on the board from Round 2 onward!', 'info');
      return;
    }
    if (unit.owner !== gameState.activePlayer) {
      addLog(`Not ${unit.owner}'s turn to move.`, 'info');
      return;
    }

    const deployedCount = gameState.units.filter(u => u.owner === unit.owner && u.position).length;
    const edgeX = unit.owner === 'player1' ? 80 + (deployedCount % 2) * 45 : 1120 - (deployedCount % 2) * 45;
    const edgeY = 160 + (deployedCount % 5) * 110;
    const deployPos = { x: edgeX, y: edgeY };

    const deployed = moveUnit({ ...setUnitMutualState(unit, 'onBoard', { position: deployPos }), hasMoved: true }, deployPos);
    setGameState(prev => ({
      ...prev,
      units: prev.units.map(u => u.id === unitId ? deployed : u)
    }));
    setSelectedUnitId(unit.id);
    addLog(`📦 ${unit.name} arrived from Strategic Reserves at (${deployPos.x}px, ${deployPos.y}px)! (Counts as moved)`, 'event');
    if (unit.abilities && unit.abilities.length > 0) {
      addLog(`🃏 Added ${unit.name}'s tactical cards to your Hand: ${unit.abilities.map(a => a.name).join(', ')}!`, 'score');
    }
    if (unit.attachedUnits && unit.attachedUnits.length > 0) {
      unit.attachedUnits.forEach(attId => {
        const attLeader = gameState.units.find(u => u.id === attId);
        if (attLeader && attLeader.abilities && attLeader.abilities.length > 0) {
          addLog(`🃏 Added ${attLeader.name}'s tactical cards to your Hand: ${attLeader.abilities.map(a => a.name).join(', ')}!`, 'score');
        }
      });
    }
  };

  // Attach a Leader to an Infantry Bodyguard squad
  const handleAttachLeader = (leaderId: string, bodyguardId: string) => {
    const leader = gameState.units.find(u => u.id === leaderId);
    const bodyguard = gameState.units.find(u => u.id === bodyguardId);
    if (!leader || !bodyguard) return;

    if (gameState.phase !== 'Deployment') {
      addLog('⛔ Attachment Locked: Leaders can only attach to bodyguard squads during Deployment Phase.', 'info');
      return;
    }

    const p1Zone = gameState.currentMap?.deploymentZones.player1.maxX ?? 200;
    const p2Zone = gameState.currentMap ? (1200 - gameState.currentMap.deploymentZones.player2.minX) : 200;
    const zoneDepth = bodyguard.owner === 'player1' ? p1Zone : p2Zone;

    if (!canAttachLeader(leader, bodyguard, zoneDepth, 1200)) {
      if (bodyguard.position && !isInsideDeploymentZone(bodyguard.position, bodyguard.owner, 1200, zoneDepth) && !canUnitDeployOutsideZone(leader)) {
        addLog(`⛔ Cannot attach ${leader.name} to ${bodyguard.name}: ${bodyguard.name} is deployed outside the deployment zone, and ${leader.name} cannot infiltrate!`, 'info');
      } else {
        addLog(`Cannot attach ${leader.name} to ${bodyguard.name}.`, 'info');
      }
      return;
    }

    const updatedLeader = setUnitMutualState(leader, 'attached', { leaderTargetId: bodyguard.id });
    const nextAttached = [...(bodyguard.attachedUnits || []), leader.id];
    const updatedBodyguard = { ...bodyguard, attachedUnits: nextAttached };

    let updatedUnits = gameState.units.map(u => {
      if (u.id === leaderId) return updatedLeader;
      if (u.id === bodyguardId) return updatedBodyguard;
      return u;
    });

    // Re-sync bodyguard squad tokens so leader model appears at front/center with Leader badge
    updatedUnits = updatedUnits.map(u => u.id === bodyguardId ? syncUnitTokens(u, updatedUnits) : u);

    addLog(`👑 ${leader.name} attached to command ${bodyguard.name}! Leader crest displayed on token.`, 'event');
    setAttachModalUnitId(null);
    setSelectedUnitId(bodyguard.id); // Switch selection to bodyguard squad!

    if (gameState.phase === 'Deployment') {
      if (bodyguard.position) {
        progressDeploymentAlternation(leader.owner, updatedUnits);
      } else {
        setGameState(prev => ({ ...prev, units: updatedUnits }));
      }
    } else {
      setGameState(prev => ({ ...prev, units: updatedUnits }));
    }
  };

  // Detach a Leader from a squad (Strictly Deployment Phase only - BUG-020)
  const handleDetachLeader = (bodyguardId: string, leaderId: string) => {
    const bodyguard = gameState.units.find(u => u.id === bodyguardId);
    const leader = gameState.units.find(u => u.id === leaderId);
    if (!bodyguard || !leader) return;

    if (gameState.phase !== 'Deployment') {
      addLog('⛔ Detachment Locked: Leaders can only be attached or detached during Deployment Phase.', 'info');
      return;
    }

    const spawnPos = bodyguard.position ? { x: bodyguard.position.x + 60, y: bodyguard.position.y } : { x: 200, y: 200 };
    const updatedLeader = moveUnit(setUnitMutualState(leader, 'onBoard', { position: spawnPos }), spawnPos);
    const updatedBodyguard = {
      ...bodyguard,
      attachedUnits: (bodyguard.attachedUnits || []).filter(id => id !== leaderId)
    };

    let updatedUnits = gameState.units.map(u => {
      if (u.id === leaderId) return updatedLeader;
      if (u.id === bodyguardId) return updatedBodyguard;
      return u;
    });

    updatedUnits = updatedUnits.map(u => u.id === bodyguardId ? syncUnitTokens(u, updatedUnits) : u);

    addLog(`👑 ${leader.name} detached from ${bodyguard.name}.`, 'info');
    setGameState(prev => ({ ...prev, units: updatedUnits }));
    setSelectedUnitId(leader.id);
  };

  // Embark an Infantry Squad into a Transport Vehicle (RULE-001: Once per phase restriction + Fight phase exception)
  const handleEmbarkUnit = (infantryId: string, vehicleId: string) => {
    const infantry = gameState.units.find(u => u.id === infantryId);
    const vehicle = gameState.units.find(u => u.id === vehicleId);
    if (!infantry || !vehicle) return;

    // RULE-001: Cannot embark if already embarked in this phase
    if (infantry.lastEmbarkPhase === gameState.phase && infantry.lastEmbarkRound === gameState.round) {
      addLog(`⛔ Action Restricted: ${infantry.name} has already embarked in this phase.`, 'info');
      return;
    }

    // RULE-001: Cannot embark if already disembarked in this phase (unless Fight/Action phase exception)
    const isFightReembark = (gameState.phase === 'Fight' || gameState.phase === 'Action') && infantry.lastDisembarkRound === gameState.round && infantry.lastDisembarkPhase !== gameState.phase;
    if (infantry.lastDisembarkPhase === gameState.phase && infantry.lastDisembarkRound === gameState.round) {
      addLog(`⛔ Action Restricted: ${infantry.name} cannot embark and disembark in the same phase!`, 'info');
      return;
    }

    if (gameState.phase !== 'Deployment' && gameState.phase !== 'Movement' && !isFightReembark) {
      addLog('Units can only embark during Deployment or Movement Phase (or re-embark in Action Phase if disembarked earlier this round).', 'info');
      return;
    }

    const currentEmbarkedUnits = gameState.units.filter(u => u.embarkedIn === vehicle.id);
    const currentEmbarkedModels = currentEmbarkedUnits.reduce((acc, u) => acc + (u.stats.modelCount || 1) + (u.attachedUnits?.length || 0), 0);
    
    // Proximity check if unit is already placed on the battlefield
    if (infantry.position && vehicle.position) {
      const distCheck = canEmbarkWithDistance(infantry, vehicle, currentEmbarkedModels, 150);
      if (!distCheck.canEmbark) {
        addLog(`⛔ Cannot Embark: ${distCheck.reason}`, 'event');
        return;
      }
    } else if (!canEmbark(infantry, vehicle, currentEmbarkedModels)) {
      const maxCap = vehicle.carryCapacity ?? vehicle.stats?.carryCapacity ?? 6;
      addLog(`Cannot embark ${infantry.name} into ${vehicle.name}: vehicle capacity exceeded (Current: ${currentEmbarkedModels}/${maxCap} models).`, 'info');
      return;
    }

    const updatedInfantry: Unit = {
      ...setUnitMutualState(infantry, 'embarked', { vehicleId: vehicle.id }),
      isPendingMoveConfirm: false,
      isPendingDisembarkConfirm: false,
      pendingOriginalPosition: null,
      pendingOriginalTokens: null,
      hasMoved: true,
      lastEmbarkPhase: gameState.phase,
      lastEmbarkRound: gameState.round
    };

    // Also embark any attached leaders with the bodyguard squad! (BUG-010)
    let updatedUnits = gameState.units.map(u => {
      if (u.id === infantryId) return updatedInfantry;
      if (infantry.attachedUnits && infantry.attachedUnits.includes(u.id)) {
        return {
          ...setUnitMutualState(u, 'embarked', { vehicleId: vehicle.id }),
          isPendingMoveConfirm: false,
          isPendingDisembarkConfirm: false,
          pendingOriginalPosition: null,
          pendingOriginalTokens: null,
          hasMoved: true,
          lastEmbarkPhase: gameState.phase,
          lastEmbarkRound: gameState.round
        };
      }
      return u;
    });

    addLog(`🛡️ ${infantry.name}${infantry.attachedUnits?.length ? ' (with Commander)' : ''} embarked into transport ${vehicle.name}.`, 'event');
    setEmbarkModalUnitId(null);

    // Switch selection to the transport vehicle so the player can immediately control the vehicle or select another unit without freeze
    if (selectedUnitId === infantryId || (infantry.attachedUnits && infantry.attachedUnits.includes(selectedUnitId || ''))) {
      setSelectedUnitId(vehicle.id);
    }

    if (gameState.phase === 'Deployment') {
      if (vehicle.position) {
        progressDeploymentAlternation(infantry.owner, updatedUnits);
      } else {
        setGameState(prev => ({ ...prev, units: updatedUnits }));
      }
    } else {
      setGameState(prev => ({ ...prev, units: updatedUnits }));
    }
  };

  // Disembark an Infantry Squad from a Transport Vehicle (RULE-001 & RULE-002: Staged free manual placement)
  const handleDisembarkUnit = (infantryId: string) => {
    const infantry = gameState.units.find(u => u.id === infantryId);
    if (!infantry || !infantry.embarkedIn) return;
    const vehicle = gameState.units.find(u => u.id === infantry.embarkedIn);
    if (!vehicle) return;

    if (gameState.phase !== 'Movement') {
      addLog('Units can only disembark during Movement Phase.', 'info');
      return;
    }
    if (infantry.owner !== gameState.activePlayer) {
      addLog(`Not ${infantry.owner}'s turn to move.`, 'info');
      return;
    }

    // RULE-001: Once per phase restriction
    if (infantry.lastDisembarkPhase === gameState.phase && infantry.lastDisembarkRound === gameState.round) {
      addLog(`⛔ Action Restricted: ${infantry.name} has already disembarked in this phase.`, 'info');
      return;
    }
    if (infantry.lastEmbarkPhase === gameState.phase && infantry.lastEmbarkRound === gameState.round) {
      addLog(`⛔ Action Restricted: ${infantry.name} cannot embark and disembark in the same phase!`, 'info');
      return;
    }

    // Initial drop point adjacent to vehicle footprint
    const disembarkPos = findValidDisembarkPosition(infantry, vehicle, gameState.units) || {
      x: vehicle.position ? vehicle.position.x + 60 : 600,
      y: vehicle.position ? vehicle.position.y : 400
    };

    // Staging the squad for free manual positioning (RULE-002)
    let updatedUnits = gameState.units.map(u => {
      if (infantry.attachedUnits && infantry.attachedUnits.includes(u.id)) {
        return {
          ...setUnitMutualState(u, 'attached', { leaderTargetId: infantry.id, position: disembarkPos }),
          position: disembarkPos,
          isPendingDisembarkConfirm: true,
          disembarkingFromVehicleId: vehicle.id
        };
      }
      return u;
    });

    const staged = moveUnit({ 
      ...setUnitMutualState(infantry, 'onBoard', { position: disembarkPos }), 
      hasCustomTokenPositions: false,
      isPendingDisembarkConfirm: true,
      disembarkingFromVehicleId: vehicle.id,
      pendingOriginalPosition: null,
      pendingOriginalTokens: null
    }, disembarkPos, updatedUnits);

    updatedUnits = updatedUnits.map(u => u.id === infantryId ? staged : u);
    updatedUnits = updatedUnits.map(u => u.id === infantryId ? syncUnitTokens(u, updatedUnits) : u);

    setGameState(prev => ({
      ...prev,
      units: updatedUnits
    }));
    setSelectedUnitId(infantry.id);
    addLog(`🛡️ ${infantry.name} disembarking from ${vehicle.name}! Models staged on board. Drag models freely (within 3" of transport, in 2" coherency), then click Confirm Disembark.`, 'event');
  };

  // Confirm staged disembark placement (RULE-002)
  const handleConfirmDisembark = (unitId: string) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit || !unit.isPendingDisembarkConfirm || !unit.disembarkingFromVehicleId) return;
    const vehicle = gameState.units.find(u => u.id === unit.disembarkingFromVehicleId);
    if (!vehicle) return;

    // Validate placement against RULE-002:
    // (a) 2" coherency is maintained
    // (b) all models within 3" of vehicle
    // (c) no base overlaps exist with vehicle or other units
    const validation = validateDisembarkPlacement(unit, vehicle, gameState.units, 150, 100);
    if (!validation.valid) {
      addLog(`⛔ Disembark Placement Invalid: ${validation.reason}`, 'event');
      if (validation.offendingTokenIds && validation.offendingTokenIds.length > 0) {
        setGameState(prev => ({
          ...prev,
          units: prev.units.map(u => u.id === unitId ? {
            ...u,
            tokens: (u.tokens || []).map(t => ({
              ...t,
              offendingCoherency: validation.offendingTokenIds!.includes(t.id)
            }))
          } : u)
        }));
      }
      return;
    }

    // Mark as confirmed and moved
    let updatedUnits = gameState.units.map(u => {
      if (u.id === unitId) {
        return {
          ...u,
          isPendingDisembarkConfirm: false,
          disembarkingFromVehicleId: null,
          hasMoved: true,
          lastDisembarkPhase: gameState.phase,
          lastDisembarkRound: gameState.round,
          tokens: (u.tokens || []).map(t => ({
            ...t,
            offendingCoherency: false,
            turnStartPos: { x: t.x, y: t.y }
          }))
        };
      }
      if (unit.attachedUnits && unit.attachedUnits.includes(u.id)) {
        return {
          ...u,
          isPendingDisembarkConfirm: false,
          disembarkingFromVehicleId: null,
          hasMoved: true,
          lastDisembarkPhase: gameState.phase,
          lastDisembarkRound: gameState.round
        };
      }
      return u;
    });

    setGameState(prev => ({
      ...prev,
      units: updatedUnits
    }));
    addLog(`✅ Disembark Confirmed! ${unit.name} successfully deployed outside ${vehicle.name} with full coherency and zero overlap. (Counts as moved)`, 'event');
  };

  // Cancel staged disembark and return inside vehicle (RULE-002)
  const handleCancelDisembark = (unitId: string) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit || !unit.isPendingDisembarkConfirm || !unit.disembarkingFromVehicleId) return;
    const vehicleId = unit.disembarkingFromVehicleId;
    const vehicle = gameState.units.find(u => u.id === vehicleId);

    let updatedUnits = gameState.units.map(u => {
      if (u.id === unitId) {
        return {
          ...setUnitMutualState(u, 'embarked', { vehicleId }),
          isPendingDisembarkConfirm: false,
          disembarkingFromVehicleId: null
        };
      }
      if (unit.attachedUnits && unit.attachedUnits.includes(u.id)) {
        return {
          ...setUnitMutualState(u, 'embarked', { vehicleId }),
          isPendingDisembarkConfirm: false,
          disembarkingFromVehicleId: null
        };
      }
      return u;
    });

    setGameState(prev => ({
      ...prev,
      units: updatedUnits
    }));
    setSelectedUnitId(vehicleId);
    addLog(`↩ Disembark cancelled. ${unit.name} returned inside transport ${vehicle?.name || 'vehicle'}.`, 'info');
  };

  // VTT Tabletop Canvas Movement Handler
  const handleCanvasMoveUnit = (unitId: string, newPos: WorldPoint) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit) return;

    if (gameState.phase === 'Deployment') {
      const currentDeployer = gameState.deployingPlayer || gameState.activePlayer;
      if (unit.owner !== currentDeployer) {
        const msg = `⚠️ It is ${currentDeployer === 'player1' ? 'Player 1' : 'Player 2 (Bot)'}'s turn to deploy!`;
        addLog(msg, 'info');
        setDeploymentErrorNotice(msg);
        setTimeout(() => setDeploymentErrorNotice(null), 3500);
        return;
      }

      // Hard Deployment Zone Restriction Check
      const p1Zone = gameState.currentMap?.deploymentZones.player1.maxX ?? 200;
      const p2Zone = gameState.currentMap ? (1200 - gameState.currentMap.deploymentZones.player2.minX) : 200;
      const zoneDepth = unit.owner === 'player1' ? p1Zone : p2Zone;

      const canBypass = canUnitDeployOutsideZone(unit, gameState.units);
      const inZone = isInsideDeploymentZone(newPos, unit.owner, 1200, zoneDepth);

      if (!canBypass && !inZone) {
        const hasInfiltratorTrait = !!(
          unit.canDeployOutsideZone ||
          unit.traits?.includes('Infiltrator') ||
          unit.traits?.includes('DEPLOY_OUTSIDE_ZONE') ||
          unit.passives?.some(p => p.toUpperCase().includes('INFILTRATOR') || p.toUpperCase().includes('DEPLOY_OUTSIDE_ZONE'))
        );
        const leaderBlocked = hasInfiltratorTrait && ((unit.attachedUnits && unit.attachedUnits.length > 0) || !!unit.attachedTo);
        const msg = leaderBlocked
          ? `⛔ Placement Rejected! ${unit.name} has Infiltrator, but an attached Leader lacks Infiltrator! Infiltration is blocked.`
          : `⛔ Placement Rejected! ${unit.name} cannot deploy outside your designated deployment zone (${unit.owner === 'player1' ? `West: x ≤ ${p1Zone}px` : `East: x ≥ ${1200 - p2Zone}px`}).`;
        addLog(msg, 'info');
        setDeploymentErrorNotice(msg);
        setTimeout(() => setDeploymentErrorNotice(null), 4000);
        return;
      }

      const zoneBounds = {
        minX: unit.owner === 'player1' ? 0 : 1200 - zoneDepth,
        maxX: unit.owner === 'player1' ? zoneDepth : 1200,
        minY: 0,
        maxY: 800
      };

      const fitRes = fitFormationToZone(unit, newPos, unit.formation || 'auto', zoneBounds, canBypass);
      const deployedUnit = fitRes.unit;

      // Universal Collision Check (No model base overlap, tangents permitted)
      // Exclude unit itself and any of its attached leaders from colliding with itself (BUG-007)
      const collisionCheck = checkUniversalTokenCollisions(
        deployedUnit.tokens || [], 
        gameState.units.filter(u => !deployedUnit.attachedUnits?.includes(u.id)), 
        unit.id
      );
      if (collisionCheck.hasCollision) {
        const msg = `⛔ Placement Rejected! Model base overlaps with ${collisionCheck.collidingUnitName}!`;
        addLog(msg, 'info');
        setDeploymentErrorNotice(msg);
        setTimeout(() => setDeploymentErrorNotice(null), 4000);
        return;
      }

      const wasAlreadyPlaced = !!unit.position;
      const isPending = wasAlreadyPlaced ? (unit.isPendingDeploymentConfirm ?? false) : true;
      let updatedUnits = gameState.units.map(u => u.id === unitId ? { ...deployedUnit, isPendingDeploymentConfirm: isPending } : u);

      // If unit has pre-attached leaders, also set their positions and sync squad tokens
      if (deployedUnit.attachedUnits && deployedUnit.attachedUnits.length > 0) {
        updatedUnits = updatedUnits.map(u => {
          if (deployedUnit.attachedUnits!.includes(u.id)) {
            return { ...u, position: newPos, isPendingDeploymentConfirm: isPending };
          }
          return u;
        });
        updatedUnits = updatedUnits.map(u => u.id === unitId ? syncUnitTokens(u, updatedUnits) : u);
      }

      addLog(`🎯 ${unit.name} ${wasAlreadyPlaced ? 'repositioned' : 'deployed'} to (${Math.round(newPos.x)}px, ${Math.round(newPos.y)}px).`, 'info');
      setSelectedUnitId(unit.id);

      // Repositioning within deployment zone does NOT advance turn; commits via Confirm Placement
      setGameState(prev => ({ ...prev, units: updatedUnits }));
      return;
    }

    if (gameState.phase === 'Movement') {
      if (unit.owner !== gameState.activePlayer) {
        addLog(`Not ${unit.owner}'s turn to move.`, 'info');
        return;
      }
      if (unit.hasMoved && !unit.isPendingMoveConfirm) {
        addLog(`⛔ Action Rejected! ${unit.name} already moved this turn.`, 'info');
        return;
      }
      if (!unit.position) return;

      const originPos = unit.pendingOriginalPosition || unit.position;
      const distSquares = gridDistance(originPos, newPos, DEFAULT_GRID_SIZE);
      if (distSquares > unit.stats.mv + 0.1) {
        addLog(`Move distance (${distSquares.toFixed(1)} sq) exceeds Mv (${unit.stats.mv} sq).`, 'info');
        return;
      }

      // Check multi-level structure traversal constraints (e.g. vehicles & huge units)
      const pathCheck = checkPathCrossesStructure(originPos, newPos, unit, gameState.currentMap?.structures);
      if (!pathCheck.allowed) {
        addLog(`⛔ Movement Blocked! ${unit.name} cannot traverse structure: ${pathCheck.reason}`, 'info');
        return;
      }
      if (pathCheck.consumesFullMove) {
        addLog(`⚠️ Structure Entry/Exit: ${unit.name} consumes full movement entering/exiting structure.`, 'info');
      }

      const pendingOrigPos = unit.pendingOriginalPosition || unit.position;
      const pendingOrigTokens = unit.pendingOriginalTokens || (unit.tokens ? JSON.parse(JSON.stringify(unit.tokens)) : undefined);

      const movedUnit = moveUnit({ 
        ...unit, 
        isPendingMoveConfirm: true, 
        pendingOriginalPosition: pendingOrigPos,
        pendingOriginalTokens: pendingOrigTokens
      }, newPos, gameState.units);

      // 1" Enemy Proximity Check (BUG-019: Cannot end within 1" / 50px of an enemy model)
      const proxCheck = validateNormalMovementEnemyProximity(unit, movedUnit.tokens || [], gameState.units, 50);
      if (!proxCheck.valid) {
        addLog(`⛔ Movement Blocked: Normal movement cannot end within 1" (50px) of enemy ${proxCheck.offendingEnemyUnit?.name}! Only a Charge move can enter Engagement Range.`, 'event');
        return;
      }

      // Universal Collision Check (No model base overlap, tangents permitted)
      const collisionCheck = checkUniversalTokenCollisions(movedUnit.tokens || [], gameState.units, unit.id);
      if (collisionCheck.hasCollision) {
        addLog(`⛔ Movement Blocked: Base overlap with ${collisionCheck.collidingUnitName}!`, 'info');
        return;
      }

      // Swept path collision check (BUG-024): Cannot cross through other units unless FLY
      const pathCheckUnits = checkPathCrossesUnits(unit, originPos, newPos, gameState.units);
      if (pathCheckUnits.hasCollision) {
        addLog(`⛔ Movement Blocked! ${pathCheckUnits.reason || 'Path cuts through another unit.'} (Units cannot move through other models without FLY).`, 'event');
        return;
      }

      setGameState(prev => {
        let nextUnits = prev.units.map(u => u.id === unitId ? movedUnit : u);
        // BUG-001: Keep attached leader position parented to bodyguard squad
        if (movedUnit.attachedUnits && movedUnit.attachedUnits.length > 0) {
          const leaderToken = movedUnit.tokens?.find(t => t.isLeaderToken);
          const leaderPos = leaderToken ? { x: leaderToken.x, y: leaderToken.y } : newPos;
          nextUnits = nextUnits.map(u => {
            if (movedUnit.attachedUnits!.includes(u.id)) {
              return {
                ...u,
                position: leaderPos,
                hasMoved: true,
                isPendingMoveConfirm: true,
                pendingOriginalPosition: u.pendingOriginalPosition || u.position
              };
            }
            return u;
          });
          nextUnits = nextUnits.map(u => u.id === unitId ? syncUnitTokens(u, nextUnits) : u);
        }
        return { ...prev, units: nextUnits };
      });

      addLog(`♟️ ${unit.name} moved to (${Math.round(newPos.x)}px, ${Math.round(newPos.y)}px). Confirm movement when finished.`, 'info');
      setSelectedUnitId(unit.id);
      return;
    }
  };

  // Move Individual Token Model within a Squad (Deployment Manual Mode & Movement Phase)
  const handleMoveIndividualModel = (unitId: string, tokenId: string, newWorldPos: WorldPoint) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit) return;

    // Support Manual Placement Mode during Deployment Phase (BUG-013)
    if (gameState.phase === 'Deployment') {
      const currentDeployer = gameState.deployingPlayer || gameState.activePlayer;
      if (unit.owner !== currentDeployer) {
        const msg = `⚠️ It is ${currentDeployer === 'player1' ? 'Player 1' : 'Player 2 (Bot)'}'s turn to deploy!`;
        addLog(msg, 'info');
        setDeploymentErrorNotice(msg);
        setTimeout(() => setDeploymentErrorNotice(null), 3500);
        return;
      }

      const p1Zone = gameState.currentMap?.deploymentZones.player1.maxX ?? 200;
      const p2Zone = gameState.currentMap ? (1200 - gameState.currentMap.deploymentZones.player2.minX) : 200;
      const zoneDepth = unit.owner === 'player1' ? p1Zone : p2Zone;

      const canBypass = canUnitDeployOutsideZone(unit, gameState.units);
      const inZone = isInsideDeploymentZone(newWorldPos, unit.owner, 1200, zoneDepth);

      if (!canBypass && !inZone) {
        const msg = `⛔ Placement Rejected! Model cannot deploy outside your designated deployment zone!`;
        addLog(msg, 'info');
        setDeploymentErrorNotice(msg);
        setTimeout(() => setDeploymentErrorNotice(null), 4000);
        return;
      }

      const tokenToMove = unit.tokens?.find(t => t.id === tokenId);
      if (tokenToMove) {
        const candidateTok = { ...tokenToMove, x: newWorldPos.x, y: newWorldPos.y };
        const colCheck = checkUniversalTokenCollisions([candidateTok], gameState.units, unit.id, tokenId);
        if (colCheck.hasCollision) {
          const msg = `⛔ Placement Rejected: Model base overlaps with ${colCheck.collidingUnitName}!`;
          addLog(msg, 'info');
          setDeploymentErrorNotice(msg);
          setTimeout(() => setDeploymentErrorNotice(null), 4000);
          return;
        }
      }

      const updatedUnit = moveIndividualToken(unit, tokenId, newWorldPos);
      let updatedUnits = gameState.units.map(u => u.id === unitId ? { ...updatedUnit, isPendingDeploymentConfirm: true } : u);

      if (unit.attachedUnits && unit.attachedUnits.length > 0) {
        const leaderTok = updatedUnit.tokens?.find(t => t.isLeaderToken);
        const leaderPos = leaderTok ? { x: leaderTok.x, y: leaderTok.y } : updatedUnit.position;
        updatedUnits = updatedUnits.map(u => {
          if (unit.attachedUnits!.includes(u.id)) {
            return { ...u, position: leaderPos, isPendingDeploymentConfirm: true };
          }
          return u;
        });
      }

      setGameState(prev => ({ ...prev, units: updatedUnits }));
      setSelectedUnitId(unit.id);
      return;
    }

    if (gameState.phase !== 'Movement') {
      addLog('Individual model movement is only permitted during Deployment or Movement Phase.', 'info');
      return;
    }

    if (unit.owner !== gameState.activePlayer) {
      addLog(`Not ${unit.owner}'s turn to move.`, 'info');
      return;
    }

    if (unit.hasMoved && !unit.isPendingMoveConfirm && !unit.isPendingDisembarkConfirm) {
      addLog(`⛔ Action Rejected! ${unit.name} already moved this turn.`, 'info');
      return;
    }

    if (!unit.isPendingDisembarkConfirm) {
      // Anti-Relay Exploit Prevention: Validate movement against turnStartPos
      const distCheck = validateModelMovementDistance(unit, tokenId, newWorldPos);
      if (!distCheck.valid) {
        addLog(`⛔ Exploit Blocked: ${distCheck.reason}`, 'info');
        return;
      }
    }

    // 1" Enemy proximity check (BUG-019)
    const tokenToMove = unit.tokens?.find(t => t.id === tokenId);
    if (tokenToMove) {
      const candidateTok = { ...tokenToMove, x: newWorldPos.x, y: newWorldPos.y };
      const proxCheck = validateNormalMovementEnemyProximity(unit, [candidateTok], gameState.units, 50);
      if (!proxCheck.valid) {
        addLog(`⛔ Movement Blocked: Model cannot end within 1" (50px) of enemy ${proxCheck.offendingEnemyUnit?.name}! Only a Charge move can enter Engagement Range.`, 'event');
        return;
      }

      // Universal Collision Check (No model base overlap, tangents permitted)
      const colCheck = checkUniversalTokenCollisions([candidateTok], gameState.units, unit.id, tokenId);
      if (colCheck.hasCollision) {
        addLog(`⛔ Movement Rejected: Model base overlaps with ${colCheck.collidingUnitName}! (Tangents permitted, no intersections).`, 'info');
        return;
      }
    }

    const pendingOrigPos = unit.pendingOriginalPosition || unit.position;
    const pendingOrigTokens = unit.pendingOriginalTokens || (unit.tokens ? JSON.parse(JSON.stringify(unit.tokens)) : undefined);

    const updatedUnit = moveIndividualToken({
      ...unit,
      isPendingMoveConfirm: unit.isPendingDisembarkConfirm ? false : true,
      pendingOriginalPosition: pendingOrigPos,
      pendingOriginalTokens: pendingOrigTokens
    }, tokenId, newWorldPos);

    setGameState(prev => {
      let nextUnits = prev.units.map(u => u.id === unitId ? updatedUnit : u);
      // BUG-001: Sync attached leader positions
      if (unit.attachedUnits && unit.attachedUnits.length > 0) {
        const leaderTok = updatedUnit.tokens?.find(t => t.isLeaderToken);
        const leaderPos = leaderTok ? { x: leaderTok.x, y: leaderTok.y } : updatedUnit.position;
        nextUnits = nextUnits.map(u => {
          if (unit.attachedUnits!.includes(u.id)) {
            return {
              ...u,
              position: leaderPos,
              hasMoved: true,
              isPendingMoveConfirm: true,
              pendingOriginalPosition: u.pendingOriginalPosition || u.position
            };
          }
          return u;
        });
      }
      return { ...prev, units: nextUnits };
    });

    setSelectedUnitId(unit.id);
  };

  // BUG-005: Move Group of Selected Tokens Atomically (Preserves Formation)
  const handleMoveGroupTokens = (updates: { unitId: string; tokenId: string; newPos: WorldPoint }[]) => {
    if (!updates || updates.length === 0) return;

    if (gameState.phase !== 'Movement') {
      addLog('Group model movement is only permitted during Movement Phase.', 'info');
      return;
    }

    // Group updates by unitId
    const updatesByUnit: Record<string, { tokenId: string; newPos: WorldPoint }[]> = {};
    for (const up of updates) {
      if (!updatesByUnit[up.unitId]) updatesByUnit[up.unitId] = [];
      updatesByUnit[up.unitId].push({ tokenId: up.tokenId, newPos: up.newPos });
    }

    let nextUnits = [...gameState.units];
    let allValid = true;
    let failureReason = '';

    for (const [unitId, tokenUpdates] of Object.entries(updatesByUnit)) {
      const unit = nextUnits.find(u => u.id === unitId);
      if (!unit) continue;

      if (unit.owner !== gameState.activePlayer) {
        addLog(`Not ${unit.owner}'s turn to move.`, 'info');
        allValid = false;
        break;
      }

      if (unit.hasMoved && !unit.isPendingMoveConfirm) {
        addLog(`⛔ Action Rejected! ${unit.name} already moved this turn.`, 'info');
        allValid = false;
        break;
      }

      // Check distance validation for all moving tokens against turnStartPos
      for (const tu of tokenUpdates) {
        const distCheck = validateModelMovementDistance(unit, tu.tokenId, tu.newPos);
        if (!distCheck.valid) {
          allValid = false;
          failureReason = distCheck.reason || `Move distance exceeds Mv (${unit.stats.mv} sq).`;
          break;
        }
      }
      if (!allValid) break;

      // Universal Collision Check
      const candidateTokens: Token[] = [];
      for (const t of unit.tokens || []) {
        const tu = tokenUpdates.find(u => u.tokenId === t.id);
        if (tu) {
          candidateTokens.push({ ...t, x: tu.newPos.x, y: tu.newPos.y });
        }
      }

      for (const cand of candidateTokens) {
        const colCheck = checkUniversalTokenCollisions([cand], nextUnits, unit.id, cand.id);
        if (colCheck.hasCollision) {
          allValid = false;
          failureReason = `Model base overlaps with ${colCheck.collidingUnitName}! (Tangents permitted, no intersections).`;
          break;
        }
      }
      if (!allValid) break;
    }

    if (!allValid) {
      if (failureReason) addLog(`⛔ Movement Blocked: ${failureReason}`, 'info');
      return;
    }

    // Apply updates atomically to all units
    for (const [unitId, tokenUpdates] of Object.entries(updatesByUnit)) {
      const unit = nextUnits.find(u => u.id === unitId);
      if (!unit) continue;

      const pendingOrigPos = unit.pendingOriginalPosition || unit.position;
      const pendingOrigTokens = unit.pendingOriginalTokens || (unit.tokens ? JSON.parse(JSON.stringify(unit.tokens)) : undefined);

      const updatedTokens = (unit.tokens || []).map(t => {
        const tu = tokenUpdates.find(u => u.tokenId === t.id);
        if (tu) {
          return {
            ...t,
            x: Math.round(tu.newPos.x),
            y: Math.round(tu.newPos.y),
            turnStartPos: t.turnStartPos || { x: t.x, y: t.y }
          };
        }
        return t;
      });

      // Recalculate centroid from living tokens
      const living = updatedTokens.filter(t => t.currentLives > 0);
      const centroidX = living.length > 0
        ? Math.round(living.reduce((acc, t) => acc + t.x, 0) / living.length)
        : (unit.position?.x || 0);
      const centroidY = living.length > 0
        ? Math.round(living.reduce((acc, t) => acc + t.y, 0) / living.length)
        : (unit.position?.y || 0);

      // Recalculate offsets relative to centroid
      const finalizedTokens = updatedTokens.map(t => ({
        ...t,
        offsetX: t.x - centroidX,
        offsetY: t.y - centroidY
      }));

      const updatedSquadUnit: Unit = {
        ...unit,
        position: { x: centroidX, y: centroidY },
        tokens: finalizedTokens,
        isPendingMoveConfirm: true,
        pendingOriginalPosition: pendingOrigPos,
        pendingOriginalTokens: pendingOrigTokens
      };

      nextUnits = nextUnits.map(u => u.id === unitId ? updatedSquadUnit : u);

      // BUG-001: Sync attached leader positions
      if (unit.attachedUnits && unit.attachedUnits.length > 0) {
        const leaderTok = finalizedTokens.find(t => t.isLeaderToken);
        const leaderPos = leaderTok ? { x: leaderTok.x, y: leaderTok.y } : { x: centroidX, y: centroidY };
        nextUnits = nextUnits.map(u => {
          if (unit.attachedUnits!.includes(u.id)) {
            return {
              ...u,
              position: leaderPos,
              hasMoved: true,
              isPendingMoveConfirm: true,
              pendingOriginalPosition: u.pendingOriginalPosition || u.position
            };
          }
          return u;
        });
      }

      addLog(`♟️ ${unit.name} moved in formation (${tokenUpdates.length} models). Confirm movement when finished.`, 'info');
      setSelectedUnitId(unit.id);
    }

    setGameState(prev => ({
      ...prev,
      units: nextUnits
    }));
  };

  // Confirm Movement & Validate Coherency
  const handleConfirmMove = (unitId: string) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit) return;

    const coherencyDistInches = gameState.currentMap?.coherencyDistanceInches || 2;
    const coherencyDistPx = coherencyDistInches * 50;
    const check = validateUnitCoherency(unit, coherencyDistPx);

    if (!check.isCoherent) {
      // Mark offending tokens so they pulse red and show warning badge
      const flaggedTokens = (unit.tokens || []).map(t => ({
        ...t,
        offendingCoherency: check.offendingTokenIds.includes(t.id)
      }));

      setGameState(prev => ({
        ...prev,
        units: prev.units.map(u => u.id === unitId ? { ...u, tokens: flaggedTokens } : u)
      }));

      addLog(`⚠️ Broken Coherency! All models in ${unit.name} must remain within ${coherencyDistInches}" (approx ${coherencyDistPx}px) of at least one other model in the squad and form a single group.`, 'event', 'Coherency Error');
      return;
    }

    // Section 7: 1-Square No-End Zone Rule (Cannot end normal move within 50px of enemy)
    const proxCheck = validateNormalMovementEnemyProximity(unit, unit.tokens || [], gameState.units, 50);
    if (!proxCheck.valid) {
      addLog(`⛔ Move Confirmation Blocked: Normal movement cannot end within 1 square (50px) of enemy ${proxCheck.offendingEnemyUnit?.name}! Only a Charge can enter Engagement Range.`, 'event', 'Engagement Range Error');
      return;
    }

    // Coherency is valid! Clear offending flags and refresh turnStartPos (BUG-003)
    const cleanTokens = (unit.tokens || []).map(t => ({
      ...t,
      turnStartPos: { x: t.x, y: t.y },
      offendingCoherency: false
    }));

    // Check if unit is currently inside any structure
    const occupying = gameState.currentMap?.structures?.find(s => {
      if (!unit.position) return false;
      return (
        unit.position.x >= s.x &&
        unit.position.x <= s.x + s.width &&
        unit.position.y >= s.y &&
        unit.position.y <= s.y + s.height
      );
    });

    const leaderToken = cleanTokens.find(t => t.isLeaderToken);
    const leaderPos = leaderToken ? { x: leaderToken.x, y: leaderToken.y } : unit.position;

    setGameState(prev => ({
      ...prev,
      units: prev.units.map(u => {
        if (u.id === unitId) {
          return {
            ...u,
            hasMoved: true,
            isPendingMoveConfirm: false,
            pendingOriginalPosition: undefined,
            pendingOriginalTokens: undefined,
            tokens: cleanTokens,
            occupyingStructureId: occupying ? occupying.id : undefined,
            currentLevel: occupying ? (u.currentLevel || 1) : undefined
          };
        }
        // BUG-001: Confirm attached leader unit too
        if (unit.attachedUnits && unit.attachedUnits.includes(u.id)) {
          return {
            ...u,
            position: leaderPos,
            hasMoved: true,
            isPendingMoveConfirm: false,
            pendingOriginalPosition: undefined,
            pendingOriginalTokens: undefined,
            occupyingStructureId: occupying ? occupying.id : undefined,
            currentLevel: occupying ? (u.currentLevel || 1) : undefined
          };
        }
        return u;
      })
    }));

    addLog(`✅ Move Confirmed for ${unit.name}. Coherency verified (≤ ${coherencyDistInches}").`, 'info');
  };

  // Reset Movement to pre-move position
  const handleResetMove = (unitId: string) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit || !unit.pendingOriginalPosition) return;

    const restoredPos = unit.pendingOriginalPosition;
    const restoredTokens = (unit.pendingOriginalTokens || (unit.tokens || [])).map((t: Token) => ({
      ...t,
      offendingCoherency: false
    }));

    setGameState(prev => ({
      ...prev,
      units: prev.units.map(u => {
        if (u.id === unitId) {
          return {
            ...u,
            position: restoredPos,
            tokens: restoredTokens,
            hasMoved: false,
            isPendingMoveConfirm: false,
            pendingOriginalPosition: undefined,
            pendingOriginalTokens: undefined
          };
        }
        // BUG-001: Reset attached leader unit too
        if (unit.attachedUnits && unit.attachedUnits.includes(u.id) && u.pendingOriginalPosition) {
          return {
            ...u,
            position: u.pendingOriginalPosition,
            hasMoved: false,
            isPendingMoveConfirm: false,
            pendingOriginalPosition: undefined,
            pendingOriginalTokens: undefined
          };
        }
        return u;
      })
    }));

    addLog(`↩️ Movement Reset: ${unit.name} returned to original position.`, 'info');
  };

  // Change Unit Structure Floor Level
  const handleChangeFloorLevel = (unitId: string, level: number) => {
    setGameState(prev => ({
      ...prev,
      units: prev.units.map(u => u.id === unitId ? { ...u, currentLevel: level } : u)
    }));
    const unit = gameState.units.find(u => u.id === unitId);
    if (unit) {
      addLog(`🏢 ${unit.name} ascended/descended to Floor L${level}.`, 'info');
    }
  };

  // Squad Formation Change Handler
  const handleChangeFormation = (unitId: string, formation: FormationType) => {
    setGameState(prev => ({
      ...prev,
      units: prev.units.map(u => u.id === unitId ? setUnitFormation(u, formation) : u)
    }));
    const unit = gameState.units.find(u => u.id === unitId);
    if (unit) {
      addLog(`🛡️ ${unit.name} shifted to ${formation.toUpperCase()} formation.`, 'info');
    }
  };

  // Canvas Click Handler (e.g. Deploy selected reserve unit or clear target)
  const handleCanvasClick = () => {
    if (targetUnitId) {
      setTargetUnitId(null);
    }
  };

  // Core execution: Deploy reserve unit to flank
  const executeDeployReserveUnit = (unitId: string) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit || unit.position) return;

    const deployedCount = gameState.units.filter(u => u.owner === unit.owner && u.position).length;
    let defaultX = unit.owner === 'player1' ? 80 + (deployedCount % 2) * 50 : 1120 - (deployedCount % 2) * 50;
    let defaultY = 160 + (deployedCount % 5) * 110;
    const finalPos = { x: defaultX, y: defaultY };

    // Zone fitting & reflow
    const p1Zone = gameState.currentMap?.deploymentZones.player1.maxX ?? 200;
    const p2Zone = gameState.currentMap ? (1200 - gameState.currentMap.deploymentZones.player2.minX) : 200;
    const zoneDepth = unit.owner === 'player1' ? p1Zone : p2Zone;
    const zoneBounds = {
      minX: unit.owner === 'player1' ? 0 : 1200 - zoneDepth,
      maxX: unit.owner === 'player1' ? zoneDepth : 1200,
      minY: 0,
      maxY: 800
    };

    const fitRes = fitFormationToZone(unit, finalPos, unit.formation || 'auto', zoneBounds, canUnitDeployOutsideZone(unit, gameState.units));
    const deployed: Unit = {
      ...fitRes.unit,
      isPendingDeploymentConfirm: true
    };

    // Universal Collision Check (No base overlap, tangents allowed)
    const collisionCheck = checkUniversalTokenCollisions(deployed.tokens || [], gameState.units, unit.id);
    if (collisionCheck.hasCollision) {
      addLog(`⛔ Placement Blocked! Base overlap with ${collisionCheck.collidingUnitName}! (Tangents allowed, visual bases cannot intersect).`, 'info');
      return;
    }

    let updatedUnits = gameState.units.map(u => u.id === unitId ? deployed : u);

    // If unit has pre-attached leaders, also set their positions and sync squad tokens
    if (deployed.attachedUnits && deployed.attachedUnits.length > 0) {
      updatedUnits = updatedUnits.map(u => {
        if (deployed.attachedUnits!.includes(u.id)) {
          return { ...u, position: finalPos, isPendingDeploymentConfirm: true };
        }
        return u;
      });
      updatedUnits = updatedUnits.map(u => u.id === unitId ? syncUnitTokens(u, updatedUnits) : u);
    }

    setGameState(prev => ({ ...prev, units: updatedUnits }));
    setSelectedUnitId(unit.id);
    addLog(`🎯 ${unit.name} placed on flank (${finalPos.x}px, ${finalPos.y}px). Adjust position or formation, then click "Confirm Placement" to pass turn.`, 'info');
  };

  // Deploy a reserve unit to default position on active player's flank
  const handleDeployReserveUnit = (unitId: string) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit || unit.position) return;

    if (gameState.phase !== 'Deployment') {
      addLog(`Units can only be deployed during Deployment Phase.`, 'info');
      return;
    }

    const currentDeployer = gameState.deployingPlayer || gameState.activePlayer;
    if (unit.owner !== currentDeployer) {
      const msg = `⚠️ It is ${currentDeployer === 'player1' ? 'Player 1' : 'Player 2 (Bot)'}'s turn to deploy!`;
      addLog(msg, 'info');
      setDeploymentErrorNotice(msg);
      setTimeout(() => setDeploymentErrorNotice(null), 3500);
      return;
    }

    // Auto-commit any previously placed unit that was pending confirmation if it passes coherency (BUG-026)
    const existingPending = gameState.units.find(u => u.owner === currentDeployer && u.isPendingDeploymentConfirm);
    if (existingPending && existingPending.id !== unitId) {
      const coherencyDistInches = gameState.currentMap?.coherencyDistanceInches || 2;
      const coherencyDistPx = coherencyDistInches * 50;
      const coherencyCheck = validateUnitCoherency(existingPending, coherencyDistPx);
      if (coherencyCheck.isCoherent) {
        const cleanTokens = (existingPending.tokens || []).map(t => ({
          ...t,
          offendingCoherency: false,
          turnStartPos: { x: t.x, y: t.y }
        }));
        setGameState(prev => ({
          ...prev,
          units: prev.units.map(u => u.id === existingPending.id ? {
            ...u,
            tokens: cleanTokens,
            isPendingDeploymentConfirm: false
          } : u)
        }));
        addLog(`✅ Auto-confirmed placement of ${existingPending.name}.`, 'info');
        if (existingPending.abilities && existingPending.abilities.length > 0) {
          addLog(`🃏 Added ${existingPending.name}'s tactical cards to your Hand: ${existingPending.abilities.map(a => a.name).join(', ')}!`, 'score');
        }
        if (existingPending.attachedUnits && existingPending.attachedUnits.length > 0) {
          existingPending.attachedUnits.forEach(attId => {
            const attLeader = gameState.units.find(u => u.id === attId);
            if (attLeader && attLeader.abilities && attLeader.abilities.length > 0) {
              addLog(`🃏 Added ${attLeader.name}'s tactical cards to your Hand: ${attLeader.abilities.map(a => a.name).join(', ')}!`, 'score');
            }
          });
        }
      } else {
        const msg = `⚠️ Please adjust coherency for ${existingPending.name} before placing another squad!`;
        addLog(msg, 'info');
        setDeploymentErrorNotice(msg);
        setTimeout(() => setDeploymentErrorNotice(null), 4000);
        setSelectedUnitId(existingPending.id);
        return;
      }
    }

    // Leader-attachment warning popup on deployment
    const isLeader = unit.role === 'Leader' || unit.role === 'Legendary Leader' || unit.type === 'Character';
    const hasEligibleBodyguard = gameState.units.some(
      cand => cand.owner === unit.owner && cand.type === 'Infantry' && (!cand.attachedUnits || cand.attachedUnits.length === 0) && cand.id !== unit.id && !cand.attachedTo
    );

    if (isLeader && !unit.attachedTo && hasEligibleBodyguard) {
      setLeaderWarningState({ leaderId: unit.id, pendingAction: 'flank' });
      return;
    }

    executeDeployReserveUnit(unitId);
  };

  // Core execution: Deploy unit from Army Tray via drag-and-drop onto the Tabletop Canvas
  const executeDropUnitFromTray = (unitId: string, dropPos: WorldPoint) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit || unit.position) return;

    // Hard Deployment Zone Restriction Check
    const p1Zone = gameState.currentMap?.deploymentZones.player1.maxX ?? 200;
    const p2Zone = gameState.currentMap ? (1200 - gameState.currentMap.deploymentZones.player2.minX) : 200;
    const zoneDepth = unit.owner === 'player1' ? p1Zone : p2Zone;

    const canBypass = canUnitDeployOutsideZone(unit, gameState.units);
    const inZone = isInsideDeploymentZone(dropPos, unit.owner, 1200, zoneDepth);

    if (!canBypass && !inZone) {
      const hasInfiltratorTrait = !!(
        unit.canDeployOutsideZone ||
        unit.traits?.includes('Infiltrator') ||
        unit.traits?.includes('DEPLOY_OUTSIDE_ZONE') ||
        unit.passives?.some(p => p.toUpperCase().includes('INFILTRATOR') || p.toUpperCase().includes('DEPLOY_OUTSIDE_ZONE'))
      );
      const leaderBlocked = hasInfiltratorTrait && ((unit.attachedUnits && unit.attachedUnits.length > 0) || !!unit.attachedTo);
      const msg = leaderBlocked
        ? `⛔ Placement Rejected! ${unit.name} has Infiltrator, but an attached Leader lacks Infiltrator! Infiltration is blocked.`
        : `⛔ Placement Rejected! ${unit.name} cannot deploy outside your designated deployment zone (${unit.owner === 'player1' ? `West: x ≤ ${p1Zone}px` : `East: x ≥ ${1200 - p2Zone}px`}).`;
      addLog(msg, 'info');
      setDeploymentErrorNotice(msg);
      setTimeout(() => setDeploymentErrorNotice(null), 4000);
      return;
    }

    const zoneBounds = {
      minX: unit.owner === 'player1' ? 0 : 1200 - zoneDepth,
      maxX: unit.owner === 'player1' ? zoneDepth : 1200,
      minY: 0,
      maxY: 800
    };

    const fitRes = fitFormationToZone(unit, dropPos, unit.formation || 'auto', zoneBounds, canBypass);
    const deployed: Unit = {
      ...fitRes.unit,
      isPendingDeploymentConfirm: true
    };

    // Universal Collision Check (No base overlap, tangents allowed)
    const collisionCheck = checkUniversalTokenCollisions(deployed.tokens || [], gameState.units, unit.id);
    if (collisionCheck.hasCollision) {
      const msg = `⛔ Placement Blocked! Base overlap with ${collisionCheck.collidingUnitName}! (Tangents allowed, no intersections).`;
      addLog(msg, 'info');
      setDeploymentErrorNotice(msg);
      setTimeout(() => setDeploymentErrorNotice(null), 4000);
      return;
    }

    let updatedUnits = gameState.units.map(u => u.id === unitId ? deployed : u);

    // If unit has pre-attached leaders, also set their positions and sync squad tokens
    if (deployed.attachedUnits && deployed.attachedUnits.length > 0) {
      updatedUnits = updatedUnits.map(u => {
        if (deployed.attachedUnits!.includes(u.id)) {
          return { ...u, position: dropPos, isPendingDeploymentConfirm: true };
        }
        return u;
      });
      updatedUnits = updatedUnits.map(u => u.id === unitId ? syncUnitTokens(u, updatedUnits) : u);
    }

    setGameState(prev => ({ ...prev, units: updatedUnits }));
    setSelectedUnitId(unit.id);
    addLog(`🎯 ${unit.name} placed from Army Tray to (${dropPos.x}px, ${dropPos.y}px). Adjust position or formation, then click "Confirm Placement" to commit.`, 'info');
  };

  // Deploy unit from Army Tray via drag-and-drop onto the Tabletop Canvas
  const handleDropUnitFromTray = (unitId: string, dropPos: WorldPoint) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit || unit.position) return;

    if (gameState.phase !== 'Deployment') {
      addLog('Units can only be deployed during Deployment Phase.', 'info');
      return;
    }

    const currentDeployer = gameState.deployingPlayer || gameState.activePlayer;
    if (unit.owner !== currentDeployer) {
      const msg = `⚠️ It is ${currentDeployer === 'player1' ? 'Player 1' : 'Player 2 (Bot)'}'s turn to deploy!`;
      addLog(msg, 'info');
      setDeploymentErrorNotice(msg);
      setTimeout(() => setDeploymentErrorNotice(null), 3500);
      return;
    }

    // Auto-commit any previously placed unit that was pending confirmation if it passes coherency (BUG-026)
    const existingPending = gameState.units.find(u => u.owner === currentDeployer && u.isPendingDeploymentConfirm);
    if (existingPending && existingPending.id !== unitId) {
      const coherencyDistInches = gameState.currentMap?.coherencyDistanceInches || 2;
      const coherencyDistPx = coherencyDistInches * 50;
      const coherencyCheck = validateUnitCoherency(existingPending, coherencyDistPx);
      if (coherencyCheck.isCoherent) {
        const cleanTokens = (existingPending.tokens || []).map(t => ({
          ...t,
          offendingCoherency: false,
          turnStartPos: { x: t.x, y: t.y }
        }));
        setGameState(prev => ({
          ...prev,
          units: prev.units.map(u => u.id === existingPending.id ? {
            ...u,
            tokens: cleanTokens,
            isPendingDeploymentConfirm: false
          } : u)
        }));
        addLog(`✅ Auto-confirmed placement of ${existingPending.name}.`, 'info');
        if (existingPending.abilities && existingPending.abilities.length > 0) {
          addLog(`🃏 Added ${existingPending.name}'s tactical cards to your Hand: ${existingPending.abilities.map(a => a.name).join(', ')}!`, 'score');
        }
        if (existingPending.attachedUnits && existingPending.attachedUnits.length > 0) {
          existingPending.attachedUnits.forEach(attId => {
            const attLeader = gameState.units.find(u => u.id === attId);
            if (attLeader && attLeader.abilities && attLeader.abilities.length > 0) {
              addLog(`🃏 Added ${attLeader.name}'s tactical cards to your Hand: ${attLeader.abilities.map(a => a.name).join(', ')}!`, 'score');
            }
          });
        }
      } else {
        const msg = `⚠️ Please adjust coherency for ${existingPending.name} before placing another squad!`;
        addLog(msg, 'info');
        setDeploymentErrorNotice(msg);
        setTimeout(() => setDeploymentErrorNotice(null), 4000);
        setSelectedUnitId(existingPending.id);
        return;
      }
    }

    // Leader-attachment warning popup on deployment
    const isLeader = unit.role === 'Leader' || unit.role === 'Legendary Leader' || unit.type === 'Character';
    const hasEligibleBodyguard = gameState.units.some(
      cand => cand.owner === unit.owner && cand.type === 'Infantry' && (!cand.attachedUnits || cand.attachedUnits.length === 0) && cand.id !== unit.id && !cand.attachedTo
    );

    if (isLeader && !unit.attachedTo && hasEligibleBodyguard) {
      setLeaderWarningState({ leaderId: unit.id, pendingDropPos: dropPos, pendingAction: 'drop' });
      return;
    }

    executeDropUnitFromTray(unitId, dropPos);
  };

  // Confirm unit placement in Deployment phase and advance alternating deployment
  const handleConfirmDeployment = (unitId: string) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit) return;

    // Validate Coherency before confirming placement (BUG-013)
    const coherencyDistInches = gameState.currentMap?.coherencyDistanceInches || 2;
    const coherencyDistPx = coherencyDistInches * 50;
    const coherencyCheck = validateUnitCoherency(unit, coherencyDistPx);

    if (!coherencyCheck.isCoherent) {
      // Flag offending tokens in red
      const flaggedTokens = (unit.tokens || []).map(t => ({
        ...t,
        offendingCoherency: coherencyCheck.offendingTokenIds.includes(t.id)
      }));

      setGameState(prev => ({
        ...prev,
        units: prev.units.map(u => u.id === unitId ? { ...u, tokens: flaggedTokens } : u)
      }));

      addLog(`⛔ Deployment Blocked: ${coherencyCheck.message}`, 'event', 'Coherency Error');
      return;
    }

    // Coherency valid: clear offending flags and initialize turnStartPos
    const cleanTokens = (unit.tokens || []).map(t => ({
      ...t,
      offendingCoherency: false,
      turnStartPos: { x: t.x, y: t.y }
    }));

    const updatedUnits = gameState.units.map(u => u.id === unitId ? {
      ...u,
      tokens: cleanTokens,
      isPendingDeploymentConfirm: false
    } : u);

    addLog(`✅ Deployment Confirmed: ${unit.name} locked into position. Passing deployment turn.`, 'info');
    if (unit.abilities && unit.abilities.length > 0) {
      addLog(`🃏 Added ${unit.name}'s tactical cards to your Hand: ${unit.abilities.map(a => a.name).join(', ')}!`, 'score');
    }
    if (unit.attachedUnits && unit.attachedUnits.length > 0) {
      unit.attachedUnits.forEach(attId => {
        const attLeader = updatedUnits.find(u => u.id === attId);
        if (attLeader && attLeader.abilities && attLeader.abilities.length > 0) {
          addLog(`🃏 Added ${attLeader.name}'s tactical cards to your Hand: ${attLeader.abilities.map(a => a.name).join(', ')}!`, 'score');
        }
      });
    }
    progressDeploymentAlternation(unit.owner, updatedUnits);
  };

  // Cancel pending deployment and return unit to Army Tray
  const handleCancelDeployment = (unitId: string) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit) return;

    const updatedUnits = gameState.units.map(u => u.id === unitId ? {
      ...u,
      position: null,
      tokens: [],
      isPendingDeploymentConfirm: false
    } : u);

    setGameState(prev => ({
      ...prev,
      units: updatedUnits
    }));
    setSelectedUnitId(null);
    addLog(`↩️ Deployment Cancelled: ${unit.name} returned to Army Tray.`, 'info');
  };

  // Dice Tray Roll Execution
  const handleRollDice = (count: number = diceCount, sides: number = diceSides, threshold: number = diceThreshold) => {
    setIsRolling(true);
    setTimeout(() => {
      const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
      const sum = rolls.reduce((a, b) => a + b, 0);
      const successes = threshold > 0 ? rolls.filter(r => r >= threshold).length : undefined;
      const notation = `${count}d${sides}`;
      const record = {
        id: `roll_${Date.now()}`,
        notation,
        rolls,
        sum,
        successes,
        timestamp: new Date().toLocaleTimeString()
      };
      setDiceResults(rolls);
      setDiceHistory(prev => [record, ...prev.slice(0, 19)]);
      setIsRolling(false);
    }, 450);
  };

  // Share Roll to GM Feed
  const handleShareDiceRoll = () => {
    if (diceResults.length === 0) return;
    const sum = diceResults.reduce((a, b) => a + b, 0);
    const succText = diceThreshold > 0 
      ? ` | ${diceResults.filter(r => r >= diceThreshold).length} Successes (${diceThreshold}+)` 
      : '';
    addLog(`🎲 Rolled ${diceCount}d${diceSides}: [${diceResults.join(', ')}] = Total ${sum}${succText}`, 'combat', 'Dice Tray');
  };

  // Command Phase Stratagem Activations
  const handleActivateStratagem = (stratagemId: string) => {
    const isP1 = gameState.activePlayer === 'player1';
    const currentCP = isP1 ? (gameState.player1CP ?? 0) : (gameState.player2CP ?? 0);

    const stratagems = [
      { id: 'tactical_blitz', name: 'Tactical Blitz', cost: 1, requiresUnit: true },
      { id: 'overcharged_munitions', name: 'Overcharged Munitions', cost: 1, requiresUnit: true },
      { id: 'aegis_bulwark', name: 'Aegis Bulwark', cost: 1, requiresUnit: true },
      { id: 'field_repairs', name: 'Field Repairs', cost: 2, requiresUnit: true },
      { id: 'inspiring_command', name: 'Inspiring Command', cost: 1, requiresUnit: true }
    ];

    const strat = stratagems.find(s => s.id === stratagemId);
    if (!strat) return;

    if (currentCP < strat.cost) {
      addLog(`❌ Insufficient Command Points! ${strat.name} requires ${strat.cost} CP (You have ${currentCP} CP).`, 'event', 'Command');
      return;
    }

    if (strat.requiresUnit) {
      if (!selectedUnit || selectedUnit.owner !== gameState.activePlayer) {
        addLog(`⚠️ Please select one of your own active units on the battlefield first!`, 'info', 'Command');
        return;
      }
      if (selectedUnit.issuedStratagemsThisTurn?.includes(stratagemId)) {
        addLog(`⛔ Stratagem Restricted: [${strat.name}] has already been issued to ${selectedUnit.name} this turn! (Limit: 1 per unit per turn)`, 'event', 'Command');
        return;
      }
    }

    setGameState(prev => {
      const p1CP = isP1 ? (prev.player1CP ?? 0) - strat.cost : (prev.player1CP ?? 0);
      const p2CP = !isP1 ? (prev.player2CP ?? 0) - strat.cost : (prev.player2CP ?? 0);

      const updatedUnits = prev.units.map(u => {
        if (!selectedUnit || u.id !== selectedUnit.id) return u;
        const currentIssued = u.issuedStratagemsThisTurn || [];
        const nextIssued = currentIssued.includes(stratagemId) ? currentIssued : [...currentIssued, stratagemId];
        const baseUnit = { ...u, issuedStratagemsThisTurn: nextIssued };

        if (stratagemId === 'tactical_blitz') {
          return { ...baseUnit, stats: { ...baseUnit.stats, mv: baseUnit.stats.mv + 2 } };
        }
        if (stratagemId === 'overcharged_munitions') {
          return { ...baseUnit, stats: { ...baseUnit.stats, am: baseUnit.stats.am + 1 } };
        }
        if (stratagemId === 'aegis_bulwark') {
          return { ...baseUnit, stats: { ...baseUnit.stats, defModifier: Math.min(3, baseUnit.stats.defModifier + 1) } };
        }
        if (stratagemId === 'field_repairs') {
          const restoredLives = Math.min(baseUnit.stats.maxLives, baseUnit.stats.lives + 2);
          const repaired = { ...baseUnit, stats: { ...baseUnit.stats, lives: restoredLives } };
          return syncUnitTokens(repaired);
        }
        if (stratagemId === 'inspiring_command') {
          return { ...baseUnit, advantageStacks: Math.min(2, baseUnit.advantageStacks + 1), disadvantageStacks: 0 };
        }
        return baseUnit;
      });

      const logMsg = `⚡ STRATAGEM: [${strat.name}] activated for ${strat.cost} CP on ${selectedUnit?.name || 'Army'}!`;
      return {
        ...prev,
        player1CP: p1CP,
        player2CP: p2CP,
        units: updatedUnits,
        logs: [
          {
            id: `log_strat_${Date.now()}`,
            round: prev.round,
            phase: prev.phase,
            source: 'Command Net',
            message: logMsg,
            type: 'event',
            timestamp: new Date().toLocaleTimeString()
          },
          ...prev.logs.slice(0, 74)
        ]
      };
    });
  };

  interface BattlefieldAbilityItem {
    key: string;
    ability: UnitAbility;
    sourceName: string;
    sourceAvatar: string;
    sourceUnitId?: string;
    isFaction: boolean;
    isActivatable: boolean;
    disabledReason?: string;
    usageLimit: AbilityUsageLimit;
  }

  // UI-003: Ability Activation Execution (Zero-CP rule, +1 CP generation, and Action VFX/SFX)
  const handleActivateAbility = (item: BattlefieldAbilityItem) => {
    const { ability, key, sourceName, sourceUnitId, isFaction } = item;
    
    // Check runtime activation rules
    const check = checkAbilityActivation({
      ability,
      isFaction,
      currentPhase: gameState.phase,
      usedInRound: usedAbilitiesThisRound[key] || 0,
      usedInGame: !!usedAbilitiesThisGame[key]
    });

    if (!check.isActivatable) {
      addLog(`⛔ Cannot activate ${ability.name}: ${check.disabledReason}`, 'info');
      return;
    }

    const isP1 = gameState.activePlayer === 'player1';
    const activeOwner = gameState.activePlayer;
    const gainsCP = ability.cost === 'gain_1_cp' || !!ability.gainsCP;

    setGameState(prev => {
      // Faction & Unit abilities do NOT cost CP. Abilities can grant +1 free CP!
      const p1CP = isP1 && gainsCP ? (prev.player1CP ?? 0) + 1 : (prev.player1CP ?? 0);
      const p2CP = !isP1 && gainsCP ? (prev.player2CP ?? 0) + 1 : (prev.player2CP ?? 0);

      const isTargetFriendly = (u: Unit) => u.owner === activeOwner && (u.stats?.lives ?? 0) > 0;

      let affectedCount = 0;
      const updatedUnits = prev.units.map(u => {
        let shouldAffect = false;
        if (isFaction || ability.affects === 'all_friendly' || ability.affects === 'all_allies') {
          shouldAffect = isTargetFriendly(u);
        } else if (ability.affects === 'self' || !ability.affects) {
          shouldAffect = !!(sourceUnitId && u.id === sourceUnitId);
        } else if (sourceUnitId && u.id === sourceUnitId) {
          shouldAffect = true;
        }

        if (!shouldAffect) return u;
        affectedCount++;

        let updated = { ...u };

        // 1. Movement boost (The Crimson Empire: Blood-Alchemical Overdrive, Chronarch: Temporal Loom Surge, movement effects)
        if (
          ability.id === 'crimson_blood_forge' ||
          ability.id === 'chronarch_temporal_warp' ||
          ability.effectType === 'movement' ||
          ability.effect?.toLowerCase().includes('+1 to movement') ||
          ability.effect?.toLowerCase().includes('+1 movement')
        ) {
          const currentBaseMv = u.stats.baseMv ?? u.stats.mv;
          const newTraits = u.traits ? [...u.traits] : [];
          if (!newTraits.includes('IgnoreDifficultTerrain')) {
            newTraits.push('IgnoreDifficultTerrain');
          }
          updated = {
            ...updated,
            traits: newTraits,
            advantageStacks: Math.min(2, updated.advantageStacks + 1),
            stats: {
              ...updated.stats,
              baseMv: currentBaseMv,
              mv: updated.stats.mv + 1
            }
          };
        }

        // 2. Defence boost (Daughters of Astraea: Dawn Aegis Aura, Ironclad: Runic Phalanx, defense effects)
        if (
          ability.id === 'astraea_dawn_vigil' ||
          ability.id === 'ironclad_rune_phalanx' ||
          ability.effectType === 'defense' ||
          ability.effect?.toLowerCase().includes('defence') ||
          ability.effect?.toLowerCase().includes('defense')
        ) {
          updated = {
            ...updated,
            stats: {
              ...updated.stats,
              defModifier: Math.min(3, (updated.stats.defModifier || 0) + 1)
            }
          };
        }

        // 3. Attack boost (The Infernal Crusades: Hellfire Shockwave, attack modifiers)
        if (
          ability.id === 'infernal_hellfire_rush' ||
          (ability.effectType === 'stat_modifier' && ability.effect?.toLowerCase().includes('attack modifier'))
        ) {
          updated = {
            ...updated,
            advantageStacks: Math.min(2, updated.advantageStacks + 1),
            stats: {
              ...updated.stats,
              am: updated.stats.am + 1
            }
          };
        }

        // 4. Healing (The Court of Nocturne: Crimson Eclipse Feast, heal effects)
        if (
          ability.id === 'nocturne_vampiric_feast' ||
          ability.effectType === 'heal' ||
          ability.effect?.toLowerCase().includes('heal')
        ) {
          const healedLives = Math.min(updated.stats.maxLives, updated.stats.lives + 1);
          updated = syncUnitTokens({
            ...updated,
            stats: {
              ...updated.stats,
              lives: healedLives
            }
          });
        }

        // Fallback for general stat_modifier
        if (
          ability.effectType === 'stat_modifier' &&
          ability.id !== 'crimson_blood_forge' &&
          ability.id !== 'infernal_hellfire_rush'
        ) {
          updated = {
            ...updated,
            advantageStacks: Math.min(2, updated.advantageStacks + 1)
          };
        }

        return updated;
      });

      const logMsg = isFaction
        ? `⚡ FACTION DOCTRINE: [${ability.name}] activated by ${sourceName}! ${ability.effect} (${affectedCount} friendly squad(s) enhanced).`
        : `⚡ ABILITY ACTIVATION: [${ability.name}] invoked by ${sourceName}! ${ability.effect}${gainsCP ? ' (+1 Free CP Gained! ⭐)' : ''}`;

      return {
        ...prev,
        player1CP: p1CP,
        player2CP: p2CP,
        units: updatedUnits,
        logs: [
          {
            id: `log_ab_${Date.now()}`,
            round: prev.round,
            phase: prev.phase,
            source: sourceName,
            message: logMsg,
            type: 'event',
            timestamp: new Date().toLocaleTimeString()
          },
          ...prev.logs.slice(0, 74)
        ]
      };
    });

    // Trigger visual effect & procedural Web Audio synthesizer
    const sourceUnit = gameState.units.find(u => u.id === sourceUnitId);
    const casterPos = sourceUnit?.position || (isP1 ? { x: 300, y: 400 } : { x: 900, y: 400 });
    const vfxStyle = gainsCP ? 'gain_cp' : (ability.vfxType || (ability.effectType === 'defense' ? 'holy' : 'command'));
    vfxDispatcher.triggerAbility(casterPos, ability.icon || '⚡', ability.name, vfxStyle as any);

    // If it's a faction ability or all_friendly ability, also pulse VFX on each deployed friendly unit
    if (isFaction || ability.affects === 'all_friendly' || ability.affects === 'all_allies') {
      gameState.units
        .filter(u => u.owner === activeOwner && u.position && (u.stats?.lives ?? 0) > 0)
        .forEach(u => {
          if (u.position) {
            vfxDispatcher.triggerAbility(u.position, ability.icon || (ability.vfxType === 'blood' ? '🩸' : '✨'), ability.name, vfxStyle as any);
          }
        });
    }

    setUsedAbilitiesThisRound(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + 1
    }));

    if (check.rule === 'once_per_game') {
      setUsedAbilitiesThisGame(prev => ({
        ...prev,
        [key]: true
      }));
    }

    addLog(`✨ Activated ${ability.name}${gainsCP ? ' (+1 Free CP Gained! ⭐)' : ''}!`, 'score');
  };

  // Combat Execution
  const handleExecuteShooting = (specificShooter?: Unit) => {
    if (!selectedUnit || !targetUnit || !targetUnit.position) return;

    // Determine shooter: specific unit passed, or attached leader if selected squad is melee-only
    let shooter: Unit = specificShooter || selectedUnit;
    if (!specificShooter && selectedUnit.stats.range === 0 && selectedUnit.attachedUnits) {
      const attachedLeaders = selectedUnit.attachedUnits
        .map(id => gameState.units.find(u => u.id === id))
        .filter((l): l is Unit => !!l && l.stats.range > 0 && (l.stats?.lives ?? 0) > 0);
      if (attachedLeaders.length > 0) {
        shooter = attachedLeaders[0];
      }
    }

    const isLeaderShooting = !!shooter.attachedTo || (selectedUnit.attachedUnits?.includes(shooter.id) && shooter.id !== selectedUnit.id);
    const hostSquad = isLeaderShooting
      ? gameState.units.find(u => u.id === (shooter.attachedTo || selectedUnit.id))
      : null;

    const currentActions = selectedUnit.actionsRemaining ?? 2;
    if (gameState.phase === 'Action' && currentActions <= 0) {
      addLog(`⛔ Cannot Shoot: ${selectedUnit.name} has no actions remaining!`, 'info');
      return;
    }

    if (shooter.stats.range === 0) {
      addLog(`⛔ Cannot Shoot: ${shooter.name} is melee-only (range 0)!`, 'info');
      return;
    }
    if (gameState.phase !== 'Action' && shooter.hasShot) {
      addLog(`⛔ Cannot Shoot: ${shooter.name} has already fired this round!`, 'info');
      return;
    }

    const originPos = shooter.position || hostSquad?.position;
    if (!originPos) return;

    const measuringUnit: Unit = {
      ...(hostSquad || shooter),
      stats: {
        ...(hostSquad || shooter).stats,
        range: shooter.stats.range
      }
    };

    if (!isUnitInShootingRange(measuringUnit, targetUnit, DEFAULT_GRID_SIZE)) {
      const { minModelDistPx } = getUnitsModelDistance(measuringUnit, targetUnit);
      const distSq = (minModelDistPx / DEFAULT_GRID_SIZE).toFixed(1);
      addLog(`Target is out of range (${distSq} sq > ${shooter.stats.range} sq).`, 'info');
      return;
    }

    const onHighGround = gameState.specialTiles.some(t => {
      const tx = t.x > 30 ? t.x : t.x * DEFAULT_GRID_SIZE + DEFAULT_GRID_SIZE / 2;
      const ty = t.y > 30 ? t.y : t.y * DEFAULT_GRID_SIZE + DEFAULT_GRID_SIZE / 2;
      return Math.hypot(originPos.x - tx, originPos.y - ty) < 45 && t.type === 'HighGround';
    });

    const attackerUnit: Unit = {
      ...shooter,
      position: originPos
    };

    const result = resolveCombat(attackerUnit, targetUnit, false, onHighGround ? 1 : 0);
    setRecentCombatResult(result);
    
    const combatMessage = isLeaderShooting && hostSquad
      ? `🎯 [Leader Fire] ${shooter.name} (attached to ${hostSquad.name}) fired at ${targetUnit.name}! ${result.logText}`
      : result.logText;
    addLog(combatMessage, 'combat', gameState.phase === 'Action' ? 'Action' : 'Shooting');
    applyDamageToUnit(targetUnit.id, result.livesLost, result.defModifierChange, shooter.owner);

    // Trigger unit-specific and action-specific shooting VFX & SFX
    let shootVariant: 'ballistic' | 'laser' | 'plasma' = 'ballistic';
    if (shooter.traits?.includes('Psionic') || shooter.abilities?.some(a => a.vfxType === 'laser')) {
      shootVariant = 'laser';
    } else if (shooter.type === 'Monster' || shooter.traits?.includes('Berserk') || shooter.abilities?.some(a => a.vfxType === 'plasma')) {
      shootVariant = 'plasma';
    }
    vfxDispatcher.triggerShoot(originPos, targetUnit.position, shootVariant);

    // Mark shooter/squad as having shot and deduct 1 action
    setGameState(prev => ({
      ...prev,
      units: prev.units.map(u => {
        if (u.id === shooter.id || u.id === selectedUnit.id) {
          return {
            ...u,
            hasShot: true,
            actionsRemaining: Math.max(0, (u.actionsRemaining ?? 2) - 1)
          };
        }
        return u;
      })
    }));
  };

  const handleExecuteEngagement = () => {
    if (!selectedUnit || !targetUnit || !selectedUnit.position || !targetUnit.position) return;

    const currentActions = selectedUnit.actionsRemaining ?? 2;
    if (gameState.phase === 'Action' && currentActions <= 0) {
      addLog(`⛔ Cannot Engage: ${selectedUnit.name} has no actions remaining!`, 'info');
      return;
    }

    const { minModelDistPx } = getUnitsModelDistance(selectedUnit, targetUnit);
    const currentDistSq = minModelDistPx / DEFAULT_GRID_SIZE;
    const chargeRes = rollCharge(selectedUnit.stats.mv);

    if (!chargeRes.success) {
      addLog(`❌ Engagement Failed! ${selectedUnit.name} rolled ${chargeRes.roll} on 1d6.`, 'charge', gameState.phase === 'Action' ? 'Action' : 'Charge');
      setGameState(prev => ({
        ...prev,
        units: prev.units.map(u => u.id === selectedUnit.id ? { 
          ...u, 
          hasCharged: true,
          actionsRemaining: Math.max(0, (u.actionsRemaining ?? 2) - 1)
        } : u)
      }));
    } else if (chargeRes.distance < currentDistSq - 1.2) {
      addLog(`⚠️ Engagement Fell Short! Rolled ${chargeRes.roll} (${chargeRes.distance} sq < ${currentDistSq.toFixed(1)} sq).`, 'charge', gameState.phase === 'Action' ? 'Action' : 'Charge');
      setGameState(prev => ({
        ...prev,
        units: prev.units.map(u => u.id === selectedUnit.id ? { 
          ...u, 
          hasCharged: true,
          actionsRemaining: Math.max(0, (u.actionsRemaining ?? 2) - 1)
        } : u)
      }));
    } else {
      const angle = Math.atan2(targetUnit.position.y - selectedUnit.position.y, targetUnit.position.x - selectedUnit.position.x);
      const targetRadius = getUnitCollisionRadius(targetUnit);
      const chargerRadius = getUnitCollisionRadius(selectedUnit);
      // Tangent base-to-base contact with 2px separation (BUG-011)
      const contactDist = targetRadius + chargerRadius + 2;

      // Filter out charger and its attached leaders from collision checks so they don't collide with themselves
      const unitsToCheckCollision = gameState.units.filter(
        u => u.id !== selectedUnit.id && !selectedUnit.attachedUnits?.includes(u.id)
      );

      // Search angles around target in 15-degree steps up to full circle to find closest non-overlapping base contact point
      const angleDeltas: number[] = [0];
      for (let step = 1; step <= 12; step++) {
        angleDeltas.push(step * 0.26, -step * 0.26);
      }

      let foundValidCharge = false;
      let bestPos = {
        x: Math.max(chargerRadius, Math.min(1200 - chargerRadius, Math.round(targetUnit.position.x - Math.cos(angle) * contactDist))),
        y: Math.max(chargerRadius, Math.min(800 - chargerRadius, Math.round(targetUnit.position.y - Math.sin(angle) * contactDist)))
      };

      for (const delta of angleDeltas) {
        const testAngle = angle + delta;
        const testX = Math.max(chargerRadius, Math.min(1200 - chargerRadius, Math.round(targetUnit.position.x - Math.cos(testAngle) * contactDist)));
        const testY = Math.max(chargerRadius, Math.min(800 - chargerRadius, Math.round(targetUnit.position.y - Math.sin(testAngle) * contactDist)));
        const testUnit = moveUnit(selectedUnit, { x: testX, y: testY }, gameState.units);
        const colCheck = checkUniversalTokenCollisions(testUnit.tokens || [], unitsToCheckCollision, selectedUnit.id);
        if (!colCheck.hasCollision) {
          // BUG-023: Verify charge path doesn't cut through intervening units (screening squads / intervening models)
          const pathCheck = checkPathCrossesUnits(
            selectedUnit,
            selectedUnit.position,
            { x: testX, y: testY },
            gameState.units,
            { isCharge: true, chargeTargetUnitId: targetUnit.id }
          );
          if (!pathCheck.hasCollision) {
            bestPos = { x: testX, y: testY };
            foundValidCharge = true;
            break;
          }
        }
      }

      if (!foundValidCharge) {
        addLog(`⛔ Engagement Blocked: Intervening units obstruct all engagement paths between ${selectedUnit.name} and ${targetUnit.name}! (Units cannot move through models without FLY).`, 'charge', gameState.phase === 'Action' ? 'Action' : 'Charge');
        setGameState(prev => ({
          ...prev,
          units: prev.units.map(u => u.id === selectedUnit.id ? { 
            ...u, 
            hasCharged: true,
            actionsRemaining: Math.max(0, (u.actionsRemaining ?? 2) - 1)
          } : u)
        }));
        return;
      }

      const chargedUnit = moveUnit({
        ...selectedUnit,
        hasCharged: true,
        actionsRemaining: Math.max(0, (selectedUnit.actionsRemaining ?? 2) - 1),
        advantageStacks: Math.min(2, selectedUnit.advantageStacks + 1)
      }, bestPos, gameState.units);

      let nextUnits = gameState.units.map(u => u.id === selectedUnit.id ? chargedUnit : u);

      // BUG-021: Sync attached leader position & ensure attached leader is preserved
      if (selectedUnit.attachedUnits && selectedUnit.attachedUnits.length > 0) {
        const leaderTok = chargedUnit.tokens?.find(t => t.isLeaderToken);
        const leaderPos = leaderTok ? { x: leaderTok.x, y: leaderTok.y } : bestPos;
        nextUnits = nextUnits.map(u => {
          if (selectedUnit.attachedUnits!.includes(u.id)) {
            return {
              ...u,
              position: leaderPos,
              hasCharged: true,
              actionsRemaining: Math.max(0, (u.actionsRemaining ?? 2) - 1)
            };
          }
          return u;
        });
        // Re-sync chargedUnit tokens with updated nextUnits to ensure leader token is perpetually retained
        nextUnits = nextUnits.map(u => u.id === selectedUnit.id ? syncUnitTokens(u, nextUnits) : u);
      }

      setGameState(prev => ({
        ...prev,
        units: nextUnits
      }));
      addLog(`⚡ SUCCESSFUL ENGAGEMENT! ${selectedUnit.name} rolled ${chargeRes.roll}. Closed into melee (tangent contact)!`, 'charge', gameState.phase === 'Action' ? 'Action' : 'Charge');
    }
  };

  const handleExecuteCharge = handleExecuteEngagement;

  const handleExecuteFight = () => {
    if (!selectedUnit || !targetUnit || !selectedUnit.position || !targetUnit.position) return;

    const currentActions = selectedUnit.actionsRemaining ?? 2;
    if (gameState.phase === 'Action' && currentActions <= 0) {
      addLog(`⛔ Cannot Fight: ${selectedUnit.name} has no actions remaining!`, 'info');
      return;
    }

    if (!isUnitInMeleeRange(selectedUnit, targetUnit, DEFAULT_GRID_SIZE)) {
      const { minEdgeDistPx } = getUnitsModelDistance(selectedUnit, targetUnit);
      const edgeSq = (minEdgeDistPx / DEFAULT_GRID_SIZE).toFixed(1);
      addLog(`Target is too far for melee (edge distance ${edgeSq} sq > 1.0 sq engagement range).`, 'info');
      return;
    }

    // 1. Host unit resolves combat
    const result = resolveCombat(selectedUnit, targetUnit, true, 0);
    setRecentCombatResult(result);
    addLog(result.logText, 'combat', gameState.phase === 'Action' ? 'Action' : 'Fight');
    applyDamageToUnit(targetUnit.id, result.livesLost, result.defModifierChange, selectedUnit.owner);

    // Trigger Melee Fight VFX & SFX
    if (targetUnit.position) {
      let fightVariant: 'slash' | 'crush' | 'claws' = 'slash';
      if (selectedUnit.type === 'Vehicle' || selectedUnit.traits?.includes('Unyielding') || selectedUnit.abilities?.some(a => a.vfxType === 'crush')) {
        fightVariant = 'crush';
      } else if (selectedUnit.type === 'Monster' || selectedUnit.traits?.includes('Berserk')) {
        fightVariant = 'claws';
      }
      vfxDispatcher.triggerFight(targetUnit.position, fightVariant);
    }

    // 2. Attached Leader fights alongside their bodyguard unit (BUG-022)
    if (selectedUnit.attachedUnits && selectedUnit.attachedUnits.length > 0) {
      const attachedLeaders = selectedUnit.attachedUnits
        .map(id => gameState.units.find(u => u.id === id))
        .filter((l): l is Unit => !!l && l.stats.lives > 0);

      for (const leader of attachedLeaders) {
        const currentTarget = gameState.units.find(u => u.id === targetUnit.id);
        if (currentTarget && currentTarget.stats.lives > 0) {
          const leaderResult = resolveCombat(leader, currentTarget, true, 0);
          addLog(`⚔️ [COMMANDER STRIKE] ${leader.name} fights alongside ${selectedUnit.name}! ${leaderResult.logText}`, 'combat', 'Commander Strike');
          applyDamageToUnit(targetUnit.id, leaderResult.livesLost, leaderResult.defModifierChange, selectedUnit.owner);
        }
      }
    }

    // Mark host squad and attached leaders as having fought and decrement 1 action
    const foughtIds = new Set<string>([selectedUnit.id, ...(selectedUnit.attachedUnits || [])]);
    setGameState(prev => ({
      ...prev,
      units: prev.units.map(u => foughtIds.has(u.id) ? { 
        ...u, 
        hasFought: true,
        actionsRemaining: Math.max(0, (u.actionsRemaining ?? 2) - 1)
      } : u)
    }));
  };

  const handleExecuteMissionAction = () => {
    if (!selectedUnit) return;
    const currentActions = selectedUnit.actionsRemaining ?? 2;
    if (gameState.phase === 'Action' && currentActions <= 0) {
      addLog(`⛔ Cannot perform Mission Action: ${selectedUnit.name} has no actions remaining!`, 'info');
      return;
    }
    const newActions = Math.max(0, currentActions - 1);

    const isP1 = selectedUnit.owner === 'player1';
    const activeCards = isP1 ? gameState.player1ActiveCards : gameState.player2ActiveCards;
    const unitPos = selectedUnit.position || (selectedUnit.tokens && selectedUnit.tokens[0] ? { x: selectedUnit.tokens[0].x, y: selectedUnit.tokens[0].y } : null);

    let completedCard: Card | null = null;
    let vpAwarded = 0;

    if (unitPos) {
      for (const card of activeCards) {
        if (card.type !== 'SecondaryMission') continue;
        let achieved = false;

        if (card.id === 'sec_teleport_homer') {
          // An Infantry unit performs a Mission Action in the enemy deployment half. (+3 VP)
          const inEnemyHalf = isP1 ? unitPos.x > 600 : unitPos.x < 600;
          if (selectedUnit.type === 'Infantry' && inEnemyHalf) {
            achieved = true;
          }
        } else if (card.id === 'sec_investigate_archeotech') {
          // A unit performs a Mission Action within 80px of any Point of Interest or Special Tile. (+2 VP)
          const nearPoi = gameState.pois.some(p => Math.hypot(p.x - unitPos.x, p.y - unitPos.y) <= (p.radius || 70) + 30);
          const nearSpecial = (gameState.specialTiles || []).some(t => Math.hypot(t.x - unitPos.x, t.y - unitPos.y) <= 80);
          if (nearPoi || nearSpecial) {
            achieved = true;
          }
        } else if (card.id === 'sec_establish_signal_array') {
          // A unit performs a Mission Action while positioned on High Ground. (+2 VP)
          const onHighGround = (gameState.specialTiles || []).some(t => t.type === 'HighGround' && Math.hypot(t.x - unitPos.x, t.y - unitPos.y) <= 80);
          if (onHighGround) {
            achieved = true;
          }
        } else if (card.id === 'sec_contain_rift') {
          // A unit performs a Mission Action within 80px of a Rift Fracture. (+3 VP)
          const nearRift = (gameState.specialTiles || []).some(t => (t.type === 'InfernalRift' || t.name.toLowerCase().includes('rift')) && Math.hypot(t.x - unitPos.x, t.y - unitPos.y) <= 100);
          if (nearRift) {
            achieved = true;
          }
        } else if (card.id === 'sec_dredge_mire') {
          // An Infantry unit performs a Mission Action in or adjacent to Flooded Mire. (+3 VP)
          const nearMire = (gameState.specialTiles || []).some(t => (t.type === 'Water' || t.name.toLowerCase().includes('mire')) && Math.hypot(t.x - unitPos.x, t.y - unitPos.y) <= 100);
          if (selectedUnit.type === 'Infantry' && nearMire) {
            achieved = true;
          }
        } else if (card.id === 'sec_sabotage_core') {
          // A unit performs a Mission Action on the center Point of Interest. (+3 VP)
          const centerPoi = gameState.pois.find(p => p.type === 'Special') || gameState.pois[1];
          if (centerPoi && Math.hypot(centerPoi.x - unitPos.x, centerPoi.y - unitPos.y) <= (centerPoi.radius || 70) + 25) {
            achieved = true;
          }
        }

        if (achieved) {
          completedCard = card;
          vpAwarded = card.pointsValue || 2;
          break;
        }
      }
    }

    setGameState(prev => {
      let newP1Score = prev.player1Score;
      let newP2Score = prev.player2Score;
      let newP1ActiveCards = [...prev.player1ActiveCards];
      let newP2ActiveCards = [...prev.player2ActiveCards];

      if (completedCard) {
        if (isP1) {
          newP1Score += vpAwarded;
          const unused = prev.player1CardPool.filter(c => !prev.player1ActiveCards.some(ac => ac.id === c.id));
          const replacement = unused.length > 0 ? unused[Math.floor(Math.random() * unused.length)] : completedCard;
          newP1ActiveCards = prev.player1ActiveCards.map(c => c.id === completedCard!.id ? replacement : c);
        } else {
          newP2Score += vpAwarded;
          const unused = prev.player2CardPool.filter(c => !prev.player2ActiveCards.some(ac => ac.id === c.id));
          const replacement = unused.length > 0 ? unused[Math.floor(Math.random() * unused.length)] : completedCard;
          newP2ActiveCards = prev.player2ActiveCards.map(c => c.id === completedCard!.id ? replacement : c);
        }
      }

      return {
        ...prev,
        player1Score: newP1Score,
        player2Score: newP2Score,
        player1ActiveCards: newP1ActiveCards,
        player2ActiveCards: newP2ActiveCards,
        units: prev.units.map(u => u.id === selectedUnit.id ? {
          ...u,
          actionsRemaining: newActions
        } : u)
      };
    });

    if (completedCard) {
      try {
        confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
      } catch {}
      addLog(`🎯 [Objective Completed] ${selectedUnit.name} accomplished "${completedCard.name}"! (+${vpAwarded} VP, ${newActions} action${newActions === 1 ? '' : 's'} remaining).`, 'score', 'Action');
    } else {
      addLog(`📋 [Mission Action] ${selectedUnit.name} completed a secondary tactical action! (${newActions} action${newActions === 1 ? '' : 's'} remaining).`, 'score', 'Action');
    }
  };

  const handleTriggerFieldEffect = (selectedCard?: Card) => {
    const card = selectedCard || FIELD_EFFECT_CARDS[Math.floor(Math.random() * FIELD_EFFECT_CARDS.length)];
    let newSpecialTiles = gameState.specialTiles || DEFAULT_SPECIAL_TILES;
    let relocateSummary = '';

    if (card.id === 'field_shifting_mires') {
      const res = relocateSpecialTiles(newSpecialTiles, t => t.type === 'Water' || t.name.toLowerCase().includes('mire') || t.name.toLowerCase().includes('trench'));
      newSpecialTiles = res.updatedTiles;
      relocateSummary = ` 🌊 Relocated: ${res.relocatedNames.join(', ')}`;
    } else if (card.id === 'field_rift_migration') {
      const res = relocateSpecialTiles(newSpecialTiles, t => t.type === 'InfernalRift' || t.name.toLowerCase().includes('rift'));
      newSpecialTiles = res.updatedTiles;
      relocateSummary = ` ⚡ Relocated: ${res.relocatedNames.join(', ')}`;
    } else if (card.id === 'field_tectonic_fault') {
      const res = relocateSpecialTiles(newSpecialTiles, t => t.type === 'HighGround');
      newSpecialTiles = res.updatedTiles;
      relocateSummary = ` 🏔️ Relocated: ${res.relocatedNames.join(', ')}`;
    } else if (card.id === 'field_acid_monsoon') {
      const spawnX = Math.round(350 + Math.random() * 500);
      const spawnY = Math.round(250 + Math.random() * 300);
      const acidHazard: SpecialTile = {
        id: `hazard_acid_${Date.now()}`,
        x: spawnX,
        y: spawnY,
        type: 'AcidPool',
        name: 'Corrosive Acid Deluge Zone',
        effectDescription: 'Chemical deluge: Def < 4 takes 1 damage (CP+Def > 6 resists)',
        radius: 105,
        emoji: '🧪',
        isTemporary: true,
        durationRounds: 2,
        activeRemaining: 2
      };
      newSpecialTiles = [...newSpecialTiles.filter(t => !t.name.includes('Acid')), acidHazard];
      relocateSummary = ` 🧪 Temporary Acid Hazard Zone spawned at (${spawnX}, ${spawnY}) for 2 rounds!`;
    } else if (card.id === 'field_dense_fog') {
      const spawnX = Math.round(350 + Math.random() * 500);
      const spawnY = Math.round(250 + Math.random() * 300);
      const mistHazard: SpecialTile = {
        id: `hazard_fog_${Date.now()}`,
        x: spawnX,
        y: spawnY,
        type: 'Water',
        name: 'Convergence Mists Zone',
        effectDescription: 'Dense violet fog: Ranged attacks -2 range squares',
        radius: 110,
        emoji: '🌫️',
        isTemporary: true,
        durationRounds: 2,
        activeRemaining: 2
      };
      newSpecialTiles = [...newSpecialTiles.filter(t => !t.name.includes('Mists')), mistHazard];
      relocateSummary = ` 🌫️ Temporary Convergence Mists spawned at (${spawnX}, ${spawnY}) for 2 rounds!`;
    } else if (card.id === 'field_mana_flare') {
      const spawnX = Math.round(350 + Math.random() * 500);
      const spawnY = Math.round(250 + Math.random() * 300);
      const manaHazard: SpecialTile = {
        id: `hazard_mana_${Date.now()}`,
        x: spawnX,
        y: spawnY,
        type: 'InfernalRift',
        name: 'Aetherial Aurora Vortex',
        effectDescription: 'Magical surge: Restores +1 CP & Advantage on next action',
        radius: 100,
        emoji: '🔮',
        isTemporary: true,
        durationRounds: 2,
        activeRemaining: 2
      };
      newSpecialTiles = [...newSpecialTiles.filter(t => !t.name.includes('Aurora')), manaHazard];
      relocateSummary = ` 🔮 Temporary Aetherial Aurora Vortex spawned at (${spawnX}, ${spawnY}) for 2 rounds!`;
    }

    setGameState(prev => ({
      ...prev,
      specialTiles: newSpecialTiles,
      logs: [
        {
          id: `log_field_${Date.now()}`,
          round: prev.round,
          phase: prev.phase,
          source: 'Field Hazard Deck',
          message: `🌪️ [Field Hazard: ${card.name}] ${card.objectiveText || card.description}${relocateSummary}`,
          type: 'event',
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.logs.slice(0, 74)
      ]
    }));
  };

  const applyDamageToUnit = (unitId: string, livesLost: number, defModChange: number, attackerOwner: 'player1' | 'player2') => {
    let unitDied = false;
    let destroyedUnitName: string | null = null;
    let scoreGain = 0;

    setGameState(prev => {
      let p1Kills = prev.player1Kills;
      let p2Kills = prev.player2Kills;

      const updatedUnits = prev.units.map(u => {
        if (u.id === unitId) {
          const damagedUnit = applyDamageToTokens(u, livesLost);
          const newDefMod = Math.max(-3, Math.min(3, damagedUnit.stats.defModifier + defModChange));
          
          // SYNCHRONOUS DEATH CHECK: HP <= 0
          if (damagedUnit.stats.lives <= 0 && u.stats.lives > 0) {
            unitDied = true;
            destroyedUnitName = u.name;
            scoreGain = u.type === 'Character' ? 2 : 1;
            if (attackerOwner === 'player1') p1Kills += 1;
            else p2Kills += 1;

            // Completely eliminate from battlefield: no position, no tokens, 0 lives
            return {
              ...damagedUnit,
              stats: {
                ...damagedUnit.stats,
                lives: 0,
                defModifier: newDefMod
              },
              position: null,
              tokens: []
            };
          }

          return {
            ...damagedUnit,
            stats: {
              ...damagedUnit.stats,
              defModifier: newDefMod
            }
          };
        }
        return u;
      });

      let finalUnits = updatedUnits;
      let abandonLogs: CombatLogEntry[] = [];
      const destroyedVehicle = prev.units.find(x => x.id === unitId);

      if (unitDied && destroyedVehicle && destroyedVehicle.type === 'Vehicle') {
        const hasEmbarked = prev.units.some(x => x.embarkedIn === unitId && x.stats.lives > 0);
        if (hasEmbarked) {
          const abandonRes = executeAbandonShipProtocol(destroyedVehicle, finalUnits);
          finalUnits = abandonRes.updatedUnits;
          abandonLogs = abandonRes.logs.map((l, i) => ({
            id: `log_abandon_${Date.now()}_${i}`,
            round: prev.round,
            phase: prev.phase,
            source: 'Abandon Ship',
            message: l.message,
            type: l.type,
            timestamp: new Date().toLocaleTimeString()
          }));

          if (abandonRes.reports.length > 0) {
            const summaryText = abandonRes.reports.map(r => 
              `${r.unitName}: ${r.survivingModels}/${r.totalModels} survived (${r.killedModels} killed, -${r.totalDamage} HP)`
            ).join(' | ');
            setAbandonShipNotice(`🚨 ABANDON SHIP! [${destroyedVehicle.name}] destroyed! ${summaryText}`);
            setTimeout(() => setAbandonShipNotice(null), 7000);
          }
        }
      }

      const killLogs: CombatLogEntry[] = destroyedUnitName ? [
        {
          id: `log_kill_${Date.now()}`,
          round: prev.round,
          phase: prev.phase,
          source: 'Combat Engine',
          message: `☠️ UNIT DESTROYED! ${destroyedUnitName} has fallen in battle! Attacker (${attackerOwner === 'player1' ? 'Player 1' : 'Player 2'}) awarded +${scoreGain} victory points!`,
          type: 'combat',
          timestamp: new Date().toLocaleTimeString()
        }
      ] : [];

      // Check elimination victory
      let isGameOver = prev.isGameOver;
      let winner = prev.winner;
      let winReason = prev.winReason;
      const victoryLogs: CombatLogEntry[] = [];

      if (unitDied && !prev.isGameOver) {
        const p1Alive = finalUnits.some(u => u.owner === 'player1' && (u.stats?.lives || 0) > 0);
        const p2Alive = finalUnits.some(u => u.owner === 'player2' && (u.stats?.lives || 0) > 0);

        if (!p1Alive && !p2Alive) {
          isGameOver = true;
          winner = 'draw';
          winReason = 'Mutual Elimination: All forces destroyed!';
          victoryLogs.push({
            id: `log_vic_${Date.now()}`,
            round: prev.round,
            phase: prev.phase,
            source: 'Resolution Matrix',
            message: '🏆 MATCH CONCLUDED! Mutual Elimination: All forces destroyed!',
            type: 'event',
            timestamp: new Date().toLocaleTimeString()
          });
        } else if (!p1Alive) {
          isGameOver = true;
          winner = 'player2';
          winReason = 'Elimination: Player 1 forces completely wiped out!';
          victoryLogs.push({
            id: `log_vic_${Date.now()}`,
            round: prev.round,
            phase: prev.phase,
            source: 'Resolution Matrix',
            message: '🏆 MATCH CONCLUDED! Player 2 secures Victory by Elimination!',
            type: 'event',
            timestamp: new Date().toLocaleTimeString()
          });
        } else if (!p2Alive) {
          isGameOver = true;
          winner = 'player1';
          winReason = 'Elimination: Player 2 forces completely wiped out!';
          victoryLogs.push({
            id: `log_vic_${Date.now()}`,
            round: prev.round,
            phase: prev.phase,
            source: 'Resolution Matrix',
            message: '🏆 MATCH CONCLUDED! Player 1 secures Victory by Elimination!',
            type: 'event',
            timestamp: new Date().toLocaleTimeString()
          });
        }

        if (isGameOver) {
          try {
            confetti({ particleCount: 150, spread: 85, origin: { y: 0.6 } });
          } catch {
            // ignore
          }
        }
      }

      return {
        ...prev,
        units: finalUnits,
        player1Score: attackerOwner === 'player1' ? prev.player1Score + scoreGain : prev.player1Score,
        player2Score: attackerOwner === 'player2' ? prev.player2Score + scoreGain : prev.player2Score,
        player1Kills: p1Kills,
        player2Kills: p2Kills,
        isGameOver,
        winner,
        winReason,
        logs: [...victoryLogs, ...killLogs, ...abandonLogs, ...prev.logs.slice(0, 75 - (victoryLogs.length + killLogs.length + abandonLogs.length))]
      };
    });

    // Synchronously clear target/selected if unit died
    if (unitDied) {
      setTargetUnitId(prev => (prev === unitId ? null : prev));
      setSelectedUnitId(prev => (prev === unitId ? null : prev));
    }
  };

  const BATTLE_PHASES: Phase[] = ['Command', 'Movement', 'Action'];

  const executeAdvancePhase = () => {
    setSelectedUnitId(null);
    setTargetUnitId(null);

    setGameState(prev => {
      // 1. Deployment Phase
      if (prev.phase === 'Deployment') {
        const currentDeployer = prev.deployingPlayer || prev.activePlayer;
        // Any remaining undeployed units of the current deployer are deliberately held back in Strategic Reserve
        const updatedUnits = prev.units.map(u => {
          if (u.owner === currentDeployer && !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo && u.stats.lives > 0) {
            return setUnitMutualState(u, 'reserve');
          }
          return u;
        });

        const p1Remaining = updatedUnits.filter(u => u.owner === 'player1' && !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo && u.stats.lives > 0).length;
        const p2Remaining = updatedUnits.filter(u => u.owner === 'player2' && !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo && u.stats.lives > 0).length;

        if (p1Remaining === 0 && p2Remaining === 0) {
          // Both deployed or placed in reserve! Move to Round 1 Command phase with Player 1
          const readyUnits = updatedUnits.map(u => ({
            ...u,
            actionsRemaining: u.maxActions || 2,
            hasMoved: false,
            isPendingMoveConfirm: false,
            pendingOriginalPosition: undefined,
            pendingOriginalTokens: undefined,
            tokens: (u.tokens || []).map(t => ({
              ...t,
              turnStartPos: { x: t.x, y: t.y },
              offendingCoherency: false
            }))
          }));

          return {
            ...prev,
            round: 1,
            phase: 'Command',
            activePlayer: 'player1',
            deployingPlayer: undefined,
            player1CP: (prev.player1CP ?? 3) + 1,
            units: readyUnits,
            logs: [
              {
                id: `log_${Date.now()}`,
                round: 1,
                phase: 'Command',
                source: 'Deployment Matrix',
                message: '🏁 All armies deployed or placed in Strategic Reserve! Round 1 Commencing — Player 1: Command Phase (+1 CP).',
                type: 'info',
                timestamp: new Date().toLocaleTimeString()
              },
              ...prev.logs.slice(0, 74)
            ]
          };
        } else {
          const nextDeployer = currentDeployer === 'player1' ? (p2Remaining > 0 ? 'player2' : 'player1') : (p1Remaining > 0 ? 'player1' : 'player2');
          return {
            ...prev,
            activePlayer: nextDeployer,
            deployingPlayer: nextDeployer,
            units: updatedUnits,
            logs: [
              {
                id: `log_${Date.now()}`,
                round: prev.round,
                phase: 'Deployment',
                source: 'Deployment Matrix',
                message: `Player ${currentDeployer === 'player1' ? '1' : '2'} finished deployment turn (undeployed units sent to Strategic Reserves). Now deploying: ${nextDeployer === 'player1' ? 'Player 1' : 'Player 2'}.`,
                type: 'info',
                timestamp: new Date().toLocaleTimeString()
              },
              ...prev.logs.slice(0, 74)
            ]
          };
        }
      }

      // 2. Battle Phases: Command -> Movement -> Action
      const currentPhaseIndex = BATTLE_PHASES.indexOf(prev.phase);

      // BUG-006: Auto-confirm any pending moves when leaving Movement phase
      let baseUnits = prev.units;
      if (prev.phase === 'Movement') {
        baseUnits = baseUnits.map(u => {
          if (u.isPendingMoveConfirm || u.pendingOriginalPosition) {
            return {
              ...u,
              hasMoved: true,
              isPendingMoveConfirm: false,
              pendingOriginalPosition: undefined,
              pendingOriginalTokens: undefined,
              tokens: (u.tokens || []).map(t => ({
                ...t,
                turnStartPos: { x: t.x, y: t.y },
                offendingCoherency: false
              }))
            };
          }
          return u;
        });
      }

      if (prev.activePlayer === 'player1') {
        if (currentPhaseIndex < BATTLE_PHASES.length - 1) {
          const nextPhase = BATTLE_PHASES[currentPhaseIndex + 1];
          // Reset action flag for Player 1 units entering this phase
          const updatedUnits = baseUnits.map(u => {
            if (u.owner !== 'player1') return u;
            // BUG-002 & BUG-003: Unlock units and record turnStartPos when entering Movement phase
            if (nextPhase === 'Movement') {
              return {
                ...u,
                hasMoved: false,
                isPendingMoveConfirm: false,
                pendingOriginalPosition: undefined,
                pendingOriginalTokens: undefined,
                tokens: (u.tokens || []).map(t => ({
                  ...t,
                  turnStartPos: { x: t.x, y: t.y },
                  offendingCoherency: false
                }))
              };
            }
            if (nextPhase === 'Action') {
              return {
                ...u,
                actionsRemaining: u.maxActions || 2,
                hasShot: false,
                hasCharged: false,
                hasFought: false
              };
            }
            if (nextPhase === 'Shooting') return { ...u, hasShot: false };
            if (nextPhase === 'Charge') return { ...u, hasCharged: false };
            if (nextPhase === 'Fight') return { ...u, hasFought: false };
            return u;
          });

          return {
            ...prev,
            phase: nextPhase,
            units: updatedUnits,
            logs: [
              {
                id: `log_${Date.now()}`,
                round: prev.round,
                phase: nextPhase,
                source: 'Turn Tracker',
                message: `Player 1: Entering ${nextPhase} Phase.`,
                type: 'info',
                timestamp: new Date().toLocaleTimeString()
              },
              ...prev.logs.slice(0, 74)
            ]
          };
        } else {
          // Player 1 finished 'Action'! Hand turn to Player 2 at 'Command'
          const p2CPNew = (prev.player2CP ?? 3) + 1;
          const unitsForP2 = baseUnits.map(u => ({
            ...u,
            issuedStratagemsThisTurn: u.owner === 'player2' ? [] : u.issuedStratagemsThisTurn
          }));
          return {
            ...prev,
            phase: 'Command',
            activePlayer: 'player2',
            player2CP: p2CPNew,
            units: unitsForP2,
            logs: [
              {
                id: `log_${Date.now()}`,
                round: prev.round,
                phase: 'Command',
                source: 'Turn Tracker',
                message: `🛡️ Player 1 Turn finished! Player 2 Turn begins — Command Phase (+1 CP, Total: ${p2CPNew} CP).`,
                type: 'info',
                timestamp: new Date().toLocaleTimeString()
              },
              ...prev.logs.slice(0, 74)
            ]
          };
        }
      } else {
        // Player 2
        if (currentPhaseIndex < BATTLE_PHASES.length - 1) {
          const nextPhase = BATTLE_PHASES[currentPhaseIndex + 1];
          // Reset action flag for Player 2 units entering this phase
          const updatedUnits = baseUnits.map(u => {
            if (u.owner !== 'player2') return u;
            // BUG-002 & BUG-003: Unlock units and record turnStartPos when entering Movement phase
            if (nextPhase === 'Movement') {
              return {
                ...u,
                hasMoved: false,
                isPendingMoveConfirm: false,
                pendingOriginalPosition: undefined,
                pendingOriginalTokens: undefined,
                tokens: (u.tokens || []).map(t => ({
                  ...t,
                  turnStartPos: { x: t.x, y: t.y },
                  offendingCoherency: false
                }))
              };
            }
            if (nextPhase === 'Action') {
              return {
                ...u,
                actionsRemaining: u.maxActions || 2,
                hasShot: false,
                hasCharged: false,
                hasFought: false
              };
            }
            if (nextPhase === 'Shooting') return { ...u, hasShot: false };
            if (nextPhase === 'Charge') return { ...u, hasCharged: false };
            if (nextPhase === 'Fight') return { ...u, hasFought: false };
            return u;
          });

          return {
            ...prev,
            phase: nextPhase,
            units: updatedUnits,
            logs: [
              {
                id: `log_${Date.now()}`,
                round: prev.round,
                phase: nextPhase,
                source: 'Turn Tracker',
                message: `Player 2: Entering ${nextPhase} Phase.`,
                type: 'info',
                timestamp: new Date().toLocaleTimeString()
              },
              ...prev.logs.slice(0, 74)
            ]
          };
        } else {
          // Player 2 finished 'Action'! END OF ROUND N!
          const poiResult = calculatePOIScores(baseUnits, prev.pois);
          const newP1Score = prev.player1Score + poiResult.p1TotalPoiScore;
          const newP2Score = prev.player2Score + poiResult.p2TotalPoiScore;
          const clonedEvents = [...prev.activeEvents];
          const clonedUnits = [...baseUnits];
          const eventRes = checkAndTriggerEvents(prev.round, clonedEvents, clonedUnits, prev.specialTiles);

          // Reset all action flags, stacks, temporary round buffs, and refresh turnStartPos for all units
          const cleanUnits = clonedUnits.map(u => ({
            ...u,
            actionsRemaining: u.maxActions || 2,
            hasMoved: false,
            hasShot: false,
            hasCharged: false,
            hasFought: false,
            isPendingMoveConfirm: false,
            pendingOriginalPosition: undefined,
            pendingOriginalTokens: undefined,
            advantageStacks: 0,
            disadvantageStacks: 0,
            issuedStratagemsThisTurn: [],
            traits: (u.traits || []).filter(t => t !== 'IgnoreDifficultTerrain' && t !== 'IgnoreTerrain'),
            stats: {
              ...u.stats,
              mv: u.stats.baseMv ?? u.stats.mv,
              defModifier: 0
            },
            tokens: (u.tokens || []).map(t => ({
              ...t,
              turnStartPos: { x: t.x, y: t.y },
              offendingCoherency: false
            }))
          }));

          // CHECK WIN CONDITIONS (BUG-025 & DESIGN-010: Round 10 Hard Cap, Dominant Knockout, Elimination)
          const winCheck = checkWinConditions(
            prev.round,
            newP1Score,
            newP2Score,
            cleanUnits.filter(u => u.owner === 'player1'),
            cleanUnits.filter(u => u.owner === 'player2'),
            prev.pois,
            prev.player1VotedEnd,
            prev.player2VotedEnd
          );

          if (winCheck.isOver) {
            try {
              confetti({ particleCount: 160, spread: 85, origin: { y: 0.55 } });
            } catch {
              // ignore
            }

            const victoryLogs: CombatLogEntry[] = [
              {
                id: `log_r_${Date.now()}`,
                round: prev.round,
                phase: 'Fight',
                source: 'Scoring Engine',
                message: `🏁 === Round ${prev.round} Completed! === P1: +${poiResult.p1TotalPoiScore} pts | P2: +${poiResult.p2TotalPoiScore} pts from Objectives. Final Scores: Player 1 ${newP1Score} VP - Player 2 ${newP2Score} VP.`,
                type: 'score',
                timestamp: new Date().toLocaleTimeString()
              },
              {
                id: `log_match_end_${Date.now()}`,
                round: prev.round,
                phase: 'Fight',
                source: 'Resolution Matrix',
                message: `🏆 MATCH CONCLUDED! ${winCheck.reason}`,
                type: 'event',
                timestamp: new Date().toLocaleTimeString()
              }
            ];

            return {
              ...prev,
              isGameOver: true,
              winner: winCheck.winner,
              winReason: winCheck.reason,
              player1Score: newP1Score,
              player2Score: newP2Score,
              activeEvents: clonedEvents,
              specialTiles: eventRes.specialTiles ?? prev.specialTiles,
              units: cleanUnits,
              logs: [...victoryLogs, ...prev.logs.slice(0, 75 - victoryLogs.length)]
            };
          }

          const nextRound = prev.round + 1;
          const p1CPNew = (prev.player1CP ?? 3) + 1;
          const endLogs: CombatLogEntry[] = [
            {
              id: `log_r_${Date.now()}`,
              round: prev.round,
              phase: 'Fight',
              source: 'Scoring Engine',
              message: `🏁 === Round ${prev.round} Completed! === P1: +${poiResult.p1TotalPoiScore} pts | P2: +${poiResult.p2TotalPoiScore} pts from Objectives.`,
              type: 'score',
              timestamp: new Date().toLocaleTimeString()
            },
            ...eventRes.logs.map((el, i) => ({
              id: `log_ev_${Date.now()}_${i}`,
              round: prev.round,
              phase: 'Command' as Phase,
              source: 'Event Matrix',
              message: el,
              type: 'event' as const,
              timestamp: new Date().toLocaleTimeString()
            })),
            {
              id: `log_next_r_${Date.now()}`,
              round: nextRound,
              phase: 'Command',
              source: 'Turn Tracker',
              message: `⚔️ === Round ${nextRound} Commencing === Player 1: Command Phase (+1 CP, Total: ${p1CPNew} CP).`,
              type: 'info',
              timestamp: new Date().toLocaleTimeString()
            }
          ];

          return {
            ...prev,
            round: nextRound,
            phase: 'Command',
            activePlayer: 'player1',
            player1Score: newP1Score,
            player2Score: newP2Score,
            player1CP: p1CPNew,
            activeEvents: clonedEvents,
            specialTiles: eventRes.specialTiles ?? prev.specialTiles,
            units: cleanUnits,
            logs: [...endLogs, ...prev.logs.slice(0, 75 - endLogs.length)]
          };
        }
      }
    });
  };

  // Advance Phase with Leader Attachment Warning Guard
  const handleAdvancePhase = () => {
    if (gameState.phase === 'Deployment') {
      const currentDeployer = gameState.deployingPlayer || gameState.activePlayer;
      const pendingDeploymentUnit = gameState.units.find(u => u.owner === currentDeployer && u.isPendingDeploymentConfirm);
      if (pendingDeploymentUnit) {
        handleConfirmDeployment(pendingDeploymentUnit.id);
        return;
      }

      const unattachedLeader = gameState.units.find(u => 
        u.owner === currentDeployer && 
        u.position && 
        !u.attachedTo && 
        (u.role === 'Leader' || u.role === 'Legendary Leader' || u.type === 'Character') &&
        gameState.units.some(b => b.owner === currentDeployer && b.type === 'Infantry' && (!b.attachedUnits || b.attachedUnits.length === 0) && b.id !== u.id && !b.attachedTo)
      );

      if (unattachedLeader) {
        setLeaderWarningState({ leaderId: unattachedLeader.id, pendingAction: 'advance_turn' });
        return;
      }
    }

    executeAdvancePhase();
  };

  // Bot auto-play for Player 2
  const handleExecuteBotAction = () => {
    const currentDeployer = gameState.phase === 'Deployment' 
      ? (gameState.deployingPlayer || gameState.activePlayer) 
      : gameState.activePlayer;
    if (currentDeployer !== 'player2' || gameState.isGameOver) return;
    const p2Units = gameState.units.filter(u => u.owner === 'player2' && u.stats.lives > 0);
    const p1Units = gameState.units.filter(u => u.owner === 'player1' && u.stats.lives > 0);

    if (gameState.phase === 'Deployment') {
      const undeployed = p2Units.filter(u => !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo);
      if (undeployed.length > 0) {
        const botUnit = undeployed[0];
        const deployedCount = p2Units.filter(u => u.position).length;
        const targetX = 1040 + (deployedCount % 2) * 80;
        const targetY = 150 + (deployedCount % 5) * 125;
        const candidatePos = { x: targetX, y: targetY };
        const safePos = findNearestNonOverlappingPosition(botUnit, candidatePos, gameState.units) || candidatePos;
        const deployedBot = moveUnit({ ...botUnit, isPendingDeploymentConfirm: false }, safePos, gameState.units);

        const updatedUnits = gameState.units.map(u => u.id === botUnit.id ? { ...deployedBot, isPendingDeploymentConfirm: false } : u);
        addLog(`🤖 Bot deployed ${botUnit.name} to East flank (${safePos.x}px, ${safePos.y}px).`, 'info');
        progressDeploymentAlternation('player2', updatedUnits);
      } else {
        handleAdvancePhase();
      }
      return;
    }

    if (gameState.phase === 'Command') {
      if ((gameState.player2CP ?? 0) >= 2 && p2Units.length > 0) {
        const buffTarget = p2Units[0];
        setGameState(prev => ({
          ...prev,
          player2CP: (prev.player2CP ?? 2) - 1,
          units: prev.units.map(u => u.id === buffTarget.id ? { ...u, stats: { ...u.stats, am: u.stats.am + 1 } } : u)
        }));
        addLog(`⚡ Bot Command: Activated Overcharged Munitions (+1 AM) on ${buffTarget.name}.`, 'event', 'Bot Command');
      }
      handleAdvancePhase();
      return;
    }

    if (gameState.phase === 'Movement') {
      const readyUnit = p2Units.find(u => !u.hasMoved && u.position);
      if (readyUnit && readyUnit.position) {
        const unitIndex = p2Units.indexOf(readyUnit);
        // Distribute bot destinations across objectives and enemies so squads do not cluster
        let targetPos = { x: 600, y: 400 };
        if (gameState.pois && gameState.pois.length > 0) {
          const assignedPoi = gameState.pois[unitIndex % gameState.pois.length];
          targetPos = { x: assignedPoi.x, y: assignedPoi.y };
        }
        if (p1Units.length > 0 && unitIndex % 2 === 1) {
          const assignedEnemy = p1Units[unitIndex % p1Units.length];
          if (assignedEnemy && assignedEnemy.position) {
            targetPos = { x: assignedEnemy.position.x, y: assignedEnemy.position.y };
          }
        }

        const maxStepPx = readyUnit.stats.mv * DEFAULT_GRID_SIZE;
        // Guarantee collision-free, non-overlapping placement
        const safeDestination = findValidMovePositionForBot(readyUnit, targetPos, gameState.units, maxStepPx);

        const movedBot = moveUnit({ ...readyUnit, hasMoved: true }, safeDestination, gameState.units);
        setGameState(prev => ({
          ...prev,
          units: prev.units.map(u => u.id === readyUnit.id ? movedBot : u)
        }));
        const distMoved = Math.hypot(safeDestination.x - readyUnit.position.x, safeDestination.y - readyUnit.position.y);
        addLog(`Bot moved ${readyUnit.name} forward [${(distMoved / DEFAULT_GRID_SIZE).toFixed(1)} sq].`, 'info');
      } else {
        handleAdvancePhase();
      }
      return;
    }

    if (gameState.phase === 'Action') {
      const activeUnitsWithActions = p2Units.filter(u => (u.actionsRemaining ?? 2) > 0 && u.position);
      if (activeUnitsWithActions.length > 0) {
        // Priority 1: Melee Fight if already in contact
        for (const fighter of activeUnitsWithActions) {
          const inMeleeTarget = p1Units.find(t => t.position && isUnitInMeleeRange(fighter, t, DEFAULT_GRID_SIZE));
          if (inMeleeTarget && inMeleeTarget.position) {
            const res = resolveCombat(fighter, inMeleeTarget, true);
            addLog(`Bot: ${res.logText}`, 'combat', 'Action');
            applyDamageToUnit(inMeleeTarget.id, res.livesLost, res.defModifierChange, 'player2');
            vfxDispatcher.triggerFight(
              inMeleeTarget.position, 
              fighter.type === 'Monster' ? 'claws' : fighter.type === 'Vehicle' ? 'crush' : 'slash'
            );
            setGameState(prev => ({
              ...prev,
              units: prev.units.map(u => u.id === fighter.id ? { 
                ...u, 
                hasFought: true,
                actionsRemaining: Math.max(0, (u.actionsRemaining ?? 2) - 1)
              } : u)
            }));
            return;
          }
        }

        // Priority 2: Shoot if ranged enemy in target range
        for (const shooter of activeUnitsWithActions) {
          if (shooter.stats.range > 0) {
            const inRangeTarget = p1Units.find(t => t.position && isUnitInShootingRange(shooter, t, DEFAULT_GRID_SIZE));
            if (inRangeTarget && inRangeTarget.position) {
              const res = resolveCombat(shooter, inRangeTarget, false);
              addLog(`Bot: ${res.logText}`, 'combat', 'Action');
              applyDamageToUnit(inRangeTarget.id, res.livesLost, res.defModifierChange, 'player2');
              vfxDispatcher.triggerShoot(
                shooter.position!, 
                inRangeTarget.position, 
                shooter.traits?.includes('Psionic') ? 'laser' : shooter.type === 'Monster' ? 'plasma' : 'ballistic'
              );
              setGameState(prev => ({
                ...prev,
                units: prev.units.map(u => u.id === shooter.id ? { 
                  ...u, 
                  hasShot: true,
                  actionsRemaining: Math.max(0, (u.actionsRemaining ?? 2) - 1)
                } : u)
              }));
              return;
            }
          }
        }

        // Priority 3: Engage if close to an enemy
        for (const charger of activeUnitsWithActions) {
          const nearEnemy = p1Units.find(t => {
            if (!t.position) return false;
            const { minModelDistPx } = getUnitsModelDistance(charger, t);
            const dist = minModelDistPx / DEFAULT_GRID_SIZE;
            return dist > 0.3 && dist <= (charger.stats.mv + 0.3);
          });
          if (nearEnemy && nearEnemy.position) {
            const res = rollCharge(charger.stats.mv);
            if (res.success) {
              const angle = Math.atan2(nearEnemy.position.y - charger.position!.y, nearEnemy.position.x - charger.position!.x);
              const targetRadius = getUnitCollisionRadius(nearEnemy);
              const chargerRadius = getUnitCollisionRadius(charger);
              const contactDist = targetRadius + chargerRadius + 2;

              const candidateAngles = [angle, angle + 0.25, angle - 0.25, angle + 0.5, angle - 0.5, angle + 0.75, angle - 0.75];
              let bestPos = {
                x: Math.max(chargerRadius, Math.min(1200 - chargerRadius, Math.round(nearEnemy.position.x - Math.cos(angle) * contactDist))),
                y: Math.max(chargerRadius, Math.min(800 - chargerRadius, Math.round(nearEnemy.position.y - Math.sin(angle) * contactDist)))
              };

              for (const a of candidateAngles) {
                const testX = Math.max(chargerRadius, Math.min(1200 - chargerRadius, Math.round(nearEnemy.position.x - Math.cos(a) * contactDist)));
                const testY = Math.max(chargerRadius, Math.min(800 - chargerRadius, Math.round(nearEnemy.position.y - Math.sin(a) * contactDist)));
                const testUnit = moveUnit(charger, { x: testX, y: testY }, gameState.units);
                const colCheck = checkUniversalTokenCollisions(testUnit.tokens || [], gameState.units, charger.id);
                if (!colCheck.hasCollision) {
                  bestPos = { x: testX, y: testY };
                  break;
                }
              }

              const charged = moveUnit({ 
                ...charger, 
                hasCharged: true, 
                actionsRemaining: Math.max(0, (charger.actionsRemaining ?? 2) - 1),
                advantageStacks: 1 
              }, bestPos, gameState.units);
              setGameState(prev => ({
                ...prev,
                units: prev.units.map(u => u.id === charger.id ? charged : u)
              }));
              addLog(`Bot: ${charger.name} successfully engaged ${nearEnemy.name}!`, 'charge', 'Action');
              return;
            } else {
              // Roll failed, spend 1 action
              setGameState(prev => ({
                ...prev,
                units: prev.units.map(u => u.id === charger.id ? {
                  ...u,
                  hasCharged: true,
                  actionsRemaining: Math.max(0, (u.actionsRemaining ?? 2) - 1)
                } : u)
              }));
              addLog(`Bot: ${charger.name} failed engagement roll!`, 'charge', 'Action');
              return;
            }
          }
        }
      }
      handleAdvancePhase();
      return;
    }

    if (gameState.phase === 'Shooting') {
      const shooter = p2Units.find(u => !u.hasShot && u.stats.range > 0 && u.position);
      if (shooter && shooter.position) {
        const inRangeTarget = p1Units.find(t => t.position && isUnitInShootingRange(shooter, t, DEFAULT_GRID_SIZE));
        if (inRangeTarget && inRangeTarget.position) {
          const res = resolveCombat(shooter, inRangeTarget, false);
          addLog(`Bot: ${res.logText}`, 'combat', 'Shooting');
          applyDamageToUnit(inRangeTarget.id, res.livesLost, res.defModifierChange, 'player2');
          vfxDispatcher.triggerShoot(
            shooter.position, 
            inRangeTarget.position, 
            shooter.traits?.includes('Psionic') ? 'laser' : shooter.type === 'Monster' ? 'plasma' : 'ballistic'
          );
          setGameState(prev => ({
            ...prev,
            units: prev.units.map(u => u.id === shooter.id ? { ...u, hasShot: true } : u)
          }));
          return;
        }
      }
      handleAdvancePhase();
      return;
    }

    if (gameState.phase === 'Charge') {
      const charger = p2Units.find(u => !u.hasCharged && u.position);
      if (charger && charger.position) {
        const nearEnemy = p1Units.find(t => {
          if (!t.position) return false;
          const { minModelDistPx } = getUnitsModelDistance(charger, t);
          return (minModelDistPx / DEFAULT_GRID_SIZE) <= (charger.stats.mv + 0.3);
        });
        if (nearEnemy && nearEnemy.position) {
          const res = rollCharge(charger.stats.mv);
          if (res.success) {
            const angle = Math.atan2(nearEnemy.position.y - charger.position.y, nearEnemy.position.x - charger.position.x);
            const targetRadius = getUnitCollisionRadius(nearEnemy);
            const chargerRadius = getUnitCollisionRadius(charger);
            const contactDist = targetRadius + chargerRadius + 2;

            const candidateAngles = [angle, angle + 0.25, angle - 0.25, angle + 0.5, angle - 0.5, angle + 0.75, angle - 0.75];
            let bestPos = {
              x: Math.max(chargerRadius, Math.min(1200 - chargerRadius, Math.round(nearEnemy.position.x - Math.cos(angle) * contactDist))),
              y: Math.max(chargerRadius, Math.min(800 - chargerRadius, Math.round(nearEnemy.position.y - Math.sin(angle) * contactDist)))
            };

            for (const a of candidateAngles) {
              const testX = Math.max(chargerRadius, Math.min(1200 - chargerRadius, Math.round(nearEnemy.position.x - Math.cos(a) * contactDist)));
              const testY = Math.max(chargerRadius, Math.min(800 - chargerRadius, Math.round(nearEnemy.position.y - Math.sin(a) * contactDist)));
              const testUnit = moveUnit(charger, { x: testX, y: testY }, gameState.units);
              const colCheck = checkUniversalTokenCollisions(testUnit.tokens || [], gameState.units, charger.id);
              if (!colCheck.hasCollision) {
                bestPos = { x: testX, y: testY };
                break;
              }
            }

            const charged = moveUnit({ ...charger, hasCharged: true, advantageStacks: 1 }, bestPos, gameState.units);
            setGameState(prev => ({
              ...prev,
              units: prev.units.map(u => u.id === charger.id ? charged : u)
            }));
            addLog(`Bot: ${charger.name} successfully charged ${nearEnemy.name}!`, 'charge');
            return;
          }
        }
      }
      handleAdvancePhase();
      return;
    }

    if (gameState.phase === 'Fight') {
      const fighter = p2Units.find(u => !u.hasFought && u.position);
      if (fighter && fighter.position) {
        const inMeleeTarget = p1Units.find(t => t.position && isUnitInMeleeRange(fighter, t, DEFAULT_GRID_SIZE));
        if (inMeleeTarget && inMeleeTarget.position) {
          const res = resolveCombat(fighter, inMeleeTarget, true);
          addLog(`Bot: ${res.logText}`, 'combat', 'Fight');
          applyDamageToUnit(inMeleeTarget.id, res.livesLost, res.defModifierChange, 'player2');
          vfxDispatcher.triggerFight(
            inMeleeTarget.position, 
            fighter.type === 'Monster' ? 'claws' : fighter.type === 'Vehicle' ? 'crush' : 'slash'
          );
          setGameState(prev => ({
            ...prev,
            units: prev.units.map(u => u.id === fighter.id ? { ...u, hasFought: true } : u)
          }));
          return;
        }
      }
      handleAdvancePhase();
      return;
    }

    handleAdvancePhase();
  };

  // BUG-026: Automated Bot Turn Controller for Player 2 (Single-Player VS Opponent Bot)
  useEffect(() => {
    if (gameState.isGameOver) return;

    const currentTurnDeployer = gameState.phase === 'Deployment'
      ? (gameState.deployingPlayer || gameState.activePlayer)
      : gameState.activePlayer;

    if (currentTurnDeployer === 'player2') {
      setIsBotDeploying(true);
      const timer = setTimeout(() => {
        handleExecuteBotAction();
        setIsBotDeploying(false);
      }, 750);
      return () => {
        clearTimeout(timer);
        setIsBotDeploying(false);
      };
    } else {
      setIsBotDeploying(false);
    }
  }, [
    gameState.activePlayer,
    gameState.deployingPlayer,
    gameState.phase,
    gameState.round,
    gameState.isGameOver,
    gameState.units
  ]);

  // UI-003: Collect all abilities for the active player (Unit abilities + Faction Army-Wide Ability)
  const allFactionsList = StorageService.getFactions();
  const activeFactionId = gameState.activePlayer === 'player1'
    ? (customRoster?.factionId || gameState.units.find(u => u.owner === 'player1')?.factionId || 'crimson_empire')
    : (gameState.units.find(u => u.owner === 'player2')?.factionId || 'daughters_astraea');
  const activeFaction = allFactionsList.find(f => f.id === activeFactionId);

  const currentCP = gameState.activePlayer === 'player1' ? (gameState.player1CP ?? 0) : (gameState.player2CP ?? 0);

  const availableAbilities: BattlefieldAbilityItem[] = [];

  // 1. Faction Ability
  if (activeFaction?.factionAbility) {
    const ab = activeFaction.factionAbility;
    const key = `faction_${activeFaction.id}_${ab.id}`;
    const check = checkAbilityActivation({
      ability: ab,
      isFaction: true,
      currentPhase: gameState.phase,
      usedInRound: usedAbilitiesThisRound[key] || 0,
      usedInGame: !!usedAbilitiesThisGame[key]
    });

    availableAbilities.push({
      key,
      ability: ab,
      sourceName: `${activeFaction.shortName || activeFaction.name} (Faction)`,
      sourceAvatar: activeFaction.symbol || '🔮',
      isFaction: true,
      isActivatable: check.isActivatable,
      disabledReason: check.disabledReason,
      usageLimit: check.rule
    });
  }

  // 2. Unit Abilities (Zero-CP cost rule - added to player hand when unit is deployed on battlefield)
  gameState.units
    .filter(u => {
      if (u.owner !== gameState.activePlayer || (u.stats?.lives ?? 0) <= 0) return false;
      if (u.position) return true;
      if (u.attachedTo) {
        const host = gameState.units.find(b => b.id === u.attachedTo);
        return !!host?.position;
      }
      return false;
    })
    .forEach(u => {
      (u.abilities || []).forEach((ab, idx) => {
        const key = `unit_${u.id}_${ab.id || idx}`;
        const check = checkAbilityActivation({
          ability: ab,
          isFaction: false,
          currentPhase: gameState.phase,
          usedInRound: usedAbilitiesThisRound[key] || 0,
          usedInGame: !!usedAbilitiesThisGame[key]
        });

        availableAbilities.push({
          key,
          ability: ab,
          sourceName: u.name,
          sourceAvatar: u.avatar || '⚔️',
          sourceUnitId: u.id,
          isFaction: false,
          isActivatable: check.isActivatable,
          disabledReason: check.disabledReason,
          usageLimit: check.rule
        });
      });
    });

  const readyAbilitiesCount = availableAbilities.filter(a => a.isActivatable).length;

  return (
    <div className="w-full h-[calc(100vh-50px)] flex flex-col bg-[#0b0d13] select-none overflow-hidden">
      {/* Roll20 Style Top Control Strip */}
      <div className="h-10 bg-[#161922] border-b border-zinc-800 flex items-center justify-between px-3 shrink-0 text-xs">
        <div className="flex items-center space-x-4 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="font-bold text-white uppercase">Round {gameState.round}</span>
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
              {gameState.phase} Phase
            </span>
          </div>
          <span className="text-zinc-600">|</span>
          <div className="text-zinc-300">
            <span>Turn: </span>
            <span className={gameState.activePlayer === 'player1' ? 'text-rose-400 font-bold' : 'text-sky-400 font-bold'}>
              {gameState.activePlayer === 'player1' ? 'Player 1 (West)' : 'Player 2 (East / Bot)'}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="text-rose-400 font-bold">P1: {gameState.player1Score} pts ({gameState.player1CP ?? 3} CP)</span>
            <span className="text-zinc-500">vs</span>
            <span className="text-sky-400 font-bold">P2: {gameState.player2Score} pts ({gameState.player2CP ?? 3} CP)</span>
            
            {/* Scoring Rules Popover */}
            <div className="relative group cursor-help">
              <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/50 text-amber-300 font-mono text-[10px] hover:bg-amber-900/60 transition flex items-center space-x-1">
                <HelpCircle className="w-3 h-3" />
                <span>Scoring Rules</span>
              </span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover:block w-72 p-3 bg-zinc-950/95 border border-amber-500/60 rounded-xl shadow-2xl z-50 text-[11px] text-zinc-300 font-sans backdrop-blur pointer-events-none">
                <div className="font-bold text-amber-300 font-mono text-xs uppercase mb-1.5 flex items-center space-x-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>How You Score Points</span>
                </div>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li><strong className="text-white">POIs (Round End):</strong> Any unit with models inside the capture ring contests the objective. Higher CP wins: <span className="text-amber-400 font-mono">(Winner CP - Loser CP) × Multiplier (1x Basic / 2x Special)</span>.</li>
                  <li><strong className="text-white">Unit Kills:</strong> Destroying an enemy squad grants <span className="text-rose-400 font-mono">+1 VP</span> (+2 VP for Characters/Leaders).</li>
                  <li><strong className="text-white">Tactical Cards:</strong> Achieving active card objectives earns bonus VP.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Phase & Drawer Quick Controllers */}
        <div className="flex items-center space-x-2">
          {gameState.phase === 'Deployment' && (() => {
            const currentDeployer = gameState.deployingPlayer || gameState.activePlayer;
            const deployableCount = gameState.units.filter(
              u => !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo && u.stats.lives > 0 && u.owner === currentDeployer
            ).length;

            return (
              <button
                onClick={() => {
                  setArmyTrayDrawerOpen(prev => !prev);
                  setDiceDrawerOpen(false);
                  setCommandDrawerOpen(false);
                  setReservesDrawerOpen(false);
                  setEmbarkedDrawerOpen(false);
                }}
                className={`px-2.5 py-1 rounded shadow text-xs font-bold font-mono flex items-center space-x-1.5 transition ${
                  armyTrayDrawerOpen 
                    ? 'bg-amber-400 text-black shadow-lg ring-2 ring-amber-300' 
                    : 'bg-zinc-850 hover:bg-zinc-750 text-amber-300 border border-amber-500/50'
                }`}
                title="Toggle Army Tray (Deploy Units) Drawer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Army Tray ({deployableCount})</span>
              </button>
            );
          })()}

          <button
            onClick={() => {
              setDiceDrawerOpen(prev => !prev);
              setArmyTrayDrawerOpen(false);
              setCommandDrawerOpen(false);
              setReservesDrawerOpen(false);
              setEmbarkedDrawerOpen(false);
            }}
            className={`px-2.5 py-1 rounded shadow text-xs font-bold font-mono flex items-center space-x-1.5 transition ${
              diceDrawerOpen ? 'bg-amber-500 text-black shadow-lg' : 'bg-zinc-850 hover:bg-zinc-750 text-amber-300 border border-amber-500/30'
            }`}
            title="Toggle Dice Tray Drawer"
          >
            <span>🎲</span>
            <span>Dice Tray</span>
          </button>

          <button
            onClick={() => {
              setCommandDrawerOpen(prev => !prev);
              setArmyTrayDrawerOpen(false);
              setDiceDrawerOpen(false);
              setReservesDrawerOpen(false);
              setEmbarkedDrawerOpen(false);
            }}
            className={`px-2.5 py-1 rounded shadow text-xs font-bold font-mono flex items-center space-x-1.5 transition ${
              commandDrawerOpen ? 'bg-amber-400 text-black shadow-lg' : 'bg-zinc-850 hover:bg-zinc-750 text-amber-400 border border-amber-400/40'
            }`}
            title="Toggle Command Phase Drawer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Command (CP: {gameState.activePlayer === 'player1' ? gameState.player1CP ?? 3 : gameState.player2CP ?? 3})</span>
          </button>

          <button
            onClick={() => {
              setReservesDrawerOpen(prev => !prev);
              setArmyTrayDrawerOpen(false);
              setDiceDrawerOpen(false);
              setCommandDrawerOpen(false);
              setEmbarkedDrawerOpen(false);
            }}
            className={`px-2.5 py-1 rounded shadow text-xs font-bold font-mono flex items-center space-x-1.5 transition ${
              reservesDrawerOpen ? 'bg-amber-500 text-black shadow-lg' : 'bg-zinc-850 hover:bg-zinc-750 text-amber-300 border border-amber-500/30'
            }`}
            title="Toggle Strategic Reserves Drawer"
          >
            <Box className="w-3.5 h-3.5" />
            <span>Reserves ({gameState.units.filter(u => u.inStrategicReserve).length})</span>
          </button>

          <button
            onClick={() => {
              setEmbarkedDrawerOpen(prev => !prev);
              setArmyTrayDrawerOpen(false);
              setDiceDrawerOpen(false);
              setCommandDrawerOpen(false);
              setReservesDrawerOpen(false);
            }}
            className={`px-2.5 py-1 rounded shadow text-xs font-bold font-mono flex items-center space-x-1.5 transition ${
              embarkedDrawerOpen ? 'bg-sky-400 text-black shadow-lg' : 'bg-zinc-850 hover:bg-zinc-750 text-sky-400 border border-sky-400/40'
            }`}
            title="Toggle Embarked Units Drawer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Embarked ({gameState.units.filter(u => !!u.embarkedIn).length})</span>
          </button>

          <button
            onClick={() => {
              setCardDrawerTab('missions');
              setShowCardDrawer(true);
            }}
            className={`px-2.5 py-1 rounded shadow text-xs font-bold font-mono flex items-center space-x-1.5 transition ${
              showCardDrawer && cardDrawerTab === 'missions'
                ? 'bg-amber-400 text-black shadow-lg'
                : 'bg-zinc-850 hover:bg-zinc-750 text-amber-300 border border-amber-400/40'
            }`}
            title="Open Secondary Tactical Objectives Deck"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Secondary Deck ({gameState.activePlayer === 'player1' ? gameState.player1ActiveCards.filter(c => c.type === 'SecondaryMission').length : gameState.player2ActiveCards.filter(c => c.type === 'SecondaryMission').length})</span>
          </button>

          <button
            onClick={() => {
              setCardDrawerTab('field_hazards');
              setShowCardDrawer(true);
            }}
            className={`px-2.5 py-1 rounded shadow text-xs font-bold font-mono flex items-center space-x-1.5 transition ${
              showCardDrawer && cardDrawerTab === 'field_hazards'
                ? 'bg-rose-500 text-white shadow-lg'
                : 'bg-zinc-850 hover:bg-zinc-750 text-rose-300 border border-rose-500/40'
            }`}
            title="Open Mid-Game Events & Hazard Disasters Deck (Shifting Terrain)"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Event Deck ({gameState.activeEvents.filter(e => e.activeRemaining > 0).length > 0 ? gameState.activeEvents.filter(e => e.activeRemaining > 0)[0].name : '6 Hazards'})</span>
          </button>

          <div className="w-[1px] h-5 bg-zinc-700 mx-1" />

          {gameState.activePlayer === 'player2' ? (
            <button
              onClick={handleExecuteBotAction}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1 rounded shadow text-xs flex items-center space-x-1"
            >
              <span>Bot Action</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={handleAdvancePhase}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1 rounded shadow text-xs flex items-center space-x-1"
            >
              <span>Next Turn / Phase</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <div className="w-[1px] h-5 bg-zinc-700 mx-1" />

          {/* UI-004: Right Sidebar Collapse Toggle */}
          <button
            onClick={() => setShowRightSidebar(prev => !prev)}
            className={`px-2.5 py-1 rounded shadow text-xs font-bold font-mono flex items-center space-x-1.5 transition cursor-pointer ${
              showRightSidebar 
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700' 
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50'
            }`}
            title={showRightSidebar ? "Collapse Sidebar (Full Canvas Mode)" : "Expand Sidebar (Combat Log, Chat, Cards)"}
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showRightSidebar ? '' : 'rotate-180'}`} />
            <span className="hidden sm:inline">{showRightSidebar ? 'Hide Panel' : 'Show Panel'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace (VTT Canvas + Roll20 Sidebars) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar (Roll20 Style) */}
        <div className="w-11 bg-[#13151d] border-r border-zinc-800 flex flex-col items-center py-2 space-y-2 shrink-0 z-20">
          <button
            onClick={() => setActiveTool('select')}
            title="Select / Move Units (V)"
            className={`p-2 rounded-lg transition ${
              activeTool === 'select' ? 'bg-rose-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('move')}
            title="Free Hand Pan / Move"
            className={`p-2 rounded-lg transition ${
              activeTool === 'move' ? 'bg-rose-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Move className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('measure')}
            title="Ruler / Range Measure (M)"
            className={`p-2 rounded-lg transition ${
              activeTool === 'measure' ? 'bg-rose-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('target')}
            title="Target Reticle"
            className={`p-2 rounded-lg transition ${
              activeTool === 'target' ? 'bg-rose-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Target className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('inspect')}
            title="Inspection Tool (I) - Hover over units, terrain, hazards & objectives to inspect details"
            className={`p-2 rounded-lg transition ${
              activeTool === 'inspect' ? 'bg-amber-600 text-white shadow ring-2 ring-amber-400/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <div className="w-6 h-[1px] bg-zinc-800 my-1"></div>

          <button
            onClick={() => setShowCardDrawer(true)}
            title="Command Cards Deck"
            className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => setZoomLevel(prev => Math.min(2.5, Math.round((prev + 0.15) * 100) / 100))}
            title="Zoom In"
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.4, Math.round((prev - 0.15) * 100) / 100))}
            title="Zoom Out"
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            title="Reset Zoom (100%)"
            className="p-1 text-[10px] font-mono font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
        </div>

        {/* Center: Tactical Virtual Tabletop (VTT) Canvas */}
        <div className="flex-1 flex flex-col bg-[#07090e] overflow-hidden relative">
          {/* Deployment Staging Bar (Top overlay when in Deployment) */}
          {gameState.phase === 'Deployment' && (() => {
            const currentDeployer = gameState.deployingPlayer || gameState.activePlayer;
            const totalDeployerUnits = gameState.units.filter(u => u.owner === currentDeployer).length;
            const p1Remaining = gameState.units.filter(u => u.owner === 'player1' && !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo && u.stats.lives > 0).length;
            const p2Remaining = gameState.units.filter(u => u.owner === 'player2' && !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo && u.stats.lives > 0).length;
            const trayUnits = gameState.units.filter(u => !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo && u.stats.lives > 0 && u.owner === currentDeployer);

            return isDeployStagingMinimized ? (
              <div className="w-full bg-[#141724]/95 border-b border-amber-800/80 px-4 py-1.5 shadow-xl flex items-center justify-between gap-2 z-10 shrink-0 text-xs">
                <div className="flex items-center space-x-3">
                  <span className="text-[11px] font-mono text-amber-300 font-bold">
                    🪙 Deploying: <strong className={currentDeployer === 'player1' ? 'text-rose-400' : 'text-sky-400'}>{currentDeployer === 'player1' ? 'Player 1 (West)' : 'Player 2 (East / Bot)'}</strong>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">P1: {p1Remaining} left | P2: {p2Remaining} left</span>
                  {isBotDeploying && (
                    <span className="text-[11px] font-mono text-sky-400 font-bold flex items-center space-x-1 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                      <span>🤖 Bot is positioning squad...</span>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsDeployStagingMinimized(false)}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-600/40 font-mono text-[10px] flex items-center space-x-1 cursor-pointer transition"
                >
                  <span>Show Unit Cards ▾</span>
                </button>
              </div>
            ) : (
              <div className="w-full bg-[#141724]/95 border-b border-amber-800/80 px-4 py-2 shadow-2xl flex flex-wrap items-center justify-between gap-2 z-10 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-700/80 text-amber-300 font-mono text-[11px] font-bold">
                    <span>🪙 First:</span>
                    <span className="text-white uppercase">{gameState.deploymentCoinFlipWinner === 'player1' ? 'P1 (West)' : 'P2 (East)'}</span>
                  </div>
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Turn:</span>
                    <span className={currentDeployer === 'player1' ? 'text-rose-400' : 'text-sky-400'}>
                      {currentDeployer === 'player1' ? 'Player 1 (West: x ≤ 200px)' : 'Player 2 (East / Bot)'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400 flex items-center space-x-2">
                    <span>Tray:</span>
                    <span className="text-rose-400 font-bold">P1: {p1Remaining}</span>
                    <span>|</span>
                    <span className="text-sky-400 font-bold">P2: {p2Remaining}</span>
                  </div>

                  {isBotDeploying && (
                    <span className="text-xs font-mono text-sky-300 font-bold flex items-center space-x-1 animate-pulse">
                      <span>🤖 Bot placing unit...</span>
                    </span>
                  )}

                  <button
                    onClick={() => setShowArmySelectionModal(true)}
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-750 text-amber-300 border border-amber-600/40 font-mono text-[10px] flex items-center space-x-1 shadow transition cursor-pointer"
                    title="Change battle army from your saved library"
                  >
                    <FolderOpen className="w-3 h-3 text-amber-400" />
                    <span>Army</span>
                  </button>

                  <button
                    onClick={() => setIsDeployStagingMinimized(true)}
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 border border-zinc-700 font-mono text-[10px] flex items-center space-x-0.5 cursor-pointer transition"
                    title="Minimize deployment staging bar"
                  >
                    <span>Hide ▴</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto max-w-[60%] py-0.5">
                  {totalDeployerUnits === 0 ? (
                    <span className="text-xs text-amber-400 font-mono flex items-center space-x-1.5">
                      <span>⚠️ No army loaded — click "Army" to select your force.</span>
                    </span>
                  ) : trayUnits.length === 0 ? (
                    <span className="text-xs text-zinc-500 font-mono italic">
                      No units remaining in {currentDeployer === 'player1' ? 'P1' : 'P2'} tray. Click "Next Turn / Phase" to proceed.
                    </span>
                  ) : (
                    trayUnits.map(u => {
                      const isLeader = u.role === 'Leader' || u.role === 'Legendary Leader' || u.type === 'Character';
                      const isInfantry = u.type === 'Infantry';
                      return (
                        <div
                          key={u.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', u.id);
                            e.dataTransfer.setData('application/json', JSON.stringify({ unitId: u.id, name: u.name }));
                            e.dataTransfer.effectAllowed = 'copyMove';
                            vttDragBridge.startDrag(u.id, u.name);
                          }}
                          onDragEnd={() => {
                            vttDragBridge.endDrag();
                          }}
                          className="flex items-center space-x-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-700 hover:border-amber-400 rounded-lg text-xs text-white shadow shrink-0 cursor-grab active:cursor-grabbing select-none"
                        >
                          {u.tokenImageUrl ? (
                            <img src={u.tokenImageUrl} alt={u.name} draggable={false} className="w-6 h-6 rounded-md object-cover border border-amber-500/50 shrink-0 pointer-events-none select-none" />
                          ) : (
                            <span className="text-base select-none pointer-events-none">{u.avatar}</span>
                          )}
                          <div className="flex flex-col text-[10px] leading-tight mr-1 pointer-events-none select-none">
                            <span className="font-bold text-zinc-200">{u.name.split(' ')[0]}</span>
                            <span className="text-amber-300/80 font-mono">{u.type} • {u.stats.lives}L</span>
                          </div>

                          <button
                            onClick={() => handleDeployReserveUnit(u.id)}
                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-black font-bold font-mono rounded text-[10px] transition cursor-pointer"
                            title="Deploy unit to active player's flank"
                          >
                            Deploy Flank
                          </button>

                          <button
                            onClick={() => handleHoldInStrategicReserve(u.id)}
                            className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-750 text-amber-300 border border-amber-600/40 rounded text-[10px] font-mono transition flex items-center space-x-0.5 cursor-pointer"
                            title="Hold back in Strategic Reserves (Deployable Round 2+ Movement Phase)"
                          >
                            <Box className="w-3 h-3" />
                            <span>Reserve</span>
                          </button>

                          {isLeader && (
                            <button
                              onClick={() => setAttachModalUnitId(u.id)}
                              className="px-1.5 py-0.5 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-600/50 rounded text-[10px] font-mono transition flex items-center space-x-0.5 cursor-pointer"
                              title="Attach Leader to an Infantry squad"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Attach</span>
                            </button>
                          )}

                          {isInfantry && (
                            <button
                              onClick={() => setEmbarkModalUnitId(u.id)}
                              className="px-1.5 py-0.5 bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-600/50 rounded text-[10px] font-mono transition flex items-center space-x-0.5 cursor-pointer"
                              title="Embark inside a friendly transport vehicle"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Embark</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* Continuous Virtual Tabletop Canvas Scene */}
          <div className="flex-1 relative overflow-hidden">
            <TabletopCanvas
              units={gameState.units}
              pois={gameState.pois}
              specialTiles={gameState.specialTiles}
              terrain={gameState.currentMap?.terrain}
              deploymentConfig={gameState.currentMap?.deploymentZones}
              backgroundImageUrl={gameState.currentMap?.backgroundImageUrl}
              paintedZones={gameState.currentMap?.paintedZones}
              structures={gameState.currentMap?.structures}
              coherencyDistanceInches={gameState.currentMap?.coherencyDistanceInches || 2}
              selectedUnitId={selectedUnitId}
              targetUnitId={targetUnitId}
              activePhase={gameState.phase}
              activePlayer={gameState.phase === 'Deployment' ? (gameState.deployingPlayer || gameState.activePlayer) : gameState.activePlayer}
              onSelectUnit={id => {
                setSelectedUnitId(id);
                if (id) setTargetUnitId(null);
              }}
              onSelectTarget={id => setTargetUnitId(id)}
              onMoveUnit={handleCanvasMoveUnit}
              onMoveIndividualModel={handleMoveIndividualModel}
              onMoveGroupTokens={handleMoveGroupTokens}
              onDropUnitFromTray={handleDropUnitFromTray}
              onChangeFormation={handleChangeFormation}
              onCanvasClick={handleCanvasClick}
              activeTool={activeTool}
              zoomLevel={zoomLevel}
              onZoomChange={setZoomLevel}
            />
          </div>

          {/* Bottom-left Party Portrait / Badge */}
          <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-black/85 border border-zinc-700 px-3 py-1.5 rounded-full shadow-2xl z-20 pointer-events-none">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 bg-zinc-900 flex items-center justify-center text-lg">
              🛡️
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-zinc-300 block leading-none">VTT Tabletop</span>
              <span className="text-xs font-bold text-white">Convergence Front</span>
            </div>
          </div>

          {/* Bottom Context Action Bar */}
          {selectedUnit && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#14161f]/95 border border-zinc-700 rounded-xl px-4 py-2.5 shadow-2xl flex items-center space-x-4 z-30">
              <div className="flex items-center space-x-2">
                {selectedUnit.tokenImageUrl ? (
                  <img src={selectedUnit.tokenImageUrl} alt={selectedUnit.name} className="w-7 h-7 rounded-lg object-cover border border-amber-400 shrink-0" />
                ) : (
                  <span className="text-xl">{selectedUnit.avatar}</span>
                )}
                <div>
                  <div className="flex items-center space-x-1.5 mb-0.5 flex-wrap gap-y-1">
                    <span className="text-xs font-bold text-white leading-none">{selectedUnit.name}</span>
                    {/* Permanent traits */}
                    {(selectedUnit.traits || []).map((trait, i) => {
                      const badge = getTraitBadgeInfo(trait);
                      return (
                        <span key={i} className={`border text-[8px] px-1 py-0.2 rounded uppercase font-black flex items-center space-x-0.5 ${badge.badgeClass}`}>
                          <span>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                      );
                    })}
                    {/* Temp traits / Status effects */}
                    {(selectedUnit.tempTraits || []).map((tt, i) => {
                      const badge = getTraitBadgeInfo(tt, true);
                      return (
                        <span key={`tt_${i}`} className={`border text-[8px] px-1 py-0.2 rounded uppercase font-black flex items-center space-x-0.5 ${badge.badgeClass}`}>
                          <span>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {(() => {
                      const bl = getUnitBodiesAndLives(selectedUnit);
                      return `Bodies: ${bl.livingBodies}/${bl.totalBodies} (U) | Lives: ${bl.remainingLives}/${bl.maxLives} (L) | Mv:${selectedUnit.stats.mv} | Def:${selectedUnit.stats.def + selectedUnit.stats.defModifier} | AM:${selectedUnit.stats.am} | Form:${selectedUnit.formation || 'circle'}`;
                    })()}
                  </span>
                </div>
              </div>

              {gameState.phase === 'Deployment' && selectedUnit.owner === (gameState.deployingPlayer || gameState.activePlayer) && (
                selectedUnit.isPendingDeploymentConfirm ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleConfirmDeployment(selectedUnit.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow-lg animate-pulse cursor-pointer"
                      title="Lock in unit placement and pass deployment turn to opponent"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Placement</span>
                    </button>
                    <button
                      onClick={() => handleCancelDeployment(selectedUnit.id)}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-lg flex items-center space-x-1 shadow border border-zinc-600 cursor-pointer"
                      title="Return this unit to the Army Tray"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                      <span>Return to Tray</span>
                    </button>
                    <span className="text-[10px] text-amber-300 font-mono bg-amber-950/60 border border-amber-800/80 px-2 py-1 rounded hidden sm:inline-block">
                      Adjust position or formation, then confirm
                    </span>
                  </div>
                ) : selectedUnit.position ? (
                  <div className="flex items-center space-x-2">
                    <div className="px-2.5 py-1 bg-zinc-800/90 border border-zinc-700 rounded-lg text-xs text-zinc-400 font-mono flex items-center space-x-1">
                      <span>✓</span>
                      <span>Placed & Confirmed</span>
                    </div>
                  </div>
                ) : null
              )}

              {gameState.phase === 'Command' && selectedUnit.owner === gameState.activePlayer && (
                <button
                  onClick={() => setCommandDrawerOpen(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Issue Stratagem</span>
                </button>
              )}

              {gameState.phase === 'Movement' && (
                selectedUnit.owner === gameState.activePlayer ? (
                  selectedUnit.isPendingDisembarkConfirm ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleConfirmDisembark(selectedUnit.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow-lg animate-pulse cursor-pointer"
                        title="Validate 3-inch vehicle reach and 2-inch unit coherency, then lock in disembark placement"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Disembark</span>
                      </button>
                      <button
                        onClick={() => handleCancelDisembark(selectedUnit.id)}
                        className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-lg flex items-center space-x-1 shadow border border-zinc-600 cursor-pointer"
                        title="Cancel disembark and return inside the transport vehicle"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span>Cancel</span>
                      </button>
                      <span className="text-[10px] text-amber-300 font-mono bg-amber-950/60 border border-amber-800/80 px-2 py-1 rounded hidden sm:inline-block">
                        Drag models within 3" of transport, maintain 2" coherency
                      </span>
                      {selectedUnit.tokens?.some(t => t.offendingCoherency) && (
                        <div className="px-2 py-1 bg-rose-950/90 border border-rose-600 rounded text-[10px] text-rose-300 font-mono flex items-center space-x-1 shadow animate-bounce">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>Broken Coherency / Out of Range!</span>
                        </div>
                      )}
                    </div>
                  ) : selectedUnit.isPendingMoveConfirm ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleConfirmMove(selectedUnit.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow-lg animate-pulse cursor-pointer"
                        title="Validate squad coherency and lock in movement"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Move</span>
                      </button>
                      <button
                        onClick={() => handleResetMove(selectedUnit.id)}
                        className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-lg flex items-center space-x-1 shadow border border-zinc-600 cursor-pointer"
                        title="Cancel move and snap back to origin"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span>Reset</span>
                      </button>
                      {selectedUnit.tokens?.some(t => t.offendingCoherency) && (
                        <div className="px-2 py-1 bg-rose-950/90 border border-rose-600 rounded text-[10px] text-rose-300 font-mono flex items-center space-x-1 shadow animate-bounce">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>Broken Coherency! (≤ {gameState.currentMap?.coherencyDistanceInches || 2}")</span>
                        </div>
                      )}
                    </div>
                  ) : selectedUnit.hasMoved ? (
                    <div className="flex items-center space-x-2">
                      <div className="px-3 py-1.5 bg-zinc-800/90 border border-zinc-700 rounded-lg text-xs text-zinc-400 font-mono flex items-center space-x-1">
                        <span>✓</span>
                        <span>Already Moved this Round</span>
                      </div>
                      {/* Structure floor selector if occupying a multi-level structure */}
                      {(() => {
                        const occupying = gameState.currentMap?.structures?.find(s => {
                          if (!selectedUnit.position) return false;
                          return (
                            selectedUnit.position.x >= s.x &&
                            selectedUnit.position.x <= s.x + s.width &&
                            selectedUnit.position.y >= s.y &&
                            selectedUnit.position.y <= s.y + s.height
                          );
                        });
                        if (occupying && occupying.levels && occupying.levels.length > 1) {
                          return (
                            <div className="flex items-center space-x-1 bg-indigo-950/80 border border-indigo-700/60 px-2 py-1 rounded-lg">
                              <span className="text-[10px] text-indigo-300 font-mono">Floor:</span>
                              {occupying.levels.map(lvl => (
                                <button
                                  key={lvl.levelNumber}
                                  onClick={() => handleChangeFloorLevel(selectedUnit.id, lvl.levelNumber)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                                    (selectedUnit.currentLevel || 1) === lvl.levelNumber
                                      ? 'bg-indigo-600 text-white shadow'
                                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  L{lvl.levelNumber}
                                </button>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="px-3 py-1.5 bg-sky-950/70 border border-sky-700/60 rounded-lg text-xs text-sky-300 font-mono flex items-center space-x-1">
                        <span>♟️</span>
                        <span>Drag centroid or individual models (Max {selectedUnit.stats.mv} sq)</span>
                      </div>
                      {/* Structure floor selector if occupying a multi-level structure */}
                      {(() => {
                        const occupying = gameState.currentMap?.structures?.find(s => {
                          if (!selectedUnit.position) return false;
                          return (
                            selectedUnit.position.x >= s.x &&
                            selectedUnit.position.x <= s.x + s.width &&
                            selectedUnit.position.y >= s.y &&
                            selectedUnit.position.y <= s.y + s.height
                          );
                        });
                        if (occupying && occupying.levels && occupying.levels.length > 1) {
                          return (
                            <div className="flex items-center space-x-1 bg-indigo-950/80 border border-indigo-700/60 px-2 py-1 rounded-lg">
                              <span className="text-[10px] text-indigo-300 font-mono">Floor:</span>
                              {occupying.levels.map(lvl => (
                                <button
                                  key={lvl.levelNumber}
                                  onClick={() => handleChangeFloorLevel(selectedUnit.id, lvl.levelNumber)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                                    (selectedUnit.currentLevel || 1) === lvl.levelNumber
                                      ? 'bg-indigo-600 text-white shadow'
                                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  L{lvl.levelNumber}
                                </button>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )
                ) : (
                  <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-500 font-mono">
                    Enemy / Inactive Unit
                  </div>
                )
              )}

              {/* ACTION PHASE: Unified Actions (Engage, Fight, Shoot, Mission) */}
              {gameState.phase === 'Action' && (
                selectedUnit.owner === gameState.activePlayer ? (() => {
                  const remActions = selectedUnit.actionsRemaining ?? 2;
                  const maxActions = selectedUnit.maxActions ?? 2;
                  
                  const attachedLeaders = (selectedUnit.attachedUnits || [])
                    .map(id => gameState.units.find(u => u.id === id))
                    .filter((l): l is Unit => !!l && (l.stats?.lives ?? 0) > 0);
                  const rangedAttachedLeaders = attachedLeaders.filter(l => l.stats.range > 0);

                  const squadCanShoot = selectedUnit.stats.range > 0;
                  const canAnyShoot = squadCanShoot || rangedAttachedLeaders.length > 0;

                  // Melee reach check
                  const inMeleeWithTarget = !!(targetUnit && isUnitInMeleeRange(selectedUnit, targetUnit, DEFAULT_GRID_SIZE));

                  // Engagement reach check (distance > 0.3 and <= mv + 0.3)
                  let canEngageTarget = false;
                  if (targetUnit && selectedUnit.position && targetUnit.position) {
                    const { minModelDistPx } = getUnitsModelDistance(selectedUnit, targetUnit);
                    const dist = minModelDistPx / DEFAULT_GRID_SIZE;
                    canEngageTarget = dist > 0.3 && dist <= (selectedUnit.stats.mv + 0.3);
                  }

                  // Shooting reach check
                  let canShootTarget = false;
                  if (targetUnit && canAnyShoot) {
                    const maxR = Math.max(selectedUnit.stats.range, ...rangedAttachedLeaders.map(l => l.stats.range));
                    const measuringUnit: Unit = {
                      ...selectedUnit,
                      stats: { ...selectedUnit.stats, range: maxR }
                    };
                    canShootTarget = isUnitInShootingRange(measuringUnit, targetUnit, DEFAULT_GRID_SIZE);
                  }

                  return (
                    <div className="flex items-center space-x-2">
                      {/* Action Economy Counter Pill */}
                      <div className={`px-2.5 py-1 rounded-lg border font-mono text-xs flex items-center space-x-1.5 ${
                        remActions > 0 
                          ? 'bg-amber-950/50 border-amber-500/70 text-amber-300' 
                          : 'bg-zinc-850 border-zinc-700 text-zinc-500'
                      }`}>
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold">{remActions}/{maxActions} Actions</span>
                      </div>

                      {remActions === 0 ? (
                        <div className="px-3 py-1.5 bg-zinc-850 border border-zinc-750 rounded-lg text-xs text-zinc-500 font-mono">
                          ✓ All Actions Exhausted
                        </div>
                      ) : (
                        <>
                          {/* 1. ENGAGE */}
                          {canEngageTarget ? (
                            <button
                              onClick={handleExecuteEngagement}
                              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow active:scale-95 transition cursor-pointer"
                              title="Engage enemy into base contact (Costs 1 Action)"
                            >
                              <Flame className="w-3.5 h-3.5" />
                              <span>Engage (1d6)</span>
                            </button>
                          ) : (
                            <button
                              disabled
                              className="bg-zinc-800/60 border border-zinc-750 text-zinc-500 text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-1 cursor-not-allowed opacity-50"
                              title={`Target enemy within ${selectedUnit.stats.mv} sq to engage`}
                            >
                              <Flame className="w-3 h-3" />
                              <span>Engage</span>
                            </button>
                          )}

                          {/* 2. FIGHT */}
                          {inMeleeWithTarget ? (
                            <button
                              onClick={handleExecuteFight}
                              className="bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow active:scale-95 transition cursor-pointer"
                              title="Fight enemy in melee (Costs 1 Action)"
                            >
                              <Swords className="w-3.5 h-3.5" />
                              <span>Fight</span>
                            </button>
                          ) : (
                            <button
                              disabled
                              className="bg-zinc-800/60 border border-zinc-750 text-zinc-500 text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-1 cursor-not-allowed opacity-50"
                              title="Must be within 1.0 sq melee contact with target"
                            >
                              <Swords className="w-3 h-3" />
                              <span>Fight</span>
                            </button>
                          )}

                          {/* 3. SHOOT */}
                          {canAnyShoot ? (
                            canShootTarget ? (
                              squadCanShoot ? (
                                <button
                                  onClick={() => handleExecuteShooting(selectedUnit)}
                                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow active:scale-95 transition cursor-pointer"
                                  title={`Fire ranged weapons (${selectedUnit.stats.range} sq) (Costs 1 Action)`}
                                >
                                  <Target className="w-3.5 h-3.5" />
                                  <span>Shoot ({selectedUnit.stats.range} sq)</span>
                                </button>
                              ) : (
                                rangedAttachedLeaders.map(l => (
                                  <button
                                    key={l.id}
                                    onClick={() => handleExecuteShooting(l)}
                                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow active:scale-95 transition cursor-pointer"
                                    title={`Fire leader ranged weapons (${l.stats.range} sq) (Costs 1 Action)`}
                                  >
                                    <Target className="w-3.5 h-3.5" />
                                    <span>Shoot: {l.name}</span>
                                  </button>
                                ))
                              )
                            ) : (
                              <button
                                disabled
                                className="bg-zinc-800/60 border border-zinc-750 text-zinc-500 text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-1 cursor-not-allowed opacity-50"
                                title={`Target enemy within ${selectedUnit.stats.range} sq to shoot`}
                              >
                                <Target className="w-3 h-3" />
                                <span>Shoot ({selectedUnit.stats.range} sq)</span>
                              </button>
                            )
                          ) : (
                            <span className="text-[11px] text-zinc-500 font-mono px-2 py-1 bg-zinc-850 rounded border border-zinc-800">Melee Only</span>
                          )}

                          {/* 4. MISSION ACTION */}
                          <button
                            onClick={handleExecuteMissionAction}
                            className="bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow active:scale-95 transition cursor-pointer"
                            title="Perform secondary mission action (Costs 1 Action)"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Mission Action</span>
                          </button>
                        </>
                      )}
                    </div>
                  );
                })() : (
                  <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-500 font-mono">
                    Enemy / Inactive Unit
                  </div>
                )
              )}

              {gameState.phase === 'Shooting' && (
                selectedUnit.owner === gameState.activePlayer ? (() => {
                  const isAttachedLeader = !!selectedUnit.attachedTo;
                  
                  const attachedLeaders = (selectedUnit.attachedUnits || [])
                    .map(id => gameState.units.find(u => u.id === id))
                    .filter((l): l is Unit => !!l && (l.stats?.lives ?? 0) > 0);
                  const rangedAttachedLeaders = attachedLeaders.filter(l => l.stats.range > 0);

                  const squadCanShoot = selectedUnit.stats.range > 0;
                  const squadHasFired = selectedUnit.hasShot;

                  // Case 1: Selected unit is an attached leader directly
                  if (isAttachedLeader) {
                    if (selectedUnit.stats.range === 0) {
                      return (
                        <div className="px-3 py-1.5 bg-zinc-850 border border-zinc-750 rounded-lg text-xs text-zinc-500 font-mono">
                          Leader Melee Only (Range 0)
                        </div>
                      );
                    }
                    if (selectedUnit.hasShot) {
                      return (
                        <button disabled className="bg-zinc-800/90 border border-zinc-700 text-zinc-500 font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1 cursor-not-allowed">
                          <span>✓ Leader Already Fired</span>
                        </button>
                      );
                    }
                    if (targetUnit) {
                      return (
                        <button
                          onClick={() => handleExecuteShooting(selectedUnit)}
                          className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow cursor-pointer transition active:scale-95"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>Fire Leader ({selectedUnit.stats.range} sq)</span>
                        </button>
                      );
                    }
                    return (
                      <div className="px-3 py-1.5 bg-rose-950/40 border border-rose-800/50 rounded-lg text-xs text-rose-300 font-mono">
                        Click enemy target in range ({selectedUnit.stats.range} sq)
                      </div>
                    );
                  }

                  // Case 2: Selected unit is a melee squad, but has an attached leader who CAN shoot
                  if (!squadCanShoot && rangedAttachedLeaders.length > 0) {
                    const readyLeader = rangedAttachedLeaders.find(l => !l.hasShot);
                    if (!readyLeader) {
                      return (
                        <button disabled className="bg-zinc-800/90 border border-zinc-750 text-zinc-500 font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1 cursor-not-allowed font-mono">
                          <span>✓ Attached Leader Already Fired</span>
                        </button>
                      );
                    }
                    if (targetUnit) {
                      return (
                        <button
                          onClick={() => handleExecuteShooting(readyLeader)}
                          className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow cursor-pointer transition active:scale-95"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>Fire Leader: {readyLeader.name} ({readyLeader.stats.range} sq)</span>
                        </button>
                      );
                    }
                    return (
                      <div className="px-3 py-1.5 bg-rose-950/40 border border-rose-800/50 rounded-lg text-xs text-rose-300 font-mono">
                        Squad Melee • Click enemy for Leader {readyLeader.name} ({readyLeader.stats.range} sq)
                      </div>
                    );
                  }

                  // Case 3: Both squad and attached leader(s) can shoot
                  if (squadCanShoot && rangedAttachedLeaders.length > 0) {
                    const readyLeaders = rangedAttachedLeaders.filter(l => !l.hasShot);
                    return (
                      <div className="flex items-center space-x-2">
                        {!squadHasFired ? (
                          targetUnit ? (
                            <button
                              onClick={() => handleExecuteShooting(selectedUnit)}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow cursor-pointer transition active:scale-95"
                            >
                              <Target className="w-3.5 h-3.5" />
                              <span>Fire Squad ({selectedUnit.stats.range} sq)</span>
                            </button>
                          ) : (
                            <div className="px-2.5 py-1 bg-rose-950/40 border border-rose-800/50 rounded-lg text-xs text-rose-300 font-mono">
                              Squad Range: {selectedUnit.stats.range} sq
                            </div>
                          )
                        ) : (
                          <span className="text-zinc-500 text-xs font-mono">✓ Squad Fired</span>
                        )}

                        {readyLeaders.map(leader => (
                          targetUnit ? (
                            <button
                              key={leader.id}
                              onClick={() => handleExecuteShooting(leader)}
                              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow cursor-pointer transition active:scale-95"
                            >
                              <Target className="w-3.5 h-3.5" />
                              <span>Fire {leader.name} ({leader.stats.range} sq)</span>
                            </button>
                          ) : (
                            <span key={leader.id} className="text-amber-400/80 text-[11px] font-mono">
                              {leader.name} ({leader.stats.range} sq)
                            </span>
                          )
                        ))}
                      </div>
                    );
                  }

                  // Case 4: Standard squad without ranged leaders
                  if (!squadCanShoot) {
                    return (
                      <div className="px-3 py-1.5 bg-zinc-850 border border-zinc-750 rounded-lg text-xs text-zinc-500 font-mono">
                        Melee Only (Range 0)
                      </div>
                    );
                  }

                  if (squadHasFired) {
                    return (
                      <button disabled className="bg-zinc-800/90 border border-zinc-700 text-zinc-500 font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1 cursor-not-allowed">
                        <span>✓ Already Fired</span>
                      </button>
                    );
                  }

                  if (targetUnit) {
                    return (
                      <button
                        onClick={() => handleExecuteShooting(selectedUnit)}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow cursor-pointer transition active:scale-95"
                      >
                        <Target className="w-3.5 h-3.5" />
                        <span>Fire Ranged ({selectedUnit.stats.range} sq)</span>
                      </button>
                    );
                  }

                  return (
                    <div className="px-3 py-1.5 bg-rose-950/40 border border-rose-800/50 rounded-lg text-xs text-rose-300 font-mono">
                      Click enemy target in range ({selectedUnit.stats.range} sq)
                    </div>
                  );
                })() : (
                  <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-500 font-mono">
                    Enemy / Inactive Unit
                  </div>
                )
              )}

              {gameState.phase === 'Charge' && (
                selectedUnit.owner === gameState.activePlayer ? (
                  selectedUnit.hasCharged ? (
                    <button disabled className="bg-zinc-800/90 border border-zinc-700 text-zinc-500 font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1 cursor-not-allowed">
                      <span>✓ Already Charged</span>
                    </button>
                  ) : targetUnit ? (
                    <button
                      onClick={handleExecuteCharge}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Roll Charge (1d6)</span>
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 bg-amber-950/40 border border-amber-800/50 rounded-lg text-xs text-amber-300 font-mono">
                      Click target within {selectedUnit.stats.mv} sq
                    </div>
                  )
                ) : (
                  <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-500 font-mono">
                    Enemy / Inactive Unit
                  </div>
                )
              )}

              {gameState.phase === 'Fight' && (
                selectedUnit.owner === gameState.activePlayer ? (
                  selectedUnit.hasFought ? (
                    <button disabled className="bg-zinc-800/90 border border-zinc-700 text-zinc-500 font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1 cursor-not-allowed">
                      <span>✓ Already Fought</span>
                    </button>
                  ) : targetUnit ? (
                    <button
                      onClick={handleExecuteFight}
                      className="bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>Fight (AM + 1d3)</span>
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 bg-rose-950/40 border border-rose-800/50 rounded-lg text-xs text-rose-300 font-mono">
                      Click enemy in melee (≤ 1.0 sq or charged)
                    </div>
                  )
                ) : (
                  <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-500 font-mono">
                    Enemy / Inactive Unit
                  </div>
                )
              )}

              {/* Leader & Transport Squad Actions */}
              {selectedUnit.owner === gameState.activePlayer && (
                <div className="flex items-center space-x-1.5 pl-2 border-l border-zinc-700">
                  {/* Detach Leader from Squad (Strictly Deployment Phase only - BUG-020) */}
                  {gameState.phase === 'Deployment' && selectedUnit.attachedUnits && selectedUnit.attachedUnits.length > 0 && (
                    selectedUnit.attachedUnits.map(leaderId => {
                      const leaderUnit = gameState.units.find(u => u.id === leaderId);
                      return (
                        <button
                          key={leaderId}
                          onClick={() => handleDetachLeader(selectedUnit.id, leaderId)}
                          className="bg-purple-900/70 hover:bg-purple-800 border border-purple-600 text-purple-200 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-1 shadow"
                          title="Detach leader from squad (Deployment Phase only)"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Detach {leaderUnit?.name ? leaderUnit.name.split(' ')[0] : 'Leader'}</span>
                        </button>
                      );
                    })
                  )}

                  {/* Attach Leader (if this unit is a leader and not attached) */}
                  {(selectedUnit.role === 'Leader' || selectedUnit.role === 'Legendary Leader' || selectedUnit.type === 'Character') && !selectedUnit.attachedTo && (() => {
                    const canAttach = gameState.phase === 'Deployment';
                    return (
                      <button
                        onClick={() => {
                          if (canAttach) setAttachModalUnitId(selectedUnit.id);
                        }}
                        disabled={!canAttach}
                        className={`font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-1 shadow border transition ${
                          canAttach
                            ? 'bg-purple-900/60 hover:bg-purple-800 border-purple-500 text-purple-200 cursor-pointer'
                            : 'bg-zinc-800/80 border-zinc-700 text-zinc-500 cursor-not-allowed opacity-60'
                        }`}
                        title={canAttach ? 'Attach this leader to an infantry squad' : 'Attach Leader only permitted during Deployment Phase'}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Attach to Squad</span>
                      </button>
                    );
                  })()}

                  {/* Embark Infantry in Transport */}
                  {selectedUnit.type === 'Infantry' && !selectedUnit.embarkedIn && (() => {
                    const isFightReembark = (gameState.phase === 'Fight' || gameState.phase === 'Action') && selectedUnit.lastDisembarkRound === gameState.round && selectedUnit.lastDisembarkPhase !== gameState.phase;
                    const hasEmbarkedThisPhase = selectedUnit.lastEmbarkPhase === gameState.phase && selectedUnit.lastEmbarkRound === gameState.round;
                    const hasDisembarkedThisPhase = selectedUnit.lastDisembarkPhase === gameState.phase && selectedUnit.lastDisembarkRound === gameState.round;
                    const canEmbark = (gameState.phase === 'Deployment' || gameState.phase === 'Movement' || isFightReembark) && !hasEmbarkedThisPhase && !hasDisembarkedThisPhase;
                    return (
                      <button
                        onClick={() => {
                          if (canEmbark) setEmbarkModalUnitId(selectedUnit.id);
                        }}
                        disabled={!canEmbark}
                        className={`font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-1 shadow border transition ${
                          canEmbark
                            ? 'bg-sky-900/60 hover:bg-sky-800 border-sky-500 text-sky-200 cursor-pointer'
                            : 'bg-zinc-800/80 border-zinc-700 text-zinc-500 cursor-not-allowed opacity-60'
                        }`}
                        title={
                          hasEmbarkedThisPhase ? 'Cannot embark multiple times in the same phase' :
                          hasDisembarkedThisPhase ? 'Cannot embark and disembark in the same phase' :
                          canEmbark ? 'Embark inside a friendly transport vehicle' : 'Embark only permitted during Deployment, Movement, or Fight re-embark'
                        }
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Embark</span>
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* UI-003: Ability Cards Dock at bottom of Battlefield */}
          <div className="absolute bottom-3 right-3 z-30 flex flex-col items-end pointer-events-auto">
            {!abilitiesDockOpen ? (
              /* Collapsed Pill Button */
              <button
                type="button"
                onClick={() => setAbilitiesDockOpen(true)}
                className={`px-3.5 py-2 rounded-xl shadow-2xl flex items-center space-x-2.5 transition cursor-pointer backdrop-blur-md border ${
                  readyAbilitiesCount > 0
                    ? 'bg-[#151928] border-amber-400 text-amber-300 ring-2 ring-amber-500/50 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                    : 'bg-[#11131c]/90 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
                }`}
                title="Open Tactical & Faction Abilities Dock"
              >
                <div className="flex items-center space-x-1.5">
                  <Zap className={`w-4 h-4 ${readyAbilitiesCount > 0 ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-zinc-400'}`} />
                  <span className="text-xs font-bold font-mono">Abilities</span>
                </div>

                {readyAbilitiesCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-[10px] font-mono flex items-center space-x-1 animate-pulse shadow">
                    <span>✨</span>
                    <span>{readyAbilitiesCount} Ready</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    ({availableAbilities.length})
                  </span>
                )}

                <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            ) : (
              /* Expanded Playing Cards Hand Tray */
              <div className="w-auto max-w-[calc(100vw-2rem)] md:max-w-4xl max-h-[440px] bg-[#0c0f18]/95 border-2 border-amber-500/50 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-3 duration-200">
                {/* Dock Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#141824] border-b border-zinc-800">
                  <div className="flex items-center space-x-2.5">
                    <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 text-base shadow">
                      🃏
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-white font-mono tracking-wide">Playing Cards Hand</h4>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-750 font-mono uppercase font-bold">
                          {gameState.phase} Phase
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Available CP: <strong className="text-amber-400">{currentCP}</strong> • {availableAbilities.length} cards in hand
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {readyAbilitiesCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-[10px] font-mono shadow animate-pulse">
                        ✨ {readyAbilitiesCount} Playable
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setAbilitiesDockOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                      title="Minimize Cards"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Hand of Playing Cards (Horizontal Fan / Scroll) */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-3.5 flex items-stretch gap-3.5">
                  {availableAbilities.length === 0 ? (
                    <div className="w-full p-8 text-center border-2 border-dashed border-zinc-800/80 rounded-2xl space-y-2">
                      <Zap className="w-8 h-8 text-zinc-600 mx-auto" />
                      <span className="text-xs text-zinc-300 block font-bold font-mono">No Tactical Cards In Hand</span>
                      <p className="text-[10px] text-zinc-500 max-w-sm mx-auto">
                        Deploy units with equipped abilities or activate faction doctrines to draw cards into your hand.
                      </p>
                    </div>
                  ) : (
                    availableAbilities.map(item => {
                      const { key, ability, sourceName, sourceAvatar, isFaction, isActivatable, disabledReason } = item;
                      const isPassive = ability.type === 'passive';
                      const gainsCP = ability.cost === 'gain_1_cp' || !!ability.gainsCP;

                      // Theme, rarity, and customization resolution
                      const theme: CardTheme = ability.cardTheme || (isFaction ? 'amethyst' : isPassive ? 'sapphire' : 'gold');
                      const rarity: CardRarity = ability.cardRarity || (isFaction ? 'Epic' : 'Common');
                      const themeStyle = CARD_THEME_STYLES[theme] || CARD_THEME_STYLES.gold;
                      const rarityStyle = CARD_RARITY_BADGES[rarity] || CARD_RARITY_BADGES.Common;
                      const actionLabel = ability.actionButtonText || 'PLAY CARD';

                      return (
                        <div
                          key={key}
                          className={`w-[195px] min-w-[195px] h-[345px] rounded-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-200 select-none shadow-xl border-2 ${
                            themeStyle.bg
                          } ${themeStyle.border} ${
                            isActivatable
                              ? `${themeStyle.glow} hover:-translate-y-2 hover:scale-[1.03] cursor-pointer ring-2 ring-white/20`
                              : isPassive
                              ? 'opacity-90'
                              : 'opacity-75 grayscale-[0.25]'
                          }`}
                        >
                          {/* Card Top Filigree Header */}
                          <div className="px-2.5 pt-2 pb-1 flex items-center justify-between gap-1 border-b border-white/10">
                            <div className="flex items-center space-x-1 min-w-0">
                              <h5 className={`font-serif font-black text-[11px] truncate tracking-wide ${themeStyle.headerText}`} title={ability.name}>
                                {ability.name}
                              </h5>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0">
                              {/* Rarity Indicator Mini Tag */}
                              <span className={`px-1.5 py-0.2 rounded text-[7px] font-mono uppercase font-bold border ${rarityStyle.badge}`}>
                                {rarity}
                              </span>
                              {gainsCP ? (
                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 text-[8px] font-mono font-black animate-pulse shadow">
                                  +1 CP ⭐
                                </span>
                              ) : isPassive ? (
                                <span className="px-1.5 py-0.5 rounded-full bg-sky-950 border border-sky-400 text-sky-200 text-[8px] font-mono font-bold">
                                  PASSIVE
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-950 border border-amber-500/80 text-amber-200 text-[8px] font-mono font-bold">
                                  FREE
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Art Portrait Window */}
                          <div className="mx-2 my-1 h-24 rounded-xl bg-gradient-to-br from-black/95 via-zinc-900/80 to-black/95 border border-zinc-700/60 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group">
                            <div className={`absolute inset-0 bg-radial ${themeStyle.innerShadow} via-transparent to-transparent opacity-60 pointer-events-none`} />
                            {ability.cardArtworkUrl ? (
                              <img
                                src={ability.cardArtworkUrl}
                                alt={ability.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                              />
                            ) : (
                              <span className="text-4xl filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] transition-transform group-hover:scale-110">
                                {ability.icon || sourceAvatar || '⚡'}
                              </span>
                            )}
                            <span className="absolute bottom-1 px-1.5 py-0.5 rounded bg-black/85 text-[8px] font-mono text-zinc-300 truncate max-w-[92%] border border-white/10 shadow backdrop-blur-xs">
                              {sourceName}
                            </span>
                          </div>

                          {/* Card Type & Phase Ribbon */}
                          <div className={`mx-2 px-1.5 py-0.5 rounded flex items-center justify-between text-[8px] font-mono border ${themeStyle.ribbonBg}`}>
                            <div className="flex items-center space-x-1">
                              <span className={`font-bold ${themeStyle.accentText}`}>
                                {isFaction ? '🔮 FACTION' : isPassive ? '🛡️ PASSIVE' : '⚡ TACTIC'}
                              </span>
                              {!isPassive && (
                                <span className="px-1 rounded bg-black/50 text-amber-300 font-bold text-[7px]">
                                  {item.usageLimit === 'once_per_game' ? '1x/GAME' : item.usageLimit === 'once_per_activation' ? '1x/ACT' : '1x/RND'}
                                </span>
                              )}
                            </div>
                            <span className="text-zinc-300 uppercase font-semibold">
                              {ability.activationTiming ? ability.activationTiming.replace('_', ' ') : 'ANY TIME'}
                            </span>
                          </div>

                          {/* Card Rules Text Box (Parchment/Obsidian Box) */}
                          <div className="mx-2 my-1 p-2 rounded-xl bg-black/75 border border-zinc-800/80 flex-1 flex flex-col justify-center text-center shadow-inner">
                            <p className="text-[10px] text-zinc-200 font-sans leading-tight line-clamp-3">
                              {ability.effect}
                            </p>
                            {gainsCP && (
                              <span className="text-[9px] text-emerald-400 font-bold font-mono block mt-1">
                                ⭐ Grants +1 Free CP
                              </span>
                            )}
                            {ability.triggerCondition && (
                              <span className="text-[8px] text-amber-300/80 font-mono block mt-0.5 italic truncate">
                                ⏱️ {ability.triggerCondition}
                              </span>
                            )}
                            {ability.quote && (
                              <span className="text-[8px] text-zinc-400 font-serif italic block mt-1 line-clamp-1 border-t border-white/10 pt-0.5">
                                "{ability.quote}"
                              </span>
                            )}
                          </div>

                          {/* Card Footer / Action Seal */}
                          <div className="w-full">
                            {isPassive ? (
                              <div className="w-full py-2 bg-sky-950/90 border-t border-sky-500/40 text-sky-300 font-bold text-[10px] font-mono uppercase tracking-wider text-center flex items-center justify-center space-x-1">
                                <span>🛡️</span>
                                <span>ALWAYS ACTIVE</span>
                              </div>
                            ) : isActivatable ? (
                              <button
                                type="button"
                                onClick={() => handleActivateAbility(item)}
                                className={`w-full py-2.5 ${themeStyle.buttonBg} hover:brightness-115 font-black text-[11px] font-mono uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-lg cursor-pointer transition active:scale-95 border-t border-white/20`}
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>{actionLabel}</span>
                              </button>
                            ) : (
                              <div className="w-full py-2 bg-zinc-950/90 border-t border-zinc-800 text-zinc-500 text-[9px] font-mono text-center truncate px-2">
                                🔒 {disabledReason || 'Phase Locked'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (Roll20 Style: Chat, Journal, Ledger) */}
        {showRightSidebar && (
          <div className="w-72 bg-[#12141c] border-l border-zinc-800 flex flex-col shrink-0 text-xs animate-in slide-in-from-right duration-200">
          {/* Tabs header */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-[#161922] px-2 py-1.5">
            <button
              onClick={() => setRightTab('chat')}
              className={`p-1.5 rounded transition ${rightTab === 'chat' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
              title="Chat & Dice Rolls"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRightTab('journal')}
              className={`p-1.5 rounded transition ${rightTab === 'journal' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
              title="Unit Journal & Dossiers"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRightTab('cards')}
              className={`p-1.5 rounded transition ${rightTab === 'cards' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
              title="Command Cards"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRightTab('settings')}
              className={`p-1.5 rounded transition ${rightTab === 'settings' ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'}`}
              title="Map Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Tab 1: Chat & Combat Ledger */}
          {rightTab === 'chat' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              {/* Chat messages / dice feed */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[11px]">
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-zinc-400 text-[10px]">
                  <strong className="text-amber-400 block mb-1">⚔️ Chat &amp; Dice Tips:</strong>
                  Type <code className="text-white">/roll 1d20</code> or <code className="text-white">/roll 2d6</code> to roll dice in the log.
                </div>

                {gameState.logs.map(log => (
                  <div
                    key={log.id}
                    className={`p-2 rounded-lg border ${
                      log.type === 'combat'
                        ? 'bg-rose-950/40 border-rose-900/50 text-rose-200'
                        : log.type === 'event'
                        ? 'bg-amber-950/40 border-amber-900/50 text-amber-200'
                        : log.type === 'score'
                        ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-200'
                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[9px] text-zinc-500 mb-0.5">
                      <span>{log.source}</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendChat} className="p-2 border-t border-zinc-800 bg-[#161922] flex items-center space-x-1.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type message or /roll 1d6..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-white focus:border-rose-500 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  className="p-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Journal & Inspect */}
          {rightTab === 'journal' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <span className="text-xs uppercase font-mono tracking-wider text-zinc-400 block font-bold">Active Force Dossiers</span>
              {gameState.units.filter(u => u.stats.lives > 0).map(u => (
                <div
                  key={u.id}
                  onClick={() => setSelectedUnitId(u.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition ${
                    selectedUnitId === u.id ? 'bg-zinc-900 border-amber-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{u.avatar}</span>
                    <div>
                      <span className="font-bold text-white block text-xs">{u.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {u.owner === 'player1' ? 'West Force' : 'East Force'} • {u.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2 text-[10px] font-mono text-zinc-300 mt-1.5">
                    <span>Mv:{u.stats.mv}</span>
                    <span>Def:{u.stats.def + u.stats.defModifier}</span>
                    <span>AM:{u.stats.am}</span>
                    <span>L:{u.stats.lives}</span>
                    <span>CP:{u.stats.cp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Tactical & Faction Playing Cards Hand + Mission Objectives */}
          {rightTab === 'cards' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Section 1: Playing Cards in Hand */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-amber-400">🃏</span>
                    <span className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">
                      Cards in Hand ({availableAbilities.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setAbilitiesDockOpen(prev => !prev)}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-mono underline cursor-pointer"
                  >
                    {abilitiesDockOpen ? 'Hide Dock' : 'Expand Dock'}
                  </button>
                </div>

                {availableAbilities.length === 0 ? (
                  <div className="p-4 bg-zinc-950/80 border border-dashed border-zinc-800 rounded-xl text-center space-y-1">
                    <Zap className="w-5 h-5 text-zinc-600 mx-auto" />
                    <span className="text-[11px] text-zinc-400 block font-mono font-bold">No Cards In Hand</span>
                    <p className="text-[9px] text-zinc-500">
                      Deploy squads from the tray to draw their tactical ability cards into your Hand!
                    </p>
                  </div>
                ) : (
                  availableAbilities.map(item => {
                    const { key, ability, sourceName, sourceAvatar, isFaction, isActivatable, disabledReason } = item;
                    const gainsCP = ability.cost === 'gain_1_cp' || !!ability.gainsCP;
                    const isPassive = ability.type === 'passive';

                    return (
                      <div
                        key={key}
                        className={`p-2.5 rounded-xl border transition space-y-1.5 ${
                          isActivatable
                            ? 'bg-zinc-950 border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                            : 'bg-zinc-950/60 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <div className="flex items-center space-x-1 min-w-0">
                            <span>{ability.icon || sourceAvatar || '⚡'}</span>
                            <span className="font-bold text-white text-xs truncate">{ability.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {!isPassive && (
                              <span className="px-1.5 py-0.2 rounded text-[7px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
                                {item.usageLimit === 'once_per_game' ? '1x/GAME' : item.usageLimit === 'once_per_activation' ? '1x/ACT' : '1x/RND'}
                              </span>
                            )}
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono uppercase font-bold ${
                              isFaction ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-zinc-850 text-zinc-400'
                            }`}>
                              {isFaction ? 'Faction' : 'Unit'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
                          <span className="text-amber-300/90">{sourceName}</span>
                          <span className="uppercase text-zinc-400">{ability.activationTiming?.replace('_', ' ') || 'Any Time'}</span>
                        </div>

                        <p className="text-[10px] text-zinc-300 leading-tight">{ability.effect}</p>

                        <div className="pt-1 flex items-center justify-between gap-2 border-t border-zinc-850">
                          <span className="text-[9px] font-mono">
                            {gainsCP ? (
                              <span className="text-emerald-400 font-bold">+1 Free CP ⭐</span>
                            ) : isPassive ? (
                              <span className="text-sky-400 font-bold">Passive</span>
                            ) : (
                              <span className="text-amber-300 font-bold">0 CP</span>
                            )}
                          </span>

                          {isPassive ? (
                            <span className="text-[9px] font-mono text-sky-400 font-bold">Always Active</span>
                          ) : isActivatable ? (
                            <button
                              onClick={() => handleActivateAbility(item)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-[10px] rounded-lg shadow cursor-pointer transition active:scale-95"
                            >
                              Play Card
                            </button>
                          ) : (
                            <span className="text-[9px] font-mono text-zinc-500">
                              🔒 {disabledReason || 'Phase Locked'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Section 2: Secondary Mission Cards */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <span className="text-xs uppercase font-mono tracking-wider text-zinc-400 block font-bold">
                  Mission Objectives (4)
                </span>
                {gameState.player1ActiveCards.map((card, idx) => (
                  <div key={card.id} className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-amber-400 font-bold">Slot {idx + 1}</span>
                      <span className="text-zinc-500">{card.type}</span>
                    </div>
                    <span className="font-bold text-white text-xs block">{card.name}</span>
                    <p className="text-[11px] text-zinc-400">{card.objectiveText || card.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Settings */}
          {rightTab === 'settings' && (
            <div className="flex-1 p-3 space-y-3 font-mono text-xs">
              <span className="text-xs uppercase tracking-wider text-zinc-400 block font-bold">Map Configurations</span>
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-2">
                <span className="text-zinc-300 block">Grid: 16x12 Tactical Squares</span>
                <span className="text-zinc-300 block">POI Scoring: CP Difference</span>
                <span className="text-zinc-300 block">Hard Cap: Round 25</span>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Drawer 0: Army Tray (Deployment Picker) Slide-out */}
      {armyTrayDrawerOpen && gameState.phase === 'Deployment' && (() => {
        const currentDeployer = gameState.deployingPlayer || gameState.activePlayer;
        const isP1 = currentDeployer === 'player1';
        const totalDeployerUnits = gameState.units.filter(u => u.owner === currentDeployer).length;
        const p1Remaining = gameState.units.filter(u => u.owner === 'player1' && !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo && u.stats.lives > 0).length;
        const p2Remaining = gameState.units.filter(u => u.owner === 'player2' && !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo && u.stats.lives > 0).length;
        const trayUnits = gameState.units.filter(u => !u.position && !u.inStrategicReserve && !u.embarkedIn && !u.attachedTo && u.stats.lives > 0 && u.owner === currentDeployer);

        return (
          <div className="fixed top-10 right-0 bottom-0 w-84 md:w-96 bg-[#11131c]/95 backdrop-blur-md border-l border-zinc-700 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#161924]">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Army Tray (Deploy Units)</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 font-mono text-[10px] border border-amber-700">
                  {trayUnits.length} undeployed
                </span>
              </div>
              <button
                onClick={() => setArmyTrayDrawerOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Deployer & Rules Callout Banner */}
              <div className={`p-3 rounded-xl border space-y-1.5 ${
                isP1 ? 'bg-rose-950/20 border-rose-800/40 text-rose-300' : 'bg-sky-950/20 border-sky-800/40 text-sky-300'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold font-mono">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>TURN: {isP1 ? 'PLAYER 1 (WEST)' : 'PLAYER 2 (EAST)'}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    Zone: {isP1 ? 'x ≤ 200px' : 'x ≥ 1000px'}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[10px] font-mono text-zinc-400 pt-0.5 border-t border-zinc-800/60">
                  <span>Tray:</span>
                  <span className="text-rose-400 font-bold">P1: {p1Remaining} left</span>
                  <span>|</span>
                  <span className="text-sky-400 font-bold">P2: {p2Remaining} left</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed pt-1">
                  ✋ <strong className="text-white">Drag card onto canvas</strong> to deploy your squad. Drop outside deployment zone snaps back. Drag Leader onto Infantry to attach, or Infantry onto Vehicle to embark.
                </p>
              </div>

              {/* Units List */}
              {totalDeployerUnits === 0 ? (
                <div className="p-8 text-center border border-dashed border-amber-800/60 rounded-xl space-y-3 bg-amber-950/20">
                  <Users className="w-8 h-8 text-amber-500 mx-auto animate-bounce" />
                  <div>
                    <span className="text-xs text-amber-300 font-bold block">No army loaded for {isP1 ? 'Player 1' : 'Player 2'}</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Please choose an army roster to populate your deployment tray.</span>
                  </div>
                  <button
                    onClick={() => setShowArmySelectionModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono shadow inline-flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Choose Army Roster</span>
                  </button>
                </div>
              ) : trayUnits.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl space-y-2">
                  <Users className="w-8 h-8 text-zinc-600 mx-auto" />
                  <span className="text-xs text-zinc-400 font-medium block">All units deployed or held in Strategic Reserves!</span>
                  <p className="text-[10px] text-zinc-600">
                    Click "Next Turn / Phase" in the top bar to alternate turns or begin Round 1 Command Phase.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trayUnits.map(u => {
                    const isLeader = u.role === 'Leader' || u.role === 'Legendary Leader' || u.type === 'Character';
                    const isInfantry = u.type === 'Infantry';
                    const canBypass = canUnitDeployOutsideZone(u, gameState.units);
                    const baseDims = getUnitBaseDimensions(u);
                    const attachedLeader = u.attachedUnits && u.attachedUnits.length > 0 
                      ? gameState.units.find(x => u.attachedUnits!.includes(x.id)) 
                      : null;
                    const embarkedTroops = gameState.units.filter(x => x.embarkedIn === u.id);

                    return (
                      <div
                        key={u.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', u.id);
                          e.dataTransfer.setData('application/json', JSON.stringify({ type: 'tray-unit', unitId: u.id, name: u.name }));
                          e.dataTransfer.effectAllowed = 'copyMove';
                          vttDragBridge.startDrag(u.id, u.name);
                          setDraggedUnitId(u.id);
                        }}
                        onDragEnd={() => {
                          vttDragBridge.endDrag();
                          setDraggedUnitId(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'copy';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            const raw = e.dataTransfer.getData('text/plain');
                            if (!raw) return;
                            let draggedId = raw;
                            try {
                              const parsed = JSON.parse(raw);
                              if (parsed && parsed.unitId) draggedId = parsed.unitId;
                            } catch (_) {}
                            if (draggedId && draggedId !== u.id) {
                              const dragged = gameState.units.find(x => x.id === draggedId);
                              if (dragged) {
                                if (canAttachLeader(dragged, u)) {
                                  handleAttachLeader(dragged.id, u.id);
                                } else if (canEmbark(dragged, u, embarkedTroops.length)) {
                                  handleEmbarkUnit(dragged.id, u.id);
                                }
                              }
                            }
                          } catch (err) {
                            console.error('Tray drop error:', err);
                          }
                        }}
                        className={`p-3 bg-zinc-950 rounded-xl border transition cursor-grab active:cursor-grabbing select-none relative group space-y-2.5 shadow-md ${
                          draggedUnitId === u.id 
                            ? 'opacity-40 border-amber-400 ring-2 ring-amber-400' 
                            : 'border-zinc-800 hover:border-amber-500/70 hover:shadow-amber-500/5'
                        }`}
                      >
                        {/* Drag Indicator Bar */}
                        <div className="flex items-center justify-between pointer-events-none select-none">
                          <div className="flex items-center space-x-2 pointer-events-none select-none">
                            {u.tokenImageUrl ? (
                              <img
                                src={u.tokenImageUrl}
                                alt={u.name}
                                draggable={false}
                                className="w-10 h-10 rounded-xl object-cover border border-amber-500/60 shadow shrink-0 pointer-events-none select-none"
                              />
                            ) : (
                              <span className="text-2xl pointer-events-none select-none">{u.avatar}</span>
                            )}
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-white text-xs block">{u.name}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                                  {u.role || u.type}
                                </span>
                              </div>
                              <span className="text-[10px] text-amber-300/80 font-mono">
                                {u.stats.lives} Lives / {u.stats.modelCount || 1} Model(s)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 text-zinc-500 group-hover:text-amber-400 transition" title="Drag onto map to deploy">
                            <Move className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Drag</span>
                          </div>
                        </div>

                        {/* Base Shape & Dimensions Badge */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-zinc-300 flex items-center space-x-1">
                            <Circle className="w-2.5 h-2.5 text-amber-400" />
                            <span>{baseDims.width === baseDims.height ? `${baseDims.width}mm` : `${baseDims.width}x${baseDims.height}mm`} {baseDims.shape.toUpperCase()}</span>
                          </span>

                          {canBypass && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-700/80 text-purple-300 font-bold">
                              DEPLOY ANYWHERE
                            </span>
                          )}

                          {!canBypass && (u.canDeployOutsideZone || u.traits?.includes('Infiltrator') || u.traits?.includes('DEPLOY_OUTSIDE_ZONE')) && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-700/80 text-rose-300 font-bold" title="Infiltration blocked: attached leader cannot infiltrate">
                              INFILTRATE BLOCKED BY LEADER
                            </span>
                          )}

                          {attachedLeader && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-600 text-purple-200 flex items-center space-x-1">
                              <span>👑</span>
                              <span>Led by {attachedLeader.name}</span>
                            </span>
                          )}

                          {embarkedTroops.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-950 border border-sky-600 text-sky-200 flex items-center space-x-1">
                              <Truck className="w-2.5 h-2.5" />
                              <span>{embarkedTroops.length} Squad(s) Embarked</span>
                            </span>
                          )}

                          {(u.type === 'Vehicle' || u.carryCapacity || u.stats.carryCapacity) && (() => {
                            const currentLoad = gameState.units
                              .filter(e => e.embarkedIn === u.id)
                              .reduce((acc, e) => acc + (e.stats.modelCount || 1), 0);
                            const maxCapacity = u.carryCapacity ?? u.stats.carryCapacity ?? 6;
                            return (
                              <span className="px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-600/60 text-sky-300 flex items-center space-x-1 font-mono">
                                <Truck className="w-2.5 h-2.5" />
                                <span>Capacity: {currentLoad}/{maxCapacity}</span>
                              </span>
                            );
                          })()}
                        </div>

                        {/* Unit Stats Row */}
                        <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-855">
                          <div>
                            <span className="text-zinc-500 block text-[9px]">MOVE</span>
                            <span className="font-bold text-white">{u.stats.mv} sq</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px]">DEF</span>
                            <span className="font-bold text-emerald-400">{u.stats.def + u.stats.defModifier}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px]">AM</span>
                            <span className="font-bold text-amber-400">{u.stats.am}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px]">RANGE</span>
                            <span className="font-bold text-sky-400">{u.stats.range > 0 ? `${u.stats.range} sq` : 'Melee'}</span>
                          </div>
                        </div>

                        {/* Attached Leader details if present */}
                        {attachedLeader && (
                          <div className="p-1.5 bg-purple-950/30 border border-purple-800/40 rounded-lg flex items-center justify-between text-[10px]">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-sm">{attachedLeader.avatar}</span>
                              <span className="text-purple-200 font-medium">Attached: {attachedLeader.name}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDetachLeader(u.id, attachedLeader.id);
                              }}
                              className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-mono text-[9px] transition"
                            >
                              Detach
                            </button>
                          </div>
                        )}

                        {/* Action Buttons Row */}
                        <div className="flex items-center space-x-1.5 pt-0.5">
                          <button
                            onClick={() => handleDeployReserveUnit(u.id)}
                            className="flex-1 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono rounded text-[10px] transition flex items-center justify-center space-x-1 shadow"
                            title="Deploy unit to active player's flank"
                          >
                            <ArrowRight className="w-3 h-3" />
                            <span>Deploy Flank</span>
                          </button>

                          <button
                            onClick={() => handleHoldInStrategicReserve(u.id)}
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-600/40 rounded text-[10px] font-mono transition flex items-center space-x-1"
                            title="Hold back in Strategic Reserves (Deployable Round 2+ Movement Phase)"
                          >
                            <Box className="w-3 h-3" />
                            <span>Reserve</span>
                          </button>

                          {isLeader && !u.attachedTo && (() => {
                            const canAttach = gameState.phase === 'Deployment' || gameState.phase === 'Command';
                            return (
                              <button
                                onClick={() => {
                                  if (canAttach) setAttachModalUnitId(u.id);
                                }}
                                disabled={!canAttach}
                                className={`px-2 py-1 border rounded text-[10px] font-mono transition flex items-center space-x-1 ${
                                  canAttach
                                    ? 'bg-purple-900/80 hover:bg-purple-800 text-purple-200 border-purple-600/50 cursor-pointer'
                                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-500 cursor-not-allowed opacity-60'
                                }`}
                                title={canAttach ? 'Attach Leader to an Infantry bodyguard squad' : 'Attach Leader only permitted during Deployment or Command Phase'}
                              >
                                <UserPlus className="w-3 h-3" />
                                <span>Attach</span>
                              </button>
                            );
                          })()}

                          {isInfantry && !u.embarkedIn && (() => {
                            const isFightReembark = (gameState.phase === 'Fight' || gameState.phase === 'Action') && u.lastDisembarkRound === gameState.round && u.lastDisembarkPhase !== gameState.phase;
                            const hasEmbarkedThisPhase = u.lastEmbarkPhase === gameState.phase && u.lastEmbarkRound === gameState.round;
                            const hasDisembarkedThisPhase = u.lastDisembarkPhase === gameState.phase && u.lastDisembarkRound === gameState.round;
                            const canEmbark = (gameState.phase === 'Deployment' || gameState.phase === 'Movement' || isFightReembark) && !hasEmbarkedThisPhase && !hasDisembarkedThisPhase;
                            return (
                              <button
                                onClick={() => {
                                  if (canEmbark) setEmbarkModalUnitId(u.id);
                                }}
                                disabled={!canEmbark}
                                className={`px-2 py-1 border rounded text-[10px] font-mono transition flex items-center space-x-1 ${
                                  canEmbark
                                    ? 'bg-sky-900/80 hover:bg-sky-800 text-sky-200 border-sky-600/50 cursor-pointer'
                                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-500 cursor-not-allowed opacity-60'
                                }`}
                                title={
                                  hasEmbarkedThisPhase ? 'Cannot embark multiple times in the same phase' :
                                  hasDisembarkedThisPhase ? 'Cannot embark and disembark in the same phase' :
                                  canEmbark ? 'Embark inside a friendly transport vehicle' : 'Embark only permitted during Deployment, Movement, or Fight re-embark'
                                }
                              >
                                <Truck className="w-3 h-3" />
                                <span>Embark</span>
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Drawer 1: Dice Tray Slide-out */}
      {diceDrawerOpen && (
        <div className="fixed top-10 right-0 bottom-0 w-80 md:w-96 bg-[#11131c]/95 backdrop-blur-md border-l border-zinc-700 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#161924]">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🎲</span>
              <h3 className="font-bold text-white text-sm">Virtual Dice Tray</h3>
            </div>
            <button
              onClick={() => setDiceDrawerOpen(false)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Quick Roll Presets */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block mb-1.5">
                Quick Presets
              </span>
              <div className="grid grid-cols-5 gap-1.5 font-mono text-xs">
                {[
                  { label: '1d6', c: 1, s: 6 },
                  { label: '2d6', c: 2, s: 6 },
                  { label: '3d6', c: 3, s: 6 },
                  { label: '4d6', c: 4, s: 6 },
                  { label: '1d20', c: 1, s: 20 },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setDiceCount(p.c);
                      setDiceSides(p.s);
                      handleRollDice(p.c, p.s, diceThreshold);
                    }}
                    className="py-1.5 bg-zinc-900 hover:bg-amber-600 hover:text-black border border-zinc-700 rounded-lg text-amber-300 font-bold text-center transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Configuration */}
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Dice Count:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setDiceCount(prev => Math.max(1, prev - 1))}
                    className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold text-amber-400">{diceCount}</span>
                  <button
                    onClick={() => setDiceCount(prev => Math.min(10, prev + 1))}
                    className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Dice Type:</span>
                <select
                  value={diceSides}
                  onChange={e => setDiceSides(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white focus:outline-none"
                >
                  <option value={4}>d4</option>
                  <option value={6}>d6</option>
                  <option value={8}>d8</option>
                  <option value={10}>d10</option>
                  <option value={12}>d12</option>
                  <option value={20}>d20</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Target DC (Threshold):</span>
                <select
                  value={diceThreshold}
                  onChange={e => setDiceThreshold(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-amber-300 font-bold focus:outline-none"
                >
                  <option value={0}>None</option>
                  <option value={2}>2+ (Very Easy)</option>
                  <option value={3}>3+ (Standard)</option>
                  <option value={4}>4+ (Challenging)</option>
                  <option value={5}>5+ (Hard)</option>
                  <option value={6}>6+ (Critical)</option>
                </select>
              </div>

              <button
                onClick={() => handleRollDice()}
                disabled={isRolling}
                className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black uppercase tracking-wider rounded-lg shadow-lg flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                <Dice6 className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
                <span>{isRolling ? 'Rolling...' : `Roll ${diceCount}d${diceSides}`}</span>
              </button>
            </div>

            {/* Rolling Arena / Felt Table */}
            <div className="bg-[#0c0e15] border border-zinc-800 rounded-xl p-4 min-h-[120px] flex flex-wrap gap-3 items-center justify-center relative overflow-hidden">
              {diceResults.map((r, i) => {
                const isPass = diceThreshold > 0 ? r >= diceThreshold : true;
                const isCrit = (diceSides === 6 && r === 6) || (diceSides === 20 && r === 20);
                return (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-transform ${
                      isRolling ? 'scale-90 rotate-12 blur-[1px]' : 'scale-100 rotate-0'
                    } ${
                      isCrit
                        ? 'bg-amber-500 text-black border-2 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                        : isPass
                        ? 'bg-emerald-950/80 border-2 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                        : 'bg-rose-950/60 border-2 border-rose-800 text-rose-300'
                    }`}
                  >
                    {r}
                  </div>
                );
              })}
            </div>

            {/* Outcome Stats Card */}
            {diceResults.length > 0 && (
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block text-[10px]">TOTAL SUM</span>
                  <span className="text-base font-bold text-white">
                    {diceResults.reduce((a, b) => a + b, 0)}
                  </span>
                </div>
                {diceThreshold > 0 && (
                  <div>
                    <span className="text-zinc-500 block text-[10px]">SUCCESSES ({diceThreshold}+)</span>
                    <span className="text-base font-bold text-emerald-400">
                      {diceResults.filter(r => r >= diceThreshold).length} / {diceResults.length}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleShareDiceRoll}
                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-amber-300 font-bold transition flex items-center space-x-1"
                  title="Push roll to combat log"
                >
                  <Send className="w-3 h-3" />
                  <span>Share Log</span>
                </button>
              </div>
            )}

            {/* Roll History */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Session Roll History
              </span>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {diceHistory.map(rec => (
                  <div
                    key={rec.id}
                    className="p-2 bg-zinc-950 rounded-lg border border-zinc-850 flex items-center justify-between font-mono text-[11px]"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-amber-400">{rec.notation}</span>
                      <span className="text-zinc-400">[{rec.rolls.join(', ')}]</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">= {rec.sum}</span>
                      {rec.successes !== undefined && (
                        <span className="text-emerald-400 text-[10px]">({rec.successes}✓)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawer 2: Command Phase & Stratagems Slide-out */}
      {commandDrawerOpen && (
        <div className="fixed top-10 right-0 bottom-0 w-84 md:w-96 bg-[#11131c]/95 backdrop-blur-md border-l border-zinc-700 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#161924]">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Command Net &amp; Stratagems</h3>
            </div>
            <button
              onClick={() => setCommandDrawerOpen(false)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* CP Pool Indicator */}
            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">Player 1 CP</span>
                  <span className="text-lg font-black font-mono text-rose-400">
                    ⚡ {gameState.player1CP ?? 3} CP
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">Player 2 CP</span>
                  <span className="text-lg font-black font-mono text-sky-400">
                    ⚡ {gameState.player2CP ?? 3} CP
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[10px] font-mono">
                <span className="text-amber-400 font-bold">
                  Active Turn: {gameState.activePlayer === 'player1' ? 'Player 1 (West)' : 'Player 2 (East)'}
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setGameState(prev => ({
                      ...prev,
                      [gameState.activePlayer === 'player1' ? 'player1CP' : 'player2CP']: Math.max(0, (gameState.activePlayer === 'player1' ? prev.player1CP ?? 3 : prev.player2CP ?? 3) - 1)
                    }))}
                    className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-bold"
                    title="Deduct 1 CP"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => setGameState(prev => ({
                      ...prev,
                      [gameState.activePlayer === 'player1' ? 'player1CP' : 'player2CP']: (gameState.activePlayer === 'player1' ? prev.player1CP ?? 3 : prev.player2CP ?? 3) + 1
                    }))}
                    className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-bold"
                    title="Add 1 CP"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Unit Context */}
            {selectedUnit ? (
              <div className="bg-[#141622] p-3 rounded-xl border border-zinc-700 space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Targeted Unit:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{selectedUnit.avatar}</span>
                  <div>
                    <span className="text-xs font-bold text-white block leading-none">{selectedUnit.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {(() => {
                        const bl = getUnitBodiesAndLives(selectedUnit);
                        return `Bodies: ${bl.livingBodies}/${bl.totalBodies} (U) | Lives: ${bl.remainingLives}/${bl.maxLives} (L) | AM: ${selectedUnit.stats.am} | Def: ${selectedUnit.stats.def + selectedUnit.stats.defModifier} | Mv: ${selectedUnit.stats.mv}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded-xl text-amber-300/80 text-[11px] flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Tip: Click a unit on the board to target single-unit Stratagems.</span>
              </div>
            )}

            {/* Stratagems List */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Available Command Stratagems
              </span>

              {[
                {
                  id: 'tactical_blitz',
                  name: 'Tactical Blitz',
                  cost: 1,
                  desc: '+2 Movement squares to selected unit for this round.',
                  icon: '⚡'
                },
                {
                  id: 'overcharged_munitions',
                  name: 'Overcharged Munitions',
                  cost: 1,
                  desc: '+1 Attack Modifier (AM) to selected unit for this round.',
                  icon: '🔥'
                },
                {
                  id: 'aegis_bulwark',
                  name: 'Aegis Bulwark',
                  cost: 1,
                  desc: '+1 Defence Modifier to selected unit (max +3 cap).',
                  icon: '🛡️'
                },
                {
                  id: 'field_repairs',
                  name: 'Field Repairs',
                  cost: 2,
                  desc: 'Restore up to 2 lost lives to damaged unit and re-sync squad tokens.',
                  icon: '🔧'
                },
                {
                  id: 'inspiring_command',
                  name: 'Inspiring Command',
                  cost: 1,
                  desc: 'Clear disadvantage and gain +1 Advantage stack on selected unit.',
                  icon: '👑'
                }
              ].map(strat => {
                const activeCP = gameState.activePlayer === 'player1' ? (gameState.player1CP ?? 3) : (gameState.player2CP ?? 3);
                const canAfford = activeCP >= strat.cost;
                const hasValidTarget = !!selectedUnit && selectedUnit.owner === gameState.activePlayer;
                const alreadyIssued = hasValidTarget && (selectedUnit.issuedStratagemsThisTurn || []).includes(strat.id);

                return (
                  <div
                    key={strat.id}
                    className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 hover:border-zinc-700 transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span>{strat.icon}</span>
                        <span className="font-bold text-white text-xs">{strat.name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-mono font-bold text-[10px]">
                        {strat.cost} CP
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{strat.desc}</p>
                    <button
                      onClick={() => handleActivateStratagem(strat.id)}
                      disabled={!canAfford || !hasValidTarget || alreadyIssued}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center space-x-1 ${
                        alreadyIssued
                          ? 'bg-zinc-850 text-amber-500/70 border border-amber-900/40 cursor-not-allowed'
                          : canAfford && hasValidTarget
                            ? 'bg-amber-500 hover:bg-amber-400 text-black shadow'
                            : 'bg-zinc-850 text-zinc-500 cursor-not-allowed border border-zinc-800'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>
                        {alreadyIssued
                          ? '🔒 1x Per Unit / Turn'
                          : !canAfford
                            ? 'Needs More CP'
                            : !hasValidTarget
                              ? 'Select Friendly Unit'
                              : 'Activate Stratagem'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Drawer 3: Strategic Reserves Slide-out */}
      {reservesDrawerOpen && (
        <div className="fixed top-10 right-0 bottom-0 w-84 md:w-96 bg-[#11131c]/95 backdrop-blur-md border-l border-zinc-700 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#161924]">
            <div className="flex items-center space-x-2">
              <Box className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Strategic Reserves</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 font-mono text-[10px] border border-amber-800">
                {gameState.units.filter(u => u.inStrategicReserve).length} units
              </span>
            </div>
            <button
              onClick={() => setReservesDrawerOpen(false)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Rule Callout Banner */}
            <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl text-amber-300 text-[11px] space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Reserve Deployment Rules</span>
              </div>
              <p className="text-zinc-400 text-[10px] leading-relaxed">
                Units held in Strategic Reserves can <strong className="text-amber-300">ONLY</strong> arrive on the battlefield during the owner's <strong className="text-amber-300">Movement Phase from Round 2 onward</strong>.
              </p>
            </div>

            {/* List of Units in Strategic Reserves */}
            {gameState.units.filter(u => u.inStrategicReserve).length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl space-y-2">
                <Box className="w-8 h-8 text-zinc-600 mx-auto" />
                <span className="text-xs text-zinc-400 font-medium block">No units in Strategic Reserves</span>
                <p className="text-[10px] text-zinc-600">
                  During Deployment, click the "Reserve" button on any undeployed unit in your tray to hold them back.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {gameState.units.filter(u => u.inStrategicReserve).map(u => {
                  const isOwnerTurn = gameState.activePlayer === u.owner;
                  const isRound2Plus = gameState.round >= 2;
                  const isMovementPhase = gameState.phase === 'Movement';
                  const canDeploy = isOwnerTurn && isRound2Plus && isMovementPhase;

                  let buttonReason = 'Deploy from Reserve (Flank)';
                  if (!isMovementPhase) buttonReason = '🔒 Movement Phase Only';
                  else if (!isRound2Plus) buttonReason = '🔒 Round 2+ Movement Only';
                  else if (!isOwnerTurn) buttonReason = '🔒 Inactive Turn';

                  return (
                    <div
                      key={u.id}
                      className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2.5 shadow-md hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{u.avatar}</span>
                          <div>
                            <span className="font-bold text-white text-xs block">{u.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {u.owner === 'player1' ? 'Player 1 (West)' : 'Player 2 (East)'} • {u.type}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-amber-300 font-mono text-[10px]">
                          {u.stats.lives} Lives
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-2 py-1 bg-zinc-900/60 rounded">
                        <span>Mv: {u.stats.mv} sq</span>
                        <span>Def: {u.stats.def + u.stats.defModifier}</span>
                        <span>AM: {u.stats.am}</span>
                        <span>Form: {u.formation || 'circle'}</span>
                      </div>

                      <button
                        onClick={() => handleDeployFromReserve(u.id)}
                        disabled={!canDeploy}
                        className={`w-full py-2 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center space-x-1.5 ${
                          canDeploy
                            ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg cursor-pointer'
                            : 'bg-zinc-850 text-zinc-500 border border-zinc-800 cursor-not-allowed'
                        }`}
                      >
                        <Box className="w-3.5 h-3.5" />
                        <span>{buttonReason}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawer 4: Embarked Units Slide-out */}
      {embarkedDrawerOpen && (
        <div className="fixed top-10 right-0 bottom-0 w-84 md:w-96 bg-[#11131c]/95 backdrop-blur-md border-l border-zinc-700 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#161924]">
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-white text-sm">Embarked Forces</h3>
              <span className="px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 font-mono text-[10px] border border-sky-800">
                {gameState.units.filter(u => !!u.embarkedIn).length} squads
              </span>
            </div>
            <button
              onClick={() => setEmbarkedDrawerOpen(false)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Rule Callout Banner */}
            <div className="p-3 bg-sky-950/20 border border-sky-900/40 rounded-xl text-sky-300 text-[11px] space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <Truck className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Transport &amp; Embark Rules</span>
              </div>
              <p className="text-zinc-400 text-[10px] leading-relaxed">
                Units loaded inside transport vehicles do not occupy board space. They may <strong className="text-sky-300">Disembark</strong> adjacent to the vehicle during their owner's <strong className="text-sky-300">Movement Phase</strong> (counts as having moved).
              </p>
            </div>

            {/* List of Units Embarked inside Transports */}
            {gameState.units.filter(u => !!u.embarkedIn).length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl space-y-2">
                <Truck className="w-8 h-8 text-zinc-600 mx-auto" />
                <span className="text-xs text-zinc-400 font-medium block">No units currently embarked</span>
                <p className="text-[10px] text-zinc-600">
                  Select an Infantry squad on your turn or click "Embark" in the Deployment tray to load inside a friendly vehicle.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {gameState.units.filter(u => !!u.embarkedIn).map(u => {
                  const vehicle = gameState.units.find(v => v.id === u.embarkedIn);
                  const isOwnerTurn = gameState.activePlayer === u.owner;
                  const isMovementPhase = gameState.phase === 'Movement';
                  const hasEmbarkedThisPhase = u.lastEmbarkPhase === gameState.phase && u.lastEmbarkRound === gameState.round;
                  const hasDisembarkedThisPhase = u.lastDisembarkPhase === gameState.phase && u.lastDisembarkRound === gameState.round;
                  const canDisembark = isOwnerTurn && isMovementPhase && !!vehicle?.position && !hasEmbarkedThisPhase && !hasDisembarkedThisPhase;

                  let buttonReason = 'Disembark Adjacent to Vehicle';
                  if (!isMovementPhase) buttonReason = '🔒 Movement Phase Only';
                  else if (!isOwnerTurn) buttonReason = '🔒 Inactive Turn';
                  else if (!vehicle?.position) buttonReason = '🔒 Vehicle not on board';
                  else if (hasEmbarkedThisPhase) buttonReason = '🔒 Already Embarked this Phase';
                  else if (hasDisembarkedThisPhase) buttonReason = '🔒 Already Disembarked this Phase';

                  return (
                    <div
                      key={u.id}
                      className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2.5 shadow-md hover:border-zinc-700 transition"
                    >
                      {/* Transport Vehicle Info */}
                      <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{vehicle?.avatar || '🚜'}</span>
                          <div>
                            <span className="text-[10px] font-mono uppercase text-zinc-400 block leading-tight">Transport Vehicle</span>
                            <span className="font-bold text-white text-xs">{vehicle?.name || 'Unknown Vehicle'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {vehicle?.position ? `(${vehicle.position.x}, ${vehicle.position.y})` : 'In Reserve'}
                        </span>
                      </div>

                      {/* Embarked Unit Info */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{u.avatar}</span>
                          <div>
                            <span className="font-bold text-white text-xs block">{u.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {u.owner === 'player1' ? 'Player 1' : 'Player 2'} • {u.stats.lives} Lives
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-2 py-1 bg-zinc-900/60 rounded">
                        <span>Mv: {u.stats.mv} sq</span>
                        <span>Def: {u.stats.def + u.stats.defModifier}</span>
                        <span>AM: {u.stats.am}</span>
                      </div>

                      <button
                        onClick={() => handleDisembarkUnit(u.id)}
                        disabled={!canDisembark}
                        className={`w-full py-2 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center space-x-1.5 ${
                          canDisembark
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg cursor-pointer'
                            : 'bg-zinc-850 text-zinc-500 border border-zinc-800 cursor-not-allowed'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>{buttonReason}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attach Leader Modal */}
      {attachModalUnitId && (() => {
        const leader = gameState.units.find(u => u.id === attachModalUnitId);
        if (!leader) return null;
        const candidates = gameState.units.filter(cand => canAttachLeader(leader, cand));

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-purple-800/80 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">👑</span>
                  <div>
                    <h3 className="text-base font-bold text-white">Attach Leader to Bodyguard Squad</h3>
                    <p className="text-xs text-zinc-400">Selecting an infantry squad for {leader.name}</p>
                  </div>
                </div>
                <button onClick={() => setAttachModalUnitId(null)} className="p-1 text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                The leader model will join the squad's formation at the front/center with a golden crest, move and rotate together with the squad, and lend commander authority.
              </p>

              {candidates.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl space-y-1">
                  <span className="text-xs text-zinc-400 block font-medium">No eligible Infantry bodyguard squads available.</span>
                  <span className="text-[10px] text-zinc-500 block">Must be friendly Infantry squads not already led by another character.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {candidates.map(cand => (
                    <div
                      key={cand.id}
                      onClick={() => handleAttachLeader(leader.id, cand.id)}
                      className="p-3 bg-zinc-900 hover:bg-purple-950/40 border border-zinc-800 hover:border-purple-600 rounded-xl flex items-center justify-between cursor-pointer transition shadow"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="text-2xl">{cand.avatar}</span>
                        <div>
                          <span className="font-bold text-white text-xs block">{cand.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {cand.stats.lives} Models • Mv:{cand.stats.mv} • Def:{cand.stats.def + cand.stats.defModifier}
                          </span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow">
                        Attach
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setAttachModalUnitId(null)}
                  className="px-4 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-mono"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Embark Unit Modal */}
      {embarkModalUnitId && (() => {
        const infantry = gameState.units.find(u => u.id === embarkModalUnitId);
        if (!infantry) return null;
        const candidates = gameState.units.filter(cand => {
          const currentEmbarkedCount = gameState.units.filter(u => u.embarkedIn === cand.id).length;
          return canEmbark(infantry, cand, currentEmbarkedCount);
        });

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-sky-800/80 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🚜</span>
                  <div>
                    <h3 className="text-base font-bold text-white">Embark Infantry inside Transport</h3>
                    <p className="text-xs text-zinc-400">Select an available friendly vehicle for {infantry.name}</p>
                  </div>
                </div>
                <button onClick={() => setEmbarkModalUnitId(null)} className="p-1 text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Loading inside a transport removes the squad from board collision until disembarked in the Movement Phase.
              </p>

              {candidates.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl space-y-1">
                  <span className="text-xs text-zinc-400 block font-medium">No eligible friendly transport vehicles with capacity available.</span>
                  <span className="text-[10px] text-zinc-500 block">Vehicles must be friendly Vehicle type with available passenger capacity.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {candidates.map(cand => {
                    const embarkedCount = gameState.units.filter(u => u.embarkedIn === cand.id).length;
                    const maxCapacity = cand.transportCapacity ?? 1;
                    const isDeployed = !!(infantry.position && cand.position);
                    let inRange = true;
                    let distInches = 0;
                    if (isDeployed) {
                      const dist = getUnitsModelDistance(infantry, cand);
                      distInches = Math.round((dist.minEdgeDistPx / DEFAULT_GRID_SIZE) * 10) / 10;
                      inRange = dist.minEdgeDistPx <= 150;
                    }

                    return (
                      <div
                        key={cand.id}
                        onClick={() => {
                          if (inRange) handleEmbarkUnit(infantry.id, cand.id);
                        }}
                        className={`p-3 bg-zinc-900 border rounded-xl flex items-center justify-between transition shadow ${
                          inRange
                            ? 'hover:bg-sky-950/40 border-zinc-800 hover:border-sky-600 cursor-pointer'
                            : 'border-zinc-800 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="text-2xl">{cand.avatar}</span>
                          <div>
                            <span className="font-bold text-white text-xs block">{cand.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Capacity: {embarkedCount} / {maxCapacity} squads • {cand.position ? `Distance: ${distInches}" (Max 3")` : 'In Reserve'}
                            </span>
                            {!inRange && (
                              <span className="text-[10px] text-rose-400 font-mono block">
                                ⚠️ Out of range ({distInches}&quot; &gt; 3.0&quot; max embark distance)
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 font-bold text-xs rounded-lg shadow ${
                          inRange
                            ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}>
                          {inRange ? 'Embark' : 'Too Far'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setEmbarkModalUnitId(null)}
                  className="px-4 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-mono"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Leader Attachment Warning Modal */}
      {leaderWarningState && (() => {
        const leader = gameState.units.find(u => u.id === leaderWarningState.leaderId);
        if (!leader) return null;

        const handleConfirmIndependent = () => {
          if (leaderWarningState.pendingAction === 'flank') {
            executeDeployReserveUnit(leader.id);
          } else if (leaderWarningState.pendingAction === 'drop' && leaderWarningState.pendingDropPos) {
            executeDropUnitFromTray(leader.id, leaderWarningState.pendingDropPos);
          } else if (leaderWarningState.pendingAction === 'advance_turn') {
            executeAdvancePhase();
          }
          setLeaderWarningState(null);
        };

        const handleAttachNow = () => {
          setAttachModalUnitId(leader.id);
          setLeaderWarningState(null);
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#141724] border-2 border-amber-500/80 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Leader Attachment Warning</h3>
                  <span className="text-xs text-amber-300 font-mono">Deployment Phase Advisory</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-300">
                <p className="leading-relaxed">
                  <strong className="text-white font-bold">{leader.name}</strong> is not attached to a squad.
                </p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Attaching a leader provides squad command buffs, wound shielding, and shared authority. Attach now, or deploy independently?
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-end space-x-2.5">
                <button
                  onClick={handleConfirmIndependent}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-mono font-bold transition cursor-pointer border border-zinc-600"
                >
                  Deploy Independently
                </button>
                <button
                  onClick={handleAttachNow}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs font-mono shadow-lg flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Attach to Squad</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* BUG-026: Deployment Error Notice Floating Toast */}
      {deploymentErrorNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 border-2 border-rose-500 text-rose-100 px-5 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-3 duration-200 font-mono text-xs font-bold">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{deploymentErrorNotice}</span>
          <button onClick={() => setDeploymentErrorNotice(null)} className="ml-2 text-rose-300 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Opponent Bot Deploying Notice Toast */}
      {isBotDeploying && gameState.phase === 'Deployment' && (
        <div className="fixed top-14 right-6 z-50 bg-[#0f1b2b]/95 border border-sky-400 text-sky-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-3 duration-200 font-mono text-xs font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping"></span>
          <span>🤖 Opponent Bot is deploying squad...</span>
        </div>
      )}

      {/* Done Deploying Notification Banner */}
      {doneDeployingNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/95 border-2 border-emerald-400 text-emerald-100 px-5 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-3 duration-200 font-mono text-xs font-bold">
          <Check className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{doneDeployingNotice}</span>
        </div>
      )}

      {/* Abandon Ship Protocol Emergency Toast */}
      {abandonShipNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-amber-950/95 border-2 border-amber-500 text-amber-100 px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-3 duration-200 font-mono text-xs font-bold max-w-2xl text-center">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
          <span>{abandonShipNotice}</span>
          <button onClick={() => setAbandonShipNotice(null)} className="ml-2 text-amber-300 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Command & Environmental Cards Modal */}
      {showCardDrawer && (() => {
        const activeCards = gameState.activePlayer === 'player1' ? gameState.player1ActiveCards : gameState.player2ActiveCards;
        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-4xl w-full p-5 shadow-2xl relative space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-amber-950 border border-amber-800 text-amber-300">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Tactical &amp; Environmental Cards</h3>
                    <p className="text-xs text-zinc-400">Secondary objectives, active doctrines, and dynamic field hazards</p>
                  </div>
                </div>
                <button onClick={() => setShowCardDrawer(false)} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-850">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2 shrink-0">
                <button
                  onClick={() => setCardDrawerTab('missions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center space-x-1.5 ${
                    cardDrawerTab === 'missions'
                      ? 'bg-amber-950 text-amber-300 border border-amber-700'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Tactical Missions &amp; Hand ({activeCards.length})</span>
                </button>
                <button
                  onClick={() => setCardDrawerTab('field_hazards')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center space-x-1.5 ${
                    cardDrawerTab === 'field_hazards'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Field Hazards &amp; Environmental Deck ({FIELD_EFFECT_CARDS.length})</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-3">
                {cardDrawerTab === 'missions' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-zinc-400">
                        {gameState.activePlayer === 'player1' ? 'Player 1 (West)' : 'Player 2 (East)'} Active Hand
                      </span>
                      <span className="text-[11px] font-mono text-amber-400">
                        Complete via Action Phase "Mission Action"
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeCards.map((card, idx) => (
                        <div key={card.id} className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 text-xs space-y-2 hover:border-zinc-700 transition">
                          <div className="flex justify-between items-center font-mono">
                            <span className="text-amber-400 font-bold">Slot #{idx + 1}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              card.type === 'SecondaryMission'
                                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                : card.type === 'Faction'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}>
                              {card.type} {card.pointsValue ? `(+${card.pointsValue} VP)` : ''}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-sm">{card.name}</h4>
                          <p className="text-zinc-300 text-[11px] leading-relaxed">{card.objectiveText || card.description}</p>
                          {card.onReplaceTrigger && (
                            <div className="text-[10px] text-zinc-500 font-mono italic">
                              {card.onReplaceTrigger}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cardDrawerTab === 'field_hazards' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between bg-rose-950/30 border border-rose-900/50 p-3 rounded-xl gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-rose-200">Environmental Shift Deck</h4>
                        <p className="text-[11px] text-zinc-400">
                          Hazards dynamically relocate wetlands (Flooded Mire, Sunken Crypt Trench), Rift Fractures, and High Ground across the battlefield.
                        </p>
                      </div>
                      <button
                        onClick={() => handleTriggerFieldEffect()}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-rose-900/40"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Draw &amp; Trigger Random Hazard</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {FIELD_EFFECT_CARDS.map((card) => (
                        <div key={card.id} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-xs space-y-2 hover:border-rose-900/60 transition">
                          <div className="flex justify-between items-center font-mono">
                            <span className="text-rose-400 font-bold flex items-center space-x-1">
                              <span>🌪️</span>
                              <span>Hazard</span>
                            </span>
                            <button
                              onClick={() => handleTriggerFieldEffect(card)}
                              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-rose-950 hover:text-rose-300 text-zinc-400 text-[10px] font-mono border border-zinc-700 transition"
                            >
                              Trigger Event ⚡
                            </button>
                          </div>
                          <h4 className="font-bold text-white text-sm">{card.name}</h4>
                          <p className="text-zinc-300 text-[11px] leading-relaxed">{card.objectiveText || card.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bot Opponent Army Selected Notification Toast */}
      {botSelectedNotice && (
        <div className="fixed top-14 right-6 z-50 bg-[#0f1b2b] border border-sky-400 text-sky-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-3 duration-200 font-mono text-xs">
          <span className="text-base">🤖</span>
          <span className="font-bold">{botSelectedNotice}</span>
        </div>
      )}

      {/* Pre-Battle Army Selection Modal */}
      {showArmySelectionModal && (() => {
        const allRosters = StorageService.getRosters();
        const allMaps = StorageService.getMaps();
        const factions = StorageService.getFactions();
        const selectedArmy = allRosters.find(r => r.id === selectedRosterId) || allRosters[0];

        const filteredRosters = allRosters.filter(r => {
          const matchesSearch = !armySearchTerm.trim() ||
            r.name.toLowerCase().includes(armySearchTerm.toLowerCase()) ||
            (r.tags && r.tags.some(t => t.toLowerCase().includes(armySearchTerm.toLowerCase())));
          const matchesFaction = armyFactionFilter === 'All' || r.factionId === armyFactionFilter;
          const matchesTag = armyTagFilter === 'All' || (r.tags && r.tags.includes(armyTagFilter));
          return matchesSearch && matchesFaction && matchesTag;
        });

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#0e111a] border border-zinc-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden space-y-4">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-3 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-rose-950 border border-rose-800 text-rose-300">
                    <Swords className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <span>Match Configuration &amp; Deployment</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                        Player 1 (West Flank)
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Choose your battle sector and combat army. The AI opponent will automatically select a balanced opposing force.
                    </p>
                  </div>
                </div>

                {/* Auto-Sim Mode Toggle */}
                <label className="flex items-center space-x-2 text-xs font-mono text-zinc-300 bg-zinc-900/90 px-3 py-1.5 rounded-lg border border-zinc-750 cursor-pointer hover:border-zinc-600 transition select-none">
                  <input
                    type="checkbox"
                    checked={isAutoSim}
                    onChange={e => setIsAutoSim(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-0 cursor-pointer"
                  />
                  <span>🤖 Auto-Sim (Bot vs Bot)</span>
                </label>
              </div>

              {/* Step 1: Battle Sector Selection */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">1. Select Battle Sector</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {allMaps.length} Sectors in Library
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {allMaps.map(m => {
                    const isSelected = selectedMapId === m.id;
                    const themeColors: Record<string, string> = {
                      Industrial: 'border-amber-700/60 text-amber-400 bg-amber-950/30',
                      Ruins: 'border-purple-700/60 text-purple-400 bg-purple-950/30',
                      Flooded: 'border-sky-700/60 text-sky-400 bg-sky-950/30',
                      Wasteland: 'border-emerald-700/60 text-emerald-400 bg-emerald-950/30'
                    };
                    const themeBadge = themeColors[m.theme] || 'border-zinc-700 text-zinc-300 bg-zinc-900';

                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMapId(m.id)}
                        className={`p-2.5 rounded-lg border transition cursor-pointer select-none space-y-1 ${
                          isSelected
                            ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/80 shadow'
                            : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs truncate mr-1">{m.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono border uppercase shrink-0 ${themeBadge}`}>
                            {m.theme}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                          <span>{m.terrain.length} Terrain</span>
                          <span>{m.objectives.length} Objectives</span>
                          {m.isPreset && <span className="text-[9px] text-zinc-500">Preset</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Army Selection Header & Search */}
              <div className="flex items-center space-x-1.5 pt-0.5">
                <Swords className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">2. Select Player 1 Army</span>
              </div>

              {/* Search & Filters */}
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={armySearchTerm}
                  onChange={e => setArmySearchTerm(e.target.value)}
                  placeholder="Search saved armies by name or tag (e.g. Vanguard, Aggro, 500 pts)..."
                  className="w-full bg-zinc-950 border border-zinc-750 px-3.5 py-2 rounded-lg text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none font-mono"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                  {/* Faction filter chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-zinc-500 uppercase">Faction:</span>
                    <button
                      onClick={() => setArmyFactionFilter('All')}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${
                        armyFactionFilter === 'All' ? 'bg-rose-600 text-white font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    {factions.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setArmyFactionFilter(f.id)}
                        className={`px-2 py-0.5 rounded transition cursor-pointer inline-flex items-center space-x-1.5 ${
                          armyFactionFilter === f.id ? 'bg-rose-600 text-white font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <FactionLogo faction={f} size="xs" />
                        <span>{f.shortName}</span>
                      </button>
                    ))}
                  </div>

                  {/* Tag filter pills */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-zinc-500 uppercase">Tag:</span>
                    <button
                      onClick={() => setArmyTagFilter('All')}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${
                        armyTagFilter === 'All' ? 'bg-amber-600 text-black font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    {Array.from(new Set(allRosters.flatMap(r => r.tags || []))).slice(0, 6).map(t => (
                      <button
                        key={t}
                        onClick={() => setArmyTagFilter(t)}
                        className={`px-2 py-0.5 rounded transition cursor-pointer ${
                          armyTagFilter === t ? 'bg-amber-600 text-black font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                        }`}
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Armies Cards Grid */}
              <div className="flex-1 overflow-y-auto pr-1">
                {filteredRosters.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl space-y-2 text-zinc-500 text-xs">
                    <Shield className="w-8 h-8 mx-auto text-zinc-700" />
                    <span>No saved armies match your filter criteria.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredRosters.map(army => {
                      const faction = factions.find(f => f.id === army.factionId);
                      const isSelected = selectedRosterId === army.id;
                      const modelsCount = army.units.reduce((acc, u) => acc + (u.stats?.modelCount || 1), 0);

                      return (
                        <div
                          key={army.id}
                          onClick={() => setSelectedRosterId(army.id)}
                          className={`p-3.5 rounded-xl border transition cursor-pointer select-none space-y-2.5 ${
                            isSelected
                              ? 'bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/80 shadow-lg'
                              : 'bg-zinc-950/90 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/60'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2.5">
                              <FactionLogo faction={faction} size="md" />
                              <div>
                                <h4 className="font-bold text-white text-xs block leading-tight">{army.name}</h4>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  {faction?.name || army.factionId}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-amber-400 font-mono block">
                                {army.totalPoints} pts
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {army.units.length} squads • {modelsCount} models
                              </span>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
                            {army.tags && army.tags.length > 0 ? (
                              army.tags.map(t => (
                                <span key={t} className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-amber-300">
                                  #{t}
                                </span>
                              ))
                            ) : (
                              <span className="text-zinc-600 italic">No tags</span>
                            )}
                          </div>

                          {/* Unit Avatars Row */}
                          <div className="flex items-center space-x-1 pt-1 border-t border-zinc-900">
                            {army.units.slice(0, 6).map((u, i) => (
                              u.tokenImageUrl ? (
                                <img key={i} src={u.tokenImageUrl} alt={u.name} title={u.name} className="w-5 h-5 rounded object-cover border border-zinc-700 shrink-0" />
                              ) : (
                                <span key={i} title={u.name} className="text-xs bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">
                                  {u.avatar}
                                </span>
                              )
                            ))}
                            {army.units.length > 6 && (
                              <span className="text-[9px] text-zinc-500 font-mono">+{army.units.length - 6}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-mono text-zinc-400">
                  <span>Selected: </span>
                  <strong className="text-white">"{selectedArmy?.name || 'None'}"</strong>
                  <span className="text-zinc-500"> ({selectedArmy?.totalPoints || 0} pts)</span>
                  <span className="text-zinc-500 block text-[10px]">
                    Opponent Bot will automatically choose a balanced opposing army.
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const rand = allRosters[Math.floor(Math.random() * allRosters.length)];
                      if (rand) {
                        setSelectedRosterId(rand.id);
                        handleConfirmArmySelection(rand, isAutoSim, selectedMapId);
                      }
                    }}
                    className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono rounded-lg transition cursor-pointer"
                    title="Pick random army and start"
                  >
                    🎲 Quick Random
                  </button>

                  <button
                    onClick={() => handleConfirmArmySelection(selectedArmy, isAutoSim, selectedMapId)}
                    disabled={!selectedArmy}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono rounded-lg shadow-lg flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <span>Confirm &amp; Begin Deployment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= MATCH CONCLUDED / VICTORY MODAL (BUG-025 & DESIGN-010) ================= */}
      {gameState.isGameOver && (() => {
        const isP1Winner = gameState.winner === 'player1';
        const isP2Winner = gameState.winner === 'player2';
        const isDraw = gameState.winner === 'draw';

        const allFactions = StorageService.getFactions();
        const p1FactionId = customRoster?.factionId || gameState.units.find(u => u.owner === 'player1')?.factionId || 'crimson_empire';
        const p2FactionId = gameState.units.find(u => u.owner === 'player2')?.factionId || 'daughters_astraea';

        const p1Faction = allFactions.find(f => f.id === p1FactionId);
        const p2Faction = allFactions.find(f => f.id === p2FactionId);

        // Calculate breakdown stats
        const poiBreakdown = calculatePOIScores(gameState.units, gameState.pois).breakdown;
        const p1Held = poiBreakdown.filter(b => b.player1CP > b.player2CP).length;
        const p2Held = poiBreakdown.filter(b => b.player2CP > b.player1CP).length;

        const p1SurvivingLives = gameState.units.filter(u => u.owner === 'player1').reduce((acc, u) => acc + Math.max(0, u.stats?.lives || 0), 0);
        const p2SurvivingLives = gameState.units.filter(u => u.owner === 'player2').reduce((acc, u) => acc + Math.max(0, u.stats?.lives || 0), 0);

        const p1SurvivingUnits = gameState.units.filter(u => u.owner === 'player1' && (u.stats?.lives || 0) > 0).length;
        const p2SurvivingUnits = gameState.units.filter(u => u.owner === 'player2' && (u.stats?.lives || 0) > 0).length;

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
            <div className={`bg-[#0d1017] border rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl flex flex-col space-y-6 text-center relative overflow-hidden ${
              isP1Winner 
                ? 'border-amber-500/70 ring-1 ring-amber-500/40 shadow-amber-950/50' 
                : isP2Winner 
                  ? 'border-rose-600/70 ring-1 ring-rose-600/40 shadow-rose-950/50' 
                  : 'border-sky-500/70 ring-1 ring-sky-500/40 shadow-sky-950/50'
            }`}>
              {/* Header Title Badge */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center justify-center space-x-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border shadow-sm mx-auto">
                  {isP1Winner && (
                    <span className="bg-amber-950/80 text-amber-300 border border-amber-500/50 flex items-center space-x-1.5 px-3 py-0.5 rounded-full">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Decisive Victory</span>
                    </span>
                  )}
                  {isP2Winner && (
                    <span className="bg-rose-950/80 text-rose-300 border border-rose-500/50 flex items-center space-x-1.5 px-3 py-0.5 rounded-full">
                      <Shield className="w-3.5 h-3.5 text-rose-400" />
                      <span>Defeat in Sector</span>
                    </span>
                  )}
                  {isDraw && (
                    <span className="bg-sky-950/80 text-sky-300 border border-sky-500/50 flex items-center space-x-1.5 px-3 py-0.5 rounded-full">
                      <Swords className="w-3.5 h-3.5 text-sky-400" />
                      <span>Tactical Stalemate</span>
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-serif uppercase">
                  {isP1Winner ? 'Victory Achieved' : isP2Winner ? 'Opponent Victorious' : 'Honorable Draw'}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-300 font-sans px-4">
                  {gameState.winReason || (gameState.round >= 10 ? `Match concluded at Round 10 Hard Cap with score ${gameState.player1Score} - ${gameState.player2Score}.` : 'The battle has concluded.')}
                </p>
              </div>

              {/* Force & Score Comparison Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800/80">
                {/* Player 1 Column */}
                <div className={`p-4 rounded-xl border flex flex-col items-center space-y-2.5 ${
                  isP1Winner 
                    ? 'bg-amber-950/25 border-amber-500/60 ring-1 ring-amber-500/30' 
                    : 'bg-zinc-900/50 border-zinc-800'
                }`}>
                  <FactionLogo faction={p1Faction} size="lg" />
                  <div>
                    <h3 className="font-bold text-white text-sm">{p1Faction?.name || 'Player 1 Force'}</h3>
                    <span className="text-[10px] text-zinc-400 font-mono">Commander (West)</span>
                  </div>
                  <div className="text-3xl font-black font-mono text-amber-400">
                    {gameState.player1Score} <span className="text-xs text-zinc-400 font-normal">VP</span>
                  </div>
                  <div className="w-full space-y-1 text-[11px] font-mono border-t border-zinc-800 pt-2 text-zinc-400 text-left">
                    <div className="flex justify-between">
                      <span>POIs Controlled:</span>
                      <strong className="text-white">{p1Held}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Squads Eliminated:</span>
                      <strong className="text-rose-400">+{gameState.player1Kills}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Surviving Squads:</span>
                      <strong className="text-emerald-400">{p1SurvivingUnits} ({p1SurvivingLives} HP)</strong>
                    </div>
                  </div>
                </div>

                {/* Player 2 Column */}
                <div className={`p-4 rounded-xl border flex flex-col items-center space-y-2.5 ${
                  isP2Winner 
                    ? 'bg-rose-950/25 border-rose-500/60 ring-1 ring-rose-500/30' 
                    : 'bg-zinc-900/50 border-zinc-800'
                }`}>
                  <FactionLogo faction={p2Faction} size="lg" />
                  <div>
                    <h3 className="font-bold text-white text-sm">{p2Faction?.name || 'Player 2 Force'}</h3>
                    <span className="text-[10px] text-zinc-400 font-mono">Opponent (East / Bot)</span>
                  </div>
                  <div className="text-3xl font-black font-mono text-sky-400">
                    {gameState.player2Score} <span className="text-xs text-zinc-400 font-normal">VP</span>
                  </div>
                  <div className="w-full space-y-1 text-[11px] font-mono border-t border-zinc-800 pt-2 text-zinc-400 text-left">
                    <div className="flex justify-between">
                      <span>POIs Controlled:</span>
                      <strong className="text-white">{p2Held}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Squads Eliminated:</span>
                      <strong className="text-rose-400">+{gameState.player2Kills}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Surviving Squads:</span>
                      <strong className="text-emerald-400">{p2SurvivingUnits} ({p2SurvivingLives} HP)</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Meta Badge */}
              <div className="flex items-center justify-center space-x-3 text-[11px] font-mono text-zinc-400">
                <span>Rounds Fought: <strong className="text-white">{Math.min(10, gameState.round)} / 10</strong></span>
                <span>•</span>
                <span>Sector: <strong className="text-white">{gameState.currentMap?.name || 'Standard Crucible'}</strong></span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRestartMatch}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono rounded-xl shadow-lg flex items-center space-x-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Rematch / Play Again</span>
                </button>

                {onReturnHome && (
                  <button
                    type="button"
                    onClick={onReturnHome}
                    className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 font-bold text-xs font-mono rounded-xl shadow transition cursor-pointer"
                  >
                    <span>Return to War Room</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
