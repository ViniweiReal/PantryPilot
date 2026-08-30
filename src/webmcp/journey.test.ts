import { beforeEach, describe, expect, it } from 'vitest';
import { usePantryStore } from '../store/usePantryStore';
import { createWebMcpTools, TOOL_CATALOG } from './tools';

const options = { signal: new AbortController().signal };

async function invoke(name: string, input: Record<string, unknown> = {}) {
  const definition = createWebMcpTools().find((candidate) => candidate.name === name);
  if (!definition) throw new Error(`Missing WebMCP tool: ${name}`);
  return definition.execute(input, options) as Promise<Record<string, unknown>>;
}

describe('WebMCP golden journey', () => {
  beforeEach(() => {
    localStorage.clear();
    usePantryStore.getState().resetDemo();
  });

  it('moves from kitchen state to a persistent cooking timer with a human shopping gate', async () => {
    expect(await invoke('get_kitchen_state')).toMatchObject({ ok: true });
    expect(await invoke('plan_dinner', { servings: 2, diet: 'vegetarian', maxMinutes: 25 })).toMatchObject({ ok: true });
    expect(await invoke('replace_ingredient', { ingredient: 'milk', replacement: 'oat milk' })).toMatchObject({ ok: true });

    const shoppingResult = await invoke('add_missing_to_shopping_list');
    expect(shoppingResult).toMatchObject({ ok: true, data: { confirmationRequired: true } });
    expect(usePantryStore.getState().shoppingItems).toHaveLength(0);
    expect(usePantryStore.getState().pendingShoppingReview?.items.length).toBeGreaterThan(0);
    expect(usePantryStore.getState().toolTrace[0]).toMatchObject({
      toolName: 'add_missing_to_shopping_list',
      status: 'needs-user',
    });

    usePantryStore.getState().confirmShoppingList();
    expect(usePantryStore.getState().shoppingItems.length).toBeGreaterThan(0);
    expect(usePantryStore.getState().toolTrace.find((event) => event.toolName === 'add_missing_to_shopping_list')).toMatchObject({ status: 'success' });

    expect(await invoke('start_cooking_mode')).toMatchObject({ ok: true });
    expect(await invoke('set_cooking_timer', { label: 'Tomato base', durationSeconds: 90 })).toMatchObject({ ok: true });
    expect(usePantryStore.getState()).toMatchObject({ view: 'cooking' });
    expect(Object.values(usePantryStore.getState().timers)).toHaveLength(1);

    const persisted = JSON.parse(localStorage.getItem('pantrypilot:state:v1') ?? '{}');
    expect(persisted.state.toolTrace.length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(persisted.state.timers)).toHaveLength(1);
  });

  it('exposes preparation tools but no purchase, payment or approval tool', async () => {
    const forbidden = /(^|_)(confirm|approve|purchase|payment|pay|place_order)($|_)/;
    expect(TOOL_CATALOG.some((tool) => forbidden.test(tool.name))).toBe(false);

    await invoke('replace_ingredient', { ingredient: 'milk', replacement: 'oat milk' });
    await invoke('add_missing_to_shopping_list');
    usePantryStore.getState().confirmShoppingList();
    const output = await invoke('prepare_grocery_checkout');
    expect(output).toMatchObject({ ok: true, data: { confirmationRequired: true } });
    expect(usePantryStore.getState().checkoutOpen).toBe(true);
    expect(usePantryStore.getState().toolTrace[0]).toMatchObject({ status: 'needs-user' });
  });
});
