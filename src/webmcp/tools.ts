/// <reference types="webmcp-types" />

import { z } from 'zod';
import { RECIPES, getRecipe } from '../data/recipes';
import { effectiveIngredients, formatAmount, getPlanRecipe, missingIngredients, recipeCoverage } from '../domain/meal-engine';
import { usePantryStore, type WebMcpStatus } from '../store/usePantryStore';

export const TOOL_CATALOG = [
  { name: 'get_kitchen_state', title: 'Read kitchen', short: 'Pantry, preferences and active plan', readOnly: true },
  { name: 'plan_dinner', title: 'Plan dinner', short: 'Choose the best meal from what is available', readOnly: false },
  { name: 'select_dinner', title: 'Select dinner', short: 'Make a recipe the active dinner plan', readOnly: false },
  { name: 'adjust_servings', title: 'Adjust servings', short: 'Scale every ingredient amount', readOnly: false },
  { name: 'replace_ingredient', title: 'Replace ingredient', short: 'Apply a visible recipe substitution', readOnly: false },
  { name: 'add_missing_to_shopping_list', title: 'Review missing items', short: 'Open a human-confirmed shopping review', readOnly: false },
  { name: 'prepare_grocery_checkout', title: 'Prepare grocery review', short: 'Open the final user-only confirmation', readOnly: false },
  { name: 'start_cooking_mode', title: 'Start cooking', short: 'Enter guided step-by-step mode', readOnly: false },
  { name: 'advance_cooking_step', title: 'Advance cooking step', short: 'Complete the current instruction', readOnly: false },
  { name: 'set_cooking_timer', title: 'Set cooking timer', short: 'Start a named, persistent timer', readOnly: false },
] as const;

export type ToolExecutionResult = Record<string, unknown>;

const emptySchema = z.object({}).strict();
const planSchema = z.object({
  availableIngredients: z.array(z.string().min(1).max(80)).min(1).max(30).optional(),
  servings: z.number().int().min(1).max(8).optional(),
  diet: z.enum(['vegetarian', 'vegan', 'anything']).optional(),
  maxMinutes: z.number().int().min(10).max(60).optional(),
}).strict();
const recipeSchema = z.object({ recipeId: z.enum(RECIPES.map((recipe) => recipe.id) as [string, ...string[]]) }).strict();
const servingsSchema = z.object({ servings: z.number().int().min(1).max(8) }).strict();
const replacementSchema = z.object({
  ingredient: z.string().min(1).max(80),
  replacement: z.string().min(1).max(80),
}).strict();
const shoppingSchema = z.object({ continueToCooking: z.boolean().optional() }).strict();
const timerSchema = z.object({
  label: z.string().min(1).max(80),
  durationSeconds: z.number().int().min(1).max(14_400),
}).strict();

function errorResult(action: string, error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      action,
      code: 'INVALID_INPUT',
      message: error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; '),
      recoverable: true,
    };
  }
  return {
    ok: false,
    action,
    code: 'TOOL_FAILED',
    message: error instanceof Error ? error.message : 'The tool could not be completed.',
    recoverable: true,
  };
}

function okResult(action: string, message: string, data?: Record<string, unknown>) {
  return {
    ok: true,
    action,
    message,
    revision: usePantryStore.getState().revision,
    ...(data ? { data } : {}),
  };
}

function stateSummary() {
  const state = usePantryStore.getState();
  const recipe = getPlanRecipe(state.plan);
  const plan = state.plan;
  return {
    pantry: state.pantry.map((item) => ({ name: item.name, useSoon: item.useSoon })),
    preferences: state.preferences,
    plan: recipe && plan ? {
      recipeId: recipe.id,
      title: recipe.title,
      servings: plan.servings,
      minutes: recipe.totalMinutes,
      substitutions: Object.values(plan.substitutions).map((swap) => swap.name),
      coverage: recipeCoverage(recipe, plan, state.pantry),
      ingredients: effectiveIngredients(recipe, plan).map((ingredient) => ({
        name: ingredient.name,
        amount: formatAmount(ingredient.amount, ingredient.unit),
        substituted: ingredient.isSubstitution,
      })),
      missing: missingIngredients(recipe, plan, state.pantry).map((item) => item.name),
    } : null,
    shoppingList: state.shoppingItems.map((item) => ({ name: item.name, checked: item.checked })),
    cooking: state.cookingSession ? {
      status: state.cookingSession.status,
      currentStep: state.cookingSession.currentStepIndex + 1,
    } : null,
    activeTimers: Object.values(state.timers).filter((timer) => timer.status !== 'completed').map((timer) => ({
      label: timer.label,
      status: timer.status,
    })),
  };
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Tool execution was cancelled.', 'AbortError');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function compactJson(value: unknown, maximum = 150) {
  const serialized = JSON.stringify(value ?? {});
  return serialized.length <= maximum ? serialized : `${serialized.slice(0, maximum - 1)}…`;
}

function summarizeInput(input: unknown) {
  const record = asRecord(input);
  return record && Object.keys(record).length > 0 ? compactJson(record) : 'No arguments';
}

function summarizeOutput(output: unknown) {
  const record = asRecord(output);
  const message = typeof record?.message === 'string' ? record.message : 'Tool finished.';
  const data = asRecord(record?.data);
  return data?.confirmationRequired === true ? `Waiting for your approval · ${message}` : message;
}

function traceStatus(output: unknown) {
  const record = asRecord(output);
  const data = asRecord(record?.data);
  if (record?.ok !== true) return 'error' as const;
  if (data?.confirmationRequired === true) return 'needs-user' as const;
  return 'success' as const;
}

function tool<T extends z.ZodType<Record<string, unknown>>>(
  definition: Omit<WebMCP.ModelContextTool, 'execute'>,
  schema: T,
  execute: (input: z.infer<T>) => unknown | Promise<unknown>,
): WebMCP.ModelContextTool {
  return {
    ...definition,
    execute: async (input, options) => {
      const traceId = usePantryStore.getState().startToolTrace(definition.name, summarizeInput(input));
      // Some Chrome origin-trial builds still omit the callback options object.
      // Keep cancellation support where present while remaining trial-compatible.
      const signal = options?.signal ?? new AbortController().signal;
      try {
        throwIfAborted(signal);
        const parsed = schema.parse(input);
        const output = await execute(parsed);
        throwIfAborted(signal);
        usePantryStore.getState().finishToolTrace(traceId, traceStatus(output), summarizeOutput(output));
        return output;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          usePantryStore.getState().finishToolTrace(traceId, 'error', 'Tool execution was cancelled.');
          throw error;
        }
        const output = errorResult(definition.name, error);
        usePantryStore.getState().finishToolTrace(traceId, 'error', summarizeOutput(output));
        return output;
      }
    },
  };
}

export function createWebMcpTools(): WebMCP.ModelContextTool[] {
  return [
    tool({
      name: 'get_kitchen_state',
      title: 'Read kitchen state',
      description: 'Read the visible PantryPilot pantry, meal preferences, current recipe, shopping list, cooking progress and timers. Use before planning or adapting dinner.',
       inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
    }, emptySchema, () => okResult('get_kitchen_state', 'Kitchen state read.', stateSummary())),

    tool({
      name: 'plan_dinner',
      title: 'Plan dinner',
      description: 'Plan and visibly select the best dinner for the current or supplied pantry. Respects servings, diet and maximum cooking time.',
      inputSchema: {
        type: 'object',
        properties: {
          availableIngredients: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 30, description: 'Ingredient names available now.' },
          servings: { type: 'integer', minimum: 1, maximum: 8 },
          diet: { type: 'string', enum: ['vegetarian', 'vegan', 'anything'] },
          maxMinutes: { type: 'integer', minimum: 10, maximum: 60 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
    }, planSchema, (input) => {
      const result = usePantryStore.getState().planDinner({ ...input, source: 'agent' });
      return result.ok
        ? okResult('plan_dinner', result.message, { recipeId: result.recipeId, state: stateSummary() })
        : errorResult('plan_dinner', new Error(result.message));
    }),

    tool({
      name: 'select_dinner',
      title: 'Select dinner',
      description: 'Select one PantryPilot recipe as the active plan. Use after reading the kitchen or when the user names a specific option.',
      inputSchema: {
        type: 'object',
        properties: { recipeId: { type: 'string', enum: RECIPES.map((recipe) => recipe.id) } },
        required: ['recipeId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
    }, recipeSchema, ({ recipeId }) => {
      const result = usePantryStore.getState().selectRecipe(recipeId, 'agent');
      return result.ok ? okResult('select_dinner', result.message, { recipe: getRecipe(recipeId)?.title }) : errorResult('select_dinner', new Error(result.message));
    }),

    tool({
      name: 'adjust_servings',
      title: 'Adjust servings',
      description: 'Scale the active dinner to a number of people from 1 to 8. All visible ingredient quantities update immediately.',
      inputSchema: {
        type: 'object',
        properties: { servings: { type: 'integer', minimum: 1, maximum: 8 } },
        required: ['servings'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
    }, servingsSchema, ({ servings }) => {
      const result = usePantryStore.getState().adjustServings(servings, 'agent');
      return result.ok ? okResult('adjust_servings', result.message) : errorResult('adjust_servings', new Error(result.message));
    }),

    tool({
      name: 'replace_ingredient',
      title: 'Replace ingredient',
      description: 'Replace one ingredient in the active recipe with a known safe alternative. The recipe and missing-shopping calculation update visibly.',
      inputSchema: {
        type: 'object',
        properties: {
          ingredient: { type: 'string', minLength: 1, maxLength: 80, description: 'Ingredient currently in the recipe, for example milk.' },
          replacement: { type: 'string', minLength: 1, maxLength: 80, description: 'Known replacement, for example oat milk.' },
        },
        required: ['ingredient', 'replacement'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
    }, replacementSchema, ({ ingredient, replacement }) => {
      const result = usePantryStore.getState().replaceIngredient(ingredient, replacement, 'agent');
      return result.ok ? okResult('replace_ingredient', result.message, { state: stateSummary() }) : errorResult('replace_ingredient', new Error(result.message));
    }),

    tool({
      name: 'add_missing_to_shopping_list',
      title: 'Review missing ingredients',
      description: 'Prepare missing recipe ingredients in a visible review sheet. This never adds or buys anything until the user confirms in the page.',
      inputSchema: {
        type: 'object',
        properties: { continueToCooking: { type: 'boolean', description: 'Start cooking after the user approves the prepared list.' } },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
    }, shoppingSchema, (input) => {
      const result = usePantryStore.getState().proposeShoppingList('agent', input.continueToCooking ?? false);
      return result.ok
        ? okResult('add_missing_to_shopping_list', result.message, { count: result.count, confirmationRequired: result.count > 0 })
        : errorResult('add_missing_to_shopping_list', new Error(result.message));
    }),

    tool({
      name: 'prepare_grocery_checkout',
      title: 'Prepare grocery review',
      description: 'Open the final grocery review. This tool cannot place an order or approve payment; only the user can confirm the visible page action.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
    }, emptySchema, () => {
      const result = usePantryStore.getState().prepareCheckout('agent');
      return result.ok
        ? okResult('prepare_grocery_checkout', result.message, { confirmationRequired: true })
        : errorResult('prepare_grocery_checkout', new Error(result.message));
    }),

    tool({
      name: 'start_cooking_mode',
      title: 'Start cooking mode',
      description: 'Start the selected recipe as a guided, full-screen cooking session with persistent progress.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
    }, emptySchema, () => {
      const result = usePantryStore.getState().startCooking('agent');
      return result.ok ? okResult('start_cooking_mode', result.message) : errorResult('start_cooking_mode', new Error(result.message));
    }),

    tool({
      name: 'advance_cooking_step',
      title: 'Advance cooking step',
      description: 'Mark the current cooking instruction complete and visibly advance to the next step. On the final step, mark dinner ready.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
    }, emptySchema, () => {
      const result = usePantryStore.getState().advanceCookingStep('agent');
      return result.ok ? okResult('advance_cooking_step', result.message, { completed: result.completed ?? false }) : errorResult('advance_cooking_step', new Error(result.message));
    }),

    tool({
      name: 'set_cooking_timer',
      title: 'Set cooking timer',
      description: 'Start a named timer from 1 second to 4 hours. It stays visible and survives page reloads.',
      inputSchema: {
        type: 'object',
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 80 },
          durationSeconds: { type: 'integer', minimum: 1, maximum: 14400 },
        },
        required: ['label', 'durationSeconds'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
    }, timerSchema, ({ label, durationSeconds }) => {
      const result = usePantryStore.getState().startTimer(label, durationSeconds, null, 'agent');
      return result.ok ? okResult('set_cooking_timer', result.message, { timerId: result.timerId }) : errorResult('set_cooking_timer', new Error(result.message));
    }),
  ];
}

/**
 * The in-page agent console uses this same validated execution surface as the
 * browser's WebMCP registration. Keeping the dispatcher here means both paths
 * produce the same trace events and state transitions.
 */
export async function executeWebMcpTool(
  name: string,
  input: Record<string, unknown> = {},
  signal: AbortSignal = new AbortController().signal,
): Promise<ToolExecutionResult> {
  const definition = createWebMcpTools().find((candidate) => candidate.name === name);
  if (!definition) {
    return { ok: false, action: name, code: 'UNKNOWN_TOOL', message: `Unknown tool “${name}”.`, recoverable: true };
  }
  return definition.execute(input, { signal }) as Promise<ToolExecutionResult>;
}

let registrationController: AbortController | null = null;

export async function registerWebMcpTools(onStatus: (status: WebMcpStatus) => void) {
  if (!globalThis.isSecureContext || !document.modelContext?.registerTool) {
    onStatus('unavailable');
    return () => undefined;
  }

  registrationController?.abort();
  const controller = new AbortController();
  registrationController = controller;

  try {
    const results = await Promise.allSettled(
      createWebMcpTools().map((definition) => document.modelContext!.registerTool(definition, { signal: controller.signal })),
    );
    const rejected = results.filter((result) => result.status === 'rejected');
    if (rejected.length === results.length) {
      onStatus('error');
    } else {
      onStatus('connected');
    }
  } catch {
    onStatus('error');
  }

  return () => {
    if (registrationController === controller) registrationController = null;
    controller.abort();
  };
}
