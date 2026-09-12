import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, Shield, Settings, Check, AlertCircle, 
  BarChart3, Users, Crown, Swords, Database, Activity,
  Compass, Upload, Image as ImageIcon, Edit2, X,
  ChevronDown, ChevronUp, Search, Tag, Zap
} from 'lucide-react';
import { FactionInfo } from '../../types/army';
import { Unit, UnitType, UnitRole, BaseShape, UnitAbility, CORE_TRAIT_DEFINITIONS } from '../../types/game';
import { StorageService } from '../../services/storageService';
import { MapCreator } from './MapCreator';
import { FactionLogo } from '../common/FactionLogo';
import { AbilityEditorModal } from '../builder/AbilityEditorModal';

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
  const factionLogoInputRef = useRef<HTMLInputElement>(null);

  // Faction Form State
  const [editingFactionId, setEditingFactionId] = useState<string | null>(null);
  const [factionLogoPreview, setFactionLogoPreview] = useState<string | null>(null);
  const [factionAbility, setFactionAbility] = useState<UnitAbility | undefined>(undefined);
  const [isFactionAbilityModalOpen, setIsFactionAbilityModalOpen] = useState<boolean>(false);
  const [newFaction, setNewFaction] = useState({
    id: '',
    name: '',
    shortName: '',
    title: '',
    quote: '',
    symbol: '⚔️',
    logoUrl: '',
    loreSummary: '',
    leaderName: '',
    color: '#e11d48',
    traits: 'High Firepower, Fortified Bastions'
  });

  // Unit Form State
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [traitDropdownOpen, setTraitDropdownOpen] = useState<boolean>(false);
  const [traitSearchTerm, setTraitSearchTerm] = useState<string>('');
  const traitDropdownRef = useRef<HTMLDivElement>(null);

  const [unitAbilities, setUnitAbilities] = useState<UnitAbility[]>([]);
  const [editingUnitAbilityIndex, setEditingUnitAbilityIndex] = useState<number | null>(null);
  const [isUnitAbilityModalOpen, setIsUnitAbilityModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (traitDropdownRef.current && !traitDropdownRef.current.contains(e.target as Node)) {
        setTraitDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleFactionLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp|svg\+xml)$/i)) {
      notify('Please select a valid PNG, JPG, WebP, or SVG file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFactionLogoPreview(result);
      setNewFaction(prev => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleStartEditFaction = (f: FactionInfo) => {
    setEditingFactionId(f.id);
    setNewFaction({
      id: f.id,
      name: f.name,
      shortName: f.shortName,
      title: f.title,
      quote: f.quote,
      symbol: f.symbol || '⚔️',
      logoUrl: f.logoUrl || '',
      loreSummary: f.loreSummary || '',
      leaderName: f.leaderName || '',
      color: f.colors?.primary || '#e11d48',
      traits: f.strengths?.join(', ') || ''
    });
    setFactionLogoPreview(f.logoUrl || null);
    setFactionAbility(f.factionAbility);
  };

  const handleCancelEditFaction = () => {
    setEditingFactionId(null);
    setFactionAbility(undefined);
    setNewFaction({
      id: '',
      name: '',
      shortName: '',
      title: '',
      quote: '',
      symbol: '⚔️',
      logoUrl: '',
      loreSummary: '',
      leaderName: '',
      color: '#e11d48',
      traits: 'High Firepower, Fortified Bastions'
    });
    setFactionLogoPreview(null);
    if (factionLogoInputRef.current) {
      factionLogoInputRef.current.value = '';
    }
  };

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateFaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaction.name) return;

    const id = editingFactionId || newFaction.id.trim() || newFaction.name.toLowerCase().replace(/\s+/g, '_');
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
      logoUrl: newFaction.logoUrl?.trim() || undefined,
      loreSummary: newFaction.loreSummary || 'A newly recorded force emerging from a fracture in reality.',
      leaderName: newFaction.leaderName || 'Unknown Commander',
      strengths: newFaction.traits.split(',').map(s => s.trim()).filter(Boolean),
      factionAbility: factionAbility || undefined
    };

    StorageService.saveFaction(factionObj);
    const updated = StorageService.getFactions();
    setFactions(updated);
    setSelectedFactionId(id);
    handleCancelEditFaction();
    onDataChanged();
    notify(editingFactionId ? `Faction "${factionObj.name}" updated!` : `Faction "${factionObj.name}" created!`);
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

  const toggleTrait = (traitId: string) => {
    setSelectedTraits(prev => 
      prev.includes(traitId) ? prev.filter(t => t !== traitId) : [...prev, traitId]
    );
  };

  const handleOpenAddUnitAbility = () => {
    setEditingUnitAbilityIndex(null);
    setIsUnitAbilityModalOpen(true);
  };

  const handleOpenEditUnitAbility = (index: number) => {
    setEditingUnitAbilityIndex(index);
    setIsUnitAbilityModalOpen(true);
  };

  const handleDeleteUnitAbility = (index: number) => {
    setUnitAbilities(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveUnitAbility = (ability: UnitAbility) => {
    if (editingUnitAbilityIndex !== null) {
      setUnitAbilities(prev => prev.map((a, i) => i === editingUnitAbilityIndex ? ability : a));
    } else {
      if (unitAbilities.length < 3) {
        setUnitAbilities(prev => [...prev, ability]);
      }
    }
  };

  const handleStartEditUnit = (u: Unit) => {
    setEditingUnitId(u.templateId || u.id);
    setNewUnit({
      templateId: u.templateId || u.id,
      name: u.name,
      type: u.type,
      role: u.role,
      baseShape: u.baseShape || (u.type === 'Vehicle' ? 'rectangle' : 'circle'),
      points: u.points,
      avatar: u.avatar || '🛡️',
      tokenImageUrl: u.tokenImageUrl || '',
      carryCapacity: u.carryCapacity || 6,
      description: u.description || '',
      mv: u.stats.mv,
      def: u.stats.def,
      am: u.stats.am,
      lives: u.stats.lives,
      modelCount: u.stats.modelCount || 1,
      cp: u.stats.cp,
      range: u.stats.range,
      passives: (u.passives || []).join(', ')
    });
    setSelectedTraits(u.traits || (u.canDeployOutsideZone ? ['Infiltrator'] : []));
    setUnitAbilities(u.abilities || []);
  };

  const handleCancelEditUnit = () => {
    setEditingUnitId(null);
    setSelectedTraits([]);
    setUnitAbilities([]);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnit.name) return;

    const templateId = editingUnitId || newUnit.templateId.trim() || `${selectedFactionId}_${newUnit.name.toLowerCase().replace(/\s+/g, '_')}`;
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
      traits: selectedTraits,
      canDeployOutsideZone: selectedTraits.includes('Infiltrator'),
      abilities: unitAbilities.length > 0 ? unitAbilities : undefined,
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
    handleCancelEditUnit();
    onDataChanged();
    notify(editingUnitId ? `Unit "${unitObj.name}" updated!` : `Unit "${unitObj.name}" created with ${modelNum} models (${hpPerModel} HP each)!`);
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
                      <FactionLogo faction={f} size="md" />
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
              <FactionLogo faction={f} size="xs" />
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ================= UNIT ARCHITECT TAB ================= */}
      {activeTab === 'units' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create / Edit Unit Form */}
          <div className="lg:col-span-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-rose-500" />
                <span>{editingUnitId ? `Edit Unit: ${newUnit.name || 'Selected'}` : `Forge New Unit (${activeFaction?.name})`}</span>
              </h2>
              {editingUnitId && (
                <button
                  type="button"
                  onClick={handleCancelEditUnit}
                  className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              {editingUnitId 
                ? 'Modify unit combat attributes, traits, tactical abilities, and card customizations.'
                : 'Set role category, total pool of lives, tactical traits, and equip playing card abilities.'}
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

              {/* Tactical Traits (Multi-Select Dropdown & Tag List) */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2.5" ref={traitDropdownRef}>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-300 block font-mono">
                      🏷️ Tactical Traits
                    </label>
                    <span className="text-[9px] text-zinc-500">
                      Assign traits (Infiltrator, Leader, Scout, Sniper, Berserk, etc.)
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {selectedTraits.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTraits([])}
                        className="text-[9px] font-mono text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded">
                      {selectedTraits.length} selected
                    </span>
                  </div>
                </div>

                {/* Selected Traits as Removable Chips */}
                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-zinc-900/80 rounded-lg border border-zinc-800 items-center">
                  {selectedTraits.length === 0 ? (
                    <span className="text-[11px] text-zinc-500 italic">No traits assigned yet. Select from the dropdown below.</span>
                  ) : (
                    selectedTraits.map(tid => {
                      const def = (CORE_TRAIT_DEFINITIONS as any)[tid] || { id: tid, name: tid, icon: '🏷️' };
                      return (
                        <span
                          key={tid}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs font-mono shadow-sm"
                        >
                          <span>{def.icon}</span>
                          <span className="font-bold">{def.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTrait(tid);
                            }}
                            className="text-amber-400 hover:text-white rounded p-0.5 hover:bg-amber-800/50 transition cursor-pointer"
                            title={`Remove ${def.name}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>

                {/* Multi-Select Dropdown Trigger & Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTraitDropdownOpen(prev => !prev)}
                    className="w-full flex items-center justify-between px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-amber-400 rounded-lg text-xs text-zinc-300 font-mono transition cursor-pointer shadow-sm"
                  >
                    <span className="flex items-center space-x-2">
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                      <span>{traitDropdownOpen ? 'Close Traits Selector' : 'Add / Select Traits from Dropdown...'}</span>
                    </span>
                    {traitDropdownOpen ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>

                  {traitDropdownOpen && (() => {
                    const filteredTraits = Object.values(CORE_TRAIT_DEFINITIONS).filter(trait => {
                      if (!traitSearchTerm.trim()) return true;
                      const q = traitSearchTerm.toLowerCase();
                      return trait.name.toLowerCase().includes(q) ||
                        trait.summary.toLowerCase().includes(q) ||
                        trait.id.toLowerCase().includes(q);
                    });

                    return (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0f111a] border border-zinc-700 rounded-xl shadow-2xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={traitSearchTerm}
                            onChange={e => setTraitSearchTerm(e.target.value)}
                            placeholder="Filter traits by keyword..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none font-mono"
                            autoFocus
                          />
                        </div>

                        <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                          {filteredTraits.length === 0 ? (
                            <div className="p-3 text-center text-xs text-zinc-500 font-mono">
                              No matching traits found
                            </div>
                          ) : (
                            filteredTraits.map(trait => {
                              const isSelected = selectedTraits.includes(trait.id);
                              return (
                                <div
                                  key={trait.id}
                                  onClick={() => toggleTrait(trait.id)}
                                  className={`p-2 rounded-lg border text-left transition cursor-pointer flex items-center justify-between space-x-2 ${
                                    isSelected
                                      ? 'bg-amber-950/40 border-amber-500/80 text-white'
                                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700'
                                  }`}
                                >
                                  <div className="flex items-start space-x-2 min-w-0 flex-1">
                                    <span className="text-base leading-none pt-0.5">{trait.icon}</span>
                                    <div className="min-w-0">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="text-xs font-bold font-mono">{trait.name}</span>
                                        {trait.isMVP && (
                                          <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded">
                                            MVP
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-zinc-400 leading-tight truncate">
                                        {trait.summary}
                                      </p>
                                    </div>
                                  </div>
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                                    isSelected
                                      ? 'bg-amber-500 border-amber-400 text-black'
                                      : 'border-zinc-600 bg-zinc-950'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Tactical Abilities Maker (Card Builder) */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-300 block font-mono">
                      ⚡ Tactical Abilities / Cards ({unitAbilities.length}/3)
                    </label>
                    <span className="text-[9px] text-zinc-500">
                      Equip custom playing card abilities (Zero CP cost, customizable theme/artwork/rarity)
                    </span>
                  </div>
                  {unitAbilities.length < 3 && (
                    <button
                      type="button"
                      onClick={handleOpenAddUnitAbility}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-mono rounded-lg flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Ability</span>
                    </button>
                  )}
                </div>

                {unitAbilities.length === 0 ? (
                  <div className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-lg text-center text-xs text-zinc-500 font-mono">
                    No custom abilities equipped. Click "+ Add Ability" to design playing cards for this unit.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unitAbilities.map((ab, idx) => (
                      <div
                        key={ab.id || idx}
                        className="bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/40 rounded-xl p-2.5 flex items-start justify-between gap-2.5 transition"
                      >
                        <div className="flex items-start space-x-2.5 min-w-0">
                          {ab.cardArtworkUrl ? (
                            <img src={ab.cardArtworkUrl} alt={ab.name} className="w-8 h-8 rounded-lg object-cover border border-amber-500/50 shrink-0" />
                          ) : (
                            <span className="text-lg p-1 rounded bg-zinc-950 border border-zinc-800 shrink-0">{ab.icon || '⚡'}</span>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                              <h5 className="text-xs font-bold font-mono text-white">{ab.name}</h5>
                              <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold uppercase ${
                                ab.type === 'active' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-sky-950 text-sky-300 border border-sky-800'
                              }`}>
                                {ab.type}
                              </span>
                              {ab.cardTheme && (
                                <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize">
                                  {ab.cardTheme}
                                </span>
                              )}
                              {ab.cardRarity && (
                                <span className="text-[9px] px-1 py-0.2 rounded font-mono text-amber-300 bg-amber-950/60 border border-amber-800/80">
                                  {ab.cardRarity}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{ab.effect}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUnitAbility(idx)}
                            className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition cursor-pointer"
                            title="Edit Ability"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUnitAbility(idx)}
                            className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition cursor-pointer"
                            title="Delete Ability"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* General Passives text */}
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Passives &amp; Flavor Notes</label>
                <input
                  type="text"
                  value={newUnit.passives}
                  onChange={e => setNewUnit({ ...newUnit, passives: e.target.value })}
                  placeholder="e.g. Type Advantage: Beats Monsters, Veteran Phalanx"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5 cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>{editingUnitId ? 'Update Unit Template' : 'Save Unit Template'}</span>
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
                      {/* Traits & Abilities Badges */}
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mt-1.5">
                        {(unit.traits || (unit.canDeployOutsideZone ? ['Infiltrator'] : [])).map(t => {
                          const def = (CORE_TRAIT_DEFINITIONS as any)[t];
                          return (
                            <span key={t} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-700/60 text-amber-300 flex items-center space-x-0.5">
                              <span>{def?.icon || '🏷️'}</span>
                              <span>{t}</span>
                            </span>
                          );
                        })}
                        {unit.abilities && unit.abilities.length > 0 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-700/60 text-purple-300">
                            ⚡ {unit.abilities.length} Cards
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleStartEditUnit(unit)}
                      className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition cursor-pointer"
                      title="Edit unit template"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUnit(unit.templateId)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition cursor-pointer"
                      title="Delete unit template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= FACTION CREATOR / EDITOR TAB ================= */}
      {activeTab === 'factions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Shield className="w-4 h-4 text-rose-500" />
                <span>{editingFactionId ? `Edit Faction: ${newFaction.name || 'Selected'}` : 'Create New Faction'}</span>
              </h2>
              {editingFactionId && (
                <button
                  type="button"
                  onClick={handleCancelEditFaction}
                  className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              {editingFactionId 
                ? 'Update faction credentials, crest image, or lore parameters.'
                : 'Define a custom faction, upload custom crest art, and configure lore.'}
            </p>

            <form onSubmit={handleCreateFaction} className="space-y-3">
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
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Short Name</label>
                  <input
                    type="text"
                    value={newFaction.shortName}
                    onChange={e => setNewFaction({ ...newFaction, shortName: e.target.value })}
                    placeholder="e.g. Legion"
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Primary Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={newFaction.color}
                      onChange={e => setNewFaction({ ...newFaction, color: e.target.value })}
                      className="w-8 h-8 rounded border border-zinc-750 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs font-mono text-zinc-300">{newFaction.color}</span>
                  </div>
                </div>
              </div>

              {/* Faction Crest / Logo Image Upload & URL */}
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  Faction Crest / Logo Image
                </label>
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-750 flex items-center justify-center shrink-0 overflow-hidden relative">
                      {newFaction.logoUrl || factionLogoPreview ? (
                        <img
                          src={factionLogoPreview || newFaction.logoUrl}
                          alt="Crest Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-2xl">{newFaction.symbol || '⚔️'}</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          ref={factionLogoInputRef}
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                          onChange={handleFactionLogoChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => factionLogoInputRef.current?.click()}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-mono rounded flex items-center space-x-1.5 transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-rose-400" />
                          <span>Upload Image</span>
                        </button>
                        {(newFaction.logoUrl || factionLogoPreview) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFactionLogoPreview(null);
                              setNewFaction(prev => ({ ...prev, logoUrl: '' }));
                              if (factionLogoInputRef.current) factionLogoInputRef.current.value = '';
                            }}
                            className="px-2 py-1 text-[11px] text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Or enter image URL (https://...)"
                        value={newFaction.logoUrl}
                        onChange={e => {
                          const val = e.target.value;
                          setNewFaction(prev => ({ ...prev, logoUrl: val }));
                          setFactionLogoPreview(val || null);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[11px] text-white focus:outline-none focus:border-rose-500 font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Supports PNG, JPG, WebP, SVG. Stored in local faction vault.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                    Fallback Emoji Symbol
                  </label>
                  <input
                    type="text"
                    value={newFaction.symbol}
                    onChange={e => setNewFaction({ ...newFaction, symbol: e.target.value })}
                    placeholder="⚔️"
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Supreme Leader</label>
                  <input
                    type="text"
                    value={newFaction.leaderName}
                    onChange={e => setNewFaction({ ...newFaction, leaderName: e.target.value })}
                    placeholder="e.g. Warmaster"
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Title / Motto</label>
                <input
                  type="text"
                  value={newFaction.title}
                  onChange={e => setNewFaction({ ...newFaction, title: e.target.value })}
                  placeholder="e.g. Wardens of the Iron Spire"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Faction Quote</label>
                <input
                  type="text"
                  value={newFaction.quote}
                  onChange={e => setNewFaction({ ...newFaction, quote: e.target.value })}
                  placeholder="e.g. Iron breaks before we yield."
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Faction Strengths (comma-separated)</label>
                <input
                  type="text"
                  value={newFaction.traits}
                  onChange={e => setNewFaction({ ...newFaction, traits: e.target.value })}
                  placeholder="e.g. High Firepower, Fortified Bastions"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Faction Ability Builder (FEATURE-003 & CODE-027) */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-300 flex items-center space-x-1.5">
                      <span>🔮 Faction Ability (Army-Wide)</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 block">
                      Unique faction-level active or passive doctrine
                    </span>
                  </div>
                  {!factionAbility ? (
                    <button
                      type="button"
                      onClick={() => setIsFactionAbilityModalOpen(true)}
                      className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-mono rounded flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Configure Ability</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => setIsFactionAbilityModalOpen(true)}
                        className="p-1 text-zinc-400 hover:text-amber-400 rounded transition cursor-pointer"
                        title="Edit Ability"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFactionAbility(undefined)}
                        className="p-1 text-zinc-400 hover:text-rose-400 rounded transition cursor-pointer"
                        title="Remove Ability"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {factionAbility ? (
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-amber-500/40 flex items-start space-x-2.5">
                    <span className="text-xl p-1 rounded bg-zinc-950 border border-zinc-800 shrink-0">
                      {factionAbility.icon || '🔮'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-xs font-bold text-white font-mono">{factionAbility.name}</span>
                        <span className={`text-[8px] px-1 py-0.2 rounded font-mono uppercase font-bold ${
                          factionAbility.type === 'active' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-sky-950 text-sky-300 border border-sky-800'
                        }`}>
                          {factionAbility.type}
                        </span>
                        {factionAbility.cost && factionAbility.type === 'active' && (
                          <span className="text-[8px] px-1 py-0.2 rounded font-mono bg-zinc-800 text-zinc-300">
                            {factionAbility.cost.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                        {factionAbility.activationTiming && (
                          <span className="text-[8px] px-1 py-0.2 rounded font-mono bg-zinc-950 text-amber-400">
                            {factionAbility.activationTiming.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-300 mt-1 leading-snug">
                        {factionAbility.effect}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-500 italic">
                    No army-wide faction ability configured. Click "Configure Ability" to add one.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
              >
                {editingFactionId ? 'Save Changes' : 'Publish Faction'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-base font-bold text-white">Registered Factions ({factions.length})</h2>
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {factions.map(f => (
                <div key={f.id} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <FactionLogo faction={f} size="lg" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-white text-sm">{f.name}</h4>
                        {f.logoUrl && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 text-[9px] font-mono">
                            Crest Art
                          </span>
                        )}
                        {f.factionAbility && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/80 text-[9px] font-mono flex items-center space-x-1">
                            <span>{f.factionAbility.icon || '🔮'}</span>
                            <span>{f.factionAbility.name}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400">{f.leaderName} • {f.shortName}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartEditFaction(f)}
                      title="Edit faction credentials & crest"
                      className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFaction(f.id)}
                      title="Delete faction"
                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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

      {/* Faction Ability Editor Modal */}
      <AbilityEditorModal
        isOpen={isFactionAbilityModalOpen}
        onClose={() => setIsFactionAbilityModalOpen(false)}
        onSaveAbility={(ab) => setFactionAbility(ab)}
        initialAbility={factionAbility || null}
        contextType="faction"
        title="Configure Faction Ability"
      />

      {/* Unit Tactical Ability Editor Modal */}
      <AbilityEditorModal
        isOpen={isUnitAbilityModalOpen}
        onClose={() => {
          setIsUnitAbilityModalOpen(false);
          setEditingUnitAbilityIndex(null);
        }}
        onSaveAbility={handleSaveUnitAbility}
        initialAbility={editingUnitAbilityIndex !== null ? unitAbilities[editingUnitAbilityIndex] : null}
        contextType="unit"
        title={editingUnitAbilityIndex !== null ? 'Edit Tactical Ability' : 'Design Tactical Ability'}
      />
    </div>
  );
};
