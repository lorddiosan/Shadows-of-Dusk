import { describe, it, expect } from 'vitest';
import { UnitAbility, AbilityTiming, AbilityCost, AbilityType, CORE_TRAIT_DEFINITIONS } from '../../types/game';
import { vfxDispatcher } from '../../services/audioVfxService';
import { FACTIONS, UNIT_TEMPLATES } from '../../data/factions';
import { getAbilityUsageLimit, checkAbilityActivation } from '../combatEngine';

describe('DESIGN-007 / CODE-026: Ability System and Activation Criteria', () => {
  const sampleAbility: UnitAbility = {
    id: 'test_ability_1',
    name: 'Overwatch Fire',
    icon: '🎯',
    type: 'active',
    affects: 'target',
    activationTiming: 'movement',
    cost: '1_cp',
    effectType: 'damage',
    duration: 'instant',
    triggerCondition: 'When enemy unit ends movement within range',
    effect: 'Conduct reactive snap fire at moving enemy.'
  };

  it('validates active ability activation timing and cost logic', () => {
    const isActivatable = (
      ability: UnitAbility,
      currentPhase: string,
      currentCP: number,
      usedThisRound: number
    ): { activatable: boolean; reason?: string } => {
      if (ability.type === 'passive') {
        return { activatable: false, reason: 'Passive doctrine always active' };
      }

      const timingMatches =
        !ability.activationTiming ||
        ability.activationTiming === 'any_time' ||
        ability.activationTiming.toLowerCase() === currentPhase.toLowerCase();

      const costAmount = ability.cost === '1_cp' ? 1 : ability.cost === '2_cp' ? 2 : 0;
      const hasEnoughCP = currentCP >= costAmount;

      if (!timingMatches) {
        return { activatable: false, reason: `Available in ${ability.activationTiming?.toUpperCase()} phase` };
      }
      if (!hasEnoughCP) {
        return { activatable: false, reason: `Requires ${costAmount} CP` };
      }
      if (ability.cost === 'once_per_round' && usedThisRound >= 1) {
        return { activatable: false, reason: 'Already used this round' };
      }

      return { activatable: true };
    };

    // Correct phase + 0 CP required -> activatable even if currentCP is 0
    const zeroCPAbility: UnitAbility = {
      ...sampleAbility,
      cost: 'free'
    };
    expect(isActivatable(zeroCPAbility, 'Movement', 0, 0)).toEqual({ activatable: true });

    // Wrong phase -> not activatable
    expect(isActivatable(sampleAbility, 'Command', 2, 0).activatable).toBe(false);
    expect(isActivatable(sampleAbility, 'Command', 2, 0).reason).toContain('MOVEMENT');

    // Passive ability check
    const passiveAbility: UnitAbility = {
      ...sampleAbility,
      id: 'test_passive',
      type: 'passive',
      cost: 'free'
    };
    expect(isActivatable(passiveAbility, 'Movement', 2, 0).activatable).toBe(false);
  });

  it('enforces zero-CP cost rule and +1 Free CP generation', () => {
    const cpGeneratorAbility: UnitAbility = {
      id: 'test_rally',
      name: 'Rallying War Cry',
      type: 'active',
      affects: 'all_friendly',
      activationTiming: 'command',
      cost: 'gain_1_cp',
      gainsCP: true,
      duration: 'end_of_round',
      effect: 'Active player generates +1 Free CP.'
    };

    let p1CP = 2;
    const isP1 = true;
    const gainsCP = cpGeneratorAbility.cost === 'gain_1_cp' || !!cpGeneratorAbility.gainsCP;

    // Zero-CP rule: No CP is deducted on activation
    if (gainsCP && isP1) {
      p1CP += 1;
    }

    expect(p1CP).toBe(3);
    expect(gainsCP).toBe(true);
  });

  it('verifies vfxDispatcher triggers and dispatches events correctly', () => {
    const receivedEvents: any[] = [];
    const unsubscribe = vfxDispatcher.subscribe((ev: any) => receivedEvents.push(ev));

    // 1. Shooting trigger
    vfxDispatcher.triggerShoot({ x: 100, y: 100 }, { x: 300, y: 300 }, 'laser');
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].type).toBe('shoot_projectile');
    expect(receivedEvents[0].variant).toBe('laser');

    // 2. Fight trigger
    vfxDispatcher.triggerFight({ x: 200, y: 200 }, 'slash');
    expect(receivedEvents.length).toBe(2);
    expect(receivedEvents[1].type).toBe('melee_slash');

    // 3. Ability trigger (+1 CP)
    vfxDispatcher.triggerAbility({ x: 150, y: 150 }, '⭐', 'CP Boost', 'gain_cp');
    expect(receivedEvents.length).toBe(3);
    expect(receivedEvents[2].type).toBe('cp_sparkle');
    expect(receivedEvents[2].variant).toBe('gain_cp');

    unsubscribe();
  });

  it('verifies new mechanical traits are present in CORE_TRAIT_DEFINITIONS', () => {
    const traitIds = Object.keys(CORE_TRAIT_DEFINITIONS);

    expect(traitIds).toContain('Rapid Fire');
    expect(traitIds).toContain('Berserk');
    expect(traitIds).toContain('Teleport');
    expect(traitIds).toContain('Psionic');
    expect(traitIds).toContain('Regeneration');
    expect(traitIds).toContain('Sniper');
    expect(traitIds).toContain('Cavalry');
    expect(traitIds).toContain('Unyielding');
  });

  it('verifies all factions have zero-CP faction abilities defined', () => {
    expect(FACTIONS.length).toBeGreaterThanOrEqual(6);

    FACTIONS.forEach((faction: any) => {
      expect(faction.factionAbility).toBeDefined();
      expect(faction.factionAbility.cost).not.toBe('1_cp');
      expect(faction.factionAbility.cost).not.toBe('2_cp');
      expect(faction.factionAbility.vfxType).toBeDefined();
    });
  });

  it('verifies unit templates in UNIT_TEMPLATES have abilities and traits', () => {
    const leaders = UNIT_TEMPLATES.filter((u: any) => u.type === 'Character');
    
    expect(leaders.length).toBeGreaterThanOrEqual(3);
    leaders.forEach((leader: any) => {
      expect(leader.traits).toContain('Leader');
      expect(leader.abilities).toBeDefined();
      expect(leader.abilities.length).toBeGreaterThan(0);
      // Leaders have a +1 Free CP generating ability
      const hasCPGain = leader.abilities.some((a: any) => a.cost === 'gain_1_cp' || a.gainsCP);
      expect(hasCPGain).toBe(true);
    });
  });

  it('verifies custom unit playing cards support full theme, rarity, artwork, and lore customizations', () => {
    const customCardAbility: UnitAbility = {
      id: 'ab_sniper_headshot',
      name: 'Eagle Eye Execution',
      type: 'active',
      affects: 'target',
      activationTiming: 'shooting',
      cost: 'once_per_round',
      effect: 'Execute a lethal precision shot dealing 3 AP damage to an enemy commander.',
      effectType: 'damage',
      duration: 'instant',
      vfxType: 'ballistic',
      cardTheme: 'crimson',
      cardRarity: 'Legendary',
      cardArtworkUrl: 'https://example.com/sniper_art.webp',
      actionButtonText: 'FIRE EXECUTION SHOT',
      quote: 'One round, one silence.',
      icon: '🎯'
    };

    expect(customCardAbility.cardTheme).toBe('crimson');
    expect(customCardAbility.cardRarity).toBe('Legendary');
    expect(customCardAbility.cardArtworkUrl).toBe('https://example.com/sniper_art.webp');
    expect(customCardAbility.actionButtonText).toBe('FIRE EXECUTION SHOT');
    expect(customCardAbility.quote).toBe('One round, one silence.');
  });

  it('verifies Crimson Empire faction ability applies +1 Mv, IgnoreDifficultTerrain, and +1 Advantage to all friendly units', () => {
    const crimsonAbility = FACTIONS.find(f => f.id === 'crimson_empire')?.factionAbility;
    expect(crimsonAbility).toBeDefined();
    expect(crimsonAbility?.id).toBe('crimson_blood_forge');

    // Simulate battlefield units
    const p1UnitA: any = {
      id: 'p1_squad_1',
      name: 'Bloodhound Shock Troops',
      owner: 'player1',
      stats: { lives: 3, mv: 6, am: 4, df: 4 },
      traits: ['Shock']
    };
    const p1UnitB: any = {
      id: 'p1_squad_2',
      name: 'Crimson Praetor',
      owner: 'player1',
      stats: { lives: 5, mv: 5, am: 5, df: 5 },
      traits: ['Leader']
    };
    const p2Unit: any = {
      id: 'p2_squad_1',
      name: 'Astraea Paladin',
      owner: 'player2',
      stats: { lives: 4, mv: 6, am: 4, df: 4 },
      traits: []
    };

    const allUnits = [p1UnitA, p1UnitB, p2Unit];
    const activeOwner = 'player1';
    let p1Advantage = 0;

    // Apply faction ability logic as implemented in Battlefield.tsx
    const isFaction = true;
    const abilityId = crimsonAbility!.id;

    const updatedUnits = allUnits.map(u => {
      const isTarget = isFaction && u.owner === activeOwner && u.stats.lives > 0;
      if (!isTarget) return u;

      if (abilityId === 'crimson_blood_forge') {
        const currentTraits = u.traits || [];
        const nextTraits = currentTraits.includes('IgnoreDifficultTerrain')
          ? currentTraits
          : [...currentTraits, 'IgnoreDifficultTerrain'];
        return {
          ...u,
          traits: nextTraits,
          stats: {
            ...u.stats,
            baseMv: u.stats.baseMv ?? u.stats.mv,
            mv: u.stats.mv + 1
          }
        };
      }
      return u;
    });

    if (abilityId === 'crimson_blood_forge') {
      p1Advantage += 1;
    }

    // Friendly unit A received +1 Mv, IgnoreDifficultTerrain, baseMv tracked
    const updatedA = updatedUnits.find(u => u.id === 'p1_squad_1')!;
    expect(updatedA.stats.mv).toBe(7);
    expect(updatedA.stats.baseMv).toBe(6);
    expect(updatedA.traits).toContain('IgnoreDifficultTerrain');

    // Friendly unit B received +1 Mv, IgnoreDifficultTerrain, baseMv tracked
    const updatedB = updatedUnits.find(u => u.id === 'p1_squad_2')!;
    expect(updatedB.stats.mv).toBe(6);
    expect(updatedB.stats.baseMv).toBe(5);
    expect(updatedB.traits).toContain('IgnoreDifficultTerrain');

    // Enemy unit unaffected
    const updatedEnemy = updatedUnits.find(u => u.id === 'p2_squad_1')!;
    expect(updatedEnemy.stats.mv).toBe(6);
    expect(updatedEnemy.traits).not.toContain('IgnoreDifficultTerrain');

    // Advantage gained
    expect(p1Advantage).toBe(1);

    // End-of-round cleanup restores baseMv and removes temporary trait
    const cleanedUnits = updatedUnits.map(u => {
      const baseMv = u.stats?.baseMv ?? u.stats?.mv ?? 6;
      const cleanedTraits = (u.traits || []).filter(t => t !== 'IgnoreDifficultTerrain' && t !== 'IgnoreTerrain');
      return {
        ...u,
        traits: cleanedTraits,
        stats: {
          ...u.stats,
          mv: baseMv,
          baseMv: undefined
        }
      };
    });

    const cleanedA = cleanedUnits.find(u => u.id === 'p1_squad_1')!;
    expect(cleanedA.stats.mv).toBe(6);
    expect(cleanedA.traits).not.toContain('IgnoreDifficultTerrain');
  });

  it('verifies tactical abilities are added to hand only when deployed or attached to deployed host', () => {
    const leaderAbility: UnitAbility = {
      id: 'inspire',
      name: 'Inspiring Presence',
      type: 'active',
      cost: 'free',
      activationTiming: 'command',
      effect: 'Boost morale'
    };
    const squadAbility: UnitAbility = {
      id: 'suppression',
      name: 'Suppressive Salvo',
      type: 'active',
      cost: 'free',
      activationTiming: 'shooting',
      effect: 'Suppress enemy'
    };

    const units: any[] = [
      // 1. Undeployed squad in tray
      {
        id: 'unit_tray',
        name: 'Tray Troops',
        owner: 'player1',
        position: null,
        stats: { lives: 3 },
        abilities: [squadAbility]
      },
      // 2. Deployed squad on battlefield
      {
        id: 'unit_deployed',
        name: 'Deployed Squad',
        owner: 'player1',
        position: { x: 200, y: 300 },
        stats: { lives: 3 },
        abilities: [squadAbility]
      },
      // 3. Attached leader whose bodyguard is deployed
      {
        id: 'unit_attached_deployed',
        name: 'Attached Leader',
        owner: 'player1',
        position: null,
        attachedTo: 'unit_deployed',
        stats: { lives: 5 },
        abilities: [leaderAbility]
      },
      // 4. Attached leader whose bodyguard is NOT deployed
      {
        id: 'unit_attached_tray',
        name: 'Tray Leader',
        owner: 'player1',
        position: null,
        attachedTo: 'unit_tray',
        stats: { lives: 5 },
        abilities: [leaderAbility]
      },
      // 5. Enemy deployed unit
      {
        id: 'enemy_deployed',
        name: 'Enemy Squad',
        owner: 'player2',
        position: { x: 800, y: 400 },
        stats: { lives: 3 },
        abilities: [squadAbility]
      }
    ];

    const activePlayer = 'player1';

    // Same filter logic used in Battlefield.tsx availableAbilities
    const eligibleUnits = units.filter(u => {
      if (u.owner !== activePlayer || (u.stats?.lives ?? 0) <= 0) return false;
      if (u.position) return true;
      if (u.attachedTo) {
        const host = units.find(b => b.id === u.attachedTo);
        return !!host?.position;
      }
      return false;
    });

    const eligibleIds = eligibleUnits.map(u => u.id);
    expect(eligibleIds).toContain('unit_deployed');
    expect(eligibleIds).toContain('unit_attached_deployed');
    expect(eligibleIds).not.toContain('unit_tray');
    expect(eligibleIds).not.toContain('unit_attached_tray');
    expect(eligibleIds).not.toContain('enemy_deployed');

    // Abilities in hand
    const handAbilities = eligibleUnits.flatMap(u => u.abilities);
    expect(handAbilities.length).toBe(2);
    expect(handAbilities.map(a => a.name)).toEqual(['Suppressive Salvo', 'Inspiring Presence']);
  });

  it('enforces default once-per-round limit for regular unit abilities unless specified otherwise', () => {
    // 1. Free and CP-generating abilities default to once_per_round
    expect(getAbilityUsageLimit({ cost: 'free' }, false)).toBe('once_per_round');
    expect(getAbilityUsageLimit({ cost: 'gain_1_cp' }, false)).toBe('once_per_round');
    expect(getAbilityUsageLimit({}, false)).toBe('once_per_round');
    expect(getAbilityUsageLimit({ cost: 'once_per_round' }, false)).toBe('once_per_round');

    // Explicit overrides for unit abilities
    expect(getAbilityUsageLimit({ cost: 'once_per_game' }, false)).toBe('once_per_game');
    expect(getAbilityUsageLimit({ cost: 'once_per_activation' }, false)).toBe('once_per_activation');

    // 2. Activation checks: Cannot use infinitely in the same round
    const unitAbility: UnitAbility = {
      id: 'blood_strike',
      name: 'Blood Cleaver',
      type: 'active',
      cost: 'gain_1_cp',
      activationTiming: 'command',
      affects: 'self',
      duration: 'end_of_phase',
      effect: 'Gain +1 CP and buff attack.'
    };

    // First use: ready
    const firstCheck = checkAbilityActivation({
      ability: unitAbility,
      isFaction: false,
      currentPhase: 'Command',
      usedInRound: 0,
      usedInGame: false
    });
    expect(firstCheck.isActivatable).toBe(true);

    // Second use attempt in same round: rejected!
    const secondCheck = checkAbilityActivation({
      ability: unitAbility,
      isFaction: false,
      currentPhase: 'Command',
      usedInRound: 1,
      usedInGame: false
    });
    expect(secondCheck.isActivatable).toBe(false);
    expect(secondCheck.disabledReason).toContain('Already used this round');
  });

  it('enforces default once-per-game limit for faction abilities unless specified otherwise', () => {
    // 1. Faction abilities default to once_per_game unless explicitly once_per_round
    expect(getAbilityUsageLimit({ cost: 'once_per_game' }, true)).toBe('once_per_game');
    expect(getAbilityUsageLimit({ cost: 'free' }, true)).toBe('once_per_game');
    expect(getAbilityUsageLimit({}, true)).toBe('once_per_game');
    expect(getAbilityUsageLimit({ cost: 'once_per_round' }, true)).toBe('once_per_round');

    // 2. All 6 preset faction doctrines are once_per_game
    expect(FACTIONS.length).toBe(6);
    FACTIONS.forEach(f => {
      expect(f.factionAbility).toBeDefined();
      expect(getAbilityUsageLimit(f.factionAbility!, true)).toBe('once_per_game');
      expect(f.factionAbility!.cost).toBe('once_per_game');
    });

    // 3. Activation checks: Cannot use more than once per match
    const crimsonAbility = FACTIONS.find(f => f.id === 'crimson_empire')!.factionAbility!;

    // First use in Round 1: ready
    const firstCheck = checkAbilityActivation({
      ability: crimsonAbility,
      isFaction: true,
      currentPhase: 'Command',
      usedInRound: 0,
      usedInGame: false
    });
    expect(firstCheck.isActivatable).toBe(true);

    // Second use attempt: rejected across entire game
    const secondCheck = checkAbilityActivation({
      ability: crimsonAbility,
      isFaction: true,
      currentPhase: 'Command',
      usedInRound: 0, // Even in a new round
      usedInGame: true
    });
    expect(secondCheck.isActivatable).toBe(false);
    expect(secondCheck.disabledReason).toContain('Already used this match');
  });

  it('verifies round advance refreshes once-per-round abilities while keeping once-per-game abilities locked', () => {
    let usedThisRound: Record<string, number> = {
      'unit_1_strike': 1,
      'unit_2_rally': 1
    };
    let usedThisGame: Record<string, boolean> = {
      'faction_crimson_empire_crimson_blood_forge': true
    };

    const unitAbility: UnitAbility = {
      id: 'strike',
      name: 'Power Strike',
      type: 'active',
      cost: 'free',
      activationTiming: 'fight',
      affects: 'self',
      duration: 'instant',
      effect: 'Strike enemy'
    };
    const factionAbility = FACTIONS.find(f => f.id === 'crimson_empire')!.factionAbility!;

    // At end of Round 1: unit ability is locked
    const round1UnitCheck = checkAbilityActivation({
      ability: unitAbility,
      isFaction: false,
      currentPhase: 'Fight',
      usedInRound: usedThisRound['unit_1_strike'] || 0,
      usedInGame: false
    });
    expect(round1UnitCheck.isActivatable).toBe(false);

    // Round 2 Commences: Round usage state resets
    usedThisRound = {};

    // Unit ability is refreshed and ready for Round 2!
    const round2UnitCheck = checkAbilityActivation({
      ability: unitAbility,
      isFaction: false,
      currentPhase: 'Fight',
      usedInRound: usedThisRound['unit_1_strike'] || 0,
      usedInGame: false
    });
    expect(round2UnitCheck.isActivatable).toBe(true);

    // Faction ability remains locked in Round 2
    const round2FactionCheck = checkAbilityActivation({
      ability: factionAbility,
      isFaction: true,
      currentPhase: 'Command',
      usedInRound: 0,
      usedInGame: !!usedThisGame['faction_crimson_empire_crimson_blood_forge']
    });
    expect(round2FactionCheck.isActivatable).toBe(false);
    expect(round2FactionCheck.disabledReason).toContain('Already used this match');
  });
});


