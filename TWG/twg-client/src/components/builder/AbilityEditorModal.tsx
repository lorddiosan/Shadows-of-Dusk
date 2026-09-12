import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Zap, Shield, Target, Users, Clock, 
  Coins, Flame, Check, HelpCircle, Bookmark
} from 'lucide-react';
import { 
  UnitAbility, AbilityAffects, AbilityType, AbilityTiming, 
  AbilityCost, AbilityDuration, CardTheme, CardRarity 
} from '../../types/game';

interface AbilityEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAbility: (ability: UnitAbility) => void;
  initialAbility?: UnitAbility | null;
  title?: string;
  contextType?: 'unit' | 'faction';
}

const PRESETS: Array<{
  label: string;
  category: string;
  data: Partial<UnitAbility>;
}> = [
  {
    label: 'Bastion Protocol',
    category: 'Defense',
    data: {
      name: 'Bastion Protocol',
      icon: '🛡️',
      type: 'passive',
      affects: 'self',
      cost: 'free',
      effectType: 'defense',
      duration: 'permanent',
      vfxType: 'holy',
      triggerCondition: 'While remaining stationary or in cover',
      summary: 'Increases unit armor resilience against incoming ranged strikes.',
      effect: 'When in cover or receiving fire after holding position, add +1 to Defence saving throws.'
    }
  },
  {
    label: 'Overwatch Fire',
    category: 'Reaction',
    data: {
      name: 'Overwatch Fire',
      icon: '🎯',
      type: 'active',
      affects: 'target',
      activationTiming: 'movement',
      cost: 'free',
      effectType: 'damage',
      duration: 'instant',
      vfxType: 'ballistic',
      triggerCondition: 'When an enemy unit ends movement within range and LOS',
      summary: 'Conduct reactive shooting out of turn at moving targets (0 CP).',
      effect: 'Immediately fire upon the moving enemy unit using snap-shot accuracy (-1 to AM).'
    }
  },
  {
    label: 'Adrenaline Surge',
    category: 'Combat',
    data: {
      name: 'Adrenaline Surge',
      icon: '⚡',
      type: 'active',
      affects: 'self',
      activationTiming: 'fight',
      cost: 'once_per_round',
      effectType: 'stat_modifier',
      duration: 'end_of_phase',
      vfxType: 'blood',
      triggerCondition: 'At the start of the Fight Phase',
      summary: 'Grants frantic attack speed and extra striking momentum (Once per Round).',
      effect: 'Unit gains +1 AM and re-rolls wound rolls of 1 for the duration of this Fight Phase.'
    }
  },
  {
    label: 'Aura of Dread',
    category: 'Debuff',
    data: {
      name: 'Aura of Dread',
      icon: '👁️',
      type: 'passive',
      affects: 'area',
      cost: 'free',
      effectType: 'stat_modifier',
      duration: 'permanent',
      vfxType: 'arcane',
      triggerCondition: 'Enemy units within 6 inches',
      summary: 'Terrifies nearby foes, disrupting their nerve and combat cohesion.',
      effect: 'Enemy units within 6in suffer -1 to Defence modifiers and must take a Morale check on casualties.'
    }
  },
  {
    label: 'Tactical Redeploy',
    category: 'Mobility',
    data: {
      name: 'Tactical Redeploy',
      icon: '💨',
      type: 'active',
      affects: 'self',
      activationTiming: 'movement',
      cost: 'once_per_activation',
      effectType: 'movement',
      duration: 'instant',
      vfxType: 'arcane',
      triggerCondition: 'During your active Movement phase',
      summary: 'Rapid repositioning to seize high ground or slip away.',
      effect: 'Unit may make an immediate normal move up to its full Movement characteristic, even after advancing.'
    }
  },
  {
    label: 'Rallying War Horn',
    category: 'Support',
    data: {
      name: 'Rallying War Horn',
      icon: '🚩',
      type: 'active',
      affects: 'all_friendly',
      activationTiming: 'command',
      cost: 'gain_1_cp',
      gainsCP: true,
      vfxType: 'holy',
      effectType: 'stat_modifier',
      duration: 'end_of_round',
      triggerCondition: 'Command Phase activation',
      summary: 'Grants player +1 Free CP and inspires allies.',
      effect: 'Active player generates +1 Free CP ⭐. All friendly units within 12in may re-roll charge rolls until round ends.'
    }
  },
  {
    label: 'Faction Doctrine: Convergence Surge',
    category: 'Faction',
    data: {
      name: 'Convergence Surge',
      icon: '🔮',
      type: 'active',
      affects: 'all_friendly',
      activationTiming: 'any_time',
      cost: 'once_per_game',
      vfxType: 'arcane',
      effectType: 'stat_modifier',
      duration: 'end_of_round',
      triggerCondition: 'Army-wide doctrine activation (Once per Game)',
      summary: 'Armies channel the ancient power of the convergence rift without consuming CP.',
      effect: 'All friendly units gain +1 to hit rolls and critical hit threshold reduced to 5+ until the round concludes.'
    }
  }
];

const EMOJI_OPTIONS = ['⚡', '🛡️', '🎯', '💥', '🩸', '👁️', '⚔️', '🚩', '🔮', '💨', '🔥', '✨', '💀', '🦾'];

export const AbilityEditorModal: React.FC<AbilityEditorModalProps> = ({
  isOpen,
  onClose,
  onSaveAbility,
  initialAbility,
  title,
  contextType = 'unit'
}) => {
  const [name, setName] = useState<string>('');
  const [icon, setIcon] = useState<string>('⚡');
  const [type, setType] = useState<AbilityType>('active');
  const [affects, setAffects] = useState<AbilityAffects>('self');
  const [activationTiming, setActivationTiming] = useState<AbilityTiming>('command');
  const [cost, setCost] = useState<AbilityCost>('free');
  const [vfxType, setVfxType] = useState<'command' | 'holy' | 'blood' | 'arcane' | 'laser' | 'plasma' | 'slash' | 'crush'>('command');
  const [effectType, setEffectType] = useState<'stat_modifier' | 'damage' | 'movement' | 'reroll' | 'defense' | 'heal' | 'custom'>('stat_modifier');
  const [duration, setDuration] = useState<AbilityDuration>('end_of_phase');
  const [triggerCondition, setTriggerCondition] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [effect, setEffect] = useState<string>('');
  const [cardTheme, setCardTheme] = useState<CardTheme>('gold');
  const [cardRarity, setCardRarity] = useState<CardRarity>('Rare');
  const [cardArtworkUrl, setCardArtworkUrl] = useState<string>('');
  const [actionButtonText, setActionButtonText] = useState<string>('PLAY CARD');
  const [quote, setQuote] = useState<string>('');

  useEffect(() => {
    if (initialAbility) {
      setName(initialAbility.name || '');
      setIcon(initialAbility.icon || '⚡');
      setType(initialAbility.type || 'active');
      setAffects(initialAbility.affects || 'self');
      setActivationTiming(initialAbility.activationTiming || 'command');
      setCost(initialAbility.cost || 'free');
      setVfxType((initialAbility.vfxType as any) || 'command');
      setEffectType(initialAbility.effectType || 'stat_modifier');
      setDuration(initialAbility.duration || 'end_of_phase');
      setTriggerCondition(initialAbility.triggerCondition || '');
      setSummary(initialAbility.summary || '');
      setEffect(initialAbility.effect || '');
      setCardTheme(initialAbility.cardTheme || (initialAbility.affects === 'all_friendly' ? 'amethyst' : 'gold'));
      setCardRarity(initialAbility.cardRarity || 'Rare');
      setCardArtworkUrl(initialAbility.cardArtworkUrl || '');
      setActionButtonText(initialAbility.actionButtonText || 'PLAY CARD');
      setQuote(initialAbility.quote || '');
    } else {
      setName('');
      setIcon(contextType === 'faction' ? '🔮' : '⚡');
      setType('active');
      setAffects(contextType === 'faction' ? 'all_friendly' : 'self');
      setActivationTiming('command');
      setCost(contextType === 'faction' ? 'once_per_game' : 'once_per_round');
      setVfxType('command');
      setEffectType('stat_modifier');
      setDuration('end_of_phase');
      setTriggerCondition('');
      setSummary('');
      setEffect('');
      setCardTheme(contextType === 'faction' ? 'amethyst' : 'gold');
      setCardRarity(contextType === 'faction' ? 'Legendary' : 'Rare');
      setCardArtworkUrl('');
      setActionButtonText('PLAY CARD');
      setQuote('');
    }
  }, [initialAbility, isOpen, contextType]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    if (preset.data.name) setName(preset.data.name);
    if (preset.data.icon) setIcon(preset.data.icon);
    if (preset.data.type) setType(preset.data.type);
    if (preset.data.affects) setAffects(preset.data.affects);
    if (preset.data.activationTiming) setActivationTiming(preset.data.activationTiming);
    if (preset.data.cost) setCost(preset.data.cost);
    if (preset.data.vfxType) setVfxType(preset.data.vfxType as any);
    if (preset.data.effectType) setEffectType(preset.data.effectType);
    if (preset.data.duration) setDuration(preset.data.duration);
    if (preset.data.triggerCondition !== undefined) setTriggerCondition(preset.data.triggerCondition);
    if (preset.data.summary !== undefined) setSummary(preset.data.summary);
    if (preset.data.effect) setEffect(preset.data.effect);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const isCPGain = cost === 'gain_1_cp';
    const ability: UnitAbility = {
      id: initialAbility?.id || `ability_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      icon: icon || '⚡',
      type,
      affects,
      activationTiming: type === 'active' ? activationTiming : undefined,
      cost: type === 'active' ? cost : 'free',
      gainsCP: isCPGain,
      vfxType,
      effectType,
      duration,
      triggerCondition: triggerCondition.trim() || undefined,
      summary: summary.trim() || undefined,
      effect: effect.trim() || 'No explicit effect text provided.',
      cardTheme,
      cardRarity,
      cardArtworkUrl: cardArtworkUrl.trim() || undefined,
      actionButtonText: actionButtonText.trim() || 'PLAY CARD',
      quote: quote.trim() || undefined
    };

    onSaveAbility(ability);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#10131d] border border-amber-500/40 rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-[#161a26]">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-lg">
              {icon}
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{title || (initialAbility ? 'Edit Ability' : (contextType === 'faction' ? 'Configure Faction Ability' : 'Add Unit Ability'))}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-700/60 text-amber-300 font-mono">
                  {contextType === 'faction' ? 'Faction Army-Wide' : 'Tactical Skill'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Configure timing, target scope, CP cost, and rules effect text
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Quick Presets Bar */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center space-x-1.5">
                <Bookmark className="w-3.5 h-3.5" />
                <span>Load Template / Preset</span>
              </span>
              <span className="text-[10px] text-zinc-500">Quick-fill common tactical mechanics</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 hover:border-amber-500/60 text-[11px] font-mono text-zinc-300 hover:text-white transition cursor-pointer flex items-center space-x-1.5"
                >
                  <span>{p.data.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Core Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8">
              <label className="text-[11px] font-mono text-zinc-400 block mb-1">Ability Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Iron Bastion, Overwatch, Phase Shift"
                className="w-full bg-zinc-950 border border-zinc-750 px-3 py-2 rounded-lg text-xs text-white font-bold focus:border-amber-400 focus:outline-none"
              />
            </div>
            
            <div className="sm:col-span-4">
              <label className="text-[11px] font-mono text-zinc-400 block mb-1">Icon / Emoji</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={icon}
                  onChange={e => setIcon(e.target.value)}
                  maxLength={4}
                  className="w-14 bg-zinc-950 border border-zinc-750 px-2 py-2 rounded-lg text-sm text-center text-white focus:border-amber-400 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1 max-w-[150px]">
                  {EMOJI_OPTIONS.slice(0, 8).map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setIcon(em)}
                      className={`text-xs p-1 rounded hover:bg-zinc-800 transition cursor-pointer ${icon === em ? 'bg-amber-500/20 border border-amber-500/50' : ''}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Type & Affects Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#131622] p-4 rounded-xl border border-zinc-800">
            {/* Ability Type */}
            <div>
              <label className="text-[11px] font-mono font-bold text-zinc-300 block mb-1.5 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Ability Type</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('active')}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                    type === 'active' 
                      ? 'bg-amber-950/60 border-amber-500 text-amber-200 shadow-sm' 
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs font-bold font-mono">⚡ Active</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">Triggered by player action or cost</div>
                </button>

                <button
                  type="button"
                  onClick={() => setType('passive')}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                    type === 'passive' 
                      ? 'bg-amber-950/60 border-amber-500 text-amber-200 shadow-sm' 
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs font-bold font-mono">🛡️ Passive</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">Always active or automatic reaction</div>
                </button>
              </div>
            </div>

            {/* Affects / Target Scope */}
            <div>
              <label className="text-[11px] font-mono font-bold text-zinc-300 block mb-1.5 flex items-center space-x-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>Affects (Target Scope)</span>
              </label>
              <select
                value={affects}
                onChange={e => setAffects(e.target.value as AbilityAffects)}
                className="w-full bg-zinc-950 border border-zinc-750 px-3 py-2 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
              >
                <option value="self">Self (This Unit Only)</option>
                <option value="attached">Attached / Embarked Unit</option>
                <option value="target">Target Selected Unit</option>
                <option value="area">Area / Aura (Radius Effect)</option>
                <option value="all_friendly">All Friendly Units (Army-Wide)</option>
                <option value="all_enemy">All Enemy Units</option>
              </select>
              <span className="text-[10px] text-zinc-500 block mt-1">
                {affects === 'self' && 'Applies only to this specific unit.'}
                {affects === 'all_friendly' && 'Affects every friendly unit on the battlefield.'}
                {affects === 'area' && 'Radiates in an aura around this unit.'}
                {affects === 'target' && 'Player designates a target within range upon use.'}
                {affects === 'attached' && 'Affects leaders attached to squads or embarked squads.'}
                {affects === 'all_enemy' && 'Affects all opposing models.'}
              </span>
            </div>
          </div>

          {/* Timing, Cost, Duration, Effect Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Activation Timing */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 block mb-1 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Timing</span>
              </label>
              <select
                value={activationTiming}
                onChange={e => setActivationTiming(e.target.value as AbilityTiming)}
                disabled={type === 'passive'}
                className="w-full bg-zinc-950 border border-zinc-750 px-2 py-1.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono disabled:opacity-50"
              >
                <option value="any_time">Any Time</option>
                <option value="deployment">Deployment Phase</option>
                <option value="command">Command Phase</option>
                <option value="movement">Movement Phase</option>
                <option value="shooting">Shooting Phase</option>
                <option value="charge">Charge Phase</option>
                <option value="fight">Fight Phase</option>
                <option value="round_end">Round End</option>
              </select>
            </div>

            {/* Activation Cost */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 block mb-1 flex items-center space-x-1">
                <Coins className="w-3 h-3 text-amber-400" />
                <span>Cost / CP</span>
              </label>
              <select
                value={cost}
                onChange={e => setCost(e.target.value as AbilityCost)}
                disabled={type === 'passive'}
                className="w-full bg-zinc-950 border border-zinc-750 px-2 py-1.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono disabled:opacity-50"
              >
                <option value="once_per_round">Once Per Round (Default for Units)</option>
                <option value="once_per_game">Once Per Game (Default for Factions)</option>
                <option value="once_per_activation">Once Per Activation</option>
                <option value="gain_1_cp">Generates +1 Free CP ⭐ (Once Per Round)</option>
                <option value="free">Free (0 CP / Once Per Round)</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 block mb-1 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Duration</span>
              </label>
              <select
                value={duration}
                onChange={e => setDuration(e.target.value as AbilityDuration)}
                className="w-full bg-zinc-950 border border-zinc-750 px-2 py-1.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
              >
                <option value="instant">Instantaneous</option>
                <option value="end_of_phase">End of Phase</option>
                <option value="end_of_round">End of Round</option>
                <option value="permanent">Permanent / Passive</option>
              </select>
            </div>

            {/* Effect Type */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 block mb-1 flex items-center space-x-1">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>Mechanic Type</span>
              </label>
              <select
                value={effectType}
                onChange={e => setEffectType(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-750 px-2 py-1.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
              >
                <option value="stat_modifier">Stat Modifier</option>
                <option value="damage">Damage / Offensive</option>
                <option value="defense">Armor / Defensive</option>
                <option value="movement">Movement / Mobility</option>
                <option value="heal">Heal / Regeneration</option>
                <option value="reroll">Dice Reroll / Mod</option>
                <option value="custom">Custom / Special</option>
              </select>
            </div>

            {/* Visual & Audio VFX Style */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 block mb-1 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>VFX &amp; SFX Style</span>
              </label>
              <select
                value={vfxType}
                onChange={e => setVfxType(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-750 px-2 py-1.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
              >
                <option value="command">Command Aura &amp; Fanfare</option>
                <option value="holy">Holy Radiance &amp; Chime</option>
                <option value="blood">Blood Mist &amp; Siphon</option>
                <option value="arcane">Arcane Pulse &amp; Hum</option>
                <option value="laser">Laser Beam &amp; Whistle</option>
                <option value="plasma">Plasma Burst &amp; Blast</option>
                <option value="slash">Melee Blade Slash</option>
                <option value="crush">Heavy Blunt Crush</option>
              </select>
            </div>
          </div>

          {/* Trigger Condition */}
          <div>
            <label className="text-[11px] font-mono text-zinc-400 block mb-1">
              Trigger Condition / Range (Optional)
            </label>
            <input
              type="text"
              value={triggerCondition}
              onChange={e => setTriggerCondition(e.target.value)}
              placeholder="e.g. On taking damage, When charging, Enemy within 6in"
              className="w-full bg-zinc-950 border border-zinc-750 px-3 py-1.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
            />
          </div>

          {/* Effect Description / Rules Text */}
          <div>
            <label className="text-[11px] font-mono text-zinc-400 block mb-1">
              Ability Rules Text / Effect Description *
            </label>
            <textarea
              required
              rows={3}
              value={effect}
              onChange={e => setEffect(e.target.value)}
              placeholder="Describe the exact gameplay effect, dice rolls, or stat bonuses provided..."
              className="w-full bg-zinc-950 border border-zinc-750 p-2.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-sans"
            />
          </div>

          {/* Short Flavor / Summary */}
          <div>
            <label className="text-[11px] font-mono text-zinc-400 block mb-1">
              Short Summary / Flavor (Optional)
            </label>
            <input
              type="text"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Brief 1-sentence synopsis for the quick-action card"
              className="w-full bg-zinc-950 border border-zinc-750 px-3 py-1.5 rounded-lg text-xs text-zinc-300 focus:border-amber-400 focus:outline-none font-mono"
            />
          </div>

          {/* Card Aesthetics & Customization (DESIGN-007 / TCG Playing Card Customizer) */}
          <div className="p-4 bg-zinc-950/80 rounded-2xl border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Card Aesthetics &amp; Collectible Styling</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Custom Border, Artwork &amp; Rarity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Card Frame Theme */}
              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">Card Border &amp; Theme</label>
                <select
                  value={cardTheme}
                  onChange={e => setCardTheme(e.target.value as CardTheme)}
                  className="w-full bg-zinc-900 border border-zinc-700 px-2 py-1.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                >
                  <option value="gold">Burnished Gold (Auric)</option>
                  <option value="crimson">Blood Crimson (Alchemic)</option>
                  <option value="amethyst">Void Amethyst (Arcane)</option>
                  <option value="sapphire">Celestial Sapphire (Divine)</option>
                  <option value="emerald">Toxic Emerald (Viridian)</option>
                  <option value="void">Abyssal Shadow (Void)</option>
                  <option value="steel">Runic Steel (Mithril)</option>
                </select>
              </div>

              {/* Card Rarity */}
              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">Card Rarity Tier</label>
                <select
                  value={cardRarity}
                  onChange={e => setCardRarity(e.target.value as CardRarity)}
                  className="w-full bg-zinc-900 border border-zinc-700 px-2 py-1.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                >
                  <option value="Common">Common (Slate)</option>
                  <option value="Uncommon">Uncommon (Green)</option>
                  <option value="Rare">Rare (Blue)</option>
                  <option value="Epic">Epic (Purple)</option>
                  <option value="Legendary">Legendary (Gold)</option>
                </select>
              </div>

              {/* Action Button Label */}
              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">Action Button Text</label>
                <input
                  type="text"
                  value={actionButtonText}
                  onChange={e => setActionButtonText(e.target.value)}
                  placeholder="e.g. PLAY CARD, UNLEASH, SMITE"
                  className="w-full bg-zinc-900 border border-zinc-700 px-2 py-1.5 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>

              {/* Custom Artwork URL */}
              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">Custom Artwork URL (Opt)</label>
                <input
                  type="text"
                  value={cardArtworkUrl}
                  onChange={e => setCardArtworkUrl(e.target.value)}
                  placeholder="https://... image link"
                  className="w-full bg-zinc-900 border border-zinc-700 px-2 py-1.5 rounded-lg text-xs text-zinc-300 focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Lore Quote / Flavor Text */}
            <div>
              <label className="text-[10px] font-mono text-zinc-400 block mb-1">Card Lore Quote / Flavor Text (Optional)</label>
              <input
                type="text"
                value={quote}
                onChange={e => setQuote(e.target.value)}
                placeholder="e.g. 'From blood we rise, through iron we conquer.'"
                className="w-full bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs text-zinc-300 italic focus:border-amber-400 focus:outline-none font-serif"
              />
            </div>
          </div>

          {/* Live Playing Card Preview */}
          <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col items-center space-y-2">
            <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
              Live Playing Card Preview:
            </span>
            
            <div
              className={`w-[185px] h-[330px] rounded-2xl flex flex-col justify-between relative overflow-hidden select-none shadow-2xl border-2 transition-all ${
                cardTheme === 'crimson'
                  ? 'bg-gradient-to-b from-[#310b14] via-[#1a060a] to-[#0d0407] border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                  : cardTheme === 'amethyst'
                  ? 'bg-gradient-to-b from-[#251038] via-[#150d22] to-[#0b0813] border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                  : cardTheme === 'sapphire'
                  ? 'bg-gradient-to-b from-[#091f2c] via-[#0b1622] to-[#070d14] border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]'
                  : cardTheme === 'emerald'
                  ? 'bg-gradient-to-b from-[#082215] via-[#08170f] to-[#050e09] border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : cardTheme === 'void'
                  ? 'bg-gradient-to-b from-[#181920] via-[#111217] to-[#090a0d] border-zinc-600 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                  : cardTheme === 'steel'
                  ? 'bg-gradient-to-b from-[#1e232a] via-[#14171c] to-[#0c0e12] border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.2)]'
                  : 'bg-gradient-to-b from-[#2a1d09] via-[#171309] to-[#0c0a07] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
              }`}
            >
              {/* Card Top Filigree Header */}
              <div className="px-2.5 pt-2 pb-1 flex items-center justify-between gap-1 border-b border-white/5">
                <div className="flex items-center space-x-1 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    cardRarity === 'Legendary' ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]' :
                    cardRarity === 'Epic' ? 'bg-purple-400' :
                    cardRarity === 'Rare' ? 'bg-sky-400' :
                    cardRarity === 'Uncommon' ? 'bg-emerald-400' :
                    'bg-zinc-400'
                  }`} />
                  <h5 className="font-serif font-black text-[11px] text-amber-100 truncate tracking-wide">
                    {name || 'Unnamed Ability'}
                  </h5>
                </div>
                <div className="shrink-0">
                  {cost === 'gain_1_cp' ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 text-[8px] font-mono font-black animate-pulse shadow">
                      +1 CP ⭐
                    </span>
                  ) : type === 'passive' ? (
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
              <div className="mx-2 my-1 h-24 rounded-xl bg-gradient-to-br from-black/90 via-zinc-900/60 to-black/90 border border-zinc-700/60 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group">
                {cardArtworkUrl ? (
                  <img
                    src={cardArtworkUrl}
                    alt={name}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent opacity-60" />
                    <span className="text-4xl filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                      {icon || '⚡'}
                    </span>
                  </>
                )}
                <span className="absolute bottom-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono text-zinc-400 truncate max-w-[90%] border border-white/5">
                  {cardRarity} • {affects.replace('_', ' ')}
                </span>
              </div>

              {/* Card Type & Phase Ribbon */}
              <div className="mx-2 px-1.5 py-0.5 rounded bg-zinc-900/80 border border-zinc-750/70 flex items-center justify-between text-[8px] font-mono">
                <span className={type === 'passive' ? 'text-sky-300 font-bold' : 'text-amber-300 font-bold'}>
                  {type === 'passive' ? '🛡️ PASSIVE' : '⚡ TACTIC'}
                </span>
                <span className="text-zinc-400 uppercase font-semibold">
                  {type === 'active' ? activationTiming?.toUpperCase() : 'INHERENT'}
                </span>
              </div>

              {/* Card Rules Text Box */}
              <div className="mx-2 my-1 p-2 rounded-xl bg-black/70 border border-zinc-800/80 flex-1 flex flex-col justify-center text-center shadow-inner">
                <p className="text-[10px] text-zinc-200 font-sans leading-tight line-clamp-3">
                  {effect || 'Describe the rules effect text above...'}
                </p>
                {cost === 'gain_1_cp' && (
                  <span className="text-[9px] text-emerald-400 font-bold font-mono block mt-1">
                    ⭐ Grants +1 Free CP
                  </span>
                )}
                {quote && (
                  <p className="text-[8px] text-zinc-400 italic font-serif mt-1 truncate">
                    "{quote}"
                  </p>
                )}
              </div>

              {/* Card Footer / Action Seal */}
              <div className="w-full">
                {type === 'passive' ? (
                  <div className="w-full py-2 bg-sky-950/90 border-t border-sky-500/40 text-sky-300 font-bold text-[10px] font-mono uppercase tracking-wider text-center flex items-center justify-center space-x-1">
                    <span>🛡️</span>
                    <span>ALWAYS ACTIVE</span>
                  </div>
                ) : (
                  <div className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-black text-[11px] font-mono uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-lg border-t border-amber-300/50">
                    <Zap className="w-3.5 h-3.5 fill-black" />
                    <span>{actionButtonText || 'PLAY CARD'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{initialAbility ? 'Save Ability' : 'Add Ability'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
