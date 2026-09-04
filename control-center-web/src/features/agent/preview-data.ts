import type { AgentSnapshot } from '@/contracts/agent-reducer';
import type { UiAgentEvent } from '@/contracts/ui-events';
import type { AgentPersonaV1 } from '@/contracts/generated/agent-persona.v1';
import type { AgentBackgroundJobV1 } from '@/contracts/generated/agent-background-job.v1';
import type { AgentTemplateV1 } from '@/contracts/generated/agent-template.v1';
import type { ModelCatalog, SessionSummary } from './types';

const previewNow = 1_785_014_400_000;

export const previewPersonas: AgentPersonaV1[] = [
  {
    schemaVersion: 'rag-ime.agent-persona.v1', roleId: 'companion-future-v1', version: '1',
    displayName: 'Agent 3', tagline: '把记忆、工具与协作构筑成下一步',
    summary: '站在长期时间线上深思的构筑者，默认主持复杂任务，串联证据、工具、角色、实现与验收。',
    traits: ['沉稳', '工具编排'],
    visualProfile: { avatarAssetId: 'rag-ime-timeline-future-v1', symbolName: 'point.3.connected.trianglepath.dotted', accentToken: 'rose' },
    defaults: { modelPolicy: 'fixed', memoryPolicy: 'personal-evidence-v1', toolProfileVersion: 'control-center-v1', modelProfile: 'openai-codex/gpt-5.6-sol', thinkingLevel: 'max' },
    runtimeCharacteristics: { intelligence: '最高', speed: '较慢', context: '超长上下文，面向长期时间线', suitableTasks: ['复杂架构与深度实现', '多 Agent 主持和独立验收'], unsuitableTasks: ['只需快速扫读的低风险整理'], isDefault: true },
    safetyPolicyVersion: 'agent-core-v2', selectableModes: ['assistant', 'coordinator'],
  },
  {
    schemaVersion: 'rag-ime.agent-persona.v1',
    roleId: 'companion-present-v1',
    version: '1',
    displayName: 'Agent 1',
    tagline: '先接住眼前的问题，再一起把它做清楚',
    summary: '贴近当前工作现场的稳健实践者，平衡深度与速度，把正在发生的想法落到下一步。',
    traits: ['温暖', '证据优先'],
    visualProfile: {
      avatarAssetId: 'rag-ime-timeline-present-v1',
      symbolName: 'sparkles',
      accentToken: 'teal',
    },
    defaults: {
      modelPolicy: 'fixed',
      memoryPolicy: 'personal-evidence-v1',
      toolProfileVersion: 'control-center-v1',
      modelProfile: 'openai-codex/gpt-5.6-terra', thinkingLevel: 'max',
    },
    runtimeCharacteristics: { intelligence: '高', speed: '均衡', context: '长上下文，聚焦当前现场', suitableTasks: ['日常协作与项目推进', '整理证据并形成下一步'], unsuitableTasks: ['需要最深推演的复杂实现主持'], isDefault: false },
    safetyPolicyVersion: 'agent-core-v2',
    selectableModes: ['assistant', 'coordinator'],
  },
  {
    schemaVersion: 'rag-ime.agent-persona.v1',
    roleId: 'companion-firstlight-v1',
    version: '1',
    displayName: 'Agent 2',
    tagline: '从第一笔记录开始，认真认识你的世界',
    summary: '像月光巡游历史线索的敏锐行动者，快速理解意图、核对线索并给出清楚下一步。',
    traits: ['好奇', '记录优先'],
    visualProfile: {
      avatarAssetId: 'rag-ime-timeline-past-v1',
      symbolName: 'scope',
      accentToken: 'blue',
    },
    defaults: {
      modelPolicy: 'fixed',
      memoryPolicy: 'personal-evidence-v1',
      toolProfileVersion: 'control-center-v1',
      modelProfile: 'openai-codex/gpt-5.6-luna', thinkingLevel: 'max',
    },
    runtimeCharacteristics: { intelligence: '中高', speed: '快速', context: '长上下文，擅长线索巡检', suitableTasks: ['快速理解意图与初步检索', '轻量执行和下一步整理'], unsuitableTasks: ['复杂架构主持', '高风险独立决策'], isDefault: false },
    safetyPolicyVersion: 'agent-core-v2',
    selectableModes: ['assistant', 'coordinator'],
  },
  {
    schemaVersion: 'rag-ime.agent-persona.v1', roleId: 'companion-flash-v1', version: '1',
    displayName: 'Agent 4', tagline: '高速掠过漫长档案，只带回最有用的线索',
    summary: '超长档案的高速侦察与整理者，极快提取、聚类和交接线索，但不独自承担复杂实现与高风险结论。',
    traits: ['极速', '线索整理'],
    visualProfile: { avatarAssetId: 'rag-ime-timeline-flash-v1', symbolName: 'bolt', accentToken: 'neutral' },
    defaults: { modelPolicy: 'fixed', memoryPolicy: 'personal-evidence-v1', toolProfileVersion: 'control-center-v1', modelProfile: 'openai-codex/gpt-5.6-luna', thinkingLevel: 'low' },
    runtimeCharacteristics: { intelligence: '普通', speed: '极速', context: '超长上下文，擅长高速扫描', suitableTasks: ['超长材料高速扫读与提取', '归类、去重和格式转换'], unsuitableTasks: ['复杂推理', '复杂实现', '高风险决定', '最终验收'], isDefault: false },
    safetyPolicyVersion: 'agent-core-v2', selectableModes: ['assistant', 'coordinator'],
  },
];

export const previewTemplates: AgentTemplateV1[] = [
  {
    schemaVersion: 'rag-ime.agent-template.v1',
    templateId: 'researcher',
    version: '1',
    displayName: '研究员',
    summary: '读取资料、对照证据并产出带来源的研究摘要。',
    contextModes: ['fresh', 'fork'],
    toolProfileVersion: 'subagent-readonly-v1',
    defaultAccess: 'read_only',
    allowedAccess: ['read_only'],
    budget: {
      maxDepth: 1,
      maxTurns: 0,
      maxToolCalls: 0,
      maxTotalTokens: 32_000,
      maxDurationMs: 300_000,
      maxOutputChars: 24_000,
    },
    capabilities: ['rag', 'memory', 'review'],
  },
  {
    schemaVersion: 'rag-ime.agent-template.v1',
    templateId: 'worker',
    version: '1',
    displayName: '执行者',
    summary: '在受控工作区内执行明确任务，交付产物和可审计回执。',
    contextModes: ['fresh', 'fork'],
    toolProfileVersion: 'subagent-worker-v1',
    defaultAccess: 'write',
    allowedAccess: ['read_only', 'write'],
    budget: {
      maxDepth: 2,
      maxTurns: 0,
      maxToolCalls: 0,
      maxTotalTokens: 64_000,
      maxDurationMs: 600_000,
      maxOutputChars: 36_000,
    },
    capabilities: ['control', 'planning', 'delegation'],
  },
  {
    schemaVersion: 'rag-ime.agent-template.v1',
    templateId: 'reviewer',
    version: '1',
    displayName: '审阅者',
    summary: '检查风险、遗漏和验收证据，不修改产品实现。',
    contextModes: ['fresh', 'fork'],
    toolProfileVersion: 'subagent-readonly-v1',
    defaultAccess: 'read_only',
    allowedAccess: ['read_only'],
    budget: {
      maxDepth: 1,
      maxTurns: 0,
      maxToolCalls: 0,
      maxTotalTokens: 24_000,
      maxDurationMs: 240_000,
      maxOutputChars: 18_000,
    },
    capabilities: ['review', 'rag'],
  },
];

export const previewSessions: SessionSummary[] = [
  {
    id: 'session-preview',
    title: '控制中心迁移',
    mode: 'coordinator',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'control-center-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: false,
    piSkillsEnabled: false,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow,
    workspaceRoots: ['/Users/example/Projects/personal-agent-workbench'],
    messageCount: 4,
    lastMessagePreview: '三条工作线已经收束到同一个控制入口。',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-memory-greeting',
    title: '今天聊聊 · 开场',
    mode: 'coordinator',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'subagent-readonly-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: false,
    piSkillsEnabled: false,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 43 * 60_000,
    workspaceRoots: [],
    messageCount: 2,
    lastMessagePreview: '看起来是很有进展、也挺密的一天。要继续收尾，还是先缓一缓？',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-memory',
    title: '今天聊聊 · 继续',
    mode: 'coordinator',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'subagent-readonly-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: false,
    piSkillsEnabled: false,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 42 * 60_000,
    workspaceRoots: [],
    messageCount: 4,
    lastMessagePreview: '明天继续时，我会从今天的整理结果和交接记录接上。',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-reliability',
    title: 'Trace Skill · 只读诊断',
    mode: 'coordinator',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'subagent-readonly-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: true,
    piSkillsEnabled: true,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 18 * 60_000,
    workspaceRoots: [],
    messageCount: 2,
    lastMessagePreview: '只读报告已定位第一根因；repair candidate 正在等待用户授权。',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-input',
    title: '等待你的回答',
    mode: 'assistant',
    status: 'active',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'control-center-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: true,
    piSkillsEnabled: false,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 30_000,
    workspaceRoots: ['/Users/example/Projects/personal-agent-workbench'],
    messageCount: 1,
    lastMessagePreview: '请把待审问答做成更清楚的协作界面。',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-runtime',
    title: '运行时诊断',
    mode: 'assistant',
    status: 'idle',
    roleId: 'companion-firstlight-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'control-center-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: false,
    piSkillsEnabled: false,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 3 * 60 * 60_000,
    workspaceRoots: [],
    messageCount: 7,
    lastMessagePreview: 'Sidecar 与 MLX predictor 都已恢复。',
    modelProfile: 'openai/gpt-5.4-mini',
  },
  {
    id: 'session-long',
    title: '长对话回归',
    mode: 'assistant',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'subagent-readonly-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: true,
    piSkillsEnabled: false,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 5 * 60_000,
    workspaceRoots: [],
    messageCount: 120,
    lastMessagePreview: '用于验证长对话滚动与跟随行为。',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-fresh',
    title: '新对话',
    mode: 'assistant',
    status: 'idle',
    roleId: 'companion-future-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'subagent-readonly-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: false,
    piSkillsEnabled: false,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 2 * 60_000,
    workspaceRoots: [],
    messageCount: 0,
    lastMessagePreview: '还没有消息',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-gallery',
    title: '渲染族样例',
    mode: 'assistant',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'subagent-readonly-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: true,
    piSkillsEnabled: false,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 4 * 60_000,
    workspaceRoots: [],
    messageCount: 6,
    lastMessagePreview: '完整渲染族样例，用于视觉评审。',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-states',
    title: '状态与恢复',
    mode: 'assistant',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'subagent-readonly-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: true,
    piSkillsEnabled: false,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 2 * 60_000,
    workspaceRoots: [],
    messageCount: 3,
    lastMessagePreview: '运行中、失败与已停止三种状态。',
    modelProfile: 'openai/gpt-5.4',
  },
  // Appended, never inserted: two model-picker tests pin the catalog by
  // position, so inserting a scenario earlier in this list silently breaks them.
  {
    id: 'session-models',
    title: '模型切换',
    mode: 'assistant',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'subagent-readonly-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: true,
    piSkillsEnabled: false,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 3 * 60_000,
    workspaceRoots: [],
    messageCount: 4,
    lastMessagePreview: '同一串对话里从快模型换到强模型。',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-report',
    title: '报告交付',
    mode: 'assistant',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'subagent-readonly-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: true,
    piSkillsEnabled: false,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 4 * 60_000,
    workspaceRoots: [],
    messageCount: 2,
    lastMessagePreview: '生成的 HTML 报告与原始数据一并交付。',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-work-disclosure',
    title: '过程折叠验收',
    mode: 'assistant',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'control-center-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: true,
    piSkillsEnabled: false,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 90_000,
    workspaceRoots: ['/Users/example/Projects/personal-agent-workbench'],
    messageCount: 3,
    lastMessagePreview: '最终结果保持可见，推理与工具过程可按需展开。',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-reliability-repair',
    title: 'Repair Session · documentSync',
    mode: 'coordinator',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'subagent-worker-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: true,
    piSkillsEnabled: true,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 12 * 60_000,
    workspaceRoots: ['/Users/example/Projects/personal-agent-workbench'],
    messageCount: 2,
    lastMessagePreview: '修复已 applied + tested；原 Case 尚未 Replay。',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-reliability-incident',
    title: 'Trace Skill · 事故复现',
    mode: 'coordinator',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'subagent-worker-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: true,
    piSkillsEnabled: true,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 24 * 60_000,
    workspaceRoots: ['/Users/example/Projects/personal-agent-workbench'],
    messageCount: 2,
    lastMessagePreview: '旧 Workflow 已回滚真实文件，Agent 却误判“已安全结束”。',
    modelProfile: 'openai/gpt-5.4',
  },
  {
    id: 'session-reliability-verify',
    title: 'Verification Session · 同题 Replay',
    mode: 'coordinator',
    status: 'idle',
    roleId: 'companion-present-v1',
    roleVersion: '1',
    roleBookRevisionId: '',
    toolProfileVersion: 'subagent-readonly-v1',
    toolAllowlistMode: 'profile',
    projectContextEnabled: true,
    piSkillsEnabled: true,
    codexSkillsEnabled: false,
    updatedAtMs: previewNow - 6 * 60_000,
    workspaceRoots: [],
    messageCount: 2,
    lastMessagePreview: '任务完成硬门槛通过，八项评分均已生成；保留并发 queue 残余风险。',
    modelProfile: 'openai/gpt-5.4',
  },
];

export function previewModelCatalog(sessionId: string): ModelCatalog {
  return {
    schemaVersion: 'rag-ime.agent-model-catalog.v1',
    ok: true,
    sessionId,
    selected: { provider: 'openai', id: 'gpt-5.4' },
    thinkingLevel: 'medium',
    providers: [
      {
        id: 'openai',
        displayName: 'OpenAI',
        models: [
          {
            provider: 'openai',
            id: 'gpt-5.4',
            name: 'GPT-5.4',
            api: 'responses',
            reasoning: true,
            thinkingLevels: ['off', 'low', 'medium', 'high', 'xhigh'],
            supportsImages: true,
            contextWindow: 1_000_000,
            maxTokens: 128_000,
          },
          {
            provider: 'openai',
            id: 'gpt-5.4-mini',
            name: 'GPT-5.4 mini',
            api: 'responses',
            reasoning: true,
            thinkingLevels: ['off', 'low', 'medium', 'high'],
            supportsImages: true,
            contextWindow: 400_000,
            maxTokens: 64_000,
          },
        ],
      },
      {
        id: 'gpt',
        displayName: 'GPT',
        models: [
          {
            provider: 'gpt',
            id: 'gpt-5.6-luna',
            name: 'GPT-5.6 Luna',
            api: 'responses',
            reasoning: true,
            thinkingLevels: ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'],
            supportsImages: true,
            contextWindow: 1_050_000,
            maxTokens: 128_000,
          },
        ],
      },
      {
        id: 'deepseek',
        displayName: 'DeepSeek',
        models: [
          {
            provider: 'deepseek',
            id: 'deepseek-v4',
            name: 'DeepSeek V4',
            api: 'chat-completions',
            reasoning: true,
            thinkingLevels: ['off', 'low', 'medium', 'high'],
            supportsImages: false,
            contextWindow: 256_000,
            maxTokens: 64_000,
          },
        ],
      },
    ],
  };
}


/*
 * Long-transcript preview scenario. Sixty alternating turns give the timeline
 * a real scroll extent, which is the only way to prove that streaming follows
 * output when the reader is near the bottom and leaves them alone when they
 * have scrolled up. Preview fixture only; it never reaches the runtime.
 */
function previewLongTranscript(sessionId: string) {
  const messages = [];
  for (let index = 0; index < 60; index += 1) {
    const turnId = `${sessionId}:turn-${index}`;
    const at = previewNow - (60 - index) * 60_000;
    messages.push(message(sessionId, turnId, `long-user-${index}`, 'user', [
      block(`long-user-text-${index}`, 'text', { text: `第 ${index + 1} 轮：请继续核对迁移进度，并说明这一步依赖的证据。` }),
    ], at));
    messages.push(message(sessionId, turnId, `long-assist-${index}`, 'assistant', [
      block(`long-assist-text-${index}`, 'text', {
        text: `**第 ${index + 1} 轮结论**\n\n- 已核对第 ${index + 1} 段实现链路。\n- 证据来自本地代码与运行记录，未使用工具日志替代回答。\n- 下一步：继续向后一段推进，保持同一判定口径。`,
      }),
    ], at + 20_000));
  }
  return messages;
}


/*
 * Renderer gallery preview scenario. The default fixture only exercised text,
 * code, file, citation and sticker, which left diff, table, checklist,
 * status, progress, artifact, approval and error renderers never visually
 * inspected. This scenario renders the full family in one transcript so the
 * editorial pass can judge them side by side. Preview fixture only.
 */
function previewRendererGallery(sessionId: string) {
  const turn = (n: string) => `${sessionId}:turn-${n}`;
  return [
    message(sessionId, turn('a'), 'gal-user-a', 'user', [
      block('gal-u-a', 'text', { text: '把这次改动的结果按类型完整呈现一遍：清单、表格、状态、进度、差异、产物、证据和审批。' }),
    ], previewNow - 300_000),
    message(sessionId, turn('a'), 'gal-assist-a', 'assistant', [
      block('gal-md', 'text', { text: '### 本轮结论\n\n先给判定，再给证据：\n\n1. 迁移链路已收敛到同一个控制入口。\n2. 内容展示仍缺少差异与审批的真实样例。\n3. 下面按类型逐项展开。' }),
      block('gal-checklist', 'checklist', { title: '验收清单', items: [
        { id: 'c1', text: '事件状态不重建', status: 'done' },
        { id: 'c2', text: '工具与审批同容器', status: 'done' },
        { id: 'c3', text: '长对话滚动跟随', checked: false },
      ] }),
      block('gal-table', 'table', {
        title: '各端渲染覆盖',
        columns: [{ key: 'kind', label: '类型' }, { key: 'session', label: '会话' }, { key: 'room', label: '协作' }],
        rows: [
          { kind: '差异', session: '已覆盖', room: '已覆盖' },
          { kind: '审批', session: '已覆盖', room: '需确认' },
          { kind: '产物', session: '已覆盖', room: '已覆盖' },
        ],
      }),
      block('gal-status', 'status', { title: '运行状态', state: 'completed', detail: '三条 Lane 全部通过本地验证', fields: [
        { label: '耗时', value: '2.4s' }, { label: '重试', value: '0 次' },
      ] }),
      block('gal-progress', 'progress', { title: '索引重建', state: 'running', detail: '36 / 48 段已完成', percent: 75 }),
    ], previewNow - 290_000),
    message(sessionId, turn('b'), 'gal-assist-b', 'assistant', [
      block('gal-diff', 'diff', {
        fileName: 'src/features/agent/state/live-store.ts',
        diff: '@@ -12,7 +12,9 @@ export function commit(events) {\n   const next = reduceBatch(state, events);\n-  set(next);\n-  flush();\n+  set((state) => reduceBatch(state, events));\n+  scheduleFlush();\n+  // batched: one paint per frame\n }\n',
      }),
      block('gal-artifact', 'artifact', { title: 'control-center-web-build.json', summary: '本轮构建回执', kind: 'receipt' }),
      block('gal-citation', 'citation', { title: '控制中心迁移记录', snippet: '一次用户输入只渲染一个 Turn。', source: '本地任务记录' }),
    ], previewNow - 280_000),
    message(sessionId, turn('c'), 'gal-assist-c', 'assistant', [
      block('gal-audio', 'audio', {
        name: 'voice-note-2026-07.m4a',
        receiptUrl: `/api/agent/media/media_previewaudio01/content?sessionId=${sessionId}`,
        mimeType: 'audio/mp4',
        byteSize: 184_320,
      }),
      block('gal-approval', 'approval', { approvalId: 'apr-gallery-1', title: '写入词表草案', state: 'pending', detail: '需要你确认后才会写入本机词库；批准前不会有任何写入。', payloadSha256: 'b3f1c2a9d4e5a7160c83f92d418be5cf0a2d7e64913b8ac5de07f21649a3bd8e' }),
    ], previewNow - 270_000),
  ];
}

/**
 * A dedicated completed multi-stage turn for validating progressive disclosure.
 * Keep this separate from `session-preview`: that fixture is used by many
 * interaction tests which intentionally pin its four-message transcript.
 *
 * The transcript carries the user request, an intermediate assistant update,
 * and a final rich result. The bounded live journal carries the reasoning and
 * two tool lifecycles that sit between those messages, so the real reducer and
 * timeline can prove that settled work collapses without hiding the answer.
 */
function previewTurnWorkDisclosure(sessionId: string) {
  const turnId = `${sessionId}:turn-implementation`;
  const base = previewNow - 90_000;
  const messages = [
    message(sessionId, turnId, 'work-user', 'user', [
      block('work-user-text', 'text', {
        text: '请核对 Agent 对话的过程折叠：中间过程可以收起，但最终答案、差异和交付文件必须一直可见。',
      }),
    ], base),
    message(sessionId, turnId, 'work-intermediate', 'assistant', [
      block('work-intermediate-text', 'text', {
        text: '我先检查时间线的消息排序、工具活动和完成态边界，再把最终改动整理成可复核的结果。',
      }),
    ], base + 12_000),
    message(sessionId, turnId, 'work-final', 'assistant', [
      block('work-final-markdown', 'text', {
        text: [
          '### 已完成过程折叠验收',
          '',
          '最终结果保留在对话主线上；推理与工具过程可通过“步骤”逐层展开查看。',
          '',
          '- 中间助手更新不会覆盖最终回答。',
          '- 工具调用按原时间顺序保留，可逐项复核。',
          '- 差异和交付文件属于结果，不会随过程一起隐藏。',
        ].join('\n'),
      }),
      block('work-final-diff', 'diff', {
        fileName: 'src/features/agent/timeline/AgentTimeline.tsx',
        diff: '@@ -118,6 +118,12 @@ function AgentTimeline() {\n+  const work = buildAgentTurnWorkModel(status, entries);\n+  return <AgentTurnWorkDisclosure model={work} />;\n }\n',
      }),
      block('work-final-file', 'file', {
        mediaId: 'media_previewworkreceipt01',
        name: 'agent-work-disclosure-receipt.md',
        mimeType: 'text/markdown',
        byteSize: 1_824,
        sha256: 'd'.repeat(64),
      }),
    ], base + 42_000),
  ];
  const events: UiAgentEvent[] = [
    ['reasoning_summary', {
      summary: '核对消息、活动与完成态的显示边界',
      items: ['核对消息、活动与完成态的显示边界'],
      source: 'provider_reasoning_summary',
      state: 'completed',
    }],
    ['tool_started', {
      toolCallId: 'tool-work-read',
      toolId: 'workspace_shell',
      operation: 'read',
      summary: '读取时间线渲染入口',
      args: { path: 'src/features/agent/timeline/AgentTimeline.tsx' },
    }],
    ['tool_finished', {
      toolCallId: 'tool-work-read',
      toolId: 'workspace_shell',
      operation: 'read',
      summary: '已读取时间线渲染入口',
      status: 'completed',
      result: { files: 1, lines: 286 },
    }],
    ['tool_started', {
      toolCallId: 'tool-work-test',
      toolId: 'workspace_shell',
      operation: 'test',
      summary: '运行过程折叠 focused 检查',
      args: { command: 'pnpm vitest run agent-turn-work-model.test.ts' },
    }],
    ['tool_finished', {
      toolCallId: 'tool-work-test',
      toolId: 'workspace_shell',
      operation: 'test',
      summary: '过程折叠 focused 检查通过',
      status: 'completed',
      result: { passed: 8, failed: 0 },
    }],
    ['turn_completed', { summary: '过程折叠验收完成' }],
  ].map(([eventType, payload], index) => ({
    schemaVersion: 'rag-ime.agent-event.v1',
    eventId: `${sessionId}:work-event-${index + 1}`,
    sessionId,
    turnId,
    sequence: index + 1,
    createdAtMs: base + 4_000 + index * 7_000,
    payload,
    resumeToken: `${sessionId}:${index + 1}`,
    streamKind: 'agent',
    eventType,
  })) as UiAgentEvent[];
  return { messages, events };
}

/**
 * A conversation that changes model mid-thread. AgentMessageUsage renders the
 * per-message model, but no fixture carried one, so the switch presentation had
 * never been looked at: whether two adjacent turns on different models read as
 * a deliberate change or as noise, and whether the attribution row stays quiet
 * enough not to compete with the prose above it. Preview fixture only — nothing
 * here asserts that the backend switches models this way.
 */
function previewModelSwitch(sessionId: string) {
  const turn = (n: string) => `${sessionId}:turn-${n}`;
  const usage = (input: number, output: number, cacheRead: number) => ({
    input, output, cacheRead, cacheWrite: 0, totalTokens: input + output + cacheRead,
  });
  return [
    message(sessionId, turn('a'), 'mdl-user-a', 'user', [
      block('mdl-u-a', 'text', { text: '先用快模型给个初判就行。' }),
    ], previewNow - 240_000),
    message(sessionId, turn('a'), 'mdl-assist-a', 'assistant', [
      block('mdl-a', 'text', { text: '初判：这次回归大概率来自事件批处理的提交时机，不是渲染层。要确认还需要看一遍 reducer 的落盘顺序。' }),
    ], previewNow - 235_000, { model: 'GPT-5.4 · 快', provider: 'pi-runtime', usage: usage(1_840, 96, 12_400) }),
    message(sessionId, turn('b'), 'mdl-user-b', 'user', [
      block('mdl-u-b', 'text', { text: '换成强模型，把它查实。' }),
    ], previewNow - 200_000),
    message(sessionId, turn('b'), 'mdl-assist-b', 'assistant', [
      block('mdl-b', 'text', { text: '已查实：`commit()` 用的是快照式 `set(next)`，与并发批次相互覆盖。改成函数式更新后，同一帧内的多批事件不再互相丢弃。' }),
      block('mdl-b-diff', 'diff', {
        fileName: 'src/features/agent/state/live-store.ts',
        diff: '@@ -12,7 +12,8 @@ export function commit(events) {\n-  const next = reduceBatch(state, events);\n-  set(next);\n+  set((state) => reduceBatch(state, events));\n+  scheduleFlush();\n }\n',
      }),
    ], previewNow - 195_000, { model: 'GPT-5.6 Luna · 强', provider: 'pi-runtime', usage: usage(9_620, 742, 41_300) }),
  ];
}

/* A generated HTML report, written the way a real one arrives: a full document
   with its own <style>, headings, a table and a figure. It deliberately also
   carries a <script>, an onclick handler, an external stylesheet <link>, a
   remote <img> and a javascript: URL, so the preview path is exercised against
   content that actively tries to execute rather than against a tame sample. */
export const PREVIEW_REPORT_HTML = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>输入法词库健康报告</title>
<link rel="stylesheet" href="https://cdn.example.com/report.css">
<style>
  body { font-family: ui-sans-serif, system-ui; color: #1b1a17; }
  h1 { font-size: 26px; letter-spacing: -0.01em; margin-bottom: 4px; }
  .lede { color: #55524b; margin-top: 0; }
  table { border-collapse: collapse; width: 100%; margin: 18px 0; }
  th, td { border: 1px solid #d8d3c8; padding: 7px 10px; text-align: left; }
  th { background: #f4f1ea; }
  .bad { color: #a3341f; font-weight: 600; }
  .good { color: #2f6b4f; font-weight: 600; }
  figure { margin: 18px 0; padding: 14px; background: #f7f5ef; }
</style>
<script>document.title = 'pwned'; window.parent.postMessage('escaped', '*');</script>
</head>
<body onload="alert('escaped')">
<h1>输入法词库健康报告</h1>
<p class="lede">统计区间：最近 30 天 · 覆盖 4 个词库来源</p>
<h2>总览</h2>
<table>
  <thead><tr><th>词库</th><th>条目</th><th>命中率</th><th>状态</th></tr></thead>
  <tbody>
    <tr><td>基础词库</td><td>128,400</td><td>94.2%</td><td class="good">健康</td></tr>
    <tr><td>项目术语</td><td>3,120</td><td>88.7%</td><td class="good">健康</td></tr>
    <tr><td>历史输入</td><td>46,880</td><td>61.3%</td><td class="bad">需整理</td></tr>
    <tr><td>外部导入</td><td>912</td><td>12.0%</td><td class="bad">建议停用</td></tr>
  </tbody>
</table>
<h2>发现</h2>
<ol>
  <li>历史输入词库中约 <strong>18%</strong> 的条目连续 30 天未命中。</li>
  <li>外部导入词库与基础词库存在 <strong>412</strong> 条重复。</li>
  <li>项目术语词库的命中率在本周提升了 6.4 个百分点。</li>
</ol>
<figure>
  <img src="https://tracker.example.com/pixel.gif" alt="远程图像">
  <figcaption>该图来自远程地址，预览时应当被移除。</figcaption>
</figure>
<h2>建议</h2>
<p>先清理重复条目，再对历史输入做一次冷启动重排。<a href="javascript:alert('escaped')">执行清理</a></p>
<p><a href="#总览">回到总览</a></p>
</body>
</html>`;

export const PREVIEW_REPORT_BYTES = new TextEncoder().encode(PREVIEW_REPORT_HTML).byteLength;

/**
 * The deliverable-shaped end of a turn: a generated HTML report alongside the
 * source data it was built from, plus a receipt that cannot be read so the
 * error and retry path is reachable without breaking anything else. The report
 * fixture in the preview transport deliberately contains a script, an inline
 * handler, a remote image and a javascript: URL — the preview is only
 * trustworthy if it stays inert against content that tries to execute.
 */
function previewReportDelivery(sessionId: string) {
  const turn = (n: string) => `${sessionId}:turn-${n}`;
  return [
    message(sessionId, turn('a'), 'rep-user-a', 'user', [
      block('rep-u-a', 'text', { text: '把这个月的词库健康情况整理成一份可以直接看的报告。' }),
    ], previewNow - 420_000),
    message(sessionId, turn('a'), 'rep-assist-a', 'assistant', [
      block('rep-text', 'text', { text: '已生成报告。四个词库里有两个需要处理：历史输入积压了未命中条目，外部导入与基础词库大量重复。报告正文与原始数据都在下面。' }),
      block('rep-html', 'file', {
        mediaId: 'media_previewreport01',
        name: 'lexicon-health-report.html',
        mimeType: 'text/html',
        byteSize: PREVIEW_REPORT_BYTES,
        sha256: 'c'.repeat(64),
      }),
      block('rep-md', 'file', {
        mediaId: 'media_previewdoc01',
        name: 'room-runtime-handoff.md',
        mimeType: 'text/markdown',
        byteSize: 231,
        sha256: 'c'.repeat(64),
      }),
      // Raw HTML quoted back inside the conversation. It must render as text
      // in both the prose and code paths — the transcript is not a renderer.
      block('rep-raw-md', 'text', {
        text: '报告里这段是原文引用，它出现在对话里时只应显示为文本：\n\n<script>alert(1)</script><img src=x onerror=alert(2)>\n\n下面是同一段的代码块形式：',
      }),
      block('rep-raw-code', 'code', {
        language: 'html',
        code: '<script>window.__ragImeChatEscaped = true;</script>\n<img src="x" onerror="window.__ragImeChatEscaped = true">\n<a href="javascript:alert(3)">link</a>',
      }),
      block('rep-broken', 'file', {
        mediaId: 'media_previewbroken01',
        name: 'lexicon-raw-export.csv',
        mimeType: 'text/csv',
        byteSize: 4_096,
        sha256: 'c'.repeat(64),
      }),
    ], previewNow - 410_000),
  ];
}

export function previewBackgroundJobs(
  sessionId: string,
  nowMs = Date.now(),
): AgentBackgroundJobV1[] {
  if (sessionId !== 'session-states') return [];

  type JobFixture = {
    jobId: string;
    label: string;
    status: AgentBackgroundJobV1['status'];
    command: string;
    digestCharacter: string;
    createdAgoMs: number;
    updatedAgoMs: number;
    startedAgoMs?: number;
    endedAgoMs?: number;
    cancelRequestedAgoMs?: number;
    exitCode?: number | null;
    pid?: number | null;
    outputBytes?: number;
    logStartCursor?: number;
    logTruncated?: boolean;
    error?: string;
    maxRunSeconds?: number;
  };

  const fixture = (input: JobFixture): AgentBackgroundJobV1 => ({
    schemaVersion: 'rag-ime.agent-background-job.v1',
    jobId: input.jobId,
    sessionId,
    label: input.label,
    status: input.status,
    command: input.command,
    commandSha256: input.digestCharacter.repeat(64),
    cwd: '/Users/example/Projects/personal-agent-workbench',
    networkAllowed: false,
    maxRunSeconds: input.maxRunSeconds ?? 600,
    pid: input.pid ?? null,
    createdAtMs: nowMs - input.createdAgoMs,
    startedAtMs: input.startedAgoMs ? nowMs - input.startedAgoMs : 0,
    updatedAtMs: nowMs - input.updatedAgoMs,
    endedAtMs: input.endedAgoMs ? nowMs - input.endedAgoMs : 0,
    exitCode: input.exitCode ?? null,
    outputBytes: input.outputBytes ?? 0,
    logStartCursor: input.logStartCursor ?? 0,
    logTruncated: input.logTruncated ?? false,
    cancelRequestedAtMs: input.cancelRequestedAgoMs
      ? nowMs - input.cancelRequestedAgoMs
      : 0,
    error: input.error ?? '',
    approvalId: `approval-preview-${input.jobId.slice(-4)}`,
    causalMetadata: {
      todoId: `todo:${sessionId}`,
      todoRevision: 2,
      goalId: `goal:${sessionId}`,
      goalRevision: 1,
      turnId: `${sessionId}:turn-architecture`,
      roomBound: false,
    },
  });

  return [
    fixture({
      jobId: 'bg_00000000000000000000000000000001',
      label: '前端生产构建',
      status: 'running',
      command: 'pnpm build',
      digestCharacter: 'a',
      createdAgoMs: 38_000,
      startedAgoMs: 37_000,
      updatedAgoMs: 1_000,
      pid: 48_120,
      outputBytes: 392_000,
      logStartCursor: 260_000,
      logTruncated: true,
    }),
    fixture({
      jobId: 'bg_00000000000000000000000000000002',
      label: '停止中的索引刷新',
      status: 'cancelling',
      command: 'python3 scripts/refresh_index.py',
      digestCharacter: 'b',
      createdAgoMs: 66_000,
      startedAgoMs: 65_000,
      updatedAgoMs: 2_000,
      cancelRequestedAgoMs: 2_000,
      pid: 48_105,
      outputBytes: 18_420,
    }),
    fixture({
      jobId: 'bg_00000000000000000000000000000003',
      label: '等待可用执行槽',
      status: 'queued',
      command: 'python3 scripts/export_report.py',
      digestCharacter: 'c',
      createdAgoMs: 12_000,
      updatedAgoMs: 12_000,
      maxRunSeconds: 300,
    }),
    fixture({
      jobId: 'bg_00000000000000000000000000000004',
      label: '类型检查',
      status: 'completed',
      command: 'pnpm typecheck',
      digestCharacter: 'd',
      createdAgoMs: 125_000,
      startedAgoMs: 124_000,
      updatedAgoMs: 94_000,
      endedAgoMs: 94_000,
      exitCode: 0,
      pid: 48_074,
      outputBytes: 6_812,
    }),
    fixture({
      jobId: 'bg_00000000000000000000000000000005',
      label: '后台回归测试',
      status: 'failed',
      command: 'python3 -m unittest tests.test_agent_routes',
      digestCharacter: 'e',
      createdAgoMs: 182_000,
      startedAgoMs: 181_000,
      updatedAgoMs: 142_000,
      endedAgoMs: 142_000,
      exitCode: 1,
      pid: 48_041,
      outputBytes: 2_193,
      error: '命令退出码为 1',
    }),
    fixture({
      jobId: 'bg_00000000000000000000000000000006',
      label: '已停止的依赖扫描',
      status: 'cancelled',
      command: 'python3 scripts/scan_dependencies.py',
      digestCharacter: 'f',
      createdAgoMs: 248_000,
      startedAgoMs: 247_000,
      updatedAgoMs: 220_000,
      endedAgoMs: 220_000,
      cancelRequestedAgoMs: 221_000,
      exitCode: 143,
      pid: 48_003,
      outputBytes: 31_744,
    }),
    fixture({
      jobId: 'bg_00000000000000000000000000000007',
      label: '断开宿主的文档导出',
      status: 'orphaned',
      command: 'python3 scripts/render_documents.py',
      digestCharacter: '1',
      createdAgoMs: 312_000,
      startedAgoMs: 311_000,
      updatedAgoMs: 280_000,
      endedAgoMs: 280_000,
      pid: 47_982,
      outputBytes: 12_880,
      error: '服务重启后无法确认原任务归属',
    }),
  ];
}

function previewMemoryRecallSession(
  sessionId: string,
  mode: 'greeting' | 'continued' = 'continued',
) {
  const greetingTurn = `${sessionId}:turn-greeting`;
  const tiredTurn = `${sessionId}:turn-tired`;
  const base = previewNow - 210_000;
  const messages = [
    message(sessionId, greetingTurn, 'memory-user-greeting', 'user', [
      block('memory-user-greeting-text', 'text', {
        text: '嗨，今天怎么样？',
      }),
    ], base),
    message(sessionId, greetingTurn, 'memory-assistant-greeting', 'assistant', [
      block('memory-assistant-greeting-text', 'text', {
        text: [
          '嗨，我挺好。你今天其实推进了不少：',
          '',
          '- 早上先把输入法范围、真实前端和不发布边界收成了 **PAW 立项**约束；',
          '- 中午把高频输入里的稳定偏好和一次性任务分开，理顺了 Memory 治理；',
          '- 下午把 Input History → Memory → Agent 串进同一个真实 PAWOS；',
          '- 后来又把几个 Agent 之间的接口、依赖和证据串成了完整交接；',
          '- 收尾时还核对了 WorkPatch、Docs、Reviewer 和公开数据边界。',
          '',
          '看起来是很有进展、也挺密的一天。你现在更想趁着劲继续收尾，还是先缓一缓？',
        ].join('\n'),
      }),
    ], base + 28_000),
    message(sessionId, tiredTurn, 'memory-user-tired', 'user', [
      block('memory-user-tired-text', 'text', {
        text: '还行，就是今天有点累。',
      }),
    ], base + 64_000),
    message(sessionId, tiredTurn, 'memory-assistant-tired', 'assistant', [
      block('memory-assistant-tired-text', 'text', {
        text: [
          '那就先别硬撑了。你今天已经把几个 Agent 之间最难的交接跑通了，这件事本身就很消耗。',
          '',
          '而且你最近反复在意的不是“功能堆得多”，而是它要 **真实、有用**，新增时还不能把已经做好的东西弄丢。今天这一步做到了：几个 Agent 不只是同时开着，而是真的把接口、依赖和证据交给了下一个；Memory 也不是一张讲概念的卡片，而是在真实 App 里接住了输入记录、整理结果和这段对话。',
          '',
          '先到这里也可以。明天继续时，我会从今天的整理结果和交接记录接上，不用你再讲一遍。',
        ].join('\n'),
      }),
    ], base + 102_000),
  ];
  const rows: Array<[string, UiAgentEvent['eventType'], Record<string, unknown>]> = [
    [greetingTurn, 'tool_started', { toolCallId: 'memory-recall-today', toolId: 'memory', operation: 'recall', summary: '从“今天”与当前会话上下文召回最近活动时间线', args: { scope: 'today_timeline', limit: 1, rawInput: false } }],
    [greetingTurn, 'tool_finished', { toolCallId: 'memory-recall-today', toolId: 'memory', operation: 'recall', summary: '自然对话命中 5 个已整理任务；未读取原始输入', status: 'completed', result: { sourceEvents: 1_284, includedTasks: 5, rawInputCopied: false } }],
    [greetingTurn, 'turn_completed', { summary: '结合今日时间线回应寒暄，并询问当前状态' }],
    [tiredTurn, 'tool_started', { toolCallId: 'memory-recall-preferences', toolId: 'memory', operation: 'recall', summary: '根据疲劳感受与当前项目进展召回相关交流偏好', args: { scope: 'user_preferences', query: '真实 有用 保留已有 多 Agent 交接', limit: 4 } }],
    [tiredTurn, 'tool_finished', { toolCallId: 'memory-recall-preferences', toolId: 'memory', operation: 'recall', summary: '召回 3 条相关偏好，排除无关项目与 Runtime 状态', status: 'completed', result: { included: 3, excluded: 11, runtimeStateIncluded: false } }],
    [tiredTurn, 'turn_completed', { summary: '结合偏好回应情绪，并保留明日续接点' }],
  ];
  const visibleMessageCount = mode === 'greeting' ? 2 : messages.length;
  const visibleRows = mode === 'greeting' ? rows.slice(0, 3) : rows;
  const events = visibleRows.map(([turnId, eventType, payload], index) => ({
    schemaVersion: 'rag-ime.agent-event.v1',
    eventId: `${sessionId}:memory-event-${index + 1}`,
    sessionId,
    turnId,
    sequence: index + 1,
    createdAtMs: base + 5_000 + index * 13_000,
    payload,
    resumeToken: `${sessionId}:${index + 1}`,
    streamKind: 'agent',
    eventType,
  })) as UiAgentEvent[];
  return { messages: messages.slice(0, visibleMessageCount), events };
}

/**
 * Public, deterministic target-state fixture for the Reliability chapter.
 * It deliberately keeps the repair behind a user authorization turn and only
 * calls the result verified after the original frozen case is replayed. The
 * values are illustrative preview data, not a PAW Runtime acceptance claim.
 */
function previewReliabilitySession(
  sessionId: string,
  mode: 'incident' | 'diagnostic' | 'repair' | 'verify',
) {
  const incidentTurn = `${sessionId}:turn-incident`;
  const diagnoseTurn = `${sessionId}:turn-diagnose`;
  const repairTurn = `${sessionId}:turn-repair`;
  const verifyTurn = `${sessionId}:turn-verify`;
  const base = previewNow - 330_000;
  const usage = (input: number, output: number, cacheRead: number) => ({
    input,
    output,
    cacheRead,
    cacheWrite: 0,
    totalTokens: input + output + cacheRead,
  });
  const incidentMessages = [
    message(sessionId, incidentTurn, 'reliability-user-incident', 'user', [
      block('reliability-user-incident-text', 'text', {
        text: '执行已批准的 workspace_write，并把结果登记到 WorkDocument；完成后给出最终状态。',
      }),
    ], base),
    message(sessionId, incidentTurn, 'reliability-assistant-unsafe-safe-end', 'assistant', [
      block('reliability-assistant-unsafe-safe-end-text', 'text', {
        text: [
          '## Final Result · SAFE END（错误判定）',
          '',
          '- `workspace_write` 已获批并成功写入真实文件：`receipt:workspace-write-001`。',
          '- `WorkDocument.register` 在登记前因 authority 过期失败：`workDocument.state=failed`。',
          '- 旧 Workflow 随后执行补偿回滚，删除刚刚写入的真实文件：`artifactKept=false`。',
          '',
          'Agent 最终仍错误地报告：“已安全结束”。',
        ].join('\n'),
      }),
    ], base + 62_000, { model: 'GPT-5.4 · Legacy Workflow', provider: 'pi-runtime', usage: usage(8_160, 640, 11_520) }),
  ];
  const allMessages = [
    message(sessionId, diagnoseTurn, 'reliability-user-diagnose', 'user', [
      block('reliability-user-diagnose-text', 'text', {
        text: '请诊断这个冻结案例：Room Partner 的 workspace_write 已获批并写入成功，但 WorkDocument authority 在登记前过期；旧 Workflow 回滚了真实文件，Agent 仍说“已安全结束”。先读取 trace-agent-diagnostics Skill，只做只读取证；把 Tool 执行、安全、协作、上下文、Token 和八项评分都写进报告。在我授权前不要修改 Skill、Tool、Workflow 或业务源码。',
      }),
    ], base),
    message(sessionId, diagnoseTurn, 'reliability-assistant-report', 'assistant', [
      block('reliability-assistant-report-text', 'text', {
        text: [
          '## Trace Agent 评估报告 · READ ONLY',
          '',
          '**结论：原任务未完成。第一根因是 `workspace_write → WorkDocument.register` 的 Workflow 一致性策略，不是 Tool 越权，也不是 OS sandbox 失效。修复状态：`awaiting_authorization`。**',
          '',
          '### 冻结对象与操作边界',
          '',
          '- Target：`run:workspace-document-sync-before`；Case：`case:stale-workdoc-authority-001`。',
          '- Skill：`trace-agent-diagnostics`；只加载诊断规则，不授予写权限。',
          '- Tool：`trace_diagnostics.inspect` **只调用 1 次**；随后只读对照 Git、源码与测试。',
          '- Security：诊断 Session 无 writable roots、network=off；未产生 approval、patch 或自动修复。',
          '',
          '### 八项评分',
          '',
          '| 评分行 | 分数 | 权威 | 关键证据 |',
          '| --- | ---: | --- | --- |',
          '| Task completion | **0 / 3** | ground_truth | 已获批文件最终不存在，硬门槛失败 |',
          '| Evidence / diagnosis | 1 / 3 | ground_truth | 把“登记一致性”误写成“真实工作安全” |',
          '| Tool / Runtime | 2 / 3 | deterministic | write 与 register 都有 receipt；补偿策略删除成果 |',
          '| Context | 2 / 3 | deterministic | 需求和 workspace root 正确，遗漏“辅助文档不是事实源” |',
          '| Room collaboration | 1 / 3 | ground_truth | Partner 已交付，辅助 authority 反向撤销真实工作 |',
          '| Memory / RAG | N/A | — | 本例未使用，不补 0、不参与平均 |',
          '| Efficiency | 1 / 3 | deterministic | 6 次重试 · 41,820 Token · 14m32s |',
          '| Repair quality | N/A | — | 尚未授权或重跑 |',
          '',
          '### 责任层与安全判断',
          '',
          'Tool eligibility、workspaceRoots、resourceRevision、approval digest 与 OS sandbox 五层都按合同生效；失败发生在获批写入之后的 Workflow 补偿策略。`resourceRevision` 解决顺序陈旧写，`temp + fsync + replace` 解决半写入，它们都不等于同文件并发 mutation queue。',
          '',
          '建议修复：workspace mutation 保持事实源；WorkDocument 登记最多尝试一次，失败只留下 `documentSync pending/failed`、Trace 与残余提醒。当前 PAW 仍没有 per-file mutation queue，这个 OPEN GAP 不在本次修复里。',
        ].join('\n'),
      }),
    ], base + 72_000, { model: 'GPT-5.4 · Trace Agent', provider: 'pi-runtime', usage: usage(12_480, 1_960, 17_720) }),
    message(sessionId, repairTurn, 'reliability-user-authorize', 'user', [
      block('reliability-user-authorize-text', 'text', {
        text: '授权修复：另开普通 writable Session，只修改 agent_tools.py 里的 documentSync Workflow 和对应聚焦测试。保留 workspace_write 的 Tool eligibility、workspaceRoots、resourceRevision、approval digest 与 OS sandbox；WorkDocument 失败最多记录一次，不自动重试。不要修改 trace-agent-diagnostics Skill、WorkspaceHarness 或评测标签；测试通过也只能写 applied + tested。',
      }),
    ], base + 118_000),
    message(sessionId, repairTurn, 'reliability-assistant-repair', 'assistant', [
      block('reliability-assistant-repair-text', 'text', {
        text: [
          '## Change Receipt · APPLIED + TESTED',
          '',
          '- 授权目标：`rag_ime/agent_tools.py` + `tests/test_agent_tools.py`',
          '- 行为：先应用真实写入；WorkDocument preflight/register 失败转成单次 `documentSync=failed|pending`，不回滚、不重试',
          '- 安全链：Tool 资格、精确 workspace root、resourceRevision、R2 approval digest、network-off OS sandbox 全部保持',
          '- 聚焦测试：`9 / 9 passed`；覆盖 authority advanced、archived authority、非 active receipt 与正常登记',
          '- 未改：Trace Skill、WorkspaceHarness、Tool schema、Eval 标签、并发 queue',
          '',
          '现在只能标记 **applied + tested**。聚焦测试证明 owning seam 的行为，但还没有证明原任务在同一 fixture 下完成；下一步必须重跑 `case:stale-workdoc-authority-001`。',
        ].join('\n'),
      }),
      block('reliability-workflow-diff', 'diff', {
        fileName: 'rag_ime/agent_tools.py',
        diff: '@@ workspace_write / WorkDocument sync @@\n- on registration_error: rollback_write(rollback_snapshot); raise\n+ on registration_error: documentSync = failed(reason, attemptCount=1)\n+ keep workspace mutation as source of truth\n+ publish Trace + residual warning; retryable = false\n',
      }),
    ], base + 188_000, { model: 'GPT-5.4 · Repair Session', provider: 'pi-runtime', usage: usage(9_220, 1_020, 14_040) }),
    message(sessionId, verifyTurn, 'reliability-user-replay', 'user', [
      block('reliability-user-replay-text', 'text', {
        text: '现在用同一个 stale-authority Case、同一模型卡、同一 workspace fixture 和同一 Eval revision 重跑。比较完成度、Tool、安全、协作、Token、延迟和修复质量；如果 cohort 不可比就明确写 unknown。',
      }),
    ], base + 226_000),
    message(sessionId, verifyTurn, 'reliability-assistant-verify', 'assistant', [
      block('reliability-assistant-verify-text', 'text', {
        text: [
          '## Verification Receipt · VERIFIED FIXTURE',
          '',
          '**可比性：通过。** Case、需求、fixture、模型卡、Prompt、Skill revision、workspace root、网络策略、Eval revision 与计费单位一致；只改变已授权的 documentSync Workflow。',
          '',
          '| 八项评分 | Before | After | 权威 |',
          '| --- | ---: | ---: | --- |',
          '| Task completion · hard gate | 0 / 3 | **3 / 3** | ground_truth |',
          '| Evidence / diagnosis | 1 / 3 | **3 / 3** | ground_truth |',
          '| Tool / Runtime | 2 / 3 | **3 / 3** | deterministic |',
          '| Context | 2 / 3 | **3 / 3** | deterministic |',
          '| Room collaboration | 1 / 3 | **3 / 3** | ground_truth |',
          '| Memory / RAG | N/A | N/A | not used |',
          '| Efficiency | 1 / 3 | **3 / 3** | deterministic |',
          '| Repair quality | N/A | **3 / 3** | ground_truth |',
          '',
          '| 同口径效率 | Before | After |',
          '| --- | ---: | ---: |',
          '| 总 Token | 41,820 | **26,400** |',
          '| Wall clock | 14m32s | **8m05s** |',
          '| Tool calls / retries | 18 / 6 | **11 / 1** |',
          '| 重复上下文 / 无效委派 | 2 / 2 | **0 / 0** |',
          '',
          'Replay 结果：真实文件保留；`documentSync.state=failed`、`attemptCount=1`、`retryable=false` 与 Trace ID 可见；Agent 最终明确说“主交付已完成，辅助登记失败待处理”，没有把 partial state 写成全部成功。AI Judge 从 1.8 → 2.8 只作为语义估计，不能覆盖 Ground-truth hard gate。',
          '',
          '证据链：`run:before` → `trace:before` → `repair:workflow-001` → `change:test-9of9` → `run:after` → `eval:workspace-sync-v1` → `verification:preview-001`。回滚目标是已授权 Workflow patch；残余风险仍是 **同文件真正并发写缺 per-file mutation queue**。',
          '',
          '> 本页数字是公开冻结的 synthetic Replay，用来展示正确的产品合同与证据表达；不证明私有 PAW Runtime、安装态或真实前台已经自动修复。',
        ].join('\n'),
      }),
    ], base + 300_000, { model: 'GPT-5.4 · Verification', provider: 'pi-runtime', usage: usage(7_980, 1_560, 16_860) }),
  ];
  const messages = mode === 'incident'
    ? incidentMessages
    : mode === 'diagnostic'
      ? [allMessages[0], allMessages[1]]
      : mode === 'repair'
        ? [allMessages[2], allMessages[3]]
        : [allMessages[4], allMessages[5]];
  const incidentRows: Array<[string, UiAgentEvent['eventType'], Record<string, unknown>]> = [
    [incidentTurn, 'tool_started', { toolCallId: 'reliability-incident-write', toolId: 'workspace_write', operation: 'apply', summary: '以已批准的精确 workspace root 写入真实文件', args: { approvalId: 'approval:legacy-workspace-write-001', target: 'rag_ime/agent_tools.py', networkAllowed: false } }],
    [incidentTurn, 'tool_finished', { toolCallId: 'reliability-incident-write', toolId: 'workspace_write', operation: 'apply', summary: 'workspace_write 成功；真实文件已写入', status: 'completed', result: { mutationApplied: true, artifactKeptAtWrite: true, receiptId: 'receipt:workspace-write-001' } }],
    [incidentTurn, 'tool_started', { toolCallId: 'reliability-incident-register', toolId: 'work_document', operation: 'register', summary: '登记辅助 WorkDocument', args: { authorityId: 'workdoc:authority-expired-001' } }],
    [incidentTurn, 'tool_finished', { toolCallId: 'reliability-incident-register', toolId: 'work_document', operation: 'register', summary: 'WorkDocument 登记失败：authority 已过期', status: 'failed', result: { workDocumentState: 'failed', authorityExpired: true } }],
    [incidentTurn, 'tool_started', { toolCallId: 'reliability-incident-rollback', toolId: 'legacy_workflow', operation: 'rollback', summary: '旧 Workflow 因辅助登记失败回滚已写入的真实文件', args: { sourceReceiptId: 'receipt:workspace-write-001' } }],
    [incidentTurn, 'tool_finished', { toolCallId: 'reliability-incident-rollback', toolId: 'legacy_workflow', operation: 'rollback', summary: '旧 Workflow 已回滚真实文件', status: 'completed', result: { rollbackApplied: true, artifactKept: false, rollbackReason: 'work_document_register_failed' } }],
    [incidentTurn, 'turn_completed', { summary: 'Agent 错误报告“已安全结束”；真实 workspace mutation 已被旧 Workflow 回滚' }],
  ];
  const allRows: Array<[string, UiAgentEvent['eventType'], Record<string, unknown>]> = [
    [diagnoseTurn, 'tool_started', { toolCallId: 'reliability-skill-load', toolId: 'skill', operation: 'load', summary: '读取 trace-agent-diagnostics 诊断合同', args: { skillRef: 'trace-agent-diagnostics', access: 'read_only' } }],
    [diagnoseTurn, 'tool_finished', { toolCallId: 'reliability-skill-load', toolId: 'skill', operation: 'load', summary: '已加载 trace-agent-diagnostics：八项评分、任务完成硬门槛与修复授权规则', status: 'completed', result: { skillRef: 'trace-agent-diagnostics', rows: 8, hardGate: 'task_completion', repairAllowed: false } }],
    [diagnoseTurn, 'tool_started', { toolCallId: 'reliability-trace-inspect', toolId: 'trace_diagnostics', operation: 'inspect', summary: '一次读取冻结 Run、Trace、Tool 与 Room 证据', args: { targets: [{ kind: 'run', id: 'run:workspace-document-sync-before', title: 'stale authority rollback' }], mode: 'read_only' } }],
    [diagnoseTurn, 'tool_finished', { toolCallId: 'reliability-trace-inspect', toolId: 'trace_diagnostics', operation: 'inspect', summary: '硬门槛失败；真实写入被辅助登记回滚', status: 'completed', result: { inspectCount: 1, taskCompletion: 0, artifactKept: false, toolReceipts: 3, totalTokens: 41820, wallClockMs: 872000 } }],
    [diagnoseTurn, 'tool_started', { toolCallId: 'reliability-source-compare', toolId: 'workspace_read', operation: 'compare', summary: '只读对照旧策略、新策略与聚焦测试', args: { refs: ['7d9c5ebc:rag_ime/agent_tools.py', '43de6111:rag_ime/agent_tools.py', 'tests/test_agent_tools.py'] } }],
    [diagnoseTurn, 'tool_finished', { toolCallId: 'reliability-source-compare', toolId: 'workspace_read', operation: 'compare', summary: '第一根因定位到 documentSync Workflow；记录并发 queue 残余', status: 'completed', result: { primaryOwner: 'workflow:workspace_write.document_sync', toolAuthorizationHealthy: true, perFileMutationQueue: false } }],
    [diagnoseTurn, 'turn_completed', { summary: '只读 Trace 报告完成；repairCandidate 等待用户授权' }],
    [repairTurn, 'approval_required', { approvalId: 'approval:workflow-document-sync-001', toolId: 'workspace_edit', operation: 'apply', riskLevel: 'R2', summary: '等待确认精确 Workflow 与测试范围', payloadSha256: 'a'.repeat(64), roots: ['/Users/example/Projects/personal-agent-workbench'] }],
    [repairTurn, 'approval_resolved', { approvalId: 'approval:workflow-document-sync-001', state: 'approved', summary: '用户已确认精确路径、行为与禁止项' }],
    [repairTurn, 'tool_started', { toolCallId: 'reliability-workflow-patch', toolId: 'workspace_edit', operation: 'apply', summary: '应用 documentSync best-effort Workflow 修复', args: { target: 'rag_ime/agent_tools.py', approvalId: 'approval:workflow-document-sync-001', networkAllowed: false } }],
    [repairTurn, 'tool_finished', { toolCallId: 'reliability-workflow-patch', toolId: 'workspace_edit', operation: 'apply', summary: '真实写入保持事实源；失败转为单次 Trace 回执', status: 'completed', result: { changedFiles: 1, approvalDigestMatched: true, mutationApplied: true, receiptId: 'repair:workflow-001' } }],
    [repairTurn, 'tool_started', { toolCallId: 'reliability-focused-tests', toolId: 'workspace_shell', operation: 'test', summary: '在 network-off sandbox 运行 documentSync 聚焦测试', args: { suite: 'tests.test_agent_tools.WorkspaceWriteDocumentSync', networkAllowed: false } }],
    [repairTurn, 'tool_finished', { toolCallId: 'reliability-focused-tests', toolId: 'workspace_shell', operation: 'test', summary: '9 / 9 聚焦测试通过', status: 'completed', result: { passed: 9, failed: 0, verificationState: 'tested_not_verified', sandbox: 'workspace-harness' } }],
    [repairTurn, 'turn_completed', { summary: '修复已 applied + tested；原 Case 尚未 Replay' }],
    [verifyTurn, 'tool_started', { toolCallId: 'reliability-sandbox-replay', toolId: 'sandbox', operation: 'run', summary: '以同一 fixture 重跑 stale-authority Case', args: { suiteId: 'workspace-document-sync', suiteRevision: 'stale-authority-v1', modelCard: 'gpt-5.4-medium', networkAllowed: false } }],
    [verifyTurn, 'tool_finished', { toolCallId: 'reliability-sandbox-replay', toolId: 'sandbox', operation: 'run', summary: 'SandboxRun 完成；新 Trace 与修复回执已绑定', status: 'completed', result: { sandboxRunId: 'sandbox:after:preview-001', replayTraceId: 'trace:after:preview-001', artifactKept: true, documentSync: 'failed', retries: 1, totalTokens: 26400, wallClockMs: 485000 } }],
    [verifyTurn, 'tool_started', { toolCallId: 'reliability-eval', toolId: 'eval', operation: 'compare', summary: '用同一八项 Ground-truth Eval 比较前后', args: { beforeTraceId: 'trace:before:preview-001', afterTraceId: 'trace:after:preview-001', evalRevision: 'eval:workspace-sync-v1' } }],
    [verifyTurn, 'tool_finished', { toolCallId: 'reliability-eval', toolId: 'eval', operation: 'compare', summary: '任务完成硬门槛通过，八项评分均已生成', status: 'completed', result: { comparable: true, verdict: 'verified_fixture', taskCompletion: 3, efficiency: 3, repairQuality: 3, aiJudgeEstimate: 2.8, verificationReceiptId: 'verification:preview-001' } }],
    [verifyTurn, 'turn_completed', { summary: '同一 Case 重跑通过；保留 per-file mutation queue 残余风险' }],
  ];
  const rows: Array<[string, UiAgentEvent['eventType'], Record<string, unknown>]> = mode === 'incident'
    ? incidentRows
    : mode === 'diagnostic'
      ? allRows.slice(0, 7)
      : mode === 'repair'
        ? allRows.slice(7, 14)
        : allRows.slice(14);
  const events = rows.map(([turnId, eventType, payload], index) => ({
    schemaVersion: 'rag-ime.agent-event.v1',
    eventId: `${sessionId}:reliability-event-${index + 1}`,
    sessionId,
    turnId,
    sequence: index + 1,
    createdAtMs: base + 8_000 + index * 19_000,
    payload,
    resumeToken: `${sessionId}:${index + 1}`,
    streamKind: 'agent',
    eventType,
  })) as UiAgentEvent[];
  return { messages, events };
}

export function previewAgentSnapshot(sessionId: string): AgentSnapshot {
  // The fresh demo session stays genuinely empty so the preview can render
  // the welcome state; every other id keeps the full scripted transcript.
  if (sessionId === 'session-fresh') {
    return { lastSequence: 0, resumeToken: `${sessionId}:0`, status: 'idle', liveEvents: [], todo: null, messages: [] };
  }
  if (sessionId === 'session-input') {
    const turnId = `${sessionId}:turn-question`;
    const sequence = 4;
    return {
      lastSequence: sequence,
      resumeToken: `${sessionId}:${sequence}`,
      status: 'busy',
      liveEvents: [{
        schemaVersion: 'rag-ime.agent-event.v1',
        eventId: `${sessionId}:grouped-question`,
        sessionId,
        turnId,
        sequence,
        createdAtMs: previewNow - 10_000,
        eventType: 'user_input_required',
        payload: {
          requestId: 'preview-grouped-question',
          requestKind: 'grouped_questions',
          method: 'editor',
          title: '一起确认这次界面优化',
          message: '伙伴已完成现状检查。回答下面两项后，会沿当前任务继续实现。',
          timeout: 300_000,
          questions: [
            {
              id: 'scope',
              header: '优化范围',
              question: '这次优先把哪些状态做清楚？',
              options: [
                {
                  label: '只优化待审问答',
                  description: '集中改进问题、选项与提交反馈。',
                },
                {
                  label: '同时优化 Todo 状态',
                  description: '补齐阻塞、继续与待处理的可见状态。',
                },
                {
                  label: '统一两处体验',
                  description: '让提问和任务状态使用同一套层级与反馈。',
                  preview: 'Ask → 用户选择 → Todo 继续',
                },
              ],
              recommended: 2,
            },
            {
              id: 'evidence',
              header: '验收证据',
              question: '交付时需要覆盖哪些检查？',
              multi: true,
              options: [
                {
                  label: '键盘与读屏',
                  description: '验证焦点、分组语义与提交状态。',
                },
                {
                  label: '桌面与窄屏',
                  description: '确认问题较多时仍能阅读和操作。',
                },
                {
                  label: '真实提交链路',
                  description: '核对回答只提交一次并继续当前回合。',
                },
              ],
              recommended: 0,
            },
          ],
        },
        resumeToken: `${sessionId}:${sequence}`,
      }],
      todo: {
        schemaVersion: 'rag-ime.agent-todo.v1',
        id: `todo:${sessionId}`,
        sessionId,
        revision: 2,
        actor: 'agent',
        updatedAtMs: previewNow - 10_000,
        phases: [{
          name: '界面优化',
          tasks: [
            { content: '核对当前交互边界', status: 'completed' },
            { content: '等待用户确认优化范围', status: 'blocked', reason: '需要用户选择范围和验收证据' },
            { content: '继续实现并完成验收', status: 'pending' },
          ],
        }],
        counts: { total: 3, pending: 1, inProgress: 0, blocked: 1, completed: 1, abandoned: 0 },
      },
      messages: [
        message(sessionId, turnId, 'user-question', 'user', [
          block('user-question-text', 'text', { text: '请把待审问答做成更清楚的协作界面。' }),
        ], previewNow - 20_000),
      ],
    };
  }
  if (sessionId === 'session-memory' || sessionId === 'session-memory-greeting') {
    const fixture = previewMemoryRecallSession(
      sessionId,
      sessionId === 'session-memory-greeting' ? 'greeting' : 'continued',
    );
    return {
      lastSequence: fixture.events.length,
      resumeToken: `${sessionId}:${fixture.events.length}`,
      status: 'idle',
      liveEvents: fixture.events,
      todo: null,
      messages: fixture.messages,
    };
  }
  if (sessionId === 'session-reliability-incident') {
    const fixture = previewReliabilitySession(sessionId, 'incident');
    return {
      lastSequence: fixture.events.length,
      resumeToken: `${sessionId}:${fixture.events.length}`,
      status: 'idle',
      liveEvents: fixture.events,
      todo: null,
      messages: fixture.messages,
    };
  }
  if (sessionId === 'session-reliability') {
    const fixture = previewReliabilitySession(sessionId, 'diagnostic');
    return {
      lastSequence: fixture.events.length,
      resumeToken: `${sessionId}:${fixture.events.length}`,
      status: 'idle',
      liveEvents: fixture.events,
      todo: null,
      messages: fixture.messages,
    };
  }
  if (sessionId === 'session-reliability-repair') {
    const fixture = previewReliabilitySession(sessionId, 'repair');
    return {
      lastSequence: fixture.events.length,
      resumeToken: `${sessionId}:${fixture.events.length}`,
      status: 'idle',
      liveEvents: fixture.events,
      todo: null,
      messages: fixture.messages,
    };
  }
  if (sessionId === 'session-reliability-verify') {
    const fixture = previewReliabilitySession(sessionId, 'verify');
    return {
      lastSequence: fixture.events.length,
      resumeToken: `${sessionId}:${fixture.events.length}`,
      status: 'idle',
      liveEvents: fixture.events,
      todo: null,
      messages: fixture.messages,
    };
  }
  if (sessionId === 'session-states') {
    /* Sequence 0: the lifecycle events that follow carry 1..7 and must be
       treated as new, not as already-applied history.

       No queued tool here, deliberately. `queued` exists in agent-block.v1 but
       there is no queued verb in the event stream — `tool_started` means the
       tool started — and a snapshot message carrying a queued block closes the
       turn it rides on, which destroys the running state this scenario exists
       to show. Faking it with tool_started would render 进行中 and lie about
       what the tool is doing, so the boundary is documented instead. */
    return {
      lastSequence: 0,
      resumeToken: `${sessionId}:0`,
      status: 'idle',
      liveEvents: [],
      todo: null,
      messages: [],
      backgroundJobs: previewBackgroundJobs(sessionId),
    };
  }
  if (sessionId === 'session-report') {
    const messages = previewReportDelivery(sessionId);
    return { lastSequence: messages.length, resumeToken: `${sessionId}:${messages.length}`, status: 'idle', liveEvents: [], todo: null, messages };
  }
  if (sessionId === 'session-models') {
    const messages = previewModelSwitch(sessionId);
    return { lastSequence: messages.length, resumeToken: `${sessionId}:${messages.length}`, status: 'idle', liveEvents: [], todo: null, messages };
  }
  if (sessionId === 'session-gallery') {
    const messages = previewRendererGallery(sessionId);
    return { lastSequence: messages.length, resumeToken: `${sessionId}:${messages.length}`, status: 'idle', liveEvents: [], todo: null, messages };
  }
  if (sessionId === 'session-work-disclosure') {
    const fixture = previewTurnWorkDisclosure(sessionId);
    return {
      lastSequence: fixture.events.length,
      resumeToken: `${sessionId}:${fixture.events.length}`,
      status: 'idle',
      liveEvents: fixture.events,
      todo: null,
      messages: fixture.messages,
    };
  }
  if (sessionId === 'session-long') {
    const messages = previewLongTranscript(sessionId);
    return { lastSequence: messages.length, resumeToken: `${sessionId}:${messages.length}`, status: 'idle', liveEvents: [], todo: null, messages };
  }
  const userTurn = `${sessionId}:turn-architecture`;
  const mediaTurn = `${sessionId}:turn-media`;
  return {
    lastSequence: 12,
    resumeToken: `${sessionId}:12`,
    status: 'idle',
    liveEvents: [],
    todo: {
      schemaVersion: 'rag-ime.agent-todo.v1',
      id: `todo:${sessionId}`,
      sessionId,
      revision: 6,
      actor: 'agent',
      updatedAtMs: previewNow - 30_000,
      phases: [
        {
          name: '实现',
          tasks: [
            { content: '核对当前上下文与任务边界', status: 'completed' },
            { content: '实现会话内可见的 Todo', status: 'in_progress' },
          ],
        },
        {
          name: '验证',
          tasks: [
            { content: '验证压缩恢复与真实运行链路', status: 'blocked', reason: '等待真实 Provider 环境' },
          ],
        },
      ],
      counts: { total: 3, pending: 0, inProgress: 1, blocked: 1, completed: 1, abandoned: 0 },
    },
    messages: [
      message(sessionId, userTurn, 'user-architecture', 'user', [
        block('user-text', 'text', { text: '把迁移进度按真实代码链整理一下，别把工具日志当回答。' }),
      ], previewNow - 190_000),
      message(sessionId, userTurn, 'assistant-architecture', 'assistant', [
        block('answer-text', 'text', {
          text: [
            '### 当前结论',
            '',
            '三条工作线已经收束到同一个控制入口，任务记录只在每次往返完成后更新。',
            '',
            '| 边界 | 状态 |',
            '| --- | --- |',
            '| 对话进度 | 已接入 |',
            '| 本机辅助能力 | 继续由受控连接守门 |',
            '',
            '- 切换对话不会重建第二套状态。',
            '- 工具、记忆与审批都留在同一活动区。',
          ].join('\n'),
        }),
        block('answer-code', 'code', {
          language: 'ts',
          fileName: 'src/features/agent/state/live-store.ts',
          code: 'commit(events) {\n  set((state) => reduceBatch(state, events));\n}',
        }),
        block('answer-citation', 'citation', {
          index: 1,
          title: '控制中心迁移记录',
          source: '本地任务记录',
          href: '#/planning',
          excerpt: '一次用户输入只渲染一个 Turn。',
        }),
        block('answer-file', 'file', {
          mediaId: 'media_previewdoc01',
          name: 'room-runtime-handoff.md',
          mimeType: 'text/markdown',
          byteSize: 231,
          sha256: 'c'.repeat(64),
        }),
      ], previewNow - 180_000),
      message(sessionId, mediaTurn, 'user-media', 'user', [
        block('media-user-text', 'text', { text: '读取输入法工具书，并把结果作为可展开卡片保留。' }),
      ], previewNow - 80_000),
      message(sessionId, mediaTurn, 'assistant-media', 'assistant', [
        block('media-answer', 'text', {
          text: '已完成。正文展示工具书内容，精确接口与参数继续留在右侧运行状态中。',
        }),
        block('media-sticker', 'sticker', {
          assetId: 'rag-ime-presence-done',
          alt: '完成贴纸',
        }),
      ], previewNow - 72_000),
    ],
  };
}

/*
 * Tool and turn lifecycle scenario. The default fixture only ever produced
 * completed tools and a completed turn, so running, failed and aborted states
 * — and the turn-level failure/retry surface — were never rendered. These
 * events are contract-shaped (agent-event.v1) and drive the real reducer;
 * nothing here fakes a backend outcome.
 */
function previewStateEvents(sessionId: string): UiAgentEvent[] {
  /* Deliberately the wall clock, not previewNow: this scenario exists to show
     live state, and elapsed time is computed against the real clock. With the
     frozen base a "running" tool reported ~27 hours. */
  const stateEventBase = Date.now();
  const runningTurn = `${sessionId}:turn-running`;
  const failedTurn = `${sessionId}:turn-failed`;
  const abortedTurn = `${sessionId}:turn-aborted`;
  const rows: Array<[string, string, Record<string, unknown>]> = [
    // A tool still in flight: started with no matching finish.
    [runningTurn, 'tool_started', { toolCallId: 'tool-run-1', toolId: 'knowledge', operation: 'search', summary: '正在检索实现证据', args: { query: 'reducer batching' } }],
    [runningTurn, 'tool_progress', { toolCallId: 'tool-run-1', toolId: 'knowledge', operation: 'search', summary: '已扫描 24 / 48 段', progress: 0.5 }],
    // A tool that ran and failed, then the turn itself failed.
    [failedTurn, 'tool_started', { toolCallId: 'tool-fail-1', toolId: 'knowledge', operation: 'open', summary: '读取文档片段', args: { path: 'docs/agent/runtime-and-debug.md' } }],
    [failedTurn, 'tool_finished', { toolCallId: 'tool-fail-1', toolId: 'knowledge', operation: 'open', summary: '读取失败：检索服务超时', status: 'failed', error: '检索服务在第 2 次尝试后超时' }],
    [failedTurn, 'turn_failed', { error: '检索服务在第 2 次尝试后超时；本轮没有完成，可以直接重试。' }],
    // A turn the user stopped: aborted must read differently from failed.
    [abortedTurn, 'tool_started', { toolCallId: 'tool-abort-1', toolId: 'knowledge', operation: 'search', summary: '正在检索长文档', args: { query: 'migration plan' } }],
    [abortedTurn, 'turn_completed', { summary: '已停止', status: 'aborted', aborted: true }],
  ];
  return rows.map(([turnId, eventType, payload], index) => ({
    schemaVersion: 'rag-ime.agent-event.v1',
    eventId: `${sessionId}:state-event-${index + 1}`,
    sessionId,
    turnId,
    sequence: index + 1,
    createdAtMs: stateEventBase - 120_000 + index * 3_000,
    payload,
    resumeToken: `${sessionId}:${index + 1}`,
    streamKind: 'agent',
    eventType,
  })) as UiAgentEvent[];
}

export function previewAgentEvents(sessionId: string): UiAgentEvent[] {
  if (sessionId === 'session-fresh' || sessionId === 'session-input' || sessionId === 'session-memory' || sessionId === 'session-memory-greeting' || sessionId === 'session-reliability-incident' || sessionId === 'session-reliability' || sessionId === 'session-reliability-repair' || sessionId === 'session-reliability-verify' || sessionId === 'session-work-disclosure') return [];
  if (sessionId === 'session-states') return previewStateEvents(sessionId);
  // The snapshot already carries the whole thread; the default media-turn
  // events below would append an unrelated turn and muddy the comparison
  // between the two models.
  if (sessionId === 'session-models') return [];
  if (sessionId === 'session-report') return [];
  const turnId = `${sessionId}:turn-media`;
  const entries: Array<[UiAgentEvent['eventType'], Record<string, unknown>]> = [
    ['reasoning_summary', {
      summary: '核对迁移计划与当前前端边界',
      items: ['核对迁移计划与当前前端边界'],
      source: 'provider_reasoning_summary',
      state: 'completed',
    }],
    [
      'tool_started',
      {
        toolCallId: 'tool-rag-1',
        toolId: 'knowledge',
        operation: 'search',
        summary: '检索 8 条实现证据',
        query: 'ControlTransport reducer batcher',
        args: { query: 'ControlTransport reducer batcher' },
      },
    ],
    [
      'tool_finished',
      {
        toolCallId: 'tool-rag-1',
        toolId: 'knowledge',
        operation: 'search',
        summary: '找到 8 条实现证据',
        args: { query: 'ControlTransport reducer batcher' },
        resultCount: 8,
        sources: ['迁移计划', 'Agent reducer', 'Transport policy'],
      },
    ],
    [
      'tool_finished',
      {
        toolCallId: 'tool-memory-1',
        toolId: 'memory',
        operation: 'read',
        summary: '已读取输入法工具书',
        args: { bookId: 'book:topic:input-method' },
        result: {
          book: {
            title: '输入法与 Agent 上下文',
            summary: '记录输入缓冲、闪电联想和长期记忆整理之间的边界。',
            tags: ['输入法', '上下文', '记忆质量'],
            memories: [
              { type: 'principle', text: '单个词和未封口碎片不得进入长期 Agent 上下文。' },
              { type: 'decision', text: '闪电联想可以读取当前连续输入缓冲，但不直接持久化。' },
              { type: 'fact', text: '回车封口，同一应用内的输入按编辑事件重建，Backspace 会修正缓冲。' },
            ],
          },
        },
      },
    ],
    [
      'tool_finished',
      {
        toolCallId: 'subagent-1',
        toolId: 'subagent',
        operation: 'review',
        summary: '2 个子 Agent 完成并行核对',
        completed: 2,
        artifacts: 3,
      },
    ],
    [
      'approval_required',
      {
        approvalId: 'approval-1',
        summary: '等待确认应用词表草案',
        action: 'apply_lexicon_draft',
        risk: 'write',
        payloadSha256: 'preview-payload-sha256',
      },
    ],
    [
      'approval_resolved',
      {
        approvalId: 'approval-1',
        summary: '词表草案已批准',
        state: 'approved',
        receiptId: 'receipt-preview-1',
      },
    ],
    ['turn_completed', { summary: '本轮完成' }],
  ];
  return entries.map(([eventType, payload], index) => ({
    schemaVersion: 'rag-ime.agent-event.v1',
    eventId: `${sessionId}:event-${index + 13}`,
    sessionId,
    turnId,
    sequence: index + 13,
    createdAtMs: previewNow - 175_000 + index * 2_000,
    payload,
    resumeToken: `${sessionId}:${index + 13}`,
    streamKind: 'agent',
    eventType,
  }));
}

function message(
  sessionId: string,
  turnId: string,
  id: string,
  role: 'user' | 'assistant',
  blocks: ReturnType<typeof block>[],
  createdAtMs: number,
  // agent-message.v1 carries model/provider/usage per message, so a model
  // switch mid-conversation is a real contract shape rather than an invented
  // one. Optional because every other scenario leaves it off.
  attribution: { model?: string; provider?: string; usage?: { input: number; output: number; cacheRead: number; cacheWrite: number; totalTokens: number } } = {},
) {
  return {
    schemaVersion: 'rag-ime.agent-message.v1',
    id: `${sessionId}:${id}`,
    sessionId,
    turnId,
    role,
    status: 'completed',
    blocks,
    attachments: [],
    citations: [],
    createdAtMs,
    completedAtMs: createdAtMs + 8_000,
    ...attribution,
  };
}

function block(id: string, type: string, data: Record<string, unknown>, status: 'queued' | 'running' | 'completed' | 'failed' | 'aborted' = 'completed') {
  return {
    id,
    type,
    status,
    presentationKind: type === 'text' ? 'markdown' : type,
    data,
  };
}
