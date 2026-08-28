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

## Required labels

- `synthetic-preview`: contract-shaped generated state; no real Runtime claim.
- `interaction-rehearsal`: an action updates only in-memory showcase state.
- `host-unavailable`: a native/Electron/PTY capability is intentionally absent.
- `live`: prohibited unless a future public sandbox supplies separate evidence.

The production source, tests, build, installed application, running Runtime,
foreground behavior, and user acceptance are separate evidence levels.
