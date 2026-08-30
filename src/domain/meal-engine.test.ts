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

  it('recognizes the expanded fresh ingredient shelf in English and German', () => {
    const pantry = createPantryItems(['Knoblauch', 'baby spinach', 'Pilze', 'rote paprika', 'Kartoffeln', 'Naturtofu']);
    expect(pantry.map((item) => item.ingredientId)).toEqual([
      'garlic',
      'spinach',
      'mushroom',
      'bell-pepper',
      'potato',
      'tofu',
    ]);
  });

  it('deterministically selects the signature dinner for the golden pantry', () => {
    const matches = rankRecipes(createPantryItems(['eggs', 'tomatoes', 'rice']), preferences);
    expect(matches[0].recipe.id).toBe('golden-tomato-rice');
    expect(matches[0].matchedCount).toBeGreaterThanOrEqual(3);
  });

  it.each([
    {
      label: 'a 15-minute tomato and egg pantry',
      pantry: ['eggs', 'tomatoes', 'rice'],
      preferences: { ...preferences, maxMinutes: 15 },
      expected: 'tomato-egg-bowl',
    },
    {
      label: 'a basil-heavy fried-rice pantry',
      pantry: ['rice', 'tomatoes', 'eggs', 'basil', 'scallions'],
      preferences: { ...preferences, maxMinutes: 20 },
      expected: 'herby-fried-rice',
    },
    {
      label: 'a complete shakshuka pantry',
      pantry: ['tomatoes', 'eggs', 'red onion', 'flatbread'],
      preferences,
      expected: 'weeknight-shakshuka',
    },
    {
      label: 'a plant-based coconut pantry',
      pantry: ['rice', 'tomatoes', 'chickpeas', 'coconut milk', 'lemon'],
      preferences: { ...preferences, diet: 'vegan' as const, maxMinutes: 30 },
      expected: 'coconut-tomato-rice',
    },
  ])('selects a different best match for $label', ({ pantry, preferences: scenarioPreferences, expected }) => {
    expect(rankRecipes(createPantryItems(pantry), scenarioPreferences)[0].recipe.id).toBe(expected);
  });

  it('keeps all six recipes discoverable when browsing beyond active filters', () => {
    const matches = rankRecipes(createPantryItems(['eggs', 'tomatoes', 'rice']), {
      ...preferences,
      diet: 'anything',
      maxMinutes: 60,
    });
    expect(new Set(matches.map((match) => match.recipe.id))).toHaveLength(6);
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
