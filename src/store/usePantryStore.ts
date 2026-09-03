import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getRecipe } from '../data/recipes';
import { findIngredient } from '../data/ingredients';
import {
  clamp,
  createPantryItems,
  getPlanRecipe,
  missingIngredients,
  rankRecipes,
  resolveSubstitution,
} from '../domain/meal-engine';
import type {
  ActivityEvent,
  CookingSession,
  CookingTimer,
  Diet,
  MealPlan,
  MealPreferences,
  PantryItem,
  PendingShoppingReview,
  ShoppingItem,
  ToolTraceEvent,
  ToolTraceStatus,
  ToastMessage,
} from '../domain/types';

export type WebMcpStatus = 'checking' | 'connected' | 'unavailable' | 'error';
export type AppView = 'planner' | 'cooking';

interface PlanDinnerInput {
  availableIngredients?: string[];
  servings?: number;
  diet?: Diet;
  maxMinutes?: number;
  source?: 'you' | 'agent';
}

interface PantryPilotState {
  revision: number;
  pantry: PantryItem[];
  preferences: MealPreferences;
  plan: MealPlan | null;
  shoppingItems: ShoppingItem[];
  cookingSession: CookingSession | null;
  timers: Record<string, CookingTimer>;
  activity: ActivityEvent[];
  toolTrace: ToolTraceEvent[];
  view: AppView;
  pendingShoppingReview: PendingShoppingReview | null;
  checkoutOpen: boolean;
  toast: ToastMessage | null;
  webMcpStatus: WebMcpStatus;
  isAgentRunning: boolean;
  setWebMcpStatus: (status: WebMcpStatus) => void;
  setAgentRunning: (running: boolean) => void;
  setView: (view: AppView) => void;
  setPreferences: (patch: Partial<MealPreferences>) => void;
  startToolTrace: (toolName: string, inputSummary: string) => string;
  finishToolTrace: (id: string, status: ToolTraceStatus, resultSummary: string) => void;
  resolveToolTrace: (toolName: string, status: ToolTraceStatus, resultSummary: string) => void;
  clearToolTrace: () => void;
  addPantryItem: (query: string, source?: 'you' | 'agent') => { ok: boolean; message: string };
  removePantryItem: (id: string) => void;
  toggleUseSoon: (id: string) => void;
  planDinner: (input?: PlanDinnerInput) => { ok: boolean; message: string; recipeId?: string };
  selectRecipe: (recipeId: string, source?: 'you' | 'agent') => { ok: boolean; message: string };
  adjustServings: (servings: number, source?: 'you' | 'agent') => { ok: boolean; message: string };
  replaceIngredient: (ingredient: string, replacement: string, source?: 'you' | 'agent') => { ok: boolean; message: string };
  proposeShoppingList: (source?: 'you' | 'agent', continueToCooking?: boolean) => { ok: boolean; message: string; count: number };
  confirmShoppingList: () => void;
  cancelShoppingReview: () => void;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  clearCheckedShoppingItems: () => void;
  prepareCheckout: (source?: 'you' | 'agent') => { ok: boolean; message: string };
  closeCheckout: () => void;
  confirmCheckout: () => void;
  startCooking: (source?: 'you' | 'agent') => { ok: boolean; message: string };
  goToCookingStep: (index: number) => void;
  advanceCookingStep: (source?: 'you' | 'agent', options?: { skipTimer?: boolean }) => { ok: boolean; message: string; completed?: boolean };
  exitCooking: () => void;
  startTimer: (label: string, durationSeconds: number, stepId?: string | null, source?: 'you' | 'agent') => { ok: boolean; message: string; timerId?: string };
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  removeTimer: (id: string) => void;
  reconcileTimers: () => void;
  dismissToast: () => void;
  resetDemo: (options?: { silent?: boolean }) => void;
}

const uid = (prefix: string) => `${prefix}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

const createDefaultPantry = () => createPantryItems(['eggs', 'tomatoes', 'rice']);

const defaultPreferences: MealPreferences = {
  servings: 2,
  maxMinutes: 25,
  diet: 'vegetarian',
  prioritizeUseSoon: true,
};

function createDefaultPlan(): MealPlan {
  const now = Date.now();
  return {
    recipeId: 'golden-tomato-rice',
    servings: 2,
    substitutions: {},
    createdAt: now,
    updatedAt: now,
  };
}

const welcomeActivity = (): ActivityEvent[] => [{
  id: uid('activity'),
  message: 'Kitchen ready',
  detail: 'Three ingredients are waiting in your pantry.',
  source: 'system',
  kind: 'pantry',
  createdAt: Date.now(),
}];

function activity(message: string, detail: string | undefined, source: 'you' | 'agent' | 'system', kind: ActivityEvent['kind']): ActivityEvent {
  return { id: uid('activity'), message, detail, source, kind, createdAt: Date.now() };
}

function pushActivity(events: ActivityEvent[], event: ActivityEvent) {
  return [event, ...events].slice(0, 30);
}

function toast(title: string, detail?: string): ToastMessage {
  return { id: uid('toast'), title, detail, tone: 'success' };
}

export const usePantryStore = create<PantryPilotState>()(persist((set, get) => ({
  revision: 1,
  pantry: createDefaultPantry(),
  preferences: defaultPreferences,
  plan: createDefaultPlan(),
  shoppingItems: [],
  cookingSession: null,
  timers: {},
  activity: welcomeActivity(),
  toolTrace: [],
  view: 'planner',
  pendingShoppingReview: null,
  checkoutOpen: false,
  toast: null,
  webMcpStatus: 'checking',
  isAgentRunning: false,

  setWebMcpStatus: (webMcpStatus) => set({ webMcpStatus }),
  setAgentRunning: (isAgentRunning) => set({ isAgentRunning }),
  setView: (view) => set({ view }),

  startToolTrace: (toolName, inputSummary) => {
    const id = uid('trace');
    const event: ToolTraceEvent = {
      id,
      toolName,
      inputSummary,
      status: 'running',
      startedAt: Date.now(),
    };
    set((state) => ({ toolTrace: [event, ...state.toolTrace].slice(0, 20) }));
    return id;
  },

  finishToolTrace: (id, status, resultSummary) => set((state) => ({
    toolTrace: state.toolTrace.map((event) => {
      if (event.id !== id) return event;
      const completedAt = Date.now();
      return {
        ...event,
        status,
        resultSummary,
        completedAt,
        durationMs: Math.max(1, completedAt - event.startedAt),
      };
    }),
  })),

  resolveToolTrace: (toolName, status, resultSummary) => set((state) => {
    const target = state.toolTrace.find((event) => event.toolName === toolName && event.status === 'needs-user');
    if (!target) return state;
    const completedAt = Date.now();
    return {
      toolTrace: state.toolTrace.map((event) => event.id === target.id ? {
        ...event,
        status,
        resultSummary,
        completedAt,
        durationMs: Math.max(1, completedAt - event.startedAt),
      } : event),
    };
  }),

  clearToolTrace: () => set({ toolTrace: [] }),

  setPreferences: (patch) => set((state) => ({
    preferences: {
      ...state.preferences,
      ...patch,
      servings: patch.servings !== undefined && Number.isFinite(patch.servings) ? clamp(Math.round(patch.servings), 1, 8) : state.preferences.servings,
      maxMinutes: patch.maxMinutes !== undefined && Number.isFinite(patch.maxMinutes) ? clamp(Math.round(patch.maxMinutes), 10, 60) : state.preferences.maxMinutes,
    },
    revision: state.revision + 1,
  })),

  addPantryItem: (query, source = 'you') => {
    const definition = findIngredient(query);
    if (!definition) return { ok: false, message: `I don't recognize “${query}” yet.` };
    if (get().pantry.some((item) => item.ingredientId === definition.id)) {
      return { ok: false, message: `${definition.name} is already in your pantry.` };
    }
    const item: PantryItem = {
      id: uid('pantry'),
      ingredientId: definition.id,
      name: definition.name,
      amount: null,
      unit: null,
      useSoon: false,
      addedAt: Date.now(),
    };
    set((state) => ({
      pantry: [...state.pantry, item],
      activity: pushActivity(state.activity, activity(`Added ${definition.name}`, 'Pantry updated', source, 'pantry')),
      toast: toast(`${definition.name} added`, 'Your recipe matches have been refreshed.'),
      revision: state.revision + 1,
    }));
    return { ok: true, message: `Added ${definition.name} to the pantry.` };
  },

  removePantryItem: (id) => set((state) => ({
    pantry: state.pantry.filter((item) => item.id !== id),
    revision: state.revision + 1,
  })),

  toggleUseSoon: (id) => set((state) => ({
    pantry: state.pantry.map((item) => item.id === id ? { ...item, useSoon: !item.useSoon } : item),
    revision: state.revision + 1,
  })),

  planDinner: (input = {}) => {
    const state = get();
    const source = input.source ?? 'you';
    const pantry = input.availableIngredients?.length
      ? createPantryItems(input.availableIngredients)
      : state.pantry;
    const preferences: MealPreferences = {
      ...state.preferences,
      servings: clamp(input.servings ?? state.preferences.servings, 1, 8),
      maxMinutes: clamp(input.maxMinutes ?? state.preferences.maxMinutes, 10, 60),
      diet: input.diet ?? state.preferences.diet,
    };
    const match = rankRecipes(pantry, preferences)[0];
    if (!match) return { ok: false, message: 'No recipe matches those constraints. Try a little more time or a different diet.' };
    const now = Date.now();
    const plan: MealPlan = {
      recipeId: match.recipe.id,
      servings: preferences.servings,
      substitutions: {},
      createdAt: now,
      updatedAt: now,
    };
    set((current) => ({
      pantry,
      preferences,
      plan,
      view: 'planner',
      cookingSession: null,
      pendingShoppingReview: null,
      activity: pushActivity(current.activity, activity(
        `Planned ${match.recipe.title}`,
        `${preferences.servings} servings · ${match.recipe.totalMinutes} min · ${match.matchedCount} pantry matches`,
        source,
        'plan',
      )),
      toast: toast('Dinner plan ready', `${match.recipe.title} makes the most of what you have.`),
      revision: current.revision + 1,
    }));
    return { ok: true, message: `Selected ${match.recipe.title} for ${preferences.servings}.`, recipeId: match.recipe.id };
  },

  selectRecipe: (recipeId, source = 'you') => {
    const recipe = getRecipe(recipeId);
    if (!recipe) return { ok: false, message: `Recipe “${recipeId}” was not found.` };
    const now = Date.now();
    set((state) => ({
      plan: { recipeId, servings: state.preferences.servings, substitutions: {}, createdAt: now, updatedAt: now },
      activity: pushActivity(state.activity, activity(`Selected ${recipe.title}`, `${recipe.totalMinutes} min · ${recipe.difficulty}`, source, 'plan')),
      toast: toast(`${recipe.title} selected`),
      revision: state.revision + 1,
    }));
    return { ok: true, message: `Selected ${recipe.title}.` };
  },

  adjustServings: (servings, source = 'you') => {
    if (!Number.isFinite(servings)) return { ok: false, message: 'Choose a serving count between 1 and 8.' };
    const nextServings = clamp(Math.round(servings), 1, 8);
    const plan = get().plan;
    if (!plan) return { ok: false, message: 'Choose a recipe before adjusting servings.' };
    set((state) => ({
      plan: state.plan ? { ...state.plan, servings: nextServings, updatedAt: Date.now() } : null,
      preferences: { ...state.preferences, servings: nextServings },
      activity: pushActivity(state.activity, activity(`Scaled to ${nextServings} servings`, 'Every ingredient amount was recalculated.', source, 'plan')),
      toast: toast('Portions updated', `Now cooking for ${nextServings}.`),
      revision: state.revision + 1,
    }));
    return { ok: true, message: `Adjusted the recipe to ${nextServings} servings.` };
  },

  replaceIngredient: (ingredient, replacement, source = 'you') => {
    const plan = get().plan;
    const recipe = getPlanRecipe(plan);
    if (!plan || !recipe) return { ok: false, message: 'Choose a recipe before replacing ingredients.' };
    const result = resolveSubstitution(recipe, ingredient, replacement, plan.substitutions);
    if ('error' in result) return { ok: false, message: result.error };
    set((state) => ({
      plan: state.plan ? {
        ...state.plan,
        substitutions: { ...state.plan.substitutions, [result.line.id]: result.swap },
        updatedAt: Date.now(),
      } : null,
      activity: pushActivity(state.activity, activity(
        `Swapped ${result.line.name}`,
        `${result.swap.name} · ${result.swap.note}`,
        source,
        'swap',
      )),
      toast: toast('Vegan swap applied', `${result.line.name} → ${result.swap.name}`),
      revision: state.revision + 1,
    }));
    return { ok: true, message: `Replaced ${result.line.name} with ${result.swap.name}.` };
  },

  proposeShoppingList: (source = 'you', continueToCooking = false) => {
    const state = get();
    const recipe = getPlanRecipe(state.plan);
    if (!state.plan || !recipe) return { ok: false, message: 'Choose a recipe before building a shopping list.', count: 0 };
    const missing = missingIngredients(recipe, state.plan, state.pantry);
    const onListCount = missing.filter((candidate) => state.shoppingItems.some((item) => item.ingredientId === candidate.ingredientId)).length;
    const items = missing.filter((candidate) => !state.shoppingItems.some((item) => item.ingredientId === candidate.ingredientId));
    if (!items.length) {
      const message = missing.length
        ? `${missing.length} missing ingredients are already on your shopping list.`
        : 'Everything required is already covered.';
      set({ toast: toast(missing.length ? 'Already on your list' : 'You have everything', message) });
      return { ok: true, message, count: 0 };
    }
    set({ pendingShoppingReview: { items, source, continueToCooking } });
    return {
      ok: true,
      message: onListCount ? `${items.length} missing ingredients are ready for review; ${onListCount} already on your list.` : `${items.length} missing ingredients are ready for your review.`,
      count: items.length,
    };
  },

  confirmShoppingList: () => {
    const pendingReview = get().pendingShoppingReview;
    const continueToCooking = pendingReview?.continueToCooking;
    set((state) => {
    const review = state.pendingShoppingReview;
    if (!review) return state;
    const byIngredient = new Map(state.shoppingItems.map((item) => [item.ingredientId, item]));
    review.items.forEach((item) => {
      const existing = byIngredient.get(item.ingredientId);
      byIngredient.set(item.ingredientId, existing ? {
        ...existing,
        amount: Math.max(existing.amount, item.amount),
        unit: item.unit,
        checked: false,
      } : item);
    });
      return {
      shoppingItems: Array.from(byIngredient.values()),
      pendingShoppingReview: null,
      activity: pushActivity(state.activity, activity(
        `Added ${review.items.length} items to the list`,
        'Reviewed and confirmed by you.',
        'you',
        'list',
      )),
      toast: toast('Shopping list updated', `${review.items.length} items added — nothing purchased.`),
      revision: state.revision + 1,
      };
    });
    if (pendingReview) {
      get().resolveToolTrace('add_missing_to_shopping_list', 'success', `User approved ${pendingReview.items.length} items.`);
    }
    if (continueToCooking) window.setTimeout(() => get().startCooking('agent'), 280);
  },

  cancelShoppingReview: () => {
    get().resolveToolTrace('add_missing_to_shopping_list', 'error', 'User chose not to update the shopping list.');
    set({ pendingShoppingReview: null });
  },

  toggleShoppingItem: (id) => set((state) => ({
    shoppingItems: state.shoppingItems.map((item) => item.id === id ? { ...item, checked: !item.checked } : item),
    revision: state.revision + 1,
  })),

  removeShoppingItem: (id) => set((state) => ({
    shoppingItems: state.shoppingItems.filter((item) => item.id !== id),
    revision: state.revision + 1,
  })),

  clearCheckedShoppingItems: () => set((state) => ({
    shoppingItems: state.shoppingItems.filter((item) => !item.checked),
    revision: state.revision + 1,
  })),

  prepareCheckout: (source = 'you') => {
    if (!get().shoppingItems.length) return { ok: false, message: 'Your shopping list is empty.' };
    set((state) => ({
      checkoutOpen: true,
      activity: pushActivity(state.activity, activity('Prepared grocery review', 'Waiting for your explicit confirmation.', source, 'list')),
    }));
    return { ok: true, message: 'The grocery review is open. Only the user can confirm it.' };
  },

  closeCheckout: () => {
    get().resolveToolTrace('prepare_grocery_checkout', 'error', 'User returned to editing the list.');
    set({ checkoutOpen: false });
  },

  confirmCheckout: () => {
    get().resolveToolTrace('prepare_grocery_checkout', 'success', 'User marked the local list ready. No purchase was made.');
    set((state) => ({
      checkoutOpen: false,
      toast: toast('List marked ready', 'Demo only — no order or payment was placed.'),
      activity: pushActivity(state.activity, activity('Shopping list marked ready', 'No purchase was made.', 'you', 'list')),
    }));
  },

  startCooking: (source = 'you') => {
    const plan = get().plan;
    const recipe = getPlanRecipe(plan);
    if (!plan || !recipe) return { ok: false, message: 'Choose a dinner before starting cooking mode.' };
    const existing = get().cookingSession;
    if (existing?.status === 'active' && existing.planSnapshot.recipeId === plan.recipeId) {
      set({ view: 'cooking' });
      return { ok: true, message: 'Cooking mode is already active.' };
    }
    const session: CookingSession = {
      id: uid('cook'),
      planSnapshot: structuredClone(plan),
      currentStepIndex: 0,
      completedStepIds: [],
      status: 'active',
      startedAt: Date.now(),
    };
    set((state) => ({
      cookingSession: session,
      view: 'cooking',
      activity: pushActivity(state.activity, activity(`Started cooking ${recipe.title}`, `${recipe.steps.length} guided steps`, source, 'cook')),
      toast: null,
      revision: state.revision + 1,
    }));
    return { ok: true, message: `Started cooking ${recipe.title}.` };
  },

  goToCookingStep: (index) => set((state) => {
    const session = state.cookingSession;
    const recipe = getRecipe(session?.planSnapshot.recipeId);
    if (!session || !recipe) return state;
    return {
      cookingSession: { ...session, currentStepIndex: clamp(index, 0, recipe.steps.length - 1) },
      revision: state.revision + 1,
    };
  }),

  advanceCookingStep: (source = 'you', options = {}) => {
    const state = get();
    const session = state.cookingSession;
    const recipe = getRecipe(session?.planSnapshot.recipeId);
    if (!session || !recipe) return { ok: false, message: 'Cooking mode is not active.' };
    const currentStep = recipe.steps[session.currentStepIndex];
    const currentTimer = Object.values(state.timers).find((timer) => timer.stepId === currentStep.id && timer.status !== 'completed');
    if (currentTimer && !options.skipTimer) {
      return { ok: false, message: `“${currentTimer.label}” is still ${currentTimer.status}. Wait for it to finish or skip the timer.` };
    }
    const completedIds = Array.from(new Set([...session.completedStepIds, currentStep.id]));
    const isLast = session.currentStepIndex >= recipe.steps.length - 1;
    set((current) => ({
      timers: currentTimer && options.skipTimer ? {
        ...current.timers,
        [currentTimer.id]: { ...currentTimer, status: 'completed', endsAt: null, remainingWhenPaused: 0 },
      } : current.timers,
      cookingSession: current.cookingSession ? {
        ...current.cookingSession,
        completedStepIds: completedIds,
        currentStepIndex: isLast ? current.cookingSession.currentStepIndex : current.cookingSession.currentStepIndex + 1,
        status: isLast ? 'completed' : 'active',
        completedAt: isLast ? Date.now() : undefined,
      } : null,
      activity: pushActivity(current.activity, activity(
        isLast ? 'Dinner is ready' : `Completed ${currentStep.title}`,
        options.skipTimer ? `Skipped ${currentTimer?.label ?? 'step timer'} · ${isLast ? recipe.title : `step ${session.currentStepIndex + 1} of ${recipe.steps.length}`}` : isLast ? recipe.title : `Step ${session.currentStepIndex + 1} of ${recipe.steps.length}`,
        source,
        'cook',
      )),
      toast: isLast ? toast('Dinner is ready!', 'You turned pantry staples into something wonderful.') : null,
      revision: current.revision + 1,
    }));
    return { ok: true, message: isLast ? 'Dinner is ready.' : `Advanced to step ${session.currentStepIndex + 2}.`, completed: isLast };
  },

  exitCooking: () => set({ view: 'planner' }),

  startTimer: (label, durationSeconds, stepId = null, source = 'you') => {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return { ok: false, message: 'Set a timer between 1 second and 4 hours.' };
    }
    const seconds = clamp(Math.round(durationSeconds), 1, 14_400);
    const normalizedLabel = label.trim().toLocaleLowerCase();
    const existing = Object.values(get().timers).find((timer) =>
      timer.status !== 'completed' && (
        (stepId ? timer.stepId === stepId : false) ||
        timer.label.trim().toLocaleLowerCase() === normalizedLabel
      ),
    );
    if (existing) {
      return { ok: true, message: `“${existing.label}” is already ${existing.status}.`, timerId: existing.id };
    }
    const id = uid('timer');
    const timer: CookingTimer = {
      id,
      label: label.trim() || 'Cooking timer',
      stepId,
      durationSeconds: seconds,
      status: 'running',
      endsAt: Date.now() + seconds * 1000,
      remainingWhenPaused: null,
    };
    set((state) => ({
      timers: { ...state.timers, [id]: timer },
      activity: pushActivity(state.activity, activity(`Started ${timer.label} timer`, `${Math.ceil(seconds / 60)} min`, source, 'timer')),
      toast: toast('Timer started', timer.label),
      revision: state.revision + 1,
    }));
    return { ok: true, message: `Started “${timer.label}” for ${seconds} seconds.`, timerId: id };
  },

  pauseTimer: (id) => set((state) => {
    const timer = state.timers[id];
    if (!timer || timer.status !== 'running' || !timer.endsAt) return state;
    return {
      timers: {
        ...state.timers,
        [id]: { ...timer, status: 'paused', remainingWhenPaused: Math.max(0, timer.endsAt - Date.now()), endsAt: null },
      },
      revision: state.revision + 1,
    };
  }),

  resumeTimer: (id) => set((state) => {
    const timer = state.timers[id];
    if (!timer || timer.status !== 'paused' || timer.remainingWhenPaused === null) return state;
    return {
      timers: {
        ...state.timers,
        [id]: { ...timer, status: 'running', endsAt: Date.now() + timer.remainingWhenPaused, remainingWhenPaused: null },
      },
      revision: state.revision + 1,
    };
  }),

  removeTimer: (id) => set((state) => {
    const timers = { ...state.timers };
    delete timers[id];
    return { timers, revision: state.revision + 1 };
  }),

  reconcileTimers: () => set((state) => {
    let changed = false;
    const timers = Object.fromEntries(Object.entries(state.timers).map(([id, timer]) => {
      if (timer.status === 'running' && timer.endsAt !== null && timer.endsAt <= Date.now()) {
        changed = true;
        return [id, { ...timer, status: 'completed' as const, endsAt: null, remainingWhenPaused: 0 }];
      }
      return [id, timer];
    }));
    if (!changed) return state;
    const justCompleted = Object.values(timers).find((timer) => timer.status === 'completed' && state.timers[timer.id]?.status !== 'completed');
    return {
      timers,
      toast: justCompleted ? toast(`${justCompleted.label} is done`, 'Back to the pan!') : state.toast,
      revision: state.revision + 1,
    };
  }),

  dismissToast: () => set({ toast: null }),

  resetDemo: (options) => set((state) => ({
    revision: state.revision + 1,
    pantry: createDefaultPantry(),
    preferences: { ...defaultPreferences },
    plan: createDefaultPlan(),
    shoppingItems: [],
    cookingSession: null,
    timers: {},
    activity: welcomeActivity(),
    toolTrace: [],
    view: 'planner',
    pendingShoppingReview: null,
    checkoutOpen: false,
    toast: options?.silent ? null : toast('Demo reset', 'Eggs, tomatoes and rice are back in the pantry.'),
    isAgentRunning: false,
  })),
}), {
  name: 'pantrypilot:state:v1',
  version: 1,
  partialize: (state) => ({
    revision: state.revision,
    pantry: state.pantry,
    preferences: state.preferences,
    plan: state.plan,
    shoppingItems: state.shoppingItems,
    cookingSession: state.cookingSession,
    timers: state.timers,
    activity: state.activity,
    toolTrace: state.toolTrace,
    view: state.view,
  }),
}));
