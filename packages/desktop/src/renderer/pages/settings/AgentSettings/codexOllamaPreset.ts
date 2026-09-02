import type { Assistant } from '@/common/types/agent/assistantTypes';
import type { ManagedAgent } from '@/renderer/utils/model/agentTypes';

export const CODEX_OLLAMA_MODEL = 'qwen3.5:4b';
export const CODEX_OLLAMA_HOST = 'http://127.0.0.1:11434';

export const CODEX_OLLAMA_CUSTOM_AGENT = {
  name: 'Codex CLI (Ollama / Qwen)',
  command: 'codex',
  args: ['--acp', '--oss', '--local-provider', 'ollama', '--model', CODEX_OLLAMA_MODEL],
  env: [{ name: 'OLLAMA_HOST', value: CODEX_OLLAMA_HOST }],
} as const;

const sameStringList = (left: readonly string[] | undefined, right: readonly string[]): boolean =>
  left?.length === right.length && left.every((value, index) => value === right[index]);

/** Return true when a managed custom agent already represents this preset. */
export function isCodexOllamaAgent(agent: Pick<ManagedAgent, 'agent_source' | 'command' | 'args'>): boolean {
  return (
    agent.agent_source === 'custom' &&
    agent.command?.trim() === CODEX_OLLAMA_CUSTOM_AGENT.command &&
    sameStringList(agent.args, CODEX_OLLAMA_CUSTOM_AGENT.args)
  );
}

/** Find the enabled assistant generated for a custom agent. */
export function findAssistantForCodexOllamaAgent(
  assistants: Array<Pick<Assistant, 'id' | 'agent_id' | 'enabled'>>,
  agentId: string
): Pick<Assistant, 'id' | 'agent_id' | 'enabled'> | undefined {
  return assistants.find((assistant) => assistant.agent_id === agentId && assistant.enabled !== false);
}
