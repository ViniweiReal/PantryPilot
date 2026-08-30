export type Diet = 'vegetarian' | 'vegan' | 'anything';
export type Unit = 'g' | 'ml' | 'tbsp' | 'tsp' | 'piece' | 'bunch' | 'pinch';

export interface IngredientDefinition {
  id: string;
  name: string;
  aliases: string[];
  category: 'produce' | 'protein' | 'grain' | 'dairy' | 'pantry';
  vegan: boolean;
}

export interface PantryItem {
  id: string;
  ingredientId: string;
  name: string;
  amount: number | null;
  unit: Unit | null;
  useSoon: boolean;
  addedAt: number;
}

export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  name: string;
  amount: number;
  unit: Unit;
  optional?: boolean;
  pantryStaple?: boolean;
}

export interface RecipeStep {
  id: string;
  eyebrow: string;
  title: string;
  instruction: string;
  minutes: number;
  timerSeconds?: number;
  timerLabel?: string;
}

export interface Recipe {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  imageAlt: string;
  baseServings: number;
  totalMinutes: number;
  difficulty: 'Easy' | 'Medium';
  diets: Array<Exclude<Diet, 'anything'>>;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  accent: 'tomato' | 'basil' | 'yolk' | 'aubergine';
}

export interface Substitution {
  ingredientId: string;
  name: string;
  ratio: number;
  note: string;
}

export interface MealPlan {
  recipeId: string;
  servings: number;
  substitutions: Record<string, Substitution>;
  createdAt: number;
  updatedAt: number;
}

export interface ShoppingItem {
  id: string;
  ingredientId: string;
  name: string;
  amount: number;
  unit: Unit;
  checked: boolean;
  sourceRecipeId: string;
}

export interface MealPreferences {
  servings: number;
  maxMinutes: number;
  diet: Diet;
  prioritizeUseSoon: boolean;
}

export interface CookingSession {
  id: string;
  planSnapshot: MealPlan;
  currentStepIndex: number;
  completedStepIds: string[];
  status: 'active' | 'completed';
  startedAt: number;
  completedAt?: number;
}

export interface CookingTimer {
  id: string;
  label: string;
  stepId: string | null;
  durationSeconds: number;
  status: 'running' | 'paused' | 'completed';
  endsAt: number | null;
  remainingWhenPaused: number | null;
}

export interface ActivityEvent {
  id: string;
  message: string;
  detail?: string;
  source: 'you' | 'agent' | 'system';
  kind: 'plan' | 'swap' | 'list' | 'cook' | 'timer' | 'pantry';
  createdAt: number;
}

export type ToolTraceStatus = 'running' | 'success' | 'needs-user' | 'error';

export interface ToolTraceEvent {
  id: string;
  toolName: string;
  inputSummary: string;
  resultSummary?: string;
  status: ToolTraceStatus;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
}

export interface PendingShoppingReview {
  items: ShoppingItem[];
  source: 'you' | 'agent';
  continueToCooking?: boolean;
}

export interface ToastMessage {
  id: string;
  title: string;
  detail?: string;
  tone?: 'default' | 'success';
}
