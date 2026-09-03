import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePantryStore } from './usePantryStore';

describe('PantryPilot store', () => {
  beforeEach(() => {
    localStorage.clear();
    usePantryStore.getState().resetDemo();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deduplicates repeated shopping proposals', () => {
    expect(usePantryStore.getState().replaceIngredient('milk', 'oat milk').ok).toBe(true);
    const first = usePantryStore.getState().proposeShoppingList();
    expect(first.count).toBeGreaterThan(0);
    usePantryStore.getState().confirmShoppingList();
    const countAfterFirst = usePantryStore.getState().shoppingItems.length;
    const second = usePantryStore.getState().proposeShoppingList();
    expect(second.count).toBe(0);
    expect(usePantryStore.getState().shoppingItems).toHaveLength(countAfterFirst);
    expect(second.message).toContain('already on your shopping list');
  });

  it('keeps shopping copy truthful for a partial existing list', () => {
    expect(usePantryStore.getState().replaceIngredient('milk', 'oat milk').ok).toBe(true);
    const first = usePantryStore.getState().proposeShoppingList();
    expect(first.count).toBeGreaterThan(1);
    usePantryStore.getState().confirmShoppingList();
    const firstItem = usePantryStore.getState().shoppingItems[0];
    usePantryStore.getState().removeShoppingItem(firstItem.id);

    const partial = usePantryStore.getState().proposeShoppingList();
    expect(partial.count).toBe(1);
    expect(partial.message).toContain('already on your list');
  });

  it('records shopping approval as a human action', () => {
    const review = usePantryStore.getState().proposeShoppingList('agent');
    expect(review.count).toBeGreaterThan(0);
    usePantryStore.getState().confirmShoppingList();

    expect(usePantryStore.getState().activity[0]).toMatchObject({
      message: `Added ${review.count} items to the list`,
      source: 'you',
    });
  });

  it('snapshots the meal plan when cooking starts', () => {
    usePantryStore.getState().startCooking();
    expect(usePantryStore.getState().cookingSession?.planSnapshot.servings).toBe(2);
    usePantryStore.getState().adjustServings(4);
    expect(usePantryStore.getState().plan?.servings).toBe(4);
    expect(usePantryStore.getState().cookingSession?.planSnapshot.servings).toBe(2);
  });

  it('reconciles an expired persistent timer exactly once', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T20:00:00Z'));
    const result = usePantryStore.getState().startTimer('Test timer', 2);
    vi.setSystemTime(new Date('2026-08-29T20:00:03Z'));
    usePantryStore.getState().reconcileTimers();
    expect(usePantryStore.getState().timers[result.timerId!].status).toBe('completed');
    const revision = usePantryStore.getState().revision;
    usePantryStore.getState().reconcileTimers();
    expect(usePantryStore.getState().revision).toBe(revision);
  });

  it('keeps only the latest 20 tool trace events', () => {
    for (let index = 0; index < 25; index += 1) {
      usePantryStore.getState().startToolTrace(`tool_${index}`, '{}');
    }

    const trace = usePantryStore.getState().toolTrace;
    expect(trace).toHaveLength(20);
    expect(trace[0].toolName).toBe('tool_24');
    expect(trace.at(-1)?.toolName).toBe('tool_5');
  });

  it('does not create duplicate timers for the same cooking step', () => {
    usePantryStore.getState().startCooking();
    const first = usePantryStore.getState().startTimer('Tomato base', 300, 'base');
    const second = usePantryStore.getState().startTimer('Tomato base', 300, 'base');

    expect(second.timerId).toBe(first.timerId);
    expect(Object.values(usePantryStore.getState().timers)).toHaveLength(1);
  });

  it('deduplicates an active timer by label when no step id is supplied', () => {
    const first = usePantryStore.getState().startTimer('Sauce', 300);
    const second = usePantryStore.getState().startTimer(' sauce ', 120);

    expect(second.timerId).toBe(first.timerId);
    expect(Object.values(usePantryStore.getState().timers)).toHaveLength(1);
  });

  it('does not silently advance while a step timer is running', () => {
    usePantryStore.getState().startCooking();
    usePantryStore.getState().startTimer('Prep timer', 300, 'prep');

    const blocked = usePantryStore.getState().advanceCookingStep();
    expect(blocked.ok).toBe(false);
    expect(usePantryStore.getState().cookingSession?.currentStepIndex).toBe(0);

    const skipped = usePantryStore.getState().advanceCookingStep('you', { skipTimer: true });
    expect(skipped.ok).toBe(true);
    expect(usePantryStore.getState().cookingSession?.currentStepIndex).toBe(1);
  });

  it('rejects non-finite serving counts and timer durations', () => {
    expect(usePantryStore.getState().adjustServings(Number.NaN).ok).toBe(false);
    expect(usePantryStore.getState().plan?.servings).toBe(2);

    expect(usePantryStore.getState().startTimer('Broken timer', Number.NaN).ok).toBe(false);
    expect(Object.values(usePantryStore.getState().timers)).toHaveLength(0);
  });
});
