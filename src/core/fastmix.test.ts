import { describe, expect, it } from 'vitest';
import { deltaEOklab, hexToOklab } from './color.ts';
import { fastMixOklab, fastPaint } from './fastmix.ts';
import { mixRecipe } from './mix.ts';
import { paintById } from './paints.ts';
import { randomRecipe, seededRandom } from './test-utils.ts';

describe('fastMixOklab', () => {
  it('matches mixRecipe within deltaE 0.5 for 200 random recipes', () => {
    const rand = seededRandom(7);
    let worst = 0;
    for (let i = 0; i < 200; i++) {
      const recipe = randomRecipe(rand);
      const fast = fastMixOklab(
        recipe.map((p) => fastPaint(paintById(p.paintId))),
        recipe.map((p) => p.parts),
        recipe.length,
      );
      const dE = deltaEOklab(fast, hexToOklab(mixRecipe(recipe)));
      worst = Math.max(worst, dE);
      expect(dE, JSON.stringify(recipe)).toBeLessThan(0.5);
    }
    console.log(`fastMixOklab worst deltaE vs mixRecipe over 200 recipes: ${worst.toFixed(3)}`);
  });
});
