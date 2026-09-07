# PAW Story Showcase

PAW Story Showcase explains how a shared task moves through multi-Agent
collaboration, evaluation, verified improvement, and continued work.

Start with [`paw-story-demo`](paw-story-demo/README.md) for the interactive
story, system diagrams, technical choices, and scoped experiment results.
The companion `control-center-web` contains the real PAWOS frontend components
with contract-shaped synthetic data, without private Runtime or personal data.

The embedded frontend was refreshed from the PAW working tree on 2026-09-07,
including the stellar desktop, current Agent and Room views, Memory topic
pages, and Lab project/Knowledge workspaces. The exact captured source and
public adaptations are recorded in
[`manifest/frontend-source-snapshot.v1.json`](manifest/frontend-source-snapshot.v1.json).

Use `/` for the guided native workbench (`/?view=full` is a compatible alias).
Each stage hosts the real PAW frontend: Room, Trace, Agent Lab, Memory,
Input Studio and Context Debug. A visible demo cursor automatically clicks highlighted controls;
a step advances only after the expected UI result appears. Detail pages also
lead with native workspaces, with technical explanations folded below.
Use `/apps` for four independent, interactive Apps: customer handover, cited
knowledge search, incident triage, and memory curation. The App source is also
used by Lab exports; operations update the local demo state and can be saved
or exported.
Use `/lab` for the dedicated EnterpriseOps, RAG, CloudOps and Memory Lab page. The latter opens
four current PAW project workspaces. Each starts before data import, supports
local rule evaluation and exports a runnable offline App; fixed historical
Agent receipts remain in a separate evidence disclosure.

## What is real

- The React components, PAWOS shell, twelve-App registry, App dispatch, styles,
  and browser/terminal presentation code are selected from the PAW product
  source identified in [`UPSTREAM.json`](UPSTREAM.json).
- [`manifest/source-files.sha256`](manifest/source-files.sha256) records the
  exact bytes of this public snapshot and is checked for deterministic drift.
- The same Preview transport seam used by PAWOS supplies the showcase state.
- The App audit opens the registered Apps and checks that each exposes a
  visible, interactive surface.

## What is simulated

- Every Session, Room, Memory, Knowledge, input, Tool, Browser snapshot, and
  Terminal process shown here is synthetic preview data.
- The public web build has no PAW Gateway, Pi Session Runtime, Electron guest,
  native Squirrel surface, PTY, local database, credential, or personal input.
- A successful build or App audit proves this Showcase only. It does not prove
  PAW installation, Runtime health, foreground macOS behavior, or product
  acceptance.

The running UI always reports `演示数据`. Browser and Terminal remain useful
interactive demonstrations, but they must never be described as a live
Electron guest or a real shell in this repository.

## Deploy the complete site

Clone this repository as a whole. No adjacent PAW checkout, API key, database,
or Sites account is required for this public demo. Production serves the story
and embedded PAWOS from the same origin, including `/pawos/`.

With Node.js 22.13+ and Corepack available, run from the repository root:

```bash
git clone https://github.com/7155/paw-story-showcase.git
cd paw-story-showcase
npm run setup
npm run build
npm start
```

Open `http://localhost:3000`. The server listens on `0.0.0.0`; set `PORT` to
change its port. On hosting platforms select this repository root, use
`npm run setup && npm run build` as the build command and `npm start` as the
start command. Dependencies use the two committed lockfiles.
If Corepack is absent, install it with `npm install --global corepack@0.34.0`.

A Docker configuration is also included:

```bash
docker build -t paw-showcase .
docker run --rm -p 3000:3000 paw-showcase
```

This is a Node server deployment, not a bare static-folder upload. Use your
usual HTTPS reverse proxy on your own server. The optional Sites configuration
is retained for that platform's separate workflow.

The demo cursor clicks highlighted native controls automatically, waits for
results, and continues. Each page supports pause/resume; hidden pages do not
play. Browser download restrictions may require directly clicking the App
export button. All operations use public preview data.

## Run locally

Requirements: Node.js 22+ and pnpm 11.9+.

```bash
cd control-center-web
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:5173/?frontend=paw-os#/project-field`.

Build and verify:

```bash
cd control-center-web
pnpm typecheck
pnpm build
python3 ../scripts/build_manifest.py
pnpm check:public
PAW_E2E_SYSTEM_CHROME=1 pnpm test:showcase
```

## Give this repository to a web model

Ask the model to read, in order:

1. [`UPSTREAM.json`](UPSTREAM.json)
2. [`showcase/scenarios.v1.json`](showcase/scenarios.v1.json)
3. [`SHOWCASE_DATA.md`](SHOWCASE_DATA.md)
4. `control-center-web/src/features/paw-os/model/app-registry.ts`
5. `control-center-web/src/paw-os/apps/PawAppsRuntime.tsx`

For every screen it uses, it must report the App id, route, render owner,
scenario source, upstream commit, and proof level. Files in `src/app/preview-*`
provide state; they are not a second product Runtime or production authority.

## Public-content boundary

This repository has a fresh history and intentionally excludes the private PAW
repository history, requirements conversations, databases, logs, browser
profiles, machine configuration, credentials, dependencies, build output, and
installed applications. It does not currently grant an open-source license.
Third-party visual attribution retained by the snapshot is documented next to
the relevant assets.

## Self-contained deployment boundary

Package and deploy this repository root, not `paw-story-demo` by itself. The
site build compiles the repository-owned `control-center-web` snapshot and
embeds its static output under `/pawos/`; it never reads the adjacent private
PAW checkout. The source PAW repository named in `UPSTREAM.json` is provenance
only after synchronization.

The public check rejects machine-specific paths, generated/private directories,
and symlinks in the deployable source set. A deployment environment may install
locked third-party dependencies, but all application source and build inputs
must come from this repository.

## Rich public data and independent Apps

[`showcase/datasets`](showcase/datasets/README.md) contains 127 input records and
128 local checks across the four scenarios. Thirty-two Memory statements are
rewritten public design summaries; business identities, policies, observations
and boundary inputs are explicitly synthetic. No private transcript or live
customer dataset is bundled. The native Memory workspace adds eight topics,
44 traceable input sources and 32 current atoms.

The four Apps at `/apps` have distinct business interfaces. Customer handover
checks constraints, updates the owner and supports undo; knowledge search shows
source text and saves cited answers; incident triage records an evidence-based
plan; memory curation stores or excludes inputs and supports recall and undo.
The same application source is included when Lab exports a ZIP. Downloaded
Apps run locally without dependencies. Embedded previews retain results in
memory; an independently opened App uses browser storage when available.

The automatic cursor is a normal arrow with a separate click indication.
Pause/resume and explicit download controls remain available.

## Original application gallery

`/apps` now displays the existing Songguo support v11, Wix knowledge v4, EnterpriseRAG viewer and Geo v11 workbench frontends. Their saved results, source origins, licensing and public adapters are documented in [real-apps/README.md](real-apps/README.md). These historical views do not start model or Earth Engine requests. The four benchmark scenarios elsewhere in Lab remain distinct from these actual Apps.
