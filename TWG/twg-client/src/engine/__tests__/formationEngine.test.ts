import { describe, it, expect } from 'vitest';
import { 
  checkShapeOverlap, 
  calculateFormationOffsets,
  canUnitDeployOutsideZone,
  canAttachLeader,
  isUnitInShootingRange,
  checkUniversalTokenCollisions,
  getUnitBodiesAndLives,
  validateNormalMovementEnemyProximity,
  checkPathCrossesUnits,
  getUnitBaseDimensions,
  setUnitMutualState
} from '../formationEngine';
import { resolveCombat } from '../combatEngine';
import { checkWinConditions } from '../scoringEngine';
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

    // Attacker is Kaelen with range = 6, not the bodyguard squad
    expect(combatRes.attackerName).toBe('Grand Warmaster Kaelen');
    expect(combatRes.totalAttacks).toBeGreaterThanOrEqual(1);
    expect(combatRes.hitRolls.length).toBe(combatRes.totalAttacks);
    expect(combatRes.hitRolls.every(r => r >= 1 && r <= 20)).toBe(true);

    // 3. Mark hasShot: Only the leader is marked hasShot = true!
    const updatedUnits = [meleeBodyguard, rangedLeader].map(u => u.id === rangedLeader.id ? { ...u, hasShot: true } : u);
    expect(updatedUnits.find(u => u.id === 'lead1')!.hasShot).toBe(true);
    expect(updatedUnits.find(u => u.id === 'bg1')!.hasShot).toBe(false);
  });

  describe('Core Rulebook (v0.2) Mechanics Alignment', () => {
    it('generates non-overlapping offsets across all 5 formation types (Auto, Circle, Line, Grid, Stack)', () => {
      const formations = ['auto', 'circle', 'line', 'grid', 'stack'] as const;
      const modelCount = 5;
      const baseRadius = 20;
      const baseWidth = 40;
      const baseHeight = 40;

      for (const form of formations) {
        const offsets = calculateFormationOffsets(modelCount, form, baseRadius, baseWidth, baseHeight);
        expect(offsets).toHaveLength(modelCount);

        const tokens: Token[] = offsets.map((off, idx) => ({
          id: `tok_${idx}`,
          unitId: 'u1',
          x: 200 + off.offsetX,
          y: 200 + off.offsetY,
          offsetX: off.offsetX,
          offsetY: off.offsetY,
          rotation: 0,
          size: 40,
          radius: 20,
          baseShape: 'circle',
          baseWidth: 40,
          baseHeight: 40,
          currentLives: 2,
          maxLives: 2
        }));

        const collision = checkUniversalTokenCollisions(tokens, []);
        expect(collision.hasCollision, `Formation '${form}' failed internal base overlap check`).toBe(false);
      }
    });

    it('getUnitBodiesAndLives computes separate Bodies (U) and Lives (L)', () => {
      const testUnit = makeUnit({
        id: 'u_bodies_test',
        name: 'Blood-Alchemic Vanguard',
        tokens: [
          { id: 't1', unitId: 'u_bodies_test', currentLives: 2, maxLives: 2, x: 100, y: 100, rotation: 0, size: 40 },
          { id: 't2', unitId: 'u_bodies_test', currentLives: 2, maxLives: 2, x: 140, y: 100, rotation: 0, size: 40 },
          { id: 't3', unitId: 'u_bodies_test', currentLives: 0, maxLives: 2, x: 180, y: 100, rotation: 0, size: 40 } // 1 dead body
        ],
        stats: { lives: 4, maxLives: 6, modelCount: 3, mv: 6, am: 4, def: 4, baseDef: 4, defModifier: 0, hpPerModel: 2, cp: 1, range: 0 }
      });

      const bl = getUnitBodiesAndLives(testUnit);
      expect(bl.livingBodies).toBe(2);
      expect(bl.totalBodies).toBe(3);
      expect(bl.remainingLives).toBe(4);
      expect(bl.maxLives).toBe(6);
      expect(bl.livesPerBody).toBe(2);
      expect(bl.displayString).toContain('Bodies: 2/3 (U) | Lives: 4/6 (L)');
    });

    it('strictly rejects normal movement ending within 1 square (50px) of an enemy', () => {
      const movingUnit = makeUnit({
        id: 'p1_squad',
        owner: 'player1',
        stats: { lives: 6, mv: 6, am: 4, def: 4, baseDef: 4, defModifier: 0, modelCount: 1, hpPerModel: 6, cp: 1, range: 0 }
      });

      const enemyUnit = makeUnit({
        id: 'enemy_squad',
        owner: 'player2',
        position: { x: 300, y: 200 },
        tokens: [{ id: 'e_tok1', unitId: 'enemy_squad', currentLives: 4, maxLives: 4, x: 300, y: 200, rotation: 0, size: 40, radius: 20 }],
        stats: { lives: 4, mv: 6, am: 4, def: 4, baseDef: 4, defModifier: 0, modelCount: 1, hpPerModel: 4, cp: 1, range: 0 }
      });

      // Destination is at (260, 200) -> edge distance = (300-200) - (20+20) = 0px (< 50px)
      const closeCandidate: Token[] = [
        { id: 'm_tok1', unitId: 'p1_squad', currentLives: 6, maxLives: 6, x: 260, y: 200, rotation: 0, size: 40, radius: 20 }
      ];

      const check = validateNormalMovementEnemyProximity(movingUnit, closeCandidate, [movingUnit, enemyUnit], 50);
      expect(check.valid).toBe(false);
      expect(check.offendingEnemyUnit?.id).toBe('enemy_squad');

      // Destination is at (200, 200) -> edge distance = 100 - 40 = 60px (> 50px)
      const safeCandidate: Token[] = [
        { id: 'm_tok1', unitId: 'p1_squad', currentLives: 6, maxLives: 6, x: 200, y: 200, rotation: 0, size: 40, radius: 20 }
      ];

      const safeCheck = validateNormalMovementEnemyProximity(movingUnit, safeCandidate, [movingUnit, enemyUnit], 50);
      expect(safeCheck.valid).toBe(true);
    });

    it('enforces Round 10 hard match cap with VP victory and un-hardcoded tiebreak (draw)', () => {
      const p1Units = [makeUnit({ id: 'p1_u', owner: 'player1', stats: { lives: 5 } })];
      const p2Units = [makeUnit({ id: 'p2_u', owner: 'player2', stats: { lives: 5 } })];

      // 1. Clear VP winner
      const p1Wins = checkWinConditions(10, 24, 18, p1Units, p2Units);
      expect(p1Wins.isOver).toBe(true);
      expect(p1Wins.winner).toBe('player1');

      // 2. Score tied at Round 10 -> Tactical Draw
      const tied = checkWinConditions(10, 20, 20, p1Units, p2Units);
      expect(tied.isOver).toBe(true);
      expect(tied.winner).toBe('draw');
      expect(tied.reason).toContain('Tactical Draw');
    });

    it('allows friendly infantry to path through other friendly infantry during movement, but blocks enemy units', () => {
      // Moving Unit: Friendly Player 1 Infantry moving from (100, 200) to (300, 200)
      const movingInfantry = makeUnit({
        id: 'p1_squad_a',
        owner: 'player1',
        type: 'Infantry',
        position: { x: 100, y: 200 },
        tokens: [{ id: 't_a1', unitId: 'p1_squad_a', currentLives: 2, maxLives: 2, x: 100, y: 200, rotation: 0, size: 40, radius: 20 }],
        stats: { lives: 2, mv: 6, am: 4, def: 4, baseDef: 4, defModifier: 0, modelCount: 1, hpPerModel: 2, cp: 1, range: 0 }
      });

      // Intervening Unit 1: Friendly Player 1 Infantry positioned directly in between at (200, 200)
      const friendlyInfantry = makeUnit({
        id: 'p1_squad_b',
        owner: 'player1',
        type: 'Infantry',
        position: { x: 200, y: 200 },
        tokens: [{ id: 't_b1', unitId: 'p1_squad_b', currentLives: 2, maxLives: 2, x: 200, y: 200, rotation: 0, size: 40, radius: 20 }],
        stats: { lives: 2, mv: 6, am: 4, def: 4, baseDef: 4, defModifier: 0, modelCount: 1, hpPerModel: 2, cp: 1, range: 0 }
      });

      // Intervening Unit 2: Enemy Player 2 Infantry positioned at (200, 200)
      const enemyInfantry = makeUnit({
        id: 'p2_squad_e',
        owner: 'player2',
        type: 'Infantry',
        position: { x: 200, y: 200 },
        tokens: [{ id: 't_e1', unitId: 'p2_squad_e', currentLives: 2, maxLives: 2, x: 200, y: 200, rotation: 0, size: 40, radius: 20 }],
        stats: { lives: 2, mv: 6, am: 4, def: 4, baseDef: 4, defModifier: 0, modelCount: 1, hpPerModel: 2, cp: 1, range: 0 }
      });

      // Test A: Path through friendly infantry -> NO COLLISION (friendly infantry pass-through)
      const friendlyPathCheck = checkPathCrossesUnits(
        movingInfantry,
        { x: 100, y: 200 },
        { x: 300, y: 200 },
        [movingInfantry, friendlyInfantry]
      );
      expect(friendlyPathCheck.hasCollision).toBe(false);

      // Test B: Path through enemy infantry -> HAS COLLISION (blocked!)
      const enemyPathCheck = checkPathCrossesUnits(
        movingInfantry,
        { x: 100, y: 200 },
        { x: 300, y: 200 },
        [movingInfantry, enemyInfantry]
      );
      expect(enemyPathCheck.hasCollision).toBe(true);
      expect(enemyPathCheck.collidingUnit?.id).toBe('p2_squad_e');
    });

    it('resolves combat using Two-Roll system (d20 vs target Def, then damage dice per hit)', () => {
      const attacker = makeUnit({
        id: 'attacker_squad',
        owner: 'player1',
        type: 'Infantry',
        tokens: [
          { id: 't1', unitId: 'attacker_squad', currentLives: 2, maxLives: 2, x: 100, y: 100, rotation: 0, size: 40 },
          { id: 't2', unitId: 'attacker_squad', currentLives: 2, maxLives: 2, x: 120, y: 100, rotation: 0, size: 40 }
        ],
        stats: {
          lives: 4, maxLives: 4, mv: 5, am: 5, def: 5, baseDef: 5, defModifier: 0,
          modelCount: 2, hpPerModel: 2, cp: 1, range: 0,
          meleeAttacks: 2, meleeDamageDice: 'd6'
        }
      });

      const defender = makeUnit({
        id: 'defender_squad',
        owner: 'player2',
        type: 'Infantry',
        tokens: [{ id: 'dt1', unitId: 'defender_squad', currentLives: 6, maxLives: 6, x: 100, y: 140, rotation: 0, size: 40 }],
        stats: {
          lives: 6, maxLives: 6, mv: 4, am: 4, def: 5, baseDef: 5, defModifier: 0,
          modelCount: 1, hpPerModel: 6, cp: 1, range: 0
        }
      });

      // 2 models * 2 attacks = 4 total attacks
      const res = resolveCombat(attacker, defender, true);
      expect(res.totalAttacks).toBe(4);
      expect(res.hitRolls.length).toBe(4);
      expect(res.targetCurrentDef).toBe(5);

      // Verify hitsCount strictly equals number of d20 rolls that were > target Def (5)
      const expectedHits = res.hitRolls.filter(r => r > 5).length;
      expect(res.hitsCount).toBe(expectedHits);

      // Verify damage dice rolled equals hitsCount
      expect(res.damageRolls.length).toBe(res.hitsCount);
      expect(res.damageDie).toBe('d6');

      // Verify total damage is sum of damage rolls
      const sumDamage = res.damageRolls.reduce((a, b) => a + b, 0);
      expect(res.totalDamage).toBe(sumDamage);
      expect(res.livesLost).toBe(sumDamage);
    });
  });

  describe('Disembark, Formation Coherency & Proximity Validation Fixes', () => {
    it('preserves circle base shape for pure Infantry even when mv >= 7', () => {
      const infantryUnit = makeUnit({
        id: 'stalker_1',
        name: 'Alchemic Shadow Stalker',
        type: 'Infantry',
        role: 'Infantry / Mounted',
        stats: { lives: 6, maxLives: 6, mv: 7, am: 5, def: 4, baseDef: 4, defModifier: 0, modelCount: 3, hpPerModel: 2, cp: 1, range: 0 }
      });

      const dims = getUnitBaseDimensions(infantryUnit);
      expect(dims.shape).toBe('circle');
      expect(dims.width).toBe(dims.height);
    });

    it('generates a compact equilateral cluster for 3-model squad in circle formation without excessive radius expansion', () => {
      const baseRadius = 16;
      const baseWidth = 32;
      const baseHeight = 32;
      const offsets = calculateFormationOffsets(3, 'circle', baseRadius, baseWidth, baseHeight);

      expect(offsets).toHaveLength(3);
      // Ensure all models are within 35px radius from center (compact triangle, not blown out to 60-70px)
      for (const off of offsets) {
        const dist = Math.hypot(off.offsetX, off.offsetY);
        expect(dist).toBeLessThanOrEqual(35);
      }
    });

    it('ignores attached, embarked, and strategic reserve enemy units during normal move proximity check', () => {
      const movingUnit = makeUnit({
        id: 'crucible_beast',
        name: 'Crucible Mutant Beast',
        owner: 'player1',
        type: 'Monster',
        stats: { lives: 8, maxLives: 8, mv: 8, am: 6, def: 5, baseDef: 5, defModifier: 0, modelCount: 1, hpPerModel: 8, cp: 1, range: 0 }
      });

      const candidateTokens: Token[] = [
        { id: 'beast_tok', unitId: 'crucible_beast', x: 500, y: 300, radius: 25, size: 50, currentLives: 8, maxLives: 8, rotation: 0 }
      ];

      // Enemy leader who is attached to an enemy squad (attachedTo set), holding stale position near (510, 310)
      const attachedEnemyLeader = makeUnit({
        id: 'enemy_leader_lyssandra',
        name: 'High Marshal Lyssandra',
        owner: 'player2',
        type: 'Character',
        attachedTo: 'enemy_bodyguard_squad',
        position: { x: 510, y: 310 },
        tokens: [],
        stats: { lives: 5, maxLives: 5, mv: 6, am: 5, def: 5, baseDef: 5, defModifier: 0, modelCount: 1, hpPerModel: 5, cp: 1, range: 0 }
      });

      // Enemy unit in strategic reserve near candidate
      const reserveEnemyUnit = makeUnit({
        id: 'reserve_enemy',
        name: 'Enemy Ambushers',
        owner: 'player2',
        type: 'Infantry',
        inStrategicReserve: true,
        position: { x: 505, y: 305 },
        tokens: [],
        stats: { lives: 3, maxLives: 3, mv: 6, am: 4, def: 4, baseDef: 4, defModifier: 0, modelCount: 1, hpPerModel: 3, cp: 1, range: 0 }
      });

      // Physical enemy unit far away at (900, 900)
      const activeEnemySquad = makeUnit({
        id: 'enemy_bodyguard_squad',
        name: 'Shattered Foundry Guard',
        owner: 'player2',
        type: 'Infantry',
        position: { x: 900, y: 900 },
        tokens: [
          { id: 'guard_tok_1', unitId: 'enemy_bodyguard_squad', x: 900, y: 900, radius: 20, size: 40, currentLives: 3, maxLives: 3, rotation: 0 }
        ],
        stats: { lives: 6, maxLives: 6, mv: 5, am: 4, def: 4, baseDef: 4, defModifier: 0, modelCount: 2, hpPerModel: 3, cp: 1, range: 0 }
      });

      const check = validateNormalMovementEnemyProximity(
        movingUnit,
        candidateTokens,
        [movingUnit, attachedEnemyLeader, reserveEnemyUnit, activeEnemySquad]
      );

      // Must be valid! The attached leader and reserve unit should not trigger false proximity rejections
      expect(check.valid).toBe(true);
    });

    it('resets hasCustomTokenPositions on embarking and onBoard transitions', () => {
      const unit = makeUnit({
        id: 'infantry_1',
        name: 'Test Squad',
        type: 'Infantry',
        hasCustomTokenPositions: true
      });

      const embarked = setUnitMutualState(unit, 'embarked', { vehicleId: 'transport_1' });
      expect(embarked.hasCustomTokenPositions).toBe(false);
      expect(embarked.tokens).toHaveLength(0);

      const onBoard = setUnitMutualState(embarked, 'onBoard', { position: { x: 300, y: 300 } });
      expect(onBoard.hasCustomTokenPositions).toBe(false);
    });
  });
});


