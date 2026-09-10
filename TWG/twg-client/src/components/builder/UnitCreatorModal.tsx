import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Upload, Image as ImageIcon, ZoomIn, ZoomOut, Move, 
  RotateCcw, Sparkles, Check, Shield, Heart, Zap, Crosshair
} from 'lucide-react';
import { Unit, UnitRole, UnitType, BaseShape, UnitSize } from '../../types/game';
import { StorageService } from '../../services/storageService';

interface UnitCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveUnit: (unit: Unit) => void;
  initialUnit?: Unit | null;
  factionId: string;
}

const ROLES: UnitRole[] = [
  'Legendary Leader',
  'Leader',
  'Battleline',
  'Infantry / Mounted',
  'Vehicle / Monster'
];

const BASE_SHAPES: { shape: BaseShape; label: string; aspect: string }[] = [
  { shape: 'circle', label: 'Circle (Standard)', aspect: '1:1' },
  { shape: 'oval', label: 'Oval (Cavalry/Bikes)', aspect: '1.5:1' },
  { shape: 'square', label: 'Square (Monolith)', aspect: '1:1' },
  { shape: 'rectangle', label: 'Rectangle (Chariot/Tank)', aspect: '1.6:1' }
];

const UNIT_SIZES: { size: UnitSize; label: string; radius: number }[] = [
  { size: 'Small', label: 'Small (32mm)', radius: 16 },
  { size: 'Medium', label: 'Medium (40mm)', radius: 20 },
  { size: 'Large', label: 'Large (52mm)', radius: 26 },
  { size: 'Huge', label: 'Huge (72mm)', radius: 36 },
  { size: 'Colossal', label: 'Colossal (96mm)', radius: 48 }
];

export const UnitCreatorModal: React.FC<UnitCreatorModalProps> = ({
  isOpen,
  onClose,
  onSaveUnit,
  initialUnit,
  factionId
}) => {
  if (!isOpen) return null;

  const factions = StorageService.getFactions();
  const faction = factions.find(f => f.id === factionId) || factions[0];

  // Unit form fields
  const [name, setName] = useState<string>(initialUnit?.name || 'Vanguard Specialist');
  const [role, setRole] = useState<UnitRole>(initialUnit?.role || 'Battleline');
  const [type, setType] = useState<UnitType>(initialUnit?.type || 'Infantry');
  const [points, setPoints] = useState<number>(initialUnit?.points || 75);
  const [avatar, setAvatar] = useState<string>(initialUnit?.avatar || faction?.symbol || '⚔️');
  const [description, setDescription] = useState<string>(initialUnit?.description || 'Custom tactical unit configured for battle.');
  const [canDeployOutsideZone, setCanDeployOutsideZone] = useState<boolean>(!!initialUnit?.canDeployOutsideZone);
  
  // Base Geometry
  const [baseShape, setBaseShape] = useState<BaseShape>(initialUnit?.baseShape || 'circle');
  const [unitSize, setUnitSize] = useState<UnitSize>(initialUnit?.size || 'Medium');

  // Stats
  const [mv, setMv] = useState<number>(initialUnit?.stats.mv ?? 5);
  const [def, setDef] = useState<number>(initialUnit?.stats.def ?? 5);
  const [am, setAm] = useState<number>(initialUnit?.stats.am ?? 5);
  const [lives, setLives] = useState<number>(initialUnit?.stats.lives ?? 5);
  const [modelCount, setModelCount] = useState<number>(initialUnit?.stats.modelCount ?? 5);
  const [range, setRange] = useState<number>(initialUnit?.stats.range ?? 0);
  const [cp, setCp] = useState<number>(initialUnit?.stats.cp ?? 3);

  // Token Image & Cropping State
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(initialUnit?.tokenImageUrl || null);
  const [tokenImageUrl, setTokenImageUrl] = useState<string | null>(initialUnit?.tokenImageUrl || null);
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  // When a new image source is loaded, prepare the HTMLImageElement
  useEffect(() => {
    if (!rawImageSrc) {
      imageObjRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      renderCroppedToken();
    };
    img.src = rawImageSrc;
  }, [rawImageSrc]);

  // Re-render cropped token whenever crop parameters or baseShape change
  useEffect(() => {
    if (imageObjRef.current) {
      renderCroppedToken();
    }
  }, [zoom, panX, panY, baseShape]);

  // Client-side crop & resize canvas rendering
  const renderCroppedToken = () => {
    const img = imageObjRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Target dimensions
    let targetW = 256;
    let targetH = 256;
    if (baseShape === 'oval') {
      targetW = 280;
      targetH = 190;
    } else if (baseShape === 'rectangle') {
      targetW = 300;
      targetH = 190;
    }

    canvas.width = targetW;
    canvas.height = targetH;

    ctx.clearRect(0, 0, targetW, targetH);

    // Save context before clipping
    ctx.save();

    // Clip to base shape
    ctx.beginPath();
    if (baseShape === 'circle') {
      ctx.arc(targetW / 2, targetH / 2, targetW / 2, 0, Math.PI * 2);
    } else if (baseShape === 'oval') {
      ctx.ellipse(targetW / 2, targetH / 2, targetW / 2, targetH / 2, 0, 0, Math.PI * 2);
    } else if (baseShape === 'square') {
      const radius = 24;
      ctx.roundRect(0, 0, targetW, targetH, radius);
    } else if (baseShape === 'rectangle') {
      const radius = 20;
      ctx.roundRect(0, 0, targetW, targetH, radius);
    }
    ctx.closePath();
    ctx.clip();

    // Background fill
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, targetW, targetH);

    // Calculate source scaling
    const scale = Math.max(targetW / img.width, targetH / img.height) * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (targetW - drawW) / 2 + panX;
    const drawY = (targetH - drawH) / 2 + panY;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    ctx.restore();

    // Export optimized base64 data URL
    try {
      const dataUrl = canvas.toDataURL('image/webp', 0.85);
      setTokenImageUrl(dataUrl);
    } catch {
      const pngUrl = canvas.toDataURL('image/png');
      setTokenImageUrl(pngUrl);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      alert('Please upload a standard image file (PNG, JPG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setRawImageSrc(result);
        setZoom(1);
        setPanX(0);
        setPanY(0);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetFraming = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleClearImage = () => {
    setRawImageSrc(null);
    setTokenImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const livesNum = Math.max(1, Number(lives) || 5);
    const modelNum = Math.max(1, Number(modelCount) || 1);
    const hpPerModel = Math.max(1, Math.floor(livesNum / modelNum));
    const selectedSizeConfig = UNIT_SIZES.find(s => s.size === unitSize) || UNIT_SIZES[1];

    let baseWidth = selectedSizeConfig.radius * 2;
    let baseHeight = selectedSizeConfig.radius * 2;

    if (baseShape === 'oval') {
      baseWidth = Math.round(selectedSizeConfig.radius * 2.2);
      baseHeight = Math.round(selectedSizeConfig.radius * 1.4);
    } else if (baseShape === 'rectangle') {
      baseWidth = Math.round(selectedSizeConfig.radius * 2.4);
      baseHeight = Math.round(selectedSizeConfig.radius * 1.5);
    }

    const unit: Unit = {
      id: initialUnit?.id || `unit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      templateId: initialUnit?.templateId || `${factionId}_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name: name.trim(),
      factionId,
      type,
      role,
      size: unitSize,
      baseRadius: selectedSizeConfig.radius,
      baseShape,
      baseWidth,
      baseHeight,
      points: Number(points) || 75,
      avatar: avatar.trim() || faction?.symbol || '⚔️',
      tokenImageUrl: tokenImageUrl || undefined,
      description: description.trim(),
      passives: initialUnit?.passives || ['Veteran Specialists', 'Custom Loadout'],
      canDeployOutsideZone,
      owner: initialUnit?.owner || 'player1',
      position: initialUnit?.position || null,
      tokens: initialUnit?.tokens || [],
      formation: initialUnit?.formation || 'circle',
      transportCapacity: type === 'Vehicle' ? 1 : undefined,
      stats: {
        mv: Number(mv) || 5,
        def: Number(def) || 5,
        baseDef: Number(def) || 5,
        defModifier: 0,
        am: Number(am) || 5,
        lives: livesNum,
        maxLives: livesNum,
        modelCount: modelNum,
        hpPerModel,
        cp: Number(cp) || 3,
        range: Number(range) || 0,
        size: unitSize,
        baseShape,
        baseWidth,
        baseHeight,
        baseRadius: selectedSizeConfig.radius
      },
      hasMoved: false,
      hasShot: false,
      hasCharged: false,
      hasFought: false,
      advantageStacks: 0,
      disadvantageStacks: 0
    };

    onSaveUnit(unit);
    onClose();
  };

  const isLeaderRole = role === 'Legendary Leader' || role === 'Leader';

  // Preview shape styling
  const shapePreviewClass = 
    baseShape === 'circle' ? 'rounded-full' :
    baseShape === 'oval' ? 'rounded-[40%]' :
    baseShape === 'square' ? 'rounded-2xl' :
    'rounded-xl';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#10131d] border border-zinc-700 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-[#161a26]">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{initialUnit ? 'Customize Unit & Token' : 'Create Custom Unit'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                  {faction?.shortName || factionId}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Configure combat profile, base geometry, and custom token portrait</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Token Image Upload & Live Preview (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider font-mono text-amber-400 flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4" />
                  <span>Token Portrait & Preview</span>
                </span>
                {tokenImageUrl && (
                  <button
                    onClick={handleClearImage}
                    className="text-[10px] font-mono text-rose-400 hover:text-rose-300 transition cursor-pointer"
                  >
                    Remove Image
                  </button>
                )}
              </div>

              {/* Live Preview Arena */}
              <div className="p-6 bg-radial from-zinc-900 to-[#0c0e15] border border-zinc-800 rounded-2xl flex flex-col items-center justify-center relative shadow-inner">
                {/* Simulated Grid Overlay Background */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none rounded-2xl"></div>

                {/* Live Base Shape Preview */}
                <div 
                  className={`relative flex items-center justify-center border-4 shadow-2xl transition-all duration-200 overflow-hidden ${shapePreviewClass} ${
                    isLeaderRole
                      ? 'border-amber-400 ring-4 ring-amber-500/40 bg-gradient-to-tr from-amber-950 via-zinc-900 to-amber-900'
                      : 'border-rose-500 ring-4 ring-rose-500/30 bg-gradient-to-tr from-rose-950 via-zinc-900 to-red-950'
                  }`}
                  style={{
                    width: baseShape === 'oval' ? '140px' : baseShape === 'rectangle' ? '150px' : '120px',
                    height: baseShape === 'oval' ? '95px' : baseShape === 'rectangle' ? '95px' : '120px'
                  }}
                >
                  {tokenImageUrl ? (
                    <img
                      src={tokenImageUrl}
                      alt={name}
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-2">
                      <span className="text-4xl filter drop-shadow select-none">{avatar}</span>
                      <span className="text-[9px] text-zinc-500 font-mono mt-1">Default Faction Icon</span>
                    </div>
                  )}

                  {/* Leader Crown Badge */}
                  {isLeaderRole && (
                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-amber-400 text-black rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none shadow flex items-center space-x-0.5">
                      <span>★</span>
                      <span>LEADER</span>
                    </div>
                  )}

                  {/* Health / Lives Badge */}
                  <div className="absolute bottom-1 right-1.5 bg-black/90 text-emerald-400 border border-zinc-700 font-mono font-bold text-[9px] px-1.5 py-0.2 rounded-full leading-none shadow">
                    {lives}L
                  </div>

                  {/* Defense Chip */}
                  <div className="absolute bottom-1 left-1.5 bg-black/90 text-sky-400 border border-zinc-700 font-mono font-bold text-[9px] px-1.5 py-0.2 rounded-full leading-none shadow">
                    {def}D
                  </div>
                </div>

                {/* Shape Dimension Tag */}
                <div className="mt-4 flex items-center space-x-2 text-[10px] font-mono text-zinc-400">
                  <span className="px-2 py-0.5 rounded bg-zinc-850 border border-zinc-750">
                    {baseShape.toUpperCase()} • {unitSize}
                  </span>
                  {canDeployOutsideZone && (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold">
                      DEPLOY ANYWHERE
                    </span>
                  )}
                </div>
              </div>

              {/* Upload & Crop Controls */}
              <div className="space-y-3 bg-[#131622] p-4 rounded-xl border border-zinc-800">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono rounded-lg shadow flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Token Image</span>
                  </button>
                  {rawImageSrc && (
                    <button
                      onClick={handleResetFraming}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition cursor-pointer"
                      title="Reset Framing / Centering"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-zinc-500 text-center">
                  Accepts PNG, JPG, WebP. Formatted automatically to the chosen base shape.
                </p>

                {/* Framing & Zoom Sliders (Only if image is loaded) */}
                {rawImageSrc && (
                  <div className="space-y-2.5 pt-2 border-t border-zinc-800 text-[11px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center space-x-1">
                        <ZoomIn className="w-3 h-3 text-amber-400" />
                        <span>Scale / Zoom:</span>
                      </span>
                      <span className="text-amber-300 font-bold">{Math.round(zoom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.05"
                      value={zoom}
                      onChange={e => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
                    />

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <div className="flex justify-between text-zinc-400 text-[10px]">
                          <span>Pan X:</span>
                          <span>{panX}px</span>
                        </div>
                        <input
                          type="range"
                          min="-120"
                          max="120"
                          step="2"
                          value={panX}
                          onChange={e => setPanX(parseInt(e.target.value))}
                          className="w-full accent-zinc-400 h-1 bg-zinc-750 rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-zinc-400 text-[10px]">
                          <span>Pan Y:</span>
                          <span>{panY}px</span>
                        </div>
                        <input
                          type="range"
                          min="-120"
                          max="120"
                          step="2"
                          value={panY}
                          onChange={e => setPanY(parseInt(e.target.value))}
                          className="w-full accent-zinc-400 h-1 bg-zinc-750 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden Canvas for High-Quality Off-Screen Cropping */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Right Column: Tactical Parameters & Base Geometry (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-amber-400 block border-b border-zinc-800 pb-2">
                Combat Specifications & Base Geometry
              </span>

              {/* Identity Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Unit Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-750 px-3 py-1.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-bold"
                    placeholder="e.g. Ironclad Breachers"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Emoji / Avatar Fallback</label>
                  <input
                    type="text"
                    value={avatar}
                    onChange={e => setAvatar(e.target.value)}
                    maxLength={3}
                    className="w-full bg-zinc-950 border border-zinc-750 px-3 py-1.5 rounded-lg text-xs text-white text-center focus:border-amber-400 focus:outline-none"
                    placeholder="🛡️"
                  />
                </div>
              </div>

              {/* Role and Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Tactical Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UnitRole)}
                    className="w-full bg-zinc-950 border border-zinc-750 px-3 py-1.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Unit Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as UnitType)}
                    className="w-full bg-zinc-950 border border-zinc-750 px-3 py-1.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                  >
                    <option value="Infantry">Infantry</option>
                    <option value="Vehicle">Vehicle (Transport/Armor)</option>
                    <option value="Monster">Monster (Behemoth)</option>
                    <option value="Character">Character (Leader)</option>
                  </select>
                </div>
              </div>

              {/* Base Geometry Selection */}
              <div className="bg-[#131622] p-3.5 rounded-xl border border-zinc-800 space-y-3">
                <span className="text-[11px] font-bold font-mono text-zinc-300 block">
                  📐 Base Shape & Model Size (VTT Canvas Footprint)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BASE_SHAPES.map(s => (
                    <button
                      key={s.shape}
                      type="button"
                      onClick={() => setBaseShape(s.shape)}
                      className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col ${
                        baseShape === s.shape
                          ? 'bg-amber-950/60 border-amber-400 text-amber-200 shadow'
                          : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-bold font-mono capitalize">{s.shape}</span>
                      <span className="text-[9px] text-zinc-500 font-mono">{s.aspect}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2 pt-1 text-[11px] font-mono">
                  <span className="text-zinc-400">Size Tier:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {UNIT_SIZES.map(s => (
                      <button
                        key={s.size}
                        type="button"
                        onClick={() => setUnitSize(s.size)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                          unitSize === s.size
                            ? 'bg-amber-400 text-black font-bold shadow'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {s.size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono">
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[9px] text-zinc-500 uppercase block">Move</span>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={mv}
                    onChange={e => setMv(parseInt(e.target.value) || 1)}
                    className="w-full bg-transparent text-center text-xs font-bold text-emerald-400 focus:outline-none"
                  />
                </div>
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[9px] text-zinc-500 uppercase block">Def</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={def}
                    onChange={e => setDef(parseInt(e.target.value) || 1)}
                    className="w-full bg-transparent text-center text-xs font-bold text-sky-400 focus:outline-none"
                  />
                </div>
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[9px] text-zinc-500 uppercase block">Attack</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={am}
                    onChange={e => setAm(parseInt(e.target.value) || 1)}
                    className="w-full bg-transparent text-center text-xs font-bold text-rose-400 focus:outline-none"
                  />
                </div>
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[9px] text-zinc-500 uppercase block">Lives</span>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={lives}
                    onChange={e => setLives(parseInt(e.target.value) || 1)}
                    className="w-full bg-transparent text-center text-xs font-bold text-amber-400 focus:outline-none"
                  />
                </div>
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[9px] text-zinc-500 uppercase block">Models</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={modelCount}
                    onChange={e => setModelCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-transparent text-center text-xs font-bold text-zinc-200 focus:outline-none"
                  />
                </div>
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[9px] text-zinc-500 uppercase block">Points</span>
                  <input
                    type="number"
                    min="10"
                    max="400"
                    step="5"
                    value={points}
                    onChange={e => setPoints(parseInt(e.target.value) || 10)}
                    className="w-full bg-transparent text-center text-xs font-bold text-amber-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Traits & Deploy Rules */}
              <div className="bg-[#131622] p-3 rounded-xl border border-zinc-800 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canDeployOutsideZone}
                    onChange={e => setCanDeployOutsideZone(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white font-mono">
                      Trait: DEPLOY_OUTSIDE_ZONE
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Bypasses deployment zone limits. Can deploy anywhere on the continuous VTT canvas.
                    </span>
                  </div>
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">Lore / Tactical Notes</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-750 px-3 py-1.5 rounded-lg text-xs text-zinc-300 focus:border-amber-400 focus:outline-none"
                  placeholder="Tactical description of this unit's doctrine and armament..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-[#141724] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-mono transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs font-mono rounded-lg shadow-lg flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Unit & Token</span>
          </button>
        </div>
      </div>
    </div>
  );
};
