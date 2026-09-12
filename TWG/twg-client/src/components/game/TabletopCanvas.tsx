import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, Grid as GridIcon, Magnet, 
  Crosshair, Compass, Shield, Target, Move, Sparkles, AlertCircle,
  Circle, LayoutGrid, AlignJustify, Layers, AlertTriangle
} from 'lucide-react';
import { Unit, Token, FormationType, WorldPoint, POI, SpecialTile, Phase, TerrainFeature, DeploymentZoneConfig, PaintedZone, MultiLevelStructure } from '../../types/game';
import { VfxOverlay } from './VfxOverlay';
import { 
  DEFAULT_GRID_SIZE, 
  worldDistance, 
  gridDistance, 
  snapToGrid, 
  calculateFormationOffsets,
  moveUnit,
  setUnitFormation,
  isInsideDeploymentZone,
  canUnitDeployOutsideZone,
  getUnitSize,
  getUnitBaseRadius,
  getUnitBaseDiameter,
  getUnitBaseDimensions,
  getUnitCollisionRadius,
  checkUnitCollision,
  checkUnitCollisionsWithAll,
  findNearestNonOverlappingPosition,
  validateUnitCoherency,
  checkUniversalTokenCollisions,
  validateNormalMovementEnemyProximity,
  checkPathCrossesUnits,
  ENGAGEMENT_PROXIMITY_PX
} from '../../engine/formationEngine';
import { vttDragBridge, DragDebugEntry } from '../../services/dragBridge';

interface TabletopCanvasProps {
  units: Unit[];
  pois: POI[];
  specialTiles: SpecialTile[];
  terrain?: TerrainFeature[];
  deploymentConfig?: DeploymentZoneConfig;
  backgroundImageUrl?: string;
  paintedZones?: PaintedZone[];
  structures?: MultiLevelStructure[];
  selectedUnitId: string | null;
  targetUnitId: string | null;
  activePhase: Phase;
  activePlayer: 'player1' | 'player2';
  onSelectUnit: (unitId: string | null) => void;
  onSelectTarget: (unitId: string | null) => void;
  onMoveUnit: (unitId: string, newPos: WorldPoint) => void;
  onMoveIndividualModel?: (unitId: string, tokenId: string, newPos: WorldPoint) => void;
  onDropUnitFromTray?: (unitId: string, dropPos: WorldPoint) => void;
  onChangeFormation?: (unitId: string, formation: FormationType) => void;
  onCanvasClick?: () => void;
  activeTool: 'select' | 'move' | 'measure' | 'target';
  zoomLevel?: number;
  onZoomChange?: (newZoom: number) => void;
  coherencyDistanceInches?: number;
  onMoveGroupTokens?: (updates: { unitId: string; tokenId: string; newPos: WorldPoint }[]) => void;
}

export const TabletopCanvas: React.FC<TabletopCanvasProps> = ({
  units,
  pois,
  specialTiles,
  terrain,
  deploymentConfig,
  backgroundImageUrl,
  paintedZones,
  structures,
  selectedUnitId,
  targetUnitId,
  activePhase,
  activePlayer,
  onSelectUnit,
  onSelectTarget,
  onMoveUnit,
  onMoveIndividualModel,
  onMoveGroupTokens,
  onDropUnitFromTray,
  onChangeFormation,
  onCanvasClick,
  activeTool,
  zoomLevel,
  onZoomChange,
  coherencyDistanceInches = 2
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Tabletop World Dimensions
  const WORLD_WIDTH = 1200;
  const WORLD_HEIGHT = 800;
  const GRID_SIZE = DEFAULT_GRID_SIZE;
  const p1ZoneWidth = deploymentConfig?.player1?.maxX ?? (GRID_SIZE * 4);
  const p2ZoneWidth = deploymentConfig ? (WORLD_WIDTH - deploymentConfig.player2.minX) : (GRID_SIZE * 4);

  // Viewport Transform (Pan & Zoom)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 30 });
  const [zoom, setZoom] = useState<number>(zoomLevel ?? 0.95);

  // Sync zoom when controlled externally
  useEffect(() => {
    if (typeof zoomLevel === 'number' && Math.abs(zoomLevel - zoom) > 0.01) {
      setZoom(zoomLevel);
    }
  }, [zoomLevel]);

  const updateZoom = (newZ: number) => {
    const clamped = Math.min(2.5, Math.max(0.4, Math.round(newZ * 100) / 100));
    setZoom(clamped);
    onZoomChange?.(clamped);
    return clamped;
  };

  // VTT Layer Settings
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [enableSnap, setEnableSnap] = useState<boolean>(false);
  const [showMeasurements, setShowMeasurements] = useState<boolean>(true);
  const [rejectedPlacementNotice, setRejectedPlacementNotice] = useState<string | null>(null);

  // Dragging State (Pan)
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Token Drag State (Cohesive squad movement or individual model movement)
  const [draggingUnitId, setDraggingUnitId] = useState<string | null>(null);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [dragStartWorld, setDragStartWorld] = useState<WorldPoint>({ x: 0, y: 0 });
  const [dragCurrentWorld, setDragCurrentWorld] = useState<WorldPoint>({ x: 0, y: 0 });
  const [dragInitialUnitPos, setDragInitialUnitPos] = useState<WorldPoint>({ x: 0, y: 0 });
  const [dragTokenInitialPos, setDragTokenInitialPos] = useState<WorldPoint>({ x: 0, y: 0 });

  // Marquee Box-Select & Multi-Token Selection State
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const [marqueeStart, setMarqueeStart] = useState<WorldPoint | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<WorldPoint | null>(null);
  const [isMarqueeDragging, setIsMarqueeDragging] = useState<boolean>(false);
  const [isGroupDragging, setIsGroupDragging] = useState<boolean>(false);
  const [groupDragInitialPositions, setGroupDragInitialPositions] = useState<Record<string, WorldPoint>>({});
  const [deploymentMode, setDeploymentMode] = useState<'formation' | 'manual'>('formation');

  // Custom Ruler Measurement State
  const [measureStart, setMeasureStart] = useState<WorldPoint | null>(null);
  const [measureCurrent, setMeasureCurrent] = useState<WorldPoint | null>(null);

  // Active selected and target units
  const selectedUnit = units.find(u => u.id === selectedUnitId && u.stats.lives > 0) || null;
  const targetUnit = units.find(u => u.id === targetUnitId && u.stats.lives > 0) || null;

  // Drag-from-Tray State (Drag unit card onto canvas)
  const [isDragOverCanvas, setIsDragOverCanvas] = useState<boolean>(false);
  const [dragOverPos, setDragOverPos] = useState<WorldPoint | null>(null);

  // Drag & Drop Live Diagnostic HUD State
  const [showDebugHud, setShowDebugHud] = useState<boolean>(true);
  const [debugHudData, setDebugHudData] = useState<{
    lastEvent: string;
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
    zoom: number;
    panX: number;
    panY: number;
    inZone: boolean;
    activeUnitName: string;
    activeDeployer: string;
  }>({
    lastEvent: 'IDLE',
    screenX: 0,
    screenY: 0,
    worldX: 0,
    worldY: 0,
    zoom: 1,
    panX: 40,
    panY: 30,
    inZone: false,
    activeUnitName: 'None',
    activeDeployer: activePlayer
  });

  // Subscribe to vttDragBridge events
  useEffect(() => {
    const unsub = vttDragBridge.subscribe((entry: DragDebugEntry) => {
      setDebugHudData(prev => ({
        ...prev,
        lastEvent: entry.eventType,
        activeUnitName: entry.unitName || prev.activeUnitName,
        screenX: entry.screenPos?.x ?? prev.screenX,
        screenY: entry.screenPos?.y ?? prev.screenY,
        worldX: entry.worldPos?.x ?? prev.worldX,
        worldY: entry.worldPos?.y ?? prev.worldY,
        inZone: entry.inZone ?? prev.inZone
      }));
    });
    return unsub;
  }, []);

  // Coordinate conversion: Screen Pixel -> World Continuous Coordinate
  const screenToWorld = useCallback((screenX: number, screenY: number): WorldPoint => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - pan.x) / zoom;
    const y = (screenY - rect.top - pan.y) / zoom;
    return { x: Math.round(x), y: Math.round(y) };
  }, [pan, zoom]);

  // Center canvas on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const initialPanX = (rect.width - WORLD_WIDTH * zoom) / 2;
      const initialPanY = (rect.height - WORLD_HEIGHT * zoom) / 2;
      setPan({ x: Math.max(10, initialPanX), y: Math.max(10, initialPanY) });
    }
  }, []);

  // Zoom Handler via Mouse Wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(2.5, Math.max(0.4, zoom * zoomFactor));

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseScreenX = e.clientX - rect.left;
    const mouseScreenY = e.clientY - rect.top;

    // Zoom centered around mouse position
    const newPanX = mouseScreenX - (mouseScreenX - pan.x) * (newZoom / zoom);
    const newPanY = mouseScreenY - (mouseScreenY - pan.y) * (newZoom / zoom);

    updateZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Canvas Mouse Down: Right-click Pan (Button 2), Middle click (Button 1), or Action
  const handleMouseDown = (e: React.MouseEvent) => {
    // 1. Right-click (button === 2) OR Middle-click (button === 1) OR modifier key initiates panning
    if (e.button === 2 || e.button === 1 || e.shiftKey || e.altKey) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Only left-click continues to game actions
    if (e.button !== 0) return;

    const worldPt = screenToWorld(e.clientX, e.clientY);

    // Measure tool
    if (activeTool === 'measure') {
      setMeasureStart(worldPt);
      setMeasureCurrent(worldPt);
      return;
    }

    // Start marquee select tracking on background / canvas ground
    setMarqueeStart(worldPt);
    setMarqueeCurrent(worldPt);
    setIsMarqueeDragging(false);
  };

  // Canvas Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    const worldPt = screenToWorld(e.clientX, e.clientY);

    if (activeTool === 'measure' && measureStart) {
      setMeasureCurrent(worldPt);
      return;
    }

    // Expand marquee selection box when dragging ground
    if (marqueeStart && !draggingUnitId) {
      if (worldDistance(marqueeStart, worldPt) > 5) {
        setIsMarqueeDragging(true);
        setMarqueeCurrent(worldPt);
      }
      return;
    }

    if (draggingUnitId) {
      setDragCurrentWorld(worldPt);
    }
  };

  // Canvas Mouse Up
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (activeTool === 'measure') {
      setMeasureStart(null);
      setMeasureCurrent(null);
    }

    // Marquee Selection Finalization
    if (isMarqueeDragging && marqueeStart && marqueeCurrent) {
      const minX = Math.min(marqueeStart.x, marqueeCurrent.x);
      const maxX = Math.max(marqueeStart.x, marqueeCurrent.x);
      const minY = Math.min(marqueeStart.y, marqueeCurrent.y);
      const maxY = Math.max(marqueeStart.y, marqueeCurrent.y);

      // Select tokens belonging to activePlayer units within marquee bounds
      const matchedTokens: { unitId: string; tokenId: string }[] = [];
      units.forEach(u => {
        if (u.owner === activePlayer && u.stats.lives > 0 && u.position) {
          (u.tokens || []).forEach(t => {
            if (t.x >= minX && t.x <= maxX && t.y >= minY && t.y <= maxY) {
              matchedTokens.push({ unitId: u.id, tokenId: t.id });
            }
          });
        }
      });

      if (matchedTokens.length > 0) {
        setSelectedTokenIds(matchedTokens.map(m => m.tokenId));
        onSelectUnit(matchedTokens[0].unitId);
      } else {
        setSelectedTokenIds([]);
      }

      setMarqueeStart(null);
      setMarqueeCurrent(null);
      setIsMarqueeDragging(false);
      return;
    }

    // Single click on empty canvas: clear multi-selection
    if (marqueeStart && !isMarqueeDragging) {
      setSelectedTokenIds([]);
      setMarqueeStart(null);
      setMarqueeCurrent(null);
      onCanvasClick?.();
    }

    if (draggingUnitId) {
      const unit = units.find(u => u.id === draggingUnitId);
      if (!unit) {
        setDraggingUnitId(null);
        setDraggingTokenId(null);
        setIsGroupDragging(false);
        return;
      }

      // Calculate final dropped world coordinate
      const deltaX = dragCurrentWorld.x - dragStartWorld.x;
      const deltaY = dragCurrentWorld.y - dragStartWorld.y;

      // Case 1: Multi-Token Group Move
      if (isGroupDragging && selectedTokenIds.length > 1) {
        let hasAnyCollision = false;

        // Verify universal collision across all proposed token positions
        units.forEach(u => {
          (u.tokens || []).forEach(t => {
            if (selectedTokenIds.includes(t.id)) {
              const initPos = groupDragInitialPositions[t.id] || { x: t.x, y: t.y };
              const targetX = Math.max(16, Math.min(WORLD_WIDTH - 16, initPos.x + deltaX));
              const targetY = Math.max(16, Math.min(WORLD_HEIGHT - 16, initPos.y + deltaY));
              const candidate = [{ ...t, x: targetX, y: targetY }];
              const col = checkUniversalTokenCollisions(candidate, units, u.id, t.id);
              if (col.hasCollision) {
                hasAnyCollision = true;
              }
            }
          });
        });

        if (hasAnyCollision) {
          setRejectedPlacementNotice(
            `⚠️ Group Placement Rejected: Base overlap detected! Models may touch tangent base-to-base, but visual bases cannot intersect.`
          );
          setTimeout(() => setRejectedPlacementNotice(null), 4500);
          setDraggingUnitId(null);
          setDraggingTokenId(null);
          setIsGroupDragging(false);
          setGroupDragInitialPositions({});
          return;
        }

        // Apply group movement to all selected tokens atomically
        const updates: { unitId: string; tokenId: string; newPos: WorldPoint }[] = [];
        units.forEach(u => {
          (u.tokens || []).forEach(t => {
            if (selectedTokenIds.includes(t.id)) {
              const initPos = groupDragInitialPositions[t.id] || { x: t.x, y: t.y };
              let targetX = initPos.x + deltaX;
              let targetY = initPos.y + deltaY;
              if (enableSnap) {
                const snapped = snapToGrid({ x: targetX, y: targetY }, GRID_SIZE, true);
                targetX = snapped.x;
                targetY = snapped.y;
              }
              targetX = Math.max(16, Math.min(WORLD_WIDTH - 16, targetX));
              targetY = Math.max(16, Math.min(WORLD_HEIGHT - 16, targetY));
              updates.push({ unitId: u.id, tokenId: t.id, newPos: { x: targetX, y: targetY } });
            }
          });
        });

        if (onMoveGroupTokens) {
          onMoveGroupTokens(updates);
        } else if (onMoveIndividualModel) {
          updates.forEach(up => onMoveIndividualModel(up.unitId, up.tokenId, up.newPos));
        }

        setIsGroupDragging(false);
        setGroupDragInitialPositions({});
        setDraggingUnitId(null);
        setDraggingTokenId(null);
        return;
      }

      // Case 2: Moving an individual model/token in Deployment or Movement phase
      if (draggingTokenId && onMoveIndividualModel) {
        let targetX = dragTokenInitialPos.x + deltaX;
        let targetY = dragTokenInitialPos.y + deltaY;
        if (enableSnap) {
          const snapped = snapToGrid({ x: targetX, y: targetY }, GRID_SIZE, true);
          targetX = snapped.x;
          targetY = snapped.y;
        }
        targetX = Math.max(16, Math.min(WORLD_WIDTH - 16, targetX));
        targetY = Math.max(16, Math.min(WORLD_HEIGHT - 16, targetY));

        const movingToken = unit.tokens?.find(t => t.id === draggingTokenId);
        if (movingToken) {
          const candidate = [{ ...movingToken, x: targetX, y: targetY }];

          // Deployment phase zone check
          if (activePhase === 'Deployment') {
            const zoneDepth = unit.owner === 'player1' ? p1ZoneWidth : p2ZoneWidth;
            const inZone = isInsideDeploymentZone({ x: targetX, y: targetY }, unit.owner, WORLD_WIDTH, zoneDepth);
            if (!canUnitDeployOutsideZone(unit) && !inZone) {
              setRejectedPlacementNotice(
                `⚠️ Placement Rejected: Model cannot deploy outside your designated deployment zone!`
              );
              setTimeout(() => setRejectedPlacementNotice(null), 4500);
              setDraggingUnitId(null);
              setDraggingTokenId(null);
              return;
            }
          }

          // Movement phase: 1" enemy proximity check (BUG-019)
          if (activePhase === 'Movement') {
            const proxCheck = validateNormalMovementEnemyProximity(unit, candidate, units);
            if (!proxCheck.valid) {
              setRejectedPlacementNotice(
                `⛔ Placement Rejected: Model cannot end within 1" (50px) of enemy ${proxCheck.offendingEnemyUnit?.name}! (Only Charge can enter engagement range).`
              );
              setTimeout(() => setRejectedPlacementNotice(null), 4500);
              setDraggingUnitId(null);
              setDraggingTokenId(null);
              return;
            }
          }

          // Universal Collision Check (No base overlap, touching allowed)
          const colCheck = checkUniversalTokenCollisions(candidate, units, unit.id, draggingTokenId);
          if (colCheck.hasCollision) {
            setRejectedPlacementNotice(
              `⚠️ Placement Rejected: Model base overlaps with ${colCheck.collidingUnitName}! Models may touch base-to-base, but cannot overlap.`
            );
            setTimeout(() => setRejectedPlacementNotice(null), 4500);
            setDraggingUnitId(null);
            setDraggingTokenId(null);
            return;
          }

          // Swept path collision check (BUG-024): Cannot cross through other units unless FLY
          if (activePhase === 'Movement' && !unit.isPendingDisembarkConfirm) {
            const pathCheck = checkPathCrossesUnits(
              unit,
              dragTokenInitialPos,
              { x: targetX, y: targetY },
              units,
              { ignoreUnitId: unit.id }
            );
            if (pathCheck.hasCollision) {
              setRejectedPlacementNotice(
                `⛔ Move Blocked: Model path cuts through ${pathCheck.collidingUnit?.name || 'another unit'}! Units cannot move through other models without the FLY trait.`
              );
              setTimeout(() => setRejectedPlacementNotice(null), 4500);
              setDraggingUnitId(null);
              setDraggingTokenId(null);
              return;
            }
          }
        }

        onMoveIndividualModel(unit.id, draggingTokenId, { x: targetX, y: targetY });
        setDraggingUnitId(null);
        setDraggingTokenId(null);
        return;
      }

      // Case 3: Moving the entire squad as a block
      let targetX = dragInitialUnitPos.x + deltaX;
      let targetY = dragInitialUnitPos.y + deltaY;

      // Snapping option
      if (enableSnap) {
        const snapped = snapToGrid({ x: targetX, y: targetY }, GRID_SIZE, true);
        targetX = snapped.x;
        targetY = snapped.y;
      }

      // Clamp within map bounds taking unit collision radius into account
      const collisionRadius = getUnitCollisionRadius(unit);
      targetX = Math.max(collisionRadius, Math.min(WORLD_WIDTH - collisionRadius, targetX));
      targetY = Math.max(collisionRadius, Math.min(WORLD_HEIGHT - collisionRadius, targetY));

      const canBypassZone = canUnitDeployOutsideZone(unit);

      // Hard Deployment Zone Restriction Check
      if (activePhase === 'Deployment') {
        const zoneDepth = unit.owner === 'player1' ? p1ZoneWidth : p2ZoneWidth;
        const inZone = isInsideDeploymentZone({ x: targetX, y: targetY }, unit.owner, WORLD_WIDTH, zoneDepth);

        if (!canBypassZone && !inZone) {
          // Reject placement: Return the unit to its previous valid position
          setRejectedPlacementNotice(
            `⚠️ Placement Rejected: ${unit.name} cannot deploy outside your designated deployment zone (${unit.owner === 'player1' ? `West: x ≤ ${p1ZoneWidth}px` : `East: x ≥ ${WORLD_WIDTH - p2ZoneWidth}px`})! Units require the explicit 'DEPLOY_OUTSIDE_ZONE' trait to deploy forward.`
          );
          setTimeout(() => setRejectedPlacementNotice(null), 5000);
          setDraggingUnitId(null);
          setDraggingTokenId(null);
          return;
        }
      }

      // Universal Collision Check for entire squad
      let candidateTokens: Token[];
      if (unit.hasCustomTokenPositions && unit.tokens && unit.tokens.length > 0) {
        candidateTokens = unit.tokens.map(t => ({
          ...t,
          x: targetX + (t.offsetX || 0),
          y: targetY + (t.offsetY || 0)
        }));
      } else {
        const { width, height, radius, shape } = getUnitBaseDimensions(unit);
        candidateTokens = calculateFormationOffsets(
          unit.tokens?.length || unit.stats.modelCount || 1,
          unit.formation || 'circle',
          radius,
          width,
          height
        ).map((off, idx) => ({
          id: unit.tokens?.[idx]?.id || `tok_${idx}`,
          unitId: unit.id,
          x: targetX + off.offsetX,
          y: targetY + off.offsetY,
          offsetX: off.offsetX,
          offsetY: off.offsetY,
          rotation: 0,
          size: Math.max(width, height),
          baseShape: unit.baseShape || shape,
          baseWidth: unit.baseWidth || width,
          baseHeight: unit.baseHeight || height,
          currentLives: 1,
          maxLives: 1
        }));
      }

      // Movement phase: 1" enemy proximity check (BUG-019)
      if (activePhase === 'Movement') {
        const proxCheck = validateNormalMovementEnemyProximity(unit, candidateTokens, units);
        if (!proxCheck.valid) {
          setRejectedPlacementNotice(
            `⛔ Placement Rejected: Normal move cannot end within 1" (50px) of enemy ${proxCheck.offendingEnemyUnit?.name}! (Only Charge can enter engagement range).`
          );
          setTimeout(() => setRejectedPlacementNotice(null), 4500);
          setDraggingUnitId(null);
          setDraggingTokenId(null);
          return;
        }
      }

      const squadColCheck = checkUniversalTokenCollisions(candidateTokens, units, unit.id);
      if (squadColCheck.hasCollision) {
        setRejectedPlacementNotice(
          `⚠️ Placement Rejected: Squad model base overlaps with ${squadColCheck.collidingUnitName}! Models may touch base-to-base, but cannot overlap.`
        );
        setTimeout(() => setRejectedPlacementNotice(null), 4500);
        setDraggingUnitId(null);
        setDraggingTokenId(null);
        return;
      }

      // Swept path collision check (BUG-024): Cannot cross through other units unless FLY
      if (activePhase === 'Movement') {
        const pathCheck = checkPathCrossesUnits(unit, dragInitialUnitPos, { x: targetX, y: targetY }, units);
        if (pathCheck.hasCollision) {
          setRejectedPlacementNotice(
            `⛔ Move Blocked: Path cuts through ${pathCheck.collidingUnit?.name || 'an intervening unit'}! Units cannot move through other models without the FLY trait.`
          );
          setTimeout(() => setRejectedPlacementNotice(null), 4500);
          setDraggingUnitId(null);
          setDraggingTokenId(null);
          return;
        }
      }

      onMoveUnit(draggingUnitId, { x: targetX, y: targetY });
      setDraggingUnitId(null);
      setDraggingTokenId(null);
    }
  };

  // Start dragging the entire formed squad container / group anchor (BUG-007)
  const handleSquadGroupMouseDown = (e: React.MouseEvent, unit: Unit) => {
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    if (e.button !== 0) return;
    e.stopPropagation();

    if (activeTool === 'target' || (selectedUnit && unit.owner !== selectedUnit.owner)) {
      onSelectTarget(unit.id);
      return;
    }

    onSelectUnit(unit.id);
    setSelectedTokenIds((unit.tokens || []).map(t => t.id));

    const canDrag = (unit.owner === activePlayer || (activePhase === 'Deployment' && unit.isPendingDeploymentConfirm) || unit.isPendingDisembarkConfirm) && (
      activePhase === 'Deployment' || 
      (activePhase === 'Movement' && (!unit.hasMoved || unit.isPendingMoveConfirm || unit.isPendingDisembarkConfirm))
    );

    if (canDrag && unit.position) {
      const worldPt = screenToWorld(e.clientX, e.clientY);
      setDraggingUnitId(unit.id);
      setDraggingTokenId(null);
      setIsGroupDragging(false);
      setGroupDragInitialPositions({});
      setDragStartWorld(worldPt);
      setDragCurrentWorld(worldPt);
      setDragInitialUnitPos(unit.position);
    }
  };

  // Start dragging a unit's token
  const handleTokenMouseDown = (e: React.MouseEvent, unit: Unit, token: Token) => {
    // 1. If Right-click (button === 2) or Middle-click (button === 1): PAN the canvas view!
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Only left-click (button === 0) handles selection and unit movement
    if (e.button !== 0) return;

    e.stopPropagation();

    // If Target tool or selecting enemy in Combat phases
    if (activeTool === 'target' || (selectedUnit && unit.owner !== selectedUnit.owner)) {
      onSelectTarget(unit.id);
      return;
    }

    // Select unit
    onSelectUnit(unit.id);

    // Can only drag own units during Deployment or Movement phase
    const canDrag = (unit.owner === activePlayer || (activePhase === 'Deployment' && unit.isPendingDeploymentConfirm) || unit.isPendingDisembarkConfirm) && (
      activePhase === 'Deployment' || 
      (activePhase === 'Movement' && (!unit.hasMoved || unit.isPendingMoveConfirm || unit.isPendingDisembarkConfirm))
    );

    // Double-click on any token selects the whole squad for group movement!
    if (e.detail === 2) {
      onSelectUnit(unit.id);
      setSelectedTokenIds((unit.tokens || []).map(t => t.id));
      return;
    }

    if (canDrag && unit.position) {
      const worldPt = screenToWorld(e.clientX, e.clientY);
      setDraggingUnitId(unit.id);
      setDragStartWorld(worldPt);
      setDragCurrentWorld(worldPt);
      setDragInitialUnitPos(unit.position);

      // In Deployment phase: check deploymentMode ('formation' vs 'manual')
      if (activePhase === 'Deployment') {
        if (deploymentMode === 'manual' && unit.tokens && unit.tokens.length > 1) {
          setIsGroupDragging(false);
          setGroupDragInitialPositions({});
          setDraggingTokenId(token.id);
          setDragTokenInitialPos({ x: token.x, y: token.y });
          setSelectedTokenIds([token.id]);
        } else {
          setIsGroupDragging(false);
          setGroupDragInitialPositions({});
          setDraggingTokenId(null);
          setSelectedTokenIds((unit.tokens || []).map(t => t.id));
        }
      } else if (selectedTokenIds.includes(token.id) && selectedTokenIds.length > 1) {
        // If clicking a token that is already part of a multi-token selection, group drag!
        setIsGroupDragging(true);
        const initialPositions: Record<string, WorldPoint> = {};
        units.forEach(u => {
          (u.tokens || []).forEach(t => {
            if (selectedTokenIds.includes(t.id)) {
              initialPositions[t.id] = { x: t.x, y: t.y };
            }
          });
        });
        setGroupDragInitialPositions(initialPositions);
        setDraggingTokenId(token.id);
        setDragTokenInitialPos({ x: token.x, y: token.y });
      } else {
        // Single model selection & move
        setIsGroupDragging(false);
        setGroupDragInitialPositions({});
        setSelectedTokenIds([token.id]);

        // In Movement phase, moving a single model moves only that model
        if (activePhase === 'Movement' && unit.tokens && unit.tokens.length > 1) {
          setDraggingTokenId(token.id);
          setDragTokenInitialPos({ x: token.x, y: token.y });
        } else {
          setDraggingTokenId(null);
        }
      }
    }
  };

  // Reset view helper
  const handleResetView = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const defaultZoom = 0.9;
      updateZoom(defaultZoom);
      setPan({
        x: (rect.width - WORLD_WIDTH * defaultZoom) / 2,
        y: (rect.height - WORLD_HEIGHT * defaultZoom) / 2
      });
    }
  };

  // Calculate live drag distance for ruler readout
  const dragDistancePx = draggingUnitId ? worldDistance(dragInitialUnitPos, {
    x: dragInitialUnitPos.x + (dragCurrentWorld.x - dragStartWorld.x),
    y: dragInitialUnitPos.y + (dragCurrentWorld.y - dragStartWorld.y)
  }) : 0;
  const dragDistanceSquares = (dragDistancePx / GRID_SIZE).toFixed(1);

  // Check if current drag destination violates deployment zone restrictions
  const draggingUnit = draggingUnitId ? units.find(u => u.id === draggingUnitId) : null;
  const ghostTargetPos: WorldPoint | null = draggingUnitId ? {
    x: dragInitialUnitPos.x + (dragCurrentWorld.x - dragStartWorld.x),
    y: dragInitialUnitPos.y + (dragCurrentWorld.y - dragStartWorld.y)
  } : null;

  const isDraggingOutOfZone = !!(
    activePhase === 'Deployment' &&
    draggingUnit &&
    ghostTargetPos &&
    !canUnitDeployOutsideZone(draggingUnit) &&
    !isInsideDeploymentZone(ghostTargetPos, draggingUnit.owner, WORLD_WIDTH, draggingUnit.owner === 'player1' ? p1ZoneWidth : p2ZoneWidth)
  );
  // Canvas Drag Over (Drag-from-Tray)
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverCanvas) setIsDragOverCanvas(true);

    const worldPt = screenToWorld(e.clientX, e.clientY);
    setDragOverPos(worldPt);

    const unitId = vttDragBridge.getDraggedUnitId();
    const unit = unitId ? units.find(u => u.id === unitId) : null;
    const deployer = unit?.owner || activePlayer;
    const zoneDepth = deployer === 'player1' ? p1ZoneWidth : p2ZoneWidth;
    const inZone = isInsideDeploymentZone(worldPt, deployer, WORLD_WIDTH, zoneDepth);

    setDebugHudData({
      lastEvent: 'DRAG_OVER',
      screenX: Math.round(e.clientX),
      screenY: Math.round(e.clientY),
      worldX: worldPt.x,
      worldY: worldPt.y,
      zoom,
      panX: Math.round(pan.x),
      panY: Math.round(pan.y),
      inZone,
      activeUnitName: unit?.name || 'Unit',
      activeDeployer: deployer
    });
  };

  const handleCanvasDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOverCanvas(true);
    const worldPt = screenToWorld(e.clientX, e.clientY);
    setDragOverPos(worldPt);

    const unitId = vttDragBridge.getDraggedUnitId();
    const unit = unitId ? units.find(u => u.id === unitId) : null;
    vttDragBridge.log({
      eventType: 'DRAG_ENTER',
      unitId: unitId || undefined,
      unitName: unit?.name,
      screenPos: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
      worldPos: worldPt,
      zoom,
      pan,
      message: `Drag entered canvas at world (${worldPt.x}, ${worldPt.y})`
    });
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      setIsDragOverCanvas(false);
      setDragOverPos(null);
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCanvas(false);
    setDragOverPos(null);

    let unitId = vttDragBridge.getDraggedUnitId();
    const rawData = e.dataTransfer.getData('text/plain');
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        if (parsed?.unitId) unitId = parsed.unitId;
        else if (typeof parsed === 'string') unitId = parsed;
      } catch {
        if (!unitId) unitId = rawData;
      }
    }

    const unit = units.find(u => u.id === unitId);
    let worldPt = screenToWorld(e.clientX, e.clientY);
    if (enableSnap) {
      worldPt = snapToGrid(worldPt, GRID_SIZE, true);
    }

    if (!unit) {
      vttDragBridge.log({
        eventType: 'DROP_REJECTED',
        screenPos: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
        worldPos: worldPt,
        message: `Drop failed: No unit found for ID "${unitId}"`
      });
      return;
    }

    // Clamp inside map bounds taking collision radius into account
    const collisionRadius = getUnitCollisionRadius(unit);
    worldPt.x = Math.max(collisionRadius, Math.min(WORLD_WIDTH - collisionRadius, worldPt.x));
    worldPt.y = Math.max(collisionRadius, Math.min(WORLD_HEIGHT - collisionRadius, worldPt.y));

    // Hard Deployment Zone Restriction Check
    if (activePhase === 'Deployment') {
      const canBypass = canUnitDeployOutsideZone(unit);
      const zoneDepth = unit.owner === 'player1' ? p1ZoneWidth : p2ZoneWidth;
      const inZone = isInsideDeploymentZone(worldPt, unit.owner, WORLD_WIDTH, zoneDepth);

      vttDragBridge.log({
        eventType: inZone || canBypass ? 'DROP_SUCCESS' : 'DROP_REJECTED',
        unitId: unit.id,
        unitName: unit.name,
        screenPos: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
        worldPos: worldPt,
        inZone,
        zoom,
        pan,
        zoneInfo: unit.owner === 'player1' ? `West: x ≤ ${p1ZoneWidth}px` : `East: x ≥ ${WORLD_WIDTH - p2ZoneWidth}px`,
        message: inZone || canBypass
          ? `Deployed ${unit.name} to (${worldPt.x}, ${worldPt.y})`
          : `Placement Rejected: (${worldPt.x}, ${worldPt.y}) is outside ${unit.owner} deployment zone`
      });

      if (!canBypass && !inZone) {
        setRejectedPlacementNotice(
          `⚠️ Placement Rejected: ${unit.name} cannot deploy outside your designated deployment zone (${unit.owner === 'player1' ? `West: x ≤ ${p1ZoneWidth}px` : `East: x ≥ ${WORLD_WIDTH - p2ZoneWidth}px`})! Requires DEPLOY_OUTSIDE_ZONE trait.`
        );
        setTimeout(() => setRejectedPlacementNotice(null), 5000);
        return;
      }
    }

    vttDragBridge.endDrag();
    onDropUnitFromTray?.(unit.id, worldPt);
  };

  return (
    <div 
      ref={containerRef}
      onContextMenu={e => e.preventDefault()}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragEnter={handleCanvasDragEnter}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
      className={`relative w-full h-full bg-[#07090e] overflow-hidden select-none ${
        isPanning || activeTool === 'move' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
      }`}
    >
      {/* Real-time Drag & Drop Diagnostic HUD */}
      {showDebugHud && (
        <div className="absolute top-2 left-16 z-40 bg-black/90 border border-emerald-500/70 rounded-lg p-2 font-mono text-[10px] text-emerald-300 shadow-xl space-y-1 select-none pointer-events-auto backdrop-blur-sm max-w-sm">
          <div className="flex items-center justify-between space-x-3 border-b border-emerald-800/60 pb-0.5">
            <span className="font-bold text-white flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>DND DIAGNOSTIC HUD</span>
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="text-[9px] text-emerald-400 font-bold uppercase">{debugHudData.lastEvent || 'IDLE'}</span>
              <button 
                onClick={() => setShowDebugHud(false)} 
                className="text-zinc-500 hover:text-white px-1"
                title="Hide HUD"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-zinc-300">
            <div>Screen: <span className="text-white font-bold">{debugHudData.screenX}, {debugHudData.screenY}</span></div>
            <div>World: <span className="text-amber-400 font-bold">{debugHudData.worldX}, {debugHudData.worldY}</span></div>
            <div>Zoom: <span className="text-sky-300 font-bold">{Math.round(zoom * 100)}%</span></div>
            <div>Pan: <span className="text-sky-300 font-bold">({Math.round(pan.x)}, {Math.round(pan.y)})</span></div>
            <div>Active Unit: <span className="text-amber-300 truncate max-w-[100px] block">{debugHudData.activeUnitName}</span></div>
            <div>Zone Test: <span className={debugHudData.inZone ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {debugHudData.inZone ? '✓ IN ZONE' : '✗ OUT OF ZONE'}
            </span></div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VTT Canvas Scene Container (Subject to Pan & Zoom transforms)  */}
      {/* ------------------------------------------------------------- */}
      <div
        onDragEnter={handleCanvasDragEnter}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: `${WORLD_WIDTH}px`,
          height: `${WORLD_HEIGHT}px`,
        }}
        className="absolute transition-transform duration-75 ease-out shadow-[0_0_80px_rgba(0,0,0,0.9)] rounded-xl border-4 border-[#242b3b]"
      >
        {/* ========================================================= */}
        {/* LAYER 1: BackgroundLayer (Map Terrain, POIs, Environment) */}
        {/* ========================================================= */}
        <div 
          data-layer="background"
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 30% 35%, rgba(35, 65, 38, 0.8), transparent 60%),
              radial-gradient(ellipse at 70% 65%, rgba(65, 45, 30, 0.8), transparent 60%),
              radial-gradient(ellipse at 50% 50%, rgba(20, 28, 40, 0.9), transparent 75%),
              linear-gradient(135deg, #131b14 0%, #111620 50%, #1a1412 100%)
            `
          }}
        >
          {/* Custom Uploaded Background Image */}
          {backgroundImageUrl && (
            <img
              src={backgroundImageUrl}
              alt="Battlefield Map"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none opacity-85"
            />
          )}

          {/* Subtle tactical contour lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
            <defs>
              <pattern id="contours" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 0 50 Q 25 30, 50 50 T 100 50" fill="none" stroke="#fff" strokeWidth="1" />
                <path d="M 0 20 Q 35 40, 70 20 T 100 20" fill="none" stroke="#fff" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#contours)" />
          </svg>

          {/* Painted Zones & Obstacles */}
          {paintedZones && paintedZones.map(zone => {
            const zoneStyles: Record<string, { bg: string; border: string; text: string }> = {
              Impassable: { bg: 'rgba(239, 68, 68, 0.25)', border: '#ef4444', text: '⛔ Impassable' },
              DifficultTerrain: { bg: 'rgba(245, 158, 11, 0.22)', border: '#f59e0b', text: '⚠️ Difficult Terrain (-2 Mv)' },
              DeploymentP1: { bg: 'rgba(244, 63, 94, 0.20)', border: '#f43f5e', text: '🚩 P1 Deployment' },
              DeploymentP2: { bg: 'rgba(14, 165, 233, 0.20)', border: '#0ea5e9', text: '🚩 P2 Deployment' },
              ObjectiveArea: { bg: 'rgba(234, 179, 8, 0.22)', border: '#eab308', text: '🎯 Objective Area' }
            };
            const style = zoneStyles[zone.zoneType] || { bg: 'rgba(100, 116, 139, 0.2)', border: '#64748b', text: zone.name };

            if (zone.bounds) {
              return (
                <div
                  key={zone.id}
                  style={{
                    left: `${zone.bounds.x}px`,
                    top: `${zone.bounds.y}px`,
                    width: `${zone.bounds.width}px`,
                    height: `${zone.bounds.height}px`,
                    backgroundColor: style.bg,
                    borderColor: style.border
                  }}
                  className="absolute border-2 border-dashed rounded-xl pointer-events-none flex items-center justify-center shadow"
                >
                  <span className="font-mono text-[9px] font-bold text-white bg-black/80 px-2 py-0.5 rounded-full border border-white/20">
                    {zone.label || style.text}
                  </span>
                </div>
              );
            }
            return null;
          })}

          {/* Multi-Level Structures (Buildings, Ruins, Watchtowers) */}
          {structures && structures.map(s => (
            <div
              key={s.id}
              style={{
                left: `${s.x}px`,
                top: `${s.y}px`,
                width: `${s.width}px`,
                height: `${s.height}px`,
                transform: 'translate(-50%, -50%)',
                borderColor: s.color || '#9333ea',
                backgroundColor: `${s.color || '#9333ea'}18`
              }}
              className="absolute rounded-2xl border-2 pointer-events-none flex flex-col justify-between p-2 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between pointer-events-auto">
                <span className="text-xs font-bold text-white font-mono flex items-center space-x-1 bg-black/80 px-2 py-0.5 rounded-lg border border-purple-500/40">
                  <span>{s.icon || '🏛️'}</span>
                  <span>{s.name}</span>
                </span>
                <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-200 border border-purple-500/50 px-1.5 py-0.2 rounded-md">
                  {s.totalLevels} Floors (L1–L{s.totalLevels})
                </span>
              </div>

              {/* Floor level stripes indicator */}
              <div className="grid grid-cols-5 gap-1 pointer-events-none opacity-40">
                {Array.from({ length: s.totalLevels }).map((_, idx) => (
                  <div key={idx} className="h-1.5 rounded bg-purple-400/40 border border-purple-300/40" title={`Floor L${idx + 1}`}></div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[8px] font-mono text-zinc-300 bg-black/70 px-2 py-0.5 rounded">
                <span>{s.blocksLargeUnits ? '⛔ Blocks Vehicles' : '✓ Vehicles Pass'}</span>
                <span>+{s.coverBonus} Def Cover</span>
              </div>
            </div>
          ))}

          {/* Points of Interest (POIs) - Exactly centered at coordinate with calibrated 1.5 sq capture radius */}
          {pois.map(poi => {
            const poiX = poi.x > 30 ? poi.x : poi.x * GRID_SIZE + GRID_SIZE / 2;
            const poiY = poi.y > 30 ? poi.y : poi.y * GRID_SIZE + GRID_SIZE / 2;
            const radiusPx = (typeof poi.radius === 'number' && poi.radius > 10)
              ? poi.radius
              : (poi.radius || 1.5) * GRID_SIZE;

            return (
              <div 
                key={poi.id}
                style={{ left: `${poiX}px`, top: `${poiY}px` }}
                className="absolute pointer-events-none"
              >
                {/* Radiant POI Capture Area Ring - Centered exactly on (poiX, poiY) */}
                <div 
                  style={{ 
                    width: `${radiusPx * 2}px`, 
                    height: `${radiusPx * 2}px`,
                    left: `-${radiusPx}px`,
                    top: `-${radiusPx}px`
                  }}
                  className={`absolute rounded-full border-2 border-dashed transition-all duration-1000 ${
                    poi.type === 'Special'
                      ? 'border-amber-400/60 bg-amber-500/10 animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                      : 'border-rose-500/50 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                  }`}
                />

                {/* Roll20 Style Bullseye Marker - Exactly centered with -translate-x-1/2 -translate-y-1/2 */}
                <div className="absolute -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full border-2 border-red-500 bg-white/95 flex items-center justify-center shadow-2xl">
                  <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                </div>

                {/* Name & Multiplier Label placed underneath marker center */}
                <div 
                  style={{ top: '18px' }}
                  className="absolute left-0 -translate-x-1/2 bg-black/90 border border-zinc-700 px-2 py-0.5 rounded text-[10px] font-black text-amber-300 tracking-wider font-mono shadow-md uppercase whitespace-nowrap z-10"
                >
                  {poi.name} ({poi.multiplier}x)
                </div>
              </div>
            );
          })}

          {/* Tactical Terrain Features (from Map Architect / Custom Map) */}
          {terrain && terrain.map(t => (
            <div
              key={t.id}
              style={{
                left: `${t.x}px`,
                top: `${t.y}px`,
                width: `${t.width}px`,
                height: `${t.height}px`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: `${t.color || '#64748b'}22`,
                borderColor: t.color || '#64748b'
              }}
              className="absolute rounded-xl border-2 pointer-events-none flex flex-col items-center justify-center shadow-lg"
            >
              <span className="text-2xl filter drop-shadow">
                {t.icon || (t.type === 'Watchtower' ? '🏰' : t.type === 'Basalt Crag' ? '🪨' : t.type === 'Flooded Mire' ? '🌊' : t.type === 'Ruins' ? '🏛️' : t.type === 'Barricade' ? '🪵' : '⛰️')}
              </span>
              <span className="text-[9px] font-mono font-bold text-zinc-200 bg-black/80 px-1.5 py-0.2 rounded truncate max-w-full">
                {t.name}
              </span>
              {t.blocksLineOfSight && (
                <span className="text-[7px] text-rose-300 font-mono font-bold">LoS Block</span>
              )}
            </div>
          ))}

          {/* Special Terrain Tiles */}
          {specialTiles.map((tile, i) => {
            const tileX = tile.x > 30 ? tile.x : tile.x * GRID_SIZE + GRID_SIZE / 2;
            const tileY = tile.y > 30 ? tile.y : tile.y * GRID_SIZE + GRID_SIZE / 2;

            return (
              <div
                key={`tile_${i}`}
                style={{ left: `${tileX}px`, top: `${tileY}px` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-80 flex flex-col items-center"
              >
                <span className="text-3xl filter drop-shadow">
                  {tile.type === 'HighGround' ? '🌲' : tile.type === 'Water' ? '🌊' : '🏛️'}
                </span>
                <span className="text-[9px] font-mono text-zinc-400 bg-black/70 px-1 rounded">
                  {tile.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* LAYER 2: GridLayer (Visual Tabletop Grid & Deployment)    */}
        {/* ========================================================= */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none">
            {/* SVG Grid Overlay */}
            <svg className="absolute inset-0 w-full h-full opacity-25">
              <defs>
                <pattern id="vtt-grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                  <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#e2e8f0" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#vtt-grid)" />
            </svg>

            {/* Deployment Flank Indicators (West: Player 1, East: Player 2) */}
            {activePhase === 'Deployment' && (
              <>
                <div 
                  style={{ width: `${p1ZoneWidth}px` }}
                  className="absolute inset-y-0 left-0 bg-rose-950/20 border-r-2 border-rose-500/50 flex items-center justify-center pointer-events-none"
                >
                  <span className="font-mono font-black text-rose-300 text-xs tracking-widest uppercase rotate-90 opacity-60">
                    {deploymentConfig?.player1?.label || 'Player 1 Deployment Zone'}
                  </span>
                </div>
                <div 
                  style={{ width: `${p2ZoneWidth}px` }}
                  className="absolute inset-y-0 right-0 bg-sky-950/20 border-l-2 border-sky-500/50 flex items-center justify-center pointer-events-none"
                >
                  <span className="font-mono font-black text-sky-300 text-xs tracking-widest uppercase -rotate-90 opacity-60">
                    {deploymentConfig?.player2?.label || 'Player 2 Deployment Zone'}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* LAYER 3: EffectsLayer (Range Circles & Attack Vectors)    */}
        {/* ========================================================= */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <svg className="w-full h-full">
            {/* FEATURE-001: 1" (50px) No-End-Movement Hazard Zone around all enemy units (Movement Phase Only) */}
            {activePhase === 'Movement' && units
              .filter(u => u.owner !== activePlayer && u.position && u.stats.lives > 0 && !u.embarkedIn && !u.inStrategicReserve)
              .map(enemy => {
                const livingTokens = (enemy.tokens || []).filter(t => t.currentLives > 0);
                const eDims = getUnitBaseDimensions(enemy);
                const tokensToRender = livingTokens.length > 0
                  ? livingTokens
                  : [{
                      id: `${enemy.id}-base`,
                      x: enemy.position!.x,
                      y: enemy.position!.y,
                      baseShape: eDims.shape,
                      baseWidth: eDims.width,
                      baseHeight: eDims.height,
                      radius: eDims.radius,
                      size: Math.max(eDims.width, eDims.height)
                    }];

                return (
                  <g key={`enemy-hazard-zone-${enemy.id}`} pointerEvents="none" className="enemy-engagement-zone">
                    {tokensToRender.map(t => {
                      const shape = t.baseShape || enemy.baseShape || eDims.shape || 'circle';
                      const w = t.baseWidth || enemy.baseWidth || eDims.width || 40;
                      const h = t.baseHeight || enemy.baseHeight || eDims.height || 40;
                      const r = t.radius || (t.size ? t.size / 2 : eDims.radius);

                      if (shape === 'rectangle' || shape === 'square') {
                        const padW = w + ENGAGEMENT_PROXIMITY_PX * 2;
                        const padH = h + ENGAGEMENT_PROXIMITY_PX * 2;
                        return (
                          <rect
                            key={`hazard-tok-${t.id}`}
                            x={t.x - padW / 2}
                            y={t.y - padH / 2}
                            width={padW}
                            height={padH}
                            rx={ENGAGEMENT_PROXIMITY_PX}
                            ry={ENGAGEMENT_PROXIMITY_PX}
                            fill="rgba(239, 68, 68, 0.07)"
                            stroke="#ef4444"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                        );
                      } else if (shape === 'oval') {
                        const rx = (w / 2) + ENGAGEMENT_PROXIMITY_PX;
                        const ry = (h / 2) + ENGAGEMENT_PROXIMITY_PX;
                        return (
                          <ellipse
                            key={`hazard-tok-${t.id}`}
                            cx={t.x}
                            cy={t.y}
                            rx={rx}
                            ry={ry}
                            fill="rgba(239, 68, 68, 0.07)"
                            stroke="#ef4444"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                        );
                      } else {
                        // Circle
                        const zoneR = r + ENGAGEMENT_PROXIMITY_PX;
                        return (
                          <circle
                            key={`hazard-tok-${t.id}`}
                            cx={t.x}
                            cy={t.y}
                            r={zoneR}
                            fill="rgba(239, 68, 68, 0.07)"
                            stroke="#ef4444"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                        );
                      }
                    })}
                  </g>
                );
              })
            }

            {/* Selected Unit Range Spheres */}
            {selectedUnit && selectedUnit.position && (
              <>
                {/* Fixed Movement-Zone Highlight (Does NOT follow cursor or live-drag) */}
                {activePhase === 'Movement' && !selectedUnit.hasMoved && (() => {
                  const fixedMoveOrigin = (selectedUnit.isPendingMoveConfirm && selectedUnit.pendingOriginalPosition)
                    ? selectedUnit.pendingOriginalPosition
                    : (draggingUnitId === selectedUnit.id ? dragInitialUnitPos : selectedUnit.position!);
                  const moveRadius = selectedUnit.stats.mv * GRID_SIZE;

                  const originTokens = (selectedUnit.isPendingMoveConfirm && selectedUnit.pendingOriginalTokens)
                    ? selectedUnit.pendingOriginalTokens
                    : (draggingUnitId === selectedUnit.id && Object.keys(groupDragInitialPositions).length > 0
                      ? (selectedUnit.tokens || []).map(t => ({ ...t, x: groupDragInitialPositions[t.id]?.x ?? t.x, y: groupDragInitialPositions[t.id]?.y ?? t.y }))
                      : (selectedUnit.tokens || []));

                  return (
                    <g className="movement-zone-highlight">
                      {/* Fixed Movement Zone Overlay */}
                      <circle
                        cx={fixedMoveOrigin.x}
                        cy={fixedMoveOrigin.y}
                        r={moveRadius}
                        fill="rgba(56, 189, 248, 0.12)"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                      />

                      {/* Origin Turn-Start Anchor Marker */}
                      <circle
                        cx={fixedMoveOrigin.x}
                        cy={fixedMoveOrigin.y}
                        r="5"
                        fill="#38bdf8"
                      />
                      <circle
                        cx={fixedMoveOrigin.x}
                        cy={fixedMoveOrigin.y}
                        r="12"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        opacity="0.8"
                      />

                      {/* Multi-Model Squad Reach per Model from start positions */}
                      {originTokens.length > 1 && originTokens.map((tok: Token, i: number) => (
                        <g key={`tok_reach_${tok.id || i}`}>
                          <circle
                            cx={tok.x}
                            cy={tok.y}
                            r={moveRadius}
                            fill="none"
                            stroke="rgba(56, 189, 248, 0.22)"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                          <circle
                            cx={tok.x}
                            cy={tok.y}
                            r="3"
                            fill="rgba(56, 189, 248, 0.7)"
                          />
                        </g>
                      ))}

                      {/* Distance / Movement Badge at North Perimeter */}
                      <g transform={`translate(${fixedMoveOrigin.x}, ${fixedMoveOrigin.y - moveRadius - 12})`}>
                        <rect
                          x="-50"
                          y="-11"
                          width="100"
                          height="22"
                          rx="6"
                          fill="#0b1120"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                        />
                        <text
                          x="0"
                          y="3.5"
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          MOVE: {selectedUnit.stats.mv}" ({moveRadius}px)
                        </text>
                      </g>
                    </g>
                  );
                })()}

                {/* 3" Disembark Zone Annular Ring around Transport Vehicle (Movement Phase) */}
                {activePhase === 'Movement' && (selectedUnit.type === 'Vehicle' || selectedUnit.role === 'Vehicle / Monster') && (
                  units.some(u => u.embarkedIn === selectedUnit.id)
                ) && (() => {
                  const vRadius = getUnitCollisionRadius(selectedUnit);
                  const disembarkOuterRadius = vRadius + 150; // 3 inches = 150px
                  return (
                    <g pointerEvents="none">
                      <circle
                        cx={selectedUnit.position.x}
                        cy={selectedUnit.position.y}
                        r={disembarkOuterRadius}
                        fill="rgba(14, 165, 233, 0.08)"
                        stroke="#0ea5e9"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                      <circle
                        cx={selectedUnit.position.x}
                        cy={selectedUnit.position.y}
                        r={vRadius + 8}
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        opacity={0.6}
                      />
                      <text
                        x={selectedUnit.position.x}
                        y={selectedUnit.position.y - disembarkOuterRadius - 6}
                        textAnchor="middle"
                        fill="#38bdf8"
                        fontSize="10"
                        fontWeight="bold"
                        className="select-none filter drop-shadow"
                      >
                        3″ DISEMBARK ZONE
                      </text>
                    </g>
                  );
                })()}

                {/* Shooting Range Sphere (BUG-018: Blocked if attached leader's host squad is melee-only or has already shot) */}
                {activePhase === 'Shooting' && selectedUnit.stats.range > 0 && !selectedUnit.hasShot && (() => {
                  if (selectedUnit.attachedTo) {
                    const hostSquad = units.find(u => u.id === selectedUnit.attachedTo);
                    if (hostSquad && (hostSquad.stats.range === 0 || hostSquad.hasShot)) {
                      return null;
                    }
                  }
                  return (
                    <g pointerEvents="none">
                      <circle
                        cx={selectedUnit.position.x}
                        cy={selectedUnit.position.y}
                        r={selectedUnit.stats.range * GRID_SIZE}
                        fill="rgba(244, 63, 94, 0.08)"
                        stroke="#f43f5e"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      {selectedUnit.tokens && selectedUnit.tokens.length > 1 && selectedUnit.tokens.map(tok => (
                        <circle
                          key={`tok_range_${tok.id}`}
                          cx={tok.x}
                          cy={tok.y}
                          r={selectedUnit.stats.range * GRID_SIZE}
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="1"
                          strokeDasharray="2 4"
                          opacity={0.35}
                        />
                      ))}
                    </g>
                  );
                })()}

                {/* Charge Reach Sphere */}
                {activePhase === 'Charge' && !selectedUnit.hasCharged && (
                  <circle
                    cx={selectedUnit.position.x}
                    cy={selectedUnit.position.y}
                    r={selectedUnit.stats.mv * GRID_SIZE}
                    fill="rgba(245, 158, 11, 0.12)"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="5 3"
                  />
                )}
              </>
            )}

            {/* Combat Targeting Vector Laser */}
            {selectedUnit && targetUnit && selectedUnit.position && targetUnit.position && (
              <g>
                <line
                  x1={selectedUnit.position.x}
                  y1={selectedUnit.position.y}
                  x2={targetUnit.position.x}
                  y2={targetUnit.position.y}
                  stroke="#f43f5e"
                  strokeWidth="3"
                  strokeDasharray="8 4"
                  className="animate-pulse"
                />
                <circle
                  cx={targetUnit.position.x}
                  cy={targetUnit.position.y}
                  r={32}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3"
                  strokeDasharray="6 3"
                />
              </g>
            )}
          </svg>
        </div>

        {/* ========================================================= */}
        {/* LAYER 4: TokenLayer (Multi-Token Squads & Minis)          */}
        {/* ========================================================= */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {units.filter(u => u.position && u.stats.lives > 0 && !u.attachedTo && !u.embarkedIn).map(unit => {
            const isSelected = unit.id === selectedUnitId;
            const isTarget = unit.id === targetUnitId;
            const isHovered = unit.id === hoveredUnitId;
            const tokens: Token[] = unit.tokens && unit.tokens.length > 0 
              ? unit.tokens 
              : [{ 
                  id: `${unit.id}_tok_0`, 
                  unitId: unit.id, 
                  currentLives: unit.stats.lives, 
                  maxLives: unit.stats.maxLives || unit.stats.lives, 
                  x: unit.position!.x, 
                  y: unit.position!.y, 
                  offsetX: 0, 
                  offsetY: 0, 
                  rotation: 0, 
                  size: 40 
                }];

            return (
              <div 
                key={unit.id} 
                className="relative pointer-events-auto"
                onMouseEnter={() => setHoveredUnitId(unit.id)}
                onMouseLeave={() => setHoveredUnitId(prev => prev === unit.id ? null : prev)}
              >
                {/* Squad Cohesion Tether & Base Collision Boundary */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Base Collision Boundary Ring / Draggable Squad Formation Hull (BUG-007) */}
                  <circle
                    cx={unit.position!.x}
                    cy={unit.position!.y}
                    r={getUnitCollisionRadius(unit)}
                    fill={tokens.length > 1 ? 'rgba(251, 191, 36, 0.02)' : 'none'}
                    stroke={tokens.some(t => t.offendingCoherency) ? '#ef4444' : isSelected ? '#fbbf24' : '#64748b'}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity={isSelected || tokens.some(t => t.offendingCoherency) ? 0.75 : 0.25}
                    className={tokens.length > 1 ? 'cursor-grab active:cursor-grabbing pointer-events-auto' : 'pointer-events-none'}
                    onMouseDown={tokens.length > 1 ? e => handleSquadGroupMouseDown(e, unit) : undefined}
                  />

                  {/* Pairwise Coherency Links between models (in-range links green dashed, broken tether red) */}
                  {(isSelected || tokens.some(t => t.offendingCoherency)) && tokens.length > 1 && (
                    <>
                      {tokens.map((tokA, i) =>
                        tokens.slice(i + 1).map((tokB, j) => {
                          const dist = Math.hypot(tokA.x - tokB.x, tokA.y - tokB.y);
                          const coherencyPx = (coherencyDistanceInches || 2) * 50;
                          if (dist <= coherencyPx) {
                            return (
                              <line
                                key={`coherency_${i}_${i + 1 + j}`}
                                x1={tokA.x}
                                y1={tokA.y}
                                x2={tokB.x}
                                y2={tokB.y}
                                stroke="rgba(34, 197, 94, 0.55)"
                                strokeWidth="2"
                                strokeDasharray="3 3"
                              />
                            );
                          }
                          return null;
                        })
                      )}
                    </>
                  )}

                  {isSelected && tokens.length > 1 && (
                    <>
                      {tokens.map((tok, i) => (
                        <line
                          key={`tether_${i}`}
                          x1={unit.position!.x}
                          y1={unit.position!.y}
                          x2={tok.x}
                          y2={tok.y}
                          stroke="rgba(251, 191, 36, 0.5)"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                        />
                      ))}
                      {/* Centroid squad beacon (draggable group anchor) */}
                      <circle
                        cx={unit.position!.x}
                        cy={unit.position!.y}
                        r="6"
                        fill="#fbbf24"
                        className="cursor-grab active:cursor-grabbing pointer-events-auto shadow-md"
                        onMouseDown={e => handleSquadGroupMouseDown(e, unit)}
                      />
                    </>
                  )}
                </svg>

                {/* Render Individual Tokens for this Unit (1 Token = 1 Unit Model) */}
                {tokens.map((token, tokIndex) => {
                  const isLeaderModel = tokIndex === 0 || token.isLeaderToken;
                  const isAttachedLeader = !!token.isLeaderToken;
                  const shape = token.baseShape || unit.baseShape || (unit.type === 'Vehicle' ? 'rectangle' : 'circle');
                  const tokenW = token.baseWidth || token.size || 40;
                  const tokenH = token.baseHeight || token.size || 40;
                  
                  const shapeClass = 
                    shape === 'square' ? 'rounded-xl' :
                    shape === 'rectangle' ? 'rounded-lg' :
                    shape === 'oval' ? 'rounded-[40%]' :
                    'rounded-full';

                  const isBrokenCoherency = !!token.offendingCoherency;
                  const isTokenSelected = selectedTokenIds.includes(token.id);
                  const isSquadMultiSelected = selectedTokenIds.length > 1 && isTokenSelected;

                  return (
                    <div
                      key={token.id}
                      style={{
                        left: `${token.x}px`,
                        top: `${token.y}px`,
                        width: `${tokenW}px`,
                        height: `${tokenH}px`
                      }}
                      onMouseDown={e => handleTokenMouseDown(e, unit, token)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto ${shapeClass} cursor-grab active:cursor-grabbing flex items-center justify-center transition-transform duration-100 ${
                        isBrokenCoherency
                          ? 'ring-4 ring-rose-500 ring-offset-2 ring-offset-black scale-105 shadow-[0_0_25px_rgba(244,63,94,0.9)] animate-pulse'
                          : isSquadMultiSelected
                          ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-black scale-105 shadow-[0_0_25px_rgba(34,211,238,0.95)] z-30'
                          : isTokenSelected
                          ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black scale-105 shadow-[0_0_20px_rgba(251,191,36,0.6)] z-30'
                          : isSelected
                          ? 'ring-1 ring-amber-400/35 opacity-95'
                          : isTarget
                          ? 'ring-4 ring-rose-500 ring-offset-2 ring-offset-black scale-105 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
                          : 'hover:scale-110 shadow-xl'
                      } ${
                        isAttachedLeader
                          ? 'bg-gradient-to-tr from-amber-950 via-amber-700 to-yellow-500 border-2 border-yellow-300 ring-2 ring-amber-400'
                          : unit.owner === 'player1'
                          ? 'bg-gradient-to-tr from-rose-950 via-red-800 to-rose-600 border-2 border-amber-400'
                          : 'bg-gradient-to-tr from-sky-950 via-blue-800 to-sky-600 border-2 border-cyan-400'
                      }`}
                    >
                      {/* Token Avatar or Custom Image */}
                      {(token.tokenImageUrl || unit.tokenImageUrl) ? (
                        <img
                          src={token.tokenImageUrl || unit.tokenImageUrl}
                          alt={unit.name}
                          className={`w-full h-full object-cover ${shapeClass} pointer-events-none select-none`}
                        />
                      ) : (
                        <span className="text-xl select-none filter drop-shadow">
                          {token.sprite || unit.avatar}
                        </span>
                      )}

                      {/* Attached Leader or Squad Leader Crown */}
                      {isLeaderModel && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-black rounded-full px-1 text-[8px] font-black leading-none shadow flex items-center space-x-0.5">
                          <span>★</span>
                          {isAttachedLeader && <span className="text-[7px]">LEADER</span>}
                        </div>
                      )}

                      {/* Individual Unit Token Lives Chip (Lives per Token: L / U) */}
                      <div className={`absolute -top-1.5 -right-2 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold border leading-none shadow-md ${
                        token.currentLives < token.maxLives
                          ? 'bg-amber-950 border-amber-400 text-amber-300 animate-pulse'
                          : 'bg-black/90 border-zinc-700 text-emerald-400'
                      }`}>
                        {token.currentLives}/{token.maxLives}L
                      </div>

                      {/* Multi-level floor indicator */}
                      {unit.currentLevel && unit.currentLevel > 1 && (
                        <div className="absolute -top-2.5 -left-2 bg-purple-700 border border-purple-300 text-purple-100 font-mono font-black text-[8px] px-1 rounded-full shadow z-10">
                          L{unit.currentLevel}
                        </div>
                      )}

                      {/* Defense badge on Leader token */}
                      {isLeaderModel && (
                        <div className="absolute -bottom-1.5 -left-2 bg-black/90 text-[7px] font-mono font-bold text-sky-300 px-1 rounded-full border border-zinc-700 leading-tight">
                          {unit.stats.def + unit.stats.defModifier}D
                        </div>
                      )}

                      {/* Broken Coherency Warning Badge */}
                      {isBrokenCoherency && (
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-rose-600 border border-rose-300 text-white font-black text-[7px] px-1 rounded shadow whitespace-nowrap animate-bounce z-20">
                          ⚠️ OUT OF COHERENCY
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unit Name Label under Centroid: Hover-only or selected/targeted (BUG-012) */}
                {(isHovered || isSelected || isTarget) && (
                  <div 
                    onMouseDown={e => handleSquadGroupMouseDown(e, unit)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectUnit(unit.id);
                      setSelectedTokenIds((unit.tokens || []).map(t => t.id));
                    }}
                    style={{ left: `${unit.position!.x}px`, top: `${unit.position!.y + Math.max(28, getUnitCollisionRadius(unit) + 6)}px` }}
                    className="absolute -translate-x-1/2 pointer-events-auto cursor-grab active:cursor-grabbing hover:border-amber-400 bg-black/90 border border-zinc-700/80 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-zinc-200 font-mono flex items-center space-x-1.5 shadow-2xl whitespace-nowrap z-20 transition-opacity duration-150"
                    title="Drag to reposition squad / Click to select entire squad"
                  >
                    <span>{unit.name.split(' ')[0]}</span>
                    <span className="text-zinc-500">|</span>
                    <span className={unit.owner === 'player1' ? 'text-rose-400 font-bold' : 'text-sky-400 font-bold'}>
                      {unit.stats.lives}L ({tokens.length}U • {getUnitSize(unit)} • {unit.formation || 'circle'})
                    </span>
                    {canUnitDeployOutsideZone(unit) && (
                      <span className="bg-amber-950 border border-amber-500 text-amber-300 text-[8px] px-1 rounded uppercase font-black">
                        Infiltrator
                      </span>
                    )}
                    {unit.attachedUnits && unit.attachedUnits.length > 0 && (
                      <span className="bg-amber-950 border border-amber-400 text-amber-300 text-[8px] px-1 rounded uppercase font-black">
                        ★ Commander
                      </span>
                    )}
                    {(unit.type === 'Vehicle' || unit.role === 'Vehicle / Monster' || (unit.carryCapacity && unit.carryCapacity > 0)) && (() => {
                      const embarkedSquads = units.filter(u => u.embarkedIn === unit.id);
                      const currentLoad = embarkedSquads.reduce((acc, u) => acc + (u.stats?.modelCount || 1) + (u.attachedUnits?.length || 0), 0);
                      const maxCapacity = unit.carryCapacity ?? unit.stats?.carryCapacity ?? (unit.transportCapacity ? unit.transportCapacity * 5 : 6);
                      return (
                        <span className="bg-sky-950 border border-sky-400 text-sky-300 text-[8px] px-1 rounded uppercase font-black">
                          Capacity: {currentLoad}/{maxCapacity}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* LAYER 5: OverlayLayer (Ghost Dragging, Ruler, Marquee)    */}
        {/* ========================================================= */}
        <div className="absolute inset-0 pointer-events-none z-30">
          {/* Drag-over from Army Tray Drop Reticle */}
          {isDragOverCanvas && dragOverPos && (
            <div
              style={{
                left: `${dragOverPos.x}px`,
                top: `${dragOverPos.y}px`,
                width: '64px',
                height: '64px'
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full border-2 border-dashed border-amber-400 bg-amber-400/25 shadow-[0_0_30px_rgba(251,191,36,0.7)] animate-pulse z-40 flex items-center justify-center text-[10px] font-mono font-black text-amber-300 tracking-wider uppercase"
            >
              <span>DEPLOY</span>
            </div>
          )}

          {/* Active Unit Dragging Ruler & Ghost Formation (BUG-009) */}
          {draggingUnitId && selectedUnit && (() => {
            const isSingleModel = !!(draggingTokenId && !isGroupDragging);
            const movingToken = isSingleModel ? selectedUnit.tokens?.find(t => t.id === draggingTokenId) : null;

            const rulerOriginX = isSingleModel && movingToken ? dragTokenInitialPos.x : dragInitialUnitPos.x;
            const rulerOriginY = isSingleModel && movingToken ? dragTokenInitialPos.y : dragInitialUnitPos.y;

            const deltaX = dragCurrentWorld.x - dragStartWorld.x;
            const deltaY = dragCurrentWorld.y - dragStartWorld.y;

            const rulerEndX = rulerOriginX + deltaX;
            const rulerEndY = rulerOriginY + deltaY;

            const activeDistPx = worldDistance({ x: rulerOriginX, y: rulerOriginY }, { x: rulerEndX, y: rulerEndY });
            const activeDistSquares = (activeDistPx / GRID_SIZE).toFixed(1);

            return (
              <>
                {/* Distance Ruler Line */}
                <svg className="w-full h-full">
                  <line
                    x1={rulerOriginX}
                    y1={rulerOriginY}
                    x2={rulerEndX}
                    y2={rulerEndY}
                    stroke={isDraggingOutOfZone ? '#f43f5e' : activeDistPx <= selectedUnit.stats.mv * GRID_SIZE ? '#10b981' : '#f43f5e'}
                    strokeWidth="2.5"
                    strokeDasharray={isDraggingOutOfZone ? '4 2' : '6 3'}
                  />
                </svg>

                {/* Floating Distance Badge */}
                <div
                  style={{
                    left: `${(rulerOriginX + rulerEndX) / 2}px`,
                    top: `${(rulerOriginY + rulerEndY) / 2 - 14}px`
                  }}
                  className={`absolute -translate-x-1/2 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold shadow-2xl border ${
                    isDraggingOutOfZone
                      ? 'bg-rose-950 border-rose-500 text-rose-200 animate-bounce'
                      : activeDistPx <= selectedUnit.stats.mv * GRID_SIZE
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-rose-950 border-rose-500 text-rose-300'
                  }`}
                >
                  {isDraggingOutOfZone 
                    ? '⛔ OUTSIDE DEPLOYMENT ZONE' 
                    : `📏 ${activeDistSquares} sq (${Math.round(activeDistPx)}px)`}
                </div>

                {/* Ghost Formation Tokens: Previews only active drag selection (BUG-009) */}
                {isSingleModel && movingToken ? (
                  // Case A: Single Model Movement Preview (1 model ghost only)
                  (() => {
                    const ghostX = dragTokenInitialPos.x + deltaX;
                    const ghostY = dragTokenInitialPos.y + deltaY;
                    const tokenW = movingToken.baseWidth || movingToken.size || 40;
                    const tokenH = movingToken.baseHeight || movingToken.size || 40;
                    const shape = movingToken.baseShape || selectedUnit.baseShape || 'circle';
                    const shapeClass = 
                      shape === 'square' ? 'rounded-xl' :
                      shape === 'rectangle' ? 'rounded-lg' :
                      shape === 'oval' ? 'rounded-[40%]' :
                      'rounded-full';

                    return (
                      <div
                        style={{
                          left: `${ghostX}px`,
                          top: `${ghostY}px`,
                          width: `${tokenW}px`,
                          height: `${tokenH}px`
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 ${shapeClass} border-2 border-dashed flex items-center justify-center text-sm opacity-85 z-40 ${
                          isDraggingOutOfZone
                            ? 'border-rose-500 bg-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                            : 'border-emerald-400 bg-emerald-500/25 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        }`}
                      >
                        {movingToken.sprite || selectedUnit.avatar}
                      </div>
                    );
                  })()
                ) : isGroupDragging && selectedTokenIds.length > 1 ? (
                  // Case B: Group Drag Preview for selected models only
                  selectedUnit.tokens?.filter(t => selectedTokenIds.includes(t.id)).map((tok) => {
                    const initPos = groupDragInitialPositions[tok.id] || { x: tok.x, y: tok.y };
                    const ghostX = initPos.x + deltaX;
                    const ghostY = initPos.y + deltaY;
                    const tokenW = tok.baseWidth || tok.size || 40;
                    const tokenH = tok.baseHeight || tok.size || 40;
                    return (
                      <div
                        key={`ghost_grp_${tok.id}`}
                        style={{
                          left: `${ghostX}px`,
                          top: `${ghostY}px`,
                          width: `${tokenW}px`,
                          height: `${tokenH}px`
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed flex items-center justify-center text-sm opacity-80 ${
                          isDraggingOutOfZone
                            ? 'border-rose-500 bg-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                            : 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
                        }`}
                      >
                        {tok.sprite || selectedUnit.avatar}
                      </div>
                    );
                  })
                ) : (
                  // Case C: Whole Squad Formation Preview
                  calculateFormationOffsets(
                    selectedUnit.tokens?.length || selectedUnit.stats.modelCount || 1,
                    selectedUnit.formation || 'circle',
                    getUnitBaseRadius(selectedUnit)
                  ).map((offset, i) => {
                    const ghostX = dragInitialUnitPos.x + deltaX + offset.offsetX;
                    const ghostY = dragInitialUnitPos.y + deltaY + offset.offsetY;
                    const diameter = getUnitBaseDiameter(selectedUnit);

                    return (
                      <div
                        key={`ghost_${i}`}
                        style={{ 
                          left: `${ghostX}px`, 
                          top: `${ghostY}px`,
                          width: `${diameter}px`,
                          height: `${diameter}px`
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed flex items-center justify-center text-sm opacity-80 ${
                          isDraggingOutOfZone
                            ? 'border-rose-500 bg-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                            : 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        }`}
                      >
                        {selectedUnit.avatar}
                      </div>
                    );
                  })
                )}
              </>
            );
          })()}

          {/* Custom Measurement Ruler Tool */}
          {activeTool === 'measure' && measureStart && measureCurrent && (
            <>
              <svg className="w-full h-full">
                <line
                  x1={measureStart.x}
                  y1={measureStart.y}
                  x2={measureCurrent.x}
                  y2={measureCurrent.y}
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              </svg>
              <div
                style={{
                  left: `${(measureStart.x + measureCurrent.x) / 2}px`,
                  top: `${(measureStart.y + measureCurrent.y) / 2 - 12}px`
                }}
                className="absolute -translate-x-1/2 bg-amber-950/90 border border-amber-500 text-amber-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold shadow-xl"
              >
                📐 {(worldDistance(measureStart, measureCurrent) / GRID_SIZE).toFixed(1)} sq ({Math.round(worldDistance(measureStart, measureCurrent))}px)
              </div>
            </>
          )}

          {/* Marquee Box Selection Overlay */}
          {isMarqueeDragging && marqueeStart && marqueeCurrent && (
            <div
              style={{
                left: `${Math.min(marqueeStart.x, marqueeCurrent.x)}px`,
                top: `${Math.min(marqueeStart.y, marqueeCurrent.y)}px`,
                width: `${Math.abs(marqueeCurrent.x - marqueeStart.x)}px`,
                height: `${Math.abs(marqueeCurrent.y - marqueeStart.y)}px`
              }}
              className="absolute border-2 border-dashed border-amber-400 bg-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.3)] pointer-events-none z-40 rounded-sm flex items-start p-1"
            >
              <span className="text-[9px] font-mono font-bold text-amber-300 bg-black/80 px-1 rounded">
                Select Area
              </span>
            </div>
          )}

          {/* Canvas VFX Layer (Projectiles, slashes, aura ripples, CP sparkle) */}
          <VfxOverlay />
        </div>
      </div>

      {/* ============================================================= */}
      {/* LAYER 6: UILayer (Fixed Viewport Controls & Formation Dock)    */}
      {/* ============================================================= */}
      
      {/* Top Floating Viewport Control Bar */}
      <div className="absolute top-3 left-3 bg-[#161922]/90 border border-zinc-800 backdrop-blur rounded-xl p-1.5 shadow-2xl flex items-center space-x-1.5 z-40 text-xs">
        <button
          onClick={() => setZoom(prev => Math.min(2.5, prev + 0.15))}
          title="Zoom In"
          className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.4, prev - 0.15))}
          title="Zoom Out"
          className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="Center Map / Reset Zoom"
          className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition text-[11px] font-mono font-bold px-2"
        >
          {Math.round(zoom * 100)}%
        </button>

        <div className="w-[1px] h-4 bg-zinc-800 my-auto" />

        <button
          onClick={() => setShowGrid(prev => !prev)}
          title="Toggle Grid Overlay"
          className={`p-1.5 rounded-lg transition ${
            showGrid ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <GridIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => setEnableSnap(prev => !prev)}
          title="Toggle Snap-to-Grid"
          className={`p-1.5 rounded-lg transition ${
            enableSnap ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Magnet className="w-4 h-4" />
        </button>
      </div>

      {/* Deployment Mode & Formation Dock (Strictly Deployment Phase Only) */}
      {activePhase === 'Deployment' && (
        <div className="absolute top-3 right-3 bg-[#161922]/90 border border-zinc-800 backdrop-blur rounded-xl p-1.5 shadow-2xl flex items-center space-x-2 z-40 text-xs">
          {/* Mode Switcher: Formation Preset vs Manual Placement */}
          <div className="flex items-center space-x-1 bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-750">
            <button
              onClick={() => setDeploymentMode('formation')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
                deploymentMode === 'formation'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Formation Mode: Drag whole squad as a preset formation"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Formation</span>
            </button>
            <button
              onClick={() => setDeploymentMode('manual')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
                deploymentMode === 'manual'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Manual Mode: Freely drag individual models (enforces coherency rule)"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Manual</span>
            </button>
          </div>

          {/* If squad selected and in formation mode, show presets */}
          {selectedUnit && onChangeFormation && deploymentMode === 'formation' && (
            <>
              <div className="w-[1px] h-4 bg-zinc-700 my-auto" />
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onChangeFormation(selectedUnit.id, 'auto')}
                  title="Auto Adaptive Formation"
                  className={`px-2 py-1 rounded flex items-center space-x-1 text-xs font-mono transition ${
                    (selectedUnit.formation || 'circle') === 'auto'
                      ? 'bg-amber-600 text-white font-bold shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto</span>
                </button>
                <button
                  onClick={() => onChangeFormation(selectedUnit.id, 'circle')}
                  title="Circle Formation"
                  className={`px-2 py-1 rounded flex items-center space-x-1 text-xs font-mono transition ${
                    (selectedUnit.formation || 'circle') === 'circle'
                      ? 'bg-amber-600 text-white font-bold shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Circle className="w-3.5 h-3.5" />
                  <span>Circle</span>
                </button>
                <button
                  onClick={() => onChangeFormation(selectedUnit.id, 'line')}
                  title="Line Rank Formation"
                  className={`px-2 py-1 rounded flex items-center space-x-1 text-xs font-mono transition ${
                    selectedUnit.formation === 'line'
                      ? 'bg-amber-600 text-white font-bold shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                  <span>Line</span>
                </button>
                <button
                  onClick={() => onChangeFormation(selectedUnit.id, 'grid')}
                  title="Skirmish Grid Formation"
                  className={`px-2 py-1 rounded flex items-center space-x-1 text-xs font-mono transition ${
                    selectedUnit.formation === 'grid'
                      ? 'bg-amber-600 text-white font-bold shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
                <button
                  onClick={() => onChangeFormation(selectedUnit.id, 'stack')}
                  title="Stacked Formation"
                  className={`px-2 py-1 rounded flex items-center space-x-1 text-xs font-mono transition ${
                    selectedUnit.formation === 'stack'
                      ? 'bg-amber-600 text-white font-bold shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Stack</span>
                </button>
              </div>
            </>
          )}

          {deploymentMode === 'manual' && (
            <span className="text-[11px] text-purple-300 font-mono px-1">
              🖐️ Drag any model individually
            </span>
          )}
        </div>
      )}

      {/* Placement Rejection Notice Floating Banner */}
      {rejectedPlacementNotice && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-rose-950/95 border-2 border-rose-500 text-white px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-mono font-bold">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{rejectedPlacementNotice}</span>
        </div>
      )}
    </div>
  );
};
