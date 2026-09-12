import { describe, it, expect } from 'vitest';
import { 
  checkShapeOverlap, 
  calculateFormationOffsets 
} from '../formationEngine';
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
