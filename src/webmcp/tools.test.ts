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
      expect(tool.inputSchema).toMatchObject({ type: 'object' });
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
  });
});
