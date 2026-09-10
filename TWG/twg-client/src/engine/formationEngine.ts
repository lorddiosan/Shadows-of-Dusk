import { Unit, Token, FormationType, WorldPoint, UnitSize, BaseShape, MultiLevelStructure } from '../types/game';

export const DEFAULT_GRID_SIZE = 50;
export const DEFAULT_OBJECTIVE_RADIUS = 1.5; // 1.5 grid squares = 75px radius

/**
 * Base diameter and radius configuration per unit size category.
 * Model bases scale with unit size.
 */
export const UNIT_BASE_SIZES: Record<UnitSize, { radius: number; diameter: number; label: string }> = {
  Small: { radius: 16, diameter: 32, label: 'Small (32px)' },       // Scouts, light skirmishers, familiars
  Medium: { radius: 20, diameter: 40, label: 'Medium (40px)' },     // Standard infantry, battleline, characters
  Large: { radius: 26, diameter: 52, label: 'Large (52px)' },       // Heavy infantry, mounted, squad leaders
  Huge: { radius: 36, diameter: 72, label: 'Huge (72px)' },         // Monsters, light dreadnoughts/vehicles
  Colossal: { radius: 48, diameter: 96, label: 'Colossal (96px)' }, // Heavy tanks, behemoths, siege titans
};

/**
 * Derives the UnitSize category for a unit.
 */
export function getUnitSize(unit: Unit): UnitSize {
  if (unit.size) return unit.size;
  if (unit.stats.size) return unit.stats.size;
  if (unit.type === 'Vehicle' || unit.type === 'Monster' || unit.role === 'Vehicle / Monster') {
    return 'Huge';
  }
  if (unit.role === 'Legendary Leader') {
    return 'Large';
  }
  if (unit.role === 'Infantry / Mounted' && unit.stats.mv >= 7) {
    return 'Large';
  }
  return 'Medium';
}

/**
 * Computes base radius in pixels at 100% zoom based on the unit's size stat.
 */
export function getUnitBaseRadius(unit: Unit): number {
  if (typeof unit.baseRadius === 'number') return unit.baseRadius;
  if (typeof unit.stats.baseRadius === 'number') return unit.stats.baseRadius;
  const sizeCategory = getUnitSize(unit);
  return UNIT_BASE_SIZES[sizeCategory]?.radius ?? 20;
}

/**
 * Computes base diameter in pixels at 100% zoom.
 */
export function getUnitBaseDiameter(unit: Unit): number {
  return getUnitBaseRadius(unit) * 2;
}

/**
 * Computes full base geometry (shape, width, height, and collision radius) for any unit.
 * Supports configurable non-circular shapes: Circle, Square, Rectangle, Oval.
 */
export function getUnitBaseDimensions(unit: Unit): { shape: BaseShape; width: number; height: number; radius: number } {
  const shape: BaseShape = unit.baseShape || unit.stats.baseShape || (
    unit.type === 'Vehicle' ? 'rectangle' :
    unit.role === 'Infantry / Mounted' && unit.stats.mv >= 7 ? 'oval' :
    'circle'
  );

  const radius = getUnitBaseRadius(unit);
  let width = unit.baseWidth || unit.stats.baseWidth;
  let height = unit.baseHeight || unit.stats.baseHeight;

  if (!width || !height) {
    if (shape === 'rectangle') {
      width = Math.round(radius * 2.4);
      height = Math.round(radius * 1.5);
    } else if (shape === 'oval') {
      width = Math.round(radius * 2.2);
      height = Math.round(radius * 1.4);
    } else if (shape === 'square') {
      width = radius * 2;
      height = radius * 2;
    } else {
      width = radius * 2;
      height = radius * 2;
    }
  }

  return {
    shape,
    width: Math.round(width),
    height: Math.round(height),
    radius
  };
}

/**
 * Calculates continuous 2D relative offsets for N tokens within a squad formation.
 * Spacing strictly obeys the base boundary rule taking base width and height into account.
 * (0, 0) represents the squad centroid/anchor.
 */
export function calculateFormationOffsets(
  count: number,
  formation: FormationType = 'circle',
  baseRadius: number = 20,
  baseWidth?: number,
  baseHeight?: number
): { offsetX: number; offsetY: number }[] {
  if (count <= 0) return [];
  if (count === 1) return [{ offsetX: 0, offsetY: 0 }];

  const spacingX = baseWidth ?? baseRadius * 2;
  const spacingY = baseHeight ?? baseRadius * 2;
  const spacingMax = Math.max(spacingX, spacingY);
  const offsets: { offsetX: number; offsetY: number }[] = [];

  switch (formation) {
    case 'line': {
      // Linear rank: horizontally centered with tangent base spacing
      for (let i = 0; i < count; i++) {
        const offsetX = (i - (count - 1) / 2) * spacingX;
        offsets.push({ offsetX: Math.round(offsetX), offsetY: 0 });
      }
      break;
    }

    case 'grid': {
      // Skirmish staggered grid with tangent base spacing in both axes
      const cols = Math.min(count, Math.max(2, Math.ceil(Math.sqrt(count))));
      const rows = Math.ceil(count / cols);
      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const offsetX = (col - (cols - 1) / 2) * spacingX;
        const offsetY = (row - (rows - 1) / 2) * spacingY;
        offsets.push({ offsetX: Math.round(offsetX), offsetY: Math.round(offsetY) });
      }
      break;
    }

    case 'stack': {
      // Clustered squad stack with tight isometric offset
      for (let i = 0; i < count; i++) {
        offsets.push({ offsetX: Math.round((i - (count - 1) / 2) * 5), offsetY: Math.round(-(i - (count - 1) / 2) * 5) });
      }
      break;
    }

    case 'auto': {
      // Auto picks compact grid for larger squads (>=4) or circle for smaller squads
      if (count >= 4) {
        const cols = Math.min(count, Math.max(2, Math.ceil(Math.sqrt(count))));
        for (let i = 0; i < count; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const offsetX = (col - (cols - 1) / 2) * spacingX;
          const offsetY = (row - (Math.ceil(count / cols) - 1) / 2) * spacingY;
          offsets.push({ offsetX: Math.round(offsetX), offsetY: Math.round(offsetY) });
        }
      } else {
        const chordRadius = (spacingMax + 8) / (2 * Math.sin(Math.PI / Math.max(2, count)));
        const radius = Math.ceil(Math.max(spacingMax, chordRadius));
        for (let i = 0; i < count; i++) {
          const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
          offsets.push({
            offsetX: Math.round(radius * Math.cos(angle)),
            offsetY: Math.round(radius * Math.sin(angle))
          });
        }
      }
      break;
    }

    case 'circle':
    default: {
      // Buffer of 8px to guarantee space for badges/borders so bases and life badges never touch or overlap
      const minChord = spacingMax + 8;
      if (count >= 6) {
        // Center model (leader)
        offsets.push({ offsetX: 0, offsetY: 0 });
        const ringCount = count - 1;
        // Chord distance C = 2 * R * sin(PI / ringCount) >= minChord
        // Therefore R >= minChord / (2 * sin(PI / ringCount))
        // And R must also be >= spacingMax + 8 to not overlap the center model!
        const chordRadius = minChord / (2 * Math.sin(Math.PI / ringCount));
        const radius = Math.ceil(Math.max(spacingMax + 8, chordRadius));
        for (let i = 0; i < ringCount; i++) {
          const angle = (i * 2 * Math.PI) / ringCount;
          offsets.push({
            offsetX: Math.round(radius * Math.cos(angle)),
            offsetY: Math.round(radius * Math.sin(angle))
          });
        }
      } else {
        // For count < 6: all models on a ring
        // Chord distance C = 2 * R * sin(PI / count) >= minChord
        // Therefore R >= minChord / (2 * sin(PI / count))
        const chordRadius = minChord / (2 * Math.sin(Math.PI / count));
        const radius = Math.ceil(Math.max(spacingMax, chordRadius));
        for (let i = 0; i < count; i++) {
          const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
          offsets.push({
            offsetX: Math.round(radius * Math.cos(angle)),
            offsetY: Math.round(radius * Math.sin(angle))
          });
        }
      }
      break;
    }
  }

  return offsets;
}

export interface FormationFitResult {
  success: boolean;
  unit: Unit;
  chosenFormation?: FormationType;
  reason?: string;
}

/**
 * Fits a unit's squad formation strictly inside a deployment zone.
 * If models would breach the zone boundaries, clips/reflows the formation inward.
 * If formation is 'auto', automatically picks the best-fitting pattern (grid, circle, line, stack).
 * If the squad physically cannot fit at the chosen location, returns success: false.
 */
export function fitFormationToZone(
  unit: Unit,
  anchor: WorldPoint,
  requestedFormation: FormationType = 'auto',
  zoneBounds: { minX: number; maxX: number; minY: number; maxY: number },
  canBypassZone: boolean = false
): FormationFitResult {
  if (canBypassZone) {
    const placed = moveUnit({ ...unit, formation: requestedFormation }, anchor);
    return { success: true, unit: placed, chosenFormation: requestedFormation };
  }

  const modelCount = unit.tokens?.length || unit.stats.modelCount || 1;
  const { width, height, radius } = getUnitBaseDimensions(unit);
  const w = width || radius * 2;
  const h = height || radius * 2;

  const candidateFormations: FormationType[] = requestedFormation === 'auto'
    ? ['grid', 'circle', 'line', 'stack']
    : [requestedFormation];

  for (const form of candidateFormations) {
    const rawOffsets = calculateFormationOffsets(modelCount, form, radius, w, h);

    // Check if standard formation centered on anchor already fits inside zone
    let allFit = true;
    for (const off of rawOffsets) {
      const tx = anchor.x + off.offsetX;
      const ty = anchor.y + off.offsetY;
      const halfW = w / 2;
      const halfH = h / 2;
      if (
        tx - halfW < zoneBounds.minX ||
        tx + halfW > zoneBounds.maxX ||
        ty - halfH < zoneBounds.minY ||
        ty + halfH > zoneBounds.maxY
      ) {
        allFit = false;
        break;
      }
    }

    if (allFit) {
      const placed = moveUnit({ ...unit, formation: form }, anchor);
      return { success: true, unit: placed, chosenFormation: form };
    }

    // Reflow/wrap candidate to fit inside zoneBounds
    const availWidth = Math.max(w, zoneBounds.maxX - zoneBounds.minX);
    const maxCols = Math.max(1, Math.floor(availWidth / (w + 4)));
    const cols = Math.min(modelCount, maxCols);
    const rows = Math.ceil(modelCount / cols);

    const reflowedOffsets: { offsetX: number; offsetY: number }[] = [];
    for (let i = 0; i < modelCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ox = (col - (cols - 1) / 2) * (w + 4);
      const oy = (row - (rows - 1) / 2) * (h + 4);
      reflowedOffsets.push({ offsetX: Math.round(ox), offsetY: Math.round(oy) });
    }

    // Determine shift required to keep all reflowed models within zoneBounds
    let shiftX = 0;
    let shiftY = 0;
    for (const off of reflowedOffsets) {
      const tx = anchor.x + off.offsetX;
      const ty = anchor.y + off.offsetY;
      const halfW = w / 2;
      const halfH = h / 2;

      if (tx - halfW + shiftX < zoneBounds.minX) {
        shiftX = zoneBounds.minX - (tx - halfW);
      }
      if (tx + halfW + shiftX > zoneBounds.maxX) {
        shiftX = zoneBounds.maxX - (tx + halfW);
      }
      if (ty - halfH + shiftY < zoneBounds.minY) {
        shiftY = zoneBounds.minY - (ty - halfH);
      }
      if (ty + halfH + shiftY > zoneBounds.maxY) {
        shiftY = zoneBounds.maxY - (ty + halfH);
      }
    }

    const fittedAnchor = { x: anchor.x + shiftX, y: anchor.y + shiftY };

    // Final boundary validation
    let valid = true;
    for (const off of reflowedOffsets) {
      const tx = fittedAnchor.x + off.offsetX;
      const ty = fittedAnchor.y + off.offsetY;
      const halfW = w / 2;
      const halfH = h / 2;
      if (
        tx - halfW < zoneBounds.minX ||
        tx + halfW > zoneBounds.maxX ||
        ty - halfH < zoneBounds.minY ||
        ty + halfH > zoneBounds.maxY
      ) {
        valid = false;
        break;
      }
    }

    if (valid) {
      const existingTokens = unit.tokens && unit.tokens.length > 0 ? unit.tokens : initUnitTokens(unit);
      const updatedTokens: Token[] = existingTokens.map((t, idx) => {
        const off = reflowedOffsets[idx] || { offsetX: 0, offsetY: 0 };
        const mx = fittedAnchor.x + off.offsetX;
        const my = fittedAnchor.y + off.offsetY;
        return {
          ...t,
          x: mx,
          y: my,
          offsetX: off.offsetX,
          offsetY: off.offsetY,
          turnStartPos: { x: mx, y: my }
        };
      });

      const updatedUnit: Unit = {
        ...unit,
        position: fittedAnchor,
        formation: form,
        tokens: updatedTokens
      };

      return { success: true, unit: updatedUnit, chosenFormation: form };
    }
  }

  return {
    success: false,
    unit,
    reason: 'Not enough room for this formation here — try another position or formation.'
  };
}

/**
 * Initializes tokens for a Unit, where U = unit.stats.modelCount.
 * Supports non-circular base shapes (width/height/shape) and merges attached Leader tokens.
 */
export function initUnitTokens(unit: Unit, attachedLeaderUnits?: Unit[]): Token[] {
  const totalUnits = Math.max(1, unit.stats.modelCount || 1);
  const totalLives = Math.max(1, unit.stats.lives);
  const maxSquadLives = Math.max(totalLives, unit.stats.maxLives || totalLives);

  // Calculate lives per unit: L / U
  const baseLives = Math.max(1, Math.floor(totalLives / totalUnits));
  const baseMaxLives = Math.max(1, Math.floor(maxSquadLives / totalUnits));
  const remainderLives = totalLives % totalUnits;

  const formation = unit.formation || 'circle';
  const { shape, width, height, radius } = getUnitBaseDimensions(unit);

  const leaderCount = attachedLeaderUnits ? attachedLeaderUnits.length : 0;
  const totalTokensCount = totalUnits + leaderCount;
  const offsets = calculateFormationOffsets(totalTokensCount, formation, radius, width, height);

  const tokens: Token[] = [];
  let offsetIndex = 0;

  // 1. If leaders are attached, prepend the Leader tokens at the squad head
  if (attachedLeaderUnits && attachedLeaderUnits.length > 0) {
    for (const leader of attachedLeaderUnits) {
      const leaderDims = getUnitBaseDimensions(leader);
      const off = offsets[offsetIndex++] || { offsetX: 0, offsetY: 0 };
      tokens.push({
        id: `${leader.id}_leader_tok`,
        unitId: leader.id,
        currentLives: leader.stats.lives,
        maxLives: leader.stats.maxLives || leader.stats.lives,
        x: Math.round((unit.position?.x ?? 0) + off.offsetX),
        y: Math.round((unit.position?.y ?? 0) + off.offsetY),
        offsetX: off.offsetX,
        offsetY: off.offsetY,
        rotation: 0,
        size: Math.max(leaderDims.width, leaderDims.height),
        radius: leaderDims.radius,
        baseShape: leaderDims.shape,
        baseWidth: leaderDims.width,
        baseHeight: leaderDims.height,
        isLeaderToken: true,
        sprite: leader.avatar,
        tokenImageUrl: leader.tokenImageUrl,
        selected: false
      });
    }
  }

  // 2. Standard Squad member tokens
  for (let i = 0; i < totalUnits; i++) {
    const off = offsets[offsetIndex++] || { offsetX: 0, offsetY: 0 };
    const tokenCurrentLives = baseLives + (i < remainderLives ? 1 : 0);
    const tokenMaxLives = Math.max(tokenCurrentLives, baseMaxLives);

    tokens.push({
      id: `${unit.id}_tok_${i}`,
      unitId: unit.id,
      currentLives: tokenCurrentLives,
      maxLives: tokenMaxLives,
      x: Math.round((unit.position?.x ?? 0) + off.offsetX),
      y: Math.round((unit.position?.y ?? 0) + off.offsetY),
      offsetX: off.offsetX,
      offsetY: off.offsetY,
      rotation: 0,
      size: Math.max(width, height),
      radius: radius,
      baseShape: shape,
      baseWidth: width,
      baseHeight: height,
      isLeaderToken: false,
      sprite: unit.avatar,
      tokenImageUrl: unit.tokenImageUrl,
      selected: false
    });
  }

  return tokens;
}

/**
 * Synchronizes a unit's visual Token array with its formation, base dimensions, and coordinates.
 * Preserves each individual token's remaining lives (currentLives).
 * Enforces mutual exclusivity: units in reserve, embarked, or attached as a leader have no on-board tokens.
 * Dead units (lives === 0) stay permanently dead with tokens = [] and position = null.
 */
export function syncUnitTokens(unit: Unit, allUnits?: Unit[]): Unit {
  const lives = Math.max(0, unit.stats.lives);
  const formation = unit.formation || 'circle';

  // Units in reserve, embarked in a vehicle, or attached to a squad do not render standalone tokens
  if (unit.inStrategicReserve || unit.embarkedIn || unit.attachedTo) {
    return {
      ...unit,
      formation,
      tokens: [],
      position: null
    };
  }

  // If unit is dead, ensure dead state
  if (lives === 0) {
    return {
      ...unit,
      formation,
      tokens: [],
      position: null,
      stats: {
        ...unit.stats,
        lives: 0
      }
    };
  }

  // If unit has no position (undeployed in Army Tray or unplaced), preserve lives and clear board tokens
  if (!unit.position) {
    return {
      ...unit,
      formation,
      tokens: [],
      position: null
    };
  }

  // Find attached living leaders if any
  const attachedLeaders = (unit.attachedUnits && allUnits)
    ? allUnits.filter(u => unit.attachedUnits!.includes(u.id) && u.stats.lives > 0)
    : undefined;

  // If unit already had tokens but all squad models died, check if dead
  if (unit.tokens && unit.tokens.length > 0) {
    const livingTokens = unit.tokens.filter(t => t.currentLives > 0);
    if (livingTokens.length === 0) {
      return {
        ...unit,
        formation,
        tokens: [],
        position: null,
        stats: {
          ...unit.stats,
          lives: 0
        }
      };
    }
  }

  // Initialize or filter tokens
  let activeTokens: Token[];
  if (!unit.tokens || unit.tokens.length === 0) {
    activeTokens = initUnitTokens(unit, attachedLeaders);
  } else {
    // Start with living squad tokens (preserve attached leader tokens if allUnits not provided)
    const attachedLeaderIds = attachedLeaders !== undefined
      ? new Set(attachedLeaders.map(l => l.id))
      : (unit.attachedUnits ? new Set(unit.attachedUnits) : null);

    activeTokens = unit.tokens.filter(t => {
      if (t.currentLives <= 0) return false;
      if (t.isLeaderToken && attachedLeaderIds && !attachedLeaderIds.has(t.unitId)) return false; // Detached leader
      return true;
    });

    // Add any newly attached leader tokens that aren't in activeTokens yet
    if (attachedLeaders && attachedLeaders.length > 0) {
      for (const leader of attachedLeaders) {
        const hasToken = activeTokens.some(t => t.isLeaderToken && t.unitId === leader.id);
        if (!hasToken) {
          const leaderDims = getUnitBaseDimensions(leader);
          const leaderTok: Token = {
            id: `${leader.id}_leader_tok`,
            unitId: leader.id,
            currentLives: leader.stats.lives,
            maxLives: leader.stats.maxLives || leader.stats.lives,
            x: unit.position.x,
            y: unit.position.y,
            offsetX: 0,
            offsetY: 0,
            rotation: 0,
            size: Math.max(leaderDims.width, leaderDims.height),
            radius: leaderDims.radius,
            baseShape: leaderDims.shape,
            baseWidth: leaderDims.width,
            baseHeight: leaderDims.height,
            isLeaderToken: true,
            sprite: leader.avatar,
            tokenImageUrl: leader.tokenImageUrl,
            selected: false
          };
          activeTokens.unshift(leaderTok);
        }
      }
    }
  }

  if (activeTokens.length === 0) {
    return {
      ...unit,
      formation,
      tokens: [],
      position: null,
      stats: {
        ...unit.stats,
        lives: 0
      }
    };
  }

  const { shape, width, height, radius } = getUnitBaseDimensions(unit);
  const offsets = calculateFormationOffsets(activeTokens.length, formation, radius, width, height);

  const nextTokens: Token[] = activeTokens.map((tok, i) => {
    const off = offsets[i] || { offsetX: 0, offsetY: 0 };
    return {
      ...tok,
      offsetX: off.offsetX,
      offsetY: off.offsetY,
      x: Math.round(unit.position!.x + off.offsetX),
      y: Math.round(unit.position!.y + off.offsetY),
      baseShape: tok.baseShape || shape,
      baseWidth: tok.baseWidth || width,
      baseHeight: tok.baseHeight || height,
      size: Math.max(tok.baseWidth || width, tok.baseHeight || height),
      radius: tok.radius || radius,
      sprite: tok.sprite || unit.avatar,
      tokenImageUrl: tok.tokenImageUrl || (tok.isLeaderToken ? undefined : unit.tokenImageUrl)
    };
  });

  // Calculate remaining lives of standard squad models (excluding attached leaders who track their own lives)
  const squadTokens = nextTokens.filter(t => !t.isLeaderToken);
  const totalRemainingLives = squadTokens.length > 0
    ? squadTokens.reduce((sum, t) => sum + t.currentLives, 0)
    : nextTokens.reduce((sum, t) => sum + t.currentLives, 0);

  return {
    ...unit,
    formation,
    tokens: nextTokens,
    position: totalRemainingLives > 0 ? unit.position : null,
    stats: {
      ...unit.stats,
      lives: totalRemainingLives
    }
  };
}

/**
 * Applies combat damage to a unit's tokens model-by-model.
 * When a token loses 1 life (e.g. 2L -> 1L), it REMAINS on the board.
 * Only when a token reaches 0 lives is that token removed.
 * If all tokens reach 0 lives, unit is marked destroyed (position: null, tokens: []).
 */
export function applyDamageToTokens(unit: Unit, livesLost: number): Unit {
  if (livesLost <= 0) return unit;

  let currentUnit = syncUnitTokens(unit);
  const tokens = [...(currentUnit.tokens || [])];
  if (tokens.length === 0 || currentUnit.stats.lives <= 0) {
    return {
      ...currentUnit,
      tokens: [],
      position: null,
      stats: { ...currentUnit.stats, lives: 0 }
    };
  }

  let damageToDeal = livesLost;

  // Allocate damage to tokens: prefer already wounded token first, then reverse order
  while (damageToDeal > 0 && tokens.length > 0) {
    // Find an already wounded token (currentLives < maxLives and > 0), or take the last token
    let targetIndex = tokens.findIndex(t => t.currentLives > 0 && t.currentLives < t.maxLives);
    if (targetIndex === -1) {
      targetIndex = tokens.length - 1; // Take last token
    }

    const targetToken = tokens[targetIndex];
    const damage = Math.min(targetToken.currentLives, damageToDeal);

    targetToken.currentLives -= damage;
    damageToDeal -= damage;

    // If token reached 0 lives, remove it from the squad
    if (targetToken.currentLives <= 0) {
      tokens.splice(targetIndex, 1);
    }
  }

  // If squad wiped out
  if (tokens.length === 0) {
    return {
      ...currentUnit,
      tokens: [],
      position: null,
      stats: {
        ...currentUnit.stats,
        lives: 0
      }
    };
  }

  const updatedUnit: Unit = {
    ...currentUnit,
    tokens
  };

  return syncUnitTokens(updatedUnit);
}

/**
 * Moves a unit to a new continuous world position, updating all child tokens cohesively.
 */
export function moveUnit(unit: Unit, newPosition: WorldPoint, allUnits?: Unit[]): Unit {
  const updatedUnit: Unit = {
    ...unit,
    position: newPosition
  };
  return syncUnitTokens(updatedUnit, allUnits);
}

/**
 * Changes a unit's formation preset and recalculates relative token offsets.
 */
export function setUnitFormation(unit: Unit, newFormation: FormationType): Unit {
  const updatedUnit: Unit = {
    ...unit,
    formation: newFormation
  };
  return syncUnitTokens(updatedUnit);
}

/**
 * Deployment Zone Boundaries:
 * Player 1 (West): 0px <= x <= 200px (4 grid squares)
 * Player 2 (East): 1000px <= x <= 1200px (4 grid squares)
 */
export function isInsideDeploymentZone(
  pos: WorldPoint,
  owner: 'player1' | 'player2',
  worldWidth: number = 1200,
  zoneWidth: number = 200
): boolean {
  if (owner === 'player1') {
    return pos.x >= 0 && pos.x <= zoneWidth && pos.y >= 0 && pos.y <= 800;
  } else {
    return pos.x >= (worldWidth - zoneWidth) && pos.x <= worldWidth && pos.y >= 0 && pos.y <= 800;
  }
}

/**
 * Checks if a unit possesses the trait to deploy outside the normal deployment zone.
 * Must be explicit via unit.canDeployOutsideZone or passives containing 'DEPLOY_OUTSIDE_ZONE'.
 */
export function canUnitDeployOutsideZone(unit: Unit): boolean {
  return !!(
    unit.canDeployOutsideZone ||
    unit.passives?.some(p => 
      p.toUpperCase().includes('DEPLOY_OUTSIDE_ZONE') ||
      p.toUpperCase().includes('INFILTRATOR')
    )
  );
}

/**
 * Euclidean distance in pixels between two world points.
 */
export function worldDistance(p1: WorldPoint, p2: WorldPoint): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Distance in grid squares between two world points.
 */
export function gridDistance(p1: WorldPoint, p2: WorldPoint, gridSize: number = DEFAULT_GRID_SIZE): number {
  return worldDistance(p1, p2) / gridSize;
}

/**
 * Snaps a continuous world point to the nearest grid cell center (or top-left).
 */
export function snapToGrid(
  point: WorldPoint,
  gridSize: number = DEFAULT_GRID_SIZE,
  snapToCenter: boolean = true
): WorldPoint {
  const half = snapToCenter ? gridSize / 2 : 0;
  return {
    x: Math.floor(point.x / gridSize) * gridSize + half,
    y: Math.floor(point.y / gridSize) * gridSize + half
  };
}

/**
 * Computes the collision radius of a Unit.
 * For single-model units (monsters, leaders), this equals the base model radius.
 * For multi-model squad formations, this extends to the furthest outer rim of its member tokens.
 */
export function getUnitCollisionRadius(unit: Unit): number {
  const baseR = getUnitBaseRadius(unit);
  if (!unit.tokens || unit.tokens.length <= 1) {
    return baseR;
  }
  let maxReach = baseR;
  for (const t of unit.tokens) {
    const dist = Math.hypot(t.offsetX || 0, t.offsetY || 0) + (t.radius || baseR);
    if (dist > maxReach) {
      maxReach = dist;
    }
  }
  return Math.round(maxReach);
}

export interface CollisionCheckResult {
  collides: boolean;
  minDistance: number;
  actualDistance: number;
  overlapPx: number;
}

/**
 * Checks if two units overlap given their positions and collision radii.
 * Minimum allowed center distance = radiusA + radiusB (edges can touch/tangent, but not overlap).
 */
export function checkUnitCollision(
  unitA: Unit,
  posA: WorldPoint,
  unitB: Unit,
  posB?: WorldPoint
): CollisionCheckResult {
  const actualPosB = posB || unitB.position;
  if (!actualPosB) {
    return { collides: false, minDistance: 0, actualDistance: 9999, overlapPx: 0 };
  }

  const radiusA = getUnitCollisionRadius(unitA);
  const radiusB = getUnitCollisionRadius(unitB);
  const minDistance = radiusA + radiusB;
  const actualDistance = worldDistance(posA, actualPosB);
  const collides = actualDistance < minDistance;
  const overlapPx = collides ? Math.round(minDistance - actualDistance) : 0;

  return {
    collides,
    minDistance,
    actualDistance,
    overlapPx
  };
}

/**
 * Runs collision checks for a unit at a target position against all other placed units.
 */
export function checkUnitCollisionsWithAll(
  unit: Unit,
  targetPos: WorldPoint,
  otherUnits: Unit[]
): {
  hasCollision: boolean;
  collidingUnit: Unit | null;
  minDistance: number;
  actualDistance: number;
  overlapPx: number;
} {
  for (const other of otherUnits) {
    if (other.id === unit.id || !other.position || other.stats.lives <= 0) continue;
    const result = checkUnitCollision(unit, targetPos, other);
    if (result.collides) {
      return {
        hasCollision: true,
        collidingUnit: other,
        minDistance: result.minDistance,
        actualDistance: result.actualDistance,
        overlapPx: result.overlapPx
      };
    }
  }
  return {
    hasCollision: false,
    collidingUnit: null,
    minDistance: 0,
    actualDistance: 9999,
    overlapPx: 0
  };
}

/**
 * If targetPos would overlap with placed units, attempts to find the nearest valid tangent position
 * where unit edges touch (distance = radiusA + radiusB + 1px buffer) without overlapping any other unit,
 * respecting board boundaries and optional deployment zone constraints.
 * Returns null if no valid non-overlapping spot is found.
 */
export function findNearestNonOverlappingPosition(
  unit: Unit,
  targetPos: WorldPoint,
  otherUnits: Unit[],
  worldWidth: number = 1200,
  worldHeight: number = 800,
  isZoneValid?: (pos: WorldPoint) => boolean
): WorldPoint | null {
  const check = checkUnitCollisionsWithAll(unit, targetPos, otherUnits);
  if (!check.hasCollision || !check.collidingUnit || !check.collidingUnit.position) {
    return targetPos;
  }

  const colliding = check.collidingUnit;
  const posB = colliding.position;
  if (!posB) return null;
  const radiusA = getUnitCollisionRadius(unit);
  const radiusB = getUnitCollisionRadius(colliding);
  const requiredDist = radiusA + radiusB + 1; // 1px tangent buffer

  let dx = targetPos.x - posB.x;
  let dy = targetPos.y - posB.y;
  let dist = Math.hypot(dx, dy);

  if (dist < 1) {
    dx = 1;
    dy = 0;
    dist = 1;
  }

  const baseAngle = Math.atan2(dy, dx);
  // Search angles in increasing sweeps: 0, +15°, -15°, +30°, -30°, +45°, -45°, etc.
  const angleDeltas = [0, 0.26, -0.26, 0.52, -0.52, 0.78, -0.78, 1.05, -1.05, 1.57, -1.57];

  for (const delta of angleDeltas) {
    const testAngle = baseAngle + delta;
    const testX = Math.round(posB.x + Math.cos(testAngle) * requiredDist);
    const testY = Math.round(posB.y + Math.sin(testAngle) * requiredDist);

    // 1. Boundary check
    if (testX < radiusA || testX > worldWidth - radiusA || testY < radiusA || testY > worldHeight - radiusA) {
      continue;
    }

    // 2. Zone check if supplied
    if (isZoneValid && !isZoneValid({ x: testX, y: testY })) {
      continue;
    }

    // 3. Collision check against ALL other units
    const candidateCollision = checkUnitCollisionsWithAll(unit, { x: testX, y: testY }, otherUnits);
    if (!candidateCollision.hasCollision) {
      return { x: testX, y: testY };
    }
  }

  return null;
}

/**
 * Shape-aware overlap check between two models/tokens on the tabletop.
 * Circle vs Circle: distance < sum of radii.
 * Square/Rect vs Square/Rect: AABB overlap test.
 * Circle vs Square/Rect: Clamped point distance check.
 * Oval vs Oval/Circle/Rect: Normalized ellipse equation distance approximation.
 */
export function checkShapeOverlap(
  shapeA: BaseShape,
  posA: WorldPoint,
  wA: number,
  hA: number,
  shapeB: BaseShape,
  posB: WorldPoint,
  wB: number,
  hB: number
): boolean {
  const dx = Math.abs(posA.x - posB.x);
  const dy = Math.abs(posA.y - posB.y);

  // 1. Circle vs Circle
  if (shapeA === 'circle' && shapeB === 'circle') {
    const rA = wA / 2;
    const rB = wB / 2;
    return dx * dx + dy * dy < (rA + rB) * (rA + rB);
  }

  // 2. Rect/Square vs Rect/Square
  const isRectA = shapeA === 'square' || shapeA === 'rectangle';
  const isRectB = shapeB === 'square' || shapeB === 'rectangle';
  if (isRectA && isRectB) {
    return dx < (wA + wB) / 2 && dy < (hA + hB) / 2;
  }

  // 3. Circle vs Rect/Square
  if ((shapeA === 'circle' && isRectB) || (shapeB === 'circle' && isRectA)) {
    const [cPos, cRadius, rPos, rW, rH] = shapeA === 'circle'
      ? [posA, wA / 2, posB, wB, hB]
      : [posB, wB / 2, posA, wA, hA];

    const clampedX = Math.max(rPos.x - rW / 2, Math.min(cPos.x, rPos.x + rW / 2));
    const clampedY = Math.max(rPos.y - rH / 2, Math.min(cPos.y, rPos.y + rH / 2));
    const distSq = (cPos.x - clampedX) * (cPos.x - clampedX) + (cPos.y - clampedY) * (cPos.y - clampedY);
    return distSq < cRadius * cRadius;
  }

  // 4. Oval vs any other shape (Elliptical boundary approximation)
  const effectiveWA = shapeA === 'oval' ? wA * 0.95 : wA;
  const effectiveHA = shapeA === 'oval' ? hA * 0.95 : hA;
  const effectiveWB = shapeB === 'oval' ? wB * 0.95 : wB;
  const effectiveHB = shapeB === 'oval' ? hB * 0.95 : hB;

  const a = (effectiveWA + effectiveWB) / 2;
  const b = (effectiveHA + effectiveHB) / 2;
  return (dx * dx) / (a * a) + (dy * dy) / (b * b) < 1.0;
}

export interface UniversalCollisionResult {
  hasCollision: boolean;
  hasIntersection: boolean;
  collidingUnitName?: string;
  collidingTokenName?: string;
  reason?: string;
}

/**
 * Universal token overlap validator (Requirement 5).
 * Strictly enforces that no two tokens' bases may visually intersect across the board,
 * regardless of whether they belong to the same unit or different units.
 * Tangent / touching edges (distance == r1 + r2) are permitted, but intersection (< r1 + r2) is blocked.
 */
export function checkUniversalTokenCollisions(
  candidateTokens: Token[],
  allUnits: Unit[],
  ignoreUnitId?: string,
  ignoreTokenId?: string
): UniversalCollisionResult {
  // 1. Same-unit internal check among candidate tokens
  for (let i = 0; i < candidateTokens.length; i++) {
    const tokA = candidateTokens[i];
    if (tokA.id === ignoreTokenId) continue;
    const shapeA = tokA.baseShape || 'circle';
    const posA = { x: tokA.x, y: tokA.y };
    const wA = tokA.baseWidth || tokA.size || 40;
    const hA = tokA.baseHeight || tokA.size || 40;

    for (let j = i + 1; j < candidateTokens.length; j++) {
      const tokB = candidateTokens[j];
      if (tokB.id === ignoreTokenId) continue;
      const shapeB = tokB.baseShape || 'circle';
      const posB = { x: tokB.x, y: tokB.y };
      const wB = tokB.baseWidth || tokB.size || 40;
      const hB = tokB.baseHeight || tokB.size || 40;

      if (checkShapeOverlap(shapeA, posA, wA, hA, shapeB, posB, wB, hB)) {
        return {
          hasCollision: true,
          hasIntersection: true,
          collidingUnitName: 'Squad Model',
          collidingTokenName: tokB.id,
          reason: `Squad models cannot overlap bases (touching is permitted).`
        };
      }
    }
  }

  // 2. Cross-unit check against all other units placed on the board
  for (const unit of allUnits) {
    if (unit.id === ignoreUnitId || !unit.position || unit.stats.lives <= 0) continue;
    if (!unit.tokens || unit.tokens.length === 0) continue;

    for (const existingTok of unit.tokens) {
      if (existingTok.id === ignoreTokenId || existingTok.currentLives <= 0) continue;
      const shapeB = existingTok.baseShape || unit.baseShape || 'circle';
      const posB = { x: existingTok.x, y: existingTok.y };
      const wB = existingTok.baseWidth || existingTok.size || 40;
      const hB = existingTok.baseHeight || existingTok.size || 40;

      for (const candTok of candidateTokens) {
        if (candTok.id === ignoreTokenId) continue;
        const shapeA = candTok.baseShape || 'circle';
        const posA = { x: candTok.x, y: candTok.y };
        const wA = candTok.baseWidth || candTok.size || 40;
        const hA = candTok.baseHeight || candTok.size || 40;

        if (checkShapeOverlap(shapeA, posA, wA, hA, shapeB, posB, wB, hB)) {
          return {
            hasCollision: true,
            hasIntersection: true,
            collidingUnitName: unit.name,
            collidingTokenName: unit.name,
            reason: `Base overlaps with ${unit.name}! Model bases may touch but cannot intersect.`
          };
        }
      }
    }
  }

  return { hasCollision: false, hasIntersection: false };
}

/**
 * Checks if a leader unit can attach to candidate bodyguard squad.
 */
export function canAttachLeader(leader: Unit, bodyguard: Unit): boolean {
  if (leader.owner !== bodyguard.owner) return false;
  if (leader.id === bodyguard.id) return false;
  const isLeader = leader.role === 'Leader' || leader.role === 'Legendary Leader' || leader.type === 'Character';
  const isInfantry = bodyguard.type === 'Infantry';
  if (!isLeader || !isInfantry) return false;
  if (leader.attachedTo || leader.embarkedIn || leader.inStrategicReserve) return false;
  if (bodyguard.embarkedIn || bodyguard.inStrategicReserve) return false;
  if (bodyguard.attachedUnits && bodyguard.attachedUnits.length >= 1) return false; // 1 leader per squad max
  return true;
}

/**
 * Checks if an infantry squad can embark inside a transport vehicle.
 * Enforces vehicle carryCapacity (in models, default 6 models).
 */
export function canEmbark(infantry: Unit, vehicle: Unit, currentLoadModels: number = 0): boolean {
  if (infantry.owner !== vehicle.owner) return false;
  if (infantry.id === vehicle.id) return false;
  if (infantry.type !== 'Infantry') return false;
  if (vehicle.type !== 'Vehicle' && vehicle.role !== 'Vehicle / Monster') return false;
  if (infantry.embarkedIn || infantry.inStrategicReserve || infantry.attachedTo) return false;

  const maxCapacity = vehicle.carryCapacity ?? vehicle.stats?.carryCapacity ?? (vehicle.transportCapacity ? vehicle.transportCapacity * 5 : 6);
  const incomingModels = (infantry.stats?.modelCount || 1) + (infantry.attachedUnits?.length || 0);

  return (currentLoadModels + incomingModels) <= maxCapacity;
}

/**
 * Enforces mutual exclusivity across unit states:
 * Exactly ONE of: onBoard, inStrategicReserve, embarkedIn (vehicleId), or attachedTo (unitId).
 */
export function setUnitMutualState(
  unit: Unit,
  newState: 'onBoard' | 'reserve' | 'embarked' | 'attached',
  payload?: { vehicleId?: string; leaderTargetId?: string; position?: WorldPoint }
): Unit {
  switch (newState) {
    case 'reserve':
      return {
        ...unit,
        inStrategicReserve: true,
        embarkedIn: null,
        attachedTo: null,
        position: null,
        tokens: []
      };
    case 'embarked':
      return {
        ...unit,
        inStrategicReserve: false,
        embarkedIn: payload?.vehicleId || null,
        attachedTo: null,
        position: null,
        tokens: []
      };
    case 'attached':
      return {
        ...unit,
        inStrategicReserve: false,
        embarkedIn: null,
        attachedTo: payload?.leaderTargetId || null,
        position: null,
        tokens: []
      };
    case 'onBoard':
    default: {
      const pos = payload?.position || unit.position || { x: 200, y: 200 };
      const updated = {
        ...unit,
        inStrategicReserve: false,
        embarkedIn: null,
        attachedTo: null,
        position: pos
      };
      return syncUnitTokens(updated);
    }
  }
}

export interface CoherencyValidationResult {
  isCoherent: boolean;
  offendingTokenIds: string[];
  message?: string;
  coherencyDistancePx: number;
}

/**
 * Validates squad coherency for a multi-model unit.
 * Every model must be within coherency distance of at least one other model in the same unit.
 * In addition, the squad must form a single connected graph component.
 */
export function validateUnitCoherency(
  unit: Unit,
  coherencyDistancePx: number = 100 // default 2 inches = 100px (50px per inch)
): CoherencyValidationResult {
  const livingTokens = unit.tokens ? unit.tokens.filter(t => t.currentLives > 0) : [];
  if (livingTokens.length <= 1) {
    return {
      isCoherent: true,
      offendingTokenIds: [],
      coherencyDistancePx
    };
  }

  // 1. Build adjacency list based on distance <= coherencyDistancePx
  const adj = new Map<string, string[]>();
  livingTokens.forEach(t => adj.set(t.id, []));

  for (let i = 0; i < livingTokens.length; i++) {
    for (let j = i + 1; j < livingTokens.length; j++) {
      const t1 = livingTokens[i];
      const t2 = livingTokens[j];
      const dist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
      if (dist <= coherencyDistancePx) {
        adj.get(t1.id)!.push(t2.id);
        adj.get(t2.id)!.push(t1.id);
      }
    }
  }

  // Find disconnected nodes (degree === 0)
  const isolated = livingTokens.filter(t => adj.get(t.id)!.length === 0).map(t => t.id);

  // 2. Connected component analysis (BFS)
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const t of livingTokens) {
    if (!visited.has(t.id)) {
      const comp: string[] = [];
      const queue = [t.id];
      visited.add(t.id);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        comp.push(curr);
        for (const neighbor of (adj.get(curr) || [])) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      components.push(comp);
    }
  }

  // If more than 1 connected component, find the largest component; all others are offending
  const offendingTokenIds: string[] = [];
  if (components.length > 1) {
    components.sort((a, b) => b.length - a.length);
    for (let c = 1; c < components.length; c++) {
      offendingTokenIds.push(...components[c]);
    }
  } else if (isolated.length > 0) {
    offendingTokenIds.push(...isolated);
  }

  const isCoherent = offendingTokenIds.length === 0;
  const inches = Math.round((coherencyDistancePx / DEFAULT_GRID_SIZE) * 10) / 10;
  const message = isCoherent
    ? undefined
    : `Unit not in coherency — ${offendingTokenIds.length} model(s) must stay within ${inches}″ (${coherencyDistancePx}px) of at least one other model in the squad.`;

  return {
    isCoherent,
    offendingTokenIds,
    message,
    coherencyDistancePx
  };
}

/**
 * Moves an individual model/token within a unit, updating relative offsets and unit centroid.
 */
export function moveIndividualToken(
  unit: Unit,
  tokenId: string,
  newWorldPos: WorldPoint
): Unit {
  if (!unit.tokens || unit.tokens.length === 0) return unit;

  // Update target token position
  const updatedTokens = unit.tokens.map(t => {
    if (t.id === tokenId) {
      return {
        ...t,
        x: Math.round(newWorldPos.x),
        y: Math.round(newWorldPos.y),
        turnStartPos: t.turnStartPos || { x: t.x, y: t.y }
      };
    }
    return t;
  });

  // Recalculate unit centroid from living models
  const living = updatedTokens.filter(t => t.currentLives > 0);
  const centroidX = living.length > 0
    ? Math.round(living.reduce((acc, t) => acc + t.x, 0) / living.length)
    : Math.round(newWorldPos.x);
  const centroidY = living.length > 0
    ? Math.round(living.reduce((acc, t) => acc + t.y, 0) / living.length)
    : Math.round(newWorldPos.y);

  // Recalculate offsets relative to centroid
  const finalizedTokens = updatedTokens.map(t => ({
    ...t,
    offsetX: t.x - centroidX,
    offsetY: t.y - centroidY
  }));

  return {
    ...unit,
    position: { x: centroidX, y: centroidY },
    tokens: finalizedTokens
  };
}

/**
 * Validates individual model move distance from its turn start position.
 * Prevents staggered token relay / extra-turn chaining exploits (Requirement 4).
 */
export function validateModelMovementDistance(
  unit: Unit,
  tokenId: string,
  targetPos: WorldPoint,
  gridSize: number = DEFAULT_GRID_SIZE
): { valid: boolean; distSquares: number; maxSquares: number; reason?: string } {
  const token = unit.tokens?.find(t => t.id === tokenId);
  if (!token) return { valid: true, distSquares: 0, maxSquares: unit.stats.mv };

  const startPos = token.turnStartPos || { x: token.x, y: token.y };
  const distPx = worldDistance(startPos, targetPos);
  const distSquares = distPx / gridSize;
  const maxSquares = unit.stats.mv + 0.15; // tolerance for rounding

  if (distSquares > maxSquares) {
    return {
      valid: false,
      distSquares: Math.round(distSquares * 10) / 10,
      maxSquares: unit.stats.mv,
      reason: `Action blocked: Model moved ${distSquares.toFixed(1)} sq, exceeding maximum Mv (${unit.stats.mv} sq) from turn start position!`
    };
  }

  return { valid: true, distSquares: Math.round(distSquares * 10) / 10, maxSquares: unit.stats.mv };
}

/**
 * Tests if a 2D line segment between p1 and p2 intersects an axis-aligned bounding box.
 */
export function lineIntersectsBox(
  p1: WorldPoint,
  p2: WorldPoint,
  box: { x: number; y: number; width: number; height: number }
): boolean {
  const minX = box.x - box.width / 2;
  const maxX = box.x + box.width / 2;
  const minY = box.y - box.height / 2;
  const maxY = box.y + box.height / 2;

  // If either point is inside box
  if (p1.x >= minX && p1.x <= maxX && p1.y >= minY && p1.y <= maxY) return true;
  if (p2.x >= minX && p2.x <= maxX && p2.y >= minY && p2.y <= maxY) return true;

  // Liang-Barsky line clipping algorithm
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  let t0 = 0.0;
  let t1 = 1.0;

  const checks = [
    { p: -dx, q: -(minX - p1.x) },
    { p: dx, q: maxX - p1.x },
    { p: -dy, q: -(minY - p1.y) },
    { p: dy, q: maxY - p1.y }
  ];

  for (const { p, q } of checks) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }

  return t0 <= t1;
}

export interface StructureTraversalResult {
  allowed: boolean;
  consumesFullMove: boolean;
  structureId?: string;
  structureName?: string;
  reason?: string;
}

/**
 * Validates movement paths against multi-level structures.
 * Vehicles & Huge units cannot pass freely through building footprints;
 * entering or exiting consumes their full movement for the turn.
 */
export function checkPathCrossesStructure(
  from: WorldPoint,
  to: WorldPoint,
  unit: Unit,
  structures?: MultiLevelStructure[]
): StructureTraversalResult {
  if (!structures || structures.length === 0) {
    return { allowed: true, consumesFullMove: false };
  }

  const isLargeOrVehicle = 
    unit.type === 'Vehicle' || 
    unit.type === 'Monster' || 
    unit.sizeClass === 'Large' || 
    unit.sizeClass === 'Huge' ||
    unit.role === 'Vehicle / Monster';

  for (const s of structures) {
    const box = { x: s.x, y: s.y, width: s.width, height: s.height };
    const crosses = lineIntersectsBox(from, to, box);
    if (!crosses) continue;

    if (isLargeOrVehicle && s.blocksLargeUnits) {
      const minX = box.x - box.width / 2;
      const maxX = box.x + box.width / 2;
      const minY = box.y - box.height / 2;
      const maxY = box.y + box.height / 2;

      const fromInside = from.x >= minX && from.x <= maxX && from.y >= minY && from.y <= maxY;
      const toInside = to.x >= minX && to.x <= maxX && to.y >= minY && to.y <= maxY;

      if (!fromInside && toInside) {
        // Entering structure
        return {
          allowed: true,
          consumesFullMove: true,
          structureId: s.id,
          structureName: s.name,
          reason: `${unit.name} enters ${s.name} (ground floor) — consumes full movement for this turn.`
        };
      } else if (fromInside && !toInside) {
        // Exiting structure
        return {
          allowed: true,
          consumesFullMove: true,
          structureId: s.id,
          structureName: s.name,
          reason: `${unit.name} exits ${s.name} — consumes full movement for this turn.`
        };
      } else if (!fromInside && !toInside) {
        // Passing completely through
        return {
          allowed: false,
          consumesFullMove: false,
          structureId: s.id,
          structureName: s.name,
          reason: `⛔ Blocked: ${unit.name} (Vehicle / Huge) cannot pass straight through ${s.name}!`
        };
      }
    }
  }

  return { allowed: true, consumesFullMove: false };
}


