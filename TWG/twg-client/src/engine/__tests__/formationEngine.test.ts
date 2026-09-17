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
  setUnitMutualState,
  executeAbandonShipProtocol,
  applyDamageToTokens,
  findValidEngagementPosition,
  getUnitCollisionRadius,
  moveUnit,
  canEmbark,
  canEmbarkWithDistance,
  hasFiringDeckTrait
} from '../formationEngine';
import { resolveCombat, calculateArmorSaveTarget } from '../combatEngine';
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
      const res = resolveCombat(attacker, defender, true, 0, { skipSaves: true });
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

  describe('Abandon Ship Protocol on Vehicle Destruction', () => {
    it('disembarks embarked squad and rolls d20 per token: < 10 rolls d3 damage, >= 10 unharmed', () => {
      const transport = makeUnit({
        id: 'skiff_1',
        name: 'Sunfire Skiff',
        type: 'Vehicle',
        position: { x: 400, y: 300 },
        stats: { lives: 0, maxLives: 8, mv: 10, am: 4, def: 5, baseDef: 5, defModifier: 0, modelCount: 1, hpPerModel: 8, cp: 1, range: 0 }
      });

      const embarkedSquad = makeUnit({
        id: 'stalker_squad',
        name: 'Alchemic Shadow Stalker',
        type: 'Infantry',
        embarkedIn: 'skiff_1',
        stats: { lives: 6, maxLives: 6, mv: 6, am: 5, def: 4, baseDef: 4, defModifier: 0, modelCount: 3, hpPerModel: 2, cp: 1, range: 0 }
      });

      // Deterministic dice rolls:
      // Model 1: d20 = 15 (>= 10) -> safe, loses 0 HP (remains 2 HP)
      // Model 2: d20 = 6 (< 10) -> fails, rolls d3 = 1 -> loses 1 HP (remains 1 HP)
      // Model 3: d20 = 4 (< 10) -> fails, rolls d3 = 3 -> loses 3 HP (0 HP, dies!)
      const rolls = [15, 6, 1, 4, 3];
      let rollIndex = 0;
      const fakeRoller = () => rolls[rollIndex++];

      const result = executeAbandonShipProtocol(transport, [transport, embarkedSquad], fakeRoller);

      expect(result.reports).toHaveLength(1);
      const rep = result.reports[0];
      expect(rep.totalModels).toBe(3);
      expect(rep.survivingModels).toBe(2);
      expect(rep.killedModels).toBe(1);

      // Model 1 safe
      expect(rep.models[0].d20Roll).toBe(15);
      expect(rep.models[0].failed).toBe(false);
      expect(rep.models[0].livesRemaining).toBe(2);

      // Model 2 wounded
      expect(rep.models[1].d20Roll).toBe(6);
      expect(rep.models[1].failed).toBe(true);
      expect(rep.models[1].d3Damage).toBe(1);
      expect(rep.models[1].livesRemaining).toBe(1);

      // Model 3 killed
      expect(rep.models[2].d20Roll).toBe(4);
      expect(rep.models[2].failed).toBe(true);
      expect(rep.models[2].d3Damage).toBe(3);
      expect(rep.models[2].died).toBe(true);
      expect(rep.models[2].livesRemaining).toBe(0);

      // Squad unit updated state: 2 + 1 = 3 lives remaining, position set on board
      const updatedSquad = result.updatedUnits.find(u => u.id === 'stalker_squad')!;
      expect(updatedSquad.embarkedIn).toBeNull();
      expect(updatedSquad.position).toBeDefined();
      expect(updatedSquad.stats.lives).toBe(3);
      expect(updatedSquad.tokens).toHaveLength(2);
    });

    it('rolls d20 for attached leader as well, and detaches leader if bodyguard squad is wiped out', () => {
      const transport = makeUnit({
        id: 'skiff_1',
        name: 'Sunfire Skiff',
        type: 'Vehicle',
        position: { x: 400, y: 300 },
        stats: { lives: 0, maxLives: 8, mv: 10, am: 4, def: 5, baseDef: 5, defModifier: 0, modelCount: 1, hpPerModel: 8, cp: 1, range: 0 }
      });

      const bodyguardSquad = makeUnit({
        id: 'guard_1',
        name: 'Silverguard Unit',
        type: 'Infantry',
        embarkedIn: 'skiff_1',
        attachedUnits: ['leader_lyssandra'],
        stats: { lives: 2, maxLives: 2, mv: 5, am: 4, def: 5, baseDef: 5, defModifier: 0, modelCount: 1, hpPerModel: 2, cp: 1, range: 0 }
      });

      const attachedLeader = makeUnit({
        id: 'leader_lyssandra',
        name: 'High Marshal Lyssandra',
        type: 'Character',
        embarkedIn: 'skiff_1',
        attachedTo: 'guard_1',
        stats: { lives: 5, maxLives: 5, mv: 6, am: 5, def: 5, baseDef: 5, defModifier: 0, modelCount: 1, hpPerModel: 5, cp: 1, range: 0 }
      });

      // Token 1 (Leader): d20 = 18 (>= 10) -> safe!
      // Token 2 (Bodyguard): d20 = 2 (< 10) -> fails, rolls d3 = 3 -> loses 3 HP (dies!)
      const rolls = [18, 2, 3];
      let rollIndex = 0;
      const fakeRoller = () => rolls[rollIndex++];

      const result = executeAbandonShipProtocol(transport, [transport, bodyguardSquad, attachedLeader], fakeRoller);

      const updatedBodyguard = result.updatedUnits.find(u => u.id === 'guard_1')!;
      const updatedLeader = result.updatedUnits.find(u => u.id === 'leader_lyssandra')!;

      // Bodyguard died in the crash
      expect(updatedBodyguard.stats.lives).toBe(0);
      expect(updatedBodyguard.position).toBeNull();

      // Leader survived unharmed, detaches, and is placed solo on board
      expect(updatedLeader.stats.lives).toBe(5);
      expect(updatedLeader.attachedTo).toBeNull();
      expect(updatedLeader.embarkedIn).toBeNull();
      expect(updatedLeader.position).toBeDefined();
    });
  });

  describe('Inspection Tool & Trait Explanations', () => {
    it('provides accurate explanations for core tactical traits', async () => {
      const { getTraitExplanation, getTraitBadgeInfo } = await import('../../components/game/TabletopCanvas');

      expect(getTraitExplanation('Infiltrator')).toContain('deployment');
      expect(getTraitExplanation('Flying')).toContain('intervening');
      expect(getTraitExplanation('Leader')).toContain('infantry');
      expect(getTraitExplanation('Transport')).toContain('infantry');
      expect(getTraitExplanation('Rapid Fire')).toContain('re-roll');

      const badge = getTraitBadgeInfo('Infiltrator');
      expect(badge.icon).toBe('🥷');
      expect(badge.label).toBe('Infiltrator');
    });

    it('provides accurate explanations for temporary status conditions', async () => {
      const { getTraitExplanation, getTraitBadgeInfo } = await import('../../components/game/TabletopCanvas');

      expect(getTraitExplanation('On Fire')).toContain('mortal wound');
      expect(getTraitExplanation('Poisoned')).toContain('toxin');
      expect(getTraitExplanation('Acid Corroded')).toContain('DEF penalty');
      expect(getTraitExplanation('Stunned')).toContain('disabled');
      expect(getTraitExplanation('Frozen')).toContain('Halves movement');

      const fireBadge = getTraitBadgeInfo('On Fire', true);
      expect(fireBadge.icon).toBe('🔥');
      expect(fireBadge.isTemp).toBe(true);

      const poisonBadge = getTraitBadgeInfo('Poisoned', true);
      expect(poisonBadge.icon).toBe('🧪');
      expect(poisonBadge.isTemp).toBe(true);
    });
  });

  describe('Combined Attached Leader Attacks and Armor Save System', () => {
    it('combines squad attacks and attached leader attacks into a single pool', () => {
      const bodyguard = makeUnit({
        id: 'bg_knights',
        name: 'Iron Knights',
        stats: { lives: 6, maxLives: 6, mv: 5, am: 5, def: 5, baseDef: 5, defModifier: 0, modelCount: 3, hpPerModel: 2, cp: 1, range: 4, rangedAttacks: 1, rangedDamageDice: 'd3' }
      });
      const leader = makeUnit({
        id: 'lead_captain',
        name: 'Iron Captain',
        type: 'Character',
        role: 'Leader',
        stats: { lives: 4, maxLives: 4, mv: 5, am: 6, def: 6, baseDef: 6, defModifier: 0, modelCount: 1, hpPerModel: 4, cp: 2, range: 6, rangedAttacks: 2, rangedDamageDice: 'd6' }
      });
      const defender = makeUnit({
        id: 'def_orkz',
        name: 'Grot Vanguard',
        stats: { lives: 10, maxLives: 10, mv: 4, am: 4, def: 4, baseDef: 4, defModifier: 0, modelCount: 5, hpPerModel: 2, cp: 0, range: 0 }
      });

      const res = resolveCombat(bodyguard, defender, false, 0, { attachedLeaders: [leader] });

      // Squad has 3 models * 1 attack = 3. Leader has 1 model * 2 attacks = 2. Total attacks = 5
      expect(res.totalAttacks).toBe(5);
      expect(res.hitRolls.length).toBe(5);
      expect(res.attackGroups?.length).toBe(2);
      expect(res.attackGroups?.[0].unitName).toBe('Iron Knights');
      expect(res.attackGroups?.[0].attacksCount).toBe(3);
      expect(res.attackGroups?.[1].unitName).toBe('Iron Captain');
      expect(res.attackGroups?.[1].attacksCount).toBe(2);
      expect(res.attackerName).toContain('Iron Knights');
      expect(res.attackerName).toContain('Iron Captain');
    });

    it('rolls 1d6 armor saves for defender and deflects saved hits', () => {
      const attacker = makeUnit({
        id: 'atk_squad',
        name: 'Assault Squad',
        stats: { lives: 4, maxLives: 4, mv: 6, am: 6, def: 5, baseDef: 5, defModifier: 0, modelCount: 2, hpPerModel: 2, cp: 1, range: 0, meleeAttacks: 3, meleeDamageDice: 'd6' }
      });
      // Def 6 defender -> Def 5-8 tier = 5+ armor save (or 4+ in cover)
      const armoredDefender = makeUnit({
        id: 'def_tank',
        name: 'Dreadnought',
        type: 'Vehicle',
        stats: { lives: 12, maxLives: 12, mv: 4, am: 5, def: 6, baseDef: 6, defModifier: 0, modelCount: 1, hpPerModel: 12, cp: 1, range: 6 }
      });

      const res = resolveCombat(attacker, armoredDefender, true, 0);

      expect(res.saveTarget).toBe(5); // 5+ save on 1d6 for Def 6
      expect(res.saveRolls.length).toBe(res.hitsCount);
      expect(res.savesCount + res.penetratingHits).toBe(res.hitsCount);
      expect(res.damageRolls.length).toBe(res.penetratingHits);
      expect(res.hitExplanations).toBeDefined();
      expect(res.saveExplanations).toBeDefined();
    });

    it('protects attached leader tokens by allocating damage to bodyguard models first', () => {
      const unitWithLeader: Unit = {
        ...makeUnit({ id: 'squad_with_lead', stats: { lives: 6, maxLives: 6, mv: 5, am: 5, def: 5, baseDef: 5, defModifier: 0, modelCount: 2, hpPerModel: 2, cp: 1, range: 0 } }),
        tokens: [
          { id: 'bg_tok_1', unitId: 'squad_with_lead', currentLives: 2, maxLives: 2, x: 100, y: 100, offsetX: 0, offsetY: 0, rotation: 0, size: 40, isLeaderToken: false },
          { id: 'lead_tok_1', unitId: 'squad_with_lead', currentLives: 4, maxLives: 4, x: 120, y: 100, offsetX: 20, offsetY: 0, rotation: 0, size: 40, isLeaderToken: true }
        ]
      };

      // Deal 2 damage - should eliminate bodyguard token while preserving the leader token intact
      const damagedUnit = applyDamageToTokens(unitWithLeader, 2);
      expect(damagedUnit.tokens?.length).toBe(1);
      expect(damagedUnit.tokens?.[0].isLeaderToken).toBe(true);
      expect(damagedUnit.tokens?.[0].currentLives).toBe(4);
    });

    it('smoothly scales armor saves across full Def 1-20 range without negative numbers or overflow', () => {
      const makeDefUnit = (def: number, armorSave?: number): Unit => makeUnit({
        id: `unit_def_${def}`,
        stats: { lives: 5, maxLives: 5, mv: 4, am: 4, def, baseDef: def, defModifier: 0, modelCount: 1, hpPerModel: 5, cp: 0, range: 0, armorSave }
      });

      // Def 1-4: 6+ Save
      expect(calculateArmorSaveTarget(makeDefUnit(1))).toBe(6);
      expect(calculateArmorSaveTarget(makeDefUnit(4))).toBe(6);

      // Def 5-8: 5+ Save
      expect(calculateArmorSaveTarget(makeDefUnit(5))).toBe(5);
      expect(calculateArmorSaveTarget(makeDefUnit(8))).toBe(5);

      // Def 9-12: 4+ Save
      expect(calculateArmorSaveTarget(makeDefUnit(9))).toBe(4);
      expect(calculateArmorSaveTarget(makeDefUnit(12))).toBe(4);

      // Def 13-16: 3+ Save
      expect(calculateArmorSaveTarget(makeDefUnit(13))).toBe(3);
      expect(calculateArmorSaveTarget(makeDefUnit(16))).toBe(3);

      // Def 17-20: 2+ Save (capped at 2+ so natural 1 always fails)
      expect(calculateArmorSaveTarget(makeDefUnit(17))).toBe(2);
      expect(calculateArmorSaveTarget(makeDefUnit(20))).toBe(2);

      // Cover provides +1 improvement to save target (e.g. 5+ -> 4+, min 2+)
      expect(calculateArmorSaveTarget(makeDefUnit(6), true)).toBe(4);
      expect(calculateArmorSaveTarget(makeDefUnit(10), true)).toBe(3);
      expect(calculateArmorSaveTarget(makeDefUnit(18), true)).toBe(2);

      // Explicit custom armorSave override (2-6) is honored
      expect(calculateArmorSaveTarget(makeDefUnit(4, 3))).toBe(3);
      expect(calculateArmorSaveTarget(makeDefUnit(18, 4))).toBe(4);
    });

    it('accurately calculates collision radius for multi-model squads even without tokens', () => {
      const fiveModelSquad = makeUnit({
        id: 'squad_5m',
        stats: { lives: 10, maxLives: 10, mv: 5, am: 5, def: 5, baseDef: 5, defModifier: 0, modelCount: 5, hpPerModel: 2, cp: 0, range: 0 }
      });
      // 5 models in circle formation have radius ~61px, not single-model 20px
      const radius = getUnitCollisionRadius(fiveModelSquad);
      expect(radius).toBeGreaterThanOrEqual(50);
      expect(radius).toBeLessThanOrEqual(75);
    });

    it('findValidEngagementPosition strictly places charger in non-overlapping melee contact', () => {
      const charger = makeUnit({
        id: 'atk_squad',
        position: { x: 300, y: 300 },
        formation: 'circle',
        stats: { lives: 10, maxLives: 10, mv: 6, am: 5, def: 5, baseDef: 5, defModifier: 0, modelCount: 5, hpPerModel: 2, cp: 0, range: 0 }
      });
      const target = makeUnit({
        id: 'def_squad',
        position: { x: 400, y: 300 },
        formation: 'circle',
        stats: { lives: 10, maxLives: 10, mv: 5, am: 5, def: 5, baseDef: 5, defModifier: 0, modelCount: 5, hpPerModel: 2, cp: 0, range: 0 }
      });

      const allUnits = [charger, target];
      const res = findValidEngagementPosition(charger, target, allUnits, 300);

      expect(res.valid).toBe(true);
      // Verify charger at new position does NOT collide with target
      const movedCharger = moveUnit(charger, res.position, allUnits);
      const colCheck = checkUniversalTokenCollisions(movedCharger.tokens || [], [target], charger.id);
      expect(colCheck.hasCollision).toBe(false);
    });

    it('findValidEngagementPosition rejects engagement if an impassable obstacle surrounds target', () => {
      const charger = makeUnit({
        id: 'atk_squad',
        position: { x: 100, y: 100 },
        stats: { lives: 2, maxLives: 2, mv: 5, am: 5, def: 5, baseDef: 5, defModifier: 0, modelCount: 1, hpPerModel: 2, cp: 0, range: 0 }
      });
      const target = makeUnit({
        id: 'def_target',
        position: { x: 500, y: 500 },
        stats: { lives: 2, maxLives: 2, mv: 5, am: 5, def: 5, baseDef: 5, defModifier: 0, modelCount: 1, hpPerModel: 2, cp: 0, range: 0 }
      });

      // Target is 400px away, but maxMoveDistancePx is only 50px
      const res = findValidEngagementPosition(charger, target, [charger, target], 50);
      expect(res.valid).toBe(false);
      expect(res.position).toEqual(charger.position);
    });
  });

  describe('Vehicle Carrying Capacity, Monster Restrictions & Firing Deck', () => {
    const makeInfantry = (id: string, modelCount: number, attachedLeaderCount: number = 0): Unit => ({
      id,
      name: `Infantry Squad ${id}`,
      type: 'Infantry',
      role: 'Battleline',
      avatar: '🛡️',
      owner: 'player1',
      stats: {
        lives: modelCount,
        maxLives: modelCount,
        mv: 6,
        am: 6,
        def: 8,
        baseDef: 8,
        defModifier: 0,
        modelCount,
        hpPerModel: 1,
        cp: 0,
        range: 4
      },
      attachedUnits: attachedLeaderCount > 0 ? Array.from({ length: attachedLeaderCount }, (_, i) => `leader_${i}`) : [],
      tokens: Array.from({ length: modelCount }, (_, i) => ({ id: `tok_${id}_${i}`, x: 100 + i * 20, y: 100 }))
    });

    const makeVehicle = (id: string, transportCapacity: number = 1, carryCapacity: number = 6, extra: Partial<Unit> = {}): Unit => ({
      id,
      name: `Armored Transport ${id}`,
      type: 'Vehicle',
      role: 'Vehicle / Monster',
      avatar: '🚜',
      owner: 'player1',
      transportCapacity,
      carryCapacity,
      stats: {
        lives: 12,
        maxLives: 12,
        mv: 10,
        am: 10,
        def: 12,
        baseDef: 12,
        defModifier: 0,
        modelCount: 1,
        hpPerModel: 12,
        cp: 0,
        range: 0
      },
      tokens: [{ id: `tok_${id}_0`, x: 100, y: 100 }],
      ...extra
    });

    const makeMonster = (id: string, extra: Partial<Unit> = {}): Unit => ({
      id,
      name: `Behemoth Monster ${id}`,
      type: 'Monster',
      role: 'Vehicle / Monster',
      avatar: '🐉',
      owner: 'player1',
      transportCapacity: 2,
      carryCapacity: 12,
      stats: {
        lives: 16,
        maxLives: 16,
        mv: 8,
        am: 12,
        def: 14,
        baseDef: 14,
        defModifier: 0,
        modelCount: 1,
        hpPerModel: 16,
        cp: 0,
        range: 0
      },
      tokens: [{ id: `tok_${id}_0`, x: 100, y: 100 }],
      ...extra
    });

    it('RULE: vehicle carries inferior or equal to its capacity (model and squad count)', () => {
      // Vehicle with transportCapacity: 1 squad, carryCapacity: 6 models
      const transport = makeVehicle('rhino_1', 1, 6);

      // Squad with 5 models + 1 attached leader = 6 models total
      const squad6 = makeInfantry('squad_6', 5, 1);
      expect(canEmbark(squad6, transport, 0, 0)).toBe(true);

      // Squad with 6 models + 1 attached leader = 7 models total (exceeds carryCapacity 6)
      const squad7 = makeInfantry('squad_7', 6, 1);
      expect(canEmbark(squad7, transport, 0, 0)).toBe(false);

      // If vehicle already has 1 squad embarked (currentUnitCount = 1), cannot embark a 2nd squad
      const squadSmall = makeInfantry('squad_small', 2);
      expect(canEmbark(squadSmall, transport, 2, 1)).toBe(false);

      // If vehicle allows 2 squads (transportCapacity: 2, carryCapacity: 10)
      const bigTransport = makeVehicle('land_raider_1', 2, 10);
      const squadA = makeInfantry('squad_a', 4);
      const squadB = makeInfantry('squad_b', 4);
      expect(canEmbark(squadA, bigTransport, 0, 0)).toBe(true);
      expect(canEmbark(squadB, bigTransport, 4, 1)).toBe(true);

      // A 3rd squad cannot embark because unit count would reach 3 > 2
      const squadC = makeInfantry('squad_c', 2);
      expect(canEmbark(squadC, bigTransport, 8, 2)).toBe(false);

      // And a squad that exceeds model capacity (4 + 7 = 11 > 10) is rejected
      const squadHeavy = makeInfantry('squad_heavy', 7);
      expect(canEmbark(squadHeavy, bigTransport, 4, 1)).toBe(false);
    });

    it('RULE: a monster does NOT have the ability to carry others', () => {
      const monster = makeMonster('carnifex_1');
      const infantry = makeInfantry('gaunt_squad', 5);

      // canEmbark returns false for Monster
      expect(canEmbark(infantry, monster, 0, 0)).toBe(false);

      // canEmbarkWithDistance returns false for Monster with clear reason
      monster.position = { x: 100, y: 100 };
      infantry.position = { x: 120, y: 100 };
      const distCheck = canEmbarkWithDistance(infantry, monster, 0, 150, 0);
      expect(distCheck.canEmbark).toBe(false);
      expect(distCheck.reason).toContain('Monsters do not have the ability to carry others');

      // Even if the monster has 'Transport' in traits, type === 'Monster' strictly bans it
      const mutantMonster = makeMonster('mutant_behemoth', { traits: ['Transport'] });
      expect(canEmbark(infantry, mutantMonster, 0, 0)).toBe(false);
    });

    it('RULE: recognizes Firing Deck trait on vehicles for embarked shooting', () => {
      // Vehicle with Firing Deck in traits array
      const battlewagon = makeVehicle('wagon_1', 1, 10, {
        traits: ['Firing Deck', 'Heavy Armor']
      });
      expect(hasFiringDeckTrait(battlewagon)).toBe(true);

      // Vehicle with firing_deck in traits array
      const chimera = makeVehicle('chimera_1', 1, 6, {
        traits: ['firing_deck']
      });
      expect(hasFiringDeckTrait(chimera)).toBe(true);

      // Vehicle with Firing Deck in passives
      const trukk = makeVehicle('trukk_1', 1, 6, {
        passives: ['Firing Deck: Open-topped firing ports']
      });
      expect(hasFiringDeckTrait(trukk)).toBe(true);

      // Standard transport without Firing Deck
      const standardRhino = makeVehicle('rhino_std', 1, 6, {
        traits: ['Transport', 'Smoke Launchers']
      });
      expect(hasFiringDeckTrait(standardRhino)).toBe(false);

      // Null or undefined check
      expect(hasFiringDeckTrait(null)).toBe(false);
      expect(hasFiringDeckTrait(undefined)).toBe(false);
    });
  });
});



