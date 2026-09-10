import React, { useState, useRef } from 'react';
import { 
  Plus, Trash2, Shield, Settings, Check, AlertCircle, 
  BarChart3, Users, Crown, Swords, Database, Activity,
  Compass, Upload, Image as ImageIcon
} from 'lucide-react';
import { FactionInfo } from '../../types/army';
import { Unit, UnitType, UnitRole, BaseShape } from '../../types/game';
import { StorageService } from '../../services/storageService';
import { MapCreator } from './MapCreator';

interface AdminPanelProps {
  onDataChanged: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onDataChanged }) => {
  const [factions, setFactions] = useState<FactionInfo[]>(() => StorageService.getFactions());
  const [units, setUnits] = useState<Unit[]>(() => StorageService.getUnitTemplates());
  const [selectedFactionId, setSelectedFactionId] = useState<string>(factions[0]?.id || 'crimson_empire');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'units' | 'factions' | 'maps'>('dashboard');
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Faction Form State
  const [newFaction, setNewFaction] = useState({
    id: '',
    name: '',
    shortName: '',
    title: '',
    quote: '',
    symbol: '⚔️',
    loreSummary: '',
    leaderName: '',
    color: '#e11d48',
    traits: 'High Firepower, Fortified Bastions'
  });

  // Unit Form State
  const [newUnit, setNewUnit] = useState({
    templateId: '',
    name: '',
    type: 'Infantry' as UnitType,
    role: 'Battleline' as UnitRole,
    baseShape: 'circle' as BaseShape,
    points: 75,
    avatar: '🛡️',
    tokenImageUrl: '',
    carryCapacity: 6,
    description: '',
    mv: 5,
    def: 5,
    am: 5,
    lives: 5,
    modelCount: 5,
    cp: 3,
    range: 0,
    passives: 'Type Advantage: Beats Monsters, Veteran Phalanx'
  });

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i)) {
      notify('Please select a valid PNG, JPG, or WebP image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setNewUnit(prev => ({ ...prev, tokenImageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateFaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaction.name) return;

    const id = newFaction.id.trim() || newFaction.name.toLowerCase().replace(/\s+/g, '_');
    const factionObj: FactionInfo = {
      id,
      name: newFaction.name,
      shortName: newFaction.shortName || newFaction.name.split(' ')[0],
      title: newFaction.title || 'Contenders of the Convergence',
      quote: newFaction.quote || 'We conquer or fall.',
      colors: {
        primary: newFaction.color,
        secondary: '#0f172a',
        accent: '#f59e0b',
        border: newFaction.color
      },
      symbol: newFaction.symbol || '⚔️',
      loreSummary: newFaction.loreSummary || 'A newly recorded force emerging from a fracture in reality.',
      leaderName: newFaction.leaderName || 'Unknown Commander',
      strengths: newFaction.traits.split(',').map(s => s.trim()).filter(Boolean)
    };

    StorageService.saveFaction(factionObj);
    const updated = StorageService.getFactions();
    setFactions(updated);
    setSelectedFactionId(id);
    setNewFaction({
      id: '',
      name: '',
      shortName: '',
      title: '',
      quote: '',
      symbol: '⚔️',
      loreSummary: '',
      leaderName: '',
      color: '#e11d48',
      traits: 'High Firepower, Fortified Bastions'
    });
    onDataChanged();
    notify(`Faction "${factionObj.name}" created!`);
  };

  const handleDeleteFaction = (factionId: string) => {
    StorageService.deleteFaction(factionId);
    const updated = StorageService.getFactions();
    setFactions(updated);
    if (selectedFactionId === factionId && updated.length > 0) {
      setSelectedFactionId(updated[0].id);
    }
    onDataChanged();
    notify(`Faction deleted.`);
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnit.name) return;

    const templateId = newUnit.templateId.trim() || `${selectedFactionId}_${newUnit.name.toLowerCase().replace(/\s+/g, '_')}`;
    const livesNum = Number(newUnit.lives) || 4;
    const modelNum = Math.max(1, Number(newUnit.modelCount) || 1);
    const hpPerModel = Math.max(1, Math.floor(livesNum / modelNum));

    const unitObj: Unit = {
      id: '',
      templateId,
      name: newUnit.name,
      factionId: selectedFactionId,
      type: newUnit.type,
      role: newUnit.role,
      points: Number(newUnit.points),
      avatar: newUnit.avatar || '🛡️',
      tokenImageUrl: newUnit.tokenImageUrl || undefined,
      baseShape: newUnit.baseShape || (newUnit.type === 'Vehicle' ? 'rectangle' : 'circle'),
      carryCapacity: newUnit.type === 'Vehicle' ? Number(newUnit.carryCapacity) : undefined,
      transportCapacity: newUnit.type === 'Vehicle' ? Math.ceil((Number(newUnit.carryCapacity) || 6) / 5) : undefined,
      description: newUnit.description || 'Veteran combatants deployed in the convergence war.',
      stats: {
        mv: Number(newUnit.mv),
        def: Number(newUnit.def),
        baseDef: Number(newUnit.def),
        defModifier: 0,
        am: Number(newUnit.am),
        lives: livesNum,
        maxLives: livesNum,
        modelCount: modelNum,
        hpPerModel: hpPerModel,
        cp: Number(newUnit.cp),
        range: Number(newUnit.range),
        baseShape: newUnit.baseShape || (newUnit.type === 'Vehicle' ? 'rectangle' : 'circle'),
        carryCapacity: newUnit.type === 'Vehicle' ? Number(newUnit.carryCapacity) : undefined
      },
      passives: newUnit.passives.split(',').map(p => p.trim()).filter(Boolean),
      owner: 'player1',
      position: null,
      hasMoved: false,
      hasShot: false,
      hasCharged: false,
      hasFought: false,
      advantageStacks: 0,
      disadvantageStacks: 0
    };

    StorageService.saveUnitTemplate(unitObj);
    const updated = StorageService.getUnitTemplates();
    setUnits(updated);
    setNewUnit({
      templateId: '',
      name: '',
      type: 'Infantry',
      role: 'Battleline',
      baseShape: 'circle',
      points: 75,
      avatar: '🛡️',
      tokenImageUrl: '',
      carryCapacity: 6,
      description: '',
      mv: 5,
      def: 5,
      am: 5,
      lives: 5,
      modelCount: 5,
      cp: 3,
      range: 0,
      passives: 'Type Advantage: Beats Monsters, Veteran Phalanx'
    });
    onDataChanged();
    notify(`Unit "${unitObj.name}" created with ${modelNum} models (${hpPerModel} HP each)!`);
  };

  const handleDeleteUnit = (templateId: string) => {
    StorageService.deleteUnitTemplate(templateId);
    const updated = StorageService.getUnitTemplates();
    setUnits(updated);
    onDataChanged();
    notify(`Unit template removed.`);
  };

  const currentFactionUnits = units.filter(u => u.factionId === selectedFactionId);
  const activeFaction = factions.find(f => f.id === selectedFactionId) || factions[0];

  // Role counters for dashboard
  const legendaryCount = units.filter(u => u.role === 'Legendary Leader').length;
  const leadersCount = units.filter(u => u.role === 'Leader').length;
  const battlelineCount = units.filter(u => u.role === 'Battleline').length;
  const infantryMountedCount = units.filter(u => u.role === 'Infantry / Mounted').length;
  const vehicleMonsterCount = units.filter(u => u.role === 'Vehicle / Monster').length;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Admin Header with Dashboard Switch */}
      <div className="bg-[#12141c] border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-widest">
            <Settings className="w-4 h-4" />
            <span>Convergence Control Console</span>
          </div>
          <h1 className="text-3xl font-black text-white mt-1">War Room Admin Dashboard</h1>
          <p className="text-xs text-zinc-400 max-w-xl mt-1">
            System management for factions, battlefield balance, stat blocks, unit roles, and multi-model HP distribution.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'dashboard' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'units' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Unit Architect</span>
          </button>
          <button
            onClick={() => setActiveTab('factions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'factions' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Faction Creator</span>
          </button>
          <button
            onClick={() => setActiveTab('maps')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'maps' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Map Architect</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* ================= DASHBOARD TAB ================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#12141c] border border-zinc-800 p-4 rounded-xl">
              <span className="text-[10px] text-zinc-400 uppercase font-mono block">Factions</span>
              <span className="text-2xl font-black text-white font-mono">{factions.length}</span>
            </div>
            <div className="bg-[#12141c] border border-amber-800/60 p-4 rounded-xl">
              <span className="text-[10px] text-amber-400 uppercase font-mono block">Legendary Leaders</span>
              <span className="text-2xl font-black text-amber-400 font-mono">{legendaryCount}</span>
            </div>
            <div className="bg-[#12141c] border border-rose-800/60 p-4 rounded-xl">
              <span className="text-[10px] text-rose-400 uppercase font-mono block">Leaders</span>
              <span className="text-2xl font-black text-rose-400 font-mono">{leadersCount}</span>
            </div>
            <div className="bg-[#12141c] border border-sky-800/60 p-4 rounded-xl">
              <span className="text-[10px] text-sky-400 uppercase font-mono block">Battleline</span>
              <span className="text-2xl font-black text-sky-400 font-mono">{battlelineCount}</span>
            </div>
            <div className="bg-[#12141c] border border-emerald-800/60 p-4 rounded-xl">
              <span className="text-[10px] text-emerald-400 uppercase font-mono block">Infantry / Mounted</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">{infantryMountedCount}</span>
            </div>
            <div className="bg-[#12141c] border border-purple-800/60 p-4 rounded-xl">
              <span className="text-[10px] text-purple-400 uppercase font-mono block">Vehicles / Monsters</span>
              <span className="text-2xl font-black text-purple-400 font-mono">{vehicleMonsterCount}</span>
            </div>
          </div>

          {/* Quick Roster Breakdown Across Factions */}
          <div className="bg-[#12141c] border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Database className="w-5 h-5 text-rose-400" />
              <span>Registered Factions &amp; Unit Distribution</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {factions.map(f => {
                const facUnits = units.filter(u => u.factionId === f.id);
                return (
                  <div key={f.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{f.symbol}</span>
                      <div>
                        <h4 className="font-bold text-white text-sm">{f.name}</h4>
                        <span className="text-[11px] text-zinc-400 font-mono">{facUnits.length} units enrolled</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 text-[10px] font-mono pt-2 border-t border-zinc-800">
                      {facUnits.map(u => (
                        <span key={u.templateId} className="bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-300">
                          {u.name.split(' ')[0]} ({u.stats.modelCount}m)
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Faction selector chips for Units tab */}
      {activeTab === 'units' && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-zinc-800">
          <span className="text-xs text-zinc-500 uppercase font-mono mr-2">Target Faction:</span>
          {factions.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFactionId(f.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 border ${
                selectedFactionId === f.id
                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-md'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <span>{f.symbol}</span>
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ================= UNIT ARCHITECT TAB ================= */}
      {activeTab === 'units' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Unit Form */}
          <div className="lg:col-span-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-rose-500" />
              <span>Forge New Unit ({activeFaction?.name})</span>
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Set role category, total pool of lives, and pre-defined model count (HP is distributed across squad members).
            </p>

            <form onSubmit={handleCreateUnit} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Unit Name</label>
                <input
                  type="text"
                  required
                  value={newUnit.name}
                  onChange={e => setNewUnit({ ...newUnit, name: e.target.value })}
                  placeholder="e.g. Ironclad Dread-Walker"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Token Graphic: Upload Image & Base Shape Preview */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-amber-400 font-mono flex items-center space-x-1">
                    <Upload className="w-3 h-3 text-amber-400" />
                    <span>Upload Token Image (PNG / JPG / WebP)</span>
                  </span>
                  {newUnit.tokenImageUrl && (
                    <button
                      type="button"
                      onClick={() => setNewUnit(prev => ({ ...prev, tokenImageUrl: '' }))}
                      className="text-[9px] font-mono text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Remove Image
                    </button>
                  )}
                </div>

                <div className="flex items-start space-x-3">
                  {/* Base Shape Preview Container */}
                  <div className="shrink-0 flex flex-col items-center space-y-1">
                    <div className={`w-16 h-16 bg-zinc-900 border-2 border-amber-400 flex items-center justify-center overflow-hidden shadow-lg ${
                      newUnit.baseShape === 'square' ? 'rounded-xl' :
                      newUnit.baseShape === 'rectangle' ? 'w-20 h-14 rounded-lg' :
                      newUnit.baseShape === 'oval' ? 'w-20 h-14 rounded-[40%]' :
                      'rounded-full'
                    }`}>
                      {newUnit.tokenImageUrl ? (
                        <img
                          src={newUnit.tokenImageUrl}
                          alt="Token Preview"
                          className="w-full h-full object-cover select-none pointer-events-none"
                        />
                      ) : (
                        <span className="text-2xl">{newUnit.avatar || '🛡️'}</span>
                      )}
                    </div>
                    <span className="text-[8px] font-mono text-zinc-500 uppercase">{newUnit.baseShape} Base</span>
                  </div>

                  {/* Upload Controls & Fallback Emoji */}
                  <div className="flex-1 space-y-2">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-zinc-700 hover:border-amber-400 hover:bg-zinc-900/50 rounded-lg p-2 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1"
                    >
                      <Upload className="w-4 h-4 text-zinc-400" />
                      <span className="text-[10px] text-zinc-300 font-mono block">
                        {newUnit.tokenImageUrl ? 'Click to replace token graphic' : 'Drop or browse image to upload'}
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-zinc-400 block font-mono">Base Shape</label>
                        <select
                          value={newUnit.baseShape}
                          onChange={e => setNewUnit({ ...newUnit, baseShape: e.target.value as BaseShape })}
                          className="w-full bg-zinc-900 border border-zinc-700 p-1 rounded text-[10px] text-white font-mono"
                        >
                          <option value="circle">Circle (Round)</option>
                          <option value="square">Square</option>
                          <option value="oval">Oval (Mounted)</option>
                          <option value="rectangle">Rectangle (Vehicle)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-400 block font-mono">Fallback Emoji</label>
                        <input
                          type="text"
                          value={newUnit.avatar}
                          onChange={e => setNewUnit({ ...newUnit, avatar: e.target.value })}
                          placeholder="🛡️"
                          className="w-full bg-zinc-900 border border-zinc-700 p-1 rounded text-center text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Categorization: Unit Role & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Army Category / Role</label>
                  <select
                    value={newUnit.role}
                    onChange={e => setNewUnit({ ...newUnit, role: e.target.value as UnitRole })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                  >
                    <option value="Legendary Leader">👑 Legendary Leader</option>
                    <option value="Leader">🎖️ Leader</option>
                    <option value="Battleline">🛡️ Battleline Unit</option>
                    <option value="Infantry / Mounted">🏇 Infantry / Mounted</option>
                    <option value="Vehicle / Monster">🚜 Vehicle / Monster</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Combat Type</label>
                  <select
                    value={newUnit.type}
                    onChange={e => {
                      const t = e.target.value as UnitType;
                      setNewUnit({ 
                        ...newUnit, 
                        type: t,
                        baseShape: t === 'Vehicle' ? 'rectangle' : newUnit.baseShape === 'rectangle' ? 'circle' : newUnit.baseShape
                      });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                  >
                    <option value="Infantry">Infantry</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Monster">Monster</option>
                    <option value="Character">Character</option>
                  </select>
                </div>
              </div>

              {/* Vehicle Transport Capacity (if Vehicle) */}
              {newUnit.type === 'Vehicle' && (
                <div className="bg-sky-950/40 p-3 rounded-xl border border-sky-800 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-sky-300 font-mono">
                      Vehicle Transport Model Capacity
                    </span>
                    <span className="text-xs font-bold text-sky-400 font-mono">
                      {newUnit.carryCapacity} models max
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={newUnit.carryCapacity}
                    onChange={e => setNewUnit({ ...newUnit, carryCapacity: Number(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                  <span className="text-[9px] text-zinc-400 font-mono block">
                    Defines how many models (infantry squad models) this vehicle transport can embark inside.
                  </span>
                </div>
              )}

              {/* Multi-Model HP Split Configuration */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-rose-400 block font-mono">
                  Squad Model Count &amp; Life Pool
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-400 block font-mono">Total Lives</label>
                    <input
                      type="number"
                      value={newUnit.lives}
                      onChange={e => setNewUnit({ ...newUnit, lives: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-700 p-1 rounded text-center text-xs font-mono font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-400 block font-mono">Model Count</label>
                    <input
                      type="number"
                      value={newUnit.modelCount}
                      onChange={e => setNewUnit({ ...newUnit, modelCount: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-700 p-1 rounded text-center text-xs font-mono font-bold text-sky-400"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-400 block font-mono">HP / Model</label>
                    <div className="w-full bg-zinc-900 border border-zinc-700 p-1 rounded text-center text-xs font-mono font-bold text-amber-300">
                      {Math.max(1, Math.floor(newUnit.lives / Math.max(1, newUnit.modelCount)))} HP
                    </div>
                  </div>
                </div>
              </div>

              {/* Combat Stat Block */}
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  Core Combat Stats (Mv, Def, AM, CP, Range, Points)
                </label>
                <div className="grid grid-cols-6 gap-2">
                  <div>
                    <span className="text-[9px] text-zinc-400 block text-center font-mono">MV</span>
                    <input
                      type="number"
                      value={newUnit.mv}
                      onChange={e => setNewUnit({ ...newUnit, mv: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1 rounded text-center text-xs font-mono font-bold text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 block text-center font-mono">DEF</span>
                    <input
                      type="number"
                      value={newUnit.def}
                      onChange={e => setNewUnit({ ...newUnit, def: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1 rounded text-center text-xs font-mono font-bold text-sky-400"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 block text-center font-mono">AM</span>
                    <input
                      type="number"
                      value={newUnit.am}
                      onChange={e => setNewUnit({ ...newUnit, am: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1 rounded text-center text-xs font-mono font-bold text-rose-400"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 block text-center font-mono">CP</span>
                    <input
                      type="number"
                      value={newUnit.cp}
                      onChange={e => setNewUnit({ ...newUnit, cp: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1 rounded text-center text-xs font-mono font-bold text-amber-400"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 block text-center font-mono">RNG</span>
                    <input
                      type="number"
                      value={newUnit.range}
                      onChange={e => setNewUnit({ ...newUnit, range: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1 rounded text-center text-xs font-mono font-bold text-purple-400"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 block text-center font-mono">PTS</span>
                    <input
                      type="number"
                      value={newUnit.points}
                      onChange={e => setNewUnit({ ...newUnit, points: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 p-1 rounded text-center text-xs font-mono font-bold text-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Passives &amp; Abilities</label>
                <input
                  type="text"
                  value={newUnit.passives}
                  onChange={e => setNewUnit({ ...newUnit, passives: e.target.value })}
                  placeholder="e.g. Type Advantage: Beats Monsters, Heavy Armor"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5 cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Save Unit Template</span>
              </button>
            </form>
          </div>

          {/* Existing Units List */}
          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-base font-bold text-white">
              {activeFaction?.name} Roster ({currentFactionUnits.length})
            </h2>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {currentFactionUnits.map(unit => (
                <div
                  key={unit.templateId}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-zinc-700 transition"
                >
                  <div className="flex items-center space-x-3.5">
                    {unit.tokenImageUrl ? (
                      <img src={unit.tokenImageUrl} alt={unit.name} className="w-10 h-10 rounded-xl object-cover border border-amber-500/50 shrink-0" />
                    ) : (
                      <span className="text-2xl bg-zinc-950 p-2 rounded-lg border border-zinc-800">{unit.avatar}</span>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-white text-sm">{unit.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                          {unit.role}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">{unit.points} pts</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {unit.stats.modelCount} models • {unit.stats.hpPerModel || 1} HP/model ({unit.stats.lives} Total Lives)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteUnit(unit.templateId)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= FACTION CREATOR TAB ================= */}
      {activeTab === 'factions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-rose-500" />
              <span>Create New Faction</span>
            </h2>
            <form onSubmit={handleCreateFaction} className="space-y-3 mt-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Faction Name</label>
                <input
                  type="text"
                  required
                  value={newFaction.name}
                  onChange={e => setNewFaction({ ...newFaction, name: e.target.value })}
                  placeholder="e.g. Ashen Legion"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Emoji Symbol</label>
                  <input
                    type="text"
                    value={newFaction.symbol}
                    onChange={e => setNewFaction({ ...newFaction, symbol: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Supreme Leader</label>
                  <input
                    type="text"
                    value={newFaction.leaderName}
                    onChange={e => setNewFaction({ ...newFaction, leaderName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Publish Faction
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-base font-bold text-white">Registered Factions ({factions.length})</h2>
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {factions.map(f => (
                <div key={f.id} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{f.symbol}</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">{f.name}</h4>
                      <span className="text-xs text-zinc-400">{f.leaderName}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteFaction(f.id)} className="p-1.5 text-zinc-400 hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Map Architect Studio */}
      {activeTab === 'maps' && (
        <MapCreator onMapSaved={onDataChanged} />
      )}
    </div>
  );
};
