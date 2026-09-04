import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

async function readCssTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return readCssTree(entryPath);
      }
      return entry.name.endsWith(".css") ? readFile(entryPath, "utf8") : "";
    }),
  );
  return contents.join("\n");
}

test("emits the catalog's animation and scrolling utilities", async () => {
  const css = await readCssTree(path.join(root, "dist"));

  assert.match(css, /--tw-enter-opacity/);
  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /scrollbar-gutter:\s*stable/);
  assert.match(css, /scroll-fade-reveal-b/);
  assert.match(css, /mask-image:/);
  assert.match(css, /tw-shimmer/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});

test("renders the Reliability chapter and keeps its real PAWOS fixture connected", async () => {
  const { default: Home } = await vite.ssrLoadModule("/app/page.tsx");
  const html = renderToStaticMarkup(React.createElement(Home));
  const pageSource = await readFile(path.join(root, "app/page.tsx"), "utf8");
  const styleSource = await readFile(path.join(root, "app/globals.css"), "utf8");
  const previewData = await readFile(
    path.join(root, "../control-center-web/src/features/agent/preview-data.ts"),
    "utf8",
  );
  const previewTransport = await readFile(
    path.join(root, "../control-center-web/src/app/preview-control-transport.tsx"),
    "utf8",
  );
  const roomData = await readFile(
    path.join(root, "../control-center-web/src/app/preview-room-data.ts"),
    "utf8",
  );
  const traceShowcase = await readFile(
    path.join(root, "../control-center-web/src/features/trace-agent/showcase-workbench.tsx"),
    "utf8",
  );

  assert.match(html, /id="reliability"/);
  assert.match(html, /<h1[^>]*>多个 Agent 协作完成任务/);
  assert.match(html, /<h2[^>]*>让每个输入框，都成为一个了解你的 AI 入口/);
  assert.ok(html.indexOf('id="agents"') < html.indexOf('id="reliability"'));
  assert.ok(html.indexOf('id="reliability"') < html.indexOf('id="input"'));
  assert.ok(html.indexOf('id="reliability"') < html.indexOf('id="improvement"'));
  assert.ok(html.indexOf('id="improvement"') < html.indexOf('id="memory"'));
  assert.ok(html.indexOf('id="memory"') < html.indexOf('id="input"'));
  assert.match(html, /更多功能/);
  assert.match(html, /前端演进/);
  assert.match(html, /href="\/details\/frontend"/);
  assert.match(html, /知识图谱/);
  assert.match(html, /沙盒 Browser/);
  assert.match(html, /Agent 出错以后，怎样证明它真的变好了/);
  assert.match(html, /把原始要求与实际行为、测试结果逐项对照/);
  assert.match(html, /运行异常/);
  assert.match(pageSource, /Trace 诊断/);
  assert.match(pageSource, /授权修复/);
  assert.match(pageSource, /前后对比/);
  assert.match(html, /workspace_write/);
  assert.match(pageSource, /Skill \/ Eval/);
  assert.match(pageSource, /Skill 测评/);
  assert.match(pageSource, /applied \+ tested ≠ verified/);
  assert.match(traceShowcase, /原始 Trace 事件/);
  assert.match(traceShowcase, /Skill \/ Eval/);
  assert.doesNotMatch(pageSource, /更多 Agent，为什么没有更快交付/);
  assert.match(pageSource, /showcaseId: "memory-flow"/);
  assert.match(pageSource, /route: "\/history"/);
  assert.doesNotMatch(pageSource, /MemoryAgentDemo/);
  assert.match(pageSource, /PAW 立项/);
  assert.match(pageSource, /name: "输入法"/);
  assert.match(pageSource, /name: "Memory"/);
  assert.match(pageSource, /name: "多 Agent"/);
  assert.match(pageSource, /name: "PAWOS"/);
  assert.match(pageSource, /4 条产品线/);
  assert.match(pageSource, /pawos-projection-plan\.md/);
  assert.doesNotMatch(pageSource, /name: "PAWOS \/ 发布宿主"/);
  assert.match(previewData, /id: 'session-reliability'/);
  assert.match(previewData, /id: 'session-reliability-incident'/);
  assert.match(previewData, /id: 'session-reliability-repair'/);
  assert.match(previewData, /id: 'session-reliability-verify'/);
  assert.match(previewData, /previewReliabilitySession/);
  assert.match(previewData, /Verification Receipt · VERIFIED FIXTURE/);
  assert.match(previewData, /trace-agent-diagnostics/);
  assert.match(previewData, /Task completion · hard gate/);
  assert.match(previewData, /Tool \/ Runtime/);
  assert.match(previewData, /Room collaboration/);
  assert.match(previewData, /41,820 Token/);
  assert.match(previewData, /per-file mutation queue/);
  assert.doesNotMatch(previewData, /八项硬门槛/);
  assert.match(previewData, /任务完成硬门槛通过，八项评分均已生成/);
  assert.match(previewData, /mode === 'diagnostic'/);
  assert.match(previewData, /嗨，今天怎么样？/);
  assert.match(previewData, /你今天其实推进了不少/);
  assert.match(previewData, /还行，就是今天有点累/);
  assert.match(previewData, /你最近反复在意的不是“功能堆得多”/);
  assert.match(previewData, /几个 Agent 之间最难的交接跑通了/);
  assert.doesNotMatch(previewData, /行星之间真的能沟通/);
  assert.doesNotMatch(previewData, /我今天主要做了什么？/);
  assert.doesNotMatch(previewData, /我最近反复强调的偏好有哪些？/);
  assert.match(pageSource, /reliabilityStageDurations/);
  assert.match(pageSource, /const reliabilityShowcaseId = "context-reliability"/);
  assert.match(pageSource, /ShowcasePlayback/);
  assert.match(pageSource, /command: "stage\.set" \| "seek" \| "playback\.set" \| "replay\.reset"/);
  assert.match(pageSource, /showcaseInstance/);
  assert.match(pageSource, /showcaseId=\{reliabilityShowcaseId\}/);
  assert.doesNotMatch(pageSource, /<RealSurface\s+key=\{showcaseId\}/s);
  assert.match(pageSource, /useTimedLoop/);
  assert.match(pageSource, /useTimedLoop\(inputTimelineDurations, \[12\], imeOnScreen\)/);
  assert.match(pageSource, /useSyncExternalStore\(subscribeReducedMotion, reducedMotionSnapshot, serverSnapshot\)/);
  assert.match(pageSource, /function subscribeReducedMotion/);
  assert.doesNotMatch(pageSource, /setReducedMotion/);
  assert.doesNotMatch(pageSource, /acceptedText \?\? \(playback\.step >= 12/);
  assert.match(pageSource, /https:\/\/github\.com\/7155\/aios/);
  assert.doesNotMatch(pageSource, /https:\/\/github\.com\/7155\/MinivLLM/);
  assert.match(traceShowcase, /session-reliability-repair/);
  assert.match(pageSource, /session-reliability-incident/);
  assert.match(previewTransport, /session-reliability-verify/);
  assert.match(previewTransport, /session-reliability-incident/);
  assert.match(previewTransport, /session-reliability-slow/);
  assert.match(previewTransport, /session-reliability-skill-eval/);
  assert.match(previewTransport, /session-reliability-verify/);
  assert.match(previewTransport, /session-reliability'.*messageCount: 2/);
  assert.match(previewTransport, /session-reliability-repair'.*messageCount: 2/);
  assert.doesNotMatch(previewTransport, /turn-handoff/);
  assert.match(styleSource, /showcase-playback__scrubber/);
  assert.match(styleSource, /#reliability \.real-surface iframe\{width:100%;height:100%;transform:none\}/);
  assert.match(styleSource, /prefers-reduced-motion:reduce/);
  assert.match(styleSource, /\.slide-frame--bare\{flex:0 0 auto\}/);
  assert.match(styleSource, /\.slide-frame--bare \.slide-deferred\{flex:0 0 auto;min-height:0\}/);
  assert.match(styleSource, /\.slide-frame--bare \.room-transformation\{flex:0 0 auto\}/);
  assert.match(styleSource, /\.slide-frame--bare \.room-transformation-stage\{flex:0 0 auto;width:100%;height:auto;min-height:0;aspect-ratio:4\/3\}/);
  assert.match(roomData, /Pi 可以做成网关型 Agent 吗/);
  assert.match(roomData, /后来你说输入法的零散输入很乱/);
  assert.match(roomData, /Skill，还是返回结构化变更的 Tool/);
  assert.match(roomData, /最开始那套强规范多 Agent/);
  assert.match(roomData, /Git、Docs 和 Codex 对话/);
  assert.match(roomData, /行星通信/);
  assert.match(roomData, /sourceParticipantId/);
  assert.match(roomData, /targetParticipantId/);
  assert.match(roomData, /project-interview-forensics/);
  assert.match(roomData, /rag-retrieval-optimization/);
  assert.match(roomData, /implementation-planning/);
  assert.match(roomData, /organize-work-documents/);
  assert.match(roomData, /找到三段因果连续的用户原话/);
  assert.doesNotMatch(roomData, /DECISION：/);
  assert.match(roomData, /title: 'PAW 立项'/);
  assert.doesNotMatch(roomData, /开发历程与面试故事/);
  assert.match(roomData, /产品线 4\/4/);
  assert.match(roomData, /throughSequence \?\? 69/);
  assert.match(roomData, /P0 = 1/);
  assert.match(roomData, /P0 1 → 0/);
  assert.match(roomData, /usage: lane\.usage/);
});

test("renders the clickable vertical sandbox evidence lab from sanitized real receipts", async () => {
  const { default: Home } = await vite.ssrLoadModule("/app/page.tsx");
  const { default: SandboxDetail } = await vite.ssrLoadModule(
    "/app/details/sandbox/page.tsx",
  );
  const homeHtml = renderToStaticMarkup(React.createElement(Home));
  const detailHtml = renderToStaticMarkup(React.createElement(SandboxDetail));
  const detailSource = await readFile(
    path.join(root, "app/details/sandbox/sandbox-lab.tsx"),
    "utf8",
  );
  const lunaReceiptBytes = await readFile(
    path.join(
      root,
      "public/evidence/vertical-evals/enterprise-rag-answer-luna-max-validation-20260902.v1.json",
    ),
  );
  const lunaReceipt = JSON.parse(lunaReceiptBytes);
  const enterpriseOpsReceiptBytes = await readFile(
    path.join(
      root,
      "public/evidence/vertical-evals/enterpriseops-csm-suite-v2-summary-20260903.v2.json",
    ),
  );
  const enterpriseOpsReceipt = JSON.parse(enterpriseOpsReceiptBytes);
  const verticalManifest = JSON.parse(
    await readFile(path.join(root, "public/evidence/vertical-evals/manifest.v1.json"), "utf8"),
  );
  const lunaManifestItem = verticalManifest.items.find(
    (item) => item.id === "enterprise-rag-answer-luna-max-validation",
  );
  const enterpriseOpsManifestItem = verticalManifest.items.find(
    (item) => item.id === "enterpriseops-csm-suite-v2-summary",
  );

  assert.match(homeHtml, /href="\/details\/sandbox"/);
  assert.match(homeHtml, /垂直沙盒/);
  assert.match(detailHtml, /四个真实项目，每个都有一张候选矩阵/);
  assert.match(detailHtml, /Enterprise RAG/);
  assert.match(detailHtml, /CloudOps/);
  assert.match(detailHtml, /Trace Agent/);
  assert.match(detailHtml, /Memory Maintenance/);
  assert.match(detailHtml, /EnterpriseOps CSM/);
  assert.match(detailHtml, /44\.78%/);
  assert.equal(lunaReceipt.status, "rejected");
  assert.equal(lunaReceipt.heldOutEvaluated, false);
  assert.deepEqual(Object.keys(lunaReceipt.lanes), ["baseline", "skill", "tuned", "agentic"]);
  assert.equal(lunaReceipt.lanes.baseline.answerJudge, "2/4");
  assert.equal(lunaReceipt.lanes.skill.answerJudge, "2/4");
  assert.equal(lunaReceipt.lanes.tuned.answerJudge, "2/4");
  assert.equal(lunaReceipt.lanes.agentic.answerJudge, "0/4");
  assert.equal(lunaReceipt.lanes.agentic.toolContract, "failed");
  assert.equal(lunaManifestItem.publicFile, "enterprise-rag-answer-luna-max-validation-20260902.v1.json");
  assert.equal(
    lunaManifestItem.publicFileSha256,
    createHash("sha256").update(lunaReceiptBytes).digest("hex"),
  );
  assert.match(detailSource, /0\.8333/);
  assert.match(detailSource, /94 \/ 94 Tool/);
  assert.match(detailSource, /CA 0\.5000/);
  assert.match(detailSource, /5 \/ 5/);
  assert.match(detailSource, /24,399 CLI tokens/);
  assert.match(detailSource, /834\.945s/);
  assert.match(detailHtml, /2 \/ 9 cited facts/);
  assert.match(detailHtml, /Baseline/);
  assert.match(detailSource, /V1 · search/);
  assert.match(detailSource, /V1 FAILED · V2–V4 REJECTED/);
  assert.match(detailSource, /共享 Reviewer/);
  assert.match(detailSource, /V19b · TopK 20/);
  assert.match(detailSource, /search_schema_hidden_term_limit/);
  assert.match(detailSource, /runV5 false/);
  assert.match(detailSource, /3 \/ 31 → 26 \/ 31/);
  assert.match(detailSource, /2 \/ 3 → 3 \/ 3/);
  assert.match(detailSource, /1 \/ 8 task/);
  assert.match(detailSource, /CSM-REPLAY-001/);
  assert.match(detailSource, /CSM-SPLIT-001/);
  assert.match(detailSource, /Luna V0/);
  assert.match(detailSource, /77\.64%/);
  assert.match(detailSource, /Controlled Sol/);
  assert.match(detailSource, /Controlled Luna/);
  assert.match(detailSource, /REJECT QUALITY/);
  assert.doesNotMatch(detailSource, /96\.43%/);
  assert.equal(enterpriseOpsReceipt.schemaVersion, "paw.enterpriseops-csm-suite-v2-public-summary.v2");
  assert.equal(enterpriseOpsReceipt.candidateHistory.at(-1).decision, "reject_quality_gate");
  assert.equal(enterpriseOpsReceipt.costBoundary.providerBillAvailable, false);
  assert.equal(enterpriseOpsReceipt.costBoundary.heldOutUsedForModelCostComparison, false);
  assert.equal(
    enterpriseOpsManifestItem.publicFile,
    "enterpriseops-csm-suite-v2-summary-20260903.v2.json",
  );
  assert.equal(
    enterpriseOpsManifestItem.publicFileSha256,
    createHash("sha256").update(enterpriseOpsReceiptBytes).digest("hex"),
  );
  assert.match(detailSource, /SnapshotColumns/);
  assert.match(detailSource, /改动层/);
  assert.match(detailSource, /cloudops-candidate-falsification-20260901\.v1\.json/);
  assert.match(detailSource, /trace-agent-skill-envelope-validation-20260901\.v1\.json/);
  assert.match(detailHtml, /enterprise-rag-answer-v16-reject-20260901\.v1\.json/);
  assert.match(detailHtml, /enterprise-rag-answer-luna-max-validation-20260902\.v1\.json/);
  assert.match(detailHtml, /Luna Max v20 Reject/);
  assert.match(detailSource, /Luna Max · baseline/);
  assert.match(detailSource, /420\.642s · 7,713 tok · 12 Tool/);
  assert.match(detailHtml, /source-local candidate 都未安装/);
  assert.match(detailHtml, /role="tablist"/);
  assert.match(detailHtml, /role="tab"/);
  assert.match(detailHtml, /role="tabpanel"/);
  assert.match(
    detailHtml,
    /href="\/evidence\/vertical-evals\/cloudops-agent-validation-20260901\.v1\.json"/,
  );
  assert.match(
    detailHtml,
    /href="\/evidence\/vertical-evals\/memory-maintenance-validation-20260902\.v1\.json"/,
  );
  assert.match(
    detailHtml,
    /href="\/evidence\/vertical-evals\/enterpriseops-csm-suite-v2-summary-20260903\.v2\.json"/,
  );
  assert.match(detailSource, /useState/);
  assert.match(detailSource, /aria-selected/);
  assert.match(detailSource, /selectedEvent\.evidenceHref \?\? activeRun\.evidenceHref/);
  assert.doesNotMatch(detailHtml, /\/Users\//);
  assert.doesNotMatch(detailHtml, /\/Volumes\//);
  assert.doesNotMatch(detailHtml, /accessToken|refreshToken/);
});

test("renders the month-long multi-Agent frontend selection history", async () => {
  const { FrontendEvolutionDetail } = await vite.ssrLoadModule("/app/details/frontend-evolution.tsx");
  const html = renderToStaticMarkup(React.createElement(FrontendEvolutionDetail));
  const source = await readFile(path.join(root, "app/details/frontend-evolution.tsx"), "utf8");
  const route = await readFile(path.join(root, "app/details/frontend/page.tsx"), "utf8");
  const styles = await readFile(path.join(root, "app/globals.css"), "utf8");

  assert.match(html, /一个月里，多 Agent 前端为什么换了七种视图/);
  assert.match(html, /2026\.07\.16 → 08\.29/);
  assert.equal((html.match(/data-evolution-stage=/g) ?? []).length, 7);
  assert.match(html, /结构化 Room/);
  assert.match(html, /Kernel 控制面/);
  assert.match(html, /公开对话/);
  assert.match(html, /任务卡与任务图/);
  assert.match(html, /Light Room 工作台/);
  assert.match(html, /星球、卫星与 Mesh/);
  assert.match(html, /时间线与真实窗口/);
  assert.match(html, /公开记录/);
  assert.match(html, /任务表/);
  assert.match(html, /协同模式/);
  assert.match(html, /星空（按需）/);
  assert.match(html, /源码重建，不是历史截图/);
  assert.match(source, /9b320d0d/);
  assert.match(source, /e62a67f8/);
  assert.match(source, /923a9e14/);
  assert.match(source, /0a9f5c9c/);
  assert.match(source, /7a3e5a74/);
  assert.match(source, /7283bec7/);
  assert.match(source, /ea001717/);
  assert.match(source, /43de6111/);
  assert.match(source, /阶段性正确/);
  assert.match(source, /PawRoomWorkspace\.tsx/);
  assert.match(source, /PawRoomFocusOverview\.tsx/);
  assert.match(route, /FrontendEvolutionDetail/);
  assert.match(styles, /\.frontend-evolution-stage/);
  assert.match(styles, /@media\(max-width:700px\)[^{]*\{[^}]*\.frontend-evolution-stage/s);
});

test("keeps the Agents and input-method detail pages source-grounded", async () => {
  const detailSource = await readFile(path.join(root, "app/details/shared.tsx"), "utf8");
  const styles = await readFile(path.join(root, "app/globals.css"), "utf8");
  const agentsDetail = detailSource.slice(detailSource.indexOf("export function AgentsDetail"));
  const agentImages = await Promise.all([
    "paw-agent-worksite.webp",
    "paw-agent-sessions-grid.webp",
    "paw-agent-102-subagents.webp",
  ].map((name) => readFile(path.join(root, "public", name))));
  const agentPreviews = await Promise.all([
    "paw-agent-worksite-preview.webp",
    "paw-agent-sessions-grid-preview.webp",
    "paw-agent-102-subagents-preview.webp",
  ].map((name) => readFile(path.join(root, "public", name))));
  const agentDiagramSvgs = await Promise.all([
    "paw-runtime-ownership.svg",
    "paw-feature-slice.svg",
    "project-story-spine.svg",
  ].map((name) => readFile(path.join(root, "public", "evidence", "agents", name), "utf8")));
  const agentDiagramSources = await Promise.all([
    "paw-runtime-ownership.excalidraw",
    "paw-feature-slice.excalidraw",
    "project-story-spine.excalidraw",
  ].map((name) => readFile(path.join(root, "diagrams", name), "utf8")));

  assert.doesNotMatch(detailSource, /https:\/\/github\.com\/7155\/MinivLLM/);
  assert.match(detailSource, /id="ime-training"/);
  assert.match(detailSource, /id="ime-inference"/);
  assert.match(detailSource, /第一部分 · 模型训练/);
  assert.match(detailSource, /第二部分 · 推理 Runtime/);
  assert.match(detailSource, /MiniMind-IME Daily Long 0\.1B/);
  assert.match(detailSource, /Qwen3-0\.6B base zero-shot/);
  assert.match(detailSource, /Qwen3-4B base zero-shot/);
  assert.match(detailSource, /0\.06B · 8 层/);
  assert.match(detailSource, /0\.214B · 32 层 Block AttnRes/);
  assert.match(detailSource, /三个规模实验，最终只发布一条主线/);
  assert.match(detailSource, /Qwen3-0\.6B 和 Qwen3-4B 使用官方 base 权重做 zero-shot baseline/);
  assert.match(detailSource, /p95 约 4 秒/);
  assert.match(detailSource, /1,132 unique prefixes/);
  assert.match(detailSource, /379\.44 \/ 728\.86 ms/);
  assert.match(detailSource, /81\.98 \/ 109\.97 ms/);
  assert.match(detailSource, /GPT-5\.5 Pro Teacher/);
  assert.match(detailSource, /Gemini Daily/);
  assert.match(detailSource, /通过 SSH 持续做项目的 Codex 对话/);
  assert.match(detailSource, /旗舰 Harness 多 Agent 的问题现场/);
  assert.match(detailSource, /人被迫当路由中转/);
  assert.match(detailSource, /Codex 子代理不受控制/);
  assert.match(detailSource, /“完成 102”证明 Harness 能派很多子任务/);
  assert.match(detailSource, /Claude Code 也在补同一类多 Agent 能力/);
  assert.match(detailSource, /Subagents/);
  assert.match(detailSource, /Agent view/);
  assert.match(detailSource, /Agent teams/);
  assert.match(detailSource, /Worktrees/);
  assert.match(detailSource, /https:\/\/code\.claude\.com\/docs\/en\/agents/);
  assert.match(detailSource, /https:\/\/code\.claude\.com\/docs\/en\/agent-teams/);
  assert.match(detailSource, /Room 只组合 Session，不再造第二套 Agent Runtime/);
  assert.match(detailSource, /所有权总图：Runtime 真相到底由谁负责/);
  assert.match(detailSource, /功能纵切：从 Goal 到可核查结果/);
  assert.match(detailSource, /项目主线：连续回答八个问题/);
  assert.match(detailSource, /\/evidence\/agents\/paw-runtime-ownership\.svg/);
  assert.match(detailSource, /\/evidence\/agents\/paw-feature-slice\.svg/);
  assert.match(detailSource, /\/evidence\/agents\/project-story-spine\.svg/);
  assert.match(detailSource, /diagrams\/paw-runtime-ownership\.excalidraw/);
  assert.match(detailSource, /diagrams\/paw-feature-slice\.excalidraw/);
  assert.match(detailSource, /diagrams\/project-story-spine\.excalidraw/);
  assert.match(detailSource, /RoomTurnRegistry\.allows_room_event/);
  assert.match(detailSource, /AgentDelegationCoordinator\.delegate/);
  assert.match(detailSource, /reduceRoomEvent/);
  assert.match(detailSource, /为什么需要多 Agent 与多维检测/);
  assert.match(detailSource, /四个必要维度/);
  assert.match(detailSource, /Goal loop/);
  assert.match(detailSource, /Native transport 明明返回空 Session/);
  assert.match(detailSource, /Steer，指令会抢在 prompt admission/);
  assert.match(detailSource, /Skill 路由不是固定流水线/);
  assert.match(detailSource, /alignment-and-decision \/ grilling/);
  assert.match(detailSource, /PROJECT\.md/);
  assert.match(detailSource, /不解析 Markdown checkbox/);
  assert.match(detailSource, /PAW 不是第一次就做对了/);
  assert.match(detailSource, /0a9f5c9c/);
  assert.match(detailSource, /\+5,145 \/ −115,912/);
  assert.match(detailSource, /Light Room 的 trade-off/);
  assert.match(detailSource, /当前最大 child depth 仍为 2/);
  assert.match(detailSource, /还缺同任务、同约束的真实对照/);
  assert.match(detailSource, /GIT HISTORY · 2026-06-30 → 2026-08-29/);
  assert.match(detailSource, /PAW 一度把 Room 做成第二套 Runtime，8 月 15 日又亲手拆掉了它。/);
  assert.doesNotMatch(detailSource, /这套协作架构不是一张白板图/);
  assert.match(detailSource, /<ol className="agent-git-history"/);
  assert.match(detailSource, /className="agent-git-diffstat"/);
  assert.match(detailSource, /aria-label="PAW G01 到 G12 Git 演进记录"/);
  assert.doesNotMatch(detailSource, /className="agent-history-ledger"/);
  assert.match(detailSource, /commits: 2/);
  assert.match(detailSource, /files: 318/);
  assert.match(detailSource, /additions: 10300/);
  assert.match(detailSource, /deletions: 136029/);
  assert.match(detailSource, /核心提交 0a9f5c9c/);
  assert.match(detailSource, /190 files · \+5,145 · −115,912/);
  assert.match(styles, /\.agent-git-history/);
  assert.match(styles, /\.agent-git-diffstat/);
  assert.match(detailSource, /G01/);
  assert.match(detailSource, /G12/);
  assert.match(detailSource, /真实 Codex 对话怎样改变项目方向/);
  assert.match(detailSource, /07-18–07-27 强 Kernel 扩张/);
  assert.match(detailSource, /pageClassName="detail-page--context"/);
  assert.match(detailSource, /aria-label="当前检索执行回执"/);
  assert.match(detailSource, /private reasoning、原始 Tool 参数与结果仍留在各自 Session/);
  assert.match(detailSource, /AIOS-IME/);
  assert.match(detailSource, /Daily Long 0\.1B/);
  assert.match(detailSource, /CandidateGroup/);
  assert.match(detailSource, /latest-wins/);
  assert.match(detailSource, /QUALITY \+ LATENCY/);
  assert.match(detailSource, /https:\/\/github\.com\/7155\/aios/);
  assert.match(detailSource, /https:\/\/github\.com\/7155\/minimind-ime/);
  assert.match(detailSource, /还缺 Daily Long v3 在 AIOS 上的同协议 64-token 正式基准/);
  assert.doesNotMatch(agentsDetail, /面试时，先用 30 秒讲清楚|面试材料/);
  assert.doesNotMatch(agentsDetail, /href="\/paw-agent-(?:worksite|sessions-grid|102-subagents)/);
  assert.match(detailSource, /className="agent-screenshot-dialog"/);
  assert.match(detailSource, /dialog\.showModal\(\)/);
  assert.match(detailSource, /The original-pixel asset is requested only after the viewer opens/);
  assert.match(detailSource, /const \[fullImageLoaded, setFullImageLoaded\] = useState\(false\)/);
  assert.match(detailSource, /className="agent-screenshot-placeholder"/);
  assert.match(detailSource, /className="agent-screenshot-original"/);
  assert.match(detailSource, /data-full-loaded=\{fullImageLoaded \|\| undefined\}/);
  assert.match(detailSource, /previewSrc="\/paw-agent-worksite-preview\.webp"/);
  assert.match(detailSource, /aria-label="放大图片"/);
  assert.match(detailSource, /aria-label="适合屏幕"/);
  assert.match(styles, /\.agent-screenshot-dialog\{position:fixed;inset:0;width:100vw;height:100dvh/);
  assert.match(styles, /\.agent-screenshot-viewport\[data-full-loaded=true\] \.agent-screenshot-original\{opacity:1\}/);
  assert.match(styles, /\.agent-blueprint-stack/);
  assert.match(styles, /\.agent-blueprint-figure/);
  assert.ok(agentsDetail.indexOf("<AgentWorksiteIntro/>") < agentsDetail.indexOf("<SourcedAgentProblem"));
  assert.ok(agentsDetail.indexOf("<AgentScaleEvidence/>") < agentsDetail.indexOf("<AgentSessionReality/>"));
  assert.ok(agentsDetail.indexOf("<AgentHarnessReference/>") < agentsDetail.indexOf("<AgentSolutionBridge/>"));
  assert.ok(agentsDetail.indexOf("<AgentRuntimeArchitecture/>") < agentsDetail.indexOf("<AgentDecisionLifecycle/>"));
  assert.ok(agentsDetail.indexOf("<AgentDecisionLifecycle/>") < agentsDetail.indexOf("<AgentProjectForensics/>"));
  assert.ok(agentImages.every((asset) => asset.byteLength < 700_000));
  assert.ok(agentImages.reduce((total, asset) => total + asset.byteLength, 0) < 1_600_000);
  assert.ok(agentPreviews.every((asset) => asset.byteLength < 180_000));
  assert.ok(agentPreviews.reduce((total, asset) => total + asset.byteLength, 0) < 460_000);
  assert.ok(agentDiagramSvgs.every((asset) => asset.includes("<svg")));
  assert.ok(agentDiagramSources.every((asset) => JSON.parse(asset).type === "excalidraw"));
});

test("keeps showcase-making and interview-planning documents private", async () => {
  const repositoryRoot = path.resolve(root, "..");
  const publicSources = await Promise.all([
    readFile(path.join(root, "README.md"), "utf8"),
    readFile(path.join(repositoryRoot, "control-center-web/src/app/preview-control-transport.tsx"), "utf8"),
    readFile(path.join(repositoryRoot, "control-center-web/src/app/preview-memory-data.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "control-center-web/src/app/preview-work-document-routes.ts"), "utf8"),
    readFile(path.join(root, "components/MemoryAgentDemo.tsx"), "utf8"),
    readFile(path.join(root, "app/details/shared.tsx"), "utf8"),
  ]);
  const publicText = publicSources.join("\n");
  const privateNames = [
    "current-handoff.md",
    "portfolio-content-architecture.md",
    "showcase-requirements-and-results.md",
    "rag-memory-eval-datasets.md",
    "PAW_SITE_HANDOFF.md",
    "PAW_STORY_FRAMEWORK.md",
  ];

  for (const privateName of privateNames) {
    assert.doesNotMatch(publicText, new RegExp(privateName.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(
    publicText,
    /面试回答|面试叙事|收敛展示页真实需求|把实际 PAWOS 窗口接入展示页|已确定展示页使用/,
  );

  const privatePublicPaths = [
    "PAW_SITE_HANDOFF.md",
    "PAW_STORY_FRAMEWORK.md",
    "docs/current-handoff.md",
    "docs/current-handoff.sha256",
    "docs/portfolio-content-architecture.md",
    "docs/rag-memory-eval-datasets.md",
    "docs/showcase-requirements-and-results.md",
  ];
  for (const relativePath of privatePublicPaths) {
    await assert.rejects(readFile(path.join(root, relativePath)), { code: "ENOENT" });
  }

  const publicChecker = await readFile(path.join(repositoryRoot, "scripts/check_public_showcase.py"), "utf8");
  const manifestBuilder = await readFile(path.join(repositoryRoot, "scripts/build_manifest.py"), "utf8");
  assert.match(publicChecker, /PRIVATE_LOCAL_PREFIXES/);
  assert.match(publicChecker, /private planning paths are tracked/);
  assert.match(manifestBuilder, /PRIVATE_LOCAL_PREFIXES/);
});

test("renders project-owned IME diagrams in the in-page fullscreen viewer", async () => {
  const detailSource = await readFile(path.join(root, "app/details/shared.tsx"), "utf8");
  const styles = await readFile(path.join(root, "app/globals.css"), "utf8");
  const diagramPaths = [
    "evidence/minimind-ime/training-pipeline.svg",
    "evidence/aios-ime/runtime-architecture.svg",
    "evidence/aios-ime/prefix-kv.svg",
  ];

  for (const diagramPath of diagramPaths) {
    const asset = await readFile(path.join(root, "public", diagramPath));
    assert.match(asset.toString("utf8", 0, 220), /<svg\b/);
    assert.ok(asset.byteLength < 300_000);
    assert.match(detailSource, new RegExp(`/${diagramPath.replaceAll(".", "\\.")}`));
  }

  assert.match(detailSource, /function ImeEvidenceDiagram/);
  assert.match(detailSource, /在页面内放大/);
  assert.match(styles, /\.ime-evidence-diagram/);
  assert.doesNotMatch(detailSource, /raw\.githubusercontent\.com\/7155\/(?:aios|minimind-ime)/);
});

test("keeps the public resume slice source-bound and easy to enter", async () => {
  const { ResumeSection } = await vite.ssrLoadModule("/app/resume-section.tsx");
  const html = renderToStaticMarkup(React.createElement(ResumeSection));
  const styles = await readFile(path.join(root, "app/globals.css"), "utf8");

  assert.match(html, /id="resume"/);
  assert.match(html, /aria-label="公开可核查的项目结果"/);
  assert.match(html, /3\/31 → 26\/31/);
  assert.match(html, /\.6128 → \.8872/);
  assert.match(html, /1\/8 Held-out/);
  assert.match(html, /id="framework"/);
  assert.match(html, /aria-label="PAW 系统框架"/);
  assert.match(html, /用户目标进入 Pi Session/);
  assert.match(html, /Session 执行，Room 组合/);
  assert.match(html, /Trace → Replay → Eval/);
  assert.match(html, /React 19 · TypeScript 5\.9 · Vite · Electron/);
  assert.match(html, /Pi Session · Node\.js · Python 3\.12 · HTTP \/ SSE/);
  assert.match(html, /Rime \/ librime · Squirrel · sentence-transformers · MLX \/ MLX-LM · usearch/);
  assert.match(html, /公开展示层/);
  assert.match(html, /只负责 oshow 的交互叙事与公开合成投影，不是 PAW 私有 Runtime/);
  assert.match(html, /公开站只展示清洗后的合成\/公开回执/);
  assert.ok(html.indexOf('href="#framework"') < html.indexOf('href="/details/sandbox"'));
  assert.ok(html.indexOf('href="/details/sandbox"') < html.indexOf('href="https:\/\/github.com\/7155"'));
  assert.doesNotMatch(html, /PROJECT FOCUS/);
  assert.doesNotMatch(html, /resume\.pdf|\.tex/);
  assert.match(styles, /\.resume-lead\{[^}]*scroll-margin-top:78px/);
  assert.match(styles, /\.technical-foundation\{[^}]*scroll-margin-top:78px/);
  assert.match(styles, /\.architecture-flow\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media\(max-width:860px\)[^{]*\{[^}]*\.resume-lead/);
  assert.doesNotMatch(styles, /resume-proof-rail|resume-case-index/);
});
