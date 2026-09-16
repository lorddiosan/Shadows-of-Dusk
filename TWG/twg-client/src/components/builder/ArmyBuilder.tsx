import React, { useState } from 'react';
import { 
  Plus, Trash2, Shield, AlertTriangle, Check, Filter, 
  Save, FolderOpen, Tag, X, Swords, Copy, Sparkles, RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { ArmyRoster, FactionInfo } from '../../types/army';
import { Unit, UnitRole } from '../../types/game';
import { UnitCreatorModal } from './UnitCreatorModal';
import { FactionLogo } from '../common/FactionLogo';

interface ArmyBuilderProps {
  onDeployRosterToBattle: (roster: ArmyRoster) => void;
}

const ROLES_LIST: UnitRole[] = [
  'Legendary Leader',
  'Leader',
  'Battleline',
  'Infantry / Mounted',
  'Vehicle / Monster'
];

const SUGGESTED_TAGS = [
  'Aggro', 'Balanced', 'Siege', 'Mobile', 'Elite', 'Horde', 'Defensive', 'Artillery'
];

const FACTION_THEME_MAP: Record<string, { activeBtn: string; badge: string; text: string }> = {
  crimson_empire: {
    activeBtn: 'bg-gradient-to-r from-rose-950 to-rose-900/90 text-rose-100 border-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.35)] ring-1 ring-rose-400/50',
    badge: 'bg-rose-950/80 text-rose-300 border-rose-800',
    text: 'text-rose-400'
  },
  astreas_concord: {
    activeBtn: 'bg-gradient-to-r from-amber-950 to-amber-900/90 text-amber-100 border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.35)] ring-1 ring-amber-400/50',
    badge: 'bg-amber-950/80 text-amber-300 border-amber-800',
    text: 'text-amber-400'
  },
  infernalis_legion: {
    activeBtn: 'bg-gradient-to-r from-orange-950 to-orange-900/90 text-orange-100 border-orange-500 shadow-[0_0_14px_rgba(249,115,22,0.35)] ring-1 ring-orange-400/50',
    badge: 'bg-orange-950/80 text-orange-300 border-orange-800',
    text: 'text-orange-400'
  },
  chronarchs: {
    activeBtn: 'bg-gradient-to-r from-purple-950 to-purple-900/90 text-purple-100 border-purple-400 shadow-[0_0_14px_rgba(168,85,247,0.35)] ring-1 ring-purple-400/50',
    badge: 'bg-purple-950/80 text-purple-300 border-purple-800',
    text: 'text-purple-400'
  },
  nocturne_cabal: {
    activeBtn: 'bg-gradient-to-r from-indigo-950 to-indigo-900/90 text-indigo-100 border-indigo-400 shadow-[0_0_14px_rgba(99,102,241,0.35)] ring-1 ring-indigo-400/50',
    badge: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
    text: 'text-indigo-400'
  },
  ironclad_forge: {
    activeBtn: 'bg-gradient-to-r from-cyan-950 to-cyan-900/90 text-cyan-100 border-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/50',
    badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800',
    text: 'text-cyan-400'
  }
};

export const ArmyBuilder: React.FC<ArmyBuilderProps> = ({ onDeployRosterToBattle }) => {
  const allFactions = StorageService.getFactions();
  const allTemplates = StorageService.getUnitTemplates();
  
  const [currentArmyId, setCurrentArmyId] = useState<string>(() => `roster_${Date.now()}`);
  const [selectedFactionId, setSelectedFactionId] = useState<string>(allFactions[0]?.id || 'crimson_empire');
  const [rosterName, setRosterName] = useState<string>('Crimson Vanguard Cadre');
  const [tags, setTags] = useState<string[]>(['Aggro', '500 pts']);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [maxPoints, setMaxPoints] = useState<number>(500);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string>('All');
  
  const [selectedUnits, setSelectedUnits] = useState<Unit[]>(() => {
    return allTemplates.filter(u => u.factionId === (allFactions[0]?.id || 'crimson_empire')).map((u, i) => ({
      ...u,
      id: `unit_${Date.now()}_${i}`
    }));
  });

  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);
  const [showUnitCreatorModal, setShowUnitCreatorModal] = useState<boolean>(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [savedRosters, setSavedRosters] = useState<ArmyRoster[]>(() => StorageService.getRosters());
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [libraryTagFilter, setLibraryTagFilter] = useState<string>('All');
  const [libraryFactionFilter, setLibraryFactionFilter] = useState<string>('All');

  const selectedFaction = allFactions.find(f => f.id === selectedFactionId) || allFactions[0];
  const availableTemplates = allTemplates.filter(u => u.factionId === selectedFactionId);

  // Calculations
  const totalPoints = selectedUnits.reduce((acc, u) => acc + u.points, 0);
  const totalSquads = selectedUnits.length;
  const totalModels = selectedUnits.reduce((acc, u) => acc + (u.stats.modelCount || 1), 0);
  const totalLives = selectedUnits.reduce((acc, u) => acc + u.stats.lives, 0);
  const characterCount = selectedUnits.filter(u => u.role === 'Legendary Leader' || u.role === 'Leader' || u.type === 'Character').length;

  // Validation
  const errors: string[] = [];
  const warnings: string[] = [];

  if (totalPoints > maxPoints) {
    errors.push(`Points limit exceeded! (${totalPoints} / ${maxPoints} pts)`);
  }
  if (totalModels < 5) {
    errors.push(`Rulebook constraint: Force must contain at least 5 models (Current: ${totalModels} models across squads).`);
  }
  if (totalModels > 25) {
    errors.push(`Rulebook constraint: Force exceeds skirmish limit of 25 models (Current: ${totalModels} models).`);
  }
  if (characterCount === 0) {
    warnings.push(`No Leader or Character recruited! You will lack command bonuses and Leader survival rolls.`);
  }

  const handleAddUnit = (template: Unit) => {
    const newUnit: Unit = {
      ...template,
      id: `unit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      stats: { ...template.stats }
    };
    setSelectedUnits([...selectedUnits, newUnit]);
  };

  const handleRemoveUnit = (id: string) => {
    setSelectedUnits(selectedUnits.filter(u => u.id !== id));
  };

  const handleOpenEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setShowUnitCreatorModal(true);
  };

  const handleSaveUnitFromModal = (unit: Unit) => {
    if (editingUnit) {
      // Update cosmetics of existing unit in roster without altering any combat stats
      setSelectedUnits(prev => prev.map(u => u.id === editingUnit.id ? {
        ...u,
        avatar: unit.avatar,
        tokenImageUrl: unit.tokenImageUrl,
        borderStyle: unit.borderStyle,
        vfxEffect: unit.vfxEffect
      } : u));
      setSaveNotification(`Updated ${unit.name} appearance!`);
      // Update template cosmetics
      StorageService.saveUnitTemplate({
        ...editingUnit,
        avatar: unit.avatar,
        tokenImageUrl: unit.tokenImageUrl,
        borderStyle: unit.borderStyle,
        vfxEffect: unit.vfxEffect
      });
    }
    setTimeout(() => setSaveNotification(null), 3500);
  };

  const handleFactionChange = (factionId: string) => {
    setSelectedFactionId(factionId);
    const newFaction = allFactions.find(f => f.id === factionId);
    if (newFaction) {
      setRosterName(`${newFaction.shortName} Strike Force`);
      const factionUnits = allTemplates.filter(u => u.factionId === factionId).map((u, i) => ({
        ...u,
        id: `unit_${Date.now()}_${i}`
      }));
      setSelectedUnits(factionUnits);
    }
  };

  // Tag Helpers
  const handleToggleSuggestedTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customTagInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setCustomTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Save Army Record to Player Library
  const handleSaveArmy = () => {
    const army: ArmyRoster = {
      id: currentArmyId || `roster_${Date.now()}`,
      name: rosterName.trim() || `${selectedFaction.shortName} Strike Force`,
      factionId: selectedFactionId,
      tags: tags,
      maxPoints,
      totalPoints,
      units: selectedUnits,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    StorageService.saveRoster(army);
    const refreshed = StorageService.getRosters();
    setSavedRosters(refreshed);
    setSaveNotification(`Army "${army.name}" saved to your Library!`);
    setTimeout(() => setSaveNotification(null), 3500);
  };

  // Load Saved Army from Library
  const handleLoadArmy = (roster: ArmyRoster) => {
    setCurrentArmyId(roster.id);
    setRosterName(roster.name);
    setSelectedFactionId(roster.factionId);
    setTags(roster.tags || []);
    setMaxPoints(roster.maxPoints || 500);
    setSelectedUnits(roster.units.map(u => ({ ...u })));
    setShowLibraryModal(false);
    setSaveNotification(`Loaded army "${roster.name}" into Builder.`);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  // Duplicate an Army
  const handleDuplicateArmy = (roster: ArmyRoster) => {
    const duplicated: ArmyRoster = {
      ...roster,
      id: `roster_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: `${roster.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    StorageService.saveRoster(duplicated);
    setSavedRosters(StorageService.getRosters());
    setSaveNotification(`Duplicated "${roster.name}"!`);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  // Delete an Army from Library
  const handleDeleteArmy = (rosterId: string) => {
    StorageService.deleteRoster(rosterId);
    setSavedRosters(StorageService.getRosters());
  };

  // Start a fresh new army
  const handleNewArmy = () => {
    setCurrentArmyId(`roster_${Date.now()}`);
    setRosterName(`${selectedFaction.shortName} Strike Force`);
    setTags(['Balanced', `${maxPoints} pts`]);
    const factionUnits = allTemplates.filter(u => u.factionId === selectedFactionId).slice(0, 5).map((u, i) => ({
      ...u,
      id: `unit_${Date.now()}_${i}`
    }));
    setSelectedUnits(factionUnits);
  };

  // Deploy to Battle (also saves to Library)
  const handleDeploy = () => {
    const roster: ArmyRoster = {
      id: currentArmyId || `roster_${Date.now()}`,
      name: rosterName.trim() || `${selectedFaction.shortName} Strike Force`,
      factionId: selectedFactionId,
      tags: tags,
      maxPoints,
      totalPoints,
      units: selectedUnits,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    StorageService.saveRoster(roster);
    onDeployRosterToBattle(roster);
  };

  // Group selected units by Role
  const groupedSelected = ROLES_LIST.map(role => ({
    role,
    units: selectedUnits.filter(u => (u.role || (u.type === 'Character' ? 'Leader' : 'Battleline')) === role)
  })).filter(g => g.units.length > 0);

  // Filter templates in armory
  const filteredTemplates = activeRoleFilter === 'All'
    ? availableTemplates
    : availableTemplates.filter(t => (t.role || 'Battleline') === activeRoleFilter);

  // Filter saved armies in library modal
  const filteredSavedArmies = savedRosters.filter(r => {
    const matchesSearch = !librarySearch.trim() || 
      r.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(librarySearch.toLowerCase())));
    const matchesFaction = libraryFactionFilter === 'All' || r.factionId === libraryFactionFilter;
    const matchesTag = libraryTagFilter === 'All' || (r.tags && r.tags.includes(libraryTagFilter));
    return matchesSearch && matchesFaction && matchesTag;
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 select-none">
      {/* Toast Save Notification */}
      {saveNotification && (
        <div className="fixed top-16 right-6 z-50 bg-gradient-to-r from-emerald-950 to-emerald-900 border border-emerald-400/80 text-emerald-200 px-4 py-3 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_15px_rgba(16,185,129,0.3)] flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-4 duration-200 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
          <span className="text-xs font-bold font-mono tracking-wide">{saveNotification}</span>
        </div>
      )}

      {/* ═══ Top Banner & Faction Selector ═══ */}
      <div className="bg-gradient-to-br from-[#121526]/95 via-[#0e101d]/95 to-[#080a13]/95 border border-amber-900/40 shadow-[0_12px_45px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(251,191,36,0.12)] rounded-2xl p-5 md:p-6 space-y-5 backdrop-blur-md relative overflow-hidden">
        {/* Subtle ambient lighting flare */}
        <div className="absolute top-0 left-1/4 w-96 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-800/80 text-rose-300 text-[10px] uppercase tracking-widest font-black font-mono shadow-[0_0_8px_rgba(244,63,94,0.2)]">
                ⚔️ Muster of Arms
              </span>
              <span className="text-amber-900/60 font-bold">│</span>
              <span className="text-[11px] font-mono text-zinc-400">Army ID: <strong className="text-amber-400 font-bold">{currentArmyId.slice(-8)}</strong></span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center space-x-3 mt-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              <FactionLogo faction={selectedFaction} size="md" />
              <span className="tracking-wide">{selectedFaction.name}</span>
            </h1>
            <p className="text-xs text-amber-200/60 italic font-serif mt-1">"{selectedFaction.quote}"</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowLibraryModal(true)}
              className="px-3.5 py-2 bg-gradient-to-b from-[#1c1f2e] to-[#121420] hover:from-[#252a3f] hover:to-[#171a2b] text-amber-300 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-bold font-mono flex items-center space-x-1.5 transition shadow-lg shadow-black/40 cursor-pointer"
              title="Browse and load your saved armies"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Saved Armies ({savedRosters.length})</span>
            </button>

            <button
              onClick={handleNewArmy}
              className="px-3 py-2 bg-gradient-to-b from-[#181a26] to-[#0f111a] hover:from-[#222536] hover:to-[#141622] text-zinc-300 hover:text-white border border-zinc-750 hover:border-zinc-600 rounded-xl text-xs font-mono font-bold flex items-center space-x-1 transition shadow-lg cursor-pointer"
              title="Start a fresh blank army roster"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>New</span>
            </button>

            <button
              onClick={handleSaveArmy}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:via-amber-300 hover:to-amber-400 text-black font-black text-xs font-mono rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center space-x-1.5 transition active:scale-95 cursor-pointer border border-amber-300"
              title="Save army to your account library"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Army</span>
            </button>

            <button
              onClick={handleDeploy}
              disabled={errors.length > 0}
              className={`px-5 py-2 rounded-xl font-black text-xs font-mono uppercase tracking-wider shadow-xl flex items-center space-x-2 transition border ${
                errors.length === 0
                  ? 'bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 hover:from-rose-600 hover:via-rose-500 hover:to-rose-600 text-white cursor-pointer shadow-[0_0_22px_rgba(244,63,94,0.45)] border-rose-500/80 active:scale-95'
                  : 'bg-zinc-800/80 text-zinc-500 border-zinc-700 cursor-not-allowed'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Deploy to Battle</span>
            </button>
          </div>
        </div>

        {/* Name Your Army & Metadata Config Slate */}
        <div className="p-4 md:p-5 bg-gradient-to-br from-[#090b14]/95 via-[#0c0e18]/95 to-[#070910]/95 rounded-xl border border-amber-900/30 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] space-y-4 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            <div className="md:col-span-8">
              <label className="text-[11px] uppercase font-bold text-amber-400 block mb-1 font-mono flex items-center space-x-1.5">
                <span>Name Your Army</span>
                <span className="text-zinc-500 font-normal">(stored on your account &amp; used for filtering)</span>
              </label>
              <input
                type="text"
                value={rosterName}
                onChange={e => setRosterName(e.target.value)}
                placeholder="e.g. Crimson Vanguard Shock Cadre..."
                className="w-full bg-[#0e101b] border border-amber-900/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl px-3.5 py-2 text-sm text-white font-bold placeholder-zinc-600 shadow-inner transition"
              />
            </div>

            <div className="md:col-span-4">
              <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1 font-mono">Battle Limit</label>
              <select
                value={maxPoints}
                onChange={e => setMaxPoints(Number(e.target.value))}
                className="w-full bg-[#0e101b] border border-amber-900/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl px-3.5 py-2 text-xs text-amber-200 font-bold transition cursor-pointer"
              >
                <option value={500}>⚔️ Skirmish (500 pts)</option>
                <option value={750}>🛡️ Clash (750 pts)</option>
                <option value={1000}>👑 Battle (1,000 pts)</option>
              </select>
            </div>
          </div>

          {/* Tagging System */}
          <div className="pt-3 border-t border-amber-900/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold flex items-center space-x-1.5">
                <Tag className="w-3 h-3 text-amber-400" />
                <span>Doctrinal Tags &amp; Labels</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Filterable during pre-battle selection</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Active Tags */}
              {tags.map(t => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-950/90 to-[#1c150a] border border-amber-500/60 text-amber-300 font-mono text-[11px] font-bold flex items-center space-x-1.5 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                >
                  <span>#{t}</span>
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-white transition ml-0.5 cursor-pointer text-amber-400/70 hover:text-amber-200"
                    title="Remove tag"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Custom Tag Input */}
              <form onSubmit={handleAddCustomTag} className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={e => setCustomTagInput(e.target.value)}
                  placeholder="+ Custom tag..."
                  className="bg-[#0e101b] border border-zinc-750 focus:border-amber-400 px-2.5 py-1 rounded-lg text-[11px] text-white font-mono focus:outline-none w-32 transition placeholder-zinc-600"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-gradient-to-b from-[#212435] to-[#141624] hover:from-[#2a2f47] hover:to-[#1a1d30] text-zinc-200 border border-zinc-700 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Quick Tag Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[9px] text-zinc-500 font-mono uppercase mr-1">Quick Suggestions:</span>
              {SUGGESTED_TAGS.map(s => {
                const isSelected = tags.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleToggleSuggestedTag(s)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500/90 text-black border-amber-400 font-bold shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                        : 'bg-[#10121d] hover:bg-[#181b2b] text-zinc-400 hover:text-white border-zinc-800'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Faction selector chips */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-t border-amber-900/25 pt-3.5">
          {allFactions.map(f => {
            const isSelected = selectedFactionId === f.id;
            const theme = FACTION_THEME_MAP[f.id] || {
              activeBtn: 'bg-rose-950/80 text-rose-200 border-rose-500 shadow-md',
              badge: 'bg-zinc-900 text-zinc-400',
              text: 'text-zinc-400'
            };

            return (
              <button
                key={f.id}
                onClick={() => handleFactionChange(f.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? theme.activeBtn
                    : 'bg-[#0f111c]/80 text-zinc-400 border-zinc-800/80 hover:text-white hover:border-zinc-700 hover:bg-[#141726]'
                }`}
              >
                <FactionLogo faction={f} size="xs" />
                <span>{f.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>


      {/* Force Summary Stats (Glassmorphic HUD Pods) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className={`bg-gradient-to-br from-[#121526]/90 via-[#0e101d]/90 to-[#090b14]/90 border ${
          totalPoints > maxPoints ? 'border-rose-600/80 shadow-[0_0_18px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/40' : 'border-amber-900/40 shadow-lg'
        } p-4 rounded-2xl relative overflow-hidden backdrop-blur-sm`}>
          <div className={`absolute top-0 left-0 right-0 h-1 ${totalPoints > maxPoints ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`} />
          <span className="text-[11px] text-zinc-400 uppercase font-mono font-bold block tracking-wider flex items-center space-x-1">
            <span>🪙 Force Cost</span>
          </span>
          <div className="text-2xl font-black font-mono mt-1 tracking-tight">
            <span className={totalPoints > maxPoints ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'}>
              {totalPoints}
            </span>
            <span className="text-zinc-500 text-xs font-normal"> / {maxPoints} pts</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#121526]/90 via-[#0e101d]/90 to-[#090b14]/90 border border-amber-900/40 p-4 rounded-2xl relative overflow-hidden backdrop-blur-sm shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-amber-400" />
          <span className="text-[11px] text-zinc-400 uppercase font-mono font-bold block tracking-wider flex items-center space-x-1">
            <span>🛡️ Enrolled Squads</span>
          </span>
          <div className="text-2xl font-black text-white font-mono mt-1 tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{totalSquads}</div>
        </div>

        <div className="bg-gradient-to-br from-[#121526]/90 via-[#0e101d]/90 to-[#090b14]/90 border border-amber-900/40 p-4 rounded-2xl relative overflow-hidden backdrop-blur-sm shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-600 to-sky-400" />
          <span className="text-[11px] text-zinc-400 uppercase font-mono font-bold block tracking-wider flex items-center space-x-1">
            <span>👥 Total Models</span>
          </span>
          <div className="text-2xl font-black text-sky-400 font-mono mt-1 tracking-tight drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]">
            {totalModels} <span className="text-xs text-zinc-500 font-normal font-sans">(5–25 req)</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#121526]/90 via-[#0e101d]/90 to-[#090b14]/90 border border-amber-900/40 p-4 rounded-2xl relative overflow-hidden backdrop-blur-sm shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-300" />
          <span className="text-[11px] text-zinc-400 uppercase font-mono font-bold block tracking-wider flex items-center space-x-1">
            <span>❤️ Squad Life Pool</span>
          </span>
          <div className="text-2xl font-black text-amber-300 font-mono mt-1 tracking-tight drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">{totalLives} L</div>
        </div>
      </div>

      {/* Errors and Warnings */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-2.5">
          {errors.map((err, i) => (
            <div key={`err_${i}`} className="bg-gradient-to-r from-rose-950/95 via-[#250d14]/95 to-rose-950/95 border border-rose-500/80 text-rose-200 px-4 py-3 rounded-xl shadow-[0_0_18px_rgba(244,63,94,0.3)] text-xs font-mono flex items-center space-x-3 backdrop-blur-sm">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
              <span className="font-bold">{err}</span>
            </div>
          ))}
          {warnings.map((warn, i) => (
            <div key={`warn_${i}`} className="bg-gradient-to-r from-amber-950/95 via-[#24170c]/95 to-amber-950/95 border border-amber-500/80 text-amber-200 px-4 py-3 rounded-xl shadow-[0_0_18px_rgba(245,158,11,0.25)] text-xs font-mono flex items-center space-x-3 backdrop-blur-sm">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Two Column Layout (Roster & Armory) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Grouped Units by Role (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-amber-900/25">
            <h2 className="text-base font-black text-white flex items-center space-x-2">
              <span className="text-rose-400">⚔️</span>
              <span className="tracking-wide">Enlisted Force Roster</span>
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-amber-950/70 border border-amber-700/60 text-amber-300 text-xs font-bold font-mono">
              {selectedUnits.length} Squads Enlisted
            </span>
          </div>

          {selectedUnits.length === 0 ? (
            <div className="bg-gradient-to-b from-[#0e101b] to-[#070910] border-2 border-dashed border-amber-900/30 rounded-2xl p-10 text-center text-zinc-500 text-xs space-y-2">
              <Shield className="w-8 h-8 mx-auto text-amber-900/40" />
              <p className="font-mono">No units currently recruited.</p>
              <p className="text-[11px] text-zinc-600">Select datasheets from the Faction Armory on the right and click "+ Enlist".</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedSelected.map(group => (
                <div key={group.role} className="space-y-2">
                  <div className="flex items-center space-x-2 border-b border-amber-900/25 pb-1">
                    <span className="text-xs uppercase font-black tracking-wider font-mono text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.2)]">
                      {group.role}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#151828] border border-amber-800/40 text-amber-300 font-mono text-[10px] font-bold">
                      {group.units.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.units.map(unit => (
                      <div
                        key={unit.id}
                        className="bg-gradient-to-r from-[#111424]/90 via-[#0e101d]/90 to-[#0a0c16]/90 border border-amber-900/30 hover:border-amber-600/50 rounded-xl p-3 flex items-center justify-between transition-all duration-200 shadow-md hover:shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
                      >
                        <div className="flex items-center space-x-3">
                          {unit.tokenImageUrl ? (
                            <img
                              src={unit.tokenImageUrl}
                              alt={unit.name}
                              className="w-10 h-10 rounded-xl object-cover border-2 border-amber-500/70 shadow-[0_0_8px_rgba(245,158,11,0.2)] shrink-0"
                            />
                          ) : (
                            <span className="text-2xl bg-gradient-to-br from-zinc-900 to-black p-2 rounded-xl border border-amber-900/40 shrink-0 shadow-inner">{unit.avatar}</span>
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white text-xs tracking-wide">{unit.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#16192b] text-amber-300 border border-amber-800/40 font-mono font-bold">
                                {unit.type}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {unit.stats.modelCount || 1} models • {unit.stats.hpPerModel || 1} HP/model ({unit.stats.lives} Total Lives)
                            </div>
                          </div>
                        </div>

                        {/* Statline Capsules */}
                        <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                          <span className="bg-[#080a13] px-2 py-0.5 rounded-md border border-zinc-800 text-zinc-300 font-bold">
                            Mv:{unit.stats.mv}
                          </span>
                          <span className="bg-[#080a13] px-2 py-0.5 rounded-md border border-sky-900/50 text-sky-400 font-bold">
                            Def:{unit.stats.def}
                          </span>
                          <span className="bg-[#080a13] px-2 py-0.5 rounded-md border border-rose-900/50 text-rose-400 font-bold">
                            AM:{unit.stats.am}
                          </span>
                          <span className="bg-gradient-to-r from-amber-950 to-amber-900/80 px-2 py-0.5 rounded-md border border-amber-500/60 text-amber-300 font-black shadow-[0_0_6px_rgba(245,158,11,0.2)]">
                            {unit.points} pts
                          </span>
                          <button
                            onClick={() => handleOpenEditUnit(unit)}
                            className="p-1.5 text-zinc-400 hover:text-amber-300 bg-[#161827] hover:bg-[#20243a] border border-amber-900/40 rounded-lg transition ml-1 cursor-pointer"
                            title="Customize unit & upload custom token image"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveUnit(unit.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 bg-[#161827] hover:bg-rose-950/60 border border-zinc-800 hover:border-rose-800/60 rounded-lg transition ml-0.5 cursor-pointer"
                            title="Remove from roster"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Armory Catalog with Role Filter (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-amber-900/25">
            <h2 className="text-base font-black text-white flex items-center space-x-2">
              <span className="text-amber-400">🛡️</span>
              <span className="tracking-wide">Faction Armory</span>
            </h2>
            <span className="text-xs text-zinc-400 font-mono font-bold">({filteredTemplates.length} Datasheets)</span>
          </div>

          {/* Role Filter Chips */}
          <div className="flex flex-wrap gap-1.5 border-b border-amber-900/20 pb-2.5">
            {['All', ...ROLES_LIST].map(r => (
              <button
                key={r}
                onClick={() => setActiveRoleFilter(r)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all border cursor-pointer ${
                  activeRoleFilter === r
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black border-amber-400 font-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-[#0e101d] text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Templates list */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredTemplates.map(template => (
              <div
                key={template.templateId}
                className="bg-gradient-to-br from-[#111424]/90 via-[#0e101d]/90 to-[#0a0c16]/90 border border-amber-900/30 hover:border-amber-600/50 rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 shadow-md hover:shadow-[0_4px_20px_rgba(0,0,0,0.6)] space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    {template.tokenImageUrl ? (
                      <img
                        src={template.tokenImageUrl}
                        alt={template.name}
                        className="w-10 h-10 rounded-xl object-cover border-2 border-amber-500/50 shadow shrink-0"
                      />
                    ) : (
                      <span className="text-2xl bg-gradient-to-br from-zinc-900 to-black p-2 rounded-xl border border-amber-900/30 shrink-0 shadow-inner">{template.avatar}</span>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-xs tracking-wide">{template.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[#16192b] text-amber-300 border border-amber-800/40 font-mono font-bold">
                          {template.role || template.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                        {template.stats.modelCount || 1} models • {template.stats.hpPerModel || 1} HP/model ({template.stats.lives} Total Lives)
                      </p>
                    </div>
                  </div>
                  <span className="bg-gradient-to-r from-amber-950 to-amber-900 px-2 py-0.5 rounded-md border border-amber-500/50 text-amber-300 font-black font-mono text-xs shadow">
                    {template.points} pts
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-900/20 text-[10px] font-mono">
                  <span className="text-zinc-400 font-bold">
                    Mv:{template.stats.mv} Def:{template.stats.def} AM:{template.stats.am} CP:{template.stats.cp}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEditUnit(template)}
                      className="flex items-center space-x-1 bg-gradient-to-b from-[#1c1f2e] to-[#121422] hover:from-[#252a3f] hover:to-[#181b2e] text-amber-300 border border-amber-500/40 font-bold px-2.5 py-1 rounded-lg shadow text-xs transition cursor-pointer"
                      title="Customize unit stats or upload custom token image"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Customize</span>
                    </button>
                    <button
                      onClick={() => handleAddUnit(template)}
                      className="flex items-center space-x-1 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-black px-3 py-1 rounded-lg shadow-[0_0_10px_rgba(244,63,94,0.3)] border border-rose-500/50 text-xs cursor-pointer active:scale-95 transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Enlist</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Saved Armies Library Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#121526] via-[#0d0f1b] to-[#080913] border border-amber-900/50 rounded-2xl max-w-3xl w-full p-6 shadow-[0_16px_60px_rgba(0,0,0,0.9),0_0_20px_rgba(245,158,11,0.1)] flex flex-col max-h-[85vh] overflow-hidden space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-900/25 pb-3">
              <div className="flex items-center space-x-2.5">
                <FolderOpen className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
                <div>
                  <h3 className="text-base font-black text-white tracking-wide">Saved Armies Library</h3>
                  <p className="text-xs text-amber-200/60 font-serif">Load or manage your saved forces across all factions</p>
                </div>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filters */}
            <div className="space-y-2.5">
              <input
                type="text"
                value={librarySearch}
                onChange={e => setLibrarySearch(e.target.value)}
                placeholder="Search by army name or tag (e.g. Vanguard, Aggro)..."
                className="w-full bg-[#0a0c16] border border-amber-900/30 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 px-3.5 py-2 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none font-mono transition"
              />

              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <span className="text-zinc-500 uppercase font-bold mr-1">Faction:</span>
                <button
                  onClick={() => setLibraryFactionFilter('All')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer border ${
                    libraryFactionFilter === 'All'
                      ? 'bg-amber-500 text-black font-black border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                      : 'bg-[#10121e] text-zinc-400 hover:text-white border-zinc-800'
                  }`}
                >
                  All
                </button>
                {allFactions.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setLibraryFactionFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer inline-flex items-center space-x-1.5 border ${
                      libraryFactionFilter === f.id
                        ? 'bg-amber-500 text-black font-black border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                        : 'bg-[#10121e] text-zinc-400 hover:text-white border-zinc-800'
                    }`}
                  >
                    <FactionLogo faction={f} size="xs" />
                    <span>{f.shortName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Armies List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredSavedArmies.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-amber-900/25 rounded-xl space-y-2 text-zinc-500 text-xs font-mono">
                  <FolderOpen className="w-8 h-8 mx-auto text-amber-900/30" />
                  <span>No saved armies match your search criteria.</span>
                </div>
              ) : (
                filteredSavedArmies.map(army => {
                  const faction = allFactions.find(f => f.id === army.factionId);
                  const isCurrent = army.id === currentArmyId;

                  return (
                    <div
                      key={army.id}
                      className={`p-4 bg-gradient-to-r from-[#0d0f1b]/95 via-[#111424]/95 to-[#0d0f1b]/95 rounded-xl border transition-all duration-200 space-y-3 ${
                        isCurrent
                          ? 'border-amber-400/90 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50'
                          : 'border-amber-900/20 hover:border-amber-600/40 shadow-md'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <FactionLogo faction={faction} size="md" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-white text-sm tracking-wide">{army.name}</h4>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/70 font-mono text-[9px] font-bold shadow-[0_0_6px_rgba(245,158,11,0.2)]">
                                  Active in Builder
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {faction?.name || army.factionId} • {army.units.length} Squads • {army.totalPoints} / {army.maxPoints} pts
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLoadArmy(army)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-black text-xs rounded-xl shadow-[0_0_10px_rgba(244,63,94,0.3)] border border-rose-500/50 cursor-pointer active:scale-95 transition"
                          >
                            Load into Builder
                          </button>
                          <button
                            onClick={() => handleDuplicateArmy(army)}
                            className="p-2 bg-[#161827] hover:bg-[#20243a] text-zinc-300 hover:text-white rounded-xl border border-zinc-750 transition cursor-pointer"
                            title="Duplicate Army"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteArmy(army.id)}
                            className="p-2 bg-[#161827] hover:bg-rose-950 text-zinc-400 hover:text-rose-400 rounded-xl border border-zinc-750 hover:border-rose-900/60 transition cursor-pointer"
                            title="Delete Army"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tags & Unit Avatars Preview */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-900/15 text-[10px] font-mono">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {army.tags && army.tags.length > 0 ? (
                            army.tags.map(t => (
                              <span key={t} className="px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-700/40 text-amber-300">
                                #{t}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-600 italic">No tags</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {army.units.slice(0, 6).map((u, i) => (
                            u.tokenImageUrl ? (
                              <img key={i} src={u.tokenImageUrl} alt={u.name} title={u.name} className="w-6 h-6 rounded-md object-cover border border-amber-600/40 shrink-0" />
                            ) : (
                              <span key={i} title={u.name} className="text-xs bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                {u.avatar}
                              </span>
                            )
                          ))}
                          {army.units.length > 6 && (
                            <span className="text-[9px] text-zinc-500 font-mono">+{army.units.length - 6}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-amber-900/25 text-xs text-zinc-500 font-mono">
              <span>{filteredSavedArmies.length} armies found</span>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="px-4 py-1.5 bg-[#171a29] hover:bg-[#202438] text-zinc-300 hover:text-white border border-zinc-700 rounded-xl cursor-pointer transition font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Unit Appearance & Token Customization Modal (Cosmetics Only) */}
      <UnitCreatorModal
        isOpen={showUnitCreatorModal}
        onClose={() => setShowUnitCreatorModal(false)}
        onSaveUnit={handleSaveUnitFromModal}
        initialUnit={editingUnit}
        factionId={selectedFactionId}
        mode="cosmetics"
      />
    </div>
  );
};
