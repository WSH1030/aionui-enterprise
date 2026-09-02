import { describe, expect, it } from 'vitest';
import type { Assistant } from '@/common/types/agent/assistantTypes';
import { resolveAssistantName } from '@/renderer/utils/model/assistantDisplay';

const createAssistant = (overrides: Partial<Assistant>): Assistant =>
  ({
    id: 'assistant-1',
    source: 'generated',
    name: 'Aion CLI',
    name_i18n: {},
    description_i18n: {},
    enabled: true,
    sort_order: 0,
    agent_id: 'agent-aionrs',
    enabled_skills: [],
    custom_skill_names: [],
    disabled_builtin_skills: [],
    context_i18n: {},
    prompts: [],
    prompts_i18n: {},
    models: [],
    agent_status: 'online',
    team_selectable: true,
    deletable: false,
    ...overrides,
  }) as Assistant;

describe('resolveAssistantName', () => {
  it('maps the built-in Aion CLI runtime to the Rd CLI display brand', () => {
    const assistant = createAssistant({
      agent: { type: 'aionrs', source: 'internal' },
    });

    expect(resolveAssistantName(assistant, 'zh-CN')).toBe('Rd CLI');
  });

  it('preserves a custom assistant name that uses the aionrs runtime', () => {
    const assistant = createAssistant({
      name: '工业专家',
      agent: { type: 'aionrs', source: 'custom' },
    });

    expect(resolveAssistantName(assistant, 'zh-CN')).toBe('工业专家');
  });
});
