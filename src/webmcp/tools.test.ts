import { beforeEach, describe, expect, it } from 'vitest';
import { usePantryStore } from '../store/usePantryStore';
import { createWebMcpTools, TOOL_CATALOG } from './tools';

describe('WebMCP tool definitions', () => {
  beforeEach(() => usePantryStore.getState().resetDemo());

  it('registers unique, action-oriented definitions with object schemas', () => {
    const tools = createWebMcpTools();
    expect(tools).toHaveLength(TOOL_CATALOG.length);
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
    tools.forEach((tool) => {
      expect(tool.name).toMatch(/^[a-z0-9_.-]+$/);
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.description.length).toBeLessThanOrEqual(500);
      expect(tool.inputSchema).toMatchObject({ type: 'object' });
      const schemaText = JSON.stringify(tool.inputSchema);
      const parameterDescriptions = Array.from(schemaText.matchAll(/"description":"([^"]+)"/g), (match) => match[1]);
      parameterDescriptions.forEach((description) => expect(description.length).toBeLessThanOrEqual(150));
    });
  });

  it('uses the same domain command as the UI for a servings change', async () => {
    const tool = createWebMcpTools().find((definition) => definition.name === 'adjust_servings')!;
    const output = await tool.execute({ servings: 4 }, { signal: new AbortController().signal });
    expect(output).toMatchObject({ ok: true, action: 'adjust_servings' });
    expect(usePantryStore.getState().plan?.servings).toBe(4);
  });

  it('returns a recoverable structured error for invalid input', async () => {
    const tool = createWebMcpTools().find((definition) => definition.name === 'adjust_servings')!;
    const output = await tool.execute({ servings: 99 }, { signal: new AbortController().signal });
    expect(output).toMatchObject({ ok: false, code: 'INVALID_INPUT', recoverable: true });
    expect(usePantryStore.getState().toolTrace[0]).toMatchObject({
      toolName: 'adjust_servings',
      status: 'error',
    });
  });

  it('keeps individual structured outputs inside the recommended character budget', async () => {
    const tools = createWebMcpTools();
    const read = tools.find((definition) => definition.name === 'get_kitchen_state')!;
    const plan = tools.find((definition) => definition.name === 'plan_dinner')!;
    const options = { signal: new AbortController().signal };
    const outputs = [
      await read.execute({}, options),
      await plan.execute({ servings: 2, diet: 'vegetarian', maxMinutes: 25 }, options),
    ];
    outputs.forEach((output) => expect(JSON.stringify(output).length).toBeLessThanOrEqual(1500));
  });
});
