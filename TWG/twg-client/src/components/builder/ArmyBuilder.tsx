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

  const handleOpenCreateUnit = () => {
    setEditingUnit(null);
    setShowUnitCreatorModal(true);
  };

  const handleOpenEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setShowUnitCreatorModal(true);
  };

  const handleSaveUnitFromModal = (unit: Unit) => {
    if (editingUnit) {
      // Update existing unit in roster
      setSelectedUnits(prev => prev.map(u => u.id === editingUnit.id ? { ...unit, id: u.id } : u));
      setSaveNotification(`Updated ${unit.name} with custom token!`);
    } else {
      // Add newly created unit to roster
      setSelectedUnits(prev => [...prev, unit]);
      setSaveNotification(`Created & enlisted ${unit.name}!`);
    }
    // Also save as template to Armory
    StorageService.saveUnitTemplate(unit);
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
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Toast Save Notification */}
      {saveNotification && (
        <div className="fixed top-16 right-6 z-50 bg-emerald-950 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold font-mono">{saveNotification}</span>
        </div>
      )}

      {/* Top Banner & Faction Selector */}
      <div className="bg-[#12141c] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-widest text-rose-400 font-bold font-mono">Muster of Arms</span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs font-mono text-zinc-400">Army ID: {currentArmyId.slice(-8)}</span>
            </div>
            <h1 className="text-2xl font-black text-white flex items-center space-x-2 mt-0.5">
              <span>{selectedFaction.symbol}</span>
              <span>{selectedFaction.name}</span>
            </h1>
            <p className="text-xs text-zinc-400 italic font-serif mt-0.5">"{selectedFaction.quote}"</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowLibraryModal(true)}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold font-mono flex items-center space-x-1.5 transition shadow cursor-pointer"
              title="Browse and load your saved armies"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Saved Armies ({savedRosters.length})</span>
            </button>

            <button
              onClick={handleNewArmy}
              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-mono flex items-center space-x-1 transition cursor-pointer"
              title="Start a fresh blank army roster"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>New</span>
            </button>

            <button
              onClick={handleSaveArmy}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono rounded-lg shadow flex items-center space-x-1.5 transition cursor-pointer"
              title="Save army to your account library"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Army</span>
            </button>

            <button
              onClick={handleDeploy}
              disabled={errors.length > 0}
              className={`px-4 py-2 rounded-lg font-bold text-xs shadow-lg flex items-center space-x-2 transition ${
                errors.length === 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-rose-950/50'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Deploy to Battle</span>
            </button>
          </div>
        </div>

        {/* Name Your Army & Metadata Config */}
        <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-850 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-8">
              <label className="text-[11px] uppercase font-bold text-amber-400 block mb-1 font-mono flex items-center space-x-1">
                <span>Name Your Army</span>
                <span className="text-zinc-500 font-normal">(stored on your account &amp; used for filtering)</span>
              </label>
              <input
                type="text"
                value={rosterName}
                onChange={e => setRosterName(e.target.value)}
                placeholder="e.g. Crimson Vanguard Shock Cadre..."
                className="w-full bg-[#12141c] border border-zinc-700 px-3 py-1.5 rounded-lg text-sm text-white font-bold focus:border-amber-400 focus:outline-none placeholder-zinc-600"
              />
            </div>

            <div className="md:col-span-4">
              <label className="text-[11px] uppercase font-bold text-zinc-400 block mb-1 font-mono">Battle Limit</label>
              <select
                value={maxPoints}
                onChange={e => setMaxPoints(Number(e.target.value))}
                className="w-full bg-[#12141c] border border-zinc-700 px-3 py-1.5 rounded-lg text-xs text-white font-medium focus:border-amber-400 focus:outline-none"
              >
                <option value={500}>Skirmish (500 pts)</option>
                <option value={750}>Clash (750 pts)</option>
                <option value={1000}>Battle (1,000 pts)</option>
              </select>
            </div>
          </div>

          {/* Tagging System */}
          <div className="pt-2 border-t border-zinc-850 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold flex items-center space-x-1">
                <Tag className="w-3 h-3 text-amber-400" />
                <span>Doctrinal Tags &amp; Labels</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Filterable during pre-battle selection</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Active Tags */}
              {tags.map(t => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-600/70 text-amber-300 font-mono text-[11px] font-bold flex items-center space-x-1 shadow-sm"
                >
                  <span>#{t}</span>
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-white transition ml-0.5 cursor-pointer"
                    title="Remove tag"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Custom Tag Input */}
              <form onSubmit={handleAddCustomTag} className="flex items-center space-x-1">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={e => setCustomTagInput(e.target.value)}
                  placeholder="+ Custom tag..."
                  className="bg-[#12141c] border border-zinc-750 px-2 py-0.5 rounded-md text-[11px] text-white font-mono focus:border-amber-400 focus:outline-none w-28"
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-mono transition cursor-pointer"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Quick Tag Suggestions */}
            <div className="flex flex-wrap items-center gap-1 pt-1">
              <span className="text-[9px] text-zinc-500 font-mono uppercase mr-1">Quick Suggestions:</span>
              {SUGGESTED_TAGS.map(s => {
                const isSelected = tags.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleToggleSuggestedTag(s)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
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
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-t border-zinc-800/80 pt-3">
          {allFactions.map(f => (
            <button
              key={f.id}
              onClick={() => handleFactionChange(f.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                selectedFactionId === f.id
                  ? 'bg-rose-950/80 text-rose-200 border-rose-500 shadow-md'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <span>{f.symbol}</span>
              <span>{f.shortName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Force Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#12141c] border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-zinc-400 uppercase font-mono block">Force Cost</span>
          <div className="text-xl font-black font-mono mt-0.5">
            <span className={totalPoints > maxPoints ? 'text-rose-500' : 'text-emerald-400'}>
              {totalPoints}
            </span>
            <span className="text-zinc-500 text-xs"> / {maxPoints} pts</span>
          </div>
        </div>
        <div className="bg-[#12141c] border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-zinc-400 uppercase font-mono block">Enrolled Squads</span>
          <div className="text-xl font-black text-white font-mono mt-0.5">{totalSquads}</div>
        </div>
        <div className="bg-[#12141c] border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-zinc-400 uppercase font-mono block">Total Models</span>
          <div className="text-xl font-black text-sky-400 font-mono mt-0.5">
            {totalModels} <span className="text-xs text-zinc-500 font-normal">models (5–25 req)</span>
          </div>
        </div>
        <div className="bg-[#12141c] border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-zinc-400 uppercase font-mono block">Squad Life Pool</span>
          <div className="text-xl font-black text-amber-400 font-mono mt-0.5">{totalLives} L</div>
        </div>
      </div>

      {/* Errors and Warnings */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-2">
          {errors.map((err, i) => (
            <div key={`err_${i}`} className="bg-rose-950/60 border border-rose-600/60 text-rose-200 px-4 py-2.5 rounded-lg text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{err}</span>
            </div>
          ))}
          {warnings.map((warn, i) => (
            <div key={`warn_${i}`} className="bg-amber-950/40 border border-amber-600/50 text-amber-200 px-4 py-2.5 rounded-lg text-xs flex items-center space-x-2">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Grouped Units by Role (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center justify-between">
            <span>Enlisted Force Roster</span>
            <span className="text-xs text-zinc-400 font-mono">{selectedUnits.length} Squads</span>
          </h2>

          {selectedUnits.length === 0 ? (
            <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-xs">
              No units currently recruited. Click '+' on the Armory to add units.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedSelected.map(group => (
                <div key={group.role} className="space-y-2">
                  <div className="flex items-center space-x-2 border-b border-zinc-800 pb-1">
                    <span className="text-xs uppercase font-bold tracking-wider font-mono text-amber-400">
                      {group.role}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">({group.units.length})</span>
                  </div>

                  <div className="space-y-2">
                    {group.units.map(unit => (
                      <div
                        key={unit.id}
                        className="bg-[#12141c] border border-zinc-800 rounded-xl p-3 flex items-center justify-between hover:border-zinc-700 transition"
                      >
                        <div className="flex items-center space-x-3">
                          {unit.tokenImageUrl ? (
                            <img
                              src={unit.tokenImageUrl}
                              alt={unit.name}
                              className="w-10 h-10 rounded-xl object-cover border border-amber-500/60 shadow shrink-0"
                            />
                          ) : (
                            <span className="text-2xl bg-zinc-950 p-2 rounded-lg border border-zinc-800 shrink-0">{unit.avatar}</span>
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white text-xs">{unit.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                                {unit.type}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {unit.stats.modelCount || 1} models • {unit.stats.hpPerModel || 1} HP/model ({unit.stats.lives} Total Lives)
                            </div>
                          </div>
                        </div>

                        {/* Statline */}
                        <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                          <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-300">
                            Mv:{unit.stats.mv}
                          </span>
                          <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-sky-400">
                            Def:{unit.stats.def}
                          </span>
                          <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-rose-400">
                            AM:{unit.stats.am}
                          </span>
                          <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-amber-400 font-bold">
                            {unit.points} pts
                          </span>
                          <button
                            onClick={() => handleOpenEditUnit(unit)}
                            className="p-1.5 text-zinc-400 hover:text-amber-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 rounded transition ml-1 cursor-pointer"
                            title="Customize unit & upload custom token image"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveUnit(unit.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 transition ml-0.5 cursor-pointer"
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
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Faction Armory</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleOpenCreateUnit}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] font-mono rounded shadow flex items-center space-x-1 transition cursor-pointer"
                title="Create a custom unit with custom stats and uploaded token image"
              >
                <Plus className="w-3 h-3" />
                <span>Create Unit</span>
              </button>
              <span className="text-xs text-zinc-400 font-mono">({filteredTemplates.length})</span>
            </div>
          </div>

          {/* Role Filter Chips */}
          <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-2">
            {['All', ...ROLES_LIST].map(r => (
              <button
                key={r}
                onClick={() => setActiveRoleFilter(r)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono transition ${
                  activeRoleFilter === r
                    ? 'bg-rose-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
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
                className="bg-[#12141c] border border-zinc-800 rounded-xl p-3 flex flex-col justify-between hover:border-zinc-700 transition space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    {template.tokenImageUrl ? (
                      <img
                        src={template.tokenImageUrl}
                        alt={template.name}
                        className="w-9 h-9 rounded-lg object-cover border border-amber-500/40 shadow shrink-0"
                      />
                    ) : (
                      <span className="text-2xl bg-zinc-950 p-1.5 rounded-lg border border-zinc-800 shrink-0">{template.avatar}</span>
                    )}
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-white text-xs">{template.name}</span>
                        <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {template.role || template.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {template.stats.modelCount || 1} models • {template.stats.hpPerModel || 1} HP/model ({template.stats.lives} Total Lives)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-400 font-mono">{template.points} pts</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-[10px] font-mono">
                  <span className="text-zinc-400">
                    Mv:{template.stats.mv} Def:{template.stats.def} AM:{template.stats.am} CP:{template.stats.cp}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleOpenEditUnit(template)}
                      className="flex items-center space-x-1 bg-zinc-850 hover:bg-zinc-750 text-amber-300 border border-amber-500/40 font-bold px-2 py-1 rounded shadow text-xs transition cursor-pointer"
                      title="Customize unit stats or upload custom token image"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Customize</span>
                    </button>
                    <button
                      onClick={() => handleAddUnit(template)}
                      className="flex items-center space-x-1 bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 rounded shadow text-xs cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11131c] border border-zinc-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <FolderOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Your Saved Armies Library</h3>
                  <p className="text-xs text-zinc-400">Load or manage your saved forces across all factions</p>
                </div>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filters */}
            <div className="space-y-2">
              <input
                type="text"
                value={librarySearch}
                onChange={e => setLibrarySearch(e.target.value)}
                placeholder="Search by army name or tag (e.g. Vanguard, Aggro)..."
                className="w-full bg-zinc-950 border border-zinc-750 px-3 py-2 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
              />

              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <span className="text-zinc-500 uppercase">Faction:</span>
                <button
                  onClick={() => setLibraryFactionFilter('All')}
                  className={`px-2 py-0.5 rounded transition cursor-pointer ${
                    libraryFactionFilter === 'All' ? 'bg-amber-400 text-black font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                {allFactions.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setLibraryFactionFilter(f.id)}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      libraryFactionFilter === f.id ? 'bg-amber-400 text-black font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {f.symbol} {f.shortName}
                  </button>
                ))}
              </div>
            </div>

            {/* Armies List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredSavedArmies.length === 0 ? (
                <div className="p-10 text-center border border-dashed border-zinc-800 rounded-xl space-y-2 text-zinc-500 text-xs">
                  <FolderOpen className="w-8 h-8 mx-auto text-zinc-700" />
                  <span>No saved armies match your search criteria.</span>
                </div>
              ) : (
                filteredSavedArmies.map(army => {
                  const faction = allFactions.find(f => f.id === army.factionId);
                  const isCurrent = army.id === currentArmyId;

                  return (
                    <div
                      key={army.id}
                      className={`p-3.5 bg-zinc-950 rounded-xl border transition space-y-2.5 ${
                        isCurrent ? 'border-amber-400/80 ring-1 ring-amber-400/50' : 'border-zinc-850 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{faction?.symbol || '⚔️'}</span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-white text-sm">{army.name}</h4>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600 font-mono text-[9px]">
                                  Active in Builder
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {faction?.name || army.factionId} • {army.units.length} Squads • {army.totalPoints} / {army.maxPoints} pts
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleLoadArmy(army)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition shadow cursor-pointer"
                          >
                            Load into Builder
                          </button>
                          <button
                            onClick={() => handleDuplicateArmy(army)}
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-750 transition cursor-pointer"
                            title="Duplicate Army"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteArmy(army.id)}
                            className="p-1.5 bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 rounded-lg border border-zinc-750 transition cursor-pointer"
                            title="Delete Army"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tags & Unit Avatars Preview */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-900 text-[10px] font-mono">
                        <div className="flex flex-wrap items-center gap-1">
                          {army.tags && army.tags.length > 0 ? (
                            army.tags.map(t => (
                              <span key={t} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-300">
                                #{t}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-600 italic">No tags</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
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
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-xs text-zinc-500 font-mono">
              <span>{filteredSavedArmies.length} armies found</span>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="px-4 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Unit Creator & Token Image Upload Modal */}
      <UnitCreatorModal
        isOpen={showUnitCreatorModal}
        onClose={() => setShowUnitCreatorModal(false)}
        onSaveUnit={handleSaveUnitFromModal}
        initialUnit={editingUnit}
        factionId={selectedFactionId}
      />
    </div>
  );
};
