import { describe, expect, it } from 'vitest';
import { getRecipe } from '../data/recipes';
import type { MealPlan, MealPreferences } from './types';
import {
  createPantryItems,
  effectiveIngredients,
  formatAmount,
  missingIngredients,
  rankRecipes,
  resolveSubstitution,
} from './meal-engine';

const preferences: MealPreferences = {
  servings: 2,
  maxMinutes: 25,
  diet: 'vegetarian',
  prioritizeUseSoon: true,
};

describe('meal engine', () => {
  it('normalizes mixed English and German pantry names without duplicates', () => {
    const pantry = createPantryItems(['Eggs', 'Tomaten', 'Reis', 'Eier']);
    expect(pantry.map((item) => item.ingredientId)).toEqual(['egg', 'tomato', 'rice']);
  });

  it('deterministically selects the signature dinner for the golden pantry', () => {
    const matches = rankRecipes(createPantryItems(['eggs', 'tomatoes', 'rice']), preferences);
    expect(matches[0].recipe.id).toBe('golden-tomato-rice');
    expect(matches[0].matchedCount).toBeGreaterThanOrEqual(3);
  });

  it('scales ingredient quantities and formats common fractions', () => {
    const recipe = getRecipe('golden-tomato-rice')!;
    const plan: MealPlan = { recipeId: recipe.id, servings: 4, substitutions: {}, createdAt: 1, updatedAt: 1 };
    const rice = effectiveIngredients(recipe, plan).find((ingredient) => ingredient.id === 'rice');
    expect(rice?.amount).toBe(320);
    expect(formatAmount(0.5, 'piece')).toBe('½');
  });

  it('applies substitution before calculating missing shopping items', () => {
    const recipe = getRecipe('golden-tomato-rice')!;
    const resolved = resolveSubstitution(recipe, 'milk', 'oat milk', {});
    if ('error' in resolved) throw new Error(resolved.error);
    const plan: MealPlan = {
      recipeId: recipe.id,
      servings: 2,
      substitutions: { [resolved.line.id]: resolved.swap },
      createdAt: 1,
      updatedAt: 1,
    };
    const missing = missingIngredients(recipe, plan, createPantryItems(['eggs', 'tomatoes', 'rice']));
    expect(missing.some((item) => item.ingredientId === 'oat-milk')).toBe(true);
    expect(missing.some((item) => item.ingredientId === 'whole-milk')).toBe(false);
  });
});
