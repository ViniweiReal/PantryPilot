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
});
