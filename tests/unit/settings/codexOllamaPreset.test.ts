import { describe, expect, it } from 'vitest';
import type { Assistant } from '@/common/types/agent/assistantTypes';
import type { ManagedAgent } from '@/renderer/utils/model/agentTypes';
import {
  CODEX_OLLAMA_CUSTOM_AGENT,
  findAssistantForCodexOllamaAgent,
  isCodexOllamaAgent,
} from '@/renderer/pages/settings/AgentSettings/codexOllamaPreset';

describe('Codex Ollama preset', () => {
  it('uses the local Ollama Qwen ACP command without enabling web search', () => {
    expect(CODEX_OLLAMA_CUSTOM_AGENT).toEqual({
      name: 'Codex CLI (Ollama / Qwen)',
      command: 'codex',
      args: ['--acp', '--oss', '--local-provider', 'ollama', '--model', 'qwen3.5:4b'],
      env: [{ name: 'OLLAMA_HOST', value: 'http://127.0.0.1:11434' }],
    });
    expect(CODEX_OLLAMA_CUSTOM_AGENT.args).not.toContain('--search');
  });

  it('recognizes only the custom agent with the exact local Ollama command', () => {
    const matchingAgent = {
      agent_source: 'custom',
      command: 'codex',
      args: ['--acp', '--oss', '--local-provider', 'ollama', '--model', 'qwen3.5:4b'],
    } as ManagedAgent;
    const unrelatedAgent = {
      ...matchingAgent,
      args: ['--acp', '--model', 'gpt-5'],
    } as ManagedAgent;

    expect(isCodexOllamaAgent(matchingAgent)).toBe(true);
    expect(isCodexOllamaAgent(unrelatedAgent)).toBe(false);
  });

  it('finds the assistant bound to the configured custom agent', () => {
    const assistants = [
      { id: 'assistant-a', agent_id: 'other-agent' },
      { id: 'assistant-qwen', agent_id: 'custom-codex-qwen' },
    ] as Assistant[];

    expect(findAssistantForCodexOllamaAgent(assistants, 'custom-codex-qwen')?.id).toBe('assistant-qwen');
    expect(findAssistantForCodexOllamaAgent(assistants, 'missing-agent')).toBeUndefined();
  });
});
