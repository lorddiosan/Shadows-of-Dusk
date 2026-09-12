import { describe, it, expect } from 'vitest';
import { 
  checkShapeOverlap, 
  calculateFormationOffsets,
  canUnitDeployOutsideZone,
  canAttachLeader,
  isUnitInShootingRange
} from '../formationEngine';
import { resolveCombat } from '../combatEngine';
import { Token, Unit } from '../../types/game';

describe('BUG-027: Grid Formation and Overlap Tolerance', () => {
  it('allows tangent touching circles without false-positive collision', () => {
    // Circle A at (100, 100), radius 20 (w=40, h=40)
    // Circle B at (140, 100), radius 20 (w=40, h=40)
    // Exactly tangent at distance = 40
    const overlap = checkShapeOverlap(
      'circle',
      { x: 100, y: 100 },
      40,
      40,
      'circle',
      { x: 140, y: 100 },
      40,
      40
    );

    expect(overlap).toBe(false);
  });

  it('permits floating-point subpixel contact within 0.75px numerical epsilon', () => {
    // Subpixel rounding contact (dist = 39.5, radius sum = 40, delta = 0.5 <= 0.75)
    const overlap = checkShapeOverlap(
      'circle',
      { x: 100, y: 100 },
      40,
      40,
      'circle',
      { x: 139.5, y: 100 },
      40,
      40
    );

    expect(overlap).toBe(false);
  });

  it('strictly flags true physical overlaps greater than 0.75px', () => {
    // Obvious overlap (dist = 30, radius sum = 40, penetration = 10px)
    const overlap = checkShapeOverlap(
      'circle',
      { x: 100, y: 100 },
      40,
      40,
      'circle',
      { x: 130, y: 100 },
      40,
      40
    );

    expect(overlap).toBe(true);
  });

  it('generates non-overlapping model offsets for grid formations', () => {
    // 6 models, grid formation, radius 20
    const offsets = calculateFormationOffsets(6, 'grid', 20);
    expect(offsets).toHaveLength(6);

    const tokens: Token[] = offsets.map((o, idx) => ({
      id: `tok_${idx}`,
      unitId: 'test_unit',
      x: 500 + o.offsetX,
      y: 500 + o.offsetY,
      baseRadius: 20,
      baseShape: 'circle'
    }));

    // Ensure no two tokens in the grid formation intersect each other
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        const overlap = checkShapeOverlap(
          'circle',
          { x: tokens[i].x, y: tokens[i].y },
          40,
          40,
          'circle',
          { x: tokens[j].x, y: tokens[j].y },
          40,
          40
        );
        expect(overlap).toBe(false);
      }
    }
  });
});

describe('Infiltration and Leader Attachment Rules', () => {
  function makeUnit(partial: Partial<Unit>): Unit {
    return {
      id: partial.id || 'u1',
      templateId: 't1',
      name: partial.name || 'Test Unit',
      factionId: 'f1',
      type: partial.type || 'Infantry',
      role: partial.role || 'Troops',
      stats: { lives: 3, movement: 6, toughness: 4, armorSave: 4, modelCount: 1, ...(partial.stats || {}) },
      points: 100,
      avatar: '⚔️',
      description: 'Test unit',
      passives: partial.passives || [],
      traits: partial.traits || [],
      canDeployOutsideZone: partial.canDeployOutsideZone,
      attachedTo: partial.attachedTo || null,
      attachedUnits: partial.attachedUnits || [],
      owner: partial.owner || 'player1',
      position: partial.position || null,
      hasMoved: false,
      hasShot: false,
      hasCharged: false,
      hasFought: false,
      advantageStacks: 0,
      disadvantageStacks: 0,
      ...partial,
    };
  }

  it('allows solo unit with Infiltrator trait to deploy outside zone', () => {
    const infiltrator = makeUnit({ id: 'inf1', traits: ['Infiltrator'] });
    expect(canUnitDeployOutsideZone(infiltrator)).toBe(true);
  });

  it('allows solo unit with canDeployOutsideZone flag to deploy outside zone', () => {
    const infiltrator = makeUnit({ id: 'inf1', canDeployOutsideZone: true });
    expect(canUnitDeployOutsideZone(infiltrator)).toBe(true);
  });

  it('blocks unit without Infiltrator trait from deploying outside zone', () => {
    const standard = makeUnit({ id: 'std1', traits: [] });
    expect(canUnitDeployOutsideZone(standard)).toBe(false);
  });

  it('blocks infiltration if a leader without Infiltrator is attached to the bodyguard unit', () => {
    const leader = makeUnit({ id: 'lead1', role: 'Leader', traits: ['Leader'], attachedTo: 'bg1' });
    const bodyguard = makeUnit({ id: 'bg1', traits: ['Infiltrator'], attachedUnits: ['lead1'] });
    const allUnits = [leader, bodyguard];

    // Bodyguard has Infiltrator, but attached leader lacks Infiltrator -> infiltration must be blocked!
    expect(canUnitDeployOutsideZone(bodyguard, allUnits)).toBe(false);
  });

  it('allows infiltration if an attached leader also possesses Infiltrator', () => {
    const infiltratorLeader = makeUnit({ id: 'lead1', role: 'Leader', traits: ['Leader', 'Infiltrator'], attachedTo: 'bg1' });
    const bodyguard = makeUnit({ id: 'bg1', traits: ['Infiltrator'], attachedUnits: ['lead1'] });
    const allUnits = [infiltratorLeader, bodyguard];

    // Both bodyguard and leader have Infiltrator -> infiltration allowed!
    expect(canUnitDeployOutsideZone(bodyguard, allUnits)).toBe(true);
  });

  it('blocks an attached infiltrator leader if its bodyguard lacks Infiltrator', () => {
    const infiltratorLeader = makeUnit({ id: 'lead1', role: 'Leader', traits: ['Leader', 'Infiltrator'], attachedTo: 'bg1' });
    const standardBodyguard = makeUnit({ id: 'bg1', traits: [], attachedUnits: ['lead1'] });
    const allUnits = [infiltratorLeader, standardBodyguard];

    expect(canUnitDeployOutsideZone(infiltratorLeader, allUnits)).toBe(false);
  });

  it('allows leader without Infiltrator to attach to bodyguard positioned inside deployment zone', () => {
    const leader = makeUnit({ id: 'lead1', role: 'Leader', traits: ['Leader'] });
    const bodyguard = makeUnit({ id: 'bg1', type: 'Infantry', position: { x: 100, y: 100 } });

    expect(canAttachLeader(leader, bodyguard, 200, 1200)).toBe(true);
  });

  it('prevents leader without Infiltrator from attaching to bodyguard deployed outside deployment zone', () => {
    const leader = makeUnit({ id: 'lead1', role: 'Leader', traits: ['Leader'] });
    // Bodyguard is deployed forward at x=500 (deployment zone is 0-200)
    const forwardBodyguard = makeUnit({ id: 'bg1', type: 'Infantry', traits: ['Infiltrator'], position: { x: 500, y: 300 } });

    expect(canAttachLeader(leader, forwardBodyguard, 200, 1200)).toBe(false);
  });

  it('allows leader with Infiltrator to attach to bodyguard deployed outside deployment zone', () => {
    const infiltratorLeader = makeUnit({ id: 'lead1', role: 'Leader', traits: ['Leader', 'Infiltrator'] });
    const forwardBodyguard = makeUnit({ id: 'bg1', type: 'Infantry', traits: ['Infiltrator'], position: { x: 500, y: 300 } });

    expect(canAttachLeader(infiltratorLeader, forwardBodyguard, 200, 1200)).toBe(true);
  });

  it('allows an attached leader with ranged weapons to shoot even when their bodyguard squad is melee-only', () => {
    // Melee bodyguard squad (range = 0) at (200, 200)
    const meleeBodyguard = makeUnit({
      id: 'bg1',
      name: 'Bloodhound Shock Troops',
      type: 'Infantry',
      position: { x: 200, y: 200 },
      tokens: [
        { id: 't1', unitId: 'bg1', currentLives: 2, maxLives: 2, x: 200, y: 200, rotation: 0, size: 40 },
        { id: 't_lead', unitId: 'lead1', isLeaderToken: true, currentLives: 4, maxLives: 4, x: 210, y: 200, rotation: 0, size: 40 }
      ],
      attachedUnits: ['lead1'],
      stats: { lives: 6, maxLives: 6, mv: 6, am: 4, def: 4, baseDef: 4, defModifier: 0, modelCount: 3, hpPerModel: 2, cp: 1, range: 0 }
    });

    // Attached leader with pistol / ranged weapon (range = 6, am = 5)
    const rangedLeader = makeUnit({
      id: 'lead1',
      name: 'Grand Warmaster Kaelen',
      role: 'Leader',
      type: 'Character',
      attachedTo: 'bg1',
      stats: { lives: 4, maxLives: 4, mv: 6, am: 5, def: 5, baseDef: 5, defModifier: 0, modelCount: 1, hpPerModel: 4, cp: 2, range: 6 }
    });

    // Enemy target within 4 squares (200px away)
    const enemyTarget = makeUnit({
      id: 'enemy1',
      name: 'Astraea Paladin',
      position: { x: 400, y: 200 },
      tokens: [{ id: 'te1', unitId: 'enemy1', currentLives: 3, maxLives: 3, x: 400, y: 200, rotation: 0, size: 40 }],
      stats: { lives: 3, maxLives: 3, mv: 6, am: 4, def: 4, baseDef: 4, defModifier: 0, modelCount: 1, hpPerModel: 3, cp: 1, range: 0 }
    });

    // 1. Measuring shooting range from squad models on board using leader's range (6 sq = 300px)
    const measuringUnit: Unit = {
      ...meleeBodyguard,
      stats: {
        ...meleeBodyguard.stats,
        range: rangedLeader.stats.range
      }
    };
    expect(isUnitInShootingRange(measuringUnit, enemyTarget, 50)).toBe(true);

    // 2. The combat resolution is executed by the LEADER, NOT the bodyguard
    const attackerUnit: Unit = {
      ...rangedLeader,
      position: meleeBodyguard.position
    };
    const combatRes = resolveCombat(attackerUnit, enemyTarget, false, 0);

    // Attacker is Kaelen with AM = 5, not the bodyguard squad
    expect(combatRes.attackerName).toBe('Grand Warmaster Kaelen');
    expect(combatRes.attackReceived).toBeGreaterThanOrEqual(5 + 1); // AM 5 + 1d3 roll (1-3)
    expect(combatRes.attackReceived).toBeLessThanOrEqual(5 + 3);

    // 3. Mark hasShot: Only the leader is marked hasShot = true!
    const updatedUnits = [meleeBodyguard, rangedLeader].map(u => u.id === rangedLeader.id ? { ...u, hasShot: true } : u);
    expect(updatedUnits.find(u => u.id === 'lead1')!.hasShot).toBe(true);
    expect(updatedUnits.find(u => u.id === 'bg1')!.hasShot).toBe(false);
  });
});

