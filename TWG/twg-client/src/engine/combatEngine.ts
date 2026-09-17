import { Unit, UnitType } from '../types/game';

export interface AttackGroupResult {
  unitName: string;
  isLeader: boolean;
  attacksCount: number;
  hitRolls: number[];
  hitsCount: number;
  damageDie: string;
  saveRolls: number[];
  savesCount: number;
  penetratingHits: number;
  damageRolls: number[];
  damageDealt: number;
}

export interface ResolveCombatOptions {
  attachedLeaders?: Unit[];
  defenderInCover?: boolean;
  skipSaves?: boolean;
}

// Section 5: Combat Resolution
export interface CombatResult {
  attackerName: string;
  defenderName: string;
  isMelee: boolean;
  totalAttacks: number;
  hitRolls: number[];       // All d20 hit rolls
  targetCurrentDef: number; // Target's Def threshold
  hitsCount: number;        // How many d20 > targetDef
  hitExplanations?: string[]; // Detailed evaluation for each d20 hit roll
  saveTarget: number;       // Defender's 1d6 armor save threshold (e.g. 4 for 4+)
  saveRolls: number[];      // 1d6 save rolls rolled by defender
  savesCount: number;       // How many hits were deflected by armor
  saveExplanations?: string[]; // Detailed evaluation for each 1d6 save roll
  penetratingHits: number;  // How many hits breached armor to roll damage
  damageDie: string;        // Primary damage die or summary
  damageRolls: number[];    // Individual damage rolls for each penetrating hit
  totalDamage: number;      // Sum of damage dealt
  livesLost: number;        // Lives lost by target
  defModifierChange: number;
  leaderSaved: boolean;
  logText: string;
  attackGroups?: AttackGroupResult[]; // Breakdown by squad / attached leader
  // Backward compatibility:
  attackReceived: number;
  roll1d3: number;
  damageCategory: 'double_def' | 'normal_damage' | 'glance' | 'absorbed';
  diceRolled: number[];
}

export function parseDieSides(dieStr?: string): number {
  if (!dieStr) return 3;
  const match = dieStr.toLowerCase().match(/d(\d+)/);
  return match ? parseInt(match[1], 10) : 3;
}

/**
 * Calculate the 1d6 Armor Save Target for a unit.
 * Supports the full Defense spectrum up to Def 20 without breaking:
 * - Def 1 - 4: 6+ Save (17% deflection)
 * - Def 5 - 8: 5+ Save (33% deflection)
 * - Def 9 - 12: 4+ Save (50% deflection)
 * - Def 13 - 16: 3+ Save (67% deflection)
 * - Def 17 - 20+: 2+ Save (83% deflection)
 * If explicit defender.stats.armorSave is set (2-6), uses that directly.
 * Terrain cover grants a +1 save improvement (minimum 2+).
 */
export function calculateArmorSaveTarget(
  defender: Unit,
  defenderInCover?: boolean
): number {
  let saveTarget: number;
  if (typeof defender.stats.armorSave === 'number' && defender.stats.armorSave >= 2 && defender.stats.armorSave <= 6) {
    saveTarget = defender.stats.armorSave;
  } else {
    const currentDef = Math.max(1, defender.stats.def + defender.stats.defModifier);
    if (currentDef <= 4) {
      saveTarget = 6;
    } else if (currentDef <= 8) {
      saveTarget = 5;
    } else if (currentDef <= 12) {
      saveTarget = 4;
    } else if (currentDef <= 16) {
      saveTarget = 3;
    } else {
      saveTarget = 2;
    }
  }

  if (defenderInCover) {
    saveTarget = Math.max(2, saveTarget - 1);
  }

  return Math.max(2, Math.min(6, saveTarget));
}

/**
 * Type Advantage Cycle (Section 4):
 * Vehicle beats Infantry -> Infantry beats Monster -> Monster beats Vehicle.
 * Character sits outside cycle (matchups only via passives).
 * Winning type matchup grants Advantage (+1 stack, max 2).
 */
export function checkTypeAdvantage(attackerType: UnitType, defenderType: UnitType): boolean {
  if (attackerType === 'Vehicle' && defenderType === 'Infantry') return true;
  if (attackerType === 'Infantry' && defenderType === 'Monster') return true;
  if (attackerType === 'Monster' && defenderType === 'Vehicle') return true;
  return false;
}

/**
 * Advantage & Disadvantage Stacking:
 * Roll with Advantage: roll 2d20 take highest.
 * Roll with Disadvantage: roll 2d20 take lowest.
 */
export function rollAttackD3(netAdvantage: number): { chosenRoll: number; rolls: number[] } {
  const numDice = Math.min(3, 1 + Math.abs(netAdvantage));
  const rolls: number[] = [];
  for (let i = 0; i < numDice; i++) {
    rolls.push(Math.floor(Math.random() * 3) + 1);
  }
  const chosenRoll = netAdvantage > 0 ? Math.max(...rolls) : netAdvantage < 0 ? Math.min(...rolls) : rolls[0];
  return { chosenRoll, rolls };
}

/**
 * Leader Survival Roll:
 * When a Leader would lose lives, roll 1d6.
 * If the result is higher than the damage received, Leader survives instead.
 */
export function rollLeaderSurvival(damageReceived: number): { survived: boolean; roll: number } {
  const roll = Math.floor(Math.random() * 6) + 1;
  return { survived: roll > damageReceived, roll };
}

/**
 * Comprehensive Combat Resolution Engine:
 * 1. Attached Leader Coordination: Pools attacks from bodyguard squad + attached leaders into a combined strike.
 * 2. Hit Roll (d20 vs Def): Each attack rolls 1d20. If d20 > defender.Def, attack scores a Hit!
 * 3. Armor / Defense Save Roll (1d6 vs saveTarget):
 *    Defender rolls 1d6 per Hit scored. Scaled across the full 1-20 Defense range.
 *    A natural 1 always fails. Rolls >= saveTarget deflect the hit for 0 damage!
 * 4. Damage Roll: Only penetrating hits roll their damage die (d3, d6, d8, etc.).
 * 5. Sum penetrating damage and apply to target lives.
 */
export function resolveCombat(
  attacker: Unit,
  defender: Unit,
  isMelee: boolean,
  extraAdvantageStacks: number = 0,
  options?: ResolveCombatOptions
): CombatResult {
  const currentDef = Math.max(1, defender.stats.def + defender.stats.defModifier);

  // Calculate defender's 1d6 armor save threshold cleanly across Def 1-20
  const saveTarget = calculateArmorSaveTarget(defender, options?.defenderInCover);

  // Advantage / Disadvantage for primary attacker
  let adv = attacker.advantageStacks + extraAdvantageStacks;
  let disadv = attacker.disadvantageStacks;
  if (isMelee && checkTypeAdvantage(attacker.type, defender.type)) {
    adv += 1;
  }
  const netAdvantage = Math.max(-2, Math.min(2, adv - disadv));

  // Determine attacking units list (primary attacker + attached leaders)
  interface AttackingUnitEntry {
    unit: Unit;
    isLeader: boolean;
    livingModelCount: number;
    attacksPerModel: number;
    damageDie: string;
  }

  const attackingEntries: AttackingUnitEntry[] = [];

  // Primary attacker
  const livingTokens = (attacker.tokens || []).filter(t => t.currentLives > 0);
  const squadLivingCount = livingTokens.length > 0 
    ? livingTokens.filter(t => !t.isLeaderToken).length || livingTokens.length
    : Math.max(1, attacker.stats.modelCount || 1);

  const primaryAttacksPerModel = isMelee 
    ? (attacker.stats.meleeAttacks ?? 1) 
    : (attacker.stats.rangedAttacks ?? (attacker.stats.range > 0 ? 1 : 0));

  const primaryDamageDie = isMelee
    ? (attacker.stats.meleeDamageDice ?? (attacker.type === 'Vehicle' || attacker.type === 'Monster' ? 'd6' : 'd3'))
    : (attacker.stats.rangedDamageDice ?? (attacker.type === 'Vehicle' ? 'd6' : 'd3'));

  if (isMelee || attacker.stats.range > 0) {
    attackingEntries.push({
      unit: attacker,
      isLeader: attacker.type === 'Character' || !!attacker.attachedTo,
      livingModelCount: squadLivingCount,
      attacksPerModel: primaryAttacksPerModel,
      damageDie: primaryDamageDie
    });
  }

  // Attached leaders (if provided)
  if (options?.attachedLeaders && options.attachedLeaders.length > 0) {
    for (const leader of options.attachedLeaders) {
      if (leader.id === attacker.id || leader.stats.lives <= 0) continue;
      const leaderAttacks = isMelee
        ? (leader.stats.meleeAttacks ?? 1)
        : (leader.stats.rangedAttacks ?? (leader.stats.range > 0 ? 1 : 0));
      
      if (!isMelee && leader.stats.range === 0) continue; // Melee-only leader cannot fire ranged

      const leaderDamageDie = isMelee
        ? (leader.stats.meleeDamageDice ?? (leader.type === 'Vehicle' || leader.type === 'Monster' ? 'd6' : 'd3'))
        : (leader.stats.rangedDamageDice ?? (leader.type === 'Vehicle' ? 'd6' : 'd3'));

      attackingEntries.push({
        unit: leader,
        isLeader: true,
        livingModelCount: 1,
        attacksPerModel: leaderAttacks,
        damageDie: leaderDamageDie
      });
    }
  }

  // Fallback if no entries (e.g. 0 range unit attempted ranged)
  if (attackingEntries.length === 0) {
    attackingEntries.push({
      unit: attacker,
      isLeader: attacker.type === 'Character',
      livingModelCount: 1,
      attacksPerModel: 0,
      damageDie: primaryDamageDie
    });
  }

  const allHitRolls: number[] = [];
  const allSaveRolls: number[] = [];
  const allDamageRolls: number[] = [];
  const allHitExplanations: string[] = [];
  const allSaveExplanations: string[] = [];
  let totalHitsCount = 0;
  let totalSavesCount = 0;
  let totalPenetratingHits = 0;
  let totalDamageDealt = 0;
  let totalAttacksCount = 0;

  const attackGroups: AttackGroupResult[] = [];

  for (const entry of attackingEntries) {
    const groupAttacks = Math.max(0, entry.livingModelCount * entry.attacksPerModel);
    totalAttacksCount += groupAttacks;

    const groupHitRolls: number[] = [];
    let groupHits = 0;

    for (let i = 0; i < groupAttacks; i++) {
      let roll = Math.floor(Math.random() * 20) + 1; // 1-20
      if (netAdvantage > 0) {
        const advRoll = Math.floor(Math.random() * 20) + 1;
        roll = Math.max(roll, advRoll);
      } else if (netAdvantage < 0) {
        const disadvRoll = Math.floor(Math.random() * 20) + 1;
        roll = Math.min(roll, disadvRoll);
      }
      groupHitRolls.push(roll);
      allHitRolls.push(roll);

      if (roll > currentDef) {
        groupHits++;
        totalHitsCount++;
        allHitExplanations.push(`Roll ${roll} > Def ${currentDef}: Hit! 🎯`);
      } else {
        allHitExplanations.push(`Roll ${roll} <= Def ${currentDef}: Miss ❌`);
      }
    }

    // Armor Saves against this group's hits
    const groupSaveRolls: number[] = [];
    let groupSaves = 0;
    let groupPenetrating = 0;

    if (options?.skipSaves) {
      groupPenetrating = groupHits;
    } else {
      for (let i = 0; i < groupHits; i++) {
        const sRoll = Math.floor(Math.random() * 6) + 1; // 1-6
        groupSaveRolls.push(sRoll);
        allSaveRolls.push(sRoll);

        // Natural 1 always fails; roll >= saveTarget succeeds
        if (sRoll > 1 && sRoll >= saveTarget) {
          groupSaves++;
          totalSavesCount++;
          allSaveExplanations.push(`Roll ${sRoll} >= ${saveTarget}+ Save: Deflected! 🛡️`);
        } else if (sRoll === 1) {
          groupPenetrating++;
          totalPenetratingHits++;
          allSaveExplanations.push(`Roll 1 (Nat 1): Armor Breached! 💥`);
        } else {
          groupPenetrating++;
          totalPenetratingHits++;
          allSaveExplanations.push(`Roll ${sRoll} < ${saveTarget}+ Save: Penetrated! 💥`);
        }
      }
    }

    if (options?.skipSaves) {
      totalPenetratingHits += groupPenetrating;
    }

    // Damage rolls for penetrating hits
    const dieSides = parseDieSides(entry.damageDie);
    const groupDamageRolls: number[] = [];
    for (let i = 0; i < groupPenetrating; i++) {
      const dmg = Math.floor(Math.random() * dieSides) + 1;
      groupDamageRolls.push(dmg);
      allDamageRolls.push(dmg);
    }
    const groupDamage = groupDamageRolls.reduce((a, b) => a + b, 0);
    totalDamageDealt += groupDamage;

    attackGroups.push({
      unitName: entry.unit.name,
      isLeader: entry.isLeader,
      attacksCount: groupAttacks,
      hitRolls: groupHitRolls,
      hitsCount: groupHits,
      damageDie: entry.damageDie,
      saveRolls: groupSaveRolls,
      savesCount: groupSaves,
      penetratingHits: groupPenetrating,
      damageRolls: groupDamageRolls,
      damageDealt: groupDamage
    });
  }

  // Check Leader Survival roll if mortal damage would be dealt to a solo Character
  let leaderSaved = false;
  let totalDamage = totalDamageDealt;
  const isSoloLeaderDefender = defender.type === 'Character' && (!defender.attachedUnits || defender.attachedUnits.length === 0);
  if (totalDamage > 0 && isSoloLeaderDefender) {
    const survival = rollLeaderSurvival(totalDamage);
    if (survival.survived) {
      totalDamage = 0;
      leaderSaved = true;
    }
  }

  const livesLost = totalDamage;
  const damageCategory: 'double_def' | 'normal_damage' | 'glance' | 'absorbed' = 
    totalHitsCount >= 2 ? 'double_def' : totalHitsCount === 1 ? 'normal_damage' : 'glance';

  // Construct readable battle log
  const weaponType = isMelee ? 'Melee' : 'Ranged';
  const attackerSummary = attackGroups.length > 1
    ? `${attacker.name} & ${attackGroups.slice(1).map(g => g.unitName).join(', ')}`
    : attacker.name;

  let logText = `⚔️ [${weaponType} Attack] ${attackerSummary} made ${totalAttacksCount} attack(s) vs Def ${currentDef}. `;
  logText += `Hit rolls (d20): [${allHitRolls.join(', ')}] → ${totalHitsCount}/${totalAttacksCount} Hit! `;

  if (totalHitsCount > 0) {
    if (!options?.skipSaves) {
      logText += `🛡️ Armor Saves (${saveTarget}+ on 1d6): [${allSaveRolls.join(', ')}] → ${totalSavesCount} Saved, ${totalPenetratingHits} Penetrated! `;
    }
    if (totalPenetratingHits > 0) {
      logText += `Damage: [${allDamageRolls.join(', ')}] = ${totalDamageDealt} Damage. `;
      if (leaderSaved) {
        logText += `👑 Leader Survival Roll Succeeded! ${defender.name} parried the mortal damage!`;
      } else {
        logText += `${defender.name} loses ${livesLost} Life (Remaining: ${Math.max(0, defender.stats.lives - livesLost)}).`;
      }
    } else {
      logText += `All hits were deflected by ${defender.name}'s armor! 0 Damage taken.`;
    }
  } else {
    logText += `All attacks failed to beat ${defender.name}'s Defense (${currentDef}).`;
  }

  return {
    attackerName: attackerSummary,
    defenderName: defender.name,
    isMelee,
    totalAttacks: Math.max(1, totalAttacksCount),
    hitRolls: allHitRolls,
    targetCurrentDef: currentDef,
    hitsCount: totalHitsCount,
    hitExplanations: allHitExplanations,
    saveTarget,
    saveRolls: allSaveRolls,
    savesCount: totalSavesCount,
    saveExplanations: allSaveExplanations,
    penetratingHits: totalPenetratingHits,
    damageDie: primaryDamageDie,
    damageRolls: allDamageRolls,
    totalDamage,
    livesLost,
    defModifierChange: 0,
    leaderSaved,
    logText,
    attackGroups,
    attackReceived: totalDamage,
    roll1d3: allHitRolls[0] || 0,
    damageCategory,
    diceRolled: allHitRolls
  };
}

/**
 * Section 5.4: Charge Roll
 * 1d6:
 * 5-6: full Mv charge
 * 3-4: half Mv charge (Math.floor(Mv / 2))
 * 1-2: charge fails (0 Mv)
 * Successful charge grants Advantage (+1 stack) in the Fight phase.
 */
export function rollCharge(mv: number): { distance: number; roll: number; success: boolean } {
  const roll = Math.floor(Math.random() * 6) + 1;
  if (roll >= 5) {
    return { distance: mv, roll, success: true };
  } else if (roll >= 3) {
    return { distance: Math.max(1, Math.floor(mv / 2)), roll, success: true };
  } else {
    return { distance: 0, roll, success: false };
  }
}

export type AbilityUsageLimit = 'once_per_game' | 'once_per_round' | 'once_per_activation';

/**
 * Determine the usage limit rule for an ability:
 * - Faction abilities are once per game unless explicitly specified otherwise ('once_per_round' or 'once_per_activation')
 * - Regular/unit abilities are once per round unless explicitly specified otherwise ('once_per_game' or 'once_per_activation')
 */
export function getAbilityUsageLimit(
  ability: { cost?: string },
  isFaction: boolean
): AbilityUsageLimit {
  if (isFaction) {
    if (ability.cost === 'once_per_round') return 'once_per_round';
    if (ability.cost === 'once_per_activation') return 'once_per_activation';
    return 'once_per_game';
  }
  if (ability.cost === 'once_per_game') return 'once_per_game';
  if (ability.cost === 'once_per_activation') return 'once_per_activation';
  return 'once_per_round';
}

/**
 * Evaluate whether an ability is activatable given current phase and usage records.
 */
export function checkAbilityActivation(params: {
  ability: {
    type?: string;
    activationTiming?: string;
    cost?: string;
  };
  isFaction: boolean;
  currentPhase: string;
  usedInRound: number;
  usedInGame: boolean;
}): { isActivatable: boolean; disabledReason?: string; rule: AbilityUsageLimit } {
  const { ability, isFaction, currentPhase, usedInRound, usedInGame } = params;
  const rule = getAbilityUsageLimit(ability, isFaction);

  if (ability.type === 'passive') {
    return { isActivatable: false, disabledReason: 'Passive doctrine always active', rule };
  }

  const timingMatches =
    !ability.activationTiming ||
    ability.activationTiming === 'any_time' ||
    ability.activationTiming.toLowerCase() === currentPhase.toLowerCase() ||
    (currentPhase.toLowerCase() === 'action' && ['shooting', 'charge', 'fight', 'action'].includes(ability.activationTiming.toLowerCase()));

  if (!timingMatches) {
    return {
      isActivatable: false,
      disabledReason: `Available in ${ability.activationTiming?.replace('_', ' ').toUpperCase()} phase`,
      rule
    };
  }

  if (rule === 'once_per_game' && usedInGame) {
    return {
      isActivatable: false,
      disabledReason: 'Already used this match (Once per Game)',
      rule
    };
  }

  if (rule === 'once_per_round' && usedInRound >= 1) {
    return {
      isActivatable: false,
      disabledReason: 'Already used this round (Once per Round)',
      rule
    };
  }

  if (rule === 'once_per_activation' && usedInRound >= 1) {
    return {
      isActivatable: false,
      disabledReason: 'Already activated this turn',
      rule
    };
  }

  return { isActivatable: true, rule };
}

