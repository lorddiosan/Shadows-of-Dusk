import React, { useState, useRef } from 'react';
import { 
  MapPin, Plus, Trash2, Save, Eye, Shield, 
  Layers, Move, Info, Sparkles, Check, Compass,
  Upload, Image as ImageIcon, Box, Building2, Sliders, AlertTriangle, X
} from 'lucide-react';
import { 
  BattleMap, TerrainFeature, MapObjective, TerrainType, 
  PaintedZone, PaintedZoneType, MultiLevelStructure, StructureLevel 
} from '../../types/game';
import { StorageService, PRESET_MAPS } from '../../services/storageService';

interface MapCreatorProps {
  onMapSaved?: (map: BattleMap) => void;
}

const THEMES: Array<'Wasteland' | 'Industrial' | 'Gothic Ruins' | 'Verdant Forest' | 'Volcanic'> = [
  'Industrial', 'Verdant Forest', 'Gothic Ruins', 'Wasteland', 'Volcanic'
];

const MAP_SIZE_PRESETS = [
  { label: 'Combat Patrol (44" × 30")', widthIn: 44, heightIn: 30, widthPx: 1200, heightPx: 800 },
  { label: 'Incursion (44" × 60")', widthIn: 44, heightIn: 60, widthPx: 1200, heightPx: 1600 },
  { label: 'Strike Force (48" × 48")', widthIn: 48, heightIn: 48, widthPx: 1200, heightPx: 1200 },
  { label: 'Kill Team (30" × 22")', widthIn: 30, heightIn: 22, widthPx: 1000, heightPx: 730 },
];

const TERRAIN_PRESETS: { type: TerrainType; name: string; width: number; height: number; icon: string; color: string; blocksMovement: boolean; blocksLoS: boolean; cover: number }[] = [
  { type: 'Watchtower', name: 'Sentry Watchtower', width: 80, height: 80, icon: '🏰', color: '#f59e0b', blocksMovement: false, blocksLoS: true, cover: 1 },
  { type: 'Basalt Crag', name: 'Basalt Crag Outcrop', width: 100, height: 70, icon: '🪨', color: '#64748b', blocksMovement: true, blocksLoS: false, cover: 1 },
  { type: 'Flooded Mire', name: 'Flooded Mire Bog', width: 150, height: 110, icon: '🌊', color: '#059669', blocksMovement: false, blocksLoS: false, cover: 0 },
  { type: 'Ruins', name: 'Shattered Shrine Ruins', width: 130, height: 85, icon: '🏛️', color: '#e11d48', blocksMovement: false, blocksLoS: false, cover: 1 },
  { type: 'Barricade', name: 'Heavy Trenched Barricade', width: 120, height: 35, icon: '🪵', color: '#d97706', blocksMovement: true, blocksLoS: false, cover: 1 },
  { type: 'High Ground', name: 'Elevated High Ridge', width: 160, height: 70, icon: '⛰️', color: '#3b82f6', blocksMovement: false, blocksLoS: false, cover: 1 },
];

const PAINTED_ZONE_PRESETS: { type: PaintedZoneType; name: string; width: number; height: number; color: string; penalty: number }[] = [
  { type: 'Impassable', name: 'Impassable Hazard', width: 120, height: 80, color: 'rgba(239, 68, 68, 0.35)', penalty: 999 },
  { type: 'DifficultTerrain', name: 'Difficult Terrain (-2 Mv)', width: 140, height: 100, color: 'rgba(16, 185, 129, 0.3)', penalty: 2 },
  { type: 'DeploymentP1', name: 'Custom P1 Zone', width: 180, height: 200, color: 'rgba(244, 63, 94, 0.3)', penalty: 0 },
  { type: 'DeploymentP2', name: 'Custom P2 Zone', width: 180, height: 200, color: 'rgba(56, 189, 248, 0.3)', penalty: 0 },
  { type: 'ObjectiveArea', name: 'Contested Objective Radius', width: 130, height: 130, color: 'rgba(251, 191, 36, 0.3)', penalty: 0 },
];

export const MapCreator: React.FC<MapCreatorProps> = ({ onMapSaved }) => {
  const [maps, setMaps] = useState<BattleMap[]>(() => StorageService.getMaps());
  const [activeMapId, setActiveMapId] = useState<string>(() => maps[0]?.id || 'map_crimson_foundry');
  const [activeMap, setActiveMap] = useState<BattleMap>(() => {
    const found = maps.find(m => m.id === activeMapId);
    return found ? JSON.parse(JSON.stringify(found)) : JSON.parse(JSON.stringify(PRESET_MAPS[0]));
  });

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'terrain' | 'objective' | 'zone' | 'structure' | null>(null);
  const [activeFloorPreview, setActiveFloorPreview] = useState<number | null>(null);
  const [activeToolTab, setActiveToolTab] = useState<'terrain' | 'zones' | 'structures' | 'settings'>('terrain');
  const [notification, setNotification] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingCanvasItem, setIsDraggingCanvasItem] = useState<boolean>(false);
  const [dragItemOffset, setDragItemOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSelectMap = (mapId: string) => {
    const found = maps.find(m => m.id === mapId);
    if (found) {
      setActiveMapId(found.id);
      setActiveMap(JSON.parse(JSON.stringify(found)));
      setSelectedItemId(null);
      setSelectedItemType(null);
    }
  };

  const handleCreateNewMap = () => {
    const newId = `map_custom_${Date.now()}`;
    const freshMap: BattleMap = {
      id: newId,
      name: 'New Sector Grid',
      theme: 'Industrial',
      width: 1200,
      height: 800,
      gridWidthInches: 44,
      gridHeightInches: 30,
      coherencyDistanceInches: 2,
      description: 'Tactical battlefield with multi-level ruins and fortified sectors.',
      deploymentZones: {
        player1: { minX: 0, maxX: 200, minY: 0, maxY: 800, label: 'West Flank' },
        player2: { minX: 1000, maxX: 1200, minY: 0, maxY: 800, label: 'East Flank' }
      },
      objectives: [
        { id: `obj_1_${Date.now()}`, name: 'Primary Core', x: 600, y: 400, radius: 70, pointsValue: 10 }
      ],
      terrain: [
        { id: `ter_1_${Date.now()}`, name: 'Central Ruins', type: 'Ruins', x: 600, y: 400, width: 140, height: 90, coverBonus: 1, color: '#e11d48' }
      ],
      paintedZones: [
        {
          id: `zone_diff_${Date.now()}`,
          name: 'Slag Trench (Difficult)',
          zoneType: 'DifficultTerrain',
          shape: 'rect',
          bounds: { x: 520, y: 220, width: 160, height: 90 },
          movementPenalty: 2,
          color: 'rgba(16, 185, 129, 0.35)'
        }
      ],
      structures: [
        {
          id: `struct_bldg_${Date.now()}`,
          name: 'Bastion Ruins',
          type: 'Ruins',
          x: 400,
          y: 400,
          width: 140,
          height: 100,
          totalLevels: 3,
          blocksLineOfSight: true,
          coverBonus: 1,
          blocksLargeUnits: true,
          levels: [
            { levelNumber: 1, name: 'Ground Floor (L1)', coverBonus: 1 },
            { levelNumber: 2, name: 'First Floor Balcony (L2)', coverBonus: 2 },
            { levelNumber: 3, name: 'Roof Vantage (L3)', coverBonus: 1 }
          ]
        }
      ],
      createdAt: new Date().toISOString(),
      isCustom: true
    };
    setActiveMap(freshMap);
    setActiveMapId(newId);
    setSelectedItemId(null);
    setSelectedItemType(null);
    notify('Created new custom battlefield template!');
  };

  const handleSaveMap = () => {
    StorageService.saveMap(activeMap);
    const updated = StorageService.getMaps();
    setMaps(updated);
    setActiveMapId(activeMap.id);
    onMapSaved?.(activeMap);
    notify(`Battle map "${activeMap.name}" successfully saved!`);
  };

  const handleDeleteMap = (mapId: string) => {
    StorageService.deleteMap(mapId);
    const updated = StorageService.getMaps();
    setMaps(updated);
    const nextMap = updated[0] || PRESET_MAPS[0];
    setActiveMapId(nextMap.id);
    setActiveMap(JSON.parse(JSON.stringify(nextMap)));
    setSelectedItemId(null);
    setSelectedItemType(null);
    notify('Custom map deleted from library.');
  };

  // Background image file upload with validation, canvas compression, and auto-persistence
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-uploading the same file works reliably
    e.target.value = '';

    // Validate MIME format
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      notify('Upload failed: Unsupported file format. Please upload a PNG, JPG, or WebP image.');
      return;
    }

    // Validate file size limit (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      notify('Upload failed: File exceeds 10MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      notify('Upload failed: Could not read image file from disk.');
    };
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        notify('Upload failed: Empty image content.');
        return;
      }

      const img = new Image();
      img.onerror = () => {
        notify('Upload failed: Corrupted or invalid image data.');
      };
      img.onload = () => {
        try {
          // Standardize & compress image to fit comfortably in browser storage (1200x800 board aspect)
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = width;
          offscreenCanvas.height = height;
          const ctx = offscreenCanvas.getContext('2d');
          if (!ctx) {
            notify('Upload failed: HTML5 canvas rendering context unavailable.');
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.78);

          const updatedMap: BattleMap = {
            ...activeMap,
            backgroundImageUrl: compressedDataUrl,
            isCustom: true
          };

          setActiveMap(updatedMap);

          // CRITICAL: Immediately persist to StorageService so it's available in Battlefield without extra clicks
          const saveOk = StorageService.saveMap(updatedMap);
          if (saveOk) {
            setMaps(StorageService.getMaps());
            onMapSaved?.(updatedMap);
            notify('Battlefield background map image updated, compressed, and saved!');
          } else {
            notify('Background updated in editor, but browser storage is full. Try deleting unused custom maps.');
          }
        } catch (err: any) {
          notify(`Upload error: ${err?.message || 'Failed processing image.'}`);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleClearBackgroundImage = () => {
    const updatedMap: BattleMap = {
      ...activeMap,
      backgroundImageUrl: undefined,
      isCustom: true
    };
    setActiveMap(updatedMap);
    StorageService.saveMap(updatedMap);
    setMaps(StorageService.getMaps());
    onMapSaved?.(updatedMap);
    notify('Background image removed and map saved.');
  };

  // Add Terrain Piece
  const handleAddTerrain = (preset: typeof TERRAIN_PRESETS[0]) => {
    const newId = `ter_${Date.now()}`;
    const newFeature: TerrainFeature = {
      id: newId,
      name: preset.name,
      type: preset.type,
      x: 600,
      y: 400,
      width: preset.width,
      height: preset.height,
      blocksMovement: preset.blocksMovement,
      blocksLineOfSight: preset.blocksLoS,
      coverBonus: preset.cover,
      color: preset.color,
      icon: preset.icon
    };

    setActiveMap(prev => ({
      ...prev,
      terrain: [...prev.terrain, newFeature]
    }));
    setSelectedItemId(newId);
    setSelectedItemType('terrain');
    notify(`Added ${preset.name} to center.`);
  };

  // Add Objective Marker
  const handleAddObjective = () => {
    const newId = `obj_${Date.now()}`;
    const newObj: MapObjective = {
      id: newId,
      name: `Objective ${activeMap.objectives.length + 1}`,
      x: 600,
      y: 400,
      radius: 65,
      pointsValue: 5
    };

    setActiveMap(prev => ({
      ...prev,
      objectives: [...prev.objectives, newObj]
    }));
    setSelectedItemId(newId);
    setSelectedItemType('objective');
    notify('Added new objective capture zone.');
  };

  // Add Painted Zone
  const handleAddPaintedZone = (preset: typeof PAINTED_ZONE_PRESETS[0]) => {
    const newId = `zone_${Date.now()}`;
    const newZone: PaintedZone = {
      id: newId,
      name: preset.name,
      zoneType: preset.type,
      shape: 'rect',
      bounds: { x: 550, y: 350, width: preset.width, height: preset.height },
      movementPenalty: preset.penalty,
      color: preset.color,
      objectivePoints: preset.type === 'ObjectiveArea' ? 5 : undefined
    };

    setActiveMap(prev => ({
      ...prev,
      paintedZones: [...(prev.paintedZones || []), newZone]
    }));
    setSelectedItemId(newId);
    setSelectedItemType('zone');
    notify(`Added ${preset.name} painted zone.`);
  };

  // Add Multi-Level Structure
  const handleAddStructure = (type: 'Building' | 'Ruins' | 'Watchtower' | 'Bunker') => {
    const newId = `struct_${Date.now()}`;
    const newStruct: MultiLevelStructure = {
      id: newId,
      name: `${type} Sector ${((activeMap.structures?.length || 0) + 1)}`,
      type,
      x: 600,
      y: 400,
      width: 140,
      height: 100,
      totalLevels: 2,
      blocksLineOfSight: true,
      coverBonus: 1,
      blocksLargeUnits: true,
      levels: [
        { levelNumber: 1, name: 'Ground Floor (L1)', coverBonus: 1 },
        { levelNumber: 2, name: 'Floor 1 (L2)', coverBonus: 2 }
      ]
    };

    setActiveMap(prev => ({
      ...prev,
      structures: [...(prev.structures || []), newStruct]
    }));
    setSelectedItemId(newId);
    setSelectedItemType('structure');
    notify(`Added multi-level ${type} with 2 floors.`);
  };

  // Delete Selected Item
  const handleDeleteSelected = () => {
    if (!selectedItemId) return;
    if (selectedItemType === 'terrain') {
      setActiveMap(prev => ({ ...prev, terrain: prev.terrain.filter(t => t.id !== selectedItemId) }));
    } else if (selectedItemType === 'objective') {
      setActiveMap(prev => ({ ...prev, objectives: prev.objectives.filter(o => o.id !== selectedItemId) }));
    } else if (selectedItemType === 'zone') {
      setActiveMap(prev => ({ ...prev, paintedZones: (prev.paintedZones || []).filter(z => z.id !== selectedItemId) }));
    } else if (selectedItemType === 'structure') {
      setActiveMap(prev => ({ ...prev, structures: (prev.structures || []).filter(s => s.id !== selectedItemId) }));
    }
    setSelectedItemId(null);
    setSelectedItemType(null);
    notify('Item removed from map.');
  };

  // Drag-and-drop element on canvas
  const handleItemMouseDown = (
    e: React.MouseEvent,
    id: string,
    type: 'terrain' | 'objective' | 'zone' | 'structure',
    currentX: number,
    currentY: number
  ) => {
    e.stopPropagation();
    setSelectedItemId(id);
    setSelectedItemType(type);
    setIsDraggingCanvasItem(true);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickWorldX = ((e.clientX - rect.left) / rect.width) * activeMap.width;
      const clickWorldY = ((e.clientY - rect.top) / rect.height) * activeMap.height;
      setDragItemOffset({
        x: clickWorldX - currentX,
        y: clickWorldY - currentY
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvasItem || !selectedItemId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cursorWorldX = ((e.clientX - rect.left) / rect.width) * activeMap.width;
    const cursorWorldY = ((e.clientY - rect.top) / rect.height) * activeMap.height;

    const newX = Math.round(Math.max(20, Math.min(activeMap.width - 20, cursorWorldX - dragItemOffset.x)));
    const newY = Math.round(Math.max(20, Math.min(activeMap.height - 20, cursorWorldY - dragItemOffset.y)));

    if (selectedItemType === 'terrain') {
      setActiveMap(prev => ({
        ...prev,
        terrain: prev.terrain.map(t => t.id === selectedItemId ? { ...t, x: newX, y: newY } : t)
      }));
    } else if (selectedItemType === 'objective') {
      setActiveMap(prev => ({
        ...prev,
        objectives: prev.objectives.map(o => o.id === selectedItemId ? { ...o, x: newX, y: newY } : o)
      }));
    } else if (selectedItemType === 'zone') {
      setActiveMap(prev => ({
        ...prev,
        paintedZones: (prev.paintedZones || []).map(z => z.id === selectedItemId && z.bounds ? {
          ...z,
          bounds: { ...z.bounds, x: newX, y: newY }
        } : z)
      }));
    } else if (selectedItemType === 'structure') {
      setActiveMap(prev => ({
        ...prev,
        structures: (prev.structures || []).map(s => s.id === selectedItemId ? { ...s, x: newX, y: newY } : s)
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingCanvasItem) {
      setIsDraggingCanvasItem(false);
    }
  };

  const selectedTerrain = selectedItemType === 'terrain' ? activeMap.terrain.find(t => t.id === selectedItemId) : null;
  const selectedObjective = selectedItemType === 'objective' ? activeMap.objectives.find(o => o.id === selectedItemId) : null;
  const selectedZone = selectedItemType === 'zone' ? (activeMap.paintedZones || []).find(z => z.id === selectedItemId) : null;
  const selectedStructure = selectedItemType === 'structure' ? (activeMap.structures || []).find(s => s.id === selectedItemId) : null;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-14 right-6 z-50 bg-emerald-950 border border-emerald-500 text-emerald-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 animate-in fade-in duration-200 text-xs font-mono">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Map Selector & Actions Bar */}
      <div className="bg-[#12141c] border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Map Architect Studio</span>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 font-mono px-2 py-0.5 rounded-full border border-zinc-700">
                {activeMap.gridWidthInches || 44}" × {activeMap.gridHeightInches || 30}" Tabletop ({activeMap.width} × {activeMap.height}px)
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Configure map dimensions, background imagery, multi-level ruins, painted hazard zones, and deployment boundaries.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCreateNewMap}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Map</span>
          </button>

          <button
            onClick={handleSaveMap}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono rounded-lg shadow-lg transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save to Library</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Canvas Editor, Right Properties Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Library & Interactive Canvas: Col 8 */}
        <div className="lg:col-span-8 space-y-4">
          {/* Saved Maps Selector Bar */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            {maps.map(m => {
              const isSelected = m.id === activeMapId;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMap(m.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center space-x-2 shrink-0 transition cursor-pointer select-none ${
                    isSelected
                      ? 'bg-rose-950/60 border-rose-500 text-white ring-2 ring-rose-500/50 shadow-lg'
                      : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <span>{m.theme === 'Industrial' ? '🏭' : m.theme === 'Verdant Forest' ? '🌲' : '🏛️'}</span>
                  <span className="font-bold">{m.name}</span>
                  {m.isCustom && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">Custom</span>}
                </button>
              );
            })}
          </div>

          {/* Interactive Visual Map Canvas */}
          <div className="bg-zinc-950 border-2 border-zinc-800 rounded-2xl p-3 shadow-2xl relative select-none">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2 px-1">
              <span className="flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Interactive Board Preview (Click and drag elements)</span>
              </span>
              <span>
                {activeMap.objectives.length} Objectives • {activeMap.terrain.length} Terrain • {activeMap.paintedZones?.length || 0} Zones • {activeMap.structures?.length || 0} Multi-Level
              </span>
            </div>

            {/* Canvas Box */}
            <div
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              style={{ aspectRatio: `${activeMap.width} / ${activeMap.height}` }}
              className="w-full relative bg-[#07090e] border border-zinc-750 rounded-xl overflow-hidden shadow-inner cursor-crosshair"
            >
              {/* Optional Background Image Layer */}
              {activeMap.backgroundImageUrl && (
                <img
                  src={activeMap.backgroundImageUrl}
                  alt="Map Backdrop Preview"
                  className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none select-none"
                />
              )}

              {/* Grid Background Pattern */}
              <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
                <defs>
                  <pattern id="editor-grid" width="4.166%" height="6.25%" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#94a3b8" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#editor-grid)" />
              </svg>

              {/* Player 1 Deployment Zone Overlay (West) */}
              <div
                style={{ width: `${(activeMap.deploymentZones.player1.maxX / activeMap.width) * 100}%` }}
                className="absolute inset-y-0 left-0 bg-rose-950/25 border-r-2 border-dashed border-rose-500/60 pointer-events-none flex items-center justify-center"
              >
                <span className="text-[10px] font-mono font-black text-rose-300 uppercase tracking-widest rotate-90 opacity-70">
                  {activeMap.deploymentZones.player1.label || 'Player 1 Zone'} ({activeMap.deploymentZones.player1.maxX}px)
                </span>
              </div>

              {/* Player 2 Deployment Zone Overlay (East) */}
              <div
                style={{ 
                  left: `${(activeMap.deploymentZones.player2.minX / activeMap.width) * 100}%`,
                  width: `${((activeMap.width - activeMap.deploymentZones.player2.minX) / activeMap.width) * 100}%`
                }}
                className="absolute inset-y-0 right-0 bg-sky-950/25 border-l-2 border-dashed border-sky-500/60 pointer-events-none flex items-center justify-center"
              >
                <span className="text-[10px] font-mono font-black text-sky-300 uppercase tracking-widest -rotate-90 opacity-70">
                  {activeMap.deploymentZones.player2.label || 'Player 2 Zone'} ({activeMap.width - activeMap.deploymentZones.player2.minX}px)
                </span>
              </div>

              {/* Painted Zones on Canvas */}
              {(activeMap.paintedZones || []).map(zone => {
                if (!zone.bounds) return null;
                const isSelected = selectedItemId === zone.id;
                const leftPct = (zone.bounds.x / activeMap.width) * 100;
                const topPct = (zone.bounds.y / activeMap.height) * 100;
                const widthPct = (zone.bounds.width / activeMap.width) * 100;
                const heightPct = (zone.bounds.height / activeMap.height) * 100;

                return (
                  <div
                    key={zone.id}
                    onMouseDown={e => handleItemMouseDown(e, zone.id, 'zone', zone.bounds!.x, zone.bounds!.y)}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                      backgroundColor: zone.color || 'rgba(239, 68, 68, 0.25)'
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center transition-all z-10 ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                        : 'border-dashed border-white/40 hover:border-white'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-black text-white px-1.5 py-0.5 rounded bg-black/70 shadow text-center leading-tight">
                      {zone.name}
                      {zone.movementPenalty && zone.movementPenalty > 0 && (
                        <span className="block text-[8px] text-amber-300">-{zone.movementPenalty} Mv</span>
                      )}
                    </span>
                  </div>
                );
              })}

              {/* Multi-Level Structures on Canvas */}
              {(activeMap.structures || []).map(struct => {
                const isSelected = selectedItemId === struct.id;
                const leftPct = (struct.x / activeMap.width) * 100;
                const topPct = (struct.y / activeMap.height) * 100;
                const widthPct = (struct.width / activeMap.width) * 100;
                const heightPct = (struct.height / activeMap.height) * 100;

                return (
                  <div
                    key={struct.id}
                    onMouseDown={e => handleItemMouseDown(e, struct.id, 'structure', struct.x, struct.y)}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl bg-purple-950/60 border-2 cursor-grab active:cursor-grabbing flex flex-col items-center justify-between p-1 transition-all z-20 shadow-xl ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_25px_rgba(251,191,36,0.6)]'
                        : 'border-purple-500/80 hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full text-[8px] font-mono font-bold text-purple-200 bg-black/80 px-1 py-0.5 rounded">
                      <span className="truncate">{struct.name}</span>
                      <span className="bg-purple-800 text-white px-1 rounded">
                        {struct.levels.length}F
                      </span>
                    </div>

                    {/* Floor Stack Preview */}
                    <div className="flex items-center space-x-1 py-0.5">
                      {struct.levels.map(l => (
                        <div
                          key={l.levelNumber}
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-mono font-bold border ${
                            activeFloorPreview === l.levelNumber
                              ? 'bg-amber-400 text-black border-white'
                              : 'bg-purple-900 text-purple-200 border-purple-600'
                          }`}
                        >
                          L{l.levelNumber}
                        </div>
                      ))}
                    </div>

                    {struct.blocksLargeUnits && (
                      <span className="text-[7px] text-amber-300 font-mono bg-black/80 px-1 rounded">
                        ⚠️ Blocks Large/Vehicles
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Terrain Features on Canvas */}
              {activeMap.terrain.map(t => {
                const isSelected = selectedItemId === t.id;
                const leftPct = (t.x / activeMap.width) * 100;
                const topPct = (t.y / activeMap.height) * 100;
                const widthPct = (t.width / activeMap.width) * 100;
                const heightPct = (t.height / activeMap.height) * 100;

                return (
                  <div
                    key={t.id}
                    onMouseDown={e => handleItemMouseDown(e, t.id, 'terrain', t.x, t.y)}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                      backgroundColor: `${t.color || '#334155'}40`,
                      borderColor: t.color || '#64748b'
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center p-1 transition-all z-20 shadow-lg select-none ${
                      isSelected 
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black scale-105 shadow-[0_0_20px_rgba(251,191,36,0.6)]' 
                        : 'hover:border-white/80'
                    }`}
                  >
                    <span className="text-xl filter drop-shadow">{t.icon || '🏛️'}</span>
                    <span className="text-[9px] font-mono font-bold text-white bg-black/80 px-1 rounded mt-0.5 truncate max-w-full">
                      {t.name}
                    </span>
                    {t.blocksMovement && (
                      <span className="text-[7px] bg-red-950 text-red-300 font-mono px-1 rounded uppercase font-bold mt-0.5">
                        Impassable
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Objectives on Canvas */}
              {activeMap.objectives.map(o => {
                const isSelected = selectedItemId === o.id;
                const leftPct = (o.x / activeMap.width) * 100;
                const topPct = (o.y / activeMap.height) * 100;
                const radiusPctX = (o.radius / activeMap.width) * 100;
                const radiusPctY = (o.radius / activeMap.height) * 100;

                return (
                  <div
                    key={o.id}
                    onMouseDown={e => handleItemMouseDown(e, o.id, 'objective', o.x, o.y)}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    className="absolute z-30 cursor-grab active:cursor-grabbing flex flex-col items-center"
                  >
                    <div
                      style={{
                        width: `${radiusPctX * 2 * 12}px`,
                        height: `${radiusPctY * 2 * 8}px`
                      }}
                      className={`rounded-full border-2 border-dashed transition-colors ${
                        isSelected 
                          ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.4)]' 
                          : 'border-rose-500/60 bg-rose-500/10'
                      }`}
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center pointer-events-none">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div className="mt-1 bg-black/90 border border-zinc-700 px-1.5 py-0.2 rounded text-[8px] font-mono font-bold text-amber-300 pointer-events-none whitespace-nowrap shadow">
                      {o.name} ({o.pointsValue} VP)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Palette Tool Tabs: Terrain, Zones, Structures, Settings */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveToolTab('terrain')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    activeToolTab === 'terrain' ? 'bg-rose-950 text-rose-300 border border-rose-600' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🏛️ Terrain Presets
                </button>
                <button
                  onClick={() => setActiveToolTab('zones')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    activeToolTab === 'zones' ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🎨 Paintable Zones
                </button>
                <button
                  onClick={() => setActiveToolTab('structures')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    activeToolTab === 'structures' ? 'bg-purple-950 text-purple-300 border border-purple-600' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🏢 Multi-Level Ruins (L1-L5)
                </button>
                <button
                  onClick={() => setActiveToolTab('settings')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    activeToolTab === 'settings' ? 'bg-amber-950 text-amber-300 border border-amber-600' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  📐 Map Dimensions & Image
                </button>
              </div>

              <button
                onClick={handleAddObjective}
                className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 text-xs font-mono rounded-lg transition flex items-center space-x-1 cursor-pointer"
              >
                <MapPin className="w-3 h-3 text-rose-400" />
                <span>+ Objective</span>
              </button>
            </div>

            {/* Tab 1: Terrain */}
            {activeToolTab === 'terrain' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {TERRAIN_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddTerrain(preset)}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-center space-y-1 transition cursor-pointer select-none"
                  >
                    <span className="text-2xl block">{preset.icon}</span>
                    <span className="text-[10px] font-bold text-white block truncate">{preset.name}</span>
                    <span className="text-[9px] text-zinc-500 font-mono block">
                      {preset.width}x{preset.height}px
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Tab 2: Painted Zones */}
            {activeToolTab === 'zones' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {PAINTED_ZONE_PRESETS.map((zone, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddPaintedZone(zone)}
                      className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left space-y-1 transition cursor-pointer select-none"
                    >
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: zone.color }} />
                      <span className="text-[10px] font-bold text-white block truncate">{zone.name}</span>
                      <span className="text-[9px] text-zinc-500 font-mono block">
                        {zone.type === 'DifficultTerrain' ? '-2 Mv Penalty' : zone.type === 'Impassable' ? 'Blocks Move' : 'Custom Zone'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Multi-Level Structures */}
            {activeToolTab === 'structures' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  {(['Ruins', 'Building', 'Watchtower', 'Bunker'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => handleAddStructure(type)}
                      className="px-3 py-2 bg-purple-950/60 hover:bg-purple-900 border border-purple-700 text-purple-200 rounded-xl text-xs font-mono font-bold transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>+ {type} (Multi-Level)</span>
                    </button>
                  ))}
                </div>
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-[10px] font-mono text-zinc-400 space-y-1">
                  <span className="text-amber-400 font-bold block">🏢 Multi-Level Rules (1-5 Floors):</span>
                  <span>• Supports 1 to 5 levels (L1 Ground, L2 Floor 1, up to L5 Apex).</span>
                  <span className="block">• <strong>Vehicle / Huge Blocking:</strong> When enabled, Vehicles & Huge units cannot freely traverse through building footprints; entering/exiting consumes their full move.</span>
                </div>
              </div>
            )}

            {/* Tab 4: Settings (Dimensions & Background Image) */}
            {activeToolTab === 'settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono block">
                    Map Dimension Presets (Inches & Pixels)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {MAP_SIZE_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setActiveMap(prev => ({
                            ...prev,
                            gridWidthInches: preset.widthIn,
                            gridHeightInches: preset.heightIn,
                            width: preset.widthPx,
                            height: preset.heightPx
                          }));
                          notify(`Adjusted map dimensions to ${preset.label}`);
                        }}
                        className={`p-2 rounded-lg border text-left text-xs font-mono transition cursor-pointer ${
                          activeMap.gridWidthInches === preset.widthIn && activeMap.gridHeightInches === preset.heightIn
                            ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-500'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="font-bold block text-white">{preset.label}</span>
                        <span className="text-[9px] text-zinc-500">{preset.widthPx} × {preset.heightPx}px</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                      Coherency Distance (Inches, default 2")
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      min={1}
                      max={5}
                      value={activeMap.coherencyDistanceInches || 2}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setActiveMap(prev => ({ ...prev, coherencyDistanceInches: val }));
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono block">
                    Background Tabletop Map Image
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Upload Map Image</span>
                    </button>
                    {activeMap.backgroundImageUrl && (
                      <button
                        onClick={handleClearBackgroundImage}
                        className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-mono rounded-lg transition flex items-center space-x-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear Image</span>
                      </button>
                    )}
                  </div>
                  {activeMap.backgroundImageUrl && (
                    <div className="mt-2 w-full h-24 rounded-lg overflow-hidden border border-zinc-750 relative">
                      <img
                        src={activeMap.backgroundImageUrl}
                        alt="Map Background"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 text-[8px] text-zinc-300 font-mono rounded">
                        Active Backdrop
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Properties Editor Panel: Col 4 */}
        <div className="lg:col-span-4 space-y-4">
          {/* Map Metadata Editor */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono">
              Map Sector Parameters
            </h3>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">Sector Name</label>
              <input
                type="text"
                value={activeMap.name}
                onChange={e => setActiveMap({ ...activeMap, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Visual Theme</label>
                <select
                  value={activeMap.theme}
                  onChange={e => setActiveMap({ ...activeMap, theme: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none font-mono"
                >
                  {THEMES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Grid Size</label>
                <div className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 rounded-lg text-xs text-zinc-400 font-mono text-center">
                  {activeMap.width} × {activeMap.height} px
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">Lore / Briefing</label>
              <textarea
                rows={2}
                value={activeMap.description || ''}
                onChange={e => setActiveMap({ ...activeMap, description: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none font-mono resize-none"
              />
            </div>

            {/* Deployment Depth Sliders */}
            <div className="border-t border-zinc-800 pt-3 space-y-3">
              <span className="text-[10px] font-bold text-amber-400 uppercase font-mono block">
                Deployment Zone Boundaries
              </span>

              <div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                  <span>Player 1 (West Depth)</span>
                  <span className="text-rose-400 font-bold">{activeMap.deploymentZones.player1.maxX} px</span>
                </div>
                <input
                  type="range"
                  min={150}
                  max={350}
                  step={10}
                  value={activeMap.deploymentZones.player1.maxX}
                  onChange={e => {
                    const depth = Number(e.target.value);
                    setActiveMap({
                      ...activeMap,
                      deploymentZones: {
                        ...activeMap.deploymentZones,
                        player1: { ...activeMap.deploymentZones.player1, maxX: depth }
                      }
                    });
                  }}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                  <span>Player 2 (East Depth)</span>
                  <span className="text-sky-400 font-bold">{activeMap.width - activeMap.deploymentZones.player2.minX} px</span>
                </div>
                <input
                  type="range"
                  min={150}
                  max={350}
                  step={10}
                  value={activeMap.width - activeMap.deploymentZones.player2.minX}
                  onChange={e => {
                    const depth = Number(e.target.value);
                    setActiveMap({
                      ...activeMap,
                      deploymentZones: {
                        ...activeMap.deploymentZones,
                        player2: { ...activeMap.deploymentZones.player2, minX: activeMap.width - depth }
                      }
                    });
                  }}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Item Inspector (Selected Terrain, Objective, Zone, or Structure) */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                {selectedItemType === 'terrain' ? 'Terrain Inspector' : 
                 selectedItemType === 'objective' ? 'Objective Inspector' :
                 selectedItemType === 'zone' ? 'Zone Inspector' :
                 selectedItemType === 'structure' ? 'Structure Floor Inspector' : 'Selection Inspector'}
              </h3>
              {selectedItemId && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleDeleteSelected}
                    className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/40 transition cursor-pointer"
                    title="Remove selected item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItemId(null);
                      setSelectedItemType(null);
                    }}
                    className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition cursor-pointer"
                    title="Close Inspector / Deselect"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {!selectedItemId ? (
              <div className="p-6 text-center text-zinc-500 text-xs font-mono space-y-1">
                <span>Select an element on the map to modify its properties.</span>
              </div>
            ) : selectedTerrain ? (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Name</label>
                  <input
                    type="text"
                    value={selectedTerrain.name}
                    onChange={e => {
                      const val = e.target.value;
                      setActiveMap(prev => ({
                        ...prev,
                        terrain: prev.terrain.map(t => t.id === selectedTerrain.id ? { ...t, name: val } : t)
                      }));
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Width (px)</label>
                    <input
                      type="number"
                      value={selectedTerrain.width}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setActiveMap(prev => ({
                          ...prev,
                          terrain: prev.terrain.map(t => t.id === selectedTerrain.id ? { ...t, width: val } : t)
                        }));
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Height (px)</label>
                    <input
                      type="number"
                      value={selectedTerrain.height}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setActiveMap(prev => ({
                          ...prev,
                          terrain: prev.terrain.map(t => t.id === selectedTerrain.id ? { ...t, height: val } : t)
                        }));
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center space-x-2 text-[10px] text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selectedTerrain.blocksMovement}
                      onChange={e => {
                        const val = e.target.checked;
                        setActiveMap(prev => ({
                          ...prev,
                          terrain: prev.terrain.map(t => t.id === selectedTerrain.id ? { ...t, blocksMovement: val } : t)
                        }));
                      }}
                      className="rounded text-rose-600 focus:ring-0"
                    />
                    <span>Blocks Move</span>
                  </label>

                  <label className="flex items-center space-x-2 text-[10px] text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selectedTerrain.blocksLineOfSight}
                      onChange={e => {
                        const val = e.target.checked;
                        setActiveMap(prev => ({
                          ...prev,
                          terrain: prev.terrain.map(t => t.id === selectedTerrain.id ? { ...t, blocksLineOfSight: val } : t)
                        }));
                      }}
                      className="rounded text-rose-600 focus:ring-0"
                    />
                    <span>Blocks LoS</span>
                  </label>
                </div>
              </div>
            ) : selectedObjective ? (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Objective Name</label>
                  <input
                    type="text"
                    value={selectedObjective.name}
                    onChange={e => {
                      const val = e.target.value;
                      setActiveMap(prev => ({
                        ...prev,
                        objectives: prev.objectives.map(o => o.id === selectedObjective.id ? { ...o, name: val } : o)
                      }));
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Points Value (VP)</label>
                    <input
                      type="number"
                      value={selectedObjective.pointsValue}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setActiveMap(prev => ({
                          ...prev,
                          objectives: prev.objectives.map(o => o.id === selectedObjective.id ? { ...o, pointsValue: val } : o)
                        }));
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white text-center text-amber-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Radius (px)</label>
                    <input
                      type="number"
                      value={selectedObjective.radius}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setActiveMap(prev => ({
                          ...prev,
                          objectives: prev.objectives.map(o => o.id === selectedObjective.id ? { ...o, radius: val } : o)
                        }));
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white text-center"
                    />
                  </div>
                </div>
              </div>
            ) : selectedZone ? (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Zone Name</label>
                  <input
                    type="text"
                    value={selectedZone.name}
                    onChange={e => {
                      const val = e.target.value;
                      setActiveMap(prev => ({
                        ...prev,
                        paintedZones: (prev.paintedZones || []).map(z => z.id === selectedZone.id ? { ...z, name: val } : z)
                      }));
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Zone Type</label>
                  <select
                    value={selectedZone.zoneType}
                    onChange={e => {
                      const val = e.target.value as PaintedZoneType;
                      setActiveMap(prev => ({
                        ...prev,
                        paintedZones: (prev.paintedZones || []).map(z => z.id === selectedZone.id ? { ...z, zoneType: val } : z)
                      }));
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white"
                  >
                    <option value="DifficultTerrain">Difficult Terrain (-2 Mv penalty)</option>
                    <option value="Impassable">Impassable Hazard (Blocks Move)</option>
                    <option value="DeploymentP1">Deployment Zone P1</option>
                    <option value="DeploymentP2">Deployment Zone P2</option>
                    <option value="ObjectiveArea">Objective Radius Area</option>
                  </select>
                </div>

                {selectedZone.bounds && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Width (px)</label>
                      <input
                        type="number"
                        value={selectedZone.bounds.width}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setActiveMap(prev => ({
                            ...prev,
                            paintedZones: (prev.paintedZones || []).map(z => z.id === selectedZone.id && z.bounds ? {
                              ...z,
                              bounds: { ...z.bounds, width: val }
                            } : z)
                          }));
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Height (px)</label>
                      <input
                        type="number"
                        value={selectedZone.bounds.height}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setActiveMap(prev => ({
                            ...prev,
                            paintedZones: (prev.paintedZones || []).map(z => z.id === selectedZone.id && z.bounds ? {
                              ...z,
                              bounds: { ...z.bounds, height: val }
                            } : z)
                          }));
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white text-center"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : selectedStructure ? (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Structure Name</label>
                  <input
                    type="text"
                    value={selectedStructure.name}
                    onChange={e => {
                      const val = e.target.value;
                      setActiveMap(prev => ({
                        ...prev,
                        structures: (prev.structures || []).map(s => s.id === selectedStructure.id ? { ...s, name: val } : s)
                      }));
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Width (px)</label>
                    <input
                      type="number"
                      value={selectedStructure.width}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setActiveMap(prev => ({
                          ...prev,
                          structures: (prev.structures || []).map(s => s.id === selectedStructure.id ? { ...s, width: val } : s)
                        }));
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Height (px)</label>
                    <input
                      type="number"
                      value={selectedStructure.height}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setActiveMap(prev => ({
                          ...prev,
                          structures: (prev.structures || []).map(s => s.id === selectedStructure.id ? { ...s, height: val } : s)
                        }));
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1.5 rounded text-white text-center"
                    />
                  </div>
                </div>

                {/* Structure Floors Editor */}
                <div className="border-t border-zinc-800 pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-400 font-bold block">
                      Floors ({selectedStructure.levels.length} / 5 Max)
                    </label>
                    {selectedStructure.levels.length < 5 && (
                      <button
                        onClick={() => {
                          const nextLvl = selectedStructure.levels.length + 1;
                          const newLevel: StructureLevel = {
                            levelNumber: nextLvl,
                            name: `Floor ${nextLvl} (L${nextLvl})`,
                            coverBonus: 1
                          };
                          setActiveMap(prev => ({
                            ...prev,
                            structures: (prev.structures || []).map(s => s.id === selectedStructure.id ? {
                              ...s,
                              levels: [...s.levels, newLevel]
                            } : s)
                          }));
                          notify(`Added Floor L${nextLvl} to ${selectedStructure.name}`);
                        }}
                        className="px-2 py-0.5 bg-purple-900 text-purple-200 border border-purple-600 rounded text-[9px] hover:bg-purple-800 cursor-pointer"
                      >
                        + Add Floor
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    {selectedStructure.levels.map((lvl, lidx) => (
                      <div key={lvl.levelNumber} className="flex items-center justify-between p-1.5 rounded bg-zinc-950 border border-zinc-800 text-[10px]">
                        <span className="text-purple-300 font-bold">L{lvl.levelNumber}: {lvl.name}</span>
                        {lidx > 0 && (
                          <button
                            onClick={() => {
                              setActiveMap(prev => ({
                                ...prev,
                                structures: (prev.structures || []).map(s => s.id === selectedStructure.id ? {
                                  ...s,
                                  levels: s.levels.filter(x => x.levelNumber !== lvl.levelNumber)
                                } : s)
                              }));
                            }}
                            className="text-rose-400 hover:text-rose-300 px-1"
                            title="Remove floor"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Blocks Large Units Checkbox */}
                <div className="border-t border-zinc-800 pt-2">
                  <label className="flex items-start space-x-2 text-[10px] text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selectedStructure.blocksLargeUnits}
                      onChange={e => {
                        const val = e.target.checked;
                        setActiveMap(prev => ({
                          ...prev,
                          structures: (prev.structures || []).map(s => s.id === selectedStructure.id ? {
                            ...s,
                            blocksLargeUnits: val
                          } : s)
                        }));
                      }}
                      className="rounded text-purple-600 focus:ring-0 mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-amber-300 block">Blocks Large Units / Vehicles</span>
                      <span className="text-[9px] text-zinc-500 leading-tight block">
                        Vehicles & Huge units cannot freely pass through building. Entering/exiting consumes full turn movement.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          {/* Delete Map Danger Zone (if custom) */}
          {activeMap.isCustom && (
            <div className="pt-2">
              <button
                onClick={() => handleDeleteMap(activeMap.id)}
                className="w-full py-2 bg-zinc-950 hover:bg-rose-950/60 border border-zinc-800 hover:border-rose-700 text-rose-400 text-xs font-mono rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete This Custom Map</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
