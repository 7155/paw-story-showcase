# PAW Story Showcase

PAW Story Showcase is a public, runnable snapshot of the real PAWOS web
frontend. It exists so a website, reviewer, or web model can open every product
surface with contract-shaped synthetic data without access to a private PAW
Runtime or personal data.

## What is real

- The React components, PAWOS shell, eleven-App registry, App dispatch, styles,
  and browser/terminal presentation code are selected from the PAW product
  source identified in [`UPSTREAM.json`](UPSTREAM.json).
- [`manifest/source-files.sha256`](manifest/source-files.sha256) records the
  exact bytes of this public snapshot and is checked for deterministic drift.
- The same Preview transport seam used by PAWOS supplies the showcase state.
- The App audit opens all eleven registered Apps and checks that each exposes a
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
