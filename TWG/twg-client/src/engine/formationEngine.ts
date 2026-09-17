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
    unit.type === 'Infantry' ? 'circle' :
    (unit.traits?.some(t => t.toLowerCase().includes('cavalry') || t.toLowerCase().includes('mounted')) || (unit as any).type === 'Cavalry' || (unit.role === 'Infantry / Mounted' && unit.stats.mv >= 7)) ? 'oval' :
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

  const baseSpacingX = baseWidth ?? baseRadius * 2;
  const baseSpacingY = baseHeight ?? baseRadius * 2;
  const spacingMax = Math.max(baseSpacingX, baseSpacingY);
  const offsets: { offsetX: number; offsetY: number }[] = [];

  switch (formation) {
    case 'line': {
      // Linear rank: horizontally centered with tangent base spacing + 2px clearance
      const spacingX = baseSpacingX + 2;
      for (let i = 0; i < count; i++) {
        const offsetX = (i - (count - 1) / 2) * spacingX;
        offsets.push({ offsetX: Math.round(offsetX), offsetY: 0 });
      }
      break;
    }

    case 'grid': {
      // Skirmish staggered grid with tangent base spacing + 4px clearance buffer (BUG-027 fix)
      const spacingX = baseSpacingX + 4;
      const spacingY = baseSpacingY + 4;
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
      // Clustered squad stack: tightly packed hexagonal tangent cluster with tangent base clearance (no base intersection)
      const spacingX = baseSpacingX + 2;
      const spacingY = Math.round(spacingX * 0.866);
      const cols = Math.min(count, Math.max(2, Math.ceil(Math.sqrt(count))));
      const rows = Math.ceil(count / cols);
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const staggerX = (row % 2) * (spacingX / 2);
        const offsetX = (col - (cols - 1) / 2) * spacingX + staggerX;
        const offsetY = (row - (rows - 1) / 2) * spacingY;
        offsets.push({ offsetX: Math.round(offsetX), offsetY: Math.round(offsetY) });
      }
      break;
    }

    case 'auto': {
      // Auto picks compact grid for larger squads (>=4) or circle for smaller squads
      if (count >= 4) {
        const spacingX = baseSpacingX + 4;
        const spacingY = baseSpacingY + 4;
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
        const radius = Math.ceil(Math.max(spacingMax / 2, chordRadius));
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

  // If unit has custom model placements (e.g. manual deployment), preserve relative offsets
  if (unit.hasCustomTokenPositions && unit.tokens && unit.tokens.length > 0) {
    const { width, height, radius } = getUnitBaseDimensions(unit);
    const w = width || radius * 2;
    const h = height || radius * 2;
    const customOffsets = unit.tokens.map(t => ({
      offsetX: typeof t.offsetX === 'number' ? t.offsetX : (t.x - (unit.position?.x ?? anchor.x)),
      offsetY: typeof t.offsetY === 'number' ? t.offsetY : (t.y - (unit.position?.y ?? anchor.y))
    }));

    let allFit = true;
    for (const off of customOffsets) {
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
      const placed = moveUnit(unit, anchor);
      return { success: true, unit: placed, chosenFormation: unit.formation || 'circle' };
    }
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
    const hasCustomOffset = unit.hasCustomTokenPositions && typeof tok.offsetX === 'number' && typeof tok.offsetY === 'number';
    const off = hasCustomOffset ? { offsetX: tok.offsetX, offsetY: tok.offsetY } : (offsets[i] || { offsetX: 0, offsetY: 0 });
    const isLeader = tok.isLeaderToken;
    const tokShape = isLeader ? (tok.baseShape || shape) : shape;
    const tokWidth = isLeader ? (tok.baseWidth || width) : width;
    const tokHeight = isLeader ? (tok.baseHeight || height) : height;
    const tokRadius = isLeader ? (tok.radius || radius) : radius;
    return {
      ...tok,
      offsetX: off.offsetX,
      offsetY: off.offsetY,
      x: Math.round(unit.position!.x + off.offsetX),
      y: Math.round(unit.position!.y + off.offsetY),
      baseShape: tokShape,
      baseWidth: tokWidth,
      baseHeight: tokHeight,
      size: Math.max(tokWidth, tokHeight),
      radius: tokRadius,
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

  let currentUnit = unit.position ? syncUnitTokens(unit) : unit;
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

  // Allocate damage to tokens: bodyguard models absorb damage first to protect attached leaders
  while (damageToDeal > 0 && tokens.length > 0) {
    const hasRegularBodyguards = tokens.some(t => !t.isLeaderToken && t.currentLives > 0);

    let targetIndex = -1;
    if (hasRegularBodyguards) {
      // Find an already wounded bodyguard token first
      targetIndex = tokens.findIndex(t => !t.isLeaderToken && t.currentLives > 0 && t.currentLives < t.maxLives);
      if (targetIndex === -1) {
        // Otherwise take the last non-leader bodyguard token
        for (let i = tokens.length - 1; i >= 0; i--) {
          if (!tokens[i].isLeaderToken && tokens[i].currentLives > 0) {
            targetIndex = i;
            break;
          }
        }
      }
    } else {
      // No bodyguard models remain; damage falls upon the leader token
      targetIndex = tokens.findIndex(t => t.currentLives > 0 && t.currentLives < t.maxLives);
      if (targetIndex === -1) {
        targetIndex = tokens.length - 1;
      }
    }

    if (targetIndex === -1) break;

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

  return unit.position ? syncUnitTokens(updatedUnit) : updatedUnit;
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
    formation: newFormation,
    hasCustomTokenPositions: false
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
 * Must be explicit via unit.canDeployOutsideZone or passives containing 'DEPLOY_OUTSIDE_ZONE' / 'Infiltrator'.
 * 
 * CORE RULE: A unit that can infiltrate CANNOT do so anymore if a leader that can't infiltrate is attached to them.
 * If allUnits or attachedLeaderUnits is provided and any attached leader lacks the Infiltrator trait, infiltration is blocked.
 * Conversely, if an attached leader is tested and its bodyguard lacks Infiltrator, infiltration is also blocked.
 */
export function canUnitDeployOutsideZone(unit: Unit, allUnits?: Unit[]): boolean {
  const hasInfiltrator = !!(
    unit.canDeployOutsideZone ||
    unit.traits?.includes('Infiltrator') ||
    unit.traits?.includes('DEPLOY_OUTSIDE_ZONE') ||
    unit.passives?.some(p => 
      p.toUpperCase().includes('DEPLOY_OUTSIDE_ZONE') ||
      p.toUpperCase().includes('INFILTRATOR')
    )
  );

  if (!hasInfiltrator) return false;

  // Check attached leaders - if ANY attached leader cannot infiltrate, the unit cannot infiltrate
  const leaderUnits: Unit[] = [];
  if (allUnits && allUnits.length > 0 && unit.attachedUnits && unit.attachedUnits.length > 0) {
    for (const lid of unit.attachedUnits) {
      const l = allUnits.find(u => u.id === lid);
      if (l) leaderUnits.push(l);
    }
  }
  if ((unit as any).attachedLeaderUnits && Array.isArray((unit as any).attachedLeaderUnits)) {
    leaderUnits.push(...(unit as any).attachedLeaderUnits);
  }

  for (const leader of leaderUnits) {
    const leaderCanInfiltrate = !!(
      leader.canDeployOutsideZone ||
      leader.traits?.includes('Infiltrator') ||
      leader.traits?.includes('DEPLOY_OUTSIDE_ZONE') ||
      leader.passives?.some(p => 
        p.toUpperCase().includes('DEPLOY_OUTSIDE_ZONE') ||
        p.toUpperCase().includes('INFILTRATOR')
      )
    );
    if (!leaderCanInfiltrate) {
      return false;
    }
  }

  // Also if this unit is a leader attached to a bodyguard (attachedTo):
  if (unit.attachedTo && allUnits && allUnits.length > 0) {
    const bodyguard = allUnits.find(u => u.id === unit.attachedTo);
    if (bodyguard) {
      const bodyguardCanInfiltrate = !!(
        bodyguard.canDeployOutsideZone ||
        bodyguard.traits?.includes('Infiltrator') ||
        bodyguard.traits?.includes('DEPLOY_OUTSIDE_ZONE') ||
        bodyguard.passives?.some(p => 
          p.toUpperCase().includes('DEPLOY_OUTSIDE_ZONE') ||
          p.toUpperCase().includes('INFILTRATOR')
        )
      );
      if (!bodyguardCanInfiltrate) {
        return false;
      }
    }
  }

  return true;
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
 * Accurately measures the distance between two units based on their individual model tokens and base sizes.
 * Returns:
 * - minModelDistPx: Minimum center-to-center distance between any model in unitA and any model in unitB.
 * - minEdgeDistPx: Minimum edge-to-edge distance between bases of any model in unitA and any model in unitB (0 if touching/tangent).
 * - centerDistPx: Centroid-to-centroid distance.
 */
export function getUnitsModelDistance(unitA: Unit, unitB: Unit): { minModelDistPx: number; minEdgeDistPx: number; centerDistPx: number } {
  const centerA = unitA.position || { x: 0, y: 0 };
  const centerB = unitB.position || { x: 0, y: 0 };
  const centerDistPx = Math.hypot(centerA.x - centerB.x, centerA.y - centerB.y);

  const tokensA = (unitA.tokens && unitA.tokens.length > 0)
    ? unitA.tokens.filter(t => t.currentLives > 0)
    : [{ x: centerA.x, y: centerA.y, radius: getUnitBaseRadius(unitA), size: getUnitBaseDiameter(unitA) }];
  const tokensB = (unitB.tokens && unitB.tokens.length > 0)
    ? unitB.tokens.filter(t => t.currentLives > 0)
    : [{ x: centerB.x, y: centerB.y, radius: getUnitBaseRadius(unitB), size: getUnitBaseDiameter(unitB) }];

  let minModelDistPx = Infinity;
  let minEdgeDistPx = Infinity;

  for (const tA of tokensA) {
    const rA = tA.radius || (tA.size ? tA.size / 2 : 20);
    for (const tB of tokensB) {
      const rB = tB.radius || (tB.size ? tB.size / 2 : 20);
      const d = Math.hypot(tA.x - tB.x, tA.y - tB.y);
      if (d < minModelDistPx) {
        minModelDistPx = d;
      }
      const edgeD = Math.max(0, d - (rA + rB));
      if (edgeD < minEdgeDistPx) {
        minEdgeDistPx = edgeD;
      }
    }
  }

  if (minModelDistPx === Infinity) minModelDistPx = centerDistPx;
  if (minEdgeDistPx === Infinity) minEdgeDistPx = Math.max(0, centerDistPx - (getUnitCollisionRadius(unitA) + getUnitCollisionRadius(unitB)));

  return { minModelDistPx, minEdgeDistPx, centerDistPx };
}

/**
 * Checks if targetUnit is in shooting range of attackerUnit.
 * In tabletop wargaming, if any model in the attacking squad can reach any model in the target squad
 * within range squares (including slight base size tolerance), the shot is valid.
 */
export function isUnitInShootingRange(attacker: Unit, target: Unit, gridSize: number = DEFAULT_GRID_SIZE): boolean {
  if (attacker.stats.range <= 0) return false;
  const { minModelDistPx, minEdgeDistPx } = getUnitsModelDistance(attacker, target);
  const rangePx = attacker.stats.range * gridSize;
  return minEdgeDistPx <= rangePx || minModelDistPx <= rangePx + 15;
}

/**
 * Checks if targetUnit is in melee range with attackerUnit.
 * In tabletop wargaming, units are in melee if they are in base-to-base contact (tangent)
 * OR within 1 grid square (50px / 1 inch) engagement range, OR if they successfully charged that turn.
 */
export function isUnitInMeleeRange(attacker: Unit, target: Unit, gridSize: number = DEFAULT_GRID_SIZE): boolean {
  const { minEdgeDistPx, minModelDistPx } = getUnitsModelDistance(attacker, target);
  if (attacker.hasCharged) {
    if (minEdgeDistPx <= 35 || minModelDistPx <= 110) return true;
  }
  return minEdgeDistPx <= gridSize || minModelDistPx <= 95;
}

/**
 * Finds a safe, non-overlapping destination for bot unit movement.
 * Enforces maximum step limit, stays on board, and tests candidates to guarantee no token intersections.
 */
export function findValidMovePositionForBot(
  unit: Unit,
  desiredPos: WorldPoint,
  allUnits: Unit[],
  maxStepPx: number = 120,
  worldWidth: number = 1200,
  worldHeight: number = 800
): WorldPoint {
  if (!unit.position) return desiredPos;
  const origin = unit.position;
  const fullDx = desiredPos.x - origin.x;
  const fullDy = desiredPos.y - origin.y;
  const fullDist = Math.hypot(fullDx, fullDy);

  if (fullDist < 1) return origin;

  const stepDist = Math.min(fullDist, maxStepPx);
  const angle = Math.atan2(fullDy, fullDx);
  const radius = getUnitCollisionRadius(unit);

  const candidateFractions = [1.0, 0.85, 0.7, 0.55, 0.4, 0.25];
  const anglePerturbations = [0, 0.25, -0.25, 0.5, -0.5, 0.75, -0.75, 1.0, -1.0, 1.3, -1.3];

  for (const frac of candidateFractions) {
    const dist = stepDist * frac;
    for (const dTheta of anglePerturbations) {
      const candAngle = angle + dTheta;
      const testX = Math.max(radius + 10, Math.min(worldWidth - radius - 10, Math.round(origin.x + Math.cos(candAngle) * dist)));
      const testY = Math.max(radius + 10, Math.min(worldHeight - radius - 10, Math.round(origin.y + Math.sin(candAngle) * dist)));

      const testUnit = moveUnit(unit, { x: testX, y: testY }, allUnits);
      const colCheck = checkUniversalTokenCollisions(testUnit.tokens || [], allUnits, unit.id);
      if (!colCheck.hasCollision) {
        return { x: testX, y: testY };
      }
    }
  }

  const directTarget = {
    x: Math.max(radius + 10, Math.min(worldWidth - radius - 10, Math.round(origin.x + Math.cos(angle) * stepDist))),
    y: Math.max(radius + 10, Math.min(worldHeight - radius - 10, Math.round(origin.y + Math.sin(angle) * stepDist)))
  };
  const tangentSpot = findNearestNonOverlappingPosition(unit, directTarget, allUnits, worldWidth, worldHeight);
  if (tangentSpot) {
    const distToTangent = Math.hypot(tangentSpot.x - origin.x, tangentSpot.y - origin.y);
    if (distToTangent <= maxStepPx * 1.15) {
      const testUnit = moveUnit(unit, tangentSpot, allUnits);
      const colCheck = checkUniversalTokenCollisions(testUnit.tokens || [], allUnits, unit.id);
      if (!colCheck.hasCollision) {
        return tangentSpot;
      }
    }
  }

  return origin;
}

/**
 * Computes the collision radius of a Unit.
 * For single-model units (monsters, leaders), this equals the base model radius.
 * For multi-model squad formations, this extends to the furthest outer rim of its member tokens.
 */
export function getUnitCollisionRadius(unit: Unit): number {
  const baseR = getUnitBaseRadius(unit);
  const modelCount = unit.stats?.modelCount || 1;
  if (!unit.tokens || unit.tokens.length <= 1) {
    if (modelCount > 1) {
      const offsets = calculateFormationOffsets(modelCount, unit.formation || 'circle', baseR);
      let maxReach = baseR;
      for (const off of offsets) {
        const dist = Math.hypot(off.offsetX, off.offsetY) + baseR;
        if (dist > maxReach) maxReach = dist;
      }
      return Math.round(maxReach);
    }
    return baseR;
  }
  let maxReach = baseR;
  for (const t of unit.tokens) {
    const offX = typeof t.offsetX === 'number' && t.offsetX !== 0
      ? t.offsetX
      : (unit.position ? t.x - unit.position.x : 0);
    const offY = typeof t.offsetY === 'number' && t.offsetY !== 0
      ? t.offsetY
      : (unit.position ? t.y - unit.position.y : 0);
    const tokR = t.radius || (t.baseWidth ? t.baseWidth / 2 : (t.size ? t.size / 2 : baseR));
    const dist = Math.hypot(offX, offY) + tokR;
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
  // BUG-014 & BUG-027: EPSILON tolerance permits touching/tangent bases without false-positive intersection
  const EPSILON = 0.75;

  // 1. Circle vs Circle
  if (shapeA === 'circle' && shapeB === 'circle') {
    const rA = wA / 2;
    const rB = wB / 2;
    const minCenterDist = rA + rB - EPSILON;
    return dx * dx + dy * dy < minCenterDist * minCenterDist;
  }

  // 2. Rect/Square vs Rect/Square
  const isRectA = shapeA === 'square' || shapeA === 'rectangle';
  const isRectB = shapeB === 'square' || shapeB === 'rectangle';
  if (isRectA && isRectB) {
    return dx < ((wA + wB) / 2 - EPSILON) && dy < ((hA + hB) / 2 - EPSILON);
  }

  // 3. Circle vs Rect/Square
  if ((shapeA === 'circle' && isRectB) || (shapeB === 'circle' && isRectA)) {
    const [cPos, cRadius, rPos, rW, rH] = shapeA === 'circle'
      ? [posA, wA / 2, posB, wB, hB]
      : [posB, wB / 2, posA, wA, hA];

    const clampedX = Math.max(rPos.x - rW / 2, Math.min(cPos.x, rPos.x + rW / 2));
    const clampedY = Math.max(rPos.y - rH / 2, Math.min(cPos.y, rPos.y + rH / 2));
    const distSq = (cPos.x - clampedX) * (cPos.x - clampedX) + (cPos.y - clampedY) * (cPos.y - clampedY);
    const minR = cRadius - EPSILON;
    return distSq < minR * minR;
  }

  // 4. Oval vs any other shape (Elliptical boundary approximation)
  const effectiveWA = shapeA === 'oval' ? wA * 0.95 : wA;
  const effectiveHA = shapeA === 'oval' ? hA * 0.95 : hA;
  const effectiveWB = shapeB === 'oval' ? wB * 0.95 : wB;
  const effectiveHB = shapeB === 'oval' ? hB * 0.95 : hB;

  const a = (effectiveWA + effectiveWB) / 2;
  const b = (effectiveHA + effectiveHB) / 2;
  return (dx * dx) / (a * a) + (dy * dy) / (b * b) < (1.0 - 0.01);
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
export function canAttachLeader(leader: Unit, bodyguard: Unit, zoneDepth: number = 200, worldWidth: number = 1200): boolean {
  if (leader.owner !== bodyguard.owner) return false;
  if (leader.id === bodyguard.id) return false;
  const isLeader = leader.traits?.includes('Leader') || leader.role === 'Leader' || leader.role === 'Legendary Leader' || leader.type === 'Character';
  const isInfantry = bodyguard.type === 'Infantry';
  if (!isLeader || !isInfantry) return false;
  if (leader.attachedTo || leader.embarkedIn || leader.inStrategicReserve) return false;
  if (bodyguard.embarkedIn || bodyguard.inStrategicReserve) return false;
  if (bodyguard.attachedUnits && bodyguard.attachedUnits.length >= 1) return false; // 1 leader per squad max

  // Infiltration rule: If bodyguard is deployed outside the deployment zone, leader must be able to infiltrate
  if (bodyguard.position && !isInsideDeploymentZone(bodyguard.position, bodyguard.owner, worldWidth, zoneDepth)) {
    if (!canUnitDeployOutsideZone(leader)) {
      return false;
    }
  }

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
  const isTransport = vehicle.traits?.includes('Transport') || vehicle.type === 'Vehicle' || vehicle.role === 'Vehicle / Monster';
  if (!isTransport) return false;
  if (infantry.embarkedIn || infantry.inStrategicReserve || infantry.attachedTo) return false;

  const maxCapacity = vehicle.carryCapacity ?? vehicle.stats?.carryCapacity ?? (vehicle.transportCapacity ? vehicle.transportCapacity * 5 : 6);
  const incomingModels = (infantry.stats?.modelCount || 1) + (infantry.attachedUnits?.length || 0);

  return (currentLoadModels + incomingModels) <= maxCapacity;
}

/**
 * Checks if an infantry squad can embark inside a transport vehicle, enforcing both capacity
 * and a 3" (150px) proximity requirement if the infantry unit is on the battlefield.
 */
export function canEmbarkWithDistance(
  infantry: Unit,
  vehicle: Unit,
  currentLoadModels: number = 0,
  maxDistancePx: number = 150
): { canEmbark: boolean; reason?: string; distancePx?: number } {
  if (!canEmbark(infantry, vehicle, currentLoadModels)) {
    return { canEmbark: false, reason: 'Capacity exceeded or invalid unit types.' };
  }

  // If infantry is deployed on the board, check proximity to vehicle
  if (infantry.position && vehicle.position) {
    const dist = getUnitsModelDistance(infantry, vehicle);
    if (dist.minEdgeDistPx > maxDistancePx) {
      const inches = Math.round((dist.minEdgeDistPx / DEFAULT_GRID_SIZE) * 10) / 10;
      return {
        canEmbark: false,
        reason: `Unit is ${inches}″ (${Math.round(dist.minEdgeDistPx)}px) away. Must be within 3″ (150px) of transport.`,
        distancePx: dist.minEdgeDistPx
      };
    }
    return { canEmbark: true, distancePx: dist.minEdgeDistPx };
  }

  return { canEmbark: true };
}

/**
 * Calculates a valid disembark position in an annular ring around a transport vehicle:
 * - Outside the vehicle's footprint (minDist = vehicleRadius + infantryRadius + 8px buffer)
 * - Within 3" of the vehicle (maxDist = vehicleRadius + 150px)
 * - Free of base collision with the vehicle, other units, and within board bounds.
 */
export function findValidDisembarkPosition(
  infantry: Unit,
  vehicle: Unit,
  allUnits: Unit[],
  worldWidth: number = 1200,
  worldHeight: number = 800
): WorldPoint | null {
  const vPos = vehicle.position || { x: 300, y: 300 };
  const vDims = getUnitBaseDimensions(vehicle);
  const vRadius = vDims.radius;
  const iDims = getUnitBaseDimensions(infantry);
  const iRadius = iDims.radius;

  // Min separation: clearance outside vehicle base
  const minDist = vRadius + iRadius + 8;
  // Max separation: 3 inches = 150px from vehicle base
  const maxDist = vRadius + 150;

  // Search angles around vehicle: 12 radial directions
  const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, -(3 * Math.PI) / 4, -Math.PI / 2, -Math.PI / 4,
                  Math.PI / 6, (5 * Math.PI) / 6, -(5 * Math.PI) / 6, -Math.PI / 6];
  // Search distances within the annular ring: close, mid, outer
  const distSteps = [minDist, minDist + 25, minDist + 55, minDist + 85, maxDist - 15];

  for (const dist of distSteps) {
    if (dist > maxDist) continue;
    for (const angle of angles) {
      const testX = Math.round(vPos.x + Math.cos(angle) * dist);
      const testY = Math.round(vPos.y + Math.sin(angle) * dist);

      // 1. Boundary check
      if (testX < iRadius || testX > worldWidth - iRadius || testY < iRadius || testY > worldHeight - iRadius) {
        continue;
      }

      // 2. Generate candidate tokens for infantry at (testX, testY)
      const offsets = calculateFormationOffsets(
        infantry.tokens?.length || infantry.stats.modelCount || 1,
        infantry.formation || 'circle',
        iRadius,
        iDims.width,
        iDims.height
      );

      const candidateTokens: Token[] = offsets.map((off, idx) => ({
        id: infantry.tokens?.[idx]?.id || `disembark_tok_${idx}`,
        unitId: infantry.id,
        x: testX + off.offsetX,
        y: testY + off.offsetY,
        offsetX: off.offsetX,
        offsetY: off.offsetY,
        rotation: 0,
        size: Math.max(iDims.width, iDims.height),
        radius: iRadius,
        baseShape: iDims.shape,
        baseWidth: iDims.width,
        baseHeight: iDims.height,
        currentLives: 1,
        maxLives: 1
      }));

      // 3. Collision check against all placed units (including vehicle)
      const colCheck = checkUniversalTokenCollisions(
        candidateTokens,
        allUnits,
        infantry.id
      );

      if (!colCheck.hasCollision) {
        return { x: testX, y: testY };
      }
    }
  }

  return null;
}

export interface ValidEngagementResult {
  valid: boolean;
  position: WorldPoint;
  reason?: string;
}

/**
 * Finds a valid, collision-free engagement position for a charger to engage targetUnit:
 * - Positions the charger in base-to-base tangent melee contact with targetUnit
 * - Searches around the perimeter in 15-degree steps (360 degrees) and varying tangent distance offsets
 * - Ensures no token overlaps with ANY non-attached unit or fellow squad members
 * - Ensures the charger actually ends in melee engagement range (<= 1.0 sq / 50px edge distance)
 * - Verifies the swept movement path does not cut through intervening models (without FLY)
 * - Returns { valid: true, position } if a legal position is found; { valid: false, position: originPos } otherwise.
 */
export function findValidEngagementPosition(
  charger: Unit,
  targetUnit: Unit,
  allUnits: Unit[],
  maxMoveDistancePx?: number,
  worldWidth: number = 1200,
  worldHeight: number = 800
): ValidEngagementResult {
  const originPos = charger.position;
  if (!originPos || !targetUnit.position) {
    return { valid: false, position: originPos || { x: 0, y: 0 }, reason: 'Missing unit positions' };
  }

  const targetRadius = getUnitCollisionRadius(targetUnit);
  const chargerRadius = getUnitCollisionRadius(charger);
  // Base tangent contact distance
  const baseContactDist = targetRadius + chargerRadius + 2;

  // Filter out charger and any attached leaders
  const attachedIds = new Set([charger.id, ...(charger.attachedUnits || [])]);
  const unitsToCheck = allUnits.filter(u => !attachedIds.has(u.id));

  const baseAngle = Math.atan2(targetUnit.position.y - originPos.y, targetUnit.position.x - originPos.x);

  // Search angles in 15-degree increments (0, +15, -15, +30, -30, ... up to 180 deg)
  const angleDeltas: number[] = [0];
  for (let step = 1; step <= 12; step++) {
    angleDeltas.push(step * 0.26, -step * 0.26);
  }

  // Distance buffers: test tangent (+0), then slightly further out (+4, +8, +14, +20px)
  // while ensuring charger remains in melee range
  const distBuffers = [0, 4, 8, 14, 20];

  for (const delta of angleDeltas) {
    const testAngle = baseAngle + delta;
    for (const buf of distBuffers) {
      const contactDist = baseContactDist + buf;
      const testX = Math.max(chargerRadius, Math.min(worldWidth - chargerRadius, Math.round(targetUnit.position.x - Math.cos(testAngle) * contactDist)));
      const testY = Math.max(chargerRadius, Math.min(worldHeight - chargerRadius, Math.round(targetUnit.position.y - Math.sin(testAngle) * contactDist)));

      const distMoved = Math.hypot(testX - originPos.x, testY - originPos.y);
      if (typeof maxMoveDistancePx === 'number' && distMoved > maxMoveDistancePx) {
        continue; // Exceeds roll distance
      }

      const testUnit = moveUnit(charger, { x: testX, y: testY }, allUnits);
      const colCheck = checkUniversalTokenCollisions(testUnit.tokens || [], unitsToCheck, charger.id);
      if (colCheck.hasCollision) {
        continue;
      }

      // Verify charger is in melee range of targetUnit
      if (!isUnitInMeleeRange(testUnit, targetUnit, DEFAULT_GRID_SIZE)) {
        continue;
      }

      // Verify path doesn't cut through screening units
      const pathCheck = checkPathCrossesUnits(
        charger,
        originPos,
        { x: testX, y: testY },
        allUnits,
        { isCharge: true, chargeTargetUnitId: targetUnit.id }
      );
      if (pathCheck.hasCollision) {
        continue;
      }

      return {
        valid: true,
        position: { x: testX, y: testY }
      };
    }
  }

  return {
    valid: false,
    position: originPos,
    reason: 'All engagement positions or paths are obstructed by terrain or models.'
  };
}

export interface AbandonShipModelResult {
  tokenId: string;
  isLeader: boolean;
  name: string;
  d20Roll: number;
  failed: boolean;
  d3Damage: number;
  livesRemaining: number;
  died: boolean;
}

export interface AbandonShipUnitReport {
  unitId: string;
  unitName: string;
  disembarkPosition: WorldPoint;
  totalModels: number;
  survivingModels: number;
  killedModels: number;
  totalDamage: number;
  models: AbandonShipModelResult[];
  squadWipedOut: boolean;
  leaderWipedOut?: boolean;
}

export interface AbandonShipResult {
  updatedUnits: Unit[];
  reports: AbandonShipUnitReport[];
  logs: { message: string; type: 'combat' | 'event' | 'info' }[];
}

/**
 * Abandon Ship Protocol:
 * When a transport vehicle is destroyed (lives <= 0) while carrying embarked units,
 * those units immediately disembark at a valid position within 3" of the wreck.
 * Every token in the disembarking unit (including attached leaders) rolls a d20:
 * - If d20 < 10: suffers a roll of a d3 of lives lost.
 * - If d20 >= 10: escapes unharmed.
 */
export function executeAbandonShipProtocol(
  destroyedVehicle: Unit,
  allUnits: Unit[],
  diceRoller?: (max: number) => number
): AbandonShipResult {
  const roll = diceRoller || ((max: number) => Math.floor(Math.random() * max) + 1);
  const reports: AbandonShipUnitReport[] = [];
  const logs: { message: string; type: 'combat' | 'event' | 'info' }[] = [];

  // Find squads/units directly embarked in this vehicle (excluding attached leaders who follow their bodyguard squad)
  const embarkedSquads = allUnits.filter(u => u.embarkedIn === destroyedVehicle.id && !u.attachedTo && u.stats.lives > 0);

  if (embarkedSquads.length === 0) {
    return { updatedUnits: allUnits, reports: [], logs: [] };
  }

  let currentUnits = [...allUnits];

  logs.push({
    message: `🚨 ABANDON SHIP PROTOCOL INITIATED! Transport [${destroyedVehicle.name}] was destroyed! Emergency evacuation commencing...`,
    type: 'event'
  });

  for (const squad of embarkedSquads) {
    const vPos = destroyedVehicle.position || { x: 300, y: 300 };
    // Find disembark position near wreck
    const disembarkPos = findValidDisembarkPosition(squad, destroyedVehicle, currentUnits) || {
      x: Math.max(50, Math.min(1150, vPos.x + 60)),
      y: Math.max(50, Math.min(750, vPos.y))
    };

    // Find attached leaders
    const attachedLeaders = currentUnits.filter(u =>
      u.stats.lives > 0 &&
      ((squad.attachedUnits && squad.attachedUnits.includes(u.id)) || u.attachedTo === squad.id)
    );

    // Re-attach leaders and stage squad on board
    let stagedLeaders: Unit[] = attachedLeaders.map(l => ({
      ...setUnitMutualState(l, 'attached', { leaderTargetId: squad.id, position: disembarkPos }),
      position: disembarkPos,
      embarkedIn: null
    }));

    let stagedSquad: Unit = {
      ...setUnitMutualState(squad, 'onBoard', { position: disembarkPos }),
      embarkedIn: null,
      hasCustomTokenPositions: false,
      pendingOriginalPosition: null,
      pendingOriginalTokens: null
    };

    // Replace in currentUnits to sync tokens properly
    currentUnits = currentUnits.map(u => {
      if (u.id === stagedSquad.id) return stagedSquad;
      const lead = stagedLeaders.find(l => l.id === u.id);
      if (lead) return lead;
      return u;
    });

    stagedSquad = syncUnitTokens(stagedSquad, currentUnits);

    const modelResults: AbandonShipModelResult[] = [];
    let squadDamage = 0;
    let killedCount = 0;

    // Roll d20 for each token in the unit (including attached leader)
    const processedTokens = (stagedSquad.tokens || []).map((tok, idx) => {
      const isLeader = !!tok.isLeaderToken;
      const matchingLeader = isLeader ? stagedLeaders.find(l => l.id === tok.unitId) : undefined;
      const modelName = isLeader
        ? (matchingLeader?.name || 'Attached Leader')
        : `${stagedSquad.name} Model #${idx + 1}`;

      const d20 = roll(20);
      const failed = d20 < 10;
      const d3Damage = failed ? roll(3) : 0;
      let newLives = tok.currentLives;
      let died = false;

      if (failed) {
        newLives = Math.max(0, tok.currentLives - d3Damage);
        if (newLives === 0) {
          died = true;
          killedCount++;
        }
        if (isLeader && matchingLeader) {
          matchingLeader.stats = {
            ...matchingLeader.stats,
            lives: Math.max(0, matchingLeader.stats.lives - d3Damage)
          };
          if (matchingLeader.stats.lives === 0) {
            matchingLeader.position = null;
            matchingLeader.tokens = [];
            matchingLeader.attachedTo = null;
          }
        } else {
          squadDamage += d3Damage;
        }
      }

      modelResults.push({
        tokenId: tok.id,
        isLeader,
        name: modelName,
        d20Roll: d20,
        failed,
        d3Damage,
        livesRemaining: newLives,
        died
      });

      return {
        ...tok,
        currentLives: newLives
      };
    });

    const survivingTokens = processedTokens.filter(t => t.currentLives > 0);
    const survivingSquadTokens = survivingTokens.filter(t => !t.isLeaderToken);

    // Recalculate squad lives
    const remainingSquadLives = survivingSquadTokens.reduce((sum, t) => sum + t.currentLives, 0);
    stagedSquad.stats = {
      ...stagedSquad.stats,
      lives: remainingSquadLives
    };

    const squadWipedOut = remainingSquadLives <= 0;
    let leaderWipedOut = false;

    if (squadWipedOut) {
      stagedSquad.position = null;
      stagedSquad.tokens = [];
      stagedSquad.stats.lives = 0;

      // If an attached leader survived, they emerge as a solo onBoard unit!
      stagedLeaders = stagedLeaders.map(l => {
        if (l.stats.lives > 0) {
          const soloLeader = setUnitMutualState(l, 'onBoard', { position: disembarkPos });
          soloLeader.attachedTo = null;
          return syncUnitTokens(soloLeader);
        } else {
          leaderWipedOut = true;
          return {
            ...l,
            stats: { ...l.stats, lives: 0 },
            position: null,
            tokens: [],
            attachedTo: null
          };
        }
      });
    } else {
      // Squad survived!
      stagedSquad.tokens = survivingTokens;
      // Sync surviving tokens with updated leader state
      stagedSquad = syncUnitTokens(stagedSquad, [...currentUnits, ...stagedLeaders]);
    }

    // Update currentUnits with the finalized squad and leaders
    currentUnits = currentUnits.map(u => {
      if (u.id === stagedSquad.id) return stagedSquad;
      const lead = stagedLeaders.find(l => l.id === u.id);
      if (lead) return lead;
      return u;
    });

    reports.push({
      unitId: stagedSquad.id,
      unitName: stagedSquad.name,
      disembarkPosition: disembarkPos,
      totalModels: processedTokens.length,
      survivingModels: survivingTokens.length,
      killedModels: killedCount,
      totalDamage: squadDamage,
      models: modelResults,
      squadWipedOut,
      leaderWipedOut
    });

    // Generate detailed logs
    logs.push({
      message: `💥 ${stagedSquad.name} emergency disembark at (${disembarkPos.x}, ${disembarkPos.y}):`,
      type: 'combat'
    });

    for (const m of modelResults) {
      if (m.failed) {
        logs.push({
          message: `  🎲 ${m.name}: Rolled ${m.d20Roll} (< 10: CRASH DAMAGE!) → Suffered ${m.d3Damage} lives lost (${m.livesRemaining} HP left)${m.died ? ' 💀 KILLED!' : ''}`,
          type: 'combat'
        });
      } else {
        logs.push({
          message: `  🎲 ${m.name}: Rolled ${m.d20Roll} (>= 10: SAFE!) → Evacuated unscathed.`,
          type: 'combat'
        });
      }
    }

    if (squadWipedOut) {
      logs.push({
        message: `💀 SQUAD WIPED OUT: All bodyguard models in ${stagedSquad.name} perished in the crash!`,
        type: 'combat'
      });
    } else {
      logs.push({
        message: `🛡️ ${stagedSquad.name} survivors rallied with ${survivingSquadTokens.length} models (${remainingSquadLives} HP remaining).`,
        type: 'info'
      });
    }
  }

  return {
    updatedUnits: currentUnits,
    reports,
    logs
  };
}

export const ENGAGEMENT_PROXIMITY_PX = 50; // 1 inch = 50px

/**
 * Validates normal movement enemy proximity (Engagement Range rule).
 * Normal moves cannot end within 1" (50px) of ANY enemy model. Only Charge moves can enter this range.
 */
export function validateNormalMovementEnemyProximity(
  unit: Unit,
  candidateTokens: Token[],
  allUnits: Unit[],
  minProximityPx: number = ENGAGEMENT_PROXIMITY_PX
): { valid: boolean; offendingEnemyUnit?: Unit; minDistancePx: number } {
  const enemyOwner = unit.owner === 'player1' ? 'player2' : 'player1';
  const enemyUnits = allUnits.filter(u =>
    u.owner === enemyOwner &&
    u.position &&
    u.stats.lives > 0 &&
    !u.attachedTo &&
    !u.embarkedIn &&
    !u.inStrategicReserve
  );

  let closestDist = Infinity;
  let closestEnemy: Unit | undefined;

  for (const enemy of enemyUnits) {
    const enemyLivingTokens = (enemy.tokens || []).filter(t => t.currentLives > 0);
    const eDims = getUnitBaseDimensions(enemy);
    const tokensToCheck = enemyLivingTokens.length > 0
      ? enemyLivingTokens
      : [{ x: enemy.position!.x, y: enemy.position!.y, radius: eDims.radius, size: Math.max(eDims.width, eDims.height) }];

    for (const candTok of candidateTokens) {
      const candRadius = candTok.radius || (candTok.size ? candTok.size / 2 : 20);
      for (const eTok of tokensToCheck) {
        const eRadius = eTok.radius || (eTok.size ? eTok.size / 2 : 20);
        const centerDist = Math.hypot(candTok.x - eTok.x, candTok.y - eTok.y);
        const edgeDist = Math.max(0, centerDist - (candRadius + eRadius));

        if (edgeDist < closestDist) {
          closestDist = edgeDist;
          closestEnemy = enemy;
        }

        if (edgeDist < minProximityPx) {
          return {
            valid: false,
            offendingEnemyUnit: enemy,
            minDistancePx: edgeDist
          };
        }
      }
    }
  }

  return { valid: true, minDistancePx: closestDist, offendingEnemyUnit: closestEnemy };
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
        tokens: [],
        hasCustomTokenPositions: false
      };
    case 'embarked':
      return {
        ...unit,
        inStrategicReserve: false,
        embarkedIn: payload?.vehicleId || null,
        attachedTo: null,
        position: null,
        tokens: [],
        hasCustomTokenPositions: false
      };
    case 'attached':
      return {
        ...unit,
        inStrategicReserve: false,
        embarkedIn: null,
        attachedTo: payload?.leaderTargetId || null,
        position: null,
        tokens: [],
        hasCustomTokenPositions: false
      };
    case 'onBoard':
    default: {
      const pos = payload?.position || unit.position || { x: 200, y: 200 };
      const updated = {
        ...unit,
        inStrategicReserve: false,
        embarkedIn: null,
        attachedTo: null,
        position: pos,
        hasCustomTokenPositions: false
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
    tokens: finalizedTokens,
    hasCustomTokenPositions: true
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

/**
 * Checks whether a unit possesses the FLY trait/keyword/ability.
 */
export function unitHasFlyTrait(unit: Unit): boolean {
  const checkStr = [
    unit.name,
    unit.type,
    unit.role,
    unit.description || '',
    ...(unit.passives || []),
    ...((unit as any).traits || []),
    ...((unit as any).keywords || []),
  ].join(' ').toLowerCase();

  return checkStr.includes('fly') || checkStr.includes('flying') || checkStr.includes('skimmer') || checkStr.includes('jump pack');
}

export interface PathCollisionResult {
  hasCollision: boolean;
  collidingUnit?: Unit;
  reason?: string;
}

/**
 * Validates whether moving a unit along a straight-line trajectory from `fromPos` to `toPos`
 * causes its swept base footprint to cut through any intervening units.
 * Units with FLY ignore intervening models during movement.
 */
export function checkPathCrossesUnits(
  unit: Unit,
  fromPos: WorldPoint,
  toPos: WorldPoint,
  allUnits: Unit[],
  options?: {
    ignoreUnitId?: string;
    isCharge?: boolean;
    chargeTargetUnitId?: string;
    stepSize?: number;
  }
): PathCollisionResult {
  if (unitHasFlyTrait(unit)) {
    return { hasCollision: false };
  }

  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) {
    return { hasCollision: false };
  }

  const stepPx = options?.stepSize || 15;
  const numSteps = Math.max(2, Math.ceil(dist / stepPx));

  const uDims = getUnitBaseDimensions(unit);
  const baseTokens: Token[] = (unit.tokens && unit.tokens.length > 0)
    ? unit.tokens.filter(t => t.currentLives > 0)
    : [{
        id: `${unit.id}-0`,
        unitId: unit.id,
        x: fromPos.x,
        y: fromPos.y,
        offsetX: 0,
        offsetY: 0,
        currentLives: unit.stats.lives,
        maxLives: unit.stats.lives,
        size: Math.max(uDims.width, uDims.height),
        radius: uDims.radius,
        baseShape: uDims.shape,
        baseWidth: uDims.width,
        baseHeight: uDims.height,
        rotation: 0
      }];

  // Filter obstacle units
  const obstacleUnits = allUnits.filter(u => {
    if (u.id === unit.id) return false;
    if (options?.ignoreUnitId && u.id === options.ignoreUnitId) return false;
    // Attached units (leader/bodyguard pairing) are part of the same combined unit
    if (unit.attachedUnits?.includes(u.id) || u.attachedUnits?.includes(unit.id)) return false;
    if (unit.attachedTo === u.id || u.attachedTo === unit.id) return false;
    if (options?.isCharge && options?.chargeTargetUnitId && u.id === options.chargeTargetUnitId) {
      return false; // charge target is the intended destination
    }
    if (u.embarkedIn || u.inStrategicReserve || !u.position || u.stats.lives <= 0) return false;

    // Friendly Infantry Pass-Through Rule: Friendly infantry/characters/battleline can move through fellow friendly models
    const isMovingInfantry = 
      unit.type === 'Infantry' || 
      unit.type === 'Character' || 
      unit.role === 'Battleline' || 
      unit.role === 'Infantry / Mounted' ||
      unit.role === 'Leader' ||
      unit.role === 'Legendary Leader';
    const isObstacleFriendlyInfantry = 
      (u.type === 'Infantry' || 
       u.type === 'Character' || 
       u.role === 'Battleline' || 
       u.role === 'Infantry / Mounted' ||
       u.role === 'Leader' ||
       u.role === 'Legendary Leader') && 
      u.owner === unit.owner;
    if (isMovingInfantry && isObstacleFriendlyInfantry) {
      return false;
    }

    return true;
  });

  // Sample discrete steps along path (excluding step 0 which is current position)
  for (let s = 1; s <= numSteps; s++) {
    const fraction = s / numSteps;
    const curCentroidX = fromPos.x + dx * fraction;
    const curCentroidY = fromPos.y + dy * fraction;

    const candidateTokens: Token[] = baseTokens.map(tok => ({
      ...tok,
      x: curCentroidX + (tok.offsetX || 0),
      y: curCentroidY + (tok.offsetY || 0),
      baseShape: tok.baseShape || uDims.shape,
      baseWidth: tok.baseWidth || uDims.width,
      baseHeight: tok.baseHeight || uDims.height,
      radius: tok.radius || uDims.radius,
      size: tok.size || Math.max(uDims.width, uDims.height)
    }));

    const col = checkUniversalTokenCollisions(candidateTokens, obstacleUnits, unit.id);
    if (col.hasCollision) {
      const collidingUnit = obstacleUnits.find(u => u.name === col.collidingUnitName || u.tokens?.some(t => t.id === col.collidingTokenName));
      return {
        hasCollision: true,
        collidingUnit,
        reason: col.reason || `Action blocked: Path crosses through ${col.collidingUnitName || 'another unit'}.`
      };
    }
  }

  return { hasCollision: false };
}

export interface DisembarkValidationResult {
  valid: boolean;
  reason?: string;
  offendingTokenIds?: string[];
}

/**
 * Calculates edge-to-edge distance between a token and a vehicle unit.
 */
export function getTokenDistanceToVehicleEdge(tok: Token, vehicle: Unit): number {
  const vDims = getUnitBaseDimensions(vehicle);
  const vTokens = (vehicle.tokens && vehicle.tokens.length > 0)
    ? vehicle.tokens.filter(t => t.currentLives > 0)
    : [{
        x: vehicle.position?.x ?? 0,
        y: vehicle.position?.y ?? 0,
        baseShape: vDims.shape,
        baseWidth: vDims.width,
        baseHeight: vDims.height,
        radius: vDims.radius,
        size: Math.max(vDims.width, vDims.height)
      }];

  const tokR = tok.radius || (tok.size ? tok.size / 2 : 20);
  let minEdgeDist = Infinity;

  for (const vTok of vTokens) {
    const vShape = vTok.baseShape || vDims.shape || 'circle';
    const vW = vTok.baseWidth || vDims.width;
    const vH = vTok.baseHeight || vDims.height;

    if (vShape === 'rectangle' || vShape === 'square') {
      const clampedX = Math.max(vTok.x - vW / 2, Math.min(tok.x, vTok.x + vW / 2));
      const clampedY = Math.max(vTok.y - vH / 2, Math.min(tok.y, vTok.y + vH / 2));
      const distCenterToEdge = Math.hypot(tok.x - clampedX, tok.y - clampedY);
      const edgeDist = Math.max(0, distCenterToEdge - tokR);
      if (edgeDist < minEdgeDist) minEdgeDist = edgeDist;
    } else {
      const vR = vTok.radius || vDims.radius || vW / 2;
      const centerDist = Math.hypot(tok.x - vTok.x, tok.y - vTok.y);
      const edgeDist = Math.max(0, centerDist - (tokR + vR));
      if (edgeDist < minEdgeDist) minEdgeDist = edgeDist;
    }
  }

  return minEdgeDist;
}

/**
 * Validates manual disembark placement (RULE-002):
 * 1. Each model must be within 3" (150px) edge-to-edge of the transport vehicle.
 * 2. Squad must maintain 2" (100px) unit coherency.
 * 3. Zero base overlap with any unit (including the transport vehicle).
 */
export function validateDisembarkPlacement(
  unit: Unit,
  vehicle: Unit,
  allUnits: Unit[],
  maxDistFromVehiclePx: number = 150,
  coherencyDistPx: number = 100
): DisembarkValidationResult {
  const livingTokens = (unit.tokens || []).filter(t => t.currentLives > 0);
  if (livingTokens.length === 0) {
    return { valid: true };
  }

  // 1. Check distance to vehicle for each model
  for (const tok of livingTokens) {
    const edgeDist = getTokenDistanceToVehicleEdge(tok, vehicle);
    if (edgeDist > maxDistFromVehiclePx + 2) { // 2px tolerance
      return {
        valid: false,
        reason: `Model ${tok.id} is placed ${(edgeDist / 50).toFixed(1)}" away from ${vehicle.name}, exceeding the 3" disembark limit.`,
        offendingTokenIds: [tok.id]
      };
    }
  }

  // 2. Coherency validation
  const coherency = validateUnitCoherency(unit, coherencyDistPx);
  if (!coherency.isCoherent) {
    return {
      valid: false,
      reason: `Squad has broken 2" unit coherency. Models must remain within 2" of squadmates.`,
      offendingTokenIds: coherency.offendingTokenIds
    };
  }

  // 3. Collision check with all other units (including the vehicle)
  const col = checkUniversalTokenCollisions(livingTokens, allUnits, unit.id);
  if (col.hasCollision) {
    return {
      valid: false,
      reason: col.reason || `Disembark placement overlaps with another unit's base.`
    };
  }

  return { valid: true };
}

/**
 * Section 2.1: Lives (L) & Bodies (U)
 * A unit's survivability is tracked as a pool of Lives (L), distributed across its battlefield bodies (U).
 * Life per body = L / U.
 * Returns both bodies remaining and total lives remaining as separate numbers.
 */
export function getUnitBodiesAndLives(unit: Unit): {
  livingBodies: number;
  totalBodies: number;
  remainingLives: number;
  maxLives: number;
  livesPerBody: number;
  displayString: string;
} {
  const livingTokens = (unit.tokens || []).filter(t => !t.isLeaderToken && t.currentLives > 0);
  const totalTokens = (unit.tokens || []).filter(t => !t.isLeaderToken);
  const totalBodies = totalTokens.length > 0 ? totalTokens.length : (unit.stats.modelCount || 1);
  const livingBodies = unit.tokens && unit.tokens.length > 0
    ? livingTokens.length
    : (unit.stats.lives > 0 ? (unit.stats.modelCount || 1) : 0);
  const remainingLives = unit.stats.lives;
  const maxLives = unit.stats.maxLives || unit.stats.lives;
  const livesPerBody = Math.max(1, Math.ceil(maxLives / totalBodies));

  return {
    livingBodies,
    totalBodies,
    remainingLives,
    maxLives,
    livesPerBody,
    displayString: `Bodies: ${livingBodies}/${totalBodies} (U) | Lives: ${remainingLives}/${maxLives} (L)`
  };
}
