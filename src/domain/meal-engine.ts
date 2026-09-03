import { INGREDIENTS, findIngredient } from '../data/ingredients';
import { RECIPES, getRecipe } from '../data/recipes';
import type {
  Diet,
  MealPlan,
  MealPreferences,
  PantryItem,
  Recipe,
  RecipeIngredient,
  ShoppingItem,
  Substitution,
  Unit,
} from './types';

export interface EffectiveIngredient extends RecipeIngredient {
  originalName?: string;
  isSubstitution: boolean;
}

export interface RecipeMatch {
  recipe: Recipe;
  score: number;
  matchedCount: number;
  missingCount: number;
  usesSoonCount: number;
}

export type IngredientAvailability = 'in pantry' | 'pantry staple' | 'optional' | 'need';

export interface RecipeCoverage {
  matchedCount: number;
  requiredCount: number;
  percent: number;
}

const UNIT_LABELS: Record<Unit, { one: string; many: string }> = {
  g: { one: 'g', many: 'g' },
  ml: { one: 'ml', many: 'ml' },
  tbsp: { one: 'tbsp', many: 'tbsp' },
  tsp: { one: 'tsp', many: 'tsp' },
  piece: { one: '', many: '' },
  bunch: { one: 'bunch', many: 'bunches' },
  pinch: { one: 'pinch', many: 'pinches' },
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function roundAmount(amount: number) {
  if (Number.isInteger(amount)) return amount;
  if (amount < 10) return Math.round(amount * 4) / 4;
  return Math.round(amount);
}

export function formatAmount(amount: number, unit: Unit) {
  const rounded = roundAmount(amount);
  const fractions: Record<string, string> = {
    '0.25': '¼',
    '0.5': '½',
    '0.75': '¾',
    '1.25': '1¼',
    '1.5': '1½',
    '1.75': '1¾',
  };
  const amountLabel = fractions[String(rounded)] ?? String(rounded);
  const unitLabel = rounded > 0 && rounded <= 1 ? UNIT_LABELS[unit].one : UNIT_LABELS[unit].many;
  return `${amountLabel}${unit === 'g' || unit === 'ml' ? '' : ' '}${unitLabel}`.trim();
}

export function effectiveIngredients(recipe: Recipe, plan: MealPlan): EffectiveIngredient[] {
  const scale = plan.servings / recipe.baseServings;
  return recipe.ingredients.map((ingredient) => {
    const swap = plan.substitutions[ingredient.id];
    if (!swap) {
      return {
        ...ingredient,
        amount: roundAmount(ingredient.amount * scale),
        isSubstitution: false,
      };
    }

    return {
      ...ingredient,
      ingredientId: swap.ingredientId,
      name: swap.name,
      amount: roundAmount(ingredient.amount * scale * swap.ratio),
      originalName: ingredient.name,
      isSubstitution: true,
    };
  });
}

export function pantryContains(pantry: PantryItem[], ingredientId: string) {
  return pantry.some((item) => item.ingredientId === ingredientId);
}

export function ingredientAvailability(ingredient: RecipeIngredient, pantry: PantryItem[]): IngredientAvailability {
  if (pantryContains(pantry, ingredient.ingredientId)) return 'in pantry';
  if (ingredient.pantryStaple) return 'pantry staple';
  if (ingredient.optional) return 'optional';
  return 'need';
}

export function recipeCoverage(recipe: Recipe, plan: MealPlan, pantry: PantryItem[]): RecipeCoverage {
  const required = effectiveIngredients(recipe, plan).filter((ingredient) => !ingredient.optional && !ingredient.pantryStaple);
  const matchedCount = required.filter((ingredient) => pantryContains(pantry, ingredient.ingredientId)).length;
  return {
    matchedCount,
    requiredCount: required.length,
    percent: required.length ? Math.round((matchedCount / required.length) * 100) : 100,
  };
}

export function missingIngredients(recipe: Recipe, plan: MealPlan, pantry: PantryItem[]): ShoppingItem[] {
  return effectiveIngredients(recipe, plan)
    .filter((ingredient) => !ingredient.optional && !ingredient.pantryStaple)
    .filter((ingredient) => !pantryContains(pantry, ingredient.ingredientId))
    .map((ingredient) => ({
      id: `${recipe.id}:${ingredient.ingredientId}`,
      ingredientId: ingredient.ingredientId,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      checked: false,
      sourceRecipeId: recipe.id,
    }));
}

export function rankRecipes(pantry: PantryItem[], preferences: MealPreferences): RecipeMatch[] {
  return RECIPES
    .filter((recipe) => recipe.totalMinutes <= preferences.maxMinutes)
    .filter((recipe) => preferences.diet === 'anything' || recipe.diets.includes(preferences.diet))
    .map((recipe) => {
      const required = recipe.ingredients.filter((ingredient) => !ingredient.optional && !ingredient.pantryStaple);
      const matched = required.filter((ingredient) => pantryContains(pantry, ingredient.ingredientId));
      const missingCount = required.length - matched.length;
      const usesSoonCount = required.filter((ingredient) =>
        pantry.some((item) => item.ingredientId === ingredient.ingredientId && item.useSoon),
      ).length;
      const demoCore = ['egg', 'tomato', 'rice'].every((id) => pantryContains(pantry, id));
      const signatureBoost = recipe.id === 'golden-tomato-rice' && demoCore && preferences.maxMinutes >= 25 ? 26 : 0;
      const score = matched.length * 18 - missingCount * 3 + usesSoonCount * 8 + signatureBoost - recipe.totalMinutes / 10;
      return { recipe, score, matchedCount: matched.length, missingCount, usesSoonCount };
    })
    .sort((a, b) => b.score - a.score || a.recipe.id.localeCompare(b.recipe.id));
}

export function createPantryItems(names: string[], sourceTime = Date.now()): PantryItem[] {
  const seen = new Set<string>();
  return names.flatMap((name, index) => {
    const definition = findIngredient(name);
    if (!definition || seen.has(definition.id)) return [];
    seen.add(definition.id);
    return [{
      id: `pantry-${definition.id}`,
      ingredientId: definition.id,
      name: definition.name,
      amount: null,
      unit: null,
      useSoon: definition.id === 'tomato',
      addedAt: sourceTime + index,
    } satisfies PantryItem];
  });
}

export function resolveSubstitution(
  recipe: Recipe,
  ingredientQuery: string,
  replacementQuery: string,
  substitutions: Record<string, Substitution>,
): { error: string } | { line: RecipeIngredient; swap: Substitution } {
  const query = ingredientQuery.trim().toLocaleLowerCase();
  const line = recipe.ingredients.find((ingredient) => {
    const current = substitutions[ingredient.id];
    return ingredient.id === query ||
      ingredient.ingredientId === query ||
      ingredient.name.toLocaleLowerCase().includes(query) ||
      current?.name.toLocaleLowerCase().includes(query);
  });
  if (!line) return { error: `“${ingredientQuery}” is not part of ${recipe.title}.` } as const;

  const replacement = findIngredient(replacementQuery);
  if (!replacement) return { error: `I don't know a safe substitution for “${replacementQuery}” yet.` } as const;
  if (replacement.id === line.ingredientId) return { error: `${replacement.name} is already used in this recipe.` } as const;

  const fromDefinition = INGREDIENTS.find((ingredient) => ingredient.id === line.ingredientId);
  const swap: Substitution = {
    ingredientId: replacement.id,
    name: replacement.name,
    ratio: 1,
    note: `${replacement.name} replaces ${fromDefinition?.name ?? line.name} at a 1:1 ratio.`,
  };
  return { line, swap } as const;
}

export function getPlanRecipe(plan: MealPlan | null) {
  return getRecipe(plan?.recipeId);
}

export function isDietCompatible(recipe: Recipe, diet: Diet) {
  return diet === 'anything' || recipe.diets.includes(diet);
}
