# Showcase data contract

All state in this repository is synthetic. The data deliberately follows the
same frontend contracts and transport interface as PAWOS, but it never claims
to be a production Session, Room, Memory item, retrieval result, Browser guest,
or Terminal process.

## Fixture owners

| Scope | Synthetic source |
| --- | --- |
| Session, Tools, model catalog, personas | `control-center-web/src/features/agent/preview-data.ts` |
| Shared request routing and mutable rehearsal state | `control-center-web/src/app/preview-control-transport.tsx` |
| Room events and collaboration projection | `control-center-web/src/app/preview-room-data.ts` |
| Memory pages, timeline, relations and curation | `control-center-web/src/app/preview-memory-data.ts` |
| Input, voice, lexicon and configuration | `control-center-web/src/app/preview-input-data.ts` |
| Work documents | `control-center-web/src/app/preview-work-document-routes.ts` |
| Input history | `control-center-web/src/app/preview-history-routes.ts` |
| Agent Lab matrix, scene detail and HTML report projection | `control-center-web/src/features/agent-lab/data.ts`, `control-center-web/src/features/agent-lab/index.tsx` |

## Agent Lab public boundary

`agent-lab` is a read-only PAWOS App surface for reviewing four vertical
workflows: EnterpriseOps / CI, Enterprise RAG, CloudOps and Memory
Maintenance.  Its matrix deliberately starts with the human-readable fields
that answer “what was the original data, what counted as correct, what failed,
what changed and what happened afterwards”.  Technical identifiers are kept
behind the detail page's “工程证据” disclosure.

The four rows use different evidence labels and must not be conflated:

| Scenario | Public source label | What the numbers mean |
| --- | --- | --- |
| EnterpriseOps / CI | `deterministic fixture` | Fixed tasks and verifiers projected from source-local receipts; the final Held-out result is retained as a rejected one-shot gate and is not rerun. |
| Enterprise RAG | `public benchmark` | Public-safe document/query and answer-gate summary; retrieval improvement does not imply citation-gate success. |
| CloudOps | `deterministic fixture` | Fixed incident/evidence cases; a lower Tool count is rejected when a Tool failure or consistency regression appears. |
| Memory Maintenance | `private-shadow human rubric` | Five synthetic/private-shadow cases judged against a human-defined “save four, abstain one” rubric; it is not production user memory. |

Each row can open a detail view showing its candidate timeline, Room roles,
bounded evidence excerpts, before/after metrics, rejected branches and final
decision.  The “审计报告” action creates a self-contained HTML document in
the browser.  It is a rendering of the public fixture, not a hidden transcript
export.  Downloaded reports repeat the source label and the non-production
boundary so they remain safe when shared outside the site.

The public projection keeps these headline results verbatim: EnterpriseOps
Verifier `3/31 → 26/31` and business Tool calls `0 → 47`; RAG MRR
`.6042 → .8672`, nDCG `.6128 → .8872`, Recall `.6719 → .9554` while its
answer citation gate remains rejected; CloudOps baseline `12/12`, CA `1.00`,
`98` Tool calls with later candidates rejected after `82` calls, one failure,
and CA `.75`; Memory v0's `834.945s` invalid JSONL failure to v5 shadow
`5/5`, `4/4` durable, `1/1` abstention, replay/rollback/valid JSON pass.
The Sol/Luna cost comparison appears only in EnterpriseOps as a frozen price
estimate: `$4.085230 → $0.14585536`; it is not a provider invoice and is not
mixed with latency figures.

The `memory-flow` showcase reuses one real PAWOS desktop and five staged App
routes: `/history` → `/memory?view=organize` → `/memory?layer=timelines` →
`/agent?session=session-memory-greeting` → `/agent?session=session-memory`.
Its frozen day contains 1,284 complete-input events, six representative
sanitized rows, five semantic tasks, and three relevant preferences. The
Memory result remains visible for reading before the Agent window opens. The
conversation then grows from an ordinary “嗨，今天怎么样？” greeting to one
follow-up turn about tiredness and the communicating planets; Timeline and
preference recall stay implicit in the replies instead of becoming artificial
recall commands. A visible synthetic cursor activates the five real stage
buttons, and the second Agent fixture adds one turn to the first fixture in the
same displayed window. Processing wait is compressed; all visible dwell is
reading time. Each stage waits until its real owning App renders the frozen
result before that reading timer starts, so a cold lazy chunk cannot skip a
visible step. Raw input is not copied into the Agent transcript, and every
Timeline / Atom result keeps a source-reference boundary.

The `room-flow` fixture is a 69-event public rehearsal of a `PAW 立项` Room.
Its first five rounds are publicly sanitized adaptations of USER-DIRECT Codex
messages from 2026-07-13, 2026-07-16, and 2026-08-29: Pi as a gateway Agent,
Sidecar parallel to the input adapter, Backspace / Enter input sealing,
structured Memory Tool output, the strong-Room failure, and evidence grouped
by causal stage. No private Session identifier or raw transcript is included.
The Facilitator then dispatches four product WorkItems: Input, Memory,
Multi-Agent / Room, and PAWOS. A visible cursor activates the real Room views
in order: public conversation, task table, collaboration mode, public
conversation, and the final jump-to-latest control. Four typed intercom
receipts form a closed loop:
Mars → Venus passes the input-event contract; Venus → Jupiter passes bounded
recall; Jupiter → Saturn passes RoomEvent / WorkPatch projection; Saturn → Mars
returns the real Input Studio surface constraint. Partner outputs remain
bounded WorkPatches with Tool and synthetic Token receipts. The Facilitator
uses `organize-work-documents` to write accepted meaning into Project Docs;
only after all four WorkPatches and the Docs receipt does an independent
Reviewer enter. Its first P0 catches a second-Runtime claim in PAWOS and the
rerun restores the projection-only boundary. Event ordering, Tool calls,
Token counts, WorkPatches, timestamps, and receipts remain synthetic and
contain no private transcript, personal Memory record, installed Runtime
state, or production performance metric. Playback uses one sequential timer
rather than scheduling all 69 events at once; normal speed adds reading holds
after each question, handoff, Docs result, and Reviewer gate.

The read-only `session-reliability` fixture and separate writable
`session-reliability-repair` fixture demonstrate one long target sequence
around a stale WorkDocument authority: `load trace-agent-diagnostics Skill →
inspect once read-only → score eight rows → authorize exact repair scope →
handoff to Repair Session → execute governed Tool and sandbox checks → replay
the same case → compare Eval and efficiency`.
Its Token, latency, retry, SandboxRun, repair receipt, Eval result, and
`verified_fixture` verdict are synthetic contract-shaped state. The Git/code
shape of the rollback-to-best-effort reversal is source-backed, but the fixture
does not prove that a private PAW Runtime executed or accepted the same repair.
The four explanatory stages reuse one `context-reliability` PAWOS document;
stage changes update only the Agent window hash between those two Sessions and
must not remount or replace the OS shell.

## Required labels

- `synthetic-preview`: contract-shaped generated state; no real Runtime claim.
- `interaction-rehearsal`: an action updates only in-memory showcase state.
- `host-unavailable`: a native/Electron/PTY capability is intentionally absent.
- `live`: prohibited unless a future public sandbox supplies separate evidence.

The production source, tests, build, installed application, running Runtime,
foreground behavior, and user acceptance are separate evidence levels.
